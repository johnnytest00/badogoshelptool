alter table public.execution_photos
  add column category text not null default 'uncategorized'
  constraint execution_photos_category_ck check (category in ('before', 'during', 'after', 'uncategorized'));

create index execution_photos_plan_category_idx
  on public.execution_photos(organization_id, project_id, plan_id, category, uploaded_at desc, id desc);

create or replace function public.set_execution_photo_category(
  p_organization_id uuid,
  p_photo_id uuid,
  p_category text
) returns boolean language plpgsql security invoker set search_path = public, private as $$
begin
  if p_category not in ('before', 'during', 'after', 'uncategorized') then
    raise exception 'invalid execution photo category';
  end if;
  if not private.is_org_member(p_organization_id) then
    raise exception 'organization access denied';
  end if;
  update public.execution_photos
     set category = p_category
   where id = p_photo_id
     and organization_id = p_organization_id;
  return found;
end $$;

grant execute on function public.set_execution_photo_category(uuid, uuid, text) to authenticated;
grant update (category) on public.execution_photos to authenticated;
create policy execution_photos_member_category_update on public.execution_photos
  for update to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));
