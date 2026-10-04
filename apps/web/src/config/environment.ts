export interface AppConfig {
  environment: 'local' | 'production';
  apiBaseUrl: string;
  firebase: { projectId: string; apiKey: string; authDomain?: string; appId?: string };
  authEmulatorUrl?: string;
  appCheckSiteKey?: string;
}

type Environment = Record<string, string | boolean | undefined>;

export class ConfigurationError extends Error {}

function required(env: Environment, name: string): string {
  const value = env[name];
  if (typeof value !== 'string' || !value.trim()) {
    throw new ConfigurationError(`Set ${name} before opening the workspace.`);
  }
  return value.trim();
}

const isLoopback = (hostname: string) => ['localhost', '127.0.0.1', '[::1]'].includes(hostname);

function parseUrl(value: string, name: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new ConfigurationError(`${name} must be a valid URL.`); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new ConfigurationError(`${name} must be an HTTP(S) origin without credentials, a path or query.`);
  }
  return url;
}

export function readConfig(env: Environment): AppConfig {
  const environment = required(env, 'VITE_APP_ENV');
  if (environment !== 'local' && environment !== 'production') {
    throw new ConfigurationError('VITE_APP_ENV must be local or production.');
  }
  const api = parseUrl(required(env, 'VITE_API_BASE_URL'), 'VITE_API_BASE_URL');
  const projectId = required(env, 'VITE_FIREBASE_PROJECT_ID');
  const apiKey = required(env, 'VITE_FIREBASE_API_KEY');
  if (environment === 'local') {
    const emulator = parseUrl(required(env, 'VITE_FIREBASE_AUTH_EMULATOR_URL'), 'VITE_FIREBASE_AUTH_EMULATOR_URL');
    if (!isLoopback(api.hostname) || !isLoopback(emulator.hostname) || !projectId.startsWith('demo-')) {
      throw new ConfigurationError('Local mode requires loopback API/Auth emulator URLs and a demo- Firebase project.');
    }
    return { environment, apiBaseUrl: api.origin, firebase: { projectId, apiKey }, authEmulatorUrl: emulator.origin };
  }
  if (api.protocol !== 'https:' || isLoopback(api.hostname) || projectId.startsWith('demo-') || apiKey === 'demo-key') {
    throw new ConfigurationError('Production requires an HTTPS API and real Firebase web configuration.');
  }
  if (env.VITE_FIREBASE_AUTH_EMULATOR_URL || env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN) {
    throw new ConfigurationError('Emulators and App Check debug tokens are forbidden in production.');
  }
  return {
    environment,
    apiBaseUrl: api.origin,
    firebase: { projectId, apiKey, authDomain: required(env, 'VITE_FIREBASE_AUTH_DOMAIN'), appId: required(env, 'VITE_FIREBASE_APP_ID') },
    appCheckSiteKey: required(env, 'VITE_FIREBASE_APPCHECK_SITE_KEY'),
  };
}
