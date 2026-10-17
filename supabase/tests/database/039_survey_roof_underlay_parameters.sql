begin;
select plan(13);

select ok(private.valid_field_survey_sections('[{"id":"00000000-0000-4000-8000-000000000100","name":"DEMO tető","workType":"roof","measurements":[],"notes":"","photoIds":[],"roofType":"gable","roofUnderlayParameters":{"rollWidthMm":1500,"rollLengthMm":50000,"sideOverlapMm":150,"installationDirection":"eave-to-ridge"}}]'::jsonb), 'partial optional user-provided underlay parameters are valid on a roof section');
select ok(private.valid_field_survey_sections('[{"id":"00000000-0000-4000-8000-000000000100","name":"DEMO tető","workType":"roof","measurements":[],"notes":"","photoIds":[],"roofType":"gable"}]'::jsonb), 'basic roof measurements remain valid without underlay parameters');
select ok(not private.valid_field_survey_sections('[{"id":"00000000-0000-4000-8000-000000000100","name":"DEMO tető","workType":"roof","measurements":[],"notes":"","photoIds":[],"roofUnderlayParameters":{"rollWidthMm":0}}]'::jsonb), 'zero roll width is rejected');
select ok(not private.valid_field_survey_sections('[{"id":"00000000-0000-4000-8000-000000000100","name":"DEMO tető","workType":"roof","measurements":[],"notes":"","photoIds":[],"roofUnderlayParameters":{"rollWidthMm":1500,"sideOverlapMm":1500}}]'::jsonb), 'side overlap must be smaller than supplied roll width');
select ok(not private.valid_field_survey_sections('[{"id":"00000000-0000-4000-8000-000000000100","name":"DEMO tető","workType":"roof","measurements":[],"notes":"","photoIds":[],"roofUnderlayParameters":{"rollLengthMm":50000,"endOverlapMm":50000}}]'::jsonb), 'end overlap must be smaller than supplied roll length');
select ok(not private.valid_field_survey_sections('[{"id":"00000000-0000-4000-8000-000000000100","name":"DEMO tető","workType":"roof","measurements":[],"notes":"","photoIds":[],"roofUnderlayParameters":{"installationDirection":"guess"}}]'::jsonb), 'unknown installation direction is rejected');
select ok(not private.valid_field_survey_sections('[{"id":"00000000-0000-4000-8000-000000000100","name":"DEMO eresz","workType":"gutter","measurements":[],"notes":"","photoIds":[],"roofUnderlayParameters":{"rollWidthMm":1500}}]'::jsonb), 'underlay parameters are rejected on non-roof sections');
select ok(not private.valid_field_survey_sections('[{"id":"00000000-0000-4000-8000-000000000100","name":"DEMO tető","workType":"roof","measurements":[],"notes":"","photoIds":[],"roofUnderlayParameters":{"rollWidthMm":1500,"madeUpMm":20}}]'::jsonb), 'unknown underlay fields are rejected');

insert into public.organization_members(organization_id,user_id,role) values('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','owner') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select is((select version from public.save_field_survey_workspace(
  '00000000-0000-4000-8000-000000979701','00000000-0000-4000-8000-000000000010',null,'roof',
  '[{"id":"00000000-0000-4000-8000-000000979702","label":"DEMO tetőhossz","value":10000,"unit":"mm","semanticType":"roof_building_length"}]'::jsonb,
  'DEMO fóliaparaméter',0,
  '[{"id":"00000000-0000-4000-8000-000000979703","name":"DEMO fóliás tető","workType":"roof","roofType":"gable","notes":"","photoIds":[],"measurements":[{"id":"00000000-0000-4000-8000-000000979702","label":"DEMO tetőhossz","value":10000,"unit":"mm","semanticType":"roof_building_length"}],"roofUnderlayParameters":{"rollWidthMm":1500,"rollLengthMm":50000,"sideOverlapMm":150,"endOverlapMm":0,"installationDirection":"eave-to-ridge"}}]'::jsonb
)),1,'optional underlay parameters save through the authenticated Survey writer');
select is((select sections->0->'roofUnderlayParameters' from public.field_survey_revisions where survey_id='00000000-0000-4000-8000-000000979701' and version=1),'{"rollWidthMm":1500,"rollLengthMm":50000,"sideOverlapMm":150,"endOverlapMm":0,"installationDirection":"eave-to-ridge"}'::jsonb,'immutable V1 snapshot retains the underlay parameters');
select is((select version from public.save_field_survey_workspace(
  '00000000-0000-4000-8000-000000979701','00000000-0000-4000-8000-000000000010',null,'roof',
  '[{"id":"00000000-0000-4000-8000-000000979702","label":"DEMO tetőhossz","value":10000,"unit":"mm","semanticType":"roof_building_length"}]'::jsonb,
  'DEMO fóliaparaméter',1,
  '[{"id":"00000000-0000-4000-8000-000000979703","name":"DEMO fóliás tető","workType":"roof","roofType":"gable","notes":"","photoIds":[],"measurements":[{"id":"00000000-0000-4000-8000-000000979702","label":"DEMO tetőhossz","value":10000,"unit":"mm","semanticType":"roof_building_length"}],"roofUnderlayParameters":{"rollWidthMm":1500,"rollLengthMm":50000,"sideOverlapMm":200,"endOverlapMm":0,"installationDirection":"ridge-to-eave"}}]'::jsonb
)),2,'editing the saved underlay parameters creates a normal Survey revision');
select is((select sections->0->'roofUnderlayParameters'->>'sideOverlapMm' from public.field_survey_revisions where survey_id='00000000-0000-4000-8000-000000979701' and version=1),'150','V1 underlay snapshot remains unchanged after V2');
select is((select sections->0->'roofUnderlayParameters'->>'sideOverlapMm' from public.field_survey_revisions where survey_id='00000000-0000-4000-8000-000000979701' and version=2),'200','V2 stores the edited underlay parameter');
reset role;

select * from finish();
rollback;
