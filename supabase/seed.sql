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
