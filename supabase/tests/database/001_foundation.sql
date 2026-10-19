begin;

select plan(178);
\ir _demo_workflow_fixture.inc

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
    values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', 'authenticated direct roof write', 'gable')$$,
  '42501', null, 'authenticated clients cannot directly create roof models'
);
reset role;
set local role postgres;
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

select lives_ok(
  $$insert into public.clients (id, organization_id, name, phone)
    values ('00000000-0000-4000-8000-000000000070', '00000000-0000-4000-8000-000000000010', 'F3 DEMO ügyfél', '+36 30 111 2233')$$,
  'member can create a client'
);
select lives_ok(
  $$update public.clients set name = 'F3 DEMO ügyfél módosítva' where id = '00000000-0000-4000-8000-000000000070'$$,
  'member can edit a client'
);
select is((select name from public.clients where id = '00000000-0000-4000-8000-000000000070'), 'F3 DEMO ügyfél módosítva', 'client edit persists');
select lives_ok(
  $$insert into public.projects (id, organization_id, client_id, name, project_type, status, created_by)
    values ('00000000-0000-4000-8000-000000000071', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000070', 'F3 DEMO projekt', 'gutter_work', 'in_progress', '00000000-0000-4000-8000-000000000001')$$,
  'member can create a project'
);
select lives_ok(
  $$update public.projects set name = 'F3 DEMO projekt módosítva', version = version + 1 where id = '00000000-0000-4000-8000-000000000071' and version = 1$$,
  'member can edit a project with expected version'
);
select is((select version from public.projects where id = '00000000-0000-4000-8000-000000000071'), 2, 'project version increments atomically');
select is((select count(*)::int from public.projects where id = '00000000-0000-4000-8000-000000000071' and version = 1), 0, 'stale project version no longer matches');
select lives_ok(
  $$update public.projects set previous_status = status, status = 'archived', version = version + 1 where id = '00000000-0000-4000-8000-000000000071' and version = 2$$,
  'project archive persists previous status'
);
select is((select status::text from public.projects where id = '00000000-0000-4000-8000-000000000071'), 'archived', 'archived project has archived status');
select lives_ok(
  $$update public.projects set status = previous_status, previous_status = null, version = version + 1 where id = '00000000-0000-4000-8000-000000000071' and version = 3$$,
  'project restore persists saved status'
);
select is((select status::text from public.projects where id = '00000000-0000-4000-8000-000000000071'), 'in_progress', 'restored project returns to prior status');
select lives_ok(
  $$insert into public.projects (organization_id, client_id, name, project_type, status, created_by)
    select organization_id, client_id, name || ' — másolat', project_type, 'draft', '00000000-0000-4000-8000-000000000001'
    from public.projects where id = '00000000-0000-4000-8000-000000000071'$$,
  'member can duplicate basic project data'
);
select throws_ok(
  $$delete from public.clients where id = '00000000-0000-4000-8000-000000000070'$$,
  '42501', null, 'client permanent deletion is not granted'
);
select throws_ok(
  $$delete from public.projects where id = '00000000-0000-4000-8000-000000000071'$$,
  '42501', null, 'project permanent deletion is not granted'
);

select ok(not has_function_privilege('authenticated', 'public.save_gable_roof_calculation_secure(uuid,uuid,uuid,uuid,integer,text,jsonb,jsonb,jsonb,uuid)', 'EXECUTE'), 'authenticated clients cannot call the restricted gable writer');
select ok(not has_function_privilege('authenticated', 'public.save_gable_roof_calculation(uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,integer)', 'EXECUTE'), 'authenticated clients cannot call the legacy gable writer');
reset role;
grant tetopro_covering_writer to postgres;
grant usage on schema extensions to tetopro_covering_writer;
set local role tetopro_covering_writer;
select lives_ok(
  $$select * from public.save_gable_roof_calculation_secure(
    '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030',
    '00000000-0000-4000-8000-000000000150', '00000000-0000-4000-8000-000000000151', 0,
    'F5 DEMO nyeregtető',
    '{"inputMode":"height","buildingLengthMm":12000,"buildingWidthMm":8000,"roofRiseMm":3000,"eaveOverhangMm":500,"frontGableOverhangMm":250,"rearGableOverhangMm":250}'::jsonb,
    '{"areas":{"combinedRoofM2":140.625},"planes":[],"lengths":{"eachEaveEdgeMm":13000}}'::jsonb,
    '{"input":"user_provided","output":"verified"}'::jsonb,
    '00000000-0000-4000-8000-000000000001'
  )$$,
  'restricted server writer atomically saves a gable calculation'
);
reset role;
set local role authenticated;
select is((select count(*)::int from public.roof_models where organization_id = '00000000-0000-4000-8000-000000000010' and roof_type = 'gable' and name = 'F5 DEMO nyeregtető'), 1, 'gable roof model is created once');
select is((select count(*)::int from public.roof_model_revisions where roof_model_id = (select id from public.roof_models where name = 'F5 DEMO nyeregtető')), 1, 'verified roof revision is created');
select is((select count(*)::int from public.calculation_revisions where calculation_id = (select id from public.calculations where display_name = 'F5 DEMO nyeregtető')), 1, 'verified calculation revision is created');
select is((select count(*)::int from public.calculation_dependencies where downstream_calculation_revision_id = (select current_revision_id from public.calculations where display_name = 'F5 DEMO nyeregtető')), 1, 'roof revision dependency is created');
reset role;
set local role tetopro_covering_writer;
select throws_ok(
  $$select * from public.save_gable_roof_calculation_secure(
    '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030',
    '00000000-0000-4000-8000-000000000150', '00000000-0000-4000-8000-000000000152', 0,
    'F5 DEMO nyeregtető',
    '{"inputMode":"height","buildingLengthMm":12000,"buildingWidthMm":8000,"roofRiseMm":3000,"eaveOverhangMm":500,"frontGableOverhangMm":250,"rearGableOverhangMm":250}'::jsonb,
    '{"areas":{"combinedRoofM2":140.625},"planes":[],"lengths":{"eachEaveEdgeMm":13000}}'::jsonb,
    '{"input":"user_provided","output":"verified"}'::jsonb, '00000000-0000-4000-8000-000000000001'
  )$$,
  '40001', null, 'stale gable revision is rejected'
);
select lives_ok(
  $$select * from public.save_gable_roof_calculation_secure(
    '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030',
    '00000000-0000-4000-8000-000000000150', '00000000-0000-4000-8000-000000000153', 1,
    'F5 DEMO nyeregtető',
    '{"inputMode":"height","buildingLengthMm":12000,"buildingWidthMm":8000,"roofRiseMm":3000,"eaveOverhangMm":500,"frontGableOverhangMm":250,"rearGableOverhangMm":250}'::jsonb,
    '{"areas":{"combinedRoofM2":140.625},"planes":[],"lengths":{"eachEaveEdgeMm":13000}}'::jsonb,
    '{"input":"user_provided","output":"verified"}'::jsonb, '00000000-0000-4000-8000-000000000001'
  )$$,
  'current gable revision can be extended immutably'
);
reset role;
set local role postgres;
select is((select max(revision_number) from public.roof_model_revisions where roof_model_id = (select id from public.roof_models where name = 'F5 DEMO nyeregtető')), 2, 'gable revision history increments');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
reset role;
set local role tetopro_covering_writer;
select throws_ok(
  $$select * from public.save_gable_roof_calculation_secure(
    '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030',
    '00000000-0000-4000-8000-000000000154', '00000000-0000-4000-8000-000000000155', 0,
    'unauthorized gable',
    '{"inputMode":"height","buildingLengthMm":12000,"buildingWidthMm":8000,"roofRiseMm":3000,"eaveOverhangMm":500,"frontGableOverhangMm":250,"rearGableOverhangMm":250}'::jsonb,
    '{"areas":{"combinedRoofM2":140.625},"planes":[],"lengths":{"eachEaveEdgeMm":13000}}'::jsonb,
    '{"input":"user_provided","output":"verified"}'::jsonb, '00000000-0000-4000-8000-000000000002'
  )$$,
  '42501', null, 'non-member cannot save a gable calculation'
);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

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

select has_table('public', 'material_manufacturers', 'material manufacturers exists');
select has_table('public', 'material_products', 'material products exists');
select has_table('public', 'material_variants', 'material variants exists');
select has_table('public', 'material_prices', 'material prices exists');
select is((select relrowsecurity from pg_class where oid = 'public.material_manufacturers'::regclass), true, 'material manufacturers RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.material_products'::regclass), true, 'material products RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.material_variants'::regclass), true, 'material variants RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.material_prices'::regclass), true, 'material prices RLS enabled');
select has_index('public', 'material_manufacturers', 'material_manufacturers_organization_id_idx', 'manufacturer organization index exists');
select has_index('public', 'material_products', 'material_products_organization_category_idx', 'product category index exists');
select has_index('public', 'material_products', 'material_products_organization_status_idx', 'product status index exists');
select has_index('public', 'material_prices', 'material_prices_variant_effective_idx', 'price history index exists');
select ok(exists (select 1 from pg_constraint where conname = 'material_products_manufacturer_same_organization_fk'), 'product manufacturer ownership constraint exists');
select ok(exists (select 1 from pg_constraint where conname = 'material_variants_product_same_organization_fk'), 'variant product ownership constraint exists');
select ok(exists (select 1 from pg_constraint where conname = 'material_prices_variant_same_organization_fk'), 'price variant ownership constraint exists');
select ok(exists (select 1 from pg_constraint where conname = 'material_variants_specs_object'), 'technical specs must be an object');

select lives_ok(
  $$insert into public.material_manufacturers (id, organization_id, name, notes, created_by)
    values ('00000000-0000-4000-8000-000000000080', '00000000-0000-4000-8000-000000000010', 'F7.1 DEMO gyártó', 'DEMO adat', '00000000-0000-4000-8000-000000000001')$$,
  'member can create a material manufacturer'
);
select is((select name from public.material_manufacturers where id = '00000000-0000-4000-8000-000000000080'), 'F7.1 DEMO gyártó', 'manufacturer creation persists');
select lives_ok(
  $$insert into public.material_products (id, organization_id, manufacturer_id, category, name, product_code, data_provenance, created_by)
    values ('00000000-0000-4000-8000-000000000081', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000080', 'sheet_metal', 'F7.1 DEMO lemez', 'DEMO-F71', 'demo', '00000000-0000-4000-8000-000000000001')$$,
  'member can create a material product'
);
select lives_ok(
  $$insert into public.material_variants (id, organization_id, product_id, name, purchasing_unit, thickness_mm, technical_specs, data_provenance, created_by)
    values ('00000000-0000-4000-8000-000000000082', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000081', 'DEMO 0,5 mm', 'square_meter', 0.5, '{"profile":"DEMO"}'::jsonb, 'demo', '00000000-0000-4000-8000-000000000001')$$,
  'member can create a material variant'
);
select lives_ok(
  $$insert into public.material_prices (id, organization_id, variant_id, amount, purchasing_unit, price_kind, price_source, effective_date, data_provenance, created_by)
    values ('00000000-0000-4000-8000-000000000083', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000082', 12345.67, 'square_meter', 'net', 'DEMO adat', '2026-01-01', 'demo', '00000000-0000-4000-8000-000000000001')$$,
  'member can record a material price'
);
select is((select amount from public.material_prices where id = '00000000-0000-4000-8000-000000000083'), 12345.67::numeric, 'price decimal precision persists');
select is((select amount from public.material_prices where variant_id = '00000000-0000-4000-8000-000000000082' order by effective_date desc, recorded_at desc, id desc limit 1), 12345.67::numeric, 'latest price uses deterministic ordering');
select lives_ok(
  $$insert into public.material_prices (id, organization_id, variant_id, amount, purchasing_unit, price_kind, effective_date, data_provenance, created_by)
    values ('00000000-0000-4000-8000-000000000084', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000082', 15000, 'square_meter', 'net', '2026-02-01', 'user_provided', '00000000-0000-4000-8000-000000000001')$$,
  'price history accepts a new immutable record'
);
select is((select count(*)::int from public.material_prices where variant_id = '00000000-0000-4000-8000-000000000082'), 2, 'price history preserves old records');
select lives_ok(
  $$update public.material_prices set amount = 1 where id = '00000000-0000-4000-8000-000000000083'$$,
  'authenticated update cannot see immutable price history rows'
);
select is((select amount from public.material_prices where id = '00000000-0000-4000-8000-000000000083'), 12345.67::numeric, 'authenticated update does not change price history');
set local role postgres;
select throws_ok(
  $$update public.material_prices set amount = 1 where id = '00000000-0000-4000-8000-000000000083'$$,
  'P0001', null, 'price history is immutable for privileged SQL paths'
);
set local role authenticated;
select throws_ok(
  $$insert into public.material_prices (organization_id, variant_id, amount, purchasing_unit, price_kind, effective_date)
    values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000082', -1, 'square_meter', 'net', '2026-01-01')$$,
  '23514', null, 'negative prices are rejected'
);
select throws_ok(
  $$insert into public.material_variants (organization_id, product_id, name, purchasing_unit, technical_specs)
    values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000081', 'invalid DEMO variant', 'piece', '[]'::jsonb)$$,
  '23514', null, 'technical specs array is rejected'
);
select throws_ok(
  $$insert into public.material_manufacturers (organization_id, name)
    values ('00000000-0000-4000-8000-000000000010', 'F7.1 DEMO gyártó')$$,
  '23505', null, 'duplicate manufacturer names are rejected'
);
select lives_ok(
  $$update public.material_manufacturers set notes = 'F7.1 DEMO módosítva' where id = '00000000-0000-4000-8000-000000000080'$$,
  'member can edit a manufacturer'
);
select is((select notes from public.material_manufacturers where id = '00000000-0000-4000-8000-000000000080'), 'F7.1 DEMO módosítva', 'manufacturer edit persists');
select lives_ok(
  $$update public.material_products set name = 'F7.1 DEMO lemez módosítva' where id = '00000000-0000-4000-8000-000000000081'$$,
  'member can edit a material product'
);
select is((select name from public.material_products where id = '00000000-0000-4000-8000-000000000081'), 'F7.1 DEMO lemez módosítva', 'product edit persists');
select lives_ok(
  $$update public.material_products set status = 'archived' where id = '00000000-0000-4000-8000-000000000081'$$,
  'member can archive a material product'
);
select is((select status::text from public.material_products where id = '00000000-0000-4000-8000-000000000081'), 'archived', 'material product archive persists');
select lives_ok(
  $$update public.material_products set status = 'active' where id = '00000000-0000-4000-8000-000000000081'$$,
  'member can restore a material product'
);
select is((select status::text from public.material_products where id = '00000000-0000-4000-8000-000000000081'), 'active', 'material product restore persists');
select lives_ok(
  $$insert into public.material_variants (id, organization_id, product_id, name, purchasing_unit, data_provenance, created_by)
    values ('00000000-0000-4000-8000-000000000085', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000081', 'DEMO ár nélküli', 'piece', 'missing', '00000000-0000-4000-8000-000000000001')$$,
  'variant without a price is allowed'
);
select is_empty('select 1 from public.material_prices where variant_id = ''00000000-0000-4000-8000-000000000085''', 'missing price remains missing and is not zero');
set local role postgres;
insert into public.material_manufacturers (id, organization_id, name) values ('00000000-0000-4000-8000-000000000090', '00000000-0000-4000-8000-000000000011', 'DEMO másik gyártó');
set local role authenticated;
select throws_ok(
  $$insert into public.material_products (organization_id, manufacturer_id, category, name)
    values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000090', 'other', 'cross-org material')$$,
  '23503', null, 'cross-organization manufacturer reference is rejected'
);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is_empty('select 1 from public.material_products where organization_id = ''00000000-0000-4000-8000-000000000010''', 'non-member cannot read material products');
select throws_ok(
  $$insert into public.material_products (organization_id, category, name)
    values ('00000000-0000-4000-8000-000000000010', 'other', 'unauthorized material')$$,
  '42501', null, 'non-member cannot create material products'
);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is_empty('select 1 from public.organizations where id = ''00000000-0000-4000-8000-000000000010''', 'non-member cannot read organization');
select is_empty('select 1 from public.clients where organization_id = ''00000000-0000-4000-8000-000000000010''', 'non-member cannot read clients');
select throws_ok(
  $$insert into public.clients (organization_id, name)
    values ('00000000-0000-4000-8000-000000000010', 'unauthorized client')$$,
  '42501', null, 'non-member cannot write organization clients'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select has_column('public', 'calculation_revisions', 'material_variant_id', 'layout revisions can reference a material variant');
select ok(exists (select 1 from pg_constraint where conname = 'calculation_revisions_material_variant_same_organization_fk'), 'layout variant ownership constraint exists');
select has_index('public', 'calculations', 'calculations_one_sheet_layout_per_roof', 'one layout revision stream exists per roof');
select ok(exists (select 1 from pg_proc where proname = 'save_metal_sheet_layout'), 'atomic layout save function exists');
select ok(exists (select 1 from pg_proc where proname = 'create_sheet_layout_takeoff_draft'), 'controlled layout takeoff function exists');

set local role postgres;
insert into public.roof_models (id, organization_id, project_id, name, roof_type)
values ('00000000-0000-4000-8000-000000000130', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', 'F7.3.2 DEMO tető', 'gable');
insert into public.roof_model_revisions (id, organization_id, roof_model_id, revision_number, schema_version, input_data, validation_status, created_by)
values ('00000000-0000-4000-8000-000000000131', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000130', 1, '1.0.0', '{"data_origin":"demo"}', 'verified', '00000000-0000-4000-8000-000000000001');
update public.roof_models set current_revision_id = '00000000-0000-4000-8000-000000000131' where id = '00000000-0000-4000-8000-000000000130';
insert into public.calculations (id, organization_id, project_id, roof_model_id, calculator_type, display_name, status)
values ('00000000-0000-4000-8000-000000000132', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000130', 'roof.gable', 'F7.3.2 DEMO geometria', 'current');
insert into public.calculation_revisions (id, organization_id, calculation_id, revision_number, input_schema_version, calculator_implementation_version, input_snapshot, output_snapshot, validation_status, created_by)
values ('00000000-0000-4000-8000-000000000133', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000132', 1, '1.0.0', '1.0.0', '{}', '{"areas":{"combinedRoofM2":100}}', 'verified', '00000000-0000-4000-8000-000000000001');
update public.calculations set current_revision_id = '00000000-0000-4000-8000-000000000133' where id = '00000000-0000-4000-8000-000000000132';
insert into public.calculation_dependencies (organization_id, downstream_calculation_revision_id, upstream_roof_model_revision_id, dependency_type)
values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000133', '00000000-0000-4000-8000-000000000131', 'roof_model_input');
insert into public.material_products (id, organization_id, category, name, data_provenance)
values ('00000000-0000-4000-8000-000000000134', '00000000-0000-4000-8000-000000000011', 'sheet_metal', 'F7.3.2 másik szervezet DEMO', 'demo');
insert into public.material_variants (id, organization_id, product_id, name, purchasing_unit, data_provenance)
values ('00000000-0000-4000-8000-000000000135', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000134', 'F7.3.2 cross-org DEMO', 'square_meter', 'demo');
reset role;
create function pg_temp.save_layout(p_operation_id uuid, p_expected integer, p_variant_id uuid, p_input jsonb, p_output jsonb)
returns table(calculation_id uuid, calculation_revision_id uuid, revision_number integer, revision_created boolean)
language sql as $$
  select * from public.save_metal_sheet_layout_secure(
    '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000130',
    '00000000-0000-4000-8000-000000000131', '00000000-0000-4000-8000-000000000133',
    null::uuid,
    p_variant_id, 'F7.3.2 DEMO kiosztás', p_input, p_output, '{"calculation":"server_verified"}', '[]', p_expected,
    p_operation_id, '00000000-0000-4000-8000-000000000001'
  );
$$;
set local role authenticated;
select ok(not has_function_privilege('authenticated', 'public.save_metal_sheet_layout_secure(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,integer,uuid,uuid)', 'EXECUTE'), 'authenticated clients cannot call the restricted layout writer');
select ok(has_function_privilege('tetopro_covering_writer', 'public.save_metal_sheet_layout_secure(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,integer,uuid,uuid)', 'EXECUTE'), 'restricted server writer can call the layout RPC');
select throws_ok($$select * from public.save_metal_sheet_layout(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000130',
  '00000000-0000-4000-8000-000000000131', '00000000-0000-4000-8000-000000000133', null, '00000000-0000-4000-8000-000000000082', 'F7.3.2 közvetlen írás',
  '{"source":{"roofRevisionId":"00000000-0000-4000-8000-000000000131","geometryCalculationRevisionId":"00000000-0000-4000-8000-000000000133"},"material":{"catalogSnapshot":{"variantId":"00000000-0000-4000-8000-000000000082"}}}', '{}', '{}', '[]', 0)$$,
  '42501', null, 'authenticated direct layout writer is denied');
reset role;
set local role tetopro_covering_writer;
select lives_ok($$select * from pg_temp.save_layout('00000000-0000-4000-8000-000000001301', 0, '00000000-0000-4000-8000-000000000082',
  '{"source":{"roofRevisionId":"00000000-0000-4000-8000-000000000131","geometryCalculationRevisionId":"00000000-0000-4000-8000-000000000133"},"material":{"catalogSnapshot":{"variantId":"00000000-0000-4000-8000-000000000082","provenance":"demo"}},"calculatorInput":{"effectiveCoveringWidthMm":1000}}',
  '{"totalStripCount":26}')$$, 'restricted writer atomically saves layout revision V1');
reset role;
set local role postgres;
select is((select count(*)::int from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id where c.roof_model_id = '00000000-0000-4000-8000-000000000130' and c.calculator_type = 'covering.metal-sheets.layout'), 1, 'layout V1 is stored once');
select is((select cr.material_variant_id from public.calculation_revisions cr join public.calculations c on c.current_revision_id = cr.id where c.roof_model_id = '00000000-0000-4000-8000-000000000130' and c.calculator_type = 'covering.metal-sheets.layout'), '00000000-0000-4000-8000-000000000082'::uuid, 'layout revision preserves material variant reference');
select is((select count(*)::int from public.calculation_dependencies cd join public.calculations c on c.current_revision_id = cd.downstream_calculation_revision_id where c.roof_model_id = '00000000-0000-4000-8000-000000000130' and c.calculator_type = 'covering.metal-sheets.layout'), 2, 'layout stores roof and geometry dependencies');
set local role tetopro_covering_writer;
select lives_ok($$select * from pg_temp.save_layout('00000000-0000-4000-8000-000000001301', 0, '00000000-0000-4000-8000-000000000082',
  '{"source":{"roofRevisionId":"00000000-0000-4000-8000-000000000131","geometryCalculationRevisionId":"00000000-0000-4000-8000-000000000133"},"material":{"catalogSnapshot":{"variantId":"00000000-0000-4000-8000-000000000082","provenance":"demo"}},"calculatorInput":{"effectiveCoveringWidthMm":1000}}',
  '{"totalStripCount":26}')$$, 'identical request key reuses the same layout revision');
reset role;
set local role postgres;
select is((select count(*)::int from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id where c.roof_model_id = '00000000-0000-4000-8000-000000000130' and c.calculator_type = 'covering.metal-sheets.layout'), 1, 'identical input does not create a duplicate revision');
set local role tetopro_covering_writer;
select lives_ok($$select * from pg_temp.save_layout('00000000-0000-4000-8000-000000001302', 1, '00000000-0000-4000-8000-000000000082',
  '{"source":{"roofRevisionId":"00000000-0000-4000-8000-000000000131","geometryCalculationRevisionId":"00000000-0000-4000-8000-000000000133"},"material":{"catalogSnapshot":{"variantId":"00000000-0000-4000-8000-000000000082","provenance":"demo"}},"calculatorInput":{"effectiveCoveringWidthMm":1250}}',
  '{"totalStripCount":20}')$$, 'changed layout creates immutable revision V2');
reset role;
set local role postgres;
select is((select count(*)::int from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id where c.roof_model_id = '00000000-0000-4000-8000-000000000130' and c.calculator_type = 'covering.metal-sheets.layout'), 2, 'layout revision history contains V1 and V2');
select is((select output_snapshot ->> 'totalStripCount' from public.calculation_revisions cr join public.calculations c on c.id = cr.calculation_id where c.roof_model_id = '00000000-0000-4000-8000-000000000130' and c.calculator_type = 'covering.metal-sheets.layout' and cr.revision_number = 1), '26', 'historical layout output remains unchanged');
set local role tetopro_covering_writer;
select throws_ok($$select * from pg_temp.save_layout('00000000-0000-4000-8000-000000001303', 1, '00000000-0000-4000-8000-000000000082',
  '{"source":{"roofRevisionId":"00000000-0000-4000-8000-000000000131","geometryCalculationRevisionId":"00000000-0000-4000-8000-000000000133"},"material":{"catalogSnapshot":{"variantId":"00000000-0000-4000-8000-000000000082"}},"calculatorInput":{"effectiveCoveringWidthMm":900}}', '{}')$$,
  '40001', null, 'stale concurrent layout write is rejected');
reset role;
set local role postgres;
select throws_ok($$update public.calculation_revisions set output_snapshot = '{}' where calculation_id = (select id from public.calculations where roof_model_id = '00000000-0000-4000-8000-000000000130' and calculator_type = 'covering.metal-sheets.layout')$$, 'P0001', null, 'saved layout revisions are immutable');
set local role tetopro_covering_writer;
select throws_ok($$select * from public.save_metal_sheet_layout_secure(
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000060', '00000000-0000-4000-8000-000000000130',
  '00000000-0000-4000-8000-000000000131', '00000000-0000-4000-8000-000000000133', null::uuid, '00000000-0000-4000-8000-000000000082', 'cross-project',
  '{"source":{"roofRevisionId":"00000000-0000-4000-8000-000000000131","geometryCalculationRevisionId":"00000000-0000-4000-8000-000000000133"},"material":{"catalogSnapshot":{"variantId":"00000000-0000-4000-8000-000000000082"}}}'::jsonb, '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, 0,
  '00000000-0000-4000-8000-000000001304'::uuid, '00000000-0000-4000-8000-000000000001'::uuid)$$, '40001', null, 'cross-project layout source is rejected');
select throws_ok($$select * from pg_temp.save_layout('00000000-0000-4000-8000-000000001305', 2, '00000000-0000-4000-8000-000000000135',
  '{"source":{"roofRevisionId":"00000000-0000-4000-8000-000000000131","geometryCalculationRevisionId":"00000000-0000-4000-8000-000000000133"},"material":{"catalogSnapshot":{"variantId":"00000000-0000-4000-8000-000000000135"}}}', '{}')$$,
  '23503', null, 'cross-organization material variant is rejected');
reset role;
set local role authenticated;
select lives_ok($$select public.create_sheet_layout_takeoff_draft('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', (select id from public.calculations where roof_model_id = '00000000-0000-4000-8000-000000000130' and calculator_type = 'covering.metal-sheets.layout'), (select current_revision_id from public.calculations where roof_model_id = '00000000-0000-4000-8000-000000000130' and calculator_type = 'covering.metal-sheets.layout'), 'F7.3.2 DEMO tervezet', 10)$$, 'square-meter layout creates an editable takeoff draft');
select is((select status::text from public.material_takeoffs where name = 'F7.3.2 DEMO tervezet'), 'draft', 'layout handoff never auto-approves');
select is((select final_quantity from public.material_takeoff_items where takeoff_id = (select id from public.material_takeoffs where name = 'F7.3.2 DEMO tervezet')), 110::numeric, 'layout handoff reuses verified area with explicit allowance');
reset role;
set local role tetopro_covering_writer;
select lives_ok($$select * from pg_temp.save_layout('00000000-0000-4000-8000-000000001306', 2, '00000000-0000-4000-8000-000000000085',
  '{"source":{"roofRevisionId":"00000000-0000-4000-8000-000000000131","geometryCalculationRevisionId":"00000000-0000-4000-8000-000000000133"},"material":{"catalogSnapshot":{"variantId":"00000000-0000-4000-8000-000000000085","provenance":"missing"}},"calculatorInput":{"effectiveCoveringWidthMm":1000}}',
  '{"totalStripCount":26}')$$, 'piece-based layout can be saved without inventing a purchasing conversion');
reset role;
set local role postgres;
select throws_ok($$select public.create_sheet_layout_takeoff_draft('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', (select id from public.calculations where roof_model_id = '00000000-0000-4000-8000-000000000130' and calculator_type = 'covering.metal-sheets.layout'), (select current_revision_id from public.calculations where roof_model_id = '00000000-0000-4000-8000-000000000130' and calculator_type = 'covering.metal-sheets.layout'), 'invalid conversion', 0)$$, '22023', null, 'unsupported piece conversion is rejected');
select lives_ok($$insert into public.roof_model_revisions (id, organization_id, roof_model_id, revision_number, schema_version, input_data, validation_status) values ('00000000-0000-4000-8000-000000000136', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000130', 2, '1.0.0', '{}', 'verified'); update public.roof_models set current_revision_id = '00000000-0000-4000-8000-000000000136' where id = '00000000-0000-4000-8000-000000000130'$$, 'roof geometry can advance to a new immutable revision');
select is((select status from public.calculations where roof_model_id = '00000000-0000-4000-8000-000000000130' and calculator_type = 'covering.metal-sheets.layout'), 'stale', 'roof revision change marks current layout stale');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
reset role;
set local role tetopro_covering_writer;
select throws_ok($$select * from public.save_metal_sheet_layout_secure('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000130',
  '00000000-0000-4000-8000-000000000136', '00000000-0000-4000-8000-000000000133', null, '00000000-0000-4000-8000-000000000082', 'unauthorized',
  '{"source":{"roofRevisionId":"00000000-0000-4000-8000-000000000136","geometryCalculationRevisionId":"00000000-0000-4000-8000-000000000133"},"material":{"catalogSnapshot":{"variantId":"00000000-0000-4000-8000-000000000082"}}}'::jsonb, '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, 0,
  '00000000-0000-4000-8000-000000001307'::uuid, '00000000-0000-4000-8000-000000000002'::uuid)$$, '42501', null, 'non-member cannot save a sheet layout');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select has_table('public', 'material_takeoffs', 'material_takeoffs exists');
select has_table('public', 'material_takeoff_items', 'material_takeoff_items exists');
select is((select relrowsecurity from pg_class where oid = 'public.material_takeoffs'::regclass), true, 'material_takeoffs RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.material_takeoff_items'::regclass), true, 'material_takeoff_items RLS enabled');
select ok(exists (select 1 from pg_constraint where conname = 'material_takeoffs_calculation_revision_fk'), 'takeoff source revision constraint exists');
select ok(exists (select 1 from pg_constraint where conname = 'material_takeoff_items_variant_fk'), 'takeoff variant constraint exists');
select ok(exists (select 1 from pg_proc where proname = 'approve_material_takeoff'), 'approval function exists');
select ok(exists (select 1 from pg_trigger where tgname = 'material_takeoffs_approved_immutable'), 'approved immutability trigger exists');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select lives_ok($$insert into public.material_takeoffs (id, organization_id, project_id, source_calculation_id, source_calculation_revision_id, name, created_by) values ('00000000-0000-4000-8000-000000000120', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000050', '00000000-0000-4000-8000-000000000051', 'DEMO F7.2 kimutatás', '00000000-0000-4000-8000-000000000001')$$, 'member can create draft takeoff');
select ok(exists (select 1 from public.material_takeoffs where id = '00000000-0000-4000-8000-000000000120' and status = 'draft'), 'draft takeoff is readable');
select lives_ok($$insert into public.material_takeoff_items (id, organization_id, takeoff_id, variant_id, estimation_method, measurement_source, selected_measurement_value, allowance_percent, calculated_quantity, final_quantity, quantity_unit, material_snapshot, data_provenance, created_by) values ('00000000-0000-4000-8000-000000000121', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000120', '00000000-0000-4000-8000-000000000082', 'area', 'areas.combinedRoofM2', 140.625, 10, 154.6875, 154.6875, 'square_meter', '{"source":"DEMO"}', 'demo', '00000000-0000-4000-8000-000000000001')$$, 'member can add takeoff item');
select is((select count(*)::int from public.material_takeoff_items where takeoff_id = '00000000-0000-4000-8000-000000000120'), 1, 'takeoff item is stored');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is_empty('select 1 from public.material_takeoffs where organization_id = ''00000000-0000-4000-8000-000000000010''', 'non-member cannot read takeoffs');
select throws_ok($$insert into public.material_takeoffs (organization_id, project_id, source_calculation_id, source_calculation_revision_id, name) values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000050', '00000000-0000-4000-8000-000000000051', 'unauthorized')$$, '42501', null, 'non-member cannot create takeoff');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select lives_ok($$select * from public.approve_material_takeoff('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000120', 1)$$, 'owner can approve current takeoff');
select is((select status::text from public.material_takeoffs where id = '00000000-0000-4000-8000-000000000120'), 'approved', 'approval changes status');
select is((select approved_by from public.material_takeoffs where id = '00000000-0000-4000-8000-000000000120'), '00000000-0000-4000-8000-000000000001'::uuid, 'approval records actor');
set local role postgres;
select throws_ok($$update public.material_takeoff_items set final_quantity = 1, adjustment_reason = 'tampered' where id = '00000000-0000-4000-8000-000000000121'$$, 'P0001', null, 'approved takeoff item is immutable');
select throws_ok($$update public.material_takeoffs set name = 'tampered' where id = '00000000-0000-4000-8000-000000000120'$$, 'P0001', null, 'approved takeoff is immutable');
set local role authenticated;

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
