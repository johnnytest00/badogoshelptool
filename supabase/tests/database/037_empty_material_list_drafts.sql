begin;
select no_plan();

set local role postgres;
insert into public.organizations(id, name) values ('00000000-0000-4000-8000-000000000010', 'DEMO F9.27.2 üres listák') on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'owner')
on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('test.f9272_empty_list', (select list_id::text from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', null, null, 'DEMO üres önálló anyaglista', '[]'::jsonb,
  0, '00000000-0000-4000-8000-000000979701'
)), true);
select set_config('test.f9272_empty_revision', (select current_revision_id::text from public.material_preparation_lists where id=current_setting('test.f9272_empty_list')::uuid), true);
select ok(current_setting('test.f9272_empty_list') <> '', 'authenticated creator can save an empty standalone material list');
select is((select version from public.material_preparation_lists where id=current_setting('test.f9272_empty_list')::uuid), 1, 'empty draft has its first immutable version');
select is((select items_snapshot from public.material_preparation_revisions where id=current_setting('test.f9272_empty_revision')::uuid), '[]'::jsonb, 'empty draft persists an accurate empty item snapshot');
select is((select list_id::text from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', null, null, 'DEMO üres önálló anyaglista', '[]'::jsonb,
  0, '00000000-0000-4000-8000-000000979701'
)), current_setting('test.f9272_empty_list'), 'retry returns the existing empty draft');
select is((select count(*)::int from public.material_preparation_revisions where list_id=current_setting('test.f9272_empty_list')::uuid), 1, 'empty draft retry does not append a duplicate revision');

select set_config('test.f9272_updated_list', (select list_id::text from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', current_setting('test.f9272_empty_list')::uuid, null, 'DEMO lista tételekkel',
  '[{"id":"00000000-0000-4000-8000-000000979702","kind":"manual","description":"DEMO kézi tétel","materialCategory":"other","quantity":"2","unit":"piece","variantId":null,"priceId":null,"manualPriceAmount":"12.34","manualPriceKind":"gross","sourceRefs":[]}]'::jsonb,
  1, '00000000-0000-4000-8000-000000979703'
)), true);
select is((select version from public.material_preparation_lists where id=current_setting('test.f9272_updated_list')::uuid), 2, 'adding an item appends version two using the expected version');
select is((select items_snapshot->0->>'manualPriceAmount' from public.material_preparation_revisions where list_id=current_setting('test.f9272_updated_list')::uuid and revision_number=2), '12.34', 'user-entered manual price remains in the immutable item snapshot');
select is((select items_snapshot #>> '{0,priceSnapshot,provenance}' from public.material_preparation_revisions where list_id=current_setting('test.f9272_updated_list')::uuid and revision_number=2), 'user_provided', 'manual price provenance is marked as user provided');
select is((select items_snapshot from public.material_preparation_revisions where id=current_setting('test.f9272_empty_revision')::uuid), '[]'::jsonb, 'the original empty revision stays immutable after items are added');
select is((select count(*)::int from public.material_preparation_revisions where list_id=current_setting('test.f9272_empty_list')::uuid), 2, 'adding an item keeps both immutable revisions');
select throws_ok($$select * from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', current_setting('test.f9272_empty_list')::uuid, null, 'DEMO hibás ár',
  '[{"id":"00000000-0000-4000-8000-000000979704","kind":"manual","description":"DEMO hibás árú tétel","materialCategory":"other","quantity":"1","unit":"piece","variantId":null,"priceId":null,"manualPriceAmount":"1.234","manualPriceKind":"gross","sourceRefs":[]}]'::jsonb,
  2, '00000000-0000-4000-8000-000000979705'
)$$, '22023', null, 'manual price validation still rejects more than two decimal places');

reset role;
select * from finish();
rollback;
