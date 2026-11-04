-- RLS still limits these reads to administrators; grant the SQL privilege so
-- authenticated admins can inspect the records directly as well as via API.
grant select on public.account_deletion_requests to authenticated;
grant select on public.account_deletion_audit to authenticated;
