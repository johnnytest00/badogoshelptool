begin;
select plan(21);

select has_function('public', 'save_gutter_material_calculation', 'gutter calculation save RPC exists');
select has_index('public', 'calculations', 'calculations_one_gutter_estimate_per_project', 'one project has one gutter calculation record');

set local role postgres;
insert into public.projects (id, organization_id, name, project_type, status, created_by)
values ('00000000-0000-4000-8000-000000000990', '00000000-0000-4000-8000-000000000010', 'DEMO másik projekt gutter teszthez', 'gutter_work', 'draft', '00000000-0000-4000-8000-000000000001');
insert into public.roof_models (id, organization_id, project_id, name, roof_type)
values ('00000000-0000-4000-8000-000000000991', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000990', 'DEMO másik tető', 'gable');
insert into public.roof_model_revisions (id, organization_id, roof_model_id, revision_number, schema_version, input_data, validation_status, created_by)
values ('00000000-0000-4000-8000-000000000992', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000991', 1, '1.0.0', '{"data_origin":"demo"}', 'demo', '00000000-0000-4000-8000-000000000001');
insert into public.organizations (id, name)
values ('00000000-0000-4000-8000-000000000011', 'DEMO másik szervezet — gutter authorization');
insert into public.organization_members (organization_id, user_id, role)
values ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000002', 'owner');
select is((select count(*)::int from public.organization_members where organization_id = '00000000-0000-4000-8000-000000000011' and user_id = '00000000-0000-4000-8000-000000000002'), 1, 'negative authorization identity is a member of a separate organization');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select lives_ok($$select * from public.save_gutter_material_calculation(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030',
  'DEMO ereszbecslés', '{"gutterStockLengthMm":4000,"runs":[{"id":"front","name":"Első","lengthMm":8500,"measurementSource":"demo","roofEdge":{"revisionId":"00000000-0000-4000-8000-000000000041","edgeId":"left-eave"}},{"id":"rear","name":"Hátsó","lengthMm":8000,"measurementSource":"demo","roofEdge":{"revisionId":"00000000-0000-4000-8000-000000000041","edgeId":"right-eave"}}],"downpipes":[{"id":"down-1","name":"Bal lefolyó","lengthMm":5100,"commercialLengthMm":3000,"selectedBends":2,"relatedAccessories":[]}],"manualComponents":[{"id":"caps","category":"end_cap","quantity":2,"note":"DEMO kézi adat"}]}',
  '{"totals":{"gutterStockSections":5,"downpipeStockSections":2}}',
  '{"input":"demo","output":"server_calculation"}', '[]', '00000000-0000-4000-8000-000000000041', 0
)$$, 'authorized member creates V1 with full input and source');
select is((select count(*)::int from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id where c.organization_id = '00000000-0000-4000-8000-000000000010' and c.project_id = '00000000-0000-4000-8000-000000000030' and c.calculator_type = 'gutters.material-estimate'), 1, 'V1 revision persisted');
select is((select input_snapshot #>> '{runs,1,lengthMm}' from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id where c.project_id = '00000000-0000-4000-8000-000000000030' and c.calculator_type = 'gutters.material-estimate'), '8000', 'second gutter run persisted');
select is((select input_snapshot #>> '{downpipes,0,commercialLengthMm}' from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id where c.project_id = '00000000-0000-4000-8000-000000000030' and c.calculator_type = 'gutters.material-estimate'), '3000', 'downpipe stock length persisted');
select is((select input_snapshot #>> '{manualComponents,0,quantity}' from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id where c.project_id = '00000000-0000-4000-8000-000000000030' and c.calculator_type = 'gutters.material-estimate'), '2', 'manual accessory quantity persisted');
select is((select count(*)::int from public.calculation_dependencies d join public.calculation_revisions cr on cr.id = d.downstream_calculation_revision_id join public.calculations c on c.id = cr.calculation_id where c.project_id = '00000000-0000-4000-8000-000000000030' and c.calculator_type = 'gutters.material-estimate' and d.upstream_roof_model_revision_id = '00000000-0000-4000-8000-000000000041'), 1, 'source geometry revision is linked once');
select lives_ok($$select * from public.save_gutter_material_calculation(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030',
  'DEMO ereszbecslés', '{"gutterStockLengthMm":4000,"runs":[{"id":"front","name":"Első","lengthMm":9000,"measurementSource":"demo","roofEdge":{"revisionId":"00000000-0000-4000-8000-000000000041","edgeId":"left-eave"}}],"downpipes":[],"manualComponents":[]}',
  '{"totals":{"gutterStockSections":3}}', '{"input":"demo"}', '[]',
  '00000000-0000-4000-8000-000000000041', 1
)$$, 'expected V1 creates a new V2 revision');
select is((select count(*)::int from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id where c.project_id = '00000000-0000-4000-8000-000000000030' and c.calculator_type = 'gutters.material-estimate'), 2, 'V1 and V2 both remain');
select is((select input_snapshot #>> '{runs,0,lengthMm}' from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id where c.project_id = '00000000-0000-4000-8000-000000000030' and c.calculator_type = 'gutters.material-estimate' and cr.revision_number = 1), '8500', 'V1 input remains immutable after V2');
select is((select output_snapshot #>> '{totals,gutterStockSections}' from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id where c.project_id = '00000000-0000-4000-8000-000000000030' and c.calculator_type = 'gutters.material-estimate' and cr.revision_number = 1), '5', 'V1 output remains immutable after V2');
select throws_ok($$select * from public.save_gutter_material_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030','stale','{"runs":[{"id":"a"}]}','{}','{}','[]',null,1)$$, '40001', null, 'stale expected revision is rejected');
select throws_ok($$select * from public.save_gutter_material_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030','cross project','{"runs":[{"id":"a","roofEdge":{"revisionId":"00000000-0000-4000-8000-000000000992","edgeId":"e"}}]}','{}','{}','[]',null,2)$$, 'P0002', null, 'embedded geometry from another project is rejected');
select throws_ok($$select * from public.save_gutter_material_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030','cross project','{"runs":[{"id":"a"}]}','{}','{}','[]','00000000-0000-4000-8000-000000000992',2)$$, 'P0002', null, 'explicit source from another project is rejected');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is_empty($$select 1 from public.calculations where project_id = '00000000-0000-4000-8000-000000000030' and calculator_type = 'gutters.material-estimate'$$, 'non-member cannot read the project calculation');
select throws_ok($$select * from public.save_gutter_material_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030','unauthorized','{"runs":[{"id":"a"}]}','{}','{}','[]',null,2)$$, '42501', null, 'non-member cannot write a project calculation');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
set local role postgres;
select throws_ok($$update public.calculation_revisions set input_snapshot = '{}' where calculation_id = (select id from public.calculations where project_id = '00000000-0000-4000-8000-000000000030' and calculator_type = 'gutters.material-estimate') and revision_number = 1$$, 'P0001', null, 'gutter revisions cannot be updated');
select throws_ok($$delete from public.calculation_revisions where calculation_id = (select id from public.calculations where project_id = '00000000-0000-4000-8000-000000000030' and calculator_type = 'gutters.material-estimate') and revision_number = 1$$, 'P0001', null, 'gutter revisions cannot be deleted');
select is((select count(*)::int from public.calculation_dependencies d join public.calculation_revisions cr on cr.id = d.downstream_calculation_revision_id join public.calculations c on c.id = cr.calculation_id where c.project_id = '00000000-0000-4000-8000-000000000030' and c.calculator_type = 'gutters.material-estimate' and cr.revision_number = 2 and d.upstream_roof_model_revision_id = '00000000-0000-4000-8000-000000000041'), 1, 'V2 source dependency is attached to V2');

select * from finish();
rollback;

