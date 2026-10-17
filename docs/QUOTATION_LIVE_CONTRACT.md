# Connected quotation contract

**Implemented milestone, 18 October 2026:** private upload, direct Gemini extraction, editable
review, human confirmation and recovery. Pydantic/OpenAPI is authoritative; TypeScript types
are generated with `npm run contracts:generate`. The earlier intake/review handoffs remain
historical design proposals where their field names differ from this implementation.

## User outcome and scope

A buyer opens a saved case, attests that the input PDF is synthetic and non-confidential,
saves it privately, starts extraction, inspects the original and its extracted citations,
saves corrections, then explicitly confirms the saved revision. Confirmation records review;
it does not establish eligibility, approve a supplier or perform a purchase.

The normal React application uses these APIs. Independent development walkthroughs remain
labelled simulations. Local mode uses real Firebase emulators and disables model calls;
there is no application fixture fallback. Tests may inject a provider from outside the repo.
Live-mode code still needs an actual configured-project PDF smoke test before release.

The current slice calls Gemini directly. It does not invoke the planned ADK coordinator or
specialists, and its recorded events use no agent identity. Calculations, carbon factors,
comparison, scenarios and durable decisions remain separate work. There is no sample-loader
endpoint, route-add/remove editor, cost-adjustment editor or evidence-verification workflow.

## Endpoints

All business routes require Firebase identity, owner checks and production App Check.
Paths below start with `/api/v1/cases/{case_id}`.

| Method and path | Result |
|---|---|
| `GET /quotes` | Current quotes, case revision, limits, capabilities and disclosure |
| `POST /quotes` | Multipart PDF plus expected case revision and synthetic attestation; durable upload receipt |
| `GET /quote-intakes/{request_key}` | Exact upload receipt; absence is not proof of failure |
| `GET /quotes/{quote_id}` | Current extraction, draft, source, issues and confirmation |
| `GET /quotes/{quote_id}/document` | Authorized original PDF bytes with private/no-store headers |
| `PATCH /quotes/{quote_id}/draft` | Typed full draft and field-review decisions with revision checks |
| `POST /quotes/{quote_id}/confirm` | Explicit acknowledgment of the exact saved review revision |
| `GET /quotes/{quote_id}/review-operations/{request_key}` | Exact save/confirmation receipt |
| `GET /quotes/{quote_id}/revisions/{revision_id}` | Immutable confirmed snapshot |
| `POST /agent-runs` | Only `extract_quote` is implemented; bounded request, not background work |
| `GET /run-operations/{request_key}` | Resolve an extraction request key |
| `GET /runs/{run_id}` | Recorded extraction status and expiry recovery |
| `GET /runs/{run_id}/events` | Safe events from actual execution |
| `POST /quotation-operations/{request_key}/cancel` | Atomically close a missing request, or report that work is already recorded |

Mutations use `Idempotency-Key`. Reusing a key with different input is a conflict. A committed
replay returns the original receipt before stale-revision validation; it cannot create another
quote, draft revision or confirmation. Current state is retrieved separately from that receipt.

## Storage and review invariants

- Four quotes per case; each original PDF is at most 10 MiB and ten pages. Actual request
  bytes are bounded before multipart parsing. Content, encryption, pages and hash are checked
  server-side in a bounded parser process. Source filenames do not form storage paths.
- Firestore documents are owner-scoped. Private object paths use a SHA-256-derived owner
  segment, avoiding raw UID text in object keys; this is an implementation variation from
  the schema's illustrative path. Source generations and SHA-256 bind downloads to originals.
- Upload reservations and case revisions prevent duplicate or over-capacity commits. Failed
  staged objects retain a tracked path for later authorized cleanup; this code does not
  delete cloud data automatically.
- A successful extraction creates an unconfirmed draft and advances case/draft revisions.
  The validated extraction is retained separately from buyer edits and in a private run
  artifact. SDK model-version/token metadata is recorded when available; it is not billed cost.
- PDFs are untrusted input. The extraction request has no tools or confirmation authority.
  Missing values remain null; human-review flags and fabricated reference approvals are rejected.
  Page excerpts are checked against digital PDF text. Unmatched evidence remains unavailable;
  even a matched excerpt does not establish that its interpreted value is correct.
- Saving checks the expected case/draft revisions and successful extraction reference. It
  preserves raw extraction, records corrections/assumptions and clears current confirmation
  when reviewed inputs change. A genuine unchanged save does not increment revisions.
- Confirmation is a separate human route. It atomically stores the immutable revision,
  reviewer, timestamp, source hash, extraction reference, data, provenance and unresolved issues.
  An acknowledged missing field retains its downstream blockers. Malformed values and
  unchecked required review decisions block confirmation; known unsuitable facts can be recorded.
- Earlier confirmed revisions survive later edits. No model or external text can select the
  reviewer, mark review decisions confirmed, approve a factor or authorize another owner's data.

## Interrupted work

Extraction stays inside its active HTTP request with a total application deadline and a
persisted lease for crash reconciliation. The provider makes at most one model generation
with no automatic SDK retry. Transactional visitor/global budgets are reserved before paid
work. A shared lease limit bounds simultaneous extraction across visitors. The global kill switch can pause new calls. A retry may consume additional allowance;
exactly-once provider billing is not promised.

Unknown responses keep their request key. Readback never infers success from matching field
values. Reload recovery stores only request-reference metadata in browser session storage;
PDFs and private draft content are not cached there. If a named lookup establishes that no
request is recorded, the buyer can explicitly close that unresolved key. The server writes
an atomic cancellation marker that prevents a late original request from applying. Existing
recorded work must be read back and cannot be cleared by this path.

## Verification limits and release setup

See [the verification ledger](IMPLEMENTATION_STATUS.md) for commands actually executed and
[the setup guide](LIVE_QUOTATION_SETUP.md) for Firebase, App Check and live-model prerequisites.
New executable checks, test inputs, screenshots and detailed QA output stay in OS temporary
storage outside the repository.

Firebase's Storage emulator does not implement all Cloud Storage generation preconditions.
Local metadata checks exercise reference errors; production SDK precondition arguments are
checked separately with mocks. A deployed ownership/storage smoke test remains required.
No live extraction accuracy, production Storage behavior, public deployment or full MVP
completion is established by local emulator or injected-provider tests.
