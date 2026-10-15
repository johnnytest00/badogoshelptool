-- F9.7.8.2: immutable survey snapshots, private photos and semantic calculator handoff.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('field-survey-photos', 'field-survey-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create table public.field_survey_photos (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  survey_id uuid not null,
  object_key text not null unique,
  display_filename text not null check (char_length(btrim(display_filename)) between 1 and 255),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size bigint not null check (file_size between 1 and 10485760),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  description text check (description is null or char_length(description) <= 1000),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  request_key uuid not null,
  upload_state text not null default 'pending' check (upload_state in ('pending', 'active')),
  uploaded_at timestamptz not null default now(),
  removed_at timestamptz,
  constraint field_survey_photos_survey_org_fk foreign key (survey_id, organization_id)
    references public.field_surveys(id, organization_id) on delete cascade,
  constraint field_survey_photos_request_uq unique (survey_id, request_key)
);
create index field_survey_photos_survey_current_idx on public.field_survey_photos(survey_id, uploaded_at desc) where removed_at is null;

create table public.field_survey_revisions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null,
  organization_id uuid not null,
  project_id uuid,
  version integer not null check (version > 0),
  work_type text not null check (work_type in ('roof', 'gutter', 'flashing', 'other')),
  measurements jsonb not null,
  notes text,
  photos_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(photos_snapshot) = 'array'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint field_survey_revisions_version_uq unique (survey_id, version),
  constraint field_survey_revisions_survey_org_fk foreign key (survey_id, organization_id)
    references public.field_surveys(id, organization_id) on delete cascade,
  constraint field_survey_revisions_project_org_fk foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete restrict
);
create index field_survey_revisions_lookup_idx on public.field_survey_revisions(organization_id, survey_id, version desc);

create or replace function private.can_access_field_survey(p_survey_id uuid, p_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_org_member(p_organization_id) and exists (
    select 1 from public.field_surveys s
    where s.id = p_survey_id and s.organization_id = p_organization_id
      and (s.project_id is not null or s.created_by = auth.uid())
  );
$$;
revoke all on function private.can_access_field_survey(uuid, uuid) from public, anon;
grant execute on function private.can_access_field_survey(uuid, uuid) to authenticated;

alter table public.field_survey_photos enable row level security;
revoke all on public.field_survey_photos from public, anon, authenticated;
grant select on public.field_survey_photos to authenticated;
create policy field_survey_photos_select on public.field_survey_photos for select to authenticated
using (private.can_access_field_survey(survey_id, organization_id) and (upload_state='active' or uploaded_by=auth.uid()));

alter table public.field_survey_revisions enable row level security;
revoke all on public.field_survey_revisions from public, anon, authenticated;
grant select on public.field_survey_revisions to authenticated;
create policy field_survey_revisions_select on public.field_survey_revisions for select to authenticated
using (private.can_access_field_survey(survey_id, organization_id));

create or replace function private.block_field_survey_revision_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'field survey revisions are immutable' using errcode = '55000';
end;
$$;
create trigger field_survey_revisions_immutable before update or delete on public.field_survey_revisions
for each row execute function private.block_field_survey_revision_mutation();

create or replace function private.record_field_survey_revision(p_survey_id uuid, p_actor_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare survey_row public.field_surveys%rowtype; revision_id uuid; photo_snapshot jsonb;
begin
  select * into survey_row from public.field_surveys where id = p_survey_id;
  if not found then raise exception 'Survey not found' using errcode = 'P0002'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'objectKey', p.object_key, 'displayFilename', p.display_filename,
    'mimeType', p.mime_type, 'fileSize', p.file_size, 'description', p.description,
    'uploadedAt', p.uploaded_at
  ) order by p.uploaded_at, p.id), '[]'::jsonb)
  into photo_snapshot from public.field_survey_photos p
  where p.survey_id = p_survey_id and p.upload_state='active' and p.removed_at is null;
  insert into public.field_survey_revisions(survey_id, organization_id, project_id, version, work_type, measurements, notes, photos_snapshot, created_by)
  values (survey_row.id, survey_row.organization_id, survey_row.project_id, survey_row.version,
    survey_row.work_type, survey_row.measurements, survey_row.notes, photo_snapshot, p_actor_id)
  returning id into revision_id;
  return revision_id;
end;
$$;
revoke all on function private.record_field_survey_revision(uuid, uuid) from public, anon, authenticated;

-- Existing surveys can only be backfilled at their current state; earlier edits predate snapshot storage.
insert into public.field_survey_revisions(survey_id, organization_id, project_id, version, work_type, measurements, notes, created_by)
select id, organization_id, project_id, version, work_type, measurements, notes, updated_by
from public.field_surveys
on conflict (survey_id, version) do nothing;

create or replace function private.valid_field_survey_measurements(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb; seen_ids text[] := array[]::text[]; item_id text; item_value numeric; item_unit text; semantic_type text;
begin
  if value is null or jsonb_typeof(value) <> 'array' or jsonb_array_length(value) < 1 or jsonb_array_length(value) > 100 then return false; end if;
  for item in select jsonb_array_elements(value) loop
    if jsonb_typeof(item) <> 'object' or not (item ?& array['id', 'label', 'value', 'unit'])
      or (item - array['id', 'label', 'value', 'unit', 'semanticType']) <> '{}'::jsonb
      or jsonb_typeof(item->'id') <> 'string' or jsonb_typeof(item->'label') <> 'string'
      or jsonb_typeof(item->'value') <> 'number' or jsonb_typeof(item->'unit') <> 'string'
      or (item ? 'semanticType' and jsonb_typeof(item->'semanticType') <> 'string') then return false; end if;
    item_id := item->>'id';
    if item_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or item_id = any(seen_ids) then return false; end if;
    seen_ids := array_append(seen_ids, item_id);
    if char_length(btrim(item->>'label')) not between 1 and 120 then return false; end if;
    item_value := (item->>'value')::numeric; item_unit := item->>'unit'; semantic_type := coalesce(item->>'semanticType', 'custom');
    if item_value < 0 or item_value > 1000000000 or item_unit not in ('mm', 'm', 'm2', 'degree', 'count') then return false; end if;
    if item_unit = 'count' and item_value <> trunc(item_value) then return false; end if;
    if item_unit = 'degree' and item_value > 360 then return false; end if;
    if semantic_type not in ('custom','roof_building_length','roof_building_width','roof_rise','roof_pitch','roof_eave_overhang','roof_front_gable_overhang','roof_rear_gable_overhang','gutter_run_length','gutter_stock_length','gutter_bracket_spacing','flashing_run_length','flashing_section_length','flashing_overlap') then return false; end if;
    if semantic_type = 'roof_pitch' and item_unit <> 'degree' then return false; end if;
    if semantic_type in ('roof_building_length','roof_building_width','roof_rise','roof_eave_overhang','roof_front_gable_overhang','roof_rear_gable_overhang','gutter_run_length','gutter_stock_length','gutter_bracket_spacing','flashing_run_length','flashing_section_length','flashing_overlap') and item_unit not in ('mm','m') then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;
revoke all on function private.valid_field_survey_measurements(jsonb) from public, anon, authenticated;

create or replace function public.save_field_survey(
  p_survey_id uuid, p_organization_id uuid, p_project_id uuid, p_work_type text,
  p_measurements jsonb, p_notes text, p_expected_version integer
)
returns table (survey_id uuid, version integer, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); existing public.field_surveys%rowtype;
begin
  if actor_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not private.is_org_member(p_organization_id) then raise exception 'Organization access denied' using errcode = '42501'; end if;
  if p_work_type is null or p_work_type not in ('roof','gutter','flashing','other') or not private.valid_field_survey_measurements(p_measurements)
    or (p_notes is not null and char_length(p_notes) > 2000) or p_expected_version is null or p_expected_version < 0 then
    raise exception 'Invalid field survey payload' using errcode = '22023';
  end if;
  if p_project_id is not null and not exists (select 1 from public.projects p where p.id=p_project_id and p.organization_id=p_organization_id) then
    raise exception 'Project access denied' using errcode = '42501';
  end if;
  if p_survey_id is null then
    if p_expected_version <> 0 then raise exception 'Invalid initial survey version' using errcode = '22023'; end if;
    insert into public.field_surveys(organization_id,project_id,created_by,updated_by,work_type,measurements,notes,version)
    values(p_organization_id,p_project_id,actor_id,actor_id,p_work_type,p_measurements,nullif(btrim(p_notes),''),1)
    returning id,field_surveys.version,field_surveys.updated_at into survey_id,version,updated_at;
    perform private.record_field_survey_revision(survey_id,actor_id);
    return next; return;
  end if;
  select * into existing from public.field_surveys s where s.id=p_survey_id for update;
  if not found or existing.organization_id<>p_organization_id then raise exception 'Survey not found' using errcode = 'P0002'; end if;
  if existing.project_id is null and existing.created_by<>actor_id then raise exception 'Survey access denied' using errcode = '42501'; end if;
  if existing.project_id is not null and not private.is_org_member(existing.organization_id) then raise exception 'Survey access denied' using errcode = '42501'; end if;
  if existing.project_id is distinct from p_project_id then raise exception 'Project link is immutable' using errcode = '22023'; end if;
  if existing.version<>p_expected_version then raise exception 'Survey changed since it was opened' using errcode = '40001'; end if;
  update public.field_surveys s set work_type=p_work_type,measurements=p_measurements,notes=nullif(btrim(p_notes),''),updated_by=actor_id,version=existing.version+1
  where s.id=p_survey_id returning s.id,s.version,s.updated_at into survey_id,version,updated_at;
  perform private.record_field_survey_revision(survey_id,actor_id);
  return next;
end;
$$;
revoke all on function public.save_field_survey(uuid,uuid,uuid,text,jsonb,text,integer) from public, anon;
grant execute on function public.save_field_survey(uuid,uuid,uuid,text,jsonb,text,integer) to authenticated;

create or replace function public.reserve_field_survey_photo_upload(
  p_survey_id uuid, p_organization_id uuid, p_photo_id uuid, p_object_key text,
  p_display_filename text, p_mime_type text, p_file_size bigint, p_content_sha256 text,
  p_description text, p_request_key uuid, p_expected_version integer, p_actor_id uuid
)
returns table(photo_id uuid, version integer, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare survey_row public.field_surveys%rowtype; existing_photo public.field_survey_photos%rowtype;
begin
  if p_actor_id is null then raise exception 'Survey access denied' using errcode='42501'; end if;
  perform 1 from public.organization_members where organization_id=p_organization_id and user_id=p_actor_id for share;
  if not found then raise exception 'Survey access denied' using errcode='42501'; end if;
  select * into survey_row from public.field_surveys s where s.id=p_survey_id and s.organization_id=p_organization_id for update;
  if not found or (survey_row.project_id is null and survey_row.created_by<>p_actor_id) then raise exception 'Survey access denied' using errcode='42501'; end if;
  select * into existing_photo from public.field_survey_photos p where p.survey_id=p_survey_id and p.request_key=p_request_key;
  if found then
    if existing_photo.id<>p_photo_id or existing_photo.object_key<>p_object_key or existing_photo.file_size<>p_file_size or existing_photo.mime_type<>p_mime_type or existing_photo.content_sha256<>p_content_sha256 or existing_photo.display_filename<>p_display_filename or existing_photo.description is distinct from nullif(btrim(p_description),'') then
      raise exception 'Photo retry payload mismatch' using errcode='22023';
    end if;
    return query select existing_photo.id,survey_row.version,true; return;
  end if;
  if survey_row.version<>p_expected_version then raise exception 'Survey changed since it was opened' using errcode='40001'; end if;
  if p_photo_id is distinct from p_request_key or p_object_key !~ ('^'||p_organization_id::text||'/'||p_survey_id::text||'/'||p_photo_id::text||'\.(jpg|png|webp)$')
    or p_mime_type not in ('image/jpeg','image/png','image/webp') or p_file_size not between 1 and 10485760
    or p_content_sha256 !~ '^[0-9a-f]{64}$' or char_length(btrim(p_display_filename)) not between 1 and 255 or (p_description is not null and char_length(p_description)>1000)
    or (p_mime_type='image/jpeg' and p_object_key not like '%.jpg') or (p_mime_type='image/png' and p_object_key not like '%.png') or (p_mime_type='image/webp' and p_object_key not like '%.webp') then
    raise exception 'Invalid photo metadata' using errcode='22023';
  end if;
  insert into public.field_survey_photos(id,organization_id,survey_id,object_key,display_filename,mime_type,file_size,content_sha256,description,uploaded_by,request_key)
  values(p_photo_id,p_organization_id,p_survey_id,p_object_key,p_display_filename,p_mime_type,p_file_size,p_content_sha256,nullif(btrim(p_description),''),p_actor_id,p_request_key);
  return query select p_photo_id,survey_row.version,false;
end;
$$;
revoke all on function public.reserve_field_survey_photo_upload(uuid,uuid,uuid,text,text,text,bigint,text,text,uuid,integer,uuid) from public, anon, authenticated;
grant execute on function public.reserve_field_survey_photo_upload(uuid,uuid,uuid,text,text,text,bigint,text,text,uuid,integer,uuid) to tetopro_covering_writer;

create or replace function public.attach_field_survey_photo(p_survey_id uuid,p_organization_id uuid,p_photo_id uuid,p_expected_version integer,p_actor_id uuid)
returns table(photo_id uuid,version integer)
language plpgsql security definer set search_path = '' as $$
declare survey_row public.field_surveys%rowtype; photo_row public.field_survey_photos%rowtype;
begin
  if p_actor_id is null then raise exception 'Survey access denied' using errcode='42501'; end if;
  perform 1 from public.organization_members where organization_id=p_organization_id and user_id=p_actor_id for share;
  if not found then raise exception 'Survey access denied' using errcode='42501'; end if;
  select * into survey_row from public.field_surveys where id=p_survey_id and organization_id=p_organization_id for update;
  if not found or (survey_row.project_id is null and survey_row.created_by<>p_actor_id) then raise exception 'Survey access denied' using errcode='42501'; end if;
  select * into photo_row from public.field_survey_photos where id=p_photo_id and survey_id=p_survey_id and organization_id=p_organization_id for update;
  if not found or photo_row.uploaded_by<>p_actor_id then raise exception 'Photo upload authorization denied' using errcode='42501'; end if;
  if photo_row.upload_state='active' then return query select photo_row.id,survey_row.version; return; end if;
  if survey_row.version<>p_expected_version then raise exception 'Survey changed since it was opened' using errcode='40001'; end if;
  update public.field_survey_photos set upload_state='active' where id=p_photo_id;
  update public.field_surveys set version=survey_row.version+1,updated_by=p_actor_id where id=p_survey_id;
  perform private.record_field_survey_revision(p_survey_id,p_actor_id);
  return query select p_photo_id,survey_row.version+1;
end;
$$;
revoke all on function public.attach_field_survey_photo(uuid,uuid,uuid,integer,uuid) from public, anon, authenticated;
grant execute on function public.attach_field_survey_photo(uuid,uuid,uuid,integer,uuid) to tetopro_covering_writer;

create or replace function public.cancel_field_survey_photo_upload(p_photo_id uuid,p_actor_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  delete from public.field_survey_photos where id=p_photo_id and uploaded_by=p_actor_id and upload_state='pending';
  return found;
end;
$$;
revoke all on function public.cancel_field_survey_photo_upload(uuid,uuid) from public, anon, authenticated;
grant execute on function public.cancel_field_survey_photo_upload(uuid,uuid) to tetopro_covering_writer;

create or replace function public.remove_field_survey_photo(p_survey_id uuid,p_photo_id uuid,p_expected_version integer,p_actor_id uuid)
returns table(version integer)
language plpgsql security definer set search_path = '' as $$
declare photo public.field_survey_photos%rowtype; survey_row public.field_surveys%rowtype;
begin
  if p_actor_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform 1 from public.organization_members where user_id=p_actor_id and organization_id=(select organization_id from public.field_survey_photos where id=p_photo_id) for share;
  if not found then raise exception 'Photo not found' using errcode='42501'; end if;
  select * into photo from public.field_survey_photos where id=p_photo_id and survey_id=p_survey_id;
  if not found then raise exception 'Photo not found' using errcode='42501'; end if;
  select * into survey_row from public.field_surveys where id=photo.survey_id for update;
  if survey_row.project_id is null and survey_row.created_by<>p_actor_id then raise exception 'Photo access denied' using errcode='42501'; end if;
  if photo.removed_at is not null then return query select survey_row.version; return; end if;
  if survey_row.version<>p_expected_version then raise exception 'Survey changed since it was opened' using errcode='40001'; end if;
  update public.field_survey_photos set removed_at=now() where id=p_photo_id;
  update public.field_surveys set version=survey_row.version+1,updated_by=p_actor_id where id=survey_row.id;
  perform private.record_field_survey_revision(survey_row.id,p_actor_id);
  return query select survey_row.version+1;
end;
$$;
revoke all on function public.remove_field_survey_photo(uuid,uuid,integer,uuid) from public, anon, authenticated;
grant execute on function public.remove_field_survey_photo(uuid,uuid,integer,uuid) to tetopro_covering_writer;

create policy field_survey_photos_storage_insert on storage.objects for insert to authenticated
with check (bucket_id='field-survey-photos'
  and name ~* '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  and exists (select 1 from public.field_survey_photos p where p.object_key=name and p.upload_state='pending'
    and p.uploaded_by=auth.uid() and p.file_size::text=storage.objects.metadata->>'size'
    and p.mime_type=storage.objects.metadata->>'mimetype' and private.can_access_field_survey(p.survey_id,p.organization_id)));
create policy field_survey_photos_storage_update on storage.objects for update to authenticated
using (bucket_id='field-survey-photos' and exists (select 1 from public.field_survey_photos p where p.object_key=name and p.upload_state='pending' and p.uploaded_by=auth.uid() and private.can_access_field_survey(p.survey_id,p.organization_id)))
with check (bucket_id='field-survey-photos' and exists (select 1 from public.field_survey_photos p where p.object_key=name and p.upload_state='pending' and p.uploaded_by=auth.uid() and p.file_size::text=storage.objects.metadata->>'size' and p.mime_type=storage.objects.metadata->>'mimetype' and private.can_access_field_survey(p.survey_id,p.organization_id)));
create policy field_survey_photos_storage_delete on storage.objects for delete to authenticated
using (bucket_id='field-survey-photos' and exists (select 1 from public.field_survey_photos p where p.object_key=name and p.upload_state='pending' and p.uploaded_by=auth.uid() and private.can_access_field_survey(p.survey_id,p.organization_id)));
create policy field_survey_photos_storage_select on storage.objects for select to authenticated
using (bucket_id='field-survey-photos' and exists (
  select 1 from public.field_survey_photos p where p.object_key=storage.objects.name
    and private.can_access_field_survey(p.survey_id,p.organization_id)
    and ((p.upload_state='pending' and p.uploaded_by=auth.uid()) or (p.upload_state='active' and (p.removed_at is null or exists (
      select 1 from public.field_survey_revisions r,jsonb_array_elements(r.photos_snapshot) item
      where r.survey_id=p.survey_id and item->>'id'=p.id::text
    ))))
));

comment on table public.field_survey_photos is 'Private survey photos; removal detaches from current revision while immutable historical snapshots retain their metadata and object reference.';
comment on table public.field_survey_revisions is 'Immutable point-in-time field survey input and photo associations.';
