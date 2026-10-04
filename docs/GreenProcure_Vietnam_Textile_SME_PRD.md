# GreenProcure — Vietnam Textile SME MVP PRD
**Version:** 2.1 · **Date:** 4 October 2026 · **Team:** Minh and Mạnh
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

## 5.1 Google service roles and release evidence
Use Google managed services for the platform capabilities below. Each service must support
a user or operational outcome, with live evidence before release. These are requirements,
not claims of an existing integration. Service references [Sxx] are in REFERENCES.md.

| Capability | Google implementation | Evidence required by I4 |
|---|---|---|
| Web access | Firebase Hosting | A fresh incognito visitor can complete the deployed journey |
| Private access and abuse protection | Firebase Authentication + App Check [S16] | Owner isolation passes; invalid app verification is rejected before paid work |
| Document interpretation and explanation | Gemini on Google Cloud, Google Gen AI SDK and Google ADK [S01–S03] | Real PDF extraction and bounded specialist calls have model/prompt/run evidence |
| Business state | Firestore | Reviewed revisions, evaluations and decisions survive refresh and a fresh backend process |
| Original documents | Private Cloud Storage | Original bytes and SHA-256 are retained; another owner cannot retrieve them |
| API, agent tools and calculations | One FastAPI + ADK Cloud Run service | Server-side gates and deterministic results work through the deployed API |
| Operational visibility | Cloud Logging + Cloud Monitoring [S10, S17] | Correlated failures, latency, quota denials and a tested alert are observable |
| Reviewed delivery | Cloud Build + Artifact Registry for Cloud Run; Firebase Hosting previews [S07, S18] | Build, image and deployed revision can be traced to the reviewed commit |

Runtime access to Google services uses service identity and least-privilege IAM. Use Secret
Manager only when an actual server-side secret is needed [S19]; do not create or store a
service-account key to satisfy this table. GitHub remains the source/review and CI-check system.
Exact SDK versions, model selection, regions and IAM configuration belong in ARCHITECTURE
and REPO_SETUP. Google currently groups the model capabilities under Gemini Enterprise Agent
Platform, evolved from Vertex AI [S23]; the selected application runtime remains Cloud Run.

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
For the public release, verify Firebase App Check tokens on protected business API requests
alongside the Firebase ID token and owner checks [S16]. App Check does not replace either
identity or quotas. An invalid app-verification state must explain how to retry without
silently bypassing enforcement or starting a paid model call. Development exceptions stay
outside the public deployment.

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

P0 supports machine-readable quotation PDFs in Vietnamese or English. Include mixed-language
field labels in the test set; preserve original text and flag ambiguous numbers/units for
review. This input-language requirement does not add full UI localisation or currency conversion.
Scanned/image-only PDFs are outside the guaranteed P0 input set until their layouts pass the
same extraction evaluation. Unreadable or unsupported input gets a clear explanation and a
request for a readable PDF; a syntactically valid file is not proof that its terms were read.

## FR-04 — Quotation Specialist Extraction [P0]
Extract commercial, textile and logistics groups defined in the schema. Keep `raw_extraction`
unmodified; edit a separate review draft. A field records value, source type, document/page/
excerpt where available, review state and optional note. Use nullable structured output.
Use Gemini through the Google Cloud model API and Google Gen AI SDK with a supported response
schema [S03]. Validate the returned schema and field values on the server; valid JSON is not
evidence that an extracted term is correct. Keep model/prompt versions with the run.

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
The reviewer can open the authorised original PDF and inspect the cited page/excerpt while
correcting a field. Missing or unverifiable source evidence is visibly unavailable, never a
fabricated citation or automatic confirmation.

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
Google Cloud Carbon Footprint describes emissions associated with Google Cloud usage [S22].
It is not the reference-factor source for fabric shipments. Gemini must not invent freight
factors; the independently reviewed factor manifest remains a live-release prerequisite.

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
Presets: Balanced, Lowest Cost, Lower Carbon, Fastest Delivery, Custom. Slider changes
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

Show the visitor's remaining allowance and the reason a run cannot start. Enforce the schema's
per-visitor/global limits across instances before provider work. A repeated idempotency key
returns the stored result or current run state. An explicit new retry may consume allowance;
explain this before retrying an ambiguous provider failure, without promising exactly-once billing.
After navigation or connection loss, reload the persisted run status/result. Interrupted work
is shown as interrupted and requires explicit retry; do not imply that background work continued.

Use run IDs to locate safe Cloud Logging records and relate failures to aggregate Cloud
Monitoring metrics/alerts [S17].
Measure request/model latency, failures, model-call usage and quota denials. Report estimated
model cost separately from billed cost, using recorded pricing assumptions when estimates exist.
Exercise the global model-call kill switch and an operational alert before public release.
Alerts-only billing budgets are notifications, not enforcement of application limits [S24].

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
**Data handling:** before upload, explain that PDFs are processed by Google's model service,
what is stored privately, the configured retention period and how anonymous-session access can
be lost. The public demo requests synthetic/non-confidential input. Before public release, the
team must choose and document retention for records, child records, original PDFs and raw model
outputs. Cleanup follows schema §33 and requires explicit authorisation; no automatic deletion
may break the evaluation window. Do not claim a data-residency or retention guarantee that has
not been verified for the selected services and locations.

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
| I1 | Repo/config, pure engine tests, one PDF extraction-review-confirm-evaluate path | Real/fixture states separate; no fake result; local tests and extraction test-set boundaries documented |
| I2 | Four quotes, two specialists and coordinator wired to allowlisted tools | Actual delegation/events; cross-user and state tests |
| I3 | Comparison, scenarios, human decision summary | A/B trade-off, stale/no-feasible tests |
| I4 | Google deployment, App Check, quotas, monitoring, CI/CD, incognito smoke test | Section 5.1 live evidence, private-access tests, retention notice and tested failure/limit states |

P1 only after I4: PDF export, richer evidence, durable account upgrade, locale/FX additions.
Future only: risk history, split sourcing, ERP, Scope 3, traceability, climate intelligence.

Google-service extensions are evaluated after I4 against a demonstrated need:
- Link an anonymous Firebase account to Google sign-in so a returning buyer can retain access;
  verify UID/data continuity and account-collision handling [S21]. This remains the P1 account upgrade.
- Evaluate Document AI OCR/extraction for measured scanned-document or table-layout failures
  [S20]. Compare required-field accuracy, evidence quality, latency and cost with the Gemini
  baseline before adoption; preserve human review and disclose the actual extraction path.
Neither extension is needed for P0. Live Maps/routes, Google Search supplier discovery, Workspace
email actions, BigQuery analytics and a separate managed agent runtime are not added to this MVP.

# 14. Key Risks
Scope inflation → preserve one order and bounded agents. Incorrect green claims → limits and
factor provenance. Misleading ranking → hard gates, common boundaries, no fake risk data.
Prompt injection → restricted tools and server checks. Public cost abuse → quotas, size/call
limits and operational monitoring; anonymous auth alone is not a complete defence.
Service integration and public-demo operations also cost time for a two-person team. Stage
App Check, monitoring and delivery evidence into I4; additional services need a stated user
benefit, evaluation result and explicit scope decision.

# 15. Success Criteria
Prepared extraction set target ≥80% correct required fields before correction, measured against
an answer key and reported as a small-demo-set result, not production accuracy. Critical missing
values must never be silently filled. Pure calculation tests must reproduce expected outputs.
Record live tests separately from mocks and measure actual latency. All release checklist items
must be evidenced; this document does not certify completion.

For reproducibility, freeze the synthetic evaluation PDFs and answer keys, list the required
fields and normalisation rules, and report numerator/denominator before human corrections.
Include Vietnamese, English and mixed-label digital layouts plus missing/ambiguous terms;
report scanned variants separately and declare exactly which input categories were tested.
Score readable present fields separately from correct missing/ambiguous-field handling so
null-heavy samples cannot inflate the accuracy claim. Report evidence/page-reference correctness
separately; schema-valid output alone does not count as a correct extraction. Record model,
prompt and dataset versions, failures, latency and model-call usage. The four-quote demo and
its test variants do not establish general supplier-document accuracy. Changes to model/prompt
versions require rerunning this evaluation before release.

# 16. Future Product Metrics
Validate comparison time saved, missed technical constraints detected, data completeness,
usage of lower-carbon alternatives and cost trade-offs with consenting real users. Report
scenario differences as estimates; claimed realised savings require later operational data.

# 17. Final MVP Statement
A buyer uploads fabric quotations, confirms interpreted data, checks whether offers meet
requirements, compares defensible cost/logistics estimates and makes a human-controlled
sourcing decision with help from a small, observable Google agent team.
