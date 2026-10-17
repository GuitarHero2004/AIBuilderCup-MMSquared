# Buyer decision: proposed API handoff

**Status:** proposal for Minh and Mạnh to review; not an agreed or implemented API.

**Prepared:** 16 October 2026. **Branch scope:** `feat/ui-decision-summary`, UI and handoff only.
The development walkthrough supplies synthetic decision records and recovery outcomes. It adds
no decision API, durable storage, actual human confirmation, purchase order or supplier message.
Presentation models require mapping to generated Pydantic/OpenAPI contracts before integration.

The buyer outcome is to review an eligible choice and its evidence, give a reason, deliberately
save it, and reopen exactly what was decided even after the underlying case changes.
Authority: [PRD FR-18](GreenProcure_Vietnam_Textile_SME_PRD.md),
[schema sections 20–23 and 29](GreenProcure_Vietnam_Textile_SME_Database_Schema.md),
[architecture section 6](ARCHITECTURE.md), [comparison handoff](QUOTATION_COMPARISON_CONTRACT.md)
and [scenario handoff](SCENARIO_CONTRACT.md). Connected FR-18/I3 acceptance remains pending.

## 1. Current boundary and human authority

The API currently implements case list/create/read and health routes only. Its case response
has a fixed draft status and revision 1. The decision endpoints below, revision-aware guards,
operation records and persistent summaries are not implemented by this branch.

Every endpoint verifies Firebase identity, configured App Check policy, case ownership and
membership of every referenced evaluation, quote revision, scenario and recommendation. Derive
owner identity from authentication, never a request UID. Unknown and other-owner IDs use the
same safe not-found response. P0 is owner-scoped; this proposal does not introduce organisations
or assume GitHub collaborators share application data. Do not expose direct database access.

Saving is a deliberate human action after reviewing the exact choice and reason. Decision
creation is absent from coordinator/specialist tool allowlists. Shared services reject agent
call contexts; a body field such as `is_human` cannot grant authority. The future general agent
may explain evidence or propose a reason for review, but cannot submit or approve the choice.
No explanation completion, selection change, scenario confirmation or page load saves a decision.

## 2. Proposed routes

All paths use `/api/v1`. POST and exact-ID GET follow the architecture. The bounded list and
operation lookup are proposed additions that require agreement.

| Method and path | Responsibility |
|---|---|
| `POST /cases/{case_id}/decisions` | Validate a human choice and atomically save its immutable summary |
| `GET /cases/{case_id}/decisions/{decision_id}` | Read that exact saved decision with separate current-context information |
| `GET /cases/{case_id}/decisions?limit=10&cursor=...` | Bounded owner-scoped history, ordered by server timestamp with stable cursor |
| `GET /cases/{case_id}/decision-operations/{request_key}` | Resolve the same attempted save after an ambiguous response |

Reads never create, repair, overwrite or resubmit a decision. Return explicit decision IDs in
responses even when the database document key contains them. API errors follow the existing
safe `error.code`, `message`, `retryable`, `request_id`, nullable `run_id` envelope. A decision
save is not an agent run and does not need a fabricated model/run reference or progress feed.

## 3. Exact reviewed request

POST requires `Idempotency-Key` and the proposed snake_case fields below. Opaque IDs are bounded
and path-safe; source/version fields are expected values to check, not trusted authority.

| Request field | Required meaning |
|---|---|
| `evaluation_id` | Exact current immutable evaluation the buyer reviewed |
| `expected_input_fingerprint` | Fingerprint of its inputs, policy and factors |
| `expected_case_data_revision` | Current source-data revision the buyer reviewed |
| `expected_quote_revision_refs` | Exact frozen candidate set of `quote_id` / `quote_revision_id` pairs |
| `selected_quote_id`, `expected_selected_quote_revision_id` | Chosen eligible, scenario-feasible confirmed revision |
| `expected_scenario_id`, `expected_baseline_evaluation_id` | Exact saved policy and its baseline family; baseline reference nullable only as defined by that evaluation |
| `recommendation_id` | Nullable validated explanation explicitly included in the reviewed summary |
| `selection_reason` | Nonblank buyer reason, required for the preferred offer and alternatives alike |

Do not accept caller-supplied trusted amounts, scores, eligibility, winner, factor values,
summary snapshot, timestamp, selector identity or approval status. Reject unsupported fields.
Whitespace-only reasons fail validation. Preserve deliberate Unicode text and paragraph breaks;
render it as plain text. The current UI proposes a 2,000-Unicode-code-point limit after trimming
outer whitespace; this is not an existing API rule. Agree it in Pydantic and the generated adapter.
Do not silently replace a buyer reason with generated prose or truncate a submitted reason.

A reason never waives technical, budget, MOQ, deadline, evidence or scenario constraints.
The selected offer must belong to the exact evaluation and its current selectable set, with
complete required comparable metrics and a confirmed revision. Server capability policy owns
whether any partially evaluated comparison may advance; the browser cannot infer permission
from a ranked row alone. A no-feasible result cannot save a normal decision.

Recheck case/quote revisions, fingerprint, confirmed scenario, factor/scope versions and current
capabilities at save time. Relevant unsaved UI edits block review/save until resolved; they do
not mutate the existing snapshot. Re-evaluation or changed selection requires a new reviewed
proposal. Never silently redirect a save to whichever evaluation is now latest.

## 4. Preferred offer and optional explanation are separate

The evaluation's `winner_quote_id` is the deterministic preference winner. The buyer's
`selected_quote_id` may be another permitted offer; label that difference as a buyer selection.
Never rewrite the original winner or an explanation to make the selected offer appear preferred.

`recommendation_id: null` means no AI explanation is included. It does not erase the preference
winner, calculation results or ability to save an otherwise valid decision. Missing, pending,
failed or unknown read-only explanation generation is distinct from decision-save uncertainty.
Do not wait for optional generation or attach a later explanation without another explicit review.

When a recommendation is supplied, validate ownership, evaluation ID, input fingerprint, winner
and allowed evidence references. Its `recommended_quote_id` must equal the evaluation winner,
not necessarily the buyer choice. Reject mismatches with an actionable error; the UI may let the
buyer explicitly review/save without that explanation, but must not silently drop a reviewed one.
Preserve the actual absent/invalid-explanation limitation. No invented supplier history, risk,
certification, whole-product footprint or model-authored replacement calculation enters a summary.

## 5. Immutable stored decision and summary snapshot

Retain schema §23 fields exactly:
`evaluation_id`, nullable `recommendation_id`, `selected_quote_id`, `selected_by_uid`,
`selection_reason`, `created_at`, `input_fingerprint`, `summary_snapshot`.
Selector identity and timestamp come from the server. Proposed envelope additions are explicit
`decision_id`, `case_id` and `schema_version`; nested names below require backend agreement.

The summary is a bounded, server-built projection of the immutable authoritative records that
were accepted at commit. Preserve exact values and source references; do not recalculate or
handwrite a parallel table from browser/model text. Proposed required snapshot sections:

| Summary section | Immutable content |
|---|---|
| `source_refs` | Case revision, evaluation/fingerprint/calculation version, scenario ID, baseline evaluation ID, full confirmed quote refs and selected revision |
| `requirement_snapshot` | Reviewed quantity, technical requirements, budget, full-order deadline, evidence requirements, currency and relevant reviewed assumptions |
| `policy_snapshot` | Exact cost/lead_time/carbon weights, relative caps, common quantity/cost/carbon boundaries and frozen normalisation anchors |
| `evaluation_snapshot` | Authoritative candidate outcomes, checks/reasons, ranks, preference winner and exact calculated amounts/scores needed to explain the choice |
| `calculation_provenance` | Versioned factor references/snapshots, cost adjustments, net-versus-shipment mass, route scope and input-source references from that evaluation |
| `buyer_selection` | Selected quote/revision, supplier display name at save, buyer reason and whether it differs from the preference winner |
| `recommendation_snapshot` | Null, or the exact validated explanation with its ID/evaluation/winner, structured evidence refs and model/prompt metadata |
| `assumptions`, `limitations` | Reviewed input assumptions, source limitations, missing explanation, proxies and disclosed boundaries at the time of the choice |

Retain eligibility and rejected/incomplete candidate context where relevant to understanding the
comparison. Missing values remain null with reasons; zero stays a real value. Preserve decimal
strings, units and original display identities. UI formatting cannot change stored arithmetic.
A preference score is not sustainability performance. Test-only factors remain visibly synthetic
and cannot enter live submission mode under the PRD's factor policy.

Source references identify immutable quote revisions and private object generation/hash/page
locations where available. Do not embed raw PDFs, credentials, signed download URLs or provider
payloads. A later unavailable source does not rewrite the stored claim or fabricate verification.
Owner-authorized source reads may show their current availability separately from the snapshot.

## 6. Atomic acceptance and history

Load authorized immutable sources, validate their consistency and construct the summary using
server domain logic. At the atomic commit boundary, recheck relevant current input revisions,
fingerprint/capabilities and idempotency reservation, then persist decision + summary + committed
operation receipt together. Do not publish an acknowledged decision whose summary was never
stored. No model call, network source lookup or mutable calculation belongs inside a transaction.

If input state changes before commit, reject with a conflict and preserve the local reason for
review. If it changes after commit, the saved decision remains valid historical evidence of
what the buyer chose then. GET must return its original summary, not rebuild it from new input.
A saved record is immutable: another decision gets another ID; prior history is never patched.

`cases.selected_decision_id` and lifecycle `decided` are navigation/state pointers, not permission
to make old evaluations current. If updated on save, include that update in the same transaction
and define separate pointer concurrency (for example an expected prior decision ID). Do not
increment the source-data revision merely because a decision was saved. Multi-tab pointer policy
requires agreement; it cannot overwrite or delete either immutable decision. This proposal does
not treat a user-requested new decision as a retry or deduplicate distinct reasons heuristically.

## 7. Idempotency and ambiguous outcomes

Scope each request key to authenticated owner, case and decision-save kind. Store a canonical
body hash including the exact reviewed refs, nullable recommendation and accepted reason.
Authenticate before lookup. Same key/body returns the recorded outcome and exact decision ID;
same key with changed body is a conflict. Never recycle a key for another reviewed choice.

Resolve a matching already-committed operation before applying new-request staleness checks.
A retry after later case changes returns that historical decision; it neither rejects proof of
the earlier save nor saves again. Historical status is separate from the committed receipt.
For an uncommitted request, current inputs must still satisfy all normal save checks.

The client retains captured request key/body and known decision ID independently of subsequent
editable state. While a save is running or unresolved, block duplicate submission and prevent
context changes from attaching its response to a different case/choice. Restore authentication
before owner-scoped readback; clear displayed private state on identity change. Future recovery
across reloads must retrieve authenticated operation state, not assume browser memory is durable.

| Observed state | Required UI and next action |
|---|---|
| Save running | Show actual request state; keep reviewed proposal and disable duplicate save |
| Transport timeout, disconnect or untrusted/malformed outcome | Save outcome unknown; read the same operation before offering another submission |
| Operation still processing or readback unavailable | Retain unresolved state; bounded readback, no new save key |
| Authoritative committed receipt, summary unavailable | Decision saved; summary could not be loaded; retain exact ID and retry GET only |
| Full matching saved record read | Show saved timestamp and immutable summary |
| Conclusive rejection before commit | Explain the reason, retain the draft and allow explicit corrected review/retry |
| Stale conflict | Resolve current inputs and re-review; do not silently save against a replacement evaluation |

An HTTP success code alone cannot prove a matching save when response identity is invalid.
A validated receipt may establish commitment even if a separate summary fetch fails. Never
collapse that known-saved state into failed/unknown save, and never offer a second POST to load
its summary. A summary identity mismatch is withheld and recovered by exact-ID readback.

Proposed operation fields: `request_key`, `kind: decision_save`, `state` (`processing`,
`committed`, `rejected`, `interrupted`), nullable `decision_id`, canonical-body reference,
safe `error`, `created_at`, `updated_at`. Only authoritative terminal reconciliation establishes
that no commit occurred. A lookup 404 alone is insufficient: agree reservation, retention,
leases and crash recovery. GET cannot restart a save. No untracked background write after 202.

## 8. Saved read envelope and buyer presentation

Proposed exact-ID GET response: `{ "decision": {...}, "current_context": {...} }`.
The decision is immutable. Computed current context can identify changed inputs, current case
revision and source availability; it never changes the saved reason, amounts, policy or winner.
Historical decisions remain readable and do not automatically become new save proposals.

Before Save, show the chosen supplier and revision, preference winner, baseline/scenario,
comparable metrics, requirements and policy, assumptions/limitations, explanation availability,
and the required reason. Make the buyer's alternative choice explicit. The final review must
bind the exact source identity and reason; changes or revoked capability invalidate that review.

After save, lead with the acknowledged saved state and immutable timestamp/reference. Keep
buyer choice distinct from preference winner. Summary/source details must be keyboard accessible.
Show stale-now information as context about a past record, not as a claim its original save failed.
Unknown save, saved-but-unreadable and known rejected states need different actions and wording.

This is an in-app record only. No order, email, payment, supplier approval or PDF export follows
from Save. A future general agent can explain the saved record through authorized read tools;
it cannot rewrite it, confirm another decision or hide uncertainty with a narrative of success.

## 9. Development walkthrough and integration acceptance

The standalone decision walkthrough has its own labelled synthetic examples. Embedded decision
views in the comparison/scenario previews preserve the exact selected in-memory evaluation,
quote and scenario/baseline context; returning to the source does not invent a replacement.
Simulated saved records and recovery outcomes remain in memory; reload clears them. These
handoffs do not establish backend IDs, real confirmations or durable persistence.
Prepared results and source provenance must remain labelled; no live failure falls back to them.
No fixture, local callback or successful browser test establishes a real saved buyer decision.

Before integration, verify reasons for preferred/alternative choices; excluded/no-feasible and
stale/cross-owner rejection; exact source/recommendation matching; transaction race checks;
idempotent committed replay after later edits; lost response and repeated readback; saved receipt
with unavailable/mismatched summary; immutable historical reads after case/quote/policy edits;
and refresh/fresh-process recovery. Check keyboard, narrow/enlarged layouts and long reasons.
These are required connected acceptance checks, not claims of executed backend verification.
