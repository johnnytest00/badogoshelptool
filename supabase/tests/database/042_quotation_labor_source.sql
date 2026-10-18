begin;
select no_plan();
set local role postgres;
insert into public.organizations(id, name) values ('00000000-0000-4000-8000-000000000010', 'DEMO F9.42.2'), ('00000000-0000-4000-8000-000000000011', 'DEMO other') on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'owner'),
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002', 'member'),
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000002', 'owner') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('test.survey', '00000000-0000-4000-8000-000000984501', true);
select version from public.save_field_survey_workspace(current_setting('test.survey')::uuid, '00000000-0000-4000-8000-000000000010', null, 'gutter',
  '[{"id":"00000000-0000-4000-8000-000000984502","label":"DEMO ereszszakasz","value":12.5,"unit":"m","semanticType":"gutter_run_length"}]'::jsonb, 'DEMO', 0,
  '[{"id":"00000000-0000-4000-8000-000000984503","name":"DEMO eresz","workType":"gutter","notes":"","photoIds":[],"measurements":[{"id":"00000000-0000-4000-8000-000000984502","label":"DEMO ereszszakasz","value":12.5,"unit":"m","semanticType":"gutter_run_length"}]}]'::jsonb);
select set_config('test.rev', (select id::text from public.field_survey_revisions where survey_id=current_setting('test.survey')::uuid and version=1), true);
select set_config('test.list', (select list_id::text from public.save_workflow_material_list_from_survey_revision('00000000-0000-4000-8000-000000000010', current_setting('test.survey')::uuid, current_setting('test.rev')::uuid, false, 'DEMO lista',
  '[{"id":"00000000-0000-4000-8000-000000984504","kind":"manual","description":"DEMO eresz","materialCategory":"gutter","categoryId":null,"quantity":"12.5","unit":"linear_meter","variantId":null,"priceId":null,"manualPriceAmount":"","manualPriceKind":null,"sourceRef":{"type":"measurement","sectionId":"00000000-0000-4000-8000-000000984503","measurementId":"00000000-0000-4000-8000-000000984502"}}]'::jsonb,
  '00000000-0000-4000-8000-000000984505')), true);
select set_config('test.mrev', (select id::text from public.material_preparation_revisions where list_id=current_setting('test.list')::uuid and revision_number=1), true);
select set_config('test.rate', (select rate_id::text from public.create_organization_labor_rate('00000000-0000-4000-8000-000000000010','DEMO eresz díj','run_length_m',900.00,'net','00000000-0000-4000-8000-000000984506')), true);
select set_config('test.arearate', (select rate_id::text from public.create_organization_labor_rate('00000000-0000-4000-8000-000000000010','DEMO terület díj','roof_area_m2',100.00,'net','00000000-0000-4000-8000-000000984507')), true);

create temp table t_lines as select jsonb_build_array(jsonb_build_object('type','LABOR','description','Munkadíj','quantity','12.5','unit','m','unitPrice','900.00','priceClass','net',
  'variantId','','categoryId','','priceId','','takeoffItemId','','notes','',
  'laborSource', jsonb_build_object('rateId',current_setting('test.rate'),'materialListId',current_setting('test.list'),'materialRevisionId',current_setting('test.mrev'),'materialItemId','00000000-0000-4000-8000-000000984504'))) as lines;
grant all on t_lines to authenticated;

select set_config('test.q', (select quotation_id::text from public.save_standalone_quotation_draft_with_document('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000984510',null,'DEMO q',null,(select lines from t_lines),0,'{"recipientSource":"manual"}'::jsonb)), true);
select ok(current_setting('test.q')<>'', 'a labor line with structured provenance saves');
select is((select line_items_snapshot #>> '{0,laborSource,rateSnapshot,rateAmount}' from public.quotation_revisions where quotation_id=current_setting('test.q')::uuid), '900.00', 'the immutable rate snapshot is stored');
select is((select line_items_snapshot #>> '{0,laborSource,sourceQuantity}' from public.quotation_revisions where quotation_id=current_setting('test.q')::uuid), '12.5', 'the verified source quantity is stored');
select is((select line_items_snapshot #>> '{0,laborSource,surveyRevisionId}' from public.quotation_revisions where quotation_id=current_setting('test.q')::uuid), current_setting('test.rev'), 'the exact survey revision is stored');

select set_config('test.rate2', (select rate_id::text from public.create_organization_labor_rate('00000000-0000-4000-8000-000000000010','DEMO eresz díj 2','run_length_m',950.00,'net','00000000-0000-4000-8000-000000984520')), true);
create temp table t_lines2 as select jsonb_set((select lines from t_lines),'{0,laborSource,rateId}', to_jsonb(current_setting('test.rate2'))) as lines;
grant all on t_lines2 to authenticated;
-- a later rate (new row) never changes the stored snapshot; archive does not either
select is((select archived from public.archive_organization_labor_rate('00000000-0000-4000-8000-000000000010', current_setting('test.rate')::uuid)), true, 'rate archived');
-- re-saving an already applied line with a manual edit keeps attribution even though the rate is archived
select is((select revision_number from public.save_standalone_quotation_draft_with_document('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000984511',current_setting('test.q')::uuid,'DEMO q',null,
  (select jsonb_set(lines,'{0,quantity}','"10"') from t_lines),1,'{"recipientSource":"manual"}'::jsonb)), 2, 'a manual quantity edit saves a new revision on an archived rate');
select is((select line_items_snapshot #>> '{0,laborSource,rateId}' from public.quotation_revisions where quotation_id=current_setting('test.q')::uuid and revision_number=2), current_setting('test.rate'), 'attribution survives the manual edit');
select is((select line_items_snapshot #>> '{0,laborSource,sourceQuantity}' from public.quotation_revisions where quotation_id=current_setting('test.q')::uuid and revision_number=2), '12.5', 'the source quantity stays the verified value');
select is((select line_items_snapshot #>> '{0,quantity}' from public.quotation_revisions where quotation_id=current_setting('test.q')::uuid and revision_number=1), '12.5', 'revision 1 is unchanged');
select throws_ok($$select * from public.save_standalone_quotation_draft_with_document('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000984512',null,'DEMO new',null,(select lines from t_lines),0,'{"recipientSource":"manual"}'::jsonb)$$, '22023', null, 'an archived rate cannot be applied to a new line');

select ok((select quotation_id from public.save_standalone_quotation_draft_with_document('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000984521',null,'DEMO active',null,(select lines from t_lines2),0,'{"recipientSource":"manual"}'::jsonb)) is not null, 'an active rate applies to a new quotation');
-- validation with the active (area) rate
select throws_ok($$select * from public.save_standalone_quotation_draft_with_document('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000984513',null,'DEMO unit',null,
  (select jsonb_set(lines,'{0,laborSource,rateId}', to_jsonb(current_setting('test.arearate'))) from t_lines),0,'{"recipientSource":"manual"}'::jsonb)$$, '22023', null, 'a rate whose basis does not match the source unit is rejected');
select throws_ok($$select * from public.save_standalone_quotation_draft_with_document('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000984514',null,'DEMO unknown',null,
  (select jsonb_set(lines,'{0,laborSource,rateId}', '"00000000-0000-4000-8000-000000999999"') from t_lines),0,'{"recipientSource":"manual"}'::jsonb)$$, '23503', null, 'an unknown rate is rejected');
select throws_ok($$select * from public.save_standalone_quotation_draft_with_document('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000984515',null,'DEMO src',null,
  (select jsonb_set(lines,'{0,laborSource,materialItemId}', '"00000000-0000-4000-8000-000000999998"') from t_lines2),0,'{"recipientSource":"manual"}'::jsonb)$$, '42501', null, 'an unknown source item is rejected');
select throws_ok($$select * from public.save_standalone_quotation_draft_with_document('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000984516',null,'DEMO type',null,
  (select jsonb_set(lines,'{0,type}', '"MATERIAL"') from t_lines),0,'{"recipientSource":"manual"}'::jsonb)$$, '22023', null, 'provenance is only valid on labor lines');
select set_config('test.dup', (select jsonb_build_array(lines->0, lines->0)::text from t_lines2), true);
select throws_ok($$select * from public.save_standalone_quotation_draft_with_document('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000984517',null,'DEMO dup',null,current_setting('test.dup')::jsonb,0,'{"recipientSource":"manual"}'::jsonb)$$, '22023', null, 'the same rate/source pair cannot appear twice');

-- other member / other organization
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select throws_ok($$select * from public.save_standalone_quotation_draft_with_document('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000984518',null,'DEMO foreign',null,(select lines from t_lines2),0,'{"recipientSource":"manual"}'::jsonb)$$, null, null, 'another member cannot use a creator-scoped source');

-- legacy compatibility: lines without laborSource are stored exactly as before
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select is((select line_items_snapshot #>> '{0,laborSource}' from public.quotation_revisions where id=(select revision_id from public.save_standalone_quotation_draft_with_document('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000984519',null,'DEMO legacy',null,
  '[{"type":"LABOR","description":"DEMO kézi","quantity":"1","unit":"óra","unitPrice":"1","priceClass":"net","variantId":"","categoryId":"","priceId":"","takeoffItemId":"","notes":"[munkadij:x:y] régi"}]'::jsonb,0,'{"recipientSource":"manual"}'::jsonb))), null::text, 'a legacy or manual labor line has no laborSource');
select * from finish();
rollback;
