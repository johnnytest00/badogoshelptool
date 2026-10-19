-- F9.45.1: gyors félnyeregtető-mérés (eresz menti hossz × lejtő menti hossz). A mérési mód mostantól félnyeregtetőnél is
-- menthető (quick/building), és a szakasz ellenőrzött, immutable geometriaforrást kap: az adatbázis a revíziószakaszból
-- maga számolja újra a bemenetet és a területet. Meglévő rekord, revízió és függvény-jogosultság nem íródik át.
create or replace function private.valid_field_survey_sections(p_sections jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare s jsonb; ids text[] := '{}'; photo text; timber jsonb; underlay jsonb; parameter record;
begin
 if jsonb_typeof(p_sections) is distinct from 'array' or jsonb_array_length(p_sections) not between 1 and 30 then return false; end if;
 for s in select jsonb_array_elements(p_sections) loop
  if jsonb_typeof(s) is distinct from 'object' or not(s ?& array['id','name','workType','measurements','notes','photoIds'])
   or s-array['id','name','workType','measurements','notes','photoIds','roofType','roofTimberParameters','roofUnderlayParameters','roofMeasurementMode','quickPlanesMatch','elementKind','lengthSource'] <> '{}'::jsonb
   or jsonb_typeof(s->'id') is distinct from 'string' or (s->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   or (s->>'id')=any(ids) or jsonb_typeof(s->'name') is distinct from 'string' or char_length(btrim(s->>'name')) not between 1 and 120
   or coalesce(s->>'workType','') not in ('roof','gutter','flashing','other')
   or (s ? 'roofType' and (s->>'workType'<>'roof' or jsonb_typeof(s->'roofType') is distinct from 'string' or s->>'roofType' not in ('gable','shed','hip','pyramid','halfHip','lShape','tShape')))
   or jsonb_typeof(s->'notes') is distinct from 'string' or char_length(s->>'notes')>2000
   or jsonb_typeof(s->'measurements') is distinct from 'array'
   or (s->'measurements'<>'[]'::jsonb and not private.valid_field_survey_measurements(
     (select jsonb_agg(case when m->'value'='null'::jsonb then jsonb_set(m,'{value}','0'::jsonb) else m end) from jsonb_array_elements(s->'measurements') m)))
   or jsonb_typeof(s->'photoIds') is distinct from 'array' or jsonb_array_length(s->'photoIds')>100 then return false; end if;
  if s ? 'elementKind' and (jsonb_typeof(s->'elementKind') is distinct from 'string' or not (
    (s->>'elementKind' = 'gutter' and s->>'workType' = 'gutter')
    or (s->>'elementKind' in ('flashing_verge','flashing_eave','flashing_wall','flashing_ridge','valley') and s->>'workType' = 'flashing')
    or (s->>'elementKind' in ('downpipe','chimney','roof_window','repair','custom') and s->>'workType' = 'other'))) then return false; end if;
  if s ? 'lengthSource' and (not s ? 'elementKind' or jsonb_typeof(s->'lengthSource') is distinct from 'object'
    or (s->'lengthSource') - array['roofSectionId','role'] <> '{}'::jsonb
    or jsonb_typeof(s->'lengthSource'->'roofSectionId') is distinct from 'string'
    or (s->'lengthSource'->>'roofSectionId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or not (
      (s->'lengthSource'->>'role' = 'eave_total' and s->>'elementKind' in ('gutter','flashing_eave'))
      or (s->'lengthSource'->>'role' = 'ridge' and s->>'elementKind' = 'flashing_ridge')
      or (s->'lengthSource'->>'role' = 'verge_total' and s->>'elementKind' = 'flashing_verge'))) then return false; end if;
  if s ? 'roofMeasurementMode' and (s->>'workType'<>'roof' or s->>'roofType' not in ('gable','shed') or jsonb_typeof(s->'roofMeasurementMode') is distinct from 'string' or s->>'roofMeasurementMode' not in ('quick','building','detailed') or (s->>'roofType'='shed' and s->>'roofMeasurementMode'='detailed')) then return false; end if;
  if s ? 'quickPlanesMatch' and (s->>'roofType' is distinct from 'gable' or jsonb_typeof(s->'quickPlanesMatch') is distinct from 'boolean') then return false; end if;
  if s ? 'roofTimberParameters' then
   timber := s->'roofTimberParameters';
   if s->>'workType'<>'roof' or jsonb_typeof(timber) is distinct from 'object'
    or timber-array['rafterMaxSpacingMm','rafterStartInsetMm','rafterEndInsetMm','rafterSectionWidthMm','rafterSectionHeightMm','battenMaxSpacingMm','battenStartInsetMm','battenEndInsetMm','battenSectionWidthMm','battenSectionHeightMm'] <> '{}'::jsonb then return false; end if;
   for parameter in select key, value from jsonb_each(timber) loop
    if jsonb_typeof(parameter.value) is distinct from 'number' or (parameter.value::text)::numeric < 0 or (parameter.value::text)::numeric > 100000 or (parameter.value::text)::numeric <> trunc((parameter.value::text)::numeric)
     or (parameter.key like '%MaxSpacingMm' or parameter.key like '%SectionWidthMm' or parameter.key like '%SectionHeightMm') and (parameter.value::text)::numeric = 0 then return false; end if;
   end loop;
  end if;
  if s ? 'roofUnderlayParameters' then
   underlay := s->'roofUnderlayParameters';
   if s->>'workType'<>'roof' or jsonb_typeof(underlay) is distinct from 'object'
    or underlay-array['rollWidthMm','rollLengthMm','sideOverlapMm','endOverlapMm','installationDirection'] <> '{}'::jsonb then return false; end if;
   for parameter in select key, value from jsonb_each(underlay) loop
    if parameter.key='installationDirection' then
     if jsonb_typeof(parameter.value) is distinct from 'string' or parameter.value#>>'{}' not in ('eave-to-ridge','ridge-to-eave') then return false; end if;
    elsif jsonb_typeof(parameter.value) is distinct from 'number'
     or (parameter.value::text)::numeric < 0 or (parameter.value::text)::numeric <> trunc((parameter.value::text)::numeric)
     or parameter.key='rollWidthMm' and ((parameter.value::text)::numeric = 0 or (parameter.value::text)::numeric > 100000)
     or parameter.key='rollLengthMm' and ((parameter.value::text)::numeric = 0 or (parameter.value::text)::numeric > 1000000)
     or parameter.key in ('sideOverlapMm','endOverlapMm') and (parameter.value::text)::numeric > 100000 then return false; end if;
   end loop;
   if underlay ? 'sideOverlapMm' and underlay ? 'rollWidthMm' and (underlay->>'sideOverlapMm')::numeric >= (underlay->>'rollWidthMm')::numeric then return false; end if;
   if underlay ? 'endOverlapMm' and underlay ? 'rollLengthMm' and (underlay->>'endOverlapMm')::numeric >= (underlay->>'rollLengthMm')::numeric then return false; end if;
  end if;
  ids:=array_append(ids,s->>'id');
  for photo in select jsonb_array_elements_text(s->'photoIds') loop
   if photo is null or photo !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return false; end if;
  end loop;
 end loop;
 return (select count(*)<=100 and count(distinct m->>'id')=count(*) from jsonb_array_elements(p_sections) sec cross join lateral jsonb_array_elements(sec->'measurements') m);
exception when others then return false;
end;
$$;

alter table public.field_survey_roof_geometry_sources drop constraint field_survey_roof_geometry_sources_geometry_type_check;
alter table public.field_survey_roof_geometry_sources add constraint field_survey_roof_geometry_sources_geometry_type_check
  check (geometry_type = any (array['roof.gable','roof.gable.quick','roof.gable.detailed','roof.shed.quick','roof.geometry.shed','roof.geometry.hip','roof.geometry.pyramid','roof.geometry.halfHip','roof.geometry.lShape','roof.geometry.tShape']));

create function private.survey_quick_shed_input(p_sections jsonb, p_section_id uuid)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  s jsonb; m jsonb; v numeric; mm numeric;
  v_eave numeric; v_slope numeric; n_eave int := 0; n_slope int := 0;
begin
  select e.value into s from pg_catalog.jsonb_array_elements(p_sections) e(value) where e.value->>'id' = p_section_id::text;
  if s is null or s->>'workType' <> 'roof' or s->>'roofType' is distinct from 'shed' or s->>'roofMeasurementMode' is distinct from 'quick' then return null; end if;
  for m in select e.value from pg_catalog.jsonb_array_elements(s->'measurements') e(value) where e.value->>'semanticType' in ('roof_eave_run','roof_plane_slope_a') loop
    if pg_catalog.jsonb_typeof(m->'value') <> 'number' then continue; end if;
    if m->>'unit' not in ('m','mm') then return null; end if;
    v := (m->>'value')::numeric;
    mm := case when m->>'unit' = 'm' then v * 1000 else v end;
    if mm <= 0 or mm > 200000 or mm <> pg_catalog.round(mm) then return null; end if;
    if m->>'semanticType' = 'roof_eave_run' then n_eave := n_eave + 1; v_eave := mm; else n_slope := n_slope + 1; v_slope := mm; end if;
  end loop;
  if n_eave <> 1 or n_slope <> 1 then return null; end if;
  return pg_catalog.jsonb_build_object('mode', 'quick', 'eaveRunMm', v_eave, 'slopeMm', v_slope);
end;
$$;

create function public.save_survey_quick_shed_geometry_source_secure(
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
  v_expected := case when v_revision.sections is null then null else private.survey_quick_shed_input(v_revision.sections, p_section_id) end;
  if v_expected is null or v_expected is distinct from p_input then
    raise exception 'A gyors félnyeregtető-mérés nem ebből a felmérésrevízióból és szakaszból származik, vagy hiányos.' using errcode = '22023';
  end if;
  -- Area is recomputed here, never trusted from the caller: one rectangle (eave run x sloped length).
  v_area := (v_expected->>'eaveRunMm')::numeric * (v_expected->>'slopeMm')::numeric / 1000000;
  if v_area <= 0 or (p_output #>> '{areas,combinedRoofM2}') is null or (p_output #>> '{areas,combinedRoofM2}')::numeric is distinct from v_area then
    raise exception 'A tetőfelület nem egyezik a mért méretekkel.' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_survey_revision_id::text || ':' || p_section_id::text || ':roof-geometry', 0));
  select * into v_existing from public.field_survey_roof_geometry_sources g
   where g.survey_revision_id = p_survey_revision_id and g.section_id = p_section_id;
  if found then
    if v_existing.input_snapshot is distinct from p_input or v_existing.geometry_type <> 'roof.shed.quick' then
      raise exception 'A forrásrevízió geometriája már más bemenettel rögzített.' using errcode = '40001';
    end if;
    return query select v_existing.id, v_existing.combined_roof_m2, true;
    return;
  end if;
  insert into public.field_survey_roof_geometry_sources(organization_id, survey_id, survey_revision_id, section_id, geometry_type,
    input_snapshot, output_snapshot, combined_roof_m2, created_by)
  values (p_organization_id, p_survey_id, p_survey_revision_id, p_section_id, 'roof.shed.quick', p_input, p_output, v_area, p_actor_id)
  returning id into v_id;
  return query select v_id, v_area, false;
end;
$$;
revoke all on function public.save_survey_quick_shed_geometry_source_secure(uuid,uuid,uuid,uuid,jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.save_survey_quick_shed_geometry_source_secure(uuid,uuid,uuid,uuid,jsonb,jsonb,uuid) to tetopro_covering_writer;
