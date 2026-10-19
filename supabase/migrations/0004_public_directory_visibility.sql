-- ============================================================================
-- Fix: public worker directory visibility
-- ============================================================================
-- The "public read approved" policy on worker_profiles contains a subquery
-- against public.profiles. That subquery is ITSELF subject to the profiles RLS
-- policy, which returns nothing to anon — so no worker was ever visible.
--
-- A SECURITY DEFINER helper evaluates the approval state without exposing the
-- profile row itself. The function returns a boolean only, so it cannot be used
-- to enumerate accounts.
-- ============================================================================

create or replace function public.worker_is_publicly_listable(worker uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = worker
       and p.account_status = 'approved'
       and p.id_verification_status = 'verified'
       and p.role = 'worker'
  );
$$;

revoke all on function public.worker_is_publicly_listable(uuid) from public;
grant execute on function public.worker_is_publicly_listable(uuid) to anon, authenticated;

drop policy if exists "worker_profiles: public read approved" on public.worker_profiles;

create policy "worker_profiles: public read approved"
  on public.worker_profiles for select
  to anon, authenticated
  using (public.worker_is_publicly_listable(user_id));
