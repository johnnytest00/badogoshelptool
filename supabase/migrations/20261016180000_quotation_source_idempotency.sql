-- Keep one exact material-list source relation per immutable quotation revision.
-- Repeated saves of an unchanged quotation can reuse that relation safely.
create unique index quotation_material_list_sources_one_per_quote_revision_uq
  on public.quotation_material_list_sources (quotation_revision_id);

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
      select * into v_existing from public.quotation_material_list_sources s
        where s.quotation_revision_id = v_saved.revision_id for update;
      if found then
        if v_existing.quotation_id is distinct from v_saved.quotation_id
          or v_existing.material_list_id is distinct from p_material_list_id
          or v_existing.material_revision_id is distinct from p_material_revision_id
          or v_existing.source_line_map is distinct from p_source_line_map then
          raise exception 'quotation revision already has a different material source' using errcode = '40001';
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
    end if;
    return query select v_saved.quotation_id, v_saved.revision_id, v_saved.revision_number,
      v_saved.revision_created, v_saved.totals_snapshot;
  end loop;
end; $$;

revoke all on function public.save_standalone_quotation_from_material_list(uuid, uuid, uuid, text, uuid, jsonb, integer, jsonb, uuid, uuid, jsonb) from public, anon;
grant execute on function public.save_standalone_quotation_from_material_list(uuid, uuid, uuid, text, uuid, jsonb, integer, jsonb, uuid, uuid, jsonb) to authenticated;
