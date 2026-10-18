# Buyer selection note contract

**Updated: 18 October 2026.** The reduced hosted buyer-selection journey is deployed and
verified. Final source and release evidence are in
[PR #11](https://github.com/GuitarHero2004/AIBuilderCup-MMSquared/pull/11). Cloud Run revision
`greenprocure-api-00005-c2k` serves 100% of traffic; Hosting version `e09fa612e61d0c14` is live.
A fresh hosted run passed two real extractions, explicit reviews/confirmations, deterministic
comparison and immutable selection save/reopen after reload. App Check and owner-isolation
checks also passed. The broader carbon/ranking/general-agent PRD remains incomplete.

## 1. Approved scope and buyer outcome

The buyer chooses a current confirmed quotation that meets the available requirement checks,
records a reason and reopens the exact saved comparison later. The record is a
`buyer_selection_note`. It does not place an order, approve a supplier, calculate carbon,
rank offers or claim a complete sourcing recommendation.

This reduced demo scope was expressly accepted for the current deadline. It implements the
human choice, rationale, immutable history and freshness parts of
[PRD FR-18](GreenProcure_Vietnam_Textile_SME_PRD.md). Full ranked/carbon-aware evaluations,
scenarios and the general ADK agent remain deferred. The earlier
[full decision proposal](DECISION_CONTRACT.md) and its development walkthrough are separate.

The note uses the [implemented confirmed-quotation checks](QUOTATION_COMPARISON_CONTRACT.md),
not a browser-created evaluation. A passing row means only that all checks in
`confirmed_quote_checks_v1` pass or are explicitly not applicable. Carbon and ranking
availability remain false, and the buyer explicitly acknowledges this limitation.

## 2. Routes and authority

All paths have prefix `/api/v1/cases/{case_id}`. Existing Firebase identity, case ownership
and configured App Check verification apply to every operation. The backend derives the
owner from the verified session. Unknown and other-owner cases receive the same safe 404.
Successful responses use `Cache-Control: private, no-store`.

| Method and path | Behavior |
|---|---|
| `POST /selections` | Human saves a note with an `Idempotency-Key`; returns a `SelectionOperation` with HTTP 201 |
| `GET /selections` | Read up to ten saved summaries, newest first, with remaining slots |
| `GET /selections/{selection_id}` | Read the immutable note and separate current freshness context |
| `GET /selection-operations/{request_key}` | Read the exact save receipt without changing state |
| `POST /selection-operations/{request_key}/cancel` | Fence an unresolved attempt, or return its existing committed receipt; no request body |

No agent tool exposes these save operations. The service requires an explicit server-only
`actor="human_route"` argument and rejects any other actor. That authority is not accepted
from request JSON. The caller cannot submit trusted owner IDs, calculated amounts, approval
flags or a replacement snapshot. No model call or external side effect is part of saving.

## 3. Create request

Pydantic/OpenAPI is authoritative; TypeScript types are generated from it. `SelectionCreate`
contains exactly these fields:

| Field | Meaning |
|---|---|
| `expected_case_revision` | Integer 1 through 1,000,000 from the displayed comparison |
| `expected_input_fingerprint` | Exact lowercase 64-character SHA-256 fingerprint |
| `selected_quote_id` | Selected quote's lowercase 32-character opaque ID |
| `expected_confirmed_revision_id` | Exact immutable confirmation referenced by that row |
| `selection_reason` | Visible plain text, trimmed, 1–2,000 Unicode code points |
| `acknowledge_limitations` | Explicit JSON boolean `true`; numeric/string substitutes are rejected |

Reasons permit internal line feeds and tabs. Other C0 controls, DEL, empty/whitespace-only
and Unicode-format-only reasons are rejected. Extra request fields are forbidden.
`Idempotency-Key` is 8–100 ASCII letters, digits, underscores or hyphens.

The server recomputes the comparison from authorized stored inputs. It requires the exact
case revision/fingerprint and selected confirmation, plus selected row status
`meets_checked_requirements`. `does_not_meet_requirements`, `needs_review` and `unconfirmed`
rows cannot be selected. A rationale cannot override hard failures or missing required facts.

The same Firestore transaction reads the current input snapshot and writes the new note,
receipt and history index. Discovery races are bounded by the existing comparison service.
No model work, network request or nested transaction occurs inside the acceptance callback.
The case's source-data revision and quotation contents are not changed by saving a note.

## 4. Immutable record and current context

Owner-scoped records use these existing-repository paths:

```text
users/{uid}/cases/{case_id}/selections/{selection_id}
users/{uid}/cases/{case_id}/selection_state/index
users/{uid}/cases/{case_id}/selection_operations/{sha256_request_key}
```

`SelectionRecord` stores server-generated `id`, `case_id`, `record_type`, `created_at`,
`selected_by_uid`, `selected_quote_id`, `selected_confirmed_revision_id`, `selection_reason`,
`case_data_revision`, `input_fingerprint`, `comparison_snapshot` and `limitations`.

The full `CaseComparison` snapshot preserves the requirement, all candidate row outcomes,
selected confirmation reference, exact decimal metrics, checks and comparison limitations.
The original confirmed revision remains the immutable source for reviewed terms and their
provenance. There is no PATCH/delete route for saved notes in this increment. A later human
selection creates a separate record, subject to the ten-note limit; it does not rewrite history.

`GET /selections/{selection_id}` returns `SelectionRead`:

- `selection`: the original immutable record.
- `current_context`: current `case_data_revision` when known, `is_current` and an explanation.

`is_current=true` means the newly read input fingerprint matches the saved fingerprint.
`false` means inputs have changed. `null` means the current comparison could not be verified;
the saved note is still returned with that explicit uncertainty. Freshness is an observation
at read time, not a guarantee against later edits. Historical metrics are never replaced by
current metrics in the saved record.

`SelectionList` returns `case_id`, `items`, `maximum_selections: 10` and
`remaining_selection_slots`. Items contain saved IDs/references, buyer reason, timestamp,
source revision/fingerprint and the selected supplier/source name. Listing history performs
no writes and does not silently open or substitute the newest note.

## 5. Idempotency, uncertain outcomes and cancellation

`SelectionOperation` contains `request_key`, `case_id`, `kind: "selection_save"`,
`state: "committed" | "cancelled"` and nullable `selection_id`. A committed receipt always
has the exact saved ID; a cancelled receipt never does.

The normalized create body has its own request fingerprint. Repeating the same key/body
returns the recorded receipt, including after the quotation or requirement changes. A changed
body with an existing committed key returns 409 `IDEMPOTENCY_CONFLICT`. Recovery is checked
before attempting to interpret current inputs as a new save. A recoverable commit acknowledgment
failure may be resolved immediately by reading its already committed receipt.

If a response remains uncertain, retain the original request reference and read its operation.
A 404 `OPERATION_NOT_FOUND` is only an absence of a recorded outcome at that read; it does not
prove an earlier request cannot still commit. It does not authorize a fresh duplicate save.

Explicit cancellation shares the operation document with save:

- If save already committed, cancellation returns that same committed receipt and ID.
- If no operation exists, cancellation writes a durable cancelled receipt. A late save with
  that key returns 409 `OPERATION_CANCELLED` and cannot create a note.
- Repeating cancellation returns the existing receipt. The operation does not delete a note.

Once a saved ID is known, read that record instead of issuing another save. After a successful
cancellation, a new attempt needs newly reviewed inputs and a new key. Ten committed notes
per case are enforced atomically, including concurrent saves; existing receipts remain
recoverable at the limit.

The connected UI keeps only the pending request key and known saved ID in session storage,
scoped by owner and case. Unsaved reason text and comparison content stay in memory. The
pending operation blocks another save/navigation until resolved. Local browser checks verified
these recovery paths, including reload, lost responses and known saved-record read failures.

## 6. Expected errors

| Status/code | Meaning and recovery |
|---|---|
| 403 `HUMAN_REVIEW_REQUIRED` | The service was not invoked through its human authority boundary |
| 409 `STALE_CASE_REVISION` / `STALE_COMPARISON` | Refresh and review the current comparison before a new attempt |
| 409 `SELECTION_UNAVAILABLE` | Selected row or exact confirmation is not currently selectable |
| 409 `IDEMPOTENCY_CONFLICT` | The key already belongs to a different submitted note |
| 409 `OPERATION_CANCELLED` | That exact attempt was closed; it cannot create a late note |
| 409 `SELECTION_HISTORY_CHANGED` | Bounded history discovery could not stabilize; refresh |
| 429 `SELECTION_LIMIT_REACHED` | Ten notes already exist in the case |
| 404 `CASE_NOT_FOUND` / `SELECTION_NOT_FOUND` | Resource is missing or unavailable to this owner |
| 404 `OPERATION_NOT_FOUND` | Outcome unknown; perform explicit recovery/cancellation, not a duplicate save |
| 503 `SELECTION_DATA_UNAVAILABLE` / `COMPARISON_DATA_UNAVAILABLE` | Stored data could not be verified; preserve the exact request/record reference |

Shared authentication, input-validation and storage-unavailable errors retain the standard
API error envelope and request ID. An error alone is never displayed as proof that a write
could not have committed.

## 7. Executed evidence and remaining gates

Private tests outside the repository passed **95 selection service/API cases**, **one real
Firestore emulator integration**, and **40 comparison regression cases** after the shared
transaction refactor. They cover owner isolation, strict human authority, exact snapshot
freshness, immutable history, invalid/nonpassing selections, replay after edits, payload/key
conflicts, lost-response recovery, cancellation races, concurrent duplicates and the ten-note
cap. The emulator used a unique synthetic owner; its known records were removed and absence
verified. No live AI or production data was involved.

Six actual local-emulator browser workflow groups also passed: save/reload/history, committed
lost-response recovery without duplicate POST, known saved-summary read failure, missing-receipt
cancellation, unchanged historical notes after source edits, and form/navigation/selection guards.
Rendered screenshots at 320/390/768/1024/1600px and 200% text were inspected.
`npm run check` passed frontend lint/typecheck, 31 frontend tests/build, backend lint/format,
69 backend tests with 3 existing opt-in skips, and generated-contract equivalence.

Final UI polish passed frontend lint/type checks, 33 private checks and rendered desktop/390px
review. The saved disclosure opened its exact limitations, and another actual form save passed.
Local API-source staging, the production frontend build and runtime deployment-configuration validation also
passed without new cloud requests or writes.

The three functional commits were pushed and PR #9 merged with all three CI checks passing.
The final hosted run against Cloud Run `greenprocure-api-00005-c2k` passed two real extractions,
explicit reviews/confirmations and both checked comparison rows (USD 142,500 / 20 days and
USD 139,000 / 23 days). A saved note reopened unchanged after reload with its exact snapshot.
Comparison and save made no AI calls. Missing App Check returned 403; another normal owner
received 404 on all four tested read routes. Hosting remains version `e09fa612e61d0c14`,
release `1792330094439000`. Final hosted comparison and saved-note screenshots passed
visual review at desktop 1440px and mobile 390px with no clipping or overlap.

See PR #11 and
[the verification ledger](IMPLEMENTATION_STATUS.md) for build and release evidence.
The full PRD remains broader than this accepted demo: carbon factors, scoring/ranking,
scenarios and the general agent are deferred. This evidence does not claim competition
submission or acceptance.
