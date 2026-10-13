begin;
select plan(19);

select has_function('public', 'save_sheet_metal_profile_calculation', 'profile save RPC exists');
set local role postgres;
insert into public.organizations (id, name) values ('00000000-0000-4000-8000-000000000026', 'DEMO másik műhely profil teszthez');
insert into public.projects (id, organization_id, name, project_type, status, created_by) values
  ('00000000-0000-4000-8000-000000000920', '00000000-0000-4000-8000-000000000010', 'DEMO profil persistence teszt', 'roof_renovation', 'draft', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000921', '00000000-0000-4000-8000-000000000026', 'DEMO idegen műhely profil teszt', 'roof_renovation', 'draft', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000926', '00000000-0000-4000-8000-000000000010', 'DEMO másik projekt profil teszthez', 'roof_renovation', 'draft', '00000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select lives_ok($$select * from public.save_sheet_metal_profile_calculation(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000920', '00000000-0000-4000-8000-000000000922', 'DEMO L profil',
  '{"schemaVersion":"1.0.0","profileId":"00000000-0000-4000-8000-000000000922","profileType":"l","label":"DEMO L profil","coordinateConvention":"x-right-y-up","dimensionConvention":"finished_tangent","thicknessMm":1,"straights":[{"id":"s1","tangentLengthMm":60},{"id":"s2","tangentLengthMm":40}],"bends":[{"id":"b1","signedTurnDeg":90,"insideRadiusMm":2,"allowance":{"mode":"k_factor","kFactor":0.4}}]}'::jsonb, 0
)$$, 'authenticated project member saves V1 from inputs');
select is((select count(*)::int from public.calculations where id = '00000000-0000-4000-8000-000000000922' and project_id = '00000000-0000-4000-8000-000000000920' and calculator_type = 'sheet_metal.profiles.flat-pattern'), 1, 'profile is stored in shared calculation registry');
select is((select revision_number from public.calculation_revisions where calculation_id = '00000000-0000-4000-8000-000000000922'), 1, 'first immutable revision is V1');
select is(abs((select (output_snapshot #>> '{flatPattern,widthMm}')::numeric from public.calculation_revisions where calculation_id = '00000000-0000-4000-8000-000000000922' and revision_number = 1) - 103.76991118430775::numeric) < 0.000000001, true, 'persisted result was calculated by database from V1 input');
select lives_ok($$select * from public.save_sheet_metal_profile_calculation(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000920', '00000000-0000-4000-8000-000000000922', 'DEMO L profil',
  '{"schemaVersion":"1.0.0","profileId":"00000000-0000-4000-8000-000000000922","profileType":"l","label":"DEMO L profil","coordinateConvention":"x-right-y-up","dimensionConvention":"finished_tangent","thicknessMm":1,"straights":[{"id":"s1","tangentLengthMm":75},{"id":"s2","tangentLengthMm":40}],"bends":[{"id":"b1","signedTurnDeg":90,"insideRadiusMm":2,"allowance":{"mode":"k_factor","kFactor":0.4}}]}'::jsonb, 1
)$$, 'expected V1 creates V2');
select is((select count(*)::int from public.calculation_revisions where calculation_id = '00000000-0000-4000-8000-000000000922'), 2, 'V1 and V2 are retained');
select is((select input_snapshot #>> '{straights,0,tangentLengthMm}' from public.calculation_revisions where calculation_id = '00000000-0000-4000-8000-000000000922' and revision_number = 1), '60', 'V1 input remains unchanged');
select throws_ok($$select * from public.save_sheet_metal_profile_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000920','00000000-0000-4000-8000-000000000922','stale','{"schemaVersion":"1.0.0","profileId":"00000000-0000-4000-8000-000000000922","profileType":"l","label":"stale","coordinateConvention":"x-right-y-up","dimensionConvention":"finished_tangent","thicknessMm":1,"straights":[{"id":"s1","tangentLengthMm":75},{"id":"s2","tangentLengthMm":40}],"bends":[{"id":"b1","signedTurnDeg":90,"insideRadiusMm":2,"allowance":{"mode":"unknown"}}]}',1)$$, '40001', null, 'stale expected revision is rejected');
select throws_ok($$select * from public.save_sheet_metal_profile_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000920','00000000-0000-4000-8000-000000000922','bad convention','{"schemaVersion":"1.0.0","profileId":"00000000-0000-4000-8000-000000000922","profileType":"l","label":"bad convention","coordinateConvention":"x-right-y-up","dimensionConvention":"outside_virtual_sharp","thicknessMm":1,"straights":[{"id":"s1","tangentLengthMm":75},{"id":"s2","tangentLengthMm":40}],"bends":[]}',2)$$, '22023', null, 'unsupported measurement convention is rejected');
select throws_ok($$select * from public.save_sheet_metal_profile_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000926','00000000-0000-4000-8000-000000000922','cross project','{"schemaVersion":"1.0.0","profileId":"00000000-0000-4000-8000-000000000922","profileType":"l","label":"cross project","coordinateConvention":"x-right-y-up","dimensionConvention":"finished_tangent","thicknessMm":1,"straights":[{"id":"s1","tangentLengthMm":75}],"bends":[]}',2)$$, '42501', null, 'calculation owned by another project is rejected');
select lives_ok($$select * from public.save_sheet_metal_profile_calculation(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000920', '00000000-0000-4000-8000-000000000923', 'DEMO hiányos BA K',
  '{"schemaVersion":"1.0.0","profileId":"00000000-0000-4000-8000-000000000923","profileType":"l","label":"DEMO hiányos BA K","coordinateConvention":"x-right-y-up","dimensionConvention":"finished_tangent","thicknessMm":1,"straights":[{"id":"s1","tangentLengthMm":60},{"id":"s2","tangentLengthMm":40}],"bends":[{"id":"b1","signedTurnDeg":90,"insideRadiusMm":2,"allowance":{"mode":"unknown"}}]}'::jsonb, 0
)$$, 'profile without BA/K is saved with authoritative incomplete output');
select is((select output_snapshot #>> '{flatPattern,widthMm}' from public.calculation_revisions where calculation_id = '00000000-0000-4000-8000-000000000923'), null, 'incomplete flat width remains null');
select throws_ok($$select * from public.save_sheet_metal_profile_calculation('00000000-0000-4000-8000-000000000026','00000000-0000-4000-8000-000000000921','00000000-0000-4000-8000-000000000924','cross org','{"schemaVersion":"1.0.0","profileId":"00000000-0000-4000-8000-000000000924","profileType":"l","label":"cross org","coordinateConvention":"x-right-y-up","dimensionConvention":"finished_tangent","thicknessMm":1,"straights":[{"id":"s1","tangentLengthMm":1}],"bends":[]}',0)$$, '42501', null, 'cross-organization user cannot create profile');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is_empty($$select 1 from public.calculations where id = '00000000-0000-4000-8000-000000000922'$$, 'non-member cannot read profile calculation');
select is_empty($$select 1 from public.calculation_revisions where calculation_id = '00000000-0000-4000-8000-000000000922'$$, 'non-member cannot read profile revisions');
select throws_ok($$select * from public.save_sheet_metal_profile_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000920','00000000-0000-4000-8000-000000000925','unauthorized','{}',0)$$, '42501', null, 'non-member cannot save profile');
set local role postgres;
select throws_ok($$update public.calculation_revisions set input_snapshot = '{}' where calculation_id = '00000000-0000-4000-8000-000000000922' and revision_number = 1$$, 'P0001', null, 'profile revision is immutable');
select throws_ok($$delete from public.calculation_revisions where calculation_id = '00000000-0000-4000-8000-000000000922' and revision_number = 1$$, 'P0001', null, 'profile revision cannot be deleted');
select * from finish();
rollback;
