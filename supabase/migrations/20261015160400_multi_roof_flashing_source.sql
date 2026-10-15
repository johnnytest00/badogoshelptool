-- F9.10: restricted, idempotent flashing save for exact non-gable roof edges.
create table public.multi_roof_flashing_save_operations (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  operation_id uuid not null,
  project_id uuid not null references public.projects(id) on delete restrict,
  request_payload jsonb not null,
  calculation_id uuid not null,
  calculation_revision_id uuid not null,
  revision_number integer not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(organization_id,operation_id)
);
alter table public.multi_roof_flashing_save_operations enable row level security;
revoke all on public.multi_roof_flashing_save_operations from public,anon,authenticated;

create function public.save_multi_roof_flashing_calculation(
  p_organization_id uuid,
  p_project_id uuid,
  p_name text,
  p_input_data jsonb,
  p_output_data jsonb,
  p_data_provenance jsonb,
  p_warnings jsonb,
  p_expected_revision_number integer,
  p_operation_id uuid,
  p_actor_id uuid
)
returns table (calculation_id uuid, calculation_revision_id uuid, revision_number integer, reused boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  v_calculation_id uuid;
  v_revision_id uuid;
  v_current integer := 0;
  v_next integer;
  v_run jsonb;
  v_ref jsonb;
  v_source_length numeric;
  v_expected_field text;
  v_expected_category text;
  v_edge jsonb;
  v_edge_count integer;
  v_edge_kind text;
  v_prior public.multi_roof_flashing_save_operations%rowtype;
  v_payload jsonb;
begin
  if p_actor_id is null or p_operation_id is null or p_expected_revision_number is null or p_expected_revision_number < 0
     or not exists (select 1 from public.organization_members m where m.organization_id=p_organization_id and m.user_id=p_actor_id) then
    raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501';
  end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 200 then
    raise exception 'A kalkuláció megnevezése kötelező.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.projects where id = p_project_id and organization_id = p_organization_id) then
    raise exception 'A projekt nem található ebben a műhelyben.' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_input_data) is distinct from 'object'
     or jsonb_typeof(p_input_data -> 'runs') is distinct from 'array'
     or jsonb_typeof(p_output_data) is distinct from 'object' then
    raise exception 'A kalkuláció bemenete vagy eredménye érvénytelen.' using errcode = '22023';
  end if;

  v_payload := jsonb_build_object('project',p_project_id,'name',trim(p_name),'input',p_input_data,'output',p_output_data,'expected',p_expected_revision_number);
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':multi-roof-flashing-op:' || p_operation_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || p_project_id::text || ':sheet_metal.flashings.material-estimate', 0));
  select * into v_prior from public.multi_roof_flashing_save_operations o where o.organization_id=p_organization_id and o.operation_id=p_operation_id;
  if found then
    if v_prior.created_by<>p_actor_id or v_prior.project_id<>p_project_id or v_prior.request_payload is distinct from v_payload then
      raise exception 'A műveletazonosító más kéréshez tartozik.' using errcode='22023';
    end if;
    return query select v_prior.calculation_id,v_prior.calculation_revision_id,v_prior.revision_number,true;
    return;
  end if;
  select c.id into v_calculation_id
  from public.calculations c
  where c.organization_id = p_organization_id and c.project_id = p_project_id
    and c.roof_model_id is null and c.calculator_type = 'sheet_metal.flashings.material-estimate'
  for update;
  if v_calculation_id is not null then
    select coalesce(max(cr.revision_number), 0) into v_current
    from public.calculation_revisions cr where cr.calculation_id = v_calculation_id;
  end if;
  if p_expected_revision_number is distinct from v_current then
    raise exception 'A kalkuláció időközben megváltozott; töltsd újra az oldalt.' using errcode = '40001';
  end if;

  -- Validate and lock each exact source pair before creating the immutable revision.
  for v_run in select value from jsonb_array_elements(p_input_data -> 'runs')
  loop
    if jsonb_typeof(v_run) is distinct from 'object'
       or coalesce(v_run ->> 'category', '') not in ('verge', 'wall', 'eaves', 'ridge', 'hip', 'valley', 'custom')
       or coalesce(v_run ->> 'lengthSource', '') not in ('geometry', 'site_measurement', 'drawing', 'user_provided', 'demo')
       or jsonb_typeof(v_run -> 'lengthMm') is distinct from 'number'
       or (v_run ->> 'lengthMm') !~ '^[0-9]+$'
       or (v_run ->> 'lengthMm')::numeric <= 0
       or (v_run ->> 'lengthMm')::numeric > 9007199254740991 then
      raise exception 'A szegélyszakasz alapadata érvénytelen.' using errcode = '22023';
    end if;
    v_ref := v_run -> 'roofEdgeReference';
    if jsonb_typeof(v_ref) = 'object' then
      if jsonb_typeof(v_ref -> 'suggestedLengthMm') is distinct from 'number'
         or (v_ref ->> 'suggestedLengthMm')::numeric <= 0
         or (v_ref ->> 'suggestedLengthMm')::numeric > 9007199254740991
         or (v_ref ? 'lengthOverridden' and jsonb_typeof(v_ref -> 'lengthOverridden') is distinct from 'boolean') then
        raise exception 'A geometriai eredethossz vagy felülírásjelző érvénytelen.' using errcode = '22023';
      end if;
      if v_ref ->> 'outputField' = 'edges' then
        perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':roof-geometry-model:' || (v_ref ->> 'roofModelId'), 0));
        perform 1 from public.roof_models m
          join public.roof_model_revisions mr on mr.id=m.current_revision_id
          join public.calculations c on c.roof_model_id=m.id and c.organization_id=m.organization_id
          join public.calculation_revisions cr on cr.id=c.current_revision_id
        where m.id=nullif(v_ref->>'roofModelId','')::uuid and m.organization_id=p_organization_id and m.project_id=p_project_id
          and m.roof_type in ('shed','hip','pyramid','halfHip','lShape','tShape')
          and mr.id=nullif(v_ref->>'roofModelRevisionId','')::uuid and mr.roof_model_id=m.id and mr.validation_status='verified'
          and c.id=nullif(v_ref->>'calculationId','')::uuid and c.calculator_type='roof.geometry.'||m.roof_type
          and cr.id=nullif(v_ref->>'calculationRevisionId','')::uuid and cr.calculation_id=c.id and cr.validation_status='verified'
          and exists (select 1 from public.calculation_dependencies d where d.downstream_calculation_revision_id=cr.id and d.upstream_roof_model_revision_id=mr.id)
        for share of m,c;
        if not found then raise exception 'A forrás tetőgeometria elavult vagy idegen.' using errcode='40001'; end if;
        select count(*), (array_agg(edge.value))[1] into v_edge_count,v_edge
        from public.calculation_revisions cr, jsonb_array_elements(cr.output_snapshot->'edges') edge(value)
        where cr.id=nullif(v_ref->>'calculationRevisionId','')::uuid and cr.organization_id=p_organization_id
          and edge.value->>'id'=v_ref->>'edgeId';
        if v_edge_count<>1 or jsonb_typeof(v_edge->'lengthMm') is distinct from 'number' then
          raise exception 'A forrás tetőél nem egyértelmű.' using errcode='22023';
        end if;
        v_edge_kind := v_edge->>'kind';
        v_expected_category := case v_edge_kind when 'eave' then 'eaves' when 'rake' then 'verge'
          when 'ridge' then 'ridge' when 'hip' then 'hip' when 'valley' then 'valley' else null end;
        v_source_length := (v_edge->>'lengthMm')::numeric;
        if v_expected_category is null or v_run->>'category' is distinct from v_expected_category
           or v_run->>'lengthSource' is distinct from 'geometry'
           or v_source_length<=0 or v_source_length is distinct from (v_ref->>'suggestedLengthMm')::numeric
           or (coalesce((v_ref->>'lengthOverridden')::boolean,false) is false and (v_run->>'lengthMm')::numeric is distinct from ceil(v_source_length)) then
          raise exception 'A forrás tetőél típusa vagy hossza eltér.' using errcode='22023';
        end if;
      else
      v_expected_field := case v_ref ->> 'edgeId'
        when 'left-eave' then 'lengths.eachEaveEdgeMm'
        when 'right-eave' then 'lengths.eachEaveEdgeMm'
        when 'ridge' then 'lengths.ridgeLineMm'
        when 'left-front-gable' then 'lengths.eachSlopingGableEdgeMm'
        when 'left-rear-gable' then 'lengths.eachSlopingGableEdgeMm'
        when 'right-front-gable' then 'lengths.eachSlopingGableEdgeMm'
        when 'right-rear-gable' then 'lengths.eachSlopingGableEdgeMm'
        else null end;
      v_expected_category := case v_ref ->> 'edgeId'
        when 'left-eave' then 'eaves' when 'right-eave' then 'eaves'
        when 'ridge' then 'ridge'
        when 'left-front-gable' then 'verge' when 'left-rear-gable' then 'verge'
        when 'right-front-gable' then 'verge' when 'right-rear-gable' then 'verge'
        else null end;
      if v_expected_field is null or v_ref ->> 'outputField' is distinct from v_expected_field
         or v_run ->> 'category' is distinct from v_expected_category
         or v_run ->> 'lengthSource' is distinct from 'geometry' then
        raise exception 'A geometriai él-hozzárendelés érvénytelen.' using errcode = '22023';
      end if;
      perform 1 from public.roof_models m
      where m.id = nullif(v_ref ->> 'roofModelId', '')::uuid
        and m.organization_id = p_organization_id and m.project_id = p_project_id
        and m.roof_type = 'gable' and m.current_revision_id = nullif(v_ref ->> 'roofModelRevisionId', '')::uuid
      for share;
      if not found then raise exception 'A forrás tetőmodell vagy revízió nem aktuális ehhez a projekthez.' using errcode = 'P0002'; end if;
      if not exists (
        select 1 from public.roof_model_revisions r
        where r.id = nullif(v_ref ->> 'roofModelRevisionId', '')::uuid
          and r.roof_model_id = nullif(v_ref ->> 'roofModelId', '')::uuid
          and r.organization_id = p_organization_id and r.validation_status = 'verified'
      ) then raise exception 'A forrás tetőrevízió nem ellenőrzött.' using errcode = 'P0002'; end if;
      perform 1 from public.calculations c
      where c.organization_id = p_organization_id and c.project_id = p_project_id
        and c.id = nullif(v_ref ->> 'calculationId', '')::uuid
        and c.roof_model_id = nullif(v_ref ->> 'roofModelId', '')::uuid
        and c.calculator_type = 'roof.gable'
        and c.current_revision_id = nullif(v_ref ->> 'calculationRevisionId', '')::uuid
      for share;
      if not found then raise exception 'A forrás tetőkalkuláció időközben megváltozott.' using errcode = '40001'; end if;
      select case v_expected_field
        when 'lengths.eachEaveEdgeMm' then (r.output_snapshot #>> '{lengths,eachEaveEdgeMm}')::numeric
        when 'lengths.ridgeLineMm' then (r.output_snapshot #>> '{lengths,ridgeLineMm}')::numeric
        when 'lengths.eachSlopingGableEdgeMm' then (r.output_snapshot #>> '{lengths,eachSlopingGableEdgeMm}')::numeric
      end into v_source_length
      from public.calculation_revisions r
      join public.calculations c on c.id = r.calculation_id
      where r.id = nullif(v_ref ->> 'calculationRevisionId', '')::uuid
        and r.organization_id = p_organization_id and r.validation_status = 'verified'
        and c.calculator_type = 'roof.gable' and c.roof_model_id = nullif(v_ref ->> 'roofModelId', '')::uuid;
      if v_source_length is null or v_source_length <= 0
         or v_source_length is distinct from (v_ref ->> 'suggestedLengthMm')::numeric
         or (coalesce((v_ref ->> 'lengthOverridden')::boolean, false) is false
             and (v_run ->> 'lengthMm')::numeric is distinct from ceil(v_source_length))
         or not exists (
           select 1 from public.calculation_dependencies d
           where d.downstream_calculation_revision_id = nullif(v_ref ->> 'calculationRevisionId', '')::uuid
             and d.upstream_roof_model_revision_id = nullif(v_ref ->> 'roofModelRevisionId', '')::uuid
         ) then
        raise exception 'A javasolt geometriai hossz nem egyezik a forrássnapshot-tal.' using errcode = '22023';
      end if;
      end if;
    elsif v_run ->> 'lengthSource' = 'geometry' then
      raise exception 'Geometriai hosszhoz forráshivatkozás szükséges.' using errcode = '22023';
    end if;
  end loop;

  if v_calculation_id is null then
    insert into public.calculations (organization_id, project_id, calculator_type, display_name, status)
    values (p_organization_id, p_project_id, 'sheet_metal.flashings.material-estimate', trim(p_name), 'current')
    returning id into v_calculation_id;
  end if;
  v_next := v_current + 1;
  insert into public.calculation_revisions (
    organization_id, calculation_id, revision_number, input_schema_version,
    calculator_implementation_version, input_snapshot, output_snapshot,
    data_provenance, validation_status, warnings, created_by
  ) values (
    p_organization_id, v_calculation_id, v_next, '1.0.0', '1.0.0',
    p_input_data, p_output_data, coalesce(p_data_provenance, '{}'::jsonb),
    'verified', coalesce(p_warnings, '[]'::jsonb), p_actor_id
  ) returning id into v_revision_id;
  update public.calculations set display_name = trim(p_name), current_revision_id = v_revision_id, status = 'current'
  where id = v_calculation_id and organization_id = p_organization_id;

  insert into public.calculation_dependencies (organization_id, downstream_calculation_revision_id, upstream_roof_model_revision_id, dependency_type)
  select distinct p_organization_id, v_revision_id, (run.value -> 'roofEdgeReference' ->> 'roofModelRevisionId')::uuid, 'flashing_roof_geometry'
  from jsonb_array_elements(p_input_data -> 'runs') run(value)
  where jsonb_typeof(run.value -> 'roofEdgeReference') = 'object'
  on conflict do nothing;
  insert into public.calculation_dependencies (organization_id, downstream_calculation_revision_id, upstream_calculation_revision_id, dependency_type)
  select distinct p_organization_id, v_revision_id, (run.value -> 'roofEdgeReference' ->> 'calculationRevisionId')::uuid, 'flashing_roof_calculation'
  from jsonb_array_elements(p_input_data -> 'runs') run(value)
  where jsonb_typeof(run.value -> 'roofEdgeReference') = 'object'
  on conflict do nothing;
  insert into public.multi_roof_flashing_save_operations(organization_id,operation_id,project_id,request_payload,calculation_id,calculation_revision_id,revision_number,created_by)
    values(p_organization_id,p_operation_id,p_project_id,v_payload,v_calculation_id,v_revision_id,v_next,p_actor_id);
  return query select v_calculation_id, v_revision_id, v_next, false;
end;
$$;

revoke all on function public.save_multi_roof_flashing_calculation(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,integer,uuid,uuid) from public,anon,authenticated;
grant execute on function public.save_multi_roof_flashing_calculation(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,integer,uuid,uuid) to tetopro_covering_writer;
