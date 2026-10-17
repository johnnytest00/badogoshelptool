begin;
select no_plan();

set local role postgres;
insert into public.organizations(id, name) values
  ('00000000-0000-4000-8000-000000000010', 'DEMO F9.32 quotation workflow')
on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'owner')
on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('test.revision_id', (select revision_id::text from public.save_standalone_quotation_draft_with_document(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000932', null,
  'DEMO F9.32 árazatlan forrástétel', null,
  '[{"type":"MATERIAL","description":"DEMO felmérési tétel","quantity":"12","unit":"m","unitPrice":"","priceClass":"net","variantId":"","categoryId":"","priceId":"","priceProvenance":"missing","takeoffItemId":"","notes":""}]'::jsonb,
  0, '{"recipientSource":"manual"}'::jsonb
)), true);

select is((select line_items_snapshot #>> '{0,unitPrice}' from public.quotation_revisions where id=current_setting('test.revision_id')::uuid), '', 'an absent quotation price stays empty in the immutable revision');
select is((select line_items_snapshot #>> '{0,priceProvenance}' from public.quotation_revisions where id=current_setting('test.revision_id')::uuid), 'missing', 'the missing-price provenance is preserved');
select is((select line_items_snapshot #>> '{0,lineTotal}' from public.quotation_revisions where id=current_setting('test.revision_id')::uuid), '0.00', 'an unpriced row contributes no invented money to the partial draft subtotal');
select is((select totals_snapshot->>'complete' from public.quotation_revisions where id=current_setting('test.revision_id')::uuid), 'false', 'a draft containing an unpriced item stays incomplete');
select is((select subtotal::text from public.quotation_revisions where id=current_setting('test.revision_id')::uuid), '0.00', 'the partial subtotal is stored without assigning a line price');

select * from finish();
rollback;
