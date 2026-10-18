begin;
select no_plan();
set local role postgres;
insert into public.organizations(id, name) values ('00000000-0000-4000-8000-000000000020', 'DEMO F9.42.7'), ('00000000-0000-4000-8000-000000000021', 'DEMO other') on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000001', 'owner'),
  ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000002', 'member'),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000002', 'owner') on conflict do nothing;
grant tetopro_covering_writer to postgres;

select ok(not has_function_privilege('authenticated','public.save_survey_multi_roof_geometry_source_secure(uuid,uuid,uuid,uuid,text,jsonb,jsonb,uuid)','EXECUTE'), 'browser roles cannot call the multi-roof geometry writer');
select ok(has_function_privilege('tetopro_covering_writer','public.save_survey_multi_roof_geometry_source_secure(uuid,uuid,uuid,uuid,text,jsonb,jsonb,uuid)','EXECUTE'), 'the restricted server writer can');
-- F9.42.6's original gable path is untouched by this migration.
select ok(has_function_privilege('tetopro_covering_writer','public.save_survey_roof_geometry_source_secure(uuid,uuid,uuid,uuid,jsonb,jsonb,uuid)','EXECUTE'), 'the gable writer signature is unchanged');

-- A brand-new, project-free survey with a kontyolt tető ("hip") section plus a gutter section.
create temp table t_sec as select '[{"id":"00000000-0000-4000-8000-000000984702","name":"DEMO kontytető","workType":"roof","roofType":"hip","notes":"","photoIds":[],"measurements":[
    {"id":"00000000-0000-4000-8000-000000984710","label":"hossz","value":12000,"unit":"mm","semanticType":"roof_outer_length"},
    {"id":"00000000-0000-4000-8000-000000984711","label":"szélesség","value":8000,"unit":"mm","semanticType":"roof_outer_width"},
    {"id":"00000000-0000-4000-8000-000000984712","label":"hajlás","value":35,"unit":"degree","semanticType":"roof_pitch"}]},
   {"id":"00000000-0000-4000-8000-000000984703","name":"DEMO eresz","workType":"gutter","notes":"","photoIds":[],"measurements":[
    {"id":"00000000-0000-4000-8000-000000984716","label":"eresz","value":20,"unit":"m","semanticType":"gutter_run_length"}]}]'::jsonb as sections,
  private.field_survey_section_measurements('[{"id":"00000000-0000-4000-8000-000000984702","name":"DEMO kontytető","workType":"roof","roofType":"hip","notes":"","photoIds":[],"measurements":[
    {"id":"00000000-0000-4000-8000-000000984710","label":"hossz","value":12000,"unit":"mm","semanticType":"roof_outer_length"},
    {"id":"00000000-0000-4000-8000-000000984711","label":"szélesség","value":8000,"unit":"mm","semanticType":"roof_outer_width"},
    {"id":"00000000-0000-4000-8000-000000984712","label":"hajlás","value":35,"unit":"degree","semanticType":"roof_pitch"}]},
   {"id":"00000000-0000-4000-8000-000000984703","name":"DEMO eresz","workType":"gutter","notes":"","photoIds":[],"measurements":[
    {"id":"00000000-0000-4000-8000-000000984716","label":"eresz","value":20,"unit":"m","semanticType":"gutter_run_length"}]}]'::jsonb) as measurements;
grant all on t_sec to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('test.survey', '00000000-0000-4000-8000-000000984701', true);
select version from public.save_field_survey_workspace(current_setting('test.survey')::uuid, '00000000-0000-4000-8000-000000000020', null, 'roof', (select measurements from t_sec), 'DEMO', 0, (select sections from t_sec));
select set_config('test.rev', (select id::text from public.field_survey_revisions where survey_id=current_setting('test.survey')::uuid and version=1), true);
select is((select project_id from public.field_surveys where id=current_setting('test.survey')::uuid), null, 'the survey has no project');

create temp table t_in as select '{"type":"hip","lengthMm":12000,"widthMm":8000,"pitchDegrees":35}'::jsonb as input,
  '{"type":"hip","modelVersion":"1.0.0","planes":[{"id":"p1"}],"edges":[{"id":"e1"}],"totalAreaMm2":123456789.123456,"projectedAreaMm2":96000000}'::jsonb as output;
grant all on t_in to authenticated, tetopro_covering_writer;

reset role;
set local role tetopro_covering_writer;
select set_config('test.geo', (select source_id::text from public.save_survey_multi_roof_geometry_source_secure('00000000-0000-4000-8000-000000000020', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984702', 'hip', (select input from t_in), (select output from t_in), '00000000-0000-4000-8000-000000000001')), true);
reset role;
select ok(current_setting('test.geo') <> '', 'a verified kontytető (hip) area is recorded for a project-free survey revision');
select is((select reused from public.save_survey_multi_roof_geometry_source_secure('00000000-0000-4000-8000-000000000020', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984702', 'hip', (select input from t_in), (select output from t_in), '00000000-0000-4000-8000-000000000001')), true, 'recording the same revision section again is idempotent');
select is((select count(*)::int from public.field_survey_roof_geometry_sources where survey_revision_id=current_setting('test.rev')::uuid), 1, 'no duplicate source is created');
select is((select geometry_type from public.field_survey_roof_geometry_sources where id=current_setting('test.geo')::uuid), 'roof.geometry.hip', 'the geometry type is recorded as roof.geometry.hip');
select is((select combined_roof_m2::text from public.field_survey_roof_geometry_sources where id=current_setting('test.geo')::uuid), '123.4567891234560000', 'the high-precision area (totalAreaMm2 / 1e6) is kept');

select throws_ok($$select * from public.save_survey_multi_roof_geometry_source_secure('00000000-0000-4000-8000-000000000020', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984702', 'hip', jsonb_set((select input from t_in),'{lengthMm}','13000'), (select output from t_in), '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'a client-supplied input that differs from the survey measurements is rejected');
select throws_ok($$select * from public.save_survey_multi_roof_geometry_source_secure('00000000-0000-4000-8000-000000000020', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984702', 'triangle', (select input from t_in), (select output from t_in), '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'an unsupported roof type is rejected');
select throws_ok($$select * from public.save_survey_multi_roof_geometry_source_secure('00000000-0000-4000-8000-000000000020', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984702', 'shed', (select input from t_in), (select output from t_in), '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'a roof type that does not match the input/output type is rejected');
select throws_ok($$select * from public.save_survey_multi_roof_geometry_source_secure('00000000-0000-4000-8000-000000000020', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984703', 'hip', (select input from t_in), (select output from t_in), '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'a non-roof section cannot supply roof geometry');
select throws_ok($$select * from public.save_survey_multi_roof_geometry_source_secure('00000000-0000-4000-8000-000000000020', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984702', 'hip', (select input from t_in), jsonb_set((select output from t_in),'{totalAreaMm2}','0'), '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'a zero area is rejected');
select throws_ok($$select * from public.save_survey_multi_roof_geometry_source_secure('00000000-0000-4000-8000-000000000020', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984702', 'hip', (select input from t_in), '{"type":"hip"}'::jsonb, '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'a malformed output is rejected');
select throws_ok($$select * from public.save_survey_multi_roof_geometry_source_secure('00000000-0000-4000-8000-000000000020', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984702', 'hip', (select input from t_in), (select output from t_in), '00000000-0000-4000-8000-000000000002')$$, '42501', null, 'another member cannot record geometry for a creator-scoped survey');
select throws_ok($$select * from public.save_survey_multi_roof_geometry_source_secure('00000000-0000-4000-8000-000000000021', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984702', 'hip', (select input from t_in), (select output from t_in), '00000000-0000-4000-8000-000000000001')$$, '42501', null, 'a workshop that does not own the survey is rejected');

-- Immutability (same table/trigger as the gable rows).
set local role postgres;
select throws_ok($$update public.field_survey_roof_geometry_sources set combined_roof_m2 = 1 where id = '$$ || current_setting('test.geo') || $$'::uuid$$, '55000', null, 'a recorded multi-roof source cannot be changed');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

-- Material list and HUF/m² labor from the verified hip area, reusing the generic (type-agnostic) consumption path.
create temp table t_items as select jsonb_build_array(jsonb_build_object('id','00000000-0000-4000-8000-000000984720','kind','manual','description','DEMO kontytető felület',
  'materialCategory','roof_covering','categoryId',null,'quantity','123.456789','unit','square_meter','variantId',null,'priceId',null,'manualPriceAmount','','manualPriceKind',null,
  'sourceRef', jsonb_build_object('type','surveyGeometry','sectionId','00000000-0000-4000-8000-000000984702','geometrySourceId',current_setting('test.geo')))) as items;
grant all on t_items to authenticated;
select set_config('test.list', (select list_id::text from public.save_workflow_material_list_from_survey_revision('00000000-0000-4000-8000-000000000020', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, false, 'DEMO kontytető lista',
  (select items from t_items), '00000000-0000-4000-8000-000000984721')), true);
select ok(current_setting('test.list') <> '', 'a material list is created from the independent hip geometry source');
select set_config('test.mrev', (select id::text from public.material_preparation_revisions where list_id=current_setting('test.list')::uuid and revision_number=1), true);
select is((select source_items_snapshot #>> '{0,sourceValue}' from public.material_preparation_survey_sources where material_revision_id=current_setting('test.mrev')::uuid), '123.4567891234560000', 'the exact high-precision hip source value is stored in the immutable provenance');
select is((select source_items_snapshot #>> '{0,sourceKind}' from public.material_preparation_survey_sources where material_revision_id=current_setting('test.mrev')::uuid), 'geometry', 'the provenance names the geometry source kind for the hip roof too');

select set_config('test.arearate', (select rate_id::text from public.create_organization_labor_rate('00000000-0000-4000-8000-000000000020','DEMO terület díj','roof_area_m2',1500.00,'net','00000000-0000-4000-8000-000000984730')), true);
create temp table t_labor as select jsonb_build_array(jsonb_build_object('type','LABOR','description','Tetőfedés munkadíj','quantity','123.456789','unit','m²','unitPrice','1500.00','priceClass','net',
  'variantId','','categoryId','','priceId','','takeoffItemId','','notes','',
  'laborSource', jsonb_build_object('rateId',current_setting('test.arearate'),'materialListId',current_setting('test.list'),'materialRevisionId',current_setting('test.mrev'),'materialItemId','00000000-0000-4000-8000-000000984720'))) as lines;
grant all on t_labor to authenticated;
select set_config('test.q', (select quotation_id::text from public.save_standalone_quotation_draft_with_document('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000984731',null,'DEMO q hip',null,(select lines from t_labor),0,'{"recipientSource":"manual"}'::jsonb)), true);
select ok(current_setting('test.q') <> '', 'an HUF/m² labor line saves against the hip-geometry-derived item');
select is((select line_items_snapshot #>> '{0,laborSource,sourceQuantity}' from public.quotation_revisions where quotation_id=current_setting('test.q')::uuid and revision_number=1), '123.4567891234560000', 'the original high-precision hip source quantity is stored in laborSource');

select * from finish();
rollback;
