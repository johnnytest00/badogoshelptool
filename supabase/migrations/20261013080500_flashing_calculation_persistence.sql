-- F9.6.2.2: project-scoped, immutable flashing estimate revisions.
create unique index calculations_one_flashing_estimate_per_project
  on public.calculations (organization_id, project_id, calculator_type)
  where roof_model_id is null and calculator_type = 'sheet_metal.flashings.material-estimate';

create or replace function public.save_flashing_material_calculation(
  p_organization_id uuid,
  p_project_id uuid,
  p_name text,
  p_input_data jsonb,
  p_output_data jsonb,
  p_data_provenance jsonb,
  p_warnings jsonb,
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
  v_run jsonb;
  v_ref jsonb;
  v_source_length numeric;
  v_expected_field text;
  v_expected_category text;
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
  if jsonb_typeof(p_input_data) is distinct from 'object'
     or jsonb_typeof(p_input_data -> 'runs') is distinct from 'array'
     or jsonb_typeof(p_output_data) is distinct from 'object' then
    raise exception 'A kalkuláció bemenete vagy eredménye érvénytelen.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || p_project_id::text || ':sheet_metal.flashings.material-estimate', 0));
  select c.id into v_calculation_id
  from public.calculations c
  where c.organization_id = p_organization_id and c.project_id = p_project_id
    and c.roof_model_id is null and c.calculator_type = 'sheet_metal.flashings.material-estimate'
  for update;
  if v_calculation_id is not null then
    select coalesce(max(cr.revision_number), 0) into v_current
    from public.calculation_revisions cr where cr.calculation_id = v_calculation_id;
  end if;
  if p_expected_revision_number is distinct from v_current then
    raise exception 'A kalkuláció időközben megváltozott; töltsd újra az oldalt.' using errcode = '40001';
  end if;

  -- Validate and lock each exact source pair before creating the immutable revision.
  for v_run in select value from jsonb_array_elements(p_input_data -> 'runs')
  loop
    if jsonb_typeof(v_run) is distinct from 'object'
       or coalesce(v_run ->> 'category', '') not in ('verge', 'wall', 'eaves', 'ridge', 'valley', 'custom')
       or coalesce(v_run ->> 'lengthSource', '') not in ('geometry', 'site_measurement', 'drawing', 'user_provided', 'demo')
       or jsonb_typeof(v_run -> 'lengthMm') is distinct from 'number'
       or (v_run ->> 'lengthMm') !~ '^[0-9]+$'
       or (v_run ->> 'lengthMm')::numeric <= 0
       or (v_run ->> 'lengthMm')::numeric > 9007199254740991 then
      raise exception 'A szegélyszakasz alapadata érvénytelen.' using errcode = '22023';
    end if;
    v_ref := v_run -> 'roofEdgeReference';
    if jsonb_typeof(v_ref) = 'object' then
      if jsonb_typeof(v_ref -> 'suggestedLengthMm') is distinct from 'number'
         or (v_ref ->> 'suggestedLengthMm')::numeric <= 0
         or (v_ref ->> 'suggestedLengthMm')::numeric > 9007199254740991
         or (v_ref ? 'lengthOverridden' and jsonb_typeof(v_ref -> 'lengthOverridden') is distinct from 'boolean') then
        raise exception 'A geometriai eredethossz vagy felülírásjelző érvénytelen.' using errcode = '22023';
      end if;
      v_expected_field := case v_ref ->> 'edgeId'
        when 'left-eave' then 'lengths.eachEaveEdgeMm'
        when 'right-eave' then 'lengths.eachEaveEdgeMm'
        when 'ridge' then 'lengths.ridgeLineMm'
        when 'left-front-gable' then 'lengths.eachSlopingGableEdgeMm'
        when 'left-rear-gable' then 'lengths.eachSlopingGableEdgeMm'
        when 'right-front-gable' then 'lengths.eachSlopingGableEdgeMm'
        when 'right-rear-gable' then 'lengths.eachSlopingGableEdgeMm'
        else null end;
      v_expected_category := case v_ref ->> 'edgeId'
        when 'left-eave' then 'eaves' when 'right-eave' then 'eaves'
        when 'ridge' then 'ridge'
        when 'left-front-gable' then 'verge' when 'left-rear-gable' then 'verge'
        when 'right-front-gable' then 'verge' when 'right-rear-gable' then 'verge'
        else null end;
      if v_expected_field is null or v_ref ->> 'outputField' is distinct from v_expected_field
         or v_run ->> 'category' is distinct from v_expected_category
         or v_run ->> 'lengthSource' is distinct from 'geometry' then
        raise exception 'A geometriai él-hozzárendelés érvénytelen.' using errcode = '22023';
      end if;
      perform 1 from public.roof_models m
      where m.id = nullif(v_ref ->> 'roofModelId', '')::uuid
        and m.organization_id = p_organization_id and m.project_id = p_project_id
        and m.roof_type = 'gable' and m.current_revision_id = nullif(v_ref ->> 'roofModelRevisionId', '')::uuid
      for share;
      if not found then raise exception 'A forrás tetőmodell vagy revízió nem aktuális ehhez a projekthez.' using errcode = 'P0002'; end if;
      if not exists (
        select 1 from public.roof_model_revisions r
        where r.id = nullif(v_ref ->> 'roofModelRevisionId', '')::uuid
          and r.roof_model_id = nullif(v_ref ->> 'roofModelId', '')::uuid
          and r.organization_id = p_organization_id and r.validation_status = 'verified'
      ) then raise exception 'A forrás tetőrevízió nem ellenőrzött.' using errcode = 'P0002'; end if;
      perform 1 from public.calculations c
      where c.organization_id = p_organization_id and c.project_id = p_project_id
        and c.id = nullif(v_ref ->> 'calculationId', '')::uuid
        and c.roof_model_id = nullif(v_ref ->> 'roofModelId', '')::uuid
        and c.calculator_type = 'roof.gable'
        and c.current_revision_id = nullif(v_ref ->> 'calculationRevisionId', '')::uuid
      for share;
      if not found then raise exception 'A forrás tetőkalkuláció időközben megváltozott.' using errcode = '40001'; end if;
      select case v_expected_field
        when 'lengths.eachEaveEdgeMm' then (r.output_snapshot #>> '{lengths,eachEaveEdgeMm}')::numeric
        when 'lengths.ridgeLineMm' then (r.output_snapshot #>> '{lengths,ridgeLineMm}')::numeric
        when 'lengths.eachSlopingGableEdgeMm' then (r.output_snapshot #>> '{lengths,eachSlopingGableEdgeMm}')::numeric
      end into v_source_length
      from public.calculation_revisions r
      join public.calculations c on c.id = r.calculation_id
      where r.id = nullif(v_ref ->> 'calculationRevisionId', '')::uuid
        and r.organization_id = p_organization_id and r.validation_status = 'verified'
        and c.calculator_type = 'roof.gable' and c.roof_model_id = nullif(v_ref ->> 'roofModelId', '')::uuid;
      if v_source_length is null or v_source_length <= 0
         or v_source_length is distinct from (v_ref ->> 'suggestedLengthMm')::numeric
         or (coalesce((v_ref ->> 'lengthOverridden')::boolean, false) is false
             and (v_run ->> 'lengthMm')::numeric is distinct from ceil(v_source_length))
         or not exists (
           select 1 from public.calculation_dependencies d
           where d.downstream_calculation_revision_id = nullif(v_ref ->> 'calculationRevisionId', '')::uuid
             and d.upstream_roof_model_revision_id = nullif(v_ref ->> 'roofModelRevisionId', '')::uuid
         ) then
        raise exception 'A javasolt geometriai hossz nem egyezik a forrássnapshot-tal.' using errcode = '22023';
      end if;
    elsif v_run ->> 'lengthSource' = 'geometry' then
      raise exception 'Geometriai hosszhoz forráshivatkozás szükséges.' using errcode = '22023';
    end if;
  end loop;

  if v_calculation_id is null then
    insert into public.calculations (organization_id, project_id, calculator_type, display_name, status)
    values (p_organization_id, p_project_id, 'sheet_metal.flashings.material-estimate', trim(p_name), 'current')
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
  update public.calculations set display_name = trim(p_name), current_revision_id = v_revision_id, status = 'current'
  where id = v_calculation_id and organization_id = p_organization_id;

  insert into public.calculation_dependencies (organization_id, downstream_calculation_revision_id, upstream_roof_model_revision_id, dependency_type)
  select distinct p_organization_id, v_revision_id, (run.value -> 'roofEdgeReference' ->> 'roofModelRevisionId')::uuid, 'flashing_roof_geometry'
  from jsonb_array_elements(p_input_data -> 'runs') run(value)
  where jsonb_typeof(run.value -> 'roofEdgeReference') = 'object'
  on conflict do nothing;
  insert into public.calculation_dependencies (organization_id, downstream_calculation_revision_id, upstream_calculation_revision_id, dependency_type)
  select distinct p_organization_id, v_revision_id, (run.value -> 'roofEdgeReference' ->> 'calculationRevisionId')::uuid, 'flashing_roof_calculation'
  from jsonb_array_elements(p_input_data -> 'runs') run(value)
  where jsonb_typeof(run.value -> 'roofEdgeReference') = 'object'
  on conflict do nothing;
  return query select v_calculation_id, v_revision_id, v_next;
end;
$$;

revoke all on function public.save_flashing_material_calculation(uuid, uuid, text, jsonb, jsonb, jsonb, jsonb, integer) from public, anon;
grant execute on function public.save_flashing_material_calculation(uuid, uuid, text, jsonb, jsonb, jsonb, jsonb, integer) to authenticated;
