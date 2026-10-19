-- ============================================================================
-- Herlooku — Supabase schema, RLS policies and storage hardening
-- ============================================================================
-- Run this ONCE in the Supabase dashboard → SQL Editor → New query → Run.
-- It is idempotent: safe to re-run.
--
-- Security model
-- --------------
-- * Authentication is handled by Supabase Auth (auth.users). We never store
--   passwords in our own tables.
-- * public.profiles is 1:1 with auth.users and holds role + approval state.
-- * Every table has Row Level Security ENABLED. Nothing is readable by default.
-- * A client/worker account is INVISIBLE to everyone until an administrator sets
--   account_status = 'approved'. This is enforced in the database, not just in
--   application code, so a bug in an API route cannot leak an unapproved user.
-- * Identity documents live in a PRIVATE storage bucket and are only reachable
--   by the owner or an administrator via short-lived signed URLs.
-- ============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type public.user_role        as enum ('client','worker','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_status   as enum ('pending','approved','suspended','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_status as enum ('unverified','pending','verified','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.booking_status   as enum ('pending_payment','confirmed_exclusive','in_progress','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.escrow_status    as enum ('holding','released','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status   as enum ('pending','paid','failed','cancelled','expired');
exception when duplicate_object then null; end $$;

-- ── Helper functions are defined AFTER public.profiles (see below) ─────────
-- A SQL function body is validated at creation time, so is_admin()/is_approved()
-- must be created once the table they read from exists.

-- ============================================================================
-- public.profiles — one row per auth user
-- ============================================================================
create table if not exists public.profiles (
  id                      uuid primary key references auth.users(id) on delete cascade,
  email                   text not null,
  name                    text not null default '',
  role                    public.user_role not null default 'client',
  avatar                  text not null default '',
  phone                   text not null default '',
  location                text not null default '',

  household_size          text,
  household_notes         text,

  id_verification_status  public.verification_status not null default 'unverified',
  id_type                 text check (id_type in ('national_id','passport','drivers_license')),
  id_number               text,
  id_document_url         text,
  id_document_back_url    text,
  selfie_url              text,
  rejection_reason        text,
  submitted_at            timestamptz,
  verified_at             timestamptz,

  account_status          public.account_status not null default 'pending',
  account_status_reason   text,
  approved_at             timestamptz,
  approved_by             uuid references public.profiles(id),

  last_login_at           timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists profiles_role_idx    on public.profiles(role);
create index if not exists profiles_status_idx  on public.profiles(account_status);
create unique index if not exists profiles_email_idx on public.profiles(lower(email));

alter table public.profiles enable row level security;

-- ── Helper: is the caller an administrator? ─────────────────────────────────
-- SECURITY DEFINER so it reads profiles without re-triggering RLS recursion.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── Helper: is the caller an approved (non-admin) account? ──────────────────
create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and account_status = 'approved'
  );
$$;

-- ── profiles policies ───────────────────────────────────────────────────────
drop policy if exists "profiles: self read"          on public.profiles;
drop policy if exists "profiles: self update"        on public.profiles;
drop policy if exists "profiles: admin read all"     on public.profiles;
drop policy if exists "profiles: admin update all"   on public.profiles;

-- A user can read their own profile.
create policy "profiles: self read"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- Administrators can read every profile (needed for the approval queue).
create policy "profiles: admin read all"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- A user may update ONLY a safe subset of their own fields. Role, approval
-- state and verification state are deliberately NOT settable by the user.
drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Administrators may update any profile (approve / suspend / reject).
create policy "profiles: admin update all"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── Guard: prevent a user from escalating their own privileges ──────────────
-- RLS cannot compare OLD vs NEW, so use a trigger. Without this, a crafted
-- UPDATE could set role='admin' or account_status='approved' on the self-update
-- policy. This trigger rejects any change to protected columns unless the
-- caller is an administrator.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new; -- admins may change anything
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

drop trigger if exists protect_profile_privileges_trg on public.profiles;
create trigger protect_profile_privileges_trg
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- ── Auto-create a profile when someone signs up ─────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, phone, location)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', ''),
    -- Users may only self-select client or worker. Never admin.
    case when new.raw_user_meta_data->>'role' = 'worker' then 'worker'::public.user_role
         else 'client'::public.user_role end,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'location', 'Kenya')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Keep updated_at fresh ───────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- public.worker_profiles
-- ============================================================================
create table if not exists public.worker_profiles (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null unique references public.profiles(id) on delete cascade,
  headline                    text not null default 'Domestic Helper',
  bio                         text not null default '',
  services                    text[] not null default '{}',
  expected_daily_salary       numeric(10,2) not null default 8,
  expected_monthly_salary     numeric(10,2) not null default 208,
  engagement_types            text[] not null default '{daily,monthly}',
  location                    text not null default 'Kenya',
  service_radius_km           integer not null default 20,
  years_experience            integer not null default 0,
  rating                      numeric(3,2) not null default 0,
  review_count                integer not null default 0,
  languages                   text[] not null default '{}',
  police_clearance_verified   boolean not null default false,
  background_check_verified   boolean not null default false,
  reference_count             integer not null default 0,
  live_in_available           boolean not null default false,
  available_days              text[] not null default '{}',
  skills                      text[] not null default '{}',
  featured                    boolean not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists worker_profiles_user_idx on public.worker_profiles(user_id);

alter table public.worker_profiles enable row level security;

drop policy if exists "worker_profiles: public read approved" on public.worker_profiles;
drop policy if exists "worker_profiles: self read"            on public.worker_profiles;
drop policy if exists "worker_profiles: self update"          on public.worker_profiles;
drop policy if exists "worker_profiles: admin all"            on public.worker_profiles;

-- PUBLIC DIRECTORY: anonymous visitors may read a worker profile ONLY when the
-- worker is both admin-approved and ID-verified. This is the core requirement.
create policy "worker_profiles: public read approved"
  on public.worker_profiles for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = worker_profiles.user_id
        and p.account_status = 'approved'
        and p.id_verification_status = 'verified'
    )
  );

-- The worker may always read their own profile (even while pending).
create policy "worker_profiles: self read"
  on public.worker_profiles for select
  to authenticated
  using (user_id = auth.uid());

-- The worker may edit their own profile.
create policy "worker_profiles: self update"
  on public.worker_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "worker_profiles: admin all"
  on public.worker_profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── Guard: workers cannot inflate their own trust signals or rating ─────────
create or replace function public.protect_worker_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  -- Rating/review count are derived from reviews and verification flags come
  -- from admin review; a worker must not be able to grant them to themselves.
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

drop trigger if exists protect_worker_profile_trg on public.worker_profiles;
create trigger protect_worker_profile_trg
  before update on public.worker_profiles
  for each row execute function public.protect_worker_profile();

drop trigger if exists worker_profiles_touch_updated_at on public.worker_profiles;
create trigger worker_profiles_touch_updated_at
  before update on public.worker_profiles
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- public.bookings
-- ============================================================================
create table if not exists public.bookings (
  id                          uuid primary key default gen_random_uuid(),
  booking_ref                 text not null unique,
  client_id                   uuid not null references public.profiles(id) on delete restrict,
  worker_id                   uuid not null references public.profiles(id) on delete restrict,
  service_name                text not null default 'General Househelp',
  start_date                  date not null,
  end_date                    date not null,
  total_days                  integer not null default 1,
  platform_booking_fee        numeric(10,2) not null,
  worker_expected_daily_salary numeric(10,2) not null default 0,
  total_amount                numeric(10,2) not null,
  status                      public.booking_status not null default 'pending_payment',
  escrow_status               public.escrow_status not null default 'holding',
  client_address              text not null,
  special_instructions        text,
  payment_method              text,
  payment_transaction_ref     text,
  payment_status              public.payment_status,
  payment_request_id          uuid,
  payment_failure_reason      text,
  reservation_expires_at      timestamptz,
  paid_at                     timestamptz,
  created_at                  timestamptz not null default now(),
  constraint bookings_date_order check (end_date >= start_date)
);

create index if not exists bookings_client_idx  on public.bookings(client_id);
create index if not exists bookings_worker_idx  on public.bookings(worker_id);
create index if not exists bookings_status_idx  on public.bookings(status);

alter table public.bookings enable row level security;

drop policy if exists "bookings: participant read" on public.bookings;
drop policy if exists "bookings: client insert"    on public.bookings;
drop policy if exists "bookings: admin all"        on public.bookings;

-- Only the two parties on the booking (and admins) can read it.
create policy "bookings: participant read"
  on public.bookings for select
  to authenticated
  using (client_id = auth.uid() or worker_id = auth.uid() or public.is_admin());

-- A client may create a booking only for themselves, only if approved.
create policy "bookings: client insert"
  on public.bookings for insert
  to authenticated
  with check (client_id = auth.uid() and public.is_approved());

create policy "bookings: admin all"
  on public.bookings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- NOTE: bookings are intentionally NOT client-updatable. Status transitions
-- (including locking a worker) happen server-side via the service role after a
-- confirmed M-Pesa payment, or by an administrator.

-- ── Prevent double-booking at the database level ────────────────────────────
-- A worker may only hold one exclusive booking per overlapping date range.
create or replace function public.prevent_double_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('confirmed_exclusive','in_progress') then
    if exists (
      select 1 from public.bookings b
      where b.worker_id = new.worker_id
        and b.id <> new.id
        and b.status in ('confirmed_exclusive','in_progress')
        and daterange(b.start_date, b.end_date, '[]')
            && daterange(new.start_date, new.end_date, '[]')
    ) then
      raise exception 'This worker is already exclusively booked for the selected dates.'
        using errcode = '23P01';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_double_booking_trg on public.bookings;
create trigger prevent_double_booking_trg
  before insert or update on public.bookings
  for each row execute function public.prevent_double_booking();

-- ============================================================================
-- public.mpesa_payments
-- ============================================================================
create table if not exists public.mpesa_payments (
  id                    uuid primary key default gen_random_uuid(),
  booking_id            uuid not null references public.bookings(id) on delete cascade,
  client_id             uuid not null references public.profiles(id) on delete restrict,
  amount_kes            integer not null,
  phone_number          text not null,
  status                public.payment_status not null default 'pending',
  merchant_request_id   text,
  checkout_request_id   text unique,
  mpesa_receipt_number  text,
  paybill_number        text,
  account_reference     text,
  result_code           integer,
  result_description    text,
  raw_callback          jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  paid_at               timestamptz
);

create index if not exists mpesa_payments_booking_idx on public.mpesa_payments(booking_id);
create index if not exists mpesa_payments_checkout_idx on public.mpesa_payments(checkout_request_id);

alter table public.mpesa_payments enable row level security;

drop policy if exists "payments: owner read" on public.mpesa_payments;
drop policy if exists "payments: admin all"  on public.mpesa_payments;

-- A client can see their own payment attempts (to poll status). Nobody can
-- INSERT/UPDATE from the browser — that is service-role / callback territory.
create policy "payments: owner read"
  on public.mpesa_payments for select
  to authenticated
  using (client_id = auth.uid() or public.is_admin());

create policy "payments: admin all"
  on public.mpesa_payments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists mpesa_payments_touch_updated_at on public.mpesa_payments;
create trigger mpesa_payments_touch_updated_at
  before update on public.mpesa_payments
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- public.reviews
-- ============================================================================
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null unique references public.bookings(id) on delete cascade,
  client_id     uuid not null references public.profiles(id) on delete cascade,
  client_name   text not null default '',
  client_avatar text not null default '',
  worker_id     uuid not null references public.profiles(id) on delete cascade,
  rating        integer not null check (rating between 1 and 5),
  comment       text not null,
  created_at    timestamptz not null default now()
);

create index if not exists reviews_worker_idx on public.reviews(worker_id);

alter table public.reviews enable row level security;

drop policy if exists "reviews: public read"      on public.reviews;
drop policy if exists "reviews: client insert"    on public.reviews;
drop policy if exists "reviews: admin all"        on public.reviews;

-- Reviews are public (they appear on worker cards).
create policy "reviews: public read"
  on public.reviews for select
  to anon, authenticated
  using (true);

-- A client may review only their own COMPLETED booking.
create policy "reviews: client insert"
  on public.reviews for insert
  to authenticated
  with check (
    client_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and b.client_id = auth.uid()
        and b.status = 'completed'
    )
  );

create policy "reviews: admin all"
  on public.reviews for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── Keep the worker aggregate rating in sync ────────────────────────────────
create or replace function public.recalculate_worker_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_worker uuid;
begin
  target_worker := coalesce(new.worker_id, old.worker_id);
  update public.worker_profiles
     set rating = coalesce((
           select round(avg(r.rating)::numeric, 2)
             from public.reviews r where r.worker_id = target_worker
         ), 0),
         review_count = (
           select count(*) from public.reviews r where r.worker_id = target_worker
         )
   where user_id = target_worker;
  return null;
end;
$$;

drop trigger if exists reviews_recalc_rating on public.reviews;
create trigger reviews_recalc_rating
  after insert or update or delete on public.reviews
  for each row execute function public.recalculate_worker_rating();

-- ============================================================================
-- public.emergencies (Trust & Safety incident reports)
-- ============================================================================
create table if not exists public.emergencies (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid references public.bookings(id) on delete set null,
  booking_ref         text not null default 'DIRECT-REPORT',
  raised_by_user_id   uuid not null references public.profiles(id) on delete cascade,
  raised_by_name      text not null default '',
  raised_by_user_role text not null check (raised_by_user_role in ('client','worker')),
  alarm_type          text not null check (alarm_type in ('theft','security','abuse','neglect','misconduct')),
  severity            text not null check (severity in ('critical','urgent')),
  details             text not null,
  location            text not null default '',
  status              text not null default 'active' check (status in ('active','responding','resolved')),
  admin_notes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.emergencies enable row level security;

drop policy if exists "emergencies: participant read" on public.emergencies;
drop policy if exists "emergencies: raise own"        on public.emergencies;
drop policy if exists "emergencies: admin all"        on public.emergencies;

create policy "emergencies: participant read"
  on public.emergencies for select
  to authenticated
  using (
    raised_by_user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = emergencies.booking_id
        and (b.client_id = auth.uid() or b.worker_id = auth.uid())
    )
  );

create policy "emergencies: raise own"
  on public.emergencies for insert
  to authenticated
  with check (raised_by_user_id = auth.uid() and public.is_approved());

create policy "emergencies: admin all"
  on public.emergencies for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists emergencies_touch_updated_at on public.emergencies;
create trigger emergencies_touch_updated_at
  before update on public.emergencies
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Row-level privileges (RLS filters rows; grants enable the operation at all)
-- ============================================================================
grant usage on schema public to anon, authenticated;

grant select on public.profiles            to authenticated;
grant select on public.worker_profiles     to anon, authenticated;
grant select on public.reviews             to anon, authenticated;
grant select on public.bookings            to authenticated;
grant select on public.mpesa_payments      to authenticated;
grant select on public.emergencies         to authenticated;

grant update on public.profiles            to authenticated;
grant update on public.worker_profiles     to authenticated;
grant insert on public.bookings            to authenticated;
grant insert on public.reviews             to authenticated;
grant insert on public.emergencies         to authenticated;

-- ============================================================================
-- Storage: private bucket for identity documents
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('identity-documents', 'identity-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ── Identity documents: owner + admin only, no public access ────────────────
drop policy if exists "id docs: owner upload" on storage.objects;
drop policy if exists "id docs: owner read"   on storage.objects;
drop policy if exists "id docs: admin read"   on storage.objects;
drop policy if exists "id docs: owner delete" on storage.objects;

-- Files must be stored under a folder named after the owner's uid.
create policy "id docs: owner upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'identity-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "id docs: owner read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'identity-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "id docs: admin read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'identity-documents' and public.is_admin());

create policy "id docs: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'identity-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Avatars: public read, owner write ───────────────────────────────────────
drop policy if exists "avatars: public read"  on storage.objects;
drop policy if exists "avatars: owner write"  on storage.objects;

create policy "avatars: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

create policy "avatars: owner write"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- Done. Next: create your first administrator (see 0002_promote_admin.sql).
-- ============================================================================
