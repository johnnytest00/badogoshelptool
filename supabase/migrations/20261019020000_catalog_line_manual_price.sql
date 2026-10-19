-- F9.43.1: a catalog material-list line may carry an explicit manual price override instead of a catalog price
-- (the line keeps its product link and provenance; the snapshot is marked manual). A line has either a priceId or a manual amount.
-- Only the two affected expressions of the current function body are replaced; everything else is unchanged.
do $$
declare v_def text; v_new text; v_count int;
  v_old_guard constant text := $g$      if coalesce(v_item->>'manualPriceAmount', '') <> '' or nullif(v_item->>'manualPriceKind', '') is not null then
        raise exception 'catalog items use only an explicitly selected catalog price' using errcode = '22023';
      end if;$g$;
  v_new_guard constant text := $g$      v_manual_price_amount := null;
      v_manual_price_kind := null;
      if coalesce(v_item->>'manualPriceAmount', '') <> '' then
        if nullif(v_item->>'priceId', '') is not null then
          raise exception 'a catalog line has either a catalog price or a manual override' using errcode = '22023';
        end if;
        if (v_item->>'manualPriceAmount') !~ '^[0-9]{1,12}(\.[0-9]{1,2})?$' then
          raise exception 'manual price must be a non-negative HUF amount with at most two decimals' using errcode = '22023';
        end if;
        v_manual_price_amount := (v_item->>'manualPriceAmount')::numeric(20,2);
        begin v_manual_price_kind := (v_item->>'manualPriceKind')::public.material_price_kind;
        exception when others then raise exception 'manual price basis must be net or gross' using errcode = '22023'; end;
      elsif nullif(v_item->>'manualPriceKind', '') is not null then
        raise exception 'manual price basis requires a price amount' using errcode = '22023';
      end if;$g$;
  v_old_snap constant text := $g$'priceSnapshot', case when v_price_id is null then null else$g$;
  v_new_snap constant text := $g$'manualPriceAmount', case when v_manual_price_amount is null then null else v_manual_price_amount::text end,
        'manualPriceKind', v_manual_price_kind,
        'priceSnapshot', case when v_manual_price_amount is not null then pg_catalog.jsonb_build_object(
          'amount', v_manual_price_amount::text, 'currency', 'HUF', 'purchasingUnit', v_unit,
          'priceKind', v_manual_price_kind, 'manual', true, 'provenance', 'user_provided')
          when v_price_id is null then null else$g$;
begin
  select count(*) into v_count from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'save_workflow_material_list_revision';
  if v_count <> 1 then raise exception 'expected one save_workflow_material_list_revision, found %', v_count; end if;
  select pg_get_functiondef(p.oid) into v_def from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'save_workflow_material_list_revision';
  if position(v_old_guard in v_def) = 0 or position(v_old_snap in v_def) = 0 then raise exception 'expected expressions not found'; end if;
  v_new := replace(replace(v_def, v_old_guard, v_new_guard), v_old_snap, v_new_snap);
  execute v_new;
end $$;
