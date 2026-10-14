-- F9.7.6.5.1: keep association and its source snapshot append-only, including
-- privileged SQL paths that bypass RLS and table grants.
create trigger calculation_project_associations_immutable
before update or delete on public.calculation_project_associations
for each row execute function private.prevent_revision_mutation();
