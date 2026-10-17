# Live quotation setup

This guide covers the first connected quotation milestone: private PDF upload, extraction,
review drafts and explicit human confirmation. Comparison, scenarios, decisions and ADK
coordination remain separate milestones. The presence of provider code is not evidence of a
successful live model call or a deployed application.

## Google project and Firebase

Use the existing `greenprocure-511917` project owned by the selected personal Google account.
Read-only checks on 18 October 2026 verified billing, the Firebase association, an active
Web app named GreenProcure and the default Firestore Native database in Singapore.
At that check, email sign-in was enabled but Anonymous sign-in was off, and no Storage
bucket existed. Console changes made later should be rechecked before release.

In [Firebase Console](https://console.firebase.google.com/project/greenprocure-511917/overview),
select this same project. Keep the existing Web app and database; do not recreate them:

1. Use the existing Web app under Project settings. The Firebase browser configuration is public
   initialization metadata; service-account keys and access tokens must never be copied into it.
2. Initialize Authentication and enable Anonymous sign-in.
3. Keep the existing Firestore Native database `(default)` in Singapore
   (`asia-southeast1`). Its location cannot be changed in place. Deploy the repository's
   deny-direct-client rules with the application.
4. Create a private Storage bucket in Singapore. Storage requires Blaze billing. Use the
   repository's deny-direct-client rules for both Firestore and Storage when deploying rules.
   Application reads and writes go through the authenticated backend.

Firebase Hosting serves the Vite build. Firebase Studio and Firebase App Hosting are not
required. The browser calls the Cloud Run API directly; do not route long extraction requests
through a Hosting rewrite.

## App Check before public access

The web application uses Firebase App Check with `ReCaptchaEnterpriseProvider`. This replaces
its previously unconfigured reCAPTCHA v3 provider for the first real deployment. Google
recommends Enterprise for new integrations. The environment variable remains
`VITE_FIREBASE_APPCHECK_SITE_KEY`, and it contains a public site key, never a secret key.

After registering the Web app:

1. In the same Cloud project, open reCAPTCHA Enterprise (the console may call it Fraud
   Defense), enable its API if needed, and create a **Web, score-based** key.
2. Add the actual Hosting domains that will serve the app, normally
   `greenprocure-511917.web.app` and `greenprocure-511917.firebaseapp.com` for this site.
   Do not add `localhost` to a production key. Local development uses isolated emulators.
3. In Firebase App Check, register the Web app with the reCAPTCHA Enterprise provider and
   this key. Verify real tokens before enabling enforcement for additional Firebase services.
4. The backend already requires valid App Check tokens and an explicit allowed Web app ID
   in production. These checks are not replaced by merely turning on a console setting.

Official instructions: [Enterprise App Check setup](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)
and [Google's provider recommendation](https://firebase.google.com/docs/app-check/web/recaptcha-provider).

## Backend release prerequisites

The implementation must be reviewed and tested before a separately authorized cloud release.
Cloud Run, Cloud Build, Artifact Registry and the Google Cloud model API require configuration
in this same project. Use a runtime service identity and application default credentials;
never download a service-account JSON key. The Cloud CLI login does not automatically change
Application Default Credentials, so verify the identity before any local live-model test.

The application/data region and the Gemini endpoint location are independent. Choose a
currently supported model and test a real PDF request using the selected project. A global
model endpoint does not guarantee Singapore processing. Model credentials or request failures
must remain visible; they must not activate synthetic extraction results.

Before accepting public uploads, configure and review the data-retention notice. Neither
Firestore parent expiry nor deleting a case automatically removes all child records and
Storage objects. This milestone does not perform automatic cleanup. Use only synthetic,
non-confidential demo quotations.

Public readiness also requires deployed owner-isolation checks, private-source access,
App Check, bounded model quotas, the kill switch and an incognito end-to-end smoke test.
Billing alerts are notifications, not spending caps.
