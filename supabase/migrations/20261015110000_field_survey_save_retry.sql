-- F9.7.8.3: retryable client-generated survey IDs and ambiguous-response reconciliation.
create or replace function public.save_field_survey(
  p_survey_id uuid, p_organization_id uuid, p_project_id uuid, p_work_type text,
  p_measurements jsonb, p_notes text, p_expected_version integer
)
returns table (survey_id uuid, version integer, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); existing public.field_surveys%rowtype; normalized_notes text := nullif(btrim(p_notes),'');
begin
  if actor_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not private.is_org_member(p_organization_id) then raise exception 'Organization access denied' using errcode = '42501'; end if;
  if p_work_type is null or p_work_type not in ('roof','gutter','flashing','other') or not private.valid_field_survey_measurements(p_measurements)
    or (p_notes is not null and char_length(p_notes) > 2000) or p_expected_version is null or p_expected_version < 0 then
    raise exception 'Invalid field survey payload' using errcode = '22023';
  end if;
  if p_project_id is not null and not exists (select 1 from public.projects p where p.id=p_project_id and p.organization_id=p_organization_id) then
    raise exception 'Project access denied' using errcode = '42501';
  end if;
  if p_expected_version = 0 then
    if p_survey_id is not null then
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_survey_id::text,0));
      select * into existing from public.field_surveys s where s.id=p_survey_id for update;
      if found then
        if existing.organization_id<>p_organization_id or existing.created_by<>actor_id then raise exception 'Survey access denied' using errcode = '42501'; end if;
        if existing.version=1 and existing.project_id is not distinct from p_project_id and existing.work_type=p_work_type
          and existing.measurements=p_measurements and existing.notes is not distinct from normalized_notes then
          survey_id:=existing.id; version:=existing.version; updated_at:=existing.updated_at; return next; return;
        end if;
        raise exception 'Survey changed since it was opened' using errcode = '40001';
      end if;
    end if;
    insert into public.field_surveys(id,organization_id,project_id,created_by,updated_by,work_type,measurements,notes,version)
    values(coalesce(p_survey_id,gen_random_uuid()),p_organization_id,p_project_id,actor_id,actor_id,p_work_type,p_measurements,normalized_notes,1)
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
    and existing.measurements=p_measurements and existing.notes is not distinct from normalized_notes then
    survey_id:=existing.id; version:=existing.version; updated_at:=existing.updated_at; return next; return;
  end if;
  if existing.version<>p_expected_version then raise exception 'Survey changed since it was opened' using errcode = '40001'; end if;
  update public.field_surveys s set work_type=p_work_type,measurements=p_measurements,notes=normalized_notes,updated_by=actor_id,version=existing.version+1
  where s.id=p_survey_id returning s.id,s.version,s.updated_at into survey_id,version,updated_at;
  perform private.record_field_survey_revision(survey_id,actor_id);
  return next;
end;
$$;
revoke all on function public.save_field_survey(uuid,uuid,uuid,text,jsonb,text,integer) from public, anon;
grant execute on function public.save_field_survey(uuid,uuid,uuid,text,jsonb,text,integer) to authenticated;
