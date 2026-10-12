begin;

select plan(29);

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

select * from finish();
rollback;
