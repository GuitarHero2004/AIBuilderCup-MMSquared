import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readConfig } from '../apps/web/src/config/environment.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args.length < 2 || args[0] !== '--config' ||
    args.slice(2).some((arg) => arg !== '--build') || args.length > 3) {
  throw new Error('Use node scripts/cloud-build-web.mjs --config <public-config.json> [--build].');
}
const configPath = path.resolve(args[1]);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, ''));
const names = [
  'VITE_APP_ENV', 'VITE_API_BASE_URL', 'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_APPCHECK_SITE_KEY',
];
if (Object.keys(config).length !== names.length || names.some((name) =>
  typeof config[name] !== 'string' || !config[name].trim() ||
  /REPLACE_|PLACEHOLDER|demo-key/.test(config[name]))) {
  throw new Error('Provide exactly the seven documented public browser settings; replace all example values.');
}
const parsed = readConfig(config);
if (parsed.environment !== 'production' || parsed.firebase.projectId !== 'greenprocure-511917' ||
    parsed.firebase.appId !== '1:694155506378:web:a40e65eebd52c56eb53a33' ||
    parsed.firebase.authDomain !== 'greenprocure-511917.firebaseapp.com') {
  throw new Error('Unexpected Firebase project, app or environment.');
}
if (new URL(parsed.apiBaseUrl).port || !/^greenprocure-api-(?:694155506378\.asia-southeast1|[a-z0-9-]+\.a)\.run\.app$/.test(new URL(parsed.apiBaseUrl).hostname)) {
  throw new Error('Use the verified greenprocure-api Cloud Run HTTPS origin.');
}
if (!/^AIza[0-9A-Za-z_-]{20,}$/.test(parsed.firebase.apiKey) ||
    !/^[0-9A-Za-z_-]{20,}$/.test(parsed.appCheckSiteKey)) {
  throw new Error('Use the existing public Firebase API key and Enterprise App Check site key.');
}
if (!args.includes('--build')) {
  console.log('Validated only; no build or cloud request. Add --build to create production static files.');
} else {
  // Empty strings must reach the child process. Windows PowerShell removes environment
  // values assigned an empty string, allowing Vite to reload the local emulator .env.
  const env = {
    ...process.env,
    ...config,
    VITE_FIREBASE_AUTH_EMULATOR_URL: '',
    VITE_FIREBASE_APPCHECK_DEBUG_TOKEN: '',
  };
  const npmCli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  const result = spawnSync(process.execPath, [npmCli, 'run', 'build'], { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Production frontend build failed; do not publish dist.');
  const dist = path.join(root, 'apps/web/dist');
  const files = {};
  function recordFiles(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) recordFiles(file);
      else if (entry.isFile() && entry.name !== 'release.json') {
        files['/' + path.relative(dist, file).split(path.sep).join('/')] =
          createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      } else if (!entry.isFile()) throw new Error('Unsupported build output; do not publish.');
    }
  }
  recordFiles(dist);
  const receipt = {
    project: parsed.firebase.projectId, firebase_app_id: parsed.firebase.appId,
    api_origin: parsed.apiBaseUrl, app_check: 'recaptcha-enterprise',
    built_at: new Date().toISOString(), files,
  };
  fs.writeFileSync(path.join(root, 'apps/web/dist/release.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log('Production frontend built at apps/web/dist. Nothing was published.');
}
