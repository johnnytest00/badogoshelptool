-- Keep the established RPC signature available for existing callers/tests.
-- It delegates into the document-aware writer and derives recipient snapshots
-- from the trusted organization customer record when client_id is supplied.
create or replace function public.save_standalone_quotation_draft(
  p_organization_id uuid,
  p_operation_id uuid,
  p_quotation_id uuid,
  p_name text,
  p_client_id uuid,
  p_lines jsonb,
  p_expected_version integer
) returns table (quotation_id uuid, revision_id uuid, revision_number integer, revision_created boolean, totals_snapshot jsonb)
language sql security definer set search_path = pg_catalog, public as $$
  select * from public.save_standalone_quotation_draft_with_document(
    p_organization_id, p_operation_id, p_quotation_id, p_name, p_client_id,
    p_lines, p_expected_version,
    jsonb_build_object('recipientSource', case when p_client_id is null then 'manual' else 'client' end)
  );
$$;
revoke all on function public.save_standalone_quotation_draft(uuid,uuid,uuid,text,uuid,jsonb,integer) from public, anon;
grant execute on function public.save_standalone_quotation_draft(uuid,uuid,uuid,text,uuid,jsonb,integer) to authenticated;
