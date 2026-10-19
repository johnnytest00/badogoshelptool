-- F9.44.5: részletes nyeregtetőmérés (gerinc, síkonkénti eresz és lejtő menti hossz, nem téglalap síkoknál mért oromélek). Csak validátorok és új források bővülnek;
-- az anyaglista-RPC csak az élhossz-eredetnél ismeri fel az új forrástípust. Meglévő rekord/revízió nem íródik át.
create or replace function private.valid_field_survey_measurements(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb; seen_ids text[] := array[]::text[]; item_id text; item_value numeric; item_unit text; semantic_type text;
begin
  if value is null or jsonb_typeof(value) <> 'array' or jsonb_array_length(value) < 1 or jsonb_array_length(value) > 100 then return false; end if;
  for item in select jsonb_array_elements(value) loop
    if jsonb_typeof(item) <> 'object' or not (item ?& array['id', 'label', 'value', 'unit'])
      or (item - array['id', 'label', 'value', 'unit', 'semanticType']) <> '{}'::jsonb
      or jsonb_typeof(item->'id') <> 'string' or jsonb_typeof(item->'label') <> 'string'
      or jsonb_typeof(item->'value') <> 'number' or jsonb_typeof(item->'unit') <> 'string'
      or (item ? 'semanticType' and jsonb_typeof(item->'semanticType') <> 'string') then return false; end if;
    item_id := item->>'id';
    if item_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or item_id = any(seen_ids) then return false; end if;
    seen_ids := array_append(seen_ids, item_id);
    if char_length(btrim(item->>'label')) not between 1 and 120 then return false; end if;
    item_value := (item->>'value')::numeric; item_unit := item->>'unit'; semantic_type := coalesce(item->>'semanticType', 'custom');
    if item_value < 0 or item_value > 1000000000 or item_unit not in ('mm', 'm', 'm2', 'degree', 'count') then return false; end if;
    if item_unit = 'count' and item_value <> trunc(item_value) then return false; end if;
    if item_unit = 'degree' and item_value > 360 then return false; end if;
    if semantic_type not in ('custom','roof_building_length','roof_building_width','roof_rise','roof_pitch','roof_eave_overhang','roof_front_gable_overhang','roof_rear_gable_overhang','roof_outer_length','roof_outer_width','roof_outer_side','roof_hip_eave_height','roof_wing_width','roof_wing_projection','roof_eave_run','roof_plane_slope_a','roof_plane_slope_b','roof_ridge_length','roof_eave_a','roof_eave_b','roof_verge_a_left','roof_verge_a_right','roof_verge_b_left','roof_verge_b_right','gutter_run_length','gutter_stock_length','gutter_bracket_spacing','flashing_run_length','flashing_section_length','flashing_overlap') then return false; end if;
    if semantic_type = 'roof_pitch' and item_unit <> 'degree' then return false; end if;
    if semantic_type in ('roof_building_length','roof_building_width','roof_rise','roof_eave_overhang','roof_front_gable_overhang','roof_rear_gable_overhang','roof_outer_length','roof_outer_width','roof_outer_side','roof_hip_eave_height','roof_wing_width','roof_wing_projection','roof_eave_run','roof_plane_slope_a','roof_plane_slope_b','roof_ridge_length','roof_eave_a','roof_eave_b','roof_verge_a_left','roof_verge_a_right','roof_verge_b_left','roof_verge_b_right','gutter_run_length','gutter_stock_length','gutter_bracket_spacing','flashing_run_length','flashing_section_length','flashing_overlap') and item_unit not in ('mm','m') then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;
create or replace function private.valid_field_survey_sections(p_sections jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare s jsonb; ids text[] := '{}'; photo text; timber jsonb; underlay jsonb; parameter record;
begin
 if jsonb_typeof(p_sections) is distinct from 'array' or jsonb_array_length(p_sections) not between 1 and 30 then return false; end if;
 for s in select jsonb_array_elements(p_sections) loop
  if jsonb_typeof(s) is distinct from 'object' or not(s ?& array['id','name','workType','measurements','notes','photoIds'])
   or s-array['id','name','workType','measurements','notes','photoIds','roofType','roofTimberParameters','roofUnderlayParameters','roofMeasurementMode','quickPlanesMatch','elementKind','lengthSource'] <> '{}'::jsonb
   or jsonb_typeof(s->'id') is distinct from 'string' or (s->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   or (s->>'id')=any(ids) or jsonb_typeof(s->'name') is distinct from 'string' or char_length(btrim(s->>'name')) not between 1 and 120
   or coalesce(s->>'workType','') not in ('roof','gutter','flashing','other')
   or (s ? 'roofType' and (s->>'workType'<>'roof' or jsonb_typeof(s->'roofType') is distinct from 'string' or s->>'roofType' not in ('gable','shed','hip','pyramid','halfHip','lShape','tShape')))
   or jsonb_typeof(s->'notes') is distinct from 'string' or char_length(s->>'notes')>2000
   or jsonb_typeof(s->'measurements') is distinct from 'array'
   or (s->'measurements'<>'[]'::jsonb and not private.valid_field_survey_measurements(
     (select jsonb_agg(case when m->'value'='null'::jsonb then jsonb_set(m,'{value}','0'::jsonb) else m end) from jsonb_array_elements(s->'measurements') m)))
   or jsonb_typeof(s->'photoIds') is distinct from 'array' or jsonb_array_length(s->'photoIds')>100 then return false; end if;
  if s ? 'elementKind' and (jsonb_typeof(s->'elementKind') is distinct from 'string' or not (
    (s->>'elementKind' = 'gutter' and s->>'workType' = 'gutter')
    or (s->>'elementKind' in ('flashing_verge','flashing_eave','flashing_wall','flashing_ridge','valley') and s->>'workType' = 'flashing')
    or (s->>'elementKind' in ('downpipe','chimney','roof_window','repair','custom') and s->>'workType' = 'other'))) then return false; end if;
  if s ? 'lengthSource' and (not s ? 'elementKind' or jsonb_typeof(s->'lengthSource') is distinct from 'object'
    or (s->'lengthSource') - array['roofSectionId','role'] <> '{}'::jsonb
    or jsonb_typeof(s->'lengthSource'->'roofSectionId') is distinct from 'string'
    or (s->'lengthSource'->>'roofSectionId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or not (
      (s->'lengthSource'->>'role' = 'eave_total' and s->>'elementKind' in ('gutter','flashing_eave'))
      or (s->'lengthSource'->>'role' = 'ridge' and s->>'elementKind' = 'flashing_ridge')
      or (s->'lengthSource'->>'role' = 'verge_total' and s->>'elementKind' = 'flashing_verge'))) then return false; end if;
  if s ? 'roofMeasurementMode' and (s->>'workType'<>'roof' or s->>'roofType' is distinct from 'gable' or jsonb_typeof(s->'roofMeasurementMode') is distinct from 'string' or s->>'roofMeasurementMode' not in ('quick','building','detailed')) then return false; end if;
  if s ? 'quickPlanesMatch' and (s->>'roofType' is distinct from 'gable' or jsonb_typeof(s->'quickPlanesMatch') is distinct from 'boolean') then return false; end if;
  if s ? 'roofTimberParameters' then
   timber := s->'roofTimberParameters';
   if s->>'workType'<>'roof' or jsonb_typeof(timber) is distinct from 'object'
    or timber-array['rafterMaxSpacingMm','rafterStartInsetMm','rafterEndInsetMm','rafterSectionWidthMm','rafterSectionHeightMm','battenMaxSpacingMm','battenStartInsetMm','battenEndInsetMm','battenSectionWidthMm','battenSectionHeightMm'] <> '{}'::jsonb then return false; end if;
   for parameter in select key, value from jsonb_each(timber) loop
    if jsonb_typeof(parameter.value) is distinct from 'number' or (parameter.value::text)::numeric < 0 or (parameter.value::text)::numeric > 100000 or (parameter.value::text)::numeric <> trunc((parameter.value::text)::numeric)
     or (parameter.key like '%MaxSpacingMm' or parameter.key like '%SectionWidthMm' or parameter.key like '%SectionHeightMm') and (parameter.value::text)::numeric = 0 then return false; end if;
   end loop;
  end if;
  if s ? 'roofUnderlayParameters' then
   underlay := s->'roofUnderlayParameters';
   if s->>'workType'<>'roof' or jsonb_typeof(underlay) is distinct from 'object'
    or underlay-array['rollWidthMm','rollLengthMm','sideOverlapMm','endOverlapMm','installationDirection'] <> '{}'::jsonb then return false; end if;
   for parameter in select key, value from jsonb_each(underlay) loop
    if parameter.key='installationDirection' then
     if jsonb_typeof(parameter.value) is distinct from 'string' or parameter.value#>>'{}' not in ('eave-to-ridge','ridge-to-eave') then return false; end if;
    elsif jsonb_typeof(parameter.value) is distinct from 'number'
     or (parameter.value::text)::numeric < 0 or (parameter.value::text)::numeric <> trunc((parameter.value::text)::numeric)
     or parameter.key='rollWidthMm' and ((parameter.value::text)::numeric = 0 or (parameter.value::text)::numeric > 100000)
     or parameter.key='rollLengthMm' and ((parameter.value::text)::numeric = 0 or (parameter.value::text)::numeric > 1000000)
     or parameter.key in ('sideOverlapMm','endOverlapMm') and (parameter.value::text)::numeric > 100000 then return false; end if;
   end loop;
   if underlay ? 'sideOverlapMm' and underlay ? 'rollWidthMm' and (underlay->>'sideOverlapMm')::numeric >= (underlay->>'rollWidthMm')::numeric then return false; end if;
   if underlay ? 'endOverlapMm' and underlay ? 'rollLengthMm' and (underlay->>'endOverlapMm')::numeric >= (underlay->>'rollLengthMm')::numeric then return false; end if;
  end if;
  ids:=array_append(ids,s->>'id');
  for photo in select jsonb_array_elements_text(s->'photoIds') loop
   if photo is null or photo !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return false; end if;
  end loop;
 end loop;
 return (select count(*)<=100 and count(distinct m->>'id')=count(*) from jsonb_array_elements(p_sections) sec cross join lateral jsonb_array_elements(sec->'measurements') m);
exception when others then return false;
end;
$$;

alter table public.field_survey_roof_geometry_sources drop constraint field_survey_roof_geometry_sources_geometry_type_check;
alter table public.field_survey_roof_geometry_sources add constraint field_survey_roof_geometry_sources_geometry_type_check
  check (geometry_type = any (array['roof.gable','roof.gable.quick','roof.gable.detailed','roof.geometry.shed','roof.geometry.hip','roof.geometry.pyramid','roof.geometry.halfHip','roof.geometry.lShape','roof.geometry.tShape']));

-- Verges of one plane (trapezoid: eave e, ridge r, perpendicular eave-to-ridge distance h, measured side edges l and rr).
-- Returns 'false' = contradictory, 'null' = not derivable (trapezoid without both sides), array = [l, rr] (rectangle: both equal h).
create function private.detailed_gable_verges(e numeric, r numeric, h numeric, l numeric, rr numeric) returns jsonb
language plpgsql immutable set search_path = '' as $$
begin
  if e = r then
    if (l is not null and l <> h) or (rr is not null and rr <> h) then return 'false'::jsonb; end if;
    return pg_catalog.jsonb_build_array(h, h);
  end if;
  if l is null or rr is null then return 'null'::jsonb; end if;
  if l * l < h * h or l * l > h * h + (e - r) * (e - r) or rr * rr < h * h or rr * rr > h * h + (e - r) * (e - r) then return 'false'::jsonb; end if;
  return pg_catalog.jsonb_build_array(l, rr);
end;
$$;

create function private.survey_detailed_gable_input(p_sections jsonb, p_section_id uuid)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  s jsonb; m jsonb; mm numeric; t text; v jsonb := '{}'::jsonb; v_match jsonb;
  roles text[] := array['roof_ridge_length','roof_eave_a','roof_eave_b','roof_plane_slope_a','roof_plane_slope_b','roof_verge_a_left','roof_verge_a_right','roof_verge_b_left','roof_verge_b_right'];
  r numeric; ea numeric; ha numeric; eb numeric; hb numeric; va jsonb; vb jsonb; match boolean;
begin
  select e.value into s from pg_catalog.jsonb_array_elements(p_sections) e(value) where e.value->>'id' = p_section_id::text;
  if s is null or s->>'workType' <> 'roof' or s->>'roofType' is distinct from 'gable' or s->>'roofMeasurementMode' is distinct from 'detailed' then return null; end if;
  v_match := s->'quickPlanesMatch';
  if v_match is null or pg_catalog.jsonb_typeof(v_match) <> 'boolean' then return null; end if;
  match := (v_match::text)::boolean;
  for m in select e.value from pg_catalog.jsonb_array_elements(s->'measurements') e(value) where e.value->>'semanticType' = any(roles) loop
    if pg_catalog.jsonb_typeof(m->'value') <> 'number' then continue; end if;
    if m->>'unit' not in ('m','mm') then return null; end if;
    mm := case when m->>'unit' = 'm' then (m->>'value')::numeric * 1000 else (m->>'value')::numeric end;
    if mm <= 0 or mm > 200000 or mm <> pg_catalog.round(mm) then return null; end if;
    t := m->>'semanticType';
    if v ? t then return null; end if;
    v := v || pg_catalog.jsonb_build_object(t, mm);
  end loop;
  r := (v->>'roof_ridge_length')::numeric; ea := (v->>'roof_eave_a')::numeric; ha := (v->>'roof_plane_slope_a')::numeric;
  if r is null or ea is null or ha is null then return null; end if;
  if match then
    if (v ? 'roof_eave_b' and (v->>'roof_eave_b')::numeric <> ea) or (v ? 'roof_plane_slope_b' and (v->>'roof_plane_slope_b')::numeric <> ha) then return null; end if;
    eb := ea; hb := ha;
  else
    eb := (v->>'roof_eave_b')::numeric; hb := (v->>'roof_plane_slope_b')::numeric;
    if eb is null or hb is null then return null; end if;
  end if;
  va := private.detailed_gable_verges(ea, r, ha, (v->>'roof_verge_a_left')::numeric, (v->>'roof_verge_a_right')::numeric);
  if va = 'false'::jsonb then return null; end if;
  if match then vb := va;
  else
    vb := private.detailed_gable_verges(eb, r, hb, (v->>'roof_verge_b_left')::numeric, (v->>'roof_verge_b_right')::numeric);
    if vb = 'false'::jsonb then return null; end if;
  end if;
  return pg_catalog.jsonb_build_object('mode', 'detailed', 'ridgeMm', r, 'eaveAMm', ea, 'slopeAMm', ha, 'eaveBMm', eb, 'slopeBMm', hb,
    'planesMatch', match, 'vergeAMm', va, 'vergeBMm', vb);
end;
$$;

create function public.save_survey_detailed_gable_geometry_source_secure(
  p_organization_id uuid, p_survey_id uuid, p_survey_revision_id uuid, p_section_id uuid,
  p_input jsonb, p_output jsonb, p_actor_id uuid
)
returns table(source_id uuid, combined_roof_m2 numeric, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_revision public.field_survey_revisions%rowtype;
  v_existing public.field_survey_roof_geometry_sources%rowtype;
  v_in jsonb; v_area numeric; v_id uuid; v_verge numeric; v_dims jsonb;
begin
  if p_actor_id is null or p_organization_id is null or p_survey_id is null or p_survey_revision_id is null or p_section_id is null
    or pg_catalog.jsonb_typeof(p_input) is distinct from 'object' or pg_catalog.jsonb_typeof(p_output) is distinct from 'object' then
    raise exception 'Érvénytelen tetőgeometria-forrás.' using errcode = '22023';
  end if;
  perform 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = p_actor_id for share;
  if not found then raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501'; end if;
  perform 1 from public.field_surveys s where s.id = p_survey_id and s.organization_id = p_organization_id
    and (s.project_id is not null or s.created_by = p_actor_id);
  if not found then raise exception 'A felmérés nem érhető el.' using errcode = '42501'; end if;
  select * into v_revision from public.field_survey_revisions r
   where r.id = p_survey_revision_id and r.survey_id = p_survey_id and r.organization_id = p_organization_id;
  if not found then raise exception 'Pontos felmérésrevízió szükséges.' using errcode = '42501'; end if;
  v_in := case when v_revision.sections is null then null else private.survey_detailed_gable_input(v_revision.sections, p_section_id) end;
  if v_in is null or v_in is distinct from p_input then
    raise exception 'A részletes tetőmérés nem ebből a felmérésrevízióból és szakaszból származik, vagy hiányos.' using errcode = '22023';
  end if;
  -- Area and edge totals are recomputed here; both planes are trapezoids (parallel eave and ridge, perpendicular distance h).
  v_area := (((v_in->>'eaveAMm')::numeric + (v_in->>'ridgeMm')::numeric) * (v_in->>'slopeAMm')::numeric
           + ((v_in->>'eaveBMm')::numeric + (v_in->>'ridgeMm')::numeric) * (v_in->>'slopeBMm')::numeric) / 2 / 1000000;
  v_verge := case when v_in->'vergeAMm' = 'null'::jsonb or v_in->'vergeBMm' = 'null'::jsonb then null
    else ((v_in#>>'{vergeAMm,0}')::numeric + (v_in#>>'{vergeAMm,1}')::numeric + (v_in#>>'{vergeBMm,0}')::numeric + (v_in#>>'{vergeBMm,1}')::numeric) end;
  v_dims := p_output->'dimensions';
  if v_area <= 0 or (p_output #>> '{areas,combinedRoofM2}') is null or (p_output #>> '{areas,combinedRoofM2}')::numeric is distinct from v_area
    or pg_catalog.jsonb_typeof(v_dims) is distinct from 'object'
    or (v_dims->>'ridgeMm')::numeric is distinct from (v_in->>'ridgeMm')::numeric
    or (v_dims->>'eaveTotalMm')::numeric is distinct from (v_in->>'eaveAMm')::numeric + (v_in->>'eaveBMm')::numeric
    or (v_dims->>'vergeTotalMm')::numeric is distinct from v_verge then
    raise exception 'A tetőfelület vagy az élhosszak nem egyeznek a mért méretekkel.' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_survey_revision_id::text || ':' || p_section_id::text || ':roof-geometry', 0));
  select * into v_existing from public.field_survey_roof_geometry_sources g
   where g.survey_revision_id = p_survey_revision_id and g.section_id = p_section_id;
  if found then
    if v_existing.input_snapshot is distinct from p_input or v_existing.geometry_type <> 'roof.gable.detailed' then
      raise exception 'A forrásrevízió geometriája már más bemenettel rögzített.' using errcode = '40001';
    end if;
    return query select v_existing.id, v_existing.combined_roof_m2, true;
    return;
  end if;
  insert into public.field_survey_roof_geometry_sources(organization_id, survey_id, survey_revision_id, section_id, geometry_type,
    input_snapshot, output_snapshot, combined_roof_m2, created_by)
  values (p_organization_id, p_survey_id, p_survey_revision_id, p_section_id, 'roof.gable.detailed', p_input, p_output, v_area, p_actor_id)
  returning id into v_id;
  return query select v_id, v_area, false;
end;
$$;
revoke all on function public.save_survey_detailed_gable_geometry_source_secure(uuid,uuid,uuid,uuid,jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.save_survey_detailed_gable_geometry_source_secure(uuid,uuid,uuid,uuid,jsonb,jsonb,uuid) to tetopro_covering_writer;

create or replace function public.save_workflow_material_list_from_survey_revision(
  p_organization_id uuid,
  p_survey_id uuid,
  p_survey_revision_id uuid,
  p_allow_stale_source boolean,
  p_name text,
  p_items jsonb,
  p_request_key uuid
)
returns table (list_id uuid, revision_id uuid, revision_number integer, version integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_survey public.field_surveys%rowtype;
  v_survey_revision public.field_survey_revisions%rowtype;
  v_existing_list public.material_preparation_lists%rowtype;
  v_saved record;
  v_item jsonb;
  v_ref jsonb;
  v_section jsonb;
  v_measurement jsonb;
  v_source_items jsonb := '[]'::jsonb;
  v_clean_items jsonb;
  v_item_id uuid;
  v_section_id uuid;
  v_measurement_id uuid;
  v_calculation_id uuid;
  v_calculation_revision_id uuid;
  v_section_type text;
  v_section_name text;
  v_semantic_type text;
  v_measurement_unit text;
  v_source_label text;
  v_source_value numeric;
  v_source_unit text;
  v_quantity_kind text;
  v_revision_number integer;
  v_output jsonb;
  v_provenance jsonb;
  v_existing_source public.material_preparation_survey_sources%rowtype;
  v_geometry public.field_survey_roof_geometry_sources%rowtype;
  v_retry_exists boolean := false;
  v_ls jsonb;
  v_edge numeric;
  v_origin jsonb;
  v_geo_found boolean;
begin
  if v_actor is null or not private.is_org_member(p_organization_id) then
    raise exception 'material list access denied' using errcode = '42501';
  end if;
  if p_survey_id is null or p_survey_revision_id is null or p_allow_stale_source is null
    or p_request_key is null or p_items is null or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) not between 1 and 200 then
    raise exception 'invalid survey material list payload' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_organization_id::text || ':' || v_actor::text || ':' || p_request_key::text, 0));

  select * into v_survey from public.field_surveys s
   where s.id = p_survey_id and s.organization_id = p_organization_id for share;
  if not found or not private.can_access_field_survey(p_survey_id, p_organization_id) then
    raise exception 'survey access denied' using errcode = '42501';
  end if;
  select * into v_survey_revision from public.field_survey_revisions r
   where r.id = p_survey_revision_id and r.survey_id = p_survey_id and r.organization_id = p_organization_id;
  if not found then raise exception 'survey revision access denied' using errcode = '42501'; end if;
  for v_item in select value from pg_catalog.jsonb_array_elements(p_items) loop
    if nullif(v_item->>'id', '') is null then raise exception 'invalid material item identity' using errcode = '22023'; end if;
    v_item_id := (v_item->>'id')::uuid;
    v_ref := v_item->'sourceRef';
    if v_ref is null or v_ref = 'null'::jsonb then continue; end if;
    if jsonb_typeof(v_ref) <> 'object' then raise exception 'invalid survey quantity provenance' using errcode = '22023'; end if;

    v_section_id := nullif(v_ref->>'sectionId', '')::uuid;
    v_section := null;
    v_section_type := v_survey_revision.work_type;
    v_section_name := v_survey_revision.work_type;
    if v_survey_revision.sections is not null then
      select section.value into v_section from pg_catalog.jsonb_array_elements(v_survey_revision.sections) section(value)
       where section.value->>'id' = v_section_id::text;
      if v_section is null then raise exception 'survey section access denied' using errcode = '42501'; end if;
      v_section_type := v_section->>'workType';
      v_section_name := v_section->>'name';
    elsif v_section_id <> p_survey_id then
      raise exception 'legacy survey section identity mismatch' using errcode = '42501';
    end if;

    if v_ref->>'type' = 'measurement' then
      if (v_ref - array['type','sectionId','measurementId']) <> '{}'::jsonb then
        raise exception 'invalid survey measurement reference' using errcode = '22023';
      end if;
      v_measurement_id := nullif(v_ref->>'measurementId', '')::uuid;
      if v_section is null then
        select measurement.value into v_measurement from pg_catalog.jsonb_array_elements(v_survey_revision.measurements) measurement(value)
         where measurement.value->>'id' = v_measurement_id::text;
      else
        select measurement.value into v_measurement from pg_catalog.jsonb_array_elements(v_section->'measurements') measurement(value)
         where measurement.value->>'id' = v_measurement_id::text;
      end if;
      v_semantic_type := v_measurement->>'semanticType';
      v_measurement_unit := v_measurement->>'unit';
      v_source_value := nullif(v_measurement->>'value', '')::numeric;
      if v_measurement is null or v_source_value is null or v_source_value <= 0
        or v_source_value <> round(v_source_value, 6) or v_measurement_unit <> 'm'
        or v_item->>'unit' <> 'linear_meter'
        or not ((v_section_type = 'gutter' and v_semantic_type = 'gutter_run_length')
          or (v_section_type = 'flashing' and v_semantic_type = 'flashing_run_length')) then
        raise exception 'unsupported or incomplete survey measurement source' using errcode = '22023';
      end if;
      v_source_label := v_measurement->>'label';
      v_source_unit := 'm';
      v_quantity_kind := 'measured';
      v_origin := null;
      -- F9.44.4: a value accepted from the roof geometry keeps that origin. It is "calculated" only while it still equals the
      -- verified, recorded roof edge of the same exact revision; any other value is a manual override. Nothing is promoted.
      v_ls := case when v_section is null then null else v_section->'lengthSource' end;
      if v_ls is not null and pg_catalog.jsonb_typeof(v_ls) = 'object' then
        select g.* into v_geometry from public.field_survey_roof_geometry_sources g
         where g.organization_id = p_organization_id and g.survey_id = p_survey_id and g.survey_revision_id = p_survey_revision_id
           and g.section_id = nullif(v_ls->>'roofSectionId', '')::uuid;
        v_geo_found := found;
        v_edge := null;
        if v_geo_found then
          v_edge := case
            when v_geometry.geometry_type in ('roof.gable.quick', 'roof.gable.detailed') then case v_ls->>'role'
              when 'eave_total' then (v_geometry.output_snapshot #>> '{dimensions,eaveTotalMm}')::numeric
              when 'ridge' then (v_geometry.output_snapshot #>> '{dimensions,ridgeMm}')::numeric
              when 'verge_total' then (v_geometry.output_snapshot #>> '{dimensions,vergeTotalMm}')::numeric end
            when v_geometry.geometry_type = 'roof.gable' then case v_ls->>'role'
              when 'eave_total' then (v_geometry.output_snapshot #>> '{lengths,totalEaveEdgesMm}')::numeric
              when 'ridge' then (v_geometry.output_snapshot #>> '{lengths,ridgeLineMm}')::numeric
              when 'verge_total' then (v_geometry.output_snapshot #>> '{lengths,totalSlopingGableEdgesMm}')::numeric end
            else null end;
        end if;
        v_quantity_kind := case when v_edge is not null and abs(v_source_value * 1000 - v_edge) <= 0.5 then 'calculated' else 'overridden' end;
        v_origin := pg_catalog.jsonb_build_object('kind', 'verifiedRoofEdge', 'roofSectionId', v_ls->>'roofSectionId', 'role', v_ls->>'role',
          'geometrySourceId', case when v_geo_found then v_geometry.id end, 'calculatedValueMm', v_edge);
      end if;
      v_provenance := pg_catalog.jsonb_build_object(
        'itemId', v_item_id, 'sectionId', v_section_id, 'sourceKind', 'measurement',
        'sourceRef', v_ref, 'sourceLabel', v_source_label, 'sourceValue', v_source_value::text,
        'sourceUnit', v_source_unit, 'quantityKind', v_quantity_kind
      ) || case when v_origin is null then '{}'::jsonb else pg_catalog.jsonb_build_object('origin', v_origin) end;
    elsif v_ref->>'type' = 'calculation' then
      if (v_ref - array['type','sectionId','calculationId','calculationRevisionId']) <> '{}'::jsonb then
        raise exception 'invalid roof calculation reference' using errcode = '22023';
      end if;
      v_calculation_id := nullif(v_ref->>'calculationId', '')::uuid;
      v_calculation_revision_id := nullif(v_ref->>'calculationRevisionId', '')::uuid;
      select cr.output_snapshot, cr.revision_number, cr.output_snapshot #>> '{areas,combinedRoofM2}'
        into v_output, v_revision_number, v_source_label
        from public.field_survey_calculation_links l
        join public.calculations c on c.id = l.calculation_id and c.organization_id = l.organization_id
        join public.calculation_revisions cr on cr.id = l.calculation_revision_id and cr.calculation_id = l.calculation_id and cr.organization_id = l.organization_id
       where l.organization_id = p_organization_id and l.survey_id = p_survey_id
         and l.survey_revision_id = p_survey_revision_id and l.section_id = v_section_id
         and l.calculation_id = v_calculation_id and l.calculation_revision_id = v_calculation_revision_id
         and v_section_type = 'roof' and c.calculator_type = 'roof.gable'
         and cr.validation_status = 'verified' and cr.warnings = '[]'::jsonb;
      if v_output is null or coalesce(v_source_label, '') !~ '^[0-9]+(\.[0-9]+)?$' then
        raise exception 'verified roof calculation source is unavailable' using errcode = '42501';
      end if;
      v_source_value := v_source_label::numeric;
      if v_source_value <= 0 or v_item->>'unit' <> 'square_meter'
        or jsonb_typeof(v_output->'areas') <> 'object'
        or jsonb_typeof(v_output->'dimensions') <> 'object'
        or jsonb_typeof(v_output->'planes') <> 'array'
        or jsonb_typeof(v_output->'geometryNotes') <> 'array' then
        raise exception 'verified roof area or material unit is invalid' using errcode = '22023';
      end if;
      v_source_label := 'Ellenőrzött tetőfelület';
      v_source_unit := 'm²';
      v_quantity_kind := 'calculated';
      v_provenance := pg_catalog.jsonb_build_object(
        'itemId', v_item_id, 'sectionId', v_section_id, 'sourceKind', 'calculation',
        'sourceRef', v_ref, 'sourceLabel', v_source_label, 'sourceValue', v_source_value::text,
        'sourceUnit', v_source_unit, 'quantityKind', v_quantity_kind,
        'calculationRevisionNumber', v_revision_number
      );
    elsif v_ref->>'type' = 'surveyGeometry' then
      -- F9.42.6: roof area from the exact survey revision's own verified geometry source (no project / roof model).
      if (v_ref - array['type','sectionId','geometrySourceId']) <> '{}'::jsonb then
        raise exception 'invalid survey geometry reference' using errcode = '22023';
      end if;
      select g.* into v_geometry from public.field_survey_roof_geometry_sources g
       where g.id = nullif(v_ref->>'geometrySourceId', '')::uuid and g.organization_id = p_organization_id
         and g.survey_id = p_survey_id and g.survey_revision_id = p_survey_revision_id
         and g.section_id = v_section_id and v_section_type = 'roof';
      if not found then
        raise exception 'verified roof geometry source is unavailable' using errcode = '42501';
      end if;
      if v_item->>'unit' <> 'square_meter' then
        raise exception 'verified roof area material unit is invalid' using errcode = '22023';
      end if;
      v_source_value := v_geometry.combined_roof_m2;
      v_provenance := pg_catalog.jsonb_build_object(
        'itemId', v_item_id, 'sectionId', v_section_id, 'sourceKind', 'geometry',
        'sourceRef', v_ref, 'sourceLabel', 'Ellenőrzött tetőfelület', 'sourceValue', v_source_value::text,
        'sourceUnit', 'm²', 'quantityKind', 'calculated'
      );
    else
      raise exception 'unsupported survey quantity source' using errcode = '22023';
    end if;
    v_source_items := v_source_items || pg_catalog.jsonb_build_array(v_provenance);
  end loop;

  select coalesce(pg_catalog.jsonb_agg(item.value - array['sourceRef','sourceLabel','sourceUnit','quantityKind']), '[]'::jsonb)
    into v_clean_items from pg_catalog.jsonb_array_elements(p_items) item(value);

  -- A successful retry must retain the same exact survey revision and source rows.
  select * into v_existing_list from public.material_preparation_lists l
   where l.organization_id = p_organization_id and l.project_id is null
     and l.created_by = v_actor and l.creation_request_key = p_request_key for update;
  v_retry_exists := found;
  if v_retry_exists then
    select source.* into v_existing_source
      from public.material_preparation_revisions r
      join public.material_preparation_survey_sources source
        on source.material_revision_id = r.id and source.material_list_id = r.list_id and source.organization_id = r.organization_id
     where r.list_id = v_existing_list.id and r.organization_id = p_organization_id and r.revision_number = 1;
    if not found or v_existing_source.survey_id <> p_survey_id
      or v_existing_source.survey_revision_id <> p_survey_revision_id
      or v_existing_source.source_items_snapshot is distinct from v_source_items then
      raise exception 'request key reused with different survey source' using errcode = '40001';
    end if;
  elsif v_survey.version > v_survey_revision.version and not p_allow_stale_source then
    raise exception 'survey source revision is stale; explicit historical confirmation is required' using errcode = '40001';
  end if;

  for v_item in select value from pg_catalog.jsonb_array_elements(v_clean_items) loop
    if coalesce(v_item->>'kind', 'manual') = 'catalog' and nullif(v_item->>'priceId', '') is not null
      and not exists (
        select 1 from public.material_prices price
         where price.id = (v_item->>'priceId')::uuid and price.organization_id = p_organization_id
           and price.variant_id = (v_item->>'variantId')::uuid
           and price.purchasing_unit::text = v_item->>'unit'
           and price.currency = 'HUF' and price.data_provenance = 'verified'
      ) then
      raise exception 'survey material lists accept only verified HUF catalog prices' using errcode = '22023';
    end if;
  end loop;

  select * into v_saved from public.save_workflow_material_list_revision(
    p_organization_id, null, null, p_name, v_clean_items, 0, p_request_key
  );
  if not found then raise exception 'material list save returned no revision' using errcode = 'P0001'; end if;

  select * into v_existing_source from public.material_preparation_survey_sources source
   where source.material_revision_id = v_saved.revision_id;
  if found then
    if v_existing_source.survey_id <> p_survey_id or v_existing_source.survey_revision_id <> p_survey_revision_id
      or v_existing_source.source_items_snapshot is distinct from v_source_items then
      raise exception 'request key reused with different survey source' using errcode = '40001';
    end if;
  else
    insert into public.material_preparation_survey_sources(
      organization_id, material_list_id, material_revision_id, survey_id, survey_revision_id,
      survey_version, source_items_snapshot, created_by
    ) values (
      p_organization_id, v_saved.list_id, v_saved.revision_id, p_survey_id, p_survey_revision_id,
      v_survey_revision.version, v_source_items, v_actor
    );
  end if;
  return query select v_saved.list_id, v_saved.revision_id, v_saved.revision_number, v_saved.version;
end;
$$;

revoke all on function public.save_workflow_material_list_from_survey_revision(uuid, uuid, uuid, boolean, text, jsonb, uuid) from public, anon;
grant execute on function public.save_workflow_material_list_from_survey_revision(uuid, uuid, uuid, boolean, text, jsonb, uuid) to authenticated;
