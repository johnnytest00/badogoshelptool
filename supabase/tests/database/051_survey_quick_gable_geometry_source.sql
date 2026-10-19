begin;
select no_plan();
set local role postgres;
insert into public.organizations(id, name) values ('00000000-0000-4000-8000-000000000051', 'DEMO F9.44.2') on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values ('00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000001', 'owner') on conflict do nothing;
grant tetopro_covering_writer to postgres;
select ok(not has_function_privilege('authenticated','public.save_survey_quick_gable_geometry_source_secure(uuid,uuid,uuid,uuid,jsonb,jsonb,uuid)','EXECUTE'), 'browser roles cannot call the quick geometry writer');
select ok(has_function_privilege('tetopro_covering_writer','public.save_survey_quick_gable_geometry_source_secure(uuid,uuid,uuid,uuid,jsonb,jsonb,uuid)','EXECUTE'), 'the restricted server writer can');

-- s1: equal planes (10,5 m x 4,2 m); s2: unequal (9 m, 4 m + 3,5 m); s3: planes "match" but B contradicts; s4: no confirmation.
create temp table t_q as select '[
 {"id":"00000000-0000-4000-8000-000000985101","name":"DEMO egyenlő","workType":"roof","roofType":"gable","roofMeasurementMode":"quick","quickPlanesMatch":true,"notes":"","photoIds":[],"measurements":[
  {"id":"00000000-0000-4000-8000-000000985111","label":"h","value":10.5,"unit":"m","semanticType":"roof_eave_run"},
  {"id":"00000000-0000-4000-8000-000000985112","label":"a","value":4.2,"unit":"m","semanticType":"roof_plane_slope_a"},
  {"id":"00000000-0000-4000-8000-000000985113","label":"b","value":null,"unit":"m","semanticType":"roof_plane_slope_b"}]},
 {"id":"00000000-0000-4000-8000-000000985102","name":"DEMO eltérő","workType":"roof","roofType":"gable","roofMeasurementMode":"quick","quickPlanesMatch":false,"notes":"","photoIds":[],"measurements":[
  {"id":"00000000-0000-4000-8000-000000985121","label":"h","value":9000,"unit":"mm","semanticType":"roof_eave_run"},
  {"id":"00000000-0000-4000-8000-000000985122","label":"a","value":4,"unit":"m","semanticType":"roof_plane_slope_a"},
  {"id":"00000000-0000-4000-8000-000000985123","label":"b","value":3.5,"unit":"m","semanticType":"roof_plane_slope_b"}]},
 {"id":"00000000-0000-4000-8000-000000985103","name":"DEMO ellentmondó","workType":"roof","roofType":"gable","roofMeasurementMode":"quick","quickPlanesMatch":true,"notes":"","photoIds":[],"measurements":[
  {"id":"00000000-0000-4000-8000-000000985131","label":"h","value":10,"unit":"m","semanticType":"roof_eave_run"},
  {"id":"00000000-0000-4000-8000-000000985132","label":"a","value":4,"unit":"m","semanticType":"roof_plane_slope_a"},
  {"id":"00000000-0000-4000-8000-000000985133","label":"b","value":3.8,"unit":"m","semanticType":"roof_plane_slope_b"}]},
 {"id":"00000000-0000-4000-8000-000000985104","name":"DEMO megerősítetlen","workType":"roof","roofType":"gable","roofMeasurementMode":"quick","notes":"","photoIds":[],"measurements":[
  {"id":"00000000-0000-4000-8000-000000985141","label":"h","value":10,"unit":"m","semanticType":"roof_eave_run"},
  {"id":"00000000-0000-4000-8000-000000985142","label":"a","value":4,"unit":"m","semanticType":"roof_plane_slope_a"}]}]'::jsonb as sections;
alter table t_q add column measurements jsonb;
update t_q set measurements = private.field_survey_section_measurements(sections);
grant all on t_q to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('test.survey', '00000000-0000-4000-8000-000000985100', true);
select version from public.save_field_survey_workspace(current_setting('test.survey')::uuid, '00000000-0000-4000-8000-000000000051', null, 'roof', (select measurements from t_q), 'DEMO', 0, (select sections from t_q));
select set_config('test.rev', (select id::text from public.field_survey_revisions where survey_id=current_setting('test.survey')::uuid and version=1), true);

reset role;
set local role tetopro_covering_writer;
select set_config('test.geo1', (select source_id::text from public.save_survey_quick_gable_geometry_source_secure('00000000-0000-4000-8000-000000000051', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, '00000000-0000-4000-8000-000000985101',
  '{"mode":"quick","eaveRunMm":10500,"slopeAMm":4200,"slopeBMm":4200,"planesMatch":true}', '{"areas":{"combinedRoofM2":88.2}}', '00000000-0000-4000-8000-000000000001')), true);
reset role;
select ok(current_setting('test.geo1') <> '', 'equal planes record a verified source');
set local role tetopro_covering_writer;
reset role;
select is((select combined_roof_m2 from public.field_survey_roof_geometry_sources where id=current_setting('test.geo1')::uuid), 88.2, 'equal planes: 10,5 x (4,2 + 4,2) = 88,2 m²');
set local role tetopro_covering_writer;
reset role;
select is((select geometry_type from public.field_survey_roof_geometry_sources where id=current_setting('test.geo1')::uuid), 'roof.gable.quick', 'the source names the quick method');
set local role tetopro_covering_writer;
select set_config('test.reused', (select reused::text from public.save_survey_quick_gable_geometry_source_secure('00000000-0000-4000-8000-000000000051', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, '00000000-0000-4000-8000-000000985101',
  '{"mode":"quick","eaveRunMm":10500,"slopeAMm":4200,"slopeBMm":4200,"planesMatch":true}', '{"areas":{"combinedRoofM2":88.2}}', '00000000-0000-4000-8000-000000000001')), true);
select set_config('test.unequal', (select combined_roof_m2::text from public.save_survey_quick_gable_geometry_source_secure('00000000-0000-4000-8000-000000000051', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, '00000000-0000-4000-8000-000000985102',
  '{"mode":"quick","eaveRunMm":9000,"slopeAMm":4000,"slopeBMm":3500,"planesMatch":false}', '{"areas":{"combinedRoofM2":67.5}}', '00000000-0000-4000-8000-000000000001')), true);
reset role;
select throws_ok($$select * from public.save_survey_quick_gable_geometry_source_secure('00000000-0000-4000-8000-000000000051', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, '00000000-0000-4000-8000-000000985101',
  '{"mode":"quick","eaveRunMm":10500,"slopeAMm":4300,"slopeBMm":4300,"planesMatch":true}', '{"areas":{"combinedRoofM2":90.3}}', '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'an input that differs from the revision is rejected');
reset role;
select throws_ok($$select * from public.save_survey_quick_gable_geometry_source_secure('00000000-0000-4000-8000-000000000051', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, '00000000-0000-4000-8000-000000985102',
  '{"mode":"quick","eaveRunMm":9000,"slopeAMm":4000,"slopeBMm":3500,"planesMatch":false}', '{"areas":{"combinedRoofM2":99}}', '00000000-0000-4000-8000-000000000001')$$, null, null, 'a caller-supplied wrong area is rejected');
reset role;
select throws_ok($$select * from public.save_survey_quick_gable_geometry_source_secure('00000000-0000-4000-8000-000000000051', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, '00000000-0000-4000-8000-000000985103',
  '{"mode":"quick","eaveRunMm":10000,"slopeAMm":4000,"slopeBMm":4000,"planesMatch":true}', '{"areas":{"combinedRoofM2":80}}', '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'a B plane contradicting "planes match" is rejected');
reset role;
select throws_ok($$select * from public.save_survey_quick_gable_geometry_source_secure('00000000-0000-4000-8000-000000000051', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, '00000000-0000-4000-8000-000000985104',
  '{"mode":"quick","eaveRunMm":10000,"slopeAMm":4000,"slopeBMm":4000,"planesMatch":true}', '{"areas":{"combinedRoofM2":80}}', '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'an unconfirmed plane decision is never assumed');
reset role;
select throws_ok($$select * from public.save_survey_quick_gable_geometry_source_secure('00000000-0000-4000-8000-000000000051', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, '00000000-0000-4000-8000-000000985101',
  '{"mode":"quick","eaveRunMm":10500,"slopeAMm":4200,"slopeBMm":4200,"planesMatch":true}', '{"areas":{"combinedRoofM2":88.2}}', '00000000-0000-4000-8000-000000000002')$$, '42501', null, 'a non-member actor is rejected');

reset role;
select is(current_setting('test.reused'), 'true', 'a repeated write is idempotent');
select is(current_setting('test.unequal')::numeric, 67.5, 'unequal planes: 9 x (4 + 3,5) = 67,5 m²');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
create temp table t_items as select jsonb_build_array(jsonb_build_object('id','00000000-0000-4000-8000-000000985201','kind','manual','description','DEMO tetőfelület','manualUnitLabel',null,'unit','square_meter',
  'materialCategory','roof_covering','categoryId',null,'quantity','88.2','unit','square_meter','variantId',null,'priceId',null,'manualPriceAmount','','manualPriceKind',null,
  'sourceRef', jsonb_build_object('type','surveyGeometry','sectionId','00000000-0000-4000-8000-000000985101','geometrySourceId',current_setting('test.geo1')))) as items;
grant all on t_items to authenticated;
select set_config('test.list', (select list_id::text from public.save_workflow_material_list_from_survey_revision('00000000-0000-4000-8000-000000000051', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, false, 'DEMO gyors lista',
  (select items from t_items), '00000000-0000-4000-8000-000000985211')), true);
select ok(current_setting('test.list') <> '', 'a material list is created from the quick gable source without project or work log');
select is((select (source_items_snapshot #>> '{0,sourceValue}')::numeric from public.material_preparation_survey_sources where material_list_id=current_setting('test.list')::uuid), 88.2, 'the exact source value is stored in the provenance');
reset role;
select throws_ok($$update public.field_survey_roof_geometry_sources set combined_roof_m2 = 1$$, '55000', null, 'a recorded source cannot be changed');
select * from finish();
rollback;
