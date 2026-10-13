-- F8.3.1: immutable quotation finalization. Sending, acceptance and invoicing remain out of scope.

alter type public.quotation_status add value if not exists 'finalized';

alter table public.quotations
  add column finalized_revision_id uuid,
  add column finalized_at timestamptz,
  add column finalized_by uuid references auth.users(id);

alter table public.quotations add constraint quotations_finalized_revision_fk
  foreign key (finalized_revision_id, organization_id)
  references public.quotation_revisions(id, organization_id) on delete restrict;

alter table public.quotations add constraint quotations_finalization_state_ck check (
  (status::text = 'draft' and finalized_revision_id is null and finalized_at is null and finalized_by is null)
  or
  (status::text = 'finalized' and finalized_revision_id is not null and finalized_at is not null and finalized_by is not null)
);

create or replace function private.prevent_finalized_quotation_mutation() returns trigger
language plpgsql set search_path = public, pg_catalog as $$
begin
  if old.status = 'finalized' then
    raise exception 'A véglegesített ajánlat nem módosítható.' using errcode = '55000';
  end if;
  if new.status = 'finalized' then
    if new.finalized_revision_id is null or new.finalized_revision_id is distinct from new.current_revision_id then
      raise exception 'A véglegesítésnek az aktuális revízióhoz kell tartoznia.' using errcode = '22023';
    end if;
  elsif new.finalized_revision_id is not null or new.finalized_at is not null or new.finalized_by is not null then
    raise exception 'Piszkozat nem tartalmazhat véglegesítési adatot.' using errcode = '22023';
  end if;
  return new;
end; $$;
create trigger quotations_finalization_guard before update on public.quotations
for each row execute function private.prevent_finalized_quotation_mutation();

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
  if p_quotation_id is null then
    insert into public.quotations (organization_id, project_id, client_id, name, currency, created_by)
      values (p_organization_id, p_project_id, p_client_id, trim(p_name), p_currency, auth.uid()) returning * into v_quote;
  else
    select * into v_quote from public.quotations where id = p_quotation_id and organization_id = p_organization_id and project_id = p_project_id for update;
    if not found then raise exception 'Az ajánlat nem található.' using errcode = '23503'; end if;
    if v_quote.status <> 'draft' then raise exception 'A véglegesített ajánlat nem módosítható.' using errcode = '55000'; end if;
    if v_quote.version is distinct from p_expected_version then raise exception 'Az ajánlat időközben megváltozott; töltsd újra az oldalt.' using errcode = '40001'; end if;
    if v_quote.current_revision_id is not null and exists (select 1 from public.quotation_revisions where id = v_quote.current_revision_id and input_snapshot = p_input_snapshot) then
      return query select v_quote.id, v_quote.current_revision_id, v_quote.version, false; return;
    end if;
    update public.quotations set client_id = p_client_id, name = trim(p_name) where id = v_quote.id;
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
  select nullif(p_totals_snapshot->>'priceClass', '')::public.quotation_price_class into v_price_class;
  v_revision_number := v_quote.version + 1;
  insert into public.quotation_revisions (organization_id, quotation_id, revision_number, currency, price_class, input_snapshot, line_items_snapshot, subtotal, totals_snapshot, created_by)
    values (p_organization_id, v_quote.id, v_revision_number, p_currency, v_price_class, p_input_snapshot, p_line_items_snapshot, p_subtotal, p_totals_snapshot, auth.uid()) returning id into v_revision_id;
  update public.quotations set current_revision_id = v_revision_id, version = v_revision_number where id = v_quote.id;
  return query select v_quote.id, v_revision_id, v_revision_number, true;
end; $$;

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
  select * into v_quote from public.quotations
    where id = p_quotation_id and organization_id = p_organization_id and project_id = p_project_id for update;
  if not found then raise exception 'Az ajánlat nem található.' using errcode = '23503'; end if;
  if v_quote.status <> 'draft' then raise exception 'Az ajánlat már véglegesítve van.' using errcode = '55000'; end if;
  if v_quote.version is distinct from p_expected_version or v_quote.current_revision_id is distinct from p_revision_id then
    raise exception 'Az ajánlat időközben megváltozott; töltsd újra az oldalt.' using errcode = '40001';
  end if;
  if v_quote.client_id is null then raise exception 'Véglegesítéshez ügyfél megadása szükséges.' using errcode = '22023'; end if;
  select * into v_revision from public.quotation_revisions as r where r.id = p_revision_id and r.quotation_id = v_quote.id and r.organization_id = p_organization_id;
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
