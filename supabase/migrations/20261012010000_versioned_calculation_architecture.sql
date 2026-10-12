-- F2.3: versioned roof models, calculations and dependency foundations.
-- This migration intentionally contains no calculator mathematics or application UI.

create table public.roof_models (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  name text not null,
  roof_type text not null,
  current_revision_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roof_models_name_length check (char_length(trim(name)) between 1 and 200),
  constraint roof_models_type check (roof_type in ('gable', 'shed', 'hip', 'other')),
  constraint roof_models_id_organization_unique unique (id, organization_id),
  constraint roof_models_project_same_organization_fk
    foreign key (project_id, organization_id)
    references public.projects (id, organization_id)
    on update cascade on delete restrict
);

create table public.roof_model_revisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  roof_model_id uuid not null,
  revision_number integer not null,
  schema_version text not null,
  input_data jsonb not null default '{}'::jsonb,
  validation_status text not null default 'missing',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint roof_model_revisions_positive_number check (revision_number > 0),
  constraint roof_model_revisions_schema_version check (char_length(trim(schema_version)) between 1 and 80),
  constraint roof_model_revisions_status check (validation_status in ('verified', 'user_provided', 'estimated', 'demo', 'missing')),
  constraint roof_model_revisions_id_model_unique unique (id, roof_model_id),
  constraint roof_model_revisions_id_organization_unique unique (id, organization_id),
  constraint roof_model_revisions_model_number_unique unique (roof_model_id, revision_number),
  constraint roof_model_revisions_model_same_organization_fk
    foreign key (roof_model_id, organization_id)
    references public.roof_models (id, organization_id)
    on update cascade on delete restrict
);

alter table public.roof_models
  add constraint roof_models_current_revision_fk
  foreign key (current_revision_id, id)
  references public.roof_model_revisions (id, roof_model_id)
  on update cascade on delete restrict;

create table public.calculations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  roof_model_id uuid,
  calculator_type text not null,
  display_name text not null,
  status text not null default 'current',
  current_revision_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calculations_name_length check (char_length(trim(display_name)) between 1 and 200),
  constraint calculations_type_length check (char_length(trim(calculator_type)) between 1 and 120),
  constraint calculations_status check (status in ('current', 'stale', 'invalid')),
  constraint calculations_id_organization_unique unique (id, organization_id),
  constraint calculations_project_same_organization_fk
    foreign key (project_id, organization_id)
    references public.projects (id, organization_id)
    on update cascade on delete restrict,
  constraint calculations_roof_model_same_organization_fk
    foreign key (roof_model_id, organization_id)
    references public.roof_models (id, organization_id)
    on update cascade on delete restrict
);

create table public.calculation_revisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  calculation_id uuid not null,
  revision_number integer not null,
  input_schema_version text not null,
  calculator_implementation_version text not null,
  input_snapshot jsonb not null default '{}'::jsonb,
  output_snapshot jsonb not null default '{}'::jsonb,
  data_provenance jsonb not null default '{}'::jsonb,
  validation_status text not null default 'missing',
  warnings jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint calculation_revisions_positive_number check (revision_number > 0),
  constraint calculation_revisions_input_schema_version check (char_length(trim(input_schema_version)) between 1 and 80),
  constraint calculation_revisions_implementation_version check (char_length(trim(calculator_implementation_version)) between 1 and 120),
  constraint calculation_revisions_status check (validation_status in ('verified', 'user_provided', 'estimated', 'demo', 'missing')),
  constraint calculation_revisions_id_calculation_unique unique (id, calculation_id),
  constraint calculation_revisions_id_organization_unique unique (id, organization_id),
  constraint calculation_revisions_calculation_number_unique unique (calculation_id, revision_number),
  constraint calculation_revisions_calculation_same_organization_fk
    foreign key (calculation_id, organization_id)
    references public.calculations (id, organization_id)
    on update cascade on delete restrict
);

alter table public.calculations
  add constraint calculations_current_revision_fk
  foreign key (current_revision_id, id)
  references public.calculation_revisions (id, calculation_id)
  on update cascade on delete restrict;

create table public.calculation_dependencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  downstream_calculation_revision_id uuid not null,
  upstream_roof_model_revision_id uuid,
  upstream_calculation_revision_id uuid,
  dependency_type text not null,
  created_at timestamptz not null default now(),
  constraint calculation_dependencies_type_length check (char_length(trim(dependency_type)) between 1 and 120),
  constraint calculation_dependencies_one_upstream check (
    (upstream_roof_model_revision_id is not null)::integer +
    (upstream_calculation_revision_id is not null)::integer = 1
  ),
  constraint calculation_dependencies_downstream_same_organization_fk
    foreign key (downstream_calculation_revision_id, organization_id)
    references public.calculation_revisions (id, organization_id)
    on update cascade on delete restrict,
  constraint calculation_dependencies_roof_upstream_same_organization_fk
    foreign key (upstream_roof_model_revision_id, organization_id)
    references public.roof_model_revisions (id, organization_id)
    on update cascade on delete restrict,
  constraint calculation_dependencies_calculation_upstream_same_organization_fk
    foreign key (upstream_calculation_revision_id, organization_id)
    references public.calculation_revisions (id, organization_id)
    on update cascade on delete restrict
);

create unique index calculation_dependencies_roof_unique
  on public.calculation_dependencies (downstream_calculation_revision_id, upstream_roof_model_revision_id)
  where upstream_roof_model_revision_id is not null;
create unique index calculation_dependencies_calculation_unique
  on public.calculation_dependencies (downstream_calculation_revision_id, upstream_calculation_revision_id)
  where upstream_calculation_revision_id is not null;
create index roof_models_project_id_idx on public.roof_models (project_id);
create index roof_model_revisions_model_id_idx on public.roof_model_revisions (roof_model_id);
create index calculations_project_id_idx on public.calculations (project_id);
create index calculations_roof_model_id_idx on public.calculations (roof_model_id);
create index calculation_revisions_calculation_id_idx on public.calculation_revisions (calculation_id);
create index calculation_dependencies_upstream_calc_idx on public.calculation_dependencies (upstream_calculation_revision_id);

create trigger roof_models_set_updated_at before update on public.roof_models
for each row execute function private.set_updated_at();
create trigger calculations_set_updated_at before update on public.calculations
for each row execute function private.set_updated_at();

create or replace function private.prevent_revision_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'committed revisions are immutable';
end;
$$;

create trigger roof_model_revisions_immutable
before update or delete on public.roof_model_revisions
for each row execute function private.prevent_revision_mutation();
create trigger calculation_revisions_immutable
before update or delete on public.calculation_revisions
for each row execute function private.prevent_revision_mutation();

create or replace function private.validate_calculation_dependency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  downstream_calculation_id uuid;
  upstream_calculation_id uuid;
  downstream_project_id uuid;
  upstream_project_id uuid;
  cycle_found boolean;
begin
  if (new.upstream_roof_model_revision_id is not null)::integer +
     (new.upstream_calculation_revision_id is not null)::integer <> 1 then
    raise exception 'dependency requires exactly one upstream revision'
      using errcode = '23514';
  end if;

  select cr.calculation_id into downstream_calculation_id
  from public.calculation_revisions as cr
  where cr.id = new.downstream_calculation_revision_id
    and cr.organization_id = new.organization_id;

  select c.project_id into downstream_project_id
  from public.calculations as c
  where c.id = downstream_calculation_id
    and c.organization_id = new.organization_id;

  if new.upstream_roof_model_revision_id is not null then
    select c.id into upstream_project_id
    from public.roof_model_revisions as rmr
    join public.roof_models as rm on rm.id = rmr.roof_model_id
    join public.projects as c on c.id = rm.project_id
    where rmr.id = new.upstream_roof_model_revision_id
      and rmr.organization_id = new.organization_id;
  else
    select cr.calculation_id, c.project_id
      into upstream_calculation_id, upstream_project_id
    from public.calculation_revisions as cr
    join public.calculations as c on c.id = cr.calculation_id
    where cr.id = new.upstream_calculation_revision_id
      and cr.organization_id = new.organization_id;
  end if;

  if downstream_project_id is null or upstream_project_id is null
     or downstream_project_id is distinct from upstream_project_id then
    raise exception 'dependency references must belong to the same project';
  end if;

  if upstream_calculation_id is not null then
    if upstream_calculation_id = downstream_calculation_id then
      raise exception 'calculation dependency cannot reference itself';
    end if;

    with recursive reachable(revision_id) as (
      select new.upstream_calculation_revision_id
      union
      select cd.upstream_calculation_revision_id
      from public.calculation_dependencies as cd
      join reachable as r on cd.downstream_calculation_revision_id = r.revision_id
      where cd.upstream_calculation_revision_id is not null
    )
    select exists (
      select 1 from reachable where revision_id = new.downstream_calculation_revision_id
    ) into cycle_found;

    if cycle_found then
      raise exception 'calculation dependency cycle detected';
    end if;
  end if;

  return new;
end;
$$;

create trigger calculation_dependencies_validate
before insert or update on public.calculation_dependencies
for each row execute function private.validate_calculation_dependency();

revoke all on function private.prevent_revision_mutation() from public;
revoke all on function private.validate_calculation_dependency() from public;

revoke all on public.roof_models, public.roof_model_revisions,
  public.calculations, public.calculation_revisions,
  public.calculation_dependencies from anon;
grant select, insert, update, delete on public.roof_models to authenticated;
grant select, insert on public.roof_model_revisions to authenticated;
grant select, insert, update, delete on public.calculations to authenticated;
grant select, insert on public.calculation_revisions to authenticated;
grant select, insert, update, delete on public.calculation_dependencies to authenticated;

alter table public.roof_models enable row level security;
alter table public.roof_model_revisions enable row level security;
alter table public.calculations enable row level security;
alter table public.calculation_revisions enable row level security;
alter table public.calculation_dependencies enable row level security;

create policy roof_models_select_member on public.roof_models for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy roof_models_insert_member on public.roof_models for insert to authenticated
with check ((select private.is_org_member(organization_id)));
create policy roof_models_update_member on public.roof_models for update to authenticated
using ((select private.is_org_member(organization_id)))
with check ((select private.is_org_member(organization_id)));
create policy roof_models_delete_member on public.roof_models for delete to authenticated
using ((select private.is_org_member(organization_id)));

create policy roof_model_revisions_select_member on public.roof_model_revisions for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy roof_model_revisions_insert_member on public.roof_model_revisions for insert to authenticated
with check ((select private.is_org_member(organization_id)));

create policy calculations_select_member on public.calculations for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy calculations_insert_member on public.calculations for insert to authenticated
with check ((select private.is_org_member(organization_id)));
create policy calculations_update_member on public.calculations for update to authenticated
using ((select private.is_org_member(organization_id)))
with check ((select private.is_org_member(organization_id)));
create policy calculations_delete_member on public.calculations for delete to authenticated
using ((select private.is_org_member(organization_id)));

create policy calculation_revisions_select_member on public.calculation_revisions for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy calculation_revisions_insert_member on public.calculation_revisions for insert to authenticated
with check ((select private.is_org_member(organization_id)));

create policy calculation_dependencies_select_member on public.calculation_dependencies for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy calculation_dependencies_insert_member on public.calculation_dependencies for insert to authenticated
with check ((select private.is_org_member(organization_id)));
create policy calculation_dependencies_update_member on public.calculation_dependencies for update to authenticated
using ((select private.is_org_member(organization_id)))
with check ((select private.is_org_member(organization_id)));
create policy calculation_dependencies_delete_member on public.calculation_dependencies for delete to authenticated
using ((select private.is_org_member(organization_id)));

comment on table public.roof_model_revisions is 'Immutable, reproducible geometry input snapshots. DEMO or provenance status is explicit.';
comment on table public.calculation_revisions is 'Immutable calculation input/output snapshots; no calculator mathematics is stored here.';
comment on table public.calculation_dependencies is 'Revision-level DAG edges; arbitrary cycle prevention is enforced by a validation trigger.';
