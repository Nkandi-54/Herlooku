-- Internal multi-administrator controls.
--
-- This migration deliberately keeps the public `profiles.role = 'admin'` shape
-- used by the app, while moving grants behind an authenticated RPC and an
-- immutable audit trail.  The singleton governance row is never exposed to
-- public pages or ordinary client queries.

create table if not exists public.admin_governance (
  singleton boolean primary key default true check (singleton),
  primary_admin_id uuid not null unique references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.admin_governance enable row level security;

do $$
declare
  owner_id uuid;
begin
  select id
    into owner_id
    from public.profiles
   where lower(email) = lower('falamankandi@gmail.com')
     and role = 'admin';

  if owner_id is null then
    raise exception 'The configured primary administrator is not an existing administrator.';
  end if;

  insert into public.admin_governance (singleton, primary_admin_id)
  values (true, owner_id)
  on conflict (singleton) do update
    set primary_admin_id = excluded.primary_admin_id;
end;
$$;

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('admin_granted')),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  target_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

create index if not exists admin_audit_log_target_user_id_idx
  on public.admin_audit_log (target_user_id, created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admin audit: administrators read" on public.admin_audit_log;
create policy "admin audit: administrators read"
  on public.admin_audit_log for select
  to authenticated
  using (public.is_admin());

-- The old broad admin policy made every profile column writable from a browser
-- session.  Administrative review endpoints already use the server-only
-- service-role client, so retaining it is unnecessary and lets an admin
-- demote another admin with a crafted request.
drop policy if exists "profiles: admin update all" on public.profiles;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  -- Trusted server-side operations (migrations and server-only service-role
  -- work) keep their existing behaviour. Browser sessions always have a UID.
  if auth.uid() is null then
    return new;
  end if;

  select primary_admin_id into owner_id
    from public.admin_governance
   where singleton = true;

  -- The primary owner cannot be demoted, disabled, or have their email changed
  -- through any signed-in session, including their own. This is intentionally
  -- an internal database rule; it adds no public-facing label or announcement.
  if old.id = owner_id
     and (
       new.role is distinct from 'admin'::public.user_role
       or new.account_status is distinct from old.account_status
       or new.email is distinct from old.email
     ) then
    raise exception 'The protected administrator account cannot be changed by a signed-in administrator.'
      using errcode = '42501';
  end if;

  if new.role is distinct from old.role then
    -- The only browser-initiated role transition is a grant made by an existing
    -- administrator. The RLS policy above means this can only target a different
    -- account through the controlled grant_admin RPC below.
    if not public.is_admin()
       or old.role = 'admin'::public.user_role
       or new.role <> 'admin'::public.user_role then
      raise exception 'Administrator roles can only be granted by an existing administrator.'
        using errcode = '42501';
    end if;

    insert into public.admin_audit_log (action, actor_id, target_user_id)
    values ('admin_granted', auth.uid(), new.id);
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.account_status is distinct from old.account_status
     or new.id_verification_status is distinct from old.id_verification_status
     or new.approved_at is distinct from old.approved_at
     or new.approved_by is distinct from old.approved_by
     or new.verified_at is distinct from old.verified_at
     or new.email is distinct from old.email then
    raise exception 'You are not allowed to change protected account fields.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.grant_admin(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Your account is already the active administrator.' using errcode = '22023';
  end if;

  update public.profiles
     set role = 'admin'::public.user_role
   where id = target_user_id
     and role <> 'admin'::public.user_role;

  if not found then
    raise exception 'The account was not found or is already an administrator.' using errcode = 'P0002';
  end if;
end;
$$;

-- Only signed-in users need these functions. The grant function still verifies
-- the caller's current administrator role internally before changing anything.
revoke all on function public.grant_admin(uuid) from public;
revoke all on function public.grant_admin(uuid) from anon, service_role;
grant execute on function public.grant_admin(uuid) to authenticated;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon, service_role;
grant execute on function public.is_admin() to authenticated;
