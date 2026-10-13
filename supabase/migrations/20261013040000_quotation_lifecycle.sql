-- F8.3.2: controlled quotation lifecycle and append-only status history.

alter type public.quotation_status add value if not exists 'sent';
alter type public.quotation_status add value if not exists 'accepted';
alter type public.quotation_status add value if not exists 'rejected';

create table public.quotation_status_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  quotation_id uuid not null,
  from_status public.quotation_status not null,
  to_status public.quotation_status not null,
  event_at timestamptz not null default now(),
  acted_by uuid references auth.users(id),
  note text check (note is null or char_length(trim(note)) between 1 and 1000),
  finalized_revision_id uuid,
  foreign key (quotation_id, organization_id) references public.quotations(id, organization_id) on delete restrict,
  foreign key (finalized_revision_id, organization_id) references public.quotation_revisions(id, organization_id) on delete restrict
);

create index quotation_status_events_quote_idx
  on public.quotation_status_events (organization_id, quotation_id, event_at, id);

alter table public.quotation_status_events enable row level security;
create policy quotation_status_events_member_read on public.quotation_status_events
  for select using (private.is_org_member(organization_id));
revoke all on public.quotation_status_events from anon, authenticated;
grant select on public.quotation_status_events to authenticated;

create or replace function private.prevent_finalized_quotation_mutation() returns trigger
language plpgsql set search_path = public, pg_catalog as $$
begin
  if old.status::text = 'accepted' or old.status::text = 'rejected' then
    raise exception 'Az elfogadott vagy elutasított ajánlat nem módosítható.' using errcode = '55000';
  end if;
  if old.status::text in ('finalized', 'sent') and (
    new.name is distinct from old.name
    or new.client_id is distinct from old.client_id
    or new.currency is distinct from old.currency
    or new.current_revision_id is distinct from old.current_revision_id
    or new.version is distinct from old.version
    or new.finalized_revision_id is distinct from old.finalized_revision_id
    or new.finalized_at is distinct from old.finalized_at
    or new.finalized_by is distinct from old.finalized_by
  ) then
    raise exception 'A véglegesített ajánlat pénzügyi és azonosító adatai nem módosíthatók.' using errcode = '55000';
  end if;
  if old.status::text <> new.status::text then
    if old.status::text = 'draft' and new.status::text <> 'finalized'
      or old.status::text = 'finalized' and new.status::text <> 'sent'
      or old.status::text = 'sent' and new.status::text not in ('accepted', 'rejected')
      or old.status::text in ('accepted', 'rejected') then
      raise exception 'A kért ajánlati státuszátmenet nem engedélyezett.' using errcode = '22023';
    end if;
  end if;
  if new.status::text in ('finalized', 'sent', 'accepted', 'rejected') then
    if new.finalized_revision_id is null or new.finalized_revision_id is distinct from new.current_revision_id
      or new.finalized_at is null or new.finalized_by is null then
      raise exception 'A lezárt ajánlatnak rögzített revíziót és véglegesítési adatokat kell tartalmaznia.' using errcode = '22023';
    end if;
  elsif new.finalized_revision_id is not null or new.finalized_at is not null or new.finalized_by is not null then
    raise exception 'Piszkozat nem tartalmazhat véglegesítési adatot.' using errcode = '22023';
  end if;
  return new;
end; $$;

create or replace function private.record_quotation_status_event() returns trigger
language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if old.status is distinct from new.status then
    insert into public.quotation_status_events
      (organization_id, quotation_id, from_status, to_status, acted_by, note, finalized_revision_id)
    values
      (new.organization_id, new.id, old.status, new.status, auth.uid(),
       nullif(trim(current_setting('app.quotation_status_note', true)), ''),
       new.finalized_revision_id);
  end if;
  return new;
end; $$;
revoke all on function private.record_quotation_status_event() from public, anon, authenticated;

drop trigger if exists quotations_status_event on public.quotations;
create trigger quotations_status_event after update on public.quotations
for each row execute function private.record_quotation_status_event();

create or replace function public.transition_quotation_status(
  p_organization_id uuid,
  p_project_id uuid,
  p_quotation_id uuid,
  p_target_status public.quotation_status,
  p_expected_version integer,
  p_note text default null
) returns table (quotation_id uuid, status public.quotation_status, event_id uuid)
language plpgsql security invoker set search_path = public, pg_catalog as $$
declare
  v_quote public.quotations%rowtype;
  v_event public.quotation_status_events%rowtype;
begin
  if not private.is_org_member(p_organization_id) then
    raise exception 'A műhelyhez nincs hozzáférésed.' using errcode = '42501';
  end if;
  if p_target_status not in ('sent', 'accepted', 'rejected') then
    raise exception 'Ez a státusz csak a saját életciklus-műveletén keresztül állítható.' using errcode = '22023';
  end if;
  if p_note is not null and char_length(trim(p_note)) > 1000 then
    raise exception 'A státuszmegjegyzés legfeljebb 1000 karakter lehet.' using errcode = '22023';
  end if;
  select q.* into v_quote from public.quotations as q
    where q.id = p_quotation_id and q.organization_id = p_organization_id and q.project_id = p_project_id
    for update;
  if not found then raise exception 'Az ajánlat nem található.' using errcode = '23503'; end if;
  if v_quote.version is distinct from p_expected_version then
    raise exception 'Az ajánlat időközben megváltozott; töltsd újra az oldalt.' using errcode = '40001';
  end if;
  if v_quote.status::text not in ('finalized', 'sent') then
    raise exception 'Az ajánlat jelenlegi állapotából ez a művelet nem végezhető el.' using errcode = '55000';
  end if;
  if v_quote.finalized_revision_id is null or v_quote.finalized_revision_id is distinct from v_quote.current_revision_id then
    raise exception 'A véglegesített revízió nem konzisztens.' using errcode = '22023';
  end if;
  perform set_config('app.quotation_status_note', coalesce(trim(p_note), ''), true);
  update public.quotations set status = p_target_status where id = v_quote.id;
  select e.* into v_event from public.quotation_status_events as e
    where e.quotation_id = v_quote.id and e.organization_id = p_organization_id
      and e.to_status = p_target_status
    order by e.event_at desc, e.id desc limit 1;
  return query select v_quote.id, p_target_status, v_event.id;
end; $$;

revoke all on function public.transition_quotation_status(uuid, uuid, uuid, public.quotation_status, integer, text) from public, anon;
grant execute on function public.transition_quotation_status(uuid, uuid, uuid, public.quotation_status, integer, text) to authenticated;
