-- Supabase grants newly created functions to its API roles explicitly. Remove
-- those defaults from roles that never need this administrative RPC.
revoke all on function public.grant_admin(uuid) from public, anon, service_role;
grant execute on function public.grant_admin(uuid) to authenticated;

revoke all on function public.is_admin() from public, anon, service_role;
grant execute on function public.is_admin() to authenticated;

-- The governance singleton is server-internal. Audit events are only readable
-- by authenticated administrators through their RLS policy.
revoke all on table public.admin_governance from anon, authenticated;
revoke all on table public.admin_audit_log from anon;
revoke insert, update, delete on table public.admin_audit_log from authenticated;
grant select on table public.admin_audit_log to authenticated;
