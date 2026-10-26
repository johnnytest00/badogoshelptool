begin;
select plan(17);

select ok(not has_function_privilege('authenticated','public.save_standalone_construction_calculation(uuid,uuid,uuid,integer,text,text,jsonb,jsonb,uuid,uuid)','EXECUTE'),
  'browser sessions cannot call the construction writer');
select ok(has_function_privilege('tetopro_covering_writer','public.save_standalone_construction_calculation(uuid,uuid,uuid,integer,text,text,jsonb,jsonb,uuid,uuid)','EXECUTE'),
  'the restricted writer can call it');
select ok(not has_table_privilege('authenticated','public.standalone_construction_save_operations','SELECT'),
  'the operation ledger is not readable by browser sessions');

create function pg_temp.c_input(p_half integer default 3000) returns jsonb language sql immutable as $$
  select pg_catalog.jsonb_build_object('schemaVersion','construction-suite.input.v1','calculatorId','roof.rafter-cut',
    'fields',pg_catalog.jsonb_build_object('horizontalHalfSpanMm',p_half::text,'riseMm','2000','eaveProjectionMm','500','seatCutHeightMm','0'));
$$;
create function pg_temp.c_output() returns jsonb language sql immutable as $$
  select '{"schemaVersion":"construction-suite.output.v1","calculatorId":"roof.rafter-cut","lines":[{"label":"Szarufa teljes hossza","value":4206.476,"unit":"mm"}]}'::jsonb;
$$;

-- Direct browser writes of construction rows are blocked by the restrictive policies.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select throws_ok($$insert into public.calculations(id,organization_id,ownership_scope,created_by,calculator_type,display_name,status)
  values('00000000-0000-4000-8000-000000560099','00000000-0000-4000-8000-000000000010','standalone','00000000-0000-4000-8000-000000000001','construction.roof.rafter-cut','DEMO közvetlen','current')$$,
  '42501',null,'a browser session cannot insert a construction calculation');
reset role;

-- The writer is security definer and authorizes by p_actor_id; role gating is asserted above.
select lives_ok($$select * from public.save_standalone_construction_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000560001',
  '00000000-0000-4000-8000-000000560101',0,'construction.roof.rafter-cut','DEMO szarufa',pg_temp.c_input(),pg_temp.c_output(),'00000000-0000-4000-8000-000000000001')$$,
  'first revision is created');
select is((select reused from public.save_standalone_construction_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000560001',
  '00000000-0000-4000-8000-000000560101',0,'construction.roof.rafter-cut','DEMO szarufa',pg_temp.c_input(),pg_temp.c_output(),'00000000-0000-4000-8000-000000000001')),
  true,'an identical retry reuses the saved revision');
select throws_ok($$select * from public.save_standalone_construction_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000560001',
  '00000000-0000-4000-8000-000000560101',0,'construction.roof.rafter-cut','DEMO szarufa',pg_temp.c_input(3100),pg_temp.c_output(),'00000000-0000-4000-8000-000000000001')$$,
  '22023',null,'a reused operation id with a different payload is rejected');
select throws_ok($$select * from public.save_standalone_construction_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000560001',
  '00000000-0000-4000-8000-000000560102',0,'construction.roof.rafter-cut','DEMO szarufa',pg_temp.c_input(3100),pg_temp.c_output(),'00000000-0000-4000-8000-000000000001')$$,
  '40001',null,'a stale expected revision is a conflict');
select is((select revision_number from public.save_standalone_construction_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000560001',
  '00000000-0000-4000-8000-000000560103',1,'construction.roof.rafter-cut','DEMO szarufa v2',pg_temp.c_input(3100),pg_temp.c_output(),'00000000-0000-4000-8000-000000000001')),
  2,'the next revision is appended');
select throws_ok($$select * from public.save_standalone_construction_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000560001',
  '00000000-0000-4000-8000-000000560104',2,'construction.roof.truss-members','DEMO más típus',
  jsonb_set(pg_temp.c_input(),'{calculatorId}','"roof.truss-members"'),jsonb_set(pg_temp.c_output(),'{calculatorId}','"roof.truss-members"'),'00000000-0000-4000-8000-000000000001')$$,
  '42501',null,'an existing calculation cannot change calculator type');
select throws_ok($$select * from public.save_standalone_construction_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000560002',
  '00000000-0000-4000-8000-000000560105',0,'construction.stair.wood.spiral','DEMO lépcső',pg_temp.c_input(),pg_temp.c_output(),'00000000-0000-4000-8000-000000000001')$$,
  '22023',null,'calculator types outside the approved roof scope are rejected');
select throws_ok($$select * from public.save_standalone_construction_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000560002',
  '00000000-0000-4000-8000-000000560106',0,'construction.roof.rafter-cut','DEMO eltérő ID',pg_temp.c_input(),jsonb_set(pg_temp.c_output(),'{calculatorId}','"roof.truss-members"'),'00000000-0000-4000-8000-000000000001')$$,
  '22023',null,'an output snapshot for another calculator is rejected');
select throws_ok($$select * from public.save_standalone_construction_calculation('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000560003',
  '00000000-0000-4000-8000-000000560107',0,'construction.roof.rafter-cut','DEMO kívülálló',pg_temp.c_input(),pg_temp.c_output(),'00000000-0000-4000-8000-000000000002')$$,
  '42501',null,'a non-member cannot save into the organization');

select is((select ownership_scope||':'||coalesce(project_id::text,'')||':'||created_by::text from public.calculations where id='00000000-0000-4000-8000-000000560001'),
  'standalone::00000000-0000-4000-8000-000000000001','the calculation is creator-scoped and project-free');
select is((select input_snapshot #>> '{fields,horizontalHalfSpanMm}' from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000560001' and revision_number=1),
  '3000','the first revision keeps its own input');
select throws_ok($$update public.calculation_revisions set input_snapshot='{}'::jsonb where calculation_id='00000000-0000-4000-8000-000000560001' and revision_number=1$$,
  null,null,'saved revisions are immutable');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from public.calculations where id='00000000-0000-4000-8000-000000560001'),0,'another user cannot read the creator-scoped calculation');
reset role;

select * from finish();
rollback;
