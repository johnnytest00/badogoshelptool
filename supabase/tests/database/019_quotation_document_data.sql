begin;
select plan(29);

select has_column('public','organizations','business_name','issuer business name is stored per organization');
select has_column('public','organizations','business_address','issuer address is stored per organization');
select has_column('public','organizations','tax_identifier','issuer tax identifier field is available without tax logic');
select has_table('public','quotation_document_sequences','organization numbering state exists');
select has_column('public','quotation_document_sequences','last_issued_number','number state is monotonic integer data');
select has_function('public','save_standalone_quotation_draft_with_document','document-aware standalone save RPC exists');
select ok((select relrowsecurity from pg_class where oid='public.quotation_document_sequences'::regclass),'number state has RLS enabled');
select ok(not has_table_privilege('authenticated','public.quotation_document_sequences','SELECT'),'authenticated users cannot read numbering state directly');

set local role postgres;
insert into public.organization_members (organization_id,user_id,role)
values ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002','member')
on conflict (organization_id,user_id) do update set role='member';

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select lives_ok($$update public.organizations set business_name='DEMO Kibocsátó Kft.', business_address='DEMO, Teszt utca 1.', contact_email='demo@example.invalid', tax_identifier='DEMO-ADAT' where id='00000000-0000-4000-8000-000000000010'$$,'organization owner can update issuer profile fields');
select is((select business_name from public.organizations where id='00000000-0000-4000-8000-000000000010'),'DEMO Kibocsátó Kft.','updated issuer profile can be read by a member');
select throws_ok($$update public.organizations set contact_email='invalid email' where id='00000000-0000-4000-8000-000000000010'$$,'23514',null,'malformed issuer contact email is rejected at the database boundary');
select lives_ok($$select * from public.save_standalone_quotation_draft_with_document(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000921',null,'DEMO dokumentumadatok',null,'[]'::jsonb,0,
 '{"recipientSource":"manual","recipientName":"DEMO kézi címzett","recipientAddress":"DEMO, Minta tér 2.","recipientEmail":"demo-recipient@example.invalid","recipientPhone":"+36 DEMO","recipientTaxIdentifier":"DEMO recipient ID","reference":"DEMO-REF","validUntil":"2027-01-31","notes":"DEMO megjegyzés","terms":"DEMO feltételek"}'::jsonb
)$$,'owner can save a draft with manual recipient and optional document metadata');
select set_config('test.document_quote_id',(select quotation_id::text from public.standalone_quotation_operations where operation_id='00000000-0000-4000-8000-000000000921'),true);
select is((select input_snapshot #>> '{document,issuer,businessName}' from public.quotation_revisions where quotation_id=current_setting('test.document_quote_id')::uuid and revision_number=1),'DEMO Kibocsátó Kft.','revision snapshots issuer profile from database');
select is((select input_snapshot #>> '{document,recipient,source}' from public.quotation_revisions where quotation_id=current_setting('test.document_quote_id')::uuid and revision_number=1),'manual','manual recipient source is explicit in immutable snapshot');
select is((select input_snapshot #>> '{document,recipient,address}' from public.quotation_revisions where quotation_id=current_setting('test.document_quote_id')::uuid and revision_number=1),'DEMO, Minta tér 2.','manual recipient address is persisted');
select is((select input_snapshot #>> '{document,validUntil}' from public.quotation_revisions where quotation_id=current_setting('test.document_quote_id')::uuid and revision_number=1),'2027-01-31','date-only validity is persisted without timezone conversion');
select is((select input_snapshot #>> '{document,terms}' from public.quotation_revisions where quotation_id=current_setting('test.document_quote_id')::uuid and revision_number=1),'DEMO feltételek','document conditions are persisted in revision');
reset role;
select is((select count(*)::int from public.quotation_document_sequences),0,'draft save does not create or allocate a document number');
set local role authenticated;

select lives_ok($$select * from public.save_standalone_quotation_draft_with_document(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000922',current_setting('test.document_quote_id')::uuid,'DEMO dokumentumadatok',null,'[]'::jsonb,1,
 '{"recipientSource":"manual","recipientName":"DEMO kézi címzett","recipientAddress":"DEMO, Minta tér 2.","reference":"DEMO-REF","validUntil":"2027-02-01","notes":"DEMO V2 megjegyzés"}'::jsonb
)$$,'document changes create a normal immutable draft revision');
select is((select count(*)::int from public.quotation_revisions where quotation_id=current_setting('test.document_quote_id')::uuid),2,'second save adds V2 without replacing V1');
select is((select input_snapshot #>> '{document,notes}' from public.quotation_revisions where quotation_id=current_setting('test.document_quote_id')::uuid and revision_number=1),'DEMO megjegyzés','historical V1 document metadata remains unchanged');
select is((select input_snapshot #>> '{document,notes}' from public.quotation_revisions where quotation_id=current_setting('test.document_quote_id')::uuid and revision_number=2),'DEMO V2 megjegyzés','V2 contains its own document metadata');

select lives_ok($$select * from public.save_standalone_quotation_draft_with_document(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000923',null,'DEMO linked recipient',
 '00000000-0000-4000-8000-000000000020','[]'::jsonb,0,'{"recipientSource":"client"}'::jsonb
)$$,'same-organization customer can be selected as recipient without sending customer fields');
select is((select r.input_snapshot #>> '{document,recipient,source}' from public.quotation_revisions r join public.standalone_quotation_operations o on o.revision_id=r.id where o.operation_id='00000000-0000-4000-8000-000000000923'),'linked_client','linked customer source is explicit');
select is((select r.input_snapshot #>> '{document,recipient,name}' from public.quotation_revisions r join public.standalone_quotation_operations o on o.revision_id=r.id where o.operation_id='00000000-0000-4000-8000-000000000923'),'DEMO ügyfél','linked recipient name is derived from trusted customer record');
select throws_ok($$select * from public.save_standalone_quotation_draft_with_document(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000924',null,'DEMO foreign client',
 '00000000-0000-4000-8000-000000000999','[]'::jsonb,0,'{"recipientSource":"client"}'::jsonb
)$$,'23503',null,'cross-organization or unknown customer is rejected');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select lives_ok($$update public.organizations set business_name='FORGED member update' where id='00000000-0000-4000-8000-000000000010'$$,'member update is safely filtered by organization RLS');
select is((select business_name from public.organizations where id='00000000-0000-4000-8000-000000000010'),'DEMO Kibocsátó Kft.','organization member cannot change issuer profile');
select throws_ok($$update public.quotation_document_sequences set last_issued_number=1 where organization_id='00000000-0000-4000-8000-000000000010'$$,'42501',null,'authenticated member cannot allocate or mutate a number');

select * from finish();
rollback;
