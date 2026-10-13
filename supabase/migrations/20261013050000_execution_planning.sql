create type public.execution_task_status as enum ('todo', 'in_progress', 'done');
create type public.execution_task_priority as enum ('low', 'normal', 'high');

create table public.execution_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  project_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (description is null or char_length(description) <= 2000),
  source_quotation_id uuid,
  source_revision_id uuid,
  request_key uuid not null default gen_random_uuid(),
  version integer not null default 0 check (version >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint execution_plans_project_org_fk foreign key (project_id, organization_id) references public.projects(id, organization_id),
  constraint execution_plans_id_org_uq unique (id, organization_id),
  constraint execution_plans_source_pair_ck check ((source_quotation_id is null) = (source_revision_id is null)),
  constraint execution_plans_request_key_uq unique (organization_id, project_id, request_key)
);

create table public.execution_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  plan_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (description is null or char_length(description) <= 2000),
  status public.execution_task_status not null default 'todo',
  priority public.execution_task_priority not null default 'normal',
  due_date date,
  sort_order integer not null default 0,
  request_key uuid not null default gen_random_uuid(),
  version integer not null default 0 check (version >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint execution_tasks_plan_org_fk foreign key (plan_id, organization_id) references public.execution_plans(id, organization_id) on delete cascade,
  constraint execution_tasks_request_key_uq unique (organization_id, plan_id, request_key)
);

create index execution_plans_project_idx on public.execution_plans(organization_id, project_id, updated_at desc);
create index execution_tasks_plan_idx on public.execution_tasks(organization_id, plan_id, sort_order, created_at);

create or replace function private.validate_execution_plan_source()
returns trigger language plpgsql set search_path = public, private as $$
declare quote_row record;
begin
  if new.source_quotation_id is null then return new; end if;
  if tg_op = 'UPDATE' and (new.source_quotation_id is distinct from old.source_quotation_id or new.source_revision_id is distinct from old.source_revision_id or new.organization_id is distinct from old.organization_id or new.project_id is distinct from old.project_id) then
    raise exception 'execution plan source is immutable';
  end if;
  select q.status, q.finalized_revision_id, q.project_id, q.organization_id into quote_row
    from public.quotations q where q.id = new.source_quotation_id and q.organization_id = new.organization_id for share;
  if not found or quote_row.project_id <> new.project_id or quote_row.status <> 'accepted' or quote_row.finalized_revision_id <> new.source_revision_id then
    raise exception 'execution source must be an accepted quotation finalized revision in the same project';
  end if;
  if not exists (select 1 from public.quotation_revisions r where r.id = new.source_revision_id and r.quotation_id = new.source_quotation_id and r.organization_id = new.organization_id) then
    raise exception 'execution source revision does not belong to quotation';
  end if;
  return new;
end $$;

create trigger execution_plans_validate_source before insert or update on public.execution_plans
for each row execute function private.validate_execution_plan_source();

create or replace function private.touch_execution_updated_at()
returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end $$;
create trigger execution_plans_touch before update on public.execution_plans for each row execute function private.touch_execution_updated_at();
create trigger execution_tasks_touch before update on public.execution_tasks for each row execute function private.touch_execution_updated_at();

alter table public.execution_plans enable row level security;
alter table public.execution_tasks enable row level security;
create policy execution_plans_member_select on public.execution_plans for select to authenticated using (private.is_org_member(organization_id));
create policy execution_plans_member_insert on public.execution_plans for insert to authenticated with check (private.is_org_member(organization_id) and created_by = auth.uid());
create policy execution_plans_member_update on public.execution_plans for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy execution_tasks_member_select on public.execution_tasks for select to authenticated using (private.is_org_member(organization_id));
create policy execution_tasks_member_insert on public.execution_tasks for insert to authenticated with check (private.is_org_member(organization_id) and created_by = auth.uid());
create policy execution_tasks_member_update on public.execution_tasks for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
grant select, insert, update on public.execution_plans, public.execution_tasks to authenticated;

create or replace function public.create_execution_plan(
  p_organization_id uuid, p_project_id uuid, p_title text, p_description text,
  p_source_quotation_id uuid default null, p_source_revision_id uuid default null, p_request_key uuid default gen_random_uuid()
) returns table(plan_id uuid) language plpgsql security invoker set search_path = public, private as $$
declare row_id uuid;
begin
  if not private.is_org_member(p_organization_id) or not exists (select 1 from projects where id = p_project_id and organization_id = p_organization_id) then raise exception 'project access denied'; end if;
  insert into execution_plans(organization_id, project_id, title, description, source_quotation_id, source_revision_id, request_key, created_by)
  values (p_organization_id, p_project_id, p_title, nullif(p_description, ''), p_source_quotation_id, p_source_revision_id, p_request_key, auth.uid())
  on conflict (organization_id, project_id, request_key) do update set id = execution_plans.id
  returning id into row_id;
  return query select row_id;
end $$;

create or replace function public.save_execution_task(
  p_organization_id uuid, p_plan_id uuid, p_task_id uuid, p_title text, p_description text,
  p_status public.execution_task_status, p_priority public.execution_task_priority, p_due_date date,
  p_sort_order integer, p_expected_version integer default 0, p_request_key uuid default gen_random_uuid()
) returns table(task_id uuid, task_version integer) language plpgsql security invoker set search_path = public, private as $$
declare row_id uuid; next_version integer;
begin
  if not private.is_org_member(p_organization_id) then raise exception 'organization access denied'; end if;
  if p_task_id is null then
    insert into execution_tasks(organization_id, plan_id, title, description, status, priority, due_date, sort_order, request_key, created_by)
    values (p_organization_id, p_plan_id, p_title, nullif(p_description, ''), p_status, p_priority, p_due_date, p_sort_order, p_request_key, auth.uid())
    on conflict (organization_id, plan_id, request_key) do update set id = execution_tasks.id
    returning id, version into row_id, next_version;
  else
    update execution_tasks set title=p_title, description=nullif(p_description,''), status=p_status, priority=p_priority, due_date=p_due_date, sort_order=p_sort_order, version=version+1
    where id=p_task_id and organization_id=p_organization_id and plan_id=p_plan_id and version=p_expected_version
    returning id, version into row_id, next_version;
    if row_id is null then raise exception 'stale execution task'; end if;
  end if;
  return query select row_id, next_version;
end $$;
grant execute on function public.create_execution_plan(uuid, uuid, text, text, uuid, uuid, uuid) to authenticated;
grant execute on function public.save_execution_task(uuid, uuid, uuid, text, text, public.execution_task_status, public.execution_task_priority, date, integer, integer, uuid) to authenticated;
