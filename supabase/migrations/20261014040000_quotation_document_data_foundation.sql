-- F9.7.6.6.3.2a: persistent quotation document metadata and safe numbering state.
-- Drafts do not allocate numbers; issuance remains deliberately unsupported.

alter table public.organizations
  add column business_name text,
  add column business_address text,
  add column contact_email text,
  add column contact_phone text,
  add column tax_identifier text,
  add constraint organizations_business_name_length check (business_name is null or char_length(trim(business_name)) between 1 and 200),
  add constraint organizations_business_address_length check (business_address is null or char_length(trim(business_address)) between 1 and 500),
  add constraint organizations_contact_email_length check (contact_email is null or char_length(contact_email) <= 320),
  add constraint organizations_contact_phone_length check (contact_phone is null or char_length(contact_phone) <= 80),
  add constraint organizations_tax_identifier_length check (tax_identifier is null or char_length(trim(tax_identifier)) <= 120);
grant update (business_name, business_address, contact_email, contact_phone, tax_identifier) on public.organizations to authenticated;

-- The future issuance RPC will increment this row transactionally. No row is
-- created by a draft save, and authenticated clients have no direct access.
create table public.quotation_document_sequences (
  organization_id uuid primary key references public.organizations(id) on delete restrict,
  last_issued_number bigint not null default 0 check (last_issued_number >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger quotation_document_sequences_set_updated_at before update on public.quotation_document_sequences
  for each row execute function private.set_updated_at();
alter table public.quotation_document_sequences enable row level security;
revoke all on public.quotation_document_sequences from anon, authenticated;

-- Keep the prior RPC unreachable to authenticated clients, then use the
-- document-aware transaction for all application draft saves.
revoke all on function public.save_standalone_quotation_draft(uuid,uuid,uuid,text,uuid,jsonb,integer) from public, anon, authenticated;

create or replace function public.save_standalone_quotation_draft_with_document(
  p_organization_id uuid,
  p_operation_id uuid,
  p_quotation_id uuid,
  p_name text,
  p_client_id uuid,
  p_lines jsonb,
  p_expected_version integer,
  p_document jsonb
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
  v_issuer jsonb;
  v_recipient jsonb;
  v_recipient_source text;
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
  if p_document is null or jsonb_typeof(p_document) <> 'object'
     or p_document->>'recipientSource' not in ('manual','client') then
    raise exception 'Az ajánlati dokumentum adatai érvénytelenek.' using errcode = '22023';
  end if;
  if p_document->>'recipientSource' = 'client' and p_client_id is null then
    raise exception 'Válassz műhelyhez tartozó címzettet.' using errcode = '22023';
  end if;
  if p_document->>'recipientSource' = 'manual' and p_client_id is not null then
    raise exception 'Kézi címzettnél ügyfélrekord nem kapcsolható.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_each(p_document) e where jsonb_typeof(e.value) not in ('string','null'))
     or char_length(coalesce(p_document->>'recipientName','')) > 200
     or char_length(coalesce(p_document->>'recipientAddress','')) > 500
     or char_length(coalesce(p_document->>'recipientEmail','')) > 320
     or char_length(coalesce(p_document->>'recipientPhone','')) > 80
     or char_length(coalesce(p_document->>'recipientTaxIdentifier','')) > 120
     or char_length(coalesce(p_document->>'reference','')) > 120
     or char_length(coalesce(p_document->>'validUntil','')) > 10
     or char_length(coalesce(p_document->>'notes','')) > 2000
     or char_length(coalesce(p_document->>'terms','')) > 5000 then
    raise exception 'Az ajánlati dokumentum valamely mezője érvénytelen vagy túl hosszú.' using errcode = '22023';
  end if;
  select jsonb_build_object(
    'organizationName', o.name, 'businessName', o.business_name,
    'businessAddress', o.business_address, 'contactEmail', o.contact_email,
    'contactPhone', o.contact_phone, 'taxIdentifier', o.tax_identifier
  ) into v_issuer from public.organizations o where o.id = p_organization_id;
  v_recipient_source := p_document->>'recipientSource';
  if v_recipient_source = 'client' then
    select jsonb_build_object('source','linked_client','clientId',c.id,'name',c.name,
      'address',c.billing_address,'email',c.email,'phone',c.phone,'taxIdentifier',null)
      into v_recipient from public.clients c where c.id = p_client_id and c.organization_id = p_organization_id;
  else
    v_recipient := jsonb_build_object('source','manual','clientId',null,
      'name',nullif(trim(coalesce(p_document->>'recipientName','')),''),
      'address',nullif(trim(coalesce(p_document->>'recipientAddress','')),''),
      'email',nullif(trim(coalesce(p_document->>'recipientEmail','')),''),
      'phone',nullif(trim(coalesce(p_document->>'recipientPhone','')),''),
      'taxIdentifier',nullif(trim(coalesce(p_document->>'recipientTaxIdentifier','')),''));
  end if;

  -- Serialize retries, including first-time create requests, by tenant + actor + key.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':' || v_actor::text || ':' || p_operation_id::text, 0));
  select * into v_existing from public.standalone_quotation_operations o
    where o.organization_id = p_organization_id and o.created_by = v_actor and o.operation_id = p_operation_id;
  if found then
    v_request := jsonb_build_object('quotationId', p_quotation_id, 'name', trim(p_name), 'clientId', p_client_id, 'lines', p_lines, 'expectedVersion', p_expected_version, 'document', p_document);
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
  v_request := jsonb_build_object('quotationId', p_quotation_id, 'name', trim(p_name), 'clientId', p_client_id, 'lines', p_lines, 'expectedVersion', p_expected_version, 'document', p_document);
  v_totals := jsonb_build_object('priceClass', v_price_class, 'subtotal', v_subtotal::text,
    'materialSubtotal', v_material::text, 'laborSubtotal', v_labor::text, 'otherSubtotal', v_other::text,
    'currency', 'HUF', 'complete', v_complete);
  v_input := jsonb_build_object('name', trim(p_name), 'clientId', p_client_id, 'currency', 'HUF',
    'priceClass', v_price_class, 'lines', v_lines,
    'precision', jsonb_build_object('quantityScale', 6, 'moneyScale', 2, 'rounding', 'half_up'),
    'document', jsonb_build_object('schemaVersion', 1, 'issuer', v_issuer, 'recipient', v_recipient,
      'reference', nullif(trim(coalesce(p_document->>'reference','')),''),
      'validUntil', nullif(coalesce(p_document->>'validUntil',''),''),
      'notes', nullif(trim(coalesce(p_document->>'notes','')),''),
      'terms', nullif(trim(coalesce(p_document->>'terms','')),'')));

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
revoke all on function public.save_standalone_quotation_draft_with_document(uuid,uuid,uuid,text,uuid,jsonb,integer,jsonb) from public, anon;
grant execute on function public.save_standalone_quotation_draft_with_document(uuid,uuid,uuid,text,uuid,jsonb,integer,jsonb) to authenticated;
