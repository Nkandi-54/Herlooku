-- Wire the newly registered 'super_admin' role into the database's own
-- authorisation helpers and promote the governed site owner.
--
-- 1. public.is_admin() previously matched only role = 'admin'. The application
--    treats super_admin as an administrator everywhere (isAdminRole), so RLS
--    policies and the privilege guards must accept it too — otherwise the site
--    owner loses admin capabilities the moment their profile becomes
--    super_admin.
-- 2. The account-deletion functions refuse to delete the primary admin
--    referenced by admin_governance. That governed owner is precisely who the
--    super_admin role was introduced for, so it is promoted here (idempotent).

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles
     where id = auth.uid()
       and role in ('admin', 'super_admin')
       and deleted_at is null
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- Promote the governed site owner to super_admin. The update is a no-op if
-- they already hold the role, and raises nothing when the governance row is
-- absent (fresh installs promote manually).
do $$
begin
  update public.profiles p
     set role = 'super_admin'::public.user_role
    from public.admin_governance g
   where g.singleton = true
     and g.primary_admin_id = p.id
     and p.role <> 'super_admin'::public.user_role;
end;
$$;
