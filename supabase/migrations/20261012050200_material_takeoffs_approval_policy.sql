drop policy if exists material_takeoffs_update_draft_member on public.material_takeoffs;
create policy material_takeoffs_update_draft_member on public.material_takeoffs for update to authenticated
using ((select private.is_org_member(organization_id)) and (status = 'draft' or (select private.is_org_admin_or_owner(organization_id))))
with check ((select private.is_org_member(organization_id)) and (status = 'draft' or (select private.is_org_admin_or_owner(organization_id))));
