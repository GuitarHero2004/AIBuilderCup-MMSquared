# Implementation and verification ledger
**Current state — 15 October 2026:** local case workspace implemented; quotation-intake UI
prepared in a separate development-only simulation. Real PDF intake, extraction, review,
evaluation and cloud release remain pending. Dated entries below distinguish current work
from earlier verification.

| Area | Current status | Evidence / remaining work |
|---|---|---|
| Repository and teammate access | Existing repository; access not changed | Team grants/reviews collaborator access |
| App manifests / locked dependencies | Created and locally installed | Root npm workspace/lock, API pyproject/uv.lock |
| Domain calculations | Specified, not implemented | pytest output, commit |
| Frontend and contracts | Case UI and generated API types implemented | Local lint/typecheck/build/unit checks pass |
| Quotation intake UI | Reusable components and development simulation prepared | UI checks pass; real upload/extraction and generated quote contracts remain unavailable |
| Auth/Firestore/Storage | Anonymous Auth + case persistence verified in emulators | Direct client rules deny access; no PDF adapter/cloud verification |
| Gemini PDF extraction | Not live-verified | Model/location, sample, measured latency |
| Coordinator + two specialist agents | Designed, not wired | Actual run/tool trace and tests |
| Scenario and decision flow | Specified, not implemented | A/B, C/D, stale/infeasible tests |
| Carbon references | Not supplied/approved | Exact source rows, review notes and licence |
| Cloud Run/Firebase deployment | Not deployed | URLs, revisions, timestamps |
| PR checks/previews and Cloud Build | Checks workflow supplied; remote execution/previews/Cloud Build pending | No remote run/deployment claimed |
| Security and quotas | Token/owner checks and atomic two-case cap verified locally | Full AI quotas and public abuse controls pending |
| Submission readiness | Not established | All incognito live smoke checks |

## Documentation review — 4 October 2026
- Changed: PRD v2.1, architecture, shared context, decision log and references for the requested
  Google-service review; this entry records documentation work only.
- Requirements clarified: service-to-outcome evidence, App Check, operational monitoring,
  image delivery, conditional secret storage, supported PDF inputs and quality measurement,
  source inspection, retention disclosure, interruptions and optional later Google integrations.
- Commands/checks: Git status/log/diff inspection, `git diff --check`, `rg`, PowerShell file
  reads/hashes and in-memory document checks. All 12 active relative Markdown links resolve;
  fences balance across 16 Markdown files; all 7 JSON examples parse; cited source IDs resolve
  to 24 reference entries. Official Google sources were read for capability verification.
- Preservation: calculation specification, database schema, Concept and AGENTS unchanged;
  original D01–D17 decisions, authoritative business rules and agent/tool approval boundaries
  retained. No application tests, fixture runs, live Gemini calls or cloud deployment executed.
- Blockers before live release remain: verified transport-factor rows, selected/tested model
  and SDK/region, authorised cloud configuration and the team's explicit retention policy.
- Next implementation step, when requested: Increment 1 with pure calculation tests and one
  extraction/review/confirmation/evaluation path. New public-release controls are gated at I4;
  no scaffold or cloud resources were created during this review.

## Local foundation — 4 October 2026
- Scope: npm monorepo with `apps/web`, `services/api`, `infra/firebase`, root scripts and a
  checks-only GitHub workflow. Feature-oriented React UI and modular FastAPI backend; one
  backend deployment boundary remains the target. No new database or agent framework.
- Versions: React 19.3.0, Vite 8.3.2, TypeScript 5.9.3, Tailwind 4.3.3, Firebase SDK 12.19.0;
  Python 3.12, FastAPI 0.142.2, Firebase Admin 7.7.0, Firestore client 2.34.0, Pydantic 2.13.5.
  Repository-local uv 0.12.23; all resolved dependencies locked. TypeScript 5.9.3 is deliberate:
  installed lint/API-generation peer ranges do not yet support TypeScript 7.
- Runtime subset: `/healthz`, authenticated `POST/GET /api/v1/cases` and
  `GET /api/v1/cases/{case_id}`. Cases use the v2 requirement shape, exact decimal strings,
  synthetic/draft flags, revision 1 and fixed default policy. Shape validation is not eligibility
  evaluation. Remaining case fields/workflows will be added with their product increment.
- Ownership: verified Firebase anonymous UID is the authority; Firestore paths are
  `users/{uid}/cases`. Transactions enforce two cases per visitor. UI identity changes clear
  prior-owner data and discard obsolete responses. Production requires App Check/app-ID
  allowlists. Explicit loopback `demo-` emulator mode permits unsigned local tokens and disables
  App Check. Browser Firestore/Storage rules deny access.
- Commands executed: `npm install`, `npm ci --no-fund --no-audit`, `npm run setup:api`,
  `npm run setup:browser`, `npm run contracts:generate`, `npm run check`,
  `npm run test:integration`, `npm run test:e2e`, `npm audit --json`.
- `npm run check` passed after clean npm installation: frontend lint/typecheck, **23 tests**
  and production build; Ruff lint/format; **69 backend tests passed**, 3 opt-in tests skipped
  in that unit run; generated TypeScript contract matches FastAPI OpenAPI. Runtime checks used
  Node 24.17.0, Python 3.12.2 and Java 22 on Windows; CI targets Node 24/Python 3.12/Java 21.
- Emulator integration: **2 passed**, verifying real anonymous token validation, case
  persistence across a fresh API/client, cross-owner 404, concurrent two-case cap (201/429),
  and authenticated direct Firestore/Storage read/write denials (403). Contention handling
  was corrected after the initial integration failure; it retries only explicitly aborted
  transactions, with a bounded retryable failure. Ambiguous timeouts never auto-repeat writes.
- `npm run test:e2e` passed: real browser anonymous sign-in, create/save, page reload,
  separate visitor isolation, desktop and 390px mobile layout without horizontal overflow.
  Desktop/mobile screenshots were inspected; no live AI was invoked. A final rerun confirmed
  the corrected local-mode notice no longer obscures form or saved-detail content.
- Unit tests cover ownership, invalid identity/App Check, forbidden authority fields, decimal
  and date validation, limits, contention/errors, fail-closed config and stale browser sessions.
  The Docker image was not built (local Docker daemon unavailable); GitHub Actions has not run
  remotely. The read-only deployed smoke is skipped: it needs explicit `RUN_LIVE_TESTS=1`
  and `LIVE_API_URL=https://<authorised-api-origin>`, then `python -m pytest -m live` from the
  configured API environment. Add a provider smoke when the real Gemini adapter exists.
- Live/fixture status: no live Gemini or ADK calls, fixture-AI fallback, extraction,
  confirmation, scoring or decisions. Synthetic case inputs use actual emulator persistence.
  Backend PDF storage/retrieval remains future work. No cloud resources, IAM, billing,
  deployment, staging, commit or push occurred during foundation setup.
- Dependency review: `npm audit --json` reports **15 affected package entries: 11 high and
  4 moderate**, representing six upstream advisories. These remain unresolved. The unused Node
  Firestore dependency brings affected gRPC server code; the frontend imports app/auth/app-check
  only. Other chains belong to the Firebase development CLI: `braces`, `basic-ftp`, OpenTelemetry
  core and `uuid` (gaxios currently uses unaffected v4). `braces` has no patched release; other
  available fixes violate parent dependency ranges. No forced downgrade or untested major
  override was applied. Review dependency updates/exposure before public release; this is not
  a clean audit. Sources: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
  [basic-ftp](https://github.com/advisories/GHSA-c475-qrg2-pj4r),
  [OpenTelemetry](https://github.com/advisories/GHSA-8988-4f7v-96qf),
  [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq),
  [gRPC certificate handling](https://github.com/advisories/GHSA-m9gg-hp2v-232j),
  [gRPC error disclosure](https://github.com/advisories/GHSA-f596-whhp-79r4).
- Tool notices: npm 12 blocked optional upstream install scripts for `re2`, `protobufjs` and
  `@firebase/util`; the verified foundation commands do not require approving them. Starlette
  emits a TestClient/httpx deprecation warning; it is not suppressed. Initial emulator shutdown
  left a JVM behind through Oracle's Windows launcher shim. Local scripts now prepend validated
  `JAVA_HOME/bin`; the final browser run shut down cleanly, without the earlier rules-runtime
  EOF warning. Test server/emulator ports were checked after shutdown.
- Remaining work: deterministic calculation/eligibility engine with stale-revision and
  no-feasible-option tests; PDF extraction/review/confirmation; bounded ADK tools; evaluations,
  scenarios/decisions; public quotas, monitoring and cloud smoke. Carbon-factor approval,
  model/location selection, retention policy and authorised cloud setup remain release blockers.
  Next smallest increment: pure engine plus one human-reviewed quotation path, preserving
  this foundation rather than scaffolding again.

## Optional root-file cleanup — 4 October 2026
- Removed `.node-version`, `.python-version`, `.editorconfig` and `.firebaserc` at the team's
  request; removed the disposable generated `firestore-debug.log` as well. The emulator may
  recreate that ignored log. Retained `firebase.json`, GitHub checks and ignored local tooling.
- Verification: inspected Git status and applicable instructions, searched active files for
  references, and checked retained runtime declarations and explicit Firebase project arguments.
  No application behavior changed; application tests were not rerun for this file cleanup.
- Live/fixture status and release blockers are unchanged. Next increment remains the pure
  calculation engine plus one human-reviewed quotation path. Nothing staged, committed or pushed.

## Local commit verification — 4 October 2026
- Reviewed the 72 pending source/documentation files for the requested local commit series:
  Google-service requirements, API foundation, frontend/development tooling, and handoff docs.
  No credential patterns or local-only artifacts were found among the selected files.
- Re-ran `npm run check`: 23 frontend and 69 backend tests passed, with lint, typecheck,
  build, formatting and generated-contract checks passing. The unit run skips 2 emulator
  tests and 1 deployed smoke test by design. `npm run test:integration` separately passed
  both emulator tests after removal of `.firebaserc`; project selection remains explicit.
- Browser smoke evidence remains the successful foundation run above; it was not repeated
  for committing. Known dependency advisories, Docker/deployed verification gaps and the
  next product increment remain unchanged. This is a local commit handoff, without a push,
  deployment, cloud configuration change or additional application implementation.

## UI flow and screen planning — 14 October 2026

- Created local branch `feat/ui-workspace` from freshly fetched `dev` at
  `bb31efe3008f9f8bbad32a7d40bc509bfd870509`; the working tree was clean before branching.
- Added [the UI/UX flow and screen plan](UI_UX_PLAN.md) and linked it from README. The plan
  covers navigation, seven screen states across the five view families, optional scenarios,
  explicit human confirmation/selection, recovery states, accessibility and API dependencies.
- Planning is based on the current v2 repository contracts and supplied BeyondPilot/GreenProcure
  visual references. Existing case UI/API capabilities are distinguished from future workflows;
  backend, AI integration and release ownership are not assumed to have been agreed.
- Checks executed: Git status/branch/remote inspection, `ls-remote`, `fetch --no-tags origin dev`,
  `merge --ff-only origin/dev`, branch creation, source review, an independent document review,
  and local Markdown link/fence/whitespace validation. The flow diagram was inspected as source,
  not rendered. No frontend/backend application tests were run for these documentation changes.
- Live/fixture status: no UI implementation, runtime change, Gemini/ADK call, fixture execution,
  dependency installation, deployment or remote push. Existing release blockers are unchanged.
- Next planned task: low-fidelity wireframes and visual direction; then a small frontend
  increment for the existing case workspace. Quote/review/evaluation/scenario/decision APIs
  and their unresolved response/retry contracts must be agreed before connected implementation.

## Wireframes and visual direction — 14 October 2026

- Continued on `feat/ui-workspace` at `aebe330`; the working tree was clean on entry.
- Added [offline screen wireframes](design/UI_WIREFRAMES.html), a
  [visual-direction guide](design/VISUAL_DIRECTION.md), and two rendered desktop previews.
  Linked the design package from README and the screen plan.
- The design artifact contains seven screen views, 23 illustrative states, grayscale/colour
  switching, desktop/mobile layouts and local review controls. It has no network/API access,
  authentication, uploads, model calls or persistent business records. Fixture carbon values
  are explicitly test-only; no new production feature or calculation engine is implemented.
- Verification: standalone headless Chromium/Playwright checked all 23 states at 1440, 390
  and 320px (69 state/viewport combinations), with no page overflow, JavaScript errors or
  outgoing network requests. Checked confirmation gates, extraction recovery, conflicting
  requirement edits, pending scenario policy, no feasible option, scenario/buyer selection
  preservation, stale save blocking and mobile source switching. Desktop and representative
  mobile screenshots were visually inspected. Proposed text-colour contrast was calculated.
- Independent review identified misleading pending-scenario and requirement-conflict states;
  corrected those and reran the artifact checks. No application test suite or live services
  were run; this is design-artifact verification, not end-to-end product verification.
- Application source, API contracts, dependencies and cloud configuration are unchanged.
  No deployment or remote push occurred. Existing backend and release dependencies remain.
- Next smallest implementation step after design review: the shared layout and existing
  anonymous case list/create/detail experience, preserving its working API and isolation.

## UI Milestone 1 — case workspace — 14 October 2026

- Branch: continued on `feat/ui-workspace`, clean on entry. New changes remain unstaged
  and uncommitted for user review. No push, merge or deployment was performed.
- Changed: shared `AppShell`, case list, focused create/saved-requirements views and
  Help & methodology. Applied the pale sidebar/white surface/forest-green visual direction,
  readable form typography, mobile records, keyboard focus and responsive navigation.
- Interaction: controlled drafts, linked validation summary, field-level feedback, native
  discard dialog with keyboard containment, leave-page warning and focus restoration.
  Duplicate submissions are blocked synchronously. An uncertain write preserves the draft,
  requires successful list readback and lets the buyer inspect saved cases before resuming.
- API client: added structural checks for the response fields the UI consumes before a
  successful response can discard the draft. Ambiguous POST failures (including storage or
  proxy 5xx) require readback; explicitly aborted storage contention remains retryable.
  Pydantic/generated contracts, payloads, decimal strings and backend routes are unchanged.
- Preserved: anonymous identity, owner/session boundary, two-case cap, fixed textile preset,
  synthetic disclosure and API-only browser access. No production fixture fallback exists.
- `npm run check` passed: frontend lint/typecheck, **26 frontend tests**, production build,
  Python Ruff lint/format, **69 backend tests**, and generated-contract verification.
  Three opt-in tests were skipped in that command (two emulator integration tests and one
  deployed smoke). The existing Starlette/httpx deprecation warning remains.
- `npm run test:e2e` passed after correcting dialog keyboard focus and mobile breadcrumb
  wrapping. **17 evidence groups** include real emulator sign-in/create/reload, separate
  visitors, the two-case limit, validation, draft keep/discard, explicit save rejection,
  duplicate-submit prevention and readback after losing a real successful POST response.
  A real old-owner response delivered after sign-out and a new anonymous sign-in does not
  populate the new workspace. Network faults are injected only in the browser test.
- Responsive QA: entry/create/requirements/workspace/help checked at **1440, 1024, 768,
  390 and 320px** (25 screen/viewport combinations), including 160-character case and
  destination values. No page overflow or uncaught browser JavaScript errors. Rendered
  desktop/tablet/mobile and error-state screenshots were visually inspected. This is not
  a complete screen-reader audit or cross-browser certification.
- Evidence: `.local/artifacts/ui-workspace/report.json` and PNGs, ignored from Git. The
  final stylesheet refinement received another browser run and production build.
- Live/fixture status: real local Auth/Firestore/FastAPI persistence using synthetic cases.
  No live Gemini/ADK call, cloud/deployed verification or new backend capability. No project
  dependency or lockfile change. Existing cloud/factor/model/retention blockers remain.
- Local review services started with `npm run dev:emulators`, `npm run dev:api` and
  `npm run dev:web` using explicit emulator-only frontend settings. The app and API health
  URL returned HTTP 200. The emulator CLI downloaded its optional UI asset into local cache.
- Scope limits: views use local React state (no direct URLs or browser-history routing);
  unsaved drafts are memory-only. Saved requirements are read-only. Upload/review/evaluation/
  scenario/decision workflows remain planned. Local emulator data is temporary.
- Backend handoff remains section 7 of [the UI plan](UI_UX_PLAN.md): agree quote collection,
  upload/sample/status, confirmation, preview and uncertain-mutation readback contracts.
  Next increment after user review: quotation intake and processing feedback.

## Workspace refinement and PRD backward review — 14 October 2026

- Continued the existing uncommitted task on `feat/ui-workspace`. Preserved all earlier
  changes; nothing staged, committed, pushed, merged or deployed.
- Condensed fixed fabric requirements into three labelled rows. Composition and GSM
  tolerances, minimum usable width and absent colour/finish/evidence requirements remain
  visible and match the existing payload. All six editable fields, units, budget boundary
  and full-order/calendar-day/date hints remain visible.
- Detailed comparison methodology now uses a native keyboard-operable disclosure. The
  logistics boundary stays visible while collapsed; the expanded copy explains well-to-wheel
  and excludes fabric production. Error and recovery controls remain outside the disclosure.
- Entry copy describes saving/reopening a sourcing brief and explicitly bounds the preview.
  The saved requirements notice now appears before the detailed values. Visual backward
  review found duplicate confirmations after that move; consolidated visible feedback while
  retaining the live screen-reader status announcement.
- Backward review traced saved requirements to acknowledged persistence, validated editable
  inputs and the fixed specification. Independent source review found no mismatch with
  PRD FR-02 or `form.ts`. No validation, mutation, authentication or API contract logic changed.
- Final `npm run check` passed: lint, TypeScript, production build, **26 frontend tests**,
  Ruff lint/format, **69 backend tests** and generated-contract verification. Three opt-in
  tests were skipped (two emulator integration tests and one deployed smoke); the existing
  Starlette/httpx deprecation warning remains.
- `npm run test:e2e` could not start a second emulator suite because the existing local
  preview occupied its ports. Verified those processes belonged to this project and reused
  them without stopping services or changing configuration. The temporary runner uses the
  existing browser suite with its service-start block replaced by health checks, plus a
  focused disclosure check. Used the repository's existing Playwright cache via
  `PLAYWRIGHT_BROWSERS_PATH` after the standalone runner initially searched the default cache.
- Final `node .local/artifacts/ui-workspace-refinement/run.mjs` passed **19 evidence groups**:
  existing persistence/reload, validation, draft recovery, duplicate-save prevention,
  uncertain-write readback, quota and identity-race checks; native Enter/Space disclosure
  operation preserves focus/edited values and sends no POST. **30 screen/viewport checks**
  across 1440/1024/768/390/320px found no horizontal overflow or uncaught JavaScript errors.
- Final `node .local/artifacts/ui-workspace-refinement/inspect.mjs` passed the targeted
  visual inspection assertions. At 390px, the same collapsed create-screen capture changed
  from 2313px to 2074px in height. The normal-length saved-case confirmation/preview limits
  fit within the first 844px viewport. Desktop, mobile, expanded-methodology and saved-state
  screenshots were visually reviewed; no full screen-reader/cross-browser audit is claimed.
- Evidence: ignored `.local/artifacts/ui-workspace-refinement/` contains `report.json`,
  `inspection.json`, screenshots and the one-off verification runners. No permanent tests,
  dependencies, backend, generated types or infrastructure changed in this refinement.
- Updated the UI plan with PRD I1–I4 delivery gates and the requested branch/worktree and
  backward-review workflow. Next product gate remains one real PDF through review,
  confirmation and evaluation; dependent branches need an approved committed baseline and
  the section 7 API handoffs. UI Milestone 1 does not complete PRD I1.
- Live/fixture status: real local emulator persistence of synthetic cases only. No live AI
  or deployed verification. Existing preview remains available at `http://127.0.0.1:5173/`;
  emulator data remains temporary. Public-release dependencies are unchanged.

## Reviewed commit preparation — 15 October 2026

- The user explicitly authorised committing the reviewed workspace and pushing it to `dev`.
  Created focused commits for save reliability (`edace4a`), the workspace interface
  (`738e4f0`) and browser checks (`1db3c22`); documentation and working instructions are
  grouped separately. Messages are short and primarily plain language.
- All 15 reviewed files matched the versions from the final passing verification above.
  Readiness review found no material blocker, and `git diff --check` passed. Application
  code and test inputs have not changed since that verification, so tests were not repeated
  merely to create commits. New edits only record the user's workflow preferences and status.
- Fetched `origin`; at preparation time `dev` remained at `bb31efe`, with no teammate changes
  to reconcile. Integration will preserve the existing history, including the two earlier
  UI planning commits. No force push, production deployment or cloud change is requested.
- Recorded the standing preference in `AGENTS.md` and the UI plan: separate tasks by branch
  and worktree, review backwards from PRD outcomes, and use coherent commits with concise
  messages when authorised. Future tasks still stay uncommitted until the user asks.
- The next connected product gate remains PRD I1. Upload/review/evaluation contracts,
  live AI and deployed acceptance remain outstanding; this commit set is the requirements
  workspace foundation and does not imply a completed sourcing workflow.

## Quotation intake UI and API handoff — 15 October 2026

- **Scope and baseline:** the user chose UI plus a concrete API handoff for Mạnh, excluding
  backend implementation. Created `feat/ui-quotation-intake` in a separate worktree from
  merged `dev` at `5ccc395` (PR #1). The original workspace checkout remains untouched.
  These changes are uncommitted; no push, merge, deployment or cloud change was performed.
- **Changed components:** `features/quotations/` contains the reusable intake view, presentation
  types and the PDF preflight helper. `features/quotation-intake.css` provides responsive
  styling. `quotation-preview.html` and `src/dev/` provide an isolated development entry with
  eleven explicitly simulated states. Local-only `pdfPreflight.test.ts` and
  `scripts/quotation-preview-smoke.mjs` verify the feature; these private tests are excluded
  from this branch's commits, as recorded in the commit-preparation entry below.
  README/UI plan describe how to review it; `QUOTATION_INTAKE_CONTRACT.md` records proposed APIs.
- **Buyer flow prepared:** supported case requirements → select PDF or synthetic example →
  basic local preflight → pending/known/uncertain save → separate extraction state → review
  handoff. Failed saves retain selection; uncertain outcomes block another upload until readback
  resolves them. A failed readback does not permit a fresh retry. Extraction retries are explicit;
  missing-information counts remain nullable. The next review screen is not implemented here.
- **Backward review and refinements:** aligned the example with the actual USD/woven fabric
  preset, tolerances and full-order lead-time semantics. At four quotations, removed the
  redundant upload form to bring review actions forward. Pending saves show the last checked
  count and an unresolved result, rather than asserting that no quotation exists. Improved
  focus after simulated actions and mobile delivery text wrapping. Inspected desktop/mobile
  screenshots, including mixed, full and uncertain states.
- **Executed checks:** installed locked dependencies with offline `npm ci`; ran `npm run lint`,
  `npm run typecheck`, `npm run test`, `npm run build` and
  `node scripts/quotation-preview-smoke.mjs`. Lint/typecheck/build passed; **31 frontend tests
  passed**, including five PDF preflight tests. After final UI refinements, lint/build (including
  typecheck) and browser checks passed again. The final browser run passed **12 groups and
  55 layouts**: eleven scenarios at 1440, 1024, 768, 390 and 320 pixels, without horizontal overflow.
  It covered keyboard/dialog recovery, source selection, lost-response reconciliation,
  retained selection, deliberate extraction retries, the cap, reload and production exclusion.
  `git diff --check` passed. Evidence is ignored under `.local/artifacts/quotation-intake/`.
- **Live/fixture/unavailable:** local browser interactions and basic PDF byte/header checks are
  real. All save/run/list outcomes and synthetic sample records are manually controlled,
  memory-only simulations. The browser run observed no fetch/XHR, external requests,
  local/session storage mutations or uncaught errors. Production output excludes the preview
  HTML and simulation JavaScript; the existing app entry is unchanged. Real PDF upload, private
  storage, Gemini, source viewing, confirmation and persisted run recovery are unavailable.
  Page count, encryption and PDF validity are not verified by preflight. No source sample PDFs
  or answer-key extraction are supplied by this preview.
- **Tests not rerun:** backend unit, emulator integration, existing full-workspace end-to-end
  and deployed/live-AI checks. This task changes no backend, API client/generated contracts,
  production app entry, infrastructure or dependency manifest/lockfile. The full root
  `npm run check` was not run; frontend evidence above must not imply backend verification.
- **Integration dependencies:** Mạnh's contract review and implementation of owned quotation
  collection/upload/sample/run routes, operation readback/idempotency, private source access,
  authoritative limits and error/retry states. Current `CaseRead` only accepts draft/revision 1;
  its model, generated types and frontend guard must evolve together. `run_id` is currently
  null-only, idempotency headers are not allowed by CORS, and retention/disclosure policy is
  unresolved. All changes in the handoff remain proposals, not accepted API commitments.
- **Next smallest step:** review this UI/handoff, then agree the API contract with Mạnh. Once
  the approved UI baseline is committed, source-backed quotation review can start in a separate
  branch; real intake wiring needs the backend contract and endpoints. FR-03 and PRD I1 remain
  incomplete until genuine upload → extraction → human review/confirmation → evaluation works.

## Single working folder — 15 October 2026

- The user requires all work in `C:\AIBuilderCup-MMSquared` and explicitly requested deletion
  of the other GreenProcure working folders. This supersedes the earlier worktree arrangement.
  `AGENTS.md` and the UI plan now require separate branches in this single checkout, with no
  extra worktrees or duplicate project folders unless explicitly requested.
- Switched the clean primary checkout to `feat/ui-quotation-intake` at `5ccc395`. Transferred
  all 16 uncommitted intake files and verified their SHA-256 hashes before any cleanup.
  Preserved and hash-checked 58 screenshots/report files; retained the screenshot helper.
  A local migration manifest, original file backup and historical-work archive are ignored
  under `.local/migrations/quotation-intake-2026-10-15/` inside the primary checkout.
- Retired both linked worktrees and deleted the extra GreenProcure design, planning, reference,
  UI, intake and related Notion-snapshot folders after preserving their historical material.
  `git worktree list` now contains only `C:\AIBuilderCup-MMSquared`. Branch history is preserved;
  nothing was committed, pushed or deployed during the move.
- Verification in the canonical folder: `npm run test` passed all 31 frontend tests;
  `npm run build` passed TypeScript checking and production build. Restarted Vite from
  `C:\AIBuilderCup-MMSquared\apps\web` on port 5174 and successfully rendered the intake preview
  in Chromium at desktop and mobile widths. Application source was not changed by the move;
  the earlier full 12-group/55-layout browser evidence remains applicable and preserved.

## Private UI stress testing and refinement — 15 October 2026

- User requested autonomous local stress testing without publishing test cases. All new
  adversarial scripts, synthetic files, screenshots and detailed reports were kept in the OS
  temporary directory, outside this repository. No commit, push, publication or deployment
  occurred. Only this summary is recorded here; no new stress-test files were added to Git.
- Worked backwards from reliable selection, truthful saved state and recoverable next actions.
  Reproduced and fixed four UI issues: stalled file checks prevented replacement; a full
  collection discarded a pending selection; changed byte limits left prior validation usable;
  and 200% text enlargement clipped sidebar labels despite no page-level overflow.
- Selection controls now remain usable during local preflight. Clear cancels the selection,
  ignores late reads and returns keyboard focus to the file input. Upload remains blocked while
  checking or while a save outcome is unresolved. The full-case form is hidden while retaining
  its selection state. Changed limits block upload and expose an explicit Recheck action:
  actual native-file reselection can emit cancel instead of change, so this action reuses the
  selected File directly. Sidebar labels wrap at enlarged text sizes; dialogs are centred.
- Final private stress run passed: 25 repeated four-quotation journeys (100 simulated saves),
  75 unavailable readbacks, 25 confirmed-rejection/retry paths and 75 extraction attempts,
  with 25/30-click bursts. No duplicate records, uncaught errors, business/external requests or
  local/session storage writes were observed. File-boundary/error checks ran under 6x CPU
  throttling. Deferred reads, clear/replacement, offline selection retention and reload passed.
- Private component-prop checks passed for changing limits and uncertain/full/rejected state
  transitions. Native-file tests verified rejection and acceptance through Recheck without
  needing another picker change. Keyboard-only flow, long Unicode filenames, and normal/200%
  text checks passed at 1440, 844, 640 and 320 pixels; enlarged sidebar clipping was visually
  rechecked after the fix. The final clear-selection focus check also passed.
- Existing browser regression was run from a private temporary copy, writing its output only
  to temporary storage: 12 groups and 55 layouts passed. Its existing cap assertion now checks
  that preserved inputs are hidden rather than removed. Existing frontend unit tests passed
  (31); lint, TypeScript checks and build passed. After the last focus refinement, lint/types
  and the affected keyboard interaction passed again. These are local UI checks, not server
  load benchmarks or evidence of real upload, storage, extraction or live-AI capacity.
- Next: user review of the refined intake UI and proposed API handoff. Backend integration
  remains pending; changes stay uncommitted on `feat/ui-quotation-intake` in the single
  `C:\AIBuilderCup-MMSquared` working folder.

## Quotation intake page refinement and backward review - 15 October 2026

- Completed the four authorised refinements on `feat/ui-quotation-intake` in the sole
  `C:\AIBuilderCup-MMSquared` checkout. Changes remain uncommitted; nothing was pushed or
  published. New browser scripts, screenshots and detailed reports remain in OS temporary
  storage outside this repository. Existing smoke selectors were updated for the revised UI.
- Empty cases lead with upload/sample selection. Existing quotations and their next actions
  appear before an expandable Add a quotation section. Stable keyed panels preserve the native
  file input when reordered; collapsed and full-case forms retain selection and validation.
  Pending, uncertain and rejected saves expose recovery. Full cases show a limit explanation.
- Rows explicitly distinguish a saved PDF, extraction and human review. Each exposes its
  applicable action: Extract information, Check status, Retry extraction, Review quotation or
  View reviewed quotation. Missing information stays unknown when no count was supplied;
  zero missing fields still requires review. Confirmation does not imply eligibility.
- Upload quotation leads a quieter Clear selected PDF action with a usable keyboard/touch
  target. Order, budget and complete delivery terms stay visible; fabric specifications use
  a native expandable disclosure. Feature CSS remains scoped to intake; no new dependencies.
- Worked backwards from the buyer outcome: understand requirements, select a source, know
  whether it saved, find the document and identify its next action. Independent review caught
  a focus issue when a background refresh added the first quotation while the form was in use.
  The form now remains open during editing; a known-save/reset clears selection and restores
  the default disclosure state. Corrected full-cap guidance and accessible action names too.
- Validation: all 31 frontend tests passed; lint, TypeScript checks and production build passed.
  Existing browser regression passed 12 groups / 55 layouts, including production exclusion,
  lost-response recovery, retry, cap and reload. After the focus refinement, independent private
  browser checks passed 9 groups / 40 layouts at 320, 390, 844 and 1440 pixels, normal and 200%
  text. They verified native input identity, focused refresh, collapse/reopen, rejection,
  full-cap recovery, keyboard order and absence of horizontal overflow. No browser errors or
  business/external requests were observed. Desktop/mobile screenshots were visually reviewed.
- Review verdict: ready for user review within the UI-plus-proposed-API-handoff scope. No
  blocking UI issue remains in the exercised paths. Real upload/storage/extraction, source PDF
  review, correction and confirmation are still unavailable; FR-03 and I1 remain incomplete.
  Real-phone, Safari/Firefox and screen-reader checks were not performed. User review comes
  before any commit; the next feature belongs on a separate branch after the baseline is approved.

## Authorised local commit preparation - 15 October 2026

- The user authorised local commits after reviewing the branch and revising the grouping.
  Four coherent groups cover the reusable intake UI, proposed backend handoff, isolated
  development preview, and project review/workflow records. Messages explain what changed
  and why in mostly non-technical language, without unnecessary length.
- Only the reviewed feature/documentation files are selected. The two untracked verification
  files, `apps/web/src/features/quotations/pdfPreflight.test.ts` and
  `scripts/quotation-preview-smoke.mjs`, remain local and are explicitly excluded through
  `.git/info/exclude`. Their contents were preserved and hash-recorded outside the repository.
  Private stress scripts, synthetic test inputs, screenshots and detailed reports remain
  excluded. Preview scenario data stays with the development UI because it is required to
  render the explicitly labelled simulation, not an executable test suite.
- Corrected the README action label and removed commands that would depend on the excluded
  local smoke script. Updated the workflow wording to preserve the user's message preference
  and the separate commit/push authorization boundary.
- Source behavior is unchanged from the reviewed UI. Final commit preparation ran
  `npm run test --workspace=@greenprocure/web -- --exclude src/features/quotations/pdfPreflight.test.ts`:
  all 26 tests intended for the committed tree passed. `npm run typecheck` and
  `git diff --check` passed. Earlier 31-test results include five local-only PDF checks;
  browser verification remains local evidence, not a test suite shipped in these commits.
- All commits stay on `feat/ui-quotation-intake`. No remote push, pull request, merge,
  deployment or cloud change is authorised by this commit-only request.

## Per-increment report template
### Increment / commit
### Files changed
### Commands actually executed
### Tests: passed / failed / skipped
### Live, fixture and unavailable paths
### Current blockers (exact config/dependency, not guessed values)
### Next smallest step

Never change a status to verified solely because an implementation file exists. No environment
secrets, auth tokens or real private supplier data should be recorded in this ledger.
