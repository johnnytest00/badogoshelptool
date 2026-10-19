begin;
select plan(6);
set local role postgres;
insert into public.material_products(id,organization_id,category,name,status,data_provenance) values('00000000-0000-4000-8000-000000000c01','00000000-0000-4000-8000-000000000010','sheet_metal','DEMO termék','active','demo');
insert into public.material_variants(id,organization_id,product_id,name,purchasing_unit,data_provenance) values('00000000-0000-4000-8000-000000000c02','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000c01','DEMO m²','square_meter','demo');
insert into public.material_prices(id,organization_id,variant_id,amount,purchasing_unit,price_kind,effective_date,data_provenance) values('00000000-0000-4000-8000-000000000c03','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000c02',3000,'square_meter','net','2026-01-01','demo');
set local role authenticated;
select set_config('test.cat',(select category_id::text from public.material_products where id='00000000-0000-4000-8000-000000000c01'),true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select lives_ok(format($t$select * from public.save_workflow_material_list_revision('00000000-0000-4000-8000-000000000010',null,null,'DEMO felülírás',
  '[{"id":"00000000-0000-4000-8000-000000000c10","kind":"catalog","description":"DEMO termék","quantity":"2","unit":"square_meter","variantId":"00000000-0000-4000-8000-000000000c02","categoryId":"%s","manualPriceAmount":"2500","manualPriceKind":"net"}]'::jsonb,0,'00000000-0000-4000-8000-000000000c20')$t$, current_setting('test.cat')),'catalog line accepts a manual override');
select is((select i->'priceSnapshot'->>'manual' from public.material_preparation_revisions r, jsonb_array_elements(r.items_snapshot) i order by r.created_at desc limit 1),'true','snapshot is marked manual');
select is((select i->>'variantId' from public.material_preparation_revisions r, jsonb_array_elements(r.items_snapshot) i order by r.created_at desc limit 1),'00000000-0000-4000-8000-000000000c02','product link is kept');
select throws_ok(format($t$select * from public.save_workflow_material_list_revision('00000000-0000-4000-8000-000000000010',null,null,'DEMO mindkettő',
  '[{"id":"00000000-0000-4000-8000-000000000c11","kind":"catalog","description":"x","quantity":"1","unit":"square_meter","variantId":"00000000-0000-4000-8000-000000000c02","categoryId":"%s","priceId":"00000000-0000-4000-8000-000000000c03","manualPriceAmount":"1","manualPriceKind":"net"}]'::jsonb,0,'00000000-0000-4000-8000-000000000c21')$t$, current_setting('test.cat')),'22023',null,'catalog price and manual override are exclusive');
select throws_ok(format($t$select * from public.save_workflow_material_list_revision('00000000-0000-4000-8000-000000000010',null,null,'DEMO alap nélkül',
  '[{"id":"00000000-0000-4000-8000-000000000c12","kind":"catalog","description":"x","quantity":"1","unit":"square_meter","variantId":"00000000-0000-4000-8000-000000000c02","categoryId":"%s","manualPriceKind":"net"}]'::jsonb,0,'00000000-0000-4000-8000-000000000c22')$t$, current_setting('test.cat')),'22023',null,'basis without amount is rejected');
select is((select amount from public.material_prices where id='00000000-0000-4000-8000-000000000c03'),3000.00::numeric,'catalog price is untouched by the override');
select * from finish();
rollback;
