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
