begin;
select plan(21);
set local role postgres;
insert into public.organizations (id, name) values ('00000000-0000-4000-8000-000000000036', 'DEMO idegen műhely F9.6.3.4.1');
insert into public.projects (id, organization_id, name, project_type, status, created_by)
values ('00000000-0000-4000-8000-000000000930', '00000000-0000-4000-8000-000000000010', 'DEMO profilanyag teszt', 'roof_renovation', 'draft', '00000000-0000-4000-8000-000000000001');
insert into public.material_products (id, organization_id, category, name, status) values
 ('00000000-0000-4000-8000-000000000931', '00000000-0000-4000-8000-000000000010', 'sheet_metal', 'DEMO lemez', 'active'),
 ('00000000-0000-4000-8000-000000000932', '00000000-0000-4000-8000-000000000036', 'sheet_metal', 'DEMO idegen lemez', 'active');
insert into public.material_variants (id, organization_id, product_id, name, purchasing_unit, thickness_mm, technical_specs, source_name) values
 ('00000000-0000-4000-8000-000000000933', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000931', 'DEMO egyező', 'square_meter', 1, '{"profileMaterialSpec":"DEMO-A"}', 'DEMO felhasználói adat'),
 ('00000000-0000-4000-8000-000000000934', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000931', 'DEMO egységeltérés', 'piece', 1, '{"profileMaterialSpec":"DEMO-A"}', 'DEMO felhasználói adat'),
 ('00000000-0000-4000-8000-000000000935', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000931', 'DEMO hiányzó azonosság', 'square_meter', 1, '{}', 'DEMO felhasználói adat'),
 ('00000000-0000-4000-8000-000000000936', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000931', 'DEMO vastagságeltérés', 'square_meter', 0.5, '{"profileMaterialSpec":"DEMO-A"}', 'DEMO felhasználói adat'),
 ('00000000-0000-4000-8000-000000000937', '00000000-0000-4000-8000-000000000036', '00000000-0000-4000-8000-000000000932', 'DEMO idegen', 'square_meter', 1, '{"profileMaterialSpec":"DEMO-A"}', 'DEMO felhasználói adat');
update public.material_variants set source_url = 'https://example.test/demo', source_date = '2026-10-13'
where id = '00000000-0000-4000-8000-000000000933';
create temp table profile_quantity_fixture(input jsonb);
insert into profile_quantity_fixture values ('{"schemaVersion":"1.0.0","profileId":"00000000-0000-4000-8000-000000000938","profileType":"l","label":"DEMO terület","coordinateConvention":"x-right-y-up","dimensionConvention":"finished_tangent","thicknessMm":1,"straights":[{"id":"s1","tangentLengthMm":60},{"id":"s2","tangentLengthMm":40}],"bends":[{"id":"b1","signedTurnDeg":90,"insideRadiusMm":2,"allowance":{"mode":"explicit_ba","baMm":3}}],"formedRunLengthMm":2000,"pieceCount":3,"material":{"catalogVariantId":"00000000-0000-4000-8000-000000000933","materialSpec":"DEMO-A","provenance":{"kind":"catalog_snapshot","label":"DEMO"}}}');
grant select on profile_quantity_fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select lives_ok(format('select * from public.save_sheet_metal_profile_calculation(%L,%L,%L,%L,%L::jsonb,0)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000930','00000000-0000-4000-8000-000000000938','DEMO terület',(select input::text from profile_quantity_fixture)), 'valid catalog and quantities save V1');
select is((select (output_snapshot #>> '{materialRequirement,netBlankAreaPerPieceSqM}')::numeric from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000938' and revision_number=1), 0.206::numeric, 'per-piece area uses authoritative 103 mm width');
select is((select (output_snapshot #>> '{materialRequirement,totalNetBlankAreaSqM}')::numeric from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000938' and revision_number=1), 0.618::numeric, 'three pieces total 0.618 m²');
select is((select input_snapshot #>> '{material,catalogSnapshot,variantId}' from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000938' and revision_number=1), '00000000-0000-4000-8000-000000000933', 'catalog identity is snapshotted by database');
select is((select input_snapshot #>> '{material,catalogSnapshot,sourceName}' from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000938' and revision_number=1), 'DEMO felhasználói adat', 'source is snapshotted');
select is((select input_snapshot #>> '{material,catalogSnapshot,sourceUrl}' from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000938' and revision_number=1), 'https://example.test/demo', 'source URL is snapshotted');
select is((select input_snapshot #>> '{material,catalogSnapshot,sourceDate}' from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000938' and revision_number=1), '2026-10-13', 'source date is snapshotted');
select lives_ok(format('select * from public.save_sheet_metal_profile_calculation(%L,%L,%L,%L,%L::jsonb,1)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000930','00000000-0000-4000-8000-000000000938','DEMO terület',(select jsonb_set(input,'{pieceCount}','4')::text from profile_quantity_fixture)), 'changed piece count saves V2');
select is((select (output_snapshot #>> '{materialRequirement,totalNetBlankAreaSqM}')::numeric from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000938' and revision_number=2), 0.824::numeric, 'V2 total reflects four pieces');
select is((select (output_snapshot #>> '{materialRequirement,totalNetBlankAreaSqM}')::numeric from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000938' and revision_number=1), 0.618::numeric, 'V1 result remains immutable');
select throws_ok(format('select * from public.save_sheet_metal_profile_calculation(%L,%L,%L,%L,%L::jsonb,2)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000930','00000000-0000-4000-8000-000000000938','DEMO terület',(select jsonb_set(input,'{pieceCount}','0')::text from profile_quantity_fixture)), '22023', null, 'zero count rejected');
select throws_ok(format('select * from public.save_sheet_metal_profile_calculation(%L,%L,%L,%L,%L::jsonb,2)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000930','00000000-0000-4000-8000-000000000938','DEMO terület',(select jsonb_set(input,'{material,catalogVariantId}','"00000000-0000-4000-8000-000000000934"')::text from profile_quantity_fixture)), '22023', null, 'unsupported unit rejected');
select throws_ok(format('select * from public.save_sheet_metal_profile_calculation(%L,%L,%L,%L,%L::jsonb,2)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000930','00000000-0000-4000-8000-000000000938','DEMO terület',(select jsonb_set(input,'{material,catalogVariantId}','"00000000-0000-4000-8000-000000000935"')::text from profile_quantity_fixture)), '22023', null, 'missing explicit material identity rejected');
select throws_ok(format('select * from public.save_sheet_metal_profile_calculation(%L,%L,%L,%L,%L::jsonb,2)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000930','00000000-0000-4000-8000-000000000938','DEMO terület',(select jsonb_set(input,'{material,catalogVariantId}','"00000000-0000-4000-8000-000000000936"')::text from profile_quantity_fixture)), '22023', null, 'thickness mismatch rejected');
select throws_ok(format('select * from public.save_sheet_metal_profile_calculation(%L,%L,%L,%L,%L::jsonb,2)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000930','00000000-0000-4000-8000-000000000938','DEMO terület',(select jsonb_set(input,'{material,catalogVariantId}','"00000000-0000-4000-8000-000000000937"')::text from profile_quantity_fixture)), '42501', null, 'cross-organization catalog variant rejected');
select throws_ok(format('select * from public.save_sheet_metal_profile_calculation(%L,%L,%L,%L,%L::jsonb,2)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000930','00000000-0000-4000-8000-000000000938','DEMO terület',(select jsonb_set(input,'{material,materialSpec}','7')::text from profile_quantity_fixture)), '22023', null, 'numeric client material identity rejected');
update public.material_variants set technical_specs = '{"profileMaterialSpec":7}' where id = '00000000-0000-4000-8000-000000000933';
select throws_ok(format('select * from public.save_sheet_metal_profile_calculation(%L,%L,%L,%L,%L::jsonb,2)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000930','00000000-0000-4000-8000-000000000938','DEMO terület',(select jsonb_set(input,'{material,materialSpec}','"7"')::text from profile_quantity_fixture)), '22023', null, 'numeric catalog identity rejected');
update public.material_variants set technical_specs = '{"profileMaterialSpec":"DEMO-A"}' where id = '00000000-0000-4000-8000-000000000933';
select throws_ok(format('select * from public.save_sheet_metal_profile_calculation(%L,%L,%L,%L,%L::jsonb,2)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000930','00000000-0000-4000-8000-000000000938','DEMO terület',(select jsonb_set(input #- '{material,catalogVariantId}','{material,catalogSnapshot}','{"productId":"00000000-0000-4000-8000-000000000931"}'::jsonb)::text from profile_quantity_fixture)), '22023', null, 'forged snapshot without variant rejected');
select lives_ok(format('select * from public.save_sheet_metal_profile_calculation(%L,%L,%L,%L,%L::jsonb,2)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000930','00000000-0000-4000-8000-000000000938','DEMO terület',(select jsonb_set(input,'{bends,0,allowance}','{"mode":"unknown"}')::text from profile_quantity_fixture)), 'missing BA/K saves valid geometry and quantities');
select is((select output_snapshot #>> '{materialRequirement,totalNetBlankAreaSqM}' from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000938' and revision_number=3), null, 'missing BA/K keeps area null');
select is((select input_snapshot ->> 'pieceCount' from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000938' and revision_number=3), '3', 'quantity input survives incomplete bend');
select * from finish();
rollback;
