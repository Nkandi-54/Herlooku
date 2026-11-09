alter table public.profiles
  add column if not exists id_reminder_last_sent_at timestamptz;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create table if not exists public.identity_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  document_kind text not null check (document_kind in ('id_front', 'id_back', 'selfie')),
  uploaded_at timestamptz not null default now()
);

create index if not exists identity_uploads_user_idx
  on public.identity_uploads(user_id, uploaded_at desc);

alter table public.identity_uploads enable row level security;

create table if not exists public.identity_verification_audit (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null,
  reviewer_user_id uuid not null,
  decision text not null check (decision in ('approve', 'reject')),
  created_at timestamptz not null default now()
);

create index if not exists identity_verification_audit_target_idx
  on public.identity_verification_audit(target_user_id, created_at desc);

alter table public.identity_verification_audit enable row level security;
