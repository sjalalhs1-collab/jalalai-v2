# JalalAI v1.9.17 — Multimodal Creative + Office Intelligence

This release expands JalalAI from an autonomous agent runtime into a practical work/creative platform.

## Included capabilities
- General Q&A with FAST / DEEP / VERIFIED modes
- 34 expert domains and multi-agent delegation
- Multi-provider model routing with bounded fallback
- Web research, evidence ranking and verification
- Persistent Knowledge Fabric / hybrid retrieval
- Durable workflows, retries, recovery, cancellation and human approval
- Secure permissions, authentication, rate limiting and SSRF protections
- Text/document intelligence
- CSV/tabular data analysis with concise statistics
- Real DOCX, XLSX and PPTX artifact generation when the host has Python packages `python-docx`, `openpyxl`, and `python-pptx`
- PDF export through LibreOffice
- Editable SVG vector artwork suitable for import into CorelDRAW and other vector editors
- Web-design and app-design prompt/specification capability
- Image-generation and video-generation adapter contracts (the actual renderer must be configured; JalalAI does not bypass provider quotas or invent an image/video backend)

## Artifact API
`POST /v1/artifacts` with `kind` = `docx | xlsx | pptx | pdf | svg | html | csv | md | txt`

`POST /v1/analyze/csv` for quick tabular analysis.

`POST /v1/creative/prompt` for normalized image/video/web/app generation briefs.

`GET /v1/capabilities` for the complete capability catalog.

## Office runtime requirements
- Node.js >= 20
- For DOCX/XLSX/PPTX: Python 3 with `python-docx`, `openpyxl`, `python-pptx`
- For PDF: LibreOffice/soffice

The included `scripts_artifact_writer.py` is invoked only for Office artifact creation.

## Important reality check
"Unlimited" means no artificial JalalAI daily/monthly quota in the core when rate limiting is disabled. Provider quotas, API billing, CPU/RAM, storage, bandwidth, browser limits and external service limits still apply.

CorelDRAW is supported through editable SVG/PDF interchange rather than proprietary `.cdr` generation.

Image/video generation is deliberately provider-neutral. Configure a permitted image/video provider adapter for actual rendering.

For internet-facing deployment, use HTTPS, PostgreSQL/Redis or another durable distributed store, isolated code/browser workers, secret management and production observability.

## Release 1.9.2 hardening
- Final JalalAI logo and PWA/app-icon assets.
- Authenticated task event streaming.
- Public-entry crawler metadata.
- Free/Pro/Ultra pricing definition stored in `data/jalalai-plans.json`.
- Production deployment and security gates documented in `docs/PRODUCTION_DEPLOYMENT_FINAL.md`.
