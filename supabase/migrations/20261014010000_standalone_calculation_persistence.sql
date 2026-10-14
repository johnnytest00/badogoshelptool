-- F9.7.6.3: standalone calculation ownership and revision persistence.
-- Existing project rows and their project-scoped RPCs remain in the project scope.

alter table public.calculations alter column project_id drop not null;
alter table public.calculations
  add column ownership_scope text not null default 'project',
  add column created_by uuid references auth.users(id) on delete restrict,
  add constraint calculations_ownership_scope check (ownership_scope in ('project', 'standalone')),
  add constraint calculations_scope_project_owner check (
    (ownership_scope = 'project' and project_id is not null and created_by is null)
    or (ownership_scope = 'standalone' and project_id is null and roof_model_id is null and created_by is not null)
  );

create index calculations_standalone_owner_list_idx
  on public.calculations (organization_id, created_by, calculator_type, updated_at desc)
  where ownership_scope = 'standalone';

create or replace function private.prevent_calculation_ownership_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.organization_id is distinct from old.organization_id
     or new.project_id is distinct from old.project_id
     or new.roof_model_id is distinct from old.roof_model_id
     or new.ownership_scope is distinct from old.ownership_scope
     or new.created_by is distinct from old.created_by then
    raise exception 'calculation ownership is immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger calculations_ownership_immutable
before update on public.calculations
for each row execute function private.prevent_calculation_ownership_change();
revoke all on function private.prevent_calculation_ownership_change() from public;

drop policy calculations_select_member on public.calculations;
create policy calculations_select_authorized on public.calculations for select to authenticated
using (
  (select private.is_org_member(organization_id))
  and (ownership_scope = 'project' or created_by = (select auth.uid()))
);
drop policy calculations_insert_member on public.calculations;
create policy calculations_insert_authorized on public.calculations for insert to authenticated
with check (
  (select private.is_org_member(organization_id))
  and ownership_scope = 'project' and project_id is not null and created_by is null
);
drop policy calculations_update_member on public.calculations;
create policy calculations_update_authorized on public.calculations for update to authenticated
using ((select private.is_org_member(organization_id)) and ownership_scope = 'project')
with check ((select private.is_org_member(organization_id)) and ownership_scope = 'project');
drop policy calculations_delete_member on public.calculations;
create policy calculations_delete_authorized on public.calculations for delete to authenticated
using ((select private.is_org_member(organization_id)) and ownership_scope = 'project');

drop policy calculation_revisions_select_member on public.calculation_revisions;
create policy calculation_revisions_select_authorized on public.calculation_revisions for select to authenticated
using (
  (select private.is_org_member(organization_id))
  and exists (select 1 from public.calculations c where c.id = calculation_revisions.calculation_id and c.organization_id = calculation_revisions.organization_id
    and (c.ownership_scope = 'project' or c.created_by = (select auth.uid())))
);
drop policy calculation_revisions_insert_member on public.calculation_revisions;
create policy calculation_revisions_insert_authorized on public.calculation_revisions for insert to authenticated
with check (
  (select private.is_org_member(organization_id))
  and created_by = (select auth.uid())
  and exists (select 1 from public.calculations c where c.id = calculation_revisions.calculation_id and c.organization_id = calculation_revisions.organization_id
    and c.ownership_scope = 'project')
);

-- A standalone calculation cannot participate in project dependency graphs.
create policy calculation_dependencies_insert_project_scope on public.calculation_dependencies for insert to authenticated
with check (
  (select private.is_org_member(organization_id))
  and exists (
    select 1 from public.calculation_revisions cr
    join public.calculations c on c.id = cr.calculation_id and c.organization_id = cr.organization_id
    where cr.id = calculation_dependencies.downstream_calculation_revision_id and cr.organization_id = calculation_dependencies.organization_id
      and c.ownership_scope = 'project'
  )
);
drop policy calculation_dependencies_insert_member on public.calculation_dependencies;

create or replace function private.save_standalone_calculation_revision(
  p_organization_id uuid,
  p_calculation_id uuid,
  p_calculator_type text,
  p_name text,
  p_input_data jsonb,
  p_output_data jsonb,
  p_input_schema_version text,
  p_implementation_version text,
  p_validation_status text,
  p_warnings jsonb,
  p_expected_revision_number integer
)
returns table (calculation_id uuid, calculation_revision_id uuid, revision_number integer)
language plpgsql security definer set search_path = ''
as $$
declare
  v_revision_id uuid;
  v_current integer := 0;
  v_next integer;
begin
  if auth.uid() is null or not private.is_org_member(p_organization_id) then
    raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501';
  end if;
  if p_calculation_id is null or p_name is null or char_length(trim(p_name)) not between 1 and 200
     or p_expected_revision_number is null or p_expected_revision_number < 0
     or p_calculator_type not in ('gutters.material-estimate', 'sheet_metal.flashings.material-estimate', 'sheet_metal.profiles.flat-pattern')
     or jsonb_typeof(p_input_data) is distinct from 'object'
     or jsonb_typeof(p_output_data) is distinct from 'object'
     or p_validation_status not in ('estimated', 'user_provided', 'demo') then
    raise exception 'A standalone kalkuláció bemenete vagy megnevezése érvénytelen.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || auth.uid()::text || ':' || p_calculator_type || ':' || p_calculation_id::text, 0));
  perform 1 from public.calculations c
    where c.id = p_calculation_id and c.organization_id = p_organization_id
      and c.ownership_scope = 'standalone' and c.project_id is null and c.roof_model_id is null
      and c.created_by = auth.uid() and c.calculator_type = p_calculator_type
    for update;
  if found then
    select coalesce(max(cr.revision_number), 0) into v_current
      from public.calculation_revisions cr where cr.calculation_id = p_calculation_id and cr.organization_id = p_organization_id;
  elsif exists (select 1 from public.calculations c where c.id = p_calculation_id) then
    raise exception 'A kalkuláció nem érhető el vagy más tulajdonhoz tartozik.' using errcode = '42501';
  end if;
  if p_expected_revision_number is distinct from v_current then
    raise exception 'A kalkuláció időközben új revíziót kapott; töltsd újra.' using errcode = '40001';
  end if;

  if v_current = 0 then
    insert into public.calculations (id, organization_id, project_id, roof_model_id, ownership_scope, created_by, calculator_type, display_name, status)
    values (p_calculation_id, p_organization_id, null, null, 'standalone', auth.uid(), p_calculator_type, trim(p_name), 'current');
  end if;
  v_next := v_current + 1;
  insert into public.calculation_revisions (
    organization_id, calculation_id, revision_number, input_schema_version,
    calculator_implementation_version, input_snapshot, output_snapshot, data_provenance,
    validation_status, warnings, created_by
  ) values (
    p_organization_id, p_calculation_id, v_next, p_input_schema_version,
    p_implementation_version, p_input_data, p_output_data,
    jsonb_build_object('scope', 'standalone', 'input', 'user_provided', 'output', 'server_calculation', 'calculator', p_calculator_type),
    p_validation_status, coalesce(p_warnings, '[]'::jsonb), auth.uid()
  ) returning id into v_revision_id;
  update public.calculations set display_name = trim(p_name), current_revision_id = v_revision_id, status = 'current'
    where id = p_calculation_id and organization_id = p_organization_id and created_by = auth.uid();
  return query select p_calculation_id, v_revision_id, v_next;
end;
$$;
revoke all on function private.save_standalone_calculation_revision(uuid, uuid, text, text, jsonb, jsonb, text, text, text, jsonb, integer) from public, anon;
revoke all on function private.save_standalone_calculation_revision(uuid, uuid, text, text, jsonb, jsonb, text, text, text, jsonb, integer) from authenticated;

create or replace function public.save_standalone_gutter_calculation(
  p_organization_id uuid, p_calculation_id uuid, p_name text, p_input_data jsonb, p_output_data jsonb, p_expected_revision_number integer
)
returns table (calculation_id uuid, calculation_revision_id uuid, revision_number integer)
language plpgsql security definer set search_path = ''
as $$
declare v_status text; v_run jsonb; v_output_run jsonb; v_index integer := 0; v_count numeric; v_remainder numeric; v_total numeric := 0; v_down_total numeric := 0; v_manual_total numeric := 0;
begin
  if jsonb_typeof(p_input_data -> 'runs') is distinct from 'array'
     or jsonb_typeof(p_output_data -> 'gutterRuns') is distinct from 'array'
     or jsonb_typeof(p_output_data -> 'downpipeRuns') is distinct from 'array'
     or jsonb_typeof(p_input_data -> 'downpipes') is distinct from 'array'
     or jsonb_typeof(p_input_data -> 'manualComponents') is distinct from 'array'
     or jsonb_typeof(p_output_data -> 'totals') is distinct from 'object'
     or jsonb_array_length(p_input_data -> 'runs') <> jsonb_array_length(p_output_data -> 'gutterRuns')
     or jsonb_array_length(p_input_data -> 'downpipes') <> jsonb_array_length(p_output_data -> 'downpipeRuns')
     or exists (select 1 from jsonb_array_elements(p_input_data -> 'runs') r(value) where jsonb_typeof(r.value -> 'roofEdge') = 'object')
     or jsonb_typeof(p_input_data -> 'gutterStockLengthMm') is distinct from 'number'
     or (p_input_data ->> 'gutterStockLengthMm')::numeric <= 0 then
    raise exception 'Önálló ereszszámításhoz kézi, tetőforrás nélküli bemenet szükséges.' using errcode = '22023';
  end if;
  for v_index in 0..jsonb_array_length(p_input_data -> 'runs') - 1 loop
    v_run := p_input_data -> 'runs' -> v_index; v_output_run := p_output_data -> 'gutterRuns' -> v_index;
    if jsonb_typeof(v_run -> 'lengthMm') is distinct from 'number' or (v_run ->> 'lengthMm')::numeric <= 0
       or jsonb_typeof(v_output_run -> 'stockSections') is distinct from 'number' then
      raise exception 'Az ereszszakasz vagy eredmény érvénytelen.' using errcode = '22023';
    end if;
    v_count := ceil((v_run ->> 'lengthMm')::numeric / (p_input_data ->> 'gutterStockLengthMm')::numeric);
    v_remainder := mod((v_run ->> 'lengthMm')::numeric, (p_input_data ->> 'gutterStockLengthMm')::numeric);
    if (v_output_run ->> 'id') is distinct from v_run ->> 'id'
       or (v_output_run ->> 'stockSections')::numeric <> v_count
       or ((v_remainder = 0 and jsonb_typeof(v_output_run -> 'remainderMm') is distinct from 'null')
         or (v_remainder <> 0 and ((v_output_run ->> 'remainderMm')::numeric is distinct from v_remainder))) then
      raise exception 'Az ereszszakasz kimenete eltér az inputból újraszámolt eredménytől.' using errcode = '22023';
    end if;
    if jsonb_typeof(v_run -> 'bracketSpacingMm') = 'number' then
      if (v_output_run ->> 'bracketEstimate')::numeric <> ceil((v_run ->> 'lengthMm')::numeric / (v_run ->> 'bracketSpacingMm')::numeric) + 1 then
        raise exception 'A konzolbecslés eltér az explicit kiosztástól.' using errcode = '22023';
      end if;
    elsif jsonb_typeof(v_output_run -> 'bracketEstimate') is distinct from 'null' then
      raise exception 'Konzolbecslés csak explicit kiosztásból menthető.' using errcode = '22023';
    end if;
    v_total := v_total + v_count;
  end loop;
  for v_index in 0..jsonb_array_length(p_input_data -> 'downpipes') - 1 loop
    v_run := p_input_data -> 'downpipes' -> v_index; v_output_run := p_output_data -> 'downpipeRuns' -> v_index;
    if jsonb_typeof(v_run -> 'lengthMm') is distinct from 'number' or (v_run ->> 'lengthMm')::numeric <= 0
       or jsonb_typeof(v_run -> 'commercialLengthMm') is distinct from 'number' or (v_run ->> 'commercialLengthMm')::numeric <= 0 then
      raise exception 'A lefolyómenet bemenete érvénytelen.' using errcode = '22023';
    end if;
    v_count := ceil((v_run ->> 'lengthMm')::numeric / (v_run ->> 'commercialLengthMm')::numeric);
    v_remainder := mod((v_run ->> 'lengthMm')::numeric, (v_run ->> 'commercialLengthMm')::numeric);
    if (v_output_run ->> 'stockSections')::numeric <> v_count or (v_output_run ->> 'id') is distinct from v_run ->> 'id'
       or ((v_remainder = 0 and jsonb_typeof(v_output_run -> 'remainderMm') is distinct from 'null')
         or (v_remainder <> 0 and (v_output_run ->> 'remainderMm')::numeric is distinct from v_remainder)) then
      raise exception 'A lefolyó kimenete eltér az inputból újraszámolt eredménytől.' using errcode = '22023';
    end if;
    v_down_total := v_down_total + v_count;
  end loop;
  select coalesce(sum((component.value ->> 'quantity')::numeric), 0) into v_manual_total
    from jsonb_array_elements(p_input_data -> 'manualComponents') component(value);
  if (p_output_data #>> '{totals,gutterStockSections}')::numeric <> v_total
     or (p_output_data #>> '{totals,downpipeStockSections}')::numeric <> v_down_total
     or (p_output_data #>> '{totals,totalManualComponents}')::numeric <> v_manual_total then
    raise exception 'Az eresz összesítés eltér az inputból újraszámolt mennyiségektől.' using errcode = '22023';
  end if;
  v_status := case when exists (select 1 from jsonb_array_elements(p_input_data -> 'runs') r(value) where r.value ->> 'measurementSource' = 'demo') then 'demo' else 'estimated' end;
  return query select * from private.save_standalone_calculation_revision(p_organization_id, p_calculation_id,
    'gutters.material-estimate', p_name, p_input_data, p_output_data, '1.0.0', '1.0.0', v_status,
    coalesce(p_output_data -> 'warnings', '[]'::jsonb), p_expected_revision_number);
end;
$$;

create or replace function public.save_standalone_flashing_calculation(
  p_organization_id uuid, p_calculation_id uuid, p_name text, p_input_data jsonb, p_output_data jsonb, p_expected_revision_number integer
)
returns table (calculation_id uuid, calculation_revision_id uuid, revision_number integer)
language plpgsql security definer set search_path = ''
as $$
declare v_status text; v_connection jsonb; v_run jsonb; v_output_run jsonb; v_index integer := 0; v_target numeric; v_stock numeric; v_count numeric; v_expected_count numeric; v_joint numeric; v_overlap numeric; v_capacity numeric; v_required numeric; v_reserve numeric; v_total_count numeric := 0; v_total_stock numeric := 0; v_unresolved integer := 0;
begin
  if jsonb_typeof(p_input_data -> 'runs') is distinct from 'array'
     or jsonb_typeof(p_output_data -> 'runs') is distinct from 'array'
     or jsonb_typeof(p_input_data #> '{sectionSpec,nominalLengthMm}') is distinct from 'number'
     or (p_input_data #>> '{sectionSpec,nominalLengthMm}')::numeric <= 0
     or jsonb_array_length(p_input_data -> 'runs') <> jsonb_array_length(p_output_data -> 'runs')
     or exists (select 1 from jsonb_array_elements(p_input_data -> 'runs') r(value)
       where jsonb_typeof(r.value -> 'roofEdgeReference') = 'object' or r.value ->> 'lengthSource' = 'geometry') then
    raise exception 'Önálló szegélyszámításhoz kézi, tetőforrás nélküli bemenet szükséges.' using errcode = '22023';
  end if;
  v_stock := (p_input_data #>> '{sectionSpec,nominalLengthMm}')::numeric;
  v_connection := p_input_data #> '{sectionSpec,connection}';
  if coalesce(v_connection ->> 'mode', '') not in ('unknown', 'no_overlap_confirmed', 'explicit_overlap', 'effective_length_supplied') then
    raise exception 'A szegélykapcsolat módja érvénytelen.' using errcode = '22023';
  end if;
  for v_index in 0..jsonb_array_length(p_input_data -> 'runs') - 1 loop
    v_run := p_input_data -> 'runs' -> v_index; v_output_run := p_output_data -> 'runs' -> v_index;
    if jsonb_typeof(v_run -> 'lengthMm') is distinct from 'number' or (v_run ->> 'lengthMm')::numeric <= 0 then
      raise exception 'A szegélyszakasz hossza érvénytelen.' using errcode = '22023';
    end if;
    v_required := (v_run ->> 'lengthMm')::numeric + coalesce((v_run ->> 'startExtensionMm')::numeric, 0) + coalesce((v_run ->> 'endExtensionMm')::numeric, 0);
    v_reserve := coalesce((v_run ->> 'reserveMm')::numeric, 0);
    v_target := v_required + v_reserve;
    v_expected_count := null;
    if v_connection ->> 'mode' = 'no_overlap_confirmed' then
      v_expected_count := ceil(v_target / v_stock);
      v_overlap := 0;
    elsif v_connection ->> 'mode' = 'explicit_overlap' then
      if jsonb_typeof(v_connection -> 'overlapMm') is distinct from 'number'
         or (v_connection ->> 'overlapMm')::numeric < 0 or (v_connection ->> 'overlapMm')::numeric >= v_stock then
        raise exception 'A megadott átfedésnek nemnegatívnak és a szálhossznál kisebbnek kell lennie.' using errcode = '22023';
      end if;
      v_overlap := (v_connection ->> 'overlapMm')::numeric;
      v_expected_count := case when v_target <= v_stock then 1 else ceil((v_target - v_overlap) / (v_stock - v_overlap)) end;
    elsif v_connection ->> 'mode' = 'effective_length_supplied' then
      if jsonb_typeof(v_connection -> 'additionalCoveragePerSectionMm') is distinct from 'number'
         or (v_connection ->> 'additionalCoveragePerSectionMm')::numeric <= 0
         or (v_connection ->> 'additionalCoveragePerSectionMm')::numeric > v_stock then
        raise exception 'A megadott hasznos fedési hossz érvénytelen.' using errcode = '22023';
      end if;
      v_expected_count := case when v_target <= v_stock then 1 else 1 + ceil((v_target - v_stock) / (v_connection ->> 'additionalCoveragePerSectionMm')::numeric) end;
    end if;
    if (v_output_run ->> 'id') is distinct from v_run ->> 'id'
       or (v_output_run ->> 'requiredCoverageLengthMm')::numeric <> v_required
       or (v_output_run ->> 'reserveMm')::numeric <> v_reserve
       or (v_output_run ->> 'planningTargetLengthMm')::numeric <> v_target
       or (v_output_run ->> 'nominalSectionLengthMm')::numeric <> v_stock then
      raise exception 'A szegélytervezési cél eltér az inputból újraszámolt értéktől.' using errcode = '22023';
    end if;
    if v_expected_count is null then
      v_unresolved := v_unresolved + 1;
      if jsonb_typeof(v_output_run -> 'estimatedSectionCount') is distinct from 'null'
         or jsonb_typeof(v_output_run -> 'jointCount') is distinct from 'null'
         or jsonb_typeof(v_output_run -> 'totalNominalStockLengthMm') is distinct from 'null'
         or jsonb_typeof(v_output_run -> 'explicitOverlapConsumptionMm') is distinct from 'null'
         or jsonb_typeof(v_output_run -> 'availableCoverageCapacityMm') is distinct from 'null'
         or jsonb_typeof(v_output_run -> 'unallocatedCoverageCapacityMm') is distinct from 'null'
         or v_output_run ->> 'status' is distinct from 'incomplete' then
        raise exception 'Ismeretlen kapcsolatnál a szálbecslés csak hiányos/null eredmény lehet.' using errcode = '22023';
      end if;
    else
      v_count := v_expected_count; v_joint := v_count - 1;
      if (v_output_run ->> 'estimatedSectionCount')::numeric <> v_count
         or (v_output_run ->> 'jointCount')::numeric <> v_joint
         or (v_output_run ->> 'totalNominalStockLengthMm')::numeric <> v_count * v_stock
         or v_output_run ->> 'status' is distinct from 'preliminary' then
        raise exception 'A szegélydarabszám eltér az inputból újraszámolt eredménytől.' using errcode = '22023';
      end if;
      v_total_count := v_total_count + v_count; v_total_stock := v_total_stock + v_count * v_stock;
      if v_connection ->> 'mode' in ('no_overlap_confirmed', 'explicit_overlap') then
        v_capacity := v_count * v_stock - v_joint * v_overlap;
        if (v_output_run ->> 'availableCoverageCapacityMm')::numeric <> v_capacity
           or (v_output_run ->> 'unallocatedCoverageCapacityMm')::numeric <> v_capacity - v_target
           or (v_output_run ->> 'explicitOverlapConsumptionMm')::numeric <> v_joint * v_overlap then
          raise exception 'A szegélyfedési kapacitás eltér a megadott kapcsolati módtól.' using errcode = '22023';
        end if;
      elsif v_connection ->> 'mode' = 'effective_length_supplied' then
        v_capacity := v_stock + v_joint * (v_connection ->> 'additionalCoveragePerSectionMm')::numeric;
        if (v_output_run ->> 'availableCoverageCapacityMm')::numeric <> v_capacity
           or (v_output_run ->> 'unallocatedCoverageCapacityMm')::numeric <> v_capacity - v_target
           or jsonb_typeof(v_output_run -> 'explicitOverlapConsumptionMm') is distinct from 'null' then
          raise exception 'A megadott hasznos fedési hossz eredménye érvénytelen.' using errcode = '22023';
        end if;
      end if;
    end if;
  end loop;
  if (p_output_data #>> '{totals,unresolvedRunCount}')::integer <> v_unresolved then
    raise exception 'A hiányos szegélyszakaszok összesítése érvénytelen.' using errcode = '22023';
  end if;
  if (p_output_data #>> '{totals,runCount}')::integer <> jsonb_array_length(p_input_data -> 'runs')
     or (p_output_data #>> '{totals,manualComponentQuantity}')::numeric <>
       coalesce((select sum((component.value ->> 'quantity')::numeric) from jsonb_array_elements(p_input_data -> 'manualComponents') component(value)), 0)
     or (v_unresolved > 0 and (jsonb_typeof(p_output_data #> '{totals,estimatedSectionCount}') is distinct from 'null'
       or jsonb_typeof(p_output_data #> '{totals,totalNominalStockLengthMm}') is distinct from 'null'))
     or (v_unresolved = 0 and ((p_output_data #>> '{totals,estimatedSectionCount}')::numeric <> v_total_count
       or (p_output_data #>> '{totals,totalNominalStockLengthMm}')::numeric <> v_total_stock)) then
    raise exception 'A szegélyösszesítés eltér az inputból újraszámolt értékektől.' using errcode = '22023';
  end if;
  v_status := case
    when exists (select 1 from jsonb_array_elements(p_input_data -> 'runs') r(value) where r.value ->> 'lengthSource' = 'demo') then 'demo'
    when p_input_data #>> '{sectionSpec,connection,mode}' = 'unknown'
      or exists (select 1 from jsonb_array_elements(p_output_data -> 'runs') r(value) where r.value ->> 'status' = 'incomplete') then 'user_provided'
    else 'estimated' end;
  return query select * from private.save_standalone_calculation_revision(p_organization_id, p_calculation_id,
    'sheet_metal.flashings.material-estimate', p_name, p_input_data, p_output_data, '1.0.0', '1.0.0', v_status,
    coalesce(p_output_data -> 'warnings', '[]'::jsonb), p_expected_revision_number);
end;
$$;

create or replace function public.save_standalone_profile_calculation(
  p_organization_id uuid, p_calculation_id uuid, p_name text, p_input_data jsonb, p_output_data jsonb, p_expected_revision_number integer
)
returns table (calculation_id uuid, calculation_revision_id uuid, revision_number integer)
language plpgsql security definer set search_path = ''
as $$
declare v_status text; v_width numeric := 0; v_allowance numeric; v_bend jsonb; v_output_bend jsonb; v_index integer; v_incomplete boolean := false;
begin
  if p_input_data ->> 'schemaVersion' is distinct from '1.0.0'
     or p_input_data ->> 'coordinateConvention' is distinct from 'x-right-y-up'
     or p_input_data ->> 'dimensionConvention' is distinct from 'finished_tangent'
     or coalesce(p_input_data ->> 'profileType', '') not in ('l', 'u', 'custom')
     or jsonb_typeof(p_input_data -> 'straights') is distinct from 'array'
     or jsonb_typeof(p_input_data -> 'bends') is distinct from 'array'
     or jsonb_array_length(p_input_data -> 'straights') not between 1 and 51
     or jsonb_array_length(p_input_data -> 'bends') > 50
     or jsonb_array_length(p_input_data -> 'straights') <> jsonb_array_length(p_input_data -> 'bends') + 1
     or p_input_data ->> 'profileId' is distinct from p_calculation_id::text or p_input_data ->> 'label' is distinct from trim(p_name)
     or jsonb_typeof(p_input_data -> 'thicknessMm') is distinct from 'number'
     or (p_input_data ->> 'thicknessMm')::numeric < 0.000001 or (p_input_data ->> 'thicknessMm')::numeric > 1000000
     or p_output_data ->> 'schemaVersion' is distinct from '1.0.0'
     or jsonb_typeof(p_output_data -> 'bends') is distinct from 'array'
     or jsonb_array_length(p_input_data -> 'bends') <> jsonb_array_length(p_output_data -> 'bends')
     or jsonb_typeof(p_output_data #> '{flatPattern}') is distinct from 'object' then
    raise exception 'A profil bemenete vagy eredmény-szerződése érvénytelen.' using errcode = '22023';
  end if;
  if p_input_data ->> 'profileId' is distinct from p_calculation_id::text or p_input_data ->> 'label' is distinct from trim(p_name)
     or jsonb_typeof(p_input_data -> 'bends') is distinct from 'array'
     or jsonb_typeof(p_output_data -> 'bends') is distinct from 'array'
     or jsonb_array_length(p_input_data -> 'bends') <> jsonb_array_length(p_output_data -> 'bends')
     or (exists (select 1 from jsonb_array_elements(p_input_data -> 'bends') b(value) where b.value #>> '{allowance,mode}' = 'unknown')
       and jsonb_typeof(p_output_data #> '{flatPattern,widthMm}') is distinct from 'null') then
    raise exception 'A profil bemenete vagy hiányos BA/K eredménye érvénytelen.' using errcode = '22023';
  end if;
  for v_index in 0..jsonb_array_length(p_input_data -> 'straights') - 1 loop
    if jsonb_typeof(p_input_data -> 'straights' -> v_index -> 'tangentLengthMm') is distinct from 'number'
       or (p_input_data -> 'straights' -> v_index ->> 'tangentLengthMm')::numeric < 0.000001
       or (p_input_data -> 'straights' -> v_index ->> 'tangentLengthMm')::numeric > 1000000 then
      raise exception 'A profil egyenes szakasza érvénytelen.' using errcode = '22023';
    end if;
    v_width := v_width + (p_input_data -> 'straights' -> v_index ->> 'tangentLengthMm')::numeric;
    if v_index < jsonb_array_length(p_input_data -> 'bends') then
      v_bend := p_input_data -> 'bends' -> v_index;
      if jsonb_typeof(v_bend -> 'signedTurnDeg') is distinct from 'number'
         or abs((v_bend ->> 'signedTurnDeg')::numeric) < 0.000001 or abs((v_bend ->> 'signedTurnDeg')::numeric) >= 180
         or jsonb_typeof(v_bend -> 'insideRadiusMm') is distinct from 'number'
         or (v_bend ->> 'insideRadiusMm')::numeric < 0.000001 or (v_bend ->> 'insideRadiusMm')::numeric > 1000000
         or coalesce(v_bend #>> '{allowance,mode}', '') not in ('unknown', 'explicit_ba', 'k_factor') then
        raise exception 'A profil hajtásbeállítása érvénytelen.' using errcode = '22023';
      end if;
      v_allowance := null;
      if v_bend #>> '{allowance,mode}' = 'explicit_ba' then
        if jsonb_typeof(v_bend #> '{allowance,baMm}') is distinct from 'number' or (v_bend #>> '{allowance,baMm}')::numeric <= 0 then
          raise exception 'A BA paraméter érvénytelen.' using errcode = '22023';
        end if;
        v_allowance := (v_bend #>> '{allowance,baMm}')::numeric;
      elsif v_bend #>> '{allowance,mode}' = 'k_factor' then
        if jsonb_typeof(v_bend #> '{allowance,kFactor}') is distinct from 'number'
           or (v_bend #>> '{allowance,kFactor}')::numeric < 0 or (v_bend #>> '{allowance,kFactor}')::numeric > 1 then
          raise exception 'A K-tényező érvénytelen.' using errcode = '22023';
        end if;
        v_allowance := pi() * abs((v_bend ->> 'signedTurnDeg')::numeric) / 180
          * ((v_bend ->> 'insideRadiusMm')::numeric + (p_input_data ->> 'thicknessMm')::numeric * (v_bend #>> '{allowance,kFactor}')::numeric);
      end if;
      v_output_bend := p_output_data -> 'bends' -> v_index;
      if jsonb_typeof(v_output_bend) is distinct from 'object'
         or v_output_bend ->> 'id' is distinct from v_bend ->> 'id'
         or (v_allowance is null and jsonb_typeof(v_output_bend -> 'allowanceMm') is distinct from 'null')
         or (v_allowance is not null and (jsonb_typeof(v_output_bend -> 'allowanceMm') is distinct from 'number'
           or abs((v_output_bend ->> 'allowanceMm')::numeric - v_allowance) > 0.000000001)) then
        raise exception 'A szerveroldali profilhajtás nem egyezik a BA/K bemenettel.' using errcode = '22023';
      end if;
      if v_allowance is null then v_incomplete := true; end if;
      v_width := v_width + coalesce(v_allowance, 0);
    end if;
  end loop;
  if v_incomplete then
    if jsonb_typeof(p_output_data #> '{flatPattern,widthMm}') is distinct from 'null' then raise exception 'Hiányzó BA/K mellett a teríték szélessége csak null lehet.' using errcode = '22023'; end if;
  elsif jsonb_typeof(p_output_data #> '{flatPattern,widthMm}') is distinct from 'number'
     or abs((p_output_data #>> '{flatPattern,widthMm}')::numeric - v_width) > 0.000000001 then
    raise exception 'A szerveroldali profilteríték nem egyezik a bemenettel.' using errcode = '22023';
  end if;
  if p_input_data #>> '{material,catalogVariantId}' is not null and not exists (
    select 1 from public.material_variants v where v.id = (p_input_data #>> '{material,catalogVariantId}')::uuid and v.organization_id = p_organization_id
  ) then raise exception 'A katalógusvariáns nem ehhez a műhelyhez tartozik.' using errcode = '42501'; end if;
  v_status := case when exists (select 1 from jsonb_array_elements(p_input_data -> 'bends') b(value) where b.value #>> '{allowance,mode}' = 'unknown') then 'user_provided'
    when exists (select 1 from jsonb_array_elements(p_input_data -> 'straights') s(value) where s.value #>> '{dimensionSource,kind}' = 'demo') then 'demo'
    else 'estimated' end;
  return query select * from private.save_standalone_calculation_revision(p_organization_id, p_calculation_id,
    'sheet_metal.profiles.flat-pattern', p_name, p_input_data, p_output_data, '1.0.0', '1.0.0', v_status,
    coalesce(p_output_data -> 'issues', '[]'::jsonb), p_expected_revision_number);
end;
$$;

revoke all on function public.save_standalone_gutter_calculation(uuid, uuid, text, jsonb, jsonb, integer) from public, anon;
revoke all on function public.save_standalone_flashing_calculation(uuid, uuid, text, jsonb, jsonb, integer) from public, anon;
revoke all on function public.save_standalone_profile_calculation(uuid, uuid, text, jsonb, jsonb, integer) from public, anon;
grant execute on function public.save_standalone_gutter_calculation(uuid, uuid, text, jsonb, jsonb, integer) to authenticated;
grant execute on function public.save_standalone_flashing_calculation(uuid, uuid, text, jsonb, jsonb, integer) to authenticated;
grant execute on function public.save_standalone_profile_calculation(uuid, uuid, text, jsonb, jsonb, integer) to authenticated;
