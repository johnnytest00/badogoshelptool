begin;
select no_plan();

select has_table('public', 'quotation_material_list_sources', 'quotation source links are stored independently and append-only');
select ok(not has_table_privilege('authenticated', 'public.quotation_material_list_sources', 'INSERT'), 'clients cannot forge quotation source relations');
select ok(not has_table_privilege('authenticated', 'public.quotation_material_list_sources', 'UPDATE'), 'clients cannot rewrite quotation source relations');

set local role postgres;
insert into public.organizations(id, name) values ('00000000-0000-4000-8000-000000000010', 'DEMO F9.19 quote source') on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'owner'),
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002', 'member')
on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('test.source_list', (select list_id::text from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', null, null, 'DEMO ajánlatforrás lista',
  '[{"id":"00000000-0000-4000-8000-000000979331","kind":"manual","materialCategory":"sheet_metal","description":"DEMO kézi szegély","quantity":"4.25","unit":"linear_meter","variantId":null,"priceId":null,"sourceRefs":[]}]'::jsonb,
  0, '00000000-0000-4000-8000-000000979332'
)), true);
select set_config('test.source_revision', (select current_revision_id::text from public.material_preparation_lists where id=current_setting('test.source_list')::uuid), true);
select set_config('test.quote_revision', (select revision_id::text from public.save_standalone_quotation_from_material_list(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000979333', null, 'DEMO anyaglista ajánlat', null,
  '[{"type":"OTHER","description":"DEMO kézi szegély","quantity":"4.25","unit":"linear_meter","unitPrice":"875","priceClass":"net","variantId":"","priceId":"","takeoffItemId":"","sourceMaterialItemId":"00000000-0000-4000-8000-000000979331","notes":""}]'::jsonb,
  0, '{"recipientSource":"manual","recipientName":"","recipientAddress":"","recipientEmail":"","recipientPhone":"","recipientTaxIdentifier":"","reference":"","validUntil":"","notes":"","terms":""}'::jsonb,
  current_setting('test.source_list')::uuid, current_setting('test.source_revision')::uuid,
  '[{"materialItemId":"00000000-0000-4000-8000-000000979331","quotationLineIndex":0}]'::jsonb
)), true);
select set_config('test.quote_id', (select id::text from public.quotations where current_revision_id=current_setting('test.quote_revision')::uuid), true);
select is((select count(*)::int from public.quotation_material_list_sources where quotation_revision_id=current_setting('test.quote_revision')::uuid), 1, 'quote save writes one immutable exact-revision source link');
select is((select material_revision_id::text from public.quotation_material_list_sources where quotation_revision_id=current_setting('test.quote_revision')::uuid), current_setting('test.source_revision'), 'quote points at the exact material list revision');
select is((select source_line_map->0->>'materialItemId' from public.quotation_material_list_sources where quotation_revision_id=current_setting('test.quote_revision')::uuid), '00000000-0000-4000-8000-000000979331', 'quote source keeps the original list item identity');
select is((select material_revision_id::text from public.get_standalone_quotation_material_source(
  '00000000-0000-4000-8000-000000000010', current_setting('test.quote_id')::uuid, current_setting('test.quote_revision')::uuid
)), current_setting('test.source_revision'), 'authorized quote reader can reopen exact source revision');

select is((select revision_id::text from public.save_standalone_quotation_from_material_list(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000979333', null, 'DEMO anyaglista ajánlat', null,
  '[{"type":"OTHER","description":"DEMO kézi szegély","quantity":"4.25","unit":"linear_meter","unitPrice":"875","priceClass":"net","variantId":"","priceId":"","takeoffItemId":"","sourceMaterialItemId":"00000000-0000-4000-8000-000000979331","notes":""}]'::jsonb,
  0, '{"recipientSource":"manual","recipientName":"","recipientAddress":"","recipientEmail":"","recipientPhone":"","recipientTaxIdentifier":"","reference":"","validUntil":"","notes":"","terms":""}'::jsonb,
  current_setting('test.source_list')::uuid, current_setting('test.source_revision')::uuid,
  '[{"materialItemId":"00000000-0000-4000-8000-000000979331","quotationLineIndex":0}]'::jsonb
)), current_setting('test.quote_revision'), 'same source quote operation is idempotent');
select is((select revision_id::text from public.save_standalone_quotation_from_material_list(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000979335', current_setting('test.quote_id')::uuid, 'DEMO anyaglista ajánlat', null,
  '[{"type":"OTHER","description":"DEMO kézi szegély","quantity":"4.25","unit":"linear_meter","unitPrice":"875","priceClass":"net","variantId":"","priceId":"","takeoffItemId":"","sourceMaterialItemId":"00000000-0000-4000-8000-000000979331","notes":""}]'::jsonb,
  1, '{"recipientSource":"manual","recipientName":"","recipientAddress":"","recipientEmail":"","recipientPhone":"","recipientTaxIdentifier":"","reference":"","validUntil":"","notes":"","terms":""}'::jsonb,
  current_setting('test.source_list')::uuid, current_setting('test.source_revision')::uuid,
  '[{"materialItemId":"00000000-0000-4000-8000-000000979331","quotationLineIndex":0}]'::jsonb
)), current_setting('test.quote_revision'), 'a new unchanged save operation safely reuses the same source revision');
select is((select count(*)::int from public.quotation_material_list_sources where quotation_revision_id=current_setting('test.quote_revision')::uuid), 1, 'unchanged quote save does not duplicate its source relation');
select throws_ok($$select * from public.save_standalone_quotation_from_material_list(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000979333', null, 'DEMO anyaglista ajánlat', null,
  '[{"type":"OTHER","description":"DEMO kézi szegély","quantity":"4.25","unit":"linear_meter","unitPrice":"875","priceClass":"net","variantId":"","priceId":"","takeoffItemId":"","sourceMaterialItemId":"00000000-0000-4000-8000-000000979334","notes":""}]'::jsonb,
  0, '{"recipientSource":"manual","recipientName":"","recipientAddress":"","recipientEmail":"","recipientPhone":"","recipientTaxIdentifier":"","reference":"","validUntil":"","notes":"","terms":""}'::jsonb,
  current_setting('test.source_list')::uuid, current_setting('test.source_revision')::uuid,
  '[{"materialItemId":"00000000-0000-4000-8000-000000979334","quotationLineIndex":0}]'::jsonb
)$$, '42501', null, 'source material items must belong to the exact list revision');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is((select count(*)::int from public.quotation_material_list_sources where quotation_id=current_setting('test.quote_id')::uuid), 0, 'same organization noncreator cannot read standalone quote provenance');
reset role;
select throws_ok($$update public.quotation_material_list_sources set source_line_map='[]'::jsonb where quotation_revision_id=current_setting('test.quote_revision')::uuid$$, '55000', null, 'source relation cannot be changed');

select * from finish();
rollback;
