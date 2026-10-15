-- F9.10: the existing gutter writer accepts only exact, current, selected eaves.
-- Keep the gable checks and extend the same trigger to the versioned multi-roof snapshot.
create or replace function private.validate_gutter_geometry_source()
returns trigger language plpgsql security invoker set search_path = public, pg_catalog as $$
declare
  v_calculation public.calculations%rowtype;
  v_run jsonb;
  v_ref jsonb;
  v_roof public.roof_models%rowtype;
  v_roof_calculation public.calculations%rowtype;
  v_source_length numeric;
  v_edge_id text;
  v_seen text[] := '{}';
  v_edge_count integer;
begin
  select * into v_calculation from public.calculations where id = new.calculation_id and organization_id = new.organization_id;
  if v_calculation.calculator_type is distinct from 'gutters.material-estimate' then return new; end if;
  for v_run in select value from jsonb_array_elements(coalesce(new.input_snapshot -> 'runs', '[]'::jsonb)) loop
    v_ref := v_run -> 'roofEdge';
    if pg_catalog.jsonb_typeof(v_ref) is distinct from 'object' then continue; end if;
    if v_calculation.project_id is null or v_calculation.ownership_scope is distinct from 'project' then
      raise exception 'Geometriai eresz csak projektkalkulációban használható.' using errcode = '22023';
    end if;
    v_edge_id := v_ref ->> 'edgeId';
    if v_edge_id is null or v_ref ->> 'roofModelId' is null or v_ref ->> 'calculationId' is null
       or v_ref ->> 'calculationRevisionId' is null or v_ref ->> 'suggestedLengthMm' is null
       or v_ref ->> 'lengthOverridden' is null then
      raise exception 'Hiányos geometriai ereszforrás.' using errcode = '22023';
    end if;
    if (v_ref ->> 'roofModelId' || ':' || v_edge_id) = any(v_seen) then
      raise exception 'Ugyanaz az ereszél nem választható kétszer.' using errcode = '22023';
    end if;
    v_seen := pg_catalog.array_append(v_seen, v_ref ->> 'roofModelId' || ':' || v_edge_id);
    select * into v_roof from public.roof_models
      where id = (v_ref ->> 'roofModelId')::uuid and organization_id = new.organization_id
        and project_id = v_calculation.project_id
        and current_revision_id = (v_ref ->> 'revisionId')::uuid for share;
    if not found then raise exception 'A tetőforrás nem aktuális vagy nem ehhez a projekthez tartozik.' using errcode = '40001'; end if;
    if not exists (select 1 from public.roof_model_revisions r where r.id = v_roof.current_revision_id
      and r.roof_model_id = v_roof.id and r.organization_id = new.organization_id and r.validation_status = 'verified') then
      raise exception 'A tetőforrás nincs ellenőrizve.' using errcode = '22023';
    end if;
    select * into v_roof_calculation from public.calculations
      where id = (v_ref ->> 'calculationId')::uuid and roof_model_id = v_roof.id
        and organization_id = new.organization_id and project_id = v_calculation.project_id
        and calculator_type = case when v_roof.roof_type = 'gable' then 'roof.gable' else 'roof.geometry.' || v_roof.roof_type end
        and current_revision_id = (v_ref ->> 'calculationRevisionId')::uuid for share;
    if not found then raise exception 'A tetőkalkuláció forrásrevíziója megváltozott.' using errcode = '40001'; end if;
    if v_roof.roof_type = 'gable' then
      if v_edge_id not in ('left-eave', 'right-eave') then
        raise exception 'Csak tényleges ereszél adható át.' using errcode = '22023';
      end if;
      select (r.output_snapshot #>> '{lengths,eachEaveEdgeMm}')::numeric into v_source_length
      from public.calculation_revisions r
      where r.id = v_roof_calculation.current_revision_id and r.calculation_id = v_roof_calculation.id
        and r.organization_id = new.organization_id and r.validation_status = 'verified'
        and exists (select 1 from public.calculation_dependencies d where d.downstream_calculation_revision_id = r.id
          and d.upstream_roof_model_revision_id = v_roof.current_revision_id);
    elsif v_roof.roof_type in ('shed','hip','pyramid','halfHip','lShape','tShape') then
      select count(*), max((e.value ->> 'lengthMm')::numeric) into v_edge_count, v_source_length
      from public.calculation_revisions r
      cross join lateral jsonb_array_elements(r.output_snapshot -> 'edges') e(value)
      where r.id = v_roof_calculation.current_revision_id and r.calculation_id = v_roof_calculation.id
        and r.organization_id = new.organization_id and r.validation_status = 'verified'
        and r.output_snapshot ->> 'type' = v_roof.roof_type and r.output_snapshot ->> 'modelVersion' = '1.0.0'
        and e.value ->> 'id' = v_edge_id and e.value ->> 'kind' = 'eave'
        and exists (select 1 from public.calculation_dependencies d where d.downstream_calculation_revision_id = r.id
          and d.upstream_roof_model_revision_id = v_roof.current_revision_id);
      if v_edge_count is distinct from 1 then raise exception 'A kijelölt ereszél nem egyértelmű.' using errcode = '22023'; end if;
    else
      raise exception 'Nem támogatott tetőforrás.' using errcode = '22023';
    end if;
    if v_source_length is null or v_source_length <= 0
       or v_source_length is distinct from (v_ref ->> 'suggestedLengthMm')::numeric
       or pg_catalog.jsonb_typeof(v_ref -> 'lengthOverridden') is distinct from 'boolean'
       or pg_catalog.jsonb_typeof(v_run -> 'lengthMm') is distinct from 'number'
       or (v_run ->> 'lengthMm')::numeric <= 0
       or ((v_ref ->> 'lengthOverridden')::boolean is false and (v_run ->> 'lengthMm')::numeric is distinct from v_source_length)
       or ((v_ref ->> 'lengthOverridden')::boolean is true and (v_run ->> 'lengthMm')::numeric = v_source_length) then
      raise exception 'Az ereszhossz vagy a felülírás nem egyezik a forrássnapshot-tal.' using errcode = '22023';
    end if;
  end loop;
  return new;
end;$$;
