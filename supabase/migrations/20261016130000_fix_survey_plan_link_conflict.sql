-- Qualify the idempotent relationship conflict target by constraint name.
-- The function's survey_revision_id output column otherwise shadows the column.
create or replace function public.link_field_survey_execution_plan(
  p_organization_id uuid,
  p_survey_id uuid,
  p_survey_revision_id uuid,
  p_execution_plan_id uuid,
  p_request_key uuid default gen_random_uuid()
) returns table(link_id uuid, execution_plan_id uuid, survey_revision_id uuid, survey_version integer)
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  survey_row public.field_surveys%rowtype;
  revision_row public.field_survey_revisions%rowtype;
  plan_row public.execution_plans%rowtype;
  link_row public.field_survey_execution_plan_links%rowtype;
begin
  if actor_id is null or p_request_key is null then
    raise exception 'survey-plan link access denied' using errcode = '42501';
  end if;
  select * into survey_row from public.field_surveys s
    where s.id = p_survey_id and s.organization_id = p_organization_id for update;
  if not found or not private.can_access_field_survey(survey_row.id, survey_row.organization_id) then
    raise exception 'survey access denied' using errcode = '42501';
  end if;
  select * into revision_row from public.field_survey_revisions r
    where r.id = p_survey_revision_id and r.survey_id = survey_row.id and r.organization_id = survey_row.organization_id;
  if not found then raise exception 'exact survey revision required' using errcode = '42501'; end if;
  select * into plan_row from public.execution_plans p
    where p.id = p_execution_plan_id and p.organization_id = p_organization_id for share;
  if not found or not private.is_org_member(p_organization_id) then
    raise exception 'execution plan access denied' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_organization_id::text || ':' || actor_id::text || ':' || p_request_key::text, 0));
  select * into link_row from public.field_survey_execution_plan_links l
    where l.organization_id = p_organization_id and l.created_by = actor_id and l.request_key = p_request_key;
  if found then
    if link_row.survey_id is distinct from p_survey_id
       or link_row.survey_revision_id is distinct from p_survey_revision_id
       or link_row.execution_plan_id is distinct from p_execution_plan_id then
      raise exception 'survey-plan request key reused with different content' using errcode = '22023';
    end if;
    return query select link_row.id, link_row.execution_plan_id, link_row.survey_revision_id, revision_row.version;
    return;
  end if;

  insert into public.field_survey_execution_plan_links(
    organization_id, survey_id, survey_revision_id, execution_plan_id, created_by, request_key
  ) values (
    p_organization_id, p_survey_id, p_survey_revision_id, p_execution_plan_id, actor_id, p_request_key
  ) on conflict on constraint survey_execution_links_source_plan_uq do nothing;
  select * into link_row from public.field_survey_execution_plan_links l
    where l.survey_revision_id = p_survey_revision_id and l.execution_plan_id = p_execution_plan_id;
  return query select link_row.id, link_row.execution_plan_id, link_row.survey_revision_id, revision_row.version;
end $$;
