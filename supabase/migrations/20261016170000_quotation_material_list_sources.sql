-- F9.19: immutable provenance from a standalone quotation revision to an exact material list revision.
create table public.quotation_material_list_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  quotation_id uuid not null,
  quotation_revision_id uuid not null,
  material_list_id uuid not null,
  material_revision_id uuid not null,
  source_line_map jsonb not null check (jsonb_typeof(source_line_map) = 'array' and jsonb_array_length(source_line_map) between 1 and 200),
  request_key uuid not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint quotation_material_list_sources_quote_fk
    foreign key (quotation_id, organization_id) references public.quotations(id, organization_id) on delete restrict,
  constraint quotation_material_list_sources_quote_revision_fk
    foreign key (quotation_revision_id, organization_id) references public.quotation_revisions(id, organization_id) on delete restrict,
  constraint quotation_material_list_sources_list_fk
    foreign key (material_list_id, organization_id) references public.material_preparation_lists(id, organization_id) on delete restrict,
  constraint quotation_material_list_sources_material_revision_fk
    foreign key (material_revision_id, material_list_id, organization_id)
    references public.material_preparation_revisions(id, list_id, organization_id) on delete restrict,
  constraint quotation_material_list_sources_request_uq unique (organization_id, created_by, request_key),
  constraint quotation_material_list_sources_revision_uq unique (quotation_revision_id, material_revision_id)
);

create or replace function private.prevent_quotation_material_list_source_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'quotation material source references are immutable' using errcode = '55000'; end; $$;
create trigger quotation_material_list_sources_immutable
  before update or delete on public.quotation_material_list_sources
  for each row execute function private.prevent_quotation_material_list_source_mutation();

alter table public.quotation_material_list_sources enable row level security;
create policy quotation_material_list_sources_scoped_read on public.quotation_material_list_sources
  for select to authenticated using (
    private.is_org_member(organization_id) and exists (
      select 1 from public.quotations q where q.id = quotation_id
        and q.organization_id = quotation_material_list_sources.organization_id
        and q.ownership_scope = 'standalone' and q.created_by = (select auth.uid())
    ) and exists (
      select 1 from public.material_preparation_lists l where l.id = material_list_id
        and l.organization_id = quotation_material_list_sources.organization_id
        and (l.execution_plan_id is not null or l.created_by = (select auth.uid()))
    )
  );
revoke all on public.quotation_material_list_sources from public, anon, authenticated;
grant select on public.quotation_material_list_sources to authenticated;

create or replace function public.save_standalone_quotation_from_material_list(
  p_organization_id uuid,
  p_operation_id uuid,
  p_quotation_id uuid,
  p_name text,
  p_client_id uuid,
  p_lines jsonb,
  p_expected_version integer,
  p_document jsonb,
  p_material_list_id uuid,
  p_material_revision_id uuid,
  p_source_line_map jsonb
) returns table (quotation_id uuid, revision_id uuid, revision_number integer, revision_created boolean, totals_snapshot jsonb)
language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare
  v_actor uuid := auth.uid();
  v_material_revision public.material_preparation_revisions%rowtype;
  v_line jsonb;
  v_mapping jsonb;
  v_item_id uuid;
  v_line_index integer;
  v_distinct_ids integer;
  v_item_count integer;
  v_saved record;
  v_existing public.quotation_material_list_sources%rowtype;
begin
  if v_actor is null or not private.is_org_member(p_organization_id) then
    raise exception 'quotation material source access denied' using errcode = '42501';
  end if;
  if p_material_list_id is null or p_material_revision_id is null or p_source_line_map is null
    or jsonb_typeof(p_source_line_map) <> 'array'
    or jsonb_array_length(p_source_line_map) not between 1 and 200 then
    raise exception 'invalid material list quotation source' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.material_preparation_lists l
    where l.id = p_material_list_id and l.organization_id = p_organization_id and l.project_id is null
      and (l.execution_plan_id is not null or l.created_by = v_actor)
  ) then raise exception 'material list access denied' using errcode = '42501'; end if;
  select r.* into v_material_revision from public.material_preparation_revisions r
    where r.id = p_material_revision_id and r.list_id = p_material_list_id and r.organization_id = p_organization_id;
  if not found then raise exception 'material list revision is unavailable' using errcode = '42501'; end if;

  select count(*) into v_distinct_ids from (
    select distinct (value->>'materialItemId')::uuid as item_id
    from pg_catalog.jsonb_array_elements(p_source_line_map)
  ) distinct_items;
  if v_distinct_ids <> jsonb_array_length(p_source_line_map) then
    raise exception 'duplicate material source item' using errcode = '22023';
  end if;
  for v_mapping in select value from pg_catalog.jsonb_array_elements(p_source_line_map) loop
    begin
      v_item_id := (v_mapping->>'materialItemId')::uuid;
      v_line_index := (v_mapping->>'quotationLineIndex')::integer;
    exception when others then raise exception 'invalid material source line mapping' using errcode = '22023'; end;
    if v_line_index < 0 or v_line_index >= jsonb_array_length(p_lines)
      or p_lines->v_line_index->>'sourceMaterialItemId' is distinct from v_item_id::text then
      raise exception 'quotation line does not preserve its source identity' using errcode = '22023';
    end if;
    select count(*) into v_item_count from pg_catalog.jsonb_array_elements(v_material_revision.items_snapshot) item
      where item.value->>'id' = v_item_id::text;
    if v_item_count <> 1 then raise exception 'material source item is not in the selected revision' using errcode = '42501'; end if;
  end loop;

  for v_saved in select * from public.save_standalone_quotation_draft_with_document(
    p_organization_id, p_operation_id, p_quotation_id, p_name, p_client_id,
    p_lines, p_expected_version, p_document
  ) loop
    select * into v_existing from public.quotation_material_list_sources s
      where s.organization_id = p_organization_id and s.created_by = v_actor and s.request_key = p_operation_id;
    if found then
      if v_existing.quotation_id is distinct from v_saved.quotation_id
        or v_existing.quotation_revision_id is distinct from v_saved.revision_id
        or v_existing.material_list_id is distinct from p_material_list_id
        or v_existing.material_revision_id is distinct from p_material_revision_id
        or v_existing.source_line_map is distinct from p_source_line_map then
        raise exception 'quotation operation key reused with different material source' using errcode = '40001';
      end if;
    else
      insert into public.quotation_material_list_sources(
        organization_id, quotation_id, quotation_revision_id, material_list_id,
        material_revision_id, source_line_map, request_key, created_by
      ) values (
        p_organization_id, v_saved.quotation_id, v_saved.revision_id, p_material_list_id,
        p_material_revision_id, p_source_line_map, p_operation_id, v_actor
      );
    end if;
    return query select v_saved.quotation_id, v_saved.revision_id, v_saved.revision_number,
      v_saved.revision_created, v_saved.totals_snapshot;
  end loop;
end; $$;

revoke all on function public.save_standalone_quotation_from_material_list(uuid, uuid, uuid, text, uuid, jsonb, integer, jsonb, uuid, uuid, jsonb) from public, anon;
grant execute on function public.save_standalone_quotation_from_material_list(uuid, uuid, uuid, text, uuid, jsonb, integer, jsonb, uuid, uuid, jsonb) to authenticated;

create or replace function public.get_standalone_quotation_material_source(
  p_organization_id uuid, p_quotation_id uuid, p_quotation_revision_id uuid
) returns table (
  material_list_id uuid, material_revision_id uuid, list_name text,
  revision_number integer, current_revision_id uuid, current_version integer,
  execution_plan_id uuid, source_line_map jsonb
) language sql stable security invoker set search_path = public, private as $$
  select s.material_list_id, s.material_revision_id, l.name, r.revision_number,
    l.current_revision_id, l.version, l.execution_plan_id, s.source_line_map
  from public.quotation_material_list_sources s
  join public.quotations q on q.id = s.quotation_id and q.organization_id = s.organization_id
  join public.material_preparation_lists l on l.id = s.material_list_id and l.organization_id = s.organization_id
  join public.material_preparation_revisions r on r.id = s.material_revision_id and r.list_id = l.id and r.organization_id = l.organization_id
  where s.organization_id = p_organization_id and s.quotation_id = p_quotation_id
    and s.quotation_revision_id = p_quotation_revision_id
    and q.ownership_scope = 'standalone' and q.created_by = auth.uid()
    and private.is_org_member(p_organization_id)
$$;
revoke all on function public.get_standalone_quotation_material_source(uuid, uuid, uuid) from public, anon;
grant execute on function public.get_standalone_quotation_material_source(uuid, uuid, uuid) to authenticated;
