#!/usr/bin/env node
/*
 * audit-type.mjs — Yardsmith rendered-type audit (legibility floor + one scale).
 *
 * Recreates the standing audit from DESIGN-CHANGES.md §67 ("Type pass"). Walks
 * every element that directly renders visible text across the 6 views (Home,
 * Fuel, Train, Stats, Account, Round) plus the Workout Player, on a seeded
 * lived-in account, and asserts the §67 invariants:
 *   1. HARD FLOOR   — no rendered text below 10.5px.
 *   2. WORD FLOOR   — words never render below 11px. Text at [10.5, 11) is
 *      allowed only for the numeric/badge micro-labels §67 gave a 10.5px
 *      floor: week-strip dates (.ws-date), the swap badge (.swap-badge),
 *      bar-chart / chart axis numbers, option tags, and the "YOU" pill.
 *      Enforced as an explicit selector allowlist (see MICRO_OK below).
 *   3. BAND         — every rendered size inside [11px, 13.5px] is EXACTLY one
 *      of 11 / 12 / 13 / 13.5 (±0.05px for float rounding). Sizes above 13.5
 *      are unconstrained (that's the display/heading range).
 *
 * DEBUG=1 prints the full size histogram with sample text per size — use that
 * when a failure needs locating, or when auditing a new screen.
 *
 * Run:   node .claude/skills/yardsmith-validation-and-qa/scripts/audit-type.mjs
 * Env:   YS_ROOT / PW_CHROME / DEBUG   (all optional)
 * Exit:  0 = clean; 1 = violations (each printed with a CSS-ish locator).
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

/* ---------- seeds: lived-in account so all surfaces render real content ---------- */
function seeds() {
  const now = Date.now();
  const daysAgoIso = n => new Date(now - n * 864e5).toISOString();
  const isoDay = n => new Date(now - n * 864e5).toISOString().slice(0, 10);
  const sess = names => ({ date: 'Jul 8, 2026', _ts: now, finishedAt: 'Jul 8, 2026',
    ex: names.map(n => ({ name: n, orig: n, target: '3 × 8',
      sets: [{ w: '135', r: '8', done: true }, { w: '135', r: '8', done: true }, { w: '135', r: '8', done: true }] })) });
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
    ff_log: { ['1|Day 1 — Lower (Quads)']: sess(['Leg Press', 'Romanian Deadlift', 'Walking Lunge']),
              ['1|Day 2 — Upper (Push)']: sess(['Barbell Bench Press', 'Incline DB Press']) },
    ff_history: [{ id: 'Jul 6, 2026 · Day 1 — Lower (Quads)', ts: now - 2 * 864e5, date: 'Jul 6, 2026',
      day: 'Day 1 — Lower (Quads)', week: 1, sets: 9, volume: 12000, note: '',
      ex: [{ name: 'Leg Press', target: '4 × 6', sets: [{ w: '270', r: '6' }] }] }],
    ff_body: body,
    ff_goalyds: 15,
    ff_gameday: { teeTime: '09:00', holes: 18, transport: 'walk' },
    ff_fuel: { [isoDay(0)]: { m: { 0: 'a' }, n: 4, ts: now } },
    ff_swaps: { 'Leg Extension': 'Sissy Squat' },     // renders a .swap-badge (10.5px micro-label)
  };
}

/* ---------- the §67 micro-label allowlist (10.5px permitted) ----------
 * Anything at [10.5, 11) whose element does NOT match one of these fails. */
const MICRO_OK = [
  '.ws-date',            // week-strip dates ("Mon 13") — §67: 8.5 → 10.5
  '.swap-badge',         // "⇄ your swap" badge — §67: 9 → 10.5
  '.pc-ax', '.pcx',      // chart axis / bar-chart numbers
  '.bar-num', '.wb-num', // bar-chart numbers (week bars)
  '.you-pill', '.lb-you',// "YOU" pill (leaderboard)
  '.opt-tag', '.food-tag'// option tags
];

/* ---------- in-page collector ---------- */
function collect() {
  const out = [];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE', 'META', 'LINK']);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = (n.textContent || '').trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el || SKIP.has(el.tagName)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;            // display:none / collapsed
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const size = parseFloat(cs.fontSize);
    let loc = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).join('.') : '');
    out.push({ size: Math.round(size * 100) / 100, text: t.slice(0, 40), loc,
      matchMicro: null });
  }
  return out;
}

/* ---------- driver ---------- */
const ROOT = repoRoot();
const chromium = loadChromium();
const server = await startServer(ROOT);
const port = server.address().port;
const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e));
page.on('console', m => { if (m.type() === 'error' && !FILTER.test(m.text())) errs.push('console: ' + m.text()); });
await page.addInitScript(obj => { for (const k of Object.keys(obj)) localStorage.setItem(k, JSON.stringify(obj[k])); }, seeds());
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });

const SURFACES = [
  { name: 'home', go: async () => page.click('#mobileTabs button[data-view="dash"]') },
  { name: 'fuel', go: async () => page.click('#mobileTabs button[data-view="calc"]') },
  { name: 'train', go: async () => page.click('#mobileTabs button[data-view="plan"]') },
  { name: 'stats', go: async () => page.click('#mobileTabs button[data-view="progress"]') },
  { name: 'account', go: async () => page.click('#mobileTabs button[data-view="account"]') },
  { name: 'round', go: async () => page.evaluate(() => { const b = document.createElement('button');
      b.setAttribute('data-goview', 'gameday'); document.body.appendChild(b); b.click(); b.remove(); }) },
  { name: 'player', go: async () => { await page.click('#mobileTabs button[data-view="plan"]');
      await page.waitForTimeout(250);
      await page.evaluate(() => document.querySelector('.day-focus .pl-start')?.click()); } },
];

const fails = [];
const histogram = new Map();  // size → { count, samples:Set }
for (const s of SURFACES) {
  await s.go();
  await page.waitForTimeout(300);
  const rows = await page.evaluate(collect);
  const micro = await page.evaluate(sels =>
    [...document.querySelectorAll(sels.join(','))].length, MICRO_OK); // sanity: selectors resolve
  for (const row of rows) {
    const h = histogram.get(row.size) || { count: 0, samples: new Set() };
    h.count++; if (h.samples.size < 4) h.samples.add(`${s.name}:${row.loc} "${row.text}"`);
    histogram.set(row.size, h);
    const inMicroList = MICRO_OK.some(sel => row.loc.includes(sel.slice(1)));
    if (row.size < 10.45) fails.push(`${s.name}: ${row.size}px < 10.5 hard floor — ${row.loc} "${row.text}"`);
    else if (row.size < 10.95 && !inMicroList)
      fails.push(`${s.name}: ${row.size}px word below 11px floor (not an allowed micro-label) — ${row.loc} "${row.text}"`);
    else if (row.size >= 10.95 && row.size <= 13.55) {
      const ok = [11, 12, 13, 13.5].some(v => Math.abs(row.size - v) <= 0.05);
      if (!ok) fails.push(`${s.name}: ${row.size}px off the 11/12/13/13.5 band — ${row.loc} "${row.text}"`);
    }
  }
  void micro;
}
fails.push(...errs);

if (process.env.DEBUG) {
  for (const [size, h] of [...histogram.entries()].sort((a, b) => a[0] - b[0]))
    console.log(`${size}px × ${h.count}\n   ` + [...h.samples].join('\n   '));
}
await browser.close();
server.close();

const sizes = [...histogram.keys()].sort((a, b) => a - b);
console.log('rendered sizes:', sizes.join(', '));
if (fails.length) {
  const uniq = [...new Set(fails)];
  console.log(uniq.slice(0, 40).join('\n'));
  console.log(`\naudit-type: FAIL (${uniq.length} violations across ${SURFACES.length} surfaces)`);
  process.exit(1);
}
console.log(`\naudit-type: clean — floor and band hold across ${SURFACES.length} surfaces (band ${sizes.filter(s => s >= 10.95 && s <= 13.55).join('/')})`);
process.exit(0);
