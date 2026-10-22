alter table public.bookings
  add column if not exists engagement_type text not null default 'monthly'
    check (engagement_type in ('daily', 'monthly')),
  add column if not exists worker_expected_monthly_salary numeric(10,2) not null default 0;
