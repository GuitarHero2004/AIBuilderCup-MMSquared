# Sources, provenance and external checks
**Checked for this update:** 1 October 2026.
**Google-service review:** 4 October 2026; refreshed S03 and added S16–S24 below.
These links support capabilities and limitations, not a claim that the app has been built.
Product rules are chosen in the PRD/calculation spec. Check installed SDK versions during coding.
No numeric emissions dataset was imported or certified by this update.

## User-provided basis
- Concept, PRD and Database Schema uploaded for this update; optional historical copies in
  the local-only `../.local/legacy/archive/v1/` when available, not required to build v2.
- Subsequent conversation: two-person team; Google-first stack; coordinator plus two specialists;
  GitHub collaboration, Firebase previews and Cloud Build backend deployment.
- 4 October 2026: team requested a PRD review and revision to make fuller use of Google
  services; the resulting v2.1 requirements remain proposed and unimplemented.
- Supplied submission excerpt: working accessible prototype/source, real Firebase/Firestore/
  Cloud Run/Gemini usage, and 3–4 minute demonstration. Pitch template/video creation is outside
  this technical pack. This is not a fresh audit of all organiser rules or eligibility terms.

## Official technical references
- **S01 — ADK tools and agents-as-tools:** https://adk.dev/tools-custom/function-tools/
  Confirms AgentTool-style specialist invocation; verify installed SDK imports and callback support.
- **S02 — ADK on Cloud Run:** https://docs.cloud.google.com/run/docs/ai/build-and-deploy-ai-agents/deploy-adk-agent
  Supports a Google-hosted ADK runtime; it does not require a service per specialist.
- **S03 — Gemini document and structured output:**
  https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/document-understanding
  and https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/control-generated-output
  Verify model capability/region; structured JSON alone is not semantic accuracy.
- **S04 — Firestore data model:** https://firebase.google.com/docs/firestore/data-model
  Collection/document alternation and lack of cascading subcollection deletion.
- **S05 — Firebase identity:** https://firebase.google.com/docs/auth/web/anonymous-auth
  and https://firebase.google.com/docs/auth/admin/verify-id-tokens
  Anonymous visitor identity plus server-side ID-token validation.
- **S06 — Server SDK access and Firestore rules:** https://firebase.google.com/docs/firestore/security/rules-conditions
  Server access does not rely on client Security Rules; application ownership checks are essential.
- **S07 — Firebase Hosting GitHub integration:** https://firebase.google.com/docs/hosting/github-integration
  PR previews use real backend resources; they are not separate backend environments.
- **S08 — Cloud Run repository deployments:** https://docs.cloud.google.com/run/docs/continuous-deployment
  Repository-triggered builds/deployment through Cloud Build; permissions need explicit setup.
- **S09 — Hosting and Cloud Run:** https://firebase.google.com/docs/hosting/cloud-run
  Billing prerequisite and Hosting's 60-second request timeout inform our direct-API choice.
- **S10 — Cloud Run logs:** https://docs.cloud.google.com/run/docs/logging
  Basis for structured application telemetry; no need to invent agent progress messages.
- **S11 — GitHub branch protection:**
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
  Reviews/checks are configurable; availability depends on the repo/account plan.
- **S12 — Codex AGENTS.md instructions:** https://developers.openai.com/codex/guides/agents-md/
  Supports repository-root coding guidance. This is not runtime Google ADK configuration.
- **S13 — OEKO-TEX STANDARD 100:** https://www.oeko-tex.com/en/our-standards/oeko-tex-standard-100
  Supports the narrow product-testing/certification distinction, not supplier-wide “green” status.
- **S14 — Fixed 2025 government conversion-factor publication:**
  https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025
  A source candidate, not an assertion that this is the newest or Vietnam-specific dataset.
  Exact transport row selection, units, boundaries and suitability remain unverified here.
- **S15 — Gemini function calling:** https://ai.google.dev/gemini-api/docs/function-calling
  Model proposals require application execution/validation; tools do not acquire authority from text.
- **S16 — Firebase App Check for a custom backend:**
  https://firebase.google.com/docs/app-check/custom-resource-backend
  Supports server-side token verification, including Python. Complements identity and application
  quotas; do not assume the Node-only replay-consumption feature is available in Python.
- **S17 — Cloud Run monitoring:** https://docs.cloud.google.com/run/docs/monitoring
  Cloud Monitoring exposes service metrics, uptime checks and alerting; application run/usage
  telemetry still needs intentional instrumentation and redaction.
- **S18 — Cloud Build, Artifact Registry and Cloud Run delivery:**
  https://docs.cloud.google.com/build/docs/deploying-builds/deploy-cloud-run
  Documents building an image, storing it in Artifact Registry and deploying it to Cloud Run.
- **S19 — Cloud Run and Secret Manager:**
  https://docs.cloud.google.com/run/docs/configuring/services/secrets
  Use for genuine runtime secrets when needed; Google service identity remains the chosen
  authentication mechanism, without downloaded service-account keys.
- **S20 — Document AI Form Parser:** https://docs.cloud.google.com/document-ai/docs/form-parser
  Extracts text, key/value pairs and simple tables. It does not establish accuracy on the team's
  quotations; evaluate it only against measured document-reading gaps.
- **S21 — Firebase account linking:** https://firebase.google.com/docs/auth/web/account-linking
  and https://firebase.google.com/docs/auth/web/anonymous-auth
  Supports linking a guest to a durable provider while retaining identity. Verify SDK behaviour,
  account-collision handling and the documented known issues before implementing the P1 upgrade.
- **S22 — Google Cloud Carbon Footprint scope:**
  https://docs.cloud.google.com/carbon-footprint/docs/export
  Reports emissions associated with covered Google Cloud usage, not freight emission factors
  for the supplier quotations evaluated by this product.
- **S23 — Google Cloud model-platform terminology:**
  https://docs.cloud.google.com/gemini-enterprise-agent-platform/overview
  Google describes Gemini Enterprise Agent Platform as an evolution of Vertex AI. This naming
  does not require moving the selected FastAPI/ADK application runtime away from Cloud Run.
- **S24 — Cloud Billing budgets:** https://docs.cloud.google.com/billing/docs/how-to/budgets
  Alerts-only budgets do not automatically cap usage or spending. Keep app-level quotas and
  the model-call kill switch; verify any separately configured spend-cap coverage before relying on it.

## Not established by these sources
No live GreenProcure performance, customer demand, market size, training success, certified
emissions savings or competition score is proven. The archived ILO/VITAS leads have not been
independently validated in this technical update. Obtain evidence before using such claims.
