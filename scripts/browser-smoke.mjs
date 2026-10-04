import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';
import { root, apiRoot, apiPython, localEnvironment } from './process.mjs';

// Only child processes created here are stopped. Existing local services are never killed.
const children = [];
let browser;
async function requireFreePort(port) {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', () => reject(new Error(`Port ${port} is in use. Stop your dev server before this test.`)));
    server.listen(port, '127.0.0.1', resolve);
  });
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
function start(executable, args, cwd, env) {
  const child = spawn(executable, args, { cwd, env, stdio: 'inherit', windowsHide: true });
  child.on('error', (error) => { child.startError = error; });
  children.push(child);
  return child;
}
async function ready(url, child) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.startError || child.exitCode !== null) throw child.startError ?? new Error(`Server exited before ${url} was ready.`);
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return; } catch { /* wait for our server */ }
    await delay(200);
  }
  throw new Error(`Timed out starting ${url}`);
}
try {
  await requireFreePort(8000);
  await requireFreePort(5173);
  const api = start(apiPython, ['-m', 'uvicorn', 'app.main:create_app', '--factory', '--host', '127.0.0.1', '--port', '8000'], apiRoot, localEnvironment);
  const web = start(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5173', '--strictPort'], path.join(root, 'apps/web'), {
    ...localEnvironment, VITE_APP_ENV: 'local', VITE_API_BASE_URL: 'http://127.0.0.1:8000',
    VITE_FIREBASE_PROJECT_ID: 'demo-greenprocure', VITE_FIREBASE_API_KEY: 'demo-key',
    VITE_FIREBASE_AUTH_EMULATOR_URL: 'http://127.0.0.1:9099',
  });
  await Promise.all([ready('http://127.0.0.1:8000/healthz', api), ready('http://127.0.0.1:5173', web)]);
  browser = await chromium.launch({ headless: true });
  const visitor = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await visitor.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: 'Start private demo' }).click();
  await page.getByRole('button', { name: 'Create your first case' }).click();
  await page.getByLabel('Case name', { exact: true }).fill('Synthetic teammate smoke case');
  await page.getByRole('button', { name: 'Create sourcing case', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic teammate smoke case', level: 2 })).toBeVisible();
  await expect(page.getByText('50,000', { exact: true }).first()).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /Synthetic teammate smoke case/ }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic teammate smoke case', level: 2 })).toBeVisible();
  const artifacts = path.join(root, '.local/artifacts');
  mkdirSync(artifacts, { recursive: true });
  await page.screenshot({ path: path.join(artifacts, 'foundation-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Sourcing cases' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(artifacts, 'foundation-mobile.png'), fullPage: true });
  const otherVisitor = await browser.newContext();
  const otherPage = await otherVisitor.newPage();
  await otherPage.goto('http://127.0.0.1:5173');
  await otherPage.getByRole('button', { name: 'Start private demo' }).click();
  await expect(otherPage.getByRole('button', { name: 'Create your first case' })).toBeVisible();
  await expect(otherPage.getByRole('heading', { name: 'Synthetic teammate smoke case' })).toHaveCount(0);
  expect(pageErrors).toEqual([]);
  console.log('Browser smoke passed: anonymous sign-in, create, reload, separate visitor, desktop and mobile.');
} finally {
  if (browser) await browser.close();
  await Promise.all(children.map((child) => new Promise((resolve) => {
    if (child.exitCode !== null || !child.pid) return resolve();
    child.once('exit', resolve);
    child.kill();
  })));
}
