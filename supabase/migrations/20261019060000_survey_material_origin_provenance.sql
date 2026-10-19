-- F9.44.4: a survey measurement taken over from the verified roof geometry keeps its origin in the immutable material-list provenance
-- (measured | calculated | overridden + origin). Same signature and grants; only the measurement branch changes.
create or replace function public.save_workflow_material_list_from_survey_revision(
  p_organization_id uuid,
  p_survey_id uuid,
  p_survey_revision_id uuid,
  p_allow_stale_source boolean,
  p_name text,
  p_items jsonb,
  p_request_key uuid
)
returns table (list_id uuid, revision_id uuid, revision_number integer, version integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_survey public.field_surveys%rowtype;
  v_survey_revision public.field_survey_revisions%rowtype;
  v_existing_list public.material_preparation_lists%rowtype;
  v_saved record;
  v_item jsonb;
  v_ref jsonb;
  v_section jsonb;
  v_measurement jsonb;
  v_source_items jsonb := '[]'::jsonb;
  v_clean_items jsonb;
  v_item_id uuid;
  v_section_id uuid;
  v_measurement_id uuid;
  v_calculation_id uuid;
  v_calculation_revision_id uuid;
  v_section_type text;
  v_section_name text;
  v_semantic_type text;
  v_measurement_unit text;
  v_source_label text;
  v_source_value numeric;
  v_source_unit text;
  v_quantity_kind text;
  v_revision_number integer;
  v_output jsonb;
  v_provenance jsonb;
  v_existing_source public.material_preparation_survey_sources%rowtype;
  v_geometry public.field_survey_roof_geometry_sources%rowtype;
  v_retry_exists boolean := false;
  v_ls jsonb;
  v_edge numeric;
  v_origin jsonb;
  v_geo_found boolean;
begin
  if v_actor is null or not private.is_org_member(p_organization_id) then
    raise exception 'material list access denied' using errcode = '42501';
  end if;
  if p_survey_id is null or p_survey_revision_id is null or p_allow_stale_source is null
    or p_request_key is null or p_items is null or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) not between 1 and 200 then
    raise exception 'invalid survey material list payload' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_organization_id::text || ':' || v_actor::text || ':' || p_request_key::text, 0));

  select * into v_survey from public.field_surveys s
   where s.id = p_survey_id and s.organization_id = p_organization_id for share;
  if not found or not private.can_access_field_survey(p_survey_id, p_organization_id) then
    raise exception 'survey access denied' using errcode = '42501';
  end if;
  select * into v_survey_revision from public.field_survey_revisions r
   where r.id = p_survey_revision_id and r.survey_id = p_survey_id and r.organization_id = p_organization_id;
  if not found then raise exception 'survey revision access denied' using errcode = '42501'; end if;
  for v_item in select value from pg_catalog.jsonb_array_elements(p_items) loop
    if nullif(v_item->>'id', '') is null then raise exception 'invalid material item identity' using errcode = '22023'; end if;
    v_item_id := (v_item->>'id')::uuid;
    v_ref := v_item->'sourceRef';
    if v_ref is null or v_ref = 'null'::jsonb then continue; end if;
    if jsonb_typeof(v_ref) <> 'object' then raise exception 'invalid survey quantity provenance' using errcode = '22023'; end if;

    v_section_id := nullif(v_ref->>'sectionId', '')::uuid;
    v_section := null;
    v_section_type := v_survey_revision.work_type;
    v_section_name := v_survey_revision.work_type;
    if v_survey_revision.sections is not null then
      select section.value into v_section from pg_catalog.jsonb_array_elements(v_survey_revision.sections) section(value)
       where section.value->>'id' = v_section_id::text;
      if v_section is null then raise exception 'survey section access denied' using errcode = '42501'; end if;
      v_section_type := v_section->>'workType';
      v_section_name := v_section->>'name';
    elsif v_section_id <> p_survey_id then
      raise exception 'legacy survey section identity mismatch' using errcode = '42501';
    end if;

    if v_ref->>'type' = 'measurement' then
      if (v_ref - array['type','sectionId','measurementId']) <> '{}'::jsonb then
        raise exception 'invalid survey measurement reference' using errcode = '22023';
      end if;
      v_measurement_id := nullif(v_ref->>'measurementId', '')::uuid;
      if v_section is null then
        select measurement.value into v_measurement from pg_catalog.jsonb_array_elements(v_survey_revision.measurements) measurement(value)
         where measurement.value->>'id' = v_measurement_id::text;
      else
        select measurement.value into v_measurement from pg_catalog.jsonb_array_elements(v_section->'measurements') measurement(value)
         where measurement.value->>'id' = v_measurement_id::text;
      end if;
      v_semantic_type := v_measurement->>'semanticType';
      v_measurement_unit := v_measurement->>'unit';
      v_source_value := nullif(v_measurement->>'value', '')::numeric;
      if v_measurement is null or v_source_value is null or v_source_value <= 0
        or v_source_value <> round(v_source_value, 6) or v_measurement_unit <> 'm'
        or v_item->>'unit' <> 'linear_meter'
        or not ((v_section_type = 'gutter' and v_semantic_type = 'gutter_run_length')
          or (v_section_type = 'flashing' and v_semantic_type = 'flashing_run_length')) then
        raise exception 'unsupported or incomplete survey measurement source' using errcode = '22023';
      end if;
      v_source_label := v_measurement->>'label';
      v_source_unit := 'm';
      v_quantity_kind := 'measured';
      v_origin := null;
      -- F9.44.4: a value accepted from the roof geometry keeps that origin. It is "calculated" only while it still equals the
      -- verified, recorded roof edge of the same exact revision; any other value is a manual override. Nothing is promoted.
      v_ls := case when v_section is null then null else v_section->'lengthSource' end;
      if v_ls is not null and pg_catalog.jsonb_typeof(v_ls) = 'object' then
        select g.* into v_geometry from public.field_survey_roof_geometry_sources g
         where g.organization_id = p_organization_id and g.survey_id = p_survey_id and g.survey_revision_id = p_survey_revision_id
           and g.section_id = nullif(v_ls->>'roofSectionId', '')::uuid;
        v_geo_found := found;
        v_edge := null;
        if v_geo_found then
          v_edge := case v_geometry.geometry_type
            when 'roof.gable.quick' then case v_ls->>'role'
              when 'eave_total' then (v_geometry.output_snapshot #>> '{dimensions,eaveTotalMm}')::numeric
              when 'ridge' then (v_geometry.output_snapshot #>> '{dimensions,ridgeMm}')::numeric
              when 'verge_total' then (v_geometry.output_snapshot #>> '{dimensions,vergeTotalMm}')::numeric end
            when 'roof.gable' then case v_ls->>'role'
              when 'eave_total' then (v_geometry.output_snapshot #>> '{lengths,totalEaveEdgesMm}')::numeric
              when 'ridge' then (v_geometry.output_snapshot #>> '{lengths,ridgeLineMm}')::numeric
              when 'verge_total' then (v_geometry.output_snapshot #>> '{lengths,totalSlopingGableEdgesMm}')::numeric end
            else null end;
        end if;
        v_quantity_kind := case when v_edge is not null and abs(v_source_value * 1000 - v_edge) <= 0.5 then 'calculated' else 'overridden' end;
        v_origin := pg_catalog.jsonb_build_object('kind', 'verifiedRoofEdge', 'roofSectionId', v_ls->>'roofSectionId', 'role', v_ls->>'role',
          'geometrySourceId', case when v_geo_found then v_geometry.id end, 'calculatedValueMm', v_edge);
      end if;
      v_provenance := pg_catalog.jsonb_build_object(
        'itemId', v_item_id, 'sectionId', v_section_id, 'sourceKind', 'measurement',
        'sourceRef', v_ref, 'sourceLabel', v_source_label, 'sourceValue', v_source_value::text,
        'sourceUnit', v_source_unit, 'quantityKind', v_quantity_kind
      ) || case when v_origin is null then '{}'::jsonb else pg_catalog.jsonb_build_object('origin', v_origin) end;
    elsif v_ref->>'type' = 'calculation' then
      if (v_ref - array['type','sectionId','calculationId','calculationRevisionId']) <> '{}'::jsonb then
        raise exception 'invalid roof calculation reference' using errcode = '22023';
      end if;
      v_calculation_id := nullif(v_ref->>'calculationId', '')::uuid;
      v_calculation_revision_id := nullif(v_ref->>'calculationRevisionId', '')::uuid;
      select cr.output_snapshot, cr.revision_number, cr.output_snapshot #>> '{areas,combinedRoofM2}'
        into v_output, v_revision_number, v_source_label
        from public.field_survey_calculation_links l
        join public.calculations c on c.id = l.calculation_id and c.organization_id = l.organization_id
        join public.calculation_revisions cr on cr.id = l.calculation_revision_id and cr.calculation_id = l.calculation_id and cr.organization_id = l.organization_id
       where l.organization_id = p_organization_id and l.survey_id = p_survey_id
         and l.survey_revision_id = p_survey_revision_id and l.section_id = v_section_id
         and l.calculation_id = v_calculation_id and l.calculation_revision_id = v_calculation_revision_id
         and v_section_type = 'roof' and c.calculator_type = 'roof.gable'
         and cr.validation_status = 'verified' and cr.warnings = '[]'::jsonb;
      if v_output is null or coalesce(v_source_label, '') !~ '^[0-9]+(\.[0-9]+)?$' then
        raise exception 'verified roof calculation source is unavailable' using errcode = '42501';
      end if;
      v_source_value := v_source_label::numeric;
      if v_source_value <= 0 or v_item->>'unit' <> 'square_meter'
        or jsonb_typeof(v_output->'areas') <> 'object'
        or jsonb_typeof(v_output->'dimensions') <> 'object'
        or jsonb_typeof(v_output->'planes') <> 'array'
        or jsonb_typeof(v_output->'geometryNotes') <> 'array' then
        raise exception 'verified roof area or material unit is invalid' using errcode = '22023';
      end if;
      v_source_label := 'Ellenőrzött tetőfelület';
      v_source_unit := 'm²';
      v_quantity_kind := 'calculated';
      v_provenance := pg_catalog.jsonb_build_object(
        'itemId', v_item_id, 'sectionId', v_section_id, 'sourceKind', 'calculation',
        'sourceRef', v_ref, 'sourceLabel', v_source_label, 'sourceValue', v_source_value::text,
        'sourceUnit', v_source_unit, 'quantityKind', v_quantity_kind,
        'calculationRevisionNumber', v_revision_number
      );
    elsif v_ref->>'type' = 'surveyGeometry' then
      -- F9.42.6: roof area from the exact survey revision's own verified geometry source (no project / roof model).
      if (v_ref - array['type','sectionId','geometrySourceId']) <> '{}'::jsonb then
        raise exception 'invalid survey geometry reference' using errcode = '22023';
      end if;
      select g.* into v_geometry from public.field_survey_roof_geometry_sources g
       where g.id = nullif(v_ref->>'geometrySourceId', '')::uuid and g.organization_id = p_organization_id
         and g.survey_id = p_survey_id and g.survey_revision_id = p_survey_revision_id
         and g.section_id = v_section_id and v_section_type = 'roof';
      if not found then
        raise exception 'verified roof geometry source is unavailable' using errcode = '42501';
      end if;
      if v_item->>'unit' <> 'square_meter' then
        raise exception 'verified roof area material unit is invalid' using errcode = '22023';
      end if;
      v_source_value := v_geometry.combined_roof_m2;
      v_provenance := pg_catalog.jsonb_build_object(
        'itemId', v_item_id, 'sectionId', v_section_id, 'sourceKind', 'geometry',
        'sourceRef', v_ref, 'sourceLabel', 'Ellenőrzött tetőfelület', 'sourceValue', v_source_value::text,
        'sourceUnit', 'm²', 'quantityKind', 'calculated'
      );
    else
      raise exception 'unsupported survey quantity source' using errcode = '22023';
    end if;
    v_source_items := v_source_items || pg_catalog.jsonb_build_array(v_provenance);
  end loop;

  select coalesce(pg_catalog.jsonb_agg(item.value - array['sourceRef','sourceLabel','sourceUnit','quantityKind']), '[]'::jsonb)
    into v_clean_items from pg_catalog.jsonb_array_elements(p_items) item(value);

  -- A successful retry must retain the same exact survey revision and source rows.
  select * into v_existing_list from public.material_preparation_lists l
   where l.organization_id = p_organization_id and l.project_id is null
     and l.created_by = v_actor and l.creation_request_key = p_request_key for update;
  v_retry_exists := found;
  if v_retry_exists then
    select source.* into v_existing_source
      from public.material_preparation_revisions r
      join public.material_preparation_survey_sources source
        on source.material_revision_id = r.id and source.material_list_id = r.list_id and source.organization_id = r.organization_id
     where r.list_id = v_existing_list.id and r.organization_id = p_organization_id and r.revision_number = 1;
    if not found or v_existing_source.survey_id <> p_survey_id
      or v_existing_source.survey_revision_id <> p_survey_revision_id
      or v_existing_source.source_items_snapshot is distinct from v_source_items then
      raise exception 'request key reused with different survey source' using errcode = '40001';
    end if;
  elsif v_survey.version > v_survey_revision.version and not p_allow_stale_source then
    raise exception 'survey source revision is stale; explicit historical confirmation is required' using errcode = '40001';
  end if;

  for v_item in select value from pg_catalog.jsonb_array_elements(v_clean_items) loop
    if coalesce(v_item->>'kind', 'manual') = 'catalog' and nullif(v_item->>'priceId', '') is not null
      and not exists (
        select 1 from public.material_prices price
         where price.id = (v_item->>'priceId')::uuid and price.organization_id = p_organization_id
           and price.variant_id = (v_item->>'variantId')::uuid
           and price.purchasing_unit::text = v_item->>'unit'
           and price.currency = 'HUF' and price.data_provenance = 'verified'
      ) then
      raise exception 'survey material lists accept only verified HUF catalog prices' using errcode = '22023';
    end if;
  end loop;

  select * into v_saved from public.save_workflow_material_list_revision(
    p_organization_id, null, null, p_name, v_clean_items, 0, p_request_key
  );
  if not found then raise exception 'material list save returned no revision' using errcode = 'P0001'; end if;

  select * into v_existing_source from public.material_preparation_survey_sources source
   where source.material_revision_id = v_saved.revision_id;
  if found then
    if v_existing_source.survey_id <> p_survey_id or v_existing_source.survey_revision_id <> p_survey_revision_id
      or v_existing_source.source_items_snapshot is distinct from v_source_items then
      raise exception 'request key reused with different survey source' using errcode = '40001';
    end if;
  else
    insert into public.material_preparation_survey_sources(
      organization_id, material_list_id, material_revision_id, survey_id, survey_revision_id,
      survey_version, source_items_snapshot, created_by
    ) values (
      p_organization_id, v_saved.list_id, v_saved.revision_id, p_survey_id, p_survey_revision_id,
      v_survey_revision.version, v_source_items, v_actor
    );
  end if;
  return query select v_saved.list_id, v_saved.revision_id, v_saved.revision_number, v_saved.version;
end;
$$;

revoke all on function public.save_workflow_material_list_from_survey_revision(uuid, uuid, uuid, boolean, text, jsonb, uuid) from public, anon;
grant execute on function public.save_workflow_material_list_from_survey_revision(uuid, uuid, uuid, boolean, text, jsonb, uuid) to authenticated;
