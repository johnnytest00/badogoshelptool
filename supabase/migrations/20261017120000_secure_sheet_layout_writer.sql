-- F9.31: route project sheet-layout saves through the restricted writer role.
-- Keep the legacy RPC and data model for history, but remove its broken
-- authenticated entry point. The wrapper supplies an explicit actor claim to
-- the existing validator while executing as the SECURITY DEFINER owner.

create table public.sheet_layout_save_operations (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  operation_id uuid not null,
  project_id uuid not null references public.projects(id) on delete restrict,
  roof_model_id uuid not null references public.roof_models(id) on delete restrict,
  request_payload jsonb not null,
  calculation_id uuid not null,
  calculation_revision_id uuid not null,
  revision_number integer not null,
  revision_created boolean not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (organization_id, operation_id)
);
alter table public.sheet_layout_save_operations enable row level security;
revoke all on public.sheet_layout_save_operations from public, anon, authenticated, tetopro_covering_writer;

create function public.save_metal_sheet_layout_secure(
  p_organization_id uuid,
  p_project_id uuid,
  p_roof_model_id uuid,
  p_source_roof_revision_id uuid,
  p_source_geometry_calculation_revision_id uuid,
  p_layout_calculation_id uuid,
  p_material_variant_id uuid,
  p_display_name text,
  p_input_data jsonb,
  p_output_data jsonb,
  p_data_provenance jsonb,
  p_warnings jsonb,
  p_expected_revision_number integer,
  p_operation_id uuid,
  p_actor_id uuid
)
returns table (
  calculation_id uuid,
  calculation_revision_id uuid,
  revision_number integer,
  revision_created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prior public.sheet_layout_save_operations%rowtype;
  v_saved record;
  v_payload jsonb;
begin
  if p_organization_id is null or p_project_id is null or p_roof_model_id is null
     or p_source_roof_revision_id is null or p_source_geometry_calculation_revision_id is null
     or p_material_variant_id is null or p_operation_id is null or p_actor_id is null
     or p_expected_revision_number is null or p_expected_revision_number < 0 then
    raise exception 'Érvénytelen lemezkiosztási mentési adat.' using errcode = '22023';
  end if;
  perform 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = p_actor_id
    for share;
  if not found then
    raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.projects p where p.id = p_project_id and p.organization_id = p_organization_id) then
    raise exception 'A projekt nem érhető el ebben a műhelyben.' using errcode = '42501';
  end if;

  v_payload := pg_catalog.jsonb_build_object(
    'projectId', p_project_id,
    'roofModelId', p_roof_model_id,
    'sourceRoofRevisionId', p_source_roof_revision_id,
    'sourceGeometryCalculationRevisionId', p_source_geometry_calculation_revision_id,
    'layoutCalculationId', p_layout_calculation_id,
    'materialVariantId', p_material_variant_id,
    'displayName', p_display_name,
    'input', p_input_data,
    'output', p_output_data,
    'provenance', p_data_provenance,
    'warnings', p_warnings,
    'expectedRevisionNumber', p_expected_revision_number
  );
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':sheet-layout-op:' || p_operation_id::text, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':sheet-layout-roof:' || p_roof_model_id::text, 0));
  select * into v_prior from public.sheet_layout_save_operations o
    where o.organization_id = p_organization_id and o.operation_id = p_operation_id;
  if found then
    if v_prior.created_by <> p_actor_id or v_prior.project_id <> p_project_id
       or v_prior.roof_model_id <> p_roof_model_id or v_prior.request_payload is distinct from v_payload then
      raise exception 'A műveletazonosító más kéréshez tartozik.' using errcode = '22023';
    end if;
    return query select v_prior.calculation_id, v_prior.calculation_revision_id, v_prior.revision_number, v_prior.revision_created;
    return;
  end if;

  -- save_metal_sheet_layout contains the established source, catalog,
  -- revision and immutable snapshot checks. Running it inside this restricted
  -- definer preserves that contract while its source row lock bypasses the
  -- authenticated UPDATE-deny policy that caused the 40001 regression.
  perform pg_catalog.set_config('request.jwt.claim.sub', p_actor_id::text, true);
  select * into v_saved from public.save_metal_sheet_layout(
    p_organization_id,
    p_project_id,
    p_roof_model_id,
    p_source_roof_revision_id,
    p_source_geometry_calculation_revision_id,
    p_layout_calculation_id,
    p_material_variant_id,
    p_display_name,
    p_input_data,
    p_output_data,
    p_data_provenance,
    p_warnings,
    p_expected_revision_number
  );
  if v_saved.calculation_id is null or v_saved.calculation_revision_id is null then
    raise exception 'A kiosztás mentése nem adott vissza revíziót.' using errcode = 'P0001';
  end if;
  insert into public.sheet_layout_save_operations (
    organization_id, operation_id, project_id, roof_model_id, request_payload,
    calculation_id, calculation_revision_id, revision_number, revision_created, created_by
  ) values (
    p_organization_id, p_operation_id, p_project_id, p_roof_model_id, v_payload,
    v_saved.calculation_id, v_saved.calculation_revision_id, v_saved.revision_number,
    v_saved.revision_created, p_actor_id
  );
  return query select v_saved.calculation_id, v_saved.calculation_revision_id, v_saved.revision_number, v_saved.revision_created;
end;
$$;

revoke all on function public.save_metal_sheet_layout_secure(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,integer,uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.save_metal_sheet_layout_secure(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,integer,uuid,uuid)
  to tetopro_covering_writer;

-- Keep the legacy signature as a compatibility marker, but no longer expose
-- the row-locking SECURITY INVOKER implementation to authenticated clients.
revoke all on function public.save_metal_sheet_layout(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,integer)
  from public, anon, authenticated;

comment on function public.save_metal_sheet_layout_secure(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,integer,uuid,uuid)
  is 'Restricted, actor-authorized, idempotent project sheet-layout writer; delegates established source and snapshot validation to the legacy implementation.';
