-- M2: creator-scoped standalone construction-suite calculations (first scope: the four roof calculators).
-- The server recomputes the output from the input with the same TypeScript engines the UI uses and
-- writes through the existing restricted writer login; authenticated sessions cannot create or alter
-- these authoritative snapshots directly. Additive only: no existing table, row or revision changes.

create policy construction_calculation_insert_guard on public.calculations as restrictive for insert to authenticated
  with check (calculator_type not like 'construction.%');
create policy construction_calculation_update_guard on public.calculations as restrictive for update to authenticated
  using (calculator_type not like 'construction.%') with check (calculator_type not like 'construction.%');
create policy construction_calculation_delete_guard on public.calculations as restrictive for delete to authenticated
  using (calculator_type not like 'construction.%');
create policy construction_calc_revision_insert_guard on public.calculation_revisions as restrictive for insert to authenticated
  with check (not exists (select 1 from public.calculations c where c.id=calculation_id and c.organization_id=organization_id and c.calculator_type like 'construction.%'));
create policy construction_dependency_insert_guard on public.calculation_dependencies as restrictive for insert to authenticated
  with check (not exists (select 1 from public.calculation_revisions r join public.calculations c on c.id=r.calculation_id where r.id=downstream_calculation_revision_id and c.calculator_type like 'construction.%'));

create table public.standalone_construction_save_operations (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  operation_id uuid not null,
  calculation_id uuid not null,
  request_payload jsonb not null,
  calculation_revision_id uuid not null,
  revision_number integer not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (organization_id, operation_id)
);
alter table public.standalone_construction_save_operations enable row level security;
revoke all on public.standalone_construction_save_operations from public, anon, authenticated;

create function public.save_standalone_construction_calculation(
  p_organization_id uuid, p_calculation_id uuid, p_operation_id uuid,
  p_expected_revision_number integer, p_calculator_type text, p_name text,
  p_input_data jsonb, p_output_data jsonb, p_actor_id uuid
)
returns table (calculation_id uuid, calculation_revision_id uuid, revision_number integer, reused boolean)
language plpgsql security definer set search_path='' as $$
declare
  v_calculator_id text := pg_catalog.substr(p_calculator_type, 14);
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
    or pg_catalog.jsonb_typeof(p_input_data) is distinct from 'object'
    or p_input_data->>'schemaVersion' is distinct from 'construction-suite.input.v1'
    or p_input_data->>'calculatorId' is distinct from v_calculator_id
    or pg_catalog.jsonb_typeof(p_input_data->'fields') is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_output_data) is distinct from 'object'
    or p_output_data->>'schemaVersion' is distinct from 'construction-suite.output.v1'
    or p_output_data->>'calculatorId' is distinct from v_calculator_id
    or pg_catalog.jsonb_typeof(p_output_data->'lines') is distinct from 'array'
    or pg_catalog.octet_length(p_input_data::text) > 200000
    or pg_catalog.octet_length(p_output_data::text) > 2000000 then
    raise exception 'Érvénytelen kalkulációs mentési adat.' using errcode='22023';
  end if;
  perform 1 from public.organization_members m where m.organization_id=p_organization_id and m.user_id=p_actor_id for share;
  if not found then raise exception 'A műhelyhez nincs hozzáférésed.' using errcode='42501'; end if;
  v_payload := pg_catalog.jsonb_build_object('calculationId',p_calculation_id,'expected',p_expected_revision_number,
    'type',p_calculator_type,'name',pg_catalog.btrim(p_name),'input',p_input_data,'output',p_output_data);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text||':construction-op:'||p_operation_id::text,0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text||':construction-calc:'||p_calculation_id::text,0));
  select * into v_prior from public.standalone_construction_save_operations o where o.organization_id=p_organization_id and o.operation_id=p_operation_id;
  if found then
    if v_prior.created_by<>p_actor_id or v_prior.calculation_id<>p_calculation_id or v_prior.request_payload is distinct from v_payload then
      raise exception 'A műveletazonosító más kéréshez tartozik.' using errcode='22023';
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
  update public.calculations set display_name=pg_catalog.btrim(p_name),current_revision_id=v_revision_id,status='current' where id=p_calculation_id;
  insert into public.standalone_construction_save_operations(organization_id,operation_id,calculation_id,request_payload,
    calculation_revision_id,revision_number,created_by)
    values(p_organization_id,p_operation_id,p_calculation_id,v_payload,v_revision_id,v_current+1,p_actor_id);
  return query select p_calculation_id,v_revision_id,v_current+1,false;
end;$$;
revoke all on function public.save_standalone_construction_calculation(uuid,uuid,uuid,integer,text,text,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.save_standalone_construction_calculation(uuid,uuid,uuid,integer,text,text,jsonb,jsonb,uuid) to tetopro_covering_writer;
