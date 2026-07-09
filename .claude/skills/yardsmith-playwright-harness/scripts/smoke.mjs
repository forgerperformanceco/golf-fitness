/* smoke.mjs — boot the REAL committed Yardsmith build headlessly and assert it's sane.
 *
 * Verifies the repo-root build output AS-IS (no rebuild — if you changed src/,
 * run `node scripts/build.mjs` yourself first; a stale build is exactly what
 * this smoke exists to catch).
 *
 * Usage:
 *   node smoke.mjs              # run all three states: fresh, onboarded, active
 *   node smoke.mjs fresh        # just the brand-new-user boot (onboarding wizard)
 *   node smoke.mjs onboarded    # onboarded profile, plan not started
 *   node smoke.mjs active       # plan running, logged sessions, Stats unlocked
 *
 * Per state it asserts:
 *   - zero pageerrors, zero same-origin console errors
 *   - window.FF_BUILD is a 10-char lowercase hex hash (the {{V}} content hash)
 *   - no unreplaced "{{V}}" anywhere in the served document
 *   - tab bar present: #mobileTabs with 5 buttons, #tabs with 5 buttons
 *   - state-specific: wizard shown (fresh) / suppressed (seeded); Home CTA;
 *     Stats trend cards unlocked past the hasAny gate (active)
 * Exit code 0 = all green; 1 = any failure (details printed).
 */
import { startServer, resolvePlaywright, resolveChromiumExe, REPO_ROOT } from './serve.mjs';
import { SEEDS } from './seeds.mjs';

const want = process.argv[2] || 'all';
const states = want === 'all' ? ['fresh', 'onboarded', 'active'] : [want];
if (!states.every((s) => SEEDS[s])) {
  console.error(`unknown state "${want}" — use fresh | onboarded | active | all`);
  process.exit(1);
}

let failures = 0;
const ok = (cond, label, extra) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${cond || extra === undefined ? '' : `  → ${JSON.stringify(extra)}`}`);
  if (!cond) failures++;
};

const srv = await startServer();
const { chromium } = resolvePlaywright();
const browser = await chromium.launch({ executablePath: resolveChromiumExe(), args: ['--no-sandbox'] });
console.log(`serving ${REPO_ROOT} at ${srv.url}`);

for (const state of states) {
  console.log(`\n[${state}]`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // Only external-CDN noise is ever tolerable in a sandbox; same-origin errors always count.
    if (/cdn\.jsdelivr|supabase\.co/.test(t)) return;
    consoleErrors.push(t);
  });
  if (state !== 'fresh') await page.addInitScript(SEEDS[state]);

  await page.goto(srv.url, { waitUntil: 'networkidle' });

  // -- universal invariants --
  const build = await page.evaluate(() => window.FF_BUILD);
  ok(/^[0-9a-f]{10}$/.test(build || ''), `FF_BUILD is a 10-char hash`, build);
  const html = await page.content();
  ok(!html.includes('{{V}}'), 'no unreplaced {{V}} in served document');
  ok((await page.locator('#mobileTabs button').count()) === 5, 'mobile tab bar: 5 buttons');
  ok((await page.locator('#tabs button').count()) === 5, 'top tab bar: 5 buttons');

  // -- state-specific --
  if (state === 'fresh') {
    ok((await page.locator('#obRoot').count()) === 1, 'onboarding wizard (#obRoot) shown to a fresh user');
  } else {
    ok((await page.locator('#obRoot').count()) === 0, 'no onboarding wizard for a seeded user');
  }
  if (state === 'onboarded') {
    const dash = await page.locator('#view-dash').innerText();
    ok(/Start your 20-week plan/i.test(dash), 'Home shows "Start your 20-week plan" CTA');
  }
  if (state === 'active') {
    await page.click('#mobileTabs button[data-view="progress"]');
    await page.waitForTimeout(250);   // render is sync; small margin for view swap
    const prog = await page.locator('#progressBody').innerText();
    ok(/Clubhead speed/i.test(prog), 'Stats unlocked past hasAny gate (Clubhead speed card)');
    ok(!/undefined|NaN|\[object Object\]/.test(prog), 'no leaked undefined/NaN/[object Object] on Stats');
  }

  ok(pageErrors.length === 0, 'zero pageerrors', pageErrors.slice(0, 3));
  ok(consoleErrors.length === 0, 'zero same-origin console errors', consoleErrors.slice(0, 3));
  await ctx.close();
}

await browser.close();
await srv.close();
console.log(failures === 0 ? '\nSMOKE GREEN' : `\nSMOKE RED — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
