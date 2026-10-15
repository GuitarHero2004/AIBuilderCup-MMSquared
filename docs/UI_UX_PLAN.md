# GreenProcure — user flows and screen plan

**Date:** 14 October 2026

**Status:** flow specification for team review; Milestone 1 case UI implemented locally,
with quotation-to-decision workflows still planned. See the implementation ledger for evidence.

**Branch:** `feat/ui-workspace`

**Baseline checked:** freshly fetched `dev`, `bb31efe3008f9f8bbad32a7d40bc509bfd870509`

## 1. Purpose and scope

Give a textile SME buyer one clear path from fabric requirements to an informed sourcing
decision. This document completes the first UI planning task: navigation, screen content,
actions, transitions and recovery states. The linked design package covers visual tokens
and wireframes; implementation proceeds in small reviewed increments.

Minh is taking the lead on user flows and UI/UX. Backend/database work is expected to be
coordinated with Mạnh; this document does not claim his availability or assign unagreed work.
AI integration and release responsibilities still need an explicit owner.

The visual reference is the [BeyondPilot admin](https://beyondpilot.ai/admin) screenshots supplied in the conversation:
light sidebar, white content area, clear page headings, restrained borders, searchable
tables and a prominent primary action. The six [GreenProcure reference images](https://drive.google.com/drive/folders/1PkaGW9hFVnMD_0qD0JuFzMpcUxUJsiSa) inform the
document-review, comparison and scenario layouts. Their sample numbers and limits are
illustrative; repository contracts remain authoritative. Precise styling is task 2.

Sources: [current context](GREENPROCURE_CONTEXT.md), [PRD](GreenProcure_Vietnam_Textile_SME_PRD.md),
[calculation rules](CALCULATION_SPEC.md), [schema](GreenProcure_Vietnam_Textile_SME_Database_Schema.md),
[architecture](ARCHITECTURE.md), and [implementation ledger](IMPLEMENTATION_STATUS.md).
Older Notion/Drive examples do not override these v2 documents.

P0 covers one material line, at most four quotations per case and a private anonymous demo.
It does not add organisation administration, a supplier directory, inventory, purchase
orders, email sending, payments, gamification, risk scoring or PDF export.

## 2. Existing foundation versus planned experience

| Capability | Verified in the current source | Planning boundary |
|---|---|---|
| Start/restore a private demo | Anonymous identity and owner-scoped case access | Preserve session isolation and clear prior-owner state on identity change |
| Case list and creation | List/refresh, create, two-case server cap | Reorganise the existing experience before adding new product capabilities |
| Requirements detail | Read-only selected case; six editable creation fields plus fixed preset | Full requirement editing and revision invalidation require new API support |
| Case API | `POST/GET /api/v1/cases`, `GET /api/v1/cases/{case_id}` | Current web client uses list/create; the detail endpoint exists separately |
| Upload, extraction and confirmation | Not implemented | Layouts can be planned; no claim of operational upload or AI |
| Evaluation, scenario, decision and activity | Not implemented | Need backend contracts and persistence before becoming working controls |

Current responses are draft cases at revision 1 with synthetic-demo status and fixed
45/25/30 weights. A screen design must not turn those into fabricated review counts or
completed comparisons. No new tests or live services were run to establish this planning
document; historical foundation verification remains in the ledger.

## 3. Navigation and main flow

Use a compact workspace, with the case as the organising unit:

- **Global navigation:** Workspace and Help & methodology. Workspace is the case list and
  attention queue; a duplicate dashboard/list page is unnecessary for the two-case demo.
- **Case navigation:** Requirements, Quotations, Compare, Decision.
- **Review:** opens within a selected quotation, with previous/next quotation navigation.
- **Scenarios:** opens from Compare and returns to its preserved baseline.
- **Context:** breadcrumb, case name, saved status, and a concise requirement summary remain
  visible. Optional explanation/activity panels are part of the working screen.

These are screen groupings, not a commitment to new URL paths or a routing dependency.
They fit the existing five view families: Start/Case, Quotes, Review, Compare and
Scenario/Decision. A returning visitor resumes the next useful action from persisted state.

```mermaid
flowchart TD
    A[Start or restore private demo] --> B[Workspace: create or reopen case]
    B --> C[Save case requirements]
    C --> D[Upload or select synthetic quotation PDFs]
    D --> E[Extract one PDF in a bounded run]
    E --> F[Review source and correct draft]
    F --> G{Required review resolved?}
    G -->|No| H[Save draft or draft clarification]
    H --> F
    G -->|Yes| I[Buyer confirms quotation revision]
    I --> J[Evaluate current confirmed inputs]
    J --> K{Current selectable option exists?}
    K -->|No| L[Show blockers or no feasible option]
    L -->|Missing or incorrect quote inputs| F
    L -->|Add another offer| D
    L -->|Explicit requirement change| C
    K -->|Yes| M[Compare eligible offers and inspect exclusions]
    M --> N[Review buyer selection and reason]
    M --> O[Optional: explore and confirm scenario]
    O --> P[Evaluate scenario against frozen baseline]
    P --> T{Scenario has a feasible option?}
    T -->|Yes| N
    T -->|No| U[No feasible scenario]
    U -->|Adjust scenario caps| O
    U -->|Return to baseline| M
    N --> Q[Save immutable in-app decision]
    Q --> R[Reopen saved summary]
```

Known technical/commercial failures can be confirmed as accurate and then classified as
ineligible; confirmation does not mean the offer passes. Users can add another quote or
explicitly revise requirements instead of repeatedly reviewing an unfixable offer. A
confirmed requirement change creates a new baseline family. Scenarios are optional:
a valid baseline evaluation can go directly to a decision.

## 4. Screen specifications

### S0 — Entry and sourcing workspace

**Question:** What needs my attention, and where do I continue?

- Before sign-in: concise explanation and **Start private demo**. Explain private session
  access and that clearing browser data can lose access; do not imply an email account exists.
- After restoration: case rows show name, saved lifecycle status, updated time and a next
  action derived from persisted state. Future quote/review counts appear only when available.
- Primary action: **Create sourcing case**; for an existing case, **Continue case** opens the
  relevant saved stage. At the case cap, explain the limit and offer to reopen a case.
- Empty state explains the next step. Loading, unavailable API and identity failures have
  explicit recovery. Do not show an empty list while a request is merely unresolved.
- Saved decisions can be reopened from their case; no separate reporting dashboard is needed.

### S1 — Case requirements

**Question:** What must every acceptable quotation satisfy?

| Field group | Planned content | Current foundation |
|---|---|---|
| Case and order | Name, quantity in metres, visible order reference date | Editable on creation |
| Delivery and budget | Destination, maximum calendar days, amount and currency | Destination, days and USD amount editable; currency fixed to USD |
| Textile | Construction, composition, composition tolerance, target GSM/tolerance, usable width; optional colour/finish/evidence | Fixed woven 65/35 preset, 130 GSM ±5%, minimum 150 cm; no required certificate |
| Comparison basis | Included/excluded cost categories and declared transport/accounting boundary | Fixed preset values; full editing is future work |

- Primary action on creation: **Create case**. After a confirmed save, continue to Quotations
  when that capability exists. Current foundation-only UI continues to saved requirements.
- Expose preset requirements as readable values; do not render unavailable fields as editable.
- Label composition tolerance in percentage points and GSM tolerance in percent. Keep date
  and calendar-day semantics visible; never update a saved order date as the clock changes.
- Future **Save requirement changes** explains that dependent comparisons become outdated.
  Preserve prior evaluations/decisions and require a new evaluation before another decision.
- Validate fields inline and in a linked summary. Failed or uncertain saves retain entered
  values and do not navigate as if saved. Future editing needs revision-aware API support.

### S2 — Quotations

**Question:** Which documents are available, and which need review?

- Empty case: lead with **Upload quotation** or **Use synthetic sample**. Once documents exist,
  show quotations and their next actions first, followed by an expandable **Add a quotation**
  section. Collapsing or reordering preserves the selected file; recovery keeps the form visible.
  Connected samples must use the same private upload/extraction path and remain labelled synthetic.
- Show file name, upload/extraction status, review status, missing-information summary and
  the appropriate action: Review, Check status or Retry. Show the four-quote limit.
- Before upload, explain Google model processing, private storage, configured retention
  and anonymous-session access. Do not invent a retention period; resolve it before release.
- Target digital Vietnamese/English PDFs. Proposed file limits are 10 MiB and 10 pages;
  display the enforced limits once the upload contract is implemented. Explain unsupported,
  encrypted, oversized or unreadable documents. A fifth quote cannot bypass the server limit.
- One PDF per bounded extraction run. Keep other quote records visible during processing.
  No simulated percentage or suggestion of an implemented background queue.
- Each row separates saved PDF, extraction and human-review states. Use one relevant action:
  Extract information, Check status, Retry extraction, Review quotation or View reviewed quotation.
  Review opens only when the review state is ready; failed extraction keeps a useful error and
  explicit retry. It never substitutes fixture results in live mode.
- Keep order, budget and the full delivery requirement visible; disclose longer fabric specs
  on demand. Upload is prominent and Clear selected PDF stays a quieter secondary action.

### S3 — Quotation review and confirmation

**Question:** Is the extracted information accurate, complete enough and traceable?

- Desktop: authorised PDF/page view beside editable fields. Narrow screens use a clear
  Source/Fields switch while retaining the selected field, page and unsaved edits.
- Group fields into textile, price/MOQ/cost basis, delivery, logistics and required evidence.
  Distinguish usable width from total width, and net material mass from shipment mass.
- Each relevant field exposes its source page/excerpt when available, correction/assumption
  provenance and review state. Unavailable evidence says so; no invented source highlight.
- A persistent issue summary names the affected fields and what they block: technical,
  cost, delivery, carbon, evidence or ranking. Noncritical notes do not block valid metrics.
- **Save draft** persists corrections without confirmation. **Draft clarification** produces
  copyable questions about actual gaps. It does not contact a supplier.
- Primary action: **Confirm reviewed quotation**, explicitly performed by the buyer against
  the latest saved draft. Required unresolved review issues direct the buyer to the relevant
  fields; a known reviewed hard failure remains recordable and visible as ineligible.
- After confirmation, show the confirmed revision and **Review next quotation** or
  **Go to comparison**. The latter can show blockers; confirmation does not promise ranking.
- Later corrections create new reviewed state and invalidate dependent results. Keep raw
  extraction and earlier confirmed revisions intact. Warn about unsaved edits before leaving.

### S4 — Supplier comparison

**Question:** Which reviewed offers meet my requirements, and what are the trade-offs?

- Primary action before results: **Evaluate quotations**. Use current confirmed data and a
  user-visible baseline policy. Incomplete/unconfirmed records remain visible as blockers.
- Present suppliers side by side with aligned rows for technical/commercial eligibility,
  comparable cost and basis, end-to-end days/arrival, estimated logistics CO₂e and boundary,
  source limitations, preference score and exclusion reasons.
- Eligible ranked options and incomplete/ineligible offers have distinct labelled groups;
  excluded offers are still inspectable. Missing values display a reason, never a numeric zero.
- Balanced policy is cost 45%, lead time 25%, carbon 30%. The backend supplies ordering,
  scores, winner and authoritative amounts. Scores are relative preferences, not sustainability
  ratings. A singleton is labelled **Only eligible option**.
- Source details expose price inclusions, confirmed inputs, mass/distance provenance and
  factor/boundary limitations without burying the main comparison.
- With a current selectable result: **Review decision**. Secondary action: **Explore scenario**.
  Allow an explicit eligible buyer choice different from the preference winner.
- If explanation fails, retain actual computed results and show **Explanation unavailable**.
  Missing approved factors block complete live carbon ranking, even if carbon has zero weight.
- Outdated results remain inspectable as history; **Re-evaluate** is required before saving
  a new current decision. No eligible/feasible option gives reasons and actions, not a winner.

### S5 — Optional scenario exploration

**Question:** How would another preference or relative limit change this decision?

- Show the frozen baseline winner, input revision and comparison boundaries. Presets:
  Balanced, Lowest Cost, Lower Carbon, Fastest Delivery, Custom. Lower Carbon is 10/10/80.
- Weight edits request a deterministic preview; they do not invoke Gemini on every movement.
  Validate total weight instead of silently normalising it. Label unsaved previews clearly.
- Optional relative caps expose their baseline: maximum cost increase and minimum carbon
  reduction. Undefined percentages remain unavailable with an explanation.
- Natural-language requests produce a structured proposal. The buyer reviews and confirms
  the proposed weights/caps before persistence/evaluation. Ask for an explanation separately.
- Primary action: **Apply scenario** confirms the policy and obtains its current evaluation;
  **Review decision** then opens selection from that saved evaluation. Returning to Compare
  restores the original baseline, which is never overwritten.
- Technical, MOQ, budget and deadline failures remain excluded. Requirement changes use S1
  with explicit confirmation and a new baseline, rather than masquerading as weight changes.
- **No feasible option** is a normal result: adjust a relative cap, return to baseline or
  review requirements. Do not automatically relax requirements to manufacture a winner.

### S6 — Buyer decision and saved summary

**Question:** What am I choosing, why, and what evidence supports it?

- Show the selected quote, active baseline/scenario, current evaluation, recommendation,
  comparable metrics, assumptions and limitations. Require a buyer selection reason.
- Primary action: **Save decision**. The server must accept the exact current evaluation
  and a selectable eligible/feasible quote; a stale result returns to re-evaluation.
- A buyer choice different from the score winner is labelled as such; do not rewrite the
  original recommendation. Agents cannot confirm the choice.
- After server acknowledgement: **Decision saved**, timestamp and immutable in-app summary.
  Reopen the saved snapshot after refresh. Edits never rewrite this historical decision.
- No purchase order, supplier message or payment occurs. PDF export remains outside P0.
- On an uncertain save, check persisted state before offering another submission; do not
  optimistically claim success or silently create a second decision.

## 5. State and recovery rules shared by all screens

Do not collapse these independent dimensions into one green status badge:

| Dimension | Examples / source | UI meaning |
|---|---|---|
| Case lifecycle | Schema: draft, collecting_quotes, reviewing_quotes, ready, decided, archived | Overall saved stage; only draft is currently implemented |
| Document processing | Uploaded/extracting/failed and recorded run result | Whether extraction produced a draft, not whether it is correct |
| Human review | Unreviewed draft, unresolved review, confirmed revision | Whether the buyer has reviewed the cited input |
| Eligibility | `eligible`, `ineligible`, `needs_review` | Server result with all reasons; known failure outranks missing data |
| Evaluation outcome | `complete`, `incomplete`, `no_feasible_option` | Whether the calculation provides selectable results |
| Freshness | Current, outdated/historical; unsaved local changes | Whether results match the inputs now being considered |

UI wording is a presentation proposal, not an additional API enum. Scenario feasibility is
also checked within the active evaluation; a baseline-eligible quote can fail scenario caps.

| State | Required feedback | Recovery |
|---|---|---|
| First use / empty | Explain what is missing; no fabricated counts or results | Create case or add PDF |
| Loading / running | Actual request/run state; disable duplicate submission | Inspect existing data; cancel only if the API supports it |
| Invalid input / missing evidence | Field-level issue and blocked capability | Correct, record a reviewed assumption, or draft clarification |
| Extraction failure / malformed response | Failure reason; no silent fixture fallback | Explicit retry when permitted, or provide a readable PDF |
| Disconnect / timeout / uncertain write | Outcome unknown or interrupted; no background-completion promise | Read persisted status/results before an explicit retry |
| Stale revision / conflict | Identify changed inputs; retain local edits for comparison | Reload current state, reconcile and explicitly resubmit |
| Expired session / app verification failure | Explain recovery without exposing another visitor's data | Restore verification; clear prior-owner state on identity change |
| Quota / active-run limit | Enforced remaining allowance and reason when available | Open existing case/run or retry at a server-provided time |
| Missing approved factors | Carbon/ranking unavailable; preserve other valid diagnostics | Explain the reference dependency; never infer factors |
| No feasible option | Show each blocking constraint | Adjust the scenario or explicitly revise requirements |
| Explanation unavailable | Preserve deterministic table and source references | Retry explanation separately when permitted |
| Saved / historical decision | Clear save acknowledgement or historical label | Reopen the snapshot; create a new evaluated decision for changes |

Activity panels show safe, actual run/tool events and result references. They do not expose
private model reasoning, fake progress, raw credentials or full supplier documents. An
explicit retry after an ambiguous provider failure may consume allowance; do not promise
exactly-once model billing. Local unsaved changes must not leave a decision action enabled
against results that appear to describe those changes.

## 6. Interaction and accessibility requirements for later wireframes

- One clear primary action per screen/state; explain a disabled action beside the control.
- Keep the case context visible across steps. Back navigation preserves saved state and
  offers a clear choice for unsaved edits; it does not imply a successful save.
- Use text labels and icons with status colours, visible keyboard focus and labelled fields.
  Validation summaries link to affected inputs. Dynamic status/error messages are announced.
- On narrow screens, stack forms, provide an accessible document/fields switch, and contain
  wide comparison-table scrolling within a labelled region with persistent row labels.
- Progress indicators reflect saved steps; no XP, leaderboard or rewards for accepting AI advice.
- Do not surface nonfunctional future controls in the first working UI increment. Design-only
  prototypes must be explicitly identified as prototypes if later created.

## 7. Frontend/backend handoff and unresolved contracts

| UI area | Data/action needed | Dependency |
|---|---|---|
| Workspace/requirements today | List/create/read own cases; typed validation and quota errors | Existing OpenAPI |
| Requirements editing | Expected revision, validation, new revision and stale dependencies | Planned PATCH route; model/response not implemented |
| Quote collection | List quote records, upload, synthetic sample selection and limit metadata | Upload is designed; quote listing/sample-loader response needs agreement |
| Review | Draft, provenance, issues, private document, save draft, explicit confirmation | Planned routes; exact generated types pending |
| Comparison | Confirmed input refs, baseline policy, immutable results and freshness | Planned evaluations/scenarios; no current calculation API |
| Scenarios | Deterministic preview, human confirmation and saved evaluation refs | Preview service is designed; public preview contract needs agreement |
| Decision | Eligible selection, reason, exact evaluation ref, save/read summary | Planned decision routes; uncertain-save/idempotency readback needs agreement |
| Recovery/activity | Actual run status/events, allowance and retryability | Planned run routes; quota-read/cancel contract not settled |

Pydantic/OpenAPI remains the API authority; generate TypeScript rather than hand-writing
another schema. JSON stays `snake_case`; monetary and physical values retain decimal-string
precision. The UI formats server results and never independently chooses an authoritative
winner. Firebase identity/App Check and all owner/state guards remain server-enforced;
browser code does not access Firestore/Storage directly.

Open questions are bounded implementation handoffs, not reasons to stop designing:

1. Agree draft-save/confirmation behaviour and field completeness rules, including how a
   reviewed hard failure is retained without suggesting eligibility.
2. Define missing collection/sample/preview/status responses and stale/error shapes before
   connecting their screens. Determine reliable readback after ambiguous mutations.
3. Confirm the enforced PDF/run quotas and retention notice before public upload is enabled.
4. Assign backend/domain, AI integration and release work explicitly with Mạnh.

## 8. Planning acceptance and next work

Walk through these scenarios when reviewing wireframes. These are design acceptance cases,
not claims of executed application tests:

- New and returning anonymous visitors reach the right private case without an organisation
  setup step. The two-case cap has a useful recovery path.
- A quote with missing transport mode stays unresolved; saving a draft does not confirm it.
  The buyer can inspect evidence, draft a clarification and explicitly confirm a correction.
- A current Balanced evaluation ranks A over B; Lower Carbon can favour B while C remains
  late and D remains technically unsuitable. Use [the calculation fixture](CALCULATION_SPEC.md)
  for internally consistent examples; its carbon coefficient is test-only, never a live factor.
- Zero eligible options, one eligible option, unknown emissions and incompatible cost bases
  each have an honest, actionable presentation. Zero weight does not bypass metric completeness.
- The buyer saves directly from the baseline or after an optional scenario, with a reason.
  An eligible alternative choice remains distinct from the engine recommendation.
- A quote edit invalidates the comparison; a saved historical decision remains unchanged.
- Refresh, identity change, lost connection, failed extraction, failed explanation and an
  uncertain save all preserve the distinction between known results and unresolved work.

**Design follow-up:** the [offline wireframes](design/UI_WIREFRAMES.html) and
[visual-direction guide](design/VISUAL_DIRECTION.md) now cover the seven screens,
representative recovery states, responsive layouts and proposed styling.

**Milestone 1 implementation:** the shared layout and existing case list/create/detail
experience in `apps/web` have been refreshed, including a help view, validation, unsaved-draft
protection and uncertain-save readback. In-app navigation preserves the existing anonymous
session and case APIs; direct case URLs, saved-requirement editing and later sourcing steps
remain unavailable. See [the verification ledger](IMPLEMENTATION_STATUS.md).

**Workspace refinement:** the create form now groups fixed specifications into a compact,
visible summary and expands detailed methodology on demand. Budget and delivery semantics,
fabric tolerances and the logistics boundary remain visible. Entry and saved-case copy
distinguish the intended sourcing outcome from today's create/save/reopen functionality.
See the implementation ledger for verification and remaining limitations.

## 9. Delivery gates, branch isolation and backward review

Our UI Milestone 1 is the requirements-workspace foundation, not completion of PRD I1.
The next product gate is one real PDF through extraction, source review, correction,
human confirmation and deterministic evaluation. Small branches contribute to that shared
acceptance gate; a finished screen alone does not demonstrate the connected product.

| Reviewable task / proposed branch | Outcome and dependency |
|---|---|
| `feat/ui-workspace` (merged to `dev`) | Requirements flow and its refinements reviewed and integrated |
| Current `feat/ui-quotation-intake` | User-approved scope: reusable intake UI, development simulation and concrete API handoff; no backend implementation |
| Later intake integration, separate branch | Connect real upload/sample path and persisted processing state after collection/upload/run contracts and backend are ready |
| `feat/ui-quotation-review` | Source-backed corrections, draft save and human confirmation of the latest revision |
| `feat/ui-first-evaluation` | Connect the reviewed quotation to authoritative results; prove PRD I1 end to end |
| `feat/ui-input-revisions` | Saved-requirement editing, conflicts and stale-result handling with revision-aware API support |
| `feat/ui-quote-comparison` | Four offers, actual specialist events, A/B eligibility and C/D exclusions; I2 and comparison portion of I3 |
| `feat/ui-scenarios` | Explicit scenario application, preserved baseline, Lower Carbon and no feasible option |
| `feat/ui-decision-summary` | Human choice/reason, immutable save/reopen and stale-save guards; complete I3 |
| `test/ui-demo-readiness` | Full acceptance journey and failure/accessibility checks; distinguish local evidence from I4 deployed evidence |

Use C:\AIBuilderCup-MMSquared as the single working folder, per the user's 15 October 2026
instruction. Separate milestones by branch within that checkout; do not create extra
worktrees or duplicate project folders unless explicitly requested. Work on one branch at
a time and preserve current changes before switching. Helpers can work on explicitly owned
files in the active branch without changing Git state. Dependent tasks start from an approved
committed baseline, preferably integrated into `dev`. Do not silently commit, stash or copy
uncommitted foundations into several branches. Backend work has its own branch and agreed
owner; this plan does not assign work to Mạnh without agreement.

**Intake UI review, 15 October 2026:** `quotation-preview.html` is a separate development
entry. It covers file preflight, sample selection, distinct upload/extraction/review states,
uncertain-result recovery, and the case cap. All outcomes are synthetic and memory-only;
the real case workspace has no link to this preview. Requirements use the supported woven
fabric preset. At the quote cap, the upload form is hidden while retaining pending selection, so review actions are
easier to reach. The [proposed API handoff](QUOTATION_INTAKE_CONTRACT.md) records outstanding
backend requirements. This task does not complete FR-03 or PRD I1.

Before handing over every development task:

1. Identify the buyer outcome and exact PRD acceptance requirement.
2. Work backwards through the preceding actions, saved inputs, evidence, state and API guarantees.
3. Exercise relevant happy, missing-data, failure, interruption, refresh and stale-state paths.
4. Inspect changed desktop/mobile layouts, keyboard navigation and next-action clarity.
5. Refine gaps within the task and rerun affected checks. Broader changes get a separate task/branch.
6. Record executed checks, live/fixture/unavailable paths, dependencies and user review steps.

Leave all implementation changes uncommitted until the user explicitly requests a commit;
push, merge and deployment require their respective authorization. Review is not automatic
permission to commit. Later wireframes remain design examples until their API paths work.

When a commit is requested, split the branch's changes into coherent commits by functionality
or section. Write meaningful messages explaining what changed and why, without being unnecessarily
long. Use mostly non-technical language with a little technical detail where useful. Stage reviewed
files explicitly and keep private test cases and artifacts local. Commit-only approval stays local;
a request covering both commit and push authorises both without another confirmation.
This standing preference is also recorded in `AGENTS.md`.
