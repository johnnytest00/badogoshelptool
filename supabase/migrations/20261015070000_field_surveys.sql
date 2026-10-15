-- F9.7.8.1: structured, organization-isolated field measurements.
create table public.field_surveys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid,
  created_by uuid not null references auth.users(id) on delete cascade,
  updated_by uuid not null references auth.users(id) on delete restrict,
  work_type text not null check (work_type in ('roof', 'gutter', 'flashing', 'other')),
  measurements jsonb not null,
  notes text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint field_surveys_project_same_organization_fk
    foreign key (project_id, organization_id) references public.projects(id, organization_id) on delete restrict,
  constraint field_surveys_id_organization_unique unique (id, organization_id),
  constraint field_surveys_version_positive check (version > 0),
  constraint field_surveys_notes_length check (notes is null or char_length(notes) <= 2000)
);

create index field_surveys_creator_updated_idx on public.field_surveys (organization_id, created_by, updated_at desc) where project_id is null;
create index field_surveys_project_updated_idx on public.field_surveys (organization_id, project_id, updated_at desc) where project_id is not null;

create trigger field_surveys_set_updated_at before update on public.field_surveys
for each row execute function private.set_updated_at();

create or replace function private.valid_field_survey_measurements(value jsonb)
returns boolean
language plpgsql immutable
set search_path = ''
as $$
declare
  item jsonb;
  seen_ids text[] := array[]::text[];
  item_id text;
  item_value numeric;
  item_unit text;
begin
  if value is null or jsonb_typeof(value) <> 'array' or jsonb_array_length(value) < 1 or jsonb_array_length(value) > 100 then return false; end if;
  for item in select jsonb_array_elements(value) loop
    if jsonb_typeof(item) <> 'object'
      or not (item ?& array['id', 'label', 'value', 'unit'])
      or (item - array['id', 'label', 'value', 'unit']) <> '{}'::jsonb
      or jsonb_typeof(item->'id') <> 'string'
      or jsonb_typeof(item->'label') <> 'string'
      or jsonb_typeof(item->'value') <> 'number'
      or jsonb_typeof(item->'unit') <> 'string' then return false; end if;
    item_id := item->>'id';
    if item_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or item_id = any(seen_ids) then return false; end if;
    seen_ids := array_append(seen_ids, item_id);
    if char_length(btrim(item->>'label')) not between 1 and 120 then return false; end if;
    item_value := (item->>'value')::numeric;
    item_unit := item->>'unit';
    if item_value < 0 or item_value > 1000000000 or item_unit not in ('mm', 'm', 'm2', 'degree', 'count') then return false; end if;
    if item_unit = 'count' and item_value <> trunc(item_value) then return false; end if;
    if item_unit = 'degree' and item_value > 360 then return false; end if;
  end loop;
  return true;
exception when others then
  return false;
end;
$$;

revoke all on function private.valid_field_survey_measurements(jsonb) from public, anon, authenticated;

alter table public.field_surveys enable row level security;
revoke all on public.field_surveys from public, anon, authenticated;
grant select on public.field_surveys to authenticated;

create policy field_surveys_select_authorized on public.field_surveys
for select to authenticated using (
  (select private.is_org_member(organization_id))
  and (
    (project_id is null and created_by = (select auth.uid()))
    or (project_id is not null and exists (
      select 1 from public.projects p
      where p.id = field_surveys.project_id and p.organization_id = field_surveys.organization_id
    ))
  )
);

create or replace function public.save_field_survey(
  p_survey_id uuid,
  p_organization_id uuid,
  p_project_id uuid,
  p_work_type text,
  p_measurements jsonb,
  p_notes text,
  p_expected_version integer
)
returns table (survey_id uuid, version integer, updated_at timestamptz)
language plpgsql security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  existing public.field_surveys%rowtype;
begin
  if actor_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not private.is_org_member(p_organization_id) then raise exception 'Organization access denied' using errcode = '42501'; end if;
  if p_work_type is null or p_work_type not in ('roof', 'gutter', 'flashing', 'other')
    or not private.valid_field_survey_measurements(p_measurements)
    or (p_notes is not null and char_length(p_notes) > 2000)
    or p_expected_version is null or p_expected_version < 0 then
    raise exception 'Invalid field survey payload' using errcode = '22023';
  end if;
  if p_project_id is not null and not exists (
    select 1 from public.projects p where p.id = p_project_id and p.organization_id = p_organization_id
  ) then raise exception 'Project access denied' using errcode = '42501'; end if;

  if p_survey_id is null then
    if p_expected_version <> 0 then raise exception 'Invalid initial survey version' using errcode = '22023'; end if;
    insert into public.field_surveys (organization_id, project_id, created_by, updated_by, work_type, measurements, notes, version)
    values (p_organization_id, p_project_id, actor_id, actor_id, p_work_type, p_measurements, nullif(btrim(p_notes), ''), 1)
    returning id, field_surveys.version, field_surveys.updated_at into survey_id, version, updated_at;
    return next;
    return;
  end if;

  select * into existing from public.field_surveys s where s.id = p_survey_id for update;
  if not found or existing.organization_id <> p_organization_id then raise exception 'Survey not found' using errcode = 'P0002'; end if;
  if existing.project_id is null and existing.created_by <> actor_id then raise exception 'Survey access denied' using errcode = '42501'; end if;
  if existing.project_id is not null and not private.is_org_member(existing.organization_id) then raise exception 'Survey access denied' using errcode = '42501'; end if;
  if existing.project_id is distinct from p_project_id then raise exception 'Project link is immutable' using errcode = '22023'; end if;
  if existing.version <> p_expected_version then raise exception 'Survey changed since it was opened' using errcode = '40001'; end if;

  update public.field_surveys s set work_type = p_work_type, measurements = p_measurements,
    notes = nullif(btrim(p_notes), ''), updated_by = actor_id, version = existing.version + 1
  where s.id = p_survey_id
  returning s.id, s.version, s.updated_at into survey_id, version, updated_at;
  return next;
end;
$$;

revoke all on function public.save_field_survey(uuid, uuid, uuid, text, jsonb, text, integer) from public, anon;
grant execute on function public.save_field_survey(uuid, uuid, uuid, text, jsonb, text, integer) to authenticated;

comment on table public.field_surveys is 'Structured on-site measurements. Values retain explicit user-selected units and are not verified calculator inputs.';
comment on column public.field_surveys.measurements is 'JSON array of {id,label,value,unit}; schema and unit semantics validated by application and save RPC.';
comment on function public.save_field_survey(uuid, uuid, uuid, text, jsonb, text, integer) is 'Authenticated create/update with organization/project authorization, strict measurement validation and optimistic version conflict handling.';
