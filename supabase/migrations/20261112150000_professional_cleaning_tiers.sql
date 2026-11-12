-- Professional deep cleaning is priced per home size, charged as a one-off
-- service surcharge on top of the hiring fee (and wages):
--   1-bedroom apartment       from KSh 9,500
--   2-bedroom home            KSh 12,000 – 14,500
--   3 to 4-bedroom home       KSh 16,500 – 22,000
-- The columns are generic so any per-job priced service can use them later.

alter table public.bookings
  add column if not exists surcharge_kes   numeric(12,2) not null default 0,
  add column if not exists surcharge_label text;
