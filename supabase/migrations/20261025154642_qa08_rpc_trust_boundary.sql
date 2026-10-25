-- QA08-RPC-01: construction outputs are trusted only after the restricted server writer
-- has accepted a complete snapshot. Downstream RPCs cannot manufacture this attestation.

create function private.is_complete_construction_snapshot(
  p_calculator_type text,
  p_input jsonb,
  p_output jsonb
) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce((
    p_calculator_type in (
      'construction.roof.rafter-cut','construction.roof.material-takeoff',
      'construction.roof.timber-cutlist','construction.roof.truss-members'
    )
    and pg_catalog.jsonb_typeof(p_input) = 'object'
    and p_input->>'schemaVersion' = 'construction-suite.input.v1'
    and p_input->>'calculatorId' = pg_catalog.substr(p_calculator_type, 14)
    and pg_catalog.jsonb_typeof(p_input->'fields') = 'object'
    and pg_catalog.jsonb_typeof(p_output) = 'object'
    and p_output->>'schemaVersion' = 'construction-suite.output.v1'
    and p_output->>'calculatorId' = pg_catalog.substr(p_calculator_type, 14)
    and pg_catalog.jsonb_typeof(p_output->'lines') = 'array'
    and pg_catalog.jsonb_array_length(p_output->'lines') > 0
    and not exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_output->'lines') as line(value)
      where pg_catalog.jsonb_typeof(line.value) <> 'object'
        or pg_catalog.jsonb_typeof(line.value->'label') <> 'string'
        or pg_catalog.char_length(pg_catalog.btrim(line.value->>'label')) = 0
        or pg_catalog.jsonb_typeof(line.value->'value') <> 'number'
        or pg_catalog.jsonb_typeof(line.value->'unit') <> 'string'
        or pg_catalog.char_length(pg_catalog.btrim(line.value->>'unit')) = 0
    )
    and (
      p_calculator_type in ('construction.roof.rafter-cut','construction.roof.truss-members')
      or (
        pg_catalog.jsonb_typeof(p_input->'material') = 'object'
        and pg_catalog.jsonb_typeof(p_output->'takeoff') = 'object'
        and p_output->'takeoff'->>'status' = 'VALID'
        and pg_catalog.jsonb_typeof(p_output->'specifications') = 'object'
        and pg_catalog.jsonb_typeof(p_output->'specifications'->'groups') = 'object'
        and exists (select 1 from pg_catalog.jsonb_each(p_output->'specifications'->'groups'))
        and not exists (
          select 1
          from pg_catalog.jsonb_each(p_output->'specifications'->'groups') as spec(group_name, value)
          where pg_catalog.jsonb_typeof(spec.value) <> 'object'
            or pg_catalog.jsonb_typeof(spec.value->'issues') <> 'object'
            or exists (select 1 from pg_catalog.jsonb_each(spec.value->'issues'))
            or pg_catalog.jsonb_typeof(spec.value->'invalidKeys') <> 'array'
            or pg_catalog.jsonb_array_length(spec.value->'invalidKeys') <> 0
        )
      )
    )), false);
$$;
revoke all on function private.is_complete_construction_snapshot(text,jsonb,jsonb)
  from public, anon, authenticated, service_role, tetopro_covering_writer;

create table private.construction_revision_attestations (
  calculation_revision_id uuid primary key,
  organization_id uuid not null,
  calculation_id uuid not null,
  attested_by uuid not null references auth.users(id) on delete restrict,
  attested_at timestamptz not null default now(),
  constraint construction_revision_attestation_revision_fk
    foreign key (calculation_revision_id, calculation_id)
    references public.calculation_revisions(id, calculation_id) on delete restrict,
  constraint construction_revision_attestation_organization_fk
    foreign key (calculation_revision_id, organization_id)
    references public.calculation_revisions(id, organization_id) on delete restrict
);
alter table private.construction_revision_attestations enable row level security;
revoke all on private.construction_revision_attestations from public, anon, authenticated, service_role, tetopro_covering_writer;

-- Preserve app-path history only when the immutable revision exactly matches the prior restricted
-- writer's operation ledger; caller-controlled provenance metadata is not proof by itself.
insert into private.construction_revision_attestations(
  calculation_revision_id, organization_id, calculation_id, attested_by, attested_at
)
select r.id, r.organization_id, r.calculation_id, r.created_by, r.created_at
from public.calculation_revisions r
join public.calculations c on c.id = r.calculation_id and c.organization_id = r.organization_id
where c.ownership_scope = 'standalone'
  and c.created_by = r.created_by
  and c.calculator_type like 'construction.%'
  and r.data_provenance->>'output' = 'server_recomputed'
  and private.is_complete_construction_snapshot(c.calculator_type, r.input_snapshot, r.output_snapshot)
  and exists (
    select 1
    from public.standalone_construction_save_operations o
    where o.organization_id = r.organization_id
      and o.calculation_id = r.calculation_id
      and o.calculation_revision_id = r.id
      and o.revision_number = r.revision_number
      and o.created_by = r.created_by
      and o.request_payload->>'calculationId' = r.calculation_id::text
      and o.request_payload->>'expected' = (r.revision_number - 1)::text
      and o.request_payload->>'type' = c.calculator_type
      and o.request_payload->'input' = r.input_snapshot
      and o.request_payload->'output' = r.output_snapshot
  );

create or replace function public.save_standalone_construction_calculation(
  p_organization_id uuid, p_calculation_id uuid, p_operation_id uuid,
  p_expected_revision_number integer, p_calculator_type text, p_name text,
  p_input_data jsonb, p_output_data jsonb, p_actor_id uuid
)
returns table (calculation_id uuid, calculation_revision_id uuid, revision_number integer, reused boolean)
language plpgsql security definer set search_path='' as $$
declare
  v_calculation public.calculations%rowtype;
  v_prior public.standalone_construction_save_operations%rowtype;
  v_current integer := 0;
  v_revision_id uuid;
  v_payload jsonb;
begin
  if p_actor_id is null or p_organization_id is null or p_calculation_id is null or p_operation_id is null
    or p_expected_revision_number is null or p_expected_revision_number < 0
    or p_name is null or pg_catalog.char_length(pg_catalog.btrim(p_name)) not between 1 and 200
    or p_calculator_type is null or p_calculator_type not in (
      'construction.roof.rafter-cut','construction.roof.material-takeoff',
      'construction.roof.timber-cutlist','construction.roof.truss-members')
    or not private.is_complete_construction_snapshot(p_calculator_type, p_input_data, p_output_data)
    or pg_catalog.octet_length(p_input_data::text) > 200000
    or pg_catalog.octet_length(p_output_data::text) > 2000000 then
    raise exception 'Érvénytelen vagy hiányos kalkulációs mentési adat.' using errcode='22023';
  end if;
  perform 1 from public.organization_members m where m.organization_id=p_organization_id and m.user_id=p_actor_id for share;
  if not found then raise exception 'A műhelyhez nincs hozzáférésed.' using errcode='42501'; end if;
  v_payload := pg_catalog.jsonb_build_object('calculationId',p_calculation_id,'expected',p_expected_revision_number,
    'type',p_calculator_type,'name',pg_catalog.btrim(p_name),'input',p_input_data,'output',p_output_data);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text||':construction-op:'||p_operation_id::text,0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text||':construction-calc:'||p_calculation_id::text,0));
  select * into v_prior from public.standalone_construction_save_operations o where o.organization_id=p_organization_id and o.operation_id=p_operation_id;
  if found then
    if v_prior.created_by<>p_actor_id or v_prior.calculation_id<>p_calculation_id or v_prior.request_payload is distinct from v_payload
      or not exists (select 1 from private.construction_revision_attestations a where a.calculation_revision_id=v_prior.calculation_revision_id) then
      raise exception 'A műveletazonosító más vagy nem igazolt kéréshez tartozik.' using errcode='22023';
    end if;
    return query select p_calculation_id,v_prior.calculation_revision_id,v_prior.revision_number,true;
    return;
  end if;
  select * into v_calculation from public.calculations c where c.id=p_calculation_id for update;
  if found then
    if v_calculation.organization_id<>p_organization_id or v_calculation.ownership_scope<>'standalone'
      or v_calculation.created_by<>p_actor_id or v_calculation.calculator_type<>p_calculator_type then
      raise exception 'A számítás nem érhető el.' using errcode='42501';
    end if;
    select pg_catalog.max(r.revision_number) into v_current from public.calculation_revisions r where r.calculation_id=p_calculation_id;
    v_current := coalesce(v_current,0);
  end if;
  if v_current is distinct from p_expected_revision_number then raise exception 'A számítás időközben megváltozott.' using errcode='40001'; end if;
  if v_current=0 then
    insert into public.calculations(id,organization_id,project_id,roof_model_id,ownership_scope,created_by,calculator_type,display_name,status)
      values(p_calculation_id,p_organization_id,null,null,'standalone',p_actor_id,p_calculator_type,pg_catalog.btrim(p_name),'current');
  end if;
  insert into public.calculation_revisions(organization_id,calculation_id,revision_number,input_schema_version,calculator_implementation_version,
    input_snapshot,output_snapshot,data_provenance,validation_status,warnings,created_by)
    values(p_organization_id,p_calculation_id,v_current+1,'construction-suite.input.v1','construction-suite.output.v1',p_input_data,p_output_data,
      pg_catalog.jsonb_build_object('scope','standalone','input','user_provided','output','server_recomputed'),
      'user_provided','[]'::jsonb,p_actor_id) returning id into v_revision_id;
  insert into private.construction_revision_attestations(calculation_revision_id,organization_id,calculation_id,attested_by)
    values(v_revision_id,p_organization_id,p_calculation_id,p_actor_id);
  update public.calculations set display_name=pg_catalog.btrim(p_name),current_revision_id=v_revision_id,status='current' where id=p_calculation_id;
  insert into public.standalone_construction_save_operations(organization_id,operation_id,calculation_id,request_payload,
    calculation_revision_id,revision_number,created_by)
    values(p_organization_id,p_operation_id,p_calculation_id,v_payload,v_revision_id,v_current+1,p_actor_id);
  return query select p_calculation_id,v_revision_id,v_current+1,false;
end;$$;
revoke all on function public.save_standalone_construction_calculation(uuid,uuid,uuid,integer,text,text,jsonb,jsonb,uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.save_standalone_construction_calculation(uuid,uuid,uuid,integer,text,text,jsonb,jsonb,uuid)
  to tetopro_covering_writer;

create function private.require_attested_construction_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.calculation_revision_id is not null and not exists (
    select 1 from private.construction_revision_attestations a
    where a.calculation_revision_id = new.calculation_revision_id
      and a.calculation_id = new.calculation_id
      and a.organization_id = new.organization_id
  ) then
    raise exception 'calculation revision is not a trusted complete server result' using errcode='22023';
  end if;
  return new;
end;
$$;
revoke all on function private.require_attested_construction_revision()
  from public, anon, authenticated, service_role, tetopro_covering_writer;

create trigger execution_plan_calculation_attestation_guard
before insert or update of organization_id, calculation_id, calculation_revision_id
on public.execution_plan_document_links
for each row execute function private.require_attested_construction_revision();

create trigger quotation_calculation_attestation_guard
before insert or update of organization_id, calculation_id, calculation_revision_id
on public.quotation_calculation_sources
for each row execute function private.require_attested_construction_revision();

comment on table private.construction_revision_attestations is
  'Append-only trust marker created by the restricted construction writer; immutable revisions make the marker stable.';
comment on function private.is_complete_construction_snapshot(text,jsonb,jsonb) is
  'Structural completeness gate only. Mathematical correctness is guaranteed by the restricted server writer and TypeScript engine.';
