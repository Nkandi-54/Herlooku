-- The application layer recognises a dedicated "super_admin" role for the site
-- owner, and the account-deletion functions compare against it. Register the
-- label on the shared user_role enum so enum comparisons do not fail with
-- `invalid input value for enum user_role`.

alter type public.user_role add value if not exists 'super_admin' after 'admin';

-- Existing 'admin' rows are untouched; promoting the site owner to
-- 'super_admin' remains a deliberate manual step.
