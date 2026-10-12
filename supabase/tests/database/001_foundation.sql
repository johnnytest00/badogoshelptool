begin;

select plan(60);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'organizations', 'organizations exists');
select has_table('public', 'organization_members', 'organization_members exists');
select has_table('public', 'clients', 'clients exists');
select has_table('public', 'projects', 'projects exists');
select col_is_pk('public', 'profiles', 'id', 'profiles id is primary key');
select col_is_pk('public', 'organizations', 'id', 'organizations id is primary key');
select has_index('public', 'clients', 'clients_organization_id_idx', 'clients organization index exists');
select has_index('public', 'projects', 'projects_organization_id_idx', 'projects organization index exists');
select is((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), true, 'profiles RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.organizations'::regclass), true, 'organizations RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.organization_members'::regclass), true, 'memberships RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.clients'::regclass), true, 'clients RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.projects'::regclass), true, 'projects RLS enabled');

set local role anon;
select is_empty('select 1 from public.organizations', 'anonymous cannot read organizations');
select is_empty('select 1 from public.clients', 'anonymous cannot read clients');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select ok(exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-000000000001'), 'member can read own profile');
select is_empty('select 1 from public.profiles where id = ''00000000-0000-4000-8000-000000000002''', 'member cannot read another profile');
select ok(exists (select 1 from public.organizations where id = '00000000-0000-4000-8000-000000000010'), 'member can read own organization');
select ok(exists (select 1 from public.clients where id = '00000000-0000-4000-8000-000000000020'), 'member can read organization client');
select ok(exists (select 1 from public.projects where id = '00000000-0000-4000-8000-000000000030'), 'member can read organization project');

select has_table('public', 'roof_models', 'roof_models exists');
select has_table('public', 'roof_model_revisions', 'roof_model_revisions exists');
select has_table('public', 'calculations', 'calculations exists');
select has_table('public', 'calculation_revisions', 'calculation_revisions exists');
select has_table('public', 'calculation_dependencies', 'calculation_dependencies exists');
select is((select relrowsecurity from pg_class where oid = 'public.roof_models'::regclass), true, 'roof_models RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.roof_model_revisions'::regclass), true, 'roof_model_revisions RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.calculations'::regclass), true, 'calculations RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.calculation_revisions'::regclass), true, 'calculation_revisions RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.calculation_dependencies'::regclass), true, 'calculation_dependencies RLS enabled');
select ok(exists (select 1 from pg_constraint where conname = 'roof_models_project_same_organization_fk'), 'roof model project ownership constraint exists');
select ok(exists (select 1 from pg_constraint where conname = 'roof_model_revisions_model_number_unique'), 'roof revision number uniqueness exists');
select ok(exists (select 1 from pg_constraint where conname = 'calculations_current_revision_fk'), 'calculation current revision integrity exists');
select ok(exists (select 1 from pg_constraint where conname = 'calculation_dependencies_one_upstream'), 'dependency has exactly one upstream type');
select ok(exists (select 1 from public.roof_models where id = '00000000-0000-4000-8000-000000000040'), 'member can read roof model');
select ok(exists (select 1 from public.calculations where id = '00000000-0000-4000-8000-000000000050'), 'member can read calculation');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is_empty('select 1 from public.roof_models where organization_id = ''00000000-0000-4000-8000-000000000010''', 'non-member cannot read roof models');
select throws_ok(
  $$insert into public.roof_models (organization_id, project_id, name, roof_type)
    values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', 'forged roof model', 'gable')$$,
  '42501', null, 'non-member cannot create roof model'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$insert into public.roof_models (organization_id, project_id, name, roof_type)
    values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000099', 'invalid project model', 'gable')$$,
  '23503', null, 'roof model cannot reference another or missing project'
);
select throws_ok(
  $$insert into public.calculations (organization_id, project_id, roof_model_id, calculator_type, display_name)
    values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000099', 'demo.invalid', 'invalid roof model calculation')$$,
  '23503', null, 'calculation cannot reference a missing roof model'
);
select throws_ok(
  $$insert into public.roof_model_revisions (organization_id, roof_model_id, revision_number, schema_version, input_data, validation_status)
    values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000040', 1, 'demo.v1', '{}'::jsonb, 'demo')$$,
  '23505', null, 'duplicate roof revision numbers are rejected'
);
select throws_ok(
  $$insert into public.calculation_revisions (organization_id, calculation_id, revision_number, input_schema_version, calculator_implementation_version, input_snapshot, output_snapshot, validation_status)
    values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000050', 1, 'demo.v1', 'demo.v1', '{}'::jsonb, '{}'::jsonb, 'demo')$$,
  '23505', null, 'duplicate calculation revision numbers are rejected'
);

set local role postgres;
select throws_ok(
  $$update public.roof_model_revisions set input_data = '{"tampered":true}'::jsonb where id = '00000000-0000-4000-8000-000000000041'$$,
  'P0001', null, 'roof model revisions are immutable'
);
select throws_ok(
  $$delete from public.calculation_revisions where id = '00000000-0000-4000-8000-000000000051'$$,
  'P0001', null, 'calculation revisions are immutable'
);
set local role authenticated;

select throws_ok(
  $$insert into public.calculation_dependencies (organization_id, downstream_calculation_revision_id, dependency_type)
    values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000051', 'invalid')$$,
  '23514', null, 'dependency requires exactly one upstream revision'
);
select throws_ok(
  $$insert into public.calculation_dependencies (organization_id, downstream_calculation_revision_id, upstream_calculation_revision_id, dependency_type)
    values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000051', 'self')$$,
  'P0001', null, 'calculation cannot depend on itself'
);

set local role postgres;
insert into public.projects (id, organization_id, name, project_type, status, created_by)
values ('00000000-0000-4000-8000-000000000060', '00000000-0000-4000-8000-000000000010', 'DEMO második projekt', 'gutter_work', 'draft', '00000000-0000-4000-8000-000000000001');
insert into public.roof_models (id, organization_id, project_id, name, roof_type)
values ('00000000-0000-4000-8000-000000000061', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000060', 'DEMO csatorna modell', 'other');
insert into public.roof_model_revisions (id, organization_id, roof_model_id, revision_number, schema_version, input_data, validation_status, created_by)
values ('00000000-0000-4000-8000-000000000062', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000061', 1, 'demo.v1', '{"data_origin":"demo"}'::jsonb, 'demo', '00000000-0000-4000-8000-000000000001');
insert into public.calculations (id, organization_id, project_id, calculator_type, display_name, status)
values ('00000000-0000-4000-8000-000000000063', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', 'demo.upstream', 'DEMO upstream', 'current');
insert into public.calculation_revisions (id, organization_id, calculation_id, revision_number, input_schema_version, calculator_implementation_version, validation_status)
values ('00000000-0000-4000-8000-000000000064', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000063', 1, 'demo.v1', 'demo.v1', 'demo');
insert into public.calculations (id, organization_id, project_id, calculator_type, display_name, status)
values ('00000000-0000-4000-8000-000000000065', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', 'demo.downstream', 'DEMO downstream', 'current');
insert into public.calculation_revisions (id, organization_id, calculation_id, revision_number, input_schema_version, calculator_implementation_version, validation_status)
values ('00000000-0000-4000-8000-000000000066', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000065', 1, 'demo.v1', 'demo.v1', 'demo');
set local role authenticated;
select throws_ok(
  $$insert into public.calculation_dependencies (organization_id, downstream_calculation_revision_id, upstream_roof_model_revision_id, dependency_type)
    values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000062', 'cross-project')$$,
  'P0001', null, 'cross-project dependency is rejected'
);
select lives_ok(
  $$insert into public.calculation_dependencies (organization_id, downstream_calculation_revision_id, upstream_calculation_revision_id, dependency_type)
    values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000066', '00000000-0000-4000-8000-000000000064', 'demo-chain')$$,
  'valid calculation dependency is accepted'
);
select throws_ok(
  $$insert into public.calculation_dependencies (organization_id, downstream_calculation_revision_id, upstream_calculation_revision_id, dependency_type)
    values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000064', '00000000-0000-4000-8000-000000000066', 'cycle')$$,
  'P0001', null, 'dependency cycle is rejected'
);
select is((select input_data ->> 'data_origin' from public.roof_model_revisions where id = '00000000-0000-4000-8000-000000000041'), 'demo', 'historical roof revision remains unchanged');

select throws_ok(
  $$insert into public.organization_members (organization_id, user_id, role)
    values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002', 'owner')$$,
  '42501', null, 'authenticated user cannot forge membership or self-assign owner'
);

update public.organization_members set role = 'owner'
where organization_id = '00000000-0000-4000-8000-000000000010'
  and user_id = '00000000-0000-4000-8000-000000000001';
select is(
  (select role::text from public.organization_members
   where organization_id = '00000000-0000-4000-8000-000000000010'
     and user_id = '00000000-0000-4000-8000-000000000001'),
  'owner', 'authenticated user cannot modify a membership role'
);

select throws_ok(
  $$insert into public.projects (organization_id, client_id, name, created_by)
    values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000099', 'invalid DEMO project', '00000000-0000-4000-8000-000000000001')$$,
  '23503', null, 'invalid client relationship is rejected'
);

set local role postgres;
insert into public.organizations (id, name) values ('00000000-0000-4000-8000-000000000011', 'DEMO másik szervezet');
insert into public.clients (id, organization_id, name)
values ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000011', 'DEMO másik ügyfél');
set local role authenticated;
select throws_ok(
  $$insert into public.projects (organization_id, client_id, name, created_by)
    values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000021', 'cross-org project', '00000000-0000-4000-8000-000000000001')$$,
  '23503', null, 'cross-organization client reference is rejected'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is_empty('select 1 from public.organizations where id = ''00000000-0000-4000-8000-000000000010''', 'non-member cannot read organization');
select is_empty('select 1 from public.clients where organization_id = ''00000000-0000-4000-8000-000000000010''', 'non-member cannot read clients');
select throws_ok(
  $$insert into public.clients (organization_id, name)
    values ('00000000-0000-4000-8000-000000000010', 'unauthorized client')$$,
  '42501', null, 'non-member cannot write organization clients'
);

set local role postgres;
delete from public.organization_members
where organization_id = '00000000-0000-4000-8000-000000000010'
  and user_id = '00000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select is_empty('select 1 from public.clients where organization_id = ''00000000-0000-4000-8000-000000000010''', 'revoked membership removes client access');
select is_empty('select 1 from public.roof_models where organization_id = ''00000000-0000-4000-8000-000000000010''', 'revoked membership removes roof model access');

select * from finish();
rollback;
