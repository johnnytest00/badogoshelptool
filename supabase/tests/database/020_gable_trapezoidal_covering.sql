begin;
select plan(9);

select has_function('public', 'save_gable_trapezoidal_covering_calculation', 'covering revision save RPC exists');
select has_table('public', 'gable_covering_save_operations', 'operation idempotency ledger exists');
select ok(not has_table_privilege('authenticated', 'public.gable_covering_save_operations', 'SELECT'), 'operation payload ledger is not readable by authenticated clients');
select ok(not has_function_privilege('anon', 'public.save_gable_trapezoidal_covering_calculation(uuid,uuid,uuid,integer,text,uuid,uuid,uuid,jsonb,jsonb,jsonb,uuid)', 'EXECUTE'), 'anonymous callers cannot execute covering save RPC');
select ok(not has_function_privilege('authenticated', 'public.save_gable_trapezoidal_covering_calculation(uuid,uuid,uuid,integer,text,uuid,uuid,uuid,jsonb,jsonb,jsonb,uuid)', 'EXECUTE'), 'authenticated clients cannot execute covering save RPC');
select ok(has_function_privilege('tetopro_covering_writer', 'public.save_gable_trapezoidal_covering_calculation(uuid,uuid,uuid,integer,text,uuid,uuid,uuid,jsonb,jsonb,jsonb,uuid)', 'EXECUTE'), 'only dedicated server login can execute covering save RPC');
select ok(not has_table_privilege('tetopro_covering_writer', 'public.calculation_revisions', 'INSERT'), 'dedicated writer has no direct revision insert grant');
select ok(not has_table_privilege('tetopro_covering_writer', 'public.calculations', 'UPDATE'), 'dedicated writer has no direct calculation update grant');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select throws_ok($$select * from public.save_gable_trapezoidal_covering_calculation(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000930',
  '00000000-0000-4000-8000-000000000931', 0, 'DEMO fedés', null, null, null,
  '{"calculatorType":"roof.gable.trapezoidal-covering","scope":"standalone","source":{"mode":"standalone","geometrySource":"manual_user_input"},"coveringInput":{}}',
  '{"geometry":{},"covering":{"status":"VALID","totalSheetCount":999999}}', '{"geometry":"manual_user_provided"}',
  '00000000-0000-4000-8000-000000000001'
)$$, '42501', null, 'direct authenticated forged output call is denied');

select * from finish();
rollback;
