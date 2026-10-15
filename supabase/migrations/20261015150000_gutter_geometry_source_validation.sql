-- F9.9: validate each selected gutter edge against the immutable, current roof calculation.
-- The existing project writer already records the roof-revision dependency. This trigger
-- closes its source-length gap even for authenticated callers invoking the RPC directly.
create function private.validate_gutter_geometry_source()
returns trigger language plpgsql security invoker set search_path = public, pg_catalog as $$
declare
  v_calculation public.calculations%rowtype;
  v_run jsonb;
  v_ref jsonb;
  v_roof public.roof_models%rowtype;
  v_roof_calculation public.calculations%rowtype;
  v_source_length numeric;
  v_edge_id text;
  v_seen text[] := '{}';
begin
  select * into v_calculation from public.calculations where id = new.calculation_id and organization_id = new.organization_id;
  if v_calculation.calculator_type is distinct from 'gutters.material-estimate' then return new; end if;
  for v_run in select value from jsonb_array_elements(coalesce(new.input_snapshot -> 'runs', '[]'::jsonb)) loop
    v_ref := v_run -> 'roofEdge';
    if pg_catalog.jsonb_typeof(v_ref) is distinct from 'object' then continue; end if;
    if v_calculation.project_id is null or v_calculation.ownership_scope is distinct from 'project' then
      raise exception 'Geometriai eresz csak projektkalkulációban használható.' using errcode = '22023';
    end if;
    v_edge_id := v_ref ->> 'edgeId';
    if v_edge_id not in ('left-eave', 'right-eave')
       or v_ref ->> 'roofModelId' is null
       or v_ref ->> 'calculationId' is null
       or v_ref ->> 'calculationRevisionId' is null
       or v_ref ->> 'suggestedLengthMm' is null
       or v_ref ->> 'lengthOverridden' is null then
      raise exception 'Hiányos geometriai ereszforrás.' using errcode = '22023';
    end if;
    if (v_ref ->> 'roofModelId' || ':' || v_edge_id) = any(v_seen) then
      raise exception 'Ugyanaz az ereszél nem választható kétszer.' using errcode = '22023';
    end if;
    v_seen := pg_catalog.array_append(v_seen, v_ref ->> 'roofModelId' || ':' || v_edge_id);
    select * into v_roof from public.roof_models
      where id = (v_ref ->> 'roofModelId')::uuid and organization_id = new.organization_id
        and project_id = v_calculation.project_id and roof_type = 'gable'
        and current_revision_id = (v_ref ->> 'revisionId')::uuid for share;
    if not found then raise exception 'A tetőforrás nem aktuális vagy nem ehhez a projekthez tartozik.' using errcode = '40001'; end if;
    if not exists (select 1 from public.roof_model_revisions r where r.id = v_roof.current_revision_id
      and r.roof_model_id = v_roof.id and r.organization_id = new.organization_id and r.validation_status = 'verified') then
      raise exception 'A tetőforrás nincs ellenőrizve.' using errcode = '22023';
    end if;
    select * into v_roof_calculation from public.calculations
      where id = (v_ref ->> 'calculationId')::uuid and roof_model_id = v_roof.id
        and organization_id = new.organization_id and project_id = v_calculation.project_id
        and calculator_type = 'roof.gable' and current_revision_id = (v_ref ->> 'calculationRevisionId')::uuid for share;
    if not found then raise exception 'A tetőkalkuláció forrásrevíziója megváltozott.' using errcode = '40001'; end if;
    select (r.output_snapshot #>> '{lengths,eachEaveEdgeMm}')::numeric into v_source_length
    from public.calculation_revisions r
    where r.id = v_roof_calculation.current_revision_id and r.calculation_id = v_roof_calculation.id
      and r.organization_id = new.organization_id and r.validation_status = 'verified'
      and exists (select 1 from public.calculation_dependencies d where d.downstream_calculation_revision_id = r.id
        and d.upstream_roof_model_revision_id = v_roof.current_revision_id);
    if v_source_length is null or v_source_length <= 0
       or v_source_length is distinct from (v_ref ->> 'suggestedLengthMm')::numeric
       or pg_catalog.jsonb_typeof(v_ref -> 'lengthOverridden') is distinct from 'boolean'
       or pg_catalog.jsonb_typeof(v_run -> 'lengthMm') is distinct from 'number'
       or (v_run ->> 'lengthMm')::numeric <= 0
       or ((v_ref ->> 'lengthOverridden')::boolean is false and (v_run ->> 'lengthMm')::numeric is distinct from v_source_length)
       or ((v_ref ->> 'lengthOverridden')::boolean is true and (v_run ->> 'lengthMm')::numeric = v_source_length) then
      raise exception 'Az ereszhossz vagy a felülírás nem egyezik a forrássnapshot-tal.' using errcode = '22023';
    end if;
  end loop;
  return new;
end;
$$;

create trigger gutter_geometry_source_validate before insert on public.calculation_revisions
for each row execute function private.validate_gutter_geometry_source();

-- The survey workspace can now link its exact verified roof.gable calculation revision.
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
  or (c.ownership_scope='project' and (r.project_id is null or c.project_id is distinct from r.project_id
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
