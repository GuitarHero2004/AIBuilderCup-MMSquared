import { describe, expect, it } from 'vitest';
import { readConfig } from './environment';

const local = {
  VITE_APP_ENV: 'local', VITE_API_BASE_URL: 'http://127.0.0.1:8000',
  VITE_FIREBASE_PROJECT_ID: 'demo-greenprocure', VITE_FIREBASE_API_KEY: 'demo-key',
  VITE_FIREBASE_AUTH_EMULATOR_URL: 'http://127.0.0.1:9099',
};
const production = {
  VITE_APP_ENV: 'production', VITE_API_BASE_URL: 'https://api.example.com',
  VITE_FIREBASE_PROJECT_ID: 'production-project', VITE_FIREBASE_API_KEY: 'test-placeholder',
  VITE_FIREBASE_AUTH_DOMAIN: 'production-project.firebaseapp.com', VITE_FIREBASE_APP_ID: 'test-app-id',
  VITE_FIREBASE_APPCHECK_SITE_KEY: 'test-site-key',
};

describe('explicit environment boundaries', () => {
  it('requires explicit configuration instead of connecting to defaults', () => {
    expect(() => readConfig({})).toThrow('VITE_APP_ENV');
    expect(() => readConfig({ ...local, VITE_FIREBASE_AUTH_EMULATOR_URL: '' })).toThrow('VITE_FIREBASE_AUTH_EMULATOR_URL');
  });
  it('allows only a demo project and loopback services in local mode', () => {
    expect(readConfig(local).authEmulatorUrl).toBe('http://127.0.0.1:9099');
    expect(() => readConfig({ ...local, VITE_FIREBASE_PROJECT_ID: 'live-project' })).toThrow('demo-');
    expect(() => readConfig({ ...local, VITE_API_BASE_URL: 'https://api.example.com' })).toThrow('loopback');
    expect(() => readConfig({ ...local, VITE_FIREBASE_AUTH_EMULATOR_URL: 'http://emulator.example.com:9099' })).toThrow('loopback');
  });
  it('rejects credential-bearing URLs, queries and redirect-like paths', () => {
    for (const value of ['http://user:password@localhost:8000', 'http://localhost:8000?api_key=example', 'http://localhost:8000/api', 'file:///tmp/api']) {
      expect(() => readConfig({ ...local, VITE_API_BASE_URL: value })).toThrow();
    }
  });
  it('fails closed for production emulator/debug/incomplete app-check configuration', () => {
    expect(readConfig(production).environment).toBe('production');
    expect(() => readConfig({ ...production, VITE_FIREBASE_AUTH_EMULATOR_URL: local.VITE_FIREBASE_AUTH_EMULATOR_URL })).toThrow('forbidden');
    expect(() => readConfig({ ...production, VITE_FIREBASE_APPCHECK_DEBUG_TOKEN: 'test-debug-token' })).toThrow('forbidden');
    expect(() => readConfig({ ...production, VITE_FIREBASE_APPCHECK_SITE_KEY: '' })).toThrow('VITE_FIREBASE_APPCHECK_SITE_KEY');
    expect(() => readConfig({ ...production, VITE_API_BASE_URL: 'http://api.example.com' })).toThrow('HTTPS');
    expect(() => readConfig({ ...production, VITE_FIREBASE_PROJECT_ID: 'demo-greenprocure' })).toThrow('real Firebase');
  });
});
