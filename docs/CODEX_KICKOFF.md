# Codex kickoff — GreenProcure v2
Copy the prompt below into Codex after placing this pack at the repository root.
This is for implementation, not for generating another concept proposal.

---

Act as our senior full-stack and Google ADK engineer. We are Minh and Mạnh, a two-person
team building GreenProcure for AI Builder Cup. Implement the technical MVP for fabric sourcing
at Vietnamese textile/garment SMEs using the current v2 context in this repository.

First inspect Git status, existing code/manifests, installed runtimes and applicable AGENTS.md.
Preserve working code and unrelated changes. Read (paths relative to the repository root):
1. AGENTS.md
2. docs/GREENPROCURE_CONTEXT.md
3. docs/GreenProcure_Vietnam_Textile_SME_PRD.md
4. docs/ARCHITECTURE.md
5. docs/CALCULATION_SPEC.md
6. docs/GreenProcure_Vietnam_Textile_SME_Database_Schema.md
Use docs/DECISIONS.md for differences and docs/REFERENCES.md to verify current SDK capabilities.
Do not implement historical v1 examples or expand the roadmap into the current backlog.
The v1 material is optional historical reference, not a prerequisite for building v2.

The target stack is React/Vite/TypeScript on Firebase Hosting, Firebase Auth, Firestore,
private Cloud Storage, and a single Python/FastAPI backend on Cloud Run using Gemini and
Google ADK. The target agent team is one coordinator plus two agents-as-tools specialists:
Quotation Specialist and Sourcing Specialist. Do not split them into separate deployments.

After a short plan, start coding Increment 1. Do not stop at documents, architecture advice
or placeholder screens. The immediate goal is one genuinely working vertical slice:

case → one PDF → real Gemini extraction → editable evidence-backed review → human confirmation
→ deterministic technical/cost/carbon evaluation → persisted result → minimal usable UI.

Implement pure domain functions and tests first. Use the exact v2 gates and calculation rules.
Create fixture source data and sample-PDF generation from one source of truth, while keeping
expected extraction JSON out of runtime model input. Clearly distinguish test-only factors
from reviewed live factors. Never hard-code a supplier winner or fabricate a completed call.

Scaffold the three agent modules with the defined boundaries. Wire the quotation path first,
then a sourcing specialist evaluation tool. Coordinator delegation and Activity events should
reflect code actually executed; unfinished specialist wiring must be reported as unfinished,
not simulated. Complete the full multi-agent comparison/scenario flow in the next increment
once the single-quotation slice works.

Create typed API contracts, owner guards, quote revisions and a minimal local emulator path.
Keep live AI and fixture mode explicit. Submission mode must reject fixture AI and test factors.
If Gemini credentials, cloud permissions or verified factors are absent, continue all unblocked
implementation and mark the specific live integration unverified. No guessed keys/model IDs.

Do not create a pitch, video, marketing content, ERP, training pipeline, risk score, vector DB,
Vercel deployment or multi-agent swarm. Do not push/deploy/provision/change IAM/billing without
my explicit authorisation. Prepare deploy configuration for later review only.

Run the checks that exist; add unit tests for maths, hard-constraint failures, missing data,
authorisation, staleness and live/fixture separation. Add a separate opt-in Gemini smoke test.
Update docs/IMPLEMENTATION_STATUS.md and README with actual setup/test commands.

Finish with files changed, commands actually executed, passed/failed/skipped tests, live versus
fixture status, exact remaining configuration blockers and the next smallest implementation step.
