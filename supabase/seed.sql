-- DEMO-only local seed. No real customer data and no usable credentials.
-- This file is applied only by the local Supabase stack / local db reset.

insert into auth.users (id, aud, role, email, email_confirmed_at)
values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'demo.owner@local.test', now()),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'demo.outsider@local.test', now())
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
