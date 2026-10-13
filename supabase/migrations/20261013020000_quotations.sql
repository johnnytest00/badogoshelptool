-- F8.1: internal, versioned quotation drafts. No sending, VAT engine or acceptance workflow.

create type public.quotation_line_type as enum ('MATERIAL', 'LABOR', 'OTHER');
create type public.quotation_price_class as enum ('net', 'gross');
create type public.quotation_status as enum ('draft');

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null,
  client_id uuid,
  name text not null check (char_length(trim(name)) between 1 and 200),
  currency text not null default 'HUF' check (currency = 'HUF'),
  status public.quotation_status not null default 'draft',
  current_revision_id uuid,
  version integer not null default 0 check (version >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (project_id, organization_id) references public.projects(id, organization_id) on delete restrict,
  foreign key (client_id, organization_id) references public.clients(id, organization_id) on delete restrict
);

create table public.quotation_revisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  quotation_id uuid not null,
  revision_number integer not null check (revision_number > 0),
  currency text not null check (currency = 'HUF'),
  price_class public.quotation_price_class,
  input_snapshot jsonb not null check (jsonb_typeof(input_snapshot) = 'object'),
  line_items_snapshot jsonb not null check (jsonb_typeof(line_items_snapshot) = 'array'),
  subtotal numeric(20,2),
  totals_snapshot jsonb not null check (jsonb_typeof(totals_snapshot) = 'object'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (organization_id, quotation_id, revision_number),
  unique (id, organization_id),
  foreign key (quotation_id, organization_id) references public.quotations(id, organization_id) on delete restrict
);

alter table public.quotations add constraint quotations_current_revision_fk
  foreign key (current_revision_id, organization_id) references public.quotation_revisions(id, organization_id) on delete restrict;

create index quotations_project_idx on public.quotations (organization_id, project_id, updated_at desc);
create index quotation_revisions_quote_idx on public.quotation_revisions (organization_id, quotation_id, revision_number desc);

create or replace function private.touch_quotation_updated_at() returns trigger
language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
create trigger quotations_touch_updated_at before update on public.quotations
for each row execute function private.touch_quotation_updated_at();

create or replace function private.prevent_quotation_revision_mutation() returns trigger
language plpgsql set search_path = '' as $$ begin raise exception 'Az ajánlati revízió immutable.' using errcode = '55000'; end; $$;
create trigger quotation_revisions_immutable before update or delete on public.quotation_revisions
for each row execute function private.prevent_quotation_revision_mutation();

alter table public.quotations enable row level security;
alter table public.quotation_revisions enable row level security;
create policy quotations_member_read on public.quotations for select using (private.is_org_member(organization_id));
create policy quotations_member_insert on public.quotations for insert with check (private.is_org_member(organization_id));
create policy quotations_member_update on public.quotations for update using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy quotation_revisions_member_read on public.quotation_revisions for select using (private.is_org_member(organization_id));
create policy quotation_revisions_member_insert on public.quotation_revisions for insert with check (private.is_org_member(organization_id));
revoke all on public.quotations, public.quotation_revisions from anon;
grant select, insert, update on public.quotations to authenticated;
grant select, insert on public.quotation_revisions to authenticated;

create or replace function public.save_quotation_draft(
  p_organization_id uuid, p_project_id uuid, p_quotation_id uuid, p_name text,
  p_client_id uuid, p_currency text, p_input_snapshot jsonb,
  p_line_items_snapshot jsonb, p_totals_snapshot jsonb, p_subtotal numeric,
  p_expected_version integer
) returns table (quotation_id uuid, revision_id uuid, revision_number integer, revision_created boolean)
language plpgsql security invoker set search_path = public, pg_catalog as $$
declare
  v_quote public.quotations%rowtype;
  v_revision_id uuid;
  v_revision_number integer;
  v_price_class public.quotation_price_class;
  v_line jsonb;
begin
  if not private.is_org_member(p_organization_id) then raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501'; end if;
  if p_currency <> 'HUF' or jsonb_typeof(p_input_snapshot) <> 'object' or jsonb_typeof(p_line_items_snapshot) <> 'array' or jsonb_typeof(p_totals_snapshot) <> 'object' then
    raise exception 'Érvénytelen ajánlati snapshot.' using errcode = '22023';
  end if;
  perform 1 from public.projects where id = p_project_id and organization_id = p_organization_id;
  if not found then raise exception 'A projekt nem található ebben a műhelyben.' using errcode = '23503'; end if;
  if p_client_id is not null then
    perform 1 from public.clients where id = p_client_id and organization_id = p_organization_id;
    if not found then raise exception 'Az ügyfél nem található ebben a műhelyben.' using errcode = '23503'; end if;
  end if;
  for v_line in select value from jsonb_array_elements(p_line_items_snapshot) loop
    if (v_line->>'type') in ('MATERIAL') and nullif(v_line->>'variantId', '') is null then raise exception 'Anyagtételhez katalógusváltozat szükséges.' using errcode = '22023'; end if;
    if nullif(v_line->>'variantId', '') is not null then
      perform 1 from public.material_variants where id = (v_line->>'variantId')::uuid and organization_id = p_organization_id;
      if not found then raise exception 'A katalógusváltozat nem ehhez a műhelyhez tartozik.' using errcode = '23503'; end if;
    end if;
    if nullif(v_line->>'priceId', '') is not null then
      perform 1 from public.material_prices where id = (v_line->>'priceId')::uuid and organization_id = p_organization_id and variant_id = nullif(v_line->>'variantId', '')::uuid;
      if not found then raise exception 'Az árrekord nem ehhez a változathoz tartozik.' using errcode = '23503'; end if;
    end if;
    if nullif(v_line->>'takeoffItemId', '') is not null then
      perform 1 from public.material_takeoff_items i join public.material_takeoffs t on t.id = i.takeoff_id
        where i.id = (v_line->>'takeoffItemId')::uuid and i.organization_id = p_organization_id and t.project_id = p_project_id and t.status = 'approved';
      if not found then raise exception 'Csak jóváhagyott, azonos projekthez tartozó tétel importálható.' using errcode = '23503'; end if;
    end if;
  end loop;
  if p_quotation_id is null then
    insert into public.quotations (organization_id, project_id, client_id, name, currency, created_by)
      values (p_organization_id, p_project_id, p_client_id, trim(p_name), p_currency, auth.uid()) returning * into v_quote;
  else
    select * into v_quote from public.quotations where id = p_quotation_id and organization_id = p_organization_id and project_id = p_project_id for update;
    if not found then raise exception 'Az ajánlat nem található.' using errcode = '23503'; end if;
    if v_quote.version is distinct from p_expected_version then raise exception 'Az ajánlat időközben megváltozott; töltsd újra az oldalt.' using errcode = '40001'; end if;
    if v_quote.current_revision_id is not null and exists (select 1 from public.quotation_revisions where id = v_quote.current_revision_id and input_snapshot = p_input_snapshot) then
      return query select v_quote.id, v_quote.current_revision_id, v_quote.version, false; return;
    end if;
    update public.quotations set client_id = p_client_id, name = trim(p_name) where id = v_quote.id;
  end if;
  select nullif(p_totals_snapshot->>'priceClass', '')::public.quotation_price_class into v_price_class;
  v_revision_number := v_quote.version + 1;
  insert into public.quotation_revisions (organization_id, quotation_id, revision_number, currency, price_class, input_snapshot, line_items_snapshot, subtotal, totals_snapshot, created_by)
    values (p_organization_id, v_quote.id, v_revision_number, p_currency, v_price_class, p_input_snapshot, p_line_items_snapshot, p_subtotal, p_totals_snapshot, auth.uid()) returning id into v_revision_id;
  update public.quotations set current_revision_id = v_revision_id, version = v_revision_number where id = v_quote.id;
  return query select v_quote.id, v_revision_id, v_revision_number, true;
end; $$;
revoke all on function public.save_quotation_draft(uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb, numeric, integer) from public, anon;
grant execute on function public.save_quotation_draft(uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb, numeric, integer) to authenticated;
