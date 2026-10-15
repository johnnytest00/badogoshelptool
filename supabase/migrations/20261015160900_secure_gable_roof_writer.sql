-- F9.10: close the legacy browser-writable roof.gable snapshot path.
revoke execute on function public.save_gable_roof_calculation(uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,integer) from authenticated;

create policy gable_model_insert_guard on public.roof_models as restrictive for insert to authenticated with check (roof_type <> 'gable');
create policy gable_model_update_guard on public.roof_models as restrictive for update to authenticated using (roof_type <> 'gable') with check (roof_type <> 'gable');
create policy gable_model_delete_guard on public.roof_models as restrictive for delete to authenticated using (roof_type <> 'gable');
create policy gable_revision_insert_guard on public.roof_model_revisions as restrictive for insert to authenticated
  with check (not exists (select 1 from public.roof_models m where m.id=roof_model_id and m.organization_id=organization_id and m.roof_type='gable'));
create policy gable_calculation_insert_guard on public.calculations as restrictive for insert to authenticated with check (calculator_type <> 'roof.gable');
create policy gable_calculation_update_guard on public.calculations as restrictive for update to authenticated using (calculator_type <> 'roof.gable') with check (calculator_type <> 'roof.gable');
create policy gable_calculation_delete_guard on public.calculations as restrictive for delete to authenticated using (calculator_type <> 'roof.gable');
create policy gable_calc_revision_insert_guard on public.calculation_revisions as restrictive for insert to authenticated
  with check (not exists (select 1 from public.calculations c where c.id=calculation_id and c.organization_id=organization_id and c.calculator_type='roof.gable'));
create policy gable_dependency_insert_guard on public.calculation_dependencies as restrictive for insert to authenticated
  with check (not exists (select 1 from public.calculation_revisions r join public.calculations c on c.id=r.calculation_id where r.id=downstream_calculation_revision_id and c.calculator_type='roof.gable'));
create policy gable_dependency_update_guard on public.calculation_dependencies as restrictive for update to authenticated
  using (not exists (select 1 from public.calculation_revisions r join public.calculations c on c.id=r.calculation_id where r.id=downstream_calculation_revision_id and c.calculator_type='roof.gable'))
  with check (not exists (select 1 from public.calculation_revisions r join public.calculations c on c.id=r.calculation_id where r.id=downstream_calculation_revision_id and c.calculator_type='roof.gable'));
create policy gable_dependency_delete_guard on public.calculation_dependencies as restrictive for delete to authenticated
  using (not exists (select 1 from public.calculation_revisions r join public.calculations c on c.id=r.calculation_id where r.id=downstream_calculation_revision_id and c.calculator_type='roof.gable'));

create table public.gable_roof_save_operations (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  operation_id uuid not null,
  roof_model_id uuid not null,
  request_payload jsonb not null,
  roof_model_revision_id uuid not null,
  calculation_id uuid not null,
  calculation_revision_id uuid not null,
  revision_number integer not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (organization_id, operation_id)
);
alter table public.gable_roof_save_operations enable row level security;
revoke all on public.gable_roof_save_operations from public,anon,authenticated;

create function public.save_gable_roof_calculation_secure(
  p_organization_id uuid,p_project_id uuid,p_roof_model_id uuid,p_operation_id uuid,
  p_expected_revision_number integer,p_name text,p_input_data jsonb,p_output_data jsonb,
  p_data_provenance jsonb,p_actor_id uuid
)
returns table(roof_model_id uuid,roof_model_revision_id uuid,calculation_id uuid,
  calculation_revision_id uuid,revision_number integer,reused boolean)
language plpgsql security definer set search_path='' as $$
declare
  v_roof public.roof_models%rowtype;
  v_prior public.gable_roof_save_operations%rowtype;
  v_calculation public.calculations%rowtype;
  v_current integer:=0;
  v_roof_revision uuid;
  v_calculation_id uuid;
  v_calculation_revision uuid;
  v_payload jsonb;
begin
  if p_actor_id is null or p_organization_id is null or p_project_id is null or p_roof_model_id is null or p_operation_id is null
    or p_expected_revision_number is null or p_expected_revision_number<0
    or p_name is null or pg_catalog.char_length(pg_catalog.btrim(p_name)) not between 1 and 200
    or pg_catalog.jsonb_typeof(p_input_data) is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_output_data) is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_output_data->'areas') is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_output_data->'planes') is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_data_provenance) is distinct from 'object' then
    raise exception 'Érvénytelen nyeregtető-mentési adat.' using errcode='22023';
  end if;
  perform 1 from public.organization_members m where m.organization_id=p_organization_id and m.user_id=p_actor_id for share;
  if not found then raise exception 'A műhelyhez nincs hozzáférésed.' using errcode='42501'; end if;
  perform 1 from public.projects p where p.id=p_project_id and p.organization_id=p_organization_id for share;
  if not found then raise exception 'A projekt nem érhető el.' using errcode='42501'; end if;
  v_payload:=pg_catalog.jsonb_build_object('projectId',p_project_id,'modelId',p_roof_model_id,
    'expected',p_expected_revision_number,'name',pg_catalog.btrim(p_name),'input',p_input_data,
    'output',p_output_data,'provenance',p_data_provenance);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text||':gable-roof-op:'||p_operation_id::text,0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text||':gable-roof-model:'||p_roof_model_id::text,0));
  select * into v_prior from public.gable_roof_save_operations o where o.organization_id=p_organization_id and o.operation_id=p_operation_id;
  if found then
    if v_prior.created_by<>p_actor_id or v_prior.roof_model_id<>p_roof_model_id or v_prior.request_payload is distinct from v_payload then
      raise exception 'A műveletazonosító más kéréshez tartozik.' using errcode='22023';
    end if;
    return query select p_roof_model_id,v_prior.roof_model_revision_id,v_prior.calculation_id,v_prior.calculation_revision_id,v_prior.revision_number,true;
    return;
  end if;
  select * into v_roof from public.roof_models m where m.id=p_roof_model_id for update;
  if found then
    if v_roof.organization_id<>p_organization_id or v_roof.project_id<>p_project_id or v_roof.roof_type<>'gable' then
      raise exception 'A tetőmodell forrása vagy típusa nem egyezik.' using errcode='42501';
    end if;
    select r.revision_number into v_current from public.roof_model_revisions r where r.id=v_roof.current_revision_id and r.roof_model_id=v_roof.id;
    v_current:=coalesce(v_current,0);
  end if;
  if v_current is distinct from p_expected_revision_number then raise exception 'A tetőmodell időközben megváltozott.' using errcode='40001'; end if;
  if v_current=0 then
    insert into public.roof_models(id,organization_id,project_id,name,roof_type) values(p_roof_model_id,p_organization_id,p_project_id,pg_catalog.btrim(p_name),'gable');
  else
    update public.roof_models set name=pg_catalog.btrim(p_name) where id=p_roof_model_id;
  end if;
  insert into public.roof_model_revisions(organization_id,roof_model_id,revision_number,schema_version,input_data,validation_status,created_by)
    values(p_organization_id,p_roof_model_id,v_current+1,'1.0.0',p_input_data,'verified',p_actor_id) returning id into v_roof_revision;
  update public.roof_models set current_revision_id=v_roof_revision where id=p_roof_model_id;
  select * into v_calculation from public.calculations c where c.roof_model_id=p_roof_model_id and c.organization_id=p_organization_id and c.calculator_type='roof.gable' for update;
  if found then
    v_calculation_id:=v_calculation.id;
    update public.calculations set display_name=pg_catalog.btrim(p_name),status='current' where id=v_calculation_id;
  else
    insert into public.calculations(organization_id,project_id,roof_model_id,calculator_type,display_name,status)
      values(p_organization_id,p_project_id,p_roof_model_id,'roof.gable',pg_catalog.btrim(p_name),'current') returning id into v_calculation_id;
  end if;
  insert into public.calculation_revisions(organization_id,calculation_id,revision_number,input_schema_version,calculator_implementation_version,
    input_snapshot,output_snapshot,data_provenance,validation_status,warnings,created_by)
    values(p_organization_id,v_calculation_id,v_current+1,'1.0.0','1.0.0',p_input_data,p_output_data,p_data_provenance,'verified','[]'::jsonb,p_actor_id)
    returning id into v_calculation_revision;
  update public.calculations set current_revision_id=v_calculation_revision,status='current' where id=v_calculation_id;
  insert into public.calculation_dependencies(organization_id,downstream_calculation_revision_id,upstream_roof_model_revision_id,dependency_type)
    values(p_organization_id,v_calculation_revision,v_roof_revision,'roof_model_input');
  insert into public.gable_roof_save_operations(organization_id,operation_id,roof_model_id,request_payload,roof_model_revision_id,
    calculation_id,calculation_revision_id,revision_number,created_by)
    values(p_organization_id,p_operation_id,p_roof_model_id,v_payload,v_roof_revision,v_calculation_id,v_calculation_revision,v_current+1,p_actor_id);
  return query select p_roof_model_id,v_roof_revision,v_calculation_id,v_calculation_revision,v_current+1,false;
end;$$;
revoke all on function public.save_gable_roof_calculation_secure(uuid,uuid,uuid,uuid,integer,text,jsonb,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.save_gable_roof_calculation_secure(uuid,uuid,uuid,uuid,integer,text,jsonb,jsonb,jsonb,uuid) to tetopro_covering_writer;
