begin;
select no_plan();

set local role postgres;
insert into public.organizations(id, name) values
  ('00000000-0000-4000-8000-000000000010', 'DEMO F9.23.1 material quote'),
  ('00000000-0000-4000-8000-000000000011', 'DEMO F9.23.1 other organization')
on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'owner')
on conflict do nothing;
select set_config('test.category_other', (select id::text from public.material_categories where organization_id='00000000-0000-4000-8000-000000000010' and legacy_category='other' and is_default), true);
select set_config('test.category_timber', (select id::text from public.material_categories where organization_id='00000000-0000-4000-8000-000000000010' and legacy_category='timber' and is_default), true);
select set_config('test.foreign_category', (select id::text from public.material_categories where organization_id='00000000-0000-4000-8000-000000000011' and legacy_category='timber' and is_default), true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('test.source_list', (select list_id::text from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', null, null, 'DEMO anyaglista',
  '[{"id":"00000000-0000-4000-8000-000000979351","kind":"manual","materialCategory":"other","description":"DEMO kézi anyag","quantity":"4.25","unit":"linear_meter","variantId":null,"priceId":null,"sourceRefs":[]}]'::jsonb,
  0, '00000000-0000-4000-8000-000000979352'
)), true);
select set_config('test.source_revision', (select current_revision_id::text from public.material_preparation_lists where id=current_setting('test.source_list')::uuid), true);

select set_config('test.quote_revision_v1', (select revision_id::text from public.save_standalone_quotation_from_material_list(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000979353', null, 'DEMO kézi anyag ajánlat', null,
  jsonb_build_array(jsonb_build_object('type','MATERIAL','description','DEMO kézi anyag','quantity','4.25','unit','linear_meter','unitPrice','875.25','priceClass','net','variantId','','categoryId',current_setting('test.category_other'),'priceId','','priceProvenance','user_entered','takeoffItemId','','sourceMaterialItemId','00000000-0000-4000-8000-000000979351','notes','')),
  0, '{"recipientSource":"manual"}'::jsonb,
  current_setting('test.source_list')::uuid, current_setting('test.source_revision')::uuid,
  '[{"materialItemId":"00000000-0000-4000-8000-000000979351","quotationLineIndex":0}]'::jsonb
)), true);
select set_config('test.quote_id', (select quotation_id::text from public.quotation_revisions where id=current_setting('test.quote_revision_v1')::uuid), true);
select is((select line_items_snapshot #>> '{0,categoryId}' from public.quotation_revisions where id=current_setting('test.quote_revision_v1')::uuid), current_setting('test.category_other'), 'unmapped material row persists its selected category in the quote revision');
select is((select line_items_snapshot #>> '{0,variantId}' from public.quotation_revisions where id=current_setting('test.quote_revision_v1')::uuid), null, 'unmapped material stays valid without a catalog variant');
select is((select line_items_snapshot #>> '{0,priceProvenance}' from public.quotation_revisions where id=current_setting('test.quote_revision_v1')::uuid), 'user_entered', 'manual price provenance remains explicit in the saved snapshot');
select is((select subtotal::text from public.quotation_revisions where id=current_setting('test.quote_revision_v1')::uuid), '3719.81', 'manual material total uses decimal-safe quantity and price arithmetic');
select is((select source_line_map->0->>'materialItemId' from public.quotation_material_list_sources where quotation_revision_id=current_setting('test.quote_revision_v1')::uuid), '00000000-0000-4000-8000-000000979351', 'exact source item id is retained independently of catalog mapping');

select set_config('test.quote_revision_v2', (select revision_id::text from public.save_standalone_quotation_from_material_list(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000979354', current_setting('test.quote_id')::uuid, 'DEMO kézi anyag ajánlat', null,
  jsonb_build_array(jsonb_build_object('type','MATERIAL','description','DEMO kézi anyag','quantity','4.25','unit','linear_meter','unitPrice','875.25','priceClass','net','variantId','','categoryId',current_setting('test.category_timber'),'priceId','','priceProvenance','user_entered','takeoffItemId','','sourceMaterialItemId','00000000-0000-4000-8000-000000979351','notes','')),
  1, '{"recipientSource":"manual"}'::jsonb,
  current_setting('test.source_list')::uuid, current_setting('test.source_revision')::uuid,
  '[{"materialItemId":"00000000-0000-4000-8000-000000979351","quotationLineIndex":0}]'::jsonb
)), true);
select is((select line_items_snapshot #>> '{0,categoryId}' from public.quotation_revisions where id=current_setting('test.quote_revision_v2')::uuid), current_setting('test.category_timber'), 'category change persists to the reopened V2 quote line');
select is((select line_items_snapshot #>> '{0,categoryId}' from public.quotation_revisions where id=current_setting('test.quote_revision_v1')::uuid), current_setting('test.category_other'), 'previous saved quotation revision remains unchanged');
select is((select material_revision_id::text from public.get_standalone_quotation_material_source('00000000-0000-4000-8000-000000000010',current_setting('test.quote_id')::uuid,current_setting('test.quote_revision_v2')::uuid)), current_setting('test.source_revision'), 'reopened quotation keeps the original immutable material-list revision');
select is((select items_snapshot->0->>'id' from public.material_preparation_revisions where id=current_setting('test.source_revision')::uuid), '00000000-0000-4000-8000-000000979351', 'category edits do not rewrite the material-list source snapshot');

select throws_ok($$select * from public.save_standalone_quotation_from_material_list(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000979355', current_setting('test.quote_id')::uuid, 'DEMO kézi anyag ajánlat', null,
  jsonb_build_array(jsonb_build_object('type','MATERIAL','description','DEMO kézi anyag','quantity','4.25','unit','linear_meter','unitPrice','875.25','priceClass','net','variantId','','categoryId',current_setting('test.foreign_category'),'priceId','','sourceMaterialItemId','00000000-0000-4000-8000-000000979351')),
  2, '{"recipientSource":"manual"}'::jsonb, current_setting('test.source_list')::uuid, current_setting('test.source_revision')::uuid,
  '[{"materialItemId":"00000000-0000-4000-8000-000000979351","quotationLineIndex":0}]'::jsonb
)$$, '23503', null, 'quotation category ids cannot cross organization boundaries');

select * from finish();
rollback;
