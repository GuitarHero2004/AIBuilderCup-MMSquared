# GreenProcure — Vietnam Textile SME MVP PRD
**Version:** 2.0 · **Date:** 1 October 2026 · **Team:** Minh and Mạnh
**Focus:** one fabric sourcing decision · **Status:** implementation requirements, not verified features

The domain and workflow derive from the supplied v1 PRD. Changes in scope, maths, identity
and agent design are explicit in DECISIONS.md. Priority means build order, not current completion.

# 1. Product Summary
Help a Vietnamese garment SME buyer compare reviewed fabric offers that satisfy technical,
commercial and delivery requirements, with estimated logistics emissions shown before selection.
One coordinator and two specialists support extraction and decision explanation. Python tools
own authoritative results. The buyer approves data and decisions.

# 2. Problem Statement
The working hypothesis is that inconsistent quotation fields, units, specifications and
shipping terms make manual fabric comparison difficult. A cheap but technically unsuitable
or late offer is not a useful recommendation. The app makes missing evidence and assumptions
visible instead of concealing them inside an AI answer. No measured time saving is assumed.

# 3. Target Users
Primary: procurement buyer at a Vietnam textile/garment SME. The buyer knows order requirements,
can correct extracted terms and can ask suppliers for clarification. Secondary sourcing,
operations and sustainability users do not get distinct workflows in P0.

Demo visitors use private anonymous accounts; team collaboration happens in GitHub, not a
new enterprise organisation-management feature inside the app.

# 4. MVP Demo Case
50,000 metres, woven 65/35 polyester/cotton, 130 GSM ±5%, usable width ≥150 cm,
maximum 25 calendar days from an explicit order reference date, USD 150,000 budget.
Composition tolerance defaults to ±2 percentage points per fibre. Colour/finish/construction
must be the same in the prepared clean comparison. Default certificate requirement: none.
All entities and shipping routes are synthetic. Details are in CALCULATION_SPEC §9.

# 5. Product Goals
The completed demo must show live PDF extraction, editable review, real eligibility and
calculations, persisted data, a legitimate A/B trade-off, bounded specialist delegation,
real activity events and human selection. It must not need direct database edits.

# 6. Non-Goals
No ERP, orders/contracts/payments, supplier marketplace, agent email sending, full LCA or
Scope 3, certificate verification, risk prediction/training, live route/FX feed, splitting
volume among suppliers, cutting-yield optimisation, multi-organisation roles or PDF export.
Product vision still includes these where appropriate; they are not hidden P0 requirements.

# 7. Core User Journey
```text
Try demo → private case → requirement + quote PDFs
→ Coordinator → Quotation Specialist → unconfirmed extraction + sources
→ HUMAN REVIEW AND CONFIRMATION
→ Coordinator → Sourcing Specialist → deterministic evaluation + explanation
→ user-confirmed scenario → recalculation → HUMAN SELECTION → saved summary
```
Direct UI actions can invoke the same domain services without a model call. Agents add
natural-language interpretation and task delegation, not mandatory latency to every click.

# 8. Functional Requirements

## FR-01 — Identity and private demo [P0]
Firebase anonymous sign-in supplies a UID. Every business API verifies the ID token and
uses its subject as owner; never accept owner identity from JSON or model tool arguments.
A user can start a demo without registration or a shared password.

Acceptance: incognito entry works; two visitors cannot read/write each other's cases,
files, run events or recommendations; expired tokens produce a recoverable auth state.
Refreshing the same session can reload persisted data. Recovery across browsers is not P0.

## FR-02 — Create Fabric Sourcing Case [P0]
Required: name, reference order date, destination, quantity in metres, maximum lead time,
budget/currency, comparison-cost basis and textile specification. Quantity/budget positive.
Store composition, tolerance in percentage points, GSM tolerance percent, usable width,
construction, optional required colour/finish and evidence requirements.

Default weights: cost .45, lead_time .25, carbon .30. Sum must be 1.
Hard budget and delivery checks are enabled. Requirement edits increment case data revision
and invalidate dependent evaluations. No risk weight or zero placeholder FX rate.

Acceptance: fields validate; state survives reload; no hidden assumption about day zero,
production-only lead time or extra material purchasing.

## FR-03 — PDF Upload and Sample Selection [P0]
Four quotes maximum per case; one PDF per extraction run. Proposed app limits: 10 MiB,
10 pages, accepted PDF content signature and MIME. Reject unsupported/encrypted input with
an actionable error rather than hanging. Preserve the original file and SHA-256.

A sample loader copies labelled synthetic PDFs into the visitor's private case and runs
the same extraction path as uploaded files. Expected JSON belongs only in tests.
Acceptance: oversize/non-PDF and fifth-quote requests are rejected server-side; duplicate
retry does not silently create another charged extraction; failed runs can be retried explicitly.

## FR-04 — Quotation Specialist Extraction [P0]
Extract commercial, textile and logistics groups defined in the schema. Keep `raw_extraction`
unmodified; edit a separate review draft. A field records value, source type, document/page/
excerpt where available, review state and optional note. Use nullable structured output.

Acceptance: changed PDF terms cause changed extracted values; missing mode stays null;
ambiguous “15 days” is not silently confirmed end-to-end; invalid model JSON fails validation;
no supplier-name answer lookup or hard-coded result. Model confidence is not calibrated probability.

## FR-05 — Human Review and Technical Gate [P0]
The user reviews/corrects values and explicitly confirms a quote revision. Record reviewer,
time, original extraction reference and changes. Quotation/agent tools cannot call confirmation.

Document screening checks composition, GSM, usable width, construction and any required
colour/finish. A known hard failure is `ineligible`; unconfirmed/missing required data is
`needs_review`; only passing reviewed records can be `eligible`. This is not fabric testing.

Acceptance: boundary values are tested; unreviewed extraction cannot be recommended; a
required evidence claim needs a human applicability check; edits make old results stale.

## FR-06 — Missing Information [P0]
Classify missing values by what they block: technical screening, cost comparison, delivery,
carbon calculation or required evidence. Show exact fields and reasons, not one vague score.

Acceptance: missing carbon is not zero; missing required evidence is not a pass; noncritical
notes do not unnecessarily block known metrics; partial results are visibly incomplete.
The user may enter an assumption, but must confirm it and retain its provenance/limitation.

## FR-07 — Clarification Draft [P0, text only]
The Quotation Specialist produces copyable clarification text for actual unresolved gaps.
This narrow feature is promoted from v1 P1 to demonstrate a useful specialist response.
No email account, sending API or external action is needed.

Acceptance: asks about the missing value/basis and does not invent supplier replies.

## FR-08 — Quantity Normalisation [P0]
The order unit is metres. Quote price units supported: metre and kg. Use confirmed net fabric
mass for per-kg material pricing. MOQ must have a compatible unit. Unsupported yards/rolls
remain review-required; do not assume a fixed roll length.

Acceptance: per-kg and per-metre costs reproduce expected values; unknown units cannot be
scored; no automatic excess purchasing to satisfy MOQ.

## FR-09 — Net Fabric and Shipment Mass [P0]
Net fabric mass = requested length × confirmed total fabric width × quoted GSM / 1000.
Use total width for mass; use usable width for technical eligibility. When only one width
is supplied, any shared use requires an explicit reviewed assumption.

Prefer confirmed gross shipment weight covering the same order. Otherwise net fabric plus
known packaging; if packaging unknown, show a fabric-only proxy. Never use gross weight to
price net material per kg or add packaging twice.
Acceptance: 50,000×1.5×130/1000 = 9,750; at 128 GSM = 9,600; mismatched actual weight basis
requires review; proxy versus actual source is visible.

## FR-10 — Comparable Cost and Delivery [P0]
Use decimal arithmetic. Normalise all candidates to the same user-confirmed cost scope.
Store which charges are already included and any explicit add/remove adjustments.
Default label: “Comparable procurement cost — declared basis”, not “total landed cost”.
Single currency only; mismatched/unknown currency or freight inclusion blocks cost ranking.

Use confirmed full-order, end-to-end calendar days. Production and shipping fields are
context, not automatically summed if overlapping or ambiguous. All quantity must arrive by
the deadline. Budget failure and MOQ excess requirement are hard failures.
Acceptance: same-basis totals match; included freight is not counted twice; 25 days passes,
26 fails; altering carbon weights cannot override either check.

## FR-11 — Logistics Carbon [P0]
Sum typed per-leg mass-distance-factor calculations across a complete declared boundary.
Road is enough for the first release dataset; road/sea leg schema permits simple multimodal
routes later without a route-search service. No need for rail/air just for dropdown breadth.

Factor records carry source, version, row/category, unit, geography/proxy note, accounting
boundary and review status. Missing/unverified factors block live carbon comparison.
The UI shows boundary, mass/distance provenance and limitations. Estimates are not verified
product footprints, realised savings or credits.
Acceptance: deterministic output; no double counting between fuel boundaries; partial
first/last-mile coverage is not called complete; test factors cannot enter submission mode.

## FR-12 — Supplier Risk [Deferred]
Preserve as roadmap only. P0 has no synthetic delivery-history rating, raw risk score or
risk weight. Show concrete observed issues separately. Later risk modelling requires a
specified dataset, formula, validation and missing-data policy.

## FR-13 — Comparison Dashboard [P0]
Show each quote's technical/constraint status, reasons, common-basis cost, end-to-end lead
time, logistics emissions, provenance limitations and score when eligible. Separate incomplete
and rejected offers from ranked offers. No green badge based on document count.

Acceptance: no sorting null as zero; reasons visible with keyboard-accessible controls;
labels do not rely on colour; excluded quotes cannot be selected as normal recommendations.

## FR-14 — Weighted Scoring [P0]
Use exact CALCULATION_SPEC rules: baseline min/max anchors, 100 for equal values, immutable
anchors for weight-only scenarios, deterministic tie-breaking and stale input detection.
Only cost, lead_time and carbon are supported. The output is a preference score, not an
accuracy or sustainability score. An offer without complete comparable P0 metrics has no score.

Acceptance: backend owns the ranking; UI and Gemini cannot substitute values; test A wins
Balanced and B wins Lower Carbon; C/D never win while constraints are unchanged.

## FR-15 — Sourcing Specialist Recommendation [P0]
The agent loads confirmed authorised state and calls the evaluation tool. It explains the
returned ranking and limitations. Save the evaluation ID, tool result refs, prompt/model
metadata and structured explanation. User-visible amounts come from the calculation snapshot.

Acceptance: recommended quote ID matches engine winner; an invalid narrative is rejected or
shown as unavailable; AI cannot fabricate risk, certification, supplier history or permissions.
If generation fails, show actual calculations with an explicit missing-explanation message.

## FR-16 — Scenario Lab [P0]
Presets: Balanced, Lowest Cost, Lowest Carbon, Fastest Delivery, Custom. Slider changes
calculate directly; a user-requested explanation invokes the agent separately.
Natural language can propose weights/cost-increase/carbon-reduction caps. Show a structured
proposal for user confirmation before persistence/evaluation. Agents do not call that endpoint.

A percentage comparison references a frozen baseline winner and matching quantity/cost/carbon
boundary. Any relaxation of technical/budget/deadline requirements requires explicit user
confirmation and a new evaluation family; never present it as a weight-only scenario.

Acceptance: `no_feasible_option` is valid; old baseline not overwritten; zero denominator
handled; repeated slider moves do not call Gemini; unsupported split-sourcing request is clear.

## FR-17 — Textile Evidence [P0 minimal; P1 richer analysis]
P0 may capture certificate text and a required-evidence human review. Issuer verification,
expiry monitoring, ESG extraction/dashboard and GRS/RCS workflows are P1/future.
Evidence absence is not negative environmental performance. Default demo does not need a
certificate to run. Do not generate plausible counterfeit certificates for test material.

## FR-18 — Final Decision Summary [P0]
Human chooses an eligible quote in a current evaluation, adds a reason and saves. An explicit
choice different from the preference winner is allowed only among eligible quotes and is
labelled a buyer selection, not rewritten as the AI's original choice.

Store immutable requirement/input refs, calculations, chosen policy, recommendation, human
choice, assumptions and limitations. In-app view only; export is later.
Acceptance: confirmation cannot be called by agent; stale evaluations are rejected; edits
never rewrite a past decision; no purchase order is sent.

## FR-19 — Coordinator and Two Specialists [P0, staged]
Three agent definitions in one backend: coordinator, quotation_specialist, sourcing_specialist.
Prefer agents-as-tools delegation; no extra services or cyclic transfers. Apply allowlists,
server-owned context, bounded model calls and human checkpoints at tool-service boundaries.

Acceptance: actual specialist invocation is observable; quotation agent cannot confirm or
approve; sourcing agent cannot read unreviewed/raw documents by default; a fresh process can
rehydrate business state without relying on previous in-memory agent chat.

## FR-20 — Activity, Failure States and Quotas [P0]
Show real run/agent/tool states with safe result refs, not a fabricated thinking transcript.
Record stable error code, retryability, timings and request/run ID. Persist limits rather
than using per-container counters alone.

Acceptance: model timeout, invalid JSON, stale edit, expired auth, quota exhaustion, lost
request and absent factors have usable states. No untracked background tasks continue after
an HTTP response. Live mode never falls back silently to fixture mode.

# 9. Non-Functional Requirements
**Reliability:** core workflow has no live FX/maps dependency. Gemini failure remains visible.
Persist durable data in Firestore/Storage; ephemeral agent context is reconstructed per run.
**Security:** authenticated owner-scoped backend, private storage, restricted tools, no secrets
in frontend/logs/Git, no arbitrary URL/shell tools. PDFs are untrusted data, not instructions.
**Performance:** target ordinary interactions and deterministic reranking within two seconds;
measure actual PDF/model latency. Proposed run timeout 120 seconds; not a promised SLA.
**Operations:** live mode validates config, uses real factors, has quotas and logged errors;
public homepage plus AI flow must be tested without developer credentials.
**Portability:** Windows PowerShell setup and pinned compatible packages; no mandatory Bash-only local workflow.

# 10. AI vs Deterministic Logic
AI: extraction, ambiguity detection, bounded delegation, language-to-scenario proposal and
explanation. Code: identity, revision/state guards, technical eligibility, units, mass, cost,
carbon, scores, baseline comparisons and persistence. Humans: confirmation and final selection.

# 11. Demo Dataset
One fictional VN buyer, four synthetic quotation PDFs, source JSON, extraction answer keys
under tests, arithmetic factors under tests only and a separately verified reference-factor
manifest for live mode. No 20–50 history rows. See CALCULATION_SPEC §9.

# 12. Demo Acceptance Test
1. Open the deployed app in incognito and start an isolated demo.
2. Load/edit requirements and select/upload actual sample PDFs.
3. Observe coordinator/quotation specialist activity and genuine extraction.
4. Review one intentional missing field; enter a labelled assumption; confirm each quote.
5. Run sourcing evaluation; A/B rank, C/D remain excluded.
6. Inspect cost/mass/carbon sources and explainable recommendation.
7. Apply Lower Carbon; B becomes preferred without changing deadlines.
8. Apply an impossible cap; see `no_feasible_option`.
9. Save a human decision, refresh and retrieve it.
10. Edit a quote and verify old results are stale; a second visitor has no access.

Technical verification covers these paths; the 3–4 minute submission recording can show the
main path. Do not claim every test ran because a demo video was recorded.

# 13. Priorities and Increment Gates
| Gate | Deliverable | Evidence required before next gate |
|---|---|---|
| I1 | Repo/config, pure engine tests, one PDF extraction-review-confirm-evaluate path | Real/fixture states separate; no fake result; local tests documented |
| I2 | Four quotes, two specialists and coordinator wired to allowlisted tools | Actual delegation/events; cross-user and state tests |
| I3 | Comparison, scenarios, human decision summary | A/B trade-off, stale/no-feasible tests |
| I4 | Google deployment, quotas, CI/CD, incognito smoke test | Real service endpoints and saved test evidence |

P1 only after I4: PDF export, richer evidence, durable account upgrade, locale/FX additions.
Future only: risk history, split sourcing, ERP, Scope 3, traceability, climate intelligence.

# 14. Key Risks
Scope inflation → preserve one order and bounded agents. Incorrect green claims → limits and
factor provenance. Misleading ranking → hard gates, common boundaries, no fake risk data.
Prompt injection → restricted tools and server checks. Public cost abuse → quotas, size/call
limits and operational monitoring; anonymous auth alone is not a complete defence.

# 15. Success Criteria
Prepared extraction set target ≥80% correct required fields before correction, measured against
an answer key and reported as a small-demo-set result, not production accuracy. Critical missing
values must never be silently filled. Pure calculation tests must reproduce expected outputs.
Record live tests separately from mocks and measure actual latency. All release checklist items
must be evidenced; this document does not certify completion.

# 16. Future Product Metrics
Validate comparison time saved, missed technical constraints detected, data completeness,
usage of lower-carbon alternatives and cost trade-offs with consenting real users. Report
scenario differences as estimates; claimed realised savings require later operational data.

# 17. Final MVP Statement
A buyer uploads fabric quotations, confirms interpreted data, checks whether offers meet
requirements, compares defensible cost/logistics estimates and makes a human-controlled
sourcing decision with help from a small, observable Google agent team.
