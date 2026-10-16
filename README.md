# GreenProcure
AI-assisted fabric sourcing for Vietnamese textile and garment SMEs.

**Status: local case workspace and intake/review/comparison/scenario UI previews, 16 October 2026.** A visitor can sign in anonymously,
create synthetic sourcing cases and reload their own saved requirements through FastAPI and
the Firebase emulators. The responsive UI now has focused workspace/create/detail/help views,
linked validation, unsaved-draft protection and readback after an uncertain save.
Workspace and quotation views share consistent controls, status colors, spacing and responsive
layouts. Desktop quotations use aligned columns; narrow screens use labelled records.
This is not the complete MVP: quotation upload, Gemini/ADK, human
quote confirmation, calculations, persisted scenarios and decisions are still to be implemented.
No cloud resources or deployment have been created by this foundation. Quotation intake, review,
comparison and scenario components have development-only simulations for design review. They do not upload
files, call AI, persist corrections or change the production case workspace.

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

## Quotation intake UI review

From the repository root, after `npm ci`, start the isolated UI preview:

```powershell
npm run dev --workspace=@greenprocure/web -- --port 5174
```

Open http://127.0.0.1:5174/quotation-preview.html. This entry needs no API, Firebase
configuration or sign-in. The production build includes only the normal app entry.

The blue preview banner labels every outcome as simulated. Select a synthetic/non-confidential
PDF to run basic local header/size checks, then choose **Upload quotation** and an explicit preview
outcome. Nothing leaves the browser. Try **Simulate lost response** → **Check saved quotations**
→ **Simulate saved result** to review duplicate-upload protection. The synthetic sample picker
creates illustrative records, not source PDFs or extracted fields. The review action opens
the quotation review workspace described below.

Expand **Preview controls** for loading, unavailable, failed, interrupted, needs-review and
four-quotation scenarios. Changing the scenario or reloading clears in-memory work. The
10 MiB / 10-page / four-quotation limits are illustrative; final limits and recovery guarantees
must come from the server. Browser checks do not validate page count, encryption or PDF content.

The intake-specific test scripts, test inputs and screenshots are kept locally and are not
included in this branch's committed files. Executed results are recorded in the
[verification ledger](docs/IMPLEMENTATION_STATUS.md). See
[the proposed API handoff](docs/QUOTATION_INTAKE_CONTRACT.md) for missing endpoints,
owner checks, duplicate prevention, disclosure and integration dependencies.

## Quotation review UI walkthrough

Use the same local `quotation-preview.html` entry. In **Preview controls**, choose
**Extracted quotation needs review**, then **Review quotation**. The review workspace shows
an explicitly labelled synthetic demonstration with its own two-page PDF and page excerpts;
it is not an extraction of the selected intake record. Uploaded files never silently acquire
sample evidence, and this walkthrough does not confirm the original intake record.

Inspect fields beside the source, correct a value with its basis/note, mark the relevant fields
reviewed, then **Save draft**. Saving and confirmation have separate manually chosen outcomes.
**Confirm reviewed quotation** acts only on the latest saved review state and shows a simulated
receipt. An acknowledged unknown value retains its missing-information blockers; known failures
remain visible. Confirmation does not calculate eligibility, carbon or ranking.

Review scenarios cover missing values, unavailable source, known failure, pending/uncertain
save, conflict and a previous demonstration confirmation. Switching Source/Fields on narrow
screens preserves edits. Back navigation warns about unsaved edits; unresolved mutations must
be checked first. Saved demonstration drafts survive leaving/reopening the review workspace
within the same preview session; a reload or intake-scenario reset clears them.
Use **Save and confirm review** in the checklist to reach the actions without traversing every
field. The source-unavailable limitation also appears in the confirmation dialog.

This example requires no certificate evidence. Full evidence applicability, cost-adjustment
and multi-leg editing remain pending. The preview retains earlier confirmation receipts,
but does not preserve or display immutable historical field snapshots.

See the [proposed quotation review API handoff](docs/QUOTATION_REVIEW_CONTRACT.md) for the
source, draft, human-confirmation and recovery dependencies. The sample PDF is a development
UI asset, excluded from the production build. Test scripts and rendered QA screenshots remain
outside the committed feature files.

## Supplier comparison UI walkthrough

Open `http://127.0.0.1:5174/comparison-preview.html` with the isolated UI preview running
(or use its configured port). The quotation preview also links to **Comparison example**.
This is an independent, labelled synthetic evaluation snapshot, not a calculation from the
quotation-review PDF or its demonstration confirmation. The comparison uses the canonical
150 cm fabric-width example; the review PDF uses 152 cm. No browser calculation engine,
backend evaluation, live factor or model call is connected.

Use **Preview controls** to inspect eligible, incomplete, excluded, stale and recovery states.
Compare common-basis cost, full-order delivery and estimated logistics emissions; inspect each
offer's checks and source limitations. The displayed ordering and preference scores are
supplied demonstration results, never recomputed in the screen. Missing values remain unavailable.
Test-only carbon values and preference rankings are not live sourcing advice.

Choose a permitted offer using its radio control, then **Review decision** beside the ranked
results to inspect a local handoff. Choosing an
alternative eligible offer preserves the original preference winner. This step does not save
a decision. The independent scenario walkthrough is linked through **Scenario example**;
persistent decision summaries and backend integration remain separate milestones. An unresolved evaluation or an outdated result blocks advancement.
Optional explanation requests preserve usable current results and the buyer's selection;
request progress and recovery are shown with the explanation. Expand supporting explanation
and provenance details when needed; common comparison scope and blocking reasons stay visible.

The future agent is planned as one general assistant across the workspace, aware of the current
screen, record revisions and unsaved edits, with authorized actions through the planned
coordinator and specialists. Its implementation is a separate milestone in the
[UI plan](docs/UI_UX_PLAN.md); it is not connected in this preview.

See the [proposed comparison API handoff](docs/QUOTATION_COMPARISON_CONTRACT.md). The preview
entry and fixtures are excluded from the default production build. Private test scripts,
screenshots and detailed reports remain outside the repository.

## Scenario exploration UI walkthrough

Open `http://127.0.0.1:5174/scenario-preview.html` with the isolated UI preview running,
or follow **Scenario example** from the comparison preview. This is a separate supplied
baseline, not transferred quotations or results from another walkthrough.

Choose a preference preset or enter custom priorities totaling exactly 100%. Optional
relative limits remain distinct when blank (disabled) versus zero (active). Inspect the
fixed requirements and common comparison boundaries, then **Review scenario** and **Apply
scenario**. Choose an explicit simulated outcome in **Preview controls**. Applying creates
a separate demonstration result; the original baseline and previous receipts stay intact.
The screen compares supplied cost, delivery and carbon differences against that baseline.

Prepared results cover Balanced, Lowest Cost, Lower Carbon, Fastest Delivery and Custom
20/20/60, each with no limits, maximum +5% cost/minimum 25% carbon reduction, or maximum
+2%/minimum 25%. Other valid settings remain a draft with a clear unavailable-preview
message; they do not silently acquire another policy's result. No live preview calculation,
backend confirmation, persistence or AI is connected.

The examples include no feasible option, stale inputs, missing source/factor information,
undefined percentages against zero, unknown outcome/readback, and a confirmed scenario whose
evaluation failed. **Resume evaluation** preserves that existing confirmation. Edits block
decision handoff until a matching result is applied or the applied settings are restored.
Offer details retain hard failures; preferences cannot override them. **Review decision**
shows exact references without saving a decision.

See the [proposed scenario API handoff](docs/SCENARIO_CONTRACT.md) for deterministic preview,
human confirmation, immutable evaluation and recovery dependencies. Presentation types are
not generated backend contracts. The preview entry and fixtures stay out of the production
build; new executable tests, screenshots and detailed reports stay outside the repository.

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
Screenshots and tool caches stay ignored under `.local/`. The browser run writes its
execution report and desktop/mobile screenshots to `.local/artifacts/ui-workspace/`.
It exercises real local persistence, failure recovery, the case cap and a delayed save
response arriving after an identity change. Faults are injected by the test, not the app.

To review the case UI, start the three local services above, then try: **Start private demo**
→ **Create sourcing case** → change a requirement → **Cancel / Keep editing** → save
→ **Back to workspace** → refresh and reopen the saved case. Visit **Help & methodology**
for the current scope. Navigation uses in-app views; direct case URLs and browser history
routing are not implemented. Unsaved drafts stay in memory and are lost on reload after
the browser's leave-page warning. Saved emulator data lasts only while the emulators run.

After changing Pydantic models, run `npm run contracts:generate` and review the generated
TypeScript diff. `npm run test:api` runs backend tests alone. Deployed smoke tests are opt-in;
their required variables and skipped status are recorded in [the verification ledger](docs/IMPLEMENTATION_STATUS.md).

## Codebase structure
One monorepo, feature-oriented React UI and a modular FastAPI backend:

```text
apps/web/                  React + Vite + TypeScript + Tailwind
  src/features/cases/      Case form, validation and saved requirements
  src/features/quotations/ Reusable intake UI; not connected to an API yet
  src/features/quotation-review/ Source, corrections and explicit review UI
  src/features/comparison/ Supplier results, provenance and decision handoff UI
  src/dev/                Development-only intake/review/comparison simulations; excluded from app entry
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
- [Quotation intake API handoff (proposal)](docs/QUOTATION_INTAKE_CONTRACT.md)
- [Quotation review API handoff (proposal)](docs/QUOTATION_REVIEW_CONTRACT.md)
- [Quotation comparison API handoff (proposal)](docs/QUOTATION_COMPARISON_CONTRACT.md)
- [Screen wireframes and visual direction (design draft)](docs/design/VISUAL_DIRECTION.md)
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
