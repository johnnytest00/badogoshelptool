begin;
select no_plan();
set local role postgres;
insert into public.organizations(id, name) values ('00000000-0000-4000-8000-000000000053', 'DEMO F9.44.4'), ('00000000-0000-4000-8000-000000000054', 'DEMO other') on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values
 ('00000000-0000-4000-8000-000000000053', '00000000-0000-4000-8000-000000000001', 'owner'),
 ('00000000-0000-4000-8000-000000000054', '00000000-0000-4000-8000-000000000002', 'owner') on conflict do nothing;
grant tetopro_covering_writer to postgres;

-- Roof (quick, 10,5 x 4,2): eave total 21 000 mm, ridge 10 500 mm. e1: accepted eave (calculated), e2: accepted then edited (overridden),
-- e3: directly measured (no source), e4: ridge flashing whose roof section is NOT recorded as a verified source (overridden, unverifiable).
create temp table t_o as select '[
 {"id":"00000000-0000-4000-8000-000000987001","name":"DEMO tető","workType":"roof","roofType":"gable","roofMeasurementMode":"quick","quickPlanesMatch":true,"notes":"","photoIds":[],"measurements":[
  {"id":"00000000-0000-4000-8000-000000987011","label":"h","value":10.5,"unit":"m","semanticType":"roof_eave_run"},
  {"id":"00000000-0000-4000-8000-000000987012","label":"a","value":4.2,"unit":"m","semanticType":"roof_plane_slope_a"}]},
 {"id":"00000000-0000-4000-8000-000000987002","name":"DEMO e1","workType":"gutter","elementKind":"gutter","lengthSource":{"roofSectionId":"00000000-0000-4000-8000-000000987001","role":"eave_total"},"notes":"","photoIds":[],"measurements":[
  {"id":"00000000-0000-4000-8000-000000987021","label":"cs","value":21,"unit":"m","semanticType":"gutter_run_length"}]},
 {"id":"00000000-0000-4000-8000-000000987003","name":"DEMO e2","workType":"flashing","elementKind":"flashing_eave","lengthSource":{"roofSectionId":"00000000-0000-4000-8000-000000987001","role":"eave_total"},"notes":"","photoIds":[],"measurements":[
  {"id":"00000000-0000-4000-8000-000000987031","label":"sz","value":20,"unit":"m","semanticType":"flashing_run_length"}]},
 {"id":"00000000-0000-4000-8000-000000987004","name":"DEMO e3","workType":"gutter","elementKind":"gutter","notes":"","photoIds":[],"measurements":[
  {"id":"00000000-0000-4000-8000-000000987041","label":"cs","value":12.5,"unit":"m","semanticType":"gutter_run_length"}]},
 {"id":"00000000-0000-4000-8000-000000987005","name":"DEMO e4","workType":"flashing","elementKind":"flashing_ridge","lengthSource":{"roofSectionId":"00000000-0000-4000-8000-000000987009","role":"ridge"},"notes":"","photoIds":[],"measurements":[
  {"id":"00000000-0000-4000-8000-000000987051","label":"sz","value":10.5,"unit":"m","semanticType":"flashing_run_length"}]}]'::jsonb as sections;
alter table t_o add column measurements jsonb;
update t_o set measurements = private.field_survey_section_measurements(sections);
grant all on t_o to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('test.survey', '00000000-0000-4000-8000-000000987000', true);
select version from public.save_field_survey_workspace(current_setting('test.survey')::uuid, '00000000-0000-4000-8000-000000000053', null, 'roof', (select measurements from t_o), 'DEMO', 0, (select sections from t_o));
select set_config('test.rev', (select id::text from public.field_survey_revisions where survey_id=current_setting('test.survey')::uuid and version=1), true);
reset role;
set local role tetopro_covering_writer;
select set_config('test.geo', (select source_id::text from public.save_survey_quick_gable_geometry_source_secure('00000000-0000-4000-8000-000000000053', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, '00000000-0000-4000-8000-000000987001',
  '{"mode":"quick","eaveRunMm":10500,"slopeAMm":4200,"slopeBMm":4200,"planesMatch":true}', '{"areas":{"combinedRoofM2":88.2},"dimensions":{"ridgeMm":10500,"eaveTotalMm":21000,"vergeTotalMm":16800}}', '00000000-0000-4000-8000-000000000001')), true);
reset role;

create temp table t_i as select jsonb_build_array(
 jsonb_build_object('id','00000000-0000-4000-8000-000000987101','kind','manual','description','e1','materialCategory','gutter','categoryId',null,'quantity','21','unit','linear_meter','variantId',null,'priceId',null,'manualPriceAmount','','manualPriceKind',null,'sourceRef',jsonb_build_object('type','measurement','sectionId','00000000-0000-4000-8000-000000987002','measurementId','00000000-0000-4000-8000-000000987021')),
 jsonb_build_object('id','00000000-0000-4000-8000-000000987102','kind','manual','description','e2','materialCategory','flashing','categoryId',null,'quantity','20','unit','linear_meter','variantId',null,'priceId',null,'manualPriceAmount','','manualPriceKind',null,'sourceRef',jsonb_build_object('type','measurement','sectionId','00000000-0000-4000-8000-000000987003','measurementId','00000000-0000-4000-8000-000000987031')),
 jsonb_build_object('id','00000000-0000-4000-8000-000000987103','kind','manual','description','e3','materialCategory','gutter','categoryId',null,'quantity','12.5','unit','linear_meter','variantId',null,'priceId',null,'manualPriceAmount','','manualPriceKind',null,'sourceRef',jsonb_build_object('type','measurement','sectionId','00000000-0000-4000-8000-000000987004','measurementId','00000000-0000-4000-8000-000000987041')),
 jsonb_build_object('id','00000000-0000-4000-8000-000000987104','kind','manual','description','e4','materialCategory','flashing','categoryId',null,'quantity','10.5','unit','linear_meter','variantId',null,'priceId',null,'manualPriceAmount','','manualPriceKind',null,'sourceRef',jsonb_build_object('type','measurement','sectionId','00000000-0000-4000-8000-000000987005','measurementId','00000000-0000-4000-8000-000000987051'))) as items;
grant all on t_i to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('test.list', (select list_id::text from public.save_workflow_material_list_from_survey_revision('00000000-0000-4000-8000-000000000053', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, false, 'DEMO eredet',
  (select items from t_i), '00000000-0000-4000-8000-000000987201')), true);
reset role;
select ok(current_setting('test.list') <> '', 'a list with origin-bearing measurement items is created');
create or replace function pg_temp.snap(n int, path text) returns text language sql as $$
  select (select source_items_snapshot from public.material_preparation_survey_sources where survey_revision_id=current_setting('test.rev')::uuid) #>> ('{' || n || ',' || path || '}')::text[] $$;
select is(pg_temp.snap(0,'quantityKind'), 'calculated', 'an accepted, unchanged roof edge is calculated');
select is(pg_temp.snap(0,'origin,geometrySourceId'), current_setting('test.geo'), 'the verified geometry source is referenced');
select is(pg_temp.snap(0,'origin,calculatedValueMm'), '21000', 'the original calculated value is preserved');
select is(pg_temp.snap(1,'quantityKind'), 'overridden', 'an edited value is a manual override');
select is(pg_temp.snap(1,'origin,calculatedValueMm'), '21000', 'the override still records the original calculated value');
select is(pg_temp.snap(2,'quantityKind'), 'measured', 'a directly measured value stays measured');
select is(pg_temp.snap(2,'origin'), null, 'a measured value has no roof origin');
select is(pg_temp.snap(3,'quantityKind'), 'overridden', 'a value from an unverifiable roof source is never promoted to calculated');
select is(pg_temp.snap(3,'origin,calculatedValueMm'), null, 'no verified value is claimed for an unrecorded source');

-- RLS: another organization cannot read the provenance.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is((select count(*)::int from public.material_preparation_survey_sources where survey_revision_id=current_setting('test.rev')::uuid), 0, 'a foreign organization cannot read the origin provenance');
reset role;
select * from finish();
rollback;
