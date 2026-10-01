# Sources, provenance and external checks
**Checked for this update:** 1 October 2026.
These links support capabilities and limitations, not a claim that the app has been built.
Product rules are chosen in the PRD/calculation spec. Check installed SDK versions during coding.
No numeric emissions dataset was imported or certified by this update.

## User-provided basis
- Concept, PRD and Database Schema uploaded for this update; optional historical copies in
  the local-only `../.local/legacy/archive/v1/` when available, not required to build v2.
- Subsequent conversation: two-person team; Google-first stack; coordinator plus two specialists;
  GitHub collaboration, Firebase previews and Cloud Build backend deployment.
- Supplied submission excerpt: working accessible prototype/source, real Firebase/Firestore/
  Cloud Run/Gemini usage, and 3–4 minute demonstration. Pitch template/video creation is outside
  this technical pack. This is not a fresh audit of all organiser rules or eligibility terms.

## Official technical references
- **S01 — ADK tools and agents-as-tools:** https://adk.dev/tools-custom/function-tools/
  Confirms AgentTool-style specialist invocation; verify installed SDK imports and callback support.
- **S02 — ADK on Cloud Run:** https://docs.cloud.google.com/run/docs/ai/build-and-deploy-ai-agents/deploy-adk-agent
  Supports a Google-hosted ADK runtime; it does not require a service per specialist.
- **S03 — Gemini document and structured output:**
  https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/document-understanding
  and https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output
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

## Not established by these sources
No live GreenProcure performance, customer demand, market size, training success, certified
emissions savings or competition score is proven. The archived ILO/VITAS leads have not been
independently validated in this technical update. Obtain evidence before using such claims.
