-- F5: atomic, authenticated persistence boundary for the production gable calculator.
-- SECURITY INVOKER keeps the existing RLS policies in force; no service-role bypass.

create or replace function public.save_gable_roof_calculation(
  p_organization_id uuid,
  p_project_id uuid,
  p_roof_model_id uuid,
  p_name text,
  p_input_data jsonb,
  p_output_data jsonb,
  p_data_provenance jsonb,
  p_warnings jsonb,
  p_expected_revision_number integer
)
returns table (
  roof_model_id uuid,
  roof_model_revision_id uuid,
  calculation_id uuid,
  calculation_revision_id uuid,
  revision_number integer
)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_roof_model_id uuid := p_roof_model_id;
  v_roof_revision_id uuid;
  v_calculation_id uuid;
  v_calculation_revision_id uuid;
  v_current_revision_number integer := 0;
  v_next_revision_number integer;
  v_calculation_revision_number integer;
begin
  if not private.is_org_member(p_organization_id) then
    raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501';
  end if;

  if p_name is null or char_length(trim(p_name)) not between 1 and 200 then
    raise exception 'A tetőmodell neve kötelező.' using errcode = '22023';
  end if;

  if v_roof_model_id is null then
    insert into public.roof_models (organization_id, project_id, name, roof_type)
    values (p_organization_id, p_project_id, trim(p_name), 'gable')
    returning id into v_roof_model_id;
  else
    select coalesce(rmr.revision_number, 0), rm.id
      into v_current_revision_number, v_roof_model_id
    from public.roof_models rm
    left join public.roof_model_revisions rmr on rmr.id = rm.current_revision_id
    where rm.id = v_roof_model_id
      and rm.organization_id = p_organization_id
      and rm.project_id = p_project_id
      and rm.roof_type = 'gable'
    for update of rm;

    if not found then
      raise exception 'A nyeregtető-modell nem található ebben a projektben.' using errcode = 'P0002';
    end if;

    if p_expected_revision_number is distinct from v_current_revision_number then
      raise exception 'A tetőmodell időközben megváltozott; töltsd újra az oldalt.' using errcode = '40001';
    end if;

    update public.roof_models
      set name = trim(p_name)
      where id = v_roof_model_id
        and organization_id = p_organization_id;
  end if;

  v_next_revision_number := v_current_revision_number + 1;
  insert into public.roof_model_revisions (
    organization_id, roof_model_id, revision_number, schema_version,
    input_data, validation_status, created_by
  ) values (
    p_organization_id, v_roof_model_id, v_next_revision_number, '1.0.0',
    p_input_data, 'verified', auth.uid()
  ) returning id into v_roof_revision_id;

  update public.roof_models
    set current_revision_id = v_roof_revision_id
    where id = v_roof_model_id
      and organization_id = p_organization_id;

  select c.id into v_calculation_id
  from public.calculations c
  where c.organization_id = p_organization_id
    and c.project_id = p_project_id
    and c.roof_model_id = v_roof_model_id
    and c.calculator_type = 'roof.gable'
  for update;

  if not found then
    insert into public.calculations (
      organization_id, project_id, roof_model_id, calculator_type, display_name, status
    ) values (
      p_organization_id, p_project_id, v_roof_model_id, 'roof.gable', trim(p_name), 'current'
    ) returning id into v_calculation_id;
    v_calculation_revision_number := 1;
  else
    select coalesce(max(cr.revision_number), 0) + 1
      into v_calculation_revision_number
    from public.calculation_revisions cr
    where cr.calculation_id = v_calculation_id;
    update public.calculations set display_name = trim(p_name), status = 'current' where id = v_calculation_id;
  end if;

  insert into public.calculation_revisions (
    organization_id, calculation_id, revision_number,
    input_schema_version, calculator_implementation_version,
    input_snapshot, output_snapshot, data_provenance,
    validation_status, warnings, created_by
  ) values (
    p_organization_id, v_calculation_id, v_calculation_revision_number,
    '1.0.0', '1.0.0', p_input_data, p_output_data,
    p_data_provenance, 'verified', coalesce(p_warnings, '[]'::jsonb), auth.uid()
  ) returning id into v_calculation_revision_id;

  update public.calculations
    set current_revision_id = v_calculation_revision_id, status = 'current'
    where id = v_calculation_id
      and organization_id = p_organization_id;

  insert into public.calculation_dependencies (
    organization_id, downstream_calculation_revision_id,
    upstream_roof_model_revision_id, dependency_type
  ) values (
    p_organization_id, v_calculation_revision_id, v_roof_revision_id, 'roof_model_input'
  );

  return query select v_roof_model_id, v_roof_revision_id, v_calculation_id,
    v_calculation_revision_id, v_next_revision_number;
end;
$$;

revoke all on function public.save_gable_roof_calculation(uuid, uuid, uuid, text, jsonb, jsonb, jsonb, jsonb, integer) from public, anon;
grant execute on function public.save_gable_roof_calculation(uuid, uuid, uuid, text, jsonb, jsonb, jsonb, jsonb, integer) to authenticated;
