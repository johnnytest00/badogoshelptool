-- F9.6.1.1.1: project-scoped immutable gutter calculation revisions.
-- Ordered after the applied 20261013080000 migration; previous timestamp collided with F7.3.2.
create unique index calculations_one_gutter_estimate_per_project
  on public.calculations (organization_id, project_id, calculator_type)
  where roof_model_id is null and calculator_type = 'gutters.material-estimate';

create or replace function public.save_gutter_material_calculation(
  p_organization_id uuid,
  p_project_id uuid,
  p_name text,
  p_input_data jsonb,
  p_output_data jsonb,
  p_data_provenance jsonb,
  p_warnings jsonb,
  p_source_roof_revision_id uuid,
  p_expected_revision_number integer
)
returns table (calculation_id uuid, calculation_revision_id uuid, revision_number integer)
language plpgsql security invoker set search_path = public, pg_catalog
as $$
declare
  v_calculation_id uuid;
  v_revision_id uuid;
  v_current integer := 0;
  v_next integer;
  v_roof_revision_id uuid;
begin
  if not private.is_org_member(p_organization_id) then
    raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501';
  end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 200 then
    raise exception 'A kalkuláció megnevezése kötelező.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.projects where id = p_project_id and organization_id = p_organization_id) then
    raise exception 'A projekt nem található ebben a műhelyben.' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_input_data) is distinct from 'object' or jsonb_typeof(p_input_data -> 'runs') is distinct from 'array'
     or jsonb_typeof(p_output_data) is distinct from 'object' then
    raise exception 'A kalkuláció bemenete vagy eredménye érvénytelen.' using errcode = '22023';
  end if;

  -- Serialize both first-save and subsequent-save calls for this project calculation.
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || p_project_id::text || ':gutters.material-estimate', 0));

  select c.id into v_calculation_id
  from public.calculations c
  where c.organization_id = p_organization_id and c.project_id = p_project_id
    and c.roof_model_id is null and c.calculator_type = 'gutters.material-estimate'
  for update;

  if v_calculation_id is not null then
    select coalesce(max(cr.revision_number), 0) into v_current
    from public.calculation_revisions cr where cr.calculation_id = v_calculation_id;
  end if;
  if p_expected_revision_number is distinct from v_current then
    raise exception 'A kalkuláció időközben megváltozott; töltsd újra az oldalt.' using errcode = '40001';
  end if;

  if v_calculation_id is null then
    insert into public.calculations (organization_id, project_id, calculator_type, display_name, status)
    values (p_organization_id, p_project_id, 'gutters.material-estimate', trim(p_name), 'current')
    returning id into v_calculation_id;
  end if;

  v_next := v_current + 1;
  insert into public.calculation_revisions (
    organization_id, calculation_id, revision_number, input_schema_version,
    calculator_implementation_version, input_snapshot, output_snapshot,
    data_provenance, validation_status, warnings, created_by
  ) values (
    p_organization_id, v_calculation_id, v_next, '1.0.0', '1.0.0',
    p_input_data, p_output_data, coalesce(p_data_provenance, '{}'::jsonb),
    'verified', coalesce(p_warnings, '[]'::jsonb), auth.uid()
  ) returning id into v_revision_id;

  update public.calculations
  set display_name = trim(p_name), current_revision_id = v_revision_id, status = 'current'
  where id = v_calculation_id and organization_id = p_organization_id;

  -- Persist every referenced geometry revision from the validated input, not only the first run.
  for v_roof_revision_id in
    select distinct refs.revision_id
    from (
      select nullif(run.value -> 'roofEdge' ->> 'revisionId', '')::uuid as revision_id
      from jsonb_array_elements(p_input_data -> 'runs') as run(value)
      where jsonb_typeof(run.value -> 'roofEdge') = 'object'
      union
      select p_source_roof_revision_id where p_source_roof_revision_id is not null
    ) as refs
    where refs.revision_id is not null
  loop
    if not exists (
      select 1
      from public.roof_model_revisions r
      join public.roof_models m on m.id = r.roof_model_id and m.organization_id = r.organization_id
      where r.id = v_roof_revision_id and r.organization_id = p_organization_id and m.project_id = p_project_id
    ) then
      raise exception 'A forrás tetőrevízió nem ehhez a projekthez tartozik.' using errcode = 'P0002';
    end if;
    insert into public.calculation_dependencies (
      organization_id, downstream_calculation_revision_id, upstream_roof_model_revision_id, dependency_type
    ) values (p_organization_id, v_revision_id, v_roof_revision_id, 'gutter_geometry_input');
  end loop;

  return query select v_calculation_id, v_revision_id, v_next;
end;
$$;

revoke all on function public.save_gutter_material_calculation(uuid, uuid, text, jsonb, jsonb, jsonb, jsonb, uuid, integer) from public, anon;
grant execute on function public.save_gutter_material_calculation(uuid, uuid, text, jsonb, jsonb, jsonb, jsonb, uuid, integer) to authenticated;

