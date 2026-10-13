begin;

select plan(8);

select ok(to_regclass('public.quotations') is not null, 'quotations exists');
select ok(to_regclass('public.quotation_revisions') is not null, 'quotation revisions exists');
select ok((select relrowsecurity from pg_class where oid = 'public.quotations'::regclass), 'quotations has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.quotation_revisions'::regclass), 'quotation revisions has RLS enabled');
select ok((select count(*) from pg_policies where schemaname = 'public' and tablename = 'quotations') >= 3, 'quotations has member RLS policies');
select ok((select count(*) from pg_policies where schemaname = 'public' and tablename = 'quotation_revisions') >= 2, 'quotation revisions has member RLS policies');
select ok(exists (select 1 from pg_trigger where tgrelid = 'public.quotation_revisions'::regclass and tgname = 'quotation_revisions_immutable'), 'quotation revisions immutable trigger exists');
select ok(exists (select 1 from information_schema.routines where routine_schema = 'public' and routine_name = 'save_quotation_draft'), 'quotation save RPC exists');

select * from finish();
rollback;
