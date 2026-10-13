-- Align SQL turn boundary with the established domain contract.
create or replace function public.validate_profile_material_requirement_revision()
returns trigger language plpgsql security invoker set search_path = public, pg_catalog as $$
declare
  v_calculator text;
  v_straight jsonb;
  v_bend jsonb;
  v_width numeric := 0;
  v_allowance numeric;
  v_incomplete boolean := false;
  v_stored_width numeric;
  v_length numeric;
  v_count numeric;
  v_area_each numeric;
  v_area_total numeric;
  v_variant_id uuid;
  v_product_id uuid;
  v_unit public.material_purchasing_unit;
  v_thickness numeric;
  v_spec text;
  v_source text;
  v_provenance public.material_data_provenance;
begin
  select calculator_type into v_calculator from public.calculations where id = new.calculation_id and organization_id = new.organization_id;
  if v_calculator is distinct from 'sheet_metal.profiles.flat-pattern' then return new; end if;
  if jsonb_typeof(new.input_snapshot -> 'straights') is distinct from 'array'
     or jsonb_typeof(new.input_snapshot -> 'bends') is distinct from 'array'
     or jsonb_array_length(new.input_snapshot -> 'straights') <> jsonb_array_length(new.input_snapshot -> 'bends') + 1
     or jsonb_array_length(new.input_snapshot -> 'bends') > 50 then
    raise exception 'Érvénytelen profillánc.' using errcode = '22023';
  end if;
  if jsonb_typeof(new.input_snapshot -> 'thicknessMm') is distinct from 'number'
     or (new.input_snapshot ->> 'thicknessMm')::numeric not between 0.000001 and 1000000 then
    raise exception 'Érvénytelen profilvastagság.' using errcode = '22023';
  end if;
  for v_straight in select value from jsonb_array_elements(new.input_snapshot -> 'straights') loop
    if jsonb_typeof(v_straight -> 'tangentLengthMm') is distinct from 'number'
       or (v_straight ->> 'tangentLengthMm')::numeric not between 0.000001 and 1000000 then
      raise exception 'Érvénytelen tangenshossz.' using errcode = '22023';
    end if;
    v_width := v_width + (v_straight ->> 'tangentLengthMm')::numeric;
  end loop;
  for v_bend in select value from jsonb_array_elements(new.input_snapshot -> 'bends') loop
    if jsonb_typeof(v_bend -> 'signedTurnDeg') is distinct from 'number'
       or (abs((v_bend ->> 'signedTurnDeg')::numeric) < 0.000001 or abs((v_bend ->> 'signedTurnDeg')::numeric) >= 180)
       or jsonb_typeof(v_bend -> 'insideRadiusMm') is distinct from 'number'
       or (v_bend ->> 'insideRadiusMm')::numeric not between 0.000001 and 1000000 then
      raise exception 'Érvénytelen hajtás.' using errcode = '22023';
    end if;
    case v_bend #>> '{allowance,mode}'
      when 'unknown' then v_incomplete := true; v_allowance := null;
      when 'explicit_ba' then
        if jsonb_typeof(v_bend #> '{allowance,baMm}') is distinct from 'number'
           or (v_bend #>> '{allowance,baMm}')::numeric not between 0.000001 and 1000000 then
          raise exception 'Érvénytelen BA.' using errcode = '22023';
        end if;
        v_allowance := (v_bend #>> '{allowance,baMm}')::numeric;
      when 'k_factor' then
        if jsonb_typeof(v_bend #> '{allowance,kFactor}') is distinct from 'number'
           or (v_bend #>> '{allowance,kFactor}')::numeric not between 0 and 1 then
          raise exception 'Érvénytelen K.' using errcode = '22023';
        end if;
        v_allowance := pi() * abs((v_bend ->> 'signedTurnDeg')::numeric) / 180
          * ((v_bend ->> 'insideRadiusMm')::numeric + (new.input_snapshot ->> 'thicknessMm')::numeric * (v_bend #>> '{allowance,kFactor}')::numeric);
      else raise exception 'Ismeretlen BA/K mód.' using errcode = '22023';
    end case;
    v_width := v_width + coalesce(v_allowance, 0);
  end loop;
  if not v_incomplete and v_width > 1000000 then raise exception 'Túl nagy terítékszélesség.' using errcode = '22023'; end if;
  if jsonb_typeof(new.output_snapshot #> '{flatPattern,widthMm}') not in ('number', 'null') then
    raise exception 'Hiányzó terítékszélesség.' using errcode = '22023';
  end if;
  v_stored_width := (new.output_snapshot #>> '{flatPattern,widthMm}')::numeric;
  if (v_incomplete and v_stored_width is not null)
     or (not v_incomplete and (v_stored_width is null or abs(v_stored_width - v_width) > 0.000000001)) then
    raise exception 'A tárolt terítékszélesség eltér a paraméterekből számolttól.' using errcode = '22023';
  end if;
  if new.input_snapshot ? 'formedRunLengthMm' then
    if jsonb_typeof(new.input_snapshot -> 'formedRunLengthMm') is distinct from 'number'
       or (new.input_snapshot ->> 'formedRunLengthMm')::numeric not between 0.000001 and 1000000 then
      raise exception 'Érvénytelen darabhossz.' using errcode = '22023';
    end if;
    v_length := (new.input_snapshot ->> 'formedRunLengthMm')::numeric;
  end if;
  if new.input_snapshot ? 'pieceCount' then
    if jsonb_typeof(new.input_snapshot -> 'pieceCount') is distinct from 'number'
       or (new.input_snapshot ->> 'pieceCount')::numeric not between 1 and 100000
       or (new.input_snapshot ->> 'pieceCount')::numeric <> trunc((new.input_snapshot ->> 'pieceCount')::numeric) then
      raise exception 'Érvénytelen darabszám.' using errcode = '22023';
    end if;
    v_count := (new.input_snapshot ->> 'pieceCount')::numeric;
  end if;
  if not v_incomplete and v_length is not null then
    v_area_each := v_width * v_length / 1000000;
    if v_count is not null then v_area_total := v_area_each * v_count; end if;
  end if;
  if coalesce(v_area_total, v_area_each, 0) > 1000000000 then
    raise exception 'Túl nagy nettó blankterület.' using errcode = '22023';
  end if;
  new.output_snapshot := jsonb_set(new.output_snapshot, '{materialRequirement}', jsonb_build_object(
    'lengthPerPieceMm', v_length, 'pieceCount', v_count,
    'netBlankAreaPerPieceSqM', v_area_each, 'totalNetBlankAreaSqM', v_area_total));

  if new.input_snapshot #>> '{material,catalogVariantId}' is not null then
    begin v_variant_id := (new.input_snapshot #>> '{material,catalogVariantId}')::uuid;
    exception when invalid_text_representation then raise exception 'Érvénytelen katalógusvariáns.' using errcode = '22023'; end;
    select v.product_id, v.purchasing_unit, v.thickness_mm, v.technical_specs ->> 'profileMaterialSpec',
           v.source_name, v.data_provenance
      into v_product_id, v_unit, v_thickness, v_spec, v_source, v_provenance
      from public.material_variants v join public.material_products p
        on p.id = v.product_id and p.organization_id = v.organization_id
      where v.id = v_variant_id and v.organization_id = new.organization_id
        and p.category = 'sheet_metal' and p.status = 'active'
      for share of v, p;
    if v_product_id is null then raise exception 'A katalógusvariáns nem érhető el ebben a műhelyben.' using errcode = '42501'; end if;
    if v_unit is distinct from 'square_meter' or v_thickness is null or v_thickness <= 0
       or v_thickness <> (new.input_snapshot ->> 'thicknessMm')::numeric
       or nullif(trim(v_spec), '') is null or nullif(trim(v_source), '') is null
       or v_spec is distinct from new.input_snapshot #>> '{material,materialSpec}' then
      raise exception 'A katalógus műszaki paraméterei nem egyeznek.' using errcode = '22023';
    end if;
    new.input_snapshot := jsonb_set(new.input_snapshot, '{material,catalogSnapshot}', jsonb_build_object(
      'productId', v_product_id, 'variantId', v_variant_id, 'materialSpec', v_spec,
      'thicknessMm', v_thickness, 'purchasingUnit', v_unit,
      'provenance', v_provenance, 'sourceName', v_source), true);
  end if;
  return new;
end;
$$;

