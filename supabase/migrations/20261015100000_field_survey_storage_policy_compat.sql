-- The Storage API's insert RLS context does not expose its internal metadata
-- consistently across supported local/hosted Storage versions. The route checks
-- the actual bytes and the private bucket enforces the hard size/MIME limits.
-- Keep authorization tied to a server-created pending reservation and actor.
drop policy field_survey_photos_storage_insert on storage.objects;
create policy field_survey_photos_storage_insert on storage.objects for insert to authenticated
with check (bucket_id='field-survey-photos'
  and name ~* '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  and exists (select 1 from public.field_survey_photos p where p.object_key=name and p.upload_state='pending'
    and p.uploaded_by=auth.uid() and private.can_access_field_survey(p.survey_id,p.organization_id)));

drop policy field_survey_photos_storage_update on storage.objects;
create policy field_survey_photos_storage_update on storage.objects for update to authenticated
using (bucket_id='field-survey-photos' and exists (select 1 from public.field_survey_photos p where p.object_key=name and p.upload_state='pending' and p.uploaded_by=auth.uid() and private.can_access_field_survey(p.survey_id,p.organization_id)))
with check (bucket_id='field-survey-photos' and exists (select 1 from public.field_survey_photos p where p.object_key=name and p.upload_state='pending' and p.uploaded_by=auth.uid() and private.can_access_field_survey(p.survey_id,p.organization_id)));
