-- Manual finance ledger for transactions settled outside the website
-- (cash, direct M-Pesa to the worker, bank transfers), plus the per-child
-- childcare surcharge stored alongside the booking totals.

-- ── Manual ledger ───────────────────────────────────────────────────────────
create table if not exists public.finance_ledger (
  id              uuid primary key default gen_random_uuid(),
  entry_type      text not null check (entry_type in ('income', 'expense')),
  category        text not null,
  description     text not null,
  amount_kes      numeric(12,2) not null check (amount_kes > 0),
  occurred_on     date not null default current_date,
  transaction_ref text,
  booking_ref     text,
  recorded_by     uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists finance_ledger_occurred_idx
  on public.finance_ledger (occurred_on desc, created_at desc);

alter table public.finance_ledger enable row level security;

drop policy if exists "finance ledger: admins manage" on public.finance_ledger;
create policy "finance ledger: admins manage"
  on public.finance_ledger for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── Childcare per-child surcharge ───────────────────────────────────────────
alter table public.bookings
  add column if not exists childcare_children integer not null default 0,
  add column if not exists childcare_fee      numeric(10,2) not null default 0;
