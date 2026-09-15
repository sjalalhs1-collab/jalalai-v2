# JalalAI Security Hardening — Release Gate

## Required before public launch
- [ ] Production authentication with short-lived sessions and MFA for administrators
- [ ] Server-side RBAC and per-project authorization on every API route
- [ ] Secrets stored only in the deployment secret manager; never in Git
- [ ] Private repositories and branch protection enabled
- [ ] HTTPS, HSTS, CSP, secure cookies, CSRF protection where applicable
- [ ] Strict CORS allowlist for approved web origins
- [ ] SSRF protection for URL fetching and research tools
- [ ] Rate limits and body/file-size limits per plan and endpoint
- [ ] Malware scanning and content-type validation for uploads
- [ ] Sandboxed code/browser/media workers with network and filesystem isolation
- [ ] Audit logs for authentication, billing, tool use, exports, and privileged actions
- [ ] Encryption in transit and at rest; tested backup restore procedure
- [ ] Public frontend only: no source maps, directory indexes, internal routes, or secrets
- [ ] `robots.txt`, canonical URLs, sitemap, and `noindex` on private/app pages
- [ ] Data retention/deletion/export process documented
- [ ] Privacy Policy, Terms, Data Safety declaration, and support contact reviewed

## Important limitation
Client-side JavaScript can be inspected. Protect proprietary logic, credentials, billing verification, orchestration policy, and provider routing on the server.
