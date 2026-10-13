-- F9.6.3.3: project-scoped sheet metal profile revisions.
create or replace function public.save_sheet_metal_profile_calculation(
  p_organization_id uuid,
  p_project_id uuid,
  p_calculation_id uuid,
  p_name text,
  p_input_data jsonb,
  p_server_output_data jsonb,
  p_expected_revision_number integer
)
returns table (calculation_id uuid, calculation_revision_id uuid, revision_number integer)
language plpgsql security invoker set search_path = public, pg_catalog
as $$
declare
  v_revision_id uuid;
  v_current integer := 0;
  v_next integer;
  v_input_bend jsonb;
  v_output_bend jsonb;
  v_width numeric := 0;
  v_allowance numeric;
  v_index integer := 0;
  v_calculator text := 'sheet_metal.profiles.flat-pattern';
begin
  if not private.is_org_member(p_organization_id) then
    raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501';
  end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 160 then
    raise exception 'A profil megnevezése kötelező.' using errcode = '22023';
  end if;
  if p_expected_revision_number is null or p_expected_revision_number < 0
     or jsonb_typeof(p_input_data) is distinct from 'object'
     or jsonb_typeof(p_server_output_data) is distinct from 'object'
     or p_input_data ->> 'schemaVersion' is distinct from '1.0.0'
     or p_input_data ->> 'coordinateConvention' is distinct from 'x-right-y-up'
     or p_input_data ->> 'dimensionConvention' is distinct from 'finished_tangent'
     or coalesce(p_input_data ->> 'profileType', '') not in ('l', 'u', 'custom')
     or jsonb_typeof(p_input_data -> 'straights') is distinct from 'array'
     or jsonb_typeof(p_input_data -> 'bends') is distinct from 'array'
     or jsonb_array_length(p_input_data -> 'straights') not between 1 and 51
     or jsonb_array_length(p_input_data -> 'bends') > 50
     or jsonb_array_length(p_input_data -> 'straights') <> jsonb_array_length(p_input_data -> 'bends') + 1 then
    raise exception 'A profil bemenete vagy mérési konvenciója érvénytelen.' using errcode = '22023';
  end if;
  if p_input_data ->> 'profileId' is distinct from p_calculation_id::text
     or p_input_data ->> 'label' is distinct from trim(p_name) then
    raise exception 'A profilazonosító vagy név nem egyezik a mentéssel.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_input_data -> 'thicknessMm') is distinct from 'number'
     or (p_input_data ->> 'thicknessMm')::numeric < 0.000001
     or (p_input_data ->> 'thicknessMm')::numeric > 1000000 then
    raise exception 'A lemezvastagság érvénytelen.' using errcode = '22023';
  end if;

  -- Serialize writes by the client-generated calculation identity, including first-save races.
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || p_project_id::text || ':' || v_calculator || ':' || p_calculation_id::text, 0));
  perform 1 from public.projects where id = p_project_id and organization_id = p_organization_id for share;
  if not found then raise exception 'A projekt nem található ebben a műhelyben.' using errcode = 'P0002'; end if;
  perform 1 from public.calculations where id = p_calculation_id and organization_id = p_organization_id
    and project_id = p_project_id and roof_model_id is null and calculator_type = v_calculator for update;
  if found then
    select coalesce(max(cr.revision_number), 0) into v_current from public.calculation_revisions cr
    where cr.calculation_id = p_calculation_id and cr.organization_id = p_organization_id;
  elsif exists (select 1 from public.calculations where id = p_calculation_id) then
    raise exception 'A profil másik projektben vagy kalkulátortípus alatt létezik.' using errcode = '42501';
  end if;
  if p_expected_revision_number is distinct from v_current then
    raise exception 'A profil időközben új revíziót kapott; töltsd újra.' using errcode = '40001';
  end if;

  for v_index in 0..jsonb_array_length(p_input_data -> 'straights') - 1 loop
    if jsonb_typeof(p_input_data -> 'straights' -> v_index) is distinct from 'object'
       or jsonb_typeof(p_input_data -> 'straights' -> v_index -> 'tangentLengthMm') is distinct from 'number'
       or (p_input_data -> 'straights' -> v_index ->> 'tangentLengthMm')::numeric < 0.000001
       or (p_input_data -> 'straights' -> v_index ->> 'tangentLengthMm')::numeric > 1000000 then
      raise exception 'A profil egyenes szakasza érvénytelen.' using errcode = '22023';
    end if;
    v_width := v_width + (p_input_data -> 'straights' -> v_index ->> 'tangentLengthMm')::numeric;
    if v_index < jsonb_array_length(p_input_data -> 'bends') then
      v_input_bend := p_input_data -> 'bends' -> v_index;
      if jsonb_typeof(v_input_bend) is distinct from 'object'
         or jsonb_typeof(v_input_bend -> 'signedTurnDeg') is distinct from 'number'
         or abs((v_input_bend ->> 'signedTurnDeg')::numeric) < 0.000001
         or abs((v_input_bend ->> 'signedTurnDeg')::numeric) >= 180
         or jsonb_typeof(v_input_bend -> 'insideRadiusMm') is distinct from 'number'
         or (v_input_bend ->> 'insideRadiusMm')::numeric < 0.000001
         or (v_input_bend ->> 'insideRadiusMm')::numeric > 1000000
         or coalesce(v_input_bend #>> '{allowance,mode}', '') not in ('unknown', 'explicit_ba', 'k_factor') then
        raise exception 'A profil hajtásbeállítása érvénytelen.' using errcode = '22023';
      end if;
      v_allowance := null;
      if v_input_bend #>> '{allowance,mode}' = 'explicit_ba' then
        if jsonb_typeof(v_input_bend #> '{allowance,baMm}') is distinct from 'number'
           or (v_input_bend #>> '{allowance,baMm}')::numeric < 0.000001
           or (v_input_bend #>> '{allowance,baMm}')::numeric > 1000000 then raise exception 'A BA paraméter érvénytelen.' using errcode = '22023'; end if;
        v_allowance := (v_input_bend #>> '{allowance,baMm}')::numeric;
      elsif v_input_bend #>> '{allowance,mode}' = 'k_factor' then
        if jsonb_typeof(v_input_bend #> '{allowance,kFactor}') is distinct from 'number'
           or (v_input_bend #>> '{allowance,kFactor}')::numeric < 0 or (v_input_bend #>> '{allowance,kFactor}')::numeric > 1 then
          raise exception 'A K-tényező érvénytelen.' using errcode = '22023';
        end if;
        v_allowance := pi() * abs((v_input_bend ->> 'signedTurnDeg')::numeric) / 180
          * ((v_input_bend ->> 'insideRadiusMm')::numeric + (v_input_data ->> 'thicknessMm')::numeric * (v_input_bend #>> '{allowance,kFactor}')::numeric);
      end if;
      v_width := v_width + coalesce(v_allowance, 0);
      v_output_bend := p_server_output_data #> array['bends', v_index::text];
      if jsonb_typeof(v_output_bend) is distinct from 'object'
         or (v_allowance is null and jsonb_typeof(v_output_bend -> 'allowanceMm') is distinct from 'null')
         or (v_allowance is not null and abs((v_output_bend ->> 'allowanceMm')::numeric - v_allowance) > 0.000000001) then
        raise exception 'A szerveroldali kalkulációs snapshot nem egyezik a bemeneti BA/K paraméterrel.' using errcode = '22023';
      end if;
    end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(p_input_data -> 'bends') b(value) where b.value #>> '{allowance,mode}' = 'unknown') then
    if jsonb_typeof(p_server_output_data #> '{flatPattern,widthMm}') is distinct from 'null' then
      raise exception 'Hiányzó BA/K mellett a terítékszélesség csak null lehet.' using errcode = '22023';
    end if;
  elsif jsonb_typeof(p_server_output_data #> '{flatPattern,widthMm}') is distinct from 'number'
     or abs((p_server_output_data #>> '{flatPattern,widthMm}')::numeric - v_width) > 0.000000001 then
    raise exception 'A szerveroldali terítékszélesség nem egyezik a profil bemenetével.' using errcode = '22023';
  end if;

  if v_current = 0 then
    insert into public.calculations (id, organization_id, project_id, calculator_type, display_name, status)
    values (p_calculation_id, p_organization_id, p_project_id, v_calculator, trim(p_name), 'current');
  end if;
  v_next := v_current + 1;
  insert into public.calculation_revisions (
    organization_id, calculation_id, revision_number, input_schema_version,
    calculator_implementation_version, input_snapshot, output_snapshot,
    data_provenance, validation_status, warnings, created_by
  ) values (
    p_organization_id, p_calculation_id, v_next, '1.0.0', '1.0.0',
    p_input_data, p_server_output_data,
    jsonb_build_object('profileType', p_input_data ->> 'profileType', 'inputSource', 'authenticated_server_action'),
    case when exists (select 1 from jsonb_array_elements(p_input_data -> 'bends') b(value) where b.value #>> '{allowance,mode}' = 'unknown') then 'user_provided' else 'estimated' end,
    coalesce(p_server_output_data -> 'issues', '[]'::jsonb), auth.uid()
  ) returning id into v_revision_id;
  update public.calculations set display_name = trim(p_name), current_revision_id = v_revision_id, status = 'current'
  where id = p_calculation_id and organization_id = p_organization_id;
  return query select p_calculation_id, v_revision_id, v_next;
end;
$$;

revoke all on function public.save_sheet_metal_profile_calculation(uuid, uuid, uuid, text, jsonb, jsonb, integer) from public, anon;
grant execute on function public.save_sheet_metal_profile_calculation(uuid, uuid, uuid, text, jsonb, jsonb, integer) to authenticated;
