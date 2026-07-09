---
name: yardsmith-playwright-harness
description: >
  HOW to drive the real Yardsmith app headlessly with Playwright — the verified
  serve+launch recipe, the seed library, and every harness gotcha that has
  burned real time. Load this before writing ANY browser test, audit, smoke
  check, or screenshot script for this repo; when a test mysteriously sees no
  seeded data, a fresh user, stale numbers, or missing set rows; when you need
  the preinstalled Chromium/Playwright paths; or when asked to "verify in the
  app" / "run it headless" / "screenshot it". Owns HOW to test. WHAT to assert
  (thresholds, audit invariants, the Verified-paragraph convention) lives in
  yardsmith-validation-and-qa.
---

# Yardsmith Playwright harness — drive the real app headlessly

## When NOT to use this skill

- **What to assert** (44px tap targets, type band, zero-leak strings, full-battery
  discipline, audit packs) → `yardsmith-validation-and-qa`. This skill gets you a
  booted app and reliable seeds; that one tells you what "green" means.
- **Build mechanics** ({{V}} hashing, watch mode, dark theme regen) →
  `yardsmith-build-and-env`. One rule leaks in here because it gates everything:
  **tests drive the BUILT output at the repo root — rebuild (`node scripts/build.mjs`)
  before testing if you touched `src/`.** The smoke script deliberately never
  rebuilds: verifying the committed output as-is is its job.
- **Serving/deploying for humans** (Pages, domains, post-deploy checks) →
  `yardsmith-run-and-deploy`.
- **What the localStorage keys mean** (shapes, sync/merge) → `yardsmith-data-and-sync`.
  Seeds below embed just enough shape to work; don't invent new keys from here.
- **Non-browser proof patterns** (vm-sandbox sync tests, unit-case math checks) →
  `yardsmith-proof-and-analysis-toolkit`.

## Environment facts (verified 2026-07-08 — re-verify, they drift)

| Fact | Value today | Re-verify with |
|---|---|---|
| Node | v22.22.2 | `node --version` |
| Playwright (global) | 1.56.1 at `/opt/node22/lib/node_modules/playwright` | `node -e "console.log(require('/opt/node22/lib/node_modules/playwright/package.json').version)"` |
| Repo `node_modules` | **NOT installed** (devDep `playwright-core ^1.61.1` exists but `npm ci` is rarely run) | `ls node_modules 2>/dev/null \|\| echo absent` |
| Chromium | `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (Chromium 141) | `ls /opt/pw-browsers/` |
| Chromium stable symlink | `/opt/pw-browsers/chromium` → the versioned binary | `readlink /opt/pw-browsers/chromium` |
| Committed build hash | `FF_BUILD="04f691fff1"` | `grep -o 'FF_BUILD="[^"]*"' index.html` |

The versioned chromium dir (`chromium-1194`) **changes when the box's Playwright
updates** — never hardcode it in a new script; use the symlink or glob for
`chromium-*` (the shipped `serve.mjs` does both). `--no-sandbox` is required in
this container. Headless is the default `chromium.launch()` mode — don't pass
`headless: true` explicitly, it's already true.

## The shipped scripts (all run green 2026-07-08)

Live in this skill's `scripts/` dir. They locate the repo root relative to
themselves (`.claude/skills/yardsmith-playwright-harness/scripts/` → four dirs up);
override with `YARDSMITH_ROOT=/path` if you copy them elsewhere.

### `serve.mjs` — server + resolvers + one-call launcher

```js
import { startServer, resolvePlaywright, resolveChromiumExe, launchApp } from './serve.mjs';

// piece by piece:
const srv = await startServer();               // static server over repo root, random port
const { chromium } = resolvePlaywright();      // local node_modules → global → bare require
const browser = await chromium.launch({ executablePath: resolveChromiumExe(), args: ['--no-sandbox'] });

// or one call — 390×844, reducedMotion:'reduce', pageerror/console collectors, networkidle goto:
const app = await launchApp({ seed: seedActive, theme: 'dark' });
// app = { url, page, ctx, browser, errors, consoleErrors, close() }
```

Standalone: `node serve.mjs 8471` serves the repo root for manual poking.

### `seeds.mjs` — self-contained localStorage seeds

Exports `seedFresh`, `seedOnboarded`, `seedActive` (+ a `SEEDS` registry).
Each is a **single self-contained function** legal for `page.addInitScript`
(see gotcha #1 — this is a hard serialization constraint, not style).
Parametrize only via the second argument:

```js
await page.addInitScript(seedOnboarded, { goal: 'cut', freq: 4 });   // verified working
const app = await launchApp({ seed: seedOnboarded, seedArg: { goal: 'cut' } });  // same, via helper
```

| Seed | State it produces | What it unlocks |
|---|---|---|
| `seedFresh` | empty storage (defensive `clear()`) | onboarding wizard `#obRoot` pops |
| `seedOnboarded` | profile + `ff_onboarded`, plan not started | Home "Start your 20-week plan" CTA |
| `seedActive` | plan started 10 days ago (week 2), 2 finished sessions in `ff_log`+`ff_history`, `ff_body` weight+7-iron rows (iso+ts identity), 1 `ff_speedtest` | Stats trends past the `hasAny` gate; Octane scores; Train week strip; player start buttons |

### `smoke.mjs` — the committed-output boot check

```
node .claude/skills/yardsmith-playwright-harness/scripts/smoke.mjs           # all 3 states
node .claude/skills/yardsmith-playwright-harness/scripts/smoke.mjs active    # one state
```

Per state it asserts: zero pageerrors; zero same-origin console errors;
`window.FF_BUILD` matches `/^[0-9a-f]{10}$/`; no unreplaced `{{V}}` in the served
document; both tab bars have 5 buttons; wizard shown (fresh) / suppressed
(seeded); Home CTA (onboarded); Stats "Clubhead speed" card rendered with no
leaked `undefined`/`NaN`/`[object Object]` (active). Exit 0 = green.

Actual output recorded 2026-07-08 (abridged — 25/25 PASS):

```
serving /home/user/golf-fitness at http://127.0.0.1:35461/
[fresh]      7×PASS   [onboarded]  8×PASS   [active]  9×PASS
SMOKE GREEN
```

`smoke.mjs` **verifies the committed root files as-is** — if it fails after a
`src/` edit, the likely cause is a missing rebuild, which is exactly the signal
you want (CI has no build step; committed outputs are what ships).

## The complete recipe, inline (when you don't want the helpers)

Everything below is the verified minimum; every non-obvious line is a gotcha
with a story (next section).

```js
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright'); // global — repo has no node_modules

const ROOT = '/home/user/golf-fitness';                 // serve the BUILT output = repo root
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.png':'image/png', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json',
  '.woff2':'font/woff2', '.json':'application/json' };
const server = http.createServer((req,res)=>{
  let p = decodeURIComponent(new URL(req.url,'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, {'content-type': MIME[path.extname(f)] || 'application/octet-stream'});
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, r));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',          // stable symlink — survives rev bumps
  args: ['--no-sandbox'] });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },                // the house phone frame
  reducedMotion: 'reduce' });                           // kill count-up races (gotcha #5)
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e)));

await page.addInitScript(() => {                        // SELF-CONTAINED — no outside refs (gotcha #1)
  localStorage.setItem('fairwayfuel', JSON.stringify({  // literal "fairwayfuel" (gotcha #2)
    sex:'male', goal:'leanbulk',                        // real GOALS key (gotcha #2)
    workout:'morning', meals:null, age:'34', weight:'185',
    heightFt:'5', heightIn:'11', activity:'1.55', freq:5,
    equip:{ bodyweight:true, dumbbell:true, barbell:true }, view:'dash' }));
  localStorage.setItem('ff_onboarded', 'true');         // JSON, even booleans (gotcha #10)
});

await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle' });
// ... drive + assert; ALWAYS finish with:
if (errs.length) throw new Error('pageerrors: ' + errs.join(' | '));
await browser.close(); server.close();
```

`networkidle` is safe offline: a signed-out boot fetches **nothing external** —
`cloud-sync.js` lazy-loads the Supabase SDK only on sign-in/auth-redirect
(cloud-sync.js:45-64), so the sandbox sees zero CDN traffic and zero CDN noise.

## The gotcha table — every one has a story

| # | Gotcha | The story / evidence | The rule |
|---|---|---|---|
| 1 | **Seeds must be self-contained.** `addInitScript(fn)` serializes ONLY the outer function's source; a closure reference or call to another seed helper throws inside the page **before the app loads** and you silently get NO seed. | DESIGN-CHANGES.md §48 (line 1017): burned an hour — the "bug" in a capture was a genuinely fresh user with the onboarding wizard painted at the top. | One function, zero outside references. Pass data only via `addInitScript(fn, arg)`. When a test sees a "fresh user" you didn't expect, suspect the seed first. |
| 2 | **Seed the literal `"fairwayfuel"` profile key, and `goal` must be a real `GOALS` key**: `leanbulk` \| `bulk` \| `maintain` \| `cut`. | Rebrand kept the old key on purpose (CLAUDE.md invariant). §42 (line 851): `'leanbulk', not 'lean'` — a fake goal key half-breaks macro rendering. `GOALS` defined at 025-macro-calculator.js:8. | Copy the profile shape from `seeds.mjs` (mirrors `persist()`, 020-persistence…js:5-12). |
| 3 | **Stats trend cards hide behind a `hasAny` gate** — no logged session AND no parseable `ff_body` speed/weight row ⇒ locked "Unlocks as you log" strip, and your card assertions fail on a perfectly healthy app. | §41 (line 826) "Gotcha re-learned". Code: 085-progress-stats-view.js:257 `hasAny = sess>0 || spF.length>0 || wtF.length>0`. | Use `seedActive`, or ensure at least one `ff_body` row / `ff_log` session before asserting trends. |
| 4 | **Post-boot `localStorage` writes are invisible until you dispatch `ff-external-write`.** `lsGet` memoizes parsed values; direct writes from `page.evaluate` bypass `lsSet`, so re-renders serve the stale cache ("the cache working as designed"). | §64 (line 1249). Code: 040-workout-logger.js:28. **Re-demonstrated 2026-07-08**: pushed a 90 mph `ff_body` row post-boot → Stats still showed 80 mph; after `window.dispatchEvent(new Event('ff-external-write'))` → 90 mph. | Prefer `addInitScript` (runs before the app). If you must write after boot: `localStorage.setItem(...); window.dispatchEvent(new Event('ff-external-write'));` then trigger a re-render (e.g. tab away and back). |
| 5 | **Count-up animations race number assertions.** | §12 (line 339): "all Playwright suites now set `reducedMotion: 'reduce'` so number assertions can't race count-ups." | `reducedMotion:'reduce'` on every context. Only drop it when the animation itself is under test. |
| 6 | **Player set rows exist only on LIFT stations.** Station 1 is warm-up (`.pl-item` buttons), station 2 the primer; `.pl-set` rows and the long-press hint appear from the first lift onward. | §45 (line 949): "player sets/hint only exist on LIFT stations — advance past the warm-up before asserting." Code: 070…js:118-176. **Re-verified**: 0 `.pl-set` on warm-up; 4 after two `#plNext` clicks ("LIFT 1 OF 7"). | Click `#plNext` past warm-up (and primer, on lift days) before asserting sets. |
| 7 | **Test the surface the button actually lives on.** The speed-day reset bug survived multiple "green" rounds because tests exercised the Today path while the button lived in `logFoot` (Full-week / non-featured days) — green tests, real bug. | §60 (line 1391) — the written post-mortem; user: "you had me feeling crazy." The institutional fix is the state-matrix audit (owned by `yardsmith-validation-and-qa`). | Before asserting a fix, ask: which render path builds this element? Drive THAT path (and ideally every state that renders it). |
| 8 | **All `.view` divs stay in the DOM** — only `.active` is visible. A page-wide selector happily matches a hidden duplicate and `click()` times out on "element is not visible". | Discovered while verifying this skill: `[data-startplayer]` matched the Home "Next up" card (hidden) instead of the Train button; the click hung 30 s. | Scope selectors to the active view: `#view-plan [data-startplayer]`, `#view-progress …`, etc. View ids: `#view-dash #view-calc #view-plan #view-progress #view-account #view-gameday`. |
| 9 | **Theme is forceable via `html[data-theme]`**, seeded or live. Pre-paint script reads `ff_theme` (index.template.html:8); the Account control sets the attribute (080…js:226-232). | Standing practice since the Appearance setting shipped (DESIGN-CHANGES.md §4, line 149); light+dark runs are the house norm. | Seed `localStorage.setItem('ff_theme', JSON.stringify('dark'))` (or `launchApp({ theme:'dark' })`), or flip live: `document.documentElement.setAttribute('data-theme','dark')` + re-render. `ff_theme` is device-local — never synced. |
| 10 | **Every stored value is JSON.** `lsGet` does `JSON.parse`; a bare `localStorage.setItem('ff_onboarded', true)` stores `"true"`… which parses fine, but bare strings like `'dark'` do NOT (parse throws → treated as null). | Code: 040-workout-logger.js:15. | `JSON.stringify` everything you seed, including strings and booleans. |
| 11 | **You are testing the BUILT output.** The server serves the repo root; editing `src/` changes nothing the browser sees until `node scripts/build.mjs` runs. | CLAUDE.md; the committed outputs are what ships (no CI build). | Rebuild before testing a `src/` change. `smoke.mjs` never rebuilds — by design, it certifies the committed files. |
| 12 | **A "fresh context" is the real fresh-user state.** `FF_FRESH` (010…js:7-12) snapshots emptiness at load; any seeded key (even `ff_start` alone) makes the app grandfather the user (`ff_onboarded` auto-set, no wizard — 090…js:18). | Code verified. | To test onboarding, seed NOTHING. To suppress the wizard, seeding the profile is sufficient — but set `ff_onboarded` explicitly anyway (it's what production users have). |

## Selector cheat sheet (verified against src/index.template.html + renders)

| Target | Selector |
|---|---|
| Top tabs / mobile tab bar | `#tabs button[data-view]` / `#mobileTabs button[data-view]` — views `dash calc plan progress account` |
| Switch tab | `page.click('#mobileTabs button[data-view="progress"]')` (Stats), `"plan"` (Train), `"calc"` (Fuel), `"account"` (You) |
| Onboarding wizard | `#obRoot` (count 1 = shown) |
| Stats body | `#progressBody` |
| Train day detail | `#phaseDetail`; start player: `#view-plan [data-startplayer]` |
| Player | `.pl-skick` (station kicker), `.pl-set` (lift set rows), `#plNext` (advance), `.pl-item` (warm-up checklist) |
| Fuel results | `#results`; goal buttons `#goals .goal.active` |
| Build stamp | `await page.evaluate(() => window.FF_BUILD)` |

## Writing a NEW test for a feature — the pattern

1. **Rebuild if you changed src/**: `node scripts/build.mjs` (CSS change: dark
   theme regen first — see `yardsmith-build-and-env`).
2. **Pick the seed state(s)** the feature renders in — and per gotcha #7, list
   every render path that builds your element (Today vs Full-week, fresh vs
   logged, featured vs non-featured) and drive each.
3. **Write the script in the session scratchpad** (historical convention:
   `test-<feature>.mjs`; standing audits are `audit-*.mjs`). Import the shipped
   helpers rather than re-pasting the server.
4. **Drive the real UI** — clicks on real selectors, not `page.evaluate` calls
   into app internals (the §60 lesson: internals can be right while the surface
   is wrong).
5. **Assert behavior + hygiene**: your feature checks, then always
   `errors.length === 0` and a leak scan (`undefined|NaN|\[object Object\]|\{\{V\}\}`)
   on the touched view. Thresholds and the full invariant list:
   `yardsmith-validation-and-qa`.
6. **Run light AND dark** when the change has any visual surface; screenshot
   390×844 both and eyeball them.
7. **Record the result** as a Verified paragraph in DESIGN-CHANGES.md per the
   conventions in `yardsmith-validation-and-qa` / `yardsmith-docs-and-writing` —
   scratchpad scripts die with the session; the prose record is what survives.

Skeleton (verified pattern — this exact flow ran green during authoring):

```js
// scratchpad/test-myfeature.mjs
import { launchApp } from '/home/user/golf-fitness/.claude/skills/yardsmith-playwright-harness/scripts/serve.mjs';
import { seedActive } from '/home/user/golf-fitness/.claude/skills/yardsmith-playwright-harness/scripts/seeds.mjs';

let fails = 0;
const ok = (c, l) => { console.log((c ? 'PASS ' : 'FAIL ') + l); if (!c) fails++; };

for (const theme of ['light', 'dark']) {
  const app = await launchApp({ seed: seedActive, theme });
  const { page, errors } = app;

  await page.click('#mobileTabs button[data-view="plan"]');
  await page.waitForTimeout(200);                      // renders are sync; margin for view swap
  await page.locator('#view-plan [data-startplayer]').first().click();   // scoped! (gotcha #8)
  await page.waitForTimeout(200);
  await page.click('#plNext'); await page.click('#plNext');              // past warm-up + primer (gotcha #6)

  ok((await page.locator('.pl-set').count()) > 0, `${theme}: set rows on lift station`);
  const text = await page.locator('#playerRoot').innerText();   // player root, 070…js:265
  ok(!/undefined|NaN|\[object Object\]|\{\{V\}\}/.test(text), `${theme}: no leaked junk`);
  await page.screenshot({ path: `myfeature-${theme}.png` });
  ok(errors.length === 0, `${theme}: zero pageerrors (${errors[0] || ''})`);
  await app.close();
}
process.exit(fails ? 1 : 0);
```

Post-boot data injection (when a seed can't express it, e.g. "a speed entry
arrives while the app is open"):

```js
await page.evaluate(() => {
  const b = JSON.parse(localStorage.getItem('ff_body')) || [];
  b.push({ date: 'Jul 8, 2026', iso: '2026-07-08', ts: Date.now(), s: '82' });
  localStorage.setItem('ff_body', JSON.stringify(b));
  window.dispatchEvent(new Event('ff-external-write'));   // MANDATORY — gotcha #4
});
// then force a re-render: switch tabs away and back
```

## What ran green during authoring (2026-07-08, HEAD f21930a, build 04f691fff1)

- `node smoke.mjs` — all 3 states, 25/25 PASS, `SMOKE GREEN`, exit 0.
- `node smoke.mjs active` — green.
- `launchApp({ seed: seedActive, theme:'dark' })` — `FF_BUILD 04f691fff1`,
  `data-theme dark`, 0 pageerrors.
- Seed-arg channel: `launchApp({ seed: seedOnboarded, seedArg:{goal:'cut'} })` →
  stored goal `cut`, Fuel goal button active = `cut`.
- Gotcha #4 demo: stale-then-fresh exactly as documented above.
- Gotcha #6/#8 demo: hidden `[data-startplayer]` timeout reproduced, scoped
  selector fixed it; 0 set rows on warm-up, 4 on "LIFT 1 OF 7".
- `node serve.mjs 8471` — served index.html, `styles.css` as `text/css`,
  404 on traversal attempt.

## Provenance and maintenance

- Facts verified 2026-07-08 against HEAD `f21930a`; build hash `04f691fff1`.
- Environment drift checks: `node --version` ·
  `node -e "console.log(require('/opt/node22/lib/node_modules/playwright/package.json').version)"` ·
  `ls /opt/pw-browsers/` · `readlink /opt/pw-browsers/chromium` ·
  `ls /home/user/golf-fitness/node_modules 2>/dev/null || echo absent`.
- Code-anchor drift checks: `grep -n hasAny src/js/app/085-progress-stats-view.js`
  (gate, :257 today) · `grep -n ff-external-write src/js/app/040-workout-logger.js`
  (:28) · `grep -n 'var GOALS' src/js/app/025-macro-calculator.js` (:8) ·
  `grep -n obRoot src/js/app/090-first-run-onboarding.js` (:40).
- Seed shapes mirror `persist()` (020-persistence…js), `saveSession` (040…js:145),
  `pushHistory` (050…js:225-238), `logBodyEntry` (070…js:759-773). If those
  writers change shape, update `seeds.mjs` in the same change.
- Re-run the pack after any harness-relevant change:
  `node .claude/skills/yardsmith-playwright-harness/scripts/smoke.mjs` (must exit 0).
- **Known caveat**: a push touching these `.mjs` scripts triggers a full Pages
  redeploy (deploy.yml's `paths-ignore` covers `**.md` but not `.claude/**`
  non-md files) — harmless, the redeploy publishes unchanged content. The
  scripts themselves are NOT published: the rsync deny-list excludes any dir
  named `scripts` and any `*.md` at any depth, so everything this skill ships
  stays off yardsmith.golf. Full publication semantics are owned by
  `yardsmith-change-control` §1 — check there before placing any non-md file
  under `.claude/` outside a `scripts/` dir (that WOULD publish).
- The historical suites named in DESIGN-CHANGES.md (`test-sync.mjs`,
  `audit-train.mjs`, …) were never committed and die with their sessions; this
  skill's scripts are recreated ground truth, not recoveries. To resurrect an
  old suite, work from its documented assertions in DESIGN-CHANGES.md.
