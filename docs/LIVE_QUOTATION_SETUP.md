# Live quotation setup

Updated 18 October 2026 (Vietnam time). This covers private PDF upload, live extraction,
saved review and explicit human confirmation. Comparison, scenarios, saved decisions and
ADK coordination remain separate milestones.

## Current Google setup

Use the existing `greenprocure-511917` project and personal owner
`anhminhnts2004@gmail.com`. The missing Google configuration was completed under the
user's authorization; this is no longer only a read-only audit.

| Component | Verified setup | Release status |
|---|---|---|
| Project and billing | Existing active project; billing enabled | Ready |
| Firebase Web app | Existing GreenProcure app, `1:694155506378:web:a40e65eebd52c56eb53a33` | Ready |
| Authentication | Anonymous sign-in enabled; default Hosting domains authorized | Fresh hosted anonymous session passed |
| Firestore | Native `(default)` database in Singapore, `asia-southeast1`; deployed rules deny direct browser access | Ready |
| Private quotation Storage | `greenprocure-511917.firebasestorage.app`, Singapore | Live storage/runtime checks passed |
| App Check | Enterprise score-based key registered to the existing Web app for the two default Hosting domains | Real hosted tokens accepted; missing/invalid tokens rejected |
| Model | `gemini-3.1-flash-lite` through Google Cloud, `global` endpoint | Live smoke passed in 5.22 seconds |
| Build and image storage | Cloud Build and Artifact Registry enabled; `greenprocure` Docker repository and `greenprocure-511917-build-source` bucket in Singapore | Final container build and release verified |
| Runtime identity | Dedicated `greenprocure-api@greenprocure-511917.iam.gserviceaccount.com` with application permissions | Final revision `greenprocure-api-00002-2xp` ready |
| Build identity | Dedicated `greenprocure-build@greenprocure-511917.iam.gserviceaccount.com` with build permissions | Ready |
| Firebase Hosting | Existing default site; guarded production build/publisher prepared | Published; full hosted journey passed |

The live storage/runtime check suite passed **10 checks**. The successful model smoke is a
real provider request, not a fixture fallback. The subsequent hosted browser journey also passed with real identity, App Check and one
actual extraction, followed by saved review, explicit confirmation and successful reopening.

**Live app:** https://greenprocure-511917.web.app. Cloud Run revision
`greenprocure-api-00002-2xp` and Hosting release `1792261911497000` are verified. Another
visitor received 404 for the test case/quotation/PDF, missing or invalid App Check received
403, and direct database/storage reads received 403. Release IDs, image digest and executed
checks are recorded in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## Identity and data boundaries

Every supplied Google CLI operation explicitly selects the personal account and project.
The default CLI login may still be the work account. Do not rely on that default or assume
CLI authentication changed Application Default Credentials.

Cloud Run uses its dedicated runtime identity; the Cloud Build job uses its separate build
identity. Local live checks use short-lived, explicitly scoped credentials. No downloaded
service-account key is required. Tokens must stay in memory and must not appear in terminal
arguments, logs, committed files or browser configuration.

The application, Firestore and quotation bucket are in Singapore. **Gemini uses the global
endpoint; AI processing is not restricted to Singapore.** The upload notice discloses this,
limits uploads to synthetic, non-confidential demo material, and explains that PDFs,
extraction data and review history remain until the owner removes them. Automatic cleanup
is not implemented. Losing the anonymous browser session can prevent access to saved work.

The browser calls Cloud Run directly; long extraction requests do not pass through Hosting
rewrites. Firebase Hosting serves the static Vite application. Firebase Studio and App
Hosting are not needed.

## Production settings and controls

[API environment example](../infra/cloud/api.env.example.json) contains the verified
project, app allowlist, quotation bucket, model/location and retention notice. Its initial
`AI_ENABLED=false` is deliberate. Use a reviewed local environment file for a release.

- Firebase identity, owner checks and App Check are required on every business route.
- Allowed browser origins are `https://greenprocure-511917.web.app` and
  `https://greenprocure-511917.firebaseapp.com`.
- Model limits are **10 requests per user per day**, **100 globally per day**, and
  **2 simultaneous extractions globally**; the existing per-user active-run guard remains.
- PDF limits are 10 MiB and 10 pages; each user has at most two cases and four quotes per case.
- Cloud Run uses one CPU, 1 GiB memory, concurrency four, minimum zero and maximum two
  instances, and a 180-second request timeout. The model request timeout is 90 seconds.
- `AI_ENABLED=false` is the model kill switch. Billing alerts, if configured, are
  notifications rather than spending caps.

App Check uses `ReCaptchaEnterpriseProvider`. Its browser site key is public configuration,
not a secret. Production does not use a debug token or localhost key domain. Do not weaken
backend App Check to make an automated browser pass; verify a genuine token from the hosted
origin before calling the public flow ready.

## Build and release from the single checkout

Run these commands in `C:\AIBuilderCup-MMSquared`. Keep environment copies and release
receipts local, outside version control. The scripts do not provision resources, change
billing or add IAM grants.

Build the final reviewed API source:

```powershell
.\scripts\cloud-build-api.ps1 -Submit
```

The build stages only allowlisted API source into OS temp, then uploads it to the dedicated
build-source bucket. Its receipt records the source hashes, baseline commit, build ID and
image digest. Use a build produced **after the final provider changes**; edits made while a
build runs are not included in its staged source.

Validate the runtime settings, then deploy the successful build by immutable image digest:

```powershell
.\scripts\cloud-deploy-api.ps1 -BuildId '<successful-build-id>' -EnvironmentFile '<absolute-api-env.json>'
.\scripts\cloud-deploy-api.ps1 -BuildId '<successful-build-id>' -EnvironmentFile '<absolute-api-env.json>' -Deploy
```

For a reviewed environment with `AI_ENABLED=true`, add `-EnableLiveAi` after provider
verification. Public Cloud Run transport permits Firebase browser tokens to reach the
application; the application still verifies identity, ownership and App Check.

Complete the seven public values in
[web environment example](../infra/cloud/web.env.example.json), including the actual
Cloud Run origin, Firebase Web API key and Enterprise site key. Build with:

```powershell
.\scripts\cloud-build-web.ps1 -EnvironmentFile '<absolute-web-env.json>' -Build
```

The wrapper overrides local emulator settings safely and writes a `release.json` receipt
binding the intended project, app and API origin to every static file's SHA256 hash. It does
not publish anything.

Validate and publish the exact static build:

```powershell
.\scripts\cloud-deploy-web.ps1
.\scripts\cloud-deploy-web.ps1 -Publish
```

The first command performs local checks without reading a token or contacting Google.
Publication uses the Hosting REST API and the personal Google CLI token in memory. It checks
the existing site, asset allowlist and build hashes, uploads deterministic gzip content,
then finalizes and releases that version. It does not switch Firebase CLI accounts or ADC.
Only `index.html`, approved static assets and `release.json` are published; SPA routing is
preserved. If publication reports an uncertain result, inspect the reported version before
retrying.

The private release safety suite passed **27 checks** covering configuration, immutable
image selection, output tampering, upload destinations and finalization guards. Test
fixtures and detailed reports remain outside the repository.

## Repeating release verification

The first hosted release passed these checks. For future releases, verify API health at
`/api/health` and identity/App Check failures, then use the hosted app in
a fresh browser session: start a demo, create a case, upload a synthetic PDF, run real
extraction, inspect the source, save corrections, explicitly confirm and reopen after reload.
Check cross-owner access denial and private document access. Record the actual model result
and any unresolved browser issue; do not describe setup or a successful build as the
complete procurement platform.

References: [Enterprise App Check](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider),
[Cloud Build service identities](https://docs.cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts),
[Cloud Run deployment](https://docs.cloud.google.com/run/docs/deploying),
[Hosting REST release workflow](https://firebase.google.com/docs/hosting/api-deploy).
