# Herlooku

Herlooku is a marketplace for verified domestic-work bookings. A booking becomes
exclusive only after Safaricom has confirmed its M-Pesa payment to the server.

Authentication, the database and identity-document storage are provided by
[Supabase](https://supabase.com).

## Run locally

```bash
npm install
copy .env.example .env.local   # then fill in the values described below
npm run dev
```

## Supabase setup

The schema, Row Level Security policies, triggers and storage buckets live in
`supabase/migrations/` and are applied with the Supabase CLI:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

After deploying the ID-submission fix, run `supabase db push` against the
linked production project. Migration
`20261104101000_allow_owner_id_verification_submission.sql` allows an
authenticated user to submit their own documents for review while still
preventing them from approving or verifying themselves.

That creates these tables:

| Table | Purpose |
| --- | --- |
| `profiles` | One row per auth user: role, approval state, ID-verification state |
| `worker_profiles` | Public worker directory entries |
| `bookings` | Exclusive bookings, with a database-level double-booking guard |
| `mpesa_payments` | Provider payment attempts and confirmed receipts |
| `account_deletion_requests` | Worker deletion requests and administrator decisions |
| `account_deletion_audit` | Immutable actor, target, reason and timestamp records |
| `reviews` | Verified client reviews (rating aggregates maintained by trigger) |
| `emergencies` | Trust & Safety incident reports |

Two storage buckets are created: `identity-documents` (private — ID scans and
selfies) and `avatars` (public).

ID numbers, document images and selfies are visible only to authorized admins
while a verification decision is pending. The app deletes those files and
clears the submitted ID details after approval or rejection. It keeps the
verification outcome and a minimal reviewer/decision/timestamp audit entry.
Unsubmitted identity uploads are available to admins in the verification
workbench and are also deleted when a decision is made.

### Device reminders

Users who have not submitted ID verification can opt into browser/device push
reminders. Reminders repeat every six hours until submission; users who do not
enable or cannot receive push see an in-app reminder when they return. Push
notification permission is requested only after the user chooses **Enable**.
Notification clicks open `/verify-id`.

Generate a VAPID key pair with `npx web-push generate-vapid-keys`, then set
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and a
random `CRON_SECRET` in local/hosting environment variables. The Vercel Cron
job in `vercel.json` calls the reminder endpoint every six hours. The hosting
plan must support this schedule. Do not commit the private VAPID key or cron
secret.

Worker profiles and the details entered during registration are saved by the
auth signup trigger, including when email confirmation is enabled. The
registration page waits for confirmation instead of sending an unconfirmed user
to a dashboard.

### The main administrator (owner)

Register normally through the app. If email confirmation is enabled, confirm
the address, then promote the account in the SQL editor:

```sql
update public.profiles
   set role = 'super_admin',
       account_status = 'approved',
       id_verification_status = 'verified',
       approved_at = now()
 where lower(email) = lower('you@example.com');
```

### Promoting other administrators

Any administrator can grant another account administrator access from **Admin →
All Accounts & Roles → Grant admin**. Grants go through the audited `grant_admin`
RPC, so every promotion is recorded in `admin_audit_log`.

The **main administrator** (the site owner) is the single row referenced by
`public.admin_governance.primary_admin_id`, created by
`supabase/migrations/20261022070941_secure_multi_admin.sql`. It is protected at
two levels:

- **Application:** `/api/admin/accounts` and `/api/admins` refuse any change to
  the owner's account.
- **Database:** the `protect_profile_privileges` trigger rejects any change to
  the owner's role, status or email from a signed-in session — including the
owner's own — and removes the broad "admin may update every profile" policy so
an administrator cannot demote another administrator with a crafted request.

## Shop & laundry

`/shop` is the web owner's storefront: coastal snacks, ladies' clothes, shoes,
beddings, and laundry in Mombasa at **Ksh 100 per kilogram**. Optional ironing
is available for an additional **Ksh 300 per kilogram**. Orders and pickups are
arranged by phone or email; no card or M-Pesa is collected on the page.

## Security model

Security is enforced in the database, not only in application code.

- **Credentials** live in Supabase Auth. The application never stores or hashes
  passwords.
- **Row Level Security is enabled on every table.** The default is deny.
- **No client or worker is visible before approval.** A worker profile is readable
  by the public only when the account is `approved` *and* ID `verified`. Account
  rows themselves are never enumerable by anonymous visitors.
- **Privilege escalation is blocked by trigger.** A signed-in non-admin cannot
  change their own `role`, `account_status`, verification state or rating.
- **Identity documents are private and short-lived.** While awaiting a review
  decision, they live in a private bucket and are exposed only through
  10-minute signed URLs issued to an administrator. The images and submitted ID
  number are deleted after approval or rejection.
- **Payments are server-authoritative.** The browser cannot confirm a payment;
  only the Safaricom callback locks a worker.
- **Double-booking is impossible at the database level** via a range-overlap
  trigger on active bookings.

### Environment variables

| Variable | Visibility | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Publishable / anon key |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical production URL used for Auth redirects |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Server-only; bypasses RLS. Never expose. |
| `MPESA_*` | **Secret** | Daraja credentials and callback URL |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public | Browser push application-server key |
| `VAPID_PRIVATE_KEY` | **Secret** | Server-only Web Push signing key |
| `VAPID_SUBJECT` | Public | Contact URI supplied to push services |
| `CRON_SECRET` | **Secret** | Authenticates scheduled reminder requests |

`.env.local` is git-ignored. Never commit real credentials.

## Configure M-Pesa

Put real Daraja credentials in `.env.local` (local) or your hosting provider
(production). Until they are set, `POST /api/payments/mpesa/stk` returns HTTP 503
with the list of missing variables and `GET /api/payments/mpesa/config` reports
`configured: false`.

1. Sign in at https://developer.safaricom.co.ke and create an app for a consumer
   key and secret.
2. Select the **Lipa na M-Pesa Online** product for your app. Use the sandbox
   shortcode and passkey supplied by Daraja while testing; `542542` is this
   project's production PayBill shortcode and should not be used for sandbox
   requests. Production requires your approved shortcode and its matching
   production passkey.
3. Expose a public HTTPS callback (`ngrok http 3000` locally) ending in
   `/api/payments/mpesa/callback`, and register that exact URL in the Daraja
   portal.
4. Fill in `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`,
   `MPESA_PASSKEY` and `MPESA_CALLBACK_URL` using values for the same
   environment. Booking references are generated for each transaction and
   sent as the PayBill account reference. Use `MPESA_ENVIRONMENT=sandbox` while
   testing, then switch to `production` only with approved live credentials.
5. Restart the server. `GET /api/payments/mpesa/config` should report
   `configured: true`.

Once configured the sequence is automatic:

1. Client creates a five-minute pending booking hold.
2. `POST /api/payments/mpesa/stk` requests a prompt for the exact KES total.
3. Safaricom calls `/api/payments/mpesa/callback`.
4. The server matches the checkout request ID and amount, then marks the
   payment paid and the worker exclusive; database constraints prevent
   overlapping pending holds and confirmed bookings.

The browser cannot verify a payment, submit a Till code, or lock a worker.
The directory shows active holds as `PENDING`; confirmed date ranges remain
unavailable on worker calendars.

Administrators can hide accounts without erasing booking and payment history.
Worker deletion requests and admin decisions are recorded in the immutable
deletion audit. Apply all new SQL changes with
`supabase db push` before deploying the matching application code.

## Production checklist

- [ ] Enable email confirmation in Supabase Auth
- [ ] Set Supabase Auth Site URL to `https://herlookutaskninja.vercel.app` and add `https://herlookutaskninja.vercel.app/**` to Redirect URLs
- [ ] Enable Supabase backups and monitor `/api/payments/mpesa/config`
- [ ] Set the service role key and M-Pesa credentials in the host environment
- [ ] Complete privacy, safeguarding, refund and incident-response policies
