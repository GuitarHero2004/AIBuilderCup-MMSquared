import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';
import { root, apiRoot, apiPython, localEnvironment } from './process.mjs';

// Uses the real local Auth/Firestore/API flow. Routes below inject specific failures;
// no fixture cases or substitute successful API responses are installed in the app.
// Only child processes created here are stopped. Existing services are never killed.
const children = [];
const checks = [];
const pageErrors = [];
const artifacts = path.join(root, '.local/artifacts/ui-workspace');
const appUrl = 'http://127.0.0.1:5173';
const casesUrl = 'http://127.0.0.1:8000/api/v1/cases';
const viewports = [
  { width: 1440, height: 1100 }, { width: 1024, height: 900 },
  { width: 768, height: 1024 }, { width: 390, height: 844 },
  { width: 320, height: 800 },
];
let browser;
let currentPage;
let firebaseAuthModuleUrl;

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
function passed(name) { checks.push(name); }
function watch(page) {
  currentPage = page;
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (response.ok() && url.origin === appUrl && url.pathname.endsWith('/firebase_auth.js')) {
      firebaseAuthModuleUrl = response.url();
    }
  });
}
async function expectWorkspace(page) {
  await expect(page.getByRole('heading', { name: 'Sourcing workspace', level: 1 })).toBeVisible();
}
async function openCreate(page) {
  await page.getByRole('button', { name: 'Create sourcing case', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create sourcing case', level: 1 })).toBeVisible();
}
async function layouts(page, screen) {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(dimensions.document, `${screen} overflows at ${viewport.width}px`).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.body, `${screen} body overflows at ${viewport.width}px`).toBeLessThanOrEqual(dimensions.viewport);
    await page.screenshot({ path: path.join(artifacts, `${screen}-${viewport.width}.png`), fullPage: true });
  }
  await page.setViewportSize(viewports[0]);
  passed(`${screen}: five viewport checks (1440/1024/768/390/320), screenshots captured`);
}
async function fillCase(page, name, destination) {
  await page.getByLabel('Case name', { exact: true }).fill(name);
  if (destination) await page.getByLabel('Delivery destination', { exact: true }).fill(destination);
}
async function returnToWorkspace(page) {
  await page.getByRole('button', { name: 'Back to workspace', exact: true }).click();
  await expectWorkspace(page);
}

try {
  mkdirSync(artifacts, { recursive: true });
  await requireFreePort(8000);
  await requireFreePort(5173);
  const api = start(apiPython, ['-m', 'uvicorn', 'app.main:create_app', '--factory', '--host', '127.0.0.1', '--port', '8000'], apiRoot, localEnvironment);
  const web = start(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5173', '--strictPort'], path.join(root, 'apps/web'), {
    ...localEnvironment, VITE_APP_ENV: 'local', VITE_API_BASE_URL: 'http://127.0.0.1:8000',
    VITE_FIREBASE_PROJECT_ID: 'demo-greenprocure', VITE_FIREBASE_API_KEY: 'demo-key',
    VITE_FIREBASE_AUTH_EMULATOR_URL: 'http://127.0.0.1:9099',
  });
  await Promise.all([ready('http://127.0.0.1:8000/healthz', api), ready(appUrl, web)]);
  browser = await chromium.launch({ headless: true });
  const visitor = await browser.newContext({ viewport: viewports[0], reducedMotion: 'reduce' });
  const page = await visitor.newPage();
  watch(page);
  await page.goto(appUrl);
  await expect(page.getByRole('button', { name: 'Start private demo', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: 'Skip to main content', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  passed('Keyboard skip link moves focus to the main content');
  await layouts(page, 'entry');

  // An initial list failure must not masquerade as an empty workspace or allow creation.
  let failFirstList = true;
  const failList = async (route) => {
    if (route.request().method() === 'GET' && failFirstList) {
      failFirstList = false;
      await route.abort('failed');
    } else await route.continue();
  };
  await page.route(casesUrl, failList);
  await page.getByRole('button', { name: 'Start private demo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry loading cases', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create sourcing case', exact: true })).toBeDisabled();
  await page.screenshot({ path: path.join(artifacts, 'workspace-load-error.png'), fullPage: true });
  await page.getByRole('button', { name: 'Retry loading cases', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Create sourcing case', exact: true })).toBeEnabled();
  await page.unroute(casesUrl, failList);
  await expectWorkspace(page);
  passed('Anonymous sign-in; initial list failure blocks creation; explicit retry loads private workspace');

  // Main navigation must work with a keyboard and retain a single primary screen.
  const createButton = page.getByRole('button', { name: 'Create sourcing case', exact: true });
  await createButton.focus();
  await page.keyboard.press('Enter');
  const createHeading = page.getByRole('heading', { name: 'Create sourcing case', level: 1 });
  await expect(createHeading).toBeVisible();
  await expect(createHeading).toBeFocused();

  // Validation identifies fields, links to them, focuses the first error and does not POST.
  let postCount = 0;
  page.on('request', (request) => {
    if (request.url() === casesUrl && request.method() === 'POST') postCount++;
  });
  const nameField = page.getByLabel('Case name', { exact: true });
  await nameField.fill('');
  await page.getByLabel('Order quantity', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Create sourcing case', exact: true }).click();
  await expect(nameField).toHaveAttribute('aria-invalid', 'true');
  await expect(nameField).toBeFocused();
  const quantityErrorLink = page.getByRole('link', { name: /Order quantity/i });
  await expect(quantityErrorLink).toBeVisible();
  await quantityErrorLink.click();
  await expect(page.getByLabel('Order quantity', { exact: true })).toBeFocused();
  expect(postCount).toBe(0);
  await page.screenshot({ path: path.join(artifacts, 'create-validation.png'), fullPage: true });
  await fillCase(page, 'Synthetic unsaved draft');
  await page.getByLabel('Order quantity', { exact: true }).fill('50000');
  passed('Validation prevents POST; inline errors and summary focus the affected field');

  // A native modal must preserve edits, trap keyboard focus and honour Escape.
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  const discardDialog = page.getByRole('dialog');
  await expect(discardDialog).toBeVisible();
  const keepEditing = discardDialog.getByRole('button', { name: 'Keep editing', exact: true });
  const discardChanges = discardDialog.getByRole('button', { name: 'Discard changes', exact: true });
  await expect(keepEditing).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(discardChanges).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(keepEditing).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(discardDialog).not.toBeVisible();
  await expect(nameField).toHaveValue('Synthetic unsaved draft');
  await page.getByRole('button', { name: 'Help & methodology', exact: true }).click();
  await expect(discardDialog).toBeVisible();
  await keepEditing.click();
  await expect(nameField).toHaveValue('Synthetic unsaved draft');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await discardChanges.click();
  await expectWorkspace(page);
  await openCreate(page);
  await expect(nameField).not.toHaveValue('Synthetic unsaved draft');
  passed('Dirty navigation preserves edits on Escape; modal traps focus; explicit discard resets draft');

  const firstName = 'Synthetic woven fabric order for fictional workshop buyer - '.padEnd(160, 'A');
  const longDestination = 'Fictional HCMC receiving facility, synthetic delivery reference - '.padEnd(160, 'B');
  await fillCase(page, firstName, longDestination);
  await layouts(page, 'create');

  // A definite rejection retains editable inputs. This injected response never reaches the API.
  let rejectSave = true;
  const rejectPost = async (route) => {
    if (route.request().method() === 'POST' && rejectSave) {
      rejectSave = false;
      await route.fulfill({
        status: 400, contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': appUrl },
        body: JSON.stringify({ error: { code: 'TEST_REJECTED', message: 'Synthetic test rejection. Review the entered requirements and try again.' } }),
      });
    } else await route.continue();
  };
  await page.route(casesUrl, rejectPost);
  await page.getByRole('button', { name: 'Create sourcing case', exact: true }).click();
  await expect(page.getByText('Synthetic test rejection. Review the entered requirements and try again.', { exact: true })).toBeVisible();
  await expect(nameField).toHaveValue(firstName);
  await expect(nameField).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Create sourcing case', exact: true })).toBeEnabled();
  await page.screenshot({ path: path.join(artifacts, 'create-save-rejected.png'), fullPage: true });
  await page.unroute(casesUrl, rejectPost);
  passed('Definite save rejection preserves editable values and allows an explicit retry');

  // Hold a real save long enough to inspect duplicate-submit protection, then let it persist.
  let releaseSave;
  let signalSaveStarted;
  const saveStarted = new Promise((resolve) => { signalSaveStarted = resolve; });
  const holdSave = new Promise((resolve) => { releaseSave = resolve; });
  let realSaveRequests = 0;
  const delayPost = async (route) => {
    if (route.request().method() === 'POST') {
      realSaveRequests++;
      signalSaveStarted();
      await holdSave;
    }
    await route.continue();
  };
  await page.route(casesUrl, delayPost);
  await page.getByRole('button', { name: 'Create sourcing case', exact: true }).click();
  await saveStarted;
  await expect(page.getByRole('button', { name: 'Saving case', exact: false })).toBeDisabled();
  await expect(nameField).toBeDisabled();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  releaseSave();
  await expect(page.getByRole('heading', { name: firstName, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: firstName, level: 1 })).toBeFocused();
  expect(realSaveRequests).toBe(1);
  await page.unroute(casesUrl, delayPost);
  await expect(page.locator('dd').filter({ hasText: '50,000 metres' })).toBeVisible();
  await expect(page.locator('dd').filter({ hasText: longDestination })).toBeVisible();
  await layouts(page, 'requirements');
  passed('Real create persists once despite repeated Enter; saved requirements receive focus');

  await page.reload();
  await expectWorkspace(page);
  await page.getByRole('button', { name: `Open requirements for ${firstName}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: firstName, level: 1 })).toBeVisible();
  await expect(page.locator('dd').filter({ hasText: longDestination })).toBeVisible();
  await returnToWorkspace(page);
  await layouts(page, 'workspace');
  passed('Anonymous identity and saved requirements survive a browser reload');

  await page.getByRole('button', { name: 'Help & methodology', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Help & methodology', level: 1 })).toBeVisible();
  await layouts(page, 'help');
  await returnToWorkspace(page);
  await openCreate(page);
  const secondName = 'Synthetic second case for quota verification';
  await fillCase(page, secondName);
  await page.getByRole('button', { name: 'Create sourcing case', exact: true }).click();
  await expect(page.getByRole('heading', { name: secondName, level: 1 })).toBeVisible();
  await returnToWorkspace(page);
  await expect(page.getByRole('button', { name: /^Open requirements for / })).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Create sourcing case', exact: true })).toBeDisabled();
  await expect(page.getByText(/2 of 2 demo cases used/i)).toBeVisible();
  await page.screenshot({ path: path.join(artifacts, 'workspace-case-limit.png'), fullPage: true });
  passed('Two real cases reach the demo limit; existing requirements remain accessible');

  const otherVisitor = await browser.newContext({ viewport: viewports[0] });
  const otherPage = await otherVisitor.newPage();
  watch(otherPage);
  await otherPage.goto(appUrl);
  await otherPage.getByRole('button', { name: 'Start private demo', exact: true }).click();
  await expect(otherPage.getByRole('button', { name: 'Create sourcing case', exact: true })).toBeEnabled();
  await expect(otherPage.getByRole('button', { name: /^Open requirements for / })).toHaveCount(0);
  await expect(otherPage.getByText(firstName, { exact: true })).toHaveCount(0);
  passed('A separate anonymous visitor cannot see the first visitor\'s saved cases');

  // Forward the POST to the actual API, verify it succeeded, then lose only the response.
  // This exercises readback after a real persisted write, not a mocked success fixture.
  const uncertainName = 'Synthetic case saved before its response was lost';
  let droppedResponse;
  let lostPostCount = 0;
  const loseResponse = async (route) => {
    if (route.request().method() === 'POST') {
      lostPostCount++;
      const response = await route.fetch();
      droppedResponse = { status: response.status(), body: await response.json() };
      await route.abort('failed');
    } else await route.continue();
  };
  await otherPage.route(casesUrl, loseResponse);
  await openCreate(otherPage);
  await fillCase(otherPage, uncertainName);
  await otherPage.getByRole('button', { name: 'Create sourcing case', exact: true }).click();
  await expect(otherPage.getByRole('button', { name: 'Check saved cases', exact: true })).toBeVisible();
  expect(droppedResponse.status).toBe(201);
  expect(droppedResponse.body.name).toBe(uncertainName);
  await expect(otherPage.getByLabel('Case name', { exact: true })).toHaveValue(uncertainName);
  await expect(otherPage.getByRole('button', { name: 'Create sourcing case', exact: true })).toBeDisabled();
  await otherPage.screenshot({ path: path.join(artifacts, 'create-uncertain-save.png'), fullPage: true });
  await otherPage.getByRole('button', { name: 'Help & methodology', exact: true }).click();
  await otherPage.getByRole('dialog').getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(otherPage.getByLabel('Case name', { exact: true })).toHaveValue(uncertainName);
  await expect(otherPage.getByRole('button', { name: 'Create sourcing case', exact: true })).toBeDisabled();
  expect(lostPostCount).toBe(1);
  await otherPage.unroute(casesUrl, loseResponse);
  let failReadback = true;
  const failSavedList = async (route) => {
    if (route.request().method() === 'GET' && failReadback) {
      failReadback = false;
      await route.abort('failed');
    } else await route.continue();
  };
  await otherPage.route(casesUrl, failSavedList);
  await otherPage.getByRole('button', { name: 'Check saved cases', exact: true }).click();
  await expectWorkspace(otherPage);
  await expect(otherPage.getByRole('button', { name: 'Retry loading cases', exact: true })).toBeVisible();
  await expect(otherPage.getByRole('button', { name: 'Resume unsaved draft', exact: true })).toBeDisabled();
  await otherPage.getByRole('button', { name: 'Retry loading cases', exact: true }).click();
  await expect(otherPage.getByRole('button', { name: `Open requirements for ${uncertainName}`, exact: true })).toBeVisible();
  await otherPage.unroute(casesUrl, failSavedList);
  await expect(otherPage.getByRole('button', { name: /^Open requirements for / })).toHaveCount(1);
  await expect(otherPage.getByRole('button', { name: 'Resume unsaved draft', exact: true })).toBeEnabled();
  await otherPage.getByRole('button', { name: 'Discard draft', exact: true }).click();
  await otherPage.getByRole('dialog').getByRole('button', { name: 'Discard changes', exact: true }).click();
  await expect(otherPage.getByRole('button', { name: 'Create sourcing case', exact: true })).toBeEnabled();
  await otherPage.getByRole('button', { name: `Open requirements for ${uncertainName}`, exact: true }).click();
  await expect(otherPage.getByRole('heading', { name: uncertainName, level: 1 })).toBeVisible();
  await otherPage.reload();
  await expect(otherPage.getByRole('button', { name: /^Open requirements for / })).toHaveCount(1);
  await expect(otherPage.getByText(firstName, { exact: true })).toHaveCount(0);
  passed('Lost successful POST response blocks resubmission across navigation and failed readback; explicit retry reconciles one real case; draft discard is explicit');

  // Persist under the current owner, but deliver its response only after a real SDK
  // sign-out and a fresh anonymous sign-in. Discover the module URL from the page's
  // successful load rather than hardcoding Vite's optimized dependency hash.
  expect(firebaseAuthModuleUrl, 'The page must have loaded the Firebase Auth module').toBeTruthy();
  const oldOwnerName = 'Synthetic old-owner case with a delayed success response';
  let releaseOldResponse;
  const oldResponseGate = new Promise((resolve) => { releaseOldResponse = resolve; });
  let persistedOldWrite;
  let oldWriteError;
  let oldWriteReady = false;
  const holdOldResponse = async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    try {
      const response = await route.fetch();
      persistedOldWrite = { status: response.status(), body: await response.json() };
      oldWriteReady = true;
      await oldResponseGate;
      await route.fulfill({ response });
    } catch (error) {
      oldWriteError = error;
      oldWriteReady = true;
      await route.abort('failed').catch(() => {});
    }
  };
  await otherPage.route(casesUrl, holdOldResponse);
  await openCreate(otherPage);
  await fillCase(otherPage, oldOwnerName);
  await otherPage.getByRole('button', { name: 'Create sourcing case', exact: true }).click();
  await expect.poll(() => oldWriteReady, { timeout: 15000 }).toBe(true);
  if (oldWriteError) throw oldWriteError;
  expect(persistedOldWrite.status).toBe(201);
  expect(persistedOldWrite.body.name).toBe(oldOwnerName);
  await expect(otherPage.getByRole('button', { name: 'Saving case', exact: false })).toBeDisabled();

  const oldOwnerUid = await otherPage.evaluate(async (moduleUrl) => {
    const { getAuth, signOut } = await import(moduleUrl);
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    await signOut(auth);
    return uid;
  }, firebaseAuthModuleUrl);
  expect(oldOwnerUid).toBeTruthy();
  await expect(otherPage.getByRole('button', { name: 'Start private demo', exact: true })).toBeEnabled();
  await otherPage.getByRole('button', { name: 'Start private demo', exact: true }).click();
  await expect(otherPage.getByRole('button', { name: 'Create sourcing case', exact: true })).toBeEnabled();
  const newOwnerUid = await otherPage.evaluate(async (moduleUrl) => {
    const { getAuth } = await import(moduleUrl);
    return getAuth().currentUser?.uid;
  }, firebaseAuthModuleUrl);
  expect(newOwnerUid).toBeTruthy();
  expect(newOwnerUid).not.toBe(oldOwnerUid);
  await expect(otherPage.getByRole('button', { name: /^Open requirements for / })).toHaveCount(0);

  const oldResponseDelivered = otherPage.waitForResponse((response) => response.url() === casesUrl && response.request().method() === 'POST');
  releaseOldResponse();
  const delayedSuccess = await oldResponseDelivered;
  expect(delayedSuccess.status()).toBe(201);
  await delayedSuccess.finished();
  // Wait for the browser to process the delivered body and paint React updates;
  // this is a rendering boundary, not a time-based sleep that could hide a race.
  await otherPage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  if (oldWriteError) throw oldWriteError;
  await expectWorkspace(otherPage);
  await expect(otherPage.getByRole('button', { name: /^Open requirements for / })).toHaveCount(0);
  await expect(otherPage.getByText(oldOwnerName, { exact: true })).toHaveCount(0);
  await expect(otherPage.getByText(uncertainName, { exact: true })).toHaveCount(0);
  await expect(otherPage.getByRole('button', { name: 'Create sourcing case', exact: true })).toBeEnabled();
  await otherPage.unroute(casesUrl, holdOldResponse);
  await otherPage.screenshot({ path: path.join(artifacts, 'workspace-session-switch.png'), fullPage: true });
  passed('A real old-owner POST response delivered after SDK sign-out and fresh UI sign-in cannot populate the new owner\'s workspace');

  expect(pageErrors).toEqual([]);
  passed('No uncaught browser JavaScript errors');
  writeFileSync(path.join(artifacts, 'report.json'), JSON.stringify({ status: 'passed', checks, pageErrors }, null, 2));
  console.log(`Workspace browser checks passed (${checks.length} groups). Screenshots and report: ${artifacts}`);
} catch (error) {
  if (currentPage && !currentPage.isClosed()) {
    await currentPage.screenshot({ path: path.join(artifacts, 'failure.png'), fullPage: true }).catch(() => {});
  }
  writeFileSync(path.join(artifacts, 'report.json'), JSON.stringify({ status: 'failed', checks, pageErrors, error: String(error) }, null, 2));
  throw error;
} finally {
  if (browser) await browser.close();
  await Promise.all(children.map((child) => new Promise((resolve) => {
    if (child.exitCode !== null || !child.pid) return resolve();
    child.once('exit', resolve);
    child.kill();
  })));
}
