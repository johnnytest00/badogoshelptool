-- F9.6.1.2.1: atomic, idempotent gutter calculation -> takeoff draft transfer.

alter table public.material_takeoffs
  add column transfer_request_key uuid,
  add column transfer_payload jsonb;

alter table public.material_takeoffs
  add constraint material_takeoffs_transfer_pair_check
  check ((transfer_request_key is null) = (transfer_payload is null)),
  add constraint material_takeoffs_transfer_request_unique
  unique (organization_id, project_id, transfer_request_key);

create or replace function public.create_gutter_takeoff_draft(
  p_organization_id uuid,
  p_project_id uuid,
  p_calculation_id uuid,
  p_revision_id uuid,
  p_name text,
  p_request_key uuid,
  p_mappings jsonb
)
returns table(takeoff_id uuid, draft_created boolean)
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_takeoff_id uuid;
  v_created boolean := false;
  v_existing_payload jsonb;
  v_payload jsonb;
  v_input jsonb;
  v_output jsonb;
  v_mapping jsonb;
  v_candidate_id text;
  v_candidate_kind text;
  v_source_id text;
  v_variant_id uuid;
  v_quantity numeric;
  v_label text;
  v_measurement_source text;
  v_classification text;
  v_variant public.material_variants%rowtype;
  v_product public.material_products%rowtype;
  v_price public.material_prices%rowtype;
  v_material_snapshot jsonb;
  v_price_snapshot jsonb;
begin
  if not private.is_org_member(p_organization_id) then
    raise exception 'organization access denied' using errcode = '42501';
  end if;
  if p_request_key is null then
    raise exception 'transfer request key is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_mappings) <> 'array' or jsonb_array_length(p_mappings) = 0 then
    raise exception 'at least one material mapping is required' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_mappings) mapping
    group by mapping->>'candidateId'
    having count(*) > 1
  ) then
    raise exception 'duplicate takeoff candidate mapping' using errcode = '22023';
  end if;

  select revision.input_snapshot, revision.output_snapshot
    into v_input, v_output
  from public.calculations calculation
  join public.calculation_revisions revision
    on revision.id = p_revision_id
   and revision.calculation_id = calculation.id
   and revision.organization_id = calculation.organization_id
  where calculation.id = p_calculation_id
    and calculation.organization_id = p_organization_id
    and calculation.project_id = p_project_id
    and calculation.calculator_type = 'gutters.material-estimate'
    and calculation.current_revision_id = p_revision_id
    and revision.validation_status = 'verified';

  if v_input is null or v_output is null then
    raise exception 'current verified gutter calculation revision not found' using errcode = 'P0002';
  end if;

  v_payload := jsonb_build_object(
    'calculationId', p_calculation_id,
    'revisionId', p_revision_id,
    'mappings', p_mappings
  );

  insert into public.material_takeoffs (
    organization_id, project_id, source_calculation_id,
    source_calculation_revision_id, name, status, created_by,
    transfer_request_key, transfer_payload
  ) values (
    p_organization_id, p_project_id, p_calculation_id,
    p_revision_id, p_name, 'draft', auth.uid(),
    p_request_key, v_payload
  )
  on conflict (organization_id, project_id, transfer_request_key) do nothing
  returning id into v_takeoff_id;

  if v_takeoff_id is null then
    select id, transfer_payload into v_takeoff_id, v_existing_payload
    from public.material_takeoffs
    where organization_id = p_organization_id
      and project_id = p_project_id
      and transfer_request_key = p_request_key;
    if v_takeoff_id is null then
      raise exception 'idempotent gutter takeoff is not visible' using errcode = '42501';
    end if;
    if v_existing_payload is distinct from v_payload then
      raise exception 'transfer request key was already used with different content' using errcode = '22023';
    end if;
    return query select v_takeoff_id, false;
    return;
  end if;

  v_created := true;
  for v_mapping in select value from jsonb_array_elements(p_mappings)
  loop
    v_candidate_id := nullif(trim(v_mapping->>'candidateId'), '');
    begin
      v_variant_id := (v_mapping->>'variantId')::uuid;
    exception when invalid_text_representation then
      raise exception 'invalid material variant id' using errcode = '22023';
    end;
    if v_candidate_id is null or v_variant_id is null then
      raise exception 'candidate and variant are required' using errcode = '22023';
    end if;

    v_candidate_kind := split_part(v_candidate_id, ':', 1);
    v_source_id := substring(v_candidate_id from position(':' in v_candidate_id) + 1);
    v_quantity := null;
    v_label := null;
    v_measurement_source := null;
    v_classification := null;

    if v_candidate_kind = 'gutter-section' then
      select (item->>'stockSections')::numeric, (item->>'name') || ' · ereszszál',
             'gutterRuns.' || (item->>'id') || '.stockSections', 'preliminary'
        into v_quantity, v_label, v_measurement_source, v_classification
      from jsonb_array_elements(coalesce(v_output->'gutterRuns', '[]'::jsonb)) item
      where item->>'id' = v_source_id;
    elsif v_candidate_kind = 'bracket' then
      select (item->>'bracketEstimate')::numeric, (item->>'name') || ' · konzolbecslés',
             'gutterRuns.' || (item->>'id') || '.bracketEstimate', 'manual'
        into v_quantity, v_label, v_measurement_source, v_classification
      from jsonb_array_elements(coalesce(v_output->'gutterRuns', '[]'::jsonb)) item
      where item->>'id' = v_source_id and item->'bracketEstimate' <> 'null'::jsonb;
    elsif v_candidate_kind = 'downpipe-section' then
      select (item->>'stockSections')::numeric, (item->>'name') || ' · lefolyószál',
             'downpipeRuns.' || (item->>'id') || '.stockSections', 'preliminary'
        into v_quantity, v_label, v_measurement_source, v_classification
      from jsonb_array_elements(coalesce(v_output->'downpipeRuns', '[]'::jsonb)) item
      where item->>'id' = v_source_id;
    elsif v_candidate_kind = 'manual' then
      select (item->>'quantity')::numeric,
             case when coalesce(item->>'note', '') = '' then item->>'category' else (item->>'category') || ' · ' || (item->>'note') end,
             'manualComponents.' || (item->>'id'), 'manual'
        into v_quantity, v_label, v_measurement_source, v_classification
      from jsonb_array_elements(coalesce(v_input->'manualComponents', '[]'::jsonb)) item
      where item->>'id' = v_source_id;
    end if;

    if v_quantity is null or v_quantity < 0 then
      raise exception 'mapped gutter candidate does not exist in the saved revision' using errcode = '22023';
    end if;

    select variant.* into v_variant
    from public.material_variants variant
    where variant.id = v_variant_id
      and variant.organization_id = p_organization_id;
    if not found then
      raise exception 'catalog variant access denied' using errcode = '42501';
    end if;

    select product.* into v_product
    from public.material_products product
    where product.id = v_variant.product_id
      and product.organization_id = p_organization_id
      and product.status = 'active'
      and product.category in ('gutter', 'accessory', 'other');
    if not found then
      raise exception 'catalog product is inactive or incompatible' using errcode = '22023';
    end if;
    if v_variant.purchasing_unit <> 'piece' then
      raise exception 'catalog unit is incompatible with gutter piece quantity' using errcode = '22023';
    end if;

    select price.* into v_price
    from public.material_prices price
    where price.organization_id = p_organization_id
      and price.variant_id = v_variant.id
      and price.purchasing_unit = v_variant.purchasing_unit
    order by price.effective_date desc, price.recorded_at desc, price.id desc
    limit 1;

    v_material_snapshot := jsonb_build_object(
      'candidateId', v_candidate_id,
      'label', v_label,
      'sourceCalculationRevisionId', p_revision_id,
      'variantId', v_variant.id,
      'productId', v_product.id,
      'productName', v_product.name,
      'variantName', v_variant.name,
      'sku', v_variant.sku,
      'purchasingUnit', v_variant.purchasing_unit,
      'lengthMm', v_variant.length_mm,
      'nominalWidthMm', v_variant.nominal_width_mm,
      'effectiveWidthMm', v_variant.effective_width_mm,
      'technicalSpecs', v_variant.technical_specs,
      'provenance', v_variant.data_provenance
    );
    v_price_snapshot := case when v_price.id is null then null else jsonb_build_object(
      'id', v_price.id,
      'amount', v_price.amount,
      'currency', v_price.currency,
      'purchasingUnit', v_price.purchasing_unit,
      'priceKind', v_price.price_kind,
      'effectiveDate', v_price.effective_date,
      'provenance', v_price.data_provenance,
      'sourceName', v_price.source_name,
      'sourceUrl', v_price.source_url
    ) end;

    insert into public.material_takeoff_items (
      organization_id, takeoff_id, variant_id, estimation_method,
      measurement_source, selected_measurement_value, calculated_quantity,
      final_quantity, quantity_unit, material_snapshot, price_snapshot,
      data_provenance, warnings, created_by
    ) values (
      p_organization_id, v_takeoff_id, v_variant.id, 'manual',
      v_measurement_source || '; ' || v_classification || '_stock_quantity',
      v_quantity, v_quantity, v_quantity, 'piece', v_material_snapshot,
      v_price_snapshot,
      case when v_classification = 'preliminary' then 'estimated'::public.material_data_provenance else 'user_provided'::public.material_data_provenance end,
      jsonb_build_array(case when v_classification = 'preliminary'
        then 'Előzetes kereskedelmi szálmennyiség; nem végleges rendelési vagy vágási terv.'
        else 'Kézi tartozékmennyiség; nincs geometriai ellenőrzés.' end),
      auth.uid()
    );
  end loop;

  return query select v_takeoff_id, v_created;
end;
$$;

revoke all on function public.create_gutter_takeoff_draft(uuid, uuid, uuid, uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.create_gutter_takeoff_draft(uuid, uuid, uuid, uuid, text, uuid, jsonb) to authenticated;

comment on column public.material_takeoffs.transfer_request_key is 'Stable client operation identity for atomic gutter takeoff draft creation.';
comment on column public.material_takeoffs.transfer_payload is 'Immutable logical transfer identity used to reject request-key reuse with different content.';
comment on function public.create_gutter_takeoff_draft(uuid, uuid, uuid, uuid, text, uuid, jsonb) is 'Creates one idempotent gutter takeoff draft from an authoritative current saved revision.';
