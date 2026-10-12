-- F7.3.2: preserve an explicit zero base when SELECT INTO found no layout stream.
-- The guarded rewrite repairs databases that already applied 20261013010000;
-- fresh replays already contain the corrected function and therefore do nothing.
do $$
declare
  v_function_definition text;
  v_old_fragment text := E'  else\n    if p_layout_calculation_id is not null or p_expected_revision_number <> 0 then';
  v_new_fragment text := E'  else\n    v_current_revision_number := 0;\n    if p_layout_calculation_id is not null or p_expected_revision_number <> 0 then';
begin
  select pg_get_functiondef('public.save_metal_sheet_layout(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,integer)'::regprocedure)
    into v_function_definition;
  if position(v_old_fragment in v_function_definition) > 0 then
    execute replace(v_function_definition, v_old_fragment, v_new_fragment);
  end if;
end;
$$;
