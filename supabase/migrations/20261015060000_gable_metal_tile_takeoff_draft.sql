-- F9.7.7.4c.1: one immutable piece-count draft from an exact saved metal-tile revision.
-- Execute is limited to the existing server-only covering writer login.

create or replace function public.create_gable_metal_tile_takeoff_draft(
  p_organization_id uuid, p_project_id uuid, p_calculation_id uuid, p_revision_id uuid,
  p_variant_id uuid, p_name text, p_request_key uuid, p_actor_id uuid
)
returns table(takeoff_id uuid, takeoff_item_id uuid, draft_created boolean, stale_source boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_input jsonb; v_output jsonb; v_covering jsonb; v_product_input jsonb;
  v_roof_model_id uuid; v_roof_revision_id uuid; v_geometry_calculation_id uuid; v_geometry_revision_id uuid;
  v_source_revision_number integer; v_source_roof_revision_number integer; v_current_roof_revision_id uuid;
  v_roof_stale boolean; v_columns numeric; v_rows numeric; v_count numeric; v_quantity numeric;
  v_physical_length numeric; v_effective_length numeric; v_nominal_width numeric; v_effective_width numeric;
  v_required_length numeric; v_overlap numeric; v_module_base numeric; v_module_pitch numeric; v_module_count numeric;
  v_variant public.material_variants%rowtype; v_product public.material_products%rowtype;
  v_snapshot jsonb; v_payload jsonb; v_existing_payload jsonb; v_takeoff_id uuid; v_item_id uuid;
  i integer;
begin
  if p_actor_id is null or p_organization_id is null or p_project_id is null or p_calculation_id is null
     or p_revision_id is null or p_variant_id is null or p_request_key is null or p_name is null
     or pg_catalog.char_length(pg_catalog.btrim(p_name)) not between 1 and 200 then
    raise exception 'Érvényes forrás, anyagváltozat, név és műveletazonosító szükséges.' using errcode='22023';
  end if;
  perform 1 from public.organization_members om where om.organization_id=p_organization_id and om.user_id=p_actor_id for share;
  if not found then raise exception 'A műhelyhez nincs hozzáférésed.' using errcode='42501'; end if;
  perform 1 from public.projects p where p.id=p_project_id and p.organization_id=p_organization_id for share;
  if not found then raise exception 'A projekt nem érhető el.' using errcode='42501'; end if;

  select c.roof_model_id, cr.input_snapshot, cr.output_snapshot, cr.revision_number,
         rm.current_revision_id, rmr.id, rmr.revision_number
    into v_roof_model_id, v_input, v_output, v_source_revision_number,
         v_current_roof_revision_id, v_roof_revision_id, v_source_roof_revision_number
  from public.calculations c
  join public.calculation_revisions cr on cr.id=p_revision_id and cr.calculation_id=c.id and cr.organization_id=c.organization_id
  join public.roof_models rm on rm.id=c.roof_model_id and rm.project_id=c.project_id and rm.organization_id=c.organization_id
  join public.roof_model_revisions rmr on rmr.id=(cr.input_snapshot #>> '{source,roofModelRevisionId}')::uuid
    and rmr.roof_model_id=rm.id and rmr.organization_id=rm.organization_id
  where c.id=p_calculation_id and c.organization_id=p_organization_id and c.project_id=p_project_id
    and c.ownership_scope='project' and c.calculator_type='roof.gable.metal-tile-covering'
    and cr.input_schema_version='1.0.0' and cr.calculator_implementation_version='1.0.0'
    and cr.validation_status='estimated' and cr.input_snapshot->>'calculatorType'='roof.gable.metal-tile-covering'
    and cr.input_snapshot->>'scope'='project' and cr.input_snapshot #>> '{source,mode}'='project'
    and cr.input_snapshot #>> '{source,projectId}'=p_project_id::text
    and cr.input_snapshot #>> '{source,roofModelId}'=rm.id::text
    and cr.input_snapshot #>> '{source,geometryInput}' is not null
    and cr.input_snapshot #>> '{source,geometryCalculationId}' is not null
    and cr.input_snapshot #>> '{source,geometryCalculationRevisionId}' is not null
    and rmr.validation_status='verified' and rmr.schema_version='1.0.0'
    and cr.input_snapshot #> '{source,geometryInput}'=rmr.input_data
  for share of c,cr,rm,rmr;
  if not found then raise exception 'A megadott projekt-cserepeslemez-revízió vagy pontos tetőforrás nem érhető el.' using errcode='P0002'; end if;

  v_geometry_calculation_id := (v_input #>> '{source,geometryCalculationId}')::uuid;
  v_geometry_revision_id := (v_input #>> '{source,geometryCalculationRevisionId}')::uuid;
  if not exists (
    select 1 from public.calculation_dependencies d
    join public.calculation_revisions gr on gr.id=v_geometry_revision_id and gr.organization_id=d.organization_id
    join public.calculations gc on gc.id=gr.calculation_id and gc.organization_id=gr.organization_id
    where d.organization_id=p_organization_id and d.downstream_calculation_revision_id=v_geometry_revision_id
      and d.upstream_roof_model_revision_id=v_roof_revision_id and d.dependency_type='roof_model_input'
      and gc.id=v_geometry_calculation_id and gc.project_id=p_project_id and gc.roof_model_id=v_roof_model_id
      and gc.calculator_type='roof.gable' and gr.validation_status='verified'
      and gr.input_schema_version='1.0.0' and gr.calculator_implementation_version='1.0.0'
  ) then raise exception 'A cserepeslemez-változat pontos tetőfüggősége nem egyezik.' using errcode='42501'; end if;

  v_covering := v_output->'covering'; v_product_input := v_input->'productInput';
  if pg_catalog.jsonb_typeof(v_input) is distinct from 'object'
     or pg_catalog.jsonb_typeof(v_product_input) is distinct from 'object'
     or pg_catalog.jsonb_typeof(v_covering) is distinct from 'object'
     or v_covering->>'status' is distinct from 'VALID'
     or pg_catalog.jsonb_typeof(v_covering->'planeCount') is distinct from 'number'
     or pg_catalog.jsonb_typeof(v_covering->'columnsPerPlane') is distinct from 'number'
     or pg_catalog.jsonb_typeof(v_covering->'rowsPerPlane') is distinct from 'number'
     or pg_catalog.jsonb_typeof(v_covering->'totalSheetCount') is distinct from 'number'
     or pg_catalog.jsonb_typeof(v_covering->'requiredCoveringLengthMm') is distinct from 'number'
     or pg_catalog.jsonb_typeof(v_product_input->'physicalSheetLengthMm') is distinct from 'number'
     or pg_catalog.jsonb_typeof(v_product_input->'effectiveCoveringLengthMm') is distinct from 'number'
     or pg_catalog.jsonb_typeof(v_product_input->'nominalSheetWidthMm') is distinct from 'number'
     or pg_catalog.jsonb_typeof(v_product_input->'effectiveCoveringWidthMm') is distinct from 'number'
     or v_product_input->>'lengthCompatibilityConfirmed' is distinct from 'true'
     or nullif(pg_catalog.btrim(v_product_input->>'lengthDataSource'),'') is null then
    raise exception 'A mentett cserepeslemez-változat nem tartalmaz teljes, érvényes kiosztást.' using errcode='22023';
  end if;
  v_columns := (v_covering->>'columnsPerPlane')::numeric; v_rows := (v_covering->>'rowsPerPlane')::numeric;
  v_count := (v_covering->>'planeCount')::numeric; v_quantity := (v_covering->>'totalSheetCount')::numeric;
  v_physical_length := (v_product_input->>'physicalSheetLengthMm')::numeric;
  v_effective_length := (v_product_input->>'effectiveCoveringLengthMm')::numeric;
  v_nominal_width := (v_product_input->>'nominalSheetWidthMm')::numeric;
  v_effective_width := (v_product_input->>'effectiveCoveringWidthMm')::numeric;
  v_required_length := (v_covering->>'requiredCoveringLengthMm')::numeric;
  v_overlap := nullif(v_product_input->>'longitudinalOverlapMm','')::numeric;
  if v_count<>2 or v_columns<=0 or v_columns<>pg_catalog.trunc(v_columns) or v_rows<>1
     or v_quantity<>v_columns*v_count or v_quantity<>pg_catalog.trunc(v_quantity)
     or v_physical_length<=0 or v_effective_length<=0 or v_effective_length>v_physical_length
     or v_effective_length<v_required_length or v_nominal_width<=0 or v_effective_width<=0
     or v_effective_width>v_nominal_width or coalesce(v_overlap,0)<>0 then
    raise exception 'Nem támogatott kiosztás: csak egy sor/sík, teljes hossz, érvényes fizikai és fedési méret, átlapolás nélkül adható át.' using errcode='22023';
  end if;
  if v_product_input->>'isModular'='true' then
    if pg_catalog.jsonb_typeof(v_product_input->'moduleBaseLengthMm') is distinct from 'number'
       or pg_catalog.jsonb_typeof(v_product_input->'modulePitchMm') is distinct from 'number'
       or pg_catalog.jsonb_typeof(v_product_input->'moduleCount') is distinct from 'number' then
      raise exception 'A moduláris termék modulszerződése hiányos.' using errcode='22023';
    end if;
    v_module_base := (v_product_input->>'moduleBaseLengthMm')::numeric;
    v_module_pitch := (v_product_input->>'modulePitchMm')::numeric;
    v_module_count := (v_product_input->>'moduleCount')::numeric;
    if v_module_base<=0 or v_module_pitch<=0 or v_module_count<=0 or v_module_count<>pg_catalog.trunc(v_module_count)
       or abs(v_module_base+v_module_count*v_module_pitch-v_effective_length)>0.000001
       or pg_catalog.jsonb_array_length(coalesce(v_covering->'moduleDivisionPositionsMm','[]'::jsonb))<>v_module_count then
      raise exception 'A moduladat nem egyezik a tényleges fedési hosszal vagy osztásokkal.' using errcode='22023';
    end if;
    for i in 0..v_module_count::integer-1 loop
      if abs((v_covering->'moduleDivisionPositionsMm'->>i)::numeric-(v_module_base+i*v_module_pitch))>0.000001 then
        raise exception 'A mentett modul-osztáslista nem reprodukálható.' using errcode='22023';
      end if;
    end loop;
  elsif (v_product_input->'moduleBaseLengthMm' is not null and v_product_input->'moduleBaseLengthMm'<>'null'::jsonb)
     or (v_product_input->'modulePitchMm' is not null and v_product_input->'modulePitchMm'<>'null'::jsonb)
     or (v_product_input->'moduleCount' is not null and v_product_input->'moduleCount'<>'null'::jsonb) then
    raise exception 'Nem moduláris terméknél moduladat nem adható meg.' using errcode='22023';
  end if;

  select mv.* into v_variant from public.material_variants mv where mv.id=p_variant_id and mv.organization_id=p_organization_id for share;
  if not found then raise exception 'A kiválasztott anyagváltozat nem érhető el ebben a műhelyben.' using errcode='42501'; end if;
  select mp.* into v_product from public.material_products mp where mp.id=v_variant.product_id and mp.organization_id=p_organization_id for share;
  if not found or v_product.status<>'active' or v_product.category not in ('roof_covering','sheet_metal') or v_variant.purchasing_unit<>'piece' then
    raise exception 'Aktív tetőfedés/lemez termék és db egységű változat szükséges.' using errcode='22023';
  end if;
  if (v_variant.nominal_width_mm is not null and v_variant.nominal_width_mm<>v_nominal_width)
     or (v_variant.effective_width_mm is not null and v_variant.effective_width_mm<>v_effective_width)
     or (v_variant.length_mm is not null and v_variant.length_mm<>v_physical_length) then
    raise exception 'A katalógusméret eltér a mentett fizikai lemezmérettől.' using errcode='22023';
  end if;
  if v_product_input->>'isModular'='true' then
    if (v_variant.technical_specs ? 'moduleBaseLengthMm' and (v_variant.technical_specs->>'moduleBaseLengthMm')::numeric<>v_module_base)
       or (v_variant.technical_specs ? 'modulePitchMm' and (v_variant.technical_specs->>'modulePitchMm')::numeric<>v_module_pitch)
       or (v_variant.technical_specs ? 'moduleCount' and (v_variant.technical_specs->>'moduleCount')::numeric<>v_module_count) then
      raise exception 'A katalógus moduladata eltér a mentett modulértéktől.' using errcode='22023';
    end if;
  end if;

  v_roof_stale := v_current_roof_revision_id is distinct from v_roof_revision_id;
  v_payload := pg_catalog.jsonb_build_object('conversion','gable_metal_tile_covering_piece_count',
    'calculationId',p_calculation_id,'revisionId',p_revision_id,'variantId',p_variant_id,'name',pg_catalog.btrim(p_name));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text||':gable-metal-tile-takeoff:'||p_request_key::text,0));
  insert into public.material_takeoffs(organization_id,project_id,source_calculation_id,source_calculation_revision_id,
    source_roof_model_id,source_roof_model_revision_id,name,status,created_by,transfer_request_key,transfer_payload)
  values(p_organization_id,p_project_id,p_calculation_id,p_revision_id,v_roof_model_id,v_roof_revision_id,
    pg_catalog.btrim(p_name),'draft',p_actor_id,p_request_key,v_payload)
  on conflict(organization_id,project_id,transfer_request_key) do nothing returning id into v_takeoff_id;
  if v_takeoff_id is null then
    select t.id,t.transfer_payload into v_takeoff_id,v_existing_payload from public.material_takeoffs t
      where t.organization_id=p_organization_id and t.project_id=p_project_id and t.transfer_request_key=p_request_key for share;
    if v_takeoff_id is null then raise exception 'Az ismételt átadás nem érhető el.' using errcode='42501'; end if;
    if v_existing_payload is distinct from v_payload then raise exception 'A műveletazonosítót más átadáshoz használták.' using errcode='22023'; end if;
    select i.id into v_item_id from public.material_takeoff_items i where i.organization_id=p_organization_id and i.takeoff_id=v_takeoff_id;
    if v_item_id is null then raise exception 'Az átadási piszkozat tétele nem érhető el.' using errcode='P0002'; end if;
    return query select v_takeoff_id,v_item_id,false,v_roof_stale; return;
  end if;

  v_snapshot := pg_catalog.jsonb_build_object(
    'transferKind','gable_metal_tile_covering_piece_count','associationKind','user_selected_catalog_variant',
    'catalogCompatibility',case when v_variant.nominal_width_mm=v_nominal_width and v_variant.effective_width_mm=v_effective_width and v_variant.length_mm=v_physical_length
      then 'catalog_dimensions_match_user_input_unverified_manufacturer' else 'user_provided_catalog_association_dimensions_incomplete' end,
    'sourceCalculationId',p_calculation_id,'sourceCalculationRevisionId',p_revision_id,'sourceCalculationRevisionNumber',v_source_revision_number,
    'sourceRoofModelId',v_roof_model_id,'sourceRoofModelRevisionId',v_roof_revision_id,'sourceRoofModelRevisionNumber',v_source_roof_revision_number,
    'sourceGeometryCalculationId',v_geometry_calculation_id,'sourceGeometryCalculationRevisionId',v_geometry_revision_id,
    'sourceGeometryStaleAtTransfer',v_roof_stale,'sourceInputSnapshot',v_input,'sourceOutputSnapshot',v_output,
    'planeCount',v_count,'columnsPerPlane',v_columns,'rowsPerPlane',v_rows,'sheetCount',v_quantity,'quantityUnit','piece',
    'requiredCoveringLengthMm',v_required_length,'physicalSheetLengthMm',v_physical_length,'effectiveCoveringLengthMm',v_effective_length,
    'nominalWidthMm',v_nominal_width,'effectiveWidthMm',v_effective_width,'longitudinalOverlapMm',coalesce(v_overlap,0),
    'isModular',(v_product_input->>'isModular')::boolean,'moduleBaseLengthMm',v_product_input->'moduleBaseLengthMm',
    'modulePitchMm',v_product_input->'modulePitchMm','moduleCount',v_product_input->'moduleCount',
    'moduleDivisionPositionsMm',v_covering->'moduleDivisionPositionsMm',
    'lengthCompatibility',case when v_product_input->>'lengthCompatibilityConfirmed'='true' then 'user_confirmed' else 'unverified' end,
    'lengthDataSource',v_product_input->'lengthDataSource',
    'sourceProvenance', (select cr.data_provenance from public.calculation_revisions cr where cr.id=p_revision_id and cr.organization_id=p_organization_id),
    'catalogSnapshot',pg_catalog.jsonb_build_object('variantId',v_variant.id,'variantName',v_variant.name,'sku',v_variant.sku,
      'productId',v_product.id,'productName',v_product.name,'productCategory',v_product.category,'productCode',v_product.product_code,
      'manufacturerId',v_product.manufacturer_id,'purchasingUnit',v_variant.purchasing_unit,'nominalWidthMm',v_variant.nominal_width_mm,
      'effectiveWidthMm',v_variant.effective_width_mm,'lengthMm',v_variant.length_mm,'technicalSpecs',v_variant.technical_specs,
      'productProvenance',v_product.data_provenance,'variantProvenance',v_variant.data_provenance,
      'sourceName',v_variant.source_name,'sourceUrl',v_variant.source_url,'sourceDate',v_variant.source_date,'sourceNotes',v_variant.source_notes));
  insert into public.material_takeoff_items(organization_id,takeoff_id,variant_id,estimation_method,measurement_source,
    selected_measurement_value,calculated_quantity,final_quantity,quantity_unit,material_snapshot,price_snapshot,data_provenance,warnings,created_by)
  values(p_organization_id,v_takeoff_id,p_variant_id,'calculated','Saved metal-tile covering revision · totalSheetCount',
    v_quantity,v_quantity,v_quantity,'piece',v_snapshot,null,'user_provided',pg_catalog.jsonb_build_array(
      'A darabszám a mentett, szerver által újraszámolt cserepeslemez-változatból származik; rendelés előtt ellenőrizendő.',
      'A katalógus-hozzárendelés felhasználói kapcsolat; nem gyártói kompatibilitási igazolás.',
      case when v_roof_stale then 'Az alapul szolgáló tetőrevízió elavult; a történeti forrás változatlan.' else 'A tetőforrás az átadáskor aktuális volt.' end,
      'Ehhez az anyagváltozathoz árverziót nem rendeltünk.'),p_actor_id) returning id into v_item_id;
  return query select v_takeoff_id,v_item_id,true,v_roof_stale;
end;
$$;

revoke all on function public.create_gable_metal_tile_takeoff_draft(uuid,uuid,uuid,uuid,uuid,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_gable_metal_tile_takeoff_draft(uuid,uuid,uuid,uuid,uuid,text,uuid,uuid) to tetopro_covering_writer;

create or replace function private.prevent_gable_metal_tile_takeoff_item_update()
returns trigger language plpgsql security invoker set search_path=public,pg_catalog as $$
begin
  if exists(select 1 from public.material_takeoffs t join public.calculations c on c.id=t.source_calculation_id and c.organization_id=t.organization_id
    where t.id=old.takeoff_id and t.organization_id=old.organization_id and t.transfer_request_key is not null
      and c.calculator_type='roof.gable.metal-tile-covering') then
    raise exception 'metal tile covering transfer item snapshot is immutable' using errcode='P0001';
  end if;
  return new;
end;
$$;
create trigger material_takeoff_items_gable_metal_tile_snapshot_immutable
before update on public.material_takeoff_items for each row execute function private.prevent_gable_metal_tile_takeoff_item_update();
comment on function public.create_gable_metal_tile_takeoff_draft(uuid,uuid,uuid,uuid,uuid,text,uuid,uuid)
  is 'Creates one idempotent project draft from an exact saved metal-tile revision using the restricted server writer.';
