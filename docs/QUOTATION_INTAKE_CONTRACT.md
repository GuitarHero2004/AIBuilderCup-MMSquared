# Quotation intake: proposed API handoff

**Status:** proposal for Minh and Mạnh to review; not an agreed or implemented API.

**Prepared:** 15 October 2026.

**Branch scope:** UI preparation and backend handoff only. No upload, storage, extraction or
run endpoint is added by this task. The development preview uses explicitly synthetic states
and does not send documents to a server or model.

The buyer outcome is: open a saved case, add one quotation PDF or a synthetic sample, see
whether it was saved, and recover its recorded processing state after an interruption. This
is one part of I1; I1 also requires genuine extraction, source review, human confirmation and
deterministic evaluation.

Sources: [PRD FR-03 and FR-20](GreenProcure_Vietnam_Textile_SME_PRD.md),
[architecture routes and execution lifecycle](ARCHITECTURE.md),
[schema sections 5, 9, 30, 32 and 33](GreenProcure_Vietnam_Textile_SME_Database_Schema.md),
and [UI handoff section 7](UI_UX_PLAN.md#7-frontendbackend-handoff-and-unresolved-contracts).

## 1. Existing authority and proposed frontend boundary

The current API implements case list, creation and read only. It reports AI as disabled.
`ErrorDetail.run_id` currently accepts only null, and CORS does not allow an idempotency
header. These are concrete integration gaps, not evidence of working quotation support.
`CaseRead` and its frontend response guard also currently require revision `1` and status
`draft`. Before connecting quote additions, extend that authoritative model, generated types
and response guard together to accept the actual revision/lifecycle transitions.

Pydantic/OpenAPI will own the final public contract. Generate TypeScript types from it;
do not copy the proposal below into the generated schema. Until then, reusable UI accepts
presentation data and callbacks. A view model is not an API DTO and must not become a second
source of backend truth.

The minimal view model needs:

| Group | Information required by the interface |
|---|---|
| Case | Opaque case ID, saved name, current data revision |
| Quote identity | Opaque quote ID, safe original filename, bytes/pages when known, upload/sample origin, explicit synthetic label |
| Document/review | Existing quote status, draft revision, confirmed revision reference, missing-information count when inspected |
| Latest run | Run ID, existing run status, live/fixture mode, safe error, retryability and timestamps; null before any run |
| Capacity | Enforced maximum quotes, remaining slots, PDF bytes/pages limits |
| Actions | Available upload/sample/extraction actions and a safe reason for each unavailable action |
| Disclosure | Actual processing/storage policy and configured retention notice, or a clearly unresolved state |

Null means unknown/not inspected, including a missing-field count before extraction. Zero
must not stand in for that state. A file's successful upload never implies it has been read,
confirmed, deemed eligible or compared. Prototype callbacks simulate clearly labelled UI
scenarios only; they must not call production APIs or imply persisted state.

## 2. Endpoint proposal

All paths below include the existing `/api/v1` prefix. **None is implemented today.**
"Designed" means already listed in architecture, not agreed request/response fields.

| Method and path | Basis | Proposed responsibility |
|---|---|---|
| `GET /cases/{case_id}/quotes` | New collection proposal | Return up to four owner-scoped quote summaries, current case revision, intake limits/capabilities, sample metadata and disclosure |
| `POST /cases/{case_id}/quotes` | Designed upload route | Validate and persist one uploaded or selected sample PDF; return saved quote and new case revision; never start an implicit charged extraction |
| `GET /cases/{case_id}/quote-intakes/{request_key}` | New recovery proposal | Resolve one owner's intake attempt after a missing/invalid response, without reading another visitor's operation |
| `GET /cases/{case_id}/quotes/{quote_id}` | Designed read route | Read saved quote state; final review fields remain a later contract |
| `GET /cases/{case_id}/quotes/{quote_id}/document` | Designed source route | Stream the authorized original PDF with safe content headers; never return a public bucket path |
| `POST /cases/{case_id}/agent-runs` | Designed run route | Explicit bounded `extract_quote` request using saved source identity and expected revisions |
| `GET /cases/{case_id}/runs/{run_id}` | Designed run route | Read durable recorded state/result references; reconcile an expired lease |
| `GET /cases/{case_id}/runs/{run_id}/events` | Designed event route | Read bounded, ordered, safe events from actual execution |

No cancel, quote delete, source replacement or bulk-upload capability is implied. Do not show
working controls for those actions before their backend contracts exist. Replacing a source
requires a new quote/source identity; the handling of a full four-quote case then needs an
explicit remove/archive policy, outside this intake slice.

## 3. Collection response

Proposed response fields, with names to finalize in Pydantic:

- `case_id`, `case_data_revision`, `items`, `limits`, `capabilities`, `samples`, `data_handling`.
- Each item: `id`, `source_file` (safe name, MIME, bytes, pages, SHA-256; no private object path),
  `source_kind` (`upload` or `synthetic_sample`), `is_synthetic`, `draft_revision`, `status`,
  `confirmed_revision_id`, `latest_run`, `missing_field_count`, `created_at`, `updated_at`.
- `latest_run` is null or a bounded summary: `id`, `status`, `ai_mode`, `started_at`,
  `completed_at`, and safe `error`. Do not expose raw extraction/model output in the list.
- `limits`: `maximum_quotes_per_case`, `remaining_quote_slots`, `maximum_file_bytes`,
  `maximum_pdf_pages`, and `accepted_media_types`. Remaining capacity accounts for active
  upload reservations, not only completed quote records.
- `capabilities`: upload/sample/extraction availability and safe blocking reasons. Run
  allowance may be separate metadata, but its period/reset time and active-run reference
  must be explicit when returned. Avoid publishing global budget/capacity internals.
- Each sample: allowlisted `id`, `version`, safe display name/filename, bytes/pages if known,
  `is_synthetic: true`, availability. Do not include hidden expected extraction answers.

Return a stable order (creation time then ID). The four-quote limit makes pagination unnecessary
for this collection. Counts/statuses come from persisted state. Refresh invalidates old-owner
data immediately; an unauthorized or missing case returns the same owner-scoped 404.

## 4. Add one PDF or sample

Proposed transport: `multipart/form-data` on the existing designed POST route, with
`Idempotency-Key` header and these fields:

| Field | Uploaded PDF | Synthetic sample |
|---|---|---|
| `source_kind` | `upload` | `synthetic_sample` |
| `expected_case_revision` | Required integer | Required integer |
| `file` | Exactly one PDF | Absent |
| `sample_id`, `sample_version` | Absent | Required allowlisted reference |
| `is_synthetic` | Explicit user declaration; not a verified fact | Server forces true |

Final form shape and synthetic-only public-demo policy require Mạnh's confirmation. An upload
must not silently inherit a sample's synthetic label or imply the original document is verified.
No client-supplied UID, private object path, quote ID or extraction answer is accepted as authority.

Validate authentication, App Check policy, owner, revision, capacity and request bounds before
expensive work. Enforce bytes while reading, then validate signature/MIME, parseability,
encryption, page count and the supported input policy. A filename extension or client check
is insufficient. Store the original privately and compute SHA-256 server-side.

For a sample, resolve the versioned server allowlist, copy its actual PDF into the owner's
case and use the same validation/storage/extraction functions as an upload. Do not load an
expected JSON answer into runtime state. Both paths consume a quote slot and use identical
explicit extraction and review steps.

Proposed success: `201` with `{ quote, case_data_revision, request_key }`; idempotent replay
returns `200` with the same committed quote. The new quote is `uploaded`, with no run or
confirmed revision. Initial `draft_revision` (proposed `0` before an extracted draft exists)
must be finalized with the review contract. Adding a quote increments case data revision and
invalidates dependent current evaluations; it does not rewrite historical evaluations/decisions.

Storage and Firestore are not one transaction. Reserve the slot and operation key atomically,
write to a private staging object, and only acknowledge success after recording the committed
quote/source generation and case revision. Define reconciliation for abandoned reservations
and orphaned objects. A half-written object is not a saved quote; cleanup is separately
authorized according to the repository's retention policy.

## 5. Duplicate prevention and uncertain uploads

Idempotency uniqueness is owner + case + request key. Scope or namespace intake keys separately
from run keys. Persist the reservation before writing the source. Bind the key to canonical
request metadata and the server-verified file hash/sample version; the same key with different
content returns a conflict. Do not globally deduplicate by supplier name or disclose another
visitor's matching file hash.

The proposed intake readback returns `request_key`, `state`, nullable `quote_id`, nullable
`case_data_revision`, safe `error`, and `retryable`. Suggested **operation** states are
`receiving`, `saving`, `committed`, `rejected`, `interrupted`; these are not new quote/run enums.
An expired reservation is reconciled before reporting its terminal state. How long keys and
reservations remain available is part of the retention/lease decision.

After timeout, disconnect, malformed success or ambiguous server failure:

1. Keep the selected filename and operation key; state that the result is unknown.
2. Disable a fresh-key submission and read the intake operation plus current quote collection.
3. If committed, show the saved quote. If still active, report recorded state without promising
   background completion. If definitively rejected/interrupted, offer the permitted recovery.
4. A 404 readback alone is not proof that the first request cannot still arrive. Resubmit only
   with the **same** key and same content after explicit user action, relying on server
   idempotency; after refresh the browser may require the file to be selected again.
5. If readback also fails, preserve the uncertain state. Never automatically create another
   quote or launch extraction. A lost response must not consume a second quote slot.

Retain only opaque pending-operation references as needed for recovery; do not persist tokens,
raw PDF bytes or supplier contents in browser storage. Clear identity-bound references and
visible records when Firebase UID changes. A new key is a new operation, not a harmless retry.

## 6. Recorded processing state and extraction handoff

Keep schema quote states unchanged: `uploaded`, `extracting`, `needs_review`, `confirmed`,
`failed`. Keep schema run states unchanged: `running`, `succeeded`, `awaiting_review`, `failed`,
`cancelled`, `timed_out`, `interrupted`. Display them as separate document/review information.

| Stored evidence | Honest interface meaning |
|---|---|
| Quote uploaded; no run | PDF saved; extraction has not started |
| Actual running extraction | Extraction in progress; no invented percentage or tool events |
| Awaiting review with saved draft | Extraction produced a draft; buyer review is required |
| Failed/timed-out/interrupted run | Processing did not finish successfully; show recorded reason and permitted recovery |
| Confirmed revision reference | Human confirmation exists; not a statement of eligibility |

Proposed run body: `intent: "extract_quote"`, `quote_id`, `expected_case_revision`,
`expected_draft_revision`, plus an idempotency header. The source identity/hash is resolved
server-side. Final naming and result refs belong to the run contract; do not expand the entire
extraction/review schema in this UI task.

Execution remains inside the bounded authenticated HTTP request, with safe streaming events if
supported. No `202` plus untracked background task. Persist the run before calling the provider.
The same key returns stored results or current run state and never launches another run.
Return enough information to recover the run ID after a lost initial response; recommended
follow-up is a shared owner/case/key operation lookup or run-key lookup. The intake collection's
latest run is useful but is insufficient to unambiguously resolve every older request.

Disconnect/timeout requires cancellation or persisted interruption and lease reconciliation;
GET status is readback, not an execution trigger. An explicit new extraction retry can consume
allowance and may incur provider charges after an ambiguous failure. Do not promise exactly-once
model billing. Never silently replace live extraction with fixtures. Extraction success should
produce `awaiting_review` plus the saved draft reference; a generic `succeeded` without draft
evidence must not enable review/confirmation.

## 7. Limits, errors and disclosure

PRD mandates at most four quotes per case and one PDF per extraction run. Proposed defaults
remain 10 MiB, 10 pages, one active run per visitor, 40 model generations per visitor per day,
1,000 globally per day and a 120-second run budget. These are **not implemented guarantees**.
The UI must display effective server configuration; enforce applicable reservations and quotas
transactionally across instances before provider work. Do not hardcode apparent allowance.

Keep the existing safe error envelope: `code`, `message`, `retryable`, `request_id`, `run_id`.
Mạnh must widen `run_id` from null-only to nullable string, support the selected idempotency
header in CORS, and decide safe operation/retry/reset metadata. Suggested intake codes:

| HTTP | Code proposal | UI recovery |
|---|---|---|
| 401 / 403 | Existing identity / App Check errors | Restore verification; never retain another owner's view |
| 404 | `CASE_NOT_FOUND`, `QUOTE_NOT_FOUND`, `INTAKE_NOT_FOUND` | Owner-scoped missing state; apply uncertain-write rules |
| 409 | `STALE_CASE_REVISION`, `IDEMPOTENCY_CONFLICT`, `INTAKE_IN_PROGRESS`, `ACTIVE_RUN_EXISTS` | Refresh/reconcile or open recorded operation; no blind retry |
| 413 | `PDF_TOO_LARGE` | Show enforced byte limit and choose a smaller document |
| 422 | `UNSUPPORTED_PDF`, `ENCRYPTED_PDF`, `PDF_PAGE_LIMIT`, `UNREADABLE_PDF`, `SAMPLE_UNAVAILABLE` | Explain the specific correction; no partial success |
| 429 | `QUOTE_LIMIT_REACHED`, `RUN_QUOTA_EXCEEDED` | Show capacity/allowance and server-provided retry timing if applicable |
| 503 / 504 | `STORAGE_UNAVAILABLE`, `RUN_UNAVAILABLE`, `RUN_TIMEOUT` | Read back uncertain mutations; preserve known source/quote state |

Before public upload, disclose Google model processing, private original/source/derived storage,
configured retention and loss of access if anonymous-session identity is lost. Request only
synthetic/non-confidential inputs. No retention duration or residency guarantee is established
in the repository. Null/unconfigured retention must not be rendered as "deleted automatically"
or "stored forever". Public upload remains unavailable until the policy is configured and
tested; local prototype copy must say no real upload/AI occurs.

## 8. Mạnh handoff and acceptance evidence

No message has been sent to Mạnh by this task. Proposed decisions to resolve together:

1. Confirm endpoint/form/envelope shapes; collection metadata versus separate capability reads;
   initial draft revision; quote-status transitions and case revision changes.
2. Implement shared owner checks, private source storage, bounded validation, cross-instance
   capacity reservations and idempotent operation readback/reconciliation.
3. Supply/version real synthetic PDFs and keep answer keys out of the runtime sample path.
4. Finalize extraction-run start/readback, idempotency recovery, lease expiry, actual events and
   quota reporting. Keep source review/confirmation contracts in their subsequent task.
5. Choose enforced limits and retention/cleanup policy; configure public-upload availability.
6. Generate OpenAPI/TypeScript contracts and connect the UI only after the contract is reviewed.

Backend acceptance evidence required before claiming connected intake:

- An uploaded PDF and selected sample persist privately and reload after refresh/restart.
- Unsupported/encrypted/oversized/too-many-page inputs fail clearly without a committed quote;
  a fifth quote and concurrent over-capacity submissions are rejected server-side.
- Another visitor cannot list/read a quote, source, intake operation, run or event.
- A dropped successful response and repeated same-key submission produce one quote and one
  revision increment; a mismatched payload conflicts; interrupted staging is reconciled.
- A stale case revision does not silently add a quote against obsolete state.
- A sample uses its actual PDF in the same path; a changed PDF changes subsequent extraction.
- Starting a run is explicit; repeated keys do not duplicate it; expired leases and interrupted
  requests have truthful persisted states; explicit retries disclose possible allowance use.
- Browser session changes discard old-owner state; effective limits and retention notices match
  configuration. Full live extraction and deployment claims require their own executed evidence.

These are acceptance criteria, not executed test results. Complete this task's backward review
by checking that every displayed action/status has either a verified backend dependency or an
explicit prototype label, and that a saved PDF is never presented as a reviewed quotation.
