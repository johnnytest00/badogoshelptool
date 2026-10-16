-- F9.19 step 1: execution plans become selectable without a project, and surveys
-- link to the exact immutable survey revision used to create or attach the plan.
-- Existing projects, plans, revisions and accepted-quotation references remain intact.

alter table public.execution_plans
  alter column project_id drop not null;

create unique index execution_plans_creator_request_key_uq
  on public.execution_plans (organization_id, created_by, request_key);

alter table public.field_survey_revisions
  add constraint field_survey_revisions_id_survey_org_uq
  unique (id, survey_id, organization_id);

create table public.field_survey_execution_plan_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  survey_id uuid not null,
  survey_revision_id uuid not null,
  execution_plan_id uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  request_key uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  constraint survey_execution_links_survey_org_fk
    foreign key (survey_id, organization_id)
    references public.field_surveys(id, organization_id) on delete restrict,
  constraint survey_execution_links_revision_fk
    foreign key (survey_revision_id, survey_id, organization_id)
    references public.field_survey_revisions(id, survey_id, organization_id) on delete restrict,
  constraint survey_execution_links_plan_org_fk
    foreign key (execution_plan_id, organization_id)
    references public.execution_plans(id, organization_id) on delete restrict,
  constraint survey_execution_links_source_plan_uq
    unique (survey_revision_id, execution_plan_id),
  constraint survey_execution_links_request_uq
    unique (organization_id, created_by, request_key)
);

create index survey_execution_links_plan_idx
  on public.field_survey_execution_plan_links (organization_id, execution_plan_id, created_at desc);

alter table public.field_survey_execution_plan_links enable row level security;
revoke all on public.field_survey_execution_plan_links from public, anon, authenticated;
grant select on public.field_survey_execution_plan_links to authenticated;
create policy survey_execution_plan_links_read on public.field_survey_execution_plan_links
  for select to authenticated
  using (
    private.can_access_field_survey(survey_id, organization_id)
    and private.is_org_member(organization_id)
    and exists (
      select 1 from public.execution_plans p
      where p.id = execution_plan_id and p.organization_id = field_survey_execution_plan_links.organization_id
    )
  );

create trigger survey_execution_plan_links_immutable
  before update or delete on public.field_survey_execution_plan_links
  for each row execute function private.block_field_survey_revision_mutation();

create or replace function private.validate_execution_plan_source()
returns trigger language plpgsql set search_path = public, private as $$
declare quote_row record;
begin
  if new.source_quotation_id is null then return new; end if;
  if tg_op = 'UPDATE' and (
    new.source_quotation_id is distinct from old.source_quotation_id
    or new.source_revision_id is distinct from old.source_revision_id
    or new.organization_id is distinct from old.organization_id
    or new.project_id is distinct from old.project_id
  ) then
    raise exception 'execution plan source is immutable';
  end if;
  select q.status, q.finalized_revision_id, q.project_id, q.organization_id into quote_row
    from public.quotations q
    where q.id = new.source_quotation_id and q.organization_id = new.organization_id;
  if not found
     or quote_row.project_id is distinct from new.project_id
     or quote_row.status <> 'accepted'
     or quote_row.finalized_revision_id is distinct from new.source_revision_id then
    raise exception 'execution source must be an accepted quotation finalized revision in the same project';
  end if;
  if not exists (
    select 1 from public.quotation_revisions r
    where r.id = new.source_revision_id and r.quotation_id = new.source_quotation_id and r.organization_id = new.organization_id
  ) then
    raise exception 'execution source revision does not belong to quotation';
  end if;
  return new;
end $$;

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

  insert into public.execution_plans(organization_id, project_id, title, description, source_quotation_id, source_revision_id, request_key, created_by)
  values (p_organization_id, p_project_id, btrim(p_title), nullif(btrim(p_description), ''), p_source_quotation_id, p_source_revision_id, p_request_key, actor_id)
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
end $$;

create function public.link_field_survey_execution_plan(
  p_organization_id uuid,
  p_survey_id uuid,
  p_survey_revision_id uuid,
  p_execution_plan_id uuid,
  p_request_key uuid default gen_random_uuid()
) returns table(link_id uuid, execution_plan_id uuid, survey_revision_id uuid, survey_version integer)
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  survey_row public.field_surveys%rowtype;
  revision_row public.field_survey_revisions%rowtype;
  plan_row public.execution_plans%rowtype;
  link_row public.field_survey_execution_plan_links%rowtype;
begin
  if actor_id is null or p_request_key is null then
    raise exception 'survey-plan link access denied' using errcode = '42501';
  end if;
  select * into survey_row from public.field_surveys s
    where s.id = p_survey_id and s.organization_id = p_organization_id for update;
  if not found or not private.can_access_field_survey(survey_row.id, survey_row.organization_id) then
    raise exception 'survey access denied' using errcode = '42501';
  end if;
  select * into revision_row from public.field_survey_revisions r
    where r.id = p_survey_revision_id and r.survey_id = survey_row.id and r.organization_id = survey_row.organization_id;
  if not found then raise exception 'exact survey revision required' using errcode = '42501'; end if;
  select * into plan_row from public.execution_plans p
    where p.id = p_execution_plan_id and p.organization_id = p_organization_id for share;
  if not found or not private.is_org_member(p_organization_id) then
    raise exception 'execution plan access denied' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_organization_id::text || ':' || actor_id::text || ':' || p_request_key::text, 0));
  select * into link_row from public.field_survey_execution_plan_links l
    where l.organization_id = p_organization_id and l.created_by = actor_id and l.request_key = p_request_key;
  if found then
    if link_row.survey_id is distinct from p_survey_id
       or link_row.survey_revision_id is distinct from p_survey_revision_id
       or link_row.execution_plan_id is distinct from p_execution_plan_id then
      raise exception 'survey-plan request key reused with different content' using errcode = '22023';
    end if;
    return query select link_row.id, link_row.execution_plan_id, link_row.survey_revision_id, revision_row.version;
    return;
  end if;

  insert into public.field_survey_execution_plan_links(
    organization_id, survey_id, survey_revision_id, execution_plan_id, created_by, request_key
  ) values (
    p_organization_id, p_survey_id, p_survey_revision_id, p_execution_plan_id, actor_id, p_request_key
  ) on conflict on constraint survey_execution_links_source_plan_uq do nothing;
  select * into link_row from public.field_survey_execution_plan_links l
    where l.survey_revision_id = p_survey_revision_id and l.execution_plan_id = p_execution_plan_id;
  return query select link_row.id, link_row.execution_plan_id, link_row.survey_revision_id, revision_row.version;
end $$;

revoke all on function public.link_field_survey_execution_plan(uuid, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.link_field_survey_execution_plan(uuid, uuid, uuid, uuid, uuid) to authenticated;

create function public.create_execution_plan_from_survey(
  p_organization_id uuid,
  p_survey_id uuid,
  p_survey_revision_id uuid,
  p_title text,
  p_request_key uuid
) returns table(plan_id uuid, link_id uuid, survey_revision_id uuid, survey_version integer)
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  survey_row public.field_surveys%rowtype;
  revision_row public.field_survey_revisions%rowtype;
  existing_link public.field_survey_execution_plan_links%rowtype;
  existing_plan public.execution_plans%rowtype;
  created_plan_id uuid;
  link_row record;
begin
  if actor_id is null or p_request_key is null or not private.is_org_member(p_organization_id) then
    raise exception 'organization access denied' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_organization_id::text || ':' || actor_id::text || ':' || p_request_key::text, 0));
  select * into existing_link from public.field_survey_execution_plan_links l
    where l.organization_id = p_organization_id and l.created_by = actor_id and l.request_key = p_request_key;
  if found then
    select * into existing_plan from public.execution_plans p
      where p.id = existing_link.execution_plan_id and p.organization_id = p_organization_id;
    select * into revision_row from public.field_survey_revisions r where r.id = existing_link.survey_revision_id;
    if existing_link.survey_id is distinct from p_survey_id
       or existing_link.survey_revision_id is distinct from p_survey_revision_id
       or existing_plan.title is distinct from btrim(p_title) then
      raise exception 'survey-plan request key reused with different content' using errcode = '22023';
    end if;
    return query select existing_plan.id, existing_link.id, existing_link.survey_revision_id, revision_row.version;
    return;
  end if;
  select * into survey_row from public.field_surveys s
    where s.id = p_survey_id and s.organization_id = p_organization_id for update;
  if not found or not private.can_access_field_survey(survey_row.id, survey_row.organization_id) then
    raise exception 'survey access denied' using errcode = '42501';
  end if;
  select * into revision_row from public.field_survey_revisions r
    where r.id = p_survey_revision_id and r.survey_id = survey_row.id and r.organization_id = survey_row.organization_id;
  if not found then raise exception 'exact survey revision required' using errcode = '42501'; end if;
  if survey_row.version <> revision_row.version then
    raise exception 'survey changed since the selected revision' using errcode = '40001';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 200 or p_request_key is null then
    raise exception 'invalid execution plan payload' using errcode = '22023';
  end if;

  select created.plan_id into created_plan_id from public.create_execution_plan(
    p_organization_id, survey_row.project_id, p_title, null, null, null, p_request_key
  );
  select * into link_row from public.link_field_survey_execution_plan(
    p_organization_id, p_survey_id, p_survey_revision_id, created_plan_id, p_request_key
  );
  return query select created_plan_id, link_row.link_id, link_row.survey_revision_id, link_row.survey_version;
end $$;

revoke all on function public.create_execution_plan_from_survey(uuid, uuid, uuid, text, uuid) from public, anon;
grant execute on function public.create_execution_plan_from_survey(uuid, uuid, uuid, text, uuid) to authenticated;

-- A standalone execution plan also owns its private photos. Legacy project paths
-- remain valid, while new projectless plans use organization/plan/request paths.
alter table public.execution_photos alter column project_id drop not null;

create or replace function private.validate_execution_photo_links()
returns trigger language plpgsql set search_path = public, private as $$
declare plan_project uuid; task_plan uuid; journal_plan uuid;
begin
  if new.project_id is null then
    if new.object_key !~* '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$' then
      raise exception 'invalid execution photo object key';
    end if;
  elsif new.object_key !~* '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$' then
    raise exception 'invalid execution photo object key';
  end if;
  if new.object_key like '%..%' or new.object_key like '%\%' then raise exception 'invalid execution photo object key'; end if;
  if private.storage_object_org_id(new.object_key) <> new.organization_id then raise exception 'photo object organization mismatch'; end if;
  select project_id into plan_project from public.execution_plans where id = new.plan_id and organization_id = new.organization_id;
  if not found or plan_project is distinct from new.project_id then raise exception 'photo project must match execution plan'; end if;
  if new.task_id is not null then
    select plan_id into task_plan from public.execution_tasks where id = new.task_id and organization_id = new.organization_id;
    if task_plan is null or task_plan <> new.plan_id then raise exception 'photo task must belong to execution plan'; end if;
  end if;
  if new.journal_entry_id is not null then
    select plan_id into journal_plan from public.execution_journal_entries where id = new.journal_entry_id and organization_id = new.organization_id;
    if journal_plan is null or journal_plan <> new.plan_id then raise exception 'photo journal entry must belong to execution plan'; end if;
  end if;
  if tg_op = 'UPDATE' and (
    new.organization_id is distinct from old.organization_id or new.project_id is distinct from old.project_id
    or new.plan_id is distinct from old.plan_id or new.object_key is distinct from old.object_key
    or new.uploaded_by is distinct from old.uploaded_by or new.uploaded_at is distinct from old.uploaded_at
  ) then raise exception 'execution photo identity is immutable'; end if;
  return new;
end $$;

create or replace function public.create_execution_photo(
  p_organization_id uuid, p_project_id uuid, p_plan_id uuid, p_task_id uuid,
  p_journal_entry_id uuid, p_object_key text, p_display_filename text,
  p_mime_type text, p_file_size bigint, p_caption text, p_request_key uuid
) returns table(photo_id uuid) language plpgsql security invoker set search_path = public, private as $$
declare row_id uuid; plan_project uuid;
begin
  if not private.is_org_member(p_organization_id) then raise exception 'organization access denied' using errcode = '42501'; end if;
  if p_project_id is not null and not exists (select 1 from public.projects where id = p_project_id and organization_id = p_organization_id) then
    raise exception 'project access denied' using errcode = '42501';
  end if;
  select project_id into plan_project from public.execution_plans where id = p_plan_id and organization_id = p_organization_id;
  if not found or plan_project is distinct from p_project_id then raise exception 'execution plan access denied' using errcode = '42501'; end if;
  insert into public.execution_photos(organization_id, project_id, plan_id, task_id, journal_entry_id, object_key, display_filename, mime_type, file_size, caption, uploaded_by, request_key)
  values (p_organization_id, p_project_id, p_plan_id, p_task_id, p_journal_entry_id, p_object_key, p_display_filename, p_mime_type, p_file_size, nullif(btrim(p_caption), ''), auth.uid(), p_request_key)
  on conflict (organization_id, plan_id, request_key) do nothing;
  select id into row_id from public.execution_photos where organization_id = p_organization_id and plan_id = p_plan_id and request_key = p_request_key;
  return query select row_id;
end $$;
