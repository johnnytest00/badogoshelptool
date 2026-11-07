create type public.execution_project_status as enum ('planned', 'active', 'paused', 'completed', 'archived');

alter table public.execution_plans
  add column status public.execution_project_status,
  add column client_name text check (client_name is null or char_length(client_name) <= 200),
  add column location text check (location is null or char_length(location) <= 500),
  add column planned_start_date date,
  add column planned_end_date date,
  add constraint execution_plans_planned_dates_ck check (
    planned_start_date is null or planned_end_date is null or planned_end_date >= planned_start_date
  );

create table public.execution_plan_status_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  plan_id uuid not null,
  from_status public.execution_project_status,
  to_status public.execution_project_status not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now(),
  constraint execution_plan_status_events_plan_fk
    foreign key (plan_id, organization_id) references public.execution_plans(id, organization_id) on delete restrict,
  constraint execution_plan_status_events_changed_ck check (from_status is distinct from to_status)
);

create index execution_plan_status_events_plan_time_idx
  on public.execution_plan_status_events(organization_id, plan_id, changed_at desc, id desc);

create or replace function private.record_execution_plan_status_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.status is not null then
    insert into public.execution_plan_status_events(organization_id, plan_id, from_status, to_status, changed_by)
    values (new.organization_id, new.id, old.status, new.status, (select auth.uid()));
  end if;
  return new;
end
$$;

revoke all on function private.record_execution_plan_status_event() from public, anon, authenticated;

create trigger execution_plans_status_event
after update of status on public.execution_plans
for each row execute function private.record_execution_plan_status_event();

alter table public.execution_plan_status_events enable row level security;
create policy execution_plan_status_events_member_select
  on public.execution_plan_status_events for select to authenticated
  using (private.is_org_member(organization_id));
revoke all on public.execution_plan_status_events from anon, authenticated;
grant select on public.execution_plan_status_events to authenticated;

create or replace function public.create_execution_plan(
  p_organization_id uuid, p_project_id uuid, p_title text, p_description text,
  p_source_quotation_id uuid default null, p_source_revision_id uuid default null, p_request_key uuid default gen_random_uuid()
) returns table(plan_id uuid) language plpgsql security invoker set search_path = public, private as $$
declare
  row_id uuid;
  existing public.execution_plans%rowtype;
  actor_id uuid := auth.uid();
begin
  if actor_id is null or not private.is_org_member(p_organization_id) then
    raise exception 'organization access denied' using errcode = '42501';
  end if;
  if p_project_id is not null and not exists (
    select 1 from public.projects where id = p_project_id and organization_id = p_organization_id
  ) then
    raise exception 'project access denied' using errcode = '42501';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 200 or p_request_key is null then
    raise exception 'invalid execution plan payload' using errcode = '22023';
  end if;

  insert into public.execution_plans(organization_id, project_id, title, description, status, source_quotation_id, source_revision_id, request_key, created_by)
  values (p_organization_id, p_project_id, btrim(p_title), nullif(btrim(p_description), ''), case when p_project_id is null then 'planned'::public.execution_project_status else null end, p_source_quotation_id, p_source_revision_id, p_request_key, actor_id)
  on conflict (organization_id, created_by, request_key) do nothing
  returning id into row_id;

  if row_id is null then
    select * into existing from public.execution_plans p
      where p.organization_id = p_organization_id and p.created_by = actor_id and p.request_key = p_request_key
      for update;
    if not found
       or existing.project_id is distinct from p_project_id
       or existing.title is distinct from btrim(p_title)
       or existing.description is distinct from nullif(btrim(p_description), '')
       or existing.source_quotation_id is distinct from p_source_quotation_id
       or existing.source_revision_id is distinct from p_source_revision_id then
      raise exception 'execution plan request key reused with different content' using errcode = '22023';
    end if;
    row_id := existing.id;
  end if;
  return query select row_id;
end
$$;

create function public.update_execution_project(
  p_organization_id uuid,
  p_plan_id uuid,
  p_title text,
  p_description text,
  p_status public.execution_project_status,
  p_client_name text,
  p_location text,
  p_planned_start_date date,
  p_planned_end_date date,
  p_expected_version integer
) returns table(plan_id uuid, plan_version integer)
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  actor_id uuid := auth.uid();
  current_version integer;
begin
  if actor_id is null or not private.is_org_member(p_organization_id) then
    raise exception 'organization access denied' using errcode = '42501';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 200
     or p_status is null
     or p_expected_version is null or p_expected_version < 0
     or (p_description is not null and char_length(p_description) > 2000)
     or (p_client_name is not null and char_length(p_client_name) > 200)
     or (p_location is not null and char_length(p_location) > 500) then
    raise exception 'invalid execution project payload' using errcode = '22023';
  end if;
  if p_planned_start_date is not null and p_planned_end_date is not null and p_planned_end_date < p_planned_start_date then
    raise exception 'planned end date precedes start date' using errcode = '22007';
  end if;

  select p.version into current_version
  from public.execution_plans p
  where p.id = p_plan_id and p.organization_id = p_organization_id and p.project_id is null
  for update;
  if not found then
    raise exception 'execution project access denied' using errcode = '42501';
  end if;
  if current_version <> p_expected_version then
    raise exception 'stale execution project' using errcode = '40001';
  end if;

  update public.execution_plans
  set title = btrim(p_title),
      description = nullif(btrim(p_description), ''),
      status = p_status,
      client_name = nullif(btrim(p_client_name), ''),
      location = nullif(btrim(p_location), ''),
      planned_start_date = p_planned_start_date,
      planned_end_date = p_planned_end_date,
      version = version + 1
  where id = p_plan_id and organization_id = p_organization_id and project_id is null
  returning id, version into plan_id, plan_version;

  return next;
end
$$;

revoke all on function public.update_execution_project(uuid, uuid, text, text, public.execution_project_status, text, text, date, date, integer) from public, anon;
grant execute on function public.update_execution_project(uuid, uuid, text, text, public.execution_project_status, text, text, date, date, integer) to authenticated;
grant usage on type public.execution_project_status to authenticated;
