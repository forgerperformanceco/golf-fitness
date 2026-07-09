#!/usr/bin/env node
/*
 * audit-scroll.mjs — Yardsmith scroll-preservation audit.
 *
 * Recreates the standing audit from DESIGN-CHANGES.md §66 (follow-up to §65,
 * where player steppers reset scroll to top): drive every in-place interaction
 * that triggers an innerHTML re-render and assert the scroll position survives
 * EXACTLY — on window-scrolled views and on overlays with their own scrollable
 * bodies. The 16 interaction points (§66's list):
 *   Home:    meal check-off in the timeline
 *   Fuel:    meal ✓ · "Show the numbers" toggle · day-rating chip
 *   Stats:   fold open AND fold close ([data-pftoggle] → full renderProgress)
 *   Train:   equipment preset chip (settings fold → renderPhase) ·
 *            speed-day Field/Gym seg
 *   Round:   holes chip · transport chip (→ renderGameDay)
 *   Account: goal-yards · frequency · workout-time · theme chips (→ renderAccount)
 *   Logger modal:  set check-off (re-renders #logBody, its own scroller)
 *   History sheet: delete a row deep in a 15-entry list (re-renders #swapBody
 *                  inside the .swap-card scroller; delete is two-tap armed)
 *
 * Clicks are dispatched with el.click() inside the page (the app uses delegated
 * listeners) so Playwright's auto-scroll actionability can't move the page
 * between the "record" and "compare" reads. Zero page errors is also asserted.
 *
 * Run:   node .claude/skills/yardsmith-validation-and-qa/scripts/audit-scroll.mjs
 * Env:   YS_ROOT=<repo root>  PW_CHROME=<chromium binary>  (both optional)
 * Exit:  0 = all interactions preserve scroll; 1 = failures.
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
  return undefined;
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
const FILTER = /net::ERR|Failed to load resource/i;

/* ---------- seeds: a lived-in account so every view is long enough to scroll ---------- */
function seeds() {
  const now = Date.now();
  const daysAgoIso = n => new Date(now - n * 864e5).toISOString();
  const isoDay = n => new Date(now - n * 864e5).toISOString().slice(0, 10);
  const sess = (names, finished) => {
    const s = { date: 'Jul 8, 2026', _ts: now, ex: names.map(n => ({ name: n, orig: n, target: '3 × 8',
      sets: [{ w: '135', r: '8', done: true }, { w: '135', r: '8', done: true }, { w: '135', r: '8', done: true }] })) };
    if (finished) s.finishedAt = 'Jul 8, 2026';
    return s;
  };
  const hist = [];
  for (let i = 0; i < 15; i++) {
    hist.push({ id: `Jun ${8 + i}, 2026 · Day 1 — Lower (Quads)`, ts: now - (20 - i) * 864e5,
      date: `Jun ${8 + i}, 2026`, day: 'Day 1 — Lower (Quads)', week: 1, sets: 9, volume: 12000 + i,
      note: '', ex: [{ name: 'Leg Press', target: '4 × 6', sets: [{ w: '270', r: '6' }] }] });
  }
  const body = [];
  for (let i = 10; i >= 0; i -= 2)
    body.push({ date: 'x', iso: isoDay(i), ts: now - i * 864e5, w: 185 + (10 - i) / 10, s: 78 + (10 - i) / 5, d: 240 + (10 - i) });
  return {
    ff_onboarded: true,
    fairwayfuel: { sex: 'male', goal: 'leanbulk', workout: 'morning', meals: 4, age: '34', weight: '185',
      heightFt: '5', heightIn: '11', activity: '1.55', freq: 5,
      equip: { bodyweight: true, dumbbells: true, barbell: true, bench: true, pullupbar: true, kettlebell: true,
        bands: true, medball: true, box: true, legpress: true, legext: true, legcurl: true, cable: true, latpulldown: true },
      view: 'dash' },
    ff_start: daysAgoIso(3),
    ff_log: { ['1|Day 1 — Lower (Quads)']: sess(['Leg Press', 'Romanian Deadlift', 'Walking Lunge'], true),
              ['1|Day 2 — Upper (Push)']: sess(['Barbell Bench Press', 'Incline DB Press'], true) },
    ff_history: hist,
    ff_body: body,
    ff_goalyds: 15,
    ff_gameday: { teeTime: '09:00', holes: 18, transport: 'walk' },
    ff_fuel: { [isoDay(0)]: { m: { 0: 'a' }, n: 4, ts: now } },   // one meal checked, no rating yet
  };
}

/* ---------- interaction table ----------
 * view:   tab to open (data-view) or 'gameday' (via the [data-goview] router)
 * sel:    element to click (first visible match)
 * pre:    optional in-page setup (runs before the scroll is recorded)
 * node:   scroll container — 'window' or a CSS selector (overlay scrollers)
 * clicks: number of clicks (history delete is two-tap armed)               */
const INTERACTIONS = [
  { name: 'home-meal-check', view: 'dash', sel: '#dashBody [data-fuelmeal]', node: 'window' },
  { name: 'fuel-meal-check', view: 'calc', sel: '#view-calc .fchk-b[data-fuelval="a"]:not(.on)', node: 'window' },
  { name: 'fuel-show-numbers', view: 'calc', sel: '.fuel-numbtn[data-fuelnums]', node: 'window' },
  { name: 'fuel-day-rating', view: 'calc', sel: '.frate-chip[data-fuelrate="on"]', node: 'window' },
  { name: 'stats-fold-open', view: 'progress', sel: '.pf-head[data-pftoggle]', node: 'window' },
  { name: 'stats-fold-close', view: 'progress', sel: '.pf-head[data-pftoggle]', node: 'window', clicks: 2 },
  { name: 'train-equip-preset', view: 'plan', node: 'window', sel: '[data-preset="home"]',
    pre: () => { const f = document.getElementById('setFold'); if (f) f.open = true; } },
  { name: 'train-speed-seg', view: 'plan', node: 'window', sel: '[data-speedmode="field"]',
    pre: () => { localStorage.setItem('ff_planview', '"week"'); window.dispatchEvent(new Event('ff-external-write'));
                 document.querySelector('[data-planview="week"]')?.click(); } },
  { name: 'round-holes', view: 'gameday', sel: '[data-gdholes="9"]', node: 'window' },
  { name: 'round-transport', view: 'gameday', sel: '[data-gdtransport="ride"]', node: 'window' },
  { name: 'acct-goal-yards', view: 'account', sel: '#acctGoalChips [data-gy="20"]', node: 'window' },
  { name: 'acct-frequency', view: 'account', sel: '#acctFreq [data-af="4"]', node: 'window' },
  { name: 'acct-workout-time', view: 'account', sel: '#acctWk [data-aw="evening"]', node: 'window' },
  { name: 'acct-theme', view: 'account', sel: '#acctTheme [data-th="dark"]', node: 'window' },
  { name: 'logger-set-check', view: 'plan', sel: '#logBody .donebtn', node: '#logBody',
    pre: () => { document.querySelector('[data-planview="week"]')?.click(); },
    pre2: () => { document.querySelector('[data-logday]')?.click(); } },
  { name: 'history-delete-deep', view: 'plan', sel: '.hist-row:nth-of-type(10) .hist-del', node: '.swap-card', clicks: 2,
    pre2: () => { document.querySelector('[data-gohistory]')?.click(); } },
];

const ROOT = repoRoot();
const chromium = loadChromium();
const server = await startServer(ROOT);
const port = server.address().port;
const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });

let pass = 0, fail = 0;
const results = [];
for (const it of INTERACTIONS) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e));
  page.on('console', m => { if (m.type() === 'error' && !FILTER.test(m.text())) errs.push('console: ' + m.text()); });
  await page.addInitScript(obj => { for (const k of Object.keys(obj)) localStorage.setItem(k, JSON.stringify(obj[k])); }, seeds());
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });

  // navigate: real tab click, or the app's own [data-goview] router for Round
  if (it.view === 'gameday') {
    await page.evaluate(() => { const b = document.createElement('button'); b.setAttribute('data-goview', 'gameday');
      document.body.appendChild(b); b.click(); b.remove(); });
  } else {
    await page.click(`#mobileTabs button[data-view="${it.view}"]`);
  }
  await page.waitForTimeout(250);
  if (it.pre) { await page.evaluate(it.pre); await page.waitForTimeout(250); }
  if (it.pre2) { await page.evaluate(it.pre2); await page.waitForTimeout(250); }

  const out = await page.evaluate(async ({ sel, node, clicks }) => {
    const raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const els = [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    const el = els[0];
    if (!el) return { err: 'target not found: ' + sel };
    let before, after;
    if (node === 'window') {
      // Park the target mid-viewport so the recorded offset is non-zero, but
      // stay ≥250px above max-scroll: a re-render that shrinks the page a few
      // px would otherwise CLAMP scrollY and read as a false failure. (What we
      // test is "no reset / no jump", not "document height is constant".)
      const r = el.getBoundingClientRect();
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.max(1, Math.min(r.top + window.scrollY - 300, maxY - 250)));
      await raf();
      before = window.scrollY;
      for (let i = 0; i < (clicks || 1); i++) { el.click(); await raf(); await new Promise(r2 => setTimeout(r2, 150)); }
      after = window.scrollY;
    } else {
      const box = document.querySelector(node);
      if (!box) return { err: 'scroll node not found: ' + node };
      box.scrollTop = Math.max(1, Math.min(box.scrollHeight - box.clientHeight - 100, 200));
      await raf();
      before = box.scrollTop;
      for (let i = 0; i < (clicks || 1); i++) { el.click(); await raf(); await new Promise(r2 => setTimeout(r2, 150)); }
      after = box.scrollTop;
    }
    return { before, after };
  }, { sel: it.sel, node: it.node, clicks: it.clicks });

  let msg;
  if (out.err) { fail++; msg = `FAIL ${it.name}: ${out.err}`; }
  else if (out.before !== out.after) { fail++; msg = `FAIL ${it.name}: scroll ${out.before} → ${out.after}`; }
  else if (errs.length) { fail++; msg = `FAIL ${it.name}: page errors\n  - ` + errs.join('\n  - '); }
  else if (out.before === 0) { fail++; msg = `FAIL ${it.name}: recorded scroll was 0 — not a meaningful check`; }
  else { pass++; msg = `ok   ${it.name} (scroll ${out.before} kept)`; }
  results.push(msg);
  await ctx.close();
}
await browser.close();
server.close();
console.log(results.join('\n'));
console.log(`\naudit-scroll: ${pass}/${pass + fail} preserve scroll`);
process.exit(fail ? 1 : 0);
