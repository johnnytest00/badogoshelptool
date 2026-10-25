-- M4: immutable provenance from a standalone quotation revision to an exact construction calculation revision.
-- Decision 12/8: only layout quantities (meaning = LAYOUT) and cut-list rows may become quotation quantities;
-- the line quantity stays editable, the verified source quantity is kept here. Decision 12/9: pricing rules unchanged
-- (the existing save RPC still decides money). Additive only; it wraps the existing save in the same transaction.

create table public.quotation_calculation_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  quotation_id uuid not null,
  quotation_revision_id uuid not null,
  calculation_id uuid not null,
  calculation_revision_id uuid not null,
  source_line_map jsonb not null check (jsonb_typeof(source_line_map) = 'array' and jsonb_array_length(source_line_map) between 1 and 200),
  request_key uuid not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint quotation_calculation_sources_quote_fk
    foreign key (quotation_id, organization_id) references public.quotations(id, organization_id) on delete restrict,
  constraint quotation_calculation_sources_quote_revision_fk
    foreign key (quotation_revision_id, organization_id) references public.quotation_revisions(id, organization_id) on delete restrict,
  constraint quotation_calculation_sources_calculation_fk
    foreign key (calculation_id, organization_id) references public.calculations(id, organization_id) on delete restrict,
  constraint quotation_calculation_sources_calculation_revision_fk
    foreign key (calculation_revision_id, calculation_id) references public.calculation_revisions(id, calculation_id) on delete restrict,
  constraint quotation_calculation_sources_request_uq unique (organization_id, created_by, request_key),
  constraint quotation_calculation_sources_revision_uq unique (quotation_revision_id)
);
create index quotation_calculation_sources_quotation_idx on public.quotation_calculation_sources (organization_id, quotation_id, created_at desc);

create or replace function private.prevent_quotation_calculation_source_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'quotation calculation source references are immutable' using errcode = '55000'; end; $$;
revoke all on function private.prevent_quotation_calculation_source_mutation() from public, anon, authenticated;
create trigger quotation_calculation_sources_immutable
  before update or delete on public.quotation_calculation_sources
  for each row execute function private.prevent_quotation_calculation_source_mutation();

alter table public.quotation_calculation_sources enable row level security;
revoke all on public.quotation_calculation_sources from public, anon, authenticated;
grant select on public.quotation_calculation_sources to authenticated;
create policy quotation_calculation_sources_scoped_read on public.quotation_calculation_sources
  for select to authenticated using (
    private.is_org_member(organization_id) and exists (
      select 1 from public.quotations q where q.id = quotation_id
        and q.organization_id = quotation_calculation_sources.organization_id
        and q.ownership_scope = 'standalone' and q.created_by = (select auth.uid())
    )
  );

create or replace function public.save_standalone_quotation_from_calculation(
  p_organization_id uuid,
  p_operation_id uuid,
  p_quotation_id uuid,
  p_name text,
  p_client_id uuid,
  p_lines jsonb,
  p_expected_version integer,
  p_document jsonb,
  p_calculation_revision_id uuid,
  p_source_line_map jsonb
) returns table (quotation_id uuid, revision_id uuid, revision_number integer, revision_created boolean, totals_snapshot jsonb)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_revision public.calculation_revisions%rowtype;
  v_calculation public.calculations%rowtype;
  v_mapping jsonb;
  v_line_index integer;
  v_key text;
  v_parts text[];
  v_quantity jsonb;
  v_part jsonb;
  v_row jsonb;
  v_normalized jsonb := '[]'::jsonb;
  v_existing public.quotation_calculation_sources%rowtype;
  v_saved record;
begin
  if v_actor is null or not private.is_org_member(p_organization_id) then
    raise exception 'quotation calculation source access denied' using errcode = '42501';
  end if;
  if p_calculation_revision_id is null or p_source_line_map is null or jsonb_typeof(p_source_line_map) <> 'array'
    or jsonb_array_length(p_source_line_map) not between 1 and 200 or jsonb_typeof(p_lines) <> 'array' then
    raise exception 'invalid calculation source payload' using errcode = '22023';
  end if;
  select * into v_revision from public.calculation_revisions r
    where r.id = p_calculation_revision_id and r.organization_id = p_organization_id for share;
  if found then
    select * into v_calculation from public.calculations c
      where c.id = v_revision.calculation_id and c.organization_id = p_organization_id for share;
  end if;
  if v_revision.id is null or v_calculation.id is null or v_calculation.ownership_scope <> 'standalone'
    or v_calculation.created_by <> v_actor or v_calculation.calculator_type not like 'construction.%' then
    raise exception 'calculation access denied' using errcode = '42501';
  end if;
  if (select count(distinct value->>'quotationLineIndex') from pg_catalog.jsonb_array_elements(p_source_line_map)) <> jsonb_array_length(p_source_line_map) then
    raise exception 'a quotation line has more than one calculation source' using errcode = '22023';
  end if;

  for v_mapping in select value from pg_catalog.jsonb_array_elements(p_source_line_map) loop
    begin
      v_line_index := (v_mapping->>'quotationLineIndex')::integer;
      v_key := v_mapping->>'sourceKey';
    exception when others then raise exception 'invalid calculation source mapping' using errcode = '22023'; end;
    if v_line_index is null or v_key is null or v_line_index < 0 or v_line_index >= jsonb_array_length(p_lines)
      or p_lines->v_line_index->>'type' is distinct from 'MATERIAL' then
      raise exception 'calculation source must point at a material line' using errcode = '22023';
    end if;
    if v_key ~ '^takeoff/[0-9]{1,3}/[0-9]{1,3}$' then
      v_parts := pg_catalog.string_to_array(v_key, '/');
      v_part := v_revision.output_snapshot->'takeoff'->'parts'->(v_parts[2]::integer);
      v_quantity := v_part->'quantities'->(v_parts[3]::integer);
      if v_quantity is null or v_quantity->>'meaning' is distinct from 'LAYOUT' or jsonb_typeof(v_quantity->'value') <> 'number' then
        raise exception 'only layout quantities can become quotation quantities' using errcode = '22023';
      end if;
      v_normalized := v_normalized || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'quotationLineIndex', v_line_index, 'sourceKey', v_key,
        'label', (v_part->>'label') || ' · ' || (v_quantity->>'label'),
        'quantity', v_quantity->'value', 'unit', v_quantity->>'unit', 'meaning', 'LAYOUT'));
    elsif v_key ~ '^cut/(rafters|battens)/[0-9]{1,4}$' then
      v_parts := pg_catalog.string_to_array(v_key, '/');
      v_row := v_revision.output_snapshot->'cutList'->(v_parts[2])->(v_parts[3]::integer);
      if v_row is null or jsonb_typeof(v_row->'count') <> 'number' or jsonb_typeof(v_row->'lengthMm') <> 'number' then
        raise exception 'cut-list source row is not in the selected revision' using errcode = '22023';
      end if;
      v_normalized := v_normalized || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'quotationLineIndex', v_line_index, 'sourceKey', v_key,
        'label', case when v_parts[2] = 'rafters' then 'Szarufa' else 'Léc' end || ' · ' || (v_row->>'lengthMm') || ' mm',
        'quantity', v_row->'count', 'unit', 'db', 'meaning', 'CUT_LIST'));
    else
      raise exception 'unknown calculation source key' using errcode = '22023';
    end if;
  end loop;

  for v_saved in select * from public.save_standalone_quotation_draft_with_document(
    p_organization_id, p_operation_id, p_quotation_id, p_name, p_client_id,
    p_lines, p_expected_version, p_document
  ) loop
    select * into v_existing from public.quotation_calculation_sources s
      where s.organization_id = p_organization_id and s.created_by = v_actor and s.request_key = p_operation_id;
    if found then
      if v_existing.quotation_id is distinct from v_saved.quotation_id
        or v_existing.quotation_revision_id is distinct from v_saved.revision_id
        or v_existing.calculation_revision_id is distinct from p_calculation_revision_id
        or v_existing.source_line_map is distinct from v_normalized then
        raise exception 'quotation operation key reused with different calculation source' using errcode = '40001';
      end if;
    else
      -- Unchanged content returns the current revision under a new operation key; keep its single source row.
      select * into v_existing from public.quotation_calculation_sources s where s.quotation_revision_id = v_saved.revision_id;
      if found then
        if v_existing.calculation_revision_id is distinct from p_calculation_revision_id or v_existing.source_line_map is distinct from v_normalized then
          raise exception 'the unchanged quotation revision already has another calculation source' using errcode = '40001';
        end if;
        return query select v_saved.quotation_id, v_saved.revision_id, v_saved.revision_number, v_saved.revision_created, v_saved.totals_snapshot;
        continue;
      end if;
      insert into public.quotation_calculation_sources(
        organization_id, quotation_id, quotation_revision_id, calculation_id, calculation_revision_id, source_line_map, request_key, created_by
      ) values (
        p_organization_id, v_saved.quotation_id, v_saved.revision_id, v_calculation.id, p_calculation_revision_id, v_normalized, p_operation_id, v_actor
      );
    end if;
    return query select v_saved.quotation_id, v_saved.revision_id, v_saved.revision_number, v_saved.revision_created, v_saved.totals_snapshot;
  end loop;
end; $$;

revoke all on function public.save_standalone_quotation_from_calculation(uuid, uuid, uuid, text, uuid, jsonb, integer, jsonb, uuid, jsonb) from public, anon;
grant execute on function public.save_standalone_quotation_from_calculation(uuid, uuid, uuid, text, uuid, jsonb, integer, jsonb, uuid, jsonb) to authenticated;
