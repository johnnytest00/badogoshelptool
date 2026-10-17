-- Atomically create a simple catalog product, its ordinary selling unit, and
-- an optional HUF price. The request key makes retries safe.
create table public.material_manager_product_create_operations (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  request_payload jsonb not null,
  product_id uuid not null,
  variant_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, actor_id, request_id),
  foreign key (product_id, organization_id)
    references public.material_products(id, organization_id) on delete restrict,
  foreign key (variant_id, organization_id)
    references public.material_variants(id, organization_id) on delete restrict,
  constraint material_manager_create_payload_object check (jsonb_typeof(request_payload) = 'object')
);
alter table public.material_manager_product_create_operations enable row level security;
revoke all on public.material_manager_product_create_operations from public, anon, authenticated;

create function public.create_material_manager_product(
  p_organization_id uuid,
  p_request_id uuid,
  p_category_id uuid,
  p_name text,
  p_purchasing_unit public.material_purchasing_unit,
  p_price_amount numeric,
  p_price_kind public.material_price_kind,
  p_price_effective_date date
)
returns table (product_id uuid, variant_id uuid, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_category public.material_categories%rowtype;
  v_payload jsonb;
  v_existing public.material_manager_product_create_operations%rowtype;
  v_product_id uuid;
  v_variant_id uuid;
  v_reused boolean := false;
begin
  if v_actor is null or not private.is_org_member(p_organization_id) then
    raise exception 'material catalog access denied' using errcode = '42501';
  end if;
  if p_request_id is null or p_name is null or char_length(btrim(p_name)) not between 1 and 200
    or p_purchasing_unit is null then
    raise exception 'invalid material product data' using errcode = '22023';
  end if;
  if p_price_amount is null then
    if p_price_kind is not null or p_price_effective_date is not null then
      raise exception 'price details require a price amount' using errcode = '22023';
    end if;
  elsif p_price_amount < 0 or p_price_amount > 999999999999.99 or scale(p_price_amount) > 2
    or p_price_kind is null or p_price_effective_date is null then
    raise exception 'price must be a non-negative HUF amount with at most two decimals and an explicit price class' using errcode = '22023';
  end if;
  v_payload := pg_catalog.jsonb_build_object(
    'categoryId', p_category_id, 'name', btrim(p_name), 'unit', p_purchasing_unit::text,
    'priceAmount', p_price_amount::text, 'priceKind', p_price_kind::text,
    'priceEffectiveDate', p_price_effective_date::text
  );
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_organization_id::text || ':' || v_actor::text || ':' || p_request_id::text, 0));
  select * into v_existing from public.material_manager_product_create_operations op
  where op.organization_id = p_organization_id and op.actor_id = v_actor and op.request_id = p_request_id
  for update;
  if found then
    if v_existing.request_payload is distinct from v_payload then
      raise exception 'request key reused with different material product data' using errcode = '40001';
    end if;
    return query select v_existing.product_id, v_existing.variant_id, true;
    return;
  end if;

  select * into v_category from public.material_categories c
  where c.id = p_category_id and c.organization_id = p_organization_id and c.is_active
  for share;
  if not found then raise exception 'material category is unavailable' using errcode = '42501'; end if;

  insert into public.material_products (
    organization_id, category_id, category, name, data_provenance, created_by
  ) values (
    p_organization_id, p_category_id, v_category.legacy_category, btrim(p_name), 'user_provided', v_actor
  ) returning id into v_product_id;
  insert into public.material_variants (
    organization_id, product_id, name, purchasing_unit, data_provenance, created_by
  ) values (
    p_organization_id, v_product_id, 'Alap egység', p_purchasing_unit, 'user_provided', v_actor
  ) returning id into v_variant_id;
  if p_price_amount is not null then
    insert into public.material_prices (
      organization_id, variant_id, amount, currency, purchasing_unit, price_kind,
      effective_date, data_provenance, created_by
    ) values (
      p_organization_id, v_variant_id, p_price_amount, 'HUF', p_purchasing_unit,
      p_price_kind, p_price_effective_date, 'user_provided', v_actor
    );
  end if;
  insert into public.material_manager_product_create_operations (
    organization_id, actor_id, request_id, request_payload, product_id, variant_id
  ) values (p_organization_id, v_actor, p_request_id, v_payload, v_product_id, v_variant_id);
  return query select v_product_id, v_variant_id, v_reused;
end;
$$;
revoke all on function public.create_material_manager_product(uuid, uuid, uuid, text, public.material_purchasing_unit, numeric, public.material_price_kind, date) from public, anon;
grant execute on function public.create_material_manager_product(uuid, uuid, uuid, text, public.material_purchasing_unit, numeric, public.material_price_kind, date) to authenticated;

comment on function public.create_material_manager_product(uuid, uuid, uuid, text, public.material_purchasing_unit, numeric, public.material_price_kind, date)
  is 'Organization-scoped atomic Material Manager creation; retries with the same request key return the original product and unit.';
