-- Counter explicit/default grants inherited by newly created public tables.
-- Keep client writes restricted to category names and active status.
revoke all on table public.material_categories from public, anon, authenticated;
grant select on public.material_categories to authenticated;
grant insert (organization_id, name, created_by) on public.material_categories to authenticated;
grant update (name, is_active) on public.material_categories to authenticated;

