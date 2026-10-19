-- F9.44.1: gyors tetőmérés (eresz-irányú hossz + síkonkénti lejtő menti hossz) és a mérési mód megőrzése a felmérés-pillanatképben.
-- Csak validátorok bővülnek; meglévő rekord és revízió nem íródik át.
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
    if semantic_type not in ('custom','roof_building_length','roof_building_width','roof_rise','roof_pitch','roof_eave_overhang','roof_front_gable_overhang','roof_rear_gable_overhang','roof_outer_length','roof_outer_width','roof_outer_side','roof_hip_eave_height','roof_wing_width','roof_wing_projection','roof_eave_run','roof_plane_slope_a','roof_plane_slope_b','gutter_run_length','gutter_stock_length','gutter_bracket_spacing','flashing_run_length','flashing_section_length','flashing_overlap') then return false; end if;
    if semantic_type = 'roof_pitch' and item_unit <> 'degree' then return false; end if;
    if semantic_type in ('roof_building_length','roof_building_width','roof_rise','roof_eave_overhang','roof_front_gable_overhang','roof_rear_gable_overhang','roof_outer_length','roof_outer_width','roof_outer_side','roof_hip_eave_height','roof_wing_width','roof_wing_projection','roof_eave_run','roof_plane_slope_a','roof_plane_slope_b','gutter_run_length','gutter_stock_length','gutter_bracket_spacing','flashing_run_length','flashing_section_length','flashing_overlap') and item_unit not in ('mm','m') then return false; end if;
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
   or s-array['id','name','workType','measurements','notes','photoIds','roofType','roofTimberParameters','roofUnderlayParameters','roofMeasurementMode','quickPlanesMatch'] <> '{}'::jsonb
   or jsonb_typeof(s->'id') is distinct from 'string' or (s->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   or (s->>'id')=any(ids) or jsonb_typeof(s->'name') is distinct from 'string' or char_length(btrim(s->>'name')) not between 1 and 120
   or coalesce(s->>'workType','') not in ('roof','gutter','flashing','other')
   or (s ? 'roofType' and (s->>'workType'<>'roof' or jsonb_typeof(s->'roofType') is distinct from 'string' or s->>'roofType' not in ('gable','shed','hip','pyramid','halfHip','lShape','tShape')))
   or jsonb_typeof(s->'notes') is distinct from 'string' or char_length(s->>'notes')>2000
   or jsonb_typeof(s->'measurements') is distinct from 'array'
   or (s->'measurements'<>'[]'::jsonb and not private.valid_field_survey_measurements(
     (select jsonb_agg(case when m->'value'='null'::jsonb then jsonb_set(m,'{value}','0'::jsonb) else m end) from jsonb_array_elements(s->'measurements') m)))
   or jsonb_typeof(s->'photoIds') is distinct from 'array' or jsonb_array_length(s->'photoIds')>100 then return false; end if;
  if s ? 'roofMeasurementMode' and (s->>'workType'<>'roof' or s->>'roofType' is distinct from 'gable' or jsonb_typeof(s->'roofMeasurementMode') is distinct from 'string' or s->>'roofMeasurementMode' not in ('quick','building')) then return false; end if;
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
