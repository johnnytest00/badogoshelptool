-- A bend-free profile has a geometrically determined width in the domain contract.
create function private.set_profile_takeoff_confidence()
returns trigger language plpgsql security invoker set search_path = public, private, pg_catalog as $$
begin
  if new.material_snapshot->>'quantityKind' = 'preliminary_net_blank_area'
     and new.material_snapshot->>'flatPatternMethod' = 'no_bends' then
    new.material_snapshot := jsonb_set(new.material_snapshot, '{calculationClassification}', '"GEOMETRICALLY_DETERMINED"'::jsonb);
  end if;
  return new;
end;
$$;
create trigger material_takeoff_items_profile_confidence
before insert on public.material_takeoff_items for each row
execute function private.set_profile_takeoff_confidence();
