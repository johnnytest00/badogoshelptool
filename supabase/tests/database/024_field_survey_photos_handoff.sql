begin;
select plan(35);
select has_table('public', 'field_survey_photos', 'private survey photo metadata exists');
select has_table('public', 'field_survey_revisions', 'immutable survey revisions exist');
select is((select public from storage.buckets where id='field-survey-photos'),false,'survey photo bucket is private');
select ok(not has_table_privilege('authenticated','public.field_survey_photos','INSERT'),'authenticated users cannot forge photo metadata');
select ok(not has_function_privilege('authenticated','public.reserve_field_survey_photo_upload(uuid,uuid,uuid,text,text,text,bigint,text,text,uuid,integer,uuid)','EXECUTE'),'authenticated users cannot forge writer reservations');
select ok(not has_function_privilege('authenticated','public.attach_field_survey_photo(uuid,uuid,uuid,integer,uuid)','EXECUTE'),'authenticated users cannot invoke trusted attachment');
select ok(has_function_privilege('tetopro_covering_writer','public.reserve_field_survey_photo_upload(uuid,uuid,uuid,text,text,text,bigint,text,text,uuid,integer,uuid)','EXECUTE'),'restricted server writer can reserve photos');
select ok(has_function_privilege('tetopro_covering_writer','public.remove_field_survey_photo(uuid,uuid,integer,uuid)','EXECUTE'),'restricted server writer can detach photos');

set local role postgres;
insert into public.organizations(id,name) values
 ('00000000-0000-4000-8000-000000000010','DEMO survey photos organization'),
 ('00000000-0000-4000-8000-000000000011','DEMO survey photos foreign organization') on conflict do nothing;
insert into public.organization_members(organization_id,user_id,role) values
 ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','owner'),
 ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002','member'),
 ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000002','owner') on conflict do nothing;
insert into public.projects(id,organization_id,name,project_type,status,created_by) values
 ('00000000-0000-4000-8000-000000000823','00000000-0000-4000-8000-000000000010','DEMO photo project','gutter_work','draft','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000824','00000000-0000-4000-8000-000000000011','DEMO foreign photo project','gutter_work','draft','00000000-0000-4000-8000-000000000002') on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select is(auth.uid(),'00000000-0000-4000-8000-000000000001'::uuid,'local authenticated creator subject is active');
select set_config('test.photo_survey_id',(select survey_id::text from public.save_field_survey(null,'00000000-0000-4000-8000-000000000010',null,'gutter',
 '[{"id":"00000000-0000-4000-8000-000000000825","label":"DEMO eresz","value":8.5,"unit":"m","semanticType":"gutter_run_length"}]'::jsonb,'DEMO fotós felmérés',0)),true);
select is((select version from public.field_survey_revisions where survey_id=current_setting('test.photo_survey_id')::uuid and version=1),1,'initial save records an immutable V1 input snapshot');
select is((select measurements #>> '{0,value}' from public.field_survey_revisions where survey_id=current_setting('test.photo_survey_id')::uuid and version=1),'8.5','V1 records the exact measurement');
select is((select version from public.save_field_survey(current_setting('test.photo_survey_id')::uuid,'00000000-0000-4000-8000-000000000010',null,'gutter',
 '[{"id":"00000000-0000-4000-8000-000000000825","label":"DEMO eresz","value":9.5,"unit":"m","semanticType":"gutter_run_length"}]'::jsonb,'DEMO V2',1)),2,'editing creates V2');
select is((select measurements #>> '{0,value}' from public.field_survey_revisions where survey_id=current_setting('test.photo_survey_id')::uuid and version=1),'8.5','V1 remains unchanged after V2');
select throws_ok($$select * from public.save_field_survey(current_setting('test.photo_survey_id')::uuid,'00000000-0000-4000-8000-000000000010',null,'gutter','[{"id":"00000000-0000-4000-8000-000000000825","label":"DEMO hibás eresz","value":9,"unit":"degree","semanticType":"gutter_run_length"}]'::jsonb,null,2)$$,'22023',null,'server rejects incompatible semantic measurement units');
set local role postgres;
select throws_ok($$update public.field_survey_revisions set notes='forged' where survey_id=current_setting('test.photo_survey_id')::uuid and version=1$$,'55000',null,'revision update is blocked by immutable trigger');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select set_config('test.foreign_survey_id',(select survey_id::text from public.save_field_survey(null,'00000000-0000-4000-8000-000000000011',null,'other',
 '[{"id":"00000000-0000-4000-8000-000000000826","label":"DEMO foreign","value":3,"unit":"count"}]'::jsonb,null,0)),true);
reset role;
set local role postgres;
select throws_ok($$select * from public.reserve_field_survey_photo_upload(
 current_setting('test.photo_survey_id')::uuid,'00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000902',
 '00000000-0000-4000-8000-000000000010/'||current_setting('test.photo_survey_id')||'/00000000-0000-4000-8000-000000000902.jpg',
 'DEMO helyszin.jpg','image/gif',128,'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',null,
 '00000000-0000-4000-8000-000000000902',2,'00000000-0000-4000-8000-000000000001')$$,'22023',null,'server rejects invalid photo MIME metadata');
select is((select photo_id from public.reserve_field_survey_photo_upload(
 current_setting('test.photo_survey_id')::uuid,'00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000901',
 '00000000-0000-4000-8000-000000000010/'||current_setting('test.photo_survey_id')||'/00000000-0000-4000-8000-000000000901.jpg',
 'DEMO helyszin.jpg','image/jpeg',128,'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','DEMO ereszcsomópont',
 '00000000-0000-4000-8000-000000000901',2,'00000000-0000-4000-8000-000000000001')), '00000000-0000-4000-8000-000000000901'::uuid,'restricted writer creates an authorized pending upload reservation');
select is((select reused from public.reserve_field_survey_photo_upload(
 current_setting('test.photo_survey_id')::uuid,'00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000901',
 '00000000-0000-4000-8000-000000000010/'||current_setting('test.photo_survey_id')||'/00000000-0000-4000-8000-000000000901.jpg',
 'DEMO helyszin.jpg','image/jpeg',128,'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','DEMO ereszcsomópont',
 '00000000-0000-4000-8000-000000000901',2,'00000000-0000-4000-8000-000000000001')),true,'same-key same-content reservation retries idempotently');
select is((select version from public.attach_field_survey_photo(current_setting('test.photo_survey_id')::uuid,'00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000901',2,'00000000-0000-4000-8000-000000000001')),3,'photo attachment creates survey V3');
select is((select upload_state from public.field_survey_photos where id='00000000-0000-4000-8000-000000000901'),'active','reserved photo becomes active');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select is(jsonb_array_length((select photos_snapshot from public.field_survey_revisions where survey_id=current_setting('test.photo_survey_id')::uuid and version=3)),1,'V3 snapshot includes the attached photo reference');
select is((select photos_snapshot #>> '{0,id}' from public.field_survey_revisions where survey_id=current_setting('test.photo_survey_id')::uuid and version=3),'00000000-0000-4000-8000-000000000901','photo snapshot preserves the exact photo ID');
select is(jsonb_array_length((select photos_snapshot from public.field_survey_revisions where survey_id=current_setting('test.photo_survey_id')::uuid and version=1)),0,'V1 shows its own empty photo state');
select is(jsonb_array_length((select photos_snapshot from public.field_survey_revisions where survey_id=current_setting('test.photo_survey_id')::uuid and version=2)),0,'V2 shows its own empty photo state');
select set_config('test.project_survey_id',(select survey_id::text from public.save_field_survey(null,'00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000823','gutter',
 '[{"id":"00000000-0000-4000-8000-000000000827","label":"DEMO projekt eresz","value":12,"unit":"m","semanticType":"gutter_run_length"}]'::jsonb,'DEMO projekthez kötött fotó',0)),true);
set local role postgres;
select * from public.reserve_field_survey_photo_upload(
 current_setting('test.project_survey_id')::uuid,'00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000903',
 '00000000-0000-4000-8000-000000000010/'||current_setting('test.project_survey_id')||'/00000000-0000-4000-8000-000000000903.jpg',
 'DEMO projekt.jpg','image/jpeg',128,'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',null,
 '00000000-0000-4000-8000-000000000903',1,'00000000-0000-4000-8000-000000000001');
select is((select version from public.attach_field_survey_photo(current_setting('test.project_survey_id')::uuid,'00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000903',1,'00000000-0000-4000-8000-000000000001')),2,'authorized project photo attachment creates V2');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select is((select count(*)::int from public.field_survey_photos where survey_id=current_setting('test.project_survey_id')::uuid),1,'active project member can read project survey photo');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select is_empty('select 1 from public.field_survey_photos where id=''00000000-0000-4000-8000-000000000901''','photo metadata is not visible across standalone creator boundary');
select is_empty('select 1 from public.field_survey_revisions where survey_id=current_setting(''test.photo_survey_id'')::uuid and version=3','peer cannot fetch historical standalone photo snapshot');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select is_empty('select 1 from public.field_survey_revisions where survey_id=current_setting(''test.foreign_survey_id'')::uuid','cross-organization revisions are isolated');
select is((select count(*)::int from public.field_surveys where id=current_setting('test.foreign_survey_id')::uuid),0,'cross-organization survey is isolated');
select throws_ok($$select * from public.remove_field_survey_photo(current_setting('test.photo_survey_id')::uuid,'00000000-0000-4000-8000-000000000901',3,auth.uid())$$,'42501',null,'authenticated role cannot call trusted photo removal directly');
reset role;
set local role postgres;
select is((select version from public.remove_field_survey_photo(current_setting('test.photo_survey_id')::uuid,'00000000-0000-4000-8000-000000000901',3,'00000000-0000-4000-8000-000000000001')),4,'authorized removal creates V4');
reset role;
select is(jsonb_array_length((select photos_snapshot from public.field_survey_revisions where survey_id=current_setting('test.photo_survey_id')::uuid and version=3)),1,'V3 photo snapshot survives removal');
select is(jsonb_array_length((select photos_snapshot from public.field_survey_revisions where survey_id=current_setting('test.photo_survey_id')::uuid and version=4)),0,'V4 snapshot reflects the removed photo');
select is((select count(*)::int from public.field_survey_photos where id='00000000-0000-4000-8000-000000000901'),1,'removed photo metadata remains for authorized historical access');
select * from finish();
rollback;
