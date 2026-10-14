-- F9.7.7.4b.1: persist server-recomputed metal tile covering revisions.
-- The general immutable calculation/revision model remains the storage contract.

-- Password is provisioned outside migrations. This login has no table grants and is
-- used only by the server after it has authenticated and recalculated the request.
-- Reuses the restricted writer role created by the trapezoidal covering persistence migration.

-- The shared tables permit authenticated writes for other calculators. Close those
-- paths for this calculator as well as the RPC path below.
create policy metal_tile_calculations_insert_guard on public.calculations as restrictive
  for insert to authenticated with check (calculator_type <> 'roof.gable.metal-tile-covering');
create policy metal_tile_calculations_update_guard on public.calculations as restrictive
  for update to authenticated using (calculator_type <> 'roof.gable.metal-tile-covering')
  with check (calculator_type <> 'roof.gable.metal-tile-covering');
create policy metal_tile_calculations_delete_guard on public.calculations as restrictive
  for delete to authenticated using (calculator_type <> 'roof.gable.metal-tile-covering');
create policy metal_tile_revisions_insert_guard on public.calculation_revisions as restrictive
  for insert to authenticated with check (not exists (
    select 1 from public.calculations c where c.id = calculation_id
      and c.calculator_type = 'roof.gable.metal-tile-covering'
  ));
create policy metal_tile_dependencies_insert_guard on public.calculation_dependencies as restrictive
  for insert to authenticated with check (not exists (
    select 1 from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id
    where cr.id = downstream_calculation_revision_id and c.calculator_type = 'roof.gable.metal-tile-covering'
  ));
create policy metal_tile_dependencies_update_guard on public.calculation_dependencies as restrictive
  for update to authenticated using (not exists (
    select 1 from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id
    where cr.id = downstream_calculation_revision_id and c.calculator_type = 'roof.gable.metal-tile-covering'
  )) with check (not exists (
    select 1 from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id
    where cr.id = downstream_calculation_revision_id and c.calculator_type = 'roof.gable.metal-tile-covering'
  ));
create policy metal_tile_dependencies_delete_guard on public.calculation_dependencies as restrictive
  for delete to authenticated using (not exists (
    select 1 from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id
    where cr.id = downstream_calculation_revision_id and c.calculator_type = 'roof.gable.metal-tile-covering'
  ));

create table public.gable_metal_tile_save_operations (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  operation_id uuid not null,
  calculation_id uuid not null,
  request_payload jsonb not null,
  calculation_revision_id uuid not null,
  revision_number integer not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (organization_id, operation_id),
  constraint gable_metal_tile_operation_payload_object check (jsonb_typeof(request_payload) = 'object')
);
alter table public.gable_metal_tile_save_operations enable row level security;
revoke all on public.gable_metal_tile_save_operations from public, anon, authenticated;

create or replace function public.save_gable_metal_tile_covering_calculation(
  p_organization_id uuid,
  p_calculation_id uuid,
  p_operation_id uuid,
  p_expected_revision_number integer,
  p_name text,
  p_project_id uuid,
  p_roof_model_id uuid,
  p_source_roof_revision_id uuid,
  p_input_data jsonb,
  p_output_data jsonb,
  p_data_provenance jsonb,
  p_actor_id uuid
)
returns table (calculation_id uuid, calculation_revision_id uuid, revision_number integer, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_scope text := case when p_project_id is null then 'standalone' else 'project' end;
  v_current integer := 0;
  v_revision_id uuid;
  v_revision_number integer;
  v_status text;
  v_payload jsonb;
  v_previous public.gable_metal_tile_save_operations%rowtype;
  v_calculation public.calculations%rowtype;
begin
  if p_actor_id is null then
    raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501';
  end if;
  -- Hold membership through commit so revocation and a save cannot cross.
  perform 1 from public.organization_members om
    where om.organization_id = p_organization_id and om.user_id = p_actor_id for share;
  if not found then
    raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501';
  end if;
  if p_calculation_id is null or p_operation_id is null or p_expected_revision_number is null or p_expected_revision_number < 0
     or p_name is null or pg_catalog.char_length(pg_catalog.btrim(p_name)) not between 1 and 200
     or pg_catalog.jsonb_typeof(p_input_data) is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_output_data) is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_data_provenance) is distinct from 'object'
     or p_input_data ->> 'calculatorType' is distinct from 'roof.gable.metal-tile-covering'
     or p_input_data ->> 'scope' is distinct from v_scope
     or pg_catalog.jsonb_typeof(p_output_data -> 'geometry') is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_output_data -> 'covering') is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_input_data -> 'productInput') is distinct from 'object'
     or p_data_provenance ->> 'calculation' is distinct from 'server_recomputed'
     or (p_output_data #>> '{covering,status}' is distinct from 'VALID') then
    raise exception 'A cserepeslemez-fedés mentési adata érvénytelen vagy számítási hibát tartalmaz.' using errcode = '22023';
  end if;
  if v_scope = 'standalone' then
    if p_roof_model_id is not null or p_source_roof_revision_id is not null or p_input_data #>> '{source,mode}' is distinct from 'standalone'
       or p_input_data #>> '{source,geometrySource}' is distinct from 'manual_user_input' then
      raise exception 'Az önálló számítás csak kézi geometriát és projekt nélküli forrást tárolhat.' using errcode = '22023';
    end if;
  else
    if p_roof_model_id is null or p_source_roof_revision_id is null or p_input_data #>> '{source,mode}' is distinct from 'project'
       or (p_input_data #>> '{source,projectId}')::uuid is distinct from p_project_id
       or (p_input_data #>> '{source,roofModelId}')::uuid is distinct from p_roof_model_id
       or (p_input_data #>> '{source,roofModelRevisionId}')::uuid is distinct from p_source_roof_revision_id then
      raise exception 'A projektforrás azonosítói nem egyeznek.' using errcode = '22023';
    end if;
    perform 1 from public.roof_models rm
      join public.projects p on p.id = rm.project_id and p.organization_id = rm.organization_id
      join public.roof_model_revisions rmr on rmr.roof_model_id = rm.id and rmr.organization_id = rm.organization_id
      join public.calculation_dependencies d on d.upstream_roof_model_revision_id = rmr.id
      join public.calculation_revisions cr on cr.id = d.downstream_calculation_revision_id and cr.organization_id = d.organization_id
      join public.calculations gc on gc.id = cr.calculation_id and gc.organization_id = cr.organization_id
      where rm.id = p_roof_model_id and rm.project_id = p_project_id and rm.organization_id = p_organization_id
        and rm.roof_type = 'gable' and p.id = p_project_id and rmr.id = p_source_roof_revision_id
        and rmr.validation_status = 'verified' and rmr.schema_version = '1.0.0'
        and d.dependency_type = 'roof_model_input'
        and gc.project_id = p_project_id and gc.roof_model_id = rm.id
        and gc.calculator_type = 'roof.gable' and cr.validation_status = 'verified'
        and cr.calculator_implementation_version = '1.0.0' and cr.input_schema_version = '1.0.0'
        and (p_input_data #>> '{source,geometryCalculationId}')::uuid = gc.id
        and (p_input_data #>> '{source,geometryCalculationRevisionId}')::uuid = cr.id
        and p_input_data #> '{source,geometryInput}' = rmr.input_data
        and pg_catalog.jsonb_typeof(p_input_data -> 'productInput') = 'object'
        and p_input_data #>> '{source,geometryCalculationRevisionId}' is not null
      for share of rm, rmr, cr, gc;
    if not found then raise exception 'A pontos, ellenőrzött tetőforrás nem érhető el.' using errcode = '42501'; end if;
  end if;

  v_status := 'estimated';
  v_payload := pg_catalog.jsonb_build_object(
    'calculationId', p_calculation_id, 'name', pg_catalog.btrim(p_name), 'projectId', p_project_id,
    'roofModelId', p_roof_model_id, 'sourceRoofRevisionId', p_source_roof_revision_id,
    'input', p_input_data, 'output', p_output_data, 'provenance', p_data_provenance,
    'expectedRevisionNumber', p_expected_revision_number
  );
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':gable-metal-tile:' || p_operation_id::text, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':gable-metal-tile-calculation:' || p_calculation_id::text, 0));

  -- Authorization is rechecked before idempotent reuse.
  if v_scope = 'project' then
    perform 1 from public.projects p where p.id = p_project_id and p.organization_id = p_organization_id for share;
  else
    perform 1 from public.organization_members om where om.organization_id = p_organization_id and om.user_id = p_actor_id for share;
  end if;
  if not found then raise exception 'A számítás nem érhető el.' using errcode = '42501'; end if;

  select * into v_previous from public.gable_metal_tile_save_operations o
    where o.organization_id = p_organization_id and o.operation_id = p_operation_id;
  if found then
    if v_previous.created_by <> p_actor_id or v_previous.calculation_id <> p_calculation_id or v_previous.request_payload is distinct from v_payload then
      raise exception 'A műveletazonosító más kéréshez tartozik.' using errcode = '22023';
    end if;
    if v_scope = 'standalone' then
      perform 1 from public.calculations c where c.id = p_calculation_id and c.organization_id = p_organization_id
        and c.ownership_scope = 'standalone' and c.created_by = p_actor_id;
      if not found then raise exception 'A számítás nem érhető el.' using errcode = '42501'; end if;
    end if;
    return query select p_calculation_id, v_previous.calculation_revision_id, v_previous.revision_number, true;
    return;
  end if;

  select * into v_calculation from public.calculations c
    where c.id = p_calculation_id and c.organization_id = p_organization_id for update;
  if found then
    if v_calculation.calculator_type <> 'roof.gable.metal-tile-covering'
       or v_scope = 'standalone' and (v_calculation.ownership_scope <> 'standalone' or v_calculation.created_by <> p_actor_id or v_calculation.project_id is not null)
       or v_scope = 'project' and (v_calculation.ownership_scope <> 'project' or v_calculation.project_id <> p_project_id or v_calculation.roof_model_id <> p_roof_model_id) then
      raise exception 'A számítás tulajdonosi vagy projektazonosítója nem egyezik.' using errcode = '42501';
    end if;
    select coalesce(pg_catalog.max(cr.revision_number), 0) into v_current from public.calculation_revisions cr
      where cr.calculation_id = p_calculation_id and cr.organization_id = p_organization_id;
  elsif exists (select 1 from public.calculations c where c.id = p_calculation_id) then
    raise exception 'A számítás nem érhető el.' using errcode = '42501';
  end if;
  if v_current is distinct from p_expected_revision_number then raise exception 'A számítás időközben megváltozott.' using errcode = '40001'; end if;
  if v_current = 0 then
    insert into public.calculations (id, organization_id, project_id, roof_model_id, ownership_scope, created_by, calculator_type, display_name, status)
    values (p_calculation_id, p_organization_id, p_project_id, p_roof_model_id, v_scope,
      case when v_scope = 'standalone' then p_actor_id else null end,
      'roof.gable.metal-tile-covering', pg_catalog.btrim(p_name), 'current');
  end if;
  v_revision_number := v_current + 1;
  insert into public.calculation_revisions (
    organization_id, calculation_id, revision_number, input_schema_version, calculator_implementation_version,
    input_snapshot, output_snapshot, data_provenance, validation_status, warnings, created_by
  ) values (
    p_organization_id, p_calculation_id, v_revision_number, '1.0.0', '1.0.0', p_input_data, p_output_data,
    pg_catalog.jsonb_build_object('scope', v_scope, 'source', p_data_provenance, 'output', 'server_recomputed'),
    v_status, coalesce(p_output_data #> '{covering,reasons}', '[]'::jsonb), p_actor_id
  ) returning id into v_revision_id;
  update public.calculations set display_name = pg_catalog.btrim(p_name), current_revision_id = v_revision_id, status = 'current'
    where id = p_calculation_id and organization_id = p_organization_id;
  if v_scope = 'project' then
    insert into public.calculation_dependencies (organization_id, downstream_calculation_revision_id, upstream_roof_model_revision_id, dependency_type)
    values (p_organization_id, v_revision_id, p_source_roof_revision_id, 'roof_geometry_input');
  end if;
  insert into public.gable_metal_tile_save_operations (organization_id, operation_id, calculation_id, request_payload, calculation_revision_id, revision_number, created_by)
  values (p_organization_id, p_operation_id, p_calculation_id, v_payload, v_revision_id, v_revision_number, p_actor_id);
  return query select p_calculation_id, v_revision_id, v_revision_number, false;
end;
$$;
revoke all on function public.save_gable_metal_tile_covering_calculation(uuid,uuid,uuid,integer,text,uuid,uuid,uuid,jsonb,jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.save_gable_metal_tile_covering_calculation(uuid,uuid,uuid,integer,text,uuid,uuid,uuid,jsonb,jsonb,jsonb,uuid) to tetopro_covering_writer;

comment on function public.save_gable_metal_tile_covering_calculation(uuid,uuid,uuid,integer,text,uuid,uuid,uuid,jsonb,jsonb,jsonb,uuid)
  is 'Server-only append after authenticated TypeScript roof.gable and metal tile recalculation; the dedicated login has no table privileges.';
