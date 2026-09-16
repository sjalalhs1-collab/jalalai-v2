# JalalAI Next-Level Execution Backlog

## Gate A — Production foundation
- [ ] Replace demo/operator token auth with real user authentication. — PARTIAL: real per-user auth (register/login/session, scrypt hashing) now exists (`src/identity/`) and is wired into `/v1/tasks`; the operator token still works in parallel for internal/admin calls by design. Not yet backed by a managed identity provider (e.g. OAuth/OIDC).
- [ ] Add RBAC and project-level permissions. — PARTIAL: a `user`/`admin` role flag exists; no project/tenant scoping yet.
- [ ] Add MFA-ready account security.
- [ ] Add PostgreSQL schema and migrations. — NOT DONE: identity/entitlement data is a single-process JSON file (see `docs/GATE_B_IDENTITY_ENTITLEMENTS.md`), explicitly unsafe for multi-instance deployment.
- [ ] Add Redis-backed queue and durable task state.
- [ ] Add object storage for uploads/artifacts.
- [ ] Add idempotency keys and retry policies.

## Gate B — Safe autonomous execution
(Note: this label collides with `docs/GATE_B_IDENTITY_ENTITLEMENTS.md`, which uses "Gate B" for identity/entitlements. That document's scope is tracked separately below under "Identity & Entitlements".)
- [ ] Isolated AI/code/browser workers.
- [ ] SSRF protection and outbound network allowlists.
- [ ] Tool permission scopes and approval gates.
- [ ] Secret manager integration.
- [ ] Audit events for every sensitive action.
- [ ] Timeouts, cancellation, quotas, and abuse controls.

## Identity & Entitlements (docs/GATE_B_IDENTITY_ENTITLEMENTS.md)
- [x] Real server-side user registration and login (scrypt password hashing, hashed session tokens).
- [x] Every request to `/v1/tasks` resolves to a server-side identity (user session or operator token).
- [x] Free plan capped server-side at 40 prompts/rolling-UTC-day; enforced before task execution (HTTP 402 on breach).
- [x] Pro/Ultra fair-use unlimited via the existing `decidePromptUsage` contract.
- [x] Admin grant/suspend endpoints with full audit logging of grants, renewals, expiries, suspensions, overrides.
- [ ] Website payment gateway + webhook verification (tracked under Gate E below).
- [ ] Google Play Billing adapter + purchase token verification (tracked under Gate E below).
- [ ] Admin grant endpoint should authenticate as a specific admin user, not just the shared operator token.

## Gate C — Real AI providers
- [ ] OpenAI adapter.
- [ ] Anthropic adapter.
- [ ] Gemini adapter.
- [ ] Optional compatible-provider adapter.
- [ ] Health checks, fallback, cost tracking, and provider-level limits.
- [ ] Real image/video adapters with explicit capability reporting.

## Gate D — Product surfaces
- [ ] Production web dashboard.
- [ ] Projects, Files, Knowledge Vault, task progress, history.
- [ ] Office artifact workspace.
- [ ] Research source display and verification.
- [ ] Creative Studio.
- [ ] Responsive accessibility pass.

## Gate E — Billing and Android
- [x] Central plans and entitlement model. — `src/identity/service.ts` + `src/billing/entitlements.ts` is the single ledger; usage/plan state lives server-side per user.
- [x] Web payment gateway signature verification + order lifecycle. — `src/billing/gateways.ts` (JazzCash HMAC-SHA256 per their published pp_SecureHash algorithm; generic HMAC verifier usable for Easypaisa/others) + `IdentityService.createOrder/fulfillOrder/rejectOrder`. Webhooks: `POST /v1/webhooks/jazzcash`, `POST /v1/webhooks/easypaisa`. 6 unit tests + 4 HTTP integration tests covering signature accept/reject, tampering, and idempotent replay. NOT tested against a real JazzCash/Easypaisa sandbox merchant account — no live credentials were available while building this. Verify against each gateway's sandbox before accepting real money.
- [x] Frontend purchase flow. — `public/account.html`: real login/register, plan display, Pro/Ultra selection, live redirect to a signed JazzCash checkout form. Verified end-to-end against the actual running server (register → create-order → checkout form), not just unit-tested. Still never submitted to JazzCash's real sandbox.
- [ ] Google Play Billing integration.
- [ ] Purchase token verification on backend.
- [ ] Android secure storage, file picker, microphone, notifications, deep links.
- [ ] Signed AAB, privacy policy, Data Safety, testing track, store listing.

## Release rule
No release may be called production-ready until all applicable gates are implemented, tested, deployed, monitored, and externally approved.
