begin;
select plan(21);

set local role postgres;
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token)
values ('00000000-0000-4000-8000-000000000057', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo.m3.outsider@local.test', now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false, '', '', '', '', '', '', '', '')
on conflict (id) do nothing;
insert into public.organizations(id, name) values ('00000000-0000-4000-8000-000000000011', 'DEMO M3 másik szervezet') on conflict do nothing;
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002', 'member'),
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000002', 'owner')
on conflict do nothing;
insert into public.execution_plans(id, organization_id, project_id, title, request_key, created_by) values
  ('00000000-0000-4000-8000-000000570001', '00000000-0000-4000-8000-000000000010', null, 'DEMO M3 munkanapló', '00000000-0000-4000-8000-000000570091', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000570002', '00000000-0000-4000-8000-000000000011', null, 'DEMO M3 idegen napló', '00000000-0000-4000-8000-000000570092', '00000000-0000-4000-8000-000000000002');

create function pg_temp.m3_input(p_half integer) returns jsonb language sql immutable as $$
  select pg_catalog.jsonb_build_object('schemaVersion','construction-suite.input.v1','calculatorId','roof.rafter-cut',
    'fields',pg_catalog.jsonb_build_object('horizontalHalfSpanMm',p_half::text,'riseMm','2000','eaveProjectionMm','0','seatCutHeightMm','0'));
$$;
create function pg_temp.m3_output() returns jsonb language sql immutable as $$
  select '{"schemaVersion":"construction-suite.output.v1","calculatorId":"roof.rafter-cut","lines":[{"label":"Szarufa teljes hossza","value":4206.476,"unit":"mm"}]}'::jsonb;
$$;
select set_config('test.rev1', (select calculation_revision_id::text from public.save_standalone_construction_calculation('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000570010','00000000-0000-4000-8000-000000570101',0,'construction.roof.rafter-cut','DEMO M3 szarufa',pg_temp.m3_input(3000),pg_temp.m3_output(),'00000000-0000-4000-8000-000000000001')), true);
select set_config('test.rev2', (select calculation_revision_id::text from public.save_standalone_construction_calculation('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000570010','00000000-0000-4000-8000-000000570102',1,'construction.roof.rafter-cut','DEMO M3 szarufa',pg_temp.m3_input(3100),pg_temp.m3_output(),'00000000-0000-4000-8000-000000000001')), true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('test.link', (select link_id::text from public.link_execution_plan_document('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000570001','calculation',current_setting('test.rev1')::uuid,'00000000-0000-4000-8000-000000570201')), true);
select ok(current_setting('test.link') <> '', 'the creator links the exact saved revision to a work log');
select is((select calculation_id::text||':'||calculation_revision_id::text from public.execution_plan_document_links where id=current_setting('test.link')::uuid),
  '00000000-0000-4000-8000-000000570010:'||current_setting('test.rev1'), 'the link stores the calculation and its exact revision');
select is((select created from public.link_execution_plan_document('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000570001','calculation',current_setting('test.rev1')::uuid,'00000000-0000-4000-8000-000000570201')), false, 'a retry with the same request key is idempotent');
select is((select link_id::text from public.link_execution_plan_document('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000570001','calculation',current_setting('test.rev1')::uuid,'00000000-0000-4000-8000-000000570202')), current_setting('test.link'), 'a second request reports the existing active link instead of duplicating it');
select throws_ok($$select * from public.link_execution_plan_document('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000570001','calculation',current_setting('test.rev2')::uuid,'00000000-0000-4000-8000-000000570201')$$, '22023', null, 'a reused request key with other content is rejected');
select throws_ok($$select * from public.link_execution_plan_document('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000570001','calculation','00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000570203')$$, '42501', null, 'a non-calculation id cannot be linked as a calculation');
select is((select count(*)::integer from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000570010'), 2, 'linking does not change the calculation revisions');
select is((select current_revision_id::text from public.calculations where id='00000000-0000-4000-8000-000000570010'), current_setting('test.rev2'), 'linking does not move the current revision');

-- Another member of the same organization: may read, may not link or unlink someone else's calculation.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.execution_plan_document_links where id=current_setting('test.link')::uuid), 1, 'a member sees the calculation link');
select is((select display_name from public.calculations where id='00000000-0000-4000-8000-000000570010'), 'DEMO M3 szarufa', 'a member can read the linked calculation');
select is((select count(*)::integer from public.calculation_revisions where id=current_setting('test.rev1')::uuid), 1, 'a member can read the exactly linked revision');
select is((select count(*)::integer from public.calculation_revisions where id=current_setting('test.rev2')::uuid), 0, 'a member cannot read an unlinked revision of the same calculation');
select throws_ok($$select * from public.link_execution_plan_document('00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000570001','calculation',current_setting('test.rev2')::uuid,'00000000-0000-4000-8000-000000570204')$$, '42501', null, 'a member cannot link the creator''s calculation');
select throws_ok($$select * from public.link_execution_plan_document('00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000570002','calculation',current_setting('test.rev1')::uuid,'00000000-0000-4000-8000-000000570205')$$, '42501', null, 'a revision of another organization cannot be linked');
select throws_ok($$select * from public.unlink_execution_plan_document('00000000-0000-4000-8000-000000000010', current_setting('test.link')::uuid)$$, '42501', null, 'a member cannot remove the creator''s calculation link');

-- An outsider sees nothing.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000057', true);
select is((select count(*)::integer from public.execution_plan_document_links where id=current_setting('test.link')::uuid)
  + (select count(*)::integer from public.calculations where id='00000000-0000-4000-8000-000000570010')
  + (select count(*)::integer from public.calculation_revisions where id=current_setting('test.rev1')::uuid), 0, 'a non-member sees neither link, calculation nor revision');

-- Creator removes the link: an audit stamp, and member read access ends with it.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select is((select removed from public.unlink_execution_plan_document('00000000-0000-4000-8000-000000000010', current_setting('test.link')::uuid)), true, 'the creator removes the link');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.calculations where id='00000000-0000-4000-8000-000000570010'), 0, 'after removal the member no longer reads the calculation');
select is((select count(*)::integer from public.execution_plan_document_links where id=current_setting('test.link')::uuid), 0, 'a removed calculation link is not visible to other members');
reset role;
select is((select count(*)::integer from public.execution_plan_document_links where id=current_setting('test.link')::uuid and unlinked_at is not null), 1, 'the removed link stays as an audit record');
select throws_ok($$insert into public.execution_plan_document_links(organization_id, execution_plan_id, document_kind, calculation_id, request_key, created_by)
  values('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000570001','calculation','00000000-0000-4000-8000-000000570010','00000000-0000-4000-8000-000000570299','00000000-0000-4000-8000-000000000001')$$,
  '23514', null, 'a calculation link without its exact revision violates the kind constraint');

select * from finish();
rollback;
