-- F9.42.15: approved independent takeoff -> standalone material list, with an exact, immutable source link.
create table public.material_preparation_takeoff_sources (
  organization_id uuid not null,
  material_list_id uuid not null,
  material_revision_id uuid not null,
  takeoff_id uuid not null,
  takeoff_version integer not null check (takeoff_version > 0),
  source_calculation_id uuid not null,
  source_calculation_revision_id uuid not null,
  source_items_snapshot jsonb not null check (jsonb_typeof(source_items_snapshot) = 'array'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint material_preparation_takeoff_sources_pk primary key (material_revision_id),
  constraint material_preparation_takeoff_sources_revision_fk
    foreign key (material_revision_id, material_list_id, organization_id)
    references public.material_preparation_revisions(id, list_id, organization_id) on delete restrict,
  constraint material_preparation_takeoff_sources_takeoff_fk
    foreign key (takeoff_id, organization_id) references public.material_takeoffs(id, organization_id) on delete restrict,
  -- One conversion per takeoff: duplicate lists cannot be created from the same approved source.
  constraint material_preparation_takeoff_sources_one_per_takeoff unique (organization_id, takeoff_id)
);

alter table public.material_preparation_takeoff_sources enable row level security;
revoke all on public.material_preparation_takeoff_sources from public, anon, authenticated;
grant select on public.material_preparation_takeoff_sources to authenticated;
create policy material_preparation_takeoff_sources_scoped_read on public.material_preparation_takeoff_sources
  for select to authenticated using (
    private.is_org_member(organization_id) and created_by = (select auth.uid())
  );

create function private.prevent_material_preparation_takeoff_source_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'material list takeoff source history is immutable' using errcode = 'P0001';
end; $$;
create trigger material_preparation_takeoff_sources_immutable
  before update or delete on public.material_preparation_takeoff_sources
  for each row execute function private.prevent_material_preparation_takeoff_source_mutation();

create function public.save_workflow_material_list_from_takeoff(
  p_organization_id uuid,
  p_takeoff_id uuid,
  p_name text,
  p_request_key uuid
)
returns table (list_id uuid, revision_id uuid, revision_number integer, version integer, list_created boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_takeoff public.material_takeoffs%rowtype;
  v_existing public.material_preparation_takeoff_sources%rowtype;
  v_item public.material_takeoff_items%rowtype;
  v_product public.material_products%rowtype;
  v_variant public.material_variants%rowtype;
  v_items jsonb := '[]'::jsonb;
  v_snapshots jsonb := '[]'::jsonb;
  v_id uuid;
  v_price_id uuid;
  v_name text := pg_catalog.btrim(coalesce(p_name, ''));
  v_saved record;
  v_list public.material_preparation_lists%rowtype;
begin
  if v_actor is null or not private.is_org_member(p_organization_id) then
    raise exception 'material list access denied' using errcode = '42501';
  end if;
  if p_takeoff_id is null or p_request_key is null or pg_catalog.char_length(v_name) not between 1 and 120 then
    raise exception 'invalid takeoff material list payload' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_organization_id::text || ':takeoff-list:' || p_takeoff_id::text, 0));

  select * into v_takeoff from public.material_takeoffs t
   where t.id = p_takeoff_id and t.organization_id = p_organization_id
     and t.project_id is null and t.created_by = v_actor;
  if not found then raise exception 'takeoff access denied' using errcode = '42501'; end if;

  -- A retry or a second click returns the one existing conversion; it never creates another list.
  select * into v_existing from public.material_preparation_takeoff_sources s
   where s.organization_id = p_organization_id and s.takeoff_id = p_takeoff_id;
  if found then
    select l.* into v_list from public.material_preparation_lists l where l.id = v_existing.material_list_id;
    return query select v_existing.material_list_id, v_existing.material_revision_id, 1, v_list.version, false;
    return;
  end if;

  if v_takeoff.status <> 'approved' then
    raise exception 'only an approved takeoff can become a material list' using errcode = '22023';
  end if;
  if v_takeoff.source_calculation_revision_id is distinct from (
    select c.current_revision_id from public.calculations c
     where c.id = v_takeoff.source_calculation_id and c.organization_id = p_organization_id
  ) then raise exception 'takeoff source revision is stale' using errcode = '40001'; end if;

  for v_item in select * from public.material_takeoff_items i
     where i.takeoff_id = p_takeoff_id and i.organization_id = p_organization_id order by i.created_at, i.id loop
    if v_item.final_quantity <= 0 or v_item.final_quantity <> pg_catalog.round(v_item.final_quantity, 6) then
      raise exception 'takeoff item quantity is not a positive validated quantity' using errcode = '22023';
    end if;
    select * into v_variant from public.material_variants v where v.id = v_item.variant_id and v.organization_id = p_organization_id;
    select * into v_product from public.material_products p where p.id = v_variant.product_id and p.organization_id = p_organization_id;
    v_id := gen_random_uuid();
    -- Only a price that still belongs to the same variant and unit is carried; otherwise the line stays unpriced.
    v_price_id := null;
    select pr.id into v_price_id from public.material_prices pr
     where pr.id::text = v_item.price_snapshot->>'id' and pr.organization_id = p_organization_id
       and pr.variant_id = v_item.variant_id and pr.purchasing_unit = v_item.quantity_unit;
    v_items := v_items || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'id', v_id, 'kind', 'catalog', 'variantId', v_item.variant_id, 'priceId', v_price_id,
      -- A takeoff warning (e.g. net blank area is not a purchase quantity) must stay visible on the list and quote line.
      'description', case when pg_catalog.jsonb_typeof(v_item.warnings) = 'array' and pg_catalog.jsonb_array_length(v_item.warnings) > 0
        then pg_catalog.left(pg_catalog.concat_ws(' · ', v_product.name, v_variant.name), 170) || ' · előzetes mennyiség, nem beszerzési mennyiség'
        else pg_catalog.left(pg_catalog.concat_ws(' · ', v_product.name, v_variant.name), 240) end,
      'quantity', v_item.final_quantity::text, 'unit', v_item.quantity_unit::text, 'sourceRefs', '[]'::jsonb));
    v_snapshots := v_snapshots || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'materialItemId', v_id, 'takeoffItemId', v_item.id, 'quantity', v_item.final_quantity::text,
      'unit', v_item.quantity_unit::text, 'estimationMethod', v_item.estimation_method::text,
      'measurementSource', v_item.measurement_source, 'materialSnapshot', v_item.material_snapshot,
      'priceSnapshot', v_item.price_snapshot, 'dataProvenance', v_item.data_provenance::text,
      'warnings', v_item.warnings));
  end loop;
  if pg_catalog.jsonb_array_length(v_items) = 0 then
    raise exception 'takeoff has no transferable material items' using errcode = '22023';
  end if;

  select * into v_saved from public.save_workflow_material_list_revision(
    p_organization_id, null, null, v_name, v_items, 0, p_request_key);
  if not found then raise exception 'material list save returned no revision' using errcode = 'P0001'; end if;

  insert into public.material_preparation_takeoff_sources(
    organization_id, material_list_id, material_revision_id, takeoff_id, takeoff_version,
    source_calculation_id, source_calculation_revision_id, source_items_snapshot, created_by)
  values (p_organization_id, v_saved.list_id, v_saved.revision_id, p_takeoff_id, v_takeoff.version,
    v_takeoff.source_calculation_id, v_takeoff.source_calculation_revision_id, v_snapshots, v_actor);
  return query select v_saved.list_id, v_saved.revision_id, v_saved.revision_number, v_saved.version, true;
end; $$;

revoke all on function public.save_workflow_material_list_from_takeoff(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.save_workflow_material_list_from_takeoff(uuid, uuid, text, uuid) to authenticated;
