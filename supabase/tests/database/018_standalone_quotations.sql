begin;
select plan(38);

select has_column('public','quotations','ownership_scope','quotation ownership scope is explicit');
select ok((select is_nullable = 'YES' from information_schema.columns where table_schema='public' and table_name='quotations' and column_name='project_id'), 'project link is nullable for standalone only');
select has_function('public','save_standalone_quotation_draft','standalone draft save RPC exists');
select has_function('public','get_standalone_quotation_revision','owner-scoped current and history read RPC exists');
select ok((select p.prosecdef from pg_proc p where p.oid='public.save_standalone_quotation_draft(uuid,uuid,uuid,text,uuid,jsonb,integer)'::regprocedure), 'standalone writer is SECURITY DEFINER');
select ok((select 'search_path=pg_catalog, public'=any(p.proconfig) from pg_proc p where p.oid='public.save_standalone_quotation_draft(uuid,uuid,uuid,text,uuid,jsonb,integer)'::regprocedure), 'standalone writer pins a safe search_path');
select ok((select relrowsecurity from pg_class where oid='public.standalone_quotation_operations'::regclass), 'idempotency ledger has RLS');
select ok(has_function_privilege('authenticated','public.save_standalone_quotation_draft(uuid,uuid,uuid,text,uuid,jsonb,integer)','EXECUTE'), 'authenticated role can call save RPC');

set local role postgres;
insert into public.organization_members (organization_id,user_id,role)
values ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002','member')
on conflict (organization_id,user_id) do nothing;
insert into public.material_products (id,organization_id,category,name,status,data_provenance,created_by)
values ('00000000-0000-4000-8000-000000000911','00000000-0000-4000-8000-000000000010','other','DEMO teszttermék','active','demo','00000000-0000-4000-8000-000000000001');
insert into public.material_variants (id,organization_id,product_id,name,purchasing_unit,data_provenance,created_by)
values ('00000000-0000-4000-8000-000000000912','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000911','DEMO tesztváltozat','piece','demo','00000000-0000-4000-8000-000000000001');
insert into public.material_prices (id,organization_id,variant_id,amount,currency,purchasing_unit,price_kind,effective_date,data_provenance,created_by)
values ('00000000-0000-4000-8000-000000000913','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000912',12.50,'HUF','piece','net',current_date,'demo','00000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select lives_ok($$select * from public.save_standalone_quotation_draft(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000901',null,'DEMO önálló ajánlat',null,
 '[{"type":"LABOR","description":"DEMO kézi munkadíj","quantity":"2","unit":"óra","unitPrice":"5.25","priceClass":"net"},{"type":"OTHER","description":"DEMO üres sor","quantity":"1","unit":"db","unitPrice":"0.00","priceClass":"net"}]'::jsonb,0
)$$,'authenticated creator can persist a draft without project or client');
select set_config('test.standalone_quote_id',(select quotation_id::text from public.quotation_revisions where revision_number=1 order by created_at desc limit 1),true);
select is((select ownership_scope from public.quotations where id=(select quotation_id from public.quotation_revisions where revision_number=1 order by created_at desc limit 1)), 'standalone', 'new quotation is explicitly standalone');
select is((select project_id from public.quotations where id=(select quotation_id from public.quotation_revisions where revision_number=1 order by created_at desc limit 1)), null::uuid, 'standalone quotation has no dummy project');
select is((select client_id from public.quotations where id=(select quotation_id from public.quotation_revisions where revision_number=1 order by created_at desc limit 1)), null::uuid, 'draft may have no customer');
select is((select subtotal from public.quotation_revisions where quotation_id=(select quotation_id from public.quotation_revisions where revision_number=1 order by created_at desc limit 1)), 10.50::numeric, 'database computes authoritative HUF subtotal');
select is((select totals_snapshot->>'currency' from public.quotation_revisions where quotation_id=(select quotation_id from public.quotation_revisions where revision_number=1 order by created_at desc limit 1)), 'HUF', 'saved totals explicitly retain HUF semantics');
select is((select financial_contract->>'sourceVersion' from public.quotation_revisions where quotation_id=current_setting('test.standalone_quote_id')::uuid and revision_number=1), 'F9.7.6.6.3.2b', 'new revision carries the financial contract source version');
select is((select financial_contract->>'netAmount' from public.quotation_revisions where quotation_id=current_setting('test.standalone_quote_id')::uuid and revision_number=1), '10.50', 'NET amount is retained as the authoritative HUF net subtotal');
select is((select financial_contract->>'grossAmount' from public.quotation_revisions where quotation_id=current_setting('test.standalone_quote_id')::uuid and revision_number=1), null, 'NET input does not invent a gross amount');
select is((select financial_contract->>'taxAmount' from public.quotation_revisions where quotation_id=current_setting('test.standalone_quote_id')::uuid and revision_number=1), null, 'unapproved tax amount remains null');
select is((select financial_contract #>> '{rounding,mode}' from public.quotation_revisions where quotation_id=current_setting('test.standalone_quote_id')::uuid and revision_number=1), 'half_up', 'financial contract records existing per-line half-up rounding');
select is((select count(*)::int from public.quotation_revisions where quotation_id=(select quotation_id from public.quotation_revisions where revision_number=1 order by created_at desc limit 1)), 1, 'initial request produces one immutable revision');
-- A custom GUC is client-settable, so spoof the marker and prove RLS/grants still
-- prevent all direct standalone writes.
select set_config('app.standalone_quotation_writer','00000000-0000-4000-8000-000000000001',true);
select throws_ok($$insert into public.quotations (organization_id,project_id,ownership_scope,name,created_by)
 values ('00000000-0000-4000-8000-000000000010',null,'standalone','Forged direct insert','00000000-0000-4000-8000-000000000001')$$,
 '42501',null,'standalone parent writes require the audited RPC');
update public.quotations set name='Forged direct update'
 where id=current_setting('test.standalone_quote_id')::uuid;
select is((select count(*)::int from public.quotations where id=current_setting('test.standalone_quote_id')::uuid and name='DEMO önálló ajánlat'),
 1,'client-set marker cannot update standalone parent');
select throws_ok($$insert into public.quotation_revisions (organization_id,quotation_id,revision_number,currency,price_class,input_snapshot,line_items_snapshot,subtotal,totals_snapshot,created_by)
 values ('00000000-0000-4000-8000-000000000010',current_setting('test.standalone_quote_id')::uuid,2,'HUF','net','{}','[]',0,'{}','00000000-0000-4000-8000-000000000001')$$,
 '42501',null,'client-set marker cannot insert standalone revision');
select throws_ok($$insert into public.standalone_quotation_operations (organization_id,operation_id,created_by,request_snapshot,quotation_id,revision_id)
 values ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000915','00000000-0000-4000-8000-000000000001','{}',current_setting('test.standalone_quote_id')::uuid,(select current_revision_id from public.quotations where id=current_setting('test.standalone_quote_id')::uuid))$$,
 '42501',null,'authenticated cannot forge an idempotency ledger row');
select lives_ok($$select * from public.save_standalone_quotation_draft(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000904',null,'DEMO katalógusajánlat',null,
 '[{"type":"MATERIAL","description":"DEMO tesztváltozat","quantity":"2","unit":"piece","unitPrice":"12.50","priceClass":"net","variantId":"00000000-0000-4000-8000-000000000912","priceId":"00000000-0000-4000-8000-000000000913"}]'::jsonb,0
)$$,'authorized catalog item and selected price persist');
select is((select subtotal from public.quotation_revisions where quotation_id=(select quotation_id from public.standalone_quotation_operations where operation_id='00000000-0000-4000-8000-000000000904')),25.00::numeric,'catalog total is recalculated from validated source price');
select is((select line_items_snapshot #>> '{0,materialSnapshot,price,amount}' from public.quotation_revisions where quotation_id=(select quotation_id from public.standalone_quotation_operations where operation_id='00000000-0000-4000-8000-000000000904')),'12.50','revision stores selected catalog price snapshot');
select throws_ok($$select * from public.save_standalone_quotation_draft(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000905',null,'DEMO hamis ár',null,
 '[{"type":"MATERIAL","description":"DEMO tesztváltozat","quantity":"2","unit":"piece","unitPrice":"1.00","priceClass":"net","variantId":"00000000-0000-4000-8000-000000000912","priceId":"00000000-0000-4000-8000-000000000913"}]'::jsonb,0)$$,'23503',null,'client cannot forge a selected catalog unit price');
insert into public.material_prices (id,organization_id,variant_id,amount,currency,purchasing_unit,price_kind,effective_date,data_provenance,created_by)
values ('00000000-0000-4000-8000-000000000914','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000912',19.99,'HUF','piece','net',current_date + 1,'demo','00000000-0000-4000-8000-000000000001');
select is((select line_items_snapshot #>> '{0,materialSnapshot,price,amount}' from public.quotation_revisions where quotation_id=(select quotation_id from public.standalone_quotation_operations where operation_id='00000000-0000-4000-8000-000000000904')),'12.50','later catalog price does not alter immutable quotation snapshot');
select lives_ok($$select * from public.save_standalone_quotation_draft(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000906',current_setting('test.standalone_quote_id')::uuid,'DEMO ajánlat módosítva',null,'[]'::jsonb,1
)$$,'expected V1 creates a new immutable V2 draft');
select is((select count(*)::int from public.quotation_revisions where quotation_id=current_setting('test.standalone_quote_id')::uuid),2,'old revision remains alongside V2');
select throws_ok($$select * from public.save_standalone_quotation_draft(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000907',current_setting('test.standalone_quote_id')::uuid,'Stale write',null,'[]'::jsonb,1
)$$,'40001',null,'stale expected version is rejected');

select lives_ok($$select * from public.save_standalone_quotation_draft(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000901',null,'DEMO önálló ajánlat',null,
 '[{"type":"LABOR","description":"DEMO kézi munkadíj","quantity":"2","unit":"óra","unitPrice":"5.25","priceClass":"net"},{"type":"OTHER","description":"DEMO üres sor","quantity":"1","unit":"db","unitPrice":"0.00","priceClass":"net"}]'::jsonb,0
)$$,'same operation and payload reuses the created quotation');
select throws_ok($$select * from public.save_standalone_quotation_draft(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000901',null,'Más payload',null,
 '[]'::jsonb,0)$$,'22023',null,'same operation key with different payload is rejected');
select throws_ok($$select * from public.save_standalone_quotation_draft(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000902','00000000-0000-4000-8000-000000000999','Unknown',null,'[]'::jsonb,0)$$,'23503',null,'unknown quotation ID is rejected');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select is((select count(*)::int from public.quotations where id=current_setting('test.standalone_quote_id')::uuid),0,'same organization noncreator cannot read standalone quotation');
select throws_ok($$select * from public.get_standalone_quotation_revision('00000000-0000-4000-8000-000000000010',current_setting('test.standalone_quote_id')::uuid,null)$$,'23503',null,'same organization noncreator cannot read current or historical revision');
select throws_ok($$select * from public.save_standalone_quotation_draft('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000903',current_setting('test.standalone_quote_id')::uuid,'Forged',null,'[]'::jsonb,0)$$,'23503',null,'same organization noncreator cannot write quotation');

select * from finish();
rollback;
