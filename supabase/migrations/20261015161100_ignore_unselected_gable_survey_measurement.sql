-- F9.13: keep the unused, blank roof input out of exact survey snapshot matching.
-- The browser form stores both rise and pitch templates, with the unused one null.
create or replace function private.survey_roof_input_matches(p_sections jsonb,p_section_id uuid,p_input jsonb)
returns boolean language plpgsql stable security invoker set search_path=public,pg_catalog as $$
declare
 v_section jsonb;
 v_measurement jsonb;
 v_key text;
 v_value numeric;
 v_values jsonb:='{}'::jsonb;
 v_expected jsonb;
 v_seen text[]:=array[]::text[];
begin
 select x into v_section from jsonb_array_elements(p_sections) x
 where x->>'id'=p_section_id::text and x->>'workType'='roof';
 if v_section is null or jsonb_typeof(p_input) is distinct from 'object' then return false; end if;

 for v_measurement in select x from jsonb_array_elements(v_section->'measurements') x loop
  v_key:=case v_measurement->>'semanticType'
   when 'roof_building_length' then 'buildingLengthMm'
   when 'roof_building_width' then 'buildingWidthMm'
   when 'roof_rise' then 'roofRiseMm'
   when 'roof_pitch' then 'roofPitchDegrees'
   when 'roof_eave_overhang' then 'eaveOverhangMm'
   when 'roof_front_gable_overhang' then 'frontGableOverhangMm'
   when 'roof_rear_gable_overhang' then 'rearGableOverhangMm'
   else null end;
  if v_key is null then continue; end if;
  if v_key=any(v_seen) then return false; end if;
  v_seen:=array_append(v_seen,v_key);
  if v_measurement->'value' is null or jsonb_typeof(v_measurement->'value')='null' then continue; end if;
  if jsonb_typeof(v_measurement->'value') is distinct from 'number' then return false; end if;
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
