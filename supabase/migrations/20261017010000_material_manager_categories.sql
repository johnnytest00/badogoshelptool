-- F9.22: add organization-owned display categories while preserving the
-- existing technical category enum used by verified calculation contracts.
create table public.material_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  legacy_category public.material_category not null default 'other',
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint material_categories_name_length check (char_length(trim(name)) between 1 and 100),
  constraint material_categories_id_organization_unique unique (id, organization_id)
);

create unique index material_categories_organization_name_uq
  on public.material_categories (organization_id, lower(btrim(name)));
create unique index material_categories_default_legacy_uq
  on public.material_categories (organization_id, legacy_category)
  where is_default;
create index material_categories_organization_active_name_idx
  on public.material_categories (organization_id, is_active, lower(name));

insert into public.material_categories (organization_id, name, legacy_category, is_default)
select o.id, defaults.name, defaults.legacy_category, true
from public.organizations o
cross join (values
  ('Tetőfedés', 'roof_covering'::public.material_category),
  ('Lemez', 'sheet_metal'::public.material_category),
  ('Ereszcsatorna', 'gutter'::public.material_category),
  ('Szegély és bádog', 'flashing'::public.material_category),
  ('Szigetelés', 'insulation'::public.material_category),
  ('Faanyag', 'timber'::public.material_category),
  ('Kiegészítő', 'accessory'::public.material_category),
  ('Egyéb anyag', 'other'::public.material_category)
) as defaults(name, legacy_category)
on conflict do nothing;

create or replace function private.seed_material_categories_for_organization()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.material_categories (organization_id, name, legacy_category, is_default)
  select new.id, defaults.name, defaults.legacy_category, true
  from (values
    ('Tetőfedés', 'roof_covering'::public.material_category),
    ('Lemez', 'sheet_metal'::public.material_category),
    ('Ereszcsatorna', 'gutter'::public.material_category),
    ('Szegély és bádog', 'flashing'::public.material_category),
    ('Szigetelés', 'insulation'::public.material_category),
    ('Faanyag', 'timber'::public.material_category),
    ('Kiegészítő', 'accessory'::public.material_category),
    ('Egyéb anyag', 'other'::public.material_category)
  ) as defaults(name, legacy_category)
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.seed_material_categories_for_organization() from public, anon, authenticated;
create trigger organizations_seed_material_categories
  after insert on public.organizations
  for each row execute function private.seed_material_categories_for_organization();

alter table public.material_products add column category_id uuid;
update public.material_products p
set category_id = c.id
from public.material_categories c
where c.organization_id = p.organization_id
  and c.is_default
  and c.legacy_category = p.category;
alter table public.material_products alter column category_id set not null;
alter table public.material_products
  add constraint material_products_category_same_organization_fk
  foreign key (category_id, organization_id)
  references public.material_categories (id, organization_id)
  on update cascade on delete restrict;
create index material_products_organization_category_id_idx
  on public.material_products (organization_id, category_id, status);

create trigger material_categories_set_updated_at
  before update on public.material_categories
  for each row execute function private.set_updated_at();
create trigger material_categories_organization_immutable
  before update on public.material_categories
  for each row execute function private.prevent_organization_change();

alter table public.material_categories enable row level security;
revoke all on table public.material_categories from public, anon, authenticated;
create policy material_categories_select_member on public.material_categories
  for select to authenticated using ((select private.is_org_member(organization_id)));
create policy material_categories_insert_member on public.material_categories
  for insert to authenticated with check (
    (select private.is_org_member(organization_id))
    and (created_by is null or created_by = (select auth.uid()))
    and legacy_category = 'other' and not is_default
  );
create policy material_categories_update_member on public.material_categories
  for update to authenticated using ((select private.is_org_member(organization_id)))
  with check ((select private.is_org_member(organization_id)));
grant select on public.material_categories to authenticated;
grant insert (organization_id, name, created_by) on public.material_categories to authenticated;
grant update (name, is_active) on public.material_categories to authenticated;
revoke update (id, organization_id, legacy_category, is_default, created_by, created_at, updated_at)
  on public.material_categories from authenticated;

-- Keep the old enum field as a technical compatibility classifier. Custom
-- display categories intentionally map to "other" until an engineer verifies
-- that a product meets a calculation's technical contract.
create or replace function private.set_material_product_technical_category()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_legacy_category public.material_category;
  v_active boolean;
begin
  if tg_op = 'INSERT' and new.category_id is null then
    select c.id into new.category_id
    from public.material_categories c
    where c.organization_id = new.organization_id and c.legacy_category = new.category and c.is_default
    limit 1;
    if new.category_id is null then
      raise exception 'legacy material category has no organization mapping' using errcode = '23503';
    end if;
  end if;
  select c.legacy_category, c.is_active into v_legacy_category, v_active
  from public.material_categories c
  where c.id = new.category_id and c.organization_id = new.organization_id;
  if not found then
    raise exception 'material category is unavailable' using errcode = '23503';
  end if;
  if not v_active then
    if tg_op = 'INSERT' then
      raise exception 'material category is inactive' using errcode = '22023';
    elsif new.category_id is distinct from old.category_id then
      raise exception 'material category is inactive' using errcode = '22023';
    end if;
  end if;
  new.category := v_legacy_category;
  return new;
end;
$$;
revoke all on function private.set_material_product_technical_category() from public, anon, authenticated;
create trigger material_products_category_classifier
  before insert or update of category_id, organization_id on public.material_products
  for each row execute function private.set_material_product_technical_category();

-- Add only ordinary purchasing units. They do not imply any automatic unit
-- conversion or technical calculation support.
alter type public.material_purchasing_unit add value if not exists 'liter' after 'cubic_meter';
alter type public.material_purchasing_unit add value if not exists 'strand' after 'kilogram';

create or replace function private.check_material_price_unit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_variant_unit public.material_purchasing_unit;
begin
  select v.purchasing_unit into v_variant_unit
  from public.material_variants v
  where v.id = new.variant_id and v.organization_id = new.organization_id
  for key share;
  if not found or new.purchasing_unit is distinct from v_variant_unit then
    raise exception 'catalog price unit must match its material variant' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.check_material_price_unit() from public, anon, authenticated;
create trigger material_prices_unit_matches_variant
  before insert on public.material_prices
  for each row execute function private.check_material_price_unit();

create or replace function private.prevent_material_variant_unit_change_with_prices()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.purchasing_unit is distinct from old.purchasing_unit
    and exists (select 1 from public.material_prices p where p.variant_id = old.id and p.organization_id = old.organization_id) then
    raise exception 'a priced variant keeps its historical unit; create another variant' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.prevent_material_variant_unit_change_with_prices() from public, anon, authenticated;
create trigger material_variants_unit_immutable_after_price
  before update of purchasing_unit on public.material_variants
  for each row execute function private.prevent_material_variant_unit_change_with_prices();

comment on table public.material_categories is 'Organization-owned, editable display categories. Historical calculation classification stays in material_products.category.';
comment on column public.material_products.category_id is 'Organization-owned display category; category.name changes do not alter immutable takeoff or quotation snapshots.';
