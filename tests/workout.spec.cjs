const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const KEY = /const KEY=['"]([^'"]+)/.exec(fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'))[1];
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
const tab = (page, name) => page.locator(`[data-app-tab="${name}"]`).click();
async function onPage(page, name) {
  await expect(page.locator(`.tab-active > .page-current[data-name="${name}"]`)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.workoutFramework.views.every(view => view.router.allowPageChange))).toBe(true);
}
async function start(page) {
  await page.locator('#today').click(); await onPage(page, 'upcoming');
  await page.locator('#start').click(); await onPage(page, 'active');
}
const errors = new WeakMap();
test.beforeEach(async ({ page }) => {
  errors.set(page, []);page.on('pageerror', e => errors.get(page).push(e.message));
  // Exercise images are optional remote content; no live backup key is used.
  await page.route('https://raw.githubusercontent.com/**', route => route.abort());
  await page.goto('/');await onPage(page, 'home');
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

test('tabs, nested navigation, and repeated page reuse', async ({ page }) => {
  await tab(page, 'programs');await onPage(page, 'programSection');
  for (let i = 0; i < 3; i++) {
    await page.locator('.programTile').first().click();await onPage(page, 'programDaysSection');
    await page.locator('.dayTile').first().click();await onPage(page, 'daySection');
    await tab(page, 'history');await onPage(page, 'historySection');
    await tab(page, 'programs');await onPage(page, 'daySection');
    await page.locator('#dayBack').click();await onPage(page, 'programDaysSection');
    await page.locator('#backPrograms').click();await onPage(page, 'programSection');
  }
  await expect(page.locator('[data-app-tab="programs"]')).toHaveAttribute('aria-current', 'page');
  expect(await page.locator('#daySection').count()).toBe(1);
});

test('weights and checked exercises survive tabs, sheets, and reload', async ({ page }) => {
  await start(page);
  const first = page.locator('[data-action="done"]').first();await first.check();
  await page.locator('[data-action="weightToggle"]').first().click();
  await expect(page.locator('#weightSheet')).toHaveClass(/modal-in/);
  await page.locator('#sheetWeight').fill('125.5');
  await expect.poll(async () => (await saved(page)).active.exercises.find(e => e.weight !== '').weight).toBe('125.5');
  await page.locator('#weightDone').click();
  await expect(page.locator('#weightSheet')).not.toHaveClass(/modal-in/);
  await tab(page, 'programs');await onPage(page, 'programSection');
  await tab(page, 'history');await onPage(page, 'historySection');
  await tab(page, 'today');await onPage(page, 'active');
  await expect(first).toBeChecked();
  await expect(page.locator('[data-action="weightToggle"]').first()).toContainText('125.5');
  // Today has no stale Start page behind the active session.
  expect(await page.evaluate(() => workoutFramework.views.main.router.history)).toEqual(['/active/']);
  await page.reload();await onPage(page, 'active');
  await expect(page.locator('[data-action="done"]').first()).toBeChecked();
  await expect(page.locator('[data-action="weightToggle"]').first()).toContainText('125.5');
});

test('alternative picker cancels, applies, and restores an exercise', async ({ page }) => {
  await start(page);
  const button = page.locator('[data-action="swap"]').first();
  const card = page.locator('.exercise').filter({ has: page.locator('[data-action="swap"]') }).first();
  const original = await card.locator('.check strong').innerText();
  await button.click();await page.getByText('Cancel', { exact: true }).click();
  await expect(card.locator('.check strong')).toHaveText(original);
  await button.click();await page.locator('.actions-modal.modal-in .actions-button').filter({ hasText: 'Use alternative:' }).click();
  await expect(card.locator('.check strong')).not.toHaveText(original);
  await button.click();await page.locator('.actions-modal.modal-in .actions-button').filter({ hasText: 'Use original:' }).click();
  await expect(card.locator('.check strong')).toHaveText(original);
});

test('finish confirmation, history details, and image sheet', async ({ page }) => {
  await start(page);
  await page.locator('[data-action="done"]').first().check();
  await page.locator('.exerciseImage').first().click();
  await expect(page.locator('#imageDialog')).toHaveClass(/modal-in/);
  await page.locator('#closeImage').click();
  await page.locator('#finish').click();await expect(page.locator('.dialog.modal-in')).toBeVisible();
  await page.locator('.dialog.modal-in .dialog-button').filter({ hasText: 'Cancel' }).click();
  expect((await saved(page)).sessions).toHaveLength(0);
  await page.locator('#finish').click();await page.locator('.dialog.modal-in .dialog-button').filter({ hasText: 'OK' }).click();
  await onPage(page, 'home');await expect(page.locator('#workoutSuccess')).toBeVisible();
  expect((await saved(page)).sessions).toHaveLength(1);
  await tab(page, 'history');await page.locator('[data-history]').click();
  await expect(page.locator('#details')).toHaveClass(/modal-in/);
  await expect(page.locator('#detailsBody')).toContainText('Started:');
  await page.locator('#closeDetails').click();
  await tab(page, 'progress');await onPage(page, 'progressSection');
  await expect(page.locator('#progressDashboard')).toContainText('1');
});

test('discard cancellation preserves workout and confirm clears it', async ({ page }) => {
  await start(page);const id = (await saved(page)).active.id;
  await page.locator('#discard').click();await page.locator('.dialog.modal-in .dialog-button').filter({ hasText: 'Cancel' }).click();
  expect((await saved(page)).active.id).toBe(id);
  await page.locator('#discard').click();await page.locator('.dialog.modal-in .dialog-button').filter({ hasText: 'OK' }).click();
  await onPage(page, 'home');expect((await saved(page)).active).toBeNull();
});

test('cached shell reloads when the server is unreachable', async ({ page }) => {
  // WebKit's offline emulation rejects even service-worker responses (Playwright
  // #42775). Drop real HTTP connections on an isolated origin instead, testing
  // the actual cache fallback in both engines without changing browser internals.
  const http = require('node:http');
  let unavailable = false;
  const root = path.join(__dirname, '..');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    if (unavailable) { req.socket.destroy(); return; }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
    fs.readFile(file, (error, content) => {
      if (error) { res.writeHead(404);res.end();return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });res.end(content);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/`);await onPage(page, 'home');
    await start(page);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    });
    unavailable = true;server.closeAllConnections();
    await page.reload();await onPage(page, 'active');
    await tab(page, 'programs');await onPage(page, 'programSection');
    await tab(page, 'today');await onPage(page, 'active');
  } finally {
    server.closeAllConnections();await new Promise(resolve => server.close(resolve));
  }
});

test('mobile layout has no horizontal overflow or tab overlap', async ({ page }, testInfo) => {
  for (const width of [320, 393, 768]) {
    await page.setViewportSize({ width, height: 852 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 393, height: 852 });
  await page.screenshot({ path: testInfo.outputPath('home.png') });
  await start(page);
  await page.locator('#finish').scrollIntoViewIfNeeded();
  const finish = await page.locator('#finish').boundingBox();const tabs = await page.locator('.app-tabbar').boundingBox();
  expect(finish.y + finish.height).toBeLessThanOrEqual(tabs.y);
  await page.screenshot({ path: testInfo.outputPath('workout.png') });
});

test('start briefing highlights the program and summarizes the workout without a list', async ({ page }, testInfo) => {
  await page.locator('#today').click();await onPage(page, 'upcoming');
  await expect(page.locator('#nextProgramName')).toHaveText('4-Day Hypertrophy');
  await expect(page.locator('#nextTitle')).toHaveText('Lower A');
  await expect(page.locator('#nextDay')).toHaveText('Day 1 of 4');
  await expect(page.locator('#nextExerciseCount')).toHaveText('6');
  await expect(page.locator('#nextSetCount')).toHaveText('15');
  await expect(page.locator('#nextWarmupSummary')).toHaveText('6 activities before your main workout.');
  await expect(page.locator('#nextFocus')).toContainText('Quads');
  await expect(page.locator('#nextHistory')).toBeHidden();
  await expect(page.locator('#upcoming')).not.toContainText('Leg Press');
  expect(await page.locator('#upcoming .exercise, #upcoming ol, #upcoming ul').count()).toBe(0);
  const sizes = await page.evaluate(() => ['nextProgramName', 'nextTitle'].map(id => parseFloat(getComputedStyle(document.getElementById(id)).fontSize)));
  expect(sizes[0]).toBeGreaterThan(sizes[1]);
  for (const width of [320, 393]) {
    await page.setViewportSize({ width, height: 852 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath('workout-start.png') });
  await page.locator('#start').click();await onPage(page, 'active');
  expect((await saved(page)).active.programName).toBe('4-Day Hypertrophy');
});

test('start briefing uses the selected program, day, and latest matching session', async ({ page }, testInfo) => {
  await page.evaluate(key => {
    const program = { id: 'custom', version: 2, name: 'Personal Strength & Mobility Program', description: 'A steady balance of strength and mobility.', days: [
      { name: 'Recovery', ex: [['Custom stretch', 2, '30 sec', '']], warmup: '' },
      { name: 'Full Body', focus: ['Strength', 'Mobility'], warmupEx: [['Easy movement', 1, '3 min', '']], ex: [['Custom movement', 3, '8–12', '']] },
    ] };
    localStorage.setItem('workout_programs_cache_v1', JSON.stringify([program]));
    localStorage.setItem(key, JSON.stringify({ programId: 'custom', next: { custom: 1 }, active: null, sessions: [
      { id: 'old-version', programId: 'custom', programVersion: 1, dayIndex: 1, endedAt: '2026-11-14T12:00:00Z', exercises: [] },
      { id: 'matching', programId: 'custom', programVersion: 2, dayIndex: 1, endedAt: '2026-11-10T12:00:00Z', exercises: [] },
      { id: 'different-day', programId: 'custom', programVersion: 2, dayIndex: 0, endedAt: '2026-11-15T12:00:00Z', exercises: [] },
    ].map(session => ({ ...session, startedAt: session.endedAt, programName: program.name, dayName: 'Full Body' })) }));
  }, KEY);
  await page.reload();await onPage(page, 'home');
  await page.locator('#today').click();await onPage(page, 'upcoming');
  await expect(page.locator('#nextProgramName')).toHaveText('Personal Strength & Mobility Program');
  await expect(page.locator('#nextProgramDescription')).toHaveText('A steady balance of strength and mobility.');
  await expect(page.locator('#nextDay')).toHaveText('Day 2 of 2');
  await expect(page.locator('#nextTitle')).toHaveText('Full Body');
  await expect(page.locator('#nextExerciseCount')).toHaveText('1');
  await expect(page.locator('#nextSetCount')).toHaveText('3');
  await expect(page.locator('#nextWarmupSummary')).toHaveText('1 activity before your main workout.');
  await expect(page.locator('#nextLastCompleted')).toHaveAttribute('datetime', '2026-11-10T12:00:00Z');
  await expect(page.locator('#upcoming')).not.toContainText('Custom movement');
  await page.setViewportSize({ width: 320, height: 852 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('workout-start-long-name.png') });
});
