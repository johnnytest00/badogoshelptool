-- F9.44.2: verified, immutable roof-geometry source for quick gable measurements. The database recomputes the
-- input (eave-direction run, sloped length per plane, explicit plane-match decision) and the area from the exact
-- survey revision section; nothing is inferred (no pitch, rise or overhang). Same table and uniqueness as the
-- other roof sources, so the existing material-list RPC (surveyGeometry reference) works unchanged.
-- No existing row, function or grant is modified.
alter table public.field_survey_roof_geometry_sources drop constraint field_survey_roof_geometry_sources_geometry_type_check;
alter table public.field_survey_roof_geometry_sources add constraint field_survey_roof_geometry_sources_geometry_type_check
  check (geometry_type = any (array['roof.gable','roof.gable.quick','roof.geometry.shed','roof.geometry.hip','roof.geometry.pyramid','roof.geometry.halfHip','roof.geometry.lShape','roof.geometry.tShape']));

create function private.survey_quick_gable_input(p_sections jsonb, p_section_id uuid)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  s jsonb; m jsonb; v numeric; mm numeric;
  v_eave numeric; v_a numeric; v_b numeric; v_b_present boolean := false;
  n_eave int := 0; n_a int := 0; n_b int := 0; v_match jsonb;
begin
  select e.value into s from pg_catalog.jsonb_array_elements(p_sections) e(value) where e.value->>'id' = p_section_id::text;
  if s is null or s->>'workType' <> 'roof' or s->>'roofType' is distinct from 'gable' or s->>'roofMeasurementMode' is distinct from 'quick' then return null; end if;
  v_match := s->'quickPlanesMatch';
  if v_match is null or pg_catalog.jsonb_typeof(v_match) <> 'boolean' then return null; end if;
  for m in select e.value from pg_catalog.jsonb_array_elements(s->'measurements') e(value) where e.value->>'semanticType' in ('roof_eave_run','roof_plane_slope_a','roof_plane_slope_b') loop
    if pg_catalog.jsonb_typeof(m->'value') <> 'number' then continue; end if;
    if m->>'unit' not in ('m','mm') then return null; end if;
    v := (m->>'value')::numeric;
    mm := case when m->>'unit' = 'm' then v * 1000 else v end;
    if mm <= 0 or mm > 200000 or mm <> pg_catalog.round(mm) then return null; end if;
    if m->>'semanticType' = 'roof_eave_run' then n_eave := n_eave + 1; v_eave := mm;
    elsif m->>'semanticType' = 'roof_plane_slope_a' then n_a := n_a + 1; v_a := mm;
    else n_b := n_b + 1; v_b := mm; v_b_present := true; end if;
  end loop;
  if n_eave <> 1 or n_a <> 1 or n_b > 1 then return null; end if;
  if (v_match::text)::boolean then
    if v_b_present and v_b <> v_a then return null; end if;
    v_b := v_a;
  elsif not v_b_present then return null;
  end if;
  return pg_catalog.jsonb_build_object('mode', 'quick', 'eaveRunMm', v_eave, 'slopeAMm', v_a, 'slopeBMm', v_b, 'planesMatch', (v_match::text)::boolean);
end;
$$;

create function public.save_survey_quick_gable_geometry_source_secure(
  p_organization_id uuid, p_survey_id uuid, p_survey_revision_id uuid, p_section_id uuid,
  p_input jsonb, p_output jsonb, p_actor_id uuid
)
returns table(source_id uuid, combined_roof_m2 numeric, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_revision public.field_survey_revisions%rowtype;
  v_existing public.field_survey_roof_geometry_sources%rowtype;
  v_expected jsonb;
  v_area numeric;
  v_id uuid;
begin
  if p_actor_id is null or p_organization_id is null or p_survey_id is null or p_survey_revision_id is null or p_section_id is null
    or pg_catalog.jsonb_typeof(p_input) is distinct from 'object' or pg_catalog.jsonb_typeof(p_output) is distinct from 'object' then
    raise exception 'Érvénytelen tetőgeometria-forrás.' using errcode = '22023';
  end if;
  perform 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = p_actor_id for share;
  if not found then raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501'; end if;
  perform 1 from public.field_surveys s where s.id = p_survey_id and s.organization_id = p_organization_id
    and (s.project_id is not null or s.created_by = p_actor_id);
  if not found then raise exception 'A felmérés nem érhető el.' using errcode = '42501'; end if;
  select * into v_revision from public.field_survey_revisions r
   where r.id = p_survey_revision_id and r.survey_id = p_survey_id and r.organization_id = p_organization_id;
  if not found then raise exception 'Pontos felmérésrevízió szükséges.' using errcode = '42501'; end if;
  v_expected := case when v_revision.sections is null then null else private.survey_quick_gable_input(v_revision.sections, p_section_id) end;
  if v_expected is null or v_expected is distinct from p_input then
    raise exception 'A gyors tetőmérés nem ebből a felmérésrevízióból és szakaszból származik, vagy hiányos.' using errcode = '22023';
  end if;
  -- Area is recomputed here, never trusted from the caller: both planes are rectangles (eave run × sloped length).
  v_area := (v_expected->>'eaveRunMm')::numeric * ((v_expected->>'slopeAMm')::numeric + (v_expected->>'slopeBMm')::numeric) / 1000000;
  if v_area <= 0 or (p_output #>> '{areas,combinedRoofM2}') is null or (p_output #>> '{areas,combinedRoofM2}')::numeric is distinct from v_area then
    raise exception 'A tetőfelület nem egyezik a mért méretekkel.' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_survey_revision_id::text || ':' || p_section_id::text || ':roof-geometry', 0));
  select * into v_existing from public.field_survey_roof_geometry_sources g
   where g.survey_revision_id = p_survey_revision_id and g.section_id = p_section_id;
  if found then
    if v_existing.input_snapshot is distinct from p_input or v_existing.geometry_type <> 'roof.gable.quick' then
      raise exception 'A forrásrevízió geometriája már más bemenettel rögzített.' using errcode = '40001';
    end if;
    return query select v_existing.id, v_existing.combined_roof_m2, true;
    return;
  end if;
  insert into public.field_survey_roof_geometry_sources(organization_id, survey_id, survey_revision_id, section_id, geometry_type,
    input_snapshot, output_snapshot, combined_roof_m2, created_by)
  values (p_organization_id, p_survey_id, p_survey_revision_id, p_section_id, 'roof.gable.quick', p_input, p_output, v_area, p_actor_id)
  returning id into v_id;
  return query select v_id, v_area, false;
end;
$$;
revoke all on function public.save_survey_quick_gable_geometry_source_secure(uuid,uuid,uuid,uuid,jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.save_survey_quick_gable_geometry_source_secure(uuid,uuid,uuid,uuid,jsonb,jsonb,uuid) to tetopro_covering_writer;
