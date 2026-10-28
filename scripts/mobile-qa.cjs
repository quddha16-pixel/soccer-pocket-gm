// Run against Vite's dev server. Playwright is optional tooling, not a game dependency.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const url = process.env.BASE_URL || 'http://localhost:5173/soccer-pocket-gm/';
const artifacts = process.env.QA_ARTIFACTS || '/tmp/pocket-gm-mobile-qa';
fs.mkdirSync(artifacts, { recursive: true });

(async () => {
 const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'] });
 try {
  for (const [width, height] of [[320, 568], [375, 812], [390, 844], [430, 932]]) {
   const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
   const errors = []; page.on('pageerror', e => errors.push(e.message));
   const nav = name => page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button', { name, exact: true });
   const screenshot = name => page.screenshot({ path: path.join(artifacts, `${width}-${name}.png`) });
   async function overflow(label) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}: overflow on ${label}`); }
   async function seed() {
    await page.goto(url);
    await page.evaluate(async () => {
     const { newCareer } = await import('./src/simulation/career.ts');
     const { saveCareer } = await import('./src/storage.ts');
     localStorage.clear(); sessionStorage.clear(); saveCareer(newCareer('Mobile QA', 'unknown', 'hull', 1234));
    });
    await page.reload(); await page.getByRole('button', { name: 'Continue career', exact: true }).click();
   }
   await seed();
   const original = await page.evaluate(() => localStorage.getItem('pocket-football-gm-v1'));
   assert.equal(await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button').count(), 5);
   await screenshot('home'); await overflow('Home');
   if (height >= 812) {
    const play = await page.getByRole('button', { name: 'Play Next Match' }).boundingBox();
    const bar = await page.getByRole('navigation', { name: 'Primary navigation' }).boundingBox();
    assert(play.y + play.height <= bar.y, 'Home primary action visible');
   }
   await nav('Squad').click();
   for (const formation of ['4-3-3', '4-4-2', '4-2-3-1']) {
    await page.getByLabel('Formation', { exact: true }).selectOption(formation);
    const rects = await page.locator('.formation-player').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; }));
    assert.equal(rects.length, 11);
    for (let i = 0; i < 11; i++) for (let j = i + 1; j < 11; j++) {
     const a = rects[i], b = rects[j];
     assert(!(a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y), `${width}: players overlap in ${formation}: ${i}/${j}`);
    }
   }
   await page.getByRole('button', { name: 'Chemistry', exact: true }).click();
   assert(await page.locator('.chemistry-lines line').count() > 0);
   await page.locator('.formation-player').first().click();
   await screenshot('selection'); await overflow('selection');
   await page.getByRole('button', { name: 'Confirm selection' }).click();
   await page.locator('.formation-pitch').scrollIntoViewIfNeeded(); await screenshot('lineup');
   await page.getByRole('button', { name: 'Players', exact: true }).click();
   await page.evaluate(() => scrollTo(0, 0)); await screenshot('players'); await overflow('Players');
   await page.locator('.roster-card').first().click(); await screenshot('profile');
   await page.getByRole('button', { name: 'Attributes', exact: true }).click();
   assert.equal(await page.getByRole('meter').count(), 32, 'Eight goalkeeper and 24 outfield attributes');
   await screenshot('individual-attributes'); await overflow('individual attributes');
   await page.getByRole('button', { name: 'Contract', exact: true }).click();
   await page.getByLabel('Weekly renewal wage (£)').fill('12345');
   await page.keyboard.press('Escape'); assert.equal(await page.getByRole('dialog').count(), 0);
   await page.locator('.roster-card').first().click(); assert.equal(await page.getByLabel('Weekly renewal wage (£)').inputValue(), '12345');
   await page.getByRole('button', { name: 'Close profile' }).click();
   await page.locator('.roster-card').last().scrollIntoViewIfNeeded(); const scroll = await page.evaluate(() => scrollY);
   await nav('Market').click(); await nav('Squad').click();
   assert(Math.abs(await page.evaluate(() => scrollY) - scroll) < 2, `${width}: roster scroll retained`);
   await nav('Market').click(); await page.evaluate(() => scrollTo(0, 0)); await screenshot('market'); await overflow('Market');
   await page.getByRole('button', { name: 'Search & filter players', exact: true }).click();
   await page.getByLabel('Search player').fill('zzzzzzzz'); await page.getByLabel('Search player').press('Enter');
   assert(await page.getByText('No players found', { exact: true }).isVisible());
   await nav('Home').click(); await nav('Market').click();
   await page.getByRole('button', { name: 'zzzzzzzz', exact: true }).click();
   assert.equal(await page.getByLabel('Search player').inputValue(), 'zzzzzzzz');
   await page.getByLabel('Search player').fill(''); await page.getByLabel('Search player').press('Enter');
   await page.getByLabel('Market view').selectOption('Free Agents');
   // The exact oversized Hull roster is preserved. Recruit an exempt U21 free agent.
   await page.getByRole('button', { name: 'Search & filter players', exact: true }).click();
   await page.getByText('Advanced filters', { exact: true }).click();
   await page.getByLabel('Maximum age', { exact: true }).fill('21');
   await page.getByLabel('Search player').press('Enter');
   const targetName = await page.locator('.player-market-card h3').first().textContent();
   await page.getByRole('button', { name: 'Approach player', exact: true }).first().click();
   await page.getByRole('button', { name: 'Submit club offer' }).click();
   const agreedWage = await page.getByLabel('Weekly wage (£)', { exact: true }).inputValue();
   await page.getByLabel('Weekly wage (£)', { exact: true }).fill('23456');
   await page.getByRole('button', { name: 'Save draft & close' }).click();
   await page.reload(); await page.getByRole('button', { name: 'Continue career', exact: true }).click(); await nav('Market').click();
   await page.getByRole('button', { name: 'Approach player', exact: true }).first().click();
   assert.equal(await page.getByLabel('Weekly wage (£)', { exact: true }).inputValue(), '23456');
   await page.getByLabel('Weekly wage (£)', { exact: true }).fill(agreedWage);
   await page.getByLabel('Weekly wage (£)', { exact: true }).press('Enter');
   await page.getByRole('dialog').waitFor({ state: 'hidden' });
   assert.equal(await page.getByRole('dialog').count(), 0);
   const signed = await page.evaluate(async name => { const { loadCareer } = await import('./src/storage.ts'); return loadCareer().career.players.some(p => p.name === name && p.clubId === 'hull'); }, targetName);
   assert(signed, 'Keyboard negotiation actually signs player');
   await nav('Club').click(); await screenshot('club'); await overflow('Club');
   await page.getByRole('button', { name: /Finances/ }).click(); await screenshot('finances'); await overflow('Finances');
   await page.getByRole('button', { name: 'Back', exact: true }).click();
   await page.getByRole('button', { name: /Staff & contracts/ }).click(); await screenshot('staff'); await overflow('Staff');
   await page.getByLabel('Staff view').selectOption('Staff Market');
   const staff = page.locator('.staff-card').filter({ hasText: 'Free agent' }).first();
   await staff.getByRole('button', { name: 'Approach staff', exact: true }).click();
   await page.getByLabel('Contract years', { exact: true }).press('Enter');
   assert.equal(await page.getByRole('dialog').count(), 0); assert(await page.getByRole('status').isVisible());
   await nav('League').click(); await screenshot('league'); await overflow('League');
   assert.equal(await page.locator('.compact-table tbody tr').count(), 20);
   assert.equal(await page.locator('.compact-table').evaluate(el => el.scrollWidth > el.clientWidth), false, 'Core table fits');
   await page.getByRole('button', { name: 'Fixtures', exact: true }).click(); await screenshot('fixtures'); await overflow('Fixtures');
   await page.getByRole('button', { name: 'Next matchweek' }).click();
   await nav('Home').click(); await nav('League').click(); assert.equal(await page.getByLabel('Matchweek', { exact: true }).inputValue(), '2');
   // A long Unicode display name is a disposable layout fixture, not a roster edit.
   await page.evaluate(async () => { const { loadCareer, saveCareer } = await import('./src/storage.ts'); const c = loadCareer().career; c.players.find(p => p.clubId === c.clubId).name = 'Jean-Philippe Óscar Nørgaard-Warminsky'; saveCareer(c); });
   await page.reload(); await page.getByRole('button', { name: 'Continue career', exact: true }).click(); await nav('Squad').click();
   await page.getByRole('button', { name: 'Players', exact: true }).click(); await overflow('long player name');
   await page.locator('.roster-card').first().click(); await overflow('long profile name'); await screenshot('long-profile');
   await page.getByRole('button', { name: 'Close profile' }).click();
   // Restore the seeded universe before checking immutable match results.
   await page.evaluate(value => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('pocket-football-gm-v1', value); }, original);
   await page.reload(); await page.getByRole('button', { name: 'Continue career', exact: true }).click();
   await page.getByRole('button', { name: 'Play Next Match' }).click(); await screenshot('prematch'); await overflow('pre-match');
   await page.getByRole('button', { name: 'Watch Match', exact: true }).click(); await page.getByRole('button', { name: 'Pause', exact: true }).click();
   const controls = await page.locator('.playback-controls').boundingBox(), bar = await page.getByRole('navigation', { name: 'Primary navigation' }).boundingBox();
   const score = await page.locator('.match-scoreboard').boundingBox(), header = await page.locator('.topbar').boundingBox();
   assert(score.y >= header.y + header.height, `${width}: scoreboard fully below header`);
   assert(controls.y + controls.height <= bar.y, `${width}: playback controls above nav`);
   await screenshot('watch'); await overflow('Watch Match');
   for (const speed of ['2×', '4×', '1×']) await page.getByRole('button', { name: speed, exact: true }).click();
   const report = await page.evaluate(async () => { const { loadCareer } = await import('./src/storage.ts'); return JSON.stringify(loadCareer().career.pending.fixtures); });
   await page.locator('summary[aria-label="Match options"]').click(); await page.getByRole('button', { name: 'Full-screen match', exact: true }).click();
   await screenshot('fullscreen-match'); await overflow('expanded Match'); await page.keyboard.press('Escape');
   await page.locator('summary[aria-label="Match options"]').click(); await page.getByRole('button', { name: 'Use text view', exact: true }).click();
   await page.locator('summary[aria-label="Match options"]').click(); await page.getByRole('button', { name: 'Skip to full time' }).click();
   assert.equal(await page.evaluate(async () => { const { loadCareer } = await import('./src/storage.ts'); return JSON.stringify(loadCareer().career.pending.fixtures); }), report);
   await screenshot('fulltime'); await page.getByRole('button', { name: 'Finish matchweek & view results' }).click();
   assert.equal(await page.getByRole('dialog').locator('.fixture').count(), 10); await screenshot('results');
   await page.getByRole('button', { name: 'Continue to club' }).click();
   await page.reload(); await page.getByRole('button', { name: 'Continue career', exact: true }).click();
   assert.equal(await page.evaluate(async () => { const { loadCareer } = await import('./src/storage.ts'); return loadCareer().career.week; }), 1);
   assert.deepEqual(errors, []);
   console.log(`PASS ${width}×${height}: navigation, formations, profiles, scrolling, drafts, keyboard signings, table, match, results, refresh; no overflow/runtime errors`);
   await page.close();
  }
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
