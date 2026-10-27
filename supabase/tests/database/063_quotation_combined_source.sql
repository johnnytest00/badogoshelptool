begin;
select plan(10);

select ok(has_function_privilege('authenticated','public.save_standalone_quotation_from_material_list_and_calculation(uuid,uuid,uuid,text,uuid,jsonb,integer,jsonb,uuid,uuid,jsonb,uuid,jsonb)','EXECUTE'), 'the wrapper is the write path');

set local role postgres;
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002', 'member') on conflict do nothing;
select set_config('test.rev', (select calculation_revision_id::text from public.save_standalone_construction_calculation('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000630010','00000000-0000-4000-8000-000000630101',0,'construction.roof.timber-cutlist','DEMO M10.3 faanyag',
  '{"schemaVersion":"construction-suite.input.v1","calculatorId":"roof.timber-cutlist","fields":{"lengthMm":"10000"},
    "material":{"requested":{"timber":true,"underlay":false,"covering":false},"layout":{},"specs":{}}}'::jsonb,
  '{"schemaVersion":"construction-suite.output.v1","calculatorId":"roof.timber-cutlist","lines":[{"label":"Tetőfelület","value":84.85,"unit":"m²"}],
    "takeoff":{"status":"VALID","parts":[{"id":"rafters","label":"Szarufa","status":"VALID","quantities":[
      {"label":"Geometriai tengely / vonal","value":26,"unit":"db","meaning":"LAYOUT"}]}]},
    "cutList":{"rafters":[{"lengthMm":4883,"count":26}],"battens":[]},
    "specifications":{"schemaVersion":1,"persisted":false,"groups":{"rafter":{"issues":{},"invalidKeys":[]}},"gableOverhangs":null}}'::jsonb,
  '00000000-0000-4000-8000-000000000001')), true);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('test.list', (select list_id::text from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', null, null, 'DEMO M10.3 kombinált forrás lista',
  '[{"id":"00000000-0000-4000-8000-000000639331","kind":"manual","materialCategory":"sheet_metal","description":"DEMO kézi szegély","quantity":"4.25","unit":"linear_meter","variantId":null,"priceId":null,"sourceRefs":[]}]'::jsonb,
  0, '00000000-0000-4000-8000-000000639332'
)), true);
select set_config('test.list_rev', (select current_revision_id::text from public.material_preparation_lists where id=current_setting('test.list')::uuid), true);

create function pg_temp.c_lines() returns jsonb language sql immutable as $$
  select pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object('type','OTHER','description','DEMO kézi szegély','quantity','4.25','unit','linear_meter','unitPrice','875','priceClass','net','variantId','','categoryId','','priceId','','priceProvenance','user_entered','takeoffItemId','','sourceMaterialItemId','00000000-0000-4000-8000-000000639331','notes',''),
    pg_catalog.jsonb_build_object('type','MATERIAL','description','DEMO szarufa 4883 mm','quantity','26','unit','db','unitPrice','','priceClass','net','variantId','','categoryId','','priceId','','priceProvenance','missing','takeoffItemId','','notes',''));
$$;

select set_config('test.quote', (select quotation_id::text from public.save_standalone_quotation_from_material_list_and_calculation(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000639201', null, 'DEMO M10.3 kombinált ajánlat', null,
  pg_temp.c_lines(), 0, '{"recipientSource":"manual"}'::jsonb,
  current_setting('test.list')::uuid, current_setting('test.list_rev')::uuid, '[{"materialItemId":"00000000-0000-4000-8000-000000639331","quotationLineIndex":0}]'::jsonb,
  current_setting('test.rev')::uuid, '[{"quotationLineIndex":1,"sourceKey":"cut/rafters/0"}]'::jsonb
)), true);
select ok(current_setting('test.quote') <> '', 'a draft is saved from both a material list and a calculation at once');
select set_config('test.quote_rev', (select current_revision_id::text from public.quotations where id=current_setting('test.quote')::uuid), true);
select is((select count(*)::int from public.quotation_material_list_sources where quotation_revision_id=current_setting('test.quote_rev')::uuid), 1, 'the material list source link is recorded');
select is((select count(*)::int from public.quotation_calculation_sources where quotation_revision_id=current_setting('test.quote_rev')::uuid), 1, 'the calculation source link is recorded');
select is((select material_revision_id::text from public.quotation_material_list_sources where quotation_revision_id=current_setting('test.quote_rev')::uuid), current_setting('test.list_rev'), 'the material source points at the exact list revision');
select is((select calculation_revision_id::text from public.quotation_calculation_sources where quotation_revision_id=current_setting('test.quote_rev')::uuid), current_setting('test.rev'), 'the calculation source points at the exact calculation revision');

select is((select revision_created from public.save_standalone_quotation_from_material_list_and_calculation(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000639201', null, 'DEMO M10.3 kombinált ajánlat', null,
  pg_temp.c_lines(), 0, '{"recipientSource":"manual"}'::jsonb,
  current_setting('test.list')::uuid, current_setting('test.list_rev')::uuid, '[{"materialItemId":"00000000-0000-4000-8000-000000639331","quotationLineIndex":0}]'::jsonb,
  current_setting('test.rev')::uuid, '[{"quotationLineIndex":1,"sourceKey":"cut/rafters/0"}]'::jsonb
)), false, 'an identical retry reuses the saved revision without duplicating either source');
select is((select count(*)::int from public.quotation_material_list_sources where quotation_revision_id=current_setting('test.quote_rev')::uuid), 1, 'no duplicate material source link after retry');
select is((select count(*)::int from public.quotation_calculation_sources where quotation_revision_id=current_setting('test.quote_rev')::uuid), 1, 'no duplicate calculation source link after retry');

select throws_ok($$select * from public.save_standalone_quotation_from_material_list_and_calculation(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000639203', null, 'DEMO M10.3 ütköző sor', null,
  pg_temp.c_lines(), 0, '{"recipientSource":"manual"}'::jsonb,
  current_setting('test.list')::uuid, current_setting('test.list_rev')::uuid, '[{"materialItemId":"00000000-0000-4000-8000-000000639331","quotationLineIndex":0}]'::jsonb,
  current_setting('test.rev')::uuid, '[{"quotationLineIndex":0,"sourceKey":"cut/rafters/0"}]'::jsonb
)$$, '22023', null, 'one quotation line cannot carry both a material list and a calculation source');

reset role;
select * from finish();
rollback;
