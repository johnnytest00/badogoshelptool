begin;
select plan(30);

select has_table('public', 'calculation_project_associations', 'association ledger exists');
select has_function('public', 'associate_standalone_calculation_to_project', 'authenticated association RPC exists');
select ok(not has_table_privilege('authenticated', 'public.calculation_project_associations', 'INSERT'), 'clients cannot write association ledger directly');

set local role postgres;
insert into public.organizations (id, name)
values ('00000000-0000-4000-8000-000000000011','DEMO standalone association foreign organization')
on conflict (id) do nothing;
insert into public.projects (id, organization_id, name, project_type, status, created_by) values
 ('00000000-0000-4000-8000-000000000920','00000000-0000-4000-8000-000000000010','DEMO standalone association target','roof_renovation','draft','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000921','00000000-0000-4000-8000-000000000010','DEMO second association target','roof_renovation','draft','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000922','00000000-0000-4000-8000-000000000011','DEMO foreign association target','roof_renovation','draft','00000000-0000-4000-8000-000000000001');
insert into public.organization_members (organization_id, user_id, role) values
 ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002','member');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select lives_ok($$select * from public.save_standalone_gutter_calculation(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000901','DEMO standalone gutter',
 '{"gutterStockLengthMm":3000,"runs":[{"id":"r1","name":"DEMO eresz","lengthMm":6500,"measurementSource":"user_provided","roofEdge":null,"bracketSpacingMm":null}],"downpipes":[],"manualComponents":[]}',
 '{"gutterRuns":[{"id":"r1","name":"DEMO eresz","lengthMm":6500,"stockSections":3,"remainderMm":500,"bracketEstimate":null,"bracketBasis":null}],"downpipeRuns":[],"componentQuantities":[{"category":"gutter_section","quantity":3,"source":"calculated","basis":"DEMO basis"}],"totals":{"gutterStockSections":3,"downpipeStockSections":0,"totalManualComponents":0},"assumptions":[],"warnings":[]}',0
)$$,'gutter source V1 fixture exists');
select lives_ok($$select * from public.save_standalone_gutter_calculation(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000901','DEMO standalone gutter',
 '{"gutterStockLengthMm":3000,"runs":[{"id":"r1","name":"DEMO eresz","lengthMm":7000,"measurementSource":"user_provided","roofEdge":null,"bracketSpacingMm":null}],"downpipes":[],"manualComponents":[]}',
 '{"gutterRuns":[{"id":"r1","name":"DEMO eresz","lengthMm":7000,"stockSections":3,"remainderMm":1000,"bracketEstimate":null,"bracketBasis":null}],"downpipeRuns":[],"componentQuantities":[{"category":"gutter_section","quantity":3,"source":"calculated","basis":"DEMO basis"}],"totals":{"gutterStockSections":3,"downpipeStockSections":0,"totalManualComponents":0},"assumptions":[],"warnings":[]}',1
)$$,'gutter source current V2 fixture exists');
select lives_ok($$select * from public.save_standalone_flashing_calculation(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000904','DEMO standalone flashing',
 '{"sectionSpec":{"nominalLengthMm":3000,"nominalLengthSource":{"kind":"user_provided","label":"DEMO manual"},"connection":{"mode":"unknown"}},"runs":[{"id":"s1","category":"custom","name":"DEMO szegély","lengthMm":1500,"lengthSource":"user_provided","roofEdgeReference":null,"startExtensionMm":0,"endExtensionMm":0,"reserveMm":0,"installationNotes":[]}],"manualComponents":[]}',
 '{"runs":[{"id":"s1","requiredCoverageLengthMm":1500,"reserveMm":0,"planningTargetLengthMm":1500,"nominalSectionLengthMm":3000,"estimatedSectionCount":null,"jointCount":null,"totalNominalStockLengthMm":null,"explicitOverlapConsumptionMm":null,"availableCoverageCapacityMm":null,"unallocatedCoverageCapacityMm":null,"status":"incomplete"}],"totals":{"runCount":1,"unresolvedRunCount":1,"estimatedSectionCount":null,"totalNominalStockLengthMm":null,"manualComponentQuantity":0},"warnings":[]}',0
)$$,'flashing source fixture exists');
select lives_ok($$select * from public.save_standalone_profile_calculation(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000906','DEMO hiányos L profil',
 '{"schemaVersion":"1.0.0","profileId":"00000000-0000-4000-8000-000000000906","profileType":"l","label":"DEMO hiányos L profil","coordinateConvention":"x-right-y-up","dimensionConvention":"finished_tangent","thicknessMm":1,"straights":[{"id":"s1","tangentLengthMm":50},{"id":"s2","tangentLengthMm":40}],"bends":[{"id":"b1","signedTurnDeg":90,"insideRadiusMm":2,"allowance":{"mode":"unknown"}}]}',
 '{"schemaVersion":"1.0.0","bends":[{"id":"b1","allowanceMm":null}],"flatPattern":{"widthMm":null}}',0
)$$,'profile source fixture exists');

select lives_ok($$select * from public.associate_standalone_calculation_to_project(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000920',
 '00000000-0000-4000-8000-000000000901',(select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000901'),
 '00000000-0000-4000-8000-000000000930','DEMO projekt eresz',0,null,
 (select input_snapshot from public.calculation_revisions where id=(select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000901')),
 (select output_snapshot from public.calculation_revisions where id=(select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000901'))
)$$, 'current owner snapshot creates a project revision');
select is((select source_revision_id from public.calculation_project_associations where operation_id='00000000-0000-4000-8000-000000000930'),
 (select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000901'), 'association records the exact source revision');
select is((select jsonb_build_object('sourceCalculationId',source_calculation_id,'sourceCreatorId',source_creator_id,'organizationId',organization_id,'calculatorType',calculator_type)
 from public.calculation_project_associations where operation_id='00000000-0000-4000-8000-000000000930'),
 '{"sourceCalculationId":"00000000-0000-4000-8000-000000000901","sourceCreatorId":"00000000-0000-4000-8000-000000000001","organizationId":"00000000-0000-4000-8000-000000000010","calculatorType":"gutters.material-estimate"}'::jsonb,
 'ledger retains source identity, creator, organization, and calculator type');
select is((select created_by from public.calculation_project_associations where operation_id='00000000-0000-4000-8000-000000000930'),
 '00000000-0000-4000-8000-000000000001'::uuid, 'authenticated requester is recorded');
select is((select source_revision_snapshot -> 'dataProvenance' from public.calculation_project_associations where operation_id='00000000-0000-4000-8000-000000000930'),
 (select data_provenance from public.calculation_revisions where id=(select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000901')), 'ledger retains immutable source parameter provenance');
select is((select data_provenance #>> '{association,sourceCreatorId}' from public.calculation_revisions where id=(select project_revision_id from public.calculation_project_associations where operation_id='00000000-0000-4000-8000-000000000930')),
 '00000000-0000-4000-8000-000000000001', 'project revision provenance retains source creator');
select is((select input_snapshot from public.calculation_revisions where id=(select project_revision_id from public.calculation_project_associations where operation_id='00000000-0000-4000-8000-000000000930')),
 (select input_snapshot from public.calculation_revisions where id=(select source_revision_id from public.calculation_project_associations where operation_id='00000000-0000-4000-8000-000000000930')), 'gutter inputs are copied exactly');
select is((select source_revision_snapshot -> 'output' from public.calculation_project_associations where operation_id='00000000-0000-4000-8000-000000000930'),
 (select output_snapshot from public.calculation_revisions where id=(select source_revision_id from public.calculation_project_associations where operation_id='00000000-0000-4000-8000-000000000930')), 'ledger retains the exact original result snapshot');
select is((select count(*)::int from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000901'),2,'source standalone history remains unchanged');
select is((select validation_status from public.calculation_revisions where id=(select project_revision_id from public.calculation_project_associations where operation_id='00000000-0000-4000-8000-000000000930')),
 'verified','target project RPC revalidates the source through its established contract');
set local role postgres;
select throws_ok($$update public.calculation_project_associations set source_creator_id='00000000-0000-4000-8000-000000000002' where operation_id='00000000-0000-4000-8000-000000000930'$$,
 'P0001',null,'association ledger cannot be changed even by a privileged database role');
select throws_ok($$delete from public.calculation_project_associations where operation_id='00000000-0000-4000-8000-000000000930'$$,
 'P0001',null,'association ledger cannot be deleted even by a privileged database role');
set local role authenticated;

select is((select reused from public.associate_standalone_calculation_to_project(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000920',
 '00000000-0000-4000-8000-000000000901',(select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000901'),
 '00000000-0000-4000-8000-000000000930','DEMO projekt eresz',0,null,
 (select input_snapshot from public.calculation_revisions where id=(select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000901')),
 (select output_snapshot from public.calculation_revisions where id=(select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000901')))),true,'same operation and payload reuses the exact target revision');
select is((select count(*)::int from public.calculation_project_associations where operation_id='00000000-0000-4000-8000-000000000930'),1,'idempotent replay does not duplicate ledger rows');
select throws_ok($$select * from public.associate_standalone_calculation_to_project(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000920',
 '00000000-0000-4000-8000-000000000901',(select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000901'),
 '00000000-0000-4000-8000-000000000930','Másik név',0,null,
 (select input_snapshot from public.calculation_revisions where id=(select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000901')),
 (select output_snapshot from public.calculation_revisions where id=(select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000901'))
)$$,'22023',null,'same operation with different payload is rejected');
select throws_ok($$select * from public.associate_standalone_calculation_to_project(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000921',
 '00000000-0000-4000-8000-000000000901',(select id from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000901' and revision_number=1),
 '00000000-0000-4000-8000-000000000931','DEMO historical source',0,null,'{}','{}')$$,'40001',null,'historical standalone revisions cannot become current project calculations');
select throws_ok($$select * from public.associate_standalone_calculation_to_project(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000922',
 '00000000-0000-4000-8000-000000000901',(select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000901'),
 '00000000-0000-4000-8000-000000000932','DEMO cross org',0,null,'{}','{}')$$,'42501',null,'cross-organization destination is rejected');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select throws_ok($$select * from public.associate_standalone_calculation_to_project(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000921',
 '00000000-0000-4000-8000-000000000901',(select source_revision_id from public.calculation_project_associations where operation_id='00000000-0000-4000-8000-000000000930'),
 '00000000-0000-4000-8000-000000000933','DEMO forged source',0,null,'{}','{}')$$,'42501',null,'same-organization noncreator cannot associate a private source');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

select lives_ok($$select * from public.associate_standalone_calculation_to_project(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000920',
 '00000000-0000-4000-8000-000000000904',(select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000904'),
 '00000000-0000-4000-8000-000000000934','DEMO project flashing',0,null,
 (select input_snapshot from public.calculation_revisions where id=(select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000904')),
 (select output_snapshot from public.calculation_revisions where id=(select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000904'))
)$$,'flashing source reuses the project flashing RPC');
select is((select source_revision_id from public.calculation_project_associations where operation_id='00000000-0000-4000-8000-000000000934'),
 (select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000904'),'flashing provenance is exact');

select lives_ok($$select * from public.associate_standalone_calculation_to_project(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000920',
 '00000000-0000-4000-8000-000000000906',(select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000906'),
 '00000000-0000-4000-8000-000000000935','DEMO hiányos L profil',0,'00000000-0000-4000-8000-000000000936',
 (select jsonb_set(input_snapshot,'{profileId}','"00000000-0000-4000-8000-000000000936"') from public.calculation_revisions where id=(select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000906')),
 (select output_snapshot from public.calculation_revisions where id=(select current_revision_id from public.calculations where id='00000000-0000-4000-8000-000000000906'))
)$$,'profile source is copied through the project profile RPC with only project identity reassigned');
select is((select input_snapshot #>> '{profileId}' from public.calculation_revisions where id=(select project_revision_id from public.calculation_project_associations where operation_id='00000000-0000-4000-8000-000000000935')),
 '00000000-0000-4000-8000-000000000936','target profile receives a new project identity');
select is((select input_snapshot #>> '{profileId}' from public.calculation_revisions where id=(select source_revision_id from public.calculation_project_associations where operation_id='00000000-0000-4000-8000-000000000935')),
 '00000000-0000-4000-8000-000000000906','source profile identity remains immutable');

select * from finish();
rollback;
