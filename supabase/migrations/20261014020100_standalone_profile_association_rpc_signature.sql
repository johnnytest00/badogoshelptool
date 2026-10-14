-- F9.7.6.5.1: align the association wrapper with the current authoritative
-- profile RPC signature (which accepts inputs only and calculates output in SQL).
create or replace function public.associate_standalone_calculation_to_project(
  p_organization_id uuid,
  p_project_id uuid,
  p_source_calculation_id uuid,
  p_source_revision_id uuid,
  p_operation_id uuid,
  p_name text,
  p_expected_project_revision_number integer,
  p_project_calculation_id uuid,
  p_input_data jsonb,
  p_output_data jsonb
)
returns table (
  association_id uuid,
  project_calculation_id uuid,
  project_revision_id uuid,
  revision_number integer,
  reused boolean
)
language plpgsql security definer set search_path = '' as $$
declare
  v_source public.calculations%rowtype;
  v_source_revision public.calculation_revisions%rowtype;
  v_target_calculation_id uuid;
  v_target_revision_id uuid;
  v_target_revision_number integer;
  v_association_id uuid;
  v_payload jsonb;
  v_source_snapshot jsonb;
  v_provenance jsonb;
  v_result record;
begin
  if auth.uid() is null or not private.is_org_member(p_organization_id) then
    raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501';
  end if;
  if p_project_id is null or p_source_calculation_id is null or p_source_revision_id is null
     or p_operation_id is null or p_expected_project_revision_number is null
     or p_expected_project_revision_number < 0 or jsonb_typeof(p_input_data) is distinct from 'object'
     or jsonb_typeof(p_output_data) is distinct from 'object' then
    raise exception 'A projektkapcsolás kérése érvénytelen.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_organization_id::text || ':standalone-project-association:' || p_operation_id::text, 0
  ));

  v_payload := pg_catalog.jsonb_build_object(
    'organizationId', p_organization_id, 'projectId', p_project_id,
    'sourceCalculationId', p_source_calculation_id, 'sourceRevisionId', p_source_revision_id,
    'name', pg_catalog.btrim(p_name), 'expectedProjectRevisionNumber', p_expected_project_revision_number,
    'projectCalculationId', p_project_calculation_id,
    'input', p_input_data, 'output', p_output_data
  );
  -- Recheck both source read access and destination existence before returning an
  -- idempotent result. A known operation ID must not become an authorization bypass.
  perform 1 from public.projects p
  where p.id = p_project_id and p.organization_id = p_organization_id for share;
  if not found then raise exception 'A projekt nem található ebben a műhelyben.' using errcode = '42501'; end if;

  select c.* into v_source from public.calculations c
  where c.id = p_source_calculation_id and c.organization_id = p_organization_id
    and c.ownership_scope = 'standalone' and c.project_id is null and c.roof_model_id is null
    and c.created_by = auth.uid()
  for share;
  if not found then raise exception 'A forrásszámítás nem érhető el a fiókod számára.' using errcode = '42501'; end if;

  select a.id, a.project_calculation_id, a.project_revision_id
  into v_association_id, v_target_calculation_id, v_target_revision_id
  from public.calculation_project_associations a
  where a.organization_id = p_organization_id and a.operation_id = p_operation_id;
  if found then
    if (select a.request_payload from public.calculation_project_associations a
        where a.organization_id = p_organization_id and a.operation_id = p_operation_id) is distinct from v_payload then
      raise exception 'A műveletazonosító már más tartalomhoz tartozik.' using errcode = '22023';
    end if;
    select cr.revision_number into v_target_revision_number
      from public.calculation_revisions cr where cr.id = v_target_revision_id;
    return query select v_association_id, v_target_calculation_id, v_target_revision_id, v_target_revision_number, true;
    return;
  end if;

  if v_source.calculator_type not in (
    'gutters.material-estimate', 'sheet_metal.flashings.material-estimate', 'sheet_metal.profiles.flat-pattern'
  ) then raise exception 'Ez a kalkulátortípus nem kapcsolható projekthez.' using errcode = '22023'; end if;
  if v_source.current_revision_id is distinct from p_source_revision_id then
    raise exception 'Csak a forrásszámítás aktuális, mentett revíziója kapcsolható projekthez.' using errcode = '40001';
  end if;
  select cr.* into v_source_revision from public.calculation_revisions cr
  where cr.id = p_source_revision_id and cr.calculation_id = p_source_calculation_id
    and cr.organization_id = p_organization_id and cr.validation_status in ('estimated', 'user_provided', 'demo')
    and cr.input_schema_version = '1.0.0' and cr.calculator_implementation_version = '1.0.0'
  for share;
  if not found then raise exception 'A forrásrevízió hiányzik, érvénytelen vagy nem támogatott.' using errcode = 'P0002'; end if;
  v_source_snapshot := pg_catalog.jsonb_build_object(
    'revisionId', v_source_revision.id,
    'validationStatus', v_source_revision.validation_status,
    'inputSchemaVersion', v_source_revision.input_schema_version,
    'calculatorImplementationVersion', v_source_revision.calculator_implementation_version,
    'input', v_source_revision.input_snapshot,
    'output', v_source_revision.output_snapshot,
    'dataProvenance', v_source_revision.data_provenance,
    'warnings', v_source_revision.warnings
  );
  if p_name is null or pg_catalog.char_length(pg_catalog.btrim(p_name)) not between 1
      and (case when v_source.calculator_type = 'sheet_metal.profiles.flat-pattern' then 160 else 200 end) then
    raise exception 'Adj meg a kalkulátortípushoz érvényes projektbeli nevet.' using errcode = '22023';
  end if;
  if p_expected_project_revision_number <> 0 and v_source.calculator_type = 'sheet_metal.profiles.flat-pattern' then
    raise exception 'Új projektprofilhoz a várt revíziószám 0 lehet.' using errcode = '22023';
  end if;

  if v_source.calculator_type = 'gutters.material-estimate' then
    if p_project_calculation_id is not null or p_input_data is distinct from v_source_revision.input_snapshot
       or p_output_data is distinct from v_source_revision.output_snapshot
       or exists (select 1 from pg_catalog.jsonb_array_elements(p_input_data -> 'runs') r(value)
                  where pg_catalog.jsonb_typeof(r.value -> 'roofEdge') = 'object') then
      raise exception 'Az eresz forrássnapshot eltér, vagy projektgeometriát tartalmaz.' using errcode = '22023';
    end if;
  elsif v_source.calculator_type = 'sheet_metal.flashings.material-estimate' then
    if p_project_calculation_id is not null or p_input_data is distinct from v_source_revision.input_snapshot
       or p_output_data is distinct from v_source_revision.output_snapshot
       or exists (select 1 from pg_catalog.jsonb_array_elements(p_input_data -> 'runs') r(value)
                  where pg_catalog.jsonb_typeof(r.value -> 'roofEdgeReference') = 'object' or r.value ->> 'lengthSource' = 'geometry') then
      raise exception 'A szegély forrássnapshot eltér, vagy projektgeometriát tartalmaz.' using errcode = '22023';
    end if;
  else
    if p_project_calculation_id is null or p_input_data ->> 'profileId' is distinct from p_project_calculation_id::text
       or (p_input_data - 'profileId') is distinct from (v_source_revision.input_snapshot - 'profileId')
       or p_output_data is distinct from v_source_revision.output_snapshot then
      raise exception 'A profil forrássnapshotja eltér, vagy az új projektprofil-azonosító érvénytelen.' using errcode = '22023';
    end if;
  end if;

  v_provenance := pg_catalog.jsonb_build_object(
    'scope', 'project', 'input', 'standalone_snapshot', 'output', 'server_recalculation',
    'association', pg_catalog.jsonb_build_object(
      'operationId', p_operation_id, 'sourceCalculationId', p_source_calculation_id,
      'sourceRevisionId', p_source_revision_id, 'sourceCreatorId', v_source.created_by,
      'sourceOrganizationId', v_source.organization_id, 'sourceCalculatorType', v_source.calculator_type,
      'sourceValidationStatus', v_source_revision.validation_status,
      'sourceInputSchemaVersion', v_source_revision.input_schema_version,
      'sourceImplementationVersion', v_source_revision.calculator_implementation_version,
      'targetProfileIdentityReassigned', v_source.calculator_type = 'sheet_metal.profiles.flat-pattern'
    ),
    'sourceDataProvenance', v_source_revision.data_provenance
  );

  if v_source.calculator_type = 'gutters.material-estimate' then
    select * into v_result from public.save_gutter_material_calculation(
      p_organization_id, p_project_id, pg_catalog.btrim(p_name), p_input_data, p_output_data,
      v_provenance, v_source_revision.warnings, null, p_expected_project_revision_number
    );
  elsif v_source.calculator_type = 'sheet_metal.flashings.material-estimate' then
    select * into v_result from public.save_flashing_material_calculation(
      p_organization_id, p_project_id, pg_catalog.btrim(p_name), p_input_data, p_output_data,
      v_provenance, v_source_revision.warnings, p_expected_project_revision_number
    );
  else
    select * into v_result from public.save_sheet_metal_profile_calculation(
      p_organization_id, p_project_id, p_project_calculation_id, pg_catalog.btrim(p_name),
      p_input_data, p_expected_project_revision_number
    );
    -- The profile RPC records its own calculation provenance; retain association
    -- provenance in this immutable ledger, which is joined by project readers.
  end if;
  v_target_calculation_id := v_result.calculation_id;
  v_target_revision_id := v_result.calculation_revision_id;
  v_target_revision_number := v_result.revision_number;

  insert into public.calculation_project_associations (
    organization_id, project_id, source_calculation_id, source_revision_id, source_revision_snapshot, source_creator_id,
    calculator_type, project_calculation_id, project_revision_id, operation_id, request_payload, created_by
  ) values (
    p_organization_id, p_project_id, p_source_calculation_id, p_source_revision_id, v_source_snapshot, v_source.created_by,
    v_source.calculator_type, v_target_calculation_id, v_target_revision_id, p_operation_id, v_payload, auth.uid()
  ) returning id into v_association_id;

  return query select v_association_id, v_target_calculation_id, v_target_revision_id, v_target_revision_number, false;
end;
$$;
