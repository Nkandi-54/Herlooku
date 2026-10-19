-- Trusted server-side operations (service role, migrations, CLI) run without an
-- auth.uid(). Those must be allowed, otherwise legitimate admin approval and the
-- M-Pesa callback cannot update accounts. Only a signed-in NON-admin browser
-- session is restricted to the safe profile fields.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No end-user session (service role / migration / CLI): allow.
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.account_status is distinct from old.account_status
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

-- Same reasoning for worker trust signals.
create or replace function public.protect_worker_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.rating is distinct from old.rating
     or new.review_count is distinct from old.review_count
     or new.police_clearance_verified is distinct from old.police_clearance_verified
     or new.background_check_verified is distinct from old.background_check_verified
     or new.featured is distinct from old.featured
     or new.user_id is distinct from old.user_id then
    raise exception 'You are not allowed to change protected worker fields.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;
