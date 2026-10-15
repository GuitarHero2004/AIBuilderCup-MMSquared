# Quotation review: proposed API handoff

**Status:** proposal for Minh and Mạnh to review; not an agreed or implemented API.

**Prepared:** 15 October 2026.

**Branch scope:** reusable review UI and an explicitly simulated local preview. This branch
adds no backend, storage access, model calls, persisted corrections or real confirmations.
The preview is not completion evidence for PRD FR-04, FR-05, FR-06 or the I1 vertical slice.

The buyer outcome is: inspect an original source beside interpreted fields, correct mistakes
without losing their provenance, save a draft, then deliberately confirm that exact saved
revision. Confirmation records a human review; eligibility and ranking remain separate,
deterministic outcomes.

Authority: [PRD FR-04–FR-06](GreenProcure_Vietnam_Textile_SME_PRD.md),
[schema sections 9–13 and 29–32](GreenProcure_Vietnam_Textile_SME_Database_Schema.md),
[architecture sections 4–6](ARCHITECTURE.md), [calculation rules](CALCULATION_SPEC.md), and
[the preceding intake proposal](QUOTATION_INTAKE_CONTRACT.md).

## 1. Existing implementation and integration boundary

The API currently has case list/create/read and health routes only. There are no quotation,
draft, source-document, confirmation or review-operation routes. `CaseRead` fixes revision to
`1` and status to `draft`; the frontend response guard reflects that subset. CORS currently
allows only GET/POST and lacks an idempotency header. These need coordinated backend/model/
generated-type changes before connecting this screen. `ErrorDetail.run_id` is null-only.

Pydantic/OpenAPI owns the final transport contract; generate the frontend types from it.
The reusable UI's presentation fields and callbacks are not a second API schema. Do not
copy this proposal into the generated contract or pretend the preview talks to these routes.

Proposed review state distinguishes:

- Saved source identity and immutable raw extraction/run reference.
- Current editable draft, its revision and the case data revision.
- Unsaved browser edits, which are not a persisted draft.
- Last immutable confirmed revision, if any, and whether it still matches the current draft.
- Review issues by affected capability: technical, cost, delivery, carbon, evidence, ranking.
- Recorded mutation outcome, including an unknown outcome after a lost response.

A previously confirmed snapshot remains historical after an edit. Its presence must not mark
new draft values confirmed or make a stale evaluation current.

## 2. Proposed routes

All paths use `/api/v1`. The first four are already described by architecture; their payloads
and behavior below are proposals. The operation lookup and immutable-revision read are new.

| Method and path | Responsibility |
|---|---|
| `GET /cases/{case_id}/quotes/{quote_id}` | Read owner-scoped draft, original extraction provenance, current requirements/revisions, issues and confirmation reference |
| `GET /cases/{case_id}/quotes/{quote_id}/document` | Stream the original authorized PDF, bound to the stored source identity |
| `PATCH /cases/{case_id}/quotes/{quote_id}/draft` | Save explicit user corrections and review decisions against expected case/draft revisions |
| `POST /cases/{case_id}/quotes/{quote_id}/confirm` | Create an immutable human-confirmed snapshot of the exact saved draft |
| `GET /cases/{case_id}/quotes/{quote_id}/review-operations/{request_key}` | Resolve a specific save or confirmation after a missing response |
| `GET /cases/{case_id}/quotes/{quote_id}/revisions/{revision_id}` | Retrieve an authorized immutable confirmed snapshot for historical readback |

Every route verifies Firebase identity, configured App Check policy, case owner and quote
membership. Derive UID from verified request context, never from submitted reviewer fields.
Another owner's IDs get the same safe not-found response as absent IDs. No direct browser
Firestore/Storage access, public object path or broad download credential is required.

Confirmation is exposed only through the human-facing route. It is absent from coordinator
and specialist tool allowlists and denied at shared service boundaries for agent-origin calls.
A `human: true` body flag is not proof of authority. The browser requires a deliberate user
action; the server verifies the authorized principal and human-route execution context.

## 3. Reading the review and its source

Proposed response groups, to finalize in Pydantic:

| Group | Required information |
|---|---|
| Identity | Case/quote IDs, current `case_data_revision`, safe name, `is_synthetic` |
| Source | Safe filename, bytes/pages when known, SHA-256 and stable source version; availability and safe reason; no object path |
| Extraction | Run ID, actual live/fixture mode, extraction version, bounded read-only original values and source references |
| Draft | `draft_revision`, schema-shaped `draft_data`, field provenance and saved review decisions |
| Issues | Exact field path, code, message, severity and `blocks` array from the existing schema |
| Confirmation | Nullable immutable revision ID, confirmed draft revision, server reviewer/time and whether it is current |
| Requirements | Requirement snapshot/reference and current revision needed to explain review decisions |
| Capabilities | Save/confirm/source availability and safe blocking reasons; current active mutation/run if relevant |

Preserve the existing schema's commercial, textile, supply-chain and evidence structures.
Use bounded decimal strings for monetary amounts, dimensions and percentages; null for
unknown values. Keep original Vietnamese/English excerpts unchanged. Locale parsing and unit
ambiguities must be resolved explicitly, not guessed from display formatting.

The source endpoint serves only the stored original generation whose hash matches the draft's
source reference. Return safe PDF content headers and private/no-store cache policy. A future
inline viewer may need byte ranges; decide and test that transport before adopting one.
Authenticated fetch plus a short-lived browser object URL is one possible UI adapter; revoke
it when the source/quote/identity changes or the view unmounts. Do not put bearer tokens in a
PDF URL, cache supplier documents in browser storage or send the PDF to a third-party viewer.

Page numbers are one-based, bounded by the parsed PDF page count and tied to the same source
hash. A field reference should show the actual available page/excerpt and whether the source
can currently be opened. Missing source, invalid page, unmatched hash, missing excerpt and
unverified reference remain visibly unavailable. None permits invented page text or a claim
that evidence was verified. A rendered preview excerpt is not an original PDF.

Synthetic local documents and manually authored fixture fields must be labelled as such.
Displaying a synthetic PDF does not prove live extraction. The proposed production route
must be implemented and ownership-tested before claiming private-source review works.

## 4. Saving corrections without replacing extraction evidence

Proposed PATCH body:

```json
{
  "expected_case_revision": 7,
  "expected_draft_revision": 2,
  "source_extraction_run_id": "recorded_run_id",
  "changes": [
    {
      "field_path": "textile_specification.gsm",
      "value": "132",
      "source_type": "user_correction",
      "note": "Corrected against the fabric-weight line on page 1.",
      "source_reference": {"page_number": 1}
    }
  ],
  "review_decisions": []
}
```

The header carries `Idempotency-Key`. This example is illustrative, not an accepted API DTO.
Use an allowlisted typed update model, not arbitrary JSON paths or generic object merging.
Nested arrays such as composition, freight legs and evidence reviews need bounded typed
updates with stable IDs or atomic whole-array replacement; never address an obsolete row
silently after a concurrent change. Unknown keys/paths and forbidden server fields are rejected.
Omitted values mean no change; explicit null clears a value. A blank input is not numeric zero.

`review_decisions` is a proposed companion structure keyed to exact field value/provenance,
not a new public enum replacing schema `review_state`. It may record a human's checked value,
explicitly unresolved value, acknowledged assumption or evidence-applicability choice while
saving a draft. Only confirmation promotes eligible field records to `confirmed`. Final shape
and persistence need agreement because the current schema does not define pre-confirmation
checkbox state. An edit resets the affected check; dependent basis decisions must also reset.

The server derives old/new corrections from the stored draft and checks the extraction/source
reference. It owns reviewer identity, timestamps and document hash. Never trust a submitted
`review_state: confirmed`, `confirmed_by_uid`, timestamp, raw extraction or result eligibility.

Keep raw extraction immutable. Retain its original evidence separately when a user changes a
value. A corrected field becomes `user_correction`, and the original excerpt remains the
extraction's evidence rather than being relabelled as proof of the new value. If the replacement
has no verified document support, the reviewer must identify it as a `user_entered_assumption`
with a reason and limitation. Merely changing the value does not manufacture a citation.
Reference identifiers must belong to this quote/source or to an approved reference record.

Specific review requirements:

- “15 days” does not become full-order end-to-end calendar days by default. Keep production,
  shipping, full-order arrival, day-zero and overlapping periods distinct.
- Usable width screens technical fit; total width supports mass calculation. Reusing one for
  the other requires an explicit assumption and preserved limitation.
- Per-kg price uses net fabric mass, not gross cargo. Actual mass must cover the same order.
- Cost basis and included/excluded charges must match the case. No invented freight inclusion,
  automatic currency conversion or double-counted adjustment.
- Missing mode, distance, reference factor or required evidence stays null/unresolved.
- Evidence applicability is a human choice for the case; it never claims issuer verification.
  A user assumption cannot fabricate a missing certificate or an approved transport factor.

Successful save returns the authoritative saved draft, new draft/case revisions and operation
receipt. In one transaction, validate expected revisions, apply changes, increment each
revision once and invalidate current dependent results. A semantically identical request must
not accidentally increment twice; finalize no-op behavior explicitly. Preserve historical
confirmations/evaluations/decisions. A later re-extraction must also guard revisions and cannot
overwrite unsaved browser corrections without a visible conflict/reload decision.

## 5. Confirming the saved revision

Proposed POST body contains `expected_case_revision`, `expected_draft_revision`, the saved
extraction/source reference and explicit acknowledgments bound to that exact saved draft.
It carries its own `Idempotency-Key`. It does not carry unsaved replacement field values.
Save the draft first, verify the returned revision, then require the buyer's confirmation.
No combined Save-and-confirm action and no automatic confirmation after save/readback.

Before committing, the server reloads current requirements/draft/source, checks ownership,
expected revisions, validated types, provenance and required review decisions. It recomputes
issues rather than trusting a client count or disabled-button state. A confirmed revision
must record `confirmed_by_uid`, `confirmed_at`, `draft_revision`, `source_file_sha256`,
`source_extraction_run_id`, `validated_data`, `field_provenance` and `corrections` as in schema.
Create it, update the pointer/status, increment case revision and invalidate dependent current
results atomically. Confirmation need not increment the draft revision if its data is unchanged;
this exact rule needs agreement. No model call belongs in this transaction.

**Proposed distinction to agree before backend integration:** explicit review can record an
accurate but unsuitable quotation, or reviewed data that still has known missing information.
Confirmation must not require changing a known hard failure into a passing value. It also must
not label absent/unverifiable data as a confirmed fact. Separate unresolved issues and their
capability blocks from positive reviewed field facts in the immutable snapshot.

| Situation | Confirmation / downstream meaning |
|---|---|
| Unsaved edits, stale revision, unresolved write outcome, malformed field or unchecked required review decision | Block confirmation and explain the exact recovery |
| Known reviewed technical, MOQ, budget or deadline failure | May record the reviewed facts; deterministic eligibility remains `ineligible` |
| Required value, source support or evidence is absent/unresolved | Retain the gap and specific blocks; it is not a pass or a fabricated confirmed value |
| A permitted assumption was explicitly reviewed with provenance/limitation | Retain assumption; whether it satisfies a gate is decided by domain policy, not by the checkbox |
| All required reviewed data passes screening and common metrics are complete | May become eligible only through deterministic evaluation |
| Noncritical note absent | Does not suppress otherwise known metrics or block review unnecessarily |

A known hard fail outranks unknowns for eligibility classification, but display both. Missing
carbon is not zero; a complete ranking requires all three comparable metrics even at zero
carbon weight. Required evidence still unresolved cannot be bypassed with an assumption.
Confirmation is never a recommendation, supplier certification or purchase approval.

The preview uses this proposed policy: an explicitly reviewed missing value with an explanatory
note may be confirmed as an acknowledged gap; an unreviewed/unexplained missing value or
invalid format blocks confirmation. Missing fields retain their domain blockers and are not
promoted to confirmed factual values. This policy still needs backend agreement.
The UI must expose the selected policy and show blockers honestly; it must not claim the
proposal is already a backend rule. Do not introduce blanket requirements for optional notes,
actual gross mass when an allowed labelled proxy exists, or evidence the case does not require.

## 6. Lost responses, duplicate clicks and stale edits

Scope idempotency to owner + case + quote + mutation kind + request key. Bind the key to the
canonical request body and expected revisions. Persist operation state before mutation; record
its final result atomically with the saved draft/confirmation. Replaying the same key/body
returns the stored receipt even if the case revision has since advanced. Validate ownership
before this lookup, and look up a matching committed operation before rejecting its old expected
revision. A mismatched body conflicts. No duplicate revision or confirmation is created.

Proposed operation result: `request_key`, `kind`, `state` (`processing`, `committed`,
`rejected`, `interrupted`), `result_refs`, committed case/draft revisions, safe error and
permitted recovery. These are operation states, not changes to quote/run enums. Leases,
retention and interrupted-operation reconciliation need agreement with the intake proposal.

After timeout, disconnect, malformed success or ambiguous server error:

1. Preserve the in-memory edit buffer, base revisions, submitted snapshot and operation key.
   Show “Save result unknown” or “Confirmation result unknown”, never a success message.
2. Block new-key mutations and confirmation; resolve this operation and read current quote
   state. Do not infer success merely from a matching value or a quote's latest timestamp.
3. If committed, acknowledge that exact receipt. If the server has a later revision, explain
   the newer state and reconcile separately; do not overwrite later edits with the old receipt.
4. If active, retain the pending state without promising untracked background work. If a
   definitive rejection/interruption guarantees no commit, offer the documented recovery.
5. A missing lookup/404 is not proof the original request cannot arrive. Any safe replay must
   use the same key and same submitted snapshot; fresh-key retry waits for a terminal outcome.
6. Failed readback remains unknown and never silently enables confirmation or a second write.

While an outcome is unknown, freeze the submitted version or maintain a clearly separate
newer edit buffer; never label later unsent edits saved by an earlier response. Do not silently
persist supplier values/PDFs/tokens to localStorage. If opaque operation references are stored
for recovery, bind them to the owner and clear them on identity change. Losing a browser-only
edit buffer on refresh must be disclosed; add an unsaved/unknown-outcome leave warning.

On HTTP 409 stale revision, keep local edits and their original base. Read the newer saved
state and let the buyer review differences before reapplying changes against new revisions.
Never silently overwrite the newer server draft, auto-confirm it, or carry old acknowledgments
onto changed facts. Discarding local edits requires an explicit action. Requirements changed
elsewhere also invalidate affected assumptions and confirmation context.

## 7. Errors and handoff decisions

Keep the existing safe error envelope: `code`, `message`, `retryable`, `request_id`, `run_id`.
Add typed field issues/current revision metadata only through the authoritative API model.
Avoid returning supplier content or raw backend exception details in errors/logs.

| Proposed status/code | Expected UI recovery |
|---|---|
| 401/403 identity or App Check error | Restore verification; clear old-owner visible data on identity change |
| 404 quote/source/revision unavailable | Owner-safe unavailable state; no invented source content |
| 409 `STALE_CASE_REVISION`, `STALE_DRAFT_REVISION` | Preserve edits, read newer state and require explicit reconciliation |
| 409 `IDEMPOTENCY_CONFLICT`, `REVIEW_OPERATION_IN_PROGRESS` | Resolve the existing operation; never blindly create another |
| 422 `INVALID_REVIEW_INPUT`, `REVIEW_DECISIONS_REQUIRED` | Link exact fields/basis decisions and retain edits |
| 409/422 `SOURCE_REFERENCE_CHANGED` | Stop confirmation, reload the matching source/draft and review again |
| 503/504 or malformed response after mutation | Treat outcome as unknown until operation readback resolves it |

Mạnh's integration decisions: final models/envelopes and field limits; saved review-decision
shape and confirmability policy; provenance checks/assumption policy; source transport and
availability handling; atomic revision/idempotency receipts and retention; human-only service
context; stale-result invalidation; generated types and coordinated CORS/error-model changes.
No message or document has been sent to Mạnh by this task.

## 8. Evidence required before calling this connected review

The following are acceptance requirements, not executed test results:

- The owner opens the actual stored source corresponding to the field citation; another visitor
  cannot read its PDF, review, operation or immutable revision.
- Corrections survive reload and a fresh backend process; raw extraction remains unchanged.
- Draft save cannot confirm; confirmation records exactly the acknowledged saved revision and
  verified human principal. Agent tools cannot invoke it through direct or indirect dispatch.
- Missing source/evidence stays unavailable, null is never zero, assumptions stay identifiable,
  and confirmed ineligible data never becomes a recommendation.
- A dropped save/confirmation response and repeated same-key request create one mutation;
  later server edits do not confuse old operation readback with the latest saved draft.
- Stale requirements/draft conflicts preserve browser work; explicit reconciliation resets
  affected acknowledgments. Concurrent edit versus confirm has one consistent transactional result.
- Editing after confirmation preserves the immutable old snapshot and makes dependent current
  evaluations stale. Historical decisions retain their original input references.
- UI rendering, keyboard/focus and error recovery are checked separately from source security,
  real extraction quality, backend persistence and the final end-to-end evaluation flow.

Backward-review question: can the buyer identify the exact saved values they are confirming,
where each came from, which assumptions or gaps remain, and what confirmation still does not
prove? A simulated local success cannot answer the backend persistence/security requirements.
