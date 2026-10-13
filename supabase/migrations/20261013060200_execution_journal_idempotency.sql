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
