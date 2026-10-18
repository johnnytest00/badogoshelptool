-- F9.42: reversible associations between a work log (execution plan) and standalone
-- material lists / standalone quotations. Additive only: existing lists keep their immutable
-- creation-time execution_plan_id; this relation adds links that can be added and removed
-- without touching either source record. A removal is an audit stamp, never a delete.
create table public.execution_plan_document_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  execution_plan_id uuid not null,
  document_kind text not null check (document_kind in ('material_list', 'quotation')),
  material_list_id uuid,
  quotation_id uuid,
  request_key uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unlinked_by uuid references auth.users(id) on delete restrict,
  unlinked_at timestamptz,
  constraint execution_plan_document_links_plan_fk
    foreign key (execution_plan_id, organization_id) references public.execution_plans(id, organization_id) on delete restrict,
  constraint execution_plan_document_links_list_fk
    foreign key (material_list_id, organization_id) references public.material_preparation_lists(id, organization_id) on delete restrict,
  constraint execution_plan_document_links_quotation_fk
    foreign key (quotation_id, organization_id) references public.quotations(id, organization_id) on delete restrict,
  constraint execution_plan_document_links_kind_ck check (
    (document_kind = 'material_list' and material_list_id is not null and quotation_id is null)
    or (document_kind = 'quotation' and quotation_id is not null and material_list_id is null)
  ),
  constraint execution_plan_document_links_unlink_ck check ((unlinked_at is null) = (unlinked_by is null)),
  constraint execution_plan_document_links_request_uq unique (organization_id, created_by, request_key)
);

-- At most one active link per plan and document; a removed link may be re-created later.
create unique index execution_plan_document_links_active_list_uq
  on public.execution_plan_document_links (organization_id, execution_plan_id, material_list_id)
  where unlinked_at is null and material_list_id is not null;
create unique index execution_plan_document_links_active_quotation_uq
  on public.execution_plan_document_links (organization_id, execution_plan_id, quotation_id)
  where unlinked_at is null and quotation_id is not null;
create index execution_plan_document_links_plan_idx
  on public.execution_plan_document_links (organization_id, execution_plan_id, created_at desc);

alter table public.execution_plan_document_links enable row level security;
revoke all on public.execution_plan_document_links from public, anon, authenticated;
grant select on public.execution_plan_document_links to authenticated;
-- A link is visible only to members who can also see the linked document (document RLS applies in the subquery).
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
    )
  );

create or replace function private.guard_execution_plan_document_link()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'work log document links are never deleted' using errcode = '55000';
  end if;
  if old.unlinked_at is not null
    or new.unlinked_at is null or new.unlinked_by is null
    or (to_jsonb(new) - 'unlinked_at' - 'unlinked_by') is distinct from (to_jsonb(old) - 'unlinked_at' - 'unlinked_by') then
    raise exception 'a work log document link can only be removed once' using errcode = '55000';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_execution_plan_document_link() from public, anon, authenticated;
create trigger execution_plan_document_links_guard
  before update or delete on public.execution_plan_document_links
  for each row execute function private.guard_execution_plan_document_link();

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
  v_existing public.execution_plan_document_links%rowtype;
  v_id uuid;
begin
  if v_actor is null or not private.is_org_member(p_organization_id) then
    raise exception 'work log link access denied' using errcode = '42501';
  end if;
  if p_document_kind not in ('material_list', 'quotation') or p_document_id is null or p_request_key is null then
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
  else
    select * into v_quotation from public.quotations q
      where q.id = p_document_id and q.organization_id = p_organization_id
        and q.ownership_scope = 'standalone' and q.created_by = v_actor for share;
    if not found then raise exception 'quotation access denied' using errcode = '42501'; end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_organization_id::text || ':' || v_actor::text || ':' || p_request_key::text, 0));
  select * into v_existing from public.execution_plan_document_links l
    where l.organization_id = p_organization_id and l.created_by = v_actor and l.request_key = p_request_key;
  if found then
    if v_existing.execution_plan_id is distinct from p_execution_plan_id
      or v_existing.document_kind is distinct from p_document_kind
      or coalesce(v_existing.material_list_id, v_existing.quotation_id) is distinct from p_document_id then
      raise exception 'work log link request key reused with different content' using errcode = '22023';
    end if;
    return query select v_existing.id, false;
    return;
  end if;

  -- Another request already holds the active link: report it instead of creating a duplicate.
  select * into v_existing from public.execution_plan_document_links l
    where l.organization_id = p_organization_id and l.execution_plan_id = p_execution_plan_id and l.unlinked_at is null
      and coalesce(l.material_list_id, l.quotation_id) = p_document_id and l.document_kind = p_document_kind;
  if found then return query select v_existing.id, false; return; end if;

  insert into public.execution_plan_document_links(
    organization_id, execution_plan_id, document_kind, material_list_id, quotation_id, request_key, created_by
  ) values (
    p_organization_id, p_execution_plan_id, p_document_kind,
    case when p_document_kind = 'material_list' then p_document_id end,
    case when p_document_kind = 'quotation' then p_document_id end,
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
  -- The caller must also be allowed to see the linked document.
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
  if v_link.unlinked_at is not null then return query select v_link.id, false; return; end if;
  update public.execution_plan_document_links
     set unlinked_at = now(), unlinked_by = v_actor
   where id = v_link.id;
  return query select v_link.id, true;
end;
$$;

revoke all on function public.link_execution_plan_document(uuid, uuid, text, uuid, uuid) from public, anon;
revoke all on function public.unlink_execution_plan_document(uuid, uuid) from public, anon;
grant execute on function public.link_execution_plan_document(uuid, uuid, text, uuid, uuid) to authenticated;
grant execute on function public.unlink_execution_plan_document(uuid, uuid) to authenticated;
