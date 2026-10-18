# Implementation and verification ledger
**Current state - 18 October 2026:** the guided quotation-to-selection demo is deployed and
verified at [GreenProcure](https://greenprocure-511917.web.app). [PR #12](https://github.com/GuitarHero2004/AIBuilderCup-MMSquared/pull/12)
merged as `e947184` after all three remote checks passed. Cloud Run revision
`greenprocure-api-00006-bvd` serves 100% of traffic; Hosting version `55630d153862661e` is live.

A fresh hosted journey passed the two built-in PDF uploads, two real Gemini extractions,
explicit guided reviews/confirmations, deterministic cost/delivery comparison, and immutable
buyer-selection save/reopen after reload. Missing App Check and another owner's access were
rejected. This is the approved reduced demo outcome, not the full PRD: carbon estimates,
ranking and scenarios remain deferred. The first bounded Google ADK assistant is implemented
and merged through [PR #14](https://github.com/GuitarHero2004/AIBuilderCup-MMSquared/pull/14)
after all three remote checks passed. It has not been deployed. The separate
`fix/workspace-ui-polish` branch has passed local workspace, Help and workflow checks;
its implementation is committed and the user has authorized push. It is not merged or deployed. The automated journey is not a narrated
video or evidence of competition submission acceptance.
Dated entries preserve earlier evidence; later entries supersede their then-current blockers.

| Area | Current status | Evidence / remaining work |
|---|---|---|
| Repository | Single checkout; assistant merged; UI refinement committed; push authorized | `C:\AIBuilderCup-MMSquared`; `fix/workspace-ui-polish` created and initially published from updated `dev` at `392f46f` |
| App and contracts | Guided UI, generated contracts and trade-off verified | Full branch checks, 11 local browser groups and fresh hosted journey passed |
| Quotation intake/review | Built-in PDFs and guided review deployed | Both public examples passed real upload/extraction, explicit grouped review and immutable confirmation |
| Auth/Firestore/Storage | Anonymous Auth enabled; Singapore database/private bucket configured | Runtime storage/database smoke: 10 passed; deny-direct-client rules deployed |
| Gemini PDF extraction | Real `gemini-3.1-flash-lite` through global endpoint verified | Actual changed-PDF facts, citations, unknowns and no-approval checks passed |
| App Check | Enterprise provider configured for both Hosting domains; mandatory backend verification | Fresh hosted session passed; missing/invalid App Check rejected with 403 |
| Cloud Build/Run/Hosting | Guided demo deployed and verified | Cloud Run `greenprocure-api-00006-bvd` at 100%; Hosting `55630d153862661e`; fresh hosted guided journey passed |
| Security/quotas | Owner/revision checks, private files, App Check and bounded model usage | Deployed extraction limits: 10/user/day, 100 globally/day, 2 active; buyer-note limit: 10/case, locally tested |
| Domain calculations | Cost, requirement checks and cost/delivery trade-off verified | Hosted: USD 142,500 / 20 days versus USD 139,000 / 23 days; exact USD 3,500 / 3-day trade-off; carbon/ranking deferred |
| Buyer selection notes | Local verification and hosted immutable save/reopen passed | 95 private service/API tests, 1 Firestore integration, 6 local browser groups; hosted snapshot unchanged after reload |
| Comparison/scenarios/full decisions | Connected comparison hosted verification passed; full evaluation walkthroughs remain simulations | The reduced buyer note does not implement ranked, carbon-aware decisions or scenarios |
| ADK coordinator and specialists | First contextual assistant merged through PR #14; not deployed | Actual ADK coordinator/specialist live checks and local workflow/concurrency checks passed; evidence is recorded below. PDF extraction retains its direct Gemini adapter |
| Carbon references | Not supplied/approved | No carbon estimate, score or environmental claim is available |
| Submission readiness | Approved reduced app workflow ready to demonstrate | Narrated video under three minutes, public-source permission, deck and submission acceptance remain separate gates |

## Workspace UI refinement - 18 October 2026 (local verification passed)

- User outcome: a coherent procurement workspace with stable desktop navigation, clear page
  actions, useful Help and professional spacing across the existing sourcing workflow.
- Assistant PR #14 was merged first. Local `dev` was pulled with `--ff-only`, then
  `fix/workspace-ui-polish` was created and immediately pushed. Local and remote baseline
  both matched `392f46f41f44761de2cfc9c150488eb06d6562a0`. No duplicate checkout or stash.
- The assistant's functional commits are integrated. The user authorized UI commits and push.
  Functional commits: `92cf237` (workspace layout/actions) and `56e3a26` (Help guide);
  verification documentation is separate. This UI branch is not merged or deployed.
- Scope: stable sidebar/topbar around one desktop content scroll region, correct heading
  flex sizing, primary Create action and nearby case allowance, list-level Refresh,
  compact empty/welcome states, consistent quotation activity styles and a task-based Help
  guide with operation-specific recovery. Narrow/short screens retain usable reading space.
- Backward review started with the buyer's next action and the screenshot's alignment
  defect. The shared page-heading rule had given the title and action group equal flexible
  width. Only title copy now grows; Create aligns with the page edge, Refresh with its list,
  and disabled Create states retain an adjacent explanation. Empty-state copy is compact.
- Desktop navigation stays outside one scroll region; the source PDF pane uses the actual
  available height so wrapped topbars do not obscure it. Narrow/short layouts keep usable
  document flow. Existing page/field focus and unsaved-work guards are preserved.
- Help now describes six real workflow steps with exact control names, example-PDF guidance,
  saved-state assistant help and expandable recovery/comparison/session details. Recovery
  distinguishes case creation, quotations, selection saves and assistant requests.
- Final `npm run check` passed at 22:58 Vietnam time: lint/typecheck, 31 frontend tests,
  build, Ruff/format, 69 backend tests with three existing opt-in skips and generated API
  contract equivalence. Existing non-blocking bundle-size and test-client deprecation
  warnings remain. A later accessible-region attribute passed its affected-file lint check.
- Actual local browser verification passed **29 groups**: nine layout/navigation checks and
  20 quotation-to-selection/assistant regression groups. These use real Auth/Firestore/
  Storage emulators with explicitly injected no-network extraction and assistant doubles.
  No paid model calls or production data writes were made for this UI milestone.
- Visual review inspected empty/filled workspaces, forms, Help, quotation review, comparison,
  saved selection and assistant at 1440/1920px, plus 390/320px, short windows and 200% text.
  Sidebar/topbar positions stayed fixed during normal desktop content scrolling. Skip focus,
  source returns, dirty navigation, cancellation and lost-response/reload recovery passed.
  A final wide-screen review refined stretched row buttons and aligned footer/content edges.
  The final CSS-only refinements passed targeted rendered checks at 1440/1920/390px: desktop
  row actions retain their intrinsic width, mobile actions fill their row, footer edges align
  with the main content, and no horizontal overflow was found. Final diff checks passed.
- Private test scripts, synthetic inputs, detailed reports and screenshots remain in OS TEMP.
  No test files were added to the branch. This is UI verification, not a new hosted release,
  enterprise/supplier implementation, carbon capability or production-readiness certification.
- Next gate: publish the user-approved commits for remote review. Integration and deployment
  remain separate; this verification entry does not establish a new hosted release.

## Contextual assistant - 18 October 2026 (merged; not deployed)

- Outcome: ask about the current saved case, quotation review, confirmed comparison or saved
  buyer selection without leaving the working screen. This is a bounded first assistant,
  not the complete autonomous platform agent or the planned enterprise/supplier product.
- Branch: `feat/contextual-assistant`, created from freshly pulled `dev` at `6b3a053` and
  published at that baseline before development. User-approved functional commits include
  `af96e93` (Google agents/API), `6745aeb` (contextual UI), and `2f1575b` (documentation).
  All three remote checks passed at exact head `2f1575b8f5a239907a6ce0a5d15d305580c9560a`;
  PR #14 merged as `392f46f41f44761de2cfc9c150488eb06d6562a0`. The hosted release is unchanged.
- Backend: actual Google ADK coordinator with Quotation and Sourcing specialists exposed as
  bounded AgentTool calls. Only the relevant specialist and authorized saved-context reader
  are available for a turn. The server renders validated fact references, exact Decimal
  values, missing-field clarification text and navigation actions. No agent confirms a quote,
  edits business records, saves a buyer choice or sends a message.
- Six authenticated owner-scoped routes cover run/create/list/read/events, exact-operation
  readback and cancellation. The awaited POST uses concurrent polling of persisted actual
  events; this is not token streaming or a detached background job. Runs enforce a 120-second
  deadline, six model calls, eight tool calls, two delegations and the shared usage limits.
- Screen context contains saved references/revisions and an unsaved-change flag, not DOM
  contents or unsaved field values. History is reconstructed from at most two matching saved
  turns. Server context checks and client context generations prevent stale/cross-case actions;
  unsaved-work guards remain authoritative. Saved selections retain their historical facts.
- React/TypeScript: persistent launcher, accessible responsive drawer, visible screen context,
  prompt and clarification UI, actual activity, cancel/retry/readback and reload recovery.
  Actions open intake, an exact review field, comparison or a saved selection. The sidebar,
  Help rewrite and general page-action layout are intentionally queued for the next branch.
- Dependency compatibility: pinned `google-adk==2.12.0`; FastAPI moved from 0.142.2 to 0.141.1
  because ADK requires OpenTelemetry <=1.42.1 while FastAPI 0.142.2 requires >=1.44.0. The
  resolved lockfile and existing API regression checks pass; no dependency override was forced.
- Final `npm run check` passed after the race fixes at 22:41 Vietnam time: frontend
  lint/typecheck, 31 frontend tests, build, backend Ruff/format, 69 backend tests with three
  existing opt-in skips, and generated-contract equivalence. Non-blocking warnings remain
  for the 543 kB JavaScript bundle and the Starlette test-client httpx deprecation.
- Private verification: 46 frontend checks and 92 service/API/actual-SDK-double tests passed.
  Exact source-document guards reject concurrent same-revision source changes before a model
  reservation or final answer commit. A failed reservation spends no model allowance.
  Six additional assertions using two real anonymous emulator owners verified that another
  owner cannot read or cancel a run. Detailed suites, fixtures and screenshots remain in
  OS TEMP, outside the repo; no private test files were added to the branch.
- Actual local app verification passed 20 browser groups: nine assistant and 11 existing guided
  quotation-to-selection groups. These use real Auth/Firestore/Storage emulators with explicit
  no-network provider doubles, not live Gemini. They cover empty-case intake navigation,
  review-field focus, unsaved edits, comparison/history, cancellation, lost responses,
  reload/readback and case switching. Desktop, 390/320px and 200% text screenshots were
  inspected; cramped controls, hidden context and inconsistent numeric grouping were refined.
  Three targeted browser checks also passed for late known failures: switching cases and
  typing a new question preserves that text, newer same-case text survives, and an empty
  original composer recovers its failed question. These intercepted all assistant POSTs.
- Two bounded live ADK checks passed against the existing Google project/model: quotation
  5.83 seconds and sourcing 4.88 seconds, each with four actual model generations and two
  tool calls (eight generations total, no retries). The actual coordinator delegated through
  AgentTool and read saved synthetic context. Clarification covered the actual missing
  full-order delivery and route details; the sourcing result retained USD 3,500 / three days.
  These checks used an isolated in-memory business repository and wrote no production cases.
  They verify the live adapter, not deployment of the new routes or hosted assistant UI.
- Next separate branch: keep desktop navigation visible while content scrolls; rewrite Help
  around actual tasks; place Create in the page heading and Refresh with the saved case list;
  preserve keyboard navigation, unsaved-work guards and mobile/enlarged-text layouts.
- Later product direction confirmed by the user: enterprise staff and external suppliers,
  starting with private invitations. Product/style briefs and an explicit component BOM may
  cover fabrics, trims and packaging, with declared quantities/units/allowances. Organization
  membership, invitation access and supplier-submission isolation require their own milestone;
  they are not implemented by this assistant branch.

## Guided demo workflow - 18 October 2026 (hosted verification passed)

- Scope: make the real quotation-to-selection flow easier to demonstrate and operate through
  public synthetic PDF inputs, guided human review, visible recorded extraction status and a
  server-calculated cost/delivery trade-off. No seeded extraction or confirmation result and
  no general-agent or carbon expansion are part of this increment.
- Two public product PDFs were created with explicit synthetic labels and one-page English
  tables. Both were rendered and visually inspected; text, page count and exact SHA-256 were
  checked. Unknown shipment masses, routes and emissions factors remain unavailable. These
  are intentional product assets; private test suites and answer keys are not app assets.
- The example loader accepts only catalog IDs, retrieves same-origin PDF bytes with bounded
  streaming, validates signature/size/hash and returns a File for the ordinary upload API.
  It does not upload, extract or confirm on its own. Static deployment permits only the two
  bounded, hashed product-PDF paths while retaining the existing receipt and path controls.
- Completed focused checks: **22 private loader checks**, **10 private deployment checks**,
  ESLint for the new loader, a TypeScript check, Ruff/format for the deployment script, and an
  isolated actual Vite build emitting two external hashed PDFs rather than inline data URLs.
  No cloud writes or live extraction were performed by these checks. Test scripts, generation
  helper and rendered inspection images remain in OS temp.
- Other completed focused checks: **40 private guided-review reducer/adapter checks** covering
  atomic group actions, stale snapshots, source evidence, individual authority, unknown-note
  preservation and edit invalidation; **28 backend trade-off edge/service checks** including
  exact USD 3,500 / three-day differences, old saved-record hydration, ties and tiny decimals;
  **26 frontend response-guard checks**. Targeted frontend lint/typecheck and backend Ruff
  passed. Source-return and integrated browser refinements passed their affected rechecks;
  the separate hosted run below supplies live evidence.
- Final `npm run check` passed: lint, TypeScript, 31 frontend tests, build, Ruff/format,
  69 backend tests (3 existing opt-in skips) and generated-contract equivalence. The build
  retains a non-blocking large-chunk warning; no bundle-splitting claim is made.
- The actual local app passed **11 browser groups** using real Auth/Firestore/Storage emulators
  and an explicit no-network extraction double: download failure/retry, duplicate-click and
  navigation protection, source round-trips, discarded/unapplied notes, edit invalidation,
  both sample uploads/reviews/confirmations, exact server comparison, saved-selection focus and identical reload/reopen.
  This local run is not live Gemini evidence. Private test files and screenshots stayed in TEMP.
- Working backwards from the demonstration exposed excessive scrolling: the initial guided
  page was 7,392 px high at 1,440 px width. Compact cited rows and section navigation reduced
  it to 2,666 px (64%); rows fell from 168 px to 64 px. Desktop, 390 px and enlarged-text
  screenshots were inspected. Eight additional entry/form/detail/intake typography checks
  passed; an observed enlarged-text label overlap was fixed and visually rechecked.
- Cloud Build `9482f1ad-adec-4d78-86f9-d4851c1a307d` succeeded for backend commit `d67f95e`:
  image digest `sha256:99ff898a35417852b659a0dc49c7488ca4ff2d0a9e8cdafc80a32bb2b96ed659`.
  This exact image deployed as revision `greenprocure-api-00006-bvd` at 100% traffic.
- Functional commits: `d67f95e` (server trade-off/contracts), `f4d352b` (examples, guided review
  and shared typography), `3c92fc4` (comparison and saved outcome), `d44fb3a` (documentation).
  All three CI checks passed at `d44fb3a` before PR #12 merged. Local `dev` was pulled and
  `chore/guided-demo-release-evidence` was created/published at `e947184` for this evidence.
- The production frontend build and receipt passed. Firebase Hosting published six files,
  593,263 bytes, version `55630d153862661e`, release `1792334798360000`. Only the two intentional
  synthetic PDFs were added to public assets; private tests and answer keys were not published.
- Fresh hosted verification at 21:47-21:48 Vietnam time passed with normal Firebase Auth and
  App Check: examples A/B uploaded through the actual UI, each returned one real model call,
  source facts/citations checked, explicit guided review and individual boundary decisions
  saved/confirmed, and required unknowns retained. No fixture response or auto-confirmation
  was substituted. Both offers met checked requirements and the server returned the exact
  USD 3,500 / three-day trade-off. Comparison and selection made no model calls.
- Saving the buyer's choice and reason succeeded; reload/reopen preserved the exact immutable
  selection and comparison snapshot. Four read routes rejected missing App Check with 403
  and another owner with 404. No browser runtime errors were recorded. Hosted desktop and
  390 px screenshots were inspected; the 1,440 px guided page measured 2,666 px high.
- The automated hosted journey, including screenshots/reload/access checks, took 57.6 seconds.
  This measures test execution and service response, not human review or narrated video time.
  A recording can show requirements, live extraction, one source-review example, the cost/
  delivery trade-off and the reopened buyer choice; a finished video/deck is not produced here.
- The official [submission FAQ](https://aibuildercup.com/Faqs.html) was checked on 18 October
  2026: the video must be **under three minutes**. PRD, context and reference wording were
  corrected to supersede the earlier supplied 3-4 minute duration.

## Reduced demo release - 18 October 2026 (hosted verification passed)

- The user approved three functional commits, push, PR merge and deployment. Saved-selection
  commits: `e222a5b` (backend), `1b62f4a` (UI), `c585435` (documentation).
- [PR #9](https://github.com/GuitarHero2004/AIBuilderCup-MMSquared/pull/9) passed all three CI
  checks and merged as `b11bf7415c014f762532cf4633959ba807e08571`. Local `dev` was updated;
  `chore/demo-release-verification` was then created and published at that clean baseline.
- Cloud Build `60837922-39ca-4efb-a816-fd7cba01602e` succeeded. Release API image digest:
  `sha256:2248caed35436d17d50d02c44e78677bf884c552b7eeab305e7336e92e8eea31`.
  The production frontend configuration/build also passed.
- Initial deployment passed: Cloud Run revision `greenprocure-api-00003-xv7` served 100%
  of traffic using the exact image digest above; revision 4 below supersedes it. Stable API:
  `https://greenprocure-api-694155506378.asia-southeast1.run.app`.
- Firebase Hosting version `e09fa612e61d0c14`, release `1792330094439000`, published four
  files totaling 558,497 bytes to [GreenProcure](https://greenprocure-511917.web.app).
- The first hosted extraction returned `INVALID_EXTRACTION_RESULT`: date text and a container
  route citation did not meet the strict extraction contract. Prompt v3 clarified these outputs;
  validation was retained. The fix passed 29 focused private tests, full `npm run check`
  (31 frontend / 69 backend tests, 3 existing opt-in skips), and a real provider diagnostic
  verifying 20/20 business-fact citations.
- Prompt-fix commit `727791602e77ef2cec7dd682fdeea86b7e7829b4` was pushed and
  [PR #10](https://github.com/GuitarHero2004/AIBuilderCup-MMSquared/pull/10) merged after all
  three checks passed, as `42c99245801c3dad2820e434d2ac94c34e039b6b`.
- Cloud Build `0d2a4943-90a7-4bac-bc9e-9e559af556ba` succeeded with image digest
  `sha256:ce14ce3b1e18693c052eb4baae4bc2d1a5b53c5042e108ba2f2ab2dd21b56d7e`.
  Cloud Run revision `greenprocure-api-00004-mxb` served 100% of traffic before revision 5. Hosting remained
  unchanged. Local `dev` was pulled to the merge, then `chore/demo-release-evidence` was created
  and published at that baseline with these documentation edits preserved.
- Fresh hosted quotation A passed real extraction, source review/save and explicit human
  confirmation using normal Firebase Auth and App Check. The next hosted run reached quotation B
  and strict validation rejected two comma-formatted numeric strings (quantity and MOQ).
  Prompt-v3 date/route handling held; this additional number-format issue was reproduced.
- The generic canonical-number schema hint and prompt-v4 correction passed one bounded live
  quotation-B verification: all expected business fields and 20 source citations, unknowns
  preserved and no authority fields populated. All 41 focused tests and Ruff passed.
- Fix commit `08a9bf8` was pushed on `chore/demo-release-evidence`. Cloud Build
  `2de2a762-69e7-490a-87eb-638d08bd62d8` succeeded with image digest
  `sha256:723c80713204747750e54a0e90fe5836b03ab45a2b3dc02fc16b02ad331eb42b`.
  Cloud Run revision `greenprocure-api-00005-c2k` deployed successfully and serves 100% of
  traffic using that exact image. Hosting remains version `e09fa612e61d0c14`.
- [PR #11](https://github.com/GuitarHero2004/AIBuilderCup-MMSquared/pull/11) contains the
  extraction correction and final release evidence. All three CI checks passed on the
  code commit; hosted verification passed against its exact deployed image.
- An earlier private-harness stop before quotation B upload was corrected by expanding
  **Add a quotation**. Screenshot review confirmed that panel behavior was correct in the app.
- Harness setup also required the Playwright browser-path environment variable before library
  import. That initial launch made no AI call. Neither harness setup issue is an app defect.
- Final fresh hosted verification passed against revision 5 with normal Firebase Auth and
  App Check: two real PDF extractions, explicit saved reviews and human confirmations, and
  both comparison rows meeting the checked requirements. Returned totals/lead times were
  USD 142,500 / 20 days and USD 139,000 / 23 days.
- A buyer selection note saved successfully and reopened unchanged after reload, preserving
  its reason and exact comparison snapshot. Comparison and save made no AI calls.
- Final hosted comparison and saved-note screenshots were visually inspected at desktop
  1440px and mobile 390px. Layouts were usable with no clipping or overlap.
- Missing App Check returned 403. A separate normal owner received 404 on all four tested read
  routes. No authentication bypass or mocked extraction was used for this final journey.
  Private case IDs, fixture paths, screenshots and detailed reports remain outside the repo.
- Repository visibility, video/slides, final submitted-source link and competition
  submission acceptance are separate from this
  successful hosted runtime check; no submission acceptance is claimed.
- The reduced scope remains a human buyer selection note, without carbon ranking, scenarios,
  general-agent execution, purchase approval or a completed full competition MVP.

## Saved buyer selection note - 18 October 2026 (local verification)

- Approved outcome: from current confirmed quotation checks, the buyer records a reason and
  reopens an immutable selection note. The user accepted this narrower demo in place of the
  full ranked/carbon-aware decision and general-agent milestones for tonight.
- Backend: five authenticated owner-scoped routes for create/list/read, exact-request
  receipt lookup and cancellation. The human route supplies service authority; request JSON
  cannot supply trusted actor, owner, totals or a comparison snapshot. No model, PDF, external
  message or purchase operation is called. See [the implemented contract](BUYER_SELECTION_CONTRACT.md).
- Persistence: verify current case revision, comparison fingerprint, passing selected row and
  its exact immutable confirmation in the same Firestore transaction that creates the note,
  operation receipt and bounded history index. Ten notes per case. Saving a note does not
  change the quotation or requirement revision. Historical notes are never rewritten.
- Recovery: identical requests replay the original receipt even after source edits. A changed
  body under the same key conflicts. A missing receipt is inconclusive; an explicit cancellation
  transaction either records a fence against late saves or returns the already committed ID.
  Known saved IDs reopen the record instead of starting another save. Freshness is separate
  from saved content and can be current, changed or temporarily unknown.
- Frontend: connected React/TypeScript selection/reason/reopen and recovery code uses generated
  API types and strict runtime guards. Six actual local-emulator browser workflow groups passed:
  real save/reload/history; lost response after commit then reload/recovery without duplicate
  POST; recovery from a known-committed summary read failure; missing-receipt cancellation fence
  with reason preservation; stale history after source invalidation while retaining the original
  reason and USD 142,500; required fields, dirty-navigation guards and passing-row-only selection.
  Layouts covered 320/390/768/1024/1600px and 200% root text. Rendered PNGs were inspected for
  hierarchy, wrapping and control alignment. The final redundant scope-detail polish passed
  frontend lint/type checks and 33 private frontend checks. Final desktop/390px rendered review,
  opening the saved disclosure to its exact limitations and another actual form save also passed.
  Broader accessibility certification is not claimed.
- `npm run check` passed: frontend lint/typecheck, **31 frontend tests**, production Vite build,
  backend Ruff/format, **69 backend tests** with **3 existing opt-in skips**, and generated
  API-contract equivalence. These are local checks, not a production release.
- Private commands used `services/api/.venv/Scripts/python.exe -m pytest` with
  `PYTHONPATH=C:/AIBuilderCup-MMSquared/services/api` and flags `-q -p no:cacheprovider`.
  The three invocations targeted OS-temp `greenprocure-saved-selection-tests-20261018/`
  files `test_selection_service.py` plus `test_selection_api.py`, then
  `test_selection_emulator.py`, then the prior OS-temp
  `greenprocure-confirmed-comparison-20261018/test_comparison_service.py`.
  Executable tests, synthetic fixtures, screenshots and detailed reports remain outside
  this repository; only results are recorded here.
- Results: **95 private selection service/API tests passed**, covering immutable snapshots,
  stale revisions/fingerprints/confirmations, failed/unknown rows, owner isolation, human-only
  authority, reason/acknowledgment validation, idempotency collisions, concurrent duplicate
  saves, lost acknowledgments, unavailable receipt readback, cancellation races and the
  concurrent ten-note cap. **1 actual Firestore emulator integration passed**, including
  atomic persistence/replay, unchanged historical data after edit, cancellation and other-owner
  denial. Its unique synthetic records were removed and absence verified. **40 comparison
  regression tests passed** after the shared transaction refactor. The initial loss-response
  fixture was refined to cover both immediate known-receipt recovery and unavailable readback;
  this was a test expectation correction, not a product failure.
- One existing Starlette/httpx TestClient deprecation warning remains. These checks made no
  live AI calls or production writes. No production release is claimed for this branch.
- Backward review against PRD FR-18 and the calculation contract: the implemented record is
  explicitly a `buyer_selection_note`, not a full evaluation or purchase approval. Only a
  current `meets_checked_requirements` row can be chosen; hard failures/unknown required terms
  cannot be overridden by a reason. Original requirements, all comparison outcomes, confirmed
  reference, fingerprint, buyer reason and scope limitations stay frozen. Carbon availability
  and ranking availability remain false. No concrete backend blocker was found within this
  approved restricted scope; full PRD agent/carbon/scenario requirements remain deferred.
- Production preparation: `cloud-build-api.ps1` produced only allowlisted local staged source
  and a hash receipt. `cloud-build-web.ps1 -EnvironmentFile .local/cloud/web.production.json
  -Build` passed production configuration and build. `cloud-deploy-api.ps1` with the existing
  build ID and `-EnableLiveAi`, without `-Deploy`, passed runtime configuration validation.
  These checks made no new cloud requests or writes.
- Release in progress: the user approved three functional commits, push, PR merge and
  deployment. Inspect final change/commit scope, package/publish and build/deploy the authorized
  API and frontend release; record each result only after verification. Verify deployed save/reopen/recovery
  and owner isolation before calling this reduced path live. No carbon/general-agent expansion
  is required for the approved scope. Record release IDs and actual hosted evidence afterward.

## Confirmed quotation requirement checks - 18 October 2026

- Branch: pulled latest `dev`, created and immediately published the comparison branch with
  upstream tracking, then verified the baseline before implementation.
- Backend: owner-scoped `GET /api/v1/cases/{case_id}/comparison`; consistent snapshot of
  requirements and immutable confirmations; bounded race recovery; optional expected revision;
  private no-store response. No writes, PDF reads or model calls.
- Calculation: deterministic Decimal cost/net mass, fibre/GSM/width/construction, MOQ,
  exact full-order quantity, budget and reviewed full-order delivery. Hard failures remain
  failures alongside missing information. Unconfirmed offers expose no calculated metrics.
  Carbon factors, scoring, ranking and durable decisions remain out of scope.
- Frontend: normal React/TypeScript integration, aligned results/mobile cards, check
  explanations, current source review, timestamp/revision and failed-refresh recovery.
- Backward review: checked the confirmed-input-to-understandable-comparison outcome against
  PRD FR-13 through FR-15 and calculation rules. Refined contradictory cost scope, unknown currency,
  optional-check labels, unavailable-mass labels and enlarged-text navigation. A passing row
  never claims complete evaluation or approval.
- `npm run check` passed: frontend lint/typecheck, 31 frontend tests, production build,
  backend Ruff/format, 69 backend tests (3 existing opt-in tests skipped), generated contracts.
  One existing Starlette/httpx deprecation warning remains.
- Private checks outside the repository: 95 domain tests; 40 service/API tests; 26 frontend
  runtime/API guard checks; one real Firestore emulator integration verifying zero writes,
  owner isolation, revision guards and confirmation invalidation.
- Browser: actual local Auth/Firestore/Storage/API, six workflow groups passed. Covered empty
  comparison, four outcomes, server amounts, keyboard disclosure, private PDF, reload,
  failed-refresh recovery and clearing metrics after a real confirmation change.
  Layouts covered 1600/1440/1024/768/390/320px and 200% root text; screenshots inspected.
- Fixtures: explicitly synthetic confirmed records and real emulator PDFs; no live Gemini
  calls or cloud changes. New executable tests, screenshots, PDFs and detailed reports stay
  in OS temp. Implementation commit, push and PR merge were subsequently authorized.
- Next approved increment: save a human buyer selection/rationale with its immutable checked
  comparison, then reopen it. The user accepted this limited demo scope for tonight; it is not
  a complete carbon-aware evaluation or purchasing approval. Carbon ranking, scenarios and
  the general agent are deferred. Deployment remains a separate reviewed release step.

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

## Quotation review UI and backward review - 15 October 2026

- Worked only in `C:\AIBuilderCup-MMSquared`. Preserved the existing workflow-note edits,
  switched to `dev`, ran `git pull --ff-only origin dev`, and created
  `feat/ui-quotation-review` at `38e0caded775ab9b1f1ee31295380f4a5be203a1`.
  Immediately pushed the new branch with upstream tracking under the user's standing
  instruction; `ls-remote` verified the baseline. Implementation remains uncommitted.
  No implementation push, PR, merge, backend change or deployment was performed.
- Added reusable review components with grouped fields, original extraction values, page/
  excerpt provenance, correction/assumption notes, per-field review and explicit unknowns.
  Draft save and human confirmation are separate; confirmation pins quote, case and draft
  revisions. Editing invalidates the affected review and makes an earlier receipt historical.
  Numeric input, composition totals and total/usable-width consistency receive local feedback;
  eligibility, cost, carbon and ranking remain backend responsibilities.
- Added an isolated development walkthrough with eight scenarios and its own labelled
  two-page synthetic PDF. The 23 source citations were checked against the PDF text and pages;
  rendered source pages were visually inspected. It is unrelated to the selected intake
  document and never confirms that intake record. Uploaded-file entry starts with the source
  unavailable. Pending, rejected, unknown and conflicting results have distinct recovery.
  Saved demo drafts/receipts survive Back/reopen within the tab; reload/reset clears them.
- Added `docs/QUOTATION_REVIEW_CONTRACT.md`: a proposal for private source access, versioned
  corrections, human-only confirmation, owner checks, immutable revisions and mutation
  readback. It is not an agreed API or backend implementation. Updated README, the UI plan
  and the standing branch-publication workflow.
- Worked backwards from FR-04/05/06: inspect the source, preserve what was extracted, correct
  mistakes, understand remaining gaps, then deliberately confirm the exact saved record.
  Review caught and fixed stale confirmation context, numeric bounds, assumption provenance
  loss, incomplete deadline feedback and optional extracted values being cleared without
  review. Explicitly reviewed unknowns require a note and retain affected blockers; a known
  failure may be recorded accurately and does not become eligible through confirmation.
  Added a keyboard shortcut to Save/Confirm, persistent source-unavailable limitations, and
  explicit notice that this synthetic case requires no certificate evidence.
- Executed `npm run test --workspace=@greenprocure/web -- --exclude
  src/features/quotations/pdfPreflight.test.ts`: all 26 existing committed frontend tests
  passed. Lint and TypeScript checks passed; the final production build passed. Output scans
  verified that preview execution content and the sample PDF are absent from the production
  bundle. `git diff --check` passed.
- New private model checks: 65 passed, including exact decimal boundaries, dates, provenance,
  reviewed unknowns and cleared optional extraction values. Private browser component checks:
  22 passed, including stale quote/case/draft confirmation guards, disabled pending actions,
  dialog focus and the action shortcut at desktop/320px/doubled text.
- Private browser journeys passed 9 groups and 40 layouts across all eight scenarios at
  320, 390, 768, 1024 and 1440px. They covered corrections, review resets, 30-click save
  bursts, rejection, repeated unavailable readback, separate confirmation, historical receipts,
  retained sessions, conflict comparison/reapply/discard, missing values and source navigation.
  Final refinement checks passed 2 groups / 16 additional layouts at doubled computed text
  size, including explicitly reviewed removal of an optional extracted value.
- Focused uploaded-file/mobile verification passed 35 assertions at 320x800: filename context,
  separate synthetic evidence, source limitations in the confirmation dialog, preserved
  pending native-file selection and no false intake confirmation. The existing intake browser
  regression passed 12 groups / 55 layouts from a temporary copy adapted to the review entry.
  No uncaught browser errors, business/external requests or persistent browser-storage writes
  were observed. Desktop/mobile/enlarged-text screenshots were visually inspected.
- All new executable tests, inputs, screenshots and detailed reports stayed in OS temporary
  storage outside the repository. Existing excluded intake tests were preserved. The sample
  PDF and scenario data are runtime assets for the explicitly labelled development UI.
- Review verdict: ready for user review within UI plus proposed API handoff scope. FR-04,
  FR-05, FR-06 and I1 remain incomplete as connected product capabilities. No real upload,
  extraction, private-source authorization, persisted corrections or server confirmation
  was tested. No live AI, backend/emulator, deployed, real-phone, Safari/Firefox or screen-reader
  verification was performed for this UI-only change. Browser PDF embedding remains dependent
  on viewer support, with an open-original link and an explicit fallback.
- Broader follow-ups: evidence applicability controls, complete cost-adjustment/multi-leg
  editing, approved factor selection and immutable confirmed-field history. The preview
  preserves historical receipts but does not retain/browse their old field snapshots.
  Next: user review at `/quotation-preview.html`, then separately authorized commits/push.
  Backend integration belongs on its own branch after the contract and baseline are agreed.

## Cross-screen UI consistency refinement - 15 October 2026

- The user requested a thorough consistency pass after identifying misaligned quotation
  rows. Kept the refinement on the current uncommitted `feat/ui-quotation-review` branch
  in `C:\AIBuilderCup-MMSquared`; no branch switch, worktree, commit, push or merge.
- Replaced independently sized intake rows with a semantic four-column table. Every desktop
  action shares the same width and left edge, including failed quotations. Narrow layouts
  use labelled records based on available content width. Document metadata is deliberately
  grouped; separate processing/review badges and actionable failure/unknown/retry text remain.
- Consolidated typography, spacing, status colors, button sizing, panel/control/dialog
  corners and modal backdrops. Case form/detail headings now align with the workspace gutter.
  Draft status stays neutral in list and detail. Saved-case navigation is visible at the top.
  Inputs place units beside labels without changing the existing accessible field names.
- Applied global navigation/header wrapping instead of preview-only fixes. Enlarged text
  now wraps navigation and action groups without splitting ordinary words into narrow
  fragments. Long case names no longer squeeze the Back button into several tiny lines.
- Review fields use a quieter unreviewed state. Removed duplicated per-field routine
  guidance while retaining the checklist, correction/missing-data messages and all gates.
  Source references, correction panels, notices, action areas and dialogs use shared styles.
  Review progress reflects marked fields only; it is not eligibility or an AI confidence score.
  Confirmation receipts use readable local date/time text with a timezone label.
- Aligned intake/review preview banners within the same content gutter. Synthetic mode,
  unrelated source evidence and unavailable backend operations remain explicitly disclosed.
  This pass adds no backend capability and does not connect the preview to real suppliers.
- Working backwards: the buyer must scan documents and their two distinct states, find the
  next action, inspect source evidence, correct information, save and deliberately confirm.
  Independent visual review found issues that no-overflow checks missed: cramped header
  actions, enlarged navigation/button word breaks and an inherited font reset that made
  review buttons differ from intake. Those were corrected and rechecked.
- Verification: 26 existing committed frontend tests passed; lint, TypeScript and production
  build passed. Private intake refinement checks passed 11 groups; review styling passed
  72 assertions, then 22 focused final assertions. Exact computed comparison confirmed intake
  and review buttons share 14px / weight 600 / 19.6px line height / 44px minimum / 6px corners.
- Independent workspace/create/detail/help verification passed 40 layouts at five widths
  (1440, 1024, 768, 390, 320), normal and doubled computed text. Seven behavior groups
  verified labels, validation focus, submission callbacks, busy/uncertain guards, navigation
  and unit placement. Representative desktop/enlarged-mobile screenshots were inspected.
- Final private regression passed intake 12 groups / 55 layouts and review 9 groups /
  40 layouts. Review tests retained separate draft/confirmation, unknown-result recovery,
  duplicate protection, conflicting revisions, missing information and historical receipts.
  No uncaught browser errors, unexpected business/external requests or persistent storage
  writes were observed in these preview regressions. Native selection preservation passed.
- All new private tests, inputs, screenshots and detailed reports remain in OS temporary
  storage. No new executable tests or QA screenshots were added to the repository. The
  existing runtime sample PDF/scenarios remain development-only assets.
- Ready for user visual review. Browser checks used local Chromium; real-phone, Safari/
  Firefox and assistive-technology testing remain unperformed. Production backend/auth
  integration was not rerun for this presentation-only change. Backend quotation features
  and full PRD completion remain pending. Implementation remains uncommitted.

## Local quotation-review commit series - 16 October 2026

- User authorized the planned five local commits: shared UI consistency; quotation review
  components; the synthetic walkthrough; proposed API handoff; and project records.
- Work remains in `C:\AIBuilderCup-MMSquared` on `feat/ui-quotation-review`. No implementation
  push, PR, merge, deployment or backend change is part of this commit-only step.
- The first three commits contain the code in dependency order; the last two contain the
  backend proposal and documentation. Private tests, screenshots and detailed reports remain
  outside the commits. The labelled sample PDF and scenarios are development runtime assets.
- Staging identified the PDF being treated as text by local Git settings. Added `.gitattributes`
  to preserve PDF bytes as binary and verified the staged blob equals the original file.
  Removed an extra final blank line in the new handoff document; no runtime behavior changed.
- Independent read-only audit found no accidental credentials/private test artifacts or
  unsupported backend/live claims in the proposed series.
- Executed `npm run build` separately at `befde82`, `a44975b` and `99ac236` in the same
  canonical checkout; all three passed, including TypeScript. Restored the feature branch.
  The last two commits change documentation only; final app/package/script content matches
  the successfully built third snapshot.
- Final `npm run lint` passed. `npm run test --workspace=@greenprocure/web -- --exclude
  src/features/quotations/pdfPreflight.test.ts` passed all 26 committed frontend tests.
  The production output contains no development walkthrough content or sample PDF.
- `git diff --check` passed across the complete committed change. The PDF retained its
  original bytes after checkout of the intermediate snapshots. The five commits cover
  23 reviewed files, including the binary-asset attribute correction.
- This packaging check did not repeat browser, backend/emulator or live-service runs;
  the earlier UI regression evidence and its limitations remain recorded above.
- Next: separately authorized implementation push and PR review against `dev`.

## Supplier comparison UI, backward review and local verification - 16 October 2026

- Verified that `origin/dev` contains the five quotation-review commits through merge
  `f4fafc43ad5c2df436170aa6c530dbc37b7aa2a8`. In the single `C:\AIBuilderCup-MMSquared`
  checkout, switched to `dev`, ran `git pull --ff-only origin dev`, created
  `feat/ui-quote-comparison`, and immediately pushed its starting baseline with upstream.
  `ls-remote` matched that baseline. No implementation commit, push, PR or merge followed.
- Continued the agreed UI plus proposed API handoff scope while backend work remains
  separate. The connected first-evaluation milestone and PRD I1/I2/I3 are not complete.
- Added reusable comparison presentation types, decimal-string display helpers and guarded
  selection. The screen renders supplied eligibility, metrics, ranking and winner; it does
  not calculate procurement outcomes or reorder scores. Per-offer selectable IDs constrain
  the choices, and stale, foreign-case, inconsistent or unresolved results cannot advance.
- Added a seven-column desktop comparison with separate ranked, needs-review and ineligible
  groups, responsive mobile cards, common cost/carbon scope, preference-policy context,
  missing-value reasons and keyboard-accessible checks/mass/route/factor/provenance details.
  An eligible alternative choice preserves the preferred offer and opens only a local handoff.
  No scenario editing, final decision saving, supplier message or purchase occurs.
- Added `/comparison-preview.html`, linked from the quotation preview, with 15 explicit
  synthetic scenarios. This independent canonical example uses 150 cm total width, not the
  review PDF's 152 cm. Its supplied results/reference IDs are never attributed to the user's
  intake/review actions. The canonical A/B trade-off and C/D exclusions match CALCULATION_SPEC.
  Alternate singleton/tie/scenario states are labelled. No browser arithmetic engine or live
  carbon factor is introduced, and no fixture is a fallback for a real service error.
- The development controller pauses for explicit simulated evaluation/explanation/readback
  outcomes, retains the same pending operation after lost responses, guards duplicate starts,
  preserves prior snapshots after failed reads, and verifies references before applying results.
  Refresh readback preserves the evaluation ID; re-evaluation creates a new supplied snapshot.
- Worked backwards from FR-13/14/15 and S4: identify comparable confirmed offers, understand
  exclusions and evidence, inspect the preference result, then choose a permitted current
  offer for human decision review. The audit caught and fixed missing-factor explanation
  retries that could describe a nonexistent winner, an enabled no-op refresh button, misleading
  evaluation labels during explanation requests, and contradictory ranked eligibility checks.
- Visual review fixed tall mobile cards, inaccurate singleton wording, dialog focus/scroll
  position, preview branding and a ready-state heading on blocked inputs. Shared controls,
  status colors, spacing and type scale remain consistent with the previous milestone.
- Executed `npm run lint`, `npm run typecheck`, and `npm run build`; all passed. The final
  build includes TypeScript verification. Executed `npm run test --workspace=@greenprocure/web
  -- --exclude src/features/quotations/pdfPreflight.test.ts`: all 26 committed frontend tests
  passed. The final production artifact contains no comparison preview entry, fixtures or
  demonstration execution content. Source/whitespace checks completed before handoff.
- Private model checks: 57 passed, including exact large decimal-string display, null handling,
  authoritative order, per-offer capabilities, current revisions, foreign-case references,
  contradictory checks and explanation-reference matching. Private controller checks:
  22 assertions passed, covering alternative choice, blocked inputs, absent factors,
  mismatch rejection, stale recovery and verified-read behavior.
- Root browser regression: five journey groups passed for choice/handoff, evidence/focus,
  30-click evaluation bursts, repeated unknown readback, absent-factor explanations and failed
  refresh recovery. One separate component-boundary group passed for live revision/permission
  changes, contradictory results and foreign-case suppression. Two final smoke groups passed
  for cross-preview navigation, blocked heading, branding and unresolved-leave protection.
  No uncaught browser errors, unexpected business/external requests or browser-storage writes
  were observed in the interaction checks.
- Layout regression passed 150 combinations: all 15 scenarios at 1440, 1024, 768, 390 and
  320px, at normal and doubled computed text size. Independent visual checks passed 13 groups,
  including long names, Escape focus return and identical desktop action dimensions. Actual
  desktop/mobile/enlarged screenshots were inspected; overflow checks alone were not used as
  a visual-quality verdict.
- All new executable checks, private inputs, screenshots and detailed reports remain in OS
  temporary storage outside the repository. Runtime demonstration fixtures remain explicitly
  development-only source. No packages, backend routes, generated API contracts or cloud
  resources changed. Browser verification used local Chromium; real-device, Safari/Firefox,
  screen-reader and connected backend/live-AI verification were not performed.
- Added `docs/QUOTATION_COMPARISON_CONTRACT.md` for proposed evaluation/recommendation reads,
  operations/recovery, exact snapshots, capabilities, freshness, grounding and owner checks.
  It requires backend agreement and generated Pydantic/OpenAPI types before integration.
- Ready for user review on the current branch. Implementation remains uncommitted and unpushed.
  Next after review: separately authorized coherent commits/push; scenario UI and final-decision
  workflow remain later branches. Standing instructions now explicitly require continuing
  coding, backward review and refinement through branch readiness before asking for review.

## Comparison hierarchy and explanation-state refinement - 16 October 2026

- Completed the requested follow-up on `feat/ui-quote-comparison` in the canonical checkout.
  Kept the existing uncommitted implementation; no branch switch, commit, push or merge.
- Combined requirements, preference policy and common cost/carbon boundaries into one panel.
  Made re-evaluation secondary, consolidated repeated synthetic notices, and moved provenance
  and scoring methodology into an accessible disclosure below the results. Material missing-data,
  historical, test-factor and exclusion warnings remain visible.
- Added native radio selection with keyboard navigation. Ranked offers now lead directly to
  the matched trade-off explanation and buyer decision review before the excluded offers.
  Longer explanation details are expandable. The initial rendered review still placed the first
  offer at about 1,136px, so a second refinement moved it to about 853px at 1440px viewport width
  with preview controls closed; text sizes were not reduced to achieve this.
- Separated operation kind from its lifecycle state. An optional read-only explanation request
  preserves matching current results, buyer selection and decision-dialog context through
  loading, unknown outcome, readback and failure. Evaluation/refresh or unspecified operation
  kinds retain conservative decision guards. The controller prevents an explanation request
  from clearing an unresolved evaluation failure. Explanation results still require matching
  evaluation references; missing-factor retries cannot invent a ranking.
- Preview controls use a compact disclosure and open/focus when a simulated outcome is needed.
  Expanded fixture details preserve the independent 150 cm comparison versus 152 cm review
  example, fictional provenance and absence of actual calculations, AI or persistence.
- Worked backwards again from FR-13/14/15/18: find comparable offers, understand preference
  and exclusions, choose a permitted current offer, inspect evidence, and review the exact
  unsaved handoff. Independent read-only review found no remaining material blocker within
  this UI plus proposed API-handoff scope. The connected PRD acceptance gates remain pending.
- Executed `npm run lint`, `npm run build` (including TypeScript validation), and the existing
  frontend suite with the private PDF preflight file excluded: 26 tests passed. Production
  artifacts still exclude the comparison preview and supplied fixtures.
- Private validation passed: 81 model assertions; seven browser journey groups for keyboard
  selection, choice/handoff, evidence/focus, duplicate starts, unknown/readback recovery,
  missing factors and optional explanation preservation; two live-prop groups for freshness,
  capability and foreign-result guards; two cross-preview/leave-protection smoke groups.
  Interaction checks observed no uncaught errors, external/API requests or browser-storage writes.
- Rechecked all 150 layout combinations (15 scenarios, five widths from 320 to 1440px,
  normal and doubled text). Inspected actual desktop, mobile and enlarged-text screenshots.
  Independent checks also passed 33 controller assertions and 20 layout/keyboard/dialog checks.
  All new executable checks, screenshots and detailed reports remain outside the repository
  in OS temporary storage; no new test cases or reports are included in feature files.
- Recorded the user's future general-agent direction in the UI plan and comparison handoff:
  one persistent assistant across screens, explicit current record/revision/unsaved-edit context,
  relevant server-authorized actions through the coordinator/specialists, reviewed proposals,
  and actual operation events/recovery. Human confirmation and final-decision boundaries remain.
  No agent control or runtime implementation was added to this branch.
- Ready for user review at the local comparison preview. Backend evaluation, live AI/factors,
  scenario editing and durable final decisions remain separate work. The implementation is
  still uncommitted and unpushed; the remote feature branch remains at its starting baseline.

## Comparison final verification and local commit packaging - 16 October 2026

- User authorized another local verification pass and commits if ready, retaining meaningful
  functionality-based messages. This authorization does not include pushing or merging.
- Reran lint, the 26-test committed frontend suite (excluding the private PDF preflight file),
  and the production build including TypeScript validation; all passed. No application code
  changed during this packaging pass. The build still contains only the normal application.
- Reran 81 private model assertions, seven interaction journey groups, two live-prop guard
  groups and two navigation/recovery smoke groups; all passed. Reran all 150 layout combinations
  and inspected fresh desktop and enlarged mobile screenshots. Browser interaction checks
  observed no uncaught errors, external/API calls or browser-storage writes.
- Independent backward/contract review found no blocker within the agreed comparison UI and
  proposed API-handoff scope. Clarified that the general-agent coordinator and human-facing
  confirmation/decision routes are planned architecture, not implemented runtime capabilities.
- Created four local implementation/handoff commits in dependency order:
  - `71f5f77` — Keep comparison choices tied to current reviewed results.
  - `674cf7f` — Make supplier trade-offs easier to compare and choose.
  - `42e9112` — Add a labelled comparison walkthrough with recovery scenarios.
  - `053270e` — Define the backend handoff for trustworthy quotation comparisons.
- The closing documentation commit records this verification, current status, future general
  agent direction and delivery workflow. Each commit stages only its reviewed file list and
  passes the staged whitespace check. Private executable tests, screenshots and detailed reports
  remain outside the repository; no test cases or QA artifacts are included in the commit scope.
- Scope remains local UI plus proposed contracts. No backend/live-AI deployment or verification,
  scenario editor, durable decision save, implementation push, PR or merge was performed.
  Next delivery step is a separately authorized feature-branch push and PR review into `dev`.

## Scenario exploration implementation and backward review - 16 October 2026

- User confirmed the comparison review/delivery was complete and authorized the next milestone.
  Verified comparison PR #3 in origin/dev at b0caad3971f6f1ec1c744174747ae78305a1ed85,
  updated local dev with git pull --ff-only origin dev, created feat/ui-scenarios and
  published its upstream immediately. Verified the remote branch matches that baseline.
  All work stays in C:\AIBuilderCup-MMSquared; implementation remains uncommitted and unpushed.
- Added reusable TypeScript scenario presentation models, exact decimal percentage validation,
  an editor with five presets and optional relative limits, a pinned Review/Apply proposal,
  supplied baseline-versus-scenario differences, offer details and guarded decision handoff.
  Blank limits are disabled; zero is an active limit. No priority normalization is hidden.
- Preserved original baseline/candidate references, frozen scoring anchors, metric scopes,
  confirmed quote revisions, hard eligibility checks and earlier supplied scenario receipts.
  Relative percentages against zero are unavailable. Scenario thresholds never reinstate
  failed requirements or rescale a sole feasible offer to 100.
- Added the independent scenario-preview.html walkthrough with 11 state examples and 15 exact
  prepared policy/cap combinations. Other valid settings explicitly have no prepared result;
  the browser does not calculate suppliers, call AI, save a scenario or fabricate a fallback.
  Results are supplied only after an explicit simulated outcome, not while typing.
- Unknown operations retain their captured proposal/request and require readback. A confirmed
  scenario with failed evaluation retains its confirmation and resumes evaluation only.
  Defensive mismatch/unavailable-result paths preserve that saved reference. Known rejected
  attempts are distinct from uncertain saves; editing/restoring after an unconfirmed failure
  clears only that obsolete error so a matching previous result can be chosen again.
- Worked backwards from PRD FR-16/18 and S5: change a preference, inspect exact proposed
  settings, confirm deliberately, understand the supplied trade-off, preserve fixed
  requirements and original baseline, then choose a permitted current result. Refined
  incomplete-versus-infeasible wording, removed a known-error no-op readback action, made
  fixed budget/deadline visible, restored result focus and clarified blank-limit instructions.
  Connected deterministic preview, backend confirmation/evaluation and final decisions remain
  separate acceptance gates; this branch does not claim those PRD outcomes are complete.
- Added docs/SCENARIO_CONTRACT.md with proposed deterministic-preview, human-confirmation,
  immutable evaluation, recovery and ownership contracts for Mạnh. These are not implemented
  or agreed endpoints; presentation types require mapping to future generated OpenAPI types.
  The general platform agent remains a separate milestone with human confirmation boundaries.
- Executed frontend lint, the existing 26 committed frontend tests (excluding the private
  PDF preflight file), and production build including TypeScript validation; all passed.
  Production output contains only the normal application and excludes the new preview/fixtures.
- Private validation passed 114 model assertions and 139 fixture/invariance assertions,
  including all 15 prepared policy/cap combinations and unsupported-policy rejection.
  Controller verification passed 36 checks plus 17 prepared-signature cases, with 19 additional
  fault-injection/navigation checks. Independent live-prop testing passed 12 groups covering
  foreign-result suppression, stale/revoked context, proposal invalidation, callbacks,
  duplicate prevention and incomplete-versus-failed-cap presentation.
- Root interaction verification passed five groups for keyboard/evidence/handoff, 30-click
  bursts, repeated unknown recovery, decimal validation/known-error recovery and long names.
  Local interaction checks observed no uncaught browser errors, external/business requests
  or browser-storage writes. An additional 24 focused browser checks cover the known-rejection restoration refinement.
- Layout verification passed 110 combinations: 11 states at 1440, 1024, 768, 390 and 320px,
  normal and doubled text. Six additional long-name layouts passed; independent UI checks
  covered 23 assertions including proposal Escape, draft restoration and result focus.
  Actual desktop/mobile/enlarged screenshots were inspected for hierarchy, wrapping and controls.
- All new executable checks, screenshots and detailed reports stay in OS temporary storage
  outside the repository. No dependency, backend, generated transport contract, cloud resource
  or deployment changed. Local Chromium was tested; other browsers, real devices, screen-reader
  testing and connected backend/live-AI verification were not performed.
- Ready for user review at http://127.0.0.1:5174/scenario-preview.html. Implementation remains
  uncommitted; only the initial empty feature branch is on remote. Next after review is
  separately authorized commit packaging/push. Decision UI remains the next product milestone.

## Scenario commit packaging and delivery - 16 October 2026

- User accepted the scenario readiness review and authorized proceeding with milestone closure.
  Rechecked the 16-file scope and existing evidence; no new implementation changes were needed.
  The audit found no private QA artifacts, credentials, dependency changes or unrelated edits.
- Created four implementation/handoff commits in dependency order:
  - `f2054d8` - Keep scenario choices tied to their original baseline.
  - `6bc6e60` - Review priorities and limits before applying a scenario.
  - `f7dc223` - Explore sourcing scenarios with clear recovery paths.
  - `b31b8ef` - Define scenario confirmation and recovery for backend handoff.
- The fifth commit records progress, implementation limits and the completed review evidence.
  Each commit uses an explicit reviewed file list and passes the staged whitespace check.
  No private test scripts, inputs, screenshots or detailed reports are included.
- The application code is unchanged from the verified scenario review. Existing frontend and
  private browser/model evidence applies; remote PR checks are a separate delivery gate.
  Publication/PR/merge state must be verified from GitHub rather than inferred from this entry.
- The next milestone is decision UI plus proposed backend handoff. Begin it from an updated
  origin/dev after this branch is integrated, and publish its new branch before coding.


## Decision UI implementation and backward review - 16 October 2026

- Delivered the scenario milestone as five coherent commits: f2054d8, 6bc6e60, f7dc223,
  b31b8ef and cf2c53d. Pushed the feature branch, opened PR #4 and verified all three
  GitHub checks passed at cf2c53d82cecaee2dbdd3e48cf5d69b23795f677. Merged with the
  commit history preserved into dev at fa874ead76ea28e5c0f9907298d14852ab17e410.
  PR: https://github.com/GuitarHero2004/AIBuilderCup-MMSquared/pull/4.
- Updated local dev using git pull --ff-only origin dev, created feat/ui-decision-summary
  from that merged baseline and published its upstream immediately before development.
  All work remains in C:\AIBuilderCup-MMSquared. New decision implementation is uncommitted
  and unpushed; the remote branch contains only the approved starting baseline.
- Added reusable TypeScript decision presentation types, source/proposal/receipt validation,
  mandatory human reason and review/immutable-summary UI. Selected offers remain distinct from
  the evaluation preference winner and original scenario baseline. Existing source details,
  common measurement boundaries, fixed requirements and recorded limitations stay accessible.
  No cost, carbon, score or supplier ranking is calculated in the browser.
- Replaced comparison/scenario handoff placeholders with the shared in-page decision workspace.
  Each handoff captures the exact selected quote revision, evaluation, policy and applicable
  baseline/scenario. Back/reopen preserves the parent view, draft, unresolved request and
  verified receipt in that page session. An unresolved decision must be resumed before another
  choice can create a parallel save. The standalone walkthrough has ten labelled examples.
- Added simulated explicit save, matching/mismatched receipt, conclusive rejection, lost
  response, unavailable readback, acknowledged-ID/summary-unavailable, historical summary,
  refresh failure and reopen paths. Unknown outcomes retain the same captured request.
  A known saved ID permits only reading that existing record, never a replacement save.
  Later source changes remain separate from the immutable saved snapshot.
- Worked backwards from PRD FR-18, schema section 23 and S6: review an eligible current offer,
  explain every human choice, save deliberately and reopen exactly what was decided. Refined
  live source/permission invalidation, foreign-case data suppression, hidden pending-session
  navigation/reset guards, saved-versus-unknown wording and duplicate prevention. Missing
  optional recommendation text does not block a valid human choice.
- Refined selected/preferred metrics, source dialogs and focus, policy percentage formatting,
  long names/reasons, narrow/enlarged layouts and status/action consistency. The reason and Save
  area sit beside requirements on desktop and stack on narrow or enlarged views. Fixed a
  character-counter overflow exposed by a long reason at 320px with doubled text.
- Added docs/DECISION_CONTRACT.md as a proposed backend handoff: authenticated ownership,
  exact revision/fingerprint checks, human-only save authority, atomic server-built immutable
  summaries, idempotent committed replay, exact-ID recovery and separate historical context.
  The proposed 2,000-Unicode-code-point reason budget needs backend agreement. Presentation
  types are not generated transport DTOs; all decision endpoints remain unimplemented.
- Executed npm run lint, npm run test --workspace=@greenprocure/web --
  --exclude src/features/quotations/pdfPreflight.test.ts, and npm run build. Lint, all 26
  existing committed frontend tests, TypeScript and production build passed. The excluded
  private PDF test predates this task. Production output contains the normal index and assets;
  decision previews/fixtures are not included.
- Private verification passed 112 model assertions, 29 focused UI assertions and 65 controller/
  integration checks. An independent audit passed 11 live-prop view groups and three controller
  context groups, including foreign-context suppression and same-revision capability changes.
  Browser checks observed no uncaught errors, external/business API requests or storage writes.
- Layout verification passed 100 combinations: ten states at 1440, 1024, 768, 390 and 320px,
  normal and doubled text. An additional extreme-name/long-reason check passed at 320px/200%.
  Actual desktop, saved, recovery, scenario/mobile and enlarged screenshots were inspected for
  hierarchy, wrapping, control sizing and alignment, beyond automated overflow assertions.
- New executable tests, test inputs, screenshots and detailed reports remain in OS temporary
  storage outside the repository. No dependencies, backend, generated API types, cloud resources
  or deployments changed. Verification used local Chromium; other browsers, real devices,
  screen-reader testing, durable persistence and connected backend/live-AI were not verified.
- Ready for user review at http://127.0.0.1:5174/decision-preview.html and through Review decision
  in the comparison/scenario previews. This completes the local UI and handoff scope only;
  connected FR-18/I3 acceptance still requires backend implementation and integration.
  Next step is user review, followed by separately authorized commit packaging and publication.


## Decision commit packaging - 17 October 2026

- User authorized local commits after the readiness review. Rechecked the 17-file scope,
  staged only explicit functionality groups, and verified each staged file list before commit.
  No private test scripts, inputs, screenshots, detailed reports or unrelated files are included.
- Created four implementation/handoff commits in dependency order:
  - `43a38ee` - Keep decisions tied to the exact reviewed offer and reason.
  - `dd203ef` - Review buyer choices and reopen decision summaries.
  - `9c2dd8a` - Connect comparison and scenario choices to decision review.
  - `a80bb2c` - Define decision saving and recovery for backend handoff.
- The fifth commit records the implementation progress, walkthrough instructions, remaining
  integration limits and verified review evidence. Messages include a concise explanation of
  the behavior and purpose. Staged whitespace checks pass for each committed group.
- Packaging removed surplus end-of-file blank lines in the view and handoff document; no
  application behavior changed. The completed local lint/build/unit/private browser evidence
  above still applies. No additional live/backend or cloud verification was performed.
- Decision implementation is committed locally on feat/ui-decision-summary. No implementation
  push, PR, merge or deployment was performed. The upstream remains at the previously published
  starting baseline; the next delivery step is a separately authorized push and PR review.
- Durable decision storage, generated API integration and connected FR-18 acceptance remain
  pending. The in-memory walkthrough and proposed API handoff do not establish those outcomes.

## Connected quotation implementation and backward review - 18 October 2026

- Verified decision PR #5 was integrated into dev, updated the sole checkout with
  `git pull --ff-only origin dev`, created `feat/live-quotation-intake` and published its
  upstream before implementation. Baseline: `3a85601e7a72295f8ac43ea636923c788f82aab0`.
  All implementation remains uncommitted in C:\AIBuilderCup-MMSquared. No implementation
  push, merge or deployment was performed.
- Connected the normal React/TypeScript app to private PDF intake, original-source access,
  direct extraction requests, editable review, saved drafts and explicit human confirmation.
  Existing comparison/scenario/decision walkthroughs remain simulations, with unavailable
  connected actions clearly identified. The production build includes only the normal app.
- Added Pydantic contracts, authenticated FastAPI routes, owner-scoped Firestore transactions
  and private Storage adapters. Generated TypeScript matches the implemented OpenAPI.
  Atomic capacity/revision checks enforce four quotations per case; source generation/hash
  checks bind downloads to the original. The 10 MiB/ten-page PDF parser runs in a bounded child.
  Multipart and JSON stream bytes are bounded before parsing.
- Preserved validated raw extraction separately from edited drafts and immutable confirmations.
  Confirmations record the reviewer, time, source hash, successful extraction reference,
  reviewed values/provenance and unresolved issues. Editing reviewed inputs clears current
  confirmation; earlier snapshots remain readable. Unknown values retain downstream blockers.
  Known unsuitable facts may be confirmed as accurate; malformed values cannot.
- Added idempotent receipts, exact response/revision/source checks, stale-edit comparison and
  deliberate rebase, lost-response readback and reload recovery. Browser session storage holds
  request-reference metadata only. After a named missing-record lookup, an explicit server
  cancellation marker prevents a late original request from committing; bare absence never
  silently unlocks another mutation. Foreign/mismatched responses preserve the local buffer.
- Added the direct Google Cloud Gemini adapter with nullable structured extraction, untrusted
  PDF instructions, no tools, one model call without automatic SDK retries, and bounded time.
  Token/model metadata comes only from SDK response metadata; unavailable usage stays unknown.
  Digital-text excerpts are checked before display. No fabricated citation, factor approval,
  human confirmation or fixture fallback is accepted from model output.
- The total extraction deadline, persisted leases, visitor/global generation budgets, shared
  active-run cap and kill switch bound new work. Expired/crashed/cancelled requests preserve
  the PDF and reconcile to interruption; late results cannot mutate the draft.
  A retry may consume another allowance; exactly-once provider billing is not claimed.
- Locked google-genai 2.31.0, google-cloud-storage 3.17.1, pypdf 6.21.1 and
  python-multipart 0.0.32. The installed Google SDK's enterprise/Google Cloud option and
  explicit ADC/project/location path were inspected. This increment does not implement ADK.
- Worked backwards from FR-03/04/05/06: retain the PDF, reject unsupported input, expose actual
  extraction state, inspect evidence, preserve corrections, confirm deliberately and reopen
  the saved result. Refined composition/date validation, review-dependency invalidation,
  successful-versus-latest extraction references, mismatched receipts, missing-request recovery,
  duplicate notices and truthful source copy. Sample loading, multilingual extraction-quality
  evaluation, evidence-applicability workflow, deterministic eligibility/calculations and the
  general agent remain separate PRD acceptance gates; these requirements are not marked complete.
- Executed `node scripts/python.mjs test`: **69 passed, 3 skipped**. The skips are two opt-in
  emulator checks and one deployed smoke. Ran the emulator checks separately with
  `RUN_EMULATOR_TESTS=1 python -m pytest tests/test_emulator.py -q -p no:cacheprovider`:
  **2 passed**, including actual anonymous tokens, owner isolation and direct browser
  Firestore/Storage read/write denials.
- Executed the private connected/lifecycle suites through pytest against real emulators:
  **11 passed** in the final combined run. Coverage includes upload/source retrieval,
  owner denial, limits, same-key replay, review/confirmation/restart persistence, historical
  snapshots, provider failures, concurrent starts, quotas, deadline/cancellation recovery,
  global limits, malformed values, actual body bounds and missing-request fences.
  Extraction used an explicitly injected no-network test provider, not Gemini.
- Private PDF/provider tests: **33 passed**, including parser rejection, actual Storage
  emulator I/O, SDK call arguments, schema/evidence guards, no retry/fallback and metadata
  separation. The Storage emulator does not enforce every production generation precondition;
  SDK arguments are checked with mocks, and deployed atomicity/privacy remains unverified.
- Executed frontend lint, typecheck, unit tests and production build: all passed.
  **31 unit tests** comprise 26 tracked tests and five pre-existing ignored PDF-preflight
  checks. Backend Ruff lint/format and `node scripts/contracts.mjs --check` passed.
  The existing OpenAPI-path test was updated for the implemented routes.
- Private Chromium checks passed the full upload/extract/source/edit/save/confirm/reload
  journey, unsaved-navigation protection, lost-response receipt recovery, missing-upload
  reload/cancellation with late-request rejection, adversarial receipts and concurrent-edit
  conflict/rebase. Six layouts (1440, 390 and 320px, normal/doubled text) passed overflow checks.
  Actual desktop/mobile/enlarged screenshots were inspected for hierarchy, wrapping and controls.
  The final source-panel copy no longer claims a live model call merely from screen context.
- All newly created executable tests, test inputs, screenshots and detailed QA reports remain
  in OS temporary storage outside the repository. No private credentials or test artifacts
  were added to the feature. The test-provider API was stopped after verification; the ordinary
  emulator-backed API was restored and `/healthz` confirms `ai_enabled: false`.
- Read-only checks of the selected Google project verified Firebase association, billing,
  the active Web app and default Firestore Native database in Singapore. Anonymous sign-in
  was off and Storage had no bucket at the check. User setup and later rechecks are recorded
  in `LIVE_QUOTATION_SETUP.md`; no cloud resources/settings were changed by this increment.
  The initial App Check integration now uses reCAPTCHA Enterprise rather than the previously
  unconfigured v3 provider.
- Ready for local user review of this implementation. Actual Gemini model/location/permissions,
  extraction accuracy, production Storage behavior, App Check, retention configuration and
  deployed incognito smoke remain unverified. Cloud configuration and release are separate
  steps; local emulator success is not full MVP or submission readiness.

## Quotation commit packaging - 18 October 2026

- The user approved committing, pushing and merging this milestone into dev, then branching
  from updated dev to inspect Google setup. Rechecked the complete 38-file scope, staged
  explicit file lists and verified each staged diff. No new executable tests, screenshots,
  private supplier inputs, credentials or runtime artifacts are included.
- Packaged five functionality/documentation groups. The first four commits are:
  - `24f4687` - Keep quotation files private and validate extracted terms.
  - `4829eae` - Preserve quotation reviews through saves and interruptions.
  - `90149f8` - Connect quotation upload, review and confirmation in the workspace.
  - `6e51006` - Prepare Firebase verification and Google connection settings.
- The closing documentation commit records the implemented contract, local verification,
  setup guidance and delivery state. No application behavior changed during packaging;
  the completed local evidence above still applies. Whitespace checks passed.
- Publication/PR checks and merge must be verified at the final commit before starting
  `feat/google-cloud-setup` from updated dev. Google inspection is read-only at this step;
  no deployment, billing/IAM change or actual model call is claimed by this packaging entry.

## Quotation merge and Google setup audit - 18 October 2026

- Published five approved commits: `24f4687`, `4829eae`, `90149f8`, `6e51006` and
  `a4f19a3`. Opened [PR #6](https://github.com/GuitarHero2004/AIBuilderCup-MMSquared/pull/6)
  and verified the remote head was `a4f19a3420500e1de33cde73e07a4e3d62565b9f`.
- Both push and pull-request Checks jobs, plus GitGuardian Security Checks, succeeded.
  The Linux CI jobs installed locked dependencies and passed lint/typecheck/unit/build,
  generated-contract checks and isolated emulator integration.
  [PR validation run](https://github.com/GuitarHero2004/AIBuilderCup-MMSquared/actions/runs/39056403330).
- Merged using the exact expected head SHA and the merge method, preserving all five commits.
  Verified GitHub reported merged at `2e2818d331f25fa2ea07e53ad6331654f0c2c3a1`.
  No protection settings or review policies were bypassed or changed.
- With a clean working tree, switched to dev, ran `git pull --ff-only origin dev`, created
  `feat/google-cloud-setup`, pushed its upstream immediately and verified the remote branch
  matches the merged baseline. No duplicate checkout or worktree was created.
- Read-only cloud inspection used the personal account explicitly for `greenprocure-511917`.
  Verified active project/Firebase/Web app, enabled billing, default Standard/Native Firestore
  in Singapore, enabled model API and an existing Hosting site with no release.
- Anonymous Auth remains disabled; Storage has no buckets. App Check, reCAPTCHA Enterprise,
  Cloud Run, Cloud Build, Artifact Registry and Firebase Storage APIs are not enabled.
  Firestore rules are already deployed and deny every direct-client read/write; no Storage
  rules release exists. App Check provider/key reads returned SERVICE_DISABLED, so their
  configuration remains unverified rather than proven absent.
  The existing Firebase Admin and Compute default service accounts are not a configured
  application runtime identity. A chosen model/location and real provider test remain pending.
- Existing repository files supply a non-root single-service Dockerfile, Hosting configuration,
  deny-direct-client database/storage rules and production environment validation. Cloud Build/
  Cloud Run deployment configuration, selected runtime identity/permissions and production
  frontend/backend configuration are not yet prepared.
- Updated `LIVE_QUOTATION_SETUP.md` with observed readiness and remaining setup. These new
  branch documentation edits remain uncommitted for review. No application code changed,
  cloud setting/API was enabled, resource was provisioned, IAM/billing was changed or model
  was called during this audit. Earlier local and newly successful remote checks remain the
  implementation evidence; no new deployment verification is claimed.
- Next step: complete Anonymous Auth, private Singapore Storage and Enterprise App Check,
  prepare the explicit runtime/build configuration, then obtain the required cloud-change
  authorization for provisioning and deployment. Inspect actual model/location access and
  run a deployed owner-isolation/source/review/confirmation smoke before claiming readiness.

## Authorized Google setup and live release - 18 October 2026

- Completed setup in the existing personal project `greenprocure-511917`, always selecting
  `anhminhnts2004@gmail.com` explicitly. Billing was already enabled. On refresh, Anonymous
  Auth and the Cloud Run/Build/Registry APIs were enabled; retained the existing Firebase
  app and Singapore Firestore. Enabled App Check/reCAPTCHA Enterprise, created the private
  Singapore quotation bucket, deployed deny-direct-client Storage rules and registered an
  Enterprise Web score key for the two Hosting domains. No default ADC/login was changed.
- Added dedicated runtime/build service accounts. Runtime permissions cover Firestore,
  model prediction, Firebase user verification and create/get/delete on the quotation
  bucket. Build permissions cover log writing, source reads and image publication in the
  project's Docker repository. Created a private Singapore build-source bucket. No
  service-account keys or broad Editor grants were created; test impersonation used the
  selected personal identity and short-lived tokens in memory.
- Actual private Storage/Firestore checks passed **10 assertions**: upload and hashed
  readback, real create-only precondition conflict, generation mismatch, unauthenticated
  source denial, Firestore write/read/version and exact synthetic test cleanup. This
  closes the production precondition/privacy gap left by emulator-only evidence.
- The first real Gemini requests exposed unsupported null-only schema/grammar complexity,
  followed by envelope-prefixed citation paths. Simplified only the generation grammar,
  kept strict server validation and rejected application-owned cost/carbon basis IDs.
  Prompt `quotation_pdf_v2` specifies relative citations; canonicalization accepts only the
  known envelope prefix before exact membership/duplicate validation.
- Actual final-adapter extraction using `gemini-3.1-flash-lite` at `global` passed all ten
  smoke checks in **5.22 seconds**: changed PDF price **USD 3.20/metre**, **145 GSM**, 17
  matched citations, missing transport left unknown and PDF approval instructions ignored.
  Actual usage was 2,424 input + 1,177 output tokens. The earlier base response (2.85/130)
  was validated retrospectively after the parser fix; it was not a fresh final-adapter
  success. The subsequent hosted test is recorded separately below. Earlier failed
  attempts are not counted as clean end-to-end passes; there was no fixture fallback.
- Private provider checks passed **50**, then the expanded schema/authority suite passed
  **21** including the two additional application-basis guards. The latter overlaps the
  former suite and is not an additional 21 distinct cases. Backend tests passed **69**
  with three opt-in skips. Two private production health-alias tests and **27** release
  script/configuration checks passed. Ruff, format, generated-contract equivalence and
  production TypeScript/Vite build passed. All new executable tests/input PDFs, detailed
  results and screenshots remain in OS temp, outside this checkout.
- Production release helpers validate the intended project/account, source allowlist,
  runtime settings and immutable build image. Browser build explicitly clears local
  emulator/debug variables. Hosting publication validates the public build receipt,
  exact file hashes and Google upload hosts before finalizing and releasing.
- Final Cloud Build: `95cc74d4-e93f-4739-a559-5ba86b341905`.
  Final image digest: `sha256:8f03e32d3c329b5764d5ed3ce78cf564797692bb69cd04f591937fe45bf79396`.
  Verified all 21 staged source hashes match the final API working tree.
  Cloud Run revision `greenprocure-api-00002-2xp` serves 100% of traffic at
  `https://greenprocure-api-694155506378.asia-southeast1.run.app`.
- Google public routing returned a branded 404 for `/healthz` while internal container
  probes and business routes worked. Added `/api/health` as a public alias excluded from
  OpenAPI, preserving local/probe compatibility. The deployed opt-in smoke passed **1**
  with `RUN_LIVE_TESTS=1`, `LIVE_EXPECT_AI_ENABLED=true` and the exact API URL: health 200,
  production/AI configuration correct, unauthenticated business request 401. Existing
  Starlette/httpx test deprecation warning remains.
- Firebase Hosting release `1792261911497000`, version `36d4aa427f1cee41`, is live at
  **https://greenprocure-511917.web.app**. Three public asset hashes match the reviewed
  build receipt; the fourth published file is that public receipt. Only the normal
  React application is published, without development preview/test pages.
- Production uses mandatory Firebase identity/App Check/owner checks, private source
  storage, 10 extractions per visitor/day, 100 globally/day and two active extractions.
  Cloud Run is bounded to two instances, 1 CPU/1 GiB each, concurrency four, 180-second
  HTTP timeout and scale-to-zero. Model timeout is 90 seconds. These are usage/resource
  controls, not a monetary spending cap. Data is stored in Singapore; the upload notice
  discloses global model processing and no automatic retention cleanup.
- Hosted Chromium journey passed at approximately **01:32 Vietnam time**, using fresh
  genuine anonymous/Auth App Check sessions, with no mock routes or debug token. Created
  a synthetic case, uploaded a private PDF and made exactly **one actual Gemini call**:
  USD 2.85/metre and 130 GSM correctly extracted, unknown transport preserved, no automatic
  approval. Reviewed 36 fields with explicit unknown notes, saved draft revision 2,
  confirmed through the dialog and reopened the current immutable confirmation after reload.
  Actual model metadata: `gemini-3.1-flash-lite`, 2,424 input + 1,177 output tokens.
- Deployed browser security checks passed: absent App Check returned 403
  `APP_CHECK_REQUIRED`, invalid App Check returned 403 `INVALID_APP_CHECK`. A second fresh
  visitor could list its own workspace but received 404 for the first visitor's case,
  quotation and source. Direct Firestore and Firebase Storage reads returned 403. The
  authenticated PDF API returned 200 with `Cache-Control: private, no-store`.
  No JavaScript errors occurred. Actual 1440px/390px screenshots were inspected for
  hierarchy, wrapping and control alignment; neither viewport overflowed. Confirmation
  screenshots caught the brief follow-up readback notice; subsequent reload verified
  the persisted confirmed record. Browser contexts were closed, without saving tokens.
- Final scope review found only the expected source/configuration/documentation changes,
  no secrets or private test artifacts, and no staged files. The API source hashes and
  published static asset hashes match the respective reviewed builds. `git diff --check`
  and generated TypeScript contract equivalence passed. Setup is ready for user review.
- Work backwards from the PRD: this release establishes the live quotation input/review
  foundation. Deterministic cost/mass/carbon/eligibility/ranking, approved factor rows,
  persisted comparisons/scenarios/decisions and the ADK coordinator/specialists are still
  pending. This is not a completed competition MVP. At this release review, Google branch
  changes were uncommitted and unpushed; subsequent commit packaging is recorded below.

## Google setup commit packaging - 18 October 2026

- The user approved the four proposed commit groups and their exact messages. Rechecked
  the expected 16-file scope, staged explicit paths, inspected each staged group and
  verified whitespace checks. No credentials, local environment copies, generated builds,
  synthetic PDF inputs, screenshots or private test scripts are included.
- Created these local implementation commits:
  - `69ea55f` - Fix live Gemini extraction while preserving human review.
  - `5c2504c` - Add a working health check for the deployed API.
  - `04afd55` - Add verified Google builds and production deployment controls.
- The closing documentation commit is **Record the verified live quotation workflow and
  remaining MVP work**. It includes the README, live setup guide and this ledger.
- Packaging changed no runtime behavior; the previous unit/provider/release and actual
  hosted-browser evidence above remains applicable. No model calls or deployment reruns
  were needed. The already deployed API and frontend are unchanged by these Git commits.
- This approval is commit-only. No push, pull request or merge was performed. Publish the
  four commits when authorized, verify remote checks, then proceed from an approved dev
  baseline for the calculation/eligibility milestone.

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
