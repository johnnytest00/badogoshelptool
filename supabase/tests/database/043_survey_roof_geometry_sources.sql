begin;
select no_plan();
set local role postgres;
insert into public.organizations(id, name) values ('00000000-0000-4000-8000-000000000010', 'DEMO F9.42.6'), ('00000000-0000-4000-8000-000000000011', 'DEMO other') on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'owner'),
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002', 'member'),
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000002', 'owner') on conflict do nothing;
grant tetopro_covering_writer to postgres;

select ok(not has_table_privilege('authenticated','public.field_survey_roof_geometry_sources','INSERT'), 'the geometry source table is not directly writable');
select ok(not has_function_privilege('authenticated','public.save_survey_roof_geometry_source_secure(uuid,uuid,uuid,uuid,jsonb,jsonb,uuid)','EXECUTE'), 'browser roles cannot call the geometry writer');
select ok(has_function_privilege('tetopro_covering_writer','public.save_survey_roof_geometry_source_secure(uuid,uuid,uuid,uuid,jsonb,jsonb,uuid)','EXECUTE'), 'the restricted server writer can');

-- A brand-new, project-free roof survey plus a gutter section in the same survey.
create temp table t_sec as select '[{"id":"00000000-0000-4000-8000-000000984602","name":"DEMO tető","workType":"roof","notes":"","photoIds":[],"measurements":[
    {"id":"00000000-0000-4000-8000-000000984610","label":"h","value":10000,"unit":"mm","semanticType":"roof_building_length"},
    {"id":"00000000-0000-4000-8000-000000984611","label":"sz","value":6000,"unit":"mm","semanticType":"roof_building_width"},
    {"id":"00000000-0000-4000-8000-000000984612","label":"m","value":3000,"unit":"mm","semanticType":"roof_rise"},
    {"id":"00000000-0000-4000-8000-000000984613","label":"e","value":300,"unit":"mm","semanticType":"roof_eave_overhang"},
    {"id":"00000000-0000-4000-8000-000000984614","label":"f","value":200,"unit":"mm","semanticType":"roof_front_gable_overhang"},
    {"id":"00000000-0000-4000-8000-000000984615","label":"r","value":200,"unit":"mm","semanticType":"roof_rear_gable_overhang"}]},
   {"id":"00000000-0000-4000-8000-000000984603","name":"DEMO eresz","workType":"gutter","notes":"","photoIds":[],"measurements":[
    {"id":"00000000-0000-4000-8000-000000984616","label":"eresz","value":12.5,"unit":"m","semanticType":"gutter_run_length"}]}]'::jsonb as sections, private.field_survey_section_measurements('[{"id":"00000000-0000-4000-8000-000000984602","name":"DEMO tető","workType":"roof","notes":"","photoIds":[],"measurements":[
    {"id":"00000000-0000-4000-8000-000000984610","label":"h","value":10000,"unit":"mm","semanticType":"roof_building_length"},
    {"id":"00000000-0000-4000-8000-000000984611","label":"sz","value":6000,"unit":"mm","semanticType":"roof_building_width"},
    {"id":"00000000-0000-4000-8000-000000984612","label":"m","value":3000,"unit":"mm","semanticType":"roof_rise"},
    {"id":"00000000-0000-4000-8000-000000984613","label":"e","value":300,"unit":"mm","semanticType":"roof_eave_overhang"},
    {"id":"00000000-0000-4000-8000-000000984614","label":"f","value":200,"unit":"mm","semanticType":"roof_front_gable_overhang"},
    {"id":"00000000-0000-4000-8000-000000984615","label":"r","value":200,"unit":"mm","semanticType":"roof_rear_gable_overhang"}]},
   {"id":"00000000-0000-4000-8000-000000984603","name":"DEMO eresz","workType":"gutter","notes":"","photoIds":[],"measurements":[
    {"id":"00000000-0000-4000-8000-000000984616","label":"eresz","value":12.5,"unit":"m","semanticType":"gutter_run_length"}]}]'::jsonb) as measurements;
grant all on t_sec to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('test.survey', '00000000-0000-4000-8000-000000984601', true);
select version from public.save_field_survey_workspace(current_setting('test.survey')::uuid, '00000000-0000-4000-8000-000000000010', null, 'roof', (select measurements from t_sec), 'DEMO', 0, (select sections from t_sec));
select set_config('test.rev', (select id::text from public.field_survey_revisions where survey_id=current_setting('test.survey')::uuid and version=1), true);
select is((select project_id from public.field_surveys where id=current_setting('test.survey')::uuid), null, 'the survey has no project');

create temp table t_in as select '{"inputMode":"height","buildingLengthMm":10000,"buildingWidthMm":6000,"roofRiseMm":3000,"eaveOverhangMm":300,"frontGableOverhangMm":200,"rearGableOverhangMm":200}'::jsonb as input,
  '{"areas":{"combinedRoofM2":106.66044252673998},"dimensions":{},"planes":[],"geometryNotes":[]}'::jsonb as output;
grant all on t_in to authenticated, tetopro_covering_writer;

reset role;
set local role tetopro_covering_writer;
select set_config('test.geo', (select source_id::text from public.save_survey_roof_geometry_source_secure('00000000-0000-4000-8000-000000000010', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984602', (select input from t_in), (select output from t_in), '00000000-0000-4000-8000-000000000001')), true);
reset role;
select ok(current_setting('test.geo') <> '', 'a verified roof area is recorded for a project-free survey revision');
select is((select reused from public.save_survey_roof_geometry_source_secure('00000000-0000-4000-8000-000000000010', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984602', (select input from t_in), (select output from t_in), '00000000-0000-4000-8000-000000000001')), true, 'recording the same revision section again is idempotent');
select is((select count(*)::int from public.field_survey_roof_geometry_sources where survey_revision_id=current_setting('test.rev')::uuid), 1, 'no duplicate source is created');
select is((select combined_roof_m2::text from public.field_survey_roof_geometry_sources where id=current_setting('test.geo')::uuid), '106.66044252673998', 'the original high-precision quantity is kept');

select throws_ok($$select * from public.save_survey_roof_geometry_source_secure('00000000-0000-4000-8000-000000000010', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984602', jsonb_set((select input from t_in),'{buildingLengthMm}','11000'), (select output from t_in), '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'a client-supplied input that differs from the survey measurements is rejected');
select throws_ok($$select * from public.save_survey_roof_geometry_source_secure('00000000-0000-4000-8000-000000000010', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984603', (select input from t_in), (select output from t_in), '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'a non-roof section cannot supply roof geometry');
select throws_ok($$select * from public.save_survey_roof_geometry_source_secure('00000000-0000-4000-8000-000000000010', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984602', (select input from t_in), '{"areas":{"combinedRoofM2":0},"dimensions":{},"planes":[],"geometryNotes":[]}'::jsonb, '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'a zero area is rejected');
select throws_ok($$select * from public.save_survey_roof_geometry_source_secure('00000000-0000-4000-8000-000000000010', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984602', (select input from t_in), '{"areas":{}}'::jsonb, '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'a malformed output is rejected');
select throws_ok($$select * from public.save_survey_roof_geometry_source_secure('00000000-0000-4000-8000-000000000010', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984602', (select input from t_in), (select output from t_in), '00000000-0000-4000-8000-000000000002')$$, '42501', null, 'another member cannot record geometry for a creator-scoped survey');
select throws_ok($$select * from public.save_survey_roof_geometry_source_secure('00000000-0000-4000-8000-000000000011', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid,
  '00000000-0000-4000-8000-000000984602', (select input from t_in), (select output from t_in), '00000000-0000-4000-8000-000000000001')$$, '42501', null, 'a workshop that does not own the survey is rejected');
select throws_ok($$select * from public.save_survey_roof_geometry_source_secure('00000000-0000-4000-8000-000000000010', current_setting('test.survey')::uuid, '00000000-0000-4000-8000-000000999999',
  '00000000-0000-4000-8000-000000984602', (select input from t_in), (select output from t_in), '00000000-0000-4000-8000-000000000001')$$, '42501', null, 'an unknown survey revision is rejected');

-- Immutability and reads.
set local role postgres;
select throws_ok($$update public.field_survey_roof_geometry_sources set combined_roof_m2 = 1$$, '55000', null, 'a recorded source cannot be changed');
select throws_ok($$delete from public.field_survey_roof_geometry_sources$$, '55000', null, 'a recorded source cannot be deleted');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select is((select count(*)::int from public.field_survey_roof_geometry_sources), 1, 'the creator reads the source');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is((select count(*)::int from public.field_survey_roof_geometry_sources), 0, 'another member does not see a creator-scoped source');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

-- Material list from the verified area, no roof model, project or work log.
create temp table t_items as select jsonb_build_array(jsonb_build_object('id','00000000-0000-4000-8000-000000984620','kind','manual','description','DEMO tetőfelület',
  'materialCategory','roof_covering','categoryId',null,'quantity','106.660443','unit','square_meter','variantId',null,'priceId',null,'manualPriceAmount','','manualPriceKind',null,
  'sourceRef', jsonb_build_object('type','surveyGeometry','sectionId','00000000-0000-4000-8000-000000984602','geometrySourceId',current_setting('test.geo')))) as items;
grant all on t_items to authenticated;
select set_config('test.list', (select list_id::text from public.save_workflow_material_list_from_survey_revision('00000000-0000-4000-8000-000000000010', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, false, 'DEMO tető lista',
  (select items from t_items), '00000000-0000-4000-8000-000000984621')), true);
select ok(current_setting('test.list') <> '', 'a material list is created from the independent geometry source');
select set_config('test.mrev', (select id::text from public.material_preparation_revisions where list_id=current_setting('test.list')::uuid and revision_number=1), true);
select is((select source_items_snapshot #>> '{0,sourceValue}' from public.material_preparation_survey_sources where material_revision_id=current_setting('test.mrev')::uuid), '106.66044252673998', 'the exact high-precision source value is stored in the immutable provenance');
select is((select source_items_snapshot #>> '{0,sourceKind}' from public.material_preparation_survey_sources where material_revision_id=current_setting('test.mrev')::uuid), 'geometry', 'the provenance names the geometry source kind');
select is((select source_items_snapshot #>> '{0,sourceUnit}' from public.material_preparation_survey_sources where material_revision_id=current_setting('test.mrev')::uuid), 'm²', 'the source unit is m²');
select is((select (select count(*)::int from public.material_preparation_lists l where l.id=current_setting('test.list')::uuid and l.project_id is null and l.execution_plan_id is null)), 1, 'the list needs no project or work log');
select is((select list_id::text from public.save_workflow_material_list_from_survey_revision('00000000-0000-4000-8000-000000000010', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, false, 'DEMO tető lista',
  (select items from t_items), '00000000-0000-4000-8000-000000984621')), current_setting('test.list'), 'the same request key is idempotent');

select throws_ok($$select * from public.save_workflow_material_list_from_survey_revision('00000000-0000-4000-8000-000000000010', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, false, 'DEMO x',
  (select jsonb_set(items,'{0,sourceRef,geometrySourceId}','"00000000-0000-4000-8000-000000999999"') from t_items), '00000000-0000-4000-8000-000000984622')$$, '42501', null, 'an unknown geometry source is rejected');
select throws_ok($$select * from public.save_workflow_material_list_from_survey_revision('00000000-0000-4000-8000-000000000010', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, false, 'DEMO x',
  (select jsonb_set(items,'{0,unit}','"piece"') from t_items), '00000000-0000-4000-8000-000000984623')$$, '22023', null, 'the area cannot be converted to another unit');
select throws_ok($$select * from public.save_workflow_material_list_from_survey_revision('00000000-0000-4000-8000-000000000010', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, false, 'DEMO x',
  (select jsonb_set(items,'{0,sourceRef,extra}','"1"') from t_items), '00000000-0000-4000-8000-000000984624')$$, '22023', null, 'an unexpected reference field is rejected');
select throws_ok($$select * from public.save_workflow_material_list_from_survey_revision('00000000-0000-4000-8000-000000000010', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, false, 'DEMO x',
  (select jsonb_set(items,'{0,sourceRef,sectionId}','"00000000-0000-4000-8000-000000984603"') from t_items), '00000000-0000-4000-8000-000000984625')$$, '42501', null, 'the geometry source cannot be used for another section');

-- A later survey revision cannot reuse the older revision's source.
select version from public.save_field_survey_workspace(current_setting('test.survey')::uuid, '00000000-0000-4000-8000-000000000010', null, 'roof', (select measurements from t_sec), 'DEMO', 1,
  (select sections from t_sec));
select set_config('test.rev2', (select id::text from public.field_survey_revisions where survey_id=current_setting('test.survey')::uuid and version=2), true);
select throws_ok($$select * from public.save_workflow_material_list_from_survey_revision('00000000-0000-4000-8000-000000000010', current_setting('test.survey')::uuid, current_setting('test.rev2')::uuid, false, 'DEMO v2',
  (select items from t_items), '00000000-0000-4000-8000-000000984626')$$, '42501', null, 'a source recorded for revision 1 is not valid for revision 2');
select is((select combined_roof_m2::text from public.field_survey_roof_geometry_sources where id=current_setting('test.geo')::uuid), '106.66044252673998', 'revision 1 source is unchanged by the new revision');

-- Another member cannot build a list from the creator-scoped survey.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select throws_ok($$select * from public.save_workflow_material_list_from_survey_revision('00000000-0000-4000-8000-000000000010', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, false, 'DEMO foreign',
  (select items from t_items), '00000000-0000-4000-8000-000000984627')$$, '42501', null, 'another member cannot use the creator-scoped geometry source');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

-- HUF/m² labor on the geometry-derived item, with the structured laborSource.
select set_config('test.arearate', (select rate_id::text from public.create_organization_labor_rate('00000000-0000-4000-8000-000000000010','DEMO terület díj','roof_area_m2',1500.00,'net','00000000-0000-4000-8000-000000984630')), true);
create temp table t_labor as select jsonb_build_array(jsonb_build_object('type','LABOR','description','Tetőfedés munkadíj','quantity','106.660443','unit','m²','unitPrice','1500.00','priceClass','net',
  'variantId','','categoryId','','priceId','','takeoffItemId','','notes','',
  'laborSource', jsonb_build_object('rateId',current_setting('test.arearate'),'materialListId',current_setting('test.list'),'materialRevisionId',current_setting('test.mrev'),'materialItemId','00000000-0000-4000-8000-000000984620'))) as lines;
grant all on t_labor to authenticated;
select set_config('test.q', (select quotation_id::text from public.save_standalone_quotation_draft_with_document('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000984631',null,'DEMO q',null,(select lines from t_labor),0,'{"recipientSource":"manual"}'::jsonb)), true);
select ok(current_setting('test.q') <> '', 'an HUF/m² labor line saves against the geometry-derived item');
select is((select line_items_snapshot #>> '{0,laborSource,sourceQuantity}' from public.quotation_revisions where quotation_id=current_setting('test.q')::uuid and revision_number=1), '106.66044252673998', 'the original high-precision source quantity is stored in laborSource');
select is((select line_items_snapshot #>> '{0,quantity}' from public.quotation_revisions where quotation_id=current_setting('test.q')::uuid and revision_number=1), '106.660443', 'the billing quantity keeps six decimals');
select is((select line_items_snapshot #>> '{0,laborSource,surveyRevisionId}' from public.quotation_revisions where quotation_id=current_setting('test.q')::uuid and revision_number=1), current_setting('test.rev'), 'the exact survey revision is stored');
select is((select revision_number from public.save_standalone_quotation_draft_with_document('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000984632',current_setting('test.q')::uuid,'DEMO q',null,
  (select jsonb_set(lines,'{0,quantity}','"100"') from t_labor),1,'{"recipientSource":"manual"}'::jsonb)), 2, 'a manual quantity override saves a new revision');
select is((select line_items_snapshot #>> '{0,laborSource,sourceQuantity}' from public.quotation_revisions where quotation_id=current_setting('test.q')::uuid and revision_number=2), '106.66044252673998', 'the override keeps the verified source quantity');
select is((select line_items_snapshot #>> '{0,quantity}' from public.quotation_revisions where quotation_id=current_setting('test.q')::uuid and revision_number=1), '106.660443', 'revision 1 is unchanged');
select throws_ok($$select * from public.save_standalone_quotation_draft_with_document('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000984633',null,'DEMO dup',null,
  (select jsonb_build_array(lines->0, lines->0) from t_labor),0,'{"recipientSource":"manual"}'::jsonb)$$, '22023', null, 'the same rate cannot be applied twice to the same source item');
select * from finish();
rollback;
