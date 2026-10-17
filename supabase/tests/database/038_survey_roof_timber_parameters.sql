begin;
select plan(9);

select ok(private.valid_field_survey_sections('[{"id":"00000000-0000-4000-8000-000000000100","name":"DEMO tető","workType":"roof","measurements":[],"notes":"","photoIds":[],"roofType":"gable","roofTimberParameters":{"rafterMaxSpacingMm":600,"rafterStartInsetMm":0,"battenSectionWidthMm":30}}]'::jsonb), 'partial optional construction parameters are valid in roof snapshots');
select ok(not private.valid_field_survey_sections('[{"id":"00000000-0000-4000-8000-000000000100","name":"DEMO tető","workType":"roof","measurements":[],"notes":"","photoIds":[],"roofTimberParameters":{"rafterMaxSpacingMm":100001}}]'::jsonb), 'out-of-range construction parameters are rejected');
select ok(not private.valid_field_survey_sections('[{"id":"00000000-0000-4000-8000-000000000100","name":"DEMO eresz","workType":"gutter","measurements":[],"notes":"","photoIds":[],"roofTimberParameters":{"rafterMaxSpacingMm":600}}]'::jsonb), 'roof construction parameters are rejected on non-roof sections');

insert into public.organization_members(organization_id,user_id,role) values('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','owner') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select is((select version from public.save_field_survey_workspace(
  '00000000-0000-4000-8000-000000979601','00000000-0000-4000-8000-000000000010',null,'roof',
  '[{"id":"00000000-0000-4000-8000-000000979602","label":"DEMO tetőhossz","value":10000,"unit":"mm","semanticType":"roof_building_length"}]'::jsonb,
  'DEMO faanyag-bemenet',0,
  '[{"id":"00000000-0000-4000-8000-000000979603","name":"DEMO tető","workType":"roof","roofType":"gable","notes":"","photoIds":[],"measurements":[{"id":"00000000-0000-4000-8000-000000979602","label":"DEMO tetőhossz","value":10000,"unit":"mm","semanticType":"roof_building_length"}],"roofTimberParameters":{"rafterMaxSpacingMm":600,"rafterStartInsetMm":0}}]'::jsonb
)),1,'optional construction inputs save through the existing Survey writer');
select is((select sections->0->'roofTimberParameters' from public.field_surveys where id='00000000-0000-4000-8000-000000979601'),'{"rafterStartInsetMm":0,"rafterMaxSpacingMm":600}'::jsonb,'current Survey snapshot retains construction parameters');
select is((select sections->0->'roofTimberParameters' from public.field_survey_revisions where survey_id='00000000-0000-4000-8000-000000979601' and version=1),'{"rafterStartInsetMm":0,"rafterMaxSpacingMm":600}'::jsonb,'immutable V1 snapshot retains construction parameters');
select is((select version from public.save_field_survey_workspace(
  '00000000-0000-4000-8000-000000979601','00000000-0000-4000-8000-000000000010',null,'roof',
  '[{"id":"00000000-0000-4000-8000-000000979602","label":"DEMO tetőhossz","value":10000,"unit":"mm","semanticType":"roof_building_length"}]'::jsonb,
  'DEMO faanyag-bemenet',1,
  '[{"id":"00000000-0000-4000-8000-000000979603","name":"DEMO tető","workType":"roof","roofType":"gable","notes":"","photoIds":[],"measurements":[{"id":"00000000-0000-4000-8000-000000979602","label":"DEMO tetőhossz","value":10000,"unit":"mm","semanticType":"roof_building_length"}],"roofTimberParameters":{"rafterMaxSpacingMm":750,"rafterStartInsetMm":0}}]'::jsonb
)),2,'changing an optional construction parameter advances the normal versioned writer');
select is((select sections->0->'roofTimberParameters' from public.field_survey_revisions where survey_id='00000000-0000-4000-8000-000000979601' and version=1)->>'rafterMaxSpacingMm','600','later save leaves the original immutable snapshot intact');
select is((select sections->0->'roofTimberParameters' from public.field_survey_revisions where survey_id='00000000-0000-4000-8000-000000979601' and version=2)->>'rafterMaxSpacingMm','750','new revision stores the edited spacing');
reset role;

select * from finish();
rollback;
