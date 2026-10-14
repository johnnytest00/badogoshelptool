begin;
select plan(12);

select ok((select relrowsecurity from pg_class where oid='public.gable_metal_tile_save_operations'::regclass), 'metal tile operation ledger has RLS');
select ok(not has_table_privilege('authenticated', 'public.gable_metal_tile_save_operations', 'SELECT'), 'authenticated cannot read operation ledger');
select ok(not has_table_privilege('authenticated', 'public.gable_metal_tile_save_operations', 'INSERT'), 'authenticated cannot forge operation ledger rows');
select ok(not has_table_privilege('tetopro_covering_writer', 'public.calculations', 'INSERT'), 'restricted writer has no calculations table insert grant');
select ok(not has_table_privilege('tetopro_covering_writer', 'public.calculation_revisions', 'INSERT'), 'restricted writer has no revisions table insert grant');
select ok(has_function_privilege('tetopro_covering_writer', 'public.save_gable_metal_tile_covering_calculation(uuid,uuid,uuid,integer,text,uuid,uuid,uuid,jsonb,jsonb,jsonb,uuid)', 'EXECUTE'), 'restricted writer may call the save RPC');
select ok(not has_function_privilege('authenticated', 'public.save_gable_metal_tile_covering_calculation(uuid,uuid,uuid,integer,text,uuid,uuid,uuid,jsonb,jsonb,jsonb,uuid)', 'EXECUTE'), 'authenticated cannot execute the save RPC');
select ok(not has_function_privilege('anon', 'public.save_gable_metal_tile_covering_calculation(uuid,uuid,uuid,integer,text,uuid,uuid,uuid,jsonb,jsonb,jsonb,uuid)', 'EXECUTE'), 'anon cannot execute the save RPC');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='calculations' and policyname='metal_tile_calculations_insert_guard' and permissive='RESTRICTIVE'), 'direct authenticated calculation insert is restricted');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='calculation_revisions' and policyname='metal_tile_revisions_insert_guard' and permissive='RESTRICTIVE'), 'direct authenticated revision insert is restricted');
select ok(exists(select 1 from pg_trigger where tgrelid='public.calculation_revisions'::regclass and tgname='calculation_revisions_immutable' and not tgisinternal), 'shared calculation revisions remain immutable');

set local role authenticated;
select throws_ok($$select * from public.save_gable_metal_tile_covering_calculation(
  '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',0,'DEMO forged',null,null,null,
  '{}'::jsonb,'{"geometry":{},"covering":{"status":"VALID","totalSheetCount":999999}}'::jsonb,
  '{"calculation":"forged"}'::jsonb,'00000000-0000-4000-8000-000000000004')$$,
  '42501', null, 'authenticated direct forged-result RPC attempt is denied');
reset role;

select * from finish();
rollback;
