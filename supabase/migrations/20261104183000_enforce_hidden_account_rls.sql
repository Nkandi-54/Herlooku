-- A soft-hidden account must lose direct Supabase access as well as app access.
create or replace function public.current_user_account_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles
     where id = auth.uid()
       and deleted_at is null
  );
$$;

revoke all on function public.current_user_account_is_active()
  from public, anon, service_role;
grant execute on function public.current_user_account_is_active()
  to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles
     where id = auth.uid()
       and role = 'admin'
       and deleted_at is null
  );
$$;

revoke all on function public.is_admin() from public, anon, service_role;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "profiles: self read" on public.profiles;
create policy "profiles: self read"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() and deleted_at is null);

drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() and deleted_at is null)
  with check (id = auth.uid() and deleted_at is null);

drop policy if exists "worker_profiles: self read" on public.worker_profiles;
create policy "worker_profiles: self read"
  on public.worker_profiles for select
  to authenticated
  using (
    user_id = auth.uid()
    and public.current_user_account_is_active()
  );

drop policy if exists "worker_profiles: self update" on public.worker_profiles;
create policy "worker_profiles: self update"
  on public.worker_profiles for update
  to authenticated
  using (
    user_id = auth.uid()
    and public.current_user_account_is_active()
  )
  with check (
    user_id = auth.uid()
    and public.current_user_account_is_active()
  );

drop policy if exists "bookings: participant read" on public.bookings;
create policy "bookings: participant read"
  on public.bookings for select
  to authenticated
  using (
    public.current_user_account_is_active()
    and (
      client_id = auth.uid()
      or worker_id = auth.uid()
      or public.is_admin()
    )
  );

drop policy if exists "payments: owner read" on public.mpesa_payments;
create policy "payments: owner read"
  on public.mpesa_payments for select
  to authenticated
  using (
    public.current_user_account_is_active()
    and (client_id = auth.uid() or public.is_admin())
  );

drop policy if exists "emergencies: participant read" on public.emergencies;
create policy "emergencies: participant read"
  on public.emergencies for select
  to authenticated
  using (
    public.current_user_account_is_active()
    and (
      raised_by_user_id = auth.uid()
      or public.is_admin()
      or exists (
        select 1 from public.bookings b
        where b.id = emergencies.booking_id
          and (b.client_id = auth.uid() or b.worker_id = auth.uid())
      )
    )
  );

drop policy if exists "id docs: owner upload" on storage.objects;
create policy "id docs: owner upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'identity-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_account_is_active()
  );

drop policy if exists "id docs: owner read" on storage.objects;
create policy "id docs: owner read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'identity-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_account_is_active()
  );

drop policy if exists "id docs: owner delete" on storage.objects;
create policy "id docs: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'identity-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_account_is_active()
  );

drop policy if exists "avatars: owner write" on storage.objects;
create policy "avatars: owner write"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_account_is_active()
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_account_is_active()
  );
