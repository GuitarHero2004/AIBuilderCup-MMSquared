# Quotation checks and proposed evaluation API

**Updated: 18 October 2026.** The read-only requirement-check slice below is implemented
on `feat/confirmed-quote-comparison` and verified locally. It is not deployed.
The ranked evaluation, scenarios and decision handoff in sections 2 onward remain proposals;
their development UI walkthrough does not operate on connected quotation data.

## Implemented read-only slice

`GET /api/v1/cases/{case_id}/comparison` checks the saved requirement against up to four
current quotations. It uses existing Firebase identity, owner isolation and configured
App Check. Unknown and other-owner case IDs return the same safe 404.
Optional `expected_case_revision` returns 409 `STALE_CASE_REVISION` on a mismatch.
Successful responses use `Cache-Control: private, no-store`.

Case, quotation index, quote records and immutable confirmed revisions are read in one
consistent Firestore transaction. Discovery races cause at most three bounded attempts, then
409 `COMPARISON_INPUT_CHANGED`. Missing or malformed stored confirmation content returns
503 `COMPARISON_DATA_UNAVAILABLE`. Owner, draft revision, source hash, extraction reference,
confirmation timestamp and confirmed data must agree. This endpoint performs no writes,
PDF retrieval, storage initialization or model calls.

Pydantic/OpenAPI owns the contract, with generated TypeScript and a runtime guard.
`CaseComparison` contains `case_id`, `case_data_revision`, `checked_at`, `input_fingerprint`,
`scope: "confirmed_quote_checks_v1"`, `requirement`, `rows`, `limitations`,
`carbon_available: false` and `ranking_available: false`.
Rows include quote/source/supplier identity, confirmation reference, draft revision,
nullable metrics and per-field checks:

| Status | Meaning |
|---|---|
| `meets_checked_requirements` | All checks in this restricted scope pass or are explicitly not applicable |
| `does_not_meet_requirements` | At least one known hard requirement fails, even with other missing inputs |
| `needs_review` | A required input or reviewed basis is missing or inconsistent |
| `unconfirmed` | Current immutable human confirmation is absent; all calculated metrics are null |

Metrics use decimal strings for quoted/comparable cost and net fabric mass, plus currency,
actual/estimated mass basis, full-order lead time and arrival date. Check states are
`pass`, `fail`, `needs_review` or `not_applicable`, with explanations and field paths.
Stable quote-ID order has no ranking meaning.

Cost requires exact full-order quantity coverage. Kilogram prices use actual full-order net
mass or an estimate from metres, total width and GSM; packaging/gross mass is excluded.
Comparable cost additionally needs matching currency and reviewed scope, no unsupported
adjustments, and no contradictory included/excluded charges. The fixed delivered-to-buyer
scope rejects material/delivery exclusions and included tax/duties. Arbitrary free-text
charge semantics are not inferred; human review remains responsible for their meaning.
Delivery uses reviewed end-to-end full-order calendar days, never blindly summed stages.
Equality at technical, MOQ, budget and deadline limits passes. Missing values are not zero.

This refreshable diagnostic is not a saved evaluation, certification, carbon calculation,
preference score, recommendation or decision. Missing carbon does not block this restricted
scope but prevents claiming complete P0 evaluation. Missing expiry is explicitly unverified;
it is not a new mandatory expiry policy.

The screen shows timestamp/revision, retains prior results with an explicit refresh-failure
warning, discards obsolete session/case responses, and clears unconfirmed metrics after refresh.
Review navigation retains existing unsaved-change/in-flight-operation guards.
Private tests, fixtures and reports remain in OS temp.

The buyer outcome is to understand which reviewed offers can be compared, why others cannot,
and what cost, delivery and logistics-emissions tradeoffs support the returned ranking.
Authority: [PRD FR-13–FR-15](GreenProcure_Vietnam_Textile_SME_PRD.md),
[calculation specification](CALCULATION_SPEC.md), [schema sections 13–21](GreenProcure_Vietnam_Textile_SME_Database_Schema.md),
[architecture sections 6–7](ARCHITECTURE.md) and [review handoff](QUOTATION_REVIEW_CONTRACT.md).

## 1. Current boundary

The API now implements cases, private quotation intake, extraction runs, saved review,
immutable confirmation, operation recovery and the read-only comparison above.
Durable evaluations, recommendations, scenarios and explanation operations below remain
future work. Existing run routes support extraction; the proposed explanation intent is
not implemented. Extend Pydantic/OpenAPI, response guards and generated TypeScript together.
UI presentation types and synthetic fixtures are not an alternative transport schema.

Every route and shared agent-tool service verifies Firebase identity, case ownership,
resource membership and configured App Check policy. Derive owner identity from authentication.
Unknown and other-owner IDs receive the same safe not-found response. Do not expose direct
Firestore access, private storage paths, credentials or another owner's operation records.

## 2. Proposed routes and request boundary

Paths have the `/api/v1` prefix. Evaluation and run routes follow the architecture;
the bounded evaluation list and comparison-operation lookup are new proposals.

| Method and path | Responsibility |
|---|---|
| `POST /cases/{case_id}/evaluations` | Freeze authorized reviewed inputs and calculate one immutable evaluation |
| `GET /cases/{case_id}/evaluations/{evaluation_id}` | Return that snapshot with current freshness and capabilities |
| `GET /cases/{case_id}/evaluations?limit=10&cursor=...` | Bounded owner-scoped history with explicit IDs; never silently replace the selected evaluation |
| `POST /cases/{case_id}/agent-runs` | Request the allowlisted `explain_evaluation` intent for one exact evaluation |
| `GET /cases/{case_id}/runs/{run_id}` | Read recorded execution state and result references |
| `GET /cases/{case_id}/runs/{run_id}/events` | Read bounded safe events from actual execution |
| `GET /cases/{case_id}/comparison-operations/{request_key}` | Resolve a particular evaluation or explanation request after a lost response |

Evaluation POST carries `Idempotency-Key` and a proposed body:
`{ "expected_case_revision": 3, "scenario_id": "baseline_1", "expected_quote_revision_refs":
[{ "quote_id": "quote_a", "quote_revision_id": "quote_a_r2" }] }`.
The server checks the exact candidate set, current confirmed scenario and referenced revisions.
It resolves policy, requirements, factors and cost/carbon boundaries itself. A caller cannot
supply trusted metrics, eligibility, ranks, winner, factor values or a confirmed-user identity.
Unconfirmed or changed inputs cannot enter the ranked set. Return actionable review issues.

Freeze and validate inputs, calculate deterministically outside a database transaction, then
atomically recheck relevant revisions and persist snapshot plus operation result reference.
A changed revision before commit returns a recoverable conflict without publishing a current
result. An edit after commit makes that immutable result historical. Never mutate it in place.
The UI cannot bypass a missing confirmed baseline scenario by inventing one client-side.

## 3. Immutable snapshot shape

Return `evaluation_id` explicitly in the API, even if it is the database document key.
Use schema `2.0` names and snake_case throughout. Proposed nested names below must be
ratified in Pydantic; monetary and physical values are decimal strings, not binary floats.

| Snapshot field | Contract |
|---|---|
| `schema_version`, `calculation_version` | `2.0`, `textile_mvp_v2`; unknown versions are unsupported, not guessed |
| `case_data_revision`, `input_fingerprint` | Frozen revision and hash of validated inputs, policy and factors |
| `scenario_id`, `baseline_evaluation_id` | Explicit confirmed scenario; baseline ID null only for a fresh baseline |
| `input_snapshot` | Bounded requirement, confirmed quote inputs and `quote_revision_refs` objects with `quote_id` / `quote_revision_id` |
| `policy_snapshot` | Weights keyed `cost`, `lead_time`, `carbon`; hard constraints, caps, quantity, currency and declared common scopes |
| `normalisation_anchors` | Each metric has decimal `min` / `max`, or null where no valid baseline exists |
| `factor_snapshots` | Exact approved factor values, units, version, source, applicable mode/boundary and test-only designation |
| `results` | Maximum four candidate outcomes, including incomplete and rejected offers |
| `ranked_quote_ids`, `winner_quote_id` | Ordered unique feasible IDs; winner is first, or null when the list is empty |
| `status` | Existing enum: `complete`, `incomplete`, `no_feasible_option` |
| `limitations`, `created_at` | Bounded plain-text limitations and server timestamp |

Each `results[]` entry carries `quote_id`, `quote_revision_id`, `eligibility`, `reasons`,
`technical_checks`, `comparable_cost_amount`, `currency`, `cost_basis_id`, `lead_time_days`,
`arrival_date`, `budget_pass`, `delivery_pass`, `moq_pass`, `mass`, `carbon`, `metric_scores`,
`weighted_score` and `scenario_constraints_pass`. No separate frontend rank calculation.
`eligibility` is exactly `eligible`, `ineligible` or `needs_review`. Unknown pass flags are
null, not false or true. Reasons identify the affected requirement or missing input.

Technical checks retain `check_id`, required/observed values and units, quote revision,
`state` (`pass`, `fail`, `needs_review`) and reason. Show known failures and unknowns together.
An explicit hard failure outranks missing information for classification; neither disappears
when weights change. A missing certificate is not evidence of poor environmental performance.

Mass preserves `requested_length_m`, `quoted_gsm`, `total_width_m`, `net_fabric_mass_kg`,
`net_mass_source`, `shipment_mass_kg`, `shipment_mass_source` and limitations. Pricing per kg
uses net fabric mass; freight may use actual gross, net plus packaging or a disclosed proxy.
Carbon preserves `estimated_logistics_co2e_kg`, `scope_id`, `accounting_boundary`,
`route_complete`, `mass_basis`, `legs`, `data_quality_notes`, `uses_proxy`, `uses_test_factors`.
Each leg references a factor snapshot and its mass/distance/formula inputs. No fabricated
confidence percentage, inferred route or claim of whole-product lifecycle emissions.
A proposed `cost_breakdown` extension exposes `quoted_cost_amount`, reviewed adjustments,
included/excluded categories and source references; it must agree with the snapshot total.

## 4. Ranking, incomplete comparisons and nulls

Backend code owns metrics, baseline anchors, metric scores, weighted score, order and winner.
Use frozen anchors for later weight/filter scenarios; do not rescale a displayed subset.
Exact internal tie-breaking is lower cost, shorter lead time, then lexicographic quote ID.
The UI formats display precision only. An equal metric scores 100; a singleton is labelled
“Only eligible offer”, not proof of strong competition or a sustainability score.

**Policy proposal requiring backend agreement:** `complete` means all candidate outcomes
are resolved, including known rejections. `incomplete` means unresolved mandatory data remains;
a valid confirmed comparable subset may still have authoritative ranks and a winner, clearly
labelled “Among currently comparable offers”. Do not infer all offers were reviewed from
one ranked row. A fully resolved set whose offers all fail mandatory requirements may be
complete with an empty ranked list. `no_feasible_option` identifies a fully evaluated scenario
whose relative constraints leave no feasible offer. Neither state substitutes for missing data
or an unknown factor; return the exact blocking reasons.

A ranked row requires human-confirmed inputs, eligibility, complete comparable P0 metrics
and passed scenario constraints. An incomplete/rejected row may retain diagnostic amounts
but has null `metric_scores` / `weighted_score` and cannot enter normal recommendation choice.
A missing approved factor, mode, mass, currency or reviewed cost basis stays unavailable with
its reason. Missing carbon blocks that row's complete ranking even at zero carbon weight.
If a shared boundary/factor failure affects all rows, the ranked list is empty and winner null.
Known zero values are distinct from null; never coerce null into zero or a favourable rank.
Show ranked, needs-review and rejected outcomes separately, with text and keyboard controls.

For this proposed first integration, an incomplete evaluation may show provisional ranks,
but decision advancement stays blocked until unresolved candidates are addressed or explicitly
removed through a reviewed input change. Do not quietly discard them to enable selection.
This conservative advancement policy is a proposal; backend agreement must be reflected in
returned capabilities and UI copy rather than inferred from the `status` enum alone.

## 5. Read envelope, freshness and capabilities

Proposed GET response: `{ "evaluation": {...}, "freshness": {...}, "capabilities": {...},
"recommendation": null }`. The wrapper is computed read state, not extra mutable snapshot data.
`freshness` contains `is_stale`, `current_case_data_revision`, `checked_at`, and bounded
`reasons` identifying changed quote/requirements/scenario/policy/factor inputs. Input fingerprints
and quote references must match; case revision alone cannot hide relevant factor/policy changes.

`capabilities` contains `can_evaluate`, `can_explain`, `can_advance`, `selectable_quote_ids`
and `blocked_reasons`, with stable reason codes and safe user messages. Server authoritatively
restricts selectable IDs to fresh eligible feasible outcomes under the agreed completeness policy.
The client further disables advancement for evaluation/refresh uncertainty, input-affecting
writes or unsupported schema; it cannot grant a capability the server denied. A known read-only
explanation operation does not revoke a fresh result's selection capability. Final decision
routes must revalidate regardless; an absent/unknown operation kind is treated conservatively.

An old evaluation and explanation remain inspectable as historical results. Keep their original
amounts and timestamps; mark stale prominently and disable current advancement. Refresh failure
preserves the last known snapshot with “Current status could not be checked”; it is not proof
of freshness. A newly loaded evaluation never inherits an old selected offer or explanation.

## 6. Explanation and safe output

Explanation POST uses `Idempotency-Key` and `{ "intent": "explain_evaluation",
"evaluation_id": "evaluation_1", "expected_input_fingerprint": "..." }`.
The service verifies ownership and freshness, loads the immutable grounding snapshot, and
allows the Sourcing Specialist to explain only returned deterministic results and limitations.
This explanation operation is read-only with respect to inputs and evaluation results. If work
requires a new evaluation, represent it as an evaluation operation and read that exact snapshot;
never attach its prose to whichever table happens to be open. A general platform agent can
request explanations through this boundary in a later milestone; it cannot replace rankings.

Persist recommendation fields `evaluation_id`, `run_id`, `recommended_quote_id`, `summary`,
`tradeoffs`, `limitations`, `evidence_refs`, `model_id`, `prompt_version`, `created_at`,
`validation_status`. Return an explicit `recommendation_id` and proposed `input_fingerprint`.
Each structured evidence reference identifies the matching evaluation, quote/revision when
applicable, and allowed metric/check/assumption path. Validate bounds, membership and values.
`recommended_quote_id` must equal that evaluation's `winner_quote_id`, including null.
Numeric UI amounts come from referenced results, not model-written replacement numbers.

Reject mismatched IDs, fingerprints, winners, unsupported claims and invented certificates,
supplier histories or risk scores. Invalid explanation is unavailable, never silently repaired
into different procurement advice. Pending, failed or uncertain read-only explanation requests
retain matching calculated results and buyer selection. Show explanation status separately;
block duplicate explanation requests until recorded-state readback resolves their outcome.
Render bounded text and structured references safely; no executable HTML or source-controlled
instructions. Actual event types/messages may describe started/completed work, not fabricated
progress percentages, provider secrets, raw PDFs, tool arguments or private model reasoning.

## 7. Idempotency, execution and uncertain outcomes

Scope operation keys to authenticated owner, case and operation kind; hash the canonical body.
Same key/body returns recorded operation/result references. Same key/different body conflicts.
Check a matching completed operation before rejecting its old expected revision. Authenticate
before lookup. Keep evaluation operation identity separate from an optional model `run_id`.
Proposed operation fields: `request_key`, `kind`, `state` (`processing`, `committed`, `rejected`,
`interrupted`), `evaluation_id`, `run_id`, `recommendation_id`, `error`, `updated_at`.
Nullable references are not fabricated; unknown transport outcome is a client recovery state.

After timeout, disconnect or malformed mutation response, retain submitted IDs/key and show
“Outcome unknown”. Read the operation, then its exact result and current freshness. Do not
optimistically announce evaluation success or immediately create a second key. A lookup 404
alone does not prove no write occurred; retention, reservation and lease rules must establish
safe same-key retry or an explicit terminal rejection. Unavailable readback stays unresolved.
If committed, use returned IDs. If still processing, poll boundedly. If conclusively rejected,
show its reason and allow a corrected explicit new request. Concurrent tabs resolve the same
recorded operation instead of silently starting duplicate model work.

Agent work stays inside the bounded active HTTP request, with recorded state/events/results,
cancellation/deadline and lease reconciliation. No untracked `202` background execution.
GET run status does not restart work. Shared run states remain `running`, `succeeded`,
`awaiting_review`, `failed`, `cancelled`, `timed_out`, `interrupted`; do not conflate them with
operation states. An explicit retry after ambiguous provider completion may incur a new charge;
idempotent application records are not a promise of exactly-once provider billing.

## 8. Local handoff, fixtures and acceptance boundary

Local selection binds `evaluation_id`, `input_fingerprint`, `quote_id`, `quote_revision_id`
and the displayed policy. Recheck capabilities before advancing; stale or unverified evaluation
state disables advancement. Read-only explanation uncertainty alone does not. Clear selection
on evaluation, owner or case change. Another eligible offer may
be selected, labelled buyer choice; never rewrite the engine winner. Local handoff shows these
references and a review summary, clearly unsaved. Scenario editing and durable final decisions
belong to later milestones; no confirmation or decision-save permission is implied here.

The canonical comparison fixture is independent of the preceding 152 cm review PDF. It uses
50,000 m, total/usable width 150 cm, 130 GSM, net mass 9,750 kg and packaging 250 kg.
Its 10,000 kg shipment and `TEST_ONLY_ROAD_ARITHMETIC` factor 0.1 produce synthetic A/B
emissions 600/150 kg CO₂e, costs USD 142,500/147,000 and Balanced scores 70/30.
C is late; D fails composition. Their diagnostic metrics never make them eligible.
Label the source and test-only factors prominently. Do not imply an uploaded/reviewed quote
produced these values; never substitute the fixture when live evaluation or explanation fails.

Presentation keeps the comparison and next action prominent, with concise case/basis context.
Longer explanation, methodology and source details use accessible disclosures; blocking reasons
and important provenance remain visible. A future general platform agent spans all screens,
uses explicit record/version/unsaved-state context and allowlisted server-authorized tools,
and previews changes for human review. It follows the coordinator/specialist architecture and
human-only confirmation/decision boundaries in [the UI plan](UI_UX_PLAN.md). No agent control
or agent integration is implemented by this comparison milestone.

Before live integration, verify owner isolation, stale revisions, partial/no-feasible distinction,
missing-factor/null behaviour, frozen anchors/ties, explanation-reference rejection, lost-response
readback and capability enforcement. Inspect desktop/mobile/enlarged-text layouts and long names;
all exclusion reasons must be keyboard reachable. These are acceptance requirements, not claims
of executed backend tests. This UI milestone does not complete FR-13–FR-15 or the I1 live flow.
