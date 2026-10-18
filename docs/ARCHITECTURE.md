# GreenProcure — technical architecture and contracts
**Version:** 2.1 · **Revised:** 4 October 2026 · **Status:** implementation design, not a tested system

## 1. Stack and deployment boundary
| Layer | Choice | Responsibility |
|---|---|---|
| Web | React/Vite/TypeScript, Tailwind | Five views, forms, review, comparison, Activity panel |
| Static hosting | Firebase Hosting | Public frontend and optional PR previews |
| Identity | Firebase anonymous Auth | Per-visitor UID; token sent to backend |
| App attestation | Firebase App Check | Verify public business API requests alongside identity and ownership |
| API | Python/FastAPI, Pydantic | Auth/state guards, upload, typed API, orchestration |
| Agents | Google ADK | One coordinator, two agent-as-tool specialists |
| Model | Gemini on Google Cloud; official Google Gen AI SDK | PDF extraction and bounded reasoning |
| Business database | Firestore | Revisions, snapshots, decisions, runs/events and quotas |
| Document storage | Private Cloud Storage | PDFs and raw structured extraction artefacts |
| Runtime | One Cloud Run service/container | API and all agents together |
| Operations | Cloud Logging + Cloud Monitoring | Safe structured logs, latency/error/quota/model-use metrics and alerts |
| Delivery | GitHub checks, Firebase frontend deploy, Cloud Build → Artifact Registry → Cloud Run | Reviewed backend image and release; existing frontend previews |
| Server secrets, if needed | Secret Manager | Actual server secrets only; Google service access uses runtime identity |

These are team choices; the supplied competition excerpt names Firebase/Firestore/Cloud Run/
Gemini, not every framework above. ADK supports agent-as-tool delegation [S01] and deployment
to Cloud Run [S02]. Keep all agents in process; no microservices just for agent count.

Google's current model-platform documentation uses Gemini Enterprise Agent Platform, the
evolution of Vertex AI [S23]. This terminology does not move the ADK runtime off Cloud Run.
Use the official Google Gen AI SDK; verify its backend-selection options during implementation.

## 2. Runtime flow
```text
Browser on Firebase Hosting
    │ Firebase ID token + App Check token + HTTPS; fetch-stream for long agent runs
    ▼
Cloud Run: FastAPI
    ├── verify identity, App Check, quota, revisions, ownership
    ├── ordinary endpoints → domain services (no model required)
    └── ADK coordinator
          ├── AgentTool(quotation_specialist)
          │     └── extract one PDF, gaps, clarification draft
          └── AgentTool(sourcing_specialist)
                └── reviewed case → deterministic evaluation/scenario tools

Shared services → Firestore + private Storage
Agent/model layer → Gemini via Google Cloud service identity
All executed tools → bounded run events + structured logs/monitoring
```
Use agents-as-tools rather than combining transfer-based `sub_agents` and AgentTool for the
same specialist. Both specialists return results to coordinator; neither delegates back.
No peer delegation cycle. The terms “subagent” and “specialist” here mean actual subordinate
ADK agents invoked through this explicit mechanism, not additional cloud services.

## 3. Agent definitions and permissions
| Agent | Receives | Allowed capabilities | Must not do |
|---|---|---|---|
| coordinator | Auth-bound case/run context, user intent, safe summaries | Delegate to specialists; assemble response refs | Approve data, calculate winners, change constraints |
| quotation_specialist | One authorised PDF ref and expected extraction schema | Extract, identify missing/ambiguous fields, draft clarification | Confirm fields, access another owner, decide sourcing |
| sourcing_specialist | Confirmed case/quote revisions and policy | Call evaluation/scenario preview, explain returned metrics | Read arbitrary PDFs, alter confirmed inputs, make purchases |

Keep specialised prompts short and versioned in source. The tool service derives owner and
case from trusted request context; any supplied case/quote ID is checked within that scope.
PDFs/user messages/tool text never alter allowlists or authority. Treat quoted instructions
inside a PDF as document content, not system instructions.

## 4. Concrete tool contracts
All results use `{status, result_ref, data, warnings, error}`. Errors have stable codes.

**Coordinator tools**
- `consult_quotation_specialist(quote_id, intent)` — bounded delegation for extraction/gaps.
- `consult_sourcing_specialist(intent, scenario_id)` — bounded delegation for confirmed data.

These describe domain tool names; implement using the installed ADK AgentTool mechanism,
with an adapter if required. Do not claim this exact wrapper signature is built into the SDK.

**Quotation tools**
- `extract_quote_pdf(quote_id, expected_draft_revision)` → draft fields, provenance, gaps;
  a separate schema-constrained Gemini extraction call reads the PDF.
- `get_quote_review_state(quote_id)` → current draft and missing fields.
- `store_clarification_draft(quote_id, text)` → copyable draft only, no send.

**Sourcing tools**
- `get_confirmed_case()` → authorised immutable quote refs plus unresolved blockers.
- `evaluate_sourcing_options(scenario_id, expected_case_revision)` → immutable evaluation
  ID, eligibility, computed ranking, winner and limitations.
- `preview_sourcing_scenario(baseline_evaluation_id, proposed_policy)` → nonapproved preview
  or proposal requiring confirmation; never commits a change in requirements.

Domain functions inside those tools: textile checks, cost normalisation, net/gross mass,
leg emissions, feasibility, score normalisation and baseline deltas. The same functions are
available to direct UI endpoints. Do not turn each arithmetic function into a separate LLM agent.

There is deliberately no `confirm_quote`, `approve_scenario`, `save_decision`, email, shell,
arbitrary URL fetch or resource-creation tool in any agent's allowlist.

## 5. Human review, state and grounding
A quotation agent produces a draft and a review-required result, then its request ends.
The browser presents fields/evidence and submits explicit confirmation to a human-only API.
A later sourcing request starts a fresh, bounded ADK session reconstructed from Firestore.
In-memory agent history is not a business database; do not add local SQLite as durable state.

The evaluation engine, not coordinator narrative, owns recommendation eligibility/winner.
Validate structured explanations against evaluation refs. Render exact amounts from saved
metrics. If the model contradicts the snapshot, reject/repair within a bounded attempt or
show explanation unavailable while retaining the actual results.

Gemini PDF input and structured outputs have model-specific support [S03]. Separate extraction
from orchestration so a request does not assume every model supports schema+all tools together.
Configure model IDs and locations; verify actual capability with a live smoke test before release.
P0 targets digital Vietnamese/English quotation PDFs. Measure scanned variants separately;
do not claim general scan accuracy. Retain source-page/excerpt evidence for human review.
Consider Document AI later only if measured extraction gaps justify another service [S20].

## 6. API boundary
Prefix `/api/v1`. Except `GET /healthz` and static frontend assets, business routes require a
verified Firebase ID token. Firebase documents server token verification [S05]. Use request
models without UID/approval authority fields supplied by the caller.
Public business routes also verify Firebase App Check tokens [S16]; this does not replace
Firebase Auth, owner checks, quotas or the human-only endpoint boundaries below.

| Method/path | Purpose | Important guard |
|---|---|---|
| POST `/cases` | Create case or clone synthetic template | Auth; per-user cap; visible assumptions |
| GET `/cases` | List own cases | Derive UID server-side |
| GET/PATCH `/cases/{case_id}` | Read/edit requirement | Owner; expected revision; invalidate results |
| POST `/cases/{case_id}/quotes` | Bounded PDF upload | Owner, limits, content/hash checks |
| GET `/cases/{case_id}/quotes/{quote_id}` | Read review state | Owner |
| GET `/cases/{case_id}/quotes/{quote_id}/document` | Stream private source PDF | Owner; safe content headers |
| PATCH `/cases/{case_id}/quotes/{quote_id}/draft` | User corrections | Expected draft/case revision |
| POST `/cases/{case_id}/quotes/{quote_id}/confirm` | Create immutable confirmed revision | Human endpoint; no agent exposure |
| POST `/cases/{case_id}/agent-runs` | Bounded extraction/advice request | Auth, quotas, idempotency, intent allowlist |
| GET `/cases/{case_id}/runs/{run_id}` | Read run state/result refs | Owner, not global run enumeration |
| GET `/cases/{case_id}/runs/{run_id}/events` | Read safe actual activity events | Owner; bounded pagination |
| POST `/cases/{case_id}/scenarios` | Human confirms scenario | Expected case revision; proposal shown in UI |
| POST `/cases/{case_id}/evaluations` | Direct deterministic evaluation | Reviewed data, current confirmed scenario |
| GET `/cases/{case_id}/evaluations/{evaluation_id}` | Read snapshot plus stale flag | Owner |
| POST `/cases/{case_id}/decisions` | Human saves eligible selection | Fresh snapshot; record reason |
| GET `/cases/{case_id}/decisions/{decision_id}` | Saved in-app summary | Owner |

`POST agent-runs` supports bounded intents `extract_quote|draft_clarification|explain_evaluation|
propose_scenario`. Reject unknown tool/action names. The coordinator may delegate only within
that intent's permission set. Pydantic/OpenAPI owns exact bodies; generate TS contracts.

Error contract example:
```json
{
  "error": {
    "code": "STALE_CASE_REVISION",
    "message": "The case changed. Review the latest data before continuing.",
    "retryable": false,
    "request_id": "example_request_id",
    "run_id": null
  }
}
```
Suggested status mapping: 401 auth; 403 App Check; 404 owner-scoped not found; 409 stale/active run; 413 size;
422 bad data; 429 quota; 502 provider/invalid response; 504 timeout. Do not leak other user IDs.

### First contextual assistant implementation (18 October feature branch)

The full contracts above remain the target architecture. The first assistant increment is a
bounded saved-record assistant implemented separately from direct PDF extraction. It uses
Google ADK `2.12.0` in the same FastAPI process with `AgentTool`; the coordinator invokes one
appropriate Quotation or Sourcing Specialist, which reads authorized saved context. The
provider selects typed fact IDs/focus/missing-field references. Server rendering owns displayed
amounts, statuses, clarification wording and action targets. It has no business-write tool.

| Implemented route under `/api/v1/cases/{case_id}` | Purpose |
|---|---|
| `POST /assistant-runs` | Await a bounded authenticated turn with an idempotency key |
| `GET /assistant-runs` | Read at most the latest 20 case-scoped turns |
| `GET /assistant-runs/{run_id}` | Read a result with current-input status |
| `GET /assistant-runs/{run_id}/events` | Read actual safe recorded activity |
| `GET /assistant-operations/{request_key}` | Recover the exact submitted attempt |
| `POST /assistant-operations/{request_key}/cancel` | Cancel or close an unresolved attempt |

The browser polls recorded events while the original POST stays active; token streaming is
not implemented in this increment. The request ends after completion, cancellation, disconnect
or its 120-second deadline. Firestore holds `assistant_runs`, `assistant_operations` and a
bounded `assistant_state/index` below the existing owner-scoped case. Each ADK invocation uses
a fresh in-memory session reconstructed from authoritative current facts and at most two
completed, same-scope prior turns. In-memory state is not durable business storage.

The current bounds are six model generations, eight tool calls and two specialist delegations.
Before each actual generation, a transaction counts shared visitor/global daily use and
checks the existing kill switch and active-run lease. Provider retries are disabled. Completed
answers retain source fingerprints; changed inputs invalidate actions and are rechecked before
an answer is persisted. Human-only confirmation/selection endpoints remain outside the tools.

The React drawer lives above individual views. Child screens publish typed record references,
saved revisions, busy/dirty flags and context generations. Browser context is a navigation hint;
server reads establish authority. Unsaved values are not sent. Action cards call existing
navigation guards and field-focus handlers rather than inventing arbitrary routes or DOM clicks.
Current actions open quotation intake/review, refresh comparison, or reopen a saved selection.

## 7. Streaming and execution lifecycle
Use authenticated `fetch` streaming (NDJSON or equivalent) for an agent run. Avoid native
EventSource assumptions about attaching a bearer header. Keep model/tool work inside the
active HTTP request with cancellation and an application deadline. No `202 accepted` plus
untracked FastAPI background task; Cloud Run process lifetime is not a job queue.

Persist run start, safe events and result refs. Disconnect/timeout ends or marks the run
interrupted; do not promise it will keep working after disconnect. The status route retrieves
recorded progress/result, not a claim of asynchronous completion. A lease expiry reconciles
process crashes. A future durable worker/queue requires a separate scope decision.

Proposed app run budget: 120 seconds; maximum eight model generations across the entire
coordinator/specialists/extraction tree, maximum twelve domain-tool calls and two specialist
delegations. Count nested calls, token/output budgets and retries, not only root turns.
One automatic provider retry only for transient failures within the same budget; stop repeated
identical failing calls. Four PDFs are processed as separate bounded runs, not one giant request.

Activity messages are produced by callbacks/tool wrappers after actual work starts/completes.
Show no hidden chain-of-thought, invented progress or raw sensitive payload. UI cancellation
and retry must be explicit and respect idempotency/quotas.

## 8. Security and Google runtime configuration
Use ADC/service identity for deployed Google Cloud model/data access; no service-account
JSON in browser or Git. Model, region and billing remain prerequisites, not assumed available.
Do not download service-account keys. Use Secret Manager only for actual server secrets if
needed, with runtime IAM access [S19]; it is not a substitute for ADC/service identity.
App data goes through backend; direct Firestore/Storage client access is denied by default.
Server SDKs bypass Firestore Rules [S06], so shared service methods enforce owner/state.

Verify App Check in the Python API using the supported server verification mechanism [S16].
Confine debug tokens to development; never accept them as public-release configuration.
Do not promise Python token consumption/replay protection without supported, tested APIs.

Cloud Run's HTTP endpoint may be public at the infrastructure level so Firebase-authenticated
browsers can reach it; Firebase tokens are checked by FastAPI. A Firebase token is not a
Cloud Run IAM identity token. Account for project policy restrictions during deployment.
Explicit CORS allowlist includes actual frontend/approved previews; it is not access control.

Cloud Logging captures supported application logs [S10]; Cloud Monitoring adds metrics and
alerts [S17]. Record request/run ID, agent/tool, latency, errors, quota denials and model use,
including available token counts. Avoid auth tokens, PDF contents and full personal data.
Keep run IDs in logs; aggregate metrics by bounded categories rather than per-run or per-visitor
labels. Keep estimated model cost distinct from actual billing. Retain the model-call kill switch,
distributed quotas and small instance/concurrency limits before release. Alerts-only billing
budgets do not enforce a hard spending cap [S24].

The public demo must disclose processing, retention and anonymous-session loss before upload.
Set the retention period with the team; do not imply parent-record expiry deletes child records
or Storage objects. Preserve private access and follow the schema's explicit cleanup policy.

## 9. Deployment choices and configurable values
Browser calls the configured Cloud Run API directly. Firebase Hosting rewrites have a
60-second request timeout [S09]; do not route a potentially longer agent run through one.
SPA fallback should serve the web index for frontend routes only.
For backend delivery, Cloud Build builds the image, Artifact Registry stores it and the
reviewed release deploys to the existing Cloud Run service [S18]. GitHub checks and Firebase
frontend previews retain their existing responsibilities. Deployment still needs authorisation.

Backend config to validate: `APP_ENV`, `AI_MODE`, `SUBMISSION_MODE`, `GOOGLE_CLOUD_PROJECT`,
`GOOGLE_GENAI_USE_VERTEXAI`, `GOOGLE_CLOUD_LOCATION`, `GEMINI_MODEL`, `FIRESTORE_DATABASE_ID`,
`STORAGE_BUCKET`, `ALLOWED_ORIGINS`, run/quota limits. Cloud Run deployment region and model
location are distinct choices; verify support instead of forcing the same value.
`GOOGLE_GENAI_USE_VERTEXAI` is an illustrative existing SDK selector, not a promised universal
flag. Verify the installed SDK's supported Google Cloud backend selector and model/location
settings against current official documentation [S03, S23] before implementation.
Frontend config: Firebase web config, `VITE_API_BASE_URL`, emulator flags. No admin credentials.
App Check provider configuration must separate development debug setup from the public release.

`AI_MODE=fixture` is explicit development mode. `SUBMISSION_MODE=true` rejects fixture AI,
test-only factors and missing live credentials. A credentials error must not activate fixtures.
The SDK/emulator setup must not point local tests at production by accident.
Google sign-in through account linking is P1 after I4, preserving the existing anonymous UID
and owned data where supported [S21]. Maps, Search and Workspace integrations are not new P0
dependencies. Cloud Carbon Footprint concerns cloud-service emissions, not quotation logistics
factors; it cannot replace the reviewed transport-factor dataset [S22].

## 10. Monorepo boundaries
The local foundation now implements web cases, API models/services/Firestore adapter,
Firebase emulators, generated OpenAPI types and checks. See README for the actual runnable
tree and commands. The broader target below also includes later product components:
```text
package.json + package-lock.json  Root npm workspace and single JavaScript lockfile
apps/web/                  React/Vite application and tests
  src/features/            Feature UI and form state
  src/api/generated/       TypeScript contract generated from FastAPI OpenAPI
services/api/
  app/api/                 FastAPI routes and auth
  app/models/              Pydantic schemas / API contracts
  app/domain/              Pure textile/cost/carbon/scenario functions
  app/agents/              Coordinator + two specialists, prompts, tool wrappers
  app/services/            Authorised business logic and revision guards
  app/adapters/            Firestore, Storage, Gemini adapters
  tests/                   Pure/unit/integration/live opt-in tests
  Dockerfile
  pyproject.toml + lockfile
fixtures/source/           Clearly synthetic source JSON
fixtures/generated/        Generated synthetic PDFs, not answer keys
services/api/tests/fixtures/ Expected extraction JSON and test-only factors
infra/firebase/            Hosting config, deny-direct-access rules, needed indexes
infra/cloud/               Cloud Build config and documented deployment
.github/workflows/         Checks and approved frontend deploy/preview
```
Domain calculations, ADK agents, fixtures and cloud delivery directories are future work,
not empty scaffold folders. The backend is a modular monolith: routes call owner-authorised
services; services use adapters; future pure calculations remain independent of SDKs.
Frontend feature components and hooks own presentation/form state; a mandatory MVVM layer
is unnecessary for this two-person React app. MERN is a different technology stack and does
not match the selected Python/Firestore architecture.
Do not add Turborepo, Kubernetes, LangChain, Redis, another database or Terraform by default.
A root API folder is acceptable in an existing repo if boundaries/tests remain clear.

## 11. Release evidence
Show an actual Gemini call and two actual specialist delegations across the demonstrated
workflow; passing mocked tests is insufficient. Verify denied cross-user access, field review,
A/B trade-off, stale/no-feasible behaviour, reference-factor provenance and incognito access.
Record the precise deployed commit, Firebase frontend URL, Cloud Run service and health/smoke
outcomes in IMPLEMENTATION_STATUS. Do not put fabricated URLs or “all tests pass” in README.
Trace PRD service acceptance to actual Firebase identity/App Check, private file access,
Firestore persistence, Gemini calls, ADK events and monitoring evidence. Report extraction
quality by language/input type, interruption/retry behavior and live versus fixture results.
