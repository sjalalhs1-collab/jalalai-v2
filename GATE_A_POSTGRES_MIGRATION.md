# Gate A — Postgres/Redis migration: what's actually required

Written after an external audit (Sept 2026) that added `deploy/postgres/001_init.sql`,
`Dockerfile`, `docker-compose.yml`, and CI. This file is deliberately scoped-down and
honest about what is NOT done, per the project's own release rule in
`NEXT_LEVEL_EXECUTION_BACKLOG.md`.

## What exists now
- `deploy/postgres/001_init.sql` — schema mapped 1:1 to `src/identity/types.ts`. Not
  yet applied against a real Postgres instance (no Postgres binary was available in
  the environment this was written in — validate with `psql -f` before trusting it).
- `docker-compose.yml` — spins up app + Postgres + Redis. **The app container still
  reads/writes `data/jalalai-identity.json`, not Postgres.** Postgres/Redis run
  alongside it but are not wired in yet.

## Why this isn't a drop-in swap
`src/identity/store.ts` (`IdentityStore`) is a **synchronous** class — every method
(`getUserById`, `putUser`, `putSession`, ...) returns a plain value, not a Promise,
because a JSON file can be read/written synchronously. A Postgres client (`pg`) is
inherently async. Swapping storage means:

1. Add `pg` as a real dependency (`npm install pg` — requires network; not available
   in the sandbox this was audited in, so it has not been installed or type-checked
   here).
2. Rewrite `IdentityStore` methods as `async`, returning `Promise<T>`.
3. Update all ~29 call sites in `src/identity/service.ts` to `await` those calls, and
   make the calling methods in `IdentityService` async in turn.
4. Update `src/api/server.ts` call sites into `IdentityService` to `await` as well
   (identity calls currently happen inline in synchronous-looking request handlers
   that are already inside `async` route callbacks, so this is mechanical but must
   be done at every call site — not optional in a few places).
5. Add `webhook_receipts` inserts (schema already includes this table) at the top of
   both webhook handlers in `server.ts`, rejecting on unique-constraint violation —
   this is what makes replayed JazzCash/Easypaisa callbacks idempotent. The current
   JSON store has no replay protection.

## Recommended order
1. Apply `001_init.sql` to a real Postgres instance, confirm it runs clean.
2. Write `PostgresIdentityStore` implementing the same method names as
   `IdentityStore` but async, behind a feature flag (`JALALAI_STORE=postgres`).
3. Port `tests/identity.test.mjs` to run against both stores (JSON and Postgres) so
   regressions in the new store fail CI immediately.
4. Only then flip the default.

## Redis
Not scoped yet. Current candidates for what moves to Redis first: rate-limiter state
(`src/security/` — check the limiter implementation) and the in-memory active-task
map in `server.ts` (`activeTasks`), since both are lost on process restart today.

## Explicit non-claim
This document does not claim Postgres/Redis are wired into the running app. They are
available as infrastructure (docker-compose) and schema (SQL), not yet as code paths.
Do not mark Gate A items in `NEXT_LEVEL_EXECUTION_BACKLOG.md` as done based on this
commit alone.
