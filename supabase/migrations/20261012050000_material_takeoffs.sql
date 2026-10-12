-- F7.2: source-revision-bound material takeoffs.
create type public.material_takeoff_status as enum ('draft', 'approved');
create type public.material_takeoff_method as enum ('area', 'linear', 'manual');

create table public.material_takeoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  source_calculation_id uuid not null,
  source_calculation_revision_id uuid not null,
  source_roof_model_id uuid,
  source_roof_model_revision_id uuid,
  name text not null,
  status public.material_takeoff_status not null default 'draft',
  version integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint material_takeoffs_name_length check (char_length(trim(name)) between 1 and 200),
  constraint material_takeoffs_version_positive check (version > 0),
  constraint material_takeoffs_approval_fields check ((status = 'approved') = (approved_by is not null and approved_at is not null)),
  constraint material_takeoffs_id_organization_unique unique (id, organization_id),
  constraint material_takeoffs_project_fk foreign key (project_id, organization_id) references public.projects(id, organization_id) on update cascade on delete restrict,
  constraint material_takeoffs_calculation_fk foreign key (source_calculation_id, organization_id) references public.calculations(id, organization_id) on update cascade on delete restrict,
  constraint material_takeoffs_calculation_revision_fk foreign key (source_calculation_revision_id, source_calculation_id) references public.calculation_revisions(id, calculation_id) on update cascade on delete restrict,
  constraint material_takeoffs_roof_model_fk foreign key (source_roof_model_id, organization_id) references public.roof_models(id, organization_id) on update cascade on delete restrict,
  constraint material_takeoffs_roof_revision_fk foreign key (source_roof_model_revision_id, source_roof_model_id) references public.roof_model_revisions(id, roof_model_id) on update cascade on delete restrict
);

create table public.material_takeoff_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  takeoff_id uuid not null,
  variant_id uuid not null,
  estimation_method public.material_takeoff_method not null,
  measurement_source text not null,
  selected_measurement_value numeric(18,6),
  allowance_percent numeric(8,3),
  calculated_quantity numeric(18,6),
  final_quantity numeric(18,6) not null,
  quantity_unit public.material_purchasing_unit not null,
  adjustment_reason text,
  material_snapshot jsonb not null default '{}'::jsonb,
  price_snapshot jsonb,
  data_provenance public.material_data_provenance not null default 'user_provided',
  warnings jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint material_takeoff_items_nonnegative check (final_quantity >= 0 and (calculated_quantity is null or calculated_quantity >= 0)),
  constraint material_takeoff_items_allowance check (allowance_percent is null or allowance_percent >= 0),
  constraint material_takeoff_items_adjustment_reason check (final_quantity = calculated_quantity or (adjustment_reason is not null and char_length(trim(adjustment_reason)) > 0)),
  constraint material_takeoff_items_takeoff_fk foreign key (takeoff_id, organization_id) references public.material_takeoffs(id, organization_id) on update cascade on delete cascade,
  constraint material_takeoff_items_variant_fk foreign key (variant_id, organization_id) references public.material_variants(id, organization_id) on update cascade on delete restrict
);

create index material_takeoffs_project_idx on public.material_takeoffs(organization_id, project_id, updated_at desc);
create index material_takeoff_items_takeoff_idx on public.material_takeoff_items(organization_id, takeoff_id);

create trigger material_takeoffs_set_updated_at before update on public.material_takeoffs for each row execute function private.set_updated_at();
create trigger material_takeoff_items_set_updated_at before update on public.material_takeoff_items for each row execute function private.set_updated_at();

create or replace function private.prevent_approved_takeoff_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'material_takeoffs' and old.status = 'approved' then
    raise exception 'approved material takeoff is immutable';
  end if;
  if tg_table_name = 'material_takeoff_items' and exists (select 1 from public.material_takeoffs t where t.id = old.takeoff_id and t.status = 'approved') then
    raise exception 'approved material takeoff items are immutable';
  end if;
  return new;
end;
$$;
create trigger material_takeoffs_approved_immutable before update or delete on public.material_takeoffs for each row execute function private.prevent_approved_takeoff_mutation();
create trigger material_takeoff_items_approved_immutable before update or delete on public.material_takeoff_items for each row execute function private.prevent_approved_takeoff_mutation();

create or replace function public.approve_material_takeoff(p_organization_id uuid, p_takeoff_id uuid, p_expected_version integer)
returns public.material_takeoffs
language plpgsql security invoker set search_path = '' as $$
declare result public.material_takeoffs;
begin
  if not (select private.is_org_admin_or_owner(p_organization_id)) then raise exception 'material takeoff approval requires organization admin or owner' using errcode = '42501'; end if;
  update public.material_takeoffs t
  set status = 'approved', approved_by = (select auth.uid()), approved_at = now(), version = t.version + 1
  where t.id = p_takeoff_id and t.organization_id = p_organization_id and t.status = 'draft' and t.version = p_expected_version
    and t.source_calculation_revision_id = (select c.current_revision_id from public.calculations c where c.id = t.source_calculation_id and c.organization_id = t.organization_id)
    and exists (select 1 from public.material_takeoff_items i where i.takeoff_id = t.id and i.organization_id = t.organization_id)
    and not exists (select 1 from public.material_takeoff_items i where i.takeoff_id = t.id and (i.final_quantity is null or i.final_quantity < 0 or i.quantity_unit is null));
  if not found then raise exception 'takeoff is stale, invalid, already approved, or version changed' using errcode = 'P0001'; end if;
  select * into result from public.material_takeoffs where id = p_takeoff_id and organization_id = p_organization_id;
  return result;
end;
$$;

revoke all on function public.approve_material_takeoff(uuid, uuid, integer) from public, anon;
grant execute on function public.approve_material_takeoff(uuid, uuid, integer) to authenticated;
grant usage on type public.material_takeoff_status, public.material_takeoff_method to authenticated;
grant select, insert, update on public.material_takeoffs to authenticated;
grant select, insert, update on public.material_takeoff_items to authenticated;

alter table public.material_takeoffs enable row level security;
alter table public.material_takeoff_items enable row level security;
create policy material_takeoffs_select_member on public.material_takeoffs for select to authenticated using ((select private.is_org_member(organization_id)));
create policy material_takeoffs_insert_member on public.material_takeoffs for insert to authenticated with check ((select private.is_org_member(organization_id)) and status = 'draft');
create policy material_takeoffs_update_draft_member on public.material_takeoffs for update to authenticated using ((select private.is_org_member(organization_id)) and status = 'draft') with check ((select private.is_org_member(organization_id)) and status = 'draft');
create policy material_takeoff_items_select_member on public.material_takeoff_items for select to authenticated using ((select private.is_org_member(organization_id)));
create policy material_takeoff_items_insert_draft_member on public.material_takeoff_items for insert to authenticated with check ((select private.is_org_member(organization_id)) and exists (select 1 from public.material_takeoffs t where t.id = takeoff_id and t.organization_id = material_takeoff_items.organization_id and t.status = 'draft'));
create policy material_takeoff_items_update_draft_member on public.material_takeoff_items for update to authenticated using ((select private.is_org_member(organization_id)) and exists (select 1 from public.material_takeoffs t where t.id = takeoff_id and t.organization_id = material_takeoff_items.organization_id and t.status = 'draft')) with check ((select private.is_org_member(organization_id)));

comment on table public.material_takeoffs is 'F7.2 material takeoff bound to an immutable saved calculation revision.';
comment on table public.material_takeoff_items is 'Material and exact price snapshots used by a takeoff; approved rows are immutable.';
