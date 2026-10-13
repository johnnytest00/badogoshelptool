-- F9.6.2.3: atomic, idempotent transfer from a verified flashing revision.
create or replace function public.create_flashing_takeoff_draft(
  p_organization_id uuid, p_project_id uuid, p_calculation_id uuid,
  p_revision_id uuid, p_name text, p_request_key uuid, p_mappings jsonb
)
returns table(takeoff_id uuid, draft_created boolean)
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_id uuid; v_existing jsonb; v_payload jsonb; v_input jsonb; v_output jsonb;
  v_mapping jsonb; v_candidate text; v_kind text; v_source text; v_variant_id uuid;
  v_quantity numeric; v_unit public.material_purchasing_unit; v_label text;
  v_measurement_source text; v_classification text; v_group text;
  v_variant public.material_variants%rowtype; v_product public.material_products%rowtype;
  v_price public.material_prices%rowtype; v_item jsonb; v_price_snapshot jsonb;
begin
  if not private.is_org_member(p_organization_id) then raise exception 'organization access denied' using errcode='42501'; end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 200 or p_request_key is null then
    raise exception 'valid takeoff name and request key are required' using errcode='22023';
  end if;
  if jsonb_typeof(p_mappings) <> 'array' or jsonb_array_length(p_mappings) = 0 then
    raise exception 'at least one material mapping is required' using errcode='22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_mappings) as entries(item) group by item->>'candidateId' having count(*) > 1) then
    raise exception 'duplicate candidate mapping' using errcode='22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_mappings) as entries(item) group by split_part(item->>'candidateId', ':', 2) having count(*) > 1 and bool_or(split_part(item->>'candidateId', ':', 1) in ('run-piece','run-linear'))) then
    raise exception 'choose only one quantity representation per flashing run' using errcode='22023';
  end if;

  select r.input_snapshot, r.output_snapshot into v_input, v_output
  from public.calculations c join public.calculation_revisions r
    on r.id=p_revision_id and r.calculation_id=c.id and r.organization_id=c.organization_id
  where c.id=p_calculation_id and c.organization_id=p_organization_id and c.project_id=p_project_id
    and c.roof_model_id is null and c.calculator_type='sheet_metal.flashings.material-estimate'
    and c.current_revision_id=p_revision_id and r.validation_status='verified'
    and r.calculator_implementation_version='1.0.0' and r.input_schema_version='1.0.0';
  if v_input is null or v_output is null then raise exception 'current verified flashing revision not found' using errcode='P0002'; end if;

  -- The calculation snapshot keeps geometry references immutable. A transfer is rejected if its source has moved.
  -- Hold shared row locks in a stable order so source revision pointers cannot move during this transaction.
  perform rm.id from public.roof_models rm
  where rm.id in (select distinct (run->'roofEdgeReference'->>'roofModelId')::uuid from jsonb_array_elements(coalesce(v_input->'runs','[]'::jsonb)) run where run->'roofEdgeReference' is not null and run->'roofEdgeReference'<>'null'::jsonb)
  order by rm.id for share;
  perform gc.id from public.calculations gc
  where gc.id in (select distinct (run->'roofEdgeReference'->>'calculationId')::uuid from jsonb_array_elements(coalesce(v_input->'runs','[]'::jsonb)) run where run->'roofEdgeReference' is not null and run->'roofEdgeReference'<>'null'::jsonb)
  order by gc.id for share;
  if exists (
    select 1 from jsonb_array_elements(coalesce(v_input->'runs','[]'::jsonb)) run
    cross join lateral (select run->'roofEdgeReference' ref) x
    where x.ref is not null and x.ref <> 'null'::jsonb and (
      not exists (select 1 from public.roof_models rm where rm.id=(x.ref->>'roofModelId')::uuid
        and rm.organization_id=p_organization_id and rm.project_id=p_project_id and rm.roof_type='gable'
        and rm.current_revision_id=(x.ref->>'roofModelRevisionId')::uuid)
      or not exists (select 1 from public.calculations gc join public.calculation_revisions gr on gr.id=gc.current_revision_id
        where gc.id=(x.ref->>'calculationId')::uuid and gc.organization_id=p_organization_id and gc.project_id=p_project_id
          and gc.calculator_type='roof.gable' and gc.roof_model_id=(x.ref->>'roofModelId')::uuid
          and gc.current_revision_id=(x.ref->>'calculationRevisionId')::uuid and gr.validation_status='verified')
      or not exists (select 1 from public.roof_model_revisions rr where rr.id=(x.ref->>'roofModelRevisionId')::uuid
        and rr.roof_model_id=(x.ref->>'roofModelId')::uuid and rr.validation_status='verified')
      or not exists (select 1 from public.calculation_dependencies d where d.downstream_calculation_revision_id=(x.ref->>'calculationRevisionId')::uuid
        and d.upstream_roof_model_revision_id=(x.ref->>'roofModelRevisionId')::uuid)
    )) then raise exception 'flashing source geometry is stale or unverified' using errcode='22023'; end if;

  v_payload := jsonb_build_object('calculationId',p_calculation_id,'revisionId',p_revision_id,'name',trim(p_name),'mappings',p_mappings);
  insert into public.material_takeoffs(organization_id,project_id,source_calculation_id,source_calculation_revision_id,name,status,created_by,transfer_request_key,transfer_payload)
  values(p_organization_id,p_project_id,p_calculation_id,p_revision_id,trim(p_name),'draft',auth.uid(),p_request_key,v_payload)
  on conflict(organization_id,project_id,transfer_request_key) do nothing returning id into v_id;
  if v_id is null then
    select id,transfer_payload into v_id,v_existing from public.material_takeoffs where organization_id=p_organization_id and project_id=p_project_id and transfer_request_key=p_request_key;
    if v_id is null then raise exception 'idempotent takeoff is not visible' using errcode='42501'; end if;
    if v_existing is distinct from v_payload then raise exception 'request key already used with different payload' using errcode='22023'; end if;
    return query select v_id,false; return;
  end if;

  for v_mapping in select value from jsonb_array_elements(p_mappings) loop
    v_candidate := trim(coalesce(v_mapping->>'candidateId','')); v_variant_id := (v_mapping->>'variantId')::uuid;
    v_kind := split_part(v_candidate,':',1); v_source := substring(v_candidate from position(':' in v_candidate)+1);
    v_quantity := null; v_label := null; v_unit := null; v_classification := null; v_measurement_source := null;
    if v_kind='run-piece' then
      select nullif(item->>'estimatedSectionCount','null')::numeric, item->>'name', 'piece', 'preliminary',
        'runs.'||v_source||'.estimatedSectionCount; target='||(item->>'planningTargetLengthMm')||' mm'
      into v_quantity,v_label,v_unit,v_classification,v_measurement_source from jsonb_array_elements(coalesce(v_output->'runs','[]'::jsonb)) item where item->>'id'=v_source;
    elsif v_kind='run-linear' then
      select (item->>'planningTargetLengthMm')::numeric/1000, item->>'name', 'linear_meter', 'preliminary',
        'runs.'||v_source||'.planningTargetLengthMm mm / 1000; tartalék included'
      into v_quantity,v_label,v_unit,v_classification,v_measurement_source from jsonb_array_elements(coalesce(v_output->'runs','[]'::jsonb)) item where item->>'id'=v_source;
    elsif v_kind='manual' then
      select (item->>'quantity')::numeric, item->>'name', 'piece', 'manual', 'manualComponents.'||v_source
      into v_quantity,v_label,v_unit,v_classification,v_measurement_source from jsonb_array_elements(coalesce(v_input->'manualComponents','[]'::jsonb)) item where item->>'id'=v_source;
    else raise exception 'unknown flashing candidate' using errcode='22023';
    end if;
    if v_quantity is null or v_quantity <= 0 or v_unit is null then raise exception 'candidate missing or unresolved quantity' using errcode='22023'; end if;

    select * into v_variant from public.material_variants where id=v_variant_id and organization_id=p_organization_id;
    if not found then raise exception 'catalog variant access denied' using errcode='42501'; end if;
    select * into v_product from public.material_products where id=v_variant.product_id and organization_id=p_organization_id and status='active'
      and ((v_kind in ('run-piece','run-linear') and category in ('flashing','sheet_metal')) or (v_kind='manual' and category in ('flashing','sheet_metal','accessory','other')));
    if not found or v_variant.purchasing_unit<>v_unit then raise exception 'catalog variant inactive, incompatible or unit mismatch' using errcode='22023'; end if;
    select * into v_price from public.material_prices where organization_id=p_organization_id and variant_id=v_variant.id and purchasing_unit=v_unit
      order by effective_date desc,recorded_at desc,id desc limit 1;
    v_item := jsonb_build_object('candidateId',v_candidate,'label',v_label,'quantity',v_quantity,'quantityUnit',v_unit,
      'measurementSource',v_measurement_source,'classification',v_classification,'sourceCalculationId',p_calculation_id,
      'sourceCalculationRevisionId',p_revision_id,'variantId',v_variant.id,'productId',v_product.id,'productName',v_product.name,
      'productCategory',v_product.category,'productCode',v_product.product_code,'manufacturerId',v_product.manufacturer_id,
      'variantName',v_variant.name,'sku',v_variant.sku,'purchasingUnit',v_variant.purchasing_unit,
      'lengthMm',v_variant.length_mm,'nominalWidthMm',v_variant.nominal_width_mm,'effectiveWidthMm',v_variant.effective_width_mm,
      'thicknessMm',v_variant.thickness_mm,'packagingQuantity',v_variant.packaging_quantity,'technicalSpecs',v_variant.technical_specs,
      'productProvenance',v_product.data_provenance,'variantProvenance',v_variant.data_provenance,
      'sourceName',v_variant.source_name,'sourceUrl',v_variant.source_url,'sourceDate',v_variant.source_date,'sourceNotes',v_variant.source_notes);
    v_price_snapshot := case when v_price.id is null then null else jsonb_build_object('id',v_price.id,'amount',v_price.amount,'currency',v_price.currency,
      'purchasingUnit',v_price.purchasing_unit,'priceKind',v_price.price_kind,'effectiveDate',v_price.effective_date,
      'provenance',v_price.data_provenance,'sourceName',v_price.source_name,'sourceUrl',v_price.source_url,'sourceDate',v_price.source_date,'sourceNotes',v_price.source_notes) end;
    insert into public.material_takeoff_items(organization_id,takeoff_id,variant_id,estimation_method,measurement_source,
      selected_measurement_value,calculated_quantity,final_quantity,quantity_unit,material_snapshot,price_snapshot,data_provenance,warnings,created_by)
    values(p_organization_id,v_id,v_variant.id,case when v_unit='linear_meter' then 'linear'::public.material_takeoff_method else 'manual'::public.material_takeoff_method end,
      v_measurement_source,v_quantity,v_quantity,v_quantity,v_unit,v_item,v_price_snapshot,
      case when v_classification='preliminary' then 'estimated'::public.material_data_provenance else 'user_provided'::public.material_data_provenance end,
      jsonb_build_array(case when v_classification='preliminary' then 'Előzetes matematikai becslés; nem végleges rendelési vagy vágási terv.' else 'Kézi tartozékmennyiség; geometriai ellenőrzés nélkül.' end,
        'A kategória és a kiválasztott termék nem igazolja a gyártói profil- vagy szerelési kompatibilitást.',
        case when v_price.id is null then 'Ehhez a katalógusváltozathoz nincs rögzített árverzió.' else 'Árforrás és árverzió a price_snapshot mezőben rögzítve.' end),auth.uid());
  end loop;
  return query select v_id,true;
end;
$$;
revoke all on function public.create_flashing_takeoff_draft(uuid,uuid,uuid,uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.create_flashing_takeoff_draft(uuid,uuid,uuid,uuid,text,uuid,jsonb) to authenticated;
comment on function public.create_flashing_takeoff_draft(uuid,uuid,uuid,uuid,text,uuid,jsonb) is 'Creates an atomic idempotent takeoff draft from an authoritative current saved flashing revision.';
