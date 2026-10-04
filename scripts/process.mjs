import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const apiRoot = path.join(root, 'services', 'api');
export const windows = process.platform === 'win32';
export const toolingPython = path.join(root, '.local', 'tooling', windows ? 'Scripts/python.exe' : 'bin/python');
export const uv = path.join(root, '.local', 'tooling', windows ? 'Scripts/uv.exe' : 'bin/uv');
export const apiPython = path.join(apiRoot, '.venv', windows ? 'Scripts/python.exe' : 'bin/python');
const pathVariable = Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
const javaBin = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin') : undefined;
const directJava = javaBin && existsSync(path.join(javaBin, windows ? 'java.exe' : 'java'));
export const localEnvironment = {
  ...process.env,
  // On Windows Oracle's javapath launcher can orphan the JVM on emulator shutdown.
  [pathVariable]: directJava ? `${javaBin}${path.delimiter}${process.env[pathVariable] ?? ''}` : process.env[pathVariable],
  // Firebase CLI debug output includes its inherited environment. Keep local logs minimal.
  DEBUG: '',
  APP_ENV: 'local',
  GOOGLE_CLOUD_PROJECT: 'demo-greenprocure',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
  APP_CHECK_REQUIRED: 'false',
  ALLOWED_ORIGINS: '["http://localhost:5173","http://127.0.0.1:5173"]',
  FIREBASE_EMULATORS_PATH: path.join(root, '.local', 'cache', 'firebase-emulators'),
  XDG_CONFIG_HOME: path.join(root, '.local', 'firebase-config'),
  PLAYWRIGHT_BROWSERS_PATH: path.join(root, '.local', 'cache', 'playwright'),
  UV_CACHE_DIR: path.join(root, '.local', 'cache', 'uv'),
  PYTHONUTF8: '1',
};

export function run(executable, args, options = {}) {
  const result = spawnSync(executable, args, { cwd: root, stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(executable)} exited with ${result.status ?? result.signal}`);
  return result;
}

export function npm(args) {
  if (!process.env.npm_execpath) throw new Error('Run this script through npm run.');
  return run(process.execPath, [process.env.npm_execpath, ...args]);
}
