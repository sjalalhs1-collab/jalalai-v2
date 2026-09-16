# Production Foundation Implemented

This release adds the local production-foundation artifacts that can be prepared without external services:

- TypeScript `DOM.Iterable` configuration fix for `URLSearchParams.entries()`.
- `Dockerfile` for a Node 22 build/runtime image.
- `docker-compose.yml` defining app, PostgreSQL 16, and Redis 7 services.
- GitHub Actions CI workflow for typecheck + test.
- Initial PostgreSQL schema migration covering users, sessions, entitlements, usage counters, orders, audit events, and idempotency keys.

## Important boundary

The current application code still uses its existing JSON/in-process stores. The PostgreSQL and Redis services in Compose are **not wired into the application yet**. The migration is a schema foundation, not proof of durable database integration.

Likewise, object storage and isolated execution workers remain unimplemented.

Before production deployment:

1. Add the PostgreSQL driver and repository implementation.
2. Replace JSON identity/entitlement persistence with transactional PostgreSQL operations.
3. Add Redis-backed queue/rate-limit/task state where required.
4. Add object storage for generated artifacts.
5. Add integration tests against real PostgreSQL/Redis containers.
6. Test JazzCash in the real merchant sandbox with real credentials.
