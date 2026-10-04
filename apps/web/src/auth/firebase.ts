import { initializeApp } from 'firebase/app';
import { getToken, initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import type { AppConfig } from '../config/environment';
import { ApiError, createApiClient } from '../api/client';

export function initializeSession(config: AppConfig) {
  if (config.environment === 'production' && 'FIREBASE_APPCHECK_DEBUG_TOKEN' in globalThis) {
    throw new Error('Remove the App Check debug configuration before using production.');
  }
  const app = initializeApp(config.firebase);
  const appCheck = config.environment === 'production' && config.appCheckSiteKey
    ? initializeAppCheck(app, { provider: new ReCaptchaV3Provider(config.appCheckSiteKey), isTokenAutoRefreshEnabled: true })
    : undefined;
  const auth = getAuth(app);
  if (config.environment === 'local' && config.authEmulatorUrl) {
    // The workspace labels local mode; avoid the SDK's fixed overlay covering form fields.
    connectAuthEmulator(auth, config.authEmulatorUrl, { disableWarnings: true });
  }
  const api = createApiClient(config.apiBaseUrl, async () => {
    const user = auth.currentUser;
    if (!user) throw new ApiError('Your session has ended. Start a private demo to continue.', 'UNAUTHENTICATED');
    const headers: Record<string, string> = { Authorization: `Bearer ${await user.getIdToken()}` };
    if (appCheck) {
      try { headers['X-Firebase-AppCheck'] = (await getToken(appCheck)).token; }
      catch { throw new ApiError('App verification could not complete. Refresh this page and try again.', 'APP_CHECK_FAILED'); }
    }
    return headers;
  });
  return { auth, api };
}

export type SessionServices = ReturnType<typeof initializeSession>;
