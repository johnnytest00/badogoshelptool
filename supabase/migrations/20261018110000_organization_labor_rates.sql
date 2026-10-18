-- F9.42.1: organization labor rates (HUF per measured unit). Rates are append-only: a change is a new
-- row and the old one is archived, so a rate that was applied to a quotation line stays traceable.
-- No VAT, discount or rounding rule is stored here; amounts follow the existing HUF quotation contract.
create table public.organization_labor_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  basis text not null check (basis in ('roof_area_m2', 'run_length_m')),
  rate_amount numeric(20,2) not null check (rate_amount >= 0),
  price_class text not null check (price_class in ('net', 'gross')),
  currency text not null default 'HUF' check (currency = 'HUF'),
  request_key uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  archived_by uuid references auth.users(id) on delete restrict,
  archived_at timestamptz,
  constraint organization_labor_rates_archive_ck check ((archived_at is null) = (archived_by is null)),
  constraint organization_labor_rates_request_uq unique (organization_id, created_by, request_key)
);
create index organization_labor_rates_org_idx on public.organization_labor_rates (organization_id, created_at desc);

alter table public.organization_labor_rates enable row level security;
revoke all on public.organization_labor_rates from public, anon, authenticated;
grant select on public.organization_labor_rates to authenticated;
create policy organization_labor_rates_member_read on public.organization_labor_rates
  for select to authenticated using (private.is_org_member(organization_id));

create or replace function private.guard_organization_labor_rate()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'labor rates are never deleted' using errcode = '55000'; end if;
  if old.archived_at is not null or new.archived_at is null
    or (to_jsonb(new) - 'archived_at' - 'archived_by') is distinct from (to_jsonb(old) - 'archived_at' - 'archived_by') then
    raise exception 'a labor rate can only be archived once' using errcode = '55000';
  end if;
  return new;
end; $$;
revoke all on function private.guard_organization_labor_rate() from public, anon, authenticated;
create trigger organization_labor_rates_guard before update or delete on public.organization_labor_rates
  for each row execute function private.guard_organization_labor_rate();

create or replace function public.create_organization_labor_rate(
  p_organization_id uuid, p_name text, p_basis text, p_rate_amount numeric, p_price_class text, p_request_key uuid
) returns table (rate_id uuid, created boolean)
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_row public.organization_labor_rates%rowtype;
begin
  if v_actor is null or not private.is_org_admin_or_owner(p_organization_id) then
    raise exception 'labor rate access denied' using errcode = '42501';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 120 or p_basis not in ('roof_area_m2', 'run_length_m')
    or p_rate_amount is null or p_rate_amount < 0 or p_rate_amount <> round(p_rate_amount, 2)
    or p_price_class not in ('net', 'gross') or p_request_key is null then
    raise exception 'invalid labor rate payload' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':' || v_actor::text || ':' || p_request_key::text, 0));
  select * into v_row from public.organization_labor_rates r
    where r.organization_id = p_organization_id and r.created_by = v_actor and r.request_key = p_request_key;
  if found then
    if v_row.name <> btrim(p_name) or v_row.basis <> p_basis or v_row.rate_amount <> p_rate_amount or v_row.price_class <> p_price_class then
      raise exception 'labor rate request key reused with different content' using errcode = '22023';
    end if;
    return query select v_row.id, false; return;
  end if;
  insert into public.organization_labor_rates(organization_id, name, basis, rate_amount, price_class, request_key, created_by)
  values (p_organization_id, btrim(p_name), p_basis, p_rate_amount, p_price_class, p_request_key, v_actor)
  returning id into rate_id;
  return query select rate_id, true;
end; $$;

create or replace function public.archive_organization_labor_rate(p_organization_id uuid, p_rate_id uuid)
returns table (rate_id uuid, archived boolean)
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_row public.organization_labor_rates%rowtype;
begin
  if v_actor is null or not private.is_org_admin_or_owner(p_organization_id) then
    raise exception 'labor rate access denied' using errcode = '42501';
  end if;
  select * into v_row from public.organization_labor_rates r where r.id = p_rate_id and r.organization_id = p_organization_id for update;
  if not found then raise exception 'labor rate access denied' using errcode = '42501'; end if;
  if v_row.archived_at is not null then return query select v_row.id, false; return; end if;
  update public.organization_labor_rates set archived_at = now(), archived_by = v_actor where id = v_row.id;
  return query select v_row.id, true;
end; $$;

revoke all on function public.create_organization_labor_rate(uuid, text, text, numeric, text, uuid) from public, anon;
revoke all on function public.archive_organization_labor_rate(uuid, uuid) from public, anon;
grant execute on function public.create_organization_labor_rate(uuid, text, text, numeric, text, uuid) to authenticated;
grant execute on function public.archive_organization_labor_rate(uuid, uuid) to authenticated;
