# GreenProcure — deterministic calculation specification
**Version:** `textile_mvp_v2` · **Status:** implementation contract; no live carbon-factor set supplied

This document fills arithmetic/edge-case gaps deliberately. Rules are product engineering
choices, not a certified procurement or carbon accounting standard. Source differences are
recorded in DECISIONS.md. Use pure functions and Decimal arithmetic; no model calls in this engine.

## 1. Inputs and eligibility
Freeze requirement, confirmed quote revisions, cost/carbon scope, scenario and factor snapshots.
Only those frozen values enter an evaluation. Required inputs must be reviewed, consistent
and comparable. Collect all reasons rather than stopping at the first.

Classification order: any confirmed hard failure → `ineligible`; otherwise any mandatory
missing/unconfirmed/incompatible input → `needs_review`; otherwise `eligible`.
Technical, MOQ, full-delivery and configured budget constraints are hard gates. Only eligible
records with complete P0 metrics receive a preference score. Diagnostics may be shown for others.
No supplier-risk dimension, hidden quality inference or probability of default.

## 2. Technical matching
- Canonical composition fibre names and decimal percentages; sum within 0.1 percentage point
  of 100 for the demo policy. Do not silently renormalise invalid composition.
- Compare the union of required/quoted fibre keys, treating an absent fibre as 0 only when
  the source explicitly states a complete composition. Otherwise request clarification.
- `abs(quoted_pct - required_pct) <= composition_tolerance_pp` for each key.
- `min_gsm = target_gsm × (1 - gsm_tolerance_pct/100)` and corresponding maximum; inclusive.
- `usable_width_cm >= minimum_usable_width_cm`.
- Match construction and any explicit required colour/finish after harmless normalisation.
- A required evidence review must be accepted for the case by the human user. A text reference
  is not proof of issuer validity. Do not infer that missing evidence means bad environmental performance.

At 130 GSM ±5%, boundaries are 123.5 and 136.5. Default composition tolerance of 2 points
is a buyer demo choice, not a claim about textile industry acceptance standards.

## 3. Quantity, net mass and shipment mass
Order quantity is metres. Use quoted total width for mass, usable width for the technical gate.
Require review if these widths are ambiguous. Do not apply yield/overage automatically.

`estimated_net_kg = required_length_m × total_width_cm/100 × quoted_gsm/1000`

Use confirmed actual net weight only if it covers the same quantity; otherwise use geometry.
For fabric quoted per kg, cost uses this net fabric quantity. Gross freight weight is not a
substitute for material quantity.

Transport mass priority:
1. Confirmed actual gross mass for the same order, with explicit coverage validation.
2. Net fabric mass plus known packaging mass.
3. Net fabric mass only as a disclosed fabric-mass proxy excluding packaging.

Do not add packaging to actual gross mass. Negative/zero/impossible masses require review.
Where actual gross is inconsistent with a confirmed actual net mass, require clarification.
A discrepancy against an estimated net mass is flagged for review rather than asserted impossible.

## 4. MOQ, price and common cost basis
Convert requested quantity into the MOQ/price unit with the same confirmed net-mass inputs.
Below MOQ is ineligible; overbuying and split orders are not P0.

`quoted_cost = unit_price × quantity_in_price_unit`
`comparable_cost = quoted_cost + sum(reviewed_additions) - sum(reviewed_subtractions)`

One currency per case. Reject unreviewed/incompatible cost bases and duplicate adjustments.
Do not infer that `CIF`, a supplier city or an attractive price establishes all charges.
The comparison scope lists included/excluded categories. Label cost accordingly, not total
landed cost when taxes/duties/other components are absent. Monetary input/output is decimal-safe.
All UI amounts derive from the backend result; no JavaScript floating-point ranking divergence.

## 5. Delivery
`arrival_date = reference_order_date + confirmed_end_to_end_lead_time_calendar_days`
Day zero is the order reference date. No weekend/holiday/business-day model in P0.
The full quantity must arrive within the case maximum and budget. A 25-day quote passes a
25-day requirement; 26 fails. “Ready to ship in 15 days” is not an arrival commitment.
Unknown basis requires review; do not blindly sum overlapping durations.

## 6. Estimated logistics CO₂e
For each compatible leg:
`leg_kgco2e = shipment_mass_kg/1000 × distance_km × factor_kgco2e_per_tonne_km`
`total_kgco2e = sum(leg_kgco2e)`

Require positive known mass/distance/factor and a matching transport category. A genuinely
zero-distance leg needs explicit handling rather than a missing-distance default. P0 can
omit such a leg only when the reviewed route remains complete and it is disclosed.

Compare the same functional scope (e.g. each supplier gate to the same buyer gate), accounting
boundary and quantity. No silent omission of port/road legs in an alleged door-to-door option.
Separate TTW/WTW or other factor boundaries; do not add upstream fuel components twice.
Factor type must match its denominator: a per-vehicle-km factor cannot be used as per-tonne-km.
Document route synthetic status and factor geography/proxy limitations.

The government 2025 conversion-factor publication [S14] is a source candidate, not a verified
Vietnam-specific coefficient or the claimed latest release. Select exact rows and assess
applicability before live use. This context pack does not supply those selections.

Without an approved factor, carbon stays unavailable and no complete carbon-aware ranking
is claimed. Arithmetic fixtures may use `is_test_only: true`, but submission-mode checks
must reject them. Missing emissions must never score better than known emissions.

## 7. Scoring and frozen anchors
Use cost, end-to-end lead time and logistics CO₂e, all lower-is-better.
Compute min/max anchors from the complete eligible baseline candidate set. Retain full
precision internally. For metric x:

`score(x) = 100 × (max_x - x)/(max_x - min_x)`

When max_x = min_x, score is 100 for all such candidates. Scores are meaningful relative
to the frozen candidate set, not an external market benchmark. An empty eligible set has
no anchors/winner. A singleton gets 100s but is labelled the only eligible option.

`weighted_score = cost_score*w_cost + lead_time_score*w_lead_time + carbon_score*w_carbon`

| Preset | Cost | Lead time | Carbon |
|---|---:|---:|---:|
| Balanced | .45 | .25 | .30 |
| Lower Carbon | .10 | .10 | .80 |
| Lowest Cost | 1 | 0 | 0 |
| Fastest Delivery | 0 | 1 | 0 |

Reject negative weights and a sum not equal to 1 within a documented input tolerance of 1e-9.
Do not silently renormalise inputs. Tie-break exact internal scores by lower comparable cost,
then shorter lead time, then lexicographic quote ID. Round scores only for display.

Weight changes and filters reuse anchors and the same input revisions. New/changed quote or
requirement data requires a new baseline; do not opportunistically rescale after filtering.
A selected candidate outside the frozen set is not a valid weight-only comparison.

## 8. Relative constraints, staleness and human changes
Relative constraints are measured against the explicitly chosen baseline winner:

`cost_increase_pct = 100 × (candidate_cost - baseline_cost)/baseline_cost`
`carbon_reduction_pct = 100 × (baseline_carbon - candidate_carbon)/baseline_carbon`

The candidate must have the same order quantity, cost basis and carbon scope. Negative cost
increase means saving; negative carbon reduction means higher emissions. Zero baseline
cost/carbon makes the corresponding percentage undefined; do not divide or conceal it.
The threshold is evaluated using unrounded values.

`maximum_cost_increase_pct=5` and `minimum_carbon_reduction_pct=25` filter the feasible set.
No match returns `no_feasible_option`, not a forced winner. Confirmed hard-requirement edits
create a new baseline family and are labelled as such. Agents can propose, not approve.
Any source edit marks older evaluation/decision context historical. Saving a current decision
from a stale evaluation must fail until re-evaluated. Historical decisions remain immutable.

## 9. Concrete synthetic test fixture
**These values test behaviour, not market prices, real routes or published emission factors.**
All quotes cover 50,000 m, woven fabric, 150 cm total/usable width, common declared cost scope
and USD. A/B/C have 65/35 composition and 130 GSM; packaging is a known synthetic 250 kg.
D has 80/20 composition and is ineligible. All four are confirmed only after the review path.

| Input | A | B | C | D |
|---|---:|---:|---:|---:|
| Unit price USD/metre | 2.85 | 2.94 | 2.70 | 2.50 |
| End-to-end calendar days | 20 | 23 | 30 | 10 |
| MOQ metres | 20,000 | 20,000 | 20,000 | 20,000 |
| Synthetic road distance km | 600 | 150 | 400 | 80 |
| Technical result | Pass | Pass | Pass | Fail composition |

For arithmetic tests only, use factor `0.1 kgCO₂e/tonne-km` with ID
`TEST_ONLY_ROAD_ARITHMETIC`. Net mass = 9,750 kg; transport mass = 10,000 kg.

| Calculated outcome | A | B | C | D |
|---|---:|---:|---:|---:|
| Comparable cost USD | 142,500 | 147,000 | 135,000 | 125,000 |
| Test-only emissions kgCO₂e | 600 | 150 | 400 | 80 |
| Eligibility | Eligible | Eligible | Ineligible: late | Ineligible: spec |
| Balanced score | 70 | 30 | Not ranked | Not ranked |
| Lower Carbon score | 20 | 80 | Not ranked | Not ranked |

B costs 4,500/142,500 ≈ 3.1579% more than A and has 75% lower transport estimate in this
synthetic scenario. Both meet deadline and budget. With maximum +5% cost and minimum 25%
carbon reduction, B qualifies; with maximum +2% and minimum 25%, no candidate qualifies.

For a live demo use a reviewed road-category factor applicable to the described scenario.
Using the same compatible positive factor across A/B preserves the relative 75% difference,
but actual kgCO₂e must be recalculated and displayed from that factor. Never copy the test
coefficient into production. If vehicle/category assumptions differ, review the comparison anew.

B may initially omit its transport mode. Before human clarification/confirmation it has no
complete score. This is a real state transition, not an animation. Adding the reviewed mode
creates a new revision/baseline; it is not an invisible edit to the old snapshot.

## 10. Required unit and integration cases
Test composition union/tolerance, GSM boundaries, width and MOQ; per-metre and per-kg cost;
net vs gross mass; missing packaging/transport/factor; cost scope mismatch; full vs production
lead time; all-equal metrics; singleton/empty sets; ties; negative/nonunit weights; percentage
zero denominators; stale revisions; constraints preserving exclusions; no fabricated confidence.

Security/agent tests verify cross-owner tool calls fail, PDF instructions cannot approve fields,
agent-proposed scenarios are unconfirmed, real events match executed work, and model failure
never invokes fixture fallback. Live smoke tests are opt-in and recorded separately.
