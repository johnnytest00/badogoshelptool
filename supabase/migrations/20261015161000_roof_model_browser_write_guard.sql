-- All authoritative roof models and geometry revisions are now written through
-- server-recomputed restricted writers. The legacy 'other' enum value is not
-- a browser-owned geometry escape hatch.
drop policy gable_model_insert_guard on public.roof_models;
drop policy gable_model_update_guard on public.roof_models;
drop policy gable_model_delete_guard on public.roof_models;
drop policy gable_revision_insert_guard on public.roof_model_revisions;
create policy roof_model_server_insert_only on public.roof_models as restrictive for insert to authenticated with check (false);
create policy roof_model_server_update_only on public.roof_models as restrictive for update to authenticated using (false) with check (false);
create policy roof_model_server_delete_only on public.roof_models as restrictive for delete to authenticated using (false);
create policy roof_revision_server_insert_only on public.roof_model_revisions as restrictive for insert to authenticated with check (false);
