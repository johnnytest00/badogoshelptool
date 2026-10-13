begin;

select plan(8);

select ok('finalized' = any(enum_range(null::public.quotation_status)::text[]), 'quotation status includes finalized');
select ok(exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'quotations' and column_name = 'finalized_revision_id'), 'finalized revision is persisted');
select ok(exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'quotations' and column_name = 'finalized_at'), 'finalization timestamp is persisted');
select ok(exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'quotations' and column_name = 'finalized_by'), 'finalizing user is persisted');
select ok(exists (select 1 from pg_constraint where conname = 'quotations_finalization_state_ck'), 'finalization state is constrained');
select ok(exists (select 1 from pg_trigger where tgrelid = 'public.quotations'::regclass and tgname = 'quotations_finalization_guard'), 'finalized quotations are guarded');
select ok(exists (select 1 from information_schema.routines where routine_schema = 'public' and routine_name = 'finalize_quotation'), 'finalization RPC exists');
select ok((select has_function_privilege('authenticated', 'public.finalize_quotation(uuid,uuid,uuid,uuid,integer)', 'EXECUTE')), 'only authenticated users can execute finalization RPC');

select * from finish();
rollback;
