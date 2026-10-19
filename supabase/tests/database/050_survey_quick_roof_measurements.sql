begin;
select no_plan();
set local role postgres;
insert into public.organizations(id, name) values ('00000000-0000-4000-8000-000000000050', 'DEMO F9.44.1') on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values ('00000000-0000-4000-8000-000000000050', '00000000-0000-4000-8000-000000000001', 'owner') on conflict do nothing;

create temp table t_q as select '[{"id":"00000000-0000-4000-8000-000000985001","name":"DEMO gyors tető","workType":"roof","roofType":"gable","roofMeasurementMode":"quick","quickPlanesMatch":true,"notes":"","photoIds":[],"measurements":[
   {"id":"00000000-0000-4000-8000-000000985011","label":"Tetőhossz","value":10.5,"unit":"m","semanticType":"roof_eave_run"},
   {"id":"00000000-0000-4000-8000-000000985012","label":"A sík","value":4.2,"unit":"m","semanticType":"roof_plane_slope_a"},
   {"id":"00000000-0000-4000-8000-000000985013","label":"B sík","value":null,"unit":"m","semanticType":"roof_plane_slope_b"}]}]'::jsonb as sections, private.field_survey_section_measurements('[{"id":"00000000-0000-4000-8000-000000985001","name":"DEMO gyors tető","workType":"roof","roofType":"gable","roofMeasurementMode":"quick","quickPlanesMatch":true,"notes":"","photoIds":[],"measurements":[
   {"id":"00000000-0000-4000-8000-000000985011","label":"Tetőhossz","value":10.5,"unit":"m","semanticType":"roof_eave_run"},
   {"id":"00000000-0000-4000-8000-000000985012","label":"A sík","value":4.2,"unit":"m","semanticType":"roof_plane_slope_a"},
   {"id":"00000000-0000-4000-8000-000000985013","label":"B sík","value":null,"unit":"m","semanticType":"roof_plane_slope_b"}]}]'::jsonb) as measurements;
grant all on t_q to authenticated;
select ok(not private.valid_field_survey_sections('[{"id":"00000000-0000-4000-8000-000000985031","name":"x","workType":"roof","roofType":"hip","roofMeasurementMode":"quick","notes":"","photoIds":[],"measurements":[]}]'::jsonb), 'the mode is rejected for non-gable roofs');
select ok(not private.valid_field_survey_sections('[{"id":"00000000-0000-4000-8000-000000985032","name":"x","workType":"roof","roofType":"gable","roofMeasurementMode":"turbo","notes":"","photoIds":[],"measurements":[]}]'::jsonb), 'unsupported modes are rejected');
select ok(not private.valid_field_survey_sections('[{"id":"00000000-0000-4000-8000-000000985033","name":"x","workType":"roof","roofType":"gable","quickPlanesMatch":"yes","notes":"","photoIds":[],"measurements":[]}]'::jsonb), 'the plane confirmation must be boolean');
select ok(private.valid_field_survey_sections('[{"id":"00000000-0000-4000-8000-000000985034","name":"x","workType":"roof","roofType":"gable","notes":"","photoIds":[],"measurements":[{"id":"00000000-0000-4000-8000-000000985035","label":"h","value":10,"unit":"m","semanticType":"roof_building_length"}]}]'::jsonb), 'legacy gable sections without a mode stay valid');
select ok(not private.valid_field_survey_measurements('[{"id":"00000000-0000-4000-8000-000000985036","label":"x","value":3,"unit":"degree","semanticType":"roof_eave_run"}]'::jsonb), 'quick lengths need mm or m');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

select lives_ok($$select version from public.save_field_survey_workspace('00000000-0000-4000-8000-000000985000'::uuid, '00000000-0000-4000-8000-000000000050', null, 'roof', (select measurements from t_q), 'DEMO', 0, (select sections from t_q))$$, 'a quick-mode gable section with an unfilled B plane saves');
select is((select sections->0->>'roofMeasurementMode' from public.field_survey_revisions where survey_id='00000000-0000-4000-8000-000000985000' and version=1), 'quick', 'the immutable revision keeps the measurement mode');
select is((select (sections->0->>'quickPlanesMatch')::boolean from public.field_survey_revisions where survey_id='00000000-0000-4000-8000-000000985000' and version=1), true, 'the explicit plane confirmation is kept');
select * from finish();
rollback;
