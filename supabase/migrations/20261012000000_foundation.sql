-- F2.1: Supabase foundation for organization-isolated business data.
-- This migration intentionally does not create onboarding or application UI.

create schema if not exists private;

create type public.organization_role as enum ('owner', 'admin', 'member');
create type public.project_type as enum ('roof_renovation', 'roof_construction', 'gutter_work', 'other');
create type public.project_status as enum ('draft', 'in_progress', 'quoted', 'accepted', 'completed', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) between 1 and 160)
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_length check (char_length(trim(name)) between 1 and 200)
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  billing_address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_name_length check (char_length(trim(name)) between 1 and 200),
  constraint clients_email_length check (email is null or char_length(email) <= 320)
);

alter table public.clients add constraint clients_id_organization_unique unique (id, organization_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete restrict,
  name text not null,
  description text,
  location text,
  project_type public.project_type not null default 'other',
  status public.project_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_length check (char_length(trim(name)) between 1 and 200),
  constraint projects_version_positive check (version > 0),
  constraint projects_id_organization_unique unique (id, organization_id),
  constraint projects_client_same_organization_fk
    foreign key (client_id, organization_id)
    references public.clients (id, organization_id)
    on update cascade
);

create index organization_members_user_id_idx on public.organization_members (user_id);
create index clients_organization_id_idx on public.clients (organization_id);
create index projects_organization_id_idx on public.projects (organization_id);
create index projects_client_id_idx on public.projects (client_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations for each row execute function private.set_updated_at();
create trigger clients_set_updated_at before update on public.clients for each row execute function private.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute function private.set_updated_at();

create or replace function private.prevent_organization_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id is immutable';
  end if;
  return new;
end;
$$;

create trigger clients_organization_immutable before update on public.clients for each row execute function private.prevent_organization_change();
create trigger projects_organization_immutable before update on public.projects for each row execute function private.prevent_organization_change();

create or replace function private.prevent_project_ownership_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by is immutable';
  end if;
  return new;
end;
$$;

create trigger projects_created_by_immutable
before update on public.projects
for each row execute function private.prevent_project_ownership_change();

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.organization_members as om where om.organization_id = target_organization_id and om.user_id = (select auth.uid()));
$$;

create or replace function private.is_org_admin_or_owner(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.organization_members as om where om.organization_id = target_organization_id and om.user_id = (select auth.uid()) and om.role in ('owner', 'admin'));
$$;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on all functions in schema private from public;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.is_org_admin_or_owner(uuid) to authenticated;
grant usage on type public.organization_role, public.project_type, public.project_status to authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select on public.organizations to authenticated;
grant update (name) on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
revoke update (id, organization_id, created_at) on public.clients from authenticated;
revoke update (id, organization_id, created_at, created_by) on public.projects from authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy organizations_select_member on public.organizations for select to authenticated using ((select private.is_org_member(id)));
create policy organizations_update_admin on public.organizations for update to authenticated using ((select private.is_org_admin_or_owner(id))) with check ((select private.is_org_admin_or_owner(id)));
create policy organization_members_select_member on public.organization_members for select to authenticated using ((select private.is_org_member(organization_id)));

create policy clients_select_member on public.clients for select to authenticated using ((select private.is_org_member(organization_id)));
create policy clients_insert_member on public.clients for insert to authenticated with check ((select private.is_org_member(organization_id)));
create policy clients_update_member on public.clients for update to authenticated using ((select private.is_org_member(organization_id))) with check ((select private.is_org_member(organization_id)));
create policy clients_delete_member on public.clients for delete to authenticated using ((select private.is_org_member(organization_id)));

create policy projects_select_member on public.projects for select to authenticated using ((select private.is_org_member(organization_id)));
create policy projects_insert_member on public.projects for insert to authenticated with check ((select private.is_org_member(organization_id)) and (created_by is null or created_by = (select auth.uid())));
create policy projects_update_member on public.projects for update to authenticated using ((select private.is_org_member(organization_id))) with check ((select private.is_org_member(organization_id)) and (created_by is null or created_by = (select auth.uid())));
create policy projects_delete_member on public.projects for delete to authenticated using ((select private.is_org_member(organization_id)));

comment on table public.organization_members is 'Membership writes are intentionally absent from authenticated policies; secure bootstrap is an F2.2 server-side concern.';
comment on constraint projects_client_same_organization_fk on public.projects is 'Prevents a project from referencing a client owned by another organization.';
