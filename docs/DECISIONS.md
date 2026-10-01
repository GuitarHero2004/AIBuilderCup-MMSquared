# Decisions and explicit changes from v1
**Version:** 2.0 · **Date:** 1 October 2026

## Source basis
The three uploaded Vietnam Textile SME files are optional historical material, preserved
byte-for-byte in the local-only `../.local/legacy/archive/v1/` when available. Access to them
is not required to build v2 from the current documents.
They provide the vertical, fabric fields, review workflow, two eligibility/comparison gates,
logistics-only boundary and roadmap. The conversation subsequently selected a two-person
team, Google-first infrastructure and a coordinator with two specialists.

This update is not a claim that the old documents already contained the decisions below.
Some are scope changes from the conversation; others resolve implementation gaps explicitly.

| ID | Earlier text / unresolved issue | v2 decision | Reason / status |
|---|---|---|---|
| D01 | Generic Next.js/Firebase architecture; no concrete agent contract | React/Vite, FastAPI, one Cloud Run service; coordinator + two specialists | Latest conversation; keep existing code if already built |
| D02 | One-agent kickoff prompt later in the conversation | Two bounded specialist agents invoked by coordinator | Latest user preference; stage implementation, not a swarm |
| D03 | Risk has 15% weight; 20–50 synthetic history records | Remove risk/history from P0; weights 45/25/30 | No validated supplier-performance history; prior kickoff decision |
| D04 | B is cheapest/lowest carbon but late; carbon slider changes winner | A/B both feasible; B costs more; C late; D technical fail | Correct demo logic; weights never override hard constraints |
| D05 | `review` may be ranked with a penalty | `needs_review` cannot be primary recommendation | New explicit safety rule; partial data remains visible |
| D06 | Required OEKO-TEX reference in default case | Default has no required certificate; buyer can require reviewed evidence | Avoid treating a text reference as product certification |
| D07 | `reference_data/emission_factors/{id}` | `/reference_emission_factors/{id}` | Old path has collection/document parity wrong for a document [S04] |
| D08 | Organisation-level administration | Verified UID owns cases in P0 | Two-person scope; organisation profile is descriptive only |
| D09 | Fabric mass treated as shipment weight; nominal GSM examples | Quoted GSM for net fabric mass; gross/proxy separate | Explicit calculation clarification |
| D10 | A placeholder factor 0.067 appears repeatedly | No production factor supplied; test factors visibly test-only | Source/proxy suitability must be verified before release |
| D11 | Formula examples conflict | 9.75 × 2700 × 0.067 = 1763.775; rounded 1 decimal = 1763.8. Old weighted example 82×.35+90×.25+85×.15+74×.25 = 82.45, not 82.15 | Arithmetic audit; old weights are not P0 |
| D12 | Shipping included/excluded not normalised | Store common comparison-cost basis and adjustments; block incompatible comparisons | New explicit correctness rule |
| D13 | Mixed currencies / kg, metre, yard, roll scope | Order in metres; quotes per metre/kg; one currency; road/sea schema | Prior technical kickoff scope; FX/rolls remain future |
| D14 | Missing schema fields for agent audit and stale results | Add runs/events, immutable evaluations and reviewed quote revisions | New implementation detail to support actual workflow |
| D15 | Timing targets sounded like delivered performance | Mark targets and unverified status; live smoke test required | No prototype has been verified in this update |
| D16 | Full vision may look like a build backlog | Preserve original roadmap; only P0 and gated increments are implementation work | User wants full context, not enterprise scope expansion |
| D17 | Preview/deployment ownership unspecified | GitHub CI; Firebase preview; Cloud Build backend on reviewed main | Latest conversation; no Vercel, no duplicate deployers |

[S04] is in `REFERENCES.md`. All score thresholds, limits and normalisation choices are
product engineering choices, not industry standards or programme mandates.

## Unresolved external dependencies
- Exact Google project/bucket/service account, billing authorisation and collaborator identity.
- A supported Gemini model and SDK version tested with PDF + structured extraction + agent tools.
- Small, appropriately sourced emission-factor subset with licence/use and geography notes.
- Repository URL, chosen visibility/licence and deployed URL.

Do not fabricate these values. Codex should record verified choices here during implementation.
