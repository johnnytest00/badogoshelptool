-- F7.3.2: versioned material-bound sheet layouts and controlled draft handoff.

alter table public.calculation_revisions
  add column material_variant_id uuid;

alter table public.calculation_revisions
  add constraint calculation_revisions_material_variant_same_organization_fk
  foreign key (material_variant_id, organization_id)
  references public.material_variants (id, organization_id)
  on update cascade on delete restrict;

create index calculation_revisions_material_variant_idx
  on public.calculation_revisions (organization_id, material_variant_id)
  where material_variant_id is not null;

create unique index calculations_one_sheet_layout_per_roof
  on public.calculations (organization_id, roof_model_id, calculator_type)
  where calculator_type = 'covering.metal-sheets.layout';

create or replace function private.mark_roof_calculations_stale()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.current_revision_id is distinct from new.current_revision_id then
    update public.calculations
      set status = 'stale'
      where organization_id = new.organization_id
        and roof_model_id = new.id
        and calculator_type = 'covering.metal-sheets.layout';
  end if;
  return new;
end;
$$;

create trigger roof_models_mark_dependent_layouts_stale
after update of current_revision_id on public.roof_models
for each row execute function private.mark_roof_calculations_stale();

revoke all on function private.mark_roof_calculations_stale() from public;

create or replace function public.save_metal_sheet_layout(
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
  p_expected_revision_number integer
)
returns table (
  calculation_id uuid,
  calculation_revision_id uuid,
  revision_number integer,
  revision_created boolean
)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_calculation_id uuid;
  v_current_revision_id uuid;
  v_current_revision_number integer := 0;
  v_new_revision_id uuid;
  v_variant_found boolean;
begin
  if not private.is_org_member(p_organization_id) then
    raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501';
  end if;
  if p_display_name is null or char_length(trim(p_display_name)) not between 1 and 200 then
    raise exception 'A kiosztás neve kötelező.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_input_data) <> 'object' or jsonb_typeof(p_output_data) <> 'object' then
    raise exception 'Érvénytelen kiosztási snapshot.' using errcode = '22023';
  end if;
  if p_input_data #>> '{source,roofRevisionId}' is distinct from p_source_roof_revision_id::text
     or p_input_data #>> '{source,geometryCalculationRevisionId}' is distinct from p_source_geometry_calculation_revision_id::text
     or p_input_data #>> '{material,catalogSnapshot,variantId}' is distinct from p_material_variant_id::text then
    raise exception 'A snapshot forráshivatkozásai nem egyeznek.' using errcode = '22023';
  end if;

  perform 1
  from public.roof_models rm
  join public.roof_model_revisions rmr
    on rmr.id = p_source_roof_revision_id and rmr.roof_model_id = rm.id
  where rm.id = p_roof_model_id
    and rm.organization_id = p_organization_id
    and rm.project_id = p_project_id
    and rm.current_revision_id = p_source_roof_revision_id
  for update of rm;
  if not found then
    raise exception 'A tetőgeometria időközben megváltozott.' using errcode = '40001';
  end if;

  perform 1
  from public.calculation_revisions cr
  join public.calculations c on c.id = cr.calculation_id
  where cr.id = p_source_geometry_calculation_revision_id
    and cr.organization_id = p_organization_id
    and c.project_id = p_project_id
    and c.roof_model_id = p_roof_model_id
    and c.calculator_type = 'roof.gable'
    and c.current_revision_id = cr.id
    and cr.validation_status = 'verified';
  if not found then
    raise exception 'A forráskalkuláció nem aktuális vagy érvénytelen.' using errcode = '40001';
  end if;

  select true into v_variant_found
  from public.material_variants mv
  join public.material_products mp on mp.id = mv.product_id and mp.organization_id = mv.organization_id
  where mv.id = p_material_variant_id
    and mv.organization_id = p_organization_id
    and mp.status = 'active';
  if not coalesce(v_variant_found, false) then
    raise exception 'Az aktív anyagváltozat nem található ebben a műhelyben.' using errcode = '23503';
  end if;

  select c.id, c.current_revision_id, coalesce(cr.revision_number, 0)
    into v_calculation_id, v_current_revision_id, v_current_revision_number
  from public.calculations c
  left join public.calculation_revisions cr on cr.id = c.current_revision_id
  where c.organization_id = p_organization_id
    and c.project_id = p_project_id
    and c.roof_model_id = p_roof_model_id
    and c.calculator_type = 'covering.metal-sheets.layout'
  for update of c;

  if found then
    if p_layout_calculation_id is not null and p_layout_calculation_id <> v_calculation_id then
      raise exception 'A kiosztás nem ehhez a tetőmodellhez tartozik.' using errcode = '23503';
    end if;
    if p_expected_revision_number is distinct from v_current_revision_number then
      raise exception 'A kiosztás időközben megváltozott; töltsd újra az oldalt.' using errcode = '40001';
    end if;
    if exists (
      select 1 from public.calculation_revisions cr
      where cr.id = v_current_revision_id
        and cr.material_variant_id = p_material_variant_id
        and cr.input_snapshot = p_input_data
    ) then
      update public.calculations set status = 'current' where id = v_calculation_id;
      return query select v_calculation_id, v_current_revision_id, v_current_revision_number, false;
      return;
    end if;
  else
    v_current_revision_number := 0;
    if p_layout_calculation_id is not null or p_expected_revision_number <> 0 then
      raise exception 'A kiosztás előzménye nem található.' using errcode = '40001';
    end if;
    insert into public.calculations (
      organization_id, project_id, roof_model_id, calculator_type, display_name, status
    ) values (
      p_organization_id, p_project_id, p_roof_model_id,
      'covering.metal-sheets.layout', trim(p_display_name), 'current'
    ) returning id into v_calculation_id;
  end if;

  insert into public.calculation_revisions (
    organization_id, calculation_id, revision_number,
    input_schema_version, calculator_implementation_version,
    input_snapshot, output_snapshot, data_provenance,
    validation_status, warnings, created_by, material_variant_id
  ) values (
    p_organization_id, v_calculation_id, v_current_revision_number + 1,
    '1.0.0', '1.0.0', p_input_data, p_output_data, p_data_provenance,
    'verified', coalesce(p_warnings, '[]'::jsonb), auth.uid(), p_material_variant_id
  ) returning id into v_new_revision_id;

  update public.calculations
    set current_revision_id = v_new_revision_id,
        display_name = trim(p_display_name),
        status = 'current'
    where id = v_calculation_id and organization_id = p_organization_id;

  insert into public.calculation_dependencies (
    organization_id, downstream_calculation_revision_id,
    upstream_roof_model_revision_id, dependency_type
  ) values (
    p_organization_id, v_new_revision_id, p_source_roof_revision_id, 'roof_model_input'
  );
  insert into public.calculation_dependencies (
    organization_id, downstream_calculation_revision_id,
    upstream_calculation_revision_id, dependency_type
  ) values (
    p_organization_id, v_new_revision_id, p_source_geometry_calculation_revision_id, 'geometry_calculation'
  );

  return query select v_calculation_id, v_new_revision_id, v_current_revision_number + 1, true;
end;
$$;

revoke all on function public.save_metal_sheet_layout(uuid, uuid, uuid, uuid, uuid, uuid, uuid, text, jsonb, jsonb, jsonb, jsonb, integer) from public, anon;
grant execute on function public.save_metal_sheet_layout(uuid, uuid, uuid, uuid, uuid, uuid, uuid, text, jsonb, jsonb, jsonb, jsonb, integer) to authenticated;

create or replace function public.create_sheet_layout_takeoff_draft(
  p_organization_id uuid,
  p_project_id uuid,
  p_layout_calculation_id uuid,
  p_layout_revision_id uuid,
  p_name text,
  p_allowance_percent numeric
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_takeoff_id uuid;
  v_variant_id uuid;
  v_roof_model_id uuid;
  v_roof_revision_id uuid;
  v_geometry_revision_id uuid;
  v_area numeric;
  v_quantity numeric;
  v_material_snapshot jsonb;
  v_provenance public.material_data_provenance;
begin
  if not private.is_org_member(p_organization_id) then
    raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501';
  end if;
  if p_allowance_percent is null or p_allowance_percent < 0 or p_allowance_percent > 1000 then
    raise exception 'Érvénytelen ráhagyás.' using errcode = '22023';
  end if;

  select cr.material_variant_id, c.roof_model_id,
         cr.input_snapshot #> '{material,catalogSnapshot}',
         (cr.input_snapshot #>> '{material,catalogSnapshot,provenance}')::public.material_data_provenance
    into v_variant_id, v_roof_model_id, v_material_snapshot, v_provenance
  from public.calculations c
  join public.calculation_revisions cr on cr.id = p_layout_revision_id and cr.calculation_id = c.id
  join public.material_variants mv on mv.id = cr.material_variant_id and mv.organization_id = cr.organization_id
  where c.id = p_layout_calculation_id
    and c.current_revision_id = p_layout_revision_id
    and c.organization_id = p_organization_id
    and c.project_id = p_project_id
    and c.calculator_type = 'covering.metal-sheets.layout'
    and cr.validation_status = 'verified'
    and mv.purchasing_unit = 'square_meter';
  if not found then
    raise exception 'Csak aktuális, mentett, négyzetméteres kiosztás adható át automatikusan.' using errcode = '22023';
  end if;

  select cd.upstream_roof_model_revision_id into v_roof_revision_id
  from public.calculation_dependencies cd
  where cd.downstream_calculation_revision_id = p_layout_revision_id
    and cd.organization_id = p_organization_id
    and cd.upstream_roof_model_revision_id is not null;
  select cd.upstream_calculation_revision_id into v_geometry_revision_id
  from public.calculation_dependencies cd
  where cd.downstream_calculation_revision_id = p_layout_revision_id
    and cd.organization_id = p_organization_id
    and cd.upstream_calculation_revision_id is not null
    and cd.dependency_type = 'geometry_calculation';
  select (cr.output_snapshot #>> '{areas,combinedRoofM2}')::numeric into v_area
  from public.calculation_revisions cr
  where cr.id = v_geometry_revision_id and cr.organization_id = p_organization_id;
  if v_area is null or v_area < 0 then
    raise exception 'A hiteles tetőfelület nem olvasható.' using errcode = '22023';
  end if;
  v_quantity := v_area * (1 + p_allowance_percent / 100);

  insert into public.material_takeoffs (
    organization_id, project_id, source_calculation_id, source_calculation_revision_id,
    source_roof_model_id, source_roof_model_revision_id, name, status, created_by
  ) values (
    p_organization_id, p_project_id, p_layout_calculation_id, p_layout_revision_id,
    v_roof_model_id, v_roof_revision_id, coalesce(nullif(trim(p_name), ''), 'Lemezkiosztás anyagtervezet'),
    'draft', auth.uid()
  ) returning id into v_takeoff_id;

  insert into public.material_takeoff_items (
    organization_id, takeoff_id, variant_id, estimation_method, measurement_source,
    selected_measurement_value, allowance_percent, calculated_quantity, final_quantity,
    quantity_unit, material_snapshot, data_provenance, warnings, created_by
  ) values (
    p_organization_id, v_takeoff_id, v_variant_id, 'area', 'areas.combinedRoofM2',
    v_area, p_allowance_percent, v_quantity, v_quantity, 'square_meter',
    v_material_snapshot, coalesce(v_provenance, 'missing'), '[]'::jsonb, auth.uid()
  );
  return v_takeoff_id;
end;
$$;

revoke all on function public.create_sheet_layout_takeoff_draft(uuid, uuid, uuid, uuid, text, numeric) from public, anon;
grant execute on function public.create_sheet_layout_takeoff_draft(uuid, uuid, uuid, uuid, text, numeric) to authenticated;

comment on column public.calculation_revisions.material_variant_id is 'Catalog variant used by a calculation revision; technical values remain snapshotted in input_snapshot.';
