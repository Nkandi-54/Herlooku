-- Older application instances create the pending booking before requesting
-- STK. Give those inserts the same short hold instead of rejecting them.
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
