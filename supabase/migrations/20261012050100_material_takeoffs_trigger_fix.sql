drop trigger if exists material_takeoffs_approved_immutable on public.material_takeoffs;
drop trigger if exists material_takeoff_items_approved_immutable on public.material_takeoff_items;

create or replace function private.prevent_approved_takeoff_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'approved' then raise exception 'approved material takeoff is immutable'; end if;
  return new;
end;
$$;

create or replace function private.prevent_approved_takeoff_item_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.material_takeoffs t where t.id = old.takeoff_id and t.status = 'approved') then
    raise exception 'approved material takeoff items are immutable';
  end if;
  return new;
end;
$$;

create trigger material_takeoffs_approved_immutable before update or delete on public.material_takeoffs for each row execute function private.prevent_approved_takeoff_update();
create trigger material_takeoff_items_approved_immutable before update or delete on public.material_takeoff_items for each row execute function private.prevent_approved_takeoff_item_update();
