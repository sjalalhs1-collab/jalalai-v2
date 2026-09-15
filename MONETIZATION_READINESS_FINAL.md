# JalalAI Monetization Readiness — Final Gate

## Ready inside the codebase

- Final Free / Pro / Ultra plan definitions are stored in `data/jalalai-plans.json`.
- Free tier is configured for 40 prompts per day.
- Pro and Ultra are configured as unlimited subject to fair use.
- A typed entitlement decision module exists at `src/billing/entitlements.ts`.
- The module rejects invalid, expired, cancelled and past-due entitlements.
- The module enforces the Free daily prompt limit and supports paid fair-use mode.
- Website and Android billing are explicitly separated:
  - Website: compliant payment gateway + server-side verification.
  - Android: Google Play Billing + server-side purchase verification.
- A central backend entitlement service remains the source of truth.

## Required before accepting real customer money

1. Deploy a real user/account database.
2. Add authenticated user identity to every task request.
3. Persist daily usage counters atomically in the database/Redis.
4. Integrate and verify a compliant web payment gateway.
5. Integrate Google Play Billing and server-side purchase verification for Android.
6. Add webhook processing, idempotency, refunds, cancellations and chargeback handling.
7. Add invoice/receipt records and customer support procedures.
8. Test Free → Pro → Ultra upgrades, renewals, expiry, refund and downgrade flows.
9. Publish accurate Terms, Privacy Policy, Refund Policy and Data Safety disclosures.
10. Enable monitoring, audit logs, backups and alerting.

## Important boundary

This package is monetization-ready at the **architecture and starter-logic level**. It does not claim that real payments are live. No personal wallet screenshot/TRX flow should be treated as the default production payment method for the Android app.
