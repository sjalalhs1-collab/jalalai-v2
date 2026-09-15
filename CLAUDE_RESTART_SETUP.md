# JalalAI — Claude Restart Setup

## Purpose
This file is the restart brief for continuing JalalAI in Claude without losing architecture, decisions, constraints, or QA history.

## Starting point
- Current release candidate: **JalalAI v1.9.10 — Identity & Entitlements Gate**
- Preserve the existing implementation. Do not replace it with a small demo or a shortened `index` file.
- Treat this repository as the source of truth for the current baseline.
- KNOWN FIX APPLIED: `tsconfig.json` previously had no `rootDir`, which made `npm run build` fail immediately (TS5011). This is fixed (`"rootDir":"src"`). Re-verify this still builds before doing anything else — if a future edit reintroduces this, nothing downstream (tests, server) can be trusted.

## Mission for the next session
Continue implementation in this order:
1. Build the real authenticated account system. — DONE (v1.9.10): see `docs/GATE_B_IDENTITY_ENTITLEMENTS.md` and `src/identity/`. Next: swap the JSON-file `IdentityStore` for PostgreSQL, add RBAC/project scoping, add MFA.
2. Add durable persistence: PostgreSQL, Redis/queue, object storage, migrations.
3. Move long-running work into isolated workers.
4. Add provider adapters with explicit environment configuration.
5. Add central subscriptions/entitlements and compliant web/Android billing. — Entitlement ledger and ADMIN grant path exist (v1.9.10); web/Android payment adapters themselves are still open — they must write into `IdentityService.grantPlan`, not bypass it.
6. Build the production web dashboard and Android app shell.
7. Add observability, backups, incident handling, and release automation.
8. Run the complete QA gate before every packaged handoff.

## Locked product behavior
JalalAI is a universal AI work platform with:
- FAST, SMART, DEEP, VERIFIED, and AUTO modes.
- Master Orchestrator → Planner → Specialist Agents → Model Router → Tools/Files/Web → Critic/Verification → Output.
- Claude-style execution loop: Understand → Plan → Gather Context → Execute → Inspect → Test/Verify → Fix → Re-test → Deliver.
- 34 specialist agents, multi-model routing, Knowledge Vault, office documents, data analysis, web/app design, image/video adapters, and autonomous workflows.

## Non-negotiable truth rules
- Do not claim live AI generation without configured provider credentials and a real adapter.
- Do not claim native CorelDRAW `.CDR` generation; use editable SVG/PDF interoperability.
- Do not claim production deployment, live payment processing, signed AAB, or Play Store approval until actually completed.
- “Unlimited” means no artificial JalalAI task quota; provider, fair-use, infrastructure, and safety limits still apply.
- Browser code is inspectable. Keep secrets, routing logic, billing verification, sensitive prompts, and proprietary rules server-side.
- `robots.txt` is not security; enforce authentication and authorization server-side.
- Never commit secrets, private keys, tokens, or production `.env` files.

## Monetization lock
- Free: PKR 0, 40 AI prompts/day, standard speed, core AI.
- Pro: PKR 1,000/month or PKR 10,000/year, fair-use unlimited prompts, priority speed, advanced features.
- Ultra: PKR 3,000/month or PKR 30,000/year, maximum priority, larger jobs, advanced/deep research/media priority, experimental features.
- Website: use a compliant merchant/payment gateway.
- Android digital subscriptions/features: use Google Play Billing unless a verified applicable exception exists.
- One central entitlement service must serve web and Android.
- Manual personal-wallet screenshot/TRX upgrades are a controlled admin fallback only, not the default Play Store purchase flow.

## Required working style
- Audit first; change only what is needed.
- Preserve all existing functionality.
- Add tests for every new behavior.
- Run tests, build, browser syntax check, security checks, and ZIP integrity checks.
- Report implemented vs planned items separately.
- If blocked by credentials, accounts, or external approvals, state the exact gate instead of simulating success.

## First command in Claude
Read this file, then inspect:
- `README.md`
- `FINAL_QA_REPORT.md`
- `FINAL_CRITICAL_AUDIT.md`
- `FINAL_STRUCTURE_INDEX.md`
- `NEXT_LEVEL_IMPLEMENTATION.md`
- `docs/SECURITY_BASELINE_FINAL.md`
- `docs/PRODUCTION_DEPLOYMENT_FINAL.md`
- `docs/NEXT_LEVEL_QA_GATE.md`
- `docs/GATE_B_IDENTITY_ENTITLEMENTS.md` (now implemented as of v1.9.10 — read the "Implementation status" section)
- `MONETIZATION_READINESS_FINAL.md`
- `NEXT_LEVEL_EXECUTION_BACKLOG.md` (updated v1.9.10 with what's actually done vs. still open)

Then produce a gap report before editing code.
