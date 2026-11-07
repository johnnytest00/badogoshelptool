begin;
select no_plan();

select has_type('public', 'execution_project_status', 'operational project status has a separate enum');
select has_table('public', 'execution_plan_status_events', 'project status changes have an audit table');
select ok((select relrowsecurity from pg_class where oid='public.execution_plan_status_events'::regclass), 'status events enforce RLS');
select ok(not has_table_privilege('authenticated', 'public.execution_plan_status_events', 'INSERT'), 'authenticated clients cannot forge status events');
select is((select is_nullable from information_schema.columns where table_schema='public' and table_name='execution_plans' and column_name='status'), 'YES', 'existing plans may keep an unspecified status');

set local role postgres;
insert into public.organizations(id, name) values
  ('00000000-0000-4000-8000-000000000010', 'DEMO project core organization'),
  ('00000000-0000-4000-8000-000000000011', 'DEMO project core foreign organization')
on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'owner'),
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000002', 'owner')
on conflict do nothing;
insert into public.execution_plans(id, organization_id, project_id, title, request_key, created_by)
values ('00000000-0000-4000-8000-000000670001', '00000000-0000-4000-8000-000000000010', null, 'DEMO korábbi projekt', '00000000-0000-4000-8000-000000670091', '00000000-0000-4000-8000-000000000001');
insert into public.projects(id, organization_id, name, project_type, status, created_by)
values ('00000000-0000-4000-8000-000000670002', '00000000-0000-4000-8000-000000000010', 'DEMO régi projekt', 'roof_renovation', 'draft', '00000000-0000-4000-8000-000000000001');
insert into public.execution_plans(id, organization_id, project_id, title, request_key, created_by)
values ('00000000-0000-4000-8000-000000670003', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000670002', 'DEMO kapcsolt munkanapló', '00000000-0000-4000-8000-000000670093', '00000000-0000-4000-8000-000000000001');
select is((select status::text from public.execution_plans where id='00000000-0000-4000-8000-000000670001'), null, 'migration does not invent a lifecycle for existing plans');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('test.project_core_plan', (select plan_id::text from public.create_execution_plan(
  '00000000-0000-4000-8000-000000000010', null, 'DEMO új projekt', null, null, null,
  '00000000-0000-4000-8000-000000670092'
)), true);
select is((select status::text from public.execution_plans where id=current_setting('test.project_core_plan')::uuid), 'planned', 'new standalone projects start as planned');
select set_config('test.legacy_work_log', (select plan_id::text from public.create_execution_plan(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000670002', 'DEMO új kapcsolt munkanapló', null, null, null,
  '00000000-0000-4000-8000-000000670094'
)), true);
select is((select status::text from public.execution_plans where id=current_setting('test.legacy_work_log')::uuid), null, 'legacy project work logs do not receive the standalone project lifecycle');

select is((select plan_version from public.update_execution_project(
  '00000000-0000-4000-8000-000000000010', current_setting('test.project_core_plan')::uuid,
  'DEMO tetőfelújítás', 'Eresz és fedés', 'active', 'Minta ügyfél', 'Budapest',
  '2026-11-10', '2026-11-20', 0
)), 1, 'project details update with optimistic versioning');
select ok((select title='DEMO tetőfelújítás' and description='Eresz és fedés' and status='active' and client_name='Minta ügyfél' and location='Budapest' and planned_start_date='2026-11-10' and planned_end_date='2026-11-20'
  from public.execution_plans where id=current_setting('test.project_core_plan')::uuid), 'all optional project details persist together');
select is((select count(*)::integer from public.execution_plan_status_events where plan_id=current_setting('test.project_core_plan')::uuid and from_status='planned' and to_status='active'), 1, 'status transition is recorded once');

select throws_ok($$select * from public.update_execution_project(
  '00000000-0000-4000-8000-000000000010', current_setting('test.project_core_plan')::uuid,
  'DEMO stale', null, 'paused', null, null, null, null, 0
)$$, '40001', null, 'stale project update is rejected');
select throws_ok($$select * from public.update_execution_project(
  '00000000-0000-4000-8000-000000000010', current_setting('test.project_core_plan')::uuid,
  'DEMO hibás dátum', null, 'active', null, null, '2026-11-20', '2026-11-10', 1
)$$, '22007', null, 'inverted planned dates are rejected');
select throws_ok($$select * from public.update_execution_project(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000670003',
  'DEMO tiltott átírás', null, 'active', null, null, null, null, 0
)$$, '42501', null, 'legacy project work logs cannot be rewritten as standalone projects');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select throws_ok($$select * from public.update_execution_project(
  '00000000-0000-4000-8000-000000000010', current_setting('test.project_core_plan')::uuid,
  'DEMO idegen', null, 'paused', null, null, null, null, 1
)$$, '42501', null, 'a user outside the organization cannot update the project');
select is((select count(*)::integer from public.execution_plan_status_events where plan_id=current_setting('test.project_core_plan')::uuid), 0, 'status history follows organization RLS');

select * from finish();
rollback;
