# Repository and cloud setup — Minh + Mạnh
**Status:** local foundation implemented; GitHub access and cloud steps below still require team action.

## 1. Join the existing repository and run locally
Keep the existing monorepo; do not create a second repository or re-import the context pack.
Invite Mạnh using his actual GitHub handle when the team is ready to share access.
Do not guess the handle or use a shared account. Decide visibility and licensing yourselves.
The team's submitted source must meet the organiser's accessible-repository instructions;
private development is not a guarantee the final submission is publicly accessible.

Clone the existing repository from its actual GitHub URL and follow the root README's
local quick start. Use Node 24, npm 11/12, Python 3.12 and Java 21+. The checked-in npm workspace
and `services/api/uv.lock` supply the tested dependency baseline. Keep AGENTS.md at the root.
Keep GREENPROCURE_CONTEXT.md and CODEX_KICKOFF.md under docs/. Historical v1 files are optional
local-only material under `.local/legacy/archive/` when retained; teammates do not need them to build v2.

PowerShell-friendly setup after cloning (run from the actual repository root):
```powershell
npm ci
npm run setup:api
# First setup only; do not overwrite an existing local configuration.
Copy-Item apps/web/.env.example apps/web/.env.local
npm run check
npm run test:integration
```
Use the README's three-terminal commands for the browser, API and emulators. These use only
the isolated `demo-greenprocure` project on loopback. No cloud access or Firebase login is
needed. Integration tests own their emulator processes; stop dev emulators before running them.
For browser smoke verification, run `npm run setup:browser` once, then `npm run test:e2e`.
Emulator data is temporary; it does not survive emulator shutdown in the default setup.
Use the current branch/workflow. Do not rewrite history or force-push. Read
`docs/IMPLEMENTATION_STATUS.md` before using `docs/CODEX_KICKOFF.md` for the next increment.

## 2. Lightweight collaboration
Feature branches such as `feat/quotation-review` and `feat/sourcing-engine` → PR → one review
by the other teammate → squash merge. No need for GitFlow, a mandatory develop branch or an
extra paid review bot. Suggested ownership: Minh focuses product/UI/test fixtures; Mạnh focuses
API/agents/cloud; both review data contracts and maths. This is proposed ownership, not a claim
about either person's proficiency.

The checked-in workflow defines the `checks` job. After its first real successful GitHub run,
protect `main` with one approval, passing checks, resolved
review threads and blocked force-push/deletion. GitHub feature availability depends on account/
repo plan [S11]. The supplied PR template is only a checklist; it does not configure enforcement.
Do not require two external reviewers for a two-person team or require checks that never run.

## 3. Code checks and the next increments
`.github/workflows/ci.yml` installs locked dependencies, runs `npm run check` and starts
isolated Firebase integration tests. It has read-only repository permissions and no cloud
credentials. The workflow has not run on GitHub as part of local setup.
`npm run check` covers frontend lint/typecheck/unit tests/build, Ruff checks and Python tests,
plus generated API contract consistency. Python type checking is not separately configured.
Browser smoke is available locally; CI currently runs API/emulator integration, not Chromium.
Add calculation, confirmation, stale-revision and no-feasible-option tests with those features;
the current foundation does not implement or claim to verify them.

CI on untrusted/fork PRs gets no production secrets. Do not use privileged pull_request_target
checkout/execution of untrusted code. Optional AI review does not replace tests or human review.
The foundation supplies the checks file; it does not configure branch protection, connect
GitHub/Firebase integrations or grant teammate access.

## 4. Google project and access
Use one Firebase-enabled Google Cloud project for the initial synthetic demo. Grant the teammate
appropriate development access separately from GitHub access. Identify project ID, Firestore
location, Storage bucket, Cloud Run region, Gemini model/location and runtime service identity.
These values are not supplied and must not be invented.

Cloud Run requires billing setup even with free quota [S09]. Obtain the team's authorisation
before linking billing or creating billable resources. Set cost monitoring, app quotas and
small instance/model-call limits; do not treat monitoring as guaranteed spend enforcement.

Enable the required APIs/provider only after authorisation. Use anonymous Auth for visitors.
Runtime identity needs narrowly scoped access to Gemini, Firestore, its bucket and logs as
required. Build/deploy identity is separate. Prefer platform/workload identity rather than
committed service-account files. Configure compatible stable SDK/model versions and document them.

The public web app still uses private application data. Backend token verification and owner
checks remain mandatory even if Cloud Run permits incoming public HTTP connections.

## 5. First manual deployment, then CI/CD
Deploy a small known-working backend and frontend with review before adding automation.
Verify incognito identity, one PDF Gemini extraction, human review, Firestore persistence and
reloading the result. Then enable:

| Work | Owner |
|---|---|
| PR code checks | GitHub Actions |
| Frontend PR preview / live frontend | Firebase Hosting GitHub integration |
| Backend build/container/deploy on reviewed main | Cloud Build → Cloud Run |

Firebase Hosting's integration creates per-PR frontend previews, not isolated backend resources
[S07]. Initially previews use the synthetic-demo backend with per-UID data and clear labelling.
Add actual preview origins/domains to required auth/CORS configuration. Never interpret a preview
URL as a full production replica. Fork code must not run with deploy credentials.

Cloud Build supports repository-triggered Cloud Run deployments [S08]. Use a reviewed `main`
trigger only, with test steps preceding deployment and the correct backend build context.
Do not also deploy the same backend from a second GitHub workflow. Avoid a second frontend
platform such as Vercel; it adds no required functionality to this design.

Keep frontend/API contracts backwards-compatible during separate deployments. Tag the tested
submission commit and record both deployed versions. Freeze unnecessary deployments during evaluation.

## 6. Credentials, config and rollback
Safe `.env.example` files exist in `apps/web/` and `services/api/`. Root `dev:api` deliberately
sets local emulator configuration; production starts the app directly with reviewed runtime
environment values. Do not put actual secrets in examples. Runtime ADC is not a file to ship
in a public repo. Firebase client
configuration is distinct from privileged admin credentials; validate both appropriately.
Store server-only optional secrets in the approved cloud secret mechanism, not browser variables.

Document exactly how to redeploy the last tested Cloud Run image/revision and the tested Firebase
frontend release. Test after rollback; stale caches or API contract changes can break a mixed pair.
No delete/recreate procedure should be run automatically to “fix” a deployment.

## 7. Release checklist
- Public frontend opens without a developer login; Try demo gets a private Firebase identity.
- Gemini is called in live mode; all used factors are reviewed, sourced and non-test.
- Four PDFs follow real extraction/review; source data is labelled synthetic.
- A/B scenario works; C/D stay excluded; missing/no-feasible/stale states work.
- Coordinator and both specialists execute, with real tool events.
- Firestore/Storage and all tool endpoints reject cross-user access.
- No exposed credentials, full PDF logs or public bucket access.
- Auth, CORS, quotas, billing/API access and actual deployed revision are recorded.
- GitHub/source and prototype satisfy the team's supplied accessibility requirements.
- No automatic expiry/cleanup scheduled to break evaluation; retention is reviewed.

A landing page, mock test or successful build alone is not submission readiness.
