-- F8.3.2: finalized metadata remains valid for every post-finalization state.
alter table public.quotations drop constraint if exists quotations_finalization_state_ck;
alter table public.quotations add constraint quotations_finalization_state_ck check (
  (status::text = 'draft' and finalized_revision_id is null and finalized_at is null and finalized_by is null)
  or
  (status::text in ('finalized', 'sent', 'accepted', 'rejected')
    and finalized_revision_id is not null and finalized_at is not null and finalized_by is not null)
);
