-- F9.6.1.2.1: preserve approved immutability while allowing draft deletion.

create or replace function private.prevent_approved_takeoff_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'approved' then
    raise exception 'approved material takeoff is immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.prevent_approved_takeoff_item_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1
    from public.material_takeoffs t
    where t.id = old.takeoff_id and t.status = 'approved'
  ) then
    raise exception 'approved material takeoff items are immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
