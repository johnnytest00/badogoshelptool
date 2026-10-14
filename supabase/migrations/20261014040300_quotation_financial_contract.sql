-- F9.7.6.6.3.2b: snapshot explicit financial semantics without introducing
-- tax rules or changing existing quotation revision data.
alter table public.quotation_revisions
  add column financial_contract jsonb;

comment on column public.quotation_revisions.financial_contract is
  'Versioned financial semantics for revisions written after F9.7.6.6.3.2b. Historical rows intentionally remain NULL.';

create function private.set_quotation_financial_contract()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_price_basis text;
  v_amount text;
begin
  -- Always derive this field from the existing server-computed revision values;
  -- a caller cannot forge tax status, totals, or rounding metadata.
  v_price_basis := case new.price_class
    when 'net' then 'net'
    when 'gross' then 'gross'
    else null
  end;
  v_amount := case when new.subtotal is null then null else new.subtotal::text end;
  new.financial_contract := jsonb_build_object(
    'schemaVersion', 1,
    'sourceVersion', 'F9.7.6.6.3.2b',
    'currency', 'HUF',
    'priceBasis', v_price_basis,
    'netAmount', case when v_price_basis = 'net' then v_amount else null end,
    'taxTreatment', jsonb_build_object('status', 'unresolved', 'treatmentId', null, 'parameters', null),
    'taxAmount', null,
    'grossAmount', case when v_price_basis = 'gross' then v_amount else null end,
    'totalPayable', null,
    'rounding', jsonb_build_object('quantityScale', 6, 'moneyScale', 2, 'mode', 'half_up', 'scope', 'line')
  );
  return new;
end;
$$;

revoke all on function private.set_quotation_financial_contract() from public, anon, authenticated;
create trigger quotation_revisions_set_financial_contract
before insert on public.quotation_revisions
for each row execute function private.set_quotation_financial_contract();
