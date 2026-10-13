# GreenProcure
AI-assisted fabric sourcing for Vietnamese textile and garment SMEs.

**Status: local development foundation, 4 October 2026.** A visitor can sign in anonymously,
create synthetic sourcing cases and reload their own saved requirements through FastAPI and
the Firebase emulators. This is not the complete MVP: quotation upload, Gemini/ADK, human
quote confirmation, calculations, scenarios and decisions are still to be implemented.
No cloud resources or deployment have been created by this foundation.

## Local quick start
Install Node.js 24 (npm 11 or 12), Python 3.12 and Java 21+ first; Java 22 was used locally.
Set `JAVA_HOME` to the installed JDK directory. Local scripts prefer its `bin` directory;
this avoids Windows Java launcher shims leaving Firestore running after a test.
Run from the actual repository root. A Google account, Firebase login and cloud credentials
are not needed for local development. Initial dependency/emulator downloads need internet.

```powershell
npm ci
npm run setup:api
Copy-Item apps/web/.env.example apps/web/.env.local
```
Copy the example only on first setup; preserve an existing local configuration. On macOS/Linux,
use `cp` for that copy. Python tooling and virtual environments are local to this repository;
no global `uv` or Firebase CLI installation is required.

Open three terminals at the root:

```powershell
# Terminal 1
npm run dev:emulators
# Terminal 2
npm run dev:api
# Terminal 3
npm run dev:web
```

Open http://127.0.0.1:5173 and choose **Start private demo**. API documentation is at
http://127.0.0.1:8000/docs and the Emulator UI at http://127.0.0.1:4000.
The project ID `demo-greenprocure` is an isolated emulator identifier, not a provisioned
Google project. Local scripts force loopback emulators and disable App Check only in that
isolated mode. Production configuration requires verified identity, App Check and explicit origins.
Use synthetic data only. Cases survive page/API reloads while emulators are running;
emulator data is temporary and is discarded on shutdown. Clearing browser data loses the
anonymous identity. `/healthz` reports process/config liveness, not dependency readiness.

## Checks
```powershell
npm run check
npm run test:integration
npm run setup:browser
npm run test:e2e
```
`check` runs frontend lint/typecheck/unit tests/build, Python lint/format/unit tests, and
generated API-contract verification. Integration tests start their own Auth/Firestore/Storage
emulators and verify persistence, owner isolation, the atomic case cap and direct-client rules.
Browser smoke tests start their own API/web servers and emulators. Stop manually running dev
servers/emulators before either integration command to avoid port conflicts. Browser installation
is a one-time local download; Linux may also need [Playwright's system libraries](https://playwright.dev/docs/browsers#install-system-dependencies).
Screenshots and tool caches stay ignored under `.local/`.

After changing Pydantic models, run `npm run contracts:generate` and review the generated
TypeScript diff. `npm run test:api` runs backend tests alone. Deployed smoke tests are opt-in;
their required variables and skipped status are recorded in [the verification ledger](docs/IMPLEMENTATION_STATUS.md).

## Codebase structure
One monorepo, feature-oriented React UI and a modular FastAPI backend:

```text
apps/web/                  React + Vite + TypeScript + Tailwind
  src/features/cases/      Case form, validation and saved requirements
  src/api/                API client and generated OpenAPI types
  src/auth/               Firebase anonymous identity and App Check
services/api/
  app/models/             Pydantic request/response contracts
  app/services/           Authorised business operations
  app/adapters/           Firestore persistence
  app/security.py         Token verification and trusted identity
  tests/                  Unit, emulator and opt-in deployed tests
  Dockerfile              Backend image definition; not deployed
  pyproject.toml, uv.lock  Locked Python dependencies
infra/firebase/           Deny-direct-access rules and Firestore indexes
scripts/                  Cross-platform setup, checks, contracts and smoke tests
.github/workflows/        PR/push checks; no deployment credentials
docs/                     Current v2 requirements and handoff records
package.json              npm workspace and root commands
package-lock.json         One lockfile for JavaScript packages
firebase.json             Local emulators and static Hosting target
.local/                   Ignored tools, test artefacts and any retained local history
```

Extend the existing services and adapters as the product grows. Add `app/domain/` with the
first deterministic calculations and `app/agents/` with the first real ADK tools; those future
components are not empty placeholders in this foundation. The browser does not directly
read/write Firestore or Storage. The API derives ownership from the verified Firebase UID.

## Start here
1. Read [GREENPROCURE_CONTEXT.md](docs/GREENPROCURE_CONTEXT.md) for the scope and decisions.
2. Read [AGENTS.md](AGENTS.md) for coding-agent rules.
3. Check [implemented and pending work](docs/IMPLEMENTATION_STATUS.md) before choosing an increment.
4. Use [the kickoff prompt](docs/CODEX_KICKOFF.md) for the next product increment, preserving this foundation.
5. Follow [repository and cloud setup](docs/REPO_SETUP.md) to collaborate and deploy later.

## Current specification
- [Concept and full product vision](docs/GreenProcure_Vietnam_Textile_SME_Concept.md)
- [MVP PRD and acceptance criteria](docs/GreenProcure_Vietnam_Textile_SME_PRD.md)
- [Firestore schema and ownership](docs/GreenProcure_Vietnam_Textile_SME_Database_Schema.md)
- [Architecture, agent contracts and API](docs/ARCHITECTURE.md)
- [Exact calculations and demo test design](docs/CALCULATION_SPEC.md)
- [UI/UX user flows and screen plan (planning draft)](docs/UI_UX_PLAN.md)
- [Changes from earlier drafts](docs/DECISIONS.md)
- [Technical references and unresolved dependencies](docs/REFERENCES.md)
- [Implementation verification ledger](docs/IMPLEMENTATION_STATUS.md)

## Architecture target
React/Vite/TypeScript on Firebase Hosting → Firebase anonymous identity →
FastAPI + Google ADK on one Cloud Run service → Gemini, Firestore and private Cloud Storage.
One coordinator delegates to two specialist agents. Deterministic code owns calculations.

## Data disclosure
Cases in this foundation are labelled synthetic. Live Gemini extraction, agent tool execution
and cloud persistence still require implementation/verification. Test-only carbon coefficients are not production
reference factors. No measured customer savings or environmental certification is claimed.

## History
The uploaded v1 files are optional historical material, kept locally under
`.local/legacy/archive/v1/` when available. They are not required to build the project;
use the current v2 documents in `docs/` for implementation.
Repository visibility and licensing are team decisions; this pack does not grant a licence
for third-party materials or change an existing repository's permissions.
