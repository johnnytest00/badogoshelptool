begin;
select plan(8);
\ir _demo_workflow_fixture.inc
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('test.f99_sections','[{"id":"00000000-0000-4000-8000-000000030001","name":"DEMO tető","workType":"roof","notes":"","photoIds":[],"measurements":[{"id":"00000000-0000-4000-8000-000000030011","label":"DEMO hossz","value":10,"unit":"m","semanticType":"roof_building_length"},{"id":"00000000-0000-4000-8000-000000030012","label":"DEMO szélesség","value":6,"unit":"m","semanticType":"roof_building_width"},{"id":"00000000-0000-4000-8000-000000030013","label":"DEMO emelkedés","value":4,"unit":"m","semanticType":"roof_rise"},{"id":"00000000-0000-4000-8000-000000030014","label":"DEMO eresztúlnyúlás","value":0,"unit":"mm","semanticType":"roof_eave_overhang"},{"id":"00000000-0000-4000-8000-000000030015","label":"DEMO első oromtúlnyúlás","value":0,"unit":"mm","semanticType":"roof_front_gable_overhang"},{"id":"00000000-0000-4000-8000-000000030016","label":"DEMO hátsó oromtúlnyúlás","value":0,"unit":"mm","semanticType":"roof_rear_gable_overhang"},{"id":"00000000-0000-4000-8000-000000030017","label":"DEMO alternatív hajlásszög","value":null,"unit":"degree","semanticType":"roof_pitch"}]}]',true);
select is((select version from public.save_field_survey_workspace('00000000-0000-4000-8000-000000030000','00000000-0000-4000-8000-000000000010',null,'roof',((current_setting('test.f99_sections')::jsonb #> '{0,measurements}') - 6),'DEMO F9.9',0,current_setting('test.f99_sections')::jsonb)),1,'projectless measured survey saves');
select set_config('test.f99_survey_revision',(select id::text from public.field_survey_revisions where survey_id='00000000-0000-4000-8000-000000030000' and version=1),true);
select set_config('test.f99_project',f.project_id::text,true) from public.create_field_survey_followup('00000000-0000-4000-8000-000000030000',current_setting('test.f99_survey_revision')::uuid,'project',null,'DEMO F9.9 projekt') f;
select ok((select project_id is not null from public.field_survey_followups where survey_id='00000000-0000-4000-8000-000000030000' and kind='project'),'project followup belongs to the survey');
select ok(not has_function_privilege('authenticated','public.save_gable_roof_calculation(uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,integer)','EXECUTE'),'authenticated users cannot call the revoked legacy roof writer');
reset role;
grant tetopro_covering_writer to postgres;
set local role authenticated;
reset role;
set local role tetopro_covering_writer;
select set_config('test.f99_roof_model',r.roof_model_id::text,true),set_config('test.f99_roof_calculation',r.calculation_id::text,true),set_config('test.f99_roof_calculation_revision',r.calculation_revision_id::text,true)
from public.save_gable_roof_calculation_secure('00000000-0000-4000-8000-000000000010',current_setting('test.f99_project')::uuid,'00000000-0000-4000-8000-000000030002','00000000-0000-4000-8000-000000030003',0,'DEMO F9.9 tető',
 '{"inputMode":"height","buildingLengthMm":10000,"buildingWidthMm":6000,"roofRiseMm":4000,"eaveOverhangMm":0,"frontGableOverhangMm":0,"rearGableOverhangMm":0}',
 '{"areas":{},"planes":[]}',jsonb_build_object('surveySource',jsonb_build_object('surveyId','00000000-0000-4000-8000-000000030000','revisionId',current_setting('test.f99_survey_revision'),'sectionId','00000000-0000-4000-8000-000000030001','version',1)), '00000000-0000-4000-8000-000000000001') r;
reset role;
set local role authenticated;
select set_config('test.f99_link',public.link_field_survey_calculation('00000000-0000-4000-8000-000000030000',current_setting('test.f99_survey_revision')::uuid,'00000000-0000-4000-8000-000000030001',current_setting('test.f99_roof_calculation')::uuid,current_setting('test.f99_roof_calculation_revision')::uuid)::text,true);
select ok(current_setting('test.f99_link')::uuid is not null,'exact verified roof calculation links to its survey section');
select is(public.link_field_survey_calculation('00000000-0000-4000-8000-000000030000',current_setting('test.f99_survey_revision')::uuid,'00000000-0000-4000-8000-000000030001',current_setting('test.f99_roof_calculation')::uuid,current_setting('test.f99_roof_calculation_revision')::uuid),current_setting('test.f99_link')::uuid,'link retry is idempotent');
reset role;
set local role tetopro_covering_writer;
select set_config('test.f99_forged_calculation',r.calculation_id::text,true),set_config('test.f99_forged_revision',r.calculation_revision_id::text,true)
from public.save_gable_roof_calculation_secure('00000000-0000-4000-8000-000000000010',current_setting('test.f99_project')::uuid,'00000000-0000-0000-0000-000000030004','00000000-0000-0000-0000-000000030005',0,'DEMO eltérő tető',
 '{"inputMode":"height","buildingLengthMm":11000,"buildingWidthMm":6000,"roofRiseMm":4000,"eaveOverhangMm":0,"frontGableOverhangMm":0,"rearGableOverhangMm":0}',
 '{"areas":{},"planes":[]}',jsonb_build_object('surveySource',jsonb_build_object('revisionId',current_setting('test.f99_survey_revision'),'sectionId','00000000-0000-4000-8000-000000030001')), '00000000-0000-4000-8000-000000000001') r;
reset role;
set local role authenticated;
select throws_ok($$select public.link_field_survey_calculation('00000000-0000-4000-8000-000000030000',current_setting('test.f99_survey_revision')::uuid,'00000000-0000-4000-8000-000000030001',current_setting('test.f99_forged_calculation')::uuid,current_setting('test.f99_forged_revision')::uuid)$$,'22023',null,'forged provenance with different geometry is rejected');
reset role;
set local role tetopro_covering_writer;
select set_config('test.f99_other_calculation',r.calculation_id::text,true),set_config('test.f99_other_revision',r.calculation_revision_id::text,true)
from public.save_gable_roof_calculation_secure('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030','00000000-0000-0000-0000-000000030006','00000000-0000-0000-0000-000000030007',0,'DEMO másik projekt tető',
 '{"inputMode":"height","buildingLengthMm":10000,"buildingWidthMm":6000,"roofRiseMm":4000,"eaveOverhangMm":0,"frontGableOverhangMm":0,"rearGableOverhangMm":0}',
 '{"areas":{},"planes":[]}',jsonb_build_object('surveySource',jsonb_build_object('revisionId',current_setting('test.f99_survey_revision'),'sectionId','00000000-0000-4000-8000-000000030001')), '00000000-0000-4000-8000-000000000001') r;
reset role;
set local role authenticated;
select throws_ok($$select public.link_field_survey_calculation('00000000-0000-4000-8000-000000030000',current_setting('test.f99_survey_revision')::uuid,'00000000-0000-4000-8000-000000030001',current_setting('test.f99_other_calculation')::uuid,current_setting('test.f99_other_revision')::uuid)$$,'42501',null,'another project cannot be linked to the survey');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.link_field_survey_calculation('00000000-0000-4000-8000-000000030000',current_setting('test.f99_survey_revision')::uuid,'00000000-0000-4000-8000-000000030001',current_setting('test.f99_roof_calculation')::uuid,current_setting('test.f99_roof_calculation_revision')::uuid)$$,'42501',null,'nonmember cannot link geometry even with exact IDs');
select * from finish();
rollback;
