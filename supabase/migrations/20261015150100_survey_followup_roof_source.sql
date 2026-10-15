-- F9.9: a project created from a projectless survey is an authorized geometry destination.
create or replace function public.link_field_survey_calculation(p_survey_id uuid,p_revision_id uuid,p_section_id uuid,p_calculation_id uuid,p_calculation_revision_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.field_surveys%rowtype; r public.field_survey_revisions%rowtype; c public.calculations%rowtype; link_id uuid; section_type text;
begin
 select * into s from public.field_surveys where id=p_survey_id for update;
 if not found or not private.can_access_field_survey(s.id,s.organization_id) then raise exception 'Survey access denied' using errcode='42501'; end if;
 select * into r from public.field_survey_revisions where id=p_revision_id and survey_id=s.id and organization_id=s.organization_id;
 if not found then raise exception 'Exact survey revision required' using errcode='42501'; end if;
 select x->>'workType' into section_type from pg_catalog.jsonb_array_elements(r.sections) x where x->>'id'=p_section_id::text;
 if section_type is null then raise exception 'Section not found in source revision' using errcode='22023'; end if;
 select * into c from public.calculations where id=p_calculation_id and organization_id=s.organization_id;
 if not found or (c.ownership_scope='standalone' and c.created_by is distinct from auth.uid())
  or (c.ownership_scope='project' and (coalesce(r.project_id,(select f.project_id from public.field_survey_followups f where f.survey_id=s.id and f.organization_id=s.organization_id and f.kind='project' limit 1)) is null
    or c.project_id is distinct from coalesce(r.project_id,(select f.project_id from public.field_survey_followups f where f.survey_id=s.id and f.organization_id=s.organization_id and f.kind='project' limit 1))
    or not exists(select 1 from public.projects p where p.id=c.project_id and p.organization_id=s.organization_id))) then
  raise exception 'Calculation access denied' using errcode='42501'; end if;
 if not exists(select 1 from public.calculation_revisions cr where cr.id=p_calculation_revision_id and cr.calculation_id=c.id and cr.organization_id=s.organization_id) then
  raise exception 'Exact calculation revision required' using errcode='42501'; end if;
 if c.calculator_type='roof.gable' and not exists(select 1 from public.calculation_revisions cr
   where cr.id=p_calculation_revision_id and cr.calculation_id=c.id and cr.organization_id=s.organization_id
     and cr.data_provenance #>> '{surveySource,revisionId}' = r.id::text
     and cr.data_provenance #>> '{surveySource,sectionId}' = p_section_id::text) then
   raise exception 'Roof geometry was not derived from this exact survey revision and section' using errcode='22023'; end if;
 if not ((section_type='gutter' and c.calculator_type='gutters.material-estimate')
  or (section_type='flashing' and c.calculator_type='sheet_metal.flashings.material-estimate')
  or (section_type='roof' and c.calculator_type in ('roof.gable','roof.gable.trapezoidal-covering','roof.gable.metal-tile-covering'))) then
  raise exception 'Incompatible calculator' using errcode='22023'; end if;
 select id into link_id from public.field_survey_calculation_links where survey_id=s.id and section_id=p_section_id and calculation_revision_id=p_calculation_revision_id;
 if found then
  if not exists(select 1 from public.field_survey_calculation_links where id=link_id and survey_revision_id=p_revision_id and calculation_id=p_calculation_id) then
   raise exception 'Link retry mismatch' using errcode='22023'; end if;
  return link_id;
 end if;
 insert into public.field_survey_calculation_links(organization_id,survey_id,survey_revision_id,section_id,calculation_id,calculation_revision_id,created_by)
 values(s.organization_id,s.id,r.id,p_section_id,c.id,p_calculation_revision_id,auth.uid()) returning id into link_id;
 return link_id;
end;
$$;
