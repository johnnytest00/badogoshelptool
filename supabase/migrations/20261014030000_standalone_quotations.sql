-- F9.7.6.6.1: standalone drafts share the existing immutable quotation revision model.

alter table public.quotations alter column project_id drop not null;
alter table public.quotations add column ownership_scope text not null default 'project';
alter table public.quotations add constraint quotations_ownership_scope_ck check (
  (ownership_scope = 'project' and project_id is not null)
  or (ownership_scope = 'standalone' and project_id is null)
);
create index quotations_standalone_owner_idx
  on public.quotations (organization_id, created_by, updated_at desc)
  where ownership_scope = 'standalone';

-- Replace broad organization-only visibility with legacy project visibility and
-- creator-scoped standalone visibility. Existing project records remain visible
-- to active organization members exactly as before.
drop policy quotations_member_read on public.quotations;
drop policy quotations_member_insert on public.quotations;
drop policy quotations_member_update on public.quotations;
create policy quotations_scoped_read on public.quotations for select to authenticated
  using (
    (ownership_scope = 'project' and private.is_org_member(organization_id))
    or (ownership_scope = 'standalone' and created_by = (select auth.uid()) and private.is_org_member(organization_id))
  );
create policy quotations_scoped_insert on public.quotations for insert to authenticated
  with check (
    created_by = (select auth.uid()) and private.is_org_member(organization_id)
    and ownership_scope = 'project' and project_id is not null
  );
create policy quotations_scoped_update on public.quotations for update to authenticated
  using (
    ownership_scope = 'project' and private.is_org_member(organization_id)
  ) with check (
    private.is_org_member(organization_id)
    and ownership_scope = 'project' and project_id is not null
  );

create or replace function private.prevent_quotation_owner_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.organization_id is distinct from old.organization_id
    or new.created_by is distinct from old.created_by or new.ownership_scope is distinct from old.ownership_scope
    or new.project_id is distinct from old.project_id then
    raise exception 'Az ajánlat tulajdonosi és kapcsolati adatai nem módosíthatók.' using errcode = '55000';
  end if;
  return new;
end; $$;
create trigger quotations_owner_guard before update on public.quotations
  for each row execute function private.prevent_quotation_owner_mutation();

create or replace function private.require_standalone_quotation_rpc() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_scope text;
begin
  if tg_table_name = 'quotations' then
    v_scope := new.ownership_scope;
  else
    select q.ownership_scope into v_scope from public.quotations q
      where q.id = new.quotation_id and q.organization_id = new.organization_id;
  end if;
  if v_scope = 'standalone' and (auth.uid() is null or current_setting('app.standalone_quotation_writer', true) is distinct from auth.uid()::text) then
    raise exception 'Önálló ajánlat csak az engedélyezett mentési művelettel írható.' using errcode = '42501';
  end if;
  return new;
end; $$;
create trigger quotations_standalone_write_guard before insert or update on public.quotations
  for each row execute function private.require_standalone_quotation_rpc();
create trigger quotation_revisions_standalone_insert_guard before insert on public.quotation_revisions
  for each row execute function private.require_standalone_quotation_rpc();

drop policy quotation_revisions_member_read on public.quotation_revisions;
drop policy quotation_revisions_member_insert on public.quotation_revisions;
create policy quotation_revisions_scoped_read on public.quotation_revisions for select to authenticated
  using (exists (
    select 1 from public.quotations q where q.id = public.quotation_revisions.quotation_id
      and q.organization_id = public.quotation_revisions.organization_id
  ));
create policy quotation_revisions_scoped_insert on public.quotation_revisions for insert to authenticated
  with check (
    created_by = (select auth.uid()) and exists (
      select 1 from public.quotations q where q.id = public.quotation_revisions.quotation_id
        and q.organization_id = public.quotation_revisions.organization_id
        and q.ownership_scope = 'project' and q.status = 'draft' and q.version + 1 = revision_number
    )
  );

-- Retry keys are scoped to organization and authenticated actor. Rows are append-only.
create table public.standalone_quotation_operations (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  operation_id uuid not null,
  created_by uuid not null references auth.users(id),
  request_snapshot jsonb not null check (jsonb_typeof(request_snapshot) = 'object'),
  quotation_id uuid not null,
  revision_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, created_by, operation_id),
  foreign key (quotation_id, organization_id) references public.quotations(id, organization_id) on delete restrict,
  foreign key (revision_id, organization_id) references public.quotation_revisions(id, organization_id) on delete restrict
);
create trigger standalone_quotation_operations_write_guard before insert on public.standalone_quotation_operations
  for each row execute function private.require_standalone_quotation_rpc();
alter table public.standalone_quotation_operations enable row level security;
create policy standalone_quotation_operations_owner_read on public.standalone_quotation_operations
  for select to authenticated using (
    created_by = (select auth.uid()) and private.is_org_member(organization_id)
  );
revoke all on public.standalone_quotation_operations from anon, authenticated;
grant select on public.standalone_quotation_operations to authenticated;

create or replace function public.save_standalone_quotation_draft(
  p_organization_id uuid,
  p_operation_id uuid,
  p_quotation_id uuid,
  p_name text,
  p_client_id uuid,
  p_lines jsonb,
  p_expected_version integer
) returns table (quotation_id uuid, revision_id uuid, revision_number integer, revision_created boolean, totals_snapshot jsonb)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_actor uuid := auth.uid();
  v_quote public.quotations%rowtype;
  v_line jsonb;
  v_saved_line jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_totals jsonb;
  v_input jsonb;
  v_request jsonb;
  v_existing public.standalone_quotation_operations%rowtype;
  v_revision_id uuid;
  v_revision_number integer;
  v_price_class public.quotation_price_class;
  v_class text;
  v_qty numeric;
  v_price numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_material numeric := 0;
  v_labor numeric := 0;
  v_other numeric := 0;
  v_complete boolean := true;
  v_variant public.material_variants%rowtype;
  v_product public.material_products%rowtype;
  v_price_row public.material_prices%rowtype;
begin
  if v_actor is null then raise exception 'Hitelesítés szükséges.' using errcode = '42501'; end if;
  if not private.is_org_member(p_organization_id) then raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501'; end if;
  if p_operation_id is null or p_expected_version is null or p_expected_version < 0
     or p_name is null or char_length(trim(p_name)) not between 1 and 200 or p_lines is null
     or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) > 200 then
    raise exception 'Érvénytelen ajánlati piszkozat.' using errcode = '22023';
  end if;
  if p_client_id is not null and not exists (
    select 1 from public.clients c where c.id = p_client_id and c.organization_id = p_organization_id
  ) then raise exception 'Az ügyfél nem található ebben a műhelyben.' using errcode = '23503'; end if;

  -- Serialize retries, including first-time create requests, by tenant + actor + key.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':' || v_actor::text || ':' || p_operation_id::text, 0));
  select * into v_existing from public.standalone_quotation_operations o
    where o.organization_id = p_organization_id and o.created_by = v_actor and o.operation_id = p_operation_id;
  if found then
    v_request := jsonb_build_object('quotationId', p_quotation_id, 'name', trim(p_name), 'clientId', p_client_id, 'lines', p_lines, 'expectedVersion', p_expected_version);
    if v_existing.request_snapshot <> v_request then raise exception 'A műveletazonosító eltérő adattal már felhasználásra került.' using errcode = '22023'; end if;
    return query select v_existing.quotation_id, v_existing.revision_id,
      (select r.revision_number from public.quotation_revisions r where r.id = v_existing.revision_id), false,
      (select r.totals_snapshot from public.quotation_revisions r where r.id = v_existing.revision_id);
    return;
  end if;

  for v_line in select value from jsonb_array_elements(p_lines) loop
    if jsonb_typeof(v_line) <> 'object'
      or nullif(v_line->>'type','') is null or v_line->>'type' not in ('MATERIAL','LABOR','OTHER')
      or nullif(trim(v_line->>'description'), '') is null or char_length(v_line->>'description') > 240
      or nullif(trim(v_line->>'unit'), '') is null or char_length(v_line->>'unit') > 40
      or char_length(coalesce(v_line->>'notes','')) > 500
      or nullif(v_line->>'priceClass','') is null or v_line->>'priceClass' not in ('net','gross')
      or jsonb_typeof(v_line->'quantity') <> 'string' or (v_line->>'quantity') !~ '^[0-9]+(\.[0-9]{1,6})?$'
      or jsonb_typeof(v_line->'unitPrice') <> 'string' or (v_line->>'unitPrice') !~ '^[0-9]+(\.[0-9]{1,2})?$' then
      raise exception 'A tétel megnevezése, egysége, típusa vagy árbesorolása hiányzik.' using errcode = '22023';
    end if;
    begin
      v_qty := (v_line->>'quantity')::numeric;
      v_price := (v_line->>'unitPrice')::numeric;
    exception when others then raise exception 'A mennyiség vagy egységár formátuma érvénytelen.' using errcode = '22023'; end;
    if v_qty <= 0 or v_qty > 999999999999.999999 or v_price < 0 or v_price > 999999999999999999.99
      or scale(v_qty) > 6 or scale(v_price) > 2 then
      raise exception 'A mennyiség vagy egységár kívül esik az engedélyezett tartományon.' using errcode = '22023';
    end if;
    v_class := v_line->>'priceClass';
    if v_class is distinct from coalesce(v_price_class::text, v_class) then
      raise exception 'Nettó és bruttó tételek nem keverhetők.' using errcode = '22023';
    end if;
    v_price_class := v_class::public.quotation_price_class;
    if v_line->>'type' = 'MATERIAL' and nullif(v_line->>'variantId','') is null then
      raise exception 'Anyagtételhez katalógusváltozat szükséges.' using errcode = '22023';
    end if;
    if v_line->>'type' <> 'MATERIAL' and nullif(v_line->>'variantId','') is not null then
      raise exception 'Katalógusváltozat csak anyagtételhez használható.' using errcode = '22023';
    end if;
    if nullif(v_line->>'takeoffItemId','') is not null then
      raise exception 'Önálló ajánlathoz projekt-anyagkimutatás nem kapcsolható.' using errcode = '22023';
    end if;

    v_saved_line := jsonb_build_object('type',v_line->>'type','description',trim(v_line->>'description'),
      'quantity',v_qty::text,'unit',trim(v_line->>'unit'),'unitPrice',v_price::text,'priceClass',v_class,
      'variantId',nullif(v_line->>'variantId',''),'priceId',nullif(v_line->>'priceId',''),
      'takeoffItemId',null,'notes',nullif(v_line->>'notes',''));
    if nullif(v_line->>'variantId','') is not null then
      select mv.* into v_variant from public.material_variants mv
        where mv.id = (v_line->>'variantId')::uuid and mv.organization_id = p_organization_id;
      if not found then raise exception 'A katalógusváltozat nem található ebben a műhelyben.' using errcode = '23503'; end if;
      select mp.* into v_product from public.material_products mp
        where mp.id = v_variant.product_id and mp.organization_id = p_organization_id and mp.status = 'active';
      if not found then raise exception 'A katalógustermék nem elérhető.' using errcode = '23503'; end if;
      if v_variant.purchasing_unit::text <> v_line->>'unit' then
        raise exception 'A katalógustétel egysége nem egyezik a kiválasztott változattal.' using errcode = '22023';
      end if;
      if nullif(v_line->>'priceId','') is not null then
        select mp.* into v_price_row from public.material_prices mp
          where mp.id = (v_line->>'priceId')::uuid and mp.variant_id = v_variant.id and mp.organization_id = p_organization_id;
        if not found or v_price_row.amount <> v_price or v_price_row.currency <> 'HUF' or v_price_row.price_kind::text <> v_class
          or v_price_row.purchasing_unit::text <> v_line->>'unit' then
          raise exception 'A megadott katalógusár vagy egység nem egyezik az érvényes árforrással.' using errcode = '23503';
        end if;
      end if;
      v_saved_line := v_saved_line || jsonb_build_object('materialSnapshot', jsonb_build_object(
        'productId', v_product.id, 'productName', v_product.name, 'category', v_product.category,
        'variantId', v_variant.id, 'variantName', v_variant.name, 'sku', v_variant.sku,
        'purchasingUnit', v_variant.purchasing_unit, 'provenance', v_variant.data_provenance,
        'price', case when v_price_row.id is null then null else jsonb_build_object(
          'id', v_price_row.id, 'amount', v_price_row.amount, 'currency', v_price_row.currency,
          'purchasingUnit', v_price_row.purchasing_unit, 'priceKind', v_price_row.price_kind,
          'effectiveDate', v_price_row.effective_date, 'provenance', v_price_row.data_provenance) end,
        'manualPriceOverride', v_price_row.id is null));
    elsif nullif(v_line->>'priceId','') is not null then
      raise exception 'Katalógusár csak katalógusváltozathoz használható.' using errcode = '22023';
    end if;

    v_line_total := round(v_qty * v_price, 2);
    v_subtotal := v_subtotal + v_line_total;
    if v_line->>'type' = 'MATERIAL' then v_material := v_material + v_line_total;
    elsif v_line->>'type' = 'LABOR' then v_labor := v_labor + v_line_total;
    else v_other := v_other + v_line_total; end if;
    if nullif(v_line->>'unitPrice','') is null then v_complete := false; end if;
    v_lines := v_lines || jsonb_build_array(v_saved_line || jsonb_build_object('lineTotal', v_line_total::text));
  end loop;
  if v_subtotal > 999999999999999999.99 then raise exception 'Az ajánlat összege túllépi a támogatott értéket.' using errcode = '22023'; end if;
  v_request := jsonb_build_object('quotationId', p_quotation_id, 'name', trim(p_name), 'clientId', p_client_id, 'lines', p_lines, 'expectedVersion', p_expected_version);
  v_totals := jsonb_build_object('priceClass', v_price_class, 'subtotal', v_subtotal::text,
    'materialSubtotal', v_material::text, 'laborSubtotal', v_labor::text, 'otherSubtotal', v_other::text,
    'currency', 'HUF', 'complete', v_complete);
  v_input := jsonb_build_object('name', trim(p_name), 'clientId', p_client_id, 'currency', 'HUF',
    'priceClass', v_price_class, 'lines', v_lines,
    'precision', jsonb_build_object('quantityScale', 6, 'moneyScale', 2, 'rounding', 'half_up'));

  perform set_config('app.standalone_quotation_writer', v_actor::text, true);
  if p_quotation_id is null then
    if p_expected_version <> 0 then raise exception 'Új ajánlatnál a várt verziónak nullának kell lennie.' using errcode = '40001'; end if;
    insert into public.quotations (organization_id, project_id, ownership_scope, client_id, name, currency, created_by)
      values (p_organization_id, null, 'standalone', p_client_id, trim(p_name), 'HUF', v_actor) returning * into v_quote;
  else
    select * into v_quote from public.quotations q where q.id = p_quotation_id and q.organization_id = p_organization_id
      and q.ownership_scope = 'standalone' and q.created_by = v_actor for update;
    if not found then raise exception 'Az önálló ajánlat nem található.' using errcode = '23503'; end if;
    if v_quote.status <> 'draft' then raise exception 'Csak piszkozat módosítható.' using errcode = '55000'; end if;
    if v_quote.version is distinct from p_expected_version then raise exception 'Az ajánlat időközben megváltozott; töltsd újra.' using errcode = '40001'; end if;
    if v_quote.current_revision_id is not null and exists (select 1 from public.quotation_revisions r where r.id = v_quote.current_revision_id and r.input_snapshot = v_input) then
      return query select v_quote.id, v_quote.current_revision_id, v_quote.version, false,
        (select r.totals_snapshot from public.quotation_revisions r where r.id = v_quote.current_revision_id); return;
    end if;
    update public.quotations set name = trim(p_name), client_id = p_client_id where id = v_quote.id;
  end if;
  v_revision_number := v_quote.version + 1;
  insert into public.quotation_revisions (organization_id, quotation_id, revision_number, currency, price_class,
      input_snapshot, line_items_snapshot, subtotal, totals_snapshot, created_by)
    values (p_organization_id, v_quote.id, v_revision_number, 'HUF', v_price_class,
      v_input, v_lines, v_subtotal, v_totals, v_actor) returning id into v_revision_id;
  update public.quotations set current_revision_id = v_revision_id, version = v_revision_number where id = v_quote.id;
  insert into public.standalone_quotation_operations (organization_id, operation_id, created_by, request_snapshot, quotation_id, revision_id)
    values (p_organization_id, p_operation_id, v_actor, v_request, v_quote.id, v_revision_id);
  return query select v_quote.id, v_revision_id, v_revision_number, true, v_totals;
end; $$;
revoke all on function public.save_standalone_quotation_draft(uuid,uuid,uuid,text,uuid,jsonb,integer) from public, anon;
grant execute on function public.save_standalone_quotation_draft(uuid,uuid,uuid,text,uuid,jsonb,integer) to authenticated;

create or replace function public.get_standalone_quotation_revision(p_organization_id uuid, p_quotation_id uuid, p_revision_id uuid default null)
returns setof public.quotation_revisions
language plpgsql security invoker set search_path = public, pg_catalog as $$
begin
  if auth.uid() is null or not private.is_org_member(p_organization_id) then raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501'; end if;
  if not exists (select 1 from public.quotations q where q.id = p_quotation_id and q.organization_id = p_organization_id
      and q.ownership_scope = 'standalone' and q.created_by = auth.uid()) then
    raise exception 'Az önálló ajánlat nem található.' using errcode = '23503';
  end if;
  return query select r.* from public.quotation_revisions r where r.quotation_id = p_quotation_id
    and r.organization_id = p_organization_id and (p_revision_id is null or r.id = p_revision_id);
end; $$;
revoke all on function public.get_standalone_quotation_revision(uuid,uuid,uuid) from public, anon;
grant execute on function public.get_standalone_quotation_revision(uuid,uuid,uuid) to authenticated;
