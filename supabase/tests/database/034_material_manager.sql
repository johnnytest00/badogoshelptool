begin;
select no_plan();

select has_table('public', 'material_categories', 'organization-owned material categories exist');
select has_column('public', 'material_products', 'category_id', 'products reference a display category');
select has_column('public', 'material_preparation_revisions', 'request_snapshot', 'material-list retries keep submitted input separate from resolved snapshots');
select ok((select relrowsecurity from pg_class where oid='public.material_categories'::regclass), 'material categories enforce RLS');
select ok(not has_table_privilege('authenticated', 'public.material_manager_product_create_operations', 'SELECT'), 'clients cannot read product idempotency records');
select ok(not has_column_privilege('authenticated', 'public.material_categories', 'legacy_category', 'UPDATE'), 'clients cannot assign a technical category classifier');
select ok(not has_table_privilege('authenticated', 'public.material_categories', 'DELETE'), 'categories cannot be hard-deleted by clients');
select ok(exists(select 1 from pg_trigger where tgrelid='public.material_prices'::regclass and tgname='material_prices_unit_matches_variant' and not tgisinternal), 'price insertion checks the variant unit');

set local role postgres;
insert into public.organizations(id, name) values
  ('00000000-0000-4000-8000-000000000010', 'DEMO F9.22 material manager'),
  ('00000000-0000-4000-8000-000000000011', 'DEMO F9.22 other organization')
on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'owner')
on conflict do nothing;
select is((select count(*)::int from public.material_categories where organization_id='00000000-0000-4000-8000-000000000010' and is_default), 8, 'new organizations receive the legacy-compatible category defaults');
insert into public.material_products(id, organization_id, category, name, data_provenance, created_by)
values ('00000000-0000-4000-8000-000000979221', '00000000-0000-4000-8000-000000000010', 'other', 'DEMO legacy product', 'demo', '00000000-0000-4000-8000-000000000001');
select ok((select category_id is not null from public.material_products where id='00000000-0000-4000-8000-000000979221'), 'legacy product inserts map to an organization display category');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
with category as (
  insert into public.material_categories(organization_id, name, created_by)
  values ('00000000-0000-4000-8000-000000000010', 'DEMO csatorna anyag', auth.uid()) returning id
)
select set_config('test.material_category_id', id::text, true) from category;
select set_config('test.manager_product_id', result.product_id::text, true), set_config('test.manager_variant_id', result.variant_id::text, true)
from public.create_material_manager_product(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000979222', current_setting('test.material_category_id')::uuid,
  'Csatorna 333 mm antracit', 'strand', '0.00', 'net', '2026-10-17'
) result;
select is((select category_id::text from public.material_products where id=current_setting('test.manager_product_id')::uuid), current_setting('test.material_category_id'), 'product is linked to the selected organization category');
select is((select category::text from public.material_products where id=current_setting('test.manager_product_id')::uuid), 'other', 'user category is not treated as verified technical compatibility');
select is((select purchasing_unit::text from public.material_variants where id=current_setting('test.manager_variant_id')::uuid), 'strand', 'new ordinary purchasing unit is stored without conversion');
select is((select amount::text from public.material_prices where variant_id=current_setting('test.manager_variant_id')::uuid), '0.00', 'explicit zero is stored as a price and distinct from no price');
select is((select purchasing_unit::text from public.material_prices where variant_id=current_setting('test.manager_variant_id')::uuid), 'strand', 'catalog price is tied to the exact variant unit');
select is((select product_id::text from public.create_material_manager_product(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000979222', current_setting('test.material_category_id')::uuid,
  'Csatorna 333 mm antracit', 'strand', '0.00', 'net', '2026-10-17'
)), current_setting('test.manager_product_id'), 'identical manager creation retry returns the original product');
select throws_ok($$select * from public.create_material_manager_product(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000979222', current_setting('test.material_category_id')::uuid,
  'Eltérő DEMO termék', 'strand', '0.00', 'net', '2026-10-17'
)$$, '40001', null, 'manager request key cannot be reused with changed data');
select throws_ok($$insert into public.material_prices(organization_id, variant_id, amount, currency, purchasing_unit, price_kind, effective_date, data_provenance, created_by)
  values ('00000000-0000-4000-8000-000000000010', current_setting('test.manager_variant_id')::uuid, 1, 'HUF', 'piece', 'gross', '2026-10-17', 'user_provided', auth.uid())$$,
  '23514', null, 'database rejects a price with a different unit');
select throws_ok($$update public.material_variants set purchasing_unit='piece' where id=current_setting('test.manager_variant_id')::uuid$$,
  '23514', null, 'variant unit cannot change after price history exists');

select set_config('test.material_list_id', result.list_id::text, true), set_config('test.material_revision_id', result.revision_id::text, true)
from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', null, null, 'DEMO F9.22 anyaglista',
  jsonb_build_array(
    jsonb_build_object('id','00000000-0000-4000-8000-000000979223','kind','catalog','description','Csatorna 333 mm antracit','materialCategory','other','categoryId',current_setting('test.material_category_id'),'quantity','2.5','unit','strand','variantId',current_setting('test.manager_variant_id'),'priceId',null,'manualPriceAmount','','manualPriceKind',null,'sourceRefs',jsonb_build_array()),
    jsonb_build_object('id','00000000-0000-4000-8000-000000979224','kind','manual','description','DEMO kézi szegély','materialCategory','other','categoryId',null,'quantity','1.25','unit','linear_meter','variantId',null,'priceId',null,'manualPriceAmount','0','manualPriceKind','gross','sourceRefs',jsonb_build_array())
  ), 0, '00000000-0000-4000-8000-000000979225'
) result;
select is((select items_snapshot #>> '{0,categoryName}' from public.material_preparation_revisions where id=current_setting('test.material_revision_id')::uuid), 'DEMO csatorna anyag', 'catalog row snapshots the submitted category name');
select is((select items_snapshot #>> '{0,materialSnapshot,categoryId}' from public.material_preparation_revisions where id=current_setting('test.material_revision_id')::uuid), current_setting('test.material_category_id'), 'catalog source snapshot retains its category identity');
select is((select items_snapshot #>> '{1,priceSnapshot,amount}' from public.material_preparation_revisions where id=current_setting('test.material_revision_id')::uuid), '0.00', 'manual explicit zero price is stored with exact decimal precision');
select is((select items_snapshot #>> '{1,priceSnapshot,priceKind}' from public.material_preparation_revisions where id=current_setting('test.material_revision_id')::uuid), 'gross', 'manual price basis is explicit in the immutable snapshot');
select is((select items_snapshot #>> '{1,priceSnapshot,purchasingUnit}' from public.material_preparation_revisions where id=current_setting('test.material_revision_id')::uuid), 'linear_meter', 'manual price snapshot retains its matching unit');
update public.material_categories set name='DEMO átnevezett kategória', is_active=false where id=current_setting('test.material_category_id')::uuid;
select is((select list_id::text from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', null, null, 'DEMO F9.22 anyaglista',
  jsonb_build_array(
    jsonb_build_object('id','00000000-0000-4000-8000-000000979223','kind','catalog','description','Csatorna 333 mm antracit','materialCategory','other','categoryId',current_setting('test.material_category_id'),'quantity','2.5','unit','strand','variantId',current_setting('test.manager_variant_id'),'priceId',null,'manualPriceAmount','','manualPriceKind',null,'sourceRefs',jsonb_build_array()),
    jsonb_build_object('id','00000000-0000-4000-8000-000000979224','kind','manual','description','DEMO kézi szegély','materialCategory','other','categoryId',null,'quantity','1.25','unit','linear_meter','variantId',null,'priceId',null,'manualPriceAmount','0','manualPriceKind','gross','sourceRefs',jsonb_build_array())
  ), 0, '00000000-0000-4000-8000-000000979225'
)), current_setting('test.material_list_id'), 'lost-response retry returns its saved list after category deactivation');
select is((select items_snapshot #>> '{0,categoryName}' from public.material_preparation_revisions where id=current_setting('test.material_revision_id')::uuid), 'DEMO csatorna anyag', 'category rename does not rewrite a historical material-list snapshot');
reset role;
select throws_ok($$update public.material_preparation_revisions set items_snapshot='[]'::jsonb where id=current_setting('test.material_revision_id')::uuid$$,
  'P0001', null, 'material-list source snapshots remain immutable');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select is((select count(*)::int from public.material_categories where organization_id='00000000-0000-4000-8000-000000000010'), 0, 'nonmember cannot read organization categories');
select throws_ok($$select * from public.create_material_manager_product(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000979226', current_setting('test.material_category_id')::uuid,
  'DEMO unauthorized', 'piece', null, null, null
)$$, '42501', null, 'nonmember cannot create a manager product');

select * from finish();
rollback;
