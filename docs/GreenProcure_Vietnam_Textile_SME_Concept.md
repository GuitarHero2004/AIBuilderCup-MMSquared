# GreenProcure for Vietnam Textile SMEs
## AI-Powered Sustainable Textile Sourcing Decision Platform
**Version:** 2.0 · **Date:** 1 October 2026 · **Team:** Minh and Mạnh
**Vertical:** textile/garment manufacturing · **MVP:** fabric sourcing
**Scope strategy:** implement the two-person vertical MVP; preserve the full vision as roadmap.

This updates the supplied Concept rather than treating every old example as final.
See `DECISIONS.md` for changes. Market pain points below are product hypotheses to validate,
not proof of completed customer interviews or quantified industry impact.

# 1. Product Positioning
GreenProcure turns fragmented fabric quotations into an explainable, carbon-aware sourcing
decision. It helps a buyer determine technical suitability first, then understand cost,
delivery and estimated logistics emissions before selecting a supplier.

Supplier reliability and wider sustainability evidence remain part of the long-term vision.
They are not fabricated scoring inputs in the current build.

# 2. Why Vietnam Textile SMEs?
The chosen audience is Vietnamese textile and garment SMEs participating in regional sourcing.
The original brief identified sustainable production, traceability, compliance and digitalisation
as relevant concerns. We retain that framing as motivation, not independently verified market research.

Our narrower hypothesis: buyers comparing fabric PDFs need specification-aware comparison
and understandable transport trade-offs without installing an ERP or becoming carbon specialists.
Validate with real buyer interviews and anonymised quotations after the prototype is working.
Do not invent adoption rates, time savings or emissions reductions.

# 3. Primary Target Customer
The primary user is a Procurement Manager / Buyer purchasing fabric for a garment order.
Secondary users include sourcing/merchandising, supply-chain and sustainability colleagues.
The larger market can include yarn, fibres, trims and packaging; the MVP accepts only fabric.
One case contains one fabric specification, one destination and up to four offers.

# 4. Core Problem
Quotations may vary in composition, GSM, width, price units, MOQ, currency, lead-time basis,
transport scope and documentation. A low price is not useful if the fabric is wrong or late.

**Gate 1:** does the reviewed quotation satisfy the buyer-defined textile specification?
**Gate 2:** does it satisfy order constraints and provide comparable cost/carbon inputs?
Only then rank feasible offers. Missing data triggers review rather than an optimistic score.

Technical matching is document-based screening, not laboratory validation or proof of quality.

# 5. Simplified Hackathon MVP
The synthetic buyer needs 50,000 metres of woven 65% polyester / 35% cotton, 130 GSM ±5%,
minimum usable width 150 cm, delivery within 25 calendar days and budget USD 150,000.
All clean-demo offers share construction, colour, finish and a comparable cost boundary.
The fictional facility is in Ho Chi Minh City. No real customer's data is implied.

The flow is: enter requirement → upload/select quotation PDFs → Gemini extraction →
human review → deterministic checks/calculations → supplier comparison → scenario → saved summary.
The default case does not require a certificate. Any buyer-added requirement needs recorded
human document applicability review; a certificate number alone is not verification.

# 6. Textile-Specific AI Extraction
Extract commercial fields: supplier name, price/currency/unit, quoted quantity, MOQ,
payment terms, cost inclusions, Incoterm text and validity if provided.
Extract textile fields: construction, composition, GSM, usable/total width, colour, finish,
recycled-content claims and certificate references.
Extract logistics fields: origin/destination, mode, legs/distances when stated, production
and transport durations, explicitly end-to-end lead time, net and gross mass when stated.

Every field retains document/page/excerpt where available. Unknown or ambiguous values stay
null/review-required. Do not invent a distance from a city name or treat factory lead time
as arrival lead time. User corrections, assumptions and confirmation are separate records.

# 7. Textile Technical Compliance Gate
Check reviewed composition against a tolerance in **percentage points**, GSM against a
relative tolerance, and usable width against the minimum. The proposed default composition
tolerance is ±2 percentage points per fibre; it is a demo buyer policy, not an industry rule.
130 GSM ±5% means 123.5–136.5 inclusive. Wrong construction/required colour/finish also fails.

A confirmed hard failure is `ineligible`. Missing mandatory values or evidence is `needs_review`.
Only complete, human-confirmed, comparable offers are `eligible` for recommendation.
The UI can show incomplete offers, but cannot silently promote them.

# 8. Textile Quantity to Shipment Mass
Use the confirmed quoted GSM and fabric width:

`net_fabric_mass_kg = length_m × width_m × quoted_gsm / 1000`

50,000 × 1.5 × 130 / 1000 = 9,750 kg. At 128 GSM the same order is 9,600 kg.
Net fabric mass supports per-kg material cost. Gross shipment mass supports transport.
Prefer actual gross mass matching the order quantity; otherwise add known packaging to
estimated net mass. With unknown packaging, label a fabric-only proxy rather than actual cargo mass.
We do not model cutting yield or automatically declare wider fabric commercially equivalent.

# 9. Logistics Carbon
Estimate only the transport boundary declared in the case:

`kg CO₂e = sum(mass_tonnes × leg_distance_km × compatible_leg_factor)`

Start with road routes; support a simple road/sea leg list, not live route optimisation.
Factors must have source, release, row/category, unit, accounting boundary and suitability notes.
Routes may be synthetic for the demo but must be labelled. Actual and proxy masses are distinct.
Missing legs/factors are not zero emissions. Different boundaries cannot be silently ranked together.

This pack supplies no verified numeric emission factors. Reference preparation is a release
prerequisite; arithmetic tests may use explicitly test-only coefficients. See CALCULATION_SPEC.
Outputs are **Estimated logistics CO₂e**, not a full product/supplier footprint or realised savings.

# 10. Sustainability Evidence
Retain certificate references and the distinction between claims and evidence.
OEKO-TEX STANDARD 100 is a harmful-substance testing/certification standard for textiles [S13];
a reference in a quotation does not establish that the quoted material is covered or authentic.

P0 records supplied claims and, when required by the buyer, a human review state.
No live issuer check, automated equivalence decision, environmental score or certificate badge.
STeP, GRS/RCS, ISO 14001 and wider ESG document intelligence remain roadmap items.
`not_provided` does not mean `does_not_exist`. Synthetic PDFs must not imitate valid certificates.

# 11. Decision Logic
Check technical requirements, MOQ, confirmed full delivery, budget and common comparison basis.
Rank only eligible options using deterministic cost/lead-time/carbon preference scores.

| Preset | Cost | Lead time | Logistics carbon |
|---|---:|---:|---:|
| Balanced | 45% | 25% | 30% |
| Lower Carbon | 10% | 10% | 80% |

Supplier-risk history is removed from P0. These weights are product choices, not objective
sustainability grades. Exact normalisation, ties and stale-data behaviour are in CALCULATION_SPEC.

# 12. Scenario Lab
Users adjust weights directly or ask the Sourcing Specialist for a bounded scenario.
The UI uses deterministic recalculation for sliders; no agent call on each movement.
Natural-language requests become schema-validated proposals, displayed for confirmation.

For example: “At least 25% lower estimated emissions than baseline, no more than 5% extra cost,
and still within the original deadline.” Save the baseline and comparison scope explicitly.
A late supplier cannot become eligible merely because carbon is weighted more heavily.
When no offer satisfies constraints, report `no_feasible_option`; do not manufacture a winner.
Split sourcing stays out of P0.

# 13. Recommended Demo Supplier Story
**A:** compliant/on-time, cheaper and faster than B, higher estimated logistics emissions.
**B:** compliant/on-time, modest price premium, lower logistics emissions.
**C:** cheaper but late; remains excluded under both presets.
**D:** cheap but wrong composition; remains excluded regardless of weights.

One offer initially lacks transport data. The buyer must explicitly enter/confirm the missing
information with assumption provenance before a full comparison. A/B demonstrate a legitimate
trade-off. This deliberately replaces the old story where the lowest-carbon offer was late.

# 14. Data Strategy
Minimum: one synthetic case, four short quotation PDFs, their machine-readable source and
expected extraction fixtures stored separately from runtime inputs; a small verified factor set.
No supplier-history rows, vector store, private ERP data, training/fine-tuning or live web fetching.

Live mode uses real Gemini and tool calls. Fixture mode is development-only and visibly labelled.
A live API failure never silently substitutes expected JSON. Provide both unit tests and an
opt-in actual-provider smoke test; the former does not establish live readiness.

# 15. Vietnam-Specific UX
Use a fictional Vietnamese buyer and UTF-8 supplier/document names. The initial UI is English;
quotation examples can use Vietnamese/English labels. One currency per case; default USD is a
demo choice, not a requirement that Vietnamese companies buy in USD.

A VND case can compare VND quotations without FX. Mixed currencies are blocked until explicitly
supported. Vietnamese localisation and live FX are future work, not extra P0 dependencies.

# 16. MVP Screens
1. Start/Case: one-click private demo and editable requirements.
2. Quotes: sample/upload PDFs and real processing status.
3. Review: extracted values, sources, corrections and explicit confirmation.
4. Compare: technical/constraint status, cost, lead time, carbon and grounded explanation.
5. Scenario/Decision: weights, baseline deltas, infeasibility and saved in-app summary.

Integrate a small Activity panel showing actual agent/tool events, not hidden reasoning.
Keyboard operation, readable tables and text status labels are part of the MVP.

# 17. What We Do Not Build
No ERP, Scope 1/2/3 accounting, LCA, traceability/DPP, laboratory testing, supplier discovery,
automatic purchases, emails sent by agents, production planning, risk model training,
certificate verification, roll conversions, split sourcing or PDF report export in P0.

# 18. Full Product Vision — roadmap, not current tickets
**Phase 2 — Textile Sustainability Intelligence:** document extraction/expiry tracking,
recycled-content evidence, route/FX assistance and supplier clarification workflows.
**Phase 3 — Supply Chain Intelligence:** ERP/procurement integration, validated performance
history, multi-supplier optimisation, disruption/climate exposure and portfolio sourcing.
**Phase 4 — Green Procurement:** suitable purchased-goods factors, Scope 3 supplier data,
internal carbon pricing and policy-aware abatement scenarios with explicit methodology.
**Phase 5 — Agentic Supplier Management:** authorised document requests, exception monitoring,
follow-ups and evidence fulfilment checks, with human purchasing approval.

These stages depend on customer validation, appropriate data access, domain review and security.
No future module is represented as already implemented or automatically compliant.

# 19. Long-Term Positioning
An AI decision-intelligence layer for sustainable textile sourcing, not a replacement ERP,
a generic chatbot, supplier marketplace or accredited carbon-accounting suite.

# 20. Strategic Thesis
Before placing an order, show which technically acceptable option fits the commercial and
operational constraints, what its estimated transport impact is, and what evidence is missing.

# 21. Competition Build Strategy
Google-first runtime: Firebase Hosting/Auth, Firestore, private Cloud Storage, Gemini and one
Cloud Run backend. Google ADK implements coordinator → Quotation/Sourcing specialists.
Cloud Logging supports troubleshooting. GitHub/Cloud Build support reviewed deployment.
The team's supplied submission text requires a working accessible prototype and source,
not merely a diagram. Do not claim that more agents guarantee a better score.

# 22. Product Principle
**AI interprets. Tools calculate. Buyer requirements gate eligibility. Humans decide.**
Agent decomposition adds separation of responsibilities, not autonomous commercial authority.

# 23. Industry Context References
The v1 file named ILO/VITAS and industry initiatives without a verified source pack. They
remain leads for later market validation, not citations proving this product's impact.
Technical/reference sources checked for this update are in REFERENCES.md. S13 supports only
the stated certificate distinction, not supplier approval or legal compliance.
