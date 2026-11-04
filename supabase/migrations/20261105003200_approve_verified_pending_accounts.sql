update public.profiles
set account_status = 'approved',
    account_status_reason = null,
    approved_at = coalesce(approved_at, verified_at, now())
where id_verification_status = 'verified'
  and account_status = 'pending'
  and deleted_at is null;
