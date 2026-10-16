begin;
select no_plan();

select has_table('public', 'field_survey_execution_plan_links', 'survey to execution plan links have a dedicated relation');
select ok((select relrowsecurity from pg_class where oid='public.field_survey_execution_plan_links'::regclass), 'survey-plan links enforce RLS');
select is((select is_nullable from information_schema.columns where table_schema='public' and table_name='execution_plans' and column_name='project_id'), 'YES', 'execution plans can exist without projects');
select ok(not has_table_privilege('authenticated', 'public.field_survey_execution_plan_links', 'INSERT'), 'authenticated clients cannot forge survey-plan links directly');

set local role postgres;
insert into public.organizations(id, name) values ('00000000-0000-4000-8000-000000000010', 'DEMO F9.19 workflow organization') on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'owner'),
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002', 'member')
on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('test.standalone_plan_id', (select plan_id::text from public.create_execution_plan(
  '00000000-0000-4000-8000-000000000010', null, 'DEMO önálló kivitelezési terv', null, null, null,
  '00000000-0000-4000-8000-000000979121'
)), true);
select isnt(current_setting('test.standalone_plan_id'), '', 'standalone plan creates without a project');
select ok((select project_id is null from public.execution_plans where id=current_setting('test.standalone_plan_id')::uuid), 'standalone plan stores no synthetic project');
select is((select plan_id::text from public.create_execution_plan(
  '00000000-0000-4000-8000-000000000010', null, 'DEMO önálló kivitelezési terv', null, null, null,
  '00000000-0000-4000-8000-000000979121'
)), current_setting('test.standalone_plan_id'), 'same create request returns the same plan');
select throws_ok($$select * from public.create_execution_plan(
  '00000000-0000-4000-8000-000000000010', null, 'DEMO eltérő név', null, null, null,
  '00000000-0000-4000-8000-000000979121'
)$$, '22023', null, 'reusing a plan request key with changed content is rejected');

select set_config('test.survey_id', (select survey_id::text from public.save_field_survey(
  null, '00000000-0000-4000-8000-000000000010', null, 'gutter',
  '[{"id":"00000000-0000-4000-8000-000000979131","label":"DEMO ereszszakasz","value":8.5,"unit":"m"}]'::jsonb,
  'DEMO F9.19 revíziópontos kapcsolat', 0
)), true);
select set_config('test.survey_revision_v1', (select id::text from public.field_survey_revisions where survey_id=current_setting('test.survey_id')::uuid and version=1), true);
select set_config('test.link_v1', (select link_id::text from public.link_field_survey_execution_plan(
  '00000000-0000-4000-8000-000000000010', current_setting('test.survey_id')::uuid,
  current_setting('test.survey_revision_v1')::uuid, current_setting('test.standalone_plan_id')::uuid,
  '00000000-0000-4000-8000-000000979122'
)), true);
select ok((select survey_revision_id=current_setting('test.survey_revision_v1')::uuid and r.version=1
  from public.field_survey_execution_plan_links l join public.field_survey_revisions r on r.id=l.survey_revision_id
  where l.id=current_setting('test.link_v1')::uuid), 'link records the exact V1 survey revision');
select is((select link_id::text from public.link_field_survey_execution_plan(
  '00000000-0000-4000-8000-000000000010', current_setting('test.survey_id')::uuid,
  current_setting('test.survey_revision_v1')::uuid, current_setting('test.standalone_plan_id')::uuid,
  '00000000-0000-4000-8000-000000979122'
)), current_setting('test.link_v1'), 'same link request returns the same relationship');

select set_config('test.created_from_survey', (select plan_id::text from public.create_execution_plan_from_survey(
  '00000000-0000-4000-8000-000000000010', current_setting('test.survey_id')::uuid,
  current_setting('test.survey_revision_v1')::uuid, 'DEMO surveyból létrehozott terv',
  '00000000-0000-4000-8000-000000979123'
)), true);
select ok((select project_id is null from public.execution_plans where id=current_setting('test.created_from_survey')::uuid), 'survey can create a plan without creating a project');
select is((select survey_revision_id::text from public.field_survey_execution_plan_links where execution_plan_id=current_setting('test.created_from_survey')::uuid), current_setting('test.survey_revision_v1'), 'created plan links its exact survey source revision');
select is((select plan_id::text from public.create_execution_plan_from_survey(
  '00000000-0000-4000-8000-000000000010', current_setting('test.survey_id')::uuid,
  current_setting('test.survey_revision_v1')::uuid, 'DEMO surveyból létrehozott terv',
  '00000000-0000-4000-8000-000000979123'
)), current_setting('test.created_from_survey'), 'lost-response retry returns the same plan');

select is((select version from public.save_field_survey(
  current_setting('test.survey_id')::uuid, '00000000-0000-4000-8000-000000000010', null, 'gutter',
  '[{"id":"00000000-0000-4000-8000-000000979131","label":"DEMO ereszszakasz","value":9.25,"unit":"m"}]'::jsonb,
  'DEMO F9.19 új revízió', 1
)), 2, 'survey edit creates V2');
select ok((select measurements->0->>'value'='8.5' from public.field_survey_revisions where id=current_setting('test.survey_revision_v1')::uuid), 'linked V1 history remains unchanged after V2');
select isnt((select link_id::text from public.link_field_survey_execution_plan(
  '00000000-0000-4000-8000-000000000010', current_setting('test.survey_id')::uuid,
  (select id from public.field_survey_revisions where survey_id=current_setting('test.survey_id')::uuid and version=2),
  current_setting('test.standalone_plan_id')::uuid, '00000000-0000-4000-8000-000000979124'
)), current_setting('test.link_v1'), 'new survey revision creates a distinct link');
select is((select count(*)::int from public.field_survey_execution_plan_links where execution_plan_id=current_setting('test.standalone_plan_id')::uuid), 2, 'plan can retain distinct exact survey revisions');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select throws_ok($$select * from public.link_field_survey_execution_plan(
  '00000000-0000-4000-8000-000000000010', current_setting('test.survey_id')::uuid,
  current_setting('test.survey_revision_v1')::uuid, current_setting('test.standalone_plan_id')::uuid,
  '00000000-0000-4000-8000-000000979125'
)$$, '42501', null, 'organization peer cannot attach a creator-scoped standalone survey');
select is((select count(*)::int from public.field_survey_execution_plan_links where id=current_setting('test.link_v1')::uuid), 0, 'peer cannot read creator-scoped survey-plan links');
select is((select count(*)::int from public.execution_plans where id=current_setting('test.standalone_plan_id')::uuid), 1, 'authorized organization member retains plan visibility');

reset role;
select throws_ok($$update public.field_survey_execution_plan_links set request_key=gen_random_uuid() where id=current_setting('test.link_v1')::uuid$$, '55000', null, 'survey-plan source links are immutable');
select * from finish();
rollback;
