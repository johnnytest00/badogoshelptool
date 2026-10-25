begin;
select plan(16);

select ok(not has_table_privilege('authenticated','public.quotation_calculation_sources','INSERT'), 'calculation sources cannot be written directly');
select ok(has_function_privilege('authenticated','public.save_standalone_quotation_from_calculation(uuid,uuid,uuid,text,uuid,jsonb,integer,jsonb,uuid,jsonb)','EXECUTE'), 'the wrapper is the write path');

set local role postgres;
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002', 'member') on conflict do nothing;
select set_config('test.rev', (select calculation_revision_id::text from public.save_standalone_construction_calculation('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000580010','00000000-0000-4000-8000-000000580101',0,'construction.roof.timber-cutlist','DEMO M4 faanyag',
  '{"schemaVersion":"construction-suite.input.v1","calculatorId":"roof.timber-cutlist","fields":{"lengthMm":"10000"},
    "material":{"requested":{"timber":true,"underlay":false,"covering":false},"layout":{},"specs":{}}}'::jsonb,
  '{"schemaVersion":"construction-suite.output.v1","calculatorId":"roof.timber-cutlist","lines":[{"label":"Tetőfelület","value":84.85,"unit":"m²"}],
    "takeoff":{"status":"VALID","parts":[{"id":"rafters","label":"Szarufa","status":"VALID","quantities":[
      {"label":"Geometriai tengely / vonal","value":26,"unit":"db","meaning":"LAYOUT"},
      {"label":"Geometriai összhossz","value":126.961243,"unit":"m","meaning":"LAYOUT"},
      {"label":"Névleges keresztmetszeti térfogat","value":0.95,"unit":"m³","meaning":"NOMINAL"}]}]},
    "cutList":{"rafters":[{"lengthMm":4883,"count":26}],"battens":[]},
    "specifications":{"schemaVersion":1,"persisted":false,"groups":{"rafter":{"issues":{},"invalidKeys":[]}},"gableOverhangs":null}}'::jsonb,
  '00000000-0000-4000-8000-000000000001')), true);

create function pg_temp.q_lines(p_qty text default '26') returns jsonb language sql immutable as $$
  select pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object('type','MATERIAL','description','DEMO szarufa 4883 mm','quantity',p_qty,'unit','db','unitPrice','','priceClass','net','variantId','','categoryId','','priceId','','priceProvenance','missing','takeoffItemId','','notes',''),
    pg_catalog.jsonb_build_object('type','MATERIAL','description','DEMO szarufa összhossz','quantity','126.961243','unit','m','unitPrice','','priceClass','net','variantId','','categoryId','','priceId','','priceProvenance','missing','takeoffItemId','','notes',''),
    pg_catalog.jsonb_build_object('type','LABOR','description','DEMO munkadíj','quantity','1','unit','óra','unitPrice','','priceClass','net','variantId','','categoryId','','priceId','','priceProvenance','missing','takeoffItemId','','notes',''));
$$;
create function pg_temp.q_map() returns jsonb language sql immutable as $$
  select '[{"quotationLineIndex":0,"sourceKey":"cut/rafters/0"},{"quotationLineIndex":1,"sourceKey":"takeoff/0/1"}]'::jsonb;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('test.quote', (select quotation_id::text from public.save_standalone_quotation_from_calculation('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000580201', null, 'DEMO M4 ajánlat', null, pg_temp.q_lines(), 0, '{"recipientSource":"manual"}'::jsonb,
  current_setting('test.rev')::uuid, pg_temp.q_map())), true);
select ok(current_setting('test.quote') <> '', 'a draft is saved from the calculation without material list or work log');
select is((select calculation_revision_id::text from public.quotation_calculation_sources where quotation_id=current_setting('test.quote')::uuid), current_setting('test.rev'), 'the source points at the exact calculation revision');
select is((select source_line_map from public.quotation_calculation_sources where quotation_id=current_setting('test.quote')::uuid),
  '[{"quotationLineIndex":0,"sourceKey":"cut/rafters/0","label":"Szarufa · 4883 mm","quantity":26,"unit":"db","meaning":"CUT_LIST"},{"quotationLineIndex":1,"sourceKey":"takeoff/0/1","label":"Szarufa · Geometriai összhossz","quantity":126.961243,"unit":"m","meaning":"LAYOUT"}]'::jsonb,
  'the stored source quantities and labels come from the calculation snapshot, not the client');
select is((select (line_items_snapshot->0->>'unitPrice') from public.quotation_revisions where quotation_id=current_setting('test.quote')::uuid), '', 'a missing price stays visibly missing');
select is((select revision_created from public.save_standalone_quotation_from_calculation('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000580201', null, 'DEMO M4 ajánlat', null, pg_temp.q_lines(), 0, '{"recipientSource":"manual"}'::jsonb,
  current_setting('test.rev')::uuid, pg_temp.q_map())), false, 'an identical retry reuses the saved revision');
select lives_ok($$select * from public.save_standalone_quotation_from_calculation('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000580202', current_setting('test.quote')::uuid, 'DEMO M4 ajánlat', null, pg_temp.q_lines('28'), 1, '{"recipientSource":"manual"}'::jsonb,
  current_setting('test.rev')::uuid, pg_temp.q_map())$$, 'an edited quotation quantity is allowed; the verified source quantity is kept separately');
select is((select (source_line_map->0->>'quantity') from public.quotation_calculation_sources s join public.quotation_revisions r on r.id=s.quotation_revision_id
  where s.quotation_id=current_setting('test.quote')::uuid and r.revision_number=2), '26', 'the new revision still records the original calculation quantity');
select throws_ok($$select * from public.save_standalone_quotation_from_calculation('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000580203', null, 'DEMO M4 térfogat', null, pg_temp.q_lines(), 0, '{"recipientSource":"manual"}'::jsonb,
  current_setting('test.rev')::uuid, '[{"quotationLineIndex":0,"sourceKey":"takeoff/0/2"}]'::jsonb)$$, '22023', null, 'a nominal volume cannot become a quotation quantity');
select throws_ok($$select * from public.save_standalone_quotation_from_calculation('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000580204', null, 'DEMO M4 munkadíj', null, pg_temp.q_lines(), 0, '{"recipientSource":"manual"}'::jsonb,
  current_setting('test.rev')::uuid, '[{"quotationLineIndex":2,"sourceKey":"takeoff/0/0"}]'::jsonb)$$, '22023', null, 'a calculation source must point at a material line');
select throws_ok($$select * from public.save_standalone_quotation_from_calculation('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000580205', null, 'DEMO M4 hiányzó', null, pg_temp.q_lines(), 0, '{"recipientSource":"manual"}'::jsonb,
  current_setting('test.rev')::uuid, '[{"quotationLineIndex":0,"sourceKey":"cut/rafters/5"}]'::jsonb)$$, '22023', null, 'a cut-list row outside the revision is rejected');
select throws_ok($$select * from public.save_standalone_quotation_from_calculation('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000580206', null, 'DEMO M4 dupla', null, pg_temp.q_lines(), 0, '{"recipientSource":"manual"}'::jsonb,
  current_setting('test.rev')::uuid, '[{"quotationLineIndex":0,"sourceKey":"cut/rafters/0"},{"quotationLineIndex":0,"sourceKey":"takeoff/0/0"}]'::jsonb)$$, '22023', null, 'one line cannot have two calculation sources');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select throws_ok($$select * from public.save_standalone_quotation_from_calculation('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000580207', null, 'DEMO M4 idegen', null, pg_temp.q_lines(), 0, '{"recipientSource":"manual"}'::jsonb,
  current_setting('test.rev')::uuid, pg_temp.q_map())$$, '42501', null, 'another member cannot quote from someone else''s calculation');
select is((select count(*)::integer from public.quotation_calculation_sources where quotation_id=current_setting('test.quote')::uuid), 0, 'another member cannot read the creator-scoped quotation source');
reset role;
select throws_ok($$update public.quotation_calculation_sources set source_line_map='[]'::jsonb where quotation_id=current_setting('test.quote')::uuid$$, '55000', null, 'calculation sources are immutable');

select * from finish();
rollback;
