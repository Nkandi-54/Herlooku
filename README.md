# Herlooku

Herlooku is a marketplace for verified domestic-work bookings. A booking becomes
exclusive only after Safaricom has confirmed its M-Pesa payment to the server.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Register a new account to test the signed-session flow. The existing fixture data
is development-only; legacy fixture passwords are upgraded to scrypt after a
successful development login and are never accepted in production.

## Configure M-Pesa

The payment code is complete and the flow below runs automatically. To switch it
on, put real Daraja credentials in `.env.local` (local) or your hosting provider
(production). Until they are set, `POST /api/payments/mpesa/stk` returns HTTP 503
with the list of missing variables, and `GET /api/payments/mpesa/config` reports
`configured: false`.

1. Sign in at https://developer.safaricom.co.ke and create an app to get a
   consumer key and secret.
2. Copy the Lipa na M-Pesa passkey and shortcode for your Till or PayBill.
3. Expose a public HTTPS callback. Locally, run `ngrok http 3000` and use the
   resulting URL ending in `/api/payments/mpesa/callback`. Register that exact
   URL in the Daraja portal.
4. Fill in `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`,
   `MPESA_PASSKEY` and `MPESA_CALLBACK_URL`. Use `MPESA_ENVIRONMENT=sandbox`
   with sandbox credentials, then switch to `production`.
5. Restart the server. `GET /api/payments/mpesa/config` should report
   `configured: true`.

The default payer number offered at checkout is `NEXT_PUBLIC_DEFAULT_MPESA_NUMBER`
(set to `+254740042359` locally). This is only a prefilled suggestion; the client
can change it, and Safaricom always prompts whatever number was submitted.

Once configured, the sequence is fully automatic:

1. Client creates a pending booking.
2. `POST /api/payments/mpesa/stk` requests the PIN prompt.
3. Safaricom calls `/api/payments/mpesa/callback`.
4. The server matches the checkout request ID, amount (Ksh 3,000) and receipt,
   then atomically marks the payment paid and the worker exclusive.

The browser cannot verify a payment, submit a Till code, or lock a worker.

## Production deployment requirements

This repository currently uses `data/db.json`, which is appropriate only for a
local demo. Before serving real customers, replace it with a managed transactional
database and object storage for identity documents. Run the payment confirmation
and the worker availability check in one database transaction, protect document
access with short-lived signed URLs, configure backups/monitoring, and complete
your privacy, safeguarding, refund, and incident-response policies.
