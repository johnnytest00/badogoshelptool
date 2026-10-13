begin;
select plan(29);

select has_column('public', 'material_takeoffs', 'transfer_request_key', 'takeoff stores explicit transfer request identity');
select has_column('public', 'material_takeoffs', 'transfer_payload', 'takeoff stores logical transfer payload');
select ok(exists (select 1 from pg_constraint where conname = 'material_takeoffs_transfer_request_unique'), 'database uniqueness enforces one transfer per request key');
select has_function('public', 'create_gutter_takeoff_draft', 'atomic gutter takeoff RPC exists');

set local role postgres;
insert into public.organizations (id, name) values ('00000000-0000-4000-8000-000000000011', 'DEMO másik szervezet — gutter takeoff');
insert into public.organization_members (organization_id, user_id, role) values ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000002', 'owner');
insert into public.projects (id, organization_id, name, project_type, status, created_by) values
  ('00000000-0000-4000-8000-000000000970', '00000000-0000-4000-8000-000000000010', 'DEMO gutter takeoff forrás', 'gutter_work', 'draft', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000971', '00000000-0000-4000-8000-000000000010', 'DEMO másik projekt', 'gutter_work', 'draft', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000972', '00000000-0000-4000-8000-000000000011', 'DEMO másik szervezet projekt', 'gutter_work', 'draft', '00000000-0000-4000-8000-000000000002');
insert into public.calculations (id, organization_id, project_id, calculator_type, display_name, status) values
  ('00000000-0000-4000-8000-000000000973', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000970', 'gutters.material-estimate', 'DEMO gutter takeoff', 'current'),
  ('00000000-0000-4000-8000-000000000974', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000972', 'gutters.material-estimate', 'DEMO másik szervezet gutter', 'current');
insert into public.calculation_revisions (id, organization_id, calculation_id, revision_number, input_schema_version, calculator_implementation_version, input_snapshot, output_snapshot, data_provenance, validation_status, warnings, created_by) values
  ('00000000-0000-4000-8000-000000000975', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000973', 1, '1.0.0', '1.0.0',
   '{"gutterStockLengthMm":4000,"runs":[{"id":"front","name":"Első eresz","lengthMm":8500,"measurementSource":"demo","roofEdge":null,"bracketSpacingMm":null}],"downpipes":[{"id":"east","name":"Keleti lefolyó","lengthMm":5100,"commercialLengthMm":3000,"selectedBends":2,"relatedAccessories":[]}],"manualComponents":[{"id":"caps","category":"end_cap","quantity":2,"note":"DEMO"}]}'::jsonb,
   '{"gutterRuns":[{"id":"front","name":"Első eresz","lengthMm":8500,"stockSections":3,"remainderMm":500,"bracketEstimate":null,"bracketBasis":null}],"downpipeRuns":[{"id":"east","name":"Keleti lefolyó","lengthMm":5100,"stockSections":2,"remainderMm":2100,"selectedBends":2}],"componentQuantities":[],"totals":{"gutterStockSections":3,"downpipeStockSections":2,"totalManualComponents":2},"assumptions":[],"warnings":[]}'::jsonb,
   '{"test":"F9.6.1.2.1"}'::jsonb, 'verified', '[]'::jsonb, '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000976', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000974', 1, '1.0.0', '1.0.0', '{"gutterStockLengthMm":4000,"runs":[],"downpipes":[],"manualComponents":[]}', '{}', '{"test":"F9.6.1.2.1"}', 'verified', '[]', '00000000-0000-4000-8000-000000000002');
update public.calculations set current_revision_id = '00000000-0000-4000-8000-000000000975' where id = '00000000-0000-4000-8000-000000000973';
update public.calculations set current_revision_id = '00000000-0000-4000-8000-000000000976' where id = '00000000-0000-4000-8000-000000000974';
insert into public.material_products (id, organization_id, category, name, status, data_provenance, created_by) values
  ('00000000-0000-4000-8000-000000000977', '00000000-0000-4000-8000-000000000010', 'gutter', 'DEMO eresztermék', 'active', 'demo', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000978', '00000000-0000-4000-8000-000000000011', 'gutter', 'DEMO másik szervezet eresz', 'active', 'demo', '00000000-0000-4000-8000-000000000002');
insert into public.material_variants (id, organization_id, product_id, name, purchasing_unit, length_mm, technical_specs, data_provenance, created_by) values
  ('00000000-0000-4000-8000-000000000979', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000977', 'DEMO 4 m darab', 'piece', 4000, '{"shape":"DEMO"}', 'demo', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000980', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000977', 'DEMO folyóméter', 'linear_meter', null, '{}', 'demo', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000981', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000978', 'DEMO másik szervezet darab', 'piece', 4000, '{}', 'demo', '00000000-0000-4000-8000-000000000002');
insert into public.material_prices (id, organization_id, variant_id, amount, purchasing_unit, price_kind, price_source, effective_date, data_provenance, source_name, created_by)
values ('00000000-0000-4000-8000-000000000982', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000979', 1000, 'piece', 'net', 'DEMO', '2026-10-13', 'demo', 'DEMO forrás', '00000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

select lives_ok($$select * from public.create_gutter_takeoff_draft(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000970',
  '00000000-0000-4000-8000-000000000973', '00000000-0000-4000-8000-000000000975',
  'DEMO F9.6.1.2.1 draft', '00000000-0000-4000-8000-000000000983',
  '[{"candidateId":"downpipe-section:east","variantId":"00000000-0000-4000-8000-000000000979"},{"candidateId":"gutter-section:front","variantId":"00000000-0000-4000-8000-000000000979"}]'
)$$, 'authorized transfer creates a draft');
select is((select count(*)::int from public.material_takeoffs where transfer_request_key = '00000000-0000-4000-8000-000000000983'), 1, 'one logical draft is stored');
select is((select count(*)::int from public.material_takeoff_items where takeoff_id = (select id from public.material_takeoffs where transfer_request_key = '00000000-0000-4000-8000-000000000983')), 2, 'all mapped items are stored atomically');
select results_eq($$select final_quantity::numeric, quantity_unit::text from public.material_takeoff_items where takeoff_id = (select id from public.material_takeoffs where transfer_request_key = '00000000-0000-4000-8000-000000000983') order by final_quantity$$, $$values (2::numeric, 'piece'::text), (3::numeric, 'piece'::text)$$, 'authoritative saved quantities and units are transferred');
select is((select source_calculation_revision_id from public.material_takeoffs where transfer_request_key = '00000000-0000-4000-8000-000000000983'), '00000000-0000-4000-8000-000000000975'::uuid, 'exact source revision is preserved');
select is((select material_snapshot->>'sourceCalculationRevisionId' from public.material_takeoff_items where takeoff_id = (select id from public.material_takeoffs where transfer_request_key = '00000000-0000-4000-8000-000000000983') limit 1), '00000000-0000-4000-8000-000000000975', 'item snapshot preserves source revision');
select is((select material_snapshot->>'lengthMm' from public.material_takeoff_items where takeoff_id = (select id from public.material_takeoffs where transfer_request_key = '00000000-0000-4000-8000-000000000983') limit 1), '4000', 'technical length snapshot is preserved');
select is((select price_snapshot->>'sourceName' from public.material_takeoff_items where takeoff_id = (select id from public.material_takeoffs where transfer_request_key = '00000000-0000-4000-8000-000000000983') limit 1), 'DEMO forrás', 'price provenance snapshot is preserved');

select is((select takeoff_id from public.create_gutter_takeoff_draft(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000970',
  '00000000-0000-4000-8000-000000000973', '00000000-0000-4000-8000-000000000975',
  'DEMO F9.6.1.2.1 draft', '00000000-0000-4000-8000-000000000983',
  '[{"candidateId":"downpipe-section:east","variantId":"00000000-0000-4000-8000-000000000979"},{"candidateId":"gutter-section:front","variantId":"00000000-0000-4000-8000-000000000979"}]'
)), (select id from public.material_takeoffs where transfer_request_key = '00000000-0000-4000-8000-000000000983'), 'same request returns the original draft');
select is((select draft_created from public.create_gutter_takeoff_draft(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000970',
  '00000000-0000-4000-8000-000000000973', '00000000-0000-4000-8000-000000000975',
  'DEMO F9.6.1.2.1 draft', '00000000-0000-4000-8000-000000000983',
  '[{"candidateId":"downpipe-section:east","variantId":"00000000-0000-4000-8000-000000000979"},{"candidateId":"gutter-section:front","variantId":"00000000-0000-4000-8000-000000000979"}]'
)), false, 'repeated request is reported as reused');
select is((select count(*)::int from public.material_takeoffs where transfer_request_key = '00000000-0000-4000-8000-000000000983'), 1, 'repeated request creates no duplicate draft');
select throws_ok($$select * from public.create_gutter_takeoff_draft(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000970',
  '00000000-0000-4000-8000-000000000973', '00000000-0000-4000-8000-000000000975',
  'DEMO changed payload', '00000000-0000-4000-8000-000000000983',
  '[{"candidateId":"manual:caps","variantId":"00000000-0000-4000-8000-000000000979"}]'
)$$, '22023', null, 'request key cannot be reused with different content');
select lives_ok($$select * from public.create_gutter_takeoff_draft(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000970',
  '00000000-0000-4000-8000-000000000973', '00000000-0000-4000-8000-000000000975',
  'DEMO F9.6.1.2.1 draft', '00000000-0000-4000-8000-000000000984',
  '[{"candidateId":"manual:caps","variantId":"00000000-0000-4000-8000-000000000979"}]'
)$$, 'new request key permits a genuinely new draft with the same name');
select is((select count(*)::int from public.material_takeoffs where source_calculation_revision_id = '00000000-0000-4000-8000-000000000975'), 2, 'two explicit operations remain two drafts');
select throws_ok($$update public.material_takeoffs set transfer_payload = '{}' where transfer_request_key = '00000000-0000-4000-8000-000000000984'$$, 'P0001', null, 'draft transfer identity and source payload remain immutable');

select throws_ok($$select * from public.create_gutter_takeoff_draft('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000971','00000000-0000-4000-8000-000000000973','00000000-0000-4000-8000-000000000975','cross project','00000000-0000-4000-8000-000000000985','[{"candidateId":"gutter-section:front","variantId":"00000000-0000-4000-8000-000000000979"}]')$$, 'P0002', null, 'cross-project calculation is rejected');
select throws_ok($$select * from public.create_gutter_takeoff_draft('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000970','00000000-0000-4000-8000-000000000973','00000000-0000-4000-8000-000000000999','invalid revision','00000000-0000-4000-8000-000000000986','[{"candidateId":"gutter-section:front","variantId":"00000000-0000-4000-8000-000000000979"}]')$$, 'P0002', null, 'nonexistent revision is rejected');
select throws_ok($$select * from public.create_gutter_takeoff_draft('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000970','00000000-0000-4000-8000-000000000973','00000000-0000-4000-8000-000000000975','cross organization variant','00000000-0000-4000-8000-000000000987','[{"candidateId":"gutter-section:front","variantId":"00000000-0000-4000-8000-000000000981"}]')$$, '42501', null, 'cross-organization catalog variant is rejected');
select throws_ok($$select * from public.create_gutter_takeoff_draft('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000970','00000000-0000-4000-8000-000000000973','00000000-0000-4000-8000-000000000975','incompatible unit','00000000-0000-4000-8000-000000000988','[{"candidateId":"gutter-section:front","variantId":"00000000-0000-4000-8000-000000000980"}]')$$, '22023', null, 'incompatible catalog unit is rejected');
select throws_ok($$select * from public.create_gutter_takeoff_draft('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000970','00000000-0000-4000-8000-000000000973','00000000-0000-4000-8000-000000000975','invalid candidate','00000000-0000-4000-8000-000000000989','[{"candidateId":"gutter-section:missing","variantId":"00000000-0000-4000-8000-000000000979"}]')$$, '22023', null, 'candidate absent from the saved revision is rejected');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select throws_ok($$select * from public.create_gutter_takeoff_draft('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000970','00000000-0000-4000-8000-000000000973','00000000-0000-4000-8000-000000000975','unauthorized','00000000-0000-4000-8000-000000000990','[{"candidateId":"gutter-section:front","variantId":"00000000-0000-4000-8000-000000000979"}]')$$, '42501', null, 'separate organization member cannot create destination takeoff');
select throws_ok($$insert into public.material_takeoff_items (organization_id, takeoff_id, variant_id, estimation_method, measurement_source, final_quantity, quantity_unit) values ('00000000-0000-4000-8000-000000000010',(select id from public.material_takeoffs where transfer_request_key = '00000000-0000-4000-8000-000000000983'),'00000000-0000-4000-8000-000000000979','manual','forged',1,'piece')$$, '42501', null, 'unauthorized user cannot add to destination draft');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select lives_ok($$select * from public.approve_material_takeoff('00000000-0000-4000-8000-000000000010',(select id from public.material_takeoffs where transfer_request_key = '00000000-0000-4000-8000-000000000983'),1)$$, 'owner can approve transferred draft');
select throws_ok($$update public.material_takeoffs set name = 'tampered' where transfer_request_key = '00000000-0000-4000-8000-000000000983'$$, 'P0001', null, 'approved transferred takeoff remains immutable');
select results_eq(
  $$update public.material_takeoff_items set final_quantity = 99 where takeoff_id = (select id from public.material_takeoffs where transfer_request_key = '00000000-0000-4000-8000-000000000983') returning final_quantity::numeric$$,
  $$select null::numeric where false$$,
  'approved transferred item update is rejected by the draft-only RLS policy'
);

select * from finish();
rollback;
