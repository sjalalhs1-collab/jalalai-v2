# Gate A — Production Foundation

This release adds provider-neutral contracts for the production boundary. It does **not** claim that PostgreSQL, Redis, object storage, real authentication, or a payment gateway are connected.

## Required deployment implementations

1. **Authentication**: OIDC/session or securely managed access tokens; never use the demo operator token in public production.
2. **RBAC**: enforce user, project, file, task, and billing permissions on the server.
3. **MFA**: require MFA for owner/admin/security/payment-management actions.
4. **Database**: PostgreSQL for users, projects, tasks, entitlements, audit events, and idempotency records.
5. **Queue**: Redis-backed or managed durable queue with retry, backoff, timeout, cancellation, and dead-letter handling.
6. **Object storage**: private buckets, signed short-lived download URLs, malware scanning, size/type limits, and retention policies.
7. **Secrets**: deployment secret manager; no provider keys in Git, frontend bundles, logs, or ZIP handoffs.
8. **Audit**: append-only audit events for authentication, billing, file access, tool execution, approvals, and administrative actions.

## Non-negotiable release checks

- All protected endpoints reject unauthenticated requests.
- Authorization is checked server-side for every project/file/task operation.
- Idempotency prevents duplicate billing or duplicate task execution.
- Entitlements are centrally resolved and are not trusted from the client.
- Sensitive tools require explicit permission scopes and, where applicable, human approval.
- Logs redact tokens, API keys, screenshots of payment details, and personal document contents.
