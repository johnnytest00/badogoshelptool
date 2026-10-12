-- F3: project lifecycle support. No permanent deletion is exposed to users.

alter table public.projects
  add column previous_status public.project_status;

alter table public.projects
  add constraint projects_previous_status_valid
  check (previous_status is null or previous_status <> 'archived');

revoke delete on public.projects from authenticated;
revoke delete on public.clients from authenticated;

comment on column public.projects.previous_status is
  'Status saved before archive so restore never invents a previous workflow state.';
