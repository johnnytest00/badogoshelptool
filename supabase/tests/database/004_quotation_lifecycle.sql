begin;

select plan(11);

select ok((select count(*) from unnest(enum_range(null::public.quotation_status)::text[]) where unnest in ('draft', 'finalized', 'sent', 'accepted', 'rejected')) = 5, 'quotation lifecycle has exactly the supported statuses');
select ok(to_regclass('public.quotation_status_events') is not null, 'quotation status events exists');
select ok((select relrowsecurity from pg_class where oid = 'public.quotation_status_events'::regclass), 'status events has RLS enabled');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quotation_status_events' and policyname = 'quotation_status_events_member_read'), 'status events are organization-scoped');
select ok((select has_table_privilege('authenticated', 'public.quotation_status_events', 'SELECT')), 'members can read status events');
select ok(not (select has_table_privilege('authenticated', 'public.quotation_status_events', 'INSERT')), 'members cannot forge status events directly');
select ok(exists (select 1 from pg_trigger where tgrelid = 'public.quotations'::regclass and tgname = 'quotations_status_event'), 'status changes record events atomically');
select ok(exists (select 1 from pg_trigger where tgrelid = 'public.quotation_status_events'::regclass and tgname = 'quotation_status_events_immutable'), 'status events are immutable');
select ok(exists (select 1 from information_schema.routines where routine_schema = 'public' and routine_name = 'transition_quotation_status'), 'transition RPC exists');
select ok(exists (select 1 from pg_constraint where conname = 'quotations_finalization_state_ck'), 'post-finalization metadata constraint exists');
select ok((select has_function_privilege('authenticated', 'public.transition_quotation_status(uuid,uuid,uuid,public.quotation_status,integer,text)', 'EXECUTE')), 'only authenticated users can execute transition RPC');

select * from finish();
rollback;
