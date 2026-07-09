#!/usr/bin/env node
/*
 * audit-train.mjs — Yardsmith Train-tab state-matrix audit.
 *
 * Recreates the standing audit born in DESIGN-CHANGES.md §60 ("green tests,
 * real bug": suites exercised the Today path while the buggy reset button
 * lived in logFoot). Drives the Train tab through 9 states × light/dark = 18
 * runs against the BUILT output (repo root), asserting in every state:
 *   - zero page errors / zero console errors (see FILTER below)
 *   - no leaked `undefined` / `NaN` / `[object Object]` / unreplaced `{{V}}`
 *     in rendered text
 *   - warm-up folds (`details.prelift`) never [open] by default
 *   - every logged day exposes a reset (finish-bar `[data-clearworkout]`
 *     OR logFoot `[data-clearday]`)
 *   - no half-width `.logbtn` (width ≥ 0.8 × its `.day-foot`)
 *   - tap targets ≥ 44px tall (`.planview-seg button`, `.ws-chip`, `.logbtn`,
 *     the §60 set, plus `.pl-start` and `.sb-go`; `.rest-check` is a known
 *     42px gap — see the note at the check)
 * plus state-specific structural assertions (start bar, player CTA text,
 * deload banner, speed-day card, week-view card counts).
 *
 * Run:   node .claude/skills/yardsmith-validation-and-qa/scripts/audit-train.mjs
 * Env:   YS_ROOT=<repo root>  PW_CHROME=<chromium binary>  (both optional)
 * Exit:  0 = all states clean; 1 = failures (each printed).
 *
 * Self-contained: embeds its own static server + Playwright launch. Rebuild
 * first (`node scripts/build.mjs`) — this drives the committed build outputs.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/* ---------- environment (identical block in all four audit scripts) ---------- */
function repoRoot() {
  if (process.env.YS_ROOT) return process.env.YS_ROOT;
  let d = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(d, 'index.html')) && fs.existsSync(path.join(d, 'sw.js'))) return d;
    d = path.dirname(d);
  }
  throw new Error('repo root not found — set YS_ROOT');
}
function loadChromium() {
  try { return require('playwright-core').chromium; } catch {}
  try { return require('/opt/node22/lib/node_modules/playwright').chromium; } catch {}
  throw new Error('playwright not found — npm i playwright-core, or install a global playwright');
}
function findChrome() {
  if (process.env.PW_CHROME) return process.env.PW_CHROME;
  const base = '/opt/pw-browsers';
  try {
    const dirs = fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort();
    for (const d of dirs.reverse()) {
      const p = path.join(base, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) return p;
    }
  } catch {}
  return undefined; // let Playwright resolve its own browser
}
function startServer(ROOT) {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
    '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  return new Promise(r => server.listen(0, () => r(server)));
}
// Console-error filter: sandbox network noise only — never app errors.
const FILTER = /net::ERR|Failed to load resource/i;

/* ---------- seeds ---------- */
// Post-onboarding profile. Keys/values must match src/js/app/020-persistence…
// (profile key is literally "fairwayfuel"; goal must be a real GOALS key).
function baseProfile() {
  return { sex: 'male', goal: 'leanbulk', workout: 'morning', meals: 4, age: '34', weight: '185',
    heightFt: '5', heightIn: '11', activity: '1.55', freq: 5,
    equip: { bodyweight: true, dumbbells: true, barbell: true, bench: true, pullupbar: true, kettlebell: true,
      bands: true, medball: true, box: true, legpress: true, legext: true, legcurl: true, cable: true, latpulldown: true },
    view: 'dash' };
}
const daysAgoIso = n => new Date(Date.now() - n * 864e5).toISOString();
const DAY1 = 'Day 1 — Lower (Quads)';         // names carry a real em dash (U+2014)
const DAY2 = 'Day 2 — Upper (Push)';
const SPEED = 'Day 3 — Speed & Power';
function session(names, finished) {
  const ex = names.map(([n, t]) => ({ name: n, orig: n, target: t,
    sets: [{ w: '135', r: '8', done: true }, { w: '135', r: '8', done: true }, { w: '135', r: '8', done: true }] }));
  const s = { date: 'Jul 8, 2026', _ts: Date.now(), ex };
  if (finished) s.finishedAt = 'Jul 8, 2026';
  return s;
}
const liftSess = f => session([['Leg Press', '4 × 6'], ['Romanian Deadlift', '3 × 8'], ['Walking Lunge', '3 × 10 / leg'],
  ['Leg Extension', '3 × 12'], ['Standing Calf Raise', '4 × 12'], ['Hanging Leg Raise', '3 × 12']], f);
const pushSess = f => session([['Barbell Bench Press', '4 × 5'], ['Incline DB Press', '3 × 10'],
  ['Standing Overhead Press', '4 × 6'], ['Lateral Raise', '3 × 15']], f);
const speedSess = f => session([['Trap-bar jump', '4 × 3'], ['Landmine rotational throw', '4 × 4 / side'],
  ['Speed bench press', '4 × 4'], ['Kettlebell swing', '3 × 6'], ['Cable lateral chop', '3 × 4 / side'],
  ['Overspeed swings', '3 × 5']], f);

/* ---------- the 9 states (DESIGN-CHANGES §60 matrix) ----------
 * Each: seed → optional focus click → assertions run in BOTH themes.
 * `focusChip` clicks the Nth week-strip chip so the featured card is the day
 * under test (a fresh boot features nextWorkout() = first un-logged day). */
const STATES = [
  { name: 'not-started', seed: {},
    expect: { startbar: true } },
  { name: 'today-lift-fresh', seed: { ff_start: daysAgoIso(0) },
    expect: { dayFocus: true, plStartText: /Start workout/, slRows: 6 } },
  { name: 'today-lift-manual', seed: { ff_start: daysAgoIso(0), ff_manual_log: true },
    expect: { dayFocus: true, ilogBox: true, finishBar: true } },
  { name: 'today-lift-logged', seed: { ff_start: daysAgoIso(0), ff_log: { ['1|' + DAY1]: liftSess(true) } },
    focusChip: 0, expect: { dayFocus: true, plStartText: /Session finished/, resetExposed: true, doneChips: 1 } },
  { name: 'speed-fresh', seed: { ff_start: daysAgoIso(3), ff_log: { ['1|' + DAY1]: liftSess(true), ['1|' + DAY2]: pushSess(true) } },
    expect: { speedday: true, plStartText: /speed session/ } },
  { name: 'speed-logged', seed: { ff_start: daysAgoIso(3), ff_log: {
      ['1|' + DAY1]: liftSess(true), ['1|' + DAY2]: pushSess(true), ['1|' + SPEED]: speedSess(true) } },
    focusChip: 3, expect: { speedday: true, resetExposed: true, plStartText: /Speed session done/ } },
  { name: 'deload-week', seed: { ff_start: daysAgoIso(35) },
    expect: { dayFocus: true, deloadBanner: true, heroWeek: /WEEK 6/ } },
  { name: 'fullweek-fresh', seed: { ff_start: daysAgoIso(3), ff_planview: 'week' },
    expect: { weekDays: 7, weekLogBtns: 5 } },
  { name: 'fullweek-logged', seed: { ff_start: daysAgoIso(3), ff_planview: 'week', ff_log: {
      ['1|' + DAY1]: liftSess(true), ['1|' + DAY2]: pushSess(true), ['1|' + SPEED]: speedSess(true) } },
    expect: { weekDays: 7, cleardayCount: 3 } },
];

/* ---------- in-page invariant sweep ---------- */
function sweep(expect) {
  const fails = [];
  const q = s => [...document.querySelectorAll(s)];
  const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  // 1. leaked placeholder text anywhere on the page
  const txt = document.body.innerText || '';
  for (const re of [/\bundefined\b/, /\bNaN\b/, /\[object Object\]/, /\{\{V\}\}/])
    if (re.test(txt)) fails.push('leaked text matches ' + re);
  // 2. warm-up folds never open by default
  if (q('#phaseDetail details.prelift[open]').length) fails.push('warm-up fold open by default');
  // 3. tap targets ≥ 44px tall. Hard-fail set = the controls DESIGN-CHANGES §60
  // standardized at min-height:44px, plus two that comfortably comply today.
  // KNOWN GAP (as of 2026-07-08): `.rest-check` renders 42px tall — it was never
  // part of the §60 fix. It is intentionally NOT in this hard-fail set; if a UI
  // pass bumps it to 44px, add '.rest-check' here in the same PR.
  for (const sel of ['.planview-seg button', '.ws-chip', '.logbtn', '.pl-start', '.sb-go']) {
    for (const el of q(sel)) {
      if (!vis(el)) continue;
      const h = el.getBoundingClientRect().height;
      if (h < 44) fails.push(`tap target ${sel} is ${Math.round(h)}px tall (< 44)`);
    }
  }
  // 4. no half-width log buttons
  for (const el of q('.logbtn')) {
    if (!vis(el)) continue;
    const foot = el.closest('.day-foot'); if (!foot) continue;
    const r = el.getBoundingClientRect().width / (foot.getBoundingClientRect().width || 1);
    if (r < 0.8) fails.push(`.logbtn width ratio ${r.toFixed(2)} (< 0.8)`);
  }
  // 5. every logged day in the DOM exposes a reset control
  const resets = q('[data-clearday], [data-clearworkout]').filter(vis).length;
  // 6. state-specific expectations
  const e = expect || {};
  const has = s => q(s).some(vis);
  if (e.startbar && !has('.startbar')) fails.push('expected .startbar (plan not started)');
  if (e.dayFocus && !has('.day-focus')) fails.push('expected featured .day-focus card');
  if (e.speedday && !has('.day-focus.speedday')) fails.push('expected featured speed-day card');
  if (e.ilogBox && !document.getElementById('ilogBox')) fails.push('expected #ilogBox (manual logging)');
  if (e.finishBar && !has('#finishBar')) fails.push('expected #finishBar');
  if (e.deloadBanner && !has('.deload-banner')) fails.push('expected .deload-banner');
  if (e.resetExposed && resets < 1) fails.push('logged day exposes no reset control');
  if (e.plStartText) {
    const t = (document.querySelector('.day-focus .pl-start') || {}).innerText || '';
    if (!new RegExp(e.plStartText).test(t)) fails.push(`player CTA "${t.replace(/\n/g, ' ').trim()}" !~ ${e.plStartText}`);
  }
  if (e.heroWeek) {
    const t = (document.querySelector('.lh-week') || {}).textContent || '';
    if (!new RegExp(e.heroWeek).test(t)) fails.push(`hero week "${t}" !~ ${e.heroWeek}`);
  }
  if (e.slRows != null && q('.day-focus .sl-row').length !== e.slRows)
    fails.push(`expected ${e.slRows} session-list rows, got ${q('.day-focus .sl-row').length}`);
  if (e.doneChips != null && q('.ws-chip.done').length !== e.doneChips)
    fails.push(`expected ${e.doneChips} done week-strip chips, got ${q('.ws-chip.done').length}`);
  if (e.weekDays != null && q('#phaseDetail .day').length !== e.weekDays)
    fails.push(`expected ${e.weekDays} week-view day cards, got ${q('#phaseDetail .day').length}`);
  if (e.weekLogBtns != null && q('.logbtn').length !== e.weekLogBtns)
    fails.push(`expected ${e.weekLogBtns} log buttons, got ${q('.logbtn').length}`);
  if (e.cleardayCount != null && q('[data-clearday]').length !== e.cleardayCount)
    fails.push(`expected ${e.cleardayCount} [data-clearday] resets, got ${q('[data-clearday]').length}`);
  return fails;
}

/* ---------- driver ---------- */
const ROOT = repoRoot();
const chromium = loadChromium();
const server = await startServer(ROOT);
const port = server.address().port;
const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });

let pass = 0, fail = 0;
const results = [];
for (const st of STATES) {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e));
    page.on('console', m => { if (m.type() === 'error' && !FILTER.test(m.text())) errs.push('console: ' + m.text()); });
    const kv = { ff_onboarded: true, fairwayfuel: baseProfile(), ff_theme: theme, ...st.seed };
    await page.addInitScript(obj => { for (const k of Object.keys(obj)) localStorage.setItem(k, JSON.stringify(obj[k])); }, kv);
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    await page.click('#mobileTabs button[data-view="plan"]');
    await page.waitForTimeout(250);
    if (st.focusChip != null) {
      await page.click(`.ws-chip >> nth=${st.focusChip}`);
      await page.waitForTimeout(250);
    }
    const fails = await page.evaluate(sweep, st.expect);
    fails.push(...errs);
    const label = `${st.name} [${theme}]`;
    if (fails.length) { fail++; results.push(`FAIL ${label}\n  - ` + fails.join('\n  - ')); }
    else { pass++; results.push(`ok   ${label}`); }
    await ctx.close();
  }
}
await browser.close();
server.close();
console.log(results.join('\n'));
console.log(`\naudit-train: ${pass}/${pass + fail} clean`);
process.exit(fail ? 1 : 0);
