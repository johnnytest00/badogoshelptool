begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(27);

select ok(not has_function_privilege('authenticated','public.save_standalone_construction_calculation(uuid,uuid,uuid,integer,text,text,jsonb,jsonb,uuid,uuid)','EXECUTE'),
  'authenticated clients cannot call the authoritative construction writer');
select ok(has_function_privilege('tetopro_covering_writer','public.save_standalone_construction_calculation(uuid,uuid,uuid,integer,text,text,jsonb,jsonb,uuid,uuid)','EXECUTE'),
  'the restricted server writer remains the only application writer');
select ok(case when pg_catalog.to_regclass('private.construction_revision_attestations') is null then false
  else not has_table_privilege('authenticated','private.construction_revision_attestations','SELECT') end,
  'browser sessions cannot read construction revision attestations');
select is((
  select count(*)::integer
  from private.construction_revision_attestations a
  join public.calculation_revisions r
    on r.id = a.calculation_revision_id
    and r.organization_id = a.organization_id
    and r.calculation_id = a.calculation_id
  join public.calculations c
    on c.id = r.calculation_id
    and c.organization_id = r.organization_id
  where not exists (
    select 1
    from public.standalone_construction_save_operations o
    where o.organization_id = r.organization_id
      and o.calculation_id = r.calculation_id
      and o.calculation_revision_id = r.id
      and o.revision_number = r.revision_number
      and o.created_by = r.created_by
      and o.request_payload->>'calculationId' = r.calculation_id::text
      and o.request_payload->>'expected' = (r.revision_number - 1)::text
      and o.request_payload->>'type' = c.calculator_type
      and o.request_payload->'input' = r.input_snapshot
      and o.request_payload->'output' = r.output_snapshot
  )
), 0, 'every attestation has exact prior restricted-writer ledger evidence');

create function pg_temp.qa08_input(p_calculator text default 'roof.rafter-cut') returns jsonb language sql immutable as $$
  select pg_catalog.jsonb_build_object('schemaVersion','construction-suite.input.v1','calculatorId',p_calculator,
    'fields',pg_catalog.jsonb_build_object('horizontalHalfSpanMm','3000','riseMm','2000','eaveProjectionMm','500','seatCutHeightMm','0'),
    'material',case when p_calculator in ('roof.material-takeoff','roof.timber-cutlist') then
      '{"requested":{"timber":true,"underlay":false,"covering":false},"layout":{},"specs":{}}'::jsonb else 'null'::jsonb end);
$$;
create function pg_temp.qa08_rafter_output(p_value numeric default 4206.476) returns jsonb language sql immutable as $$
  select pg_catalog.jsonb_build_object('schemaVersion','construction-suite.output.v1','calculatorId','roof.rafter-cut','lines',
    pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('label','Szarufa teljes hossza','value',p_value,'unit','mm')),
    'takeoff',null,'cutList',null,'specifications',null);
$$;
create function pg_temp.qa08_timber_output(p_status text default 'VALID') returns jsonb language sql immutable as $$
  select pg_catalog.jsonb_build_object('schemaVersion','construction-suite.output.v1','calculatorId','roof.timber-cutlist',
    'lines',pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('label','Tetőfelület','value',84.85,'unit','m²')),
    'takeoff',pg_catalog.jsonb_build_object('status',p_status,'parts',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('id','rafters','label','Szarufa','status','available','quantities','[]'::jsonb))),
    'cutList','{"rafters":[{"lengthMm":4883,"count":26}],"battens":[]}'::jsonb,
    'specifications','{"schemaVersion":1,"persisted":false,"groups":{"rafter":{"issues":{},"invalidKeys":[]}},"gableOverhangs":null}'::jsonb);
$$;
create function pg_temp.qa08_attestation_count(p_revision_id uuid) returns integer language plpgsql as $$
declare v_count integer;
begin
  if pg_catalog.to_regclass('private.construction_revision_attestations') is null then return 0; end if;
  execute 'select count(*)::integer from private.construction_revision_attestations where calculation_revision_id=$1'
    into v_count using p_revision_id;
  return v_count;
end;
$$;

select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000600001','00000000-0000-4000-8000-000000600101',0,
  'construction.roof.rafter-cut','DEMO QA08 üres',pg_temp.qa08_input(),
  '{"schemaVersion":"construction-suite.output.v1","calculatorId":"roof.rafter-cut","lines":[]}'::jsonb,
  '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'the writer rejects an empty construction output');
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000600002','00000000-0000-4000-8000-000000600102',0,
  'construction.roof.rafter-cut','DEMO QA08 hiányzó mező',pg_temp.qa08_input(),
  '{"schemaVersion":"construction-suite.output.v1","calculatorId":"roof.rafter-cut"}'::jsonb,
  '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'the writer rejects a missing required output field');
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000600003','00000000-0000-4000-8000-000000600103',0,
  'construction.roof.timber-cutlist','DEMO QA08 hiányos',pg_temp.qa08_input('roof.timber-cutlist'),pg_temp.qa08_timber_output('INCOMPLETE'),
  '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'the writer rejects a syntactically valid but incomplete result');
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000600004','00000000-0000-4000-8000-000000600104',0,
  'construction.roof.rafter-cut','DEMO QA08 hamis complete',pg_temp.qa08_input(),
  '{"schemaVersion":"construction-suite.output.v1","calculatorId":"roof.rafter-cut","lines":[],"completeness":{"status":"complete"}}'::jsonb,
  '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'a caller supplied complete flag cannot override the output contract');
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000600005','00000000-0000-4000-8000-000000600105',0,
  'construction.roof.timber-cutlist','DEMO QA08 unsupported',pg_temp.qa08_input('roof.timber-cutlist'),pg_temp.qa08_timber_output('UNSUPPORTED'),
  '00000000-0000-4000-8000-000000000001')$$, '22023', null, 'the writer rejects an unsupported material calculation');

select set_config('test.qa08.valid_revision', (select calculation_revision_id::text from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000600010','00000000-0000-4000-8000-000000600110',0,
  'construction.roof.rafter-cut','DEMO QA08 valid',pg_temp.qa08_input(),pg_temp.qa08_rafter_output(),
  '00000000-0000-4000-8000-000000000001')), true);
select ok(current_setting('test.qa08.valid_revision') <> '', 'the restricted writer stores a complete server result');
select is(pg_temp.qa08_attestation_count(current_setting('test.qa08.valid_revision')::uuid),
  1, 'a trusted save atomically attests its immutable revision');
select is((select reused from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000600010','00000000-0000-4000-8000-000000600110',0,
  'construction.roof.rafter-cut','DEMO QA08 valid',pg_temp.qa08_input(),pg_temp.qa08_rafter_output(),
  '00000000-0000-4000-8000-000000000001')), true, 'an identical save retry reuses the attested revision');
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000600010','00000000-0000-4000-8000-000000600111',0,
  'construction.roof.rafter-cut','DEMO QA08 stale',pg_temp.qa08_input(),pg_temp.qa08_rafter_output(),
  '00000000-0000-4000-8000-000000000001')$$, '40001', null, 'a stale expected revision cannot append a competing revision');

-- A privileged fixture simulates a legacy or forged row that did not pass the restricted writer.
insert into public.calculations(id,organization_id,project_id,roof_model_id,ownership_scope,created_by,calculator_type,display_name,status)
values('00000000-0000-4000-8000-000000600020','00000000-0000-4000-8000-000000000010',null,null,'standalone',
  '00000000-0000-4000-8000-000000000001','construction.roof.timber-cutlist','DEMO QA08 unattested','current');
insert into public.calculation_revisions(id,organization_id,calculation_id,revision_number,input_schema_version,calculator_implementation_version,
  input_snapshot,output_snapshot,data_provenance,validation_status,warnings,created_by)
values('00000000-0000-4000-8000-000000600021','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000600020',1,
  'construction-suite.input.v1','construction-suite.output.v1',pg_temp.qa08_input('roof.timber-cutlist'),pg_temp.qa08_timber_output(),
  '{"scope":"standalone","input":"user_provided","output":"server_recomputed"}','user_provided','[]',
  '00000000-0000-4000-8000-000000000001');
update public.calculations set current_revision_id='00000000-0000-4000-8000-000000600021' where id='00000000-0000-4000-8000-000000600020';
insert into public.execution_plans(id,organization_id,project_id,title,request_key,created_by) values
  ('00000000-0000-4000-8000-000000600030','00000000-0000-4000-8000-000000000010',null,'DEMO QA08 munkanapló','00000000-0000-4000-8000-000000600130','00000000-0000-4000-8000-000000000001');
select is(pg_temp.qa08_attestation_count('00000000-0000-4000-8000-000000600021'),
  0, 'a direct privileged fixture is not mistaken for a trusted server save');

set local role authenticated;
select throws_ok($$select * from public.link_execution_plan_document(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000600030','calculation',
  '00000000-0000-4000-8000-000000600021','00000000-0000-4000-8000-000000600131')$$,
  '42501', null, 'a missing or expired authenticated context cannot link a calculation');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select throws_ok($$select * from public.link_execution_plan_document(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000600030','calculation',
  '00000000-0000-4000-8000-000000600021','00000000-0000-4000-8000-000000600132')$$,
  '22023', null, 'authenticated RPC cannot link a forged but syntactically complete unattested revision');
select is((select count(*)::integer from public.execution_plan_document_links where calculation_revision_id='00000000-0000-4000-8000-000000600021'),
  0, 'a rejected calculation link leaves no orphan record');
select throws_ok($$select * from public.save_standalone_quotation_from_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000600140',null,'DEMO QA08 forged quote',null,
  '[{"type":"MATERIAL","description":"DEMO szarufa","quantity":"26","unit":"db","unitPrice":"","priceClass":"net","variantId":"","categoryId":"","priceId":"","priceProvenance":"missing","takeoffItemId":"","notes":""}]'::jsonb,
  0,'{"recipientSource":"manual"}'::jsonb,'00000000-0000-4000-8000-000000600021','[{"quotationLineIndex":0,"sourceKey":"cut/rafters/0"}]'::jsonb)$$,
  '22023', null, 'authenticated RPC cannot create a quotation source from an unattested revision');
select is((select count(*)::integer from public.quotations where name='DEMO QA08 forged quote'),
  0, 'a rejected quotation source leaves no orphan quotation');

select set_config('test.qa08.link', (select link_id::text from public.link_execution_plan_document(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000600030','calculation',
  current_setting('test.qa08.valid_revision')::uuid,'00000000-0000-4000-8000-000000600150')), true);
select ok(current_setting('test.qa08.link') <> '', 'an attested complete revision can be linked');
select is((select created from public.link_execution_plan_document(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000600030','calculation',
  current_setting('test.qa08.valid_revision')::uuid,'00000000-0000-4000-8000-000000600150')), false, 'a link retry is idempotent');
select is((select count(*)::integer from public.calculation_revisions where id=current_setting('test.qa08.valid_revision')::uuid),
  1, 'the creator can retrieve the exact immutable attested revision');
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000600099','00000000-0000-4000-8000-000000600199',0,
  'construction.roof.rafter-cut','DEMO QA08 forged numeric',pg_temp.qa08_input(),pg_temp.qa08_rafter_output(999999),
  '00000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'an authenticated client cannot submit a valid-looking but input-inconsistent output to the writer');
reset role;

insert into public.organizations(id,name) values('00000000-0000-4000-8000-000000000061','DEMO QA08 másik műhely');
insert into public.organization_members(organization_id,user_id,role) values
  ('00000000-0000-4000-8000-000000000061','00000000-0000-4000-8000-000000000002','owner');
insert into public.execution_plans(id,organization_id,project_id,title,request_key,created_by) values
  ('00000000-0000-4000-8000-000000600060','00000000-0000-4000-8000-000000000061',null,'DEMO QA08 idegen napló','00000000-0000-4000-8000-000000600160','00000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select throws_ok($$select * from public.link_execution_plan_document(
  '00000000-0000-4000-8000-000000000061','00000000-0000-4000-8000-000000600060','calculation',
  current_setting('test.qa08.valid_revision')::uuid,'00000000-0000-4000-8000-000000600161')$$,
  '42501', null, 'a calculation revision cannot cross organization boundaries');
reset role;

select throws_ok($$update public.calculation_revisions set output_snapshot='{}'::jsonb
  where id=current_setting('test.qa08.valid_revision')::uuid$$, null, null, 'attested calculation revisions remain immutable');
select is((select count(*)::integer from public.execution_plan_document_links where id=current_setting('test.qa08.link')::uuid),
  1, 'the accepted link still points to exactly one immutable revision');
select is((select count(*)::integer from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000600010'),
  1, 'failed retries and attacks do not append hidden revisions');

select * from finish();
rollback;
