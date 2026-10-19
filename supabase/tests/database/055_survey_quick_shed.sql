begin;
select no_plan();
set local role postgres;
insert into public.organizations(id, name) values ('00000000-0000-4000-8000-000000000055', 'DEMO F9.45.1') on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values ('00000000-0000-4000-8000-000000000055', '00000000-0000-4000-8000-000000000001', 'owner') on conflict do nothing;
grant tetopro_covering_writer to postgres;
select ok(not has_function_privilege('authenticated','public.save_survey_quick_shed_geometry_source_secure(uuid,uuid,uuid,uuid,jsonb,jsonb,uuid)','EXECUTE'), 'browser roles cannot call the quick shed writer');
select ok(has_function_privilege('tetopro_covering_writer','public.save_survey_quick_shed_geometry_source_secure(uuid,uuid,uuid,uuid,jsonb,jsonb,uuid)','EXECUTE'), 'the restricted server writer can');

-- s1 complete (8,5 m x 4,2 m); s2 incomplete (no slope); s3 building mode with the same values; s4 quick mode with retained building values.
create temp table t_q as select '[
 {"id":"00000000-0000-4000-8000-000000955101","name":"DEMO teljes","workType":"roof","roofType":"shed","roofMeasurementMode":"quick","notes":"","photoIds":[],"measurements":[
  {"id":"00000000-0000-4000-8000-000000955111","label":"h","value":8.5,"unit":"m","semanticType":"roof_eave_run"},
  {"id":"00000000-0000-4000-8000-000000955112","label":"l","value":4200,"unit":"mm","semanticType":"roof_plane_slope_a"}]},
 {"id":"00000000-0000-4000-8000-000000955102","name":"DEMO hiányos","workType":"roof","roofType":"shed","roofMeasurementMode":"quick","notes":"","photoIds":[],"measurements":[
  {"id":"00000000-0000-4000-8000-000000955121","label":"h","value":8.5,"unit":"m","semanticType":"roof_eave_run"},
  {"id":"00000000-0000-4000-8000-000000955122","label":"l","value":null,"unit":"m","semanticType":"roof_plane_slope_a"}]},
 {"id":"00000000-0000-4000-8000-000000955103","name":"DEMO épületméret","workType":"roof","roofType":"shed","roofMeasurementMode":"building","notes":"","photoIds":[],"measurements":[
  {"id":"00000000-0000-4000-8000-000000955131","label":"h","value":8.5,"unit":"m","semanticType":"roof_eave_run"},
  {"id":"00000000-0000-4000-8000-000000955132","label":"l","value":4.2,"unit":"m","semanticType":"roof_plane_slope_a"}]},
 {"id":"00000000-0000-4000-8000-000000955104","name":"DEMO régi","workType":"roof","roofType":"shed","notes":"","photoIds":[],"measurements":[
  {"id":"00000000-0000-4000-8000-000000955141","label":"h","value":8.5,"unit":"m","semanticType":"roof_outer_length"},
  {"id":"00000000-0000-4000-8000-000000955142","label":"sz","value":4,"unit":"m","semanticType":"roof_outer_width"},
  {"id":"00000000-0000-4000-8000-000000955143","label":"p","value":20,"unit":"degree","semanticType":"roof_pitch"}]}]'::jsonb as sections;
alter table t_q add column measurements jsonb;
update t_q set measurements = private.field_survey_section_measurements(sections);
grant all on t_q to authenticated;
select ok(private.valid_field_survey_sections((select sections from t_q)), 'shed sections with quick/building/no mode are valid');
select ok(not private.valid_field_survey_sections(jsonb_set((select sections from t_q), '{0,roofMeasurementMode}', '"detailed"')), 'a detailed shed mode is rejected');
select ok(not private.valid_field_survey_sections(jsonb_set((select sections from t_q), '{0,roofType}', '"hip"')), 'a mode on a hip roof is rejected');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('test.survey', '00000000-0000-4000-8000-000000955100', true);
select version from public.save_field_survey_workspace(current_setting('test.survey')::uuid, '00000000-0000-4000-8000-000000000055', null, 'roof', (select measurements from t_q), 'DEMO', 0, (select sections from t_q));
select set_config('test.rev', (select id::text from public.field_survey_revisions where survey_id=current_setting('test.survey')::uuid and version=1), true);
select is((select sections #>> '{0,roofMeasurementMode}' from public.field_survey_revisions where id=current_setting('test.rev')::uuid), 'quick', 'the shed mode is stored in the immutable revision');

reset role;
set local role tetopro_covering_writer;
select set_config('test.geo1', (select source_id::text from public.save_survey_quick_shed_geometry_source_secure('00000000-0000-4000-8000-000000000055', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, '00000000-0000-4000-8000-000000955101',
  '{"mode":"quick","eaveRunMm":8500,"slopeMm":4200}', '{"areas":{"combinedRoofM2":35.7}}', '00000000-0000-4000-8000-000000000001')), true);
select set_config('test.reused', (select reused::text from public.save_survey_quick_shed_geometry_source_secure('00000000-0000-4000-8000-000000000055', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, '00000000-0000-4000-8000-000000955101',
  '{"mode":"quick","eaveRunMm":8500,"slopeMm":4200}', '{"areas":{"combinedRoofM2":35.7}}', '00000000-0000-4000-8000-000000000001')), true);
reset role;
select is((select combined_roof_m2 from public.field_survey_roof_geometry_sources where id=current_setting('test.geo1')::uuid), 35.7, '8,5 x 4,2 = 35,7 m²');
select is((select geometry_type from public.field_survey_roof_geometry_sources where id=current_setting('test.geo1')::uuid), 'roof.shed.quick', 'the source names the quick shed method');
select is(current_setting('test.reused'), 'true', 'a repeated write is idempotent');
select throws_ok($$select * from public.save_survey_quick_shed_geometry_source_secure('00000000-0000-4000-8000-000000000055', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, '00000000-0000-4000-8000-000000955101',
  '{"mode":"quick","eaveRunMm":8500,"slopeMm":4300}', '{"areas":{"combinedRoofM2":36.55}}', '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'an input that differs from the revision is rejected');
select throws_ok($$select * from public.save_survey_quick_shed_geometry_source_secure('00000000-0000-4000-8000-000000000055', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, '00000000-0000-4000-8000-000000955101',
  '{"mode":"quick","eaveRunMm":8500,"slopeMm":4200}', '{"areas":{"combinedRoofM2":40}}', '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'a caller-supplied wrong area is rejected');
select throws_ok($$select * from public.save_survey_quick_shed_geometry_source_secure('00000000-0000-4000-8000-000000000055', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, '00000000-0000-4000-8000-000000955102',
  '{"mode":"quick","eaveRunMm":8500,"slopeMm":4200}', '{"areas":{"combinedRoofM2":35.7}}', '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'an incomplete measurement is never completed');
select throws_ok($$select * from public.save_survey_quick_shed_geometry_source_secure('00000000-0000-4000-8000-000000000055', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, '00000000-0000-4000-8000-000000955103',
  '{"mode":"quick","eaveRunMm":8500,"slopeMm":4200}', '{"areas":{"combinedRoofM2":35.7}}', '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'building mode does not produce a quick source');
select throws_ok($$select * from public.save_survey_quick_shed_geometry_source_secure('00000000-0000-4000-8000-000000000055', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, '00000000-0000-4000-8000-000000955101',
  '{"mode":"quick","eaveRunMm":8500,"slopeMm":4200}', '{"areas":{"combinedRoofM2":35.7}}', '00000000-0000-4000-8000-000000000002')$$, '42501', null, 'a non-member actor is rejected');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
create temp table t_items as select jsonb_build_array(jsonb_build_object('id','00000000-0000-4000-8000-000000955201','kind','manual','description','DEMO tetőfelület','manualUnitLabel',null,'unit','square_meter',
  'materialCategory','roof_covering','categoryId',null,'quantity','35.7','unit','square_meter','variantId',null,'priceId',null,'manualPriceAmount','','manualPriceKind',null,
  'sourceRef', jsonb_build_object('type','surveyGeometry','sectionId','00000000-0000-4000-8000-000000955101','geometrySourceId',current_setting('test.geo1')))) as items;
grant all on t_items to authenticated;
select set_config('test.list', (select list_id::text from public.save_workflow_material_list_from_survey_revision('00000000-0000-4000-8000-000000000055', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, false, 'DEMO félnyereg lista',
  (select items from t_items), '00000000-0000-4000-8000-000000955211')), true);
select ok(current_setting('test.list') <> '', 'a material list is created from the quick shed source without project or work log');
select is((select (source_items_snapshot #>> '{0,sourceValue}')::numeric from public.material_preparation_survey_sources where material_list_id=current_setting('test.list')::uuid), 35.7, 'the exact verified area is stored in the provenance');
reset role;
select throws_ok($$update public.field_survey_roof_geometry_sources set combined_roof_m2 = 1$$, '55000', null, 'a recorded source cannot be changed');
select * from finish();
rollback;
