begin;
select plan(20);

select has_function('public', 'save_flashing_material_calculation', 'flashing save RPC exists');
select has_index('public', 'calculations', 'calculations_one_flashing_estimate_per_project', 'project has one flashing calculation record');

set local role postgres;
grant tetopro_covering_writer to postgres;
grant usage on schema extensions to tetopro_covering_writer;
insert into public.projects (id, organization_id, name, project_type, status, created_by) values
  ('00000000-0000-4000-8000-000000000900', '00000000-0000-4000-8000-000000000010', 'DEMO szegély tesztprojekt', 'roof_renovation', 'draft', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000905', '00000000-0000-4000-8000-000000000010', 'DEMO másik projekt szegélyteszthez', 'roof_renovation', 'draft', '00000000-0000-4000-8000-000000000001');
insert into public.roof_models (id, organization_id, project_id, name, roof_type) values
  ('00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000900', 'DEMO ellenőrzött nyeregtető', 'gable'),
  ('00000000-0000-4000-8000-000000000906', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000905', 'DEMO idegen nyeregtető', 'gable');
insert into public.roof_model_revisions (id, organization_id, roof_model_id, revision_number, schema_version, input_data, validation_status, created_by) values
  ('00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000901', 1, '1.0.0', '{"DEMO":true}', 'verified', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000907', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000906', 1, '1.0.0', '{"DEMO":true}', 'verified', '00000000-0000-4000-8000-000000000001');
update public.roof_models set current_revision_id = '00000000-0000-4000-8000-000000000902' where id = '00000000-0000-4000-8000-000000000901';
update public.roof_models set current_revision_id = '00000000-0000-4000-8000-000000000907' where id = '00000000-0000-4000-8000-000000000906';
insert into public.calculations (id, organization_id, project_id, roof_model_id, calculator_type, display_name, status) values
  ('00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000900', '00000000-0000-4000-8000-000000000901', 'roof.gable', 'DEMO ellenőrzött geometria', 'current');
insert into public.calculation_revisions (id, organization_id, calculation_id, revision_number, input_schema_version, calculator_implementation_version, input_snapshot, output_snapshot, data_provenance, validation_status, warnings, created_by) values
  ('00000000-0000-4000-8000-000000000904', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000903', 1, '1.0.0', '1.0.0', '{"DEMO":true}', '{"lengths":{"eachEaveEdgeMm":1000,"ridgeLineMm":1000,"eachSlopingGableEdgeMm":1500.2}}', '{"test":"DEMO fixture"}', 'verified', '[]', '00000000-0000-4000-8000-000000000001');
update public.calculations set current_revision_id = '00000000-0000-4000-8000-000000000904' where id = '00000000-0000-4000-8000-000000000903';
insert into public.calculation_dependencies (organization_id, downstream_calculation_revision_id, upstream_roof_model_revision_id, dependency_type) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000904', '00000000-0000-4000-8000-000000000902', 'roof_geometry');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select ok(not has_function_privilege('authenticated','public.save_multi_roof_flashing_calculation(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,integer,uuid,uuid)','EXECUTE'), 'source-linked flashing writes are restricted to the server writer');
reset role;
set local role tetopro_covering_writer;
select lives_ok($$select * from public.save_multi_roof_flashing_calculation(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000900', 'DEMO szegély',
  '{"sectionSpec":{"nominalLengthMm":2000},"runs":[{"id":"edge-a","category":"verge","name":"DEMO orom","lengthMm":1501,"lengthSource":"geometry","roofEdgeReference":{"roofModelId":"00000000-0000-4000-8000-000000000901","roofModelRevisionId":"00000000-0000-4000-8000-000000000902","calculationId":"00000000-0000-4000-8000-000000000903","calculationRevisionId":"00000000-0000-4000-8000-000000000904","edgeId":"left-front-gable","outputField":"lengths.eachSlopingGableEdgeMm","suggestedLengthMm":1500.2,"lengthOverridden":false}}]}'::jsonb,
  '{"totals":{"estimatedSectionCount":1}}'::jsonb, '{"test":"DEMO server-calculated"}'::jsonb, '[]'::jsonb, 0,
  '00000000-0000-4000-8000-000000000909', '00000000-0000-4000-8000-000000000001'
)$$, 'restricted writer creates V1 with exact geometry and rounded-up original length');
reset role;
set local role authenticated;
select is((select count(*)::int from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id where c.project_id = '00000000-0000-4000-8000-000000000900' and c.calculator_type = 'sheet_metal.flashings.material-estimate'), 1, 'V1 revision persisted');
select is((select input_snapshot #>> '{runs,0,lengthMm}' from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id where c.project_id = '00000000-0000-4000-8000-000000000900' and c.calculator_type = 'sheet_metal.flashings.material-estimate'), '1501', 'whole-mm conservative input persisted');
select is((select count(*)::int from public.calculation_dependencies d join public.calculation_revisions cr on cr.id = d.downstream_calculation_revision_id join public.calculations c on c.id = cr.calculation_id where c.project_id = '00000000-0000-4000-8000-000000000900' and c.calculator_type = 'sheet_metal.flashings.material-estimate' and d.upstream_roof_model_revision_id = '00000000-0000-4000-8000-000000000902'), 1, 'exact roof revision dependency persisted');
select is((select count(*)::int from public.calculation_dependencies d join public.calculation_revisions cr on cr.id = d.downstream_calculation_revision_id join public.calculations c on c.id = cr.calculation_id where c.project_id = '00000000-0000-4000-8000-000000000900' and d.upstream_calculation_revision_id = '00000000-0000-4000-8000-000000000904'), 1, 'exact geometry calculation revision dependency persisted');
select lives_ok($$select * from public.save_flashing_material_calculation(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000900', 'DEMO szegély',
  '{"runs":[{"id":"manual","category":"wall","name":"DEMO fal","lengthMm":2000,"lengthSource":"site_measurement","roofEdgeReference":null}]}'::jsonb,
  '{"totals":{"estimatedSectionCount":2}}'::jsonb, '{"test":"DEMO"}'::jsonb, '[]'::jsonb, 1
)$$, 'expected V1 creates a new manual V2 revision');
select is((select count(*)::int from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id where c.project_id = '00000000-0000-4000-8000-000000000900' and c.calculator_type = 'sheet_metal.flashings.material-estimate'), 2, 'V1 and V2 are both retained');
select is((select input_snapshot #>> '{runs,0,lengthMm}' from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id where c.project_id = '00000000-0000-4000-8000-000000000900' and c.calculator_type = 'sheet_metal.flashings.material-estimate' and cr.revision_number = 1), '1501', 'V1 input remains unchanged');
select is((select output_snapshot #>> '{totals,estimatedSectionCount}' from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id where c.project_id = '00000000-0000-4000-8000-000000000900' and c.calculator_type = 'sheet_metal.flashings.material-estimate' and cr.revision_number = 1), '1', 'V1 output remains unchanged');
select throws_ok($$select * from public.save_flashing_material_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000900','stale','{"runs":[]}','{}','{}','[]',1)$$, '40001', null, 'stale expected revision is rejected');
reset role;
set local role tetopro_covering_writer;
select throws_ok($$select * from public.save_multi_roof_flashing_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000900','cross project',
  '{"sectionSpec":{"nominalLengthMm":2000},"runs":[{"id":"x","category":"eaves","lengthMm":1000,"lengthSource":"geometry","roofEdgeReference":{"roofModelId":"00000000-0000-4000-8000-000000000906","roofModelRevisionId":"00000000-0000-4000-8000-000000000907","calculationId":"00000000-0000-4000-8000-000000000903","calculationRevisionId":"00000000-0000-4000-8000-000000000904","edgeId":"left-eave","outputField":"lengths.eachEaveEdgeMm","suggestedLengthMm":1000,"lengthOverridden":false}}]}'::jsonb,
  '{"totals":{"estimatedSectionCount":1}}'::jsonb,'{}'::jsonb,'[]'::jsonb,2,'00000000-0000-4000-8000-000000000910','00000000-0000-4000-8000-000000000001')$$,
  'P0002',null,'cross-project roof model source is rejected by the restricted writer');
select throws_ok($$select * from public.save_multi_roof_flashing_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000900','invalid edge',
  '{"sectionSpec":{"nominalLengthMm":2000},"runs":[{"id":"x","category":"valley","lengthMm":1000,"lengthSource":"geometry","roofEdgeReference":{"roofModelId":"00000000-0000-4000-8000-000000000901","roofModelRevisionId":"00000000-0000-4000-8000-000000000902","calculationId":"00000000-0000-4000-8000-000000000903","calculationRevisionId":"00000000-0000-4000-8000-000000000904","edgeId":"valley","outputField":"lengths.valleyMm","suggestedLengthMm":1000,"lengthOverridden":false}}]}'::jsonb,
  '{"totals":{"estimatedSectionCount":1}}'::jsonb,'{}'::jsonb,'[]'::jsonb,2,'00000000-0000-4000-8000-000000000911','00000000-0000-4000-8000-000000000001')$$,
  '22023',null,'unsupported gable valley geometry is rejected by the restricted writer');
select throws_ok($$select * from public.save_multi_roof_flashing_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000900','forged source length',
  '{"sectionSpec":{"nominalLengthMm":2000},"runs":[{"id":"x","category":"verge","lengthMm":1499,"lengthSource":"geometry","roofEdgeReference":{"roofModelId":"00000000-0000-4000-8000-000000000901","roofModelRevisionId":"00000000-0000-4000-8000-000000000902","calculationId":"00000000-0000-4000-8000-000000000903","calculationRevisionId":"00000000-0000-4000-8000-000000000904","edgeId":"left-front-gable","outputField":"lengths.eachSlopingGableEdgeMm","suggestedLengthMm":1499,"lengthOverridden":false}}]}'::jsonb,
  '{"totals":{"estimatedSectionCount":1}}'::jsonb,'{}'::jsonb,'[]'::jsonb,2,'00000000-0000-4000-8000-000000000912','00000000-0000-4000-8000-000000000001')$$,
  '22023',null,'forged original source length is rejected by the restricted writer');
reset role;
set local role authenticated;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is_empty($$select 1 from public.calculations where project_id = '00000000-0000-4000-8000-000000000900' and calculator_type = 'sheet_metal.flashings.material-estimate'$$, 'non-member cannot read the flashing calculation');
select throws_ok($$select * from public.save_flashing_material_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000900','unauthorized','{"runs":[]}','{}','{}','[]',2)$$, '42501', null, 'non-member cannot save a flashing calculation');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
set local role postgres;
select throws_ok($$update public.calculation_revisions set input_snapshot = '{}' where calculation_id = (select id from public.calculations where project_id = '00000000-0000-4000-8000-000000000900' and calculator_type = 'sheet_metal.flashings.material-estimate') and revision_number = 1$$, 'P0001', null, 'flashing revisions cannot be updated');
select throws_ok($$delete from public.calculation_revisions where calculation_id = (select id from public.calculations where project_id = '00000000-0000-4000-8000-000000000900' and calculator_type = 'sheet_metal.flashings.material-estimate') and revision_number = 1$$, 'P0001', null, 'flashing revisions cannot be deleted');

select * from finish();
rollback;
