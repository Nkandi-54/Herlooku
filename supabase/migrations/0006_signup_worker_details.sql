-- Preserve worker details entered at signup when email confirmation delays
-- the authenticated update performed by the registration API.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_daily_salary numeric(10,2) := 8;
  v_salary_text text := new.raw_user_meta_data->>'expectedDailySalary';
  v_headline text := left(
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'headline'), ''),
      'Domestic Helper'
    ),
    120
  );
  v_location text := left(
    coalesce(new.raw_user_meta_data->>'location', 'Kenya'),
    120
  );
begin
  if length(v_salary_text) <= 10
     and v_salary_text ~ '^[0-9]{1,7}([.][0-9]{1,2})?$' then
    v_daily_salary := v_salary_text::numeric;
    if v_daily_salary <= 0 or v_daily_salary > 1000000 then
      v_daily_salary := 8;
    end if;
  end if;

  insert into public.profiles (id, email, name, role, phone, location)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', ''),
    case when new.raw_user_meta_data->>'role' = 'worker' then 'worker'::public.user_role
         else 'client'::public.user_role end,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    v_location
  )
  on conflict (id) do nothing;

  if new.raw_user_meta_data->>'role' = 'worker' then
    insert into public.worker_profiles (
      user_id,
      headline,
      expected_daily_salary,
      expected_monthly_salary,
      location
    )
    values (
      new.id,
      v_headline,
      v_daily_salary,
      v_daily_salary * 26,
      v_location
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;
