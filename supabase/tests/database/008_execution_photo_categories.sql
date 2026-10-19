begin;

select plan(10);
\ir _demo_workflow_fixture.inc
select ok(exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'execution_photos' and column_name = 'category'), 'photo category column exists');
select ok(exists(select 1 from pg_constraint where conname = 'execution_photos_category_ck'), 'photo category check exists');
select ok(exists(select 1 from pg_proc where proname = 'set_execution_photo_category'), 'category update RPC exists');
select ok((select has_function_privilege('authenticated', 'public.set_execution_photo_category(uuid,uuid,text)', 'EXECUTE')), 'members can execute category update RPC');
select ok((select has_column_privilege('authenticated', 'public.execution_photos', 'category', 'UPDATE')), 'members have category-only photo update privilege');
select ok(exists(select 1 from pg_policies where policyname = 'execution_photos_member_category_update'), 'category update policy exists');

set local role postgres;
-- Saját DEMO fixture a tranzakción belül (nem támaszkodik korábbi adatra).
insert into public.execution_plans (id, organization_id, project_id, title, created_by)
values ('00000000-0000-4000-8000-000000000721', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', 'DEMO kategóriás terv', '00000000-0000-4000-8000-000000000001');
insert into public.execution_tasks (id, organization_id, plan_id, title, created_by)
values ('00000000-0000-4000-8000-000000000722', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000721', 'DEMO kategóriás feladat', '00000000-0000-4000-8000-000000000001');
insert into public.execution_journal_entries (id, organization_id, plan_id, task_id, work_date, content, created_by)
values ('00000000-0000-4000-8000-000000000723', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000721', '00000000-0000-4000-8000-000000000722', '2026-10-12', 'DEMO kategóriás naplóbejegyzés', '00000000-0000-4000-8000-000000000001');
insert into public.execution_photos (id, organization_id, project_id, plan_id, task_id, journal_entry_id, object_key, display_filename, mime_type, file_size, caption, uploaded_by, request_key)
values ('00000000-0000-4000-8000-000000000720', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000721', '00000000-0000-4000-8000-000000000722', '00000000-0000-4000-8000-000000000723', '00000000-0000-4000-8000-000000000010/00000000-0000-4000-8000-000000000030/00000000-0000-4000-8000-000000000721/00000000-0000-4000-8000-000000000720.png', 'DEMO kategorizálható fénykép.png', 'image/png', 1024, 'DEMO kategória teszt', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000720');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select ok(public.set_execution_photo_category('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000720', 'before'), 'valid category update succeeds');
select is((select category from public.execution_photos where id = '00000000-0000-4000-8000-000000000720'), 'before', 'category persists');
select is((select caption from public.execution_photos where id = '00000000-0000-4000-8000-000000000720'), 'DEMO kategória teszt', 'caption remains unchanged');
select throws_ok($$select public.set_execution_photo_category('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000720', 'invalid')$$, 'P0001', null, 'invalid category is rejected');

select * from finish();
rollback;
