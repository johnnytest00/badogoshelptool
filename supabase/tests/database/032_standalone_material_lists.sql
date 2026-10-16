begin;
select no_plan();

select is((select is_nullable from information_schema.columns where table_schema='public' and table_name='material_preparation_lists' and column_name='project_id'), 'YES', 'legacy material lists remain and project association is optional');
select has_column('public', 'material_preparation_lists', 'execution_plan_id', 'material lists can link an execution plan');
select ok(not has_table_privilege('authenticated', 'public.material_preparation_revisions', 'INSERT'), 'client cannot write immutable list revisions directly');

set local role postgres;
insert into public.organizations(id, name) values ('00000000-0000-4000-8000-000000000010', 'DEMO F9.19 materials') on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'owner'),
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002', 'member')
on conflict do nothing;
insert into public.material_products(id, organization_id, category, name, data_provenance, created_by)
values ('00000000-0000-4000-8000-000000979201', '00000000-0000-4000-8000-000000000010', 'other', 'DEMO termék', 'demo', '00000000-0000-4000-8000-000000000001') on conflict do nothing;
insert into public.material_variants(id, organization_id, product_id, name, purchasing_unit, data_provenance, created_by)
values ('00000000-0000-4000-8000-000000979202', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000979201', 'DEMO darab', 'piece', 'demo', '00000000-0000-4000-8000-000000000001') on conflict do nothing;
insert into public.material_prices(id, organization_id, variant_id, amount, currency, purchasing_unit, price_kind, effective_date, data_provenance, created_by)
values ('00000000-0000-4000-8000-000000979203', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000979202', 123.45, 'HUF', 'piece', 'net', '2026-10-16', 'demo', '00000000-0000-4000-8000-000000000001') on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('test.manual_list', (select list_id::text from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', null, null, 'DEMO önálló anyaglista',
  '[{"id":"00000000-0000-4000-8000-000000979211","kind":"manual","description":"DEMO kézi anyag","quantity":"2.125","unit":"linear_meter","variantId":null,"priceId":null,"sourceRefs":[]}]'::jsonb,
  0, '00000000-0000-4000-8000-000000979204'
)), true);
select ok(current_setting('test.manual_list') <> '', 'standalone manual material list can be created without project or customer');
select is((select items_snapshot->0->>'quantity' from public.material_preparation_revisions where list_id=current_setting('test.manual_list')::uuid), '2.125000', 'manual quantity keeps decimal precision');
select is((select items_snapshot->0->>'unit' from public.material_preparation_revisions where list_id=current_setting('test.manual_list')::uuid), 'linear_meter', 'manual unit is preserved without conversion');
select is((select items_snapshot->0->>'priceSnapshot' from public.material_preparation_revisions where list_id=current_setting('test.manual_list')::uuid), null, 'unknown manual price remains absent');
select is((select list_id::text from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', null, null, 'DEMO önálló anyaglista',
  '[{"id":"00000000-0000-4000-8000-000000979211","kind":"manual","description":"DEMO kézi anyag","quantity":"2.125","unit":"linear_meter","variantId":null,"priceId":null,"sourceRefs":[]}]'::jsonb,
  0, '00000000-0000-4000-8000-000000979204'
)), current_setting('test.manual_list'), 'same create request retries idempotently');
select throws_ok($$select * from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', null, null, 'DEMO changed',
  '[{"id":"00000000-0000-4000-8000-000000979211","kind":"manual","description":"DEMO másik tétel","quantity":"2.125","unit":"linear_meter","variantId":null,"priceId":null,"sourceRefs":[]}]'::jsonb,
  0, '00000000-0000-4000-8000-000000979204'
)$$, '40001', null, 'reusing request key with changed list content is rejected');

select set_config('test.catalog_list', (select list_id::text from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', null, null, 'DEMO katalóguslista',
  '[{"id":"00000000-0000-4000-8000-000000979212","kind":"catalog","description":"DEMO darab","quantity":"3","unit":"piece","variantId":"00000000-0000-4000-8000-000000979202","priceId":"00000000-0000-4000-8000-000000979203","sourceRefs":[]}]'::jsonb,
  0, '00000000-0000-4000-8000-000000979205'
)), true);
select is((select items_snapshot->0->'priceSnapshot'->>'amount' from public.material_preparation_revisions where list_id=current_setting('test.catalog_list')::uuid), '123.45', 'catalog price is captured as an exact optional snapshot');
select throws_ok($$select * from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', null, null, 'DEMO unit mismatch',
  '[{"id":"00000000-0000-4000-8000-000000979213","kind":"catalog","description":"DEMO darab","quantity":"3","unit":"linear_meter","variantId":"00000000-0000-4000-8000-000000979202","priceId":null,"sourceRefs":[]}]'::jsonb,
  0, '00000000-0000-4000-8000-000000979206'
)$$, '42501', null, 'catalog quantity cannot be saved in a mismatched unit');

select set_config('test.plan_id', (select plan_id::text from public.create_execution_plan(
  '00000000-0000-4000-8000-000000000010', null, 'DEMO anyaglistás terv', null, null, null,
  '00000000-0000-4000-8000-000000979207'
)), true);
select set_config('test.plan_list', (select list_id::text from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', null, current_setting('test.plan_id')::uuid, 'DEMO terv anyaglistája',
  '[{"id":"00000000-0000-4000-8000-000000979214","kind":"manual","description":"DEMO deszka","quantity":"1.25","unit":"linear_meter","variantId":null,"priceId":null,"sourceRefs":[]}]'::jsonb,
  0, '00000000-0000-4000-8000-000000979208'
)), true);
select is((select execution_plan_id::text from public.material_preparation_lists where id=current_setting('test.plan_list')::uuid), current_setting('test.plan_id'), 'material list keeps its execution plan association');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is((select count(*)::int from public.material_preparation_lists where id=current_setting('test.manual_list')::uuid), 0, 'standalone list is creator-scoped');
select is((select count(*)::int from public.material_preparation_lists where id=current_setting('test.plan_list')::uuid), 1, 'plan-linked list is visible to authorized plan members');
reset role;
select throws_ok($$update public.material_preparation_revisions set items_snapshot='[]'::jsonb where list_id=current_setting('test.manual_list')::uuid$$, 'P0001', null, 'material list revision history is immutable');

select * from finish();
rollback;
