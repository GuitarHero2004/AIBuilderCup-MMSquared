# Implementation and verification ledger
**Current state — 4 October 2026:** local development foundation implemented. The complete
sourcing workflow and cloud release remain pending. Earlier documentation-only work is recorded
below. Update this file as implementation and verification continue.

| Area | Current status | Evidence / remaining work |
|---|---|---|
| Repository and teammate access | Existing repository; access not changed | Team grants/reviews collaborator access |
| App manifests / locked dependencies | Created and locally installed | Root npm workspace/lock, API pyproject/uv.lock |
| Domain calculations | Specified, not implemented | pytest output, commit |
| Frontend and contracts | Case UI and generated API types implemented | Local lint/typecheck/build/unit checks pass |
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
