-- F9.22: snapshot organization-owned material category names and optional
-- manual line prices in immutable standalone material-list revisions.
alter table public.material_preparation_revisions add column request_snapshot jsonb;
comment on column public.material_preparation_revisions.request_snapshot
  is 'Immutable submitted input used for stable idempotency; input_snapshot and items_snapshot remain resolved source snapshots.';

create or replace function public.save_workflow_material_list_revision(
  p_organization_id uuid,
  p_list_id uuid,
  p_execution_plan_id uuid,
  p_name text,
  p_items jsonb,
  p_expected_version integer,
  p_request_key uuid
)
returns table (list_id uuid, revision_id uuid, revision_number integer, version integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_list public.material_preparation_lists%rowtype;
  v_revision public.material_preparation_revisions%rowtype;
  v_item jsonb;
  v_items jsonb := '[]'::jsonb;
  v_input jsonb;
  v_request_snapshot jsonb;
  v_id uuid;
  v_description text;
  v_quantity numeric(18,6);
  v_unit public.material_purchasing_unit;
  v_material_category public.material_category;
  v_variant public.material_variants%rowtype;
  v_product public.material_products%rowtype;
  v_category public.material_categories%rowtype;
  v_price public.material_prices%rowtype;
  v_price_id uuid;
  v_manual_price_amount numeric(20,2);
  v_manual_price_kind public.material_price_kind;
  v_version integer;
  v_revision_id uuid;
  v_plan_id uuid := p_execution_plan_id;
begin
  if v_actor is null or not private.is_org_member(p_organization_id) then
    raise exception 'material list access denied' using errcode = '42501';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 120
    or p_request_key is null or p_expected_version is null or p_expected_version < 0
    or p_items is null or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) not between 1 and 200 then
    raise exception 'invalid material list payload' using errcode = '22023';
  end if;
  if v_plan_id is not null and not exists (
    select 1 from public.execution_plans p where p.id = v_plan_id and p.organization_id = p_organization_id
  ) then raise exception 'execution plan access denied' using errcode = '42501'; end if;

  v_request_snapshot := pg_catalog.jsonb_build_object(
    'name', pg_catalog.btrim(p_name), 'executionPlanId', v_plan_id, 'items', p_items
  );

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_organization_id::text || ':' || coalesce(p_list_id::text, v_plan_id::text, v_actor::text) || ':' || p_request_key::text, 0));

  -- Resolve successful retries before reading mutable catalog names/statuses.
  if p_list_id is null then
    select * into v_list from public.material_preparation_lists l
      where l.organization_id = p_organization_id and l.project_id is null and l.created_by = v_actor
        and l.creation_request_key = p_request_key for update;
    if found then
      select * into v_revision from public.material_preparation_revisions r
        where r.list_id = v_list.id and r.organization_id = p_organization_id and r.request_key = p_request_key;
      if found and v_revision.request_snapshot is not null then
        if v_revision.request_snapshot is distinct from v_request_snapshot then
          raise exception 'request key reused with different material list content' using errcode = '40001';
        end if;
        return query select v_list.id, v_revision.id, v_revision.revision_number, v_list.version;
        return;
      end if;
    end if;
  else
    select * into v_list from public.material_preparation_lists l
      where l.id = p_list_id and l.organization_id = p_organization_id and l.project_id is null
      for update;
    if not found or (v_list.execution_plan_id is null and v_list.created_by <> v_actor) then
      raise exception 'material list access denied' using errcode = '42501';
    end if;
    if v_list.execution_plan_id is distinct from v_plan_id then
      raise exception 'execution plan association is immutable for this list' using errcode = '22023';
    end if;
    select * into v_revision from public.material_preparation_revisions r
      where r.list_id = p_list_id and r.organization_id = p_organization_id and r.request_key = p_request_key;
    if found and v_revision.request_snapshot is not null then
      if v_revision.request_snapshot is distinct from v_request_snapshot then
        raise exception 'request key reused with different material list content' using errcode = '40001';
      end if;
      return query select v_list.id, v_revision.id, v_revision.revision_number, v_list.version;
      return;
    end if;
  end if;

  for v_item in select value from pg_catalog.jsonb_array_elements(p_items) loop
    v_id := (v_item->>'id')::uuid;
    v_description := nullif(pg_catalog.btrim(v_item->>'description'), '');
    if v_description is null or pg_catalog.char_length(v_description) > 240 then
      raise exception 'material description is required' using errcode = '22023';
    end if;
    if coalesce(v_item->>'quantity','') !~ '^[0-9]{1,12}(\.[0-9]{1,6})?$' then
      raise exception 'quantity must be positive with at most six decimals' using errcode = '22023';
    end if;
    v_quantity := (v_item->>'quantity')::numeric;
    if v_quantity <= 0 then raise exception 'quantity must be positive' using errcode = '22023'; end if;
    begin v_unit := (v_item->>'unit')::public.material_purchasing_unit;
    exception when others then raise exception 'unsupported material unit' using errcode = '22023'; end;
    begin v_material_category := coalesce(nullif(v_item->>'materialCategory',''), 'other')::public.material_category;
    exception when others then raise exception 'unsupported material category' using errcode = '22023'; end;
    if coalesce(v_item->>'kind','manual') not in ('manual','catalog')
      or coalesce(v_item->'sourceRefs','[]'::jsonb) <> '[]'::jsonb then
      raise exception 'unsupported material source' using errcode = '22023';
    end if;
    if coalesce(v_item->>'kind','manual') = 'catalog' then
      if coalesce(v_item->>'manualPriceAmount', '') <> '' or nullif(v_item->>'manualPriceKind', '') is not null then
        raise exception 'catalog items use only an explicitly selected catalog price' using errcode = '22023';
      end if;
      select * into v_variant from public.material_variants v
        where v.id = (v_item->>'variantId')::uuid and v.organization_id = p_organization_id;
      if not found or v_variant.purchasing_unit <> v_unit then
        raise exception 'catalog variant or unit is incompatible' using errcode = '42501';
      end if;
      select * into v_product from public.material_products p
        where p.id = v_variant.product_id and p.organization_id = p_organization_id and p.status = 'active';
      if not found then raise exception 'catalog product is unavailable' using errcode = '42501'; end if;
      if nullif(v_item->>'categoryId', '') is not null
        and (v_item->>'categoryId') is distinct from v_product.category_id::text then
        raise exception 'catalog product category does not match the selected category' using errcode = '22023';
      end if;
      select * into v_category from public.material_categories c
        where c.id = v_product.category_id and c.organization_id = p_organization_id and c.is_active;
      if not found then raise exception 'catalog product category is unavailable' using errcode = '42501'; end if;
      v_price_id := nullif(v_item->>'priceId','')::uuid;
      if v_price_id is not null then
        select * into v_price from public.material_prices p
          where p.id = v_price_id and p.organization_id = p_organization_id
            and p.variant_id = v_variant.id and p.purchasing_unit = v_unit;
        if not found then raise exception 'catalog price is incompatible' using errcode = '42501'; end if;
      end if;
      v_items := v_items || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'id', v_id, 'kind', 'catalog', 'category', 'purchasing', 'status', 'required',
        'materialCategory', v_product.category,
        'categoryId', v_category.id, 'categoryName', v_category.name,
        'description', v_description, 'productId', v_product.id, 'variantId', v_variant.id,
        'productName', v_product.name, 'variantName', v_variant.name, 'sku', v_variant.sku,
        'quantity', v_quantity::text, 'unit', v_unit::text,
        'materialSnapshot', pg_catalog.jsonb_build_object('productId', v_product.id, 'productName', v_product.name,
          'categoryId', v_category.id, 'categoryName', v_category.name,
          'category', v_product.category, 'manufacturerId', v_product.manufacturer_id,
          'variantId', v_variant.id, 'variantName', v_variant.name, 'sku', v_variant.sku,
          'purchasingUnit', v_variant.purchasing_unit, 'lengthMm', v_variant.length_mm,
          'nominalWidthMm', v_variant.nominal_width_mm, 'effectiveWidthMm', v_variant.effective_width_mm,
          'thicknessMm', v_variant.thickness_mm, 'packagingQuantity', v_variant.packaging_quantity,
          'technicalSpecs', v_variant.technical_specs, 'productProvenance', v_product.data_provenance,
          'variantProvenance', v_variant.data_provenance),
        'priceId', v_price_id,
        'priceSnapshot', case when v_price_id is null then null else pg_catalog.jsonb_build_object(
          'priceId', v_price.id, 'amount', v_price.amount::text, 'currency', v_price.currency,
          'purchasingUnit', v_price.purchasing_unit, 'priceKind', v_price.price_kind,
          'effectiveDate', v_price.effective_date, 'provenance', v_price.data_provenance,
          'sourceName', v_price.source_name, 'sourceNotes', v_price.source_notes) end,
        'sourceItemIds', '[]'::jsonb, 'sourceSnapshots', '[]'::jsonb,
        'sourceRefs', '[]'::jsonb, 'dimensions', v_variant.technical_specs,
        'supplier', null, 'notes', null, 'provenance', v_variant.data_provenance::text
      ));
    else
      if nullif(v_item->>'variantId', '') is not null or nullif(v_item->>'priceId', '') is not null
        or nullif(v_item->>'categoryId', '') is not null then
        raise exception 'manual items cannot reference catalog records or categories' using errcode = '22023';
      end if;
      v_manual_price_amount := null;
      v_manual_price_kind := null;
      if coalesce(v_item->>'manualPriceAmount', '') <> '' then
        if (v_item->>'manualPriceAmount') !~ '^[0-9]{1,12}(\.[0-9]{1,2})?$' then
          raise exception 'manual price must be a non-negative HUF amount with at most two decimals' using errcode = '22023';
        end if;
        v_manual_price_amount := (v_item->>'manualPriceAmount')::numeric(20,2);
        begin v_manual_price_kind := (v_item->>'manualPriceKind')::public.material_price_kind;
        exception when others then raise exception 'manual price basis must be net or gross' using errcode = '22023'; end;
      elsif nullif(v_item->>'manualPriceKind','') is not null then
        raise exception 'manual price basis requires a price amount' using errcode = '22023';
      end if;
      v_items := v_items || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'id', v_id, 'kind', 'manual', 'category', 'purchasing', 'status', 'required',
        'materialCategory', v_material_category,
        'description', v_description, 'quantity', v_quantity::text, 'unit', v_unit::text,
        'manualPriceAmount', case when v_manual_price_amount is null then null else v_manual_price_amount::text end,
        'manualPriceKind', v_manual_price_kind,
        'priceSnapshot', case when v_manual_price_amount is null then null else pg_catalog.jsonb_build_object(
          'amount', v_manual_price_amount::text, 'currency', 'HUF', 'purchasingUnit', v_unit,
          'priceKind', v_manual_price_kind, 'manual', true, 'provenance', 'user_provided') end,
        'sourceItemIds', '[]'::jsonb, 'sourceSnapshots', '[]'::jsonb, 'sourceRefs', '[]'::jsonb,
        'dimensions', '{}'::jsonb, 'supplier', null, 'notes', null, 'provenance', 'manual'
      ));
    end if;
  end loop;

  v_input := pg_catalog.jsonb_build_object('name', pg_catalog.btrim(p_name), 'executionPlanId', v_plan_id, 'items', v_items);
  if p_list_id is null then
    if p_expected_version <> 0 then raise exception 'new list version must be zero' using errcode = '22023'; end if;
    select * into v_list from public.material_preparation_lists l
      where l.organization_id = p_organization_id and l.project_id is null and l.created_by = v_actor
        and l.creation_request_key = p_request_key for update;
    if found then
      select * into v_revision from public.material_preparation_revisions r
        where r.list_id = v_list.id and r.organization_id = p_organization_id and r.revision_number = 1;
      if v_revision.input_snapshot is distinct from v_input then
        raise exception 'request key reused with different material list content' using errcode = '40001';
      end if;
      return query select v_list.id, v_revision.id, v_revision.revision_number, v_list.version;
      return;
    end if;
    insert into public.material_preparation_lists(organization_id, project_id, execution_plan_id, name, version, creation_request_key, created_by)
      values (p_organization_id, null, v_plan_id, pg_catalog.btrim(p_name), 0, p_request_key, v_actor) returning * into v_list;
    v_version := 1;
  else
    select * into v_list from public.material_preparation_lists l
      where l.id = p_list_id and l.organization_id = p_organization_id and l.project_id is null
      for update;
    if not found or (v_list.execution_plan_id is null and v_list.created_by <> v_actor) then
      raise exception 'material list access denied' using errcode = '42501';
    end if;
    if v_list.execution_plan_id is distinct from v_plan_id then
      raise exception 'execution plan association is immutable for this list' using errcode = '22023';
    end if;
    select * into v_revision from public.material_preparation_revisions r
      where r.list_id = p_list_id and r.organization_id = p_organization_id and r.request_key = p_request_key;
    if found then
      if v_revision.input_snapshot is distinct from v_input then
        raise exception 'request key reused with different material list content' using errcode = '40001';
      end if;
      return query select v_list.id, v_revision.id, v_revision.revision_number, v_list.version;
      return;
    end if;
    if v_list.version <> p_expected_version then raise exception 'material list changed since it was opened' using errcode = '40001'; end if;
    v_version := v_list.version + 1;
  end if;
  insert into public.material_preparation_revisions(
    organization_id, list_id, revision_number, request_key, preparation_state,
    source_takeoffs_snapshot, items_snapshot, input_snapshot, request_snapshot, created_by
  ) values (p_organization_id, v_list.id, v_version, p_request_key, 'ready', '[]'::jsonb, v_items, v_input, v_request_snapshot, v_actor)
  returning id into v_revision_id;
  update public.material_preparation_lists set name = pg_catalog.btrim(p_name), version = v_version,
    current_revision_id = v_revision_id where id = v_list.id and organization_id = p_organization_id;
  return query select v_list.id, v_revision_id, v_version, v_version;
end;
$$;

revoke all on function public.save_workflow_material_list_revision(uuid, uuid, uuid, text, jsonb, integer, uuid) from public, anon;
grant execute on function public.save_workflow_material_list_revision(uuid, uuid, uuid, text, jsonb, integer, uuid) to authenticated;
