-- Keep the existing owner ID-submission exception while protecting the new
-- soft-delete fields from all browser sessions.
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
