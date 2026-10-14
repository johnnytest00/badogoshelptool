-- Issuer email is descriptive document data, so reject malformed values at the
-- storage boundary as well as in the Server Action/domain readiness check.
alter table public.organizations add constraint organizations_contact_email_format
  check (contact_email is null or contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$');
