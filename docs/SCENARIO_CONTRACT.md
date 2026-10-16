# Scenario exploration: proposed API handoff

**Status:** proposal for Minh and Mạnh to review; not an agreed or implemented API.

**Prepared:** 16 October 2026. **Branch scope:** `feat/ui-scenarios`, UI and handoff only.
The branch supplies an editor and a labelled development walkthrough with prepared outcomes.
It adds no calculation engine, scenario/evaluation API, persistent scenario, AI call or saved
final decision. A simulated Apply action is not a real human confirmation on the backend.

The buyer outcome is to explore preferences and relative limits against one frozen baseline,
understand the resulting tradeoffs, then deliberately apply the reviewed settings without
changing requirements or overwriting the original comparison.
Authority: [PRD FR-16 and FR-18](GreenProcure_Vietnam_Textile_SME_PRD.md),
[calculation specification sections 7–9](CALCULATION_SPEC.md), [schema sections 15 and 18–21](GreenProcure_Vietnam_Textile_SME_Database_Schema.md),
[architecture](ARCHITECTURE.md) and [comparison handoff](QUOTATION_COMPARISON_CONTRACT.md).

## 1. Implementation boundary and ownership

The current API has case list/create/read and health routes only. Scenario preview,
confirmation, evaluation and operation-readback endpoints below do not exist. Case responses
remain draft/revision 1; CORS/idempotency, revision-aware models and generated TypeScript need
coordinated backend changes before integration. Pydantic/OpenAPI owns transport names/types;
presentation models and static fixtures do not become the API contract by being used in UI.

Every route and agent-tool service verifies Firebase identity, configured App Check policy,
case ownership and referenced scenario/evaluation/quotation membership. Owner identity comes
from trusted authentication, never a body field. Unknown and other-owner IDs have the same
safe not-found response. Do not expose direct Firestore/Storage access or raw credentials.

## 2. Separate draft, preview, confirmed scenario and evaluation

| State | Meaning and permitted next step |
|---|---|
| Local draft | Unsaved weights/caps; may be incomplete or invalid; edit or restore baseline |
| Draft preview | Deterministic result for the exact draft and baseline; not approved or selectable for a final decision |
| Confirmation requested | Buyer reviewed the settings; await the exact scenario-save outcome |
| Confirmed scenario, evaluation pending | Scenario exists, but no complete current evaluated result is established |
| Evaluated scenario | Immutable evaluation references the exact confirmed scenario and frozen baseline |
| Historical or outcome unknown | Retain known records, identify the affected operation, and resolve freshness/outcome before advancement |

Do not display “Applied” merely because a preview succeeded or a confirmation request was sent.
Distinguish “Scenario saved; evaluation unavailable” from “Scenario save outcome unknown”.
A saved scenario survives a later evaluation failure. Retrying evaluation must not reconfirm
or duplicate that scenario. Edits after confirmation are a new local draft, not mutations to
its saved record. The original baseline remains available throughout.

## 3. Proposed routes

Paths use `/api/v1`. Scenario confirmation and evaluation routes follow the architecture;
preview, scenario read and scoped operation lookup are proposed additions.

| Method and path | Responsibility |
|---|---|
| `POST /cases/{case_id}/scenario-previews` | Read-only deterministic preview of unconfirmed settings against one frozen baseline |
| `POST /cases/{case_id}/scenarios` | Human confirms an immutable scenario after reviewing its settings |
| `GET /cases/{case_id}/scenarios/{scenario_id}` | Read the exact saved settings, provenance and current freshness |
| `POST /cases/{case_id}/evaluations` | Evaluate that confirmed scenario; reuse the comparison contract |
| `GET /cases/{case_id}/evaluations/{evaluation_id}` | Read immutable result with computed freshness and capabilities |
| `GET /cases/{case_id}/scenario-operations/{request_key}` | Resolve an exact confirmation or related evaluation request |

Confirmation is absent from coordinator/specialist tool allowlists and rejected by shared
services for agent-origin calls. A future platform agent can propose structured settings or
request a nonapproved preview, but the human-facing confirmation route remains a user action.
No natural-language action may silently relax requirements, apply settings or save a decision.

## 4. Baseline and request identity

Every request identifies the authorized root baseline explicitly, not “latest” or whichever
scenario was viewed most recently. Proposed expected-context fields:

- `base_evaluation_id` and `expected_baseline_input_fingerprint`.
- `expected_case_data_revision` and `expected_quote_revision_refs`, each containing
  `quote_id` and `quote_revision_id` for the frozen candidate set.
- `expected_baseline_winner_quote_id` and `expected_anchor_set_id`.
- `expected_scope`: `requested_length_m`, `currency`, `cost_basis_id`, `carbon_scope_id`
  and `accounting_boundary`, using the baseline's exact canonical values.

`anchor_set_id` is a proposed content-addressed reference to the baseline's immutable
`normalisation_anchors`; it is not an existing database-schema field. The server derives and
checks it. Clients cannot supply substitute anchors or establish trust by echoing an ID.
Scope/anchor references are consistency guards; the server loads actual values from records.

The baseline fingerprint includes its policy/factors. A scenario result has a new
`input_fingerprint` because its policy changes; it must not be required to equal the baseline
fingerprint. Instead verify its `baseline_evaluation_id`, saved `scenario_id`, frozen input
references, anchor reference and matching policy snapshot. Keep both identities explicit.

Reject changes to requirement/quote revisions, quantity, currency, reviewed cost basis, carbon
boundary, factor set or frozen candidate membership. Such changes require a new baseline
family with explicit review, not opportunistic rebasing of a weight-only scenario. Comparing
against the previous scenario winner or the buyer's selected alternative is not equivalent
to the explicitly chosen baseline winner and must never happen silently.

## 5. Settings and decimal validation

Use `name`, `preset`, `kind`, `weights`, `constraints` and `base_evaluation_id` from schema 2.0.
`preset` is `balanced`, `lowest_cost`, `lower_carbon`, `fastest_delivery` or `custom`.
`weights` has exactly `cost`, `lead_time`, `carbon`, expressed as decimal strings in [0,1].
Reject negatives, nonfinite/malformed values and a sum outside 1 ± 0.000000001. Do not silently
renormalize, alter another field or choose a different preset to repair an invalid draft.
UI percentage fields convert to fractions with decimal-safe handling, not ranking arithmetic.
The current presentation editor accepts at most two decimal places and requires its percentage
weights to total exactly 100. Cost-cap input has a 32-character resource bound. These UI limits
do not establish backend numeric precision; the generated integration adapter must agree it.

| Preset | Cost | Lead time | Carbon |
|---|---|---|---|
| Balanced | `0.45` | `0.25` | `0.30` |
| Lowest Cost | `1` | `0` | `0` |
| Lower Carbon | `0.10` | `0.10` | `0.80` |
| Fastest Delivery | `0` | `1` | `0` |

Constraints use nullable decimal strings `maximum_cost_increase_pct` and
`minimum_carbon_reduction_pct`. Null disables a cap; `"0"` is an active zero threshold.
Maximum cost increase is nonnegative; minimum carbon reduction is between 0 and 100 inclusive.
Backend input-size/precision bounds require agreement; a narrower demonstration control is
not an unstated business limit. Reject unknown constraint keys and split-sourcing settings.

A preset name must match its exact weights. Changing preset weights produces Custom.
Caps remain explicit when choosing a preset; the UI must not invisibly drop existing limits.
For this proposal, use `weight_change` when no cap is active, `constraint_filter` when any cap
is active (including combined weight/cap edits). `baseline` and `requirements_change` belong
to their dedicated creation/review workflows, not this scenario editor.

## 6. Deterministic preview and immutable results

The preview body combines expected context with the proposed settings. It contains no user
identity, trusted score, winner, factor value, cost/carbon result or claim of approval.
The same backend domain functions power direct preview and approved-scenario evaluation;
no Gemini call is needed for slider/input changes. Bound and debounce preview requests.
Each response echoes a server-computed `draft_fingerprint` and baseline identity. The UI
accepts it only if the current draft/context still match; discard late responses from earlier
edits without replacing the current preview. Clearing one cap invalidates that draft result.

Proposed preview response includes `preview_id`, `draft_fingerprint`, validated `settings`,
`base_evaluation_id`, `baseline_input_fingerprint`, `anchor_set_id`, `scope_snapshot`,
`freshness`, `results`, `ranked_quote_ids`, `winner_quote_id`, `status`, `issues`, `limitations`
and `capabilities` (`can_apply`, `blocked_reasons`). These are unconfirmed preview fields,
not an immutable saved evaluation or permission to save a final decision. Preview tracking
may be ephemeral; its retention/expiry is an integration decision, not assumed persistence.

Only the complete eligible frozen baseline set supplies anchors. Reweight/filter those same
candidates; never recompute anchors from the surviving rows. A filtered singleton keeps its
baseline-relative score rather than automatically receiving 100. Existing hard technical,
MOQ, budget, full-order deadline and required-evidence failures remain visible and excluded.
Zero carbon weight does not waive missing approved factors or comparable mandatory metrics.

Use full internal decimal precision for scores and caps. Round display only. Deterministic
ties use lower comparable cost, shorter lead time, then lexicographic quote ID. The backend
returns authoritative order/winner; neither the browser nor an explanation invents one.
Use the comparison snapshot schema for saved evaluations, including exact factor snapshots,
policy snapshot, confirmed quote refs, calculation version, limitations and baseline linkage.

## 7. Relative deltas and unresolved arithmetic

For every candidate, compare the same quantity and declared cost/carbon boundaries with the
frozen baseline winner. Code calculates:
`cost_increase_pct = 100 × (candidate_cost - baseline_cost) / baseline_cost` and
`carbon_reduction_pct = 100 × (baseline_carbon - candidate_carbon) / baseline_carbon`.
A saving may be negative cost increase; a carbon increase may be negative carbon reduction.
Retain those signs. Zero delta means a known equality, not a missing or undefined value.

If a denominator is zero, its percentage is null with an explicit reason, even for 0/0.
Absolute differences may remain available. Do not display zero percent, infinity or a pass.
An enabled cap requiring that undefined percentage blocks a complete filter result; show
an `incomplete` preview with a specific issue such as `UNDEFINED_RELATIVE_CONSTRAINT`.
A disabled cap does not require its percentage to be defined. Backend capability rules still
check the remaining metrics and inputs; the UI cannot waive a blocker by inventing a delta.

`no_feasible_option` means valid, fully evaluable constraints exclude all eligible candidates.
It is not an error, missing-data state or instruction to relax hard gates. Return null winner
and empty ranked IDs, preserve baseline/diagnostic results, and explain which cap each offer
fails. A reviewed scenario may be confirmed even when it yields no feasible option, if the
server permits it, but no offer can advance from that result to a final decision.

## 8. Explicit Apply and two-stage recovery

The buyer first reviews exact weights/caps, baseline identity, scope, changed settings and
limitations. Only then does **Apply scenario** POST the validated settings and expected context
to `/scenarios` with `Idempotency-Key`. Do not rely solely on a cached preview: revalidate
current records, then atomically persist immutable scenario and confirmation-operation result.
The server supplies `scenario_id`, `confirmed_by_uid`, `confirmed_at`, `created_at` and
`case_data_revision`. It records the approved baseline/anchor/scope references as proposed
schema extensions. A preview ID is optional provenance, never the sole authority to approve.

Confirming this new scenario does not edit requirements, confirmed quotes or the frozen
baseline. Proposed policy: it does not advance their data revision or overwrite an active
baseline pointer. If an active-scenario navigation pointer is added later, version it separately
and define its concurrency contract; creating a scenario alone does not change old evaluations.

After confirmation is known successful, POST `/evaluations` with that exact `scenario_id`,
expected current input references and its own idempotency key. Do not send this request until
the scenario-save outcome is resolved. The resulting immutable evaluation must match the
saved settings, root baseline and anchor/scope references before the UI marks the scenario
applied. A result obtained after input edits is historical, not a current decision basis.

| Failure point | Required feedback and recovery |
|---|---|
| Preview rejected or unavailable | Keep the draft and previous baseline; fix settings or retry preview; nothing is confirmed |
| Scenario save conclusively rejected | Keep reviewed draft and safe reason; explicitly retry corrected settings when allowed |
| Scenario save response lost | “Scenario save outcome unknown”; read the same operation, then exact scenario; do not evaluate or resubmit with a new key |
| Scenario saved, evaluation fails | “Scenario saved; evaluation unavailable”; retain scenario ID and retry evaluation only |
| Evaluation response lost | Read its operation and exact evaluation ID; do not reconfirm the scenario or assume a winner |
| Context becomes stale | Retain historical records and draft separately; establish/review a new baseline before applying again |

All mutation operations are scoped to owner, case, kind and canonical-body hash. Same key/body
returns recorded references; changed body conflicts. Authenticate before lookup. Resolve a
matching committed operation before rejecting its now-old expected revision. A 404 alone
is not proof no write occurred; agree reservation, retention, leases and reconciliation.
Unresolved readback blocks a duplicate mutation. Preserve submitted settings/context/key
separately from later edits; never apply a response to a different draft or silently retry it.

An operation read returns its key/kind/state and nullable `scenario_id` / `evaluation_id`,
plus safe error and timestamps. Readback cannot execute work. Use bounded actual execution,
not an untracked background task after a `202`. No fabricated tool events or completion
percentages. This proposal makes no exactly-once provider-billing claim.

## 9. UI capabilities, explanation and future agent

Current saved scenario/evaluation, editor draft and optional explanation have independent
state. Editing the draft must label the shown result as belonging to earlier settings and
block advancement as though those new settings had been applied. Restoring saved settings
or explicitly returning to the baseline restores their exact references, not a rebuilt winner.
Verify expected identity and capabilities again when opening the local decision handoff.
Final decision persistence and selection reasons remain a separate human-only milestone.

Optional explanation is requested separately against an exact saved evaluation. Its pending,
failed or unknown read-only operation does not invalidate a matching current result or buyer
choice; duplicate explanation recovery remains separate. Reject mismatched evaluation IDs,
fingerprints, winner and evidence refs as specified by the comparison handoff.

The future general platform agent uses screen/case/quote/evaluation/version/unsaved-state
context and server-allowlisted tools through the planned coordinator and specialists. It may
propose weights/caps and explain a nonapproved preview. It cannot confirm this scenario,
change hard requirements or save a final decision. Unsupported split sourcing is explained,
not converted into an unrequested alternative. This branch adds no agent control or runtime.

## 10. Development walkthrough and acceptance boundary

Prepared outcomes cover the four named presets and Custom 20% cost / 20% delivery / 60% carbon.
Each supports exactly three prepared cap combinations: neither cap; maximum +5% cost with
minimum 25% reduction; maximum +2% cost with minimum 25% reduction.
Other syntactically valid settings remain editable but show “No prepared outcome for these
settings”; no browser engine or hidden fixture substitution calculates a result. Prepared cap
variants, missing-data/stale/zero-denominator/recovery demonstrations remain explicitly
synthetic. A valid setting without a fixture is not described as invalid procurement policy.
The connected preview endpoint, once implemented, must support the agreed valid policy space.

The independent canonical fixture uses 50,000 m, 150 cm total/usable width, 130 GSM and
10,000 kg shipment mass, separate from the review PDF's 152 cm. A/B Balanced scores are
70/30; Lower Carbon scores are 20/80. C/D remain hard-failed. Test-only emissions are 600/150
kg CO₂e, not approved live estimates. B costs about 3.1579% more than baseline A and reduces
the synthetic estimate by 75%: +5% cost / 25% reduction permits B, +2% / 25% permits none.
Filtering retains original anchors and the scores under the same weights; it never rescales
a filtered singleton. Never attribute supplied result
references to an uploaded PDF or a confirmation performed in another preview.

Before integration, verify frozen-anchor filtering, all presets/custom validation, out-of-order
preview responses, null/zero caps, undefined denominators, hard-failure preservation, no-feasible
results, cross-owner access, revision conflicts and both save/evaluation lost-response paths.
Verify keyboard controls, narrow/enlarged layouts and explicit human review. These are required
acceptance checks, not claims of executed backend tests or completion of PRD FR-16/I3.
