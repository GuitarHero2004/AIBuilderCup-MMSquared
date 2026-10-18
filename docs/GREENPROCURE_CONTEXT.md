# GreenProcure — full implementation context
**Version:** 2.1 · **Prepared:** 1 October 2026 · **Revised:** 4 October 2026 · **Team:** Minh and Mạnh
**Audience:** the team and Codex · **Status:** implementation baseline; local foundation exists, full MVP pending

## 1. What we are building
GreenProcure is a sourcing decision assistant for a buyer at a Vietnamese garment SME.
It compares supplier offers for one fabric order, checks buyer-defined technical requirements,
then explains cost, delivery and estimated logistics-carbon trade-offs before a human decides.

Our problem hypothesis is that fabric quotations and supporting documents are inconsistent
and expensive to compare manually. We do not yet have validated customer research, private
supplier history, measured ROI or a training dataset. Do not invent any of those.

The demo case is 50,000 metres of woven 65/35 polyester-cotton fabric, 130 GSM ±5%,
minimum usable width 150 cm, delivery within 25 calendar days and USD 150,000 budget.
The earlier domain focus and human-review workflow are retained. Full enterprise vision
is retained as roadmap, not an instruction to build everything now.

## 2. Current decisions — do not reopen by default
| Area | Decision |
|---|---|
| Team scope | Two people; one material line and up to four quotes per case |
| Frontend | React + Vite + TypeScript; Tailwind for UI; Firebase Hosting |
| Identity | Firebase Authentication anonymous “Try demo”; no shared public login |
| Public API protection | Firebase App Check plus verified identity, ownership and quotas |
| Backend | Python + FastAPI; one container on Cloud Run |
| Agents | One ADK coordinator + Quotation Specialist + Sourcing Specialist |
| Delegation | Bounded agents-as-tools; no uncontrolled peer-to-peer loops |
| Model | Gemini through Google Cloud, official Google Gen AI SDK and ADC/service identity |
| Data | Firestore for business records; private Cloud Storage for original PDFs |
| Observability | Actual run/tool events in the UI; Cloud Logging and Cloud Monitoring |
| Collaboration | GitHub, short feature branches, review by the other teammate |
| CI/CD | GitHub Actions checks; Firebase Hosting previews; Cloud Build → Artifact Registry → existing Cloud Run |
| Secrets | Secret Manager only for actual server secrets if needed; no downloaded service-account keys |
| Excluded | Vercel, extra databases, Kubernetes, extra agent frameworks, OpenAI runtime calls |

Codex is our development tool, not the product's runtime model. Google AI Studio is optional
for prompt experimentation. No fine-tuning/training is necessary for the planned workflow.
Do not infer that more agents or Google services earn points automatically.

The v2.1 PRD ties Google services to live workflow evidence, private data, abuse controls and
measured reliability. App Check complements authentication and quotas; debug tokens stay in
development. Monitoring covers latency, errors, quota denials and model use. Estimated cost
is not actual billing, and billing-budget alerts are not spending caps. Keep the global kill switch.
Current Google documentation calls the model platform Gemini Enterprise Agent Platform, the
evolution of Vertex AI; the backend remains one Cloud Run service. Verify actual SDK selectors.

If an existing application is present, inspect it before scaffolding. Preserve working code;
document a proposed migration instead of replacing it automatically.

## 3. Three agents; one deployable backend
- **Coordinator:** receives a bounded request and delegates to the relevant specialist.
- **Quotation Specialist:** reads one PDF, extracts fields/evidence, identifies ambiguity,
  drafts clarification. It can save a draft, never confirm it for the buyer.
- **Sourcing Specialist:** reads confirmed data, calls evaluation/scenario tools and explains
  their results. It cannot approve a purchase or change hard constraints silently.

For ADK, prefer `AgentTool`-style specialist calls returning structured results to the
coordinator. These are genuine agents invoked as tools, not extra Cloud Run services.
Verify exact imports/API against the SDK installed during implementation.

The coordinator and specialists do not calculate authoritative cost, carbon, scores or
eligibility in natural language. Python domain functions do that. A service-layer guard
checks identity, revisions and human confirmation regardless of what the agent requests.

## 4. Minimum complete product
Try demo → create/load case → upload/select PDFs → live extraction → review/correct/confirm →
technical and commercial checks → calculation → comparison → scenario → in-app decision summary.

Five main views are sufficient: Start/Case, Quotes, Review, Compare, Scenario/Decision.
The agent Activity panel is part of those views, not a separate agent control platform.

Each extraction is one bounded request. Each sourcing run begins from stored confirmed
state. Human review is a persisted pause between runs, not an open model call waiting forever.
P0 targets digital Vietnamese/English quotation PDFs; measure scanned variants separately.
Document AI is a later option only if measured gaps justify it. Disclose data processing,
retention and loss of anonymous-session access; interruptions show persisted status and explicit
retry rather than a promise of background completion. Google sign-in account linking is P1
after I4. Maps, Search and Workspace integrations remain outside P0.

## 5. Rules that override older examples
1. P0 scoring is **cost 45%, lead time 25%, carbon 30%**. Lower Carbon is **10/10/80**.
   Supplier-risk scoring and synthetic performance history are removed from P0.
2. Technical failure, late delivery, budget failure and unmet MOQ cannot be fixed by weights.
   Missing mandatory information is `needs_review`; it is not a zero value or an automatic pass.
3. A and B are both eligible. B has lower emissions but a modest price premium and slower,
   still-on-time delivery. C is late; D fails spec. This replaces the old misleading demo story.
4. GSM-based mass is **net fabric mass**, not automatically gross freight weight. Cost per kg
   uses net mass; logistics uses confirmed shipment mass or an explicitly labelled proxy.
5. Compare like-for-like cost and transport boundaries. A low quote that excludes freight
   cannot beat a freight-inclusive quote without a reviewed common cost basis.
6. Certificate references are not verification. Required evidence needs human applicability
   review. The initial demo has no mandatory certificate, keeping P0 independent of ESG workflows.
7. P0 is owner-scoped by verified Firebase UID, not full organisation administration.
8. No live carbon factors are supplied in this pack. Reference validation is a release blocker;
   synthetic coefficients exist only for tests/visible fixture mode.

See `docs/DECISIONS.md` for source-to-v2 changes and `docs/CALCULATION_SPEC.md` for exact rules.

## 6. What counts as real functionality
Synthetic quotations are acceptable demo inputs. They must be labelled as such. In live mode,
Gemini actually reads the input; tools actually calculate; edits change the results;
Firestore actually persists; agent events represent real calls.
Record service-level acceptance evidence and extraction quality by language/input type against
the PRD's existing ≥80% required-field target. Cloud Carbon Footprint does not supply transport
emission factors; the reviewed logistics-factor requirement remains unchanged.

Never select a result from a supplier-name lookup, send the extraction answer key to Gemini,
fake a progress trace, or switch to fixtures silently after an API error. If explanation fails,
show the real calculated table and a clear explanation-unavailable message.

## 7. Technical submission requirements supplied by the team
Use Firebase, Firestore, Cloud Run and Gemini meaningfully. Supply a publicly accessible
working application and accessible GitHub source; keep dependencies operational for evaluation.
The official [FAQ](https://aibuildercup.com/Faqs.html), checked on 18 October 2026, requires
a video under three minutes; this supersedes the earlier supplied duration. This pack does
not produce the video/deck or verify every programme rule. The prescribed pitch template
and submission deliverables remain external tasks.

## 8. Read order and authority
Paths in this document are relative to the repository root.
Read `AGENTS.md`, this file, PRD, architecture, calculation spec and schema before coding.
Use Concept for problem framing/roadmap and Repo Setup for collaboration/deployment.

These v2 files are intended to agree. For requirements use the PRD; for arithmetic use
CALCULATION_SPEC; for field names use the schema; for orchestration use ARCHITECTURE.
If they conflict, report the precise conflict, choose the stricter safety rule temporarily,
and record a decision. Do not blend a v1 example into v2. Historical v1 material is optional
and is not required to build v2.
External docs verify capabilities, not product scope. Later explicit team instructions
may change scope; record the change rather than pretending it was always in the source.

## 9. First Codex task
The local case/auth/persistence foundation has been created. Read README and
`docs/IMPLEMENTATION_STATUS.md` before continuing; do not scaffold it again.
Implement Increment 1 in `docs/CODEX_KICKOFF.md`: a small, tested vertical slice with
one PDF and real confirmation/evaluation. Missing credentials block live verification,
not local domain code. Do not stop at a plan and do not claim unexecuted tests have passed.
No deployment, billing/IAM change, repository publication or remote push without authorisation.
