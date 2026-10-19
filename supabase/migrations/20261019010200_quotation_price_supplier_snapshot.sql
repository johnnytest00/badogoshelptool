-- F9.43: the quotation line's price snapshot also records which supplier line (price option) the catalog price came from.
-- Existing revisions are untouched; only newly saved revisions carry the two extra keys. The function body is otherwise unchanged.
do $$
declare v_def text; v_new text; v_count int;
begin
  select count(*) into v_count from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'save_standalone_quotation_draft_with_document';
  if v_count <> 1 then raise exception 'expected exactly one save_standalone_quotation_draft_with_document, found %', v_count; end if;
  select pg_get_functiondef(p.oid) into v_def from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'save_standalone_quotation_draft_with_document';
  v_new := replace(v_def, '''provenance'', v_price_row.data_provenance) end,',
    '''provenance'', v_price_row.data_provenance, ''optionId'', v_price_row.option_id, ''supplierLabel'', case when v_price_row.option_id is null then null else v_price_row.source_name end) end,');
  if v_new = v_def then raise exception 'price snapshot expression not found'; end if;
  execute v_new;
end $$;
