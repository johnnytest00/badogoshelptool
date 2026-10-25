-- M3: a saved construction-suite calculation revision can be linked to work logs (execution plans).
-- The link points at the exact immutable revision; the calculation itself is never changed by linking.
-- Product decision (12/6): organization members who can see the work log may READ the linked revision;
-- editing and new revisions stay with the creator. Additive: existing links, rows and revisions keep their meaning.

alter table public.execution_plan_document_links
  add column calculation_id uuid,
  add column calculation_revision_id uuid,
  add constraint execution_plan_document_links_calculation_fk
    foreign key (calculation_id, organization_id) references public.calculations(id, organization_id) on delete restrict,
  add constraint execution_plan_document_links_calculation_revision_fk
    foreign key (calculation_revision_id, calculation_id) references public.calculation_revisions(id, calculation_id) on delete restrict;

alter table public.execution_plan_document_links drop constraint execution_plan_document_links_document_kind_check;
alter table public.execution_plan_document_links add constraint execution_plan_document_links_document_kind_check
  check (document_kind in ('material_list', 'quotation', 'calculation'));
alter table public.execution_plan_document_links drop constraint execution_plan_document_links_kind_ck;
alter table public.execution_plan_document_links add constraint execution_plan_document_links_kind_ck check (
  (document_kind = 'material_list' and material_list_id is not null and quotation_id is null and calculation_id is null and calculation_revision_id is null)
  or (document_kind = 'quotation' and quotation_id is not null and material_list_id is null and calculation_id is null and calculation_revision_id is null)
  or (document_kind = 'calculation' and calculation_id is not null and calculation_revision_id is not null and material_list_id is null and quotation_id is null)
);

-- At most one active link per plan and exact revision; another revision of the same calculation may be linked separately.
create unique index execution_plan_document_links_active_calculation_uq
  on public.execution_plan_document_links (organization_id, execution_plan_id, calculation_revision_id)
  where unlinked_at is null and calculation_revision_id is not null;
create index execution_plan_document_links_calculation_idx
  on public.execution_plan_document_links (organization_id, calculation_id)
  where calculation_id is not null;

drop policy execution_plan_document_links_scoped_read on public.execution_plan_document_links;
create policy execution_plan_document_links_scoped_read on public.execution_plan_document_links
  for select to authenticated using (
    private.is_org_member(organization_id)
    and (
      (document_kind = 'material_list' and exists (
        select 1 from public.material_preparation_lists l
        where l.id = material_list_id and l.organization_id = execution_plan_document_links.organization_id))
      or (document_kind = 'quotation' and exists (
        select 1 from public.quotations q
        where q.id = quotation_id and q.organization_id = execution_plan_document_links.organization_id))
      -- No reference back to calculations here: the calculation read policies below reference this table.
      or document_kind = 'calculation'
    )
  );

-- Members may read only actively linked construction calculations and exactly the linked revisions.
create policy calculations_linked_member_read on public.calculations for select to authenticated using (
  (select private.is_org_member(organization_id))
  and calculator_type like 'construction.%'
  and exists (select 1 from public.execution_plan_document_links l
    where l.calculation_id = calculations.id and l.organization_id = calculations.organization_id and l.unlinked_at is null)
);
create policy calculation_revisions_linked_member_read on public.calculation_revisions for select to authenticated using (
  (select private.is_org_member(organization_id))
  and exists (select 1 from public.execution_plan_document_links l
    where l.calculation_revision_id = calculation_revisions.id and l.organization_id = calculation_revisions.organization_id and l.unlinked_at is null)
);

create or replace function public.link_execution_plan_document(
  p_organization_id uuid,
  p_execution_plan_id uuid,
  p_document_kind text,
  p_document_id uuid,
  p_request_key uuid
) returns table (link_id uuid, created boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_list public.material_preparation_lists%rowtype;
  v_quotation public.quotations%rowtype;
  v_revision public.calculation_revisions%rowtype;
  v_calculation public.calculations%rowtype;
  v_existing public.execution_plan_document_links%rowtype;
  v_id uuid;
begin
  if v_actor is null or not private.is_org_member(p_organization_id) then
    raise exception 'work log link access denied' using errcode = '42501';
  end if;
  if p_document_kind not in ('material_list', 'quotation', 'calculation') or p_document_id is null or p_request_key is null then
    raise exception 'invalid work log link payload' using errcode = '22023';
  end if;
  perform 1 from public.execution_plans p
    where p.id = p_execution_plan_id and p.organization_id = p_organization_id for share;
  if not found then raise exception 'execution plan access denied' using errcode = '42501'; end if;

  if p_document_kind = 'material_list' then
    select * into v_list from public.material_preparation_lists l
      where l.id = p_document_id and l.organization_id = p_organization_id and l.project_id is null for share;
    if not found or (v_list.execution_plan_id is null and v_list.created_by <> v_actor) then
      raise exception 'material list access denied' using errcode = '42501';
    end if;
    if v_list.execution_plan_id = p_execution_plan_id then
      raise exception 'the material list already belongs to this work log' using errcode = '23505';
    end if;
  elsif p_document_kind = 'quotation' then
    select * into v_quotation from public.quotations q
      where q.id = p_document_id and q.organization_id = p_organization_id
        and q.ownership_scope = 'standalone' and q.created_by = v_actor for share;
    if not found then raise exception 'quotation access denied' using errcode = '42501'; end if;
  else
    -- For calculations p_document_id is the exact immutable revision; only its creator may link it.
    select * into v_revision from public.calculation_revisions r
      where r.id = p_document_id and r.organization_id = p_organization_id for share;
    if found then
      select * into v_calculation from public.calculations c
        where c.id = v_revision.calculation_id and c.organization_id = p_organization_id for share;
    end if;
    if v_revision.id is null or v_calculation.id is null or v_calculation.ownership_scope <> 'standalone'
      or v_calculation.created_by <> v_actor or v_calculation.calculator_type not like 'construction.%' then
      raise exception 'calculation access denied' using errcode = '42501';
    end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_organization_id::text || ':' || v_actor::text || ':' || p_request_key::text, 0));
  select * into v_existing from public.execution_plan_document_links l
    where l.organization_id = p_organization_id and l.created_by = v_actor and l.request_key = p_request_key;
  if found then
    if v_existing.execution_plan_id is distinct from p_execution_plan_id
      or v_existing.document_kind is distinct from p_document_kind
      or coalesce(v_existing.material_list_id, v_existing.quotation_id, v_existing.calculation_revision_id) is distinct from p_document_id then
      raise exception 'work log link request key reused with different content' using errcode = '22023';
    end if;
    return query select v_existing.id, false;
    return;
  end if;

  -- Another request already holds the active link: report it instead of creating a duplicate.
  select * into v_existing from public.execution_plan_document_links l
    where l.organization_id = p_organization_id and l.execution_plan_id = p_execution_plan_id and l.unlinked_at is null
      and coalesce(l.material_list_id, l.quotation_id, l.calculation_revision_id) = p_document_id and l.document_kind = p_document_kind;
  if found then return query select v_existing.id, false; return; end if;

  insert into public.execution_plan_document_links(
    organization_id, execution_plan_id, document_kind, material_list_id, quotation_id, calculation_id, calculation_revision_id, request_key, created_by
  ) values (
    p_organization_id, p_execution_plan_id, p_document_kind,
    case when p_document_kind = 'material_list' then p_document_id end,
    case when p_document_kind = 'quotation' then p_document_id end,
    case when p_document_kind = 'calculation' then v_calculation.id end,
    case when p_document_kind = 'calculation' then p_document_id end,
    p_request_key, v_actor
  ) returning id into v_id;
  return query select v_id, true;
end;
$$;

create or replace function public.unlink_execution_plan_document(
  p_organization_id uuid,
  p_link_id uuid
) returns table (link_id uuid, removed boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_link public.execution_plan_document_links%rowtype;
begin
  if v_actor is null or not private.is_org_member(p_organization_id) then
    raise exception 'work log link access denied' using errcode = '42501';
  end if;
  select * into v_link from public.execution_plan_document_links l
    where l.id = p_link_id and l.organization_id = p_organization_id for update;
  if not found then raise exception 'work log link access denied' using errcode = '42501'; end if;
  -- The caller must also be allowed to see the linked document; a calculation link is removed by the calculation's creator.
  if v_link.document_kind = 'material_list' and not exists (
    select 1 from public.material_preparation_lists l
      where l.id = v_link.material_list_id and l.organization_id = p_organization_id
        and (l.execution_plan_id is not null or l.created_by = v_actor)
  ) then raise exception 'work log link access denied' using errcode = '42501'; end if;
  if v_link.document_kind = 'quotation' and not exists (
    select 1 from public.quotations q
      where q.id = v_link.quotation_id and q.organization_id = p_organization_id
        and q.ownership_scope = 'standalone' and q.created_by = v_actor
  ) then raise exception 'work log link access denied' using errcode = '42501'; end if;
  if v_link.document_kind = 'calculation' and not exists (
    select 1 from public.calculations c
      where c.id = v_link.calculation_id and c.organization_id = p_organization_id and c.created_by = v_actor
  ) then raise exception 'work log link access denied' using errcode = '42501'; end if;
  if v_link.unlinked_at is not null then return query select v_link.id, false; return; end if;
  update public.execution_plan_document_links
     set unlinked_at = now(), unlinked_by = v_actor
   where id = v_link.id;
  return query select v_link.id, true;
end;
$$;
