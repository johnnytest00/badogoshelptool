-- F9.43: "editing" a labor rate is one atomic, idempotent step: a new immutable rate row replaces the old one,
-- which is archived. Applied quotation lines keep their stored rate snapshot; nothing is updated in place.
create or replace function public.revise_organization_labor_rate(
  p_organization_id uuid, p_rate_id uuid, p_name text, p_basis text, p_rate_amount numeric, p_price_class text, p_request_key uuid
) returns table (rate_id uuid, created boolean)
language plpgsql security definer set search_path = '' as $$
declare v_new uuid; v_created boolean;
begin
  if auth.uid() is null or not private.is_org_admin_or_owner(p_organization_id) then
    raise exception 'labor rate access denied' using errcode = '42501';
  end if;
  if not exists (select 1 from public.organization_labor_rates r where r.id = p_rate_id and r.organization_id = p_organization_id) then
    raise exception 'labor rate access denied' using errcode = '42501';
  end if;
  select c.rate_id, c.created into v_new, v_created
    from public.create_organization_labor_rate(p_organization_id, p_name, p_basis, p_rate_amount, p_price_class, p_request_key) c;
  if v_new <> p_rate_id then perform public.archive_organization_labor_rate(p_organization_id, p_rate_id); end if;
  return query select v_new, v_created;
end; $$;
revoke all on function public.revise_organization_labor_rate(uuid, uuid, text, text, numeric, text, uuid) from public, anon;
grant execute on function public.revise_organization_labor_rate(uuid, uuid, text, text, numeric, text, uuid) to authenticated;
