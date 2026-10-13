-- Preserve the exact computed profile transfer item, including technical and price provenance.
create function private.prevent_profile_takeoff_item_update()
returns trigger language plpgsql security invoker set search_path = public, private, pg_catalog as $$
begin
  if exists (
    select 1 from public.material_takeoffs t join public.calculations c
      on c.id=t.source_calculation_id and c.organization_id=t.organization_id
    where t.id=old.takeoff_id and t.organization_id=old.organization_id
      and t.transfer_request_key is not null and c.calculator_type='sheet_metal.profiles.flat-pattern'
  ) then
    raise exception 'profile transfer item snapshot is immutable' using errcode='P0001';
  end if;
  return new;
end;
$$;
create trigger material_takeoff_items_profile_snapshot_immutable
before update on public.material_takeoff_items for each row
execute function private.prevent_profile_takeoff_item_update();
