# GreenProcure — Vietnam Textile SME MVP Database Schema
**Version:** 2.0 · **Date:** 1 October 2026
**Database:** Cloud Firestore · **Files:** private Cloud Storage · **Identity:** Firebase Auth
**Status:** schema contract to implement, not a deployed database

This intentionally replaces the v1 organisation-first layout and fixes malformed reference
paths. The old file remains archived. Section names retain the original domain concepts;
where an entity is consolidated/deferred the mapping is explicit below.

# 1. Schema Goal and Conventions
Support requirement → PDF → unconfirmed extraction → human-confirmed revision → eligibility
and calculations → scenario → recommendation → human decision, with actual agent-run audit.

Use `snake_case` in JSON/Firestore/API. IDs are server-generated, opaque and path-safe.
API derives `uid` from a verified Firebase token; client/model never supplies trusted owner IDs.
Decimal input/output amounts are JSON decimal strings, parsed into Python Decimal; numeric
scores may be JSON numbers after deterministic computation. Dates are `YYYY-MM-DD`; timestamps
are native Firestore Timestamp, ISO-8601 UTC in the API. No literal `SERVER_TIMESTAMP` strings.
Nullable fields are explicit; null is never zero. Object size is bounded; PDFs/raw transcripts
are not embedded. Canonical hashing normalises Decimal strings, sorted keys and revision refs.

# 2. High-Level Structure
```text
/users/{uid}
/users/{uid}/cases/{case_id}
/users/{uid}/cases/{case_id}/quotes/{quote_id}
/users/{uid}/cases/{case_id}/quotes/{quote_id}/revisions/{revision_id}
/users/{uid}/cases/{case_id}/scenarios/{scenario_id}
/users/{uid}/cases/{case_id}/evaluations/{evaluation_id}
/users/{uid}/cases/{case_id}/recommendations/{recommendation_id}
/users/{uid}/cases/{case_id}/decisions/{decision_id}
/users/{uid}/cases/{case_id}/runs/{run_id}
/users/{uid}/cases/{case_id}/runs/{run_id}/events/{event_id}
/users/{uid}/limits/{period_id}
/reference_emission_factors/{factor_id}
/system_limits/{period_id}
```
All listed paths are document paths. Firestore requires alternating collection/document
segments [S04]. The old `/reference_data/emission_factors/{id}` is not a valid document
layout; do not recreate it. No direct-client writes to any of these collections in P0.

# 3. `users`
| Field | Type | Rule |
|---|---|---|
| `created_at`, `last_seen_at` | timestamp | Server-maintained |
| `identity_type` | enum | `anonymous` in P0; no mandatory email |
| `display_name` | string/null | Optional, not identity authority |
| `case_count` | integer | Server-maintained limit counter |
| `retention_expires_at` | timestamp/null | Optional policy metadata, not guaranteed deletion |

UID is the document key. Creating a new anonymous user must not expose an existing visitor's
seeded case. Do not use email/domain strings as access control.

# 4. `organisations` — deferred; descriptive buyer profile only
P0 has no organisations/members collection or role UI. `case.buyer_profile` stores a fictional
name, industry and country for context only. A later multi-user model will need explicit
membership and migration; do not imply that developer GitHub access grants application access.

# 5. `cases`
| Field | Type | Rule |
|---|---|---|
| `schema_version` | string | `2.0` |
| `name` | string | Length-limited |
| `buyer_profile` | map | Descriptive fictional company data |
| `data_revision` | integer | Increment on input/quote-set changes |
| `status` | enum | `draft`, `collecting_quotes`, `reviewing_quotes`, `ready`, `decided`, `archived` |
| `requirement` | map | Section 6 |
| `default_policy` | map | Section 7 |
| `baseline_evaluation_id` | string/null | Explicit immutable snapshot pointer |
| `selected_decision_id` | string/null | Does not make an old evaluation current |
| `created_at`, `updated_at` | timestamp | Server time |
| `is_synthetic_demo` | boolean | Visible disclosure |

Case revision changes on requirement change, quote add/remove, reviewed draft change and
confirmation. Scenario creation does not change source data revision. Do not hide staleness
by changing the snapshot's recorded input revision.

# 6. Requirement Object
Example values below are synthetic, not observed procurement data.
```json
{
  "quantity": "50000",
  "quantity_unit": "metre",
  "order_reference_date": "2026-10-01",
  "maximum_lead_time_days": 25,
  "maximum_budget_amount": "150000.00",
  "currency": "USD",
  "destination": {"label": "Fictional HCMC buyer facility", "country_code": "VN"},
  "cost_basis_id": "delivered_to_buyer_excluding_tax_v1",
  "cost_basis_description": "Material and declared delivery charges; excludes tax and duties",
  "carbon_scope_id": "origin_facility_to_buyer_facility_v1",
  "carbon_accounting_boundary": "wtw",
  "textile_specification": {
    "construction": "woven",
    "composition": [{"fibre": "polyester", "percentage": "65"}, {"fibre": "cotton", "percentage": "35"}],
    "composition_tolerance_pp": "2",
    "target_gsm": "130",
    "gsm_tolerance_pct": "5",
    "minimum_usable_width_cm": "150",
    "required_colour": null,
    "required_finish": null,
    "required_evidence": []
  }
}
```
Each evidence requirement, if added, has `requirement_id`, `type`, `applicability_note`,
`mandatory: true`. Initial requirements are empty, not synthetic certificate approval.
Use the demo date only for deterministic fixtures; UI new cases use a user-visible current
reference date. Do not silently alter a saved case as the wall clock changes.

# 7. Decision Policy
```json
{
  "policy_version": "textile_mvp_v2",
  "weights": {"cost": "0.45", "lead_time": "0.25", "carbon": "0.30"},
  "enforce_budget": true,
  "enforce_delivery": true,
  "technical_gate_required": true,
  "complete_comparable_metrics_required": true
}
```
No risk score/weight. No penalty bypass for technical failure. All three metrics must be
available even for a zero weight in P0, preventing a misleading partial carbon-aware winner.
CALCULATION_SPEC is authoritative for maths, gates and tie-breaking.

# 8. `suppliers` — embedded per quote, no supplier master in P0
`quote.supplier` contains `display_name`, optional country/city and `is_synthetic`.
No historic on-time rate, reliability score or quality count is required or invented.
Same named supplier in two different cases does not imply shared identity or permission.

# 9. `quotes`
| Field | Type | Rule |
|---|---|---|
| `schema_version` | string | `2.0` |
| `supplier` | map | Descriptive data, not a source of hidden answers |
| `source_file` | map | `object_path`, `generation`, `sha256`, name, MIME, bytes, pages |
| `draft_revision` | integer | Optimistic concurrency for review changes |
| `status` | enum | `uploaded`, `extracting`, `needs_review`, `confirmed`, `failed` |
| `latest_extraction_run_id` | string/null | Links raw provider output and events |
| `raw_extraction` | map/null | Bounded structured extraction; never buyer-edited |
| `draft_data` | map/null | Editable normalised fields |
| `field_provenance` | array | Section 11; bounded |
| `missing_fields` | array | Section 12 |
| `confirmed_revision_id` | string/null | Immutable reviewed revision pointer |
| `created_at`, `updated_at` | timestamp | Server timestamps |

Each extraction raw result is also retained privately as an object referenced by its run,
so a later re-extraction does not destroy history. Replacing the source PDF creates a new
quote/source identity. Do not trust a client-supplied object path without checking ownership.

# 10. Confirmed Quotation Data and Revisions
`quotes/{quote_id}/revisions/{revision_id}` is immutable and contains `draft_revision`,
`confirmed_by_uid`, `confirmed_at`, `source_file_sha256`, `source_extraction_run_id`,
`validated_data`, `field_provenance` and `corrections`.

`validated_data` example (A, synthetic; routing distances are not verified geography):
```json
{
  "commercial": {
    "unit_price_amount": "2.85",
    "price_unit": "metre",
    "currency": "USD",
    "quoted_quantity": "50000",
    "quantity_unit": "metre",
    "moq": "20000",
    "moq_unit": "metre",
    "incoterm_text": null,
    "payment_terms": "Synthetic demo terms",
    "quote_valid_until": null,
    "cost_basis_id": "delivered_to_buyer_excluding_tax_v1",
    "included_charges": ["material", "delivery"],
    "excluded_charges": ["tax", "duties"],
    "cost_adjustments": [],
    "cost_basis_reviewed": true
  },
  "textile_specification": {
    "construction": "woven",
    "composition": [{"fibre": "polyester", "percentage": "65"}, {"fibre": "cotton", "percentage": "35"}],
    "gsm": "130",
    "usable_width_cm": "150",
    "total_width_cm": "150",
    "colour": null,
    "finish": null,
    "recycled_content_pct": null
  },
  "supply_chain": {
    "production_lead_time_days": null,
    "shipping_lead_time_days": null,
    "end_to_end_lead_time_days": 20,
    "lead_time_basis": "full_order_calendar_days_to_buyer",
    "lead_time_basis_reviewed": true,
    "actual_net_fabric_mass_kg": null,
    "actual_gross_shipment_mass_kg": null,
    "actual_mass_covers_order": null,
    "packaging_mass_kg": "250",
    "carbon_scope_id": "origin_facility_to_buyer_facility_v1",
    "route_complete": true,
    "legs": [{
      "leg_id": "leg_1",
      "origin_label": "Fictional origin A",
      "destination_label": "Fictional HCMC buyer facility",
      "transport_mode": "road",
      "distance_km": "600",
      "distance_source_type": "synthetic_demo",
      "distance_source_note": "Scenario distance, not a verified shipping route",
      "factor_id": null
    }]
  },
  "evidence_claims": [],
  "evidence_reviews": []
}
```
`factor_id: null` deliberately prevents a live complete carbon evaluation until a verified
factor is selected. No factor is inferred from country or Incoterm. Derived net/gross masses
belong to evaluation results, not unexplained model-generated confirmed fields.

A cost adjustment is `{adjustment_id, amount, currency, direction: add|subtract, category,
reason, source_type, reviewed_by_uid}`. Validate unique categories/coverage and no duplicate
addition of a charge already included. Evidence review is `{requirement_id, source_quote_id,
state: accepted_for_case|needs_review|rejected, reviewed_by_uid, reviewed_at, note}`.
It records buyer applicability review, not issuer verification.

# 11. Extraction Evidence and Field Provenance
A bounded field record:
```json
{
  "field_path": "textile_specification.gsm",
  "source_type": "quotation_pdf",
  "document_sha256": "illustrative_sha256_not_a_real_file_hash",
  "page_number": 1,
  "excerpt": "Fabric weight: 130 GSM",
  "review_state": "confirmed",
  "note": null
}
```
Source types: `quotation_pdf`, `user_correction`, `user_entered_assumption`, `synthetic_demo`,
`verified_reference`. `review_state`: `unreviewed`, `confirmed`, `needs_review`.
The quotation worker may write only unreviewed/needs_review states. Authenticated confirmation
sets confirmed state. Model-confidence values, if retained for diagnostics, are not probabilities
of truth and do not create a certificate-confidence badge.

# 12. Missing Fields / Validation Issues
```json
{
  "field_path": "supply_chain.legs[0].transport_mode",
  "severity": "blocking",
  "blocks": ["carbon", "ranking"],
  "code": "MISSING_TRANSPORT_MODE",
  "message": "Confirm the transport mode before emissions can be estimated."
}
```
`severity`: `blocking|warning|info`. `blocks` can include technical, cost, delivery, carbon,
evidence, ranking. Missing versus negative performance remain distinct.

# 13. `technical_evaluations` — embedded in immutable evaluation results
No separate v1 collection in P0. Each `evaluations.results[]` entry records `technical_checks`
as an array: `check_id`, requirement value/unit, observed value/unit, `state: pass|fail|needs_review`,
reason and quote revision. A known fail outranks an unknown for classification, but show both.

`eligibility` is exactly `eligible|ineligible|needs_review`. It covers commercial/delivery/
comparability checks as well as textile screening. Do not use one ambiguous `eligible` Boolean.

# 14. Mass Normalisation Result
Per-quote evaluation stores:
- `requested_length_m`, `quoted_gsm`, `total_width_m`, `net_fabric_mass_kg`.
- `net_mass_source`: `confirmed_actual_net|estimated_from_geometry`.
- `shipment_mass_kg`, `shipment_mass_source`: `confirmed_actual_gross|net_plus_packaging|fabric_only_proxy`.
- Input values/revision refs, packaging value or missing flag and limitations.

A confirmed actual mass must cover the same order quantity. Fabric-only proxy results are
labelled, not rounded into a claim of actual freight weight. Do not add packaging to actual gross.

# 15. `supplier_metrics` — embedded in `evaluations`
| Field | Type | Rule |
|---|---|---|
| `evaluation_id` | ID | Document key |
| `schema_version`, `calculation_version` | string | `2.0`, `textile_mvp_v2` |
| `case_data_revision` | integer | Inputs at calculation time |
| `scenario_id` | string | Always explicit, including baseline scenario |
| `baseline_evaluation_id` | string/null | Null only for a fresh baseline |
| `input_fingerprint` | string | Hash of validated inputs/policy/factor snapshots |
| `input_snapshot` | map | Requirement, quote revision refs and bounded inputs |
| `policy_snapshot` | map | Weights, hard constraints, caps and scope |
| `normalisation_anchors` | map | min/max per cost, lead_time, carbon |
| `factor_snapshots` | array | Exact factor values/metadata used |
| `results` | array, max 4 | All candidate outcomes, including excluded/incomplete |
| `ranked_quote_ids` | array | Eligible/feasible results only |
| `winner_quote_id` | string/null | From code, not model |
| `status` | enum | `complete`, `incomplete`, `no_feasible_option` |
| `limitations` | array<string> | Bounded human-readable notes |
| `created_at` | timestamp | Server time |

Per-result fields: `quote_id`, `quote_revision_id`, `eligibility`, `reasons`, `technical_checks`,
`comparable_cost_amount`, `currency`, `cost_basis_id`, `lead_time_days`, `arrival_date`,
`budget_pass`, `delivery_pass`, `moq_pass`, `mass`, `carbon`, `metric_scores`, `weighted_score`,
`scenario_constraints_pass`. Monetary/physical results use decimal strings; scores may be numbers.
Unavailable result fields remain null. A known constraint failure still permits partial diagnostics.

An evaluation is immutable. Staleness is computed by comparing recorded revisions with current
case/quote state, not by rewriting its inputs. A new evaluation gets a new ID.

# 16. Carbon Calculation Contract
Pure test example, explicitly **not a production reference factor**:
```json
{
  "shipment_mass_tonnes": "10",
  "distance_km": "600",
  "factor_kgco2e_per_tonne_km": "0.1",
  "factor_id": "TEST_ONLY_ROAD_ARITHMETIC",
  "is_test_only": true
}
```
Expected arithmetic output: `"600"` kg CO₂e. Live validation rejects this factor.
`carbon` result includes `estimated_logistics_co2e_kg`, `scope_id`, `accounting_boundary`,
`route_complete`, `mass_basis`, `legs[]` with formula inputs/results and factor snapshot refs,
`data_quality_notes`, `uses_proxy`, `uses_test_factors`. No fabricated numeric confidence.

# 17. Cost Calculation Contract
50,000 metres × USD 2.85/metre = USD 142,500 before explicit adjustments. Material cost per
kg uses confirmed net mass, not gross cargo. Return `quoted_cost_amount`, adjustment list,
`comparable_cost_amount`, currency and reviewed common `cost_basis_id`.
P0 does not automatically interpret the full legal/cost allocation of an Incoterm.

# 18. `scenarios`
| Field | Type | Rule |
|---|---|---|
| `name`, `preset` | string/enum | `balanced|lowest_cost|lower_carbon|fastest_delivery|custom` |
| `kind` | enum | `baseline|weight_change|constraint_filter|requirements_change` |
| `base_evaluation_id` | string/null | Required except a fresh baseline |
| `weights` | map | Exactly cost, lead_time, carbon |
| `constraints` | map | Optional relative cost/carbon caps |
| `confirmed_by_uid`, `confirmed_at` | identity/timestamp | Human API only |
| `case_data_revision` | integer | Revision user reviewed |
| `created_at` | timestamp | Server |

Caps use `maximum_cost_increase_pct` and `minimum_carbon_reduction_pct`. For a requirement
change, user confirms a new requirement revision/baseline; do not alter prior evaluation anchors.
An agent's proposed scenario is an unconfirmed proposal in its run output, not a persisted
approved scenario. Confirmed scenario records are immutable; edits create a new one.

# 19. Scoring Contract
Three metric scores and three weights only. Balanced `{cost:.45,lead_time:.25,carbon:.30}`;
Lower Carbon `{cost:.10,lead_time:.10,carbon:.80}`. Complete, eligible set establishes frozen
baseline anchors. Return calculated numeric `weighted_score` and `winner_quote_id`.

Missing carbon never becomes score 100. Ineligible offers may have diagnostic raw values
but no recommendation score. Exact equal values, ties and filtering follow CALCULATION_SPEC.

# 20. `recommendations`
Fields: `evaluation_id`, `run_id`, `recommended_quote_id`, `summary`, `tradeoffs`, `limitations`,
`evidence_refs`, `model_id`, `prompt_version`, `created_at`, `validation_status`.
`recommended_quote_id` must match evaluation winner; when no winner, null.

Prefer structured references to numeric results so UI numbers are rendered from the evaluation,
not retyped by Gemini. If validation fails, preserve actual metrics and show explanation unavailable.

# 21. Grounding Snapshot
The immutable evaluation is the grounding snapshot; reference its ID and input fingerprint.
Do not store another handwritten duplicate table with subtly different costs/carbon values.
Link every explanation claim to a result or recorded user assumption. Old recommendations
are historical when inputs change, not reusable current advice.

# 22. Sustainability Evidence — minimal embedded fields, richer collection deferred
P0 uses `validated_data.evidence_claims/evidence_reviews`. A claim records text, source and
optional certificate number. Human acceptance is scoped to this case and purpose.
Do not set `verified: true` from a PDF extraction. `not_provided` does not imply absence.
A separate sustainability-evidence database and issuer-check workflows remain P1/future.

# 23. `decision_reports` → `decisions`
Fields: `evaluation_id`, `recommendation_id` (nullable), `selected_quote_id`, `selected_by_uid`,
`selection_reason`, `created_at`, `input_fingerprint`, `summary_snapshot`.
The server rejects stale evaluations and noneligible selections. It permits a reviewed human
selection other than the score winner with a recorded reason. No agent tool creates decisions.
The in-app report renders this immutable snapshot; no purchase or external email is triggered.

# 24. `reference_emission_factors`
| Field | Type | Rule |
|---|---|---|
| `transport_mode` | enum | `road|sea` supported in P0 contract |
| `transport_category` | string | Actual category, not just generic mode |
| `factor_value` | decimal string | Positive, exact source precision |
| `factor_unit` | string | Must normalise to `kgco2e_per_tonne_km` |
| `source_name`, `source_url` | string | Required for live |
| `source_version`, `source_row_id` | string | Reproducible source location |
| `geography`, `proxy_suitability_note` | string | Applicability and limitations |
| `accounting_boundary` | enum | e.g. `ttw|wtw`; compatible within comparison |
| `review_status` | enum | `unreviewed|approved_for_demo|retired` |
| `reviewed_by`, `reviewed_at` | string/timestamp | Reference curation record |
| `licence_note` | string | Use/redistribution basis |
| `is_test_only`, `active` | boolean | Test records cannot be live |

New factor values get new IDs/versions; no silent mutation of historical factors. Approving
for demo means the team reviewed suitability, not regulatory certification. Unit-test coefficients
stay in test fixtures rather than this live collection. A checked publication does not mean
its specific rows have been selected or validated in this pack.

# 25. `certification_types` — no live collection required
Use a small documented enum for display and source-provenance capture. Initial choice can be
`oeko_tex_standard_100|buyer_document|other`; do not maintain a purported legal equivalence map.
The buyer's required evidence and human check are the only P0 gate.

# 26. `fx_rates` — deferred
No zero FX rate placeholder. Reject mixed currencies. Same-currency VND cases are possible
without implementing conversion. Add versioned FX source/time only with a deliberate later scope change.

# 27. Private Object Storage
```text
users/{uid}/cases/{case_id}/quotes/{quote_id}/source.pdf
users/{uid}/cases/{case_id}/runs/{run_id}/extraction.json
```
Backend owns uploads/downloads and checks the verified owner. Use generation/hash references
to preserve the source used by an evaluation. Original PDFs are never publicly readable.
Signed URLs, if later used, require short expiry and ownership checks; do not persist them as
permanent source identifiers. Runtime files are not Git assets.

# 28. Indexes and Query Plan
Queries are scoped to `/users/{verified_uid}/cases/...`, not cross-owner collection groups.
- Cases by updated_at descending; add status+updated_at only if actually queried.
- Quotes by created_at; max four, no complex search required.
- Runs by created_at; events by sequence ascending.
- Evaluations/recommendations by created_at or specific ID.
- Reference factors by document IDs in confirmed legs; no broad client reference-data writes.

Generate only indexes needed by implemented queries. Do not deploy speculative enterprise indexes.

# 29. Validation / Revision Behaviour
Use Pydantic request/result models as the API truth and generate/validate matching TS types.
All mutations take expected case/draft revisions; reject stale changes with HTTP 409.
Confirmation atomically creates the immutable quote revision, updates the pointer and increments
case revision. Cloud model calls must not occur inside a Firestore transaction retried by the SDK.

Compose a frozen evaluation input outside provider work; recheck revisions before accepting
results/decisions. If inputs changed during a run, preserve the result as historical and report
stale; never replace current results silently. Hashes exclude server-generated timestamps.

# 30. Security and Quotas
Deny browser Firestore/Storage read/write by default; business access is via authenticated API.
Server libraries bypass Firestore Security Rules [S06], so each endpoint AND each agent tool
must enforce ownership and state in shared services. CORS is not authentication.

`users/{uid}/limits/{period_id}` stores atomic quotas and an active-run lease. `system_limits`
stores a small global model-call budget/concurrency guard and kill switch. Clients and agents
cannot edit these. Limits are app controls, not guarantees of a cloud billing cap.

Proposed defaults: two demo cases/visitor, four quotes/case, 10 MiB/10 pages per PDF, one active
run/visitor, 40 model generations/visitor/day, 1,000 globally/day. Make values configurable,
measure real usage and enforce across instances with transactional reservations. Expired leases
allow recovery; a process-local counter alone is insufficient. Source files/logs are private.

# 31. Demo Seed Data
Source-of-truth JSON produces four PDF files and separate expected extraction fixtures.
Fixture factor `TEST_ONLY_ROAD_ARITHMETIC` may support local tests but must not be seeded
into a live deployment. See CALCULATION_SPEC for exact values and edge cases.

# 32. Shared Types and Agent Runs
Use generated OpenAPI contracts, not an independent handwritten TS schema. Shared enums:
```text
Eligibility: eligible | ineligible | needs_review
AI mode: live | fixture
Run status: running | succeeded | awaiting_review | failed | cancelled | timed_out | interrupted
Agent: coordinator | quotation_specialist | sourcing_specialist
```
`runs` fields: requested action, expected case revision, input fingerprint, idempotency key,
initiator UID, agent/model/prompt versions, AI mode, status, started/completed timestamps,
result refs, raw-output object path (private), model-call count, error and lease expiry.

`events` fields: monotonic sequence, event_type, agent_name, tool_name/null, status, safe
message, result ref/null, start/end timestamps and duration. Event types include run_started,
agent_delegated, tool_started, tool_completed, review_required, run_completed and run_failed.
Do not include hidden reasoning, auth tokens or full PDF content in public UI events/logs.

Idempotency uniqueness is owner+case+request key. Same key completed returns stored refs;
running returns current state/409, never launches a duplicate. After ambiguous provider failure,
report uncertainty and require an explicit new retry; exactly-once provider billing is not promised.

# 33. Build Order, Retention and Migration
Implement users/cases → quote upload/review revisions → evaluations → run/events → scenarios →
recommendations/decisions. Keep v1 suppliers/metrics/technical collections out of a new database.
If an old deployment exists, inspect it and propose migration; never delete or overwrite blindly.

Demo cleanup must explicitly remove child records and storage objects. Firestore parent deletion
does not cascade to subcollections [S04]; a TTL on a parent is not a complete cleanup policy.
Configure retention with the team; a cleanup script requires explicit execution authorisation.

# 34. Final Schema Principle
Typed, confirmed inputs and immutable calculations are authoritative. Agents only draft and
explain. Identity and human approval come from application controls, never generated text.
