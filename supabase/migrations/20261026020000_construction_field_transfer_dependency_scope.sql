-- M10 Fázis 0 kiegészítés: a calculation_dependencies validáló trigger (20261012010000) eddig csak azonos
-- projekthez tartozó upstream/downstream revíziót engedett. Az önálló (standalone) suite-kalkulációknak nincs
-- project_id-juk, ezért a roof.rafter-cut -> roof.material-takeoff/roof.timber-cutlist mezőátvétel eddig minden
-- esetben "dependency references must belong to the same project" hibával elutasítva (funkcionális teszttel
-- igazolva). Kiegészítés: azonos szervezetű, mindkét oldalon standalone és azonos létrehozójú revíziópár is
-- érvényes upstream/downstream pár, a projektes szabály változatlan marad.

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
  downstream_scope text;
  downstream_creator uuid;
  upstream_scope text;
  upstream_creator uuid;
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

  select c.project_id, c.ownership_scope, c.created_by into downstream_project_id, downstream_scope, downstream_creator
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
    select cr.calculation_id, c.project_id, c.ownership_scope, c.created_by
      into upstream_calculation_id, upstream_project_id, upstream_scope, upstream_creator
    from public.calculation_revisions as cr
    join public.calculations as c on c.id = cr.calculation_id
    where cr.id = new.upstream_calculation_revision_id
      and cr.organization_id = new.organization_id;
  end if;

  if not (
    (downstream_project_id is not null and downstream_project_id = upstream_project_id)
    or (downstream_scope = 'standalone' and upstream_scope = 'standalone'
        and downstream_creator is not null and downstream_creator = upstream_creator)
  ) then
    raise exception 'dependency references must belong to the same project or the same creator''s standalone calculations';
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
