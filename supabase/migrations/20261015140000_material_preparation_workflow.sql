-- F9.8.1: project procurement and workshop preparation snapshots.
create table public.material_preparation_lists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  current_revision_id uuid,
  version integer not null default 0 check (version >= 0),
  creation_request_key uuid not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint material_preparation_lists_project_fk foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on update cascade on delete restrict,
  constraint material_preparation_lists_id_org_uq unique (id, organization_id),
  constraint material_preparation_lists_create_key_uq unique (organization_id, project_id, creation_request_key)
);

create table public.material_preparation_revisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  list_id uuid not null,
  revision_number integer not null check (revision_number > 0),
  request_key uuid not null,
  preparation_state text not null check (preparation_state in ('preliminary', 'ready')),
  source_takeoffs_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(source_takeoffs_snapshot) = 'array'),
  items_snapshot jsonb not null check (jsonb_typeof(items_snapshot) = 'array'),
  input_snapshot jsonb not null check (jsonb_typeof(input_snapshot) = 'object'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint material_preparation_revisions_list_fk foreign key (list_id, organization_id)
    references public.material_preparation_lists(id, organization_id) on update cascade on delete restrict,
  constraint material_preparation_revisions_id_list_org_uq unique (id, list_id, organization_id),
  constraint material_preparation_revisions_number_uq unique (list_id, organization_id, revision_number),
  constraint material_preparation_revisions_request_uq unique (list_id, organization_id, request_key)
);

alter table public.material_preparation_lists
  add constraint material_preparation_lists_current_revision_fk
  foreign key (current_revision_id, id, organization_id)
  references public.material_preparation_revisions(id, list_id, organization_id)
  deferrable initially deferred;

create index material_preparation_lists_project_idx
  on public.material_preparation_lists(organization_id, project_id, updated_at desc);
create index material_preparation_revisions_history_idx
  on public.material_preparation_revisions(list_id, organization_id, revision_number desc);

create trigger material_preparation_lists_touch
  before update on public.material_preparation_lists
  for each row execute function private.set_updated_at();

create or replace function private.prevent_material_preparation_revision_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'material preparation revision history is immutable' using errcode = 'P0001';
end;
$$;

create trigger material_preparation_revisions_immutable
  before update or delete on public.material_preparation_revisions
  for each row execute function private.prevent_material_preparation_revision_mutation();

alter table public.material_preparation_lists enable row level security;
alter table public.material_preparation_revisions enable row level security;
create policy material_preparation_lists_select_member on public.material_preparation_lists
  for select to authenticated using (private.is_org_member(organization_id));
create policy material_preparation_revisions_select_member on public.material_preparation_revisions
  for select to authenticated using (
    private.is_org_member(organization_id) and exists (
      select 1 from public.material_preparation_lists l
      where l.id = list_id and l.organization_id = material_preparation_revisions.organization_id
    )
  );
revoke all on public.material_preparation_lists, public.material_preparation_revisions from public, anon, authenticated;
grant select on public.material_preparation_lists, public.material_preparation_revisions to authenticated;

create or replace function public.save_material_preparation_revision(
  p_organization_id uuid,
  p_project_id uuid,
  p_list_id uuid,
  p_name text,
  p_source_takeoff_ids uuid[],
  p_items jsonb,
  p_expected_version integer,
  p_request_key uuid
)
returns table (list_id uuid, revision_id uuid, revision_number integer, version integer, preparation_state text)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_list public.material_preparation_lists%rowtype;
  v_revision public.material_preparation_revisions%rowtype;
  v_item jsonb;
  v_result_items jsonb := '[]'::jsonb;
  v_sources jsonb := '[]'::jsonb;
  v_input jsonb;
  v_line jsonb;
  v_source_ids uuid[];
  v_all_item_ids uuid[] := array[]::uuid[];
  v_seen_item_ids uuid[] := array[]::uuid[];
  v_source_count integer;
  v_item_count integer;
  v_expected_quantity numeric(18,6);
  v_saved_quantity numeric(18,6);
  v_first public.material_takeoff_items%rowtype;
  v_first_takeoff public.material_takeoffs%rowtype;
  v_first_product_name text;
  v_first_variant_name text;
  v_first_current_revision uuid;
  v_dimensions jsonb;
  v_details jsonb;
  v_source_snapshots jsonb;
  v_status text;
  v_category text;
  v_description text;
  v_manual jsonb;
  v_item_id uuid;
  v_preliminary boolean := false;
  v_created_list_id uuid;
  v_target_revision integer;
begin
  if v_actor is null or not (select private.is_org_member(p_organization_id)) then
    raise exception 'material preparation access denied' using errcode = '42501';
  end if;
  if not exists (select 1 from public.projects p where p.id = p_project_id and p.organization_id = p_organization_id) then
    raise exception 'project access denied' using errcode = '42501';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 120
    or p_request_key is null or p_expected_version is null
    or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 200
    or coalesce(cardinality(p_source_takeoff_ids), 0) > 50
    or cardinality(p_source_takeoff_ids) <> (select count(distinct x) from unnest(coalesce(p_source_takeoff_ids, array[]::uuid[])) x)
  then raise exception 'invalid material preparation payload' using errcode = '22023'; end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_organization_id::text || ':' || coalesce(p_list_id::text, p_project_id::text) || ':' || p_request_key::text, 0));

  v_input := jsonb_build_object('name', btrim(p_name), 'sourceTakeoffIds', to_jsonb(coalesce(p_source_takeoff_ids, array[]::uuid[])), 'items', p_items);

  if p_list_id is null then
    if p_expected_version <> 0 then raise exception 'new preparation version must be zero' using errcode = '22023'; end if;
    select l.* into v_list from public.material_preparation_lists l
      where l.organization_id = p_organization_id and l.project_id = p_project_id and l.creation_request_key = p_request_key
      for update;
    if found then
      select r.* into v_revision from public.material_preparation_revisions r
        where r.list_id = v_list.id and r.organization_id = p_organization_id and r.revision_number = 1;
      if v_revision.input_snapshot is distinct from v_input then
        raise exception 'request key reused with different preparation content' using errcode = '40001';
      end if;
      return query select v_list.id, v_revision.id, v_revision.revision_number, v_list.version, v_revision.preparation_state;
      return;
    end if;
    insert into public.material_preparation_lists(organization_id, project_id, name, version, creation_request_key, created_by)
      values(p_organization_id, p_project_id, btrim(p_name), 0, p_request_key, v_actor) returning * into v_list;
    v_target_revision := 1;
    v_created_list_id := v_list.id;
  else
    select l.* into v_list from public.material_preparation_lists l
      where l.id = p_list_id and l.organization_id = p_organization_id and l.project_id = p_project_id
      for update;
    if not found then raise exception 'material preparation not found' using errcode = '42501'; end if;
    select r.* into v_revision from public.material_preparation_revisions r
      where r.list_id = p_list_id and r.organization_id = p_organization_id and r.request_key = p_request_key;
    if found then
      if v_revision.input_snapshot is distinct from v_input then
        raise exception 'request key reused with different preparation content' using errcode = '40001';
      end if;
      return query select v_list.id, v_revision.id, v_revision.revision_number, v_list.version, v_revision.preparation_state;
      return;
    end if;
    if v_list.version <> p_expected_version then raise exception 'material preparation changed since it was opened' using errcode = '40001'; end if;
    v_created_list_id := v_list.id;
    v_target_revision := v_list.version + 1;
  end if;

  if coalesce(cardinality(p_source_takeoff_ids), 0) > 0 then
    select count(*) into v_source_count from public.material_takeoffs t
      where t.id = any(p_source_takeoff_ids) and t.organization_id = p_organization_id and t.project_id = p_project_id
        and t.status in ('draft', 'approved');
    if v_source_count <> cardinality(p_source_takeoff_ids) then
      raise exception 'source takeoff is missing, unsupported, or outside the project' using errcode = '42501';
    end if;
    if exists (select 1 from public.material_takeoffs t where t.id = any(p_source_takeoff_ids) and t.status = 'draft') then
      v_preliminary := true;
    end if;
    select coalesce(jsonb_agg(jsonb_build_object(
      'takeoffId', t.id, 'name', t.name, 'version', t.version, 'status', t.status,
      'calculationId', t.source_calculation_id, 'calculationRevisionId', t.source_calculation_revision_id,
      'currentCalculationRevisionId', c.current_revision_id
    ) order by t.created_at, t.id), '[]'::jsonb)
    into v_sources
    from public.material_takeoffs t
    join public.calculations c on c.id = t.source_calculation_id and c.organization_id = t.organization_id
    where t.id = any(p_source_takeoff_ids) and t.organization_id = p_organization_id and t.project_id = p_project_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_category := v_item->>'category';
    v_description := nullif(btrim(v_item->>'description'), '');
    v_item_id := coalesce(nullif(v_item->>'id', '')::uuid, gen_random_uuid());
    if v_item_id = any(v_all_item_ids) then raise exception 'duplicate preparation item id' using errcode = '22023'; end if;
    v_all_item_ids := array_append(v_all_item_ids, v_item_id);
    if v_category not in ('purchasing', 'workshop') then raise exception 'invalid preparation category' using errcode = '22023'; end if;
    if v_description is null or char_length(v_description) > 240 then raise exception 'preparation item description is required' using errcode = '22023'; end if;
    v_status := v_item->>'status';
    if v_category = 'purchasing' and v_status not in ('required', 'prepared', 'ordered', 'received') then raise exception 'invalid purchasing status' using errcode = '22023'; end if;
    if v_category = 'workshop' and v_status not in ('prepare', 'in_progress', 'done') then raise exception 'invalid workshop status' using errcode = '22023'; end if;
    v_manual := coalesce(v_item->'manualTechnicalData', '{}'::jsonb);

    if jsonb_typeof(v_item->'sourceItemIds') = 'array' and jsonb_array_length(v_item->'sourceItemIds') > 0 then
      select array_agg(value::uuid) into v_source_ids from jsonb_array_elements_text(v_item->'sourceItemIds');
      if cardinality(v_source_ids) <> jsonb_array_length(v_item->'sourceItemIds')
        or exists (select 1 from unnest(v_source_ids) x where x = any(v_seen_item_ids)) then
        raise exception 'duplicate or invalid takeoff source item' using errcode = '22023';
      end if;
      v_seen_item_ids := v_seen_item_ids || v_source_ids;
      select count(*) into v_item_count from public.material_takeoff_items i
        join public.material_takeoffs t on t.id = i.takeoff_id and t.organization_id = i.organization_id
        where i.id = any(v_source_ids) and i.organization_id = p_organization_id
          and t.project_id = p_project_id and t.id = any(coalesce(p_source_takeoff_ids, array[]::uuid[]));
      if v_item_count <> cardinality(v_source_ids) then raise exception 'takeoff item is not from the selected project sources' using errcode = '42501'; end if;
      if exists (
        select 1 from public.material_takeoff_items i join public.material_takeoffs t on t.id = i.takeoff_id and t.organization_id = i.organization_id
        where i.id = any(v_source_ids) and t.status not in ('approved','draft')
      ) then raise exception 'unsupported takeoff state' using errcode = '22023'; end if;

      select i.* into v_first from public.material_takeoff_items i where i.id = v_source_ids[1] and i.organization_id = p_organization_id;
      select t.*, c.current_revision_id into v_first_takeoff from public.material_takeoffs t
        join public.calculations c on c.id = t.source_calculation_id and c.organization_id = t.organization_id
        where t.id = v_first.takeoff_id and t.organization_id = p_organization_id;
      if exists (
        select 1 from public.material_takeoff_items i where i.id = any(v_source_ids) and i.organization_id = p_organization_id
          and (i.variant_id <> v_first.variant_id or i.quantity_unit <> v_first.quantity_unit
            or jsonb_build_object('productId', i.material_snapshot->'productId', 'name', coalesce(i.material_snapshot->'variantName', i.material_snapshot->'name'), 'sku', i.material_snapshot->'sku', 'lengthMm', i.material_snapshot->'lengthMm', 'nominalWidthMm', i.material_snapshot->'nominalWidthMm', 'effectiveWidthMm', i.material_snapshot->'effectiveWidthMm', 'thicknessMm', i.material_snapshot->'thicknessMm', 'packagingQuantity', i.material_snapshot->'packagingQuantity', 'technicalSpecs', coalesce(i.material_snapshot->'technicalSpecs','{}'::jsonb), 'provenance', i.material_snapshot->'provenance', 'productProvenance', i.material_snapshot->'productProvenance', 'variantProvenance', i.material_snapshot->'variantProvenance')
              is distinct from jsonb_build_object('productId', v_first.material_snapshot->'productId', 'name', coalesce(v_first.material_snapshot->'variantName', v_first.material_snapshot->'name'), 'sku', v_first.material_snapshot->'sku', 'lengthMm', v_first.material_snapshot->'lengthMm', 'nominalWidthMm', v_first.material_snapshot->'nominalWidthMm', 'effectiveWidthMm', v_first.material_snapshot->'effectiveWidthMm', 'thicknessMm', v_first.material_snapshot->'thicknessMm', 'packagingQuantity', v_first.material_snapshot->'packagingQuantity', 'technicalSpecs', coalesce(v_first.material_snapshot->'technicalSpecs','{}'::jsonb), 'provenance', v_first.material_snapshot->'provenance', 'productProvenance', v_first.material_snapshot->'productProvenance', 'variantProvenance', v_first.material_snapshot->'variantProvenance'))
      ) then raise exception 'incompatible source items cannot be grouped' using errcode = '22023'; end if;

      select sum(i.final_quantity)::numeric(18,6) into v_expected_quantity
        from public.material_takeoff_items i where i.id = any(v_source_ids) and i.organization_id = p_organization_id;
      if v_expected_quantity is null or v_expected_quantity <= 0 then raise exception 'source quantity must be positive' using errcode = '22023'; end if;
      select coalesce(jsonb_agg(jsonb_build_object(
        'itemId', i.id, 'takeoffId', t.id, 'takeoffName', t.name, 'takeoffVersion', t.version,
        'takeoffStatus', t.status, 'calculationId', t.source_calculation_id,
        'calculationRevisionId', t.source_calculation_revision_id,
        'currentCalculationRevisionId', c.current_revision_id,
        'quantity', i.final_quantity::text, 'unit', i.quantity_unit::text,
        'materialSnapshot', i.material_snapshot, 'priceSnapshot', i.price_snapshot,
        'dataProvenance', i.data_provenance::text
      ) order by t.created_at, i.created_at, i.id), '[]'::jsonb)
      into v_source_snapshots
      from public.material_takeoff_items i join public.material_takeoffs t on t.id = i.takeoff_id and t.organization_id = i.organization_id
      join public.calculations c on c.id = t.source_calculation_id and c.organization_id = t.organization_id
      where i.id = any(v_source_ids) and i.organization_id = p_organization_id;
      select coalesce(jsonb_agg(x), '[]'::jsonb) into v_details from (
        select distinct key, value from jsonb_each(v_first.material_snapshot)
        where key in ('lengthMm','nominalWidthMm','effectiveWidthMm','thicknessMm','packagingQuantity','technicalSpecs','profileDescription','materialSpec')
      ) x;
      select coalesce(p.name, v_first.material_snapshot->>'productName', 'Megnevezés nélkül'),
             coalesce(v.name, v_first.material_snapshot->>'variantName', v_first.material_snapshot->>'name', 'Változat nélkül')
      into v_first_product_name, v_first_variant_name
      from public.material_variants v left join public.material_products p on p.id=v.product_id and p.organization_id=v.organization_id
      where v.id=v_first.variant_id and v.organization_id=p_organization_id;
      select c.current_revision_id into v_first_current_revision from public.calculations c
       where c.id=v_first_takeoff.source_calculation_id and c.organization_id=p_organization_id;
      if v_first_takeoff.status = 'draft' then v_preliminary := true; end if;
      v_line := jsonb_build_object(
        'id', v_item_id, 'kind', 'source', 'category', v_category, 'status', v_status,
        'description', v_description, 'productId', coalesce(v_first.material_snapshot->'productId', to_jsonb((select product_id from public.material_variants where id=v_first.variant_id))),
        'variantId', v_first.variant_id, 'productName', v_first_product_name, 'variantName', v_first_variant_name,
        'sku', v_first.material_snapshot->'sku', 'quantity', v_expected_quantity::text, 'unit', v_first.quantity_unit::text,
        'dimensions', v_details, 'materialSnapshot', v_first.material_snapshot,
        'sourceItemIds', to_jsonb(v_source_ids), 'sourceSnapshots', v_source_snapshots,
        'supplier', nullif(btrim(v_item->>'supplier'), ''), 'notes', nullif(btrim(v_item->>'notes'), ''),
        'provenance', coalesce(v_first.material_snapshot->>'provenance', 'missing')
      );
    else
      if v_category <> 'workshop' then raise exception 'manual items are only allowed in the workshop list' using errcode = '22023'; end if;
      if v_description is null or char_length(v_description) > 240 then raise exception 'manual item description is required' using errcode = '22023'; end if;
      if coalesce(v_item->>'quantity','') !~ '^([0-9]{1,12})(\.[0-9]{1,6})?$' or (v_item->>'quantity')::numeric <= 0 then raise exception 'manual quantity must be positive with at most six decimals' using errcode = '22023'; end if;
      if (v_item->>'unit') not in ('piece','linear_meter','square_meter','cubic_meter','kilogram','package') then raise exception 'invalid manual quantity unit' using errcode = '22023'; end if;
      if exists (select 1 from jsonb_each_text(v_manual) e where e.key in ('lengthMm','widthMm','thicknessMm') and e.value <> '' and (e.value !~ '^[0-9]{1,6}(\.[0-9]{1,3})?$' or e.value::numeric <= 0)) then raise exception 'manual technical dimensions must be positive numbers' using errcode = '22023'; end if;
      if exists (select 1 from jsonb_each_text(v_manual) e where e.key not in ('profileDescription','lengthMm','widthMm','thicknessMm','materialSpec','technicalNotes')) then raise exception 'unknown manual technical field' using errcode = '22023'; end if;
      if char_length(coalesce(v_manual->>'profileDescription','')) > 240 or char_length(coalesce(v_manual->>'materialSpec','')) > 240 or char_length(coalesce(v_manual->>'technicalNotes','')) > 1000 or char_length(coalesce(v_item->>'notes','')) > 1000 or char_length(coalesce(v_item->>'supplier','')) > 200 then raise exception 'manual item details are too long' using errcode = '22023'; end if;
      v_line := jsonb_build_object(
        'id', v_item_id, 'kind', 'manual', 'category', 'workshop', 'status', v_status,
        'description', v_description, 'quantity', (v_item->>'quantity')::numeric(18,6)::text, 'unit', v_item->>'unit',
        'dimensions', v_manual, 'sourceItemIds', '[]'::jsonb, 'sourceSnapshots', '[]'::jsonb,
        'supplier', nullif(btrim(v_item->>'supplier'), ''), 'notes', nullif(btrim(v_item->>'notes'), ''),
        'provenance', 'manual'
      );
    end if;
    v_result_items := v_result_items || jsonb_build_array(v_line);
  end loop;

  if coalesce(cardinality(p_source_takeoff_ids), 0) = 0 and cardinality(v_seen_item_ids) > 0 then raise exception 'source items require selected takeoffs' using errcode = '22023'; end if;
  if cardinality(p_source_takeoff_ids) > 0 then
    select count(*) into v_item_count from public.material_takeoff_items i
      where i.organization_id = p_organization_id and i.takeoff_id = any(p_source_takeoff_ids);
    if v_item_count <> cardinality(v_seen_item_ids) or exists (
      select 1 from public.material_takeoff_items i where i.organization_id = p_organization_id and i.takeoff_id = any(p_source_takeoff_ids) and not (i.id = any(v_seen_item_ids))
    ) then raise exception 'all selected takeoff items must appear exactly once' using errcode = '22023'; end if;
  end if;

  insert into public.material_preparation_revisions(organization_id, list_id, revision_number, request_key, preparation_state, source_takeoffs_snapshot, items_snapshot, input_snapshot, created_by)
    values(p_organization_id, v_created_list_id, v_target_revision, p_request_key, case when v_preliminary then 'preliminary' else 'ready' end, v_sources, v_result_items, v_input, v_actor)
    returning * into v_revision;
  update public.material_preparation_lists set name = btrim(p_name), current_revision_id = v_revision.id, version = v_target_revision
    where id = v_created_list_id and organization_id = p_organization_id;
  return query select v_created_list_id, v_revision.id, v_target_revision, v_target_revision, v_revision.preparation_state;
end;
$$;

revoke all on function public.save_material_preparation_revision(uuid,uuid,uuid,text,uuid[],jsonb,integer,uuid) from public, anon;
grant execute on function public.save_material_preparation_revision(uuid,uuid,uuid,text,uuid[],jsonb,integer,uuid) to authenticated;

comment on table public.material_preparation_lists is 'Project-scoped procurement/workshop preparation documents; all edits append an immutable revision.';
comment on table public.material_preparation_revisions is 'Immutable source, item, status and manual-workshop snapshots for a preparation list revision.';
