-- F9.8: preserve approved material sources in quotation snapshots and make
-- first-draft transfer retries idempotent.

alter table public.quotations add column creation_operation_id uuid;
create unique index quotations_creation_operation_idx
  on public.quotations (organization_id, creation_operation_id)
  where creation_operation_id is not null;

create or replace function private.validate_quotation_takeoff_sources()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_line jsonb;
  v_source jsonb;
  v_source_id uuid;
  v_source_count integer;
  v_quantity numeric;
  v_source_quantity numeric;
  v_compat jsonb;
  v_first_compat jsonb;
  v_seen uuid[] := '{}';
  v_line_seen uuid[];
begin
  for v_line in select value from jsonb_array_elements(new.line_items_snapshot) loop
    if (v_line ? 'takeoffSourceItemIds' and jsonb_typeof(v_line->'takeoffSourceItemIds') <> 'array')
       or (v_line ? 'takeoffSourceSnapshots' and jsonb_typeof(v_line->'takeoffSourceSnapshots') <> 'array') then
      raise exception 'A kimutatási forráslistának tömbnek kell lennie.' using errcode = '22023';
    end if;
    if jsonb_typeof(v_line->'takeoffSourceItemIds') = 'array' and jsonb_array_length(v_line->'takeoffSourceItemIds') > 0 then
      if v_line->>'type' <> 'MATERIAL'
         or jsonb_typeof(v_line->'takeoffSourceItemIds') <> 'array'
         or jsonb_typeof(v_line->'takeoffSourceSnapshots') <> 'array'
         or jsonb_array_length(v_line->'takeoffSourceItemIds') = 0
         or jsonb_array_length(v_line->'takeoffSourceItemIds') <> jsonb_array_length(v_line->'takeoffSourceSnapshots') then
        raise exception 'Az összevont kimutatási forrás pillanatképe hiányos.' using errcode = '22023';
      end if;
      begin v_quantity := (v_line->>'quantity')::numeric;
      exception when others then raise exception 'Az összevont mennyiség érvénytelen.' using errcode = '22023'; end;
      v_source_count := 0;
      v_source_quantity := 0;
      v_first_compat := null;
      v_line_seen := '{}';
      for v_source in select value from jsonb_array_elements(v_line->'takeoffSourceSnapshots') loop
        begin v_source_id := (v_source->>'itemId')::uuid;
        exception when others then raise exception 'A forrásazonosító érvénytelen.' using errcode = '22023'; end;
        if v_source_id = any(v_seen) then raise exception 'Egy kimutatási tétel csak egyszer kapcsolható ajánlathoz.' using errcode = '23505'; end if;
        v_seen := array_append(v_seen, v_source_id);
        v_line_seen := array_append(v_line_seen, v_source_id);
        if not exists (
          select 1 from public.material_takeoff_items i
          join public.material_takeoffs t on t.id = i.takeoff_id
          where i.id = v_source_id and i.organization_id = new.organization_id
            and t.organization_id = new.organization_id and t.project_id = (select q.project_id from public.quotations q where q.id = new.quotation_id and q.organization_id = new.organization_id)
            and t.status = 'approved' and t.id = (v_source->>'takeoffId')::uuid
            and t.source_calculation_id = (v_source->>'calculationId')::uuid
            and t.source_calculation_revision_id = (v_source->>'calculationRevisionId')::uuid
            and i.variant_id = nullif(v_line->>'variantId', '')::uuid
            and i.quantity_unit::text = v_line->>'unit'
            and i.final_quantity = (v_source->>'quantity')::numeric
            and i.quantity_unit::text = v_source->>'unit'
            and i.material_snapshot = v_source->'materialSnapshot'
            and coalesce(i.price_snapshot, 'null'::jsonb) = v_source->'priceSnapshot'
        ) then raise exception 'A kimutatási forrás nem ehhez a jóváhagyott projekthez tartozik, vagy a pillanatképe eltér.' using errcode = '23503'; end if;
        select i.final_quantity, jsonb_build_object(
          'productId', i.material_snapshot->'productId', 'productName', i.material_snapshot->'productName',
          'productCategory', i.material_snapshot->'productCategory', 'variantId', i.variant_id,
          'variantName', i.material_snapshot->'variantName', 'sku', i.material_snapshot->'sku',
          'unit', i.quantity_unit, 'provenance', i.material_snapshot->'provenance',
          'productProvenance', i.material_snapshot->'productProvenance', 'variantProvenance', i.material_snapshot->'variantProvenance',
          'lengthMm', i.material_snapshot->'lengthMm', 'nominalWidthMm', i.material_snapshot->'nominalWidthMm',
          'effectiveWidthMm', i.material_snapshot->'effectiveWidthMm', 'thicknessMm', i.material_snapshot->'thicknessMm',
          'packagingQuantity', i.material_snapshot->'packagingQuantity', 'technicalSpecs', coalesce(i.material_snapshot->'technicalSpecs', '{}'::jsonb)
        ) into v_source_quantity, v_compat
        from public.material_takeoff_items i where i.id = v_source_id;
        if v_first_compat is null then v_first_compat := v_compat;
        elsif v_first_compat is distinct from v_compat then raise exception 'Eltérő anyagjellemzők nem vonhatók össze.' using errcode = '22023'; end if;
        v_source_count := v_source_count + 1;
        select coalesce(sum(i.final_quantity), 0) into v_source_quantity
          from public.material_takeoff_items i where i.id = any(v_line_seen);
      end loop;
      if v_source_count <> jsonb_array_length(v_line->'takeoffSourceItemIds')
         or (select array_agg((value #>> '{}')::uuid order by ordinality) from jsonb_array_elements(v_line->'takeoffSourceItemIds') with ordinality) is distinct from
            (select array_agg((value->>'itemId')::uuid order by ordinality) from jsonb_array_elements(v_line->'takeoffSourceSnapshots') with ordinality)
         or v_quantity is distinct from v_source_quantity then
        raise exception 'Az ajánlati mennyiség és a forráskimutatások nem egyeznek.' using errcode = '22023';
      end if;
    elsif jsonb_typeof(v_line->'takeoffSourceSnapshots') = 'array' and jsonb_array_length(v_line->'takeoffSourceSnapshots') > 0 then
      raise exception 'Forrás-pillanatkép azonosítók nélkül nem fogadható el.' using errcode = '22023';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function private.validate_quotation_takeoff_sources() from public, anon, authenticated;
create trigger quotation_revisions_takeoff_source_guard
before insert on public.quotation_revisions
for each row execute function private.validate_quotation_takeoff_sources();

create function public.save_quotation_draft(
  p_organization_id uuid, p_project_id uuid, p_quotation_id uuid, p_name text,
  p_client_id uuid, p_currency text, p_input_snapshot jsonb,
  p_line_items_snapshot jsonb, p_totals_snapshot jsonb, p_subtotal numeric,
  p_expected_version integer, p_operation_id uuid
) returns table (quotation_id uuid, revision_id uuid, revision_number integer, revision_created boolean)
language plpgsql security invoker set search_path = public, pg_catalog as $$
declare
  v_quote public.quotations%rowtype;
  v_revision public.quotation_revisions%rowtype;
  v_existing public.quotations%rowtype;
  v_result record;
begin
  if not private.is_org_member(p_organization_id) then raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501'; end if;
  if p_quotation_id is not null then
    return query select * from public.save_quotation_draft(
      p_organization_id, p_project_id, p_quotation_id, p_name, p_client_id,
      p_currency, p_input_snapshot, p_line_items_snapshot, p_totals_snapshot,
      p_subtotal, p_expected_version);
    return;
  end if;
  if p_operation_id is null then raise exception 'Új ajánlathoz műveletazonosító szükséges.' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || p_operation_id::text, 0));
  select * into v_existing from public.quotations q
    where q.organization_id = p_organization_id and q.creation_operation_id = p_operation_id for update;
  if found then
    select * into v_revision from public.quotation_revisions r
      where r.id = v_existing.current_revision_id and r.quotation_id = v_existing.id and r.organization_id = p_organization_id;
    if v_existing.project_id = p_project_id and v_existing.name = trim(p_name)
       and v_existing.client_id is not distinct from p_client_id
       and v_revision.input_snapshot = p_input_snapshot
       and v_revision.line_items_snapshot = p_line_items_snapshot
       and v_revision.totals_snapshot = p_totals_snapshot
       and v_revision.subtotal is not distinct from p_subtotal then
      return query select v_existing.id, v_revision.id, v_revision.revision_number, false; return;
    end if;
    raise exception 'Ez az átvételi művelet már más ajánlati adattal szerepel.' using errcode = '40001';
  end if;
  select * into v_result from public.save_quotation_draft(
    p_organization_id, p_project_id, null, p_name, p_client_id,
    p_currency, p_input_snapshot, p_line_items_snapshot, p_totals_snapshot,
    p_subtotal, p_expected_version);
  update public.quotations set creation_operation_id = p_operation_id
    where id = v_result.quotation_id and organization_id = p_organization_id;
  return query select v_result.quotation_id, v_result.revision_id, v_result.revision_number, v_result.revision_created;
end;
$$;

revoke all on function public.save_quotation_draft(uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb, numeric, integer, uuid) from public, anon;
grant execute on function public.save_quotation_draft(uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb, numeric, integer, uuid) to authenticated;
