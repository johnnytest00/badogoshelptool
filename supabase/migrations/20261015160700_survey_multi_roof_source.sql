-- F9.10: exact survey-to-geometry provenance, recorded only by the server writer.
create function private.survey_multi_roof_input_matches(p_sections jsonb,p_section_id uuid,p_input jsonb)
returns boolean language plpgsql stable set search_path='' as $$
declare
  section jsonb; measurement jsonb; key text; value_mm numeric;
  roof_type text; values_json jsonb:='{}'::jsonb; required text[];
begin
  select item into section from pg_catalog.jsonb_array_elements(p_sections) item where item->>'id'=p_section_id::text and item->>'workType'='roof';
  roof_type:=section->>'roofType';
  if roof_type not in ('shed','hip','pyramid','halfHip','lShape','tShape') or p_input->>'type' is distinct from roof_type then return false; end if;
  required:=case when roof_type='pyramid' then array['sideMm','pitchDegrees']
    when roof_type='halfHip' then array['lengthMm','widthMm','pitchDegrees','hipEaveHeightMm']
    when roof_type in ('lShape','tShape') then array['lengthMm','widthMm','pitchDegrees','wingWidthMm','wingProjectionMm']
    else array['lengthMm','widthMm','pitchDegrees'] end;
  for measurement in select item from pg_catalog.jsonb_array_elements(section->'measurements') item loop
    key:=case measurement->>'semanticType'
      when 'roof_outer_length' then 'lengthMm' when 'roof_outer_width' then 'widthMm'
      when 'roof_outer_side' then 'sideMm' when 'roof_pitch' then 'pitchDegrees'
      when 'roof_hip_eave_height' then 'hipEaveHeightMm' when 'roof_wing_width' then 'wingWidthMm'
      when 'roof_wing_projection' then 'wingProjectionMm' else null end;
    if key is null then continue; end if;
    if key=any(required) then
      if values_json ? key or pg_catalog.jsonb_typeof(measurement->'value') is distinct from 'number' then return false; end if;
      if key='pitchDegrees' then
        if measurement->>'unit' is distinct from 'degree' then return false; end if;
        value_mm:=(measurement->>'value')::numeric;
      else
        if measurement->>'unit' not in ('mm','m') then return false; end if;
        value_mm:=(measurement->>'value')::numeric * case when measurement->>'unit'='m' then 1000 else 1 end;
        if value_mm<>pg_catalog.trunc(value_mm) or value_mm>9007199254740991 then return false; end if;
      end if;
      values_json:=values_json||pg_catalog.jsonb_build_object(key,value_mm);
    end if;
  end loop;
  return values_json ?& required and p_input=values_json||pg_catalog.jsonb_build_object('type',roof_type);
exception when others then return false;
end;$$;
revoke all on function private.survey_multi_roof_input_matches(jsonb,uuid,jsonb) from public,anon,authenticated;

create table public.survey_multi_roof_sources (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  survey_id uuid not null references public.field_surveys(id) on delete restrict,
  survey_revision_id uuid not null references public.field_survey_revisions(id) on delete restrict,
  section_id uuid not null,
  roof_model_revision_id uuid not null references public.roof_model_revisions(id) on delete restrict,
  calculation_revision_id uuid primary key references public.calculation_revisions(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.survey_multi_roof_sources enable row level security;
revoke all on public.survey_multi_roof_sources from public,anon,authenticated;

create function public.register_survey_multi_roof_source(
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
revoke all on function public.register_survey_multi_roof_source(uuid,uuid,uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.register_survey_multi_roof_source(uuid,uuid,uuid,uuid,uuid,uuid,uuid) to tetopro_covering_writer;

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
   join public.calculation_dependencies d on d.downstream_calculation_revision_id=cr.id and d.dependency_type='roof_model_input'
   join public.roof_model_revisions rr on rr.id=d.upstream_roof_model_revision_id and rr.roof_model_id=c.roof_model_id
   where cr.id=p_calculation_revision_id and cr.calculation_id=c.id and cr.organization_id=s.organization_id
     and cr.validation_status='verified' and rr.validation_status='verified' and rr.input_data=cr.input_snapshot
     and cr.data_provenance #>> '{surveySource,revisionId}' = r.id::text
     and cr.data_provenance #>> '{surveySource,sectionId}' = p_section_id::text
     and private.survey_roof_input_matches(r.sections,p_section_id,cr.input_snapshot)) then
   raise exception 'Roof geometry was not derived from this exact survey revision and section' using errcode='22023'; end if;
 if c.calculator_type like 'roof.geometry.%' and not exists(
   select 1 from public.survey_multi_roof_sources src
   where src.organization_id=s.organization_id and src.survey_id=s.id and src.survey_revision_id=r.id
     and src.section_id=p_section_id and src.calculation_revision_id=p_calculation_revision_id
     and src.roof_model_revision_id=(select d.upstream_roof_model_revision_id from public.calculation_dependencies d where d.downstream_calculation_revision_id=p_calculation_revision_id and d.dependency_type='roof_model_input' limit 1)
 ) then raise exception 'Exact multi-roof survey source required' using errcode='22023'; end if;
 if not ((section_type='gutter' and c.calculator_type='gutters.material-estimate')
  or (section_type='flashing' and c.calculator_type='sheet_metal.flashings.material-estimate')
  or (section_type='roof' and (c.calculator_type in ('roof.gable','roof.gable.trapezoidal-covering','roof.gable.metal-tile-covering') or c.calculator_type like 'roof.geometry.%'))) then
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
