-- F9.7.9: additive workspace snapshots; legacy rows/history remain untouched.
alter table public.field_surveys add column sections jsonb;
alter table public.field_survey_revisions add column sections jsonb;

create or replace function private.field_survey_section_measurements(p_sections jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select coalesce(jsonb_agg(m.value order by s.ordinality,m.ordinality),'[]'::jsonb)
 from jsonb_array_elements(p_sections) with ordinality s(value,ordinality)
 cross join lateral jsonb_array_elements(s.value->'measurements') with ordinality m(value,ordinality)
 where m.value->'value'<>'null'::jsonb;
$$;
create or replace function private.valid_field_survey_sections(p_sections jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare s jsonb; ids text[] := '{}'; photo text;
begin
 if jsonb_typeof(p_sections) is distinct from 'array' or jsonb_array_length(p_sections) not between 1 and 30 then return false; end if;
 for s in select jsonb_array_elements(p_sections) loop
  if jsonb_typeof(s) is distinct from 'object' or not(s ?& array['id','name','workType','measurements','notes','photoIds'])
   or s-array['id','name','workType','measurements','notes','photoIds'] <> '{}'::jsonb
   or jsonb_typeof(s->'id') is distinct from 'string' or (s->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   or (s->>'id')=any(ids) or jsonb_typeof(s->'name') is distinct from 'string' or char_length(btrim(s->>'name')) not between 1 and 120
   or coalesce(s->>'workType','') not in ('roof','gutter','flashing','other')
   or jsonb_typeof(s->'notes') is distinct from 'string' or char_length(s->>'notes')>2000
   or jsonb_typeof(s->'measurements') is distinct from 'array'
   or (s->'measurements'<>'[]'::jsonb and not private.valid_field_survey_measurements(
     (select jsonb_agg(case when m->'value'='null'::jsonb then jsonb_set(m,'{value}','0'::jsonb) else m end) from jsonb_array_elements(s->'measurements') m)))
   or jsonb_typeof(s->'photoIds') is distinct from 'array' or jsonb_array_length(s->'photoIds')>100 then return false; end if;
  ids:=array_append(ids,s->>'id');
  for photo in select jsonb_array_elements_text(s->'photoIds') loop
   if photo is null or photo !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return false; end if;
  end loop;
 end loop;
 -- Flat compatibility view retains globally unique measurement IDs and a bounded payload.
 return (select count(*)<=100 and count(distinct m->>'id')=count(*) from jsonb_array_elements(p_sections) sec cross join lateral jsonb_array_elements(sec->'measurements') m);
exception when others then return false;
end;
$$;
revoke all on function private.field_survey_section_measurements(jsonb), private.valid_field_survey_sections(jsonb) from public,anon,authenticated;
alter table public.field_surveys add constraint field_survey_workspace_consistent
 check(sections is null or (private.valid_field_survey_sections(sections) and measurements=private.field_survey_section_measurements(sections)));

create or replace function private.record_field_survey_revision(p_survey_id uuid, p_actor_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare survey_row public.field_surveys%rowtype; revision_id uuid; photo_snapshot jsonb; clean_sections jsonb;
begin
  select * into survey_row from public.field_surveys where id = p_survey_id;
  if not found then raise exception 'Survey not found' using errcode = 'P0002'; end if;
  if survey_row.sections is not null then
    select jsonb_agg(jsonb_set(x.value,'{photoIds}',coalesce((select jsonb_agg(pid.value) from jsonb_array_elements(x.value->'photoIds') pid(value)
      where exists(select 1 from public.field_survey_photos p where p.id::text=pid.value#>>'{}' and p.survey_id=p_survey_id and p.upload_state='active' and p.removed_at is null)), '[]'::jsonb)) order by x.ordinality)
      into clean_sections from jsonb_array_elements(survey_row.sections) with ordinality x(value,ordinality);
    if clean_sections is distinct from survey_row.sections then
      update public.field_surveys set sections=clean_sections where id=p_survey_id;
      survey_row.sections:=clean_sections;
    end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'objectKey', p.object_key, 'displayFilename', p.display_filename,
    'mimeType', p.mime_type, 'fileSize', p.file_size, 'description', p.description,
    'uploadedAt', p.uploaded_at
  ) order by p.uploaded_at, p.id), '[]'::jsonb)
  into photo_snapshot from public.field_survey_photos p
  where p.survey_id = p_survey_id and p.upload_state='active' and p.removed_at is null;
  insert into public.field_survey_revisions(survey_id, organization_id, project_id, version, work_type, measurements, notes, photos_snapshot, created_by, sections)
  values (survey_row.id, survey_row.organization_id, survey_row.project_id, survey_row.version,
    survey_row.work_type, survey_row.measurements, survey_row.notes, photo_snapshot, p_actor_id, survey_row.sections)
  returning id into revision_id;
  return revision_id;
end;
$$;
revoke all on function private.record_field_survey_revision(uuid, uuid) from public, anon, authenticated;

create or replace function public.save_field_survey_workspace(
  p_survey_id uuid, p_organization_id uuid, p_project_id uuid, p_work_type text,
  p_measurements jsonb, p_notes text, p_expected_version integer, p_sections jsonb
)
returns table (survey_id uuid, version integer, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); existing public.field_surveys%rowtype; normalized_notes text := nullif(btrim(p_notes),'');
begin
  if actor_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not private.is_org_member(p_organization_id) then raise exception 'Organization access denied' using errcode = '42501'; end if;
  if p_work_type is null or p_work_type not in ('roof','gutter','flashing','other') or not private.valid_field_survey_sections(p_sections) or p_measurements is distinct from private.field_survey_section_measurements(p_sections)
    or (p_notes is not null and char_length(p_notes) > 2000) or p_expected_version is null or p_expected_version < 0 then
    raise exception 'Invalid field survey payload' using errcode = '22023';
  end if;
  if p_project_id is not null and not exists (select 1 from public.projects p where p.id=p_project_id and p.organization_id=p_organization_id) then
    raise exception 'Project access denied' using errcode = '42501';
  end if;
  if exists(select 1 from jsonb_array_elements(p_sections) s cross join lateral jsonb_array_elements_text(s->'photoIds') pid
    where not exists(select 1 from public.field_survey_photos p where p.id::text=pid and p.survey_id=p_survey_id
      and p.organization_id=p_organization_id and p.upload_state='active' and p.removed_at is null)) then
    raise exception 'Photo association denied' using errcode='42501';
  end if;
  if p_expected_version = 0 then
    if p_survey_id is not null then
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_survey_id::text,0));
      select * into existing from public.field_surveys s where s.id=p_survey_id for update;
      if found then
        if existing.organization_id<>p_organization_id or existing.created_by<>actor_id then raise exception 'Survey access denied' using errcode = '42501'; end if;
        if existing.version=1 and existing.project_id is not distinct from p_project_id and existing.work_type=p_work_type
          and existing.sections=p_sections and existing.measurements=p_measurements and existing.notes is not distinct from normalized_notes then
          survey_id:=existing.id; version:=existing.version; updated_at:=existing.updated_at; return next; return;
        end if;
        raise exception 'Survey changed since it was opened' using errcode = '40001';
      end if;
    end if;
    insert into public.field_surveys(id,organization_id,project_id,created_by,updated_by,work_type,measurements,notes,version,sections)
    values(coalesce(p_survey_id,gen_random_uuid()),p_organization_id,p_project_id,actor_id,actor_id,p_work_type,p_measurements,normalized_notes,1,p_sections)
    returning id,field_surveys.version,field_surveys.updated_at into survey_id,version,updated_at;
    perform private.record_field_survey_revision(survey_id,actor_id);
    return next; return;
  end if;
  if p_survey_id is null then raise exception 'Survey ID required for update' using errcode = '22023'; end if;
  select * into existing from public.field_surveys s where s.id=p_survey_id for update;
  if not found or existing.organization_id<>p_organization_id then raise exception 'Survey not found' using errcode = 'P0002'; end if;
  if existing.project_id is null and existing.created_by<>actor_id then raise exception 'Survey access denied' using errcode = '42501'; end if;
  if existing.project_id is not null and not private.is_org_member(existing.organization_id) then raise exception 'Survey access denied' using errcode = '42501'; end if;
  if existing.project_id is distinct from p_project_id then raise exception 'Project link is immutable' using errcode = '22023'; end if;
  if existing.version=p_expected_version+1 and existing.updated_by=actor_id and existing.work_type=p_work_type
    and existing.sections=p_sections and existing.measurements=p_measurements and existing.notes is not distinct from normalized_notes then
    survey_id:=existing.id; version:=existing.version; updated_at:=existing.updated_at; return next; return;
  end if;
  if existing.version<>p_expected_version then raise exception 'Survey changed since it was opened' using errcode = '40001'; end if;
  update public.field_surveys s set sections=p_sections,work_type=p_work_type,measurements=p_measurements,notes=normalized_notes,updated_by=actor_id,version=existing.version+1
  where s.id=p_survey_id returning s.id,s.version,s.updated_at into survey_id,version,updated_at;
  perform private.record_field_survey_revision(survey_id,actor_id);
  return next;
end;
$$;

revoke all on function public.save_field_survey_workspace(uuid,uuid,uuid,text,jsonb,text,integer,jsonb) from public,anon;
grant execute on function public.save_field_survey_workspace(uuid,uuid,uuid,text,jsonb,text,integer,jsonb) to authenticated;

create table public.field_survey_calculation_links (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 survey_id uuid not null, survey_revision_id uuid not null references public.field_survey_revisions(id), section_id uuid not null,
 calculation_id uuid not null, calculation_revision_id uuid not null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 foreign key(survey_id,organization_id) references public.field_surveys(id,organization_id),
 foreign key(calculation_id,organization_id) references public.calculations(id,organization_id),
 foreign key(calculation_revision_id,calculation_id) references public.calculation_revisions(id,calculation_id),
 unique(survey_id,section_id,calculation_revision_id)
);
create table public.field_survey_followups (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 survey_id uuid not null, survey_revision_id uuid not null references public.field_survey_revisions(id),
 kind text not null check(kind in ('project','quotation')), project_id uuid, quotation_id uuid,
 quotation_revision_id uuid references public.quotation_revisions(id),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 foreign key(survey_id,organization_id) references public.field_surveys(id,organization_id),
 foreign key(project_id,organization_id) references public.projects(id,organization_id),
 foreign key(quotation_id,organization_id) references public.quotations(id,organization_id),
 check((kind='project' and project_id is not null and quotation_id is null and quotation_revision_id is null)
    or (kind='quotation' and quotation_id is not null and quotation_revision_id is not null)),
 unique nulls not distinct(survey_id,kind,project_id)
);
create unique index field_survey_one_project on public.field_survey_followups(survey_id) where kind='project';

alter table public.field_survey_calculation_links enable row level security;
alter table public.field_survey_followups enable row level security;
revoke all on public.field_survey_calculation_links, public.field_survey_followups from public,anon,authenticated;
grant select on public.field_survey_calculation_links, public.field_survey_followups to authenticated;
create policy survey_calculation_links_read on public.field_survey_calculation_links for select to authenticated
 using(private.can_access_field_survey(survey_id,organization_id) and exists(select 1 from public.calculation_revisions r where r.id=calculation_revision_id));
create policy survey_followups_read on public.field_survey_followups for select to authenticated
 using(private.can_access_field_survey(survey_id,organization_id)
 and (project_id is null or exists(select 1 from public.projects p where p.id=project_id))
 and (quotation_id is null or exists(select 1 from public.quotations q where q.id=quotation_id)));
create trigger survey_calculation_links_immutable before update or delete on public.field_survey_calculation_links
 for each row execute function private.block_field_survey_revision_mutation();
create trigger survey_followups_immutable before update or delete on public.field_survey_followups
 for each row execute function private.block_field_survey_revision_mutation();

create function public.link_field_survey_calculation(p_survey_id uuid,p_revision_id uuid,p_section_id uuid,p_calculation_id uuid,p_calculation_revision_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.field_surveys%rowtype; r public.field_survey_revisions%rowtype; c public.calculations%rowtype; link_id uuid; section_type text;
begin
 select * into s from public.field_surveys where id=p_survey_id for update;
 if not found or not private.can_access_field_survey(s.id,s.organization_id) then raise exception 'Survey access denied' using errcode='42501'; end if;
 select * into r from public.field_survey_revisions where id=p_revision_id and survey_id=s.id and organization_id=s.organization_id;
 if not found then raise exception 'Exact survey revision required' using errcode='42501'; end if;
 select x->>'workType' into section_type from jsonb_array_elements(r.sections) x where x->>'id'=p_section_id::text;
 if section_type is null then raise exception 'Section not found in source revision' using errcode='22023'; end if;
 select * into c from public.calculations where id=p_calculation_id and organization_id=s.organization_id;
 if not found or (c.ownership_scope='standalone' and c.created_by is distinct from auth.uid())
  or (c.ownership_scope='project' and not exists(select 1 from public.projects p where p.id=c.project_id and p.organization_id=s.organization_id)) then
  raise exception 'Calculation access denied' using errcode='42501'; end if;
 if not exists(select 1 from public.calculation_revisions cr where cr.id=p_calculation_revision_id and cr.calculation_id=c.id and cr.organization_id=s.organization_id) then
  raise exception 'Exact calculation revision required' using errcode='42501'; end if;
 if not ((section_type='gutter' and c.calculator_type='gutters.material-estimate')
  or (section_type='flashing' and c.calculator_type='sheet_metal.flashings.material-estimate')
  or (section_type='roof' and c.calculator_type in ('roof.gable.trapezoidal-covering','roof.gable.metal-tile-covering'))) then
  raise exception 'Incompatible calculator' using errcode='22023'; end if;
 select id into link_id from public.field_survey_calculation_links where survey_id=s.id and section_id=p_section_id and calculation_revision_id=p_calculation_revision_id;
 if found then
  if not exists(select 1 from public.field_survey_calculation_links where id=link_id and survey_revision_id=p_revision_id and calculation_id=p_calculation_id) then
   raise exception 'Link retry mismatch' using errcode='22023'; end if;
  return link_id;
 end if;
 insert into public.field_survey_calculation_links(organization_id,survey_id,survey_revision_id,section_id,calculation_id,calculation_revision_id,created_by)
 values(s.organization_id,s.id,r.id,p_section_id,c.id,p_calculation_revision_id,auth.uid()) returning id into link_id;
 return link_id;
end;
$$;
revoke all on function public.link_field_survey_calculation(uuid,uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.link_field_survey_calculation(uuid,uuid,uuid,uuid,uuid) to authenticated;

-- One guarded transaction per step. The application commits the project step first;
-- a failed quotation step can be retried without recreating the project.
create function public.create_field_survey_followup(p_survey_id uuid,p_revision_id uuid,p_kind text,p_project_id uuid,p_name text)
returns setof public.field_survey_followups language plpgsql security definer set search_path='' as $$
declare s public.field_surveys%rowtype; r public.field_survey_revisions%rowtype; existing public.field_survey_followups%rowtype;
 target_project uuid:=p_project_id; quote_id uuid; quote_revision uuid; linked_project uuid;
begin
 select * into s from public.field_surveys where id=p_survey_id for update;
 if not found or not private.can_access_field_survey(s.id,s.organization_id) then raise exception 'Survey access denied' using errcode='42501'; end if;
 select * into r from public.field_survey_revisions where id=p_revision_id and survey_id=s.id and organization_id=s.organization_id;
 if not found then raise exception 'Exact revision required' using errcode='42501'; end if;
 if p_kind is null or p_kind not in ('project','quotation') or p_name is null or char_length(btrim(p_name)) not between 1 and 200 then raise exception 'Invalid followup' using errcode='22023'; end if;
 if target_project is not null and not exists(select 1 from public.projects p where p.id=target_project and p.organization_id=s.organization_id and p.status<>'archived') then
  raise exception 'Project access denied' using errcode='42501'; end if;
 select f.project_id into linked_project from public.field_survey_followups f where f.survey_id=s.id and f.kind='project';
 if p_kind='project' then
  select * into existing from public.field_survey_followups f where f.survey_id=s.id and f.kind='project';
 else
  if target_project is not null and target_project is distinct from coalesce(linked_project,s.project_id) then raise exception 'Project association required' using errcode='42501'; end if;
  select * into existing from public.field_survey_followups f where f.survey_id=s.id and f.kind='quotation' and f.project_id is not distinct from target_project;
 end if;
 if found then
  -- Natural idempotency survives reloads and double clicks. Existing source is never rewritten.
  if p_kind='project' and p_project_id is not null and p_project_id<>existing.project_id then raise exception 'Survey already linked to another project' using errcode='22023'; end if;
  if existing.quotation_id is not null and not exists(select 1 from public.quotations q where q.id=existing.quotation_id
    and (q.ownership_scope='project' or q.created_by=auth.uid())) then raise exception 'Quotation access denied' using errcode='42501'; end if;
  return next existing; return;
 end if;
 if s.version<>r.version then raise exception 'Survey changed since it was opened' using errcode='40001'; end if;
 if p_kind='project' then
  target_project:=coalesce(target_project,s.project_id);
  if target_project is null then
   insert into public.projects(organization_id,name,project_type,created_by)
   values(s.organization_id,btrim(p_name),'other',auth.uid()) returning id into target_project;
  elsif s.project_id is not null and s.project_id<>target_project then raise exception 'Original project is immutable' using errcode='22023'; end if;
 else
  if target_project is null then
   select q.quotation_id,q.revision_id into quote_id,quote_revision
   from public.save_standalone_quotation_draft_with_document(s.organization_id,gen_random_uuid(),null,btrim(p_name),null,'[]'::jsonb,0,
    jsonb_build_object('recipientSource','manual','recipientName','','recipientAddress','','recipientEmail','','recipientPhone','','recipientTaxIdentifier','','reference','','validUntil','','notes',coalesce(r.notes,''),'terms','')) q;
  else
   select q.quotation_id,q.revision_id into quote_id,quote_revision from public.save_quotation_draft(
    s.organization_id,target_project,null,btrim(p_name),null,'HUF',
    jsonb_build_object('name',btrim(p_name),'clientId',null,'currency','HUF','priceClass',null,'lines','[]'::jsonb,
      'surveySource',jsonb_build_object('surveyId',s.id,'revisionId',r.id,'version',r.version)),
    '[]'::jsonb,jsonb_build_object('priceClass',null,'subtotal',null,'currency','HUF','complete',false),null,0) q;
  end if;
 end if;
 insert into public.field_survey_followups(organization_id,survey_id,survey_revision_id,kind,project_id,quotation_id,quotation_revision_id,created_by)
 values(s.organization_id,s.id,r.id,p_kind,target_project,quote_id,quote_revision,auth.uid()) returning * into existing;
 return next existing;
end;
$$;
revoke all on function public.create_field_survey_followup(uuid,uuid,text,uuid,text) from public,anon;
grant execute on function public.create_field_survey_followup(uuid,uuid,text,uuid,text) to authenticated;
