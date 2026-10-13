-- F8.3.1: qualify revision columns so RETURNS TABLE names cannot shadow them.
create or replace function public.finalize_quotation(
  p_organization_id uuid, p_project_id uuid, p_quotation_id uuid,
  p_revision_id uuid, p_expected_version integer
) returns table (quotation_id uuid, revision_id uuid, finalized_at timestamptz)
language plpgsql security invoker set search_path = public, pg_catalog as $$
declare
  v_quote public.quotations%rowtype;
  v_revision public.quotation_revisions%rowtype;
  v_line jsonb;
  v_price_class text;
  v_quantity numeric;
  v_unit_price numeric;
begin
  if not private.is_org_member(p_organization_id) then raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501'; end if;
  select q.* into v_quote from public.quotations as q
    where q.id = p_quotation_id and q.organization_id = p_organization_id and q.project_id = p_project_id for update;
  if not found then raise exception 'Az ajánlat nem található.' using errcode = '23503'; end if;
  if v_quote.status <> 'draft' then raise exception 'Az ajánlat már véglegesítve van.' using errcode = '55000'; end if;
  if v_quote.version is distinct from p_expected_version or v_quote.current_revision_id is distinct from p_revision_id then
    raise exception 'Az ajánlat időközben megváltozott; töltsd újra az oldalt.' using errcode = '40001';
  end if;
  if v_quote.client_id is null then raise exception 'Véglegesítéshez ügyfél megadása szükséges.' using errcode = '22023'; end if;
  select r.* into v_revision from public.quotation_revisions as r
    where r.id = p_revision_id and r.quotation_id = v_quote.id and r.organization_id = p_organization_id;
  if not found then raise exception 'A kiválasztott revízió nem ehhez az ajánlathoz tartozik.' using errcode = '23503'; end if;
  if jsonb_array_length(v_revision.line_items_snapshot) < 1 then raise exception 'Legalább egy ajánlati tétel szükséges.' using errcode = '22023'; end if;
  v_price_class := v_revision.price_class::text;
  if v_price_class not in ('net', 'gross') or v_revision.subtotal is null or v_revision.subtotal < 0 or coalesce(v_revision.totals_snapshot->>'complete', 'false') <> 'true' then
    raise exception 'A pénzügyi összesítés hiányos vagy érvénytelen.' using errcode = '22023';
  end if;
  for v_line in select value from jsonb_array_elements(v_revision.line_items_snapshot) loop
    if jsonb_typeof(v_line) <> 'object' or nullif(trim(v_line->>'description'), '') is null or nullif(trim(v_line->>'unit'), '') is null or v_line->>'priceClass' <> v_price_class then
      raise exception 'Minden tételnek megnevezése, egysége és egységes nettó/bruttó besorolása szükséges.' using errcode = '22023';
    end if;
    begin v_quantity := (v_line->>'quantity')::numeric; v_unit_price := (v_line->>'unitPrice')::numeric; exception when others then raise exception 'A tétel mennyisége vagy ára érvénytelen.' using errcode = '22023'; end;
    if v_quantity <= 0 or v_unit_price < 0 then raise exception 'A tétel mennyisége és ára érvénytelen.' using errcode = '22023'; end if;
  end loop;
  update public.quotations set status = 'finalized', finalized_revision_id = v_revision.id, finalized_at = now(), finalized_by = auth.uid() where id = v_quote.id;
  return query select v_quote.id, v_revision.id, q.finalized_at from public.quotations as q where q.id = v_quote.id;
end; $$;
revoke all on function public.finalize_quotation(uuid, uuid, uuid, uuid, integer) from public, anon;
grant execute on function public.finalize_quotation(uuid, uuid, uuid, uuid, integer) to authenticated;
