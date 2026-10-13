-- F9.6.3.4.2: accept saved incomplete profile revisions so the explicit BA/K rejection runs.
create or replace function public.create_profile_takeoff_draft(
  p_organization_id uuid, p_project_id uuid, p_calculation_id uuid,
  p_revision_id uuid, p_variant_id uuid, p_name text, p_request_key uuid
)
returns table(takeoff_id uuid, draft_created boolean)
language plpgsql security invoker set search_path = public, private, pg_catalog as $$
declare
  v_input jsonb; v_output jsonb; v_revision_number integer;
  v_width numeric := 0; v_allowance numeric; v_length numeric; v_count numeric; v_area numeric;
  v_bend jsonb; v_straight jsonb; v_variant public.material_variants%rowtype;
  v_product public.material_products%rowtype; v_price public.material_prices%rowtype;
  v_id uuid; v_existing jsonb; v_payload jsonb; v_snapshot jsonb; v_price_snapshot jsonb;
begin
  if auth.uid() is null or not private.is_org_member(p_organization_id) then
    raise exception 'organization access denied' using errcode='42501';
  end if;
  if p_request_key is null or p_variant_id is null or p_name is null or char_length(trim(p_name)) not between 1 and 200 then
    raise exception 'valid variant, draft name and request key required' using errcode='22023';
  end if;
  perform 1 from public.projects where id=p_project_id and organization_id=p_organization_id for share;
  if not found then raise exception 'destination project access denied' using errcode='42501'; end if;
  -- Save takes FOR UPDATE on the same row; the current pointer stays fixed until commit.
  perform 1 from public.calculations where id=p_calculation_id and organization_id=p_organization_id
    and project_id=p_project_id and roof_model_id is null
    and calculator_type='sheet_metal.profiles.flat-pattern' and current_revision_id=p_revision_id for share;
  if not found then raise exception 'current profile revision not found in destination project' using errcode='P0002'; end if;
  select r.input_snapshot,r.output_snapshot,r.revision_number into v_input,v_output,v_revision_number
    from public.calculation_revisions r where r.id=p_revision_id and r.calculation_id=p_calculation_id
      and r.organization_id=p_organization_id and r.input_schema_version='1.0.0'
      and r.calculator_implementation_version='1.0.0' and r.validation_status in ('user_provided','estimated','verified');
  if v_input is null or v_input->>'profileId' is distinct from p_calculation_id::text then
    raise exception 'authorized saved profile revision not found' using errcode='P0002';
  end if;
  if jsonb_typeof(v_input->'straights') is distinct from 'array' or jsonb_typeof(v_input->'bends') is distinct from 'array'
    or jsonb_array_length(v_input->'straights') <> jsonb_array_length(v_input->'bends')+1
    or jsonb_array_length(v_input->'straights') not between 1 and 51
    or jsonb_typeof(v_input->'thicknessMm') is distinct from 'number' then
    raise exception 'invalid saved profile geometry' using errcode='22023';
  end if;
  for v_straight in select value from jsonb_array_elements(v_input->'straights') loop
    if jsonb_typeof(v_straight->'tangentLengthMm') is distinct from 'number'
      or (v_straight->>'tangentLengthMm')::numeric not between 0.000001 and 1000000 then
      raise exception 'invalid saved straight length' using errcode='22023'; end if;
    v_width := v_width+(v_straight->>'tangentLengthMm')::numeric;
  end loop;
  for v_bend in select value from jsonb_array_elements(v_input->'bends') loop
    if jsonb_typeof(v_bend->'signedTurnDeg') is distinct from 'number'
      or jsonb_typeof(v_bend->'insideRadiusMm') is distinct from 'number'
      or abs((v_bend->>'signedTurnDeg')::numeric) < 0.000001
      or abs((v_bend->>'signedTurnDeg')::numeric) >= 180
      or (v_bend->>'insideRadiusMm')::numeric not between 0.000001 and 1000000 then
      raise exception 'invalid saved bend' using errcode='22023'; end if;
    case v_bend #>> '{allowance,mode}'
      when 'explicit_ba' then
        if jsonb_typeof(v_bend #> '{allowance,baMm}') is distinct from 'number'
          or (v_bend #>> '{allowance,baMm}')::numeric not between 0.000001 and 1000000 then
          raise exception 'invalid BA parameter' using errcode='22023'; end if;
        v_allowance := (v_bend #>> '{allowance,baMm}')::numeric;
      when 'k_factor' then
        if jsonb_typeof(v_bend #> '{allowance,kFactor}') is distinct from 'number'
          or (v_bend #>> '{allowance,kFactor}')::numeric not between 0 and 1 then
          raise exception 'invalid K parameter' using errcode='22023'; end if;
        v_allowance := pi()*abs((v_bend->>'signedTurnDeg')::numeric)/180
          *((v_bend->>'insideRadiusMm')::numeric+(v_input->>'thicknessMm')::numeric*(v_bend #>> '{allowance,kFactor}')::numeric);
      else raise exception 'A BA/K hiányzik; a terítékszélesség nem számítható.' using errcode='22023';
    end case;
    v_width := v_width+v_allowance;
  end loop;
  if v_width <= 0 or v_width > 1000000 or jsonb_typeof(v_output #> '{flatPattern,widthMm}') is distinct from 'number'
    or abs((v_output #>> '{flatPattern,widthMm}')::numeric-v_width)>0.000000001 then
    raise exception 'A mentett terítékszélesség hiányzik vagy nem egyezik a profilparaméterekkel.' using errcode='22023';
  end if;
  if jsonb_typeof(v_input->'formedRunLengthMm') is distinct from 'number'
    or jsonb_typeof(v_input->'pieceCount') is distinct from 'number' then
    raise exception 'A darabhossz vagy darabszám hiányzik; a nettó blankterület nem számítható.' using errcode='22023'; end if;
  v_length := (v_input->>'formedRunLengthMm')::numeric; v_count := (v_input->>'pieceCount')::numeric;
  if v_length not between 0.000001 and 1000000 or v_count not between 1 and 100000 or v_count<>trunc(v_count) then
    raise exception 'invalid manufacturing quantity input' using errcode='22023'; end if;
  v_area := v_width*v_length*v_count/1000000;
  if v_area<=0 or v_area>1000000000 or jsonb_typeof(v_output #> '{materialRequirement,totalNetBlankAreaSqM}') is distinct from 'number'
    or abs((v_output #>> '{materialRequirement,totalNetBlankAreaSqM}')::numeric-v_area)>0.000000001 then
    raise exception 'A mentett nettó blankterület hiányzik vagy eltér az újraszámolt értéktől.' using errcode='22023'; end if;
  if v_input #>> '{material,catalogVariantId}' is distinct from p_variant_id::text then
    raise exception 'catalog mapping differs from saved profile revision' using errcode='22023'; end if;
  select * into v_variant from public.material_variants where id=p_variant_id and organization_id=p_organization_id for share;
  if not found then raise exception 'catalog variant access denied' using errcode='42501'; end if;
  select * into v_product from public.material_products where id=v_variant.product_id and organization_id=p_organization_id
    and status='active' and category='sheet_metal' for share;
  if not found then raise exception 'inactive or incompatible product' using errcode='22023'; end if;
  if v_variant.purchasing_unit is distinct from 'square_meter' or v_variant.thickness_mm is distinct from (v_input->>'thicknessMm')::numeric
    or jsonb_typeof(v_variant.technical_specs->'profileMaterialSpec') is distinct from 'string'
    or nullif(trim(v_variant.technical_specs->>'profileMaterialSpec'),'') is null
    or v_variant.technical_specs->>'profileMaterialSpec' is distinct from v_input #>> '{material,materialSpec}'
    or nullif(trim(v_variant.source_name),'') is null then
    raise exception 'catalog material, thickness, unit or parameter source mismatch' using errcode='22023'; end if;
  v_payload := jsonb_build_object('calculationId',p_calculation_id,'revisionId',p_revision_id,'variantId',p_variant_id,'name',trim(p_name));
  insert into public.material_takeoffs(organization_id,project_id,source_calculation_id,source_calculation_revision_id,name,status,created_by,transfer_request_key,transfer_payload)
    values(p_organization_id,p_project_id,p_calculation_id,p_revision_id,trim(p_name),'draft',auth.uid(),p_request_key,v_payload)
    on conflict(organization_id,project_id,transfer_request_key) do nothing returning id into v_id;
  if v_id is null then
    select id,transfer_payload into v_id,v_existing from public.material_takeoffs
      where organization_id=p_organization_id and project_id=p_project_id and transfer_request_key=p_request_key;
    if v_id is null then raise exception 'idempotent draft not visible' using errcode='42501'; end if;
    if v_existing is distinct from v_payload then raise exception 'request key already used with different payload' using errcode='22023'; end if;
    return query select v_id,false; return;
  end if;
  select * into v_price from public.material_prices where organization_id=p_organization_id and variant_id=p_variant_id
    and purchasing_unit='square_meter' order by effective_date desc,recorded_at desc,id desc limit 1;
  v_snapshot := jsonb_build_object('sourceCalculationId',p_calculation_id,'sourceCalculationRevisionId',p_revision_id,
    'sourceRevisionNumber',v_revision_number,'quantityKind','preliminary_net_blank_area','quantity',v_area,'quantityUnit','square_meter',
    'flatPatternWidthMm',v_width,'pieceLengthMm',v_length,'pieceCount',v_count,
    'materialSpec',v_input #>> '{material,materialSpec}','thicknessMm',(v_input->>'thicknessMm')::numeric,
    'flatPatternMethod',case when jsonb_array_length(v_input->'bends')=0 then 'no_bends' when exists
      (select 1 from jsonb_array_elements(v_input->'bends') b where b.value #>> '{allowance,mode}'='k_factor') then
      case when exists(select 1 from jsonb_array_elements(v_input->'bends') b where b.value #>> '{allowance,mode}'='explicit_ba') then 'mixed' else 'k_factor' end
      else 'explicit_ba' end,
    'calculationClassification','PARAMETER_BASED_ESTIMATE','bendParameterSources',v_input->'bends',
    'savedCatalogSnapshot',v_input #> '{material,catalogSnapshot}',
    'compatibility','TECHNICALLY_MATCHED_PARAMETERS','compatibilityBasis','explicit material identity, thickness, square_meter and parameter source',
    'variantId',v_variant.id,'variantName',v_variant.name,'sku',v_variant.sku,'productId',v_product.id,
    'productName',v_product.name,'productCategory',v_product.category,'productCode',v_product.product_code,
    'manufacturerId',v_product.manufacturer_id,'purchasingUnit',v_variant.purchasing_unit,
    'technicalSpecs',v_variant.technical_specs,'productProvenance',v_product.data_provenance,
    'variantProvenance',v_variant.data_provenance,'sourceName',v_variant.source_name,'sourceUrl',v_variant.source_url,
    'sourceDate',v_variant.source_date,'sourceNotes',v_variant.source_notes);
  v_price_snapshot := case when v_price.id is null then null else jsonb_build_object('id',v_price.id,'amount',v_price.amount,
    'currency',v_price.currency,'purchasingUnit',v_price.purchasing_unit,'priceKind',v_price.price_kind,
    'effectiveDate',v_price.effective_date,'provenance',v_price.data_provenance,'sourceName',v_price.source_name,
    'sourceUrl',v_price.source_url,'sourceDate',v_price.source_date,'sourceNotes',v_price.source_notes) end;
  insert into public.material_takeoff_items(organization_id,takeoff_id,variant_id,estimation_method,measurement_source,
    selected_measurement_value,calculated_quantity,final_quantity,quantity_unit,material_snapshot,price_snapshot,data_provenance,warnings,created_by)
  values(p_organization_id,v_id,p_variant_id,'area','saved profile revision; width_mm * piece_length_mm * piece_count / 1000000',
    round(v_area,6),round(v_area,6),round(v_area,6),'square_meter',v_snapshot,v_price_snapshot,'estimated',
    jsonb_build_array('Előzetes, paraméteralapú nettó blankterület; nem beszerzési mennyiség, vágásterv vagy gyártási jóváhagyás.',
      'Az anyag- és vastagságparaméterek egyezése nem gyártói vagy gépkalibrációs igazolás.',
      case when v_price.id is null then 'Ehhez az m² variánshoz nincs rögzített ár.' else 'Az árverzió külön snapshotban szerepel.' end),auth.uid());
  return query select v_id,true;
end;
$$;
revoke all on function public.create_profile_takeoff_draft(uuid,uuid,uuid,uuid,uuid,text,uuid) from public,anon;
grant execute on function public.create_profile_takeoff_draft(uuid,uuid,uuid,uuid,uuid,text,uuid) to authenticated;
