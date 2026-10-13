-- F9.6.1.2.1: takeoff source identity and transfer idempotency data are immutable.

create or replace function private.prevent_material_takeoff_source_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.project_id is distinct from old.project_id
    or new.source_calculation_id is distinct from old.source_calculation_id
    or new.source_calculation_revision_id is distinct from old.source_calculation_revision_id
    or new.source_roof_model_id is distinct from old.source_roof_model_id
    or new.source_roof_model_revision_id is distinct from old.source_roof_model_revision_id
    or new.transfer_request_key is distinct from old.transfer_request_key
    or new.transfer_payload is distinct from old.transfer_payload
  then
    raise exception 'material takeoff source identity is immutable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger material_takeoffs_source_immutable
before update on public.material_takeoffs
for each row execute function private.prevent_material_takeoff_source_change();
