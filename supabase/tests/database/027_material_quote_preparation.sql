begin;
select plan(15);

select has_column('public', 'quotations', 'creation_operation_id', 'project quotation draft stores a first-save retry key');
select has_index('public', 'quotations', 'quotations_creation_operation_idx', 'retry key is unique per organization');
select ok(exists (select 1 from pg_trigger where tgrelid='public.quotation_revisions'::regclass and tgname='quotation_revisions_takeoff_source_guard' and not tgisinternal), 'immutable revision insert validates aggregate takeoff sources');
select ok(has_function_privilege('authenticated','public.save_quotation_draft(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb,numeric,integer,uuid)','EXECUTE'), 'authenticated members can call idempotent overload');
select ok(not has_function_privilege('anon','public.save_quotation_draft(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb,numeric,integer,uuid)','EXECUTE'), 'anonymous role cannot call idempotent overload');
select ok(has_function_privilege('authenticated','public.save_quotation_draft(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb,numeric,integer)','EXECUTE'), 'existing quotation writer contract remains callable');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('test.material_quote_result', (
  select quotation_id::text || ':' || revision_id::text from public.save_quotation_draft(
    '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030',null,
    'DEMO F9.8 anyagajánlat',null,'HUF','{"lines":[]}'::jsonb,'[]'::jsonb,
    '{"currency":"HUF","complete":false}'::jsonb,0,0,
    '00000000-0000-4000-8000-000000000981')
),true);
select is((select count(*)::int from public.quotation_revisions where quotation_id=split_part(current_setting('test.material_quote_result'),':',1)::uuid),1,'first transfer creates one immutable draft revision');
select is((select quotation_id::text from public.save_quotation_draft(
    '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030',null,
    'DEMO F9.8 anyagajánlat',null,'HUF','{"lines":[]}'::jsonb,'[]'::jsonb,
    '{"currency":"HUF","complete":false}'::jsonb,0,0,
    '00000000-0000-4000-8000-000000000981')),
    split_part(current_setting('test.material_quote_result'),':',1),'retry returns same quotation');
select is((select count(*)::int from public.quotation_revisions where quotation_id=split_part(current_setting('test.material_quote_result'),':',1)::uuid),1,'retry creates no duplicate revision');
select throws_ok($$select * from public.save_quotation_draft(
    '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030',null,
    'Eltérő DEMO ajánlat',null,'HUF','{"lines":[]}'::jsonb,'[]'::jsonb,
    '{"currency":"HUF","complete":false}'::jsonb,0,0,
    '00000000-0000-4000-8000-000000000981')$$,'40001',null,'same operation key rejects changed payload');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select throws_ok($$select * from public.save_quotation_draft(
    '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030',null,
    'DEMO jogosulatlan',null,'HUF','{"lines":[]}'::jsonb,'[]'::jsonb,
    '{"currency":"HUF","complete":false}'::jsonb,0,0,
    '00000000-0000-4000-8000-000000000982')$$,'42501',null,'organization non-member cannot create an idempotent quotation');

reset role;
insert into public.material_products (id,organization_id,category,name,status,data_provenance,created_by)
values ('00000000-0000-4000-8000-000000000991','00000000-0000-4000-8000-000000000010','sheet_metal','DEMO ereszanyag','active','user_provided','00000000-0000-4000-8000-000000000001');
insert into public.material_variants (id,organization_id,product_id,name,purchasing_unit,data_provenance,created_by)
values ('00000000-0000-4000-8000-000000000992','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000991','DEMO 4000 mm','piece','user_provided','00000000-0000-4000-8000-000000000001');
insert into public.material_takeoffs (id,organization_id,project_id,source_calculation_id,source_calculation_revision_id,name,status,created_by)
values ('00000000-0000-4000-8000-000000000993','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030','00000000-0000-4000-8000-000000000050','00000000-0000-4000-8000-000000000051','DEMO tető + eresz','draft','00000000-0000-4000-8000-000000000001');
insert into public.material_takeoff_items (id,organization_id,takeoff_id,variant_id,estimation_method,measurement_source,calculated_quantity,final_quantity,quantity_unit,material_snapshot,created_by)
values
('00000000-0000-4000-8000-000000000994','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000993','00000000-0000-4000-8000-000000000992','manual','DEMO roof source',2,2,'piece','{"productId":"00000000-0000-4000-8000-000000000991","productName":"DEMO ereszanyag","productCategory":"sheet_metal","variantId":"00000000-0000-4000-8000-000000000992","variantName":"DEMO 4000 mm","lengthMm":4000,"nominalWidthMm":125,"effectiveWidthMm":110,"thicknessMm":0.5,"provenance":"user_provided","technicalSpecs":{"color":"DEMO barna"}}'::jsonb,'00000000-0000-4000-8000-000000000001'),
('00000000-0000-4000-8000-000000000995','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000993','00000000-0000-4000-8000-000000000992','manual','DEMO gutter source',3,3,'piece','{"productId":"00000000-0000-4000-8000-000000000991","productName":"DEMO ereszanyag","productCategory":"sheet_metal","variantId":"00000000-0000-4000-8000-000000000992","variantName":"DEMO 4000 mm","lengthMm":4000,"nominalWidthMm":125,"effectiveWidthMm":110,"thicknessMm":0.5,"provenance":"user_provided","technicalSpecs":{"color":"DEMO barna"}}'::jsonb,'00000000-0000-4000-8000-000000000001');
update public.material_takeoffs set status='approved',approved_by='00000000-0000-4000-8000-000000000001',approved_at=now(),version=version+1 where id='00000000-0000-4000-8000-000000000993';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('test.material_aggregate_quote', result.quotation_id::text, true)
from public.save_quotation_draft(
    '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030',null,
    'DEMO összevont anyagajánlat',null,'HUF',
    '{"lines":[{"type":"MATERIAL","quantity":"5","unit":"piece"}]}'::jsonb,
    jsonb_build_array(jsonb_build_object('type','MATERIAL','description','DEMO ereszanyag · DEMO 4000 mm','quantity','5','unit','piece','unitPrice','0.00','priceClass','net','variantId','00000000-0000-4000-8000-000000000992','takeoffSourceItemIds',jsonb_build_array('00000000-0000-4000-8000-000000000994','00000000-0000-4000-8000-000000000995'),'takeoffSourceSnapshots',jsonb_build_array(
      jsonb_build_object('itemId','00000000-0000-4000-8000-000000000994','takeoffId','00000000-0000-4000-8000-000000000993','calculationId','00000000-0000-4000-8000-000000000050','calculationRevisionId','00000000-0000-4000-8000-000000000051','quantity','2','unit','piece','materialSnapshot',(select material_snapshot from public.material_takeoff_items where id='00000000-0000-4000-8000-000000000994'),'priceSnapshot',null),
      jsonb_build_object('itemId','00000000-0000-4000-8000-000000000995','takeoffId','00000000-0000-4000-8000-000000000993','calculationId','00000000-0000-4000-8000-000000000050','calculationRevisionId','00000000-0000-4000-8000-000000000051','quantity','3','unit','piece','materialSnapshot',(select material_snapshot from public.material_takeoff_items where id='00000000-0000-4000-8000-000000000995'),'priceSnapshot',null)))),
    '{"currency":"HUF","complete":true,"priceClass":"net"}'::jsonb,0,0,'00000000-0000-4000-8000-000000000996') as result;
select is((select line_items_snapshot #>> '{0,quantity}' from public.quotation_revisions where quotation_id=current_setting('test.material_aggregate_quote')::uuid),'5','database validates exact sum of compatible approved source quantities');
select is((select jsonb_array_length(line_items_snapshot->0->'takeoffSourceItemIds') from public.quotation_revisions where quotation_id=current_setting('test.material_aggregate_quote')::uuid),2,'quotation revision preserves both immutable takeoff item identities');
select throws_ok($$select * from public.save_quotation_draft(
    '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030',null,
    'DEMO hibás összeg',null,'HUF','{"lines":[]}'::jsonb,
    jsonb_build_array(jsonb_build_object('type','MATERIAL','description','DEMO ereszanyag','quantity','6','unit','piece','unitPrice','0.00','priceClass','net','variantId','00000000-0000-4000-8000-000000000992','takeoffSourceItemIds',jsonb_build_array('00000000-0000-4000-8000-000000000994','00000000-0000-4000-8000-000000000995'),'takeoffSourceSnapshots',jsonb_build_array(
      jsonb_build_object('itemId','00000000-0000-4000-8000-000000000994','takeoffId','00000000-0000-4000-8000-000000000993','calculationId','00000000-0000-4000-8000-000000000050','calculationRevisionId','00000000-0000-4000-8000-000000000051','quantity','2','unit','piece','materialSnapshot',(select material_snapshot from public.material_takeoff_items where id='00000000-0000-4000-8000-000000000994'),'priceSnapshot',null),
      jsonb_build_object('itemId','00000000-0000-4000-8000-000000000995','takeoffId','00000000-0000-4000-8000-000000000993','calculationId','00000000-0000-4000-8000-000000000050','calculationRevisionId','00000000-0000-4000-8000-000000000051','quantity','3','unit','piece','materialSnapshot',(select material_snapshot from public.material_takeoff_items where id='00000000-0000-4000-8000-000000000995'),'priceSnapshot',null)))),
    '{"currency":"HUF","complete":true,"priceClass":"net"}'::jsonb,0,0,'00000000-0000-4000-8000-000000000997')$$,'22023',null,'database rejects a line quantity that does not equal its source sum');
reset role;
select throws_ok($$update public.material_takeoff_items set final_quantity=99 where id='00000000-0000-4000-8000-000000000994'$$,'P0001',null,'approved material source remains immutable');

select * from finish();
rollback;
