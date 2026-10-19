begin;
select plan(29);
\ir _demo_workflow_fixture.inc

select has_function('public', 'save_standalone_gutter_calculation', 'standalone gutter save RPC exists');
select has_function('public', 'save_standalone_flashing_calculation', 'standalone flashing save RPC exists');
select has_function('public', 'save_standalone_profile_calculation', 'standalone profile save RPC exists');
select has_column('public', 'calculations', 'ownership_scope', 'calculation scope is explicit');
select has_column('public', 'calculations', 'created_by', 'standalone creator is recorded');

set local role postgres;
insert into public.organization_members (organization_id, user_id, role)
values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002', 'member');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select lives_ok($$select * from public.save_standalone_gutter_calculation(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000901', 'DEMO önálló eresz',
  '{"gutterStockLengthMm":3000,"runs":[{"id":"r1","name":"DEMO eresz","lengthMm":6500,"measurementSource":"demo","roofEdge":null,"bracketSpacingMm":null}],"downpipes":[],"manualComponents":[]}',
  '{"gutterRuns":[{"id":"r1","name":"DEMO eresz","lengthMm":6500,"stockSections":3,"remainderMm":500,"bracketEstimate":null,"bracketBasis":null}],"downpipeRuns":[],"componentQuantities":[{"category":"gutter_section","quantity":3,"source":"calculated","basis":"Független ereszszakaszonként ceil(hossz / kereskedelmi szálhossz)."}],"totals":{"gutterStockSections":3,"downpipeStockSections":0,"totalManualComponents":0},"assumptions":[],"warnings":[]}', 0
)$$, 'creator can persist a standalone gutter revision without a project');
select is((select ownership_scope from public.calculations where id = '00000000-0000-4000-8000-000000000901'), 'standalone', 'parent is explicitly standalone');
select is((select project_id from public.calculations where id = '00000000-0000-4000-8000-000000000901'), null::uuid, 'standalone calculation has no project');
select is((select created_by from public.calculations where id = '00000000-0000-4000-8000-000000000901'), '00000000-0000-4000-8000-000000000001'::uuid, 'creator derives from authenticated identity');
select is((select input_snapshot #>> '{runs,0,lengthMm}' from public.calculation_revisions where calculation_id = '00000000-0000-4000-8000-000000000901'), '6500', 'exact normalized input snapshot is preserved');
select lives_ok($$select * from public.save_standalone_gutter_calculation(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000901', 'DEMO önálló eresz',
  '{"gutterStockLengthMm":3000,"runs":[{"id":"r1","name":"DEMO eresz","lengthMm":7000,"measurementSource":"demo","roofEdge":null,"bracketSpacingMm":null}],"downpipes":[],"manualComponents":[]}',
  '{"gutterRuns":[{"id":"r1","name":"DEMO eresz","lengthMm":7000,"stockSections":3,"remainderMm":1000,"bracketEstimate":null,"bracketBasis":null}],"downpipeRuns":[],"componentQuantities":[{"category":"gutter_section","quantity":3,"source":"calculated","basis":"Független ereszszakaszonként ceil(hossz / kereskedelmi szálhossz)."}],"totals":{"gutterStockSections":3,"downpipeStockSections":0,"totalManualComponents":0},"assumptions":[],"warnings":[]}', 1
)$$, 'expected V1 creates V2');
select is((select count(*)::int from public.calculation_revisions where calculation_id = '00000000-0000-4000-8000-000000000901'), 2, 'immutable V1 and V2 revisions exist');
select is((select input_snapshot #>> '{runs,0,lengthMm}' from public.calculation_revisions where calculation_id = '00000000-0000-4000-8000-000000000901' and revision_number = 1), '6500', 'V1 snapshot is unchanged after V2');
select throws_ok($$select * from public.save_standalone_gutter_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000901','stale','{"gutterStockLengthMm":3000,"runs":[{"id":"r1","name":"e","lengthMm":1,"measurementSource":"user_provided","roofEdge":null,"bracketSpacingMm":null}],"downpipes":[],"manualComponents":[]}','{"gutterRuns":[{"id":"r1","name":"e","lengthMm":1,"stockSections":1,"remainderMm":1,"bracketEstimate":null,"bracketBasis":null}],"downpipeRuns":[],"componentQuantities":[{"category":"gutter_section","quantity":1,"source":"calculated","basis":"x"}],"totals":{"gutterStockSections":1,"downpipeStockSections":0,"totalManualComponents":0}}',1)$$, '40001', null, 'stale expected revision is rejected');
select throws_ok($$select * from public.save_standalone_gutter_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000902','roof source','{"gutterStockLengthMm":3000,"runs":[{"id":"r1","name":"e","lengthMm":1,"measurementSource":"user_provided","roofEdge":{"revisionId":"00000000-0000-4000-8000-000000000041","edgeId":"e"}}],"downpipes":[],"manualComponents":[]}','{}',0)$$, '22023', null, 'project geometry references are rejected in standalone input');
select throws_ok($$select * from public.save_standalone_gutter_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000903','forged output','{"gutterStockLengthMm":3000,"runs":[{"id":"r1","name":"e","lengthMm":6500,"measurementSource":"user_provided","roofEdge":null}],"downpipes":[],"manualComponents":[]}','{"gutterRuns":[{"id":"r1","stockSections":1,"remainderMm":500,"bracketEstimate":null}],"downpipeRuns":[],"totals":{"gutterStockSections":1,"downpipeStockSections":0,"totalManualComponents":0}}',0)$$, '22023', null, 'client-supplied result that differs from input is rejected');

select lives_ok($$select * from public.save_standalone_flashing_calculation(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000904', 'DEMO hiányos szegély',
  '{"sectionSpec":{"nominalLengthMm":3000,"nominalLengthSource":{"kind":"user_provided","label":"Kézi"},"connection":{"mode":"unknown"}},"runs":[{"id":"s1","category":"custom","name":"Kézi szegély","lengthMm":1500,"lengthSource":"user_provided","roofEdgeReference":null,"startExtensionMm":0,"endExtensionMm":0,"reserveMm":0,"installationNotes":[]}],"manualComponents":[]}',
  '{"runs":[{"id":"s1","requiredCoverageLengthMm":1500,"reserveMm":0,"planningTargetLengthMm":1500,"nominalSectionLengthMm":3000,"estimatedSectionCount":null,"jointCount":null,"totalNominalStockLengthMm":null,"explicitOverlapConsumptionMm":null,"availableCoverageCapacityMm":null,"unallocatedCoverageCapacityMm":null,"status":"incomplete"}],"totals":{"runCount":1,"unresolvedRunCount":1,"estimatedSectionCount":null,"totalNominalStockLengthMm":null,"manualComponentQuantity":0},"warnings":[]}', 0
)$$, 'unknown flashing connection persists with incomplete output');
select is((select output_snapshot #>> '{runs,0,estimatedSectionCount}' from public.calculation_revisions where calculation_id = '00000000-0000-4000-8000-000000000904'), null, 'unknown connection does not invent a piece count');
select throws_ok($$select * from public.save_standalone_flashing_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000905','roof source','{"sectionSpec":{"nominalLengthMm":3000,"nominalLengthSource":{"kind":"user_provided","label":"Kézi"},"connection":{"mode":"unknown"}},"runs":[{"id":"s1","category":"custom","name":"Kézi","lengthMm":1500,"lengthSource":"geometry","roofEdgeReference":{"roofModelId":"00000000-0000-4000-8000-000000000030","roofModelRevisionId":"00000000-0000-4000-8000-000000000041","calculationId":"00000000-0000-4000-8000-000000000050","calculationRevisionId":"00000000-0000-4000-8000-000000000051","edgeId":"ridge","outputField":"x","suggestedLengthMm":1500,"lengthOverridden":false},"startExtensionMm":0,"endExtensionMm":0,"reserveMm":0,"installationNotes":[]}],"manualComponents":[]}','{}',0)$$, '22023', null, 'roof geometry cannot enter a standalone flashing input');

select lives_ok($$select * from public.save_standalone_profile_calculation(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000906', 'DEMO hiányos L profil',
  '{"schemaVersion":"1.0.0","profileId":"00000000-0000-4000-8000-000000000906","profileType":"l","label":"DEMO hiányos L profil","coordinateConvention":"x-right-y-up","dimensionConvention":"finished_tangent","thicknessMm":1,"straights":[{"id":"s1","tangentLengthMm":50},{"id":"s2","tangentLengthMm":40}],"bends":[{"id":"b1","signedTurnDeg":90,"insideRadiusMm":2,"allowance":{"mode":"unknown"}}]}',
  '{"schemaVersion":"1.0.0","bends":[{"id":"b1","allowanceMm":null}],"flatPattern":{"widthMm":null}}', 0
)$$, 'profile without BA/K persists as incomplete');
select is((select output_snapshot #>> '{flatPattern,widthMm}' from public.calculation_revisions where calculation_id = '00000000-0000-4000-8000-000000000906'), null, 'profile width remains null without BA/K');
select throws_ok($$select * from public.save_standalone_profile_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000907','forged width','{"schemaVersion":"1.0.0","profileId":"00000000-0000-4000-8000-000000000907","profileType":"l","label":"forged width","coordinateConvention":"x-right-y-up","dimensionConvention":"finished_tangent","thicknessMm":1,"straights":[{"id":"s1","tangentLengthMm":50},{"id":"s2","tangentLengthMm":40}],"bends":[{"id":"b1","signedTurnDeg":90,"insideRadiusMm":2,"allowance":{"mode":"unknown"}}]}','{"schemaVersion":"1.0.0","bends":[{"id":"b1","allowanceMm":null}],"flatPattern":{"widthMm":90}}',0)$$, '22023', null, 'profile output cannot invent a width without bend data');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is((select count(*)::int from public.calculations where id = '00000000-0000-4000-8000-000000000901'), 0, 'same-organization noncreator cannot list or read standalone parent');
select is((select count(*)::int from public.calculation_revisions where calculation_id = '00000000-0000-4000-8000-000000000901'), 0, 'same-organization noncreator cannot read revision history');
select throws_ok($$select * from public.save_standalone_gutter_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000901','forged id','{"gutterStockLengthMm":3000,"runs":[{"id":"r1","name":"e","lengthMm":6500,"measurementSource":"user_provided","roofEdge":null,"bracketSpacingMm":null}],"downpipes":[],"manualComponents":[]}','{"gutterRuns":[{"id":"r1","name":"e","lengthMm":6500,"stockSections":3,"remainderMm":500,"bracketEstimate":null,"bracketBasis":null}],"downpipeRuns":[],"componentQuantities":[{"category":"gutter_section","quantity":3,"source":"calculated","basis":"x"}],"totals":{"gutterStockSections":3,"downpipeStockSections":0,"totalManualComponents":0}}',2)$$, '42501', null, 'same-organization noncreator cannot forge a calculation id');
select throws_ok($$insert into public.calculations (id,organization_id,project_id,ownership_scope,created_by,calculator_type,display_name) values ('00000000-0000-4000-8000-000000000908','00000000-0000-4000-8000-000000000010',null,'standalone','00000000-0000-4000-8000-000000000002','gutters.material-estimate','direct insert')$$, '42501', null, 'standalone parent creation is RPC-only');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select throws_ok($$select * from public.save_standalone_gutter_calculation('00000000-0000-4000-8000-000000000026','00000000-0000-4000-8000-000000000909','forged org','{"gutterStockLengthMm":3000,"runs":[{"id":"r1","name":"e","lengthMm":6500,"measurementSource":"user_provided","roofEdge":null,"bracketSpacingMm":null}],"downpipes":[],"manualComponents":[]}','{"gutterRuns":[{"id":"r1","name":"e","lengthMm":6500,"stockSections":3,"remainderMm":500,"bracketEstimate":null,"bracketBasis":null}],"downpipeRuns":[],"componentQuantities":[{"category":"gutter_section","quantity":3,"source":"calculated","basis":"x"}],"totals":{"gutterStockSections":3,"downpipeStockSections":0,"totalManualComponents":0}}',0)$$, '42501', null, 'forged organization ID is rejected');
set local role postgres;
select throws_ok($$update public.calculation_revisions set input_snapshot = '{}' where calculation_id = '00000000-0000-4000-8000-000000000901' and revision_number = 1$$, 'P0001', null, 'standalone history is immutable');
select throws_ok($$delete from public.calculation_revisions where calculation_id = '00000000-0000-4000-8000-000000000901' and revision_number = 1$$, 'P0001', null, 'standalone history cannot be deleted');

select * from finish();
rollback;
