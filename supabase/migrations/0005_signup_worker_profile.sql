-- Ensure worker accounts always receive a profile row, even when email
-- confirmation delays creation of an authenticated session.
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
    case when new.raw_user_meta_data->>'role' = 'worker' then 'worker'::public.user_role
         else 'client'::public.user_role end,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'location', 'Kenya')
  )
  on conflict (id) do nothing;

  if new.raw_user_meta_data->>'role' = 'worker' then
    insert into public.worker_profiles (user_id, location)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'location', 'Kenya')
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

insert into public.worker_profiles (user_id, location)
select id, coalesce(nullif(location, ''), 'Kenya')
from public.profiles
where role = 'worker'
on conflict (user_id) do nothing;
