# JalalAI Security Baseline — Release 1.9.2

### Public surface
Only the intended frontend entry point is public/index.html. Internal API routes require authorization except health and intentionally public metadata routes.

### Repository
Use a private repository. Secrets must remain in the deployment secret manager; `.env` is ignored by Git.

### Browser boundary
Client JavaScript is inspectable by design. Critical credentials, model routing policy, proprietary algorithms and billing verification remain backend responsibilities.

### API boundary
Bearer authentication is enabled by default. Tokens are compared using a constant-time comparator. Request bodies and attachment counts/sizes are bounded. Rate limiting is configurable.

### Network safety
Public URL access uses SSRF protections. Production browser automation must remain explicitly permissioned and sandboxed.

### Events
Task event streams require the same bearer authorization as task APIs and are scoped to a task ID.

### Deployment
Use HTTPS, exact-origin CORS, a WAF/API gateway, managed secrets, isolated workers, durable databases/queues, logging/monitoring and backups before internet-facing production use.
