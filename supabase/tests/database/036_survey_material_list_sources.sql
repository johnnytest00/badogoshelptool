begin; select no_plan();

set local role postgres;
insert into public.organizations(id, name) values ('00000000-0000-4000-8000-000000000010', 'DEMO F9.27 survey material') on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'owner'),
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002', 'member')
on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('test.f927_survey', '00000000-0000-4000-8000-000000979501', true);
select version from public.save_field_survey_workspace(
  current_setting('test.f927_survey')::uuid, '00000000-0000-4000-8000-000000000010', null, 'gutter',
  '[{"id":"00000000-0000-4000-8000-000000979502","label":"DEMO ereszszakasz","value":8.25,"unit":"m","semanticType":"gutter_run_length"}]'::jsonb,
  'DEMO F9.27 source', 0,
  '[{"id":"00000000-0000-4000-8000-000000979503","name":"DEMO eresz","workType":"gutter","notes":"","photoIds":[],"measurements":[{"id":"00000000-0000-4000-8000-000000979502","label":"DEMO ereszszakasz","value":8.25,"unit":"m","semanticType":"gutter_run_length"}]}]'::jsonb
);
select set_config('test.f927_revision', (select id::text from public.field_survey_revisions where survey_id=current_setting('test.f927_survey')::uuid and version=1), true);

select set_config('test.f927_list', (select list_id::text from public.save_workflow_material_list_from_survey_revision(
  '00000000-0000-4000-8000-000000000010', current_setting('test.f927_survey')::uuid, current_setting('test.f927_revision')::uuid, false,
  'DEMO felmérésből anyaglista',
  '[{"id":"00000000-0000-4000-8000-000000979504","kind":"manual","description":"DEMO ereszszakasz mért hossza","materialCategory":"gutter","categoryId":null,"quantity":"8.25","unit":"linear_meter","variantId":null,"priceId":null,"manualPriceAmount":"","manualPriceKind":null,"sourceRef":{"type":"measurement","sectionId":"00000000-0000-4000-8000-000000979503","measurementId":"00000000-0000-4000-8000-000000979502"}}]'::jsonb,
  '00000000-0000-4000-8000-000000979505'
)), true);
select set_config('test.f927_material_revision', (select id::text from public.material_preparation_revisions where list_id=current_setting('test.f927_list')::uuid and revision_number=1), true);
select ok(current_setting('test.f927_list') <> '', 'standalone survey import creates a material list without a project or work log');
select is((select project_id from public.material_preparation_lists where id=current_setting('test.f927_list')::uuid), null::uuid, 'survey import remains standalone');
select is((select items_snapshot->0->>'quantity' from public.material_preparation_revisions where id=current_setting('test.f927_material_revision')::uuid), '8.250000', 'confirmed measured quantity is saved without conversion');
select is((select items_snapshot->0->>'unit' from public.material_preparation_revisions where id=current_setting('test.f927_material_revision')::uuid), 'linear_meter', 'measured meter maps only to the compatible linear-meter unit');
select is((select survey_revision_id::text from public.material_preparation_survey_sources where material_revision_id=current_setting('test.f927_material_revision')::uuid), current_setting('test.f927_revision'), 'exact immutable survey revision is linked');
select is((select source_items_snapshot->0->>'sourceValue' from public.material_preparation_survey_sources where material_revision_id=current_setting('test.f927_material_revision')::uuid), '8.25', 'source measurement value and item identity are preserved');
select throws_ok($$select * from public.save_workflow_material_list_from_survey_revision(
  '00000000-0000-4000-8000-000000000010', current_setting('test.f927_survey')::uuid, current_setting('test.f927_revision')::uuid, false,
  'DEMO incompatible unit',
  '[{"id":"00000000-0000-4000-8000-000000979513","kind":"manual","description":"DEMO eresz","materialCategory":"gutter","categoryId":null,"quantity":"8.25","unit":"piece","variantId":null,"priceId":null,"manualPriceAmount":"","manualPriceKind":null,"sourceRef":{"type":"measurement","sectionId":"00000000-0000-4000-8000-000000979503","measurementId":"00000000-0000-4000-8000-000000979502"}}]'::jsonb,
  '00000000-0000-4000-8000-000000979514'
)$$, '22023', null, 'a measured meter value cannot be saved as pieces');
select set_config('test.f927_gutter_category', (select id::text from public.material_categories where organization_id='00000000-0000-4000-8000-000000000010' and legacy_category='gutter' and is_default), true);
select set_config('test.f927_unpriced_variant', result.variant_id::text, true)
from public.create_material_manager_product(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000979520', current_setting('test.f927_gutter_category')::uuid,
  'DEMO ereszcsatorna ár nélkül', 'linear_meter', null, null, null
) result;
select set_config('test.f927_unpriced_list', (select list_id::text from public.save_workflow_material_list_from_survey_revision(
  '00000000-0000-4000-8000-000000000010', current_setting('test.f927_survey')::uuid, current_setting('test.f927_revision')::uuid, false,
  'DEMO katalógustétel ár nélkül',
  jsonb_build_array(jsonb_build_object(
    'id','00000000-0000-4000-8000-000000979521','kind','catalog','description','DEMO ereszcsatorna ár nélkül','materialCategory','gutter',
    'categoryId',current_setting('test.f927_gutter_category'),'quantity','8.25','unit','linear_meter',
    'variantId',current_setting('test.f927_unpriced_variant'),'priceId',null,'manualPriceAmount','','manualPriceKind',null,
    'sourceRef',jsonb_build_object('type','measurement','sectionId','00000000-0000-4000-8000-000000979503','measurementId','00000000-0000-4000-8000-000000979502')
  )), '00000000-0000-4000-8000-000000979522'
)), true);
select is((select items_snapshot #>> '{0,priceSnapshot}' from public.material_preparation_revisions where list_id=current_setting('test.f927_unpriced_list')::uuid), null::text, 'missing catalog price remains missing in the saved list');
select set_config('test.f927_priced_variant', result.variant_id::text, true)
from public.create_material_manager_product(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000979523', current_setting('test.f927_gutter_category')::uuid,
  'DEMO ereszcsatorna nem igazolt árral', 'linear_meter', 99.95, 'net', '2026-10-17'
) result;
select set_config('test.f927_unverified_price', (select id::text from public.material_prices where variant_id=current_setting('test.f927_priced_variant')::uuid), true);
select throws_ok($$select * from public.save_workflow_material_list_from_survey_revision(
  '00000000-0000-4000-8000-000000000010', current_setting('test.f927_survey')::uuid, current_setting('test.f927_revision')::uuid, false,
  'DEMO nem igazolt katalógusár',
  jsonb_build_array(jsonb_build_object(
    'id','00000000-0000-4000-8000-000000979524','kind','catalog','description','DEMO ereszcsatorna nem igazolt árral','materialCategory','gutter',
    'categoryId',current_setting('test.f927_gutter_category'),'quantity','8.25','unit','linear_meter',
    'variantId',current_setting('test.f927_priced_variant'),'priceId',current_setting('test.f927_unverified_price'),
    'manualPriceAmount','','manualPriceKind',null,
    'sourceRef',jsonb_build_object('type','measurement','sectionId','00000000-0000-4000-8000-000000979503','measurementId','00000000-0000-4000-8000-000000979502')
  )), '00000000-0000-4000-8000-000000979525'
)$$, '22023', null, 'survey material lists reject user-entered catalog prices as verified prices');

select is((select revision_id::text from public.save_workflow_material_list_from_survey_revision(
  '00000000-0000-4000-8000-000000000010', current_setting('test.f927_survey')::uuid, current_setting('test.f927_revision')::uuid, false,
  'DEMO felmérésből anyaglista',
  '[{"id":"00000000-0000-4000-8000-000000979504","kind":"manual","description":"DEMO ereszszakasz mért hossza","materialCategory":"gutter","categoryId":null,"quantity":"8.25","unit":"linear_meter","variantId":null,"priceId":null,"manualPriceAmount":"","manualPriceKind":null,"sourceRef":{"type":"measurement","sectionId":"00000000-0000-4000-8000-000000979503","measurementId":"00000000-0000-4000-8000-000000979502"}}]'::jsonb,
  '00000000-0000-4000-8000-000000979505'
)), current_setting('test.f927_material_revision'), 'same request retry returns the exact imported revision');
select is((select count(*)::int from public.material_preparation_survey_sources where material_list_id=current_setting('test.f927_list')::uuid), 1, 'retry cannot duplicate survey source links');
select throws_ok($$select * from public.save_workflow_material_list_from_survey_revision(
  '00000000-0000-4000-8000-000000000010', current_setting('test.f927_survey')::uuid, current_setting('test.f927_revision')::uuid, false,
  'DEMO másik lista',
  '[{"id":"00000000-0000-4000-8000-000000979504","kind":"manual","description":"DEMO eltérő eresz","materialCategory":"gutter","categoryId":null,"quantity":"8.5","unit":"linear_meter","variantId":null,"priceId":null,"manualPriceAmount":"","manualPriceKind":null,"sourceRef":{"type":"measurement","sectionId":"00000000-0000-4000-8000-000000979503","measurementId":"00000000-0000-4000-8000-000000979502"}}]'::jsonb,
  '00000000-0000-4000-8000-000000979505'
)$$, '40001', null, 'same request key cannot import changed rows');

select is((select version from public.save_workflow_material_list_revision(
  '00000000-0000-4000-8000-000000000010', current_setting('test.f927_list')::uuid, null, 'DEMO list edited',
  '[{"id":"00000000-0000-4000-8000-000000979504","kind":"manual","description":"DEMO kézzel igazított eresz","materialCategory":"gutter","categoryId":null,"quantity":"7.5","unit":"linear_meter","variantId":null,"priceId":null,"manualPriceAmount":"","manualPriceKind":null,"sourceRefs":[]}]'::jsonb,
  1, '00000000-0000-4000-8000-000000979506'
)), 2, 'manual quantity update creates a new immutable list revision');
select is((select survey_revision_id::text from public.material_preparation_survey_sources where material_revision_id=(select current_revision_id from public.material_preparation_lists where id=current_setting('test.f927_list')::uuid)), current_setting('test.f927_revision'), 'later list revisions preserve the exact original survey link');

select set_config('test.f927_v2', (select version::text from public.save_field_survey_workspace(
  current_setting('test.f927_survey')::uuid, '00000000-0000-4000-8000-000000000010', null, 'gutter',
  '[{"id":"00000000-0000-4000-8000-000000979502","label":"DEMO ereszszakasz","value":9,"unit":"m","semanticType":"gutter_run_length"}]'::jsonb,
  'DEMO F9.27 source V2', 1,
  '[{"id":"00000000-0000-4000-8000-000000979503","name":"DEMO eresz","workType":"gutter","notes":"DEMO V2","photoIds":[],"measurements":[{"id":"00000000-0000-4000-8000-000000979502","label":"DEMO ereszszakasz","value":9,"unit":"m","semanticType":"gutter_run_length"}]}]'::jsonb
)), true);
select ok(current_setting('test.f927_v2') = '2', 'source survey advances to V2 independently');
select is((select revision_id::text from public.save_workflow_material_list_from_survey_revision(
  '00000000-0000-4000-8000-000000000010', current_setting('test.f927_survey')::uuid, current_setting('test.f927_revision')::uuid, false,
  'DEMO felmérésből anyaglista',
  '[{"id":"00000000-0000-4000-8000-000000979504","kind":"manual","description":"DEMO ereszszakasz mért hossza","materialCategory":"gutter","categoryId":null,"quantity":"8.25","unit":"linear_meter","variantId":null,"priceId":null,"manualPriceAmount":"","manualPriceKind":null,"sourceRef":{"type":"measurement","sectionId":"00000000-0000-4000-8000-000000979503","measurementId":"00000000-0000-4000-8000-000000979502"}}]'::jsonb,
  '00000000-0000-4000-8000-000000979505'
)), current_setting('test.f927_material_revision'), 'same successful request remains idempotent after source revision advances');
select set_config('test.f927_stale_import', '00000000-0000-4000-8000-000000979507', true);
select throws_ok($$select * from public.save_workflow_material_list_from_survey_revision(
  '00000000-0000-4000-8000-000000000010', current_setting('test.f927_survey')::uuid, current_setting('test.f927_revision')::uuid, false,
  'DEMO stale source denied',
  '[{"id":"00000000-0000-4000-8000-000000979508","kind":"manual","description":"DEMO eresz","materialCategory":"gutter","categoryId":null,"quantity":"8.25","unit":"linear_meter","variantId":null,"priceId":null,"manualPriceAmount":"","manualPriceKind":null,"sourceRef":{"type":"measurement","sectionId":"00000000-0000-4000-8000-000000979503","measurementId":"00000000-0000-4000-8000-000000979502"}}]'::jsonb,
  current_setting('test.f927_stale_import')::uuid
)$$, '40001', null, 'stale survey import needs explicit confirmation');
select is((select current_revision_id from public.material_preparation_lists where id=current_setting('test.f927_list')::uuid),
  (select id from public.material_preparation_revisions where list_id=current_setting('test.f927_list')::uuid and revision_number=2),
  'source revision update does not silently replace confirmed list contents');
select ok((select survey_version = 1 from public.material_preparation_survey_sources where material_revision_id=(select current_revision_id from public.material_preparation_lists where id=current_setting('test.f927_list')::uuid)), 'existing list source is now detectable as stale');
select set_config('test.f927_historical_list', saved.list_id::text, true)
from public.save_workflow_material_list_from_survey_revision(
  '00000000-0000-4000-8000-000000000010', current_setting('test.f927_survey')::uuid, current_setting('test.f927_revision')::uuid, true,
  'DEMO explicitly stale source',
  '[{"id":"00000000-0000-4000-8000-000000979509","kind":"manual","description":"DEMO korábbi ereszszakasz","materialCategory":"gutter","categoryId":null,"quantity":"8.25","unit":"linear_meter","variantId":null,"priceId":null,"manualPriceAmount":"","manualPriceKind":null,"sourceRef":{"type":"measurement","sectionId":"00000000-0000-4000-8000-000000979503","measurementId":"00000000-0000-4000-8000-000000979502"}}]'::jsonb,
  '00000000-0000-4000-8000-000000979510'
 ) saved;
select is((select material_list_id::text from public.material_preparation_survey_sources where material_list_id=current_setting('test.f927_historical_list')::uuid), current_setting('test.f927_historical_list'), 'user-confirmed historical revision can be retained exactly');

select is((select count(*)::int from public.material_preparation_survey_sources where material_revision_id=(select current_revision_id from public.material_preparation_lists where id=current_setting('test.f927_list')::uuid)), 1, 'authorized list creator can read current survey provenance');
select is((select source_items_snapshot->0->>'sourceValue' from public.material_preparation_survey_sources where material_revision_id=(select current_revision_id from public.material_preparation_lists where id=current_setting('test.f927_list')::uuid)), '8.25', 'authorized creator can reopen the exact current measurement snapshot');
select ok(not has_table_privilege('authenticated', 'public.material_preparation_survey_sources', 'INSERT'), 'clients cannot write survey source links directly');
select ok(not has_function_privilege('anon', 'public.save_workflow_material_list_from_survey_revision(uuid,uuid,uuid,boolean,text,jsonb,uuid)', 'EXECUTE'), 'anonymous source imports are denied');
select throws_ok($$insert into public.material_preparation_survey_sources(organization_id,material_list_id,material_revision_id,survey_id,survey_revision_id,survey_version,created_by)
  values('00000000-0000-4000-8000-000000000010',current_setting('test.f927_list')::uuid,current_setting('test.f927_material_revision')::uuid,current_setting('test.f927_survey')::uuid,current_setting('test.f927_revision')::uuid,1,'00000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'authenticated clients cannot forge source associations');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is((select count(*)::int from public.material_preparation_lists where id=current_setting('test.f927_list')::uuid), 0, 'organization peer cannot read creator-scoped standalone list');
select is((select count(*)::int from public.material_preparation_survey_sources where material_list_id=current_setting('test.f927_list')::uuid), 0, 'organization peer cannot read source provenance without survey/list access');
select throws_ok($$select * from public.save_workflow_material_list_from_survey_revision(
  '00000000-0000-4000-8000-000000000010', current_setting('test.f927_survey')::uuid, current_setting('test.f927_revision')::uuid, false,
  'DEMO unauthorized import',
  '[{"id":"00000000-0000-4000-8000-000000979511","kind":"manual","description":"DEMO eresz","materialCategory":"gutter","categoryId":null,"quantity":"8.25","unit":"linear_meter","variantId":null,"priceId":null,"manualPriceAmount":"","manualPriceKind":null,"sourceRef":{"type":"measurement","sectionId":"00000000-0000-4000-8000-000000979503","measurementId":"00000000-0000-4000-8000-000000979502"}}]'::jsonb,
  '00000000-0000-4000-8000-000000979512'
)$$, '42501', null, 'unauthorized peer cannot import a standalone survey');
reset role;

select throws_ok($$update public.material_preparation_survey_sources set survey_version=2 where material_revision_id=current_setting('test.f927_material_revision')::uuid$$,
  'P0001', null, 'survey source provenance remains immutable');
select * from finish(); rollback;
