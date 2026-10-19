begin;
select plan(18);
set local role postgres;
insert into public.organization_members(organization_id,user_id,role) values('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002','member') on conflict do nothing;
insert into public.material_products(id,organization_id,category,name,status,data_provenance) values('00000000-0000-4000-8000-000000000b01','00000000-0000-4000-8000-000000000010','sheet_metal','DEMO Trapézlemez T18','active','demo');
insert into public.material_variants(id,organization_id,product_id,name,purchasing_unit,data_provenance) values
 ('00000000-0000-4000-8000-000000000b02','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000b01','DEMO m²','square_meter','demo'),
 ('00000000-0000-4000-8000-000000000b03','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000b01','DEMO db','piece','demo');
insert into public.material_prices(id,organization_id,variant_id,amount,purchasing_unit,price_kind,effective_date,data_provenance) values
 ('00000000-0000-4000-8000-000000000b10','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000b02',3000,'square_meter','net','2026-01-01','demo');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select lives_ok($$insert into public.material_price_options(id,organization_id,variant_id,label) values('00000000-0000-4000-8000-000000000b21','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000b02','Lindab'),('00000000-0000-4000-8000-000000000b22','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000b02','Helyi tüzép')$$,'member creates named options');
select throws_ok($$insert into public.material_price_options(organization_id,variant_id,label) values('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000b02',' lindab ')$$,'23505',null,'duplicate label (case-insensitive) is rejected');
select lives_ok($$insert into public.material_prices(id,organization_id,variant_id,option_id,amount,purchasing_unit,price_kind,effective_date,data_provenance,source_name) values('00000000-0000-4000-8000-000000000b11','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000b02','00000000-0000-4000-8000-000000000b21',3200,'square_meter','net','2026-02-01','user_provided','ignored'),('00000000-0000-4000-8000-000000000b12','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000b02','00000000-0000-4000-8000-000000000b22',2950,'square_meter','net','2026-02-01','user_provided',null)$$,'a price under each option');
select is((select source_name from public.material_prices where id='00000000-0000-4000-8000-000000000b11'),'Lindab','option label is copied into the immutable price row');
select is((select count(*)::int from public.material_prices where variant_id='00000000-0000-4000-8000-000000000b02'),3,'legacy and named prices coexist');
select is((select option_id from public.material_prices where id='00000000-0000-4000-8000-000000000b10'),null,'legacy price keeps a null option');
select throws_ok($$insert into public.material_prices(organization_id,variant_id,option_id,amount,purchasing_unit,price_kind,effective_date) values('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000b03','00000000-0000-4000-8000-000000000b21',1,'piece','net','2026-02-01')$$,'23514',null,'option of another variant is rejected');
select throws_ok($$insert into public.material_prices(organization_id,variant_id,option_id,amount,purchasing_unit,price_kind,effective_date) values('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000b02','00000000-0000-4000-8000-000000000b21',1,'piece','net','2026-02-01')$$,'23514',null,'price unit must match the variant unit');
select lives_ok($$update public.material_price_options set label='Lindab Kft.' where id='00000000-0000-4000-8000-000000000b21'$$,'rename option');
select is((select source_name from public.material_prices where id='00000000-0000-4000-8000-000000000b11'),'Lindab','rename does not change historical price rows');
select lives_ok($$update public.material_price_options set status='archived' where id='00000000-0000-4000-8000-000000000b22'$$,'archive option');
select throws_ok($$insert into public.material_prices(organization_id,variant_id,option_id,amount,purchasing_unit,price_kind,effective_date) values('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000b02','00000000-0000-4000-8000-000000000b22',1,'square_meter','net','2026-03-01')$$,'23514',null,'archived option takes no new price');
select lives_ok($$update public.material_prices set amount=1 where id='00000000-0000-4000-8000-000000000b11'$$,'update attempt does not error');
select is((select amount from public.material_prices where id='00000000-0000-4000-8000-000000000b11'),3200.00::numeric,'price history stays unchanged');
select throws_ok($$update public.material_price_options set variant_id='00000000-0000-4000-8000-000000000b03' where id='00000000-0000-4000-8000-000000000b21'$$,'55000',null,'option cannot move to another variant');
select ok(pg_get_functiondef('public.save_standalone_quotation_draft_with_document'::regproc) like '%supplierLabel%','quotation snapshot records the supplier label');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select is((select count(*)::int from public.material_price_options),0,'another organization cannot read the options');
select throws_ok($$select * from public.revise_organization_labor_rate('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000b99','x','roof_area_m2',1,'net','00000000-0000-4000-8000-000000000b98')$$,'42501',null,'outsider cannot revise a labor rate');
select * from finish();
rollback;
