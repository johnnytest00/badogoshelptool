-- M3 fix: members see an ACTIVE calculation link only; a removed calculation link (audit row) stays visible to its
-- creator alone, like the calculation itself after removal. Material list and quotation branches are unchanged.
drop policy execution_plan_document_links_scoped_read on public.execution_plan_document_links;
create policy execution_plan_document_links_scoped_read on public.execution_plan_document_links
  for select to authenticated using (
    private.is_org_member(organization_id)
    and (
      (document_kind = 'material_list' and exists (
        select 1 from public.material_preparation_lists l
        where l.id = material_list_id and l.organization_id = execution_plan_document_links.organization_id))
      or (document_kind = 'quotation' and exists (
        select 1 from public.quotations q
        where q.id = quotation_id and q.organization_id = execution_plan_document_links.organization_id))
      -- No reference back to calculations here: the calculation read policies reference this table.
      or (document_kind = 'calculation' and (unlinked_at is null or created_by = (select auth.uid())))
    )
  );
