begin;
select no_plan();
set local role postgres;
insert into public.organizations(id, name) values ('00000000-0000-4000-8000-000000000052', 'DEMO F9.44.3') on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values ('00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000000001', 'owner') on conflict do nothing;
create or replace function pg_temp.sec(extra text, wt text default 'gutter') returns jsonb language sql as $$
  select ('[{"id":"00000000-0000-4000-8000-000000986001","name":"DEMO elem","workType":"' || wt || '",' || extra || '"notes":"","photoIds":[],"measurements":[
   {"id":"00000000-0000-4000-8000-000000986011","label":"Szakasz","value":null,"unit":"m","semanticType":"gutter_run_length"}]}]')::jsonb $$;
select ok(private.valid_field_survey_sections(pg_temp.sec('"elementKind":"gutter",')), 'a gutter element with an incomplete (null) length is valid');
select ok(private.valid_field_survey_sections(pg_temp.sec('"elementKind":"gutter","lengthSource":{"roofSectionId":"00000000-0000-4000-8000-000000986002","role":"eave_total"},')), 'an accepted eave-length source is valid');
select ok(not private.valid_field_survey_sections(pg_temp.sec('"elementKind":"gutter","lengthSource":{"roofSectionId":"00000000-0000-4000-8000-000000986002","role":"ridge"},')), 'a role not meaningful for the element is rejected');
select ok(not private.valid_field_survey_sections(pg_temp.sec('"elementKind":"gutter","lengthSource":{"roofSectionId":"x","role":"eave_total"},')), 'a malformed source section id is rejected');
select ok(not private.valid_field_survey_sections(pg_temp.sec('"lengthSource":{"roofSectionId":"00000000-0000-4000-8000-000000986002","role":"eave_total"},')), 'a source without an element kind is rejected');
select ok(not private.valid_field_survey_sections(pg_temp.sec('"elementKind":"chimney",')), 'an element kind must match its work type');
select ok(not private.valid_field_survey_sections(pg_temp.sec('"elementKind":"bogus",')), 'unknown element kinds are rejected');
select ok(private.valid_field_survey_sections(pg_temp.sec('"elementKind":"chimney",', 'other')), 'a chimney element is an "other" section');
select ok(private.valid_field_survey_sections(pg_temp.sec('', 'gutter')), 'legacy sections without an element kind stay valid');

-- A survey with only gutter work saves, with no roof and no project.
create temp table t_e as select pg_temp.sec('"elementKind":"gutter",') as sections;
update t_e set sections = jsonb_set(sections, '{0,measurements,0,value}', '12.5');
alter table t_e add column measurements jsonb;
update t_e set measurements = private.field_survey_section_measurements(sections);
grant all on t_e to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select lives_ok($$select version from public.save_field_survey_workspace('00000000-0000-4000-8000-000000986000'::uuid, '00000000-0000-4000-8000-000000000052', null, 'gutter', (select measurements from t_e), 'DEMO', 0, (select sections from t_e))$$, 'a gutter-only survey saves');
select is((select sections->0->>'elementKind' from public.field_survey_revisions where survey_id='00000000-0000-4000-8000-000000986000' and version=1), 'gutter', 'the immutable revision keeps the element kind');
select * from finish();
rollback;
