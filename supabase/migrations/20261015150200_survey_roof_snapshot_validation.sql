-- F9.9: compare the survey's measured inputs with the saved geometry snapshot.
-- This maps units and semantic roles only; roof mathematics stays in roof.gable.
create function private.survey_roof_input_matches(p_sections jsonb,p_section_id uuid,p_input jsonb)
returns boolean language plpgsql stable security invoker set search_path=public,pg_catalog as $$
declare v_section jsonb; v_measurement jsonb; v_key text; v_value numeric; v_values jsonb:='{}'::jsonb; v_expected jsonb;
begin
 select x into v_section from jsonb_array_elements(p_sections) x where x->>'id'=p_section_id::text and x->>'workType'='roof';
 if v_section is null or jsonb_typeof(p_input) is distinct from 'object' then return false; end if;
 for v_measurement in select x from jsonb_array_elements(v_section->'measurements') x loop
  v_key:=case v_measurement->>'semanticType'
   when 'roof_building_length' then 'buildingLengthMm' when 'roof_building_width' then 'buildingWidthMm'
   when 'roof_rise' then 'roofRiseMm' when 'roof_pitch' then 'roofPitchDegrees'
   when 'roof_eave_overhang' then 'eaveOverhangMm' when 'roof_front_gable_overhang' then 'frontGableOverhangMm'
   when 'roof_rear_gable_overhang' then 'rearGableOverhangMm' else null end;
  if v_key is null then continue; end if;
  if v_values ? v_key or jsonb_typeof(v_measurement->'value') is distinct from 'number' then return false; end if;
  if v_key='roofPitchDegrees' then
   if v_measurement->>'unit' is distinct from 'degree' then return false; end if;
   v_value:=(v_measurement->>'value')::numeric;
  else
   if v_measurement->>'unit' not in ('mm','m') then return false; end if;
   v_value:=(v_measurement->>'value')::numeric * case when v_measurement->>'unit'='m' then 1000 else 1 end;
   if v_value<>trunc(v_value) or v_value>9007199254740991 then return false; end if;
  end if;
  v_values:=v_values||jsonb_build_object(v_key,v_value);
 end loop;
 if v_values ? 'roofRiseMm' and not v_values ? 'roofPitchDegrees' then
  v_expected:=v_values||'{"inputMode":"height"}'::jsonb;
 elsif v_values ? 'roofPitchDegrees' and not v_values ? 'roofRiseMm' then
  v_expected:=v_values||'{"inputMode":"angle"}'::jsonb;
 else return false; end if;
 if not (v_values ? 'buildingLengthMm' and v_values ? 'buildingWidthMm' and v_values ? 'eaveOverhangMm'
   and v_values ? 'frontGableOverhangMm' and v_values ? 'rearGableOverhangMm') then return false; end if;
 return p_input=v_expected;
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end;$$;

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
