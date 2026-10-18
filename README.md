# GreenProcure
AI-assisted fabric sourcing for Vietnamese textile and garment SMEs.

**Status: reduced hosted demo deployed and verified, 18 October 2026.**
[Open GreenProcure](https://greenprocure-511917.web.app). Firebase Hosting serves the normal
React/TypeScript app; FastAPI runs on Cloud Run in Singapore with Firebase anonymous identity
and App Check. The hosted journey passed: two private PDF uploads and real Gemini extractions,
explicit human reviews/confirmations, deterministic comparison, and an immutable buyer
selection note reopened unchanged after reload. Comparison and selection made no AI calls.
Missing App Check was rejected with 403; a second owner received 404 on all four tested read
routes. Earlier deployed checks also rejected direct browser database/storage access.
Use only synthetic, non-confidential quotation PDFs. Application data stays in Singapore;
Gemini processing uses a global endpoint. Automatic data cleanup is not implemented.

The current hosted release uses API revision `greenprocure-api-00007-8x8` and
Hosting version `2e435930a985410d`, from merged source `4c4d8b6`.
The contextual Google ADK assistant (PR #14) and workspace UI refinements (PR #15)
are both deployed. A fresh hosted rehearsal passed on 18 October at 23:22 Vietnam time:
two real Gemini extractions, explicit review/confirmation, comparison, immutable selection
save/reopen and one real assistant explanation of the saved selection. The assistant
used four model calls and two tool calls; comparison and selection used no AI.
The published asset hashes match the reviewed build; desktop/mobile screenshots were inspected.
See the verification ledger for exact evidence and boundaries.

The user approved this reduced demo scope. Carbon calculations/ranking, persisted full
evaluations, scenarios, enterprise/supplier accounts and private invitations remain deferred.
The assistant explains saved context and opens relevant screens; it cannot approve quotations,
edit procurement records or place orders. A buyer selection note is not purchasing approval
or a complete carbon-aware decision. Development-only walkthroughs remain separate simulations.
Live extraction calls Gemini directly; the full planned MVP is not complete.

Use the [connected quotation contract](docs/QUOTATION_LIVE_CONTRACT.md) for implemented behavior,
the [Firebase and live setup guide](docs/LIVE_QUOTATION_SETUP.md) for configuration, and the
[verification ledger](docs/IMPLEMENTATION_STATUS.md) for executed checks and remaining gates.

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

## Connected quotation workflow

In the normal app, open a saved case and choose its quotations. Upload a synthetic,
non-confidential PDF, then inspect the saved source. The server enforces four quotes per case,
10 MiB per PDF and ten pages. Source files are private; browser database and bucket access
are denied.

Extraction is disabled in the ordinary emulator configuration. To verify the real provider,
first complete the [live setup prerequisites](docs/LIVE_QUOTATION_SETUP.md) and configure a
supported Google Cloud model/location with the intended personal project identity. Failed or
unavailable AI never silently produces sample results. Once extraction succeeds, review fields
beside the PDF, save corrections and then explicitly confirm the saved revision. Acknowledged
unknowns remain blockers for later evaluation; confirmation does not make an offer eligible.

Unknown upload/save/confirmation responses preserve their request reference for readback.
After a reload, only request metadata is restored; unsaved PDF or draft content is not stored
in browser session storage. A missing request can be explicitly closed with a server-side
marker before starting new work. Existing recorded operations must be recovered.

## Connected confirmed-quotation checks

From a saved case, choose **Open quotations** then **Compare confirmed terms**. The normal
React/TypeScript screen calls the authenticated API. It reads current immutable human-confirmed
revisions and saved requirements in a consistent database snapshot, without writes or model calls.

Each quote shows requirements met, requirements failed, information missing, or not confirmed.
**View checks** explains each outcome; **Review quotation** reopens the current draft and
private source PDF. Costs use exact server decimals and a reviewed common cost basis.
Missing information stays unavailable. Gross mass is never used for kilogram pricing.
Conflicting declared charges prevent a comparable total even when a cost-basis checkbox is set.

**Refresh checks** reads current inputs again. A failed refresh explicitly marks the displayed
result as a previous, unverified result. An invalidated confirmation removes that offer's
calculated metrics on refresh. A passing row does not establish carbon comparability,
supplier certification, ranking, a recommendation or purchasing approval.

See the [implemented comparison contract](docs/QUOTATION_COMPARISON_CONTRACT.md).

## Buyer selection notes

The connected selection screen records a human choice from a current comparison. Only an
immutable confirmed quotation that meets the displayed requirement checks can be selected.
Review the checked terms, enter a reason, acknowledge the limited scope and choose
**Save buyer selection**. Reopen the original snapshot from **Saved selection history**.
Each case can retain ten notes. This workflow does not place an order or approve a supplier.

The server rechecks the case revision, input fingerprint and exact confirmation in the same
transaction that saves the note and its receipt. Later source edits leave the note unchanged;
the saved view reports whether its inputs still match, changed, or could not be checked.
An uncertain save keeps its request reference for **Check save result**. A missing receipt
must be resolved or explicitly closed before new work; it is not proof that no save occurred.

See the [implemented buyer selection contract](docs/BUYER_SELECTION_CONTRACT.md). Service/API
and isolated Firestore tests, six browser workflow groups and the full branch check passed.
The successful hosted journey and release evidence are recorded in the
[verification ledger](docs/IMPLEMENTATION_STATUS.md).

## Contextual assistant (feature branch; not deployed)

**Ask GreenProcure** opens one persistent drawer across the working screens. With a selected
case, it explains saved requirements, quotation review gaps, confirmed cost/delivery checks,
or an immutable buyer-selection note. It can draft copyable supplier clarification and open
the relevant existing workflow. Unsaved browser values are not sent; the panel names its saved
context and invalidates action cards when the screen or referenced inputs change.

The backend runs Google ADK `2.12.0` with a coordinator and two bounded AgentTool specialists.
Each turn invokes the relevant specialist and an authenticated saved-context tool. Facts and
amounts come from existing deterministic services; the model selects references rather than
writing authoritative numbers or approvals. Review acknowledgements, confirmation and buyer
selection remain explicit human UI actions. PDF extraction remains its separate direct Gemini
operation; this increment does not route it through the assistant.

A bounded POST performs each turn while the UI polls actual recorded activity. This is not
token streaming or a detached background job. Firestore retains run history and request
receipts; cancellation, interruption and changed inputs have explicit recorded outcomes.
All nested model generations share the existing extraction allowance and global kill switch.
Ordinary emulator mode disables live AI; private test doubles are never deployed as fallbacks.
The verification ledger distinguishes local/emulator tests from actual live Gemini calls.

The assistant uses the existing configured Google project, model and location. FastAPI is
pinned to `0.141.1` because ADK `2.12.0`'s telemetry dependency is incompatible with the
`0.142.2` minimum; the resolved lock and existing API regression suite were checked.

The walkthroughs below remain independent, labelled design simulations. Their preview controls
do not operate on the connected case or its saved quotations.

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
[verification ledger](docs/IMPLEMENTATION_STATUS.md). The [original API handoff](docs/QUOTATION_INTAKE_CONTRACT.md) records the design proposal;
the [connected contract](docs/QUOTATION_LIVE_CONTRACT.md) describes implemented endpoints.

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
results. The decision workspace receives that exact selected offer, evaluation and matching
explanation. Choosing an alternative preserves the original preference winner. Its simulated
saved summary can be reopened within the same page session. The independent scenario
walkthrough is linked through **Scenario example**; durable storage remains pending. An unresolved evaluation or an outdated result blocks advancement.
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
opens the shared decision workspace with the exact selected offer, applied evaluation and
frozen baseline. Its reason, save outcomes and summary are explicitly simulated.

See the [proposed scenario API handoff](docs/SCENARIO_CONTRACT.md) for deterministic preview,
human confirmation, immutable evaluation and recovery dependencies. Presentation types are
not generated backend contracts. The preview entry and fixtures stay out of the production
build; new executable tests, screenshots and detailed reports stay outside the repository.

## Decision review and summary UI walkthrough

Open `http://127.0.0.1:5174/decision-preview.html` with the isolated UI preview running.
For the full in-page handoff, select an offer in the comparison or scenario walkthrough and
choose **Review decision**. The parent screen and exact selection remain in memory.

Review the selected offer beside the evaluation's preferred offer, inspect the source checks
and common measurement boundaries, and enter a required human reason. The reason is required
for the preferred offer as well as an eligible alternative. **Save decision** captures the
reviewed choice and reason; **Preview controls** supplies its simulated outcome. Saving does
not place an order or call an agent, backend or browser storage.

A matching receipt shows the immutable summary, original reason, reviewer, time and references.
Returning to the previous view and reopening the same choice retains it in that page session.
Later input changes are shown separately; they do not rewrite the saved example. Reloading
clears these in-memory records and does not demonstrate real persistence.

The standalone examples cover a preferred offer, an alternative, an applied scenario, unknown
save, known rejection, mismatched receipt, stale inputs, and an acknowledged decision whose
summary cannot be loaded. Unknown saves retain the same request and require **Check save result**.
Once a decision ID is acknowledged, recovery uses **Read saved summary** without another save.
An unresolved decision must be resumed before another choice can start a parallel save.

The [proposed decision API handoff](docs/DECISION_CONTRACT.md) defines human-only saves,
owner/revision validation, atomic immutable snapshots, idempotent recovery and historical reads.
The 2,000-character reason budget is a proposed UI limit awaiting backend agreement.
The preview is excluded from production; new executable tests and QA artifacts stay in OS temp.

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
  src/features/quotations/ Reusable quotation intake UI components
  src/features/quotation-review/ Source, corrections and explicit review UI
  src/features/comparison/ Development comparison walkthrough components
  src/features/connected-comparison/ Server-backed confirmed requirement checks
  src/features/connected-selections/ Human buyer notes and saved snapshot recovery
  src/dev/                Development-only intake/review/comparison simulations; excluded from app entry
  src/api/                API client and generated OpenAPI types
  src/auth/               Firebase anonymous identity and App Check
services/api/
  app/models/             Pydantic request/response contracts
  app/services/           Authorised business operations
  app/adapters/           Firestore persistence
  app/security.py         Token verification and trusted identity
  tests/                  Unit, emulator and opt-in deployed tests
  Dockerfile              Backend image used by the deployed quotation release
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

Extend the existing services and adapters as the product grows. Deterministic checks live in
`app/services/comparison_engine.py`; saved buyer notes use the same consistent source snapshot.
`app/agents/` remains future work rather than an empty framework placeholder. The browser does not directly
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
- [Implemented quotation checks and proposed full evaluation](docs/QUOTATION_COMPARISON_CONTRACT.md)
- [Implemented buyer selection note contract](docs/BUYER_SELECTION_CONTRACT.md)
- [Screen wireframes and visual direction (design draft)](docs/design/VISUAL_DIRECTION.md)
- [Changes from earlier drafts](docs/DECISIONS.md)
- [Technical references and unresolved dependencies](docs/REFERENCES.md)
- [Implementation verification ledger](docs/IMPLEMENTATION_STATUS.md)

## Architecture target
React/Vite/TypeScript on Firebase Hosting → Firebase anonymous identity →
FastAPI + Google ADK on one Cloud Run service → Gemini, Firestore and private Cloud Storage.
One coordinator delegates to two specialist agents. Deterministic code owns calculations.

## Data disclosure
Cases and quotations are labelled synthetic. Live Gemini extraction and private cloud
persistence, confirmed checks and buyer-note save/reopen are verified in the hosted demo.
General agent execution remains deferred.
Test-only carbon coefficients are not production reference factors. No measured customer
savings or environmental certification is claimed.

## History
The uploaded v1 files are optional historical material, kept locally under
`.local/legacy/archive/v1/` when available. They are not required to build the project;
use the current v2 documents in `docs/` for implementation.
Repository visibility and licensing are team decisions; this pack does not grant a licence
for third-party materials or change an existing repository's permissions.
