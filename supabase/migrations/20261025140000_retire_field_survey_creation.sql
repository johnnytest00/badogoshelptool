-- M5: the separate field survey workflow is retired; dimensions are entered in the calculators.
-- New survey rows can no longer be created through the application path (PostgREST/authenticator or the
-- restricted writer). Existing surveys, revisions, photos and links are kept unchanged; nothing is deleted.
-- Direct postgres sessions (migrations, local test fixtures, administration) are not affected.
create or replace function private.prevent_new_field_survey()
returns trigger language plpgsql set search_path = '' as $$
begin
  if session_user <> 'postgres' then
    raise exception 'A felmérések funkció kivezetve: új felmérés nem hozható létre.' using errcode = '55000';
  end if;
  return new;
end;
$$;
revoke all on function private.prevent_new_field_survey() from public, anon, authenticated;
create trigger field_surveys_retired_no_insert
  before insert on public.field_surveys
  for each row execute function private.prevent_new_field_survey();
