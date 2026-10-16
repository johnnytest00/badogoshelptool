-- Qualify the returned plan_id column so it cannot collide with the function's
-- plan_id output parameter.
create or replace function public.create_execution_plan_from_survey(
  p_organization_id uuid,
  p_survey_id uuid,
  p_survey_revision_id uuid,
  p_title text,
  p_request_key uuid
) returns table(plan_id uuid, link_id uuid, survey_revision_id uuid, survey_version integer)
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  survey_row public.field_surveys%rowtype;
  revision_row public.field_survey_revisions%rowtype;
  existing_link public.field_survey_execution_plan_links%rowtype;
  existing_plan public.execution_plans%rowtype;
  created_plan_id uuid;
  link_row record;
begin
  if actor_id is null or p_request_key is null or not private.is_org_member(p_organization_id) then
    raise exception 'organization access denied' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_organization_id::text || ':' || actor_id::text || ':' || p_request_key::text, 0));
  select * into existing_link from public.field_survey_execution_plan_links l
    where l.organization_id = p_organization_id and l.created_by = actor_id and l.request_key = p_request_key;
  if found then
    select * into existing_plan from public.execution_plans p
      where p.id = existing_link.execution_plan_id and p.organization_id = p_organization_id;
    select * into revision_row from public.field_survey_revisions r where r.id = existing_link.survey_revision_id;
    if existing_link.survey_id is distinct from p_survey_id
       or existing_link.survey_revision_id is distinct from p_survey_revision_id
       or existing_plan.title is distinct from btrim(p_title) then
      raise exception 'survey-plan request key reused with different content' using errcode = '22023';
    end if;
    return query select existing_plan.id, existing_link.id, existing_link.survey_revision_id, revision_row.version;
    return;
  end if;
  select * into survey_row from public.field_surveys s
    where s.id = p_survey_id and s.organization_id = p_organization_id for update;
  if not found or not private.can_access_field_survey(survey_row.id, survey_row.organization_id) then
    raise exception 'survey access denied' using errcode = '42501';
  end if;
  select * into revision_row from public.field_survey_revisions r
    where r.id = p_survey_revision_id and r.survey_id = survey_row.id and r.organization_id = survey_row.organization_id;
  if not found then raise exception 'exact survey revision required' using errcode = '42501'; end if;
  if survey_row.version <> revision_row.version then
    raise exception 'survey changed since the selected revision' using errcode = '40001';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 200 or p_request_key is null then
    raise exception 'invalid execution plan payload' using errcode = '22023';
  end if;

  select created.plan_id into created_plan_id from public.create_execution_plan(
    p_organization_id, survey_row.project_id, p_title, null, null, null, p_request_key
  ) as created;
  select * into link_row from public.link_field_survey_execution_plan(
    p_organization_id, p_survey_id, p_survey_revision_id, created_plan_id, p_request_key
  );
  return query select created_plan_id, link_row.link_id, link_row.survey_revision_id, link_row.survey_version;
end $$;
