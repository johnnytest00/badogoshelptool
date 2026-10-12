-- F7.1 hardening: price history is append-only, including privileged SQL paths.
create or replace function private.prevent_material_price_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'material price history is immutable';
end;
$$;

create trigger material_prices_immutable
before update or delete on public.material_prices
for each row execute function private.prevent_material_price_mutation();
