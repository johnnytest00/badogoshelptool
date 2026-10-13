insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('execution-photos', 'execution-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.storage_object_org_id(p_name text)
returns uuid language plpgsql immutable set search_path = public, private as $$
begin
  if p_name is null or p_name !~ '^[0-9a-fA-F-]{36}/' then return null; end if;
  return split_part(p_name, '/', 1)::uuid;
exception when others then
  return null;
end $$;

create table public.execution_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  project_id uuid not null,
  plan_id uuid not null,
  task_id uuid,
  journal_entry_id uuid,
  object_key text not null unique,
  display_filename text not null check (char_length(btrim(display_filename)) between 1 and 255),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size bigint not null check (file_size between 1 and 10485760),
  caption text check (caption is null or char_length(caption) <= 1000),
  uploaded_by uuid not null references auth.users(id),
  uploaded_at timestamptz not null default now(),
  request_key uuid not null default gen_random_uuid(),
  constraint execution_photos_project_org_fk foreign key (project_id, organization_id) references public.projects(id, organization_id),
  constraint execution_photos_plan_org_fk foreign key (plan_id, organization_id) references public.execution_plans(id, organization_id),
  constraint execution_photos_task_org_fk foreign key (task_id, organization_id) references public.execution_tasks(id, organization_id),
  constraint execution_photos_journal_org_fk foreign key (journal_entry_id, organization_id) references public.execution_journal_entries(id, organization_id),
  constraint execution_photos_request_key_uq unique (organization_id, plan_id, request_key)
);

create index execution_photos_plan_uploaded_idx on public.execution_photos(organization_id, project_id, plan_id, uploaded_at desc, id desc);
create index execution_photos_task_idx on public.execution_photos(organization_id, task_id, uploaded_at desc);
create index execution_photos_journal_idx on public.execution_photos(organization_id, journal_entry_id, uploaded_at desc);

create or replace function private.validate_execution_photo_links()
returns trigger language plpgsql set search_path = public, private as $$
declare plan_project uuid; task_plan uuid; journal_plan uuid;
begin
  if new.object_key !~* '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
     or new.object_key like '%..%' or new.object_key like '%\\%' then
    raise exception 'invalid execution photo object key';
  end if;
  if private.storage_object_org_id(new.object_key) <> new.organization_id then raise exception 'photo object organization mismatch'; end if;
  select project_id into plan_project from public.execution_plans where id = new.plan_id and organization_id = new.organization_id;
  if plan_project is null or plan_project <> new.project_id then raise exception 'photo project must match execution plan'; end if;
  if new.task_id is not null then
    select plan_id into task_plan from public.execution_tasks where id = new.task_id and organization_id = new.organization_id;
    if task_plan is null or task_plan <> new.plan_id then raise exception 'photo task must belong to execution plan'; end if;
  end if;
  if new.journal_entry_id is not null then
    select plan_id into journal_plan from public.execution_journal_entries where id = new.journal_entry_id and organization_id = new.organization_id;
    if journal_plan is null or journal_plan <> new.plan_id then raise exception 'photo journal entry must belong to execution plan'; end if;
  end if;
  if tg_op = 'UPDATE' and (new.organization_id is distinct from old.organization_id or new.project_id is distinct from old.project_id or new.plan_id is distinct from old.plan_id or new.object_key is distinct from old.object_key or new.uploaded_by is distinct from old.uploaded_by or new.uploaded_at is distinct from old.uploaded_at) then
    raise exception 'execution photo identity is immutable';
  end if;
  return new;
end $$;

create trigger execution_photos_validate_links before insert or update on public.execution_photos
for each row execute function private.validate_execution_photo_links();

alter table public.execution_photos enable row level security;
create policy execution_photos_member_select on public.execution_photos for select to authenticated using (private.is_org_member(organization_id));
create policy execution_photos_member_insert on public.execution_photos for insert to authenticated with check (private.is_org_member(organization_id) and uploaded_by = auth.uid());
grant select, insert on public.execution_photos to authenticated;

create or replace function public.create_execution_photo(
  p_organization_id uuid, p_project_id uuid, p_plan_id uuid, p_task_id uuid,
  p_journal_entry_id uuid, p_object_key text, p_display_filename text,
  p_mime_type text, p_file_size bigint, p_caption text, p_request_key uuid
) returns table(photo_id uuid) language plpgsql security invoker set search_path = public, private as $$
declare row_id uuid;
begin
  if not private.is_org_member(p_organization_id) then raise exception 'organization access denied'; end if;
  if not exists (select 1 from public.projects where id = p_project_id and organization_id = p_organization_id) then raise exception 'project access denied'; end if;
  insert into public.execution_photos(organization_id, project_id, plan_id, task_id, journal_entry_id, object_key, display_filename, mime_type, file_size, caption, uploaded_by, request_key)
  values (p_organization_id, p_project_id, p_plan_id, p_task_id, p_journal_entry_id, p_object_key, p_display_filename, p_mime_type, p_file_size, nullif(btrim(p_caption), ''), auth.uid(), p_request_key)
  on conflict (organization_id, plan_id, request_key) do nothing;
  select id into row_id from public.execution_photos where organization_id = p_organization_id and plan_id = p_plan_id and request_key = p_request_key;
  return query select row_id;
end $$;
grant execute on function public.create_execution_photo(uuid, uuid, uuid, uuid, uuid, text, text, text, bigint, text, uuid) to authenticated;

create policy execution_photos_storage_insert on storage.objects for insert to authenticated
with check (bucket_id = 'execution-photos' and private.is_org_member(private.storage_object_org_id(name)));
create policy execution_photos_storage_select on storage.objects for select to authenticated
using (bucket_id = 'execution-photos' and exists (select 1 from public.execution_photos p where p.object_key = storage.objects.name and private.is_org_member(p.organization_id)));
