-- M10.3: allow a standalone quotation revision to combine a material-list source and a calculation
-- source in the same save (previously each save could only use one). Additive only; it duplicates the
-- validation of save_standalone_quotation_from_material_list and save_standalone_quotation_from_calculation
-- against the same two existing, unchanged provenance tables, then wraps the shared draft save in one transaction.

create or replace function public.save_standalone_quotation_from_material_list_and_calculation(
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
  p_material_source_line_map jsonb,
  p_calculation_revision_id uuid,
  p_calculation_source_line_map jsonb
) returns table (quotation_id uuid, revision_id uuid, revision_number integer, revision_created boolean, totals_snapshot jsonb)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_material_revision public.material_preparation_revisions%rowtype;
  v_revision public.calculation_revisions%rowtype;
  v_calculation public.calculations%rowtype;
  v_mapping jsonb;
  v_item_id uuid;
  v_line_index integer;
  v_distinct_ids integer;
  v_item_count integer;
  v_key text;
  v_parts text[];
  v_quantity jsonb;
  v_part jsonb;
  v_row jsonb;
  v_normalized jsonb := '[]'::jsonb;
  v_saved record;
  v_existing_material public.quotation_material_list_sources%rowtype;
  v_existing_calc public.quotation_calculation_sources%rowtype;
begin
  if v_actor is null or not private.is_org_member(p_organization_id) then
    raise exception 'quotation combined source access denied' using errcode = '42501';
  end if;
  if p_material_list_id is null or p_material_revision_id is null or p_material_source_line_map is null
    or jsonb_typeof(p_material_source_line_map) <> 'array' or jsonb_array_length(p_material_source_line_map) not between 1 and 200
    or p_calculation_revision_id is null or p_calculation_source_line_map is null
    or jsonb_typeof(p_calculation_source_line_map) <> 'array' or jsonb_array_length(p_calculation_source_line_map) not between 1 and 200
    or jsonb_typeof(p_lines) <> 'array' then
    raise exception 'invalid combined quotation source payload' using errcode = '22023';
  end if;
  if (
    select count(*) from pg_catalog.jsonb_array_elements(p_material_source_line_map) m
    where (m.value->>'quotationLineIndex')::integer in (
      select (c.value->>'quotationLineIndex')::integer from pg_catalog.jsonb_array_elements(p_calculation_source_line_map) c
    )
  ) > 0 then
    raise exception 'a quotation line cannot have both a material list and a calculation source' using errcode = '22023';
  end if;

  -- Material-list source: same checks as save_standalone_quotation_from_material_list.
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
    from pg_catalog.jsonb_array_elements(p_material_source_line_map)
  ) distinct_items;
  if v_distinct_ids <> jsonb_array_length(p_material_source_line_map) then
    raise exception 'duplicate material source item' using errcode = '22023';
  end if;
  for v_mapping in select value from pg_catalog.jsonb_array_elements(p_material_source_line_map) loop
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

  -- Calculation source: same checks and snapshot normalization as save_standalone_quotation_from_calculation.
  select * into v_revision from public.calculation_revisions r
    where r.id = p_calculation_revision_id and r.organization_id = p_organization_id for share;
  if found then
    select * into v_calculation from public.calculations c
      where c.id = v_revision.calculation_id and c.organization_id = p_organization_id for share;
  end if;
  if v_revision.id is null or v_calculation.id is null or v_calculation.ownership_scope <> 'standalone'
    or v_calculation.created_by <> v_actor or v_calculation.calculator_type not like 'construction.%' then
    raise exception 'calculation access denied' using errcode = '42501';
  end if;
  if (select count(distinct value->>'quotationLineIndex') from pg_catalog.jsonb_array_elements(p_calculation_source_line_map)) <> jsonb_array_length(p_calculation_source_line_map) then
    raise exception 'a quotation line has more than one calculation source' using errcode = '22023';
  end if;
  for v_mapping in select value from pg_catalog.jsonb_array_elements(p_calculation_source_line_map) loop
    begin
      v_line_index := (v_mapping->>'quotationLineIndex')::integer;
      v_key := v_mapping->>'sourceKey';
    exception when others then raise exception 'invalid calculation source mapping' using errcode = '22023'; end;
    if v_line_index is null or v_key is null or v_line_index < 0 or v_line_index >= jsonb_array_length(p_lines)
      or p_lines->v_line_index->>'type' is distinct from 'MATERIAL' then
      raise exception 'calculation source must point at a material line' using errcode = '22023';
    end if;
    if v_key ~ '^takeoff/[0-9]{1,3}/[0-9]{1,3}$' then
      v_parts := pg_catalog.string_to_array(v_key, '/');
      v_part := v_revision.output_snapshot->'takeoff'->'parts'->(v_parts[2]::integer);
      v_quantity := v_part->'quantities'->(v_parts[3]::integer);
      if v_quantity is null or v_quantity->>'meaning' is distinct from 'LAYOUT' or jsonb_typeof(v_quantity->'value') <> 'number' then
        raise exception 'only layout quantities can become quotation quantities' using errcode = '22023';
      end if;
      v_normalized := v_normalized || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'quotationLineIndex', v_line_index, 'sourceKey', v_key,
        'label', (v_part->>'label') || ' · ' || (v_quantity->>'label'),
        'quantity', v_quantity->'value', 'unit', v_quantity->>'unit', 'meaning', 'LAYOUT'));
    elsif v_key ~ '^cut/(rafters|battens)/[0-9]{1,4}$' then
      v_parts := pg_catalog.string_to_array(v_key, '/');
      v_row := v_revision.output_snapshot->'cutList'->(v_parts[2])->(v_parts[3]::integer);
      if v_row is null or jsonb_typeof(v_row->'count') <> 'number' or jsonb_typeof(v_row->'lengthMm') <> 'number' then
        raise exception 'cut-list source row is not in the selected revision' using errcode = '22023';
      end if;
      v_normalized := v_normalized || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'quotationLineIndex', v_line_index, 'sourceKey', v_key,
        'label', case when v_parts[2] = 'rafters' then 'Szarufa' else 'Léc' end || ' · ' || (v_row->>'lengthMm') || ' mm',
        'quantity', v_row->'count', 'unit', 'db', 'meaning', 'CUT_LIST'));
    else
      raise exception 'unknown calculation source key' using errcode = '22023';
    end if;
  end loop;

  for v_saved in select * from public.save_standalone_quotation_draft_with_document(
    p_organization_id, p_operation_id, p_quotation_id, p_name, p_client_id,
    p_lines, p_expected_version, p_document
  ) loop
    select * into v_existing_material from public.quotation_material_list_sources s
      where s.organization_id = p_organization_id and s.created_by = v_actor and s.request_key = p_operation_id;
    if found then
      if v_existing_material.quotation_id is distinct from v_saved.quotation_id
        or v_existing_material.quotation_revision_id is distinct from v_saved.revision_id
        or v_existing_material.material_list_id is distinct from p_material_list_id
        or v_existing_material.material_revision_id is distinct from p_material_revision_id
        or v_existing_material.source_line_map is distinct from p_material_source_line_map then
        raise exception 'quotation operation key reused with different material source' using errcode = '40001';
      end if;
    else
      insert into public.quotation_material_list_sources(
        organization_id, quotation_id, quotation_revision_id, material_list_id,
        material_revision_id, source_line_map, request_key, created_by
      ) values (
        p_organization_id, v_saved.quotation_id, v_saved.revision_id, p_material_list_id,
        p_material_revision_id, p_material_source_line_map, p_operation_id, v_actor
      );
    end if;

    select * into v_existing_calc from public.quotation_calculation_sources s
      where s.organization_id = p_organization_id and s.created_by = v_actor and s.request_key = p_operation_id;
    if found then
      if v_existing_calc.quotation_id is distinct from v_saved.quotation_id
        or v_existing_calc.quotation_revision_id is distinct from v_saved.revision_id
        or v_existing_calc.calculation_revision_id is distinct from p_calculation_revision_id
        or v_existing_calc.source_line_map is distinct from v_normalized then
        raise exception 'quotation operation key reused with different calculation source' using errcode = '40001';
      end if;
    else
      select * into v_existing_calc from public.quotation_calculation_sources s where s.quotation_revision_id = v_saved.revision_id;
      if found then
        if v_existing_calc.calculation_revision_id is distinct from p_calculation_revision_id or v_existing_calc.source_line_map is distinct from v_normalized then
          raise exception 'the unchanged quotation revision already has another calculation source' using errcode = '40001';
        end if;
      else
        insert into public.quotation_calculation_sources(
          organization_id, quotation_id, quotation_revision_id, calculation_id, calculation_revision_id, source_line_map, request_key, created_by
        ) values (
          p_organization_id, v_saved.quotation_id, v_saved.revision_id, v_calculation.id, p_calculation_revision_id, v_normalized, p_operation_id, v_actor
        );
      end if;
    end if;
    return query select v_saved.quotation_id, v_saved.revision_id, v_saved.revision_number, v_saved.revision_created, v_saved.totals_snapshot;
  end loop;
end; $$;

revoke all on function public.save_standalone_quotation_from_material_list_and_calculation(uuid, uuid, uuid, text, uuid, jsonb, integer, jsonb, uuid, uuid, jsonb, uuid, jsonb) from public, anon;
grant execute on function public.save_standalone_quotation_from_material_list_and_calculation(uuid, uuid, uuid, text, uuid, jsonb, integer, jsonb, uuid, uuid, jsonb, uuid, jsonb) to authenticated;
