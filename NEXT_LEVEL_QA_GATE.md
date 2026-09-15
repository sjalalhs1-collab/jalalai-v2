# Next-Level QA Gate

## Automated checks

- Existing regression suite must remain green.
- TypeScript build and typecheck must pass.
- Browser JavaScript syntax must pass.
- HTTP health, authentication and API smoke tests must pass.
- CSV analysis and XLSX artifact generation must pass.
- ZIP integrity must pass.
- New website information-architecture and Android scaffold files must be present.

## Release rule

No release may be called production-live until external deployment gates are completed: real auth/database, provider keys, payment gateway, Google Play Billing, signed AAB, cloud deployment, monitoring, legal disclosures and Play review.
