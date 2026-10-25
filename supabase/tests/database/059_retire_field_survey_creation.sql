begin;
select plan(4);

-- The application path (PostgREST "authenticator" session) is verified against the running local API;
-- pgTAP runs as postgres and cannot switch the session user, so here the guard's shape is asserted.
select ok(exists (select 1 from pg_trigger where tgname = 'field_surveys_retired_no_insert' and tgrelid = 'public.field_surveys'::regclass and not tgisinternal),
  'the retirement trigger guards new survey rows');
select ok(pg_get_functiondef('private.prevent_new_field_survey()'::regprocedure) like '%session_user <> ''postgres''%',
  'only direct postgres sessions (migrations, fixtures, administration) may still insert');
select ok(not exists (select 1 from pg_trigger where tgrelid = 'public.field_surveys'::regclass and not tgisinternal
  and pg_get_triggerdef(oid) ilike '%delete%' and tgname like '%retired%'), 'existing surveys are kept: no delete or cleanup trigger was added');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select lives_ok($$select * from public.save_field_survey(null,'00000000-0000-4000-8000-000000000010',null,'gutter',
  '[{"id":"00000000-0000-4000-8000-000000000591","label":"DEMO ereszszakasz","value":8.5,"unit":"m"}]'::jsonb,null,0)$$,
  'historical fixtures in postgres test sessions still work, so earlier survey regressions keep running');
reset role;

select * from finish();
rollback;
