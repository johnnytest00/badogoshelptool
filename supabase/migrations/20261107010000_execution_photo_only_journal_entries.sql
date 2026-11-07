-- Photo-only journal entries use empty content; the application requires a photo before saving them.
alter table public.execution_journal_entries drop constraint execution_journal_entries_content_check;
alter table public.execution_journal_entries add constraint execution_journal_entries_content_check
  check (char_length(btrim(content)) between 0 and 10000);
