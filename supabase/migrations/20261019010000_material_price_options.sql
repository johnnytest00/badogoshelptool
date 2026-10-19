-- F9.43: independently named supplier price options per catalog variant.
-- Backward compatible: existing material_prices rows keep option_id null (the unnamed "Alap ár" line).
-- A price change is still a new immutable material_prices row; the option only names the supplier line.
-- The option label is copied into the immutable price row's source_name, which the material-list and
-- quotation snapshots already carry, so renaming/archiving an option never alters historical snapshots.
create table public.material_price_options (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  variant_id uuid not null,
  label text not null,
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint material_price_options_label_length check (char_length(btrim(label)) between 1 and 60),
  constraint material_price_options_status_ck check (status in ('active', 'archived')),
  constraint material_price_options_id_organization_unique unique (id, organization_id),
  constraint material_price_options_variant_same_organization_fk foreign key (variant_id, organization_id)
    references public.material_variants (id, organization_id) on update cascade on delete restrict
);
create unique index material_price_options_variant_label_uq on public.material_price_options (variant_id, lower(btrim(label)));
create index material_price_options_variant_idx on public.material_price_options (variant_id);

alter table public.material_prices add column option_id uuid;
alter table public.material_prices add constraint material_prices_option_same_organization_fk
  foreign key (option_id, organization_id) references public.material_price_options (id, organization_id) on update cascade on delete restrict;
create index material_prices_option_idx on public.material_prices (option_id, effective_date desc, recorded_at desc, id desc);

create trigger material_price_options_set_updated_at before update on public.material_price_options for each row execute function private.set_updated_at();
create trigger material_price_options_organization_immutable before update on public.material_price_options for each row execute function private.prevent_organization_change();

create or replace function private.guard_material_price_option()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.variant_id is distinct from old.variant_id then
    raise exception 'a price option cannot move to another variant' using errcode = '55000';
  end if;
  new.label := btrim(new.label);
  return new;
end; $$;
create trigger material_price_options_guard before insert or update on public.material_price_options for each row execute function private.guard_material_price_option();

-- A priced option row must target an active option of the same variant, in the variant's unit, and carries the option label.
create or replace function private.apply_material_price_option()
returns trigger language plpgsql set search_path = '' as $$
declare v_option public.material_price_options%rowtype; v_unit public.material_purchasing_unit;
begin
  if new.option_id is null then return new; end if;
  select * into v_option from public.material_price_options o where o.id = new.option_id and o.organization_id = new.organization_id;
  if not found or v_option.variant_id <> new.variant_id then
    raise exception 'price option belongs to another variant' using errcode = '23514';
  end if;
  if v_option.status <> 'active' then
    raise exception 'archived price option cannot receive new prices' using errcode = '23514';
  end if;
  select purchasing_unit into v_unit from public.material_variants v where v.id = new.variant_id;
  if new.purchasing_unit <> v_unit then
    raise exception 'price unit must match the variant unit' using errcode = '23514';
  end if;
  new.source_name := v_option.label;
  return new;
end; $$;
create trigger material_prices_apply_option before insert on public.material_prices for each row execute function private.apply_material_price_option();

grant select, insert, update on public.material_price_options to authenticated;
revoke update (id, organization_id, variant_id, created_by, created_at) on public.material_price_options from authenticated;
alter table public.material_price_options enable row level security;
create policy material_price_options_select_member on public.material_price_options for select to authenticated using ((select private.is_org_member(organization_id)));
create policy material_price_options_insert_member on public.material_price_options for insert to authenticated
  with check ((select private.is_org_member(organization_id)) and (created_by is null or created_by = (select auth.uid())));
create policy material_price_options_update_member on public.material_price_options for update to authenticated
  using ((select private.is_org_member(organization_id))) with check ((select private.is_org_member(organization_id)));

comment on table public.material_price_options is 'Named supplier price line of a catalog variant; prices of the line are immutable material_prices rows (option_id). Never auto-selected.';
