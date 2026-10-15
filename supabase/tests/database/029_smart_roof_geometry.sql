begin;
select plan(9);
select ok(has_function_privilege('authenticated','public.link_field_survey_calculation(uuid,uuid,uuid,uuid,uuid)','EXECUTE'),'survey links use the restricted writer');
select ok(not has_table_privilege('authenticated','public.field_survey_calculation_links','INSERT'),'survey link table cannot be written directly');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);

select set_config('test.f99_roof_model',r.roof_model_id::text,true),
       set_config('test.f99_roof_revision',r.roof_model_revision_id::text,true),
       set_config('test.f99_roof_calculation',r.calculation_id::text,true),
       set_config('test.f99_calculation_revision',r.calculation_revision_id::text,true)
from public.save_gable_roof_calculation(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030',null,
 'DEMO F9.9 nyeregtető',
 '{"inputMode":"height","buildingLengthMm":10000,"buildingWidthMm":6000,"roofRiseMm":4000,"eaveOverhangMm":0,"frontGableOverhangMm":0,"rearGableOverhangMm":0}',
 '{"lengths":{"eachEaveEdgeMm":10000}}','{"input":"DEMO","output":"verified"}','[]',0) r;

create function pg_temp.f99_gutter_input(p_length integer,p_duplicate boolean default false)
returns jsonb language sql stable as $$
 select pg_catalog.jsonb_build_object('gutterStockLengthMm',4000,'runs',
  case when p_duplicate then pg_catalog.jsonb_build_array(x,x) else pg_catalog.jsonb_build_array(x) end,
  'downpipes','[]'::jsonb,'manualComponents','[]'::jsonb)
 from (select pg_catalog.jsonb_build_object('id','left','name','DEMO bal eresz','lengthMm',p_length,
   'measurementSource','drawing','roofEdge',pg_catalog.jsonb_build_object(
    'revisionId',current_setting('test.f99_roof_revision'),'edgeId','left-eave',
    'roofModelId',current_setting('test.f99_roof_model'),
    'calculationId',current_setting('test.f99_roof_calculation'),
    'calculationRevisionId',current_setting('test.f99_calculation_revision'),
    'suggestedLengthMm',10000,'lengthOverridden',p_length<>10000)) x) q;
$$;

select lives_ok($$select * from public.save_gutter_material_calculation(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030',
 'DEMO F9.9 eresz',pg_temp.f99_gutter_input(10000),'{}','{"input":"DEMO"}','[]',current_setting('test.f99_roof_revision')::uuid,0)$$,
 'exact verified eave source saves');
select is((select count(*)::integer from public.calculation_dependencies d join public.calculation_revisions cr on cr.id=d.downstream_calculation_revision_id
 where d.upstream_roof_model_revision_id=current_setting('test.f99_roof_revision')::uuid and cr.input_snapshot #>> '{runs,0,roofEdge,edgeId}'='left-eave'),1,'exact roof revision dependency is retained');
select throws_ok($$select * from public.save_gutter_material_calculation(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030',
 'DEMO hamis hossz',jsonb_set(pg_temp.f99_gutter_input(10000),'{runs,0,lengthMm}','9000'),'{}','{}','[]',current_setting('test.f99_roof_revision')::uuid,1)$$,'22023',null,'length tampering without override is rejected');
select throws_ok($$select * from public.save_gutter_material_calculation(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030',
 'DEMO duplikált él',pg_temp.f99_gutter_input(10000,true),'{}','{}','[]',current_setting('test.f99_roof_revision')::uuid,1)$$,'22023',null,'duplicate source segment is rejected');
select lives_ok($$select * from public.save_gutter_material_calculation(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030',
 'DEMO felülírt hossz',pg_temp.f99_gutter_input(9000),'{}','{}','[]',current_setting('test.f99_roof_revision')::uuid,1)$$,'explicit override retains the original source');
select is((select input_snapshot #>> '{runs,0,roofEdge,suggestedLengthMm}' from public.calculation_revisions
 where calculation_id=(select id from public.calculations where project_id='00000000-0000-4000-8000-000000000030' and calculator_type='gutters.material-estimate')
 order by revision_number desc limit 1),'10000','original geometric length remains in the immutable revision');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select throws_ok($$select * from public.save_gutter_material_calculation(
 '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030',
 'DEMO jogosulatlan',pg_temp.f99_gutter_input(10000),'{}','{}','[]',current_setting('test.f99_roof_revision')::uuid,2)$$,'42501',null,'nonmember cannot write the source project');
select * from finish();
rollback;
