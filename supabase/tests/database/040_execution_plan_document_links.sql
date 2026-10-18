begin;
select no_plan();

select has_table('public', 'execution_plan_document_links', 'work log document links have a dedicated relation');
select ok((select relrowsecurity from pg_class where oid='public.execution_plan_document_links'::regclass), 'work log document links enforce RLS');
select ok(not has_table_privilege('authenticated', 'public.execution_plan_document_links', 'INSERT'), 'authenticated clients cannot forge links directly');
select ok(not has_table_privilege('authenticated', 'public.execution_plan_document_links', 'DELETE'), 'authenticated clients cannot delete links');

set local role postgres;
insert into public.organizations(id, name) values
  ('00000000-0000-4000-8000-000000000010', 'DEMO F9.42 link organization'),
  ('00000000-0000-4000-8000-000000000011', 'DEMO F9.42 other organization')
on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'owner'),
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002', 'member'),
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000002', 'owner')
on conflict do nothing;
insert into public.execution_plans(id, organization_id, project_id, title, request_key, created_by)
values ('00000000-0000-4000-8000-000000984201', '00000000-0000-4000-8000-000000000011', null, 'DEMO másik szervezet naplója', '00000000-0000-4000-8000-000000984299', '00000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('test.plan', (select plan_id::text from public.create_execution_plan(
  '00000000-0000-4000-8000-000000000010', null, 'DEMO F9.42 munkanapló', null, null, null, '00000000-0000-4000-8000-000000984202')), true);
select set_config('test.plan_two', (select plan_id::text from public.create_execution_plan(
  '00000000-0000-4000-8000-000000000010', null, 'DEMO F9.42 második munkanapló', null, null, null, '00000000-0000-4000-8000-000000984203')), true);
select set_config('test.list', (select list_id::text from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', null, null, 'DEMO F9.42 önálló lista', '[]'::jsonb, 0, '00000000-0000-4000-8000-000000984204')), true);
select set_config('test.plan_list', (select list_id::text from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', null, current_setting('test.plan')::uuid, 'DEMO F9.42 naplóhoz született lista', '[]'::jsonb, 0, '00000000-0000-4000-8000-000000984205')), true);
select set_config('test.quotation', (select quotation_id::text from public.save_standalone_quotation_draft_with_document(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000984206', null, 'DEMO F9.42 ajánlat', null,
  '[{"type":"MATERIAL","description":"DEMO tétel","quantity":"1","unit":"m","unitPrice":"","priceClass":"net","variantId":"","categoryId":"","priceId":"","priceProvenance":"missing","takeoffItemId":"","notes":""}]'::jsonb,
  0, '{"recipientSource":"manual"}'::jsonb)), true);

-- Linking a standalone list.
select set_config('test.link', (select link_id::text from public.link_execution_plan_document(
  '00000000-0000-4000-8000-000000000010', current_setting('test.plan')::uuid, 'material_list', current_setting('test.list')::uuid, '00000000-0000-4000-8000-000000984210')), true);
select ok(current_setting('test.link') <> '', 'a standalone list can be linked to a work log');
select is((select link_id::text from public.link_execution_plan_document(
  '00000000-0000-4000-8000-000000000010', current_setting('test.plan')::uuid, 'material_list', current_setting('test.list')::uuid, '00000000-0000-4000-8000-000000984210')),
  current_setting('test.link'), 'the same request key is idempotent');
select is((select link_id::text from public.link_execution_plan_document(
  '00000000-0000-4000-8000-000000000010', current_setting('test.plan')::uuid, 'material_list', current_setting('test.list')::uuid, '00000000-0000-4000-8000-000000984211')),
  current_setting('test.link'), 'a second request cannot create a duplicate active link');
select is((select count(*)::integer from public.execution_plan_document_links where material_list_id=current_setting('test.list')::uuid and unlinked_at is null), 1, 'exactly one active link exists');
select throws_ok($$select * from public.link_execution_plan_document(
  '00000000-0000-4000-8000-000000000010', current_setting('test.plan_two')::uuid, 'material_list', current_setting('test.list')::uuid, '00000000-0000-4000-8000-000000984210')$$,
  '22023', null, 'a reused request key with different content is rejected');
select throws_ok($$select * from public.link_execution_plan_document(
  '00000000-0000-4000-8000-000000000010', current_setting('test.plan')::uuid, 'material_list', current_setting('test.plan_list')::uuid, '00000000-0000-4000-8000-000000984212')$$,
  '23505', null, 'a list created inside the work log is not linked a second time');
select throws_ok($$select * from public.link_execution_plan_document(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000984201', 'material_list', current_setting('test.list')::uuid, '00000000-0000-4000-8000-000000984213')$$,
  '42501', null, 'a work log of another organization cannot be linked');

-- Quotation link.
select set_config('test.quotation_link', (select link_id::text from public.link_execution_plan_document(
  '00000000-0000-4000-8000-000000000010', current_setting('test.plan')::uuid, 'quotation', current_setting('test.quotation')::uuid, '00000000-0000-4000-8000-000000984214')), true);
select ok(current_setting('test.quotation_link') <> '', 'a standalone quotation can be linked to a work log');

-- Another member cannot see or touch private standalone documents.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.execution_plan_document_links), 0, 'links to creator-scoped documents are invisible to other members');
select throws_ok($$select * from public.link_execution_plan_document(
  '00000000-0000-4000-8000-000000000010', current_setting('test.plan_two')::uuid, 'quotation', current_setting('test.quotation')::uuid, '00000000-0000-4000-8000-000000984215')$$,
  '42501', null, 'another member cannot link a private quotation');
select throws_ok($$select * from public.unlink_execution_plan_document('00000000-0000-4000-8000-000000000010', current_setting('test.link')::uuid)$$,
  '42501', null, 'another member cannot remove the link');

-- Unlinking keeps both records and the audit stamp; the link can be created again.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select is((select removed from public.unlink_execution_plan_document('00000000-0000-4000-8000-000000000010', current_setting('test.link')::uuid)), true, 'a link can be removed');
select is((select removed from public.unlink_execution_plan_document('00000000-0000-4000-8000-000000000010', current_setting('test.link')::uuid)), false, 'removing twice is harmless');
select ok((select unlinked_at is not null and unlinked_by is not null from public.execution_plan_document_links where id=current_setting('test.link')::uuid), 'the removal is stamped, not deleted');
select is((select count(*)::integer from public.material_preparation_lists where id=current_setting('test.list')::uuid), 1, 'unlinking never deletes the material list');
select is((select count(*)::integer from public.execution_plans where id=current_setting('test.plan')::uuid), 1, 'unlinking never deletes the work log');
select isnt((select link_id::text from public.link_execution_plan_document(
  '00000000-0000-4000-8000-000000000010', current_setting('test.plan')::uuid, 'material_list', current_setting('test.list')::uuid, '00000000-0000-4000-8000-000000984216')),
  current_setting('test.link'), 'a removed link is re-created as a new link');
select is((select count(*)::integer from public.execution_plan_document_links where material_list_id=current_setting('test.list')::uuid), 2, 'history keeps both the removed and the new link');

-- Rows are immutable apart from the one-time removal stamp.
set local role postgres;
select throws_ok($$delete from public.execution_plan_document_links where id=current_setting('test.link')::uuid$$, '55000', null, 'links cannot be deleted even by the owner role');
select throws_ok($$update public.execution_plan_document_links set execution_plan_id=current_setting('test.plan_two')::uuid where id=current_setting('test.link')::uuid$$, '55000', null, 'links cannot be re-pointed');

select * from finish();
rollback;
