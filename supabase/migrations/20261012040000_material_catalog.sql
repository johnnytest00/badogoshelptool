-- F7.1: organization-private material catalog.
-- No global marketplace, scraping, quantity calculation or quotation behavior.

create type public.material_category as enum (
  'roof_covering', 'sheet_metal', 'gutter', 'flashing',
  'insulation', 'timber', 'accessory', 'other'
);
create type public.material_product_status as enum ('active', 'archived');
create type public.material_purchasing_unit as enum (
  'piece', 'linear_meter', 'square_meter', 'cubic_meter', 'kilogram', 'package'
);
create type public.material_price_kind as enum ('net', 'gross');
create type public.material_data_provenance as enum (
  'verified', 'user_provided', 'estimated', 'demo', 'missing'
);

create table public.material_manufacturers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  website text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint material_manufacturers_name_length check (char_length(trim(name)) between 1 and 200),
  constraint material_manufacturers_website_length check (website is null or char_length(website) <= 2048),
  constraint material_manufacturers_id_organization_unique unique (id, organization_id)
);

create table public.material_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  manufacturer_id uuid,
  category public.material_category not null,
  name text not null,
  description text,
  product_code text,
  status public.material_product_status not null default 'active',
  data_provenance public.material_data_provenance not null default 'user_provided',
  source_name text,
  source_url text,
  source_date date,
  source_notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint material_products_name_length check (char_length(trim(name)) between 1 and 200),
  constraint material_products_code_length check (product_code is null or char_length(trim(product_code)) <= 120),
  constraint material_products_source_url_length check (source_url is null or char_length(source_url) <= 2048),
  constraint material_products_id_organization_unique unique (id, organization_id),
  constraint material_products_manufacturer_same_organization_fk
    foreign key (manufacturer_id, organization_id)
    references public.material_manufacturers (id, organization_id)
    on update cascade on delete restrict
);

create table public.material_variants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null,
  name text not null,
  sku text,
  purchasing_unit public.material_purchasing_unit not null,
  nominal_width_mm numeric,
  effective_width_mm numeric,
  thickness_mm numeric,
  length_mm numeric,
  packaging_quantity numeric,
  technical_specs jsonb not null default '{}'::jsonb,
  data_provenance public.material_data_provenance not null default 'user_provided',
  source_name text,
  source_url text,
  source_date date,
  source_notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint material_variants_name_length check (char_length(trim(name)) between 1 and 200),
  constraint material_variants_sku_length check (sku is null or char_length(trim(sku)) <= 120),
  constraint material_variants_dimensions_nonnegative check (
    (nominal_width_mm is null or nominal_width_mm >= 0) and
    (effective_width_mm is null or effective_width_mm >= 0) and
    (thickness_mm is null or thickness_mm >= 0) and
    (length_mm is null or length_mm >= 0) and
    (packaging_quantity is null or packaging_quantity > 0)
  ),
  constraint material_variants_specs_object check (jsonb_typeof(technical_specs) = 'object'),
  constraint material_variants_source_url_length check (source_url is null or char_length(source_url) <= 2048),
  constraint material_variants_id_organization_unique unique (id, organization_id),
  constraint material_variants_product_same_organization_fk
    foreign key (product_id, organization_id)
    references public.material_products (id, organization_id)
    on update cascade on delete restrict
);

create table public.material_prices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  variant_id uuid not null,
  amount numeric(14,2) not null,
  currency text not null default 'HUF',
  purchasing_unit public.material_purchasing_unit not null,
  price_kind public.material_price_kind not null,
  price_source text,
  effective_date date not null,
  recorded_at timestamptz not null default now(),
  data_provenance public.material_data_provenance not null default 'user_provided',
  source_name text,
  source_url text,
  source_date date,
  source_notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint material_prices_amount_nonnegative check (amount >= 0),
  constraint material_prices_currency_huf check (currency = 'HUF'),
  constraint material_prices_source_url_length check (source_url is null or char_length(source_url) <= 2048),
  constraint material_prices_id_organization_unique unique (id, organization_id),
  constraint material_prices_variant_same_organization_fk
    foreign key (variant_id, organization_id)
    references public.material_variants (id, organization_id)
    on update cascade on delete restrict
);

create unique index material_manufacturers_org_lower_name_uq on public.material_manufacturers (organization_id, lower(name));
create index material_manufacturers_organization_id_idx on public.material_manufacturers (organization_id);
create index material_products_organization_category_idx on public.material_products (organization_id, category);
create index material_products_organization_status_idx on public.material_products (organization_id, status);
create index material_products_manufacturer_id_idx on public.material_products (manufacturer_id);
create index material_variants_product_id_idx on public.material_variants (product_id);
create index material_prices_variant_effective_idx on public.material_prices (variant_id, effective_date desc, recorded_at desc, id desc);

create trigger material_manufacturers_set_updated_at before update on public.material_manufacturers for each row execute function private.set_updated_at();
create trigger material_products_set_updated_at before update on public.material_products for each row execute function private.set_updated_at();
create trigger material_variants_set_updated_at before update on public.material_variants for each row execute function private.set_updated_at();

create trigger material_manufacturers_organization_immutable before update on public.material_manufacturers for each row execute function private.prevent_organization_change();
create trigger material_products_organization_immutable before update on public.material_products for each row execute function private.prevent_organization_change();
create trigger material_variants_organization_immutable before update on public.material_variants for each row execute function private.prevent_organization_change();
create trigger material_prices_organization_immutable before update on public.material_prices for each row execute function private.prevent_organization_change();

grant usage on type public.material_category, public.material_product_status, public.material_purchasing_unit, public.material_price_kind, public.material_data_provenance to authenticated;
grant select, insert, update on public.material_manufacturers to authenticated;
grant select, insert, update on public.material_products to authenticated;
grant select, insert, update on public.material_variants to authenticated;
grant select, insert on public.material_prices to authenticated;
revoke update (id, organization_id, created_by, created_at) on public.material_manufacturers from authenticated;
revoke update (id, organization_id, created_by, created_at) on public.material_products from authenticated;
revoke update (id, organization_id, created_by, created_at) on public.material_variants from authenticated;
revoke update (id, organization_id, created_by, created_at, recorded_at) on public.material_prices from authenticated;

alter table public.material_manufacturers enable row level security;
alter table public.material_products enable row level security;
alter table public.material_variants enable row level security;
alter table public.material_prices enable row level security;

create policy material_manufacturers_select_member on public.material_manufacturers for select to authenticated using ((select private.is_org_member(organization_id)));
create policy material_manufacturers_insert_member on public.material_manufacturers for insert to authenticated with check ((select private.is_org_member(organization_id)) and (created_by is null or created_by = (select auth.uid())));
create policy material_manufacturers_update_member on public.material_manufacturers for update to authenticated using ((select private.is_org_member(organization_id))) with check ((select private.is_org_member(organization_id)) and (created_by is null or created_by = (select auth.uid())));

create policy material_products_select_member on public.material_products for select to authenticated using ((select private.is_org_member(organization_id)));
create policy material_products_insert_member on public.material_products for insert to authenticated with check ((select private.is_org_member(organization_id)) and (created_by is null or created_by = (select auth.uid())));
create policy material_products_update_member on public.material_products for update to authenticated using ((select private.is_org_member(organization_id))) with check ((select private.is_org_member(organization_id)) and (created_by is null or created_by = (select auth.uid())));

create policy material_variants_select_member on public.material_variants for select to authenticated using ((select private.is_org_member(organization_id)));
create policy material_variants_insert_member on public.material_variants for insert to authenticated with check ((select private.is_org_member(organization_id)) and (created_by is null or created_by = (select auth.uid())));
create policy material_variants_update_member on public.material_variants for update to authenticated using ((select private.is_org_member(organization_id))) with check ((select private.is_org_member(organization_id)) and (created_by is null or created_by = (select auth.uid())));

create policy material_prices_select_member on public.material_prices for select to authenticated using ((select private.is_org_member(organization_id)));
create policy material_prices_insert_member on public.material_prices for insert to authenticated with check ((select private.is_org_member(organization_id)) and (created_by is null or created_by = (select auth.uid())));

comment on table public.material_prices is 'Immutable catalog price history. Latest applicable price: effective_date desc, recorded_at desc, id desc.';
comment on table public.material_variants is 'Technical properties are optional and category-specific; unknown values remain null or absent.';
