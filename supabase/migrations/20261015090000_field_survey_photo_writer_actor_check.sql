-- Writer connections authenticate with the restricted DB role, not an Auth JWT.
-- The API supplies the actor only after checking the request's Supabase claims.
create or replace function public.remove_field_survey_photo(
  p_survey_id uuid, p_photo_id uuid, p_expected_version integer, p_actor_id uuid
)
returns table(version integer)
language plpgsql security definer set search_path = '' as $$
declare photo public.field_survey_photos%rowtype; survey_row public.field_surveys%rowtype;
begin
  if p_actor_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform 1 from public.organization_members
  where user_id=p_actor_id and organization_id=(select organization_id from public.field_survey_photos where id=p_photo_id)
  for share;
  if not found then raise exception 'Photo not found' using errcode='42501'; end if;
  select * into photo from public.field_survey_photos where id=p_photo_id and survey_id=p_survey_id;
  if not found then raise exception 'Photo not found' using errcode='42501'; end if;
  select * into survey_row from public.field_surveys where id=photo.survey_id for update;
  if survey_row.project_id is null and survey_row.created_by<>p_actor_id then raise exception 'Photo access denied' using errcode='42501'; end if;
  if photo.removed_at is not null then return query select survey_row.version; return; end if;
  if survey_row.version<>p_expected_version then raise exception 'Survey changed since it was opened' using errcode='40001'; end if;
  update public.field_survey_photos set removed_at=now() where id=p_photo_id;
  update public.field_surveys set version=survey_row.version+1,updated_by=p_actor_id where id=survey_row.id;
  perform private.record_field_survey_revision(survey_row.id,p_actor_id);
  return query select survey_row.version+1;
end;
$$;
revoke all on function public.remove_field_survey_photo(uuid,uuid,integer,uuid) from public, anon, authenticated;
grant execute on function public.remove_field_survey_photo(uuid,uuid,integer,uuid) to tetopro_covering_writer;
