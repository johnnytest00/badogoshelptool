create type public.execution_journal_category as enum ('general', 'work_done', 'problem', 'next_step');

alter table public.execution_tasks add constraint execution_tasks_id_org_uq unique (id, organization_id);

create table public.execution_journal_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  plan_id uuid not null,
  task_id uuid,
  work_date date not null,
  category public.execution_journal_category not null default 'general',
  content text not null check (char_length(btrim(content)) between 1 and 10000),
  problems text check (problems is null or char_length(problems) <= 5000),
  next_steps text check (next_steps is null or char_length(next_steps) <= 5000),
  correction_of_entry_id uuid,
  request_key uuid not null default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint execution_journal_id_org_uq unique (id, organization_id),
  constraint execution_journal_plan_org_fk foreign key (plan_id, organization_id) references public.execution_plans(id, organization_id),
  constraint execution_journal_task_org_fk foreign key (task_id, organization_id) references public.execution_tasks(id, organization_id),
  constraint execution_journal_correction_org_fk foreign key (correction_of_entry_id, organization_id) references public.execution_journal_entries(id, organization_id),
  constraint execution_journal_request_key_uq unique (organization_id, plan_id, request_key)
);

create table public.execution_task_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  plan_id uuid not null,
  task_id uuid not null,
  from_status public.execution_task_status not null,
  to_status public.execution_task_status not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now(),
  constraint execution_task_events_plan_org_fk foreign key (plan_id, organization_id) references public.execution_plans(id, organization_id),
  constraint execution_task_events_task_org_fk foreign key (task_id, organization_id) references public.execution_tasks(id, organization_id),
  constraint execution_task_events_changed_ck check (from_status <> to_status)
);

create index execution_journal_plan_date_idx on public.execution_journal_entries(organization_id, plan_id, work_date desc, created_at desc);
create index execution_journal_task_idx on public.execution_journal_entries(organization_id, task_id, work_date desc);
create index execution_task_events_plan_time_idx on public.execution_task_events(organization_id, plan_id, changed_at desc, id desc);
create index execution_task_events_task_time_idx on public.execution_task_events(organization_id, task_id, changed_at desc, id desc);

create or replace function private.record_execution_task_status_event()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if new.status is distinct from old.status then
    insert into public.execution_task_events(organization_id, plan_id, task_id, from_status, to_status, changed_by)
    values (new.organization_id, new.plan_id, new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end $$;

create trigger execution_tasks_status_event after update of status on public.execution_tasks
for each row execute function private.record_execution_task_status_event();

alter table public.execution_journal_entries enable row level security;
alter table public.execution_task_events enable row level security;
create policy execution_journal_member_select on public.execution_journal_entries for select to authenticated using (private.is_org_member(organization_id));
create policy execution_journal_member_insert on public.execution_journal_entries for insert to authenticated with check (private.is_org_member(organization_id) and created_by = auth.uid());
create policy execution_task_events_member_select on public.execution_task_events for select to authenticated using (private.is_org_member(organization_id));
grant select, insert on public.execution_journal_entries to authenticated;
grant select on public.execution_task_events to authenticated;

create or replace function public.create_execution_journal_entry(
  p_organization_id uuid, p_plan_id uuid, p_task_id uuid, p_work_date date,
  p_category public.execution_journal_category, p_content text, p_problems text default null,
  p_next_steps text default null, p_correction_of_entry_id uuid default null, p_request_key uuid default gen_random_uuid()
) returns table(entry_id uuid) language plpgsql security invoker set search_path = public, private as $$
declare row_id uuid;
begin
  if not private.is_org_member(p_organization_id) then raise exception 'organization access denied'; end if;
  if not exists (select 1 from execution_plans where id = p_plan_id and organization_id = p_organization_id) then raise exception 'execution plan access denied'; end if;
  if p_task_id is not null and not exists (select 1 from execution_tasks where id = p_task_id and plan_id = p_plan_id and organization_id = p_organization_id) then raise exception 'journal task must belong to the execution plan'; end if;
  if p_correction_of_entry_id is not null and not exists (select 1 from execution_journal_entries where id = p_correction_of_entry_id and plan_id = p_plan_id and organization_id = p_organization_id) then raise exception 'correction must reference an entry in the same plan'; end if;
  insert into execution_journal_entries(organization_id, plan_id, task_id, work_date, category, content, problems, next_steps, correction_of_entry_id, request_key, created_by)
  values (p_organization_id, p_plan_id, p_task_id, p_work_date, p_category, p_content, nullif(p_problems, ''), nullif(p_next_steps, ''), p_correction_of_entry_id, p_request_key, auth.uid())
  on conflict (organization_id, plan_id, request_key) do nothing;
  select id into row_id from execution_journal_entries where organization_id = p_organization_id and plan_id = p_plan_id and request_key = p_request_key;
  return query select row_id;
end $$;

grant execute on function public.create_execution_journal_entry(uuid, uuid, uuid, date, public.execution_journal_category, text, text, text, uuid, uuid) to authenticated;
