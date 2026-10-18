-- DEMO-only local seed. No real customer data and no usable credentials.
-- This file is applied only by the local Supabase stack / local db reset.

-- A GoTrue (Auth) csak a saját instance_id-jű, nem NULL token/időbélyeg mezőkkel
-- rendelkező sorokat látja; e nélkül a helyi bejelentkezés és a db:local-auth hibázik.
insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
  email_change, phone_change, phone_change_token, reauthentication_token
)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo.owner@local.test', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false, '', '', '', '', '', '', '', ''),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo.outsider@local.test', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false, '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

insert into public.organizations (id, name)
values ('00000000-0000-4000-8000-000000000010', 'DEMO TetőPro Kft.')
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role)
values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'owner')
on conflict (organization_id, user_id) do nothing;

insert into public.clients (id, organization_id, name, notes)
values ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000010', 'DEMO ügyfél', 'DEMO adat — nem valós ügyfél')
on conflict (id) do nothing;

insert into public.projects (id, organization_id, client_id, name, project_type, status, created_by)
values ('00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000020', 'DEMO nyeregtető', 'roof_renovation', 'draft', '00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.roof_models (id, organization_id, project_id, name, roof_type)
values ('00000000-0000-4000-8000-000000000040', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', 'DEMO nyeregtető modell', 'gable')
on conflict (id) do nothing;

insert into public.roof_model_revisions (
  id, organization_id, roof_model_id, revision_number, schema_version,
  input_data, validation_status, created_by
)
values (
  '00000000-0000-4000-8000-000000000041',
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000040',
  1,
  'roof.gable.input.v1',
  '{"data_origin":"demo","span_mm":12000,"ridge_length_mm":10000,"pitch_degrees":35}'::jsonb,
  'demo',
  '00000000-0000-4000-8000-000000000001'
)
on conflict (id) do nothing;

update public.roof_models
set current_revision_id = '00000000-0000-4000-8000-000000000041'
where id = '00000000-0000-4000-8000-000000000040';

insert into public.calculations (
  id, organization_id, project_id, roof_model_id, calculator_type, display_name, status
)
values (
  '00000000-0000-4000-8000-000000000050',
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000030',
  '00000000-0000-4000-8000-000000000040',
  'roof.gable',
  'DEMO nyeregtető kalkuláció',
  'current'
)
on conflict (id) do nothing;

insert into public.calculation_revisions (
  id, organization_id, calculation_id, revision_number,
  input_schema_version, calculator_implementation_version,
  input_snapshot, output_snapshot, data_provenance, validation_status,
  warnings, created_by
)
values (
  '00000000-0000-4000-8000-000000000051',
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000050',
  1,
  'roof.gable.input.v1',
  'not-implemented',
  '{"roof_model_revision_id":"00000000-0000-4000-8000-000000000041","data_origin":"demo"}'::jsonb,
  '{"status":"demo","calculation_implemented":false}'::jsonb,
  '{"input":"demo","output":"demo","verified":false}'::jsonb,
  'demo',
  '["DEMO adat — nincs matematikai kalkulátor implementálva"]'::jsonb,
  '00000000-0000-4000-8000-000000000001'
)
on conflict (id) do nothing;

update public.calculations
set current_revision_id = '00000000-0000-4000-8000-000000000051'
where id = '00000000-0000-4000-8000-000000000050';

insert into public.calculation_dependencies (
  organization_id, downstream_calculation_revision_id,
  upstream_roof_model_revision_id, dependency_type
)
values (
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000051',
  '00000000-0000-4000-8000-000000000041',
  'roof_geometry'
)
on conflict do nothing;
