begin;
select plan(9);
set local role postgres;
insert into public.organizations(id,name) values
 ('00000000-0000-4000-8000-000000000010','DEMO mobile retry organization'),
 ('00000000-0000-4000-8000-000000000011','DEMO foreign mobile organization') on conflict do nothing;
insert into public.organization_members(organization_id,user_id,role) values
 ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','owner'),
 ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000002','owner') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select is((select version from public.save_field_survey('00000000-0000-4000-8000-000000000959','00000000-0000-4000-8000-000000000010',null,'gutter',
 '[{"id":"00000000-0000-4000-8000-000000000958","label":"DEMO eresz","value":8.5,"unit":"m","semanticType":"gutter_run_length"}]'::jsonb,'DEMO jegyzet',0)),1,'client-generated ID creates V1');
select is((select version from public.save_field_survey('00000000-0000-4000-8000-000000000959','00000000-0000-4000-8000-000000000010',null,'gutter',
 '[{"id":"00000000-0000-4000-8000-000000000958","label":"DEMO eresz","value":8.5,"unit":"m","semanticType":"gutter_run_length"}]'::jsonb,'DEMO jegyzet',0)),1,'lost V1 response retries without a duplicate');
select is((select count(*)::int from public.field_survey_revisions where survey_id='00000000-0000-4000-8000-000000000959'),1,'V1 retry leaves one immutable revision');
select throws_ok($$select * from public.save_field_survey('00000000-0000-4000-8000-000000000959','00000000-0000-4000-8000-000000000010',null,'gutter',
 '[{"id":"00000000-0000-4000-8000-000000000958","label":"DEMO eresz","value":9,"unit":"m","semanticType":"gutter_run_length"}]'::jsonb,'DEMO jegyzet',0)$$,'40001',null,'same ID with changed payload conflicts');
select is((select version from public.save_field_survey('00000000-0000-4000-8000-000000000959','00000000-0000-4000-8000-000000000010',null,'gutter',
 '[{"id":"00000000-0000-4000-8000-000000000958","label":"DEMO eresz","value":9,"unit":"m","semanticType":"gutter_run_length"}]'::jsonb,'DEMO V2',1)),2,'legitimate edit creates V2');
select is((select version from public.save_field_survey('00000000-0000-4000-8000-000000000959','00000000-0000-4000-8000-000000000010',null,'gutter',
 '[{"id":"00000000-0000-4000-8000-000000000958","label":"DEMO eresz","value":9,"unit":"m","semanticType":"gutter_run_length"}]'::jsonb,'DEMO V2',1)),2,'lost V2 response retries without V3');
select is((select count(*)::int from public.field_survey_revisions where survey_id='00000000-0000-4000-8000-000000000959'),2,'V2 retry leaves exactly two revisions');
select throws_ok($$select * from public.save_field_survey('00000000-0000-4000-8000-000000000959','00000000-0000-4000-8000-000000000010',null,'gutter',
 '[{"id":"00000000-0000-4000-8000-000000000958","label":"DEMO eresz","value":10,"unit":"m","semanticType":"gutter_run_length"}]'::jsonb,'DEMO V3',1)$$,'40001',null,'stale changed edit still conflicts');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select throws_ok($$select * from public.save_field_survey('00000000-0000-4000-8000-000000000959','00000000-0000-4000-8000-000000000011',null,'gutter',
 '[{"id":"00000000-0000-4000-8000-000000000958","label":"DEMO eresz","value":8.5,"unit":"m","semanticType":"gutter_run_length"}]'::jsonb,'DEMO jegyzet',0)$$,'42501',null,'foreign organization cannot reuse the creator ID');
select * from finish();
rollback;
