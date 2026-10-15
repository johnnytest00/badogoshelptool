-- F9.10: forward repair for the local survey source function.
create or replace function public.register_survey_multi_roof_source(
  p_organization_id uuid,p_survey_id uuid,p_survey_revision_id uuid,p_section_id uuid,
  p_roof_model_revision_id uuid,p_calculation_revision_id uuid,p_actor_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare survey_row public.field_surveys%rowtype; revision_row public.field_survey_revisions%rowtype; model_row public.roof_models%rowtype; calc_row public.calculations%rowtype;
begin
  perform 1 from public.organization_members m where m.organization_id=p_organization_id and m.user_id=p_actor_id for share;
  if not found then raise exception 'Organization access denied' using errcode='42501'; end if;
  select * into survey_row from public.field_surveys s where s.id=p_survey_id and s.organization_id=p_organization_id for share;
  if not found then raise exception 'Survey access denied' using errcode='42501'; end if;
  select * into revision_row from public.field_survey_revisions r where r.id=p_survey_revision_id and r.survey_id=p_survey_id and r.organization_id=p_organization_id for share;
  if not found or revision_row.version<>survey_row.version then raise exception 'Current survey revision required' using errcode='40001'; end if;
  select * into model_row from public.roof_models m where m.current_revision_id=p_roof_model_revision_id and m.organization_id=p_organization_id for share;
  if not found or model_row.project_id is distinct from coalesce(revision_row.project_id,
      (select f.project_id from public.field_survey_followups f where f.survey_id=p_survey_id and f.organization_id=p_organization_id and f.kind='project' limit 1)) then
    raise exception 'Project roof source mismatch' using errcode='42501';
  end if;
  select * into calc_row from public.calculations c where c.roof_model_id=model_row.id and c.current_revision_id=p_calculation_revision_id and c.organization_id=p_organization_id and c.project_id=model_row.project_id and c.calculator_type='roof.geometry.'||model_row.roof_type for share;
  if not found or not exists (
    select 1 from public.calculation_revisions cr join public.roof_model_revisions mr on mr.id=p_roof_model_revision_id
      join public.calculation_dependencies d on d.downstream_calculation_revision_id=cr.id and d.upstream_roof_model_revision_id=mr.id
    where cr.id=p_calculation_revision_id and cr.calculation_id=calc_row.id and cr.validation_status='verified'
      and mr.roof_model_id=model_row.id and mr.validation_status='verified' and mr.input_data=cr.input_snapshot
      and private.survey_multi_roof_input_matches(revision_row.sections,p_section_id,cr.input_snapshot)
  ) then raise exception 'Exact survey measurements do not match the roof geometry' using errcode='22023'; end if;
  insert into public.survey_multi_roof_sources(organization_id,survey_id,survey_revision_id,section_id,roof_model_revision_id,calculation_revision_id,created_by)
    values(p_organization_id,p_survey_id,p_survey_revision_id,p_section_id,p_roof_model_revision_id,p_calculation_revision_id,p_actor_id)
    on conflict(calculation_revision_id) do nothing;
  if not exists(select 1 from public.survey_multi_roof_sources src where src.calculation_revision_id=p_calculation_revision_id and src.survey_revision_id=p_survey_revision_id and src.section_id=p_section_id and src.roof_model_revision_id=p_roof_model_revision_id and src.created_by=p_actor_id) then
    raise exception 'Survey source retry mismatch' using errcode='22023';
  end if;
  return true;
end;$$;
