-- F9.42.7: extend the independent, revision-aware survey roof geometry source (F9.42.6, gable-only) to the
-- other roof shapes already covered by the validated general engine (calculateRoofGeometry in roof-geometry.ts)
-- and already used, project-bound, by the multi-roof model/calculation flow (F9.10). Gable keeps its existing,
-- untouched path (save_survey_roof_geometry_source_secure / private.survey_roof_input_matches); this adds a
-- parallel writer for shed/hip/pyramid/halfHip/lShape/tShape into the same table, reusing the already-proven
-- private.survey_multi_roof_input_matches (20261015160700) that re-checks the input against the exact survey
-- revision section. No existing row, function or grant is modified.

alter table public.field_survey_roof_geometry_sources drop constraint field_survey_roof_geometry_sources_geometry_type_check;
alter table public.field_survey_roof_geometry_sources add constraint field_survey_roof_geometry_sources_geometry_type_check
  check (geometry_type = any (array['roof.gable','roof.geometry.shed','roof.geometry.hip','roof.geometry.pyramid','roof.geometry.halfHip','roof.geometry.lShape','roof.geometry.tShape']));

create function public.save_survey_multi_roof_geometry_source_secure(
  p_organization_id uuid, p_survey_id uuid, p_survey_revision_id uuid, p_section_id uuid,
  p_roof_type text, p_input jsonb, p_output jsonb, p_actor_id uuid
)
returns table(source_id uuid, combined_roof_m2 numeric, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_revision public.field_survey_revisions%rowtype;
  v_existing public.field_survey_roof_geometry_sources%rowtype;
  v_geometry_type text;
  v_area numeric;
  v_id uuid;
begin
  if p_actor_id is null or p_organization_id is null or p_survey_id is null or p_survey_revision_id is null or p_section_id is null
    or p_roof_type not in ('shed','hip','pyramid','halfHip','lShape','tShape')
    or pg_catalog.jsonb_typeof(p_input) is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_output) is distinct from 'object'
    or p_input->>'type' is distinct from p_roof_type
    or p_output->>'type' is distinct from p_roof_type
    or p_output->>'modelVersion' is distinct from '1.0.0'
    or pg_catalog.jsonb_typeof(p_output->'planes') is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_output->'edges') is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_output->'totalAreaMm2') is distinct from 'number' then
    raise exception 'Érvénytelen tetőgeometria-forrás.' using errcode = '22023';
  end if;
  v_area := (p_output->>'totalAreaMm2')::numeric / 1000000;
  if v_area <= 0 then raise exception 'A tetőfelület nem érvényes.' using errcode = '22023'; end if;
  v_geometry_type := 'roof.geometry.' || p_roof_type;

  perform 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = p_actor_id for share;
  if not found then raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501'; end if;
  perform 1 from public.field_surveys s where s.id = p_survey_id and s.organization_id = p_organization_id
    and (s.project_id is not null or s.created_by = p_actor_id);
  if not found then raise exception 'A felmérés nem érhető el.' using errcode = '42501'; end if;
  select * into v_revision from public.field_survey_revisions r
   where r.id = p_survey_revision_id and r.survey_id = p_survey_id and r.organization_id = p_organization_id;
  if not found then raise exception 'Pontos felmérésrevízió szükséges.' using errcode = '42501'; end if;
  if v_revision.sections is null or not private.survey_multi_roof_input_matches(v_revision.sections, p_section_id, p_input) then
    raise exception 'A tetőgeometria nem ebből a felmérésrevízióból és szakaszból származik.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_survey_revision_id::text || ':' || p_section_id::text || ':roof-geometry', 0));
  select * into v_existing from public.field_survey_roof_geometry_sources g
   where g.survey_revision_id = p_survey_revision_id and g.section_id = p_section_id;
  if found then
    if v_existing.input_snapshot is distinct from p_input or v_existing.geometry_type is distinct from v_geometry_type then
      raise exception 'A forrásrevízió geometriája már más bemenettel rögzített.' using errcode = '40001';
    end if;
    return query select v_existing.id, v_existing.combined_roof_m2, true;
    return;
  end if;
  insert into public.field_survey_roof_geometry_sources(organization_id, survey_id, survey_revision_id, section_id, geometry_type,
    input_snapshot, output_snapshot, combined_roof_m2, created_by)
  values (p_organization_id, p_survey_id, p_survey_revision_id, p_section_id, v_geometry_type, p_input, p_output, v_area, p_actor_id)
  returning id into v_id;
  return query select v_id, v_area, false;
end;
$$;
revoke all on function public.save_survey_multi_roof_geometry_source_secure(uuid,uuid,uuid,uuid,text,jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.save_survey_multi_roof_geometry_source_secure(uuid,uuid,uuid,uuid,text,jsonb,jsonb,uuid) to tetopro_covering_writer;
