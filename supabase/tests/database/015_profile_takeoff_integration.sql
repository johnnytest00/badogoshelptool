begin;
select plan(37);
select has_function('public','create_profile_takeoff_draft','profile takeoff RPC exists');
set local role postgres;
insert into public.organizations(id,name) values('00000000-0000-4000-8000-000000000046','DEMO idegen profilátadás műhely');
insert into public.organization_members(organization_id,user_id,role) values('00000000-0000-4000-8000-000000000046','00000000-0000-4000-8000-000000000002','owner');
insert into public.projects(id,organization_id,name,project_type,status,created_by) values
 ('00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000010','DEMO profilátadás','roof_renovation','draft','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000941','00000000-0000-4000-8000-000000000010','DEMO másik projekt','roof_renovation','draft','00000000-0000-4000-8000-000000000001');
insert into public.material_products(id,organization_id,category,name,status,data_provenance) values
 ('00000000-0000-4000-8000-000000000942','00000000-0000-4000-8000-000000000010','sheet_metal','DEMO profil lemez','active','demo'),
 ('00000000-0000-4000-8000-000000000943','00000000-0000-4000-8000-000000000046','sheet_metal','DEMO idegen lemez','active','demo');
insert into public.material_variants(id,organization_id,product_id,name,purchasing_unit,thickness_mm,technical_specs,source_name,data_provenance) values
 ('00000000-0000-4000-8000-000000000944','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000942','DEMO egyező','square_meter',1,'{"profileMaterialSpec":"DEMO-A"}','DEMO paraméter','demo'),
 ('00000000-0000-4000-8000-000000000945','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000942','DEMO darab','piece',1,'{"profileMaterialSpec":"DEMO-A"}','DEMO paraméter','demo'),
 ('00000000-0000-4000-8000-000000000946','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000942','DEMO vastag','square_meter',2,'{"profileMaterialSpec":"DEMO-A"}','DEMO paraméter','demo'),
 ('00000000-0000-4000-8000-000000000947','00000000-0000-4000-8000-000000000046','00000000-0000-4000-8000-000000000943','DEMO idegen','square_meter',1,'{"profileMaterialSpec":"DEMO-A"}','DEMO paraméter','demo');
insert into public.material_prices(organization_id,variant_id,amount,purchasing_unit,price_kind,price_source,effective_date,data_provenance,source_name)
 values('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000944',99,'piece','net','DEMO','2026-10-13','demo','DEMO eltérő egység');
create temp table profile_transfer_fixture(input jsonb);
insert into profile_transfer_fixture values ('{"schemaVersion":"1.0.0","profileId":"00000000-0000-4000-8000-000000000948","profileType":"l","label":"DEMO profilátadás","coordinateConvention":"x-right-y-up","dimensionConvention":"finished_tangent","thicknessMm":1,"straights":[{"id":"s1","tangentLengthMm":60},{"id":"s2","tangentLengthMm":40}],"bends":[{"id":"b1","signedTurnDeg":90,"insideRadiusMm":2,"allowance":{"mode":"explicit_ba","baMm":3,"source":{"kind":"user_provided","label":"DEMO BA"}}}],"formedRunLengthMm":2000,"pieceCount":3,"material":{"catalogVariantId":"00000000-0000-4000-8000-000000000944","materialSpec":"DEMO-A","provenance":{"kind":"catalog_snapshot","label":"DEMO"}}}');
grant select on profile_transfer_fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select lives_ok(format('select * from public.save_sheet_metal_profile_calculation(%L,%L,%L,%L,%L::jsonb,0)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000948','DEMO profilátadás',(select input::text from profile_transfer_fixture)),'saved profile V1');
select lives_ok(format('select * from public.create_profile_takeoff_draft(%L,%L,%L,%L,%L,%L,%L)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000948',
 (select id from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000948' and revision_number=1),
 '00000000-0000-4000-8000-000000000944','DEMO profil draft','00000000-0000-4000-8000-000000000949'),'valid m² draft transfer');
select is((select final_quantity from public.material_takeoff_items where takeoff_id=(select id from public.material_takeoffs where transfer_request_key='00000000-0000-4000-8000-000000000949')),0.618::numeric,'net area 0.618 m²');
select is((select quantity_unit::text from public.material_takeoff_items where takeoff_id=(select id from public.material_takeoffs where transfer_request_key='00000000-0000-4000-8000-000000000949')),'square_meter','canonical m² unit');
select is((select source_calculation_revision_id from public.material_takeoffs where transfer_request_key='00000000-0000-4000-8000-000000000949'),
 (select id from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000948' and revision_number=1),'exact saved source revision');
select is((select material_snapshot->>'flatPatternWidthMm' from public.material_takeoff_items where takeoff_id=(select id from public.material_takeoffs where transfer_request_key='00000000-0000-4000-8000-000000000949')),'103','width snapshot');
select is((select material_snapshot #>> '{bendParameterSources,0,allowance,source,label}' from public.material_takeoff_items where takeoff_id=(select id from public.material_takeoffs where transfer_request_key='00000000-0000-4000-8000-000000000949')),'DEMO BA','BA provenance snapshot');
select is((select material_snapshot->>'compatibility' from public.material_takeoff_items where takeoff_id=(select id from public.material_takeoffs where transfer_request_key='00000000-0000-4000-8000-000000000949')),'TECHNICALLY_MATCHED_PARAMETERS','explicit compatibility provenance');
select throws_ok($$update public.material_takeoff_items set material_snapshot='{}'::jsonb where takeoff_id=(select id from public.material_takeoffs where transfer_request_key='00000000-0000-4000-8000-000000000949')$$,'P0001',null,'profile draft source snapshot cannot be edited');
select is((select price_snapshot from public.material_takeoff_items where takeoff_id=(select id from public.material_takeoffs where transfer_request_key='00000000-0000-4000-8000-000000000949')),null::jsonb,'other-unit price is not copied');
select is((select draft_created from public.create_profile_takeoff_draft('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000948',
 (select id from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000948' and revision_number=1),'00000000-0000-4000-8000-000000000944','DEMO profil draft','00000000-0000-4000-8000-000000000949')),false,'same-key same-payload reuse');
select throws_ok(format('select * from public.create_profile_takeoff_draft(%L,%L,%L,%L,%L,%L,%L)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000948',
 (select id from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000948' and revision_number=1),
 '00000000-0000-4000-8000-000000000944','changed','00000000-0000-4000-8000-000000000949'),'22023',null,'same key different payload rejected');
select throws_ok(format('select * from public.create_profile_takeoff_draft(%L,%L,%L,%L,%L,%L,%L)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000941','00000000-0000-4000-8000-000000000948',
 (select id from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000948' and revision_number=1),
 '00000000-0000-4000-8000-000000000944','cross project','00000000-0000-4000-8000-000000000950'),'P0002',null,'cross-project source rejected');
select throws_ok(format('select * from public.create_profile_takeoff_draft(%L,%L,%L,%L,%L,%L,%L)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000948',
 (select id from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000948' and revision_number=1),
 '00000000-0000-4000-8000-000000000947','foreign variant','00000000-0000-4000-8000-000000000951'),'22023',null,'foreign variant cannot replace saved mapping');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select throws_ok(format('select * from public.create_profile_takeoff_draft(%L,%L,%L,%L,%L,%L,%L)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000948',
 (select id from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000948' and revision_number=1),
 '00000000-0000-4000-8000-000000000944','unauthorized','00000000-0000-4000-8000-000000000952'),'42501',null,'nonmember denied');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select is((select draft_created from public.create_profile_takeoff_draft('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000948',
 (select id from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000948' and revision_number=1),'00000000-0000-4000-8000-000000000944','DEMO profil draft','00000000-0000-4000-8000-000000000958')),true,'new key permits another intentional draft');
select is((select count(*)::int from public.material_takeoffs where source_calculation_id='00000000-0000-4000-8000-000000000948'),2,'same source and name do not deduplicate distinct actions');
set local role postgres;
insert into public.material_prices(organization_id,variant_id,amount,purchasing_unit,price_kind,price_source,effective_date,data_provenance,source_name)
 values('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000944',321,'square_meter','net','DEMO','2026-10-13','demo','DEMO m² árforrás');
set local role authenticated;
select lives_ok(format('select * from public.create_profile_takeoff_draft(%L,%L,%L,%L,%L,%L,%L)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000948',
 (select id from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000948' and revision_number=1),
 '00000000-0000-4000-8000-000000000944','DEMO árazott draft','00000000-0000-4000-8000-000000000959'),'m² price transfer');
select is((select price_snapshot->>'sourceName' from public.material_takeoff_items where takeoff_id=(select id from public.material_takeoffs where transfer_request_key='00000000-0000-4000-8000-000000000959')),'DEMO m² árforrás','exact m² price provenance preserved');
select is((select price_snapshot->>'purchasingUnit' from public.material_takeoff_items where takeoff_id=(select id from public.material_takeoffs where transfer_request_key='00000000-0000-4000-8000-000000000959')),'square_meter','price unit matches transferred quantity');
select lives_ok($$select * from public.approve_material_takeoff('00000000-0000-4000-8000-000000000010',(select id from public.material_takeoffs where transfer_request_key='00000000-0000-4000-8000-000000000949'),1)$$,'approve earlier draft');
select throws_ok($$update public.material_takeoffs set name='tampered' where transfer_request_key='00000000-0000-4000-8000-000000000949'$$,'P0001',null,'approved draft immutable');
select lives_ok(format('select * from public.save_sheet_metal_profile_calculation(%L,%L,%L,%L,%L::jsonb,1)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000948','DEMO profilátadás',(select jsonb_set(input,'{pieceCount}','4')::text from profile_transfer_fixture)),'save V2');
select throws_ok(format('select * from public.create_profile_takeoff_draft(%L,%L,%L,%L,%L,%L,%L)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000948',
 (select id from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000948' and revision_number=1),
 '00000000-0000-4000-8000-000000000944','stale','00000000-0000-4000-8000-000000000953'),'P0002',null,'stale V1 rejected');
select is((select final_quantity from public.material_takeoff_items where takeoff_id=(select id from public.material_takeoffs where transfer_request_key='00000000-0000-4000-8000-000000000949')),0.618::numeric,'older draft remains unchanged');
set local role postgres;
update public.material_variants set purchasing_unit='piece' where id='00000000-0000-4000-8000-000000000944';
set local role authenticated;
select throws_ok(format('select * from public.create_profile_takeoff_draft(%L,%L,%L,%L,%L,%L,%L)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000948',
 (select id from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000948' and revision_number=2),
 '00000000-0000-4000-8000-000000000944','unit mismatch','00000000-0000-4000-8000-000000000954'),'22023',null,'current catalog unit mismatch rejected');
set local role postgres;
update public.material_variants set purchasing_unit='square_meter',thickness_mm=2 where id='00000000-0000-4000-8000-000000000944';
set local role authenticated;
select throws_ok(format('select * from public.create_profile_takeoff_draft(%L,%L,%L,%L,%L,%L,%L)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000948',
 (select id from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000948' and revision_number=2),
 '00000000-0000-4000-8000-000000000944','thickness mismatch','00000000-0000-4000-8000-000000000955'),'22023',null,'thickness mismatch rejected');
set local role postgres;
update public.material_variants set thickness_mm=1,technical_specs='{"profileMaterialSpec":"DEMO-B"}' where id='00000000-0000-4000-8000-000000000944';
set local role authenticated;
select throws_ok(format('select * from public.create_profile_takeoff_draft(%L,%L,%L,%L,%L,%L,%L)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000948',
 (select id from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000948' and revision_number=2),
 '00000000-0000-4000-8000-000000000944','material mismatch','00000000-0000-4000-8000-000000000956'),'22023',null,'material identity mismatch rejected');
set local role postgres;
update public.material_variants set technical_specs='{"profileMaterialSpec":"DEMO-A"}' where id='00000000-0000-4000-8000-000000000944';
set local role authenticated;
select lives_ok(format('select * from public.save_sheet_metal_profile_calculation(%L,%L,%L,%L,%L::jsonb,2)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000948','DEMO profilátadás',(select jsonb_set(input,'{bends,0,allowance}','{"mode":"unknown"}')::text from profile_transfer_fixture)),'save incomplete V3');
select throws_ok(format('select * from public.create_profile_takeoff_draft(%L,%L,%L,%L,%L,%L,%L)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000948',
 (select id from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000948' and revision_number=3),
 '00000000-0000-4000-8000-000000000944','incomplete','00000000-0000-4000-8000-000000000957'),'22023',null,'missing BA/K rejected');
select is((select count(*)::int from public.material_takeoffs where transfer_request_key='00000000-0000-4000-8000-000000000957'),0,'incomplete source creates no partial draft');
select lives_ok(format('select * from public.save_sheet_metal_profile_calculation(%L,%L,%L,%L,%L::jsonb,3)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000948','DEMO profilátadás',(select (input #- '{formedRunLengthMm}')::text from profile_transfer_fixture)),'save profile without piece length V4');
select throws_ok(format('select * from public.create_profile_takeoff_draft(%L,%L,%L,%L,%L,%L,%L)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000948',
 (select id from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000948' and revision_number=4),
 '00000000-0000-4000-8000-000000000944','null area','00000000-0000-4000-8000-000000000962'),'22023',null,'null net area rejected, not converted to zero');
select lives_ok($$select * from public.save_sheet_metal_profile_calculation(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000963','DEMO hajtás nélküli',
 '{"schemaVersion":"1.0.0","profileId":"00000000-0000-4000-8000-000000000963","profileType":"custom","label":"DEMO hajtás nélküli","coordinateConvention":"x-right-y-up","dimensionConvention":"finished_tangent","thicknessMm":1,"straights":[{"id":"s1","tangentLengthMm":100}],"bends":[],"formedRunLengthMm":1000,"pieceCount":1,"material":{"catalogVariantId":"00000000-0000-4000-8000-000000000944","materialSpec":"DEMO-A","provenance":{"kind":"catalog_snapshot","label":"DEMO"}}}'::jsonb,0)$$,'save bend-free DEMO profile');
select lives_ok(format('select * from public.create_profile_takeoff_draft(%L,%L,%L,%L,%L,%L,%L)',
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000940','00000000-0000-4000-8000-000000000963',
 (select id from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000000963' and revision_number=1),
 '00000000-0000-4000-8000-000000000944','DEMO hajtás nélküli','00000000-0000-4000-8000-000000000964'),'bend-free profile transfer');
select is((select material_snapshot->>'calculationClassification' from public.material_takeoff_items where takeoff_id=(select id from public.material_takeoffs where transfer_request_key='00000000-0000-4000-8000-000000000964')),'GEOMETRICALLY_DETERMINED','bend-free calculation confidence is preserved');
select * from finish();
rollback;
