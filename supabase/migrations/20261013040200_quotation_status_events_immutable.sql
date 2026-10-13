-- F8.3.2: status history remains append-only even for privileged SQL paths.
create or replace function private.prevent_quotation_status_event_mutation() returns trigger
language plpgsql set search_path = public, pg_catalog as $$
begin
  raise exception 'A státusztörténet immutable.' using errcode = '55000';
end; $$;
create trigger quotation_status_events_immutable
before update or delete on public.quotation_status_events
for each row execute function private.prevent_quotation_status_event_mutation();
