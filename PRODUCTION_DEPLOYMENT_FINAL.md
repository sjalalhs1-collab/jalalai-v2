# JalalAI — Final Deployment Gate

## Finalized in this release
- JalalAI branding assets and PWA metadata
- Favicon / app icon assets
- Public entry-point crawler controls
- Authenticated SSE task events (token is sent in Authorization header, not URL)
- Constant-time bearer-token comparison
- Security headers and CORS configuration
- Rate limiting, body/file limits and SSRF guard
- 34-agent orchestration, model routing and bounded fallback
- Research/evidence/verification pipeline
- Knowledge Vault and durable workflow runtime
- Human approval gates
- Office artifacts: DOCX/XLSX/PPTX/PDF/SVG
- CSV/data analysis
- Creative adapter contracts for image/video/web/app
- Pricing/entitlement definition for Free/Pro/Ultra

## External production gates (cannot be completed inside a source ZIP)
1. Configure real AI provider credentials in the deployment secret manager.
2. Deploy API/backend behind HTTPS and an API gateway/WAF.
3. Move durable state to managed PostgreSQL/Redis/object storage as scale requires.
4. Run code/browser/media workers in isolated containers or microVMs.
5. Configure production CORS to the exact JalalAI web origin.
6. Implement real user authentication/session management and RBAC; do not use the local operator token field as public SaaS authentication.
7. Implement server-side subscription entitlement and webhook/purchase verification.
8. Android: integrate Google Play Billing and produce a signed Android App Bundle (AAB).
9. Website: connect a compliant merchant/payment gateway and verify transactions server-side.
10. Complete privacy policy, terms, Data Safety disclosures, account deletion/data retention processes and Play Console declarations based on the actual deployed data flows.
11. Configure monitoring, alerting, backups, key rotation and incident response.
12. Complete closed testing / Play Console review requirements before production release where applicable.

## Non-negotiable security rules
- Never commit API keys, payment secrets, signing keys or production tokens, even to a private repository.
- Never expose provider credentials to browser JavaScript.
- Never treat robots.txt as an access-control mechanism.
- Keep orchestration, provider routing, billing verification and proprietary business rules server-side.
- Sensitive external actions require explicit permission/approval.
