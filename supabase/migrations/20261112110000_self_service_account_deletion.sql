-- Permanently remove a normal user's sign-in while retaining anonymized
-- booking and payment records for financial history.

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.account_deletion_audit
  drop constraint if exists account_deletion_audit_action_check;
alter table public.account_deletion_audit
  add constraint account_deletion_audit_action_check
  check (action in (
    'admin_deleted',
    'request_approved',
    'request_rejected',
    'user_deleted'
  ));

create or replace function public.permanently_delete_account(
  p_target_user_id uuid,
  p_actor_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.profiles%rowtype;
  actor public.profiles%rowtype;
  anonymized_email text;
begin
  select * into target
    from public.profiles
   where id = p_target_user_id
   for update;

  if target.id is null then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'ACCOUNT_DELETION_REASON_REQUIRED' using errcode = '22023';
  end if;

  if p_actor_user_id is null then
    if target.role not in ('client', 'worker') then
      raise exception 'ACCOUNT_DELETION_UNSUPPORTED_ROLE'
        using errcode = '42501';
    end if;
    actor := target;
  else
    select * into actor
      from public.profiles
     where id = p_actor_user_id;

    if actor.id is null
       or actor.role not in ('admin', 'super_admin')
       or actor.id = target.id then
      raise exception 'ACCOUNT_DELETION_ADMIN_REQUIRED'
        using errcode = '42501';
    end if;

    if target.role = 'super_admin' or exists (
      select 1 from public.admin_governance
       where singleton = true and primary_admin_id = target.id
    ) then
      raise exception 'ACCOUNT_DELETION_PRIMARY_ADMIN_PROTECTED'
        using errcode = '42501';
    end if;
  end if;

  if exists (
    select 1
      from public.bookings
     where (client_id = target.id or worker_id = target.id)
       and status in ('confirmed_exclusive', 'in_progress')
  ) then
    raise exception 'ACCOUNT_DELETION_HAS_ONGOING_TASKS'
      using errcode = '23514';
  end if;

  if exists (
    select 1
      from public.bookings
     where (client_id = target.id or worker_id = target.id)
       and (
         payment_status = 'pending'
         or (
           status = 'pending_payment'
           and payment_status is null
         )
       )
  ) or exists (
    select 1
      from public.mpesa_payments
     where client_id = target.id
       and status = 'pending'
  ) then
    raise exception 'ACCOUNT_DELETION_HAS_UNPAID_BILLS'
      using errcode = '23514';
  end if;

  anonymized_email := 'deleted+' || target.id::text || '@deleted.invalid';

  delete from public.push_subscriptions where user_id = target.id;
  delete from public.identity_uploads where user_id = target.id;
  delete from public.account_deletion_requests where user_id = target.id;

  update public.worker_profiles
     set headline = 'Deleted account',
         bio = '',
         services = '{}',
         location = '',
         languages = '{}',
         available_days = '{}',
         skills = '{}',
         featured = false
   where user_id = target.id;

  update public.bookings
     set client_address = case
           when client_id = target.id then 'Removed after account deletion'
           else client_address
         end,
         special_instructions = null
   where client_id = target.id or worker_id = target.id;

  update public.mpesa_payments
     set phone_number = '',
         raw_callback = null
   where client_id = target.id;

  update public.reviews
     set client_name = case
           when client_id = target.id then 'Deleted user'
           else client_name
         end,
         client_avatar = case
           when client_id = target.id then ''
           else client_avatar
         end,
         comment = 'Review removed after account deletion.'
   where client_id = target.id or worker_id = target.id;

  update public.emergencies
     set raised_by_name = 'Deleted user',
         details = 'Report details removed after account deletion.',
         location = '',
         admin_notes = null
   where raised_by_user_id = target.id;

  update public.profiles
     set email = anonymized_email,
         name = 'Deleted user',
         avatar = '',
         phone = '',
         location = '',
         household_size = null,
         household_notes = null,
         id_verification_status = 'unverified',
         id_type = null,
         id_number = null,
         id_document_url = null,
         id_document_back_url = null,
         selfie_url = null,
         rejection_reason = null,
         submitted_at = null,
         verified_at = null,
         account_status = 'suspended',
         account_status_reason = case
           when p_actor_user_id is null then 'Account permanently deleted by owner.'
           else trim(p_reason)
         end,
         deleted_at = now(),
         deleted_by = actor.id,
         deletion_reason = trim(p_reason),
         approved_at = null,
         approved_by = null,
         last_login_at = null
   where id = target.id;

  if not exists (
    select 1
      from public.account_deletion_audit
     where target_user_id = target.id
       and action = 'user_deleted'
  ) then
    insert into public.account_deletion_audit (
      target_user_id, target_name, target_email,
      actor_user_id, actor_name, actor_email,
      action, reason
    ) values (
      target.id, 'Deleted user', anonymized_email,
      actor.id,
      case when p_actor_user_id is null then 'Deleted user' else actor.name end,
      case when p_actor_user_id is null then anonymized_email else actor.email end,
      'user_deleted', trim(p_reason)
    );
  end if;
end;
$$;

create or replace function public.prevent_booking_for_deleted_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client_profile public.profiles%rowtype;
begin
  select * into client_profile
    from public.profiles
   where id = new.client_id
   for key share;

  if client_profile.id is null or (
    client_profile.deleted_at is not null
    and (
      tg_op = 'INSERT'
      or new.status in ('pending_payment', 'confirmed_exclusive', 'in_progress')
    )
  ) then
    raise exception 'Bookings cannot be created for a deleted account.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_booking_for_deleted_client_trg
  on public.bookings;
create trigger prevent_booking_for_deleted_client_trg
  before insert or update on public.bookings
  for each row execute function public.prevent_booking_for_deleted_client();

revoke all on function public.prevent_booking_for_deleted_client()
  from public, anon, authenticated, service_role;
revoke all on function public.permanently_delete_account(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.permanently_delete_account(uuid, uuid, text)
  to service_role;
