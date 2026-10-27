-- M10.2: a mezőátvétel kibővül a roof.material-takeoff <-> roof.timber-cutlist (azonos mezőséma, teljes
-- mezőkészlet-átvétel) és a roof.material-takeoff/roof.timber-cutlist -> roof.rafter-cut (a meglévő M10.1
-- fordítottja) irányokkal. A 20261026030000 migráció forrás/cél-ellenőrzését egy explicit, mindkét irányú
-- pármátrixra általánosítom; az attestáció, snapshot-teljességi kapu, advisory lock és rollback-logika
-- változatlan. Ugyanazon organizationId/létrehozó standalone revíziópárokra a cikluskizáró/dependency-trigger
-- (20261026020000) már érvényes, nincs itt teendő.

create or replace function public.save_standalone_construction_calculation(
  p_organization_id uuid, p_calculation_id uuid, p_operation_id uuid,
  p_expected_revision_number integer, p_calculator_type text, p_name text,
  p_input_data jsonb, p_output_data jsonb, p_actor_id uuid,
  p_source_calculation_revision_id uuid default null
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
  v_source_calculator_type text;
  v_source_calculator_id text;
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

  if p_source_calculation_revision_id is not null then
    -- M10.2 forrás-cél pármátrix: rafter-cut <-> {material-takeoff, timber-cutlist} mindkét irányban, és
    -- material-takeoff <-> timber-cutlist egymás között. Minden más célkalkulátor elutasított.
    if p_calculator_type not in ('construction.roof.material-takeoff','construction.roof.timber-cutlist','construction.roof.rafter-cut') then
      raise exception 'Ehhez a kalkulátorhoz nem vehető át adat.' using errcode='42501';
    end if;
    select c.calculator_type into v_source_calculator_type
      from public.calculation_revisions cr
      join public.calculations c on c.id = cr.calculation_id and c.organization_id = cr.organization_id
      where cr.id = p_source_calculation_revision_id and cr.organization_id = p_organization_id
        and c.ownership_scope = 'standalone' and c.created_by = p_actor_id;
    v_source_calculator_id := pg_catalog.substr(v_source_calculator_type, 14);
    if not (
      (p_calculator_type in ('construction.roof.material-takeoff','construction.roof.timber-cutlist')
        and v_source_calculator_type in ('construction.roof.rafter-cut','construction.roof.material-takeoff','construction.roof.timber-cutlist')
        and v_source_calculator_type is distinct from p_calculator_type)
      or (p_calculator_type = 'construction.roof.rafter-cut'
        and v_source_calculator_type in ('construction.roof.material-takeoff','construction.roof.timber-cutlist'))
    ) then
      raise exception 'A kiválasztott forrás nem használható adatátvételhez.' using errcode='42501';
    end if;
  end if;

  v_payload := pg_catalog.jsonb_build_object('calculationId',p_calculation_id,'expected',p_expected_revision_number,
    'type',p_calculator_type,'name',pg_catalog.btrim(p_name),'input',p_input_data,'output',p_output_data,
    'sourceRevisionId',p_source_calculation_revision_id);
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
  if p_source_calculation_revision_id is not null then
    insert into public.calculation_dependencies(organization_id,downstream_calculation_revision_id,upstream_calculation_revision_id,dependency_type)
      values(p_organization_id,v_revision_id,p_source_calculation_revision_id,'field-transfer:'||v_source_calculator_id||'->'||v_calculator_id);
  end if;
  return query select p_calculation_id,v_revision_id,v_current+1,false;
end;$$;
