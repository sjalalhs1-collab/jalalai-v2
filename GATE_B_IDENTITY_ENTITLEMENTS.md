# Gate B — Identity, Entitlements, and Billing Boundary

## Objective
Define a provider-neutral, server-owned boundary for identity, plans, usage, and subscription entitlements.

## Required production behavior
- Authentication is handled by a real identity provider or hardened server session service.
- Passwords are never stored in this repository; use a dedicated password-hashing service when applicable.
- Every request resolves to a server-side user identity and tenant/project scope.
- Free usage is counted server-side: 40 AI prompts per rolling UTC day.
- Pro and Ultra use fair-use controls; “unlimited” never bypasses provider, infrastructure, or abuse limits.
- Website payment and Google Play Billing are separate adapters feeding one entitlement ledger.
- Client-submitted payment screenshots or transaction IDs are untrusted evidence and require verified admin review.
- Entitlements are fail-closed for privileged features and are auditable.

## Not yet production-complete
This gate defines contracts and boundaries. It does not claim live authentication, payment processing, Google Play purchase verification, or deployment.

## Implementation status (v1.9.10)
Implemented, tested, and wired into the running server (`src/identity/`, `src/api/server.ts`):
- Real user registration and login: `scrypt` password hashing with per-user random salt (`src/identity/crypto.ts`), no plaintext or reversible password storage anywhere in the repo.
- Server-owned sessions: high-entropy random tokens, stored only as a SHA-256 digest, with expiry and explicit revocation on logout.
- Every `/v1/tasks` request now resolves to a server-side user identity via session token, OR the pre-existing operator token for internal/admin callers (backward compatible, unchanged behavior for that path).
- Free plan is enforced server-side at exactly 40 prompts/rolling-UTC-day (`GET /v1/me` exposes the live counter); Pro/Ultra get fair-use unlimited (`dailyPromptLimit: null`), matching the monetization lock.
- Usage limits are checked and denied (HTTP 402) **before** the task is enqueued for model execution, not after.
- `POST /v1/admin/entitlements/grant` lets an operator-token holder grant/change a plan; every grant, expiry, suspension, login, and prompt allow/deny decision is appended to an audit log (`IdentityStore.listAudit`).
- An expired paid plan self-heals its stored status to `expired` on next read and logs a `plan_expired` audit event (fail-closed, not fail-open).
- 23 new automated tests: 13 unit tests (`tests/identity.test.mjs`) and 10 real HTTP integration tests that spawn the compiled server and hit it over the network (`tests/server_integration.test.mjs`). Total suite: 75/75 passing.

Still NOT implemented (open, tracked in Gate A / Gate E of `NEXT_LEVEL_EXECUTION_BACKLOG.md`):
- No PostgreSQL/managed database. `IdentityStore` is a single-process JSON file (`data/jalalai-identity.json`, path overridable via `JALALAI_IDENTITY_PATH`). It is explicitly documented in `src/identity/store.ts` as unsafe for concurrent multi-instance writes. This is a real constraint, not a cosmetic one — do not deploy this behind a horizontally-scaled/multi-replica web tier as-is.
- No MFA.
- No RBAC beyond a single `user`/`admin` role flag; no project/tenant scoping.
- No website payment gateway integration or webhook verification.
- No Google Play Billing adapter or purchase token verification.
- The admin grant endpoint authenticates the *caller* via the shared operator token, not via a specific admin user session — the audit log records the action as taken by `"operator-token"` rather than a named admin identity. Tightening this to require an authenticated admin-role user is recommended before this endpoint is exposed beyond trusted internal operators.

## Known documentation issue
This file and `NEXT_LEVEL_EXECUTION_BACKLOG.md` both use the label "Gate B" for two different scopes (this file: identity/entitlements; backlog: safe autonomous execution/workers). Treat this document as authoritative for identity/entitlements; the backlog's "Gate B" should be read as its own separate scope until the labels are reconciled.

## Acceptance criteria
1. No API key, password, or payment secret exists in frontend assets.
2. Plan/entitlement decisions are server-side and testable.
3. Billing adapters cannot directly grant access; they emit verified entitlement events.
4. Usage limits are enforced before expensive model execution.
5. Every grant, renewal, expiry, suspension, and manual override is audit logged.

## Acceptance criteria — verification (v1.9.10)
1. PASS — grep of `public/` confirms no tokens/secrets; session tokens are generated server-side and only ever transmitted, never embedded in shipped assets.
2. PASS — `decidePromptForUser`/`decidePromptUsage` run server-side in `src/identity/service.ts` / `src/billing/entitlements.ts`, covered by 13 unit tests.
3. PASS (server-side; frontend UI still pending) — `src/billing/gateways.ts` verifies JazzCash's HMAC-SHA256 `pp_SecureHash` and a generic HMAC scheme usable for Easypaisa. Webhooks never write entitlements directly: they call `IdentityService.fulfillOrder`, which only grants a plan for a `pending` order it created itself, is idempotent against duplicate webhook deliveries (all real gateways retry), and audit-logs every outcome. **Not yet verified against a live JazzCash/Easypaisa sandbox account** — the algorithms are implemented per each gateway's published documentation, not confirmed against real test transactions.
4. PASS — verified by integration test `a free-plan user is blocked with 402 once the server-side daily limit is hit`, which shows the 41st request is rejected before task execution.
5. PASS — verified by unit test `audit: every grant, expiry, and denial produces a traceable log entry`.

