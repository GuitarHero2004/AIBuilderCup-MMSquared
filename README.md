# GreenProcure
## Repository context pack — version 2.0, 1 October 2026

AI-assisted fabric sourcing for Vietnamese textile and garment SMEs.

**Status: implementation brief, not a finished or deployed application.** This repository
starter contains Markdown context and review instructions. It does not contain working
frontend/backend code, completed CI, provisioned Google resources or a tested deployment.

## Start here
1. Read [GREENPROCURE_CONTEXT.md](docs/GREENPROCURE_CONTEXT.md) for the scope and decisions.
2. Read [AGENTS.md](AGENTS.md) for coding-agent rules.
3. Give Codex [the kickoff prompt](docs/CODEX_KICKOFF.md).
4. Follow [repository and cloud setup](docs/REPO_SETUP.md) to collaborate and deploy later.

## Current specification
- [Concept and full product vision](docs/GreenProcure_Vietnam_Textile_SME_Concept.md)
- [MVP PRD and acceptance criteria](docs/GreenProcure_Vietnam_Textile_SME_PRD.md)
- [Firestore schema and ownership](docs/GreenProcure_Vietnam_Textile_SME_Database_Schema.md)
- [Architecture, agent contracts and API](docs/ARCHITECTURE.md)
- [Exact calculations and demo test design](docs/CALCULATION_SPEC.md)
- [Changes from earlier drafts](docs/DECISIONS.md)
- [Technical references and unresolved dependencies](docs/REFERENCES.md)
- [Implementation verification ledger](docs/IMPLEMENTATION_STATUS.md)

## Architecture target
React/Vite/TypeScript on Firebase Hosting → Firebase anonymous identity →
FastAPI + Google ADK on one Cloud Run service → Gemini, Firestore and private Cloud Storage.
One coordinator delegates to two specialist agents. Deterministic code owns calculations.

## Data disclosure
Supplier documents and cases will be synthetic. Live Gemini extraction, real tool execution
and real persistence must be implemented. Test-only carbon coefficients are not production
reference factors. No measured customer savings or environmental certification is claimed.

## History
The uploaded v1 files are optional historical material, kept locally under
`.local/legacy/archive/v1/` when available. They are not required to build the project;
use the current v2 documents in `docs/` for implementation.
Repository visibility and licensing are team decisions; this pack does not grant a licence
for third-party materials or change an existing repository's permissions.
