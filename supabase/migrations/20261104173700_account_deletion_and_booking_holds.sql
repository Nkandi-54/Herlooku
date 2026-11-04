-- Preserve account, identity, booking, and payment history while allowing
-- accounts to be hidden and preventing active payment holds from overlapping.

alter table public.profiles
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid,
  add column if not exists deletion_reason text;

create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at)
  where deleted_at is not null;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_reason text
);

create unique index if not exists account_deletion_requests_one_pending_idx
  on public.account_deletion_requests (user_id)
  where status = 'pending';
create index if not exists account_deletion_requests_status_idx
  on public.account_deletion_requests (status, requested_at desc);

alter table public.account_deletion_requests enable row level security;
drop policy if exists "account deletion requests: admins read"
  on public.account_deletion_requests;
create policy "account deletion requests: admins read"
  on public.account_deletion_requests for select
  to authenticated
  using (public.is_admin());

create table if not exists public.account_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null,
  target_name text not null,
  target_email text not null,
  actor_user_id uuid,
  actor_name text not null,
  actor_email text not null,
  action text not null check (
    action in ('admin_deleted', 'request_approved', 'request_rejected')
  ),
  reason text not null,
  request_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists account_deletion_audit_created_at_idx
  on public.account_deletion_audit (created_at desc);
create index if not exists account_deletion_audit_target_idx
  on public.account_deletion_audit (target_user_id, created_at desc);

alter table public.account_deletion_audit enable row level security;
drop policy if exists "account deletion audit: admins read"
  on public.account_deletion_audit;
create policy "account deletion audit: admins read"
  on public.account_deletion_audit for select
  to authenticated
  using (public.is_admin());

create or replace function public.hide_account_with_audit(
  p_target_user_id uuid,
  p_actor_user_id uuid,
  p_reason text,
  p_action text,
  p_request_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.profiles%rowtype;
  actor public.profiles%rowtype;
begin
  if p_action not in ('admin_deleted', 'request_approved')
     or length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'A valid action and reason are required.'
      using errcode = '22023';
  end if;

  select * into target from public.profiles where id = p_target_user_id for update;
  select * into actor from public.profiles where id = p_actor_user_id;

  if target.id is null or actor.id is null or target.deleted_at is not null then
    raise exception 'The target or administrator account is not available.'
      using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.admin_governance
    where singleton = true and primary_admin_id = target.id
  ) or target.id = actor.id then
    raise exception 'This account cannot be hidden.'
      using errcode = '42501';
  end if;

  if exists (
    select 1 from public.bookings
    where (client_id = target.id or worker_id = target.id)
      and (
        status in ('confirmed_exclusive', 'in_progress')
        or (
          status = 'pending_payment'
          and reservation_expires_at > now()
        )
      )
  ) then
    raise exception 'Resolve all pending payments and active bookings before hiding this account.'
      using errcode = '23514';
  end if;

  update public.profiles
     set deleted_at = now(),
         deleted_by = actor.id,
         deletion_reason = trim(p_reason),
         account_status = 'suspended',
         account_status_reason = trim(p_reason)
   where id = target.id;

  insert into public.account_deletion_audit (
    target_user_id, target_name, target_email,
    actor_user_id, actor_name, actor_email,
    action, reason, request_id
  ) values (
    target.id, target.name, target.email,
    actor.id, actor.name, actor.email,
    p_action, trim(p_reason), p_request_id
  );
end;
$$;

create or replace function public.review_account_deletion_request(
  p_request_id uuid,
  p_actor_user_id uuid,
  p_decision text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.account_deletion_requests%rowtype;
  target public.profiles%rowtype;
  actor public.profiles%rowtype;
begin
  if p_decision not in ('approve', 'reject')
     or length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'A valid decision and reason are required.'
      using errcode = '22023';
  end if;

  select * into request_row
    from public.account_deletion_requests
   where id = p_request_id and status = 'pending'
   for update;
  if request_row.id is null then
    raise exception 'Pending deletion request not found.'
      using errcode = 'P0002';
  end if;

  select * into target from public.profiles where id = request_row.user_id;
  select * into actor from public.profiles where id = p_actor_user_id;
  if target.id is null or actor.id is null then
    raise exception 'The target or administrator account is not available.'
      using errcode = 'P0002';
  end if;

  if p_decision = 'approve' then
    perform public.hide_account_with_audit(
      target.id, actor.id, p_reason, 'request_approved', request_row.id
    );
  else
    insert into public.account_deletion_audit (
      target_user_id, target_name, target_email,
      actor_user_id, actor_name, actor_email,
      action, reason, request_id
    ) values (
      target.id, target.name, target.email,
      actor.id, actor.name, actor.email,
      'request_rejected', trim(p_reason), request_row.id
    );
  end if;

  update public.account_deletion_requests
     set status = case when p_decision = 'approve' then 'approved' else 'rejected' end,
         reviewed_at = now(),
         reviewed_by = actor.id,
         review_reason = trim(p_reason)
   where id = request_row.id;
end;
$$;

revoke all on function public.hide_account_with_audit(uuid, uuid, text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.review_account_deletion_request(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.hide_account_with_audit(uuid, uuid, text, text, uuid)
  to service_role;
grant execute on function public.review_account_deletion_request(uuid, uuid, text, text)
  to service_role;

create or replace function public.prevent_account_deletion_audit_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Account deletion audit records are immutable.'
    using errcode = '42501';
end;
$$;

drop trigger if exists account_deletion_audit_immutable
  on public.account_deletion_audit;
create trigger account_deletion_audit_immutable
  before update or delete on public.account_deletion_audit
  for each row execute function public.prevent_account_deletion_audit_changes();

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and account_status = 'approved'
      and deleted_at is null
  );
$$;

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
       and p.deleted_at is null
  );
$$;

revoke all on function public.worker_is_publicly_listable(uuid) from public;
grant execute on function public.worker_is_publicly_listable(uuid)
  to anon, authenticated;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  if auth.uid() is null then
    return new;
  end if;

  select primary_admin_id into owner_id
    from public.admin_governance
   where singleton = true;

  if old.id = owner_id
     and (
       new.role is distinct from 'admin'::public.user_role
       or new.account_status is distinct from old.account_status
       or new.email is distinct from old.email
       or new.deleted_at is distinct from old.deleted_at
       or new.deleted_by is distinct from old.deleted_by
       or new.deletion_reason is distinct from old.deletion_reason
     ) then
    raise exception 'The protected administrator account cannot be changed by a signed-in administrator.'
      using errcode = '42501';
  end if;

  if new.deleted_at is distinct from old.deleted_at
     or new.deleted_by is distinct from old.deleted_by
     or new.deletion_reason is distinct from old.deletion_reason then
    raise exception 'Account deletion fields can only be changed by trusted server operations.'
      using errcode = '42501';
  end if;

  if new.role is distinct from old.role then
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

  if (
       new.id_verification_status is distinct from old.id_verification_status
       or new.id_type is distinct from old.id_type
       or new.id_number is distinct from old.id_number
       or new.id_document_url is distinct from old.id_document_url
       or new.id_document_back_url is distinct from old.id_document_back_url
       or new.selfie_url is distinct from old.selfie_url
       or new.submitted_at is distinct from old.submitted_at
     )
     and (
       old.id_verification_status not in ('unverified', 'rejected')
       or new.id_verification_status <> 'pending'
       or new.id_type is null
       or new.id_type not in ('national_id', 'passport', 'drivers_license')
       or length(btrim(coalesce(new.id_number, ''))) < 2
       or length(btrim(coalesce(new.id_document_url, ''))) = 0
       or length(btrim(coalesce(new.selfie_url, ''))) = 0
       or new.submitted_at is null
     ) then
    raise exception 'ID verification submissions must include valid documents and remain pending review.'
      using errcode = '42501';
  end if;

  if new.account_status is distinct from old.account_status
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

create or replace function public.prevent_double_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('pending_payment', 'confirmed_exclusive', 'in_progress')
     and not public.worker_is_publicly_listable(new.worker_id) then
    raise exception 'This worker is no longer available for booking.'
      using errcode = '23514';
  end if;

  if new.status = 'pending_payment' and auth.uid() is not null then
    if new.reservation_expires_at is null then
      new.reservation_expires_at := now() + interval '5 minutes';
    end if;
    if new.reservation_expires_at <= now()
       or new.reservation_expires_at > now() + interval '6 minutes' then
      raise exception 'A payment reservation must expire within five minutes.'
        using errcode = '22023';
    end if;
  end if;

  if new.status in ('confirmed_exclusive', 'in_progress')
     or (
       new.status = 'pending_payment'
       and new.reservation_expires_at > now()
     ) then
    perform pg_advisory_xact_lock(hashtextextended(new.worker_id::text, 0));

    if exists (
      select 1 from public.bookings b
      where b.worker_id = new.worker_id
        and b.id <> new.id
        and (
          b.status in ('confirmed_exclusive', 'in_progress')
          or (
            b.status = 'pending_payment'
            and b.reservation_expires_at > now()
          )
        )
        and daterange(b.start_date, b.end_date, '[]')
            && daterange(new.start_date, new.end_date, '[]')
    ) then
      raise exception 'This worker is already exclusively reserved for the selected dates.'
        using errcode = '23P01';
    end if;
  end if;
  return new;
end;
$$;
