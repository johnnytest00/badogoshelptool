begin;
select plan(24);
select has_table('public', 'field_surveys', 'field surveys table exists');
select has_function('public', 'save_field_survey', 'authenticated survey save RPC exists');
select ok(has_function_privilege('authenticated','public.save_field_survey(uuid,uuid,uuid,text,jsonb,text,integer)','EXECUTE'),'authenticated role can use the validated save RPC');
select ok(not has_function_privilege('anon','public.save_field_survey(uuid,uuid,uuid,text,jsonb,text,integer)','EXECUTE'),'anonymous role cannot use save RPC');
select ok(has_table_privilege('authenticated','public.field_surveys','SELECT'),'authenticated role can select through RLS');
select ok(not has_table_privilege('authenticated','public.field_surveys','INSERT'),'direct authenticated table insert is unavailable');
select ok(not has_table_privilege('authenticated','public.field_surveys','UPDATE'),'direct authenticated table update is unavailable');

set local role postgres;
insert into public.organizations(id,name) values ('00000000-0000-4000-8000-000000000011','DEMO F9.7.8.1 foreign organization') on conflict do nothing;
insert into public.organization_members(organization_id,user_id,role)
values ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002','member'),
 ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000002','owner')
on conflict do nothing;
insert into public.projects(id,organization_id,name,project_type,status,created_by) values
 ('00000000-0000-4000-8000-000000000823','00000000-0000-4000-8000-000000000010','DEMO field survey project','gutter_work','draft','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000824','00000000-0000-4000-8000-000000000011','DEMO field survey foreign project','gutter_work','draft','00000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select is(auth.uid(),'00000000-0000-4000-8000-000000000001'::uuid,'owner user has a real local auth subject');
select set_config('test.calculation_count_before',(select count(*)::text from public.calculations),true);
select set_config('test.standalone_id', (select survey_id::text from public.save_field_survey(null,'00000000-0000-4000-8000-000000000010',null,'gutter',
 '[{"id":"00000000-0000-4000-8000-000000000825","label":"DEMO ereszszakasz","value":8.5,"unit":"m"}]'::jsonb,null,0)), true);
select is((select version from public.field_surveys where id=current_setting('test.standalone_id')::uuid),1,'fast standalone create saves V1');
select is((select measurements #>> '{0,value}' from public.field_surveys where id=current_setting('test.standalone_id')::uuid),'8.5','measurement value is persistent');
select is((select measurements #>> '{0,unit}' from public.field_surveys where id=current_setting('test.standalone_id')::uuid),'m','measurement unit is explicit and persistent');
select is((select notes from public.field_surveys where id=current_setting('test.standalone_id')::uuid),null::text,'optional note can be absent');
select throws_ok($$select * from public.save_field_survey(null,'00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000824','gutter','[{"id":"00000000-0000-4000-8000-000000000826","label":"DEMO foreign","value":4,"unit":"m"}]'::jsonb,null,0)$$,'42501',null,'cross-organization project association is denied');
select throws_ok($$select * from public.save_field_survey(null,'00000000-0000-4000-8000-000000000010',null,'gutter','[{"id":"00000000-0000-4000-8000-000000000826","label":"DEMO invalid unit","value":4,"unit":"ft"}]'::jsonb,null,0)$$,'22023',null,'unknown unit is rejected by RPC');
select throws_ok($$select * from public.save_field_survey(null,'00000000-0000-4000-8000-000000000010',null,'gutter','[{"id":"00000000-0000-4000-8000-000000000826","label":"DEMO invalid count","value":1.5,"unit":"count"}]'::jsonb,null,0)$$,'22023',null,'fractional count is rejected by RPC');
select throws_ok($$insert into public.field_surveys(organization_id,created_by,updated_by,work_type,measurements) values('00000000-0000-4000-8000-000000000010',auth.uid(),auth.uid(),'other','[]')$$,'42501',null,'direct table write is rejected');
select set_config('test.project_survey_id', (select survey_id::text from public.save_field_survey(null,'00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000823','gutter',
 '[{"id":"00000000-0000-4000-8000-000000000827","label":"DEMO projekt eresz","value":12500,"unit":"mm"}]'::jsonb,'DEMO megjegyzés',0)), true);
select is((select project_id from public.field_surveys where id=current_setting('test.project_survey_id')::uuid),'00000000-0000-4000-8000-000000000823'::uuid,'authorized project link is saved');
select is((select version from public.save_field_survey(current_setting('test.project_survey_id')::uuid,'00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000823','gutter',
 '[{"id":"00000000-0000-4000-8000-000000000827","label":"DEMO projekt eresz","value":13,"unit":"m"}]'::jsonb,'DEMO frissített megjegyzés',1)),2,'continued edit creates the next version');
select throws_ok($$select * from public.save_field_survey(current_setting('test.project_survey_id')::uuid,'00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000823','gutter','[{"id":"00000000-0000-4000-8000-000000000827","label":"DEMO stale","value":11,"unit":"m"}]'::jsonb,null,1)$$,'40001',null,'stale expected version is rejected');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select is_empty('select 1 from public.field_surveys where id=current_setting(''test.standalone_id'')::uuid','peer cannot read another creator standalone survey');
select is((select count(*)::int from public.field_surveys where id=current_setting('test.project_survey_id')::uuid),1,'active organization member can read project survey');
select throws_ok($$select * from public.save_field_survey(current_setting('test.standalone_id')::uuid,'00000000-0000-4000-8000-000000000010',null,'gutter','[{"id":"00000000-0000-4000-8000-000000000825","label":"DEMO peer update","value":9,"unit":"m"}]'::jsonb,null,1)$$,'42501',null,'peer cannot edit creator standalone survey');
select set_config('test.foreign_survey_id', (select survey_id::text from public.save_field_survey(null,'00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000824','other',
 '[{"id":"00000000-0000-4000-8000-000000000828","label":"DEMO foreign measurement","value":2,"unit":"m2"}]'::jsonb,null,0)), true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select is_empty('select 1 from public.field_surveys where id=current_setting(''test.foreign_survey_id'')::uuid','cross-organization survey read is denied');
select is((select count(*)::int from public.calculations),current_setting('test.calculation_count_before')::int,'survey saves do not create calculations');
select * from finish();
rollback;
