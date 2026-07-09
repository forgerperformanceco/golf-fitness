---
name: yardsmith-architecture-contract
description: >
  The Yardsmith code architecture contract. Load BEFORE writing or moving any
  code in src/js/: the IIFE concatenation contract (what hoists across modules
  and what doesn't), the full module map and cross-module symbol map, the
  render model (setView router, innerHTML + delegated listeners, explicit
  re-renders, scroll preservation), the service-worker caching strategy, where
  the Octane engine and wave-periodization pipeline live, the 14 load-bearing
  invariants, and the known weak points. Triggers: "where does X live",
  "add a module", "ReferenceError / undefined function at boot", "why is my
  function not visible", "re-render loses state/scroll", "stale app / cache" /
  "service worker" (mechanism reference — for a live device seeing an old
  version load yardsmith-debugging-playbook first), "which file computes
  Octane / wave targets", refactoring, or reviewing a diff that touches src/js/.
---

# Yardsmith architecture contract

Yardsmith (yardsmith.golf) is a vanilla-JS golf-fitness PWA: no framework, no
virtual DOM, no runtime dependencies. The entire app is `src/js/app/*.js`
concatenated into ONE minified IIFE (`app.js`), plus `src/js/global/*.js`
appended after it. This file is the contract every code change must obey.
Everything below is verified against the repo as of 2026-07-08 (HEAD
`f21930a`, build hash `04f691fff1`).

**When NOT to use this skill.** Building/environment mechanics (`{{V}}`
hashing details, manual `?v=` pins, dark-theme generation, watch mode) →
`yardsmith-build-and-env`. localStorage key shapes, lsGet/lsSet contract
details, sync/merge/tombstones → `yardsmith-data-and-sync`. The MATH inside
Octane, the wave, macros, e1RM → `golf-fitness-domain-reference`. Testing the
architecture → `yardsmith-playwright-harness`. Shipping a change →
`yardsmith-change-control` (nothing here overrides it). Why a past incident
happened → `yardsmith-failure-archaeology`.

---

## 1. The module concatenation contract

`scripts/build.mjs` (95 lines) builds `app.js` like this (build.mjs:44-54):

```
(function () {
  "use strict";
  <src/js/app/*.js, sorted by FILENAME, concatenated>   // 24 files today
})();
<src/js/global/*.js, sorted, concatenated>              // 1 file: 900-sw-register.js
```

Then esbuild-minifies with `target: "es2017"` (build.mjs:37-39). Consequences,
in order of how often they bite:

### 1a. Function declarations hoist across ALL modules

Because every app module lives in one function body, a `function foo(){}`
declared in ANY file is callable from ANY file, even at top level of an
earlier file. The canonical real example: **`005-migrations.js` runs first
and calls `lsGet`/`lsSet` (declared in `040-workout-logger.js`) and `ffISO`
(declared in `030-fuel…js`) at module top level** — legal purely because
function declarations hoist to the top of the IIFE. The source says so
explicitly (`src/js/app/005-migrations.js:7-8`), and 040 accommodates it:

```js
// src/js/app/040-workout-logger.js:9
var __ls;   // lazily created: module 005 (migrations) calls lsGet before this file's statements run
```

`lsGet` cannot assume `__ls = {}` ran yet, so it lazy-initializes on first
call (040:10-11). Copy this pattern whenever a hoisted function depends on
module-local `var` state.

### 1b. `var` BINDINGS hoist, `var` VALUES do not

All `var`s become function-scoped to the single IIFE, so *referencing* a
`var` declared in a later file never throws ReferenceError (even under
`"use strict"`) — but its value is `undefined` until the declaring file's
statements execute. Two real examples:

- `ffSchedule` is declared `var ffSchedule=null` in **030**
  (`030-fuel…js:7`) but assigned in **025** inside `calc()`
  (`025-macro-calculator.js:280`). This works because (a) the binding hoists,
  and (b) `calc()` isn't invoked until the **last statement of 030** —
  `calc();` is literally 030's final line, which is also how the app's very
  first render happens (mid-IIFE, after 025's listeners are wired).
- `planState` is a `var` in **035** (`035-training-plan.js:236`), so **020**
  guards: `if (typeof planState === "undefined") return;`
  (`020-persistence…js:3` — `persist()` can be called during first init
  before 035 has run).

### 1c. The two house idioms for cross-module timing

Use exactly these; do not invent new patterns:

1. **typeof-guard** — when the symbol may not exist/have a value yet:
   - `if(typeof renderPhase==="function") renderPhase();` (025:115)
   - `var lm = (typeof lastMob==="function") ? lastMob() : null;` (070:681)
   - `(typeof planState!=="undefined" && planState.freq) || 4` (070:622,
     075:11, 085:108, 080:423 — the freq fallback appears in 4+ modules)
2. **try/catch call** — when the call is best-effort and failure must never
   break the caller: `try{ renderDash(); }catch(e){}` (015:111,
   030:52-56, 090:290). All of 007-motion is built this way on principle
   (decorative code must never break behavior — 007:2-4).

### 1d. Number prefixes ARE the load order

`readdirSync(...).sort()` (build.mjs:30) means the filename prefix is the
execution order. A new module must pick a prefix AFTER everything whose
top-level `var` values it reads at load time, and BEFORE anything that needs
its values at load time (hoisted function calls are exempt — see 1a).
Two deliberate order-dependent facts:

- `009-glossary.js` registers its document-level click listener early ON
  PURPOSE: it runs before every later document listener so
  `stopImmediatePropagation` can keep a glossary-term tap from also toggling
  its interactive parent (009:61-63).
- `010-tab-nav…js` computes `FF_FRESH` (the brand-new-user snapshot) BEFORE
  030's trailing `calc()` writes default targets to localStorage, which would
  mask a first run (010:5-12).

`005-core-boot.js` is **empty** (a single blank line) — a reserved
earliest-slot placeholder. Nothing references it; the build tolerates it
(it becomes an empty part). No recorded reason to delete or keep it.

### 1e. `src/js/global/` runs OUTSIDE the IIFE

Only `900-sw-register.js` lives there. It must be outside because service-
worker registration is deliberately independent of app-code health (an
exception inside the IIFE must not stop update delivery), and it's skipped
entirely under Capacitor (`!window.Capacitor`, 900-sw-register.js:4). Code in
`global/` CANNOT see IIFE symbols; app code CANNOT see `global/` locals.
If you need code that survives an app-IIFE crash or must run without the app,
it goes here — otherwise it goes in `app/`.

After ANY `src/` edit: `node scripts/build.mjs` and commit outputs together
with the source (see `yardsmith-build-and-env` for mechanics,
`yardsmith-change-control` for the ship checklist).

---

## 2. Module map (24 app modules + 1 global, as of 2026-07-08)

Sizes from `wc -l`. One line each; the number prefix is the load order (§1d).

| File (src/js/app/) | Lines | Owns |
|---|---|---|
| `005-core-boot.js` | 1 | Empty placeholder — reserved earliest slot. |
| `005-migrations.js` | 40 | `ff_schema` versioned migration ladder (`FF_SCHEMA=1`); v1 backfills locale-proof `iso`+`ts` onto `ff_body`. Runs first; calls hoisted `lsGet`/`lsSet`/`ffISO`. |
| `006-icons.js` | 34 | `FF_ICONS` inline-SVG set, `ffIcon(name,size,cls)`; SVG for chrome, emoji stays in coach copy. |
| `007-motion.js` | 152 | Decorative physics: `ffCountUps`, `ffCelebrate` (PR confetti), `ffTick` (haptics), `ffReduced()`. All try-guarded; reduced-motion turns everything off. |
| `008-sheets.js` | 58 | One pointer-drag controller for every bottom sheet (`.swap-card`, `.qsheet-card`, `.modal`); dismisses via each sheet's own scrim-click path. |
| `009-glossary.js` | 94 | `FF_TERMS` jargon dictionary, `ffTerm(key,label)` tappable spans; early document listener (§1d). |
| `010-tab-nav-top-mobile-bottom-bar.js` | 12 | Grabs `#tabs`/`#mobileTabs`; computes `FF_FRESH` before defaults are written. |
| `015-coach-tips-teach-each-tab-on-first-visit.js` | 159 | First-visit tip banners (`ff_tips_seen`), install prompt, **`setView()` — the tab router** (§4), `[data-goview]` delegated navigation, installed-app refresh button. |
| `020-persistence-remember-everything-per-devi.js` | 41 | `persist()`/`restore()` for the master `"fairwayfuel"` profile key (inputs, goal, freq, equip, active view). |
| `025-macro-calculator.js` | 1245 | `calc()` — Mifflin–St Jeor → TDEE → goal macros → role-weighted meal split; `var state`, `$()` (getElementById), `GOALS`, `FF_FOODS` library, food prefs, day planner, shopping list; writes `ff_targets`. |
| `030-fuel-check-off-adherence-not-accounting.js` | 211 | Fuel check-off (`ff_fuel`), `fuelScoreFor`, `fuelStreak`, `ffISO()`, `fuelRefresh()`; **last line is `calc();` — the initial render**. |
| `035-training-plan.js` | 752 | The plan: `PHASES` authored week, `EQUIPMENT`+17 `MACHINES`, `EX` map (41 programmed lifts w/ subs), `equipNeedsFor` regex gear inference, `resolveEx`, `planState`, **the wave pipeline** (`purposeFor`/`waveFor`/`waveAdjust`/`effTarget`/`overspeedDose`/`prescribeW`, §6), `renderPhase()` → `#phaseDetail`, `warmupList`, `primerFor`, `focusDay`. |
| `040-workout-logger.js` | 317 | **The storage layer**: memoized `lsGet`/`lsSet`/`lsRemove` + `ff-external-write`/`storage` invalidation; `migrateDayNames()`; plan-date math (`planStart`/`curWeek`/`dayOfPlan`/`stripDays`/`weekStartDate`); `getLog`/`getSession`/`saveSession`; `ff_rest` rest check-offs; `ff_swaps`; `EXERCISE_DB` (~234 lifts in 13 groups) + `exGroupFor` regex; progression helpers (`progressReady`/`incFor`/`incNum`); the modal spreadsheet logger. |
| `045-inline-logger-log-as-you-train-in-the-ca.js` | 167 | In-card set logging (`var ilog`, `ilogBodyHtml`); plate math for barbell lifts; rest timers. |
| `050-exercise-history-every-lift-s-full-story.js` | 307 | Per-lift history from `ff_history`+`ff_log`; PRs; **tombstones** (`ffTomb`), `pushHistory`, `clearWorkoutFor`, `finishBtnHtml`, `ffToast`. |
| `055-share-cards-branded-pngs-generated-on-de.js` | 75 | Canvas-drawn 1080×1350 share PNGs (`ffMakeCard`/`ffShareImage`); share → download → clipboard fallback. **Carries the stale-wordmark defect (§7).** |
| `060-speed-test-day-the-biweekly-testing-ritu.js` | 138 | Biweekly 7-iron speed test (`SPEEDTEST_EVERY=14`, `speedTestDue`, `openSpeedTest`); writes `ff_body` via `logBodyEntry` + detailed `ff_speedtest`. |
| `065-mobility-screen-the-3-move-durability-ch.js` | 94 | 3-move mobility screen (`lastMob`/`mobDue` 28-day/`mobLimits` → warm-up routing); `ff_mobility`. |
| `070-workout-player-full-screen-guided-sessio.js` | 1000 | Full-screen guided player (`startPlayer`, `plRender`, pause/resume); **the Octane engine** (`ffScore` at 070:621, §6); `e1RM` (Epley); `logBodyEntry` — the single writer for weight/7-iron/driver rows; `renderHeroCard` dashboard hero; `ffBench` norms. |
| `075-proactive-coaching-your-focus-insights.js` | 277 | Deterministic rules engine → ONE prioritized dashboard card (`ffInsights`); defines `renderDash()`. |
| `080-game-day-round-day-fueling-warm-up-plan.js` | 573 | Tee-time timeline (`renderGameDay`), Account tab (`renderAccount`, sync-health line), all three notification tiers, theme control, mission editor. |
| `082-round-debrief.js` | 190 | Post-round log → `ff_rounds`; drive feeds the driver-carry trend. |
| `085-progress-stats-view.js` | 796 | Stats page (`renderProgress`): Octane hub, `pcLine` scrubbable charts, PR wall, season map, Sunday Scorecard, leaderboard publish, metabolism check-in; `weekStartDateCal`/`thisWeekStats` (§7); `ff_statsfold` fold state. |
| `090-first-run-onboarding.js` | 290 | 8-step wizard (gated on `FF_FRESH`+`ff_onboarded`); **the boot sequence** (`renderEquip(); renderPhase(); renderDash();` at 090:264-266) and `ffRefreshForNewDay` day-rollover re-render (090:273-287). |
| `global/900-sw-register.js` | 32 | SW registration + update cadence (§5); skipped under Capacitor. |

Re-verify the list: `ls src/js/app/ src/js/global/ && wc -l src/js/app/*.js`.

---

## 3. Cross-module shared-symbol map

Who declares what (all shared via the single IIFE scope — §1). When you move
code between modules, this is the dependency graph you must not break.
Declaration sites verified 2026-07-08; re-verify with
`grep -rn "function <name>" src/js/app/`.

| Declared in | Shared symbols (consumers everywhere) |
|---|---|
| 006 | `ffIcon`, `FF_ICONS`, `ffPurposeIc` |
| 007 | `ffReduced`, `ffTick`, `ffCountUps`, `ffCelebrate` |
| 009 | `ffTerm`, `FF_TERMS`, `ffLoopHtml` |
| 010 | `FF_FRESH` (var), `tabs`/`mobileTabs` (vars) |
| 015 | **`setView`**, `showTipFor`, `ffStandalone`, `ffPromptInstall` |
| 020 | `persist`, `restore` |
| 025 | `$` (getElementById), `state` (var), `calc`, `GOALS`, `lastMealPlan` (var) |
| 030 | `ffISO`, `fuelScoreFor`, `fuelStreak`, `fuelRefresh`, `ffSchedule` (var, assigned by 025's `calc()`) |
| 035 | `planState` (var), `PHASES`, `EX`, `MACHINES`/`MACHINE_KEYS`, `purposeFor`, `waveFor`, `waveAdjust`, `effTarget`, `overspeedDose`, `prescribeW`, `resolveEx`, `applySwapName` uses→040, `equipNeedsFor`, `equipOk`, `speedMode`, `warmupList`, `primerFor`, `renderPhase`, `focusDay` (var), `WAVES`, `eventInfo`, `dayCardHtml` |
| 040 | `lsGet`/`lsSet`/`lsRemove`, `escAttr`, `planStart`/`curWeek`/`dayOfPlan`/`stripDays`/`weekStartDate`, `getLog`/`getSession`/`saveSession`, `getRest`/`restDone`, `migrateDayNames`, `EXERCISE_DB`, `exGroupFor`, `incFor`/`incNum`/`progressReady`, `todayStr`, `resetPlanFull` |
| 045 | `ilog` (var), `ilogBodyHtml`, `isBarbell`, `platesFor` |
| 050 | `ffTomb`, `pushHistory`, `clearWorkoutFor`, `finishBtnHtml`, `ffToast` |
| 055 | `ffShareImage`, `ffMakeCard` |
| 060 | `speedTestDue`, `openSpeedTest`, `stSpeedHistory` |
| 065 | `lastMob`, `mobDue`, `mobLimits` |
| 070 | `startPlayer`, `e1RM`, `sessionsByWeek`, `strengthGain`, `ffScore`, `ffScoreSummary`, `octaneGaugeHtml`, `saveScoreSnapshot`, `driveStats`, `logBodyEntry`, `goalYds`, `ffBench`, `renderHeroCard` |
| 075 | `ffInsights`, **`renderDash`** |
| 080 | **`renderGameDay`**, **`renderAccount`**, `ffNotif*`/`ffPush*` tiers, `ffNotifReschedule` |
| 085 | **`renderProgress`**, `pcLine`, `bigLiftStats`, `weekBars`, `weekStartDateCal`, `thisWeekStats` |

Notable non-obvious placements (the digest of a past investigation got two of
these wrong, so trust this table): `finishBtnHtml` and `ffToast` live in
**050** (not 045); `bigLiftStats` lives in **085** (not 050); `e1RM` lives in
**070** (the player), not the logger.

---

## 4. The render model

No framework. Six `.view` divs in `src/index.template.html` (`view-dash`,
`view-calc` = Fuel, `view-plan` = Train, `view-account`, `view-progress` =
Stats, `view-gameday`). The rules:

**Router.** `setView(view, scroll)` (015:101-128) toggles `.active` on tab
buttons and views, then calls the view's render function — `renderDash`,
`renderAccount`, `renderProgress`, `renderGameDay` (each try-wrapped;
015:111-115). Fuel (`calc`) is kept live by `calc()` calls after every
mutation; Train renders via `renderPhase()` into `#phaseDetail` — note
`setView` does NOT call `renderPhase`; Train re-renders come from its own
mutation handlers (26 call sites) plus boot (090:265) and day rollover.
Tab switches cross-fade through `document.startViewTransition` when available
and motion isn't reduced (015:118-125); always keep the plain-`apply()`
fallback. `scroll!==false` smooth-scrolls to top; `persist()` saves the
active view for restore.

**Navigation from anywhere** is ONE document-level delegated handler on
`[data-goview]` (015:138-141) — added after drill-in buttons were dead
outside the dashboard. New "go to tab X" buttons must use `data-goview`,
never a local listener.

**Render style: innerHTML string building + delegated listeners on STABLE
parents.** A view render builds one HTML string and assigns
`el.innerHTML = html`, which destroys all child listeners — so click handling
is delegated to elements that survive the swap: `$("results")` in 025
(025:121), `#phaseDetail` in 035 (035:268 comment), `document` for
`[data-goview]`/`[data-term]`/`[data-startplayer]`/`[data-manuallog]`/
`[data-tipclose]` etc. **Never attach a listener to a node created inside a
rendered string unless you re-attach it after every render** (the
`setFold.addEventListener` at 035:732 is the sanctioned exception — it is
re-attached inside `renderPhase()` itself each render).

**Re-renders are explicit.** There is no reactivity: after mutating state you
must call the affected render functions yourself. The house aggregate is
`fuelRefresh()` (030:52-57): `calc()` + `renderDash()` + `renderProgress()`
(only if Stats is the active view — check `view-progress .active` before
paying for an off-screen render) + `renderFuelToday()`. Modal/sheet closes
call `renderPhase()`/`renderDash()` explicitly.

**Boot sequence** (090:262-266): `renderEquip(); renderPhase(); renderDash();`
— dash is the landing tab. **Day rollover**: because everything derives from
`ff_start` at render time, an installed PWA backgrounded across midnight
would look "stuck"; `ffRefreshForNewDay` (090:273-287) re-renders
plan+dash+reschedules reminders on visibilitychange/focus/pageshow, but ONLY
when `todayStr()` actually changed. Any new date-derived UI must be covered
by a render inside that function or it will exhibit the same stuck-week bug.

**Scroll preservation across innerHTML swaps** — a settled class of bug
(every section was audited clean in PR #65). The three sanctioned patterns:

1. **Capture/restore around the swap, keyed by "same logical screen"**: the
   player keeps `plBody.scrollTop` when re-rendering the SAME station
   (stepper taps, set check-offs) and resets to 0 only when the station
   changes — `var keep=(player.renderedSt===player.st)?body.scrollTop:0;`
   (070:216-222).
2. **Fold/open state held in a JS var and re-applied**: `planState.settingsOpen`
   is written into the `<details>` `open` attribute at render (035:714) and
   synced back on its `toggle` event (035:731-732).
3. **Fold state persisted** when it should survive reloads: `ff_statsfold`
   (085:205-212, device-local, deliberately not synced).

Any new in-place re-render triggered by a tap inside a scrollable region MUST
use pattern 1 or it reintroduces the #64 bug (tap → thrown to top).

---

## 5. Service-worker strategy

Source: `src/sw.template.js` (90 lines, built into `sw.js`); registration and
update cadence: `src/js/global/900-sw-register.js`.

- **Cache identity is the build hash**: `var CACHE = 'yardsmith-{{V}}'`
  (sw.template.js:4). A new build = new cache name; `activate` deletes every
  non-current cache and `clients.claim()`s (27-34). `install` precaches and
  `skipWaiting()`s (22-25). No manual version bumps, ever.
- **Precache list** (5-20): `./`, `index.html`, `styles.css?v={{V}}`,
  `fonts/ffnum.woff2`, `app.js?v={{V}}`, `privacy.html`,
  `cloud-sync.js?v=112`, `coach.js?v=88`, `manifest.webmanifest`,
  `logo-dark-mark.png`, icons (192/512/apple-touch). `og-image.png` is
  deliberately NOT precached (only social scrapers fetch it). If you add a
  served asset the app needs offline, add it here; if you bump a manual `?v=`
  pin, it must change here AND in `src/index.template.html`
  (`yardsmith-build-and-env` owns pin mechanics).
- **Fetch policy** (60-89): GET-only, **same-origin only** — cross-origin
  (Supabase API/SDK, any CDN) passes through untouched (63). Documents
  (navigations / `accept: text/html`) are **network-first with
  `{cache:'no-store'}`**, caching the response as `./index.html` and falling
  back to cache offline. The WHY is load-bearing: GitHub Pages serves HTML
  with `max-age=600`, so a plain network fetch can return a 10-minute-stale
  `index.html` pointing at old hashed assets right after a deploy —
  `no-store` forces past the HTTP cache (66-78, and the incident behind it is
  in `yardsmith-failure-archaeology`). Everything else is cache-first with
  network fill (79-89).
- **Update cadence** lives client-side in 900-sw-register.js: `reg.update()`
  on load AND on visibilitychange-visible / focus / pageshow-persisted
  (13-19), because a home-screen PWA usually RESUMES without a fresh `load`
  event. On `controllerchange`, reload ONCE and only if the page was already
  controlled (an update, not first install) — the `ffReloaded` guard prevents
  reload loops (24-30). Registration is skipped under Capacitor (4): native
  bundles files locally, a SW would only add stale-cache risk.
- The SW also carries `notificationclick` (focus-or-open) and a `push`
  handler (39-57) — the push system itself is described in
  `yardsmith-data-and-sync` / `yardsmith-run-and-deploy`.

Do not restructure this without reading invariant 14 (§8): the no-store
document fetch and same-origin bypass each fix a specific production
incident.

---

## 6. Where the Octane engine and the wave pipeline live

(Formulas, weights, and the science behind them belong to
`golf-fitness-domain-reference` — this section is only the code map.)

**Octane** — all in `070-workout-player…js`:

| Piece | Location |
|---|---|
| `e1RM(w,r)` Epley estimate | 070:596-597 |
| `sessionsByWeek()` / `strengthGain()` | 070:598 / 070:605 |
| **`ffScore()`** — builds the 6 pillar `parts`, rescales to pillars with data | 070:621-714 |
| `ffScoreSummary(r)` — "biggest lever" picker | 070:723-732 |
| `octaneGaugeHtml(score)` — the E→F SVG gauge | 070:734-745 |
| `saveScoreSnapshot(r)` → `ff_score` (for the AI coach) | 070:774 |
| `logBodyEntry(wv,sv,dv)` — the ONE writer for weight/7-iron/driver rows | 070:759 |

`ffScore` reads across modules (guarded per §1c): `planState.freq` (035),
`lastMob` (065), `fuelScoreFor`+`ffISO` (030), `curWeek`/`getLog` (040).
Consumers: `renderHeroCard` (070:797), the Stats Octane hub (085), insights
(075). Rest-day check-offs deliberately do NOT feed it — they live in
`ff_rest`, and Octane/streaks/leaderboard read only `ff_log` (040:146-147).

**Wave-periodization pipeline** — all in `035-training-plan.js`, with
progression helpers in 040:

| Piece | Location |
|---|---|
| `purposeFor(name)` — regex classifier 🏋️/💪/⚡/🌀 (ordering is load-bearing: rotation before power, `Landmine Press` excluded) | 035:349-360 |
| `trainRetain()` / `adjSets` (goal-driven trim, 💪 only) | 035:365-369 |
| `waveFor(week)` — 6-week cycle + `ff_event` re-anchor via `eventInfo()` | 035:410-421 (398-409) |
| `waveAdjust(sr,name,week)` (+ `bumpReps`/`trimSets`/`plainReps`) | 035:422-440 |
| **`effTarget(sr,name,week)`** — THE one target pipeline: `waveAdjust(adjSets(sr,name),name,week)` | 035:442 |
| `overspeedDose(week)` / `speedDrillTarget` | 035:445-454 |
| `prescribeW(lastW,name,ready,wave)` — prescribed loads | 035:457-462 |
| `progressReady` / `incFor` / `incNum` (double progression) | 040:165-186 |

Invariant: `effTarget` is the SINGLE source for both what the plan displays
and what the loggers prescribe — every surface (Train card 035:543-544,
inline logger 045:17-38, player 070:120-122, modal logger 040:271-273) must
route through it so display and prescription can never drift.

---

## 7. Known weak points — stated plainly

Read these before touching the relevant area; each is either an accepted
trade-off or an open defect. Do not "fix" the accepted ones without routing
through `yardsmith-change-control`.

1. **Regex-based exercise classification silently drives training
   prescriptions.** Three separate regex classifiers exist: `purposeFor`
   (035:349-360) decides which wave adjustment a lift gets; `equipNeedsFor`
   (035:179-209) infers gear for the ~200 lifts outside the `EX` map;
   `exGroupFor` (040:210) buckets lifts for history/PRs. A name that matches
   the wrong pattern gets the wrong dose — this already happened once
   ("Speed bench press" matched `/Bench Press/` and got the heavy-lift
   prescription; ballistic throws were trimmed like accessories; incident
   `6932f28`, details in `yardsmith-failure-archaeology`). **Any new name
   added to `EXERCISE_DB`, `EX`, or `PHASES` must be checked against all
   three classifiers** (fastest: paste the name into each regex chain, or
   unit-case `purposeFor` per the pattern in
   `yardsmith-proof-and-analysis-toolkit`).
2. **Equipment inference is heuristic BY DESIGN** — the `EX` map is
   authoritative only for its 41 programmed lifts; everything else is
   name-pattern inference. The stated contract (035:175-178): imperfect
   inference is fine because unmet needs only BADGE and SORT picker options,
   **never hide them**. If you ever make `equipNeedsFor` gate availability,
   you've broken the design decision.
3. **Three logging surfaces re-compose the progression logic.** The shared
   primitives (`progressReady`/`incFor`/`incNum` in 040, `prescribeW` in 035)
   are single-sourced, but the modal logger (040:260-300), the inline logger
   (045:12-60), and the player (070:115-130, 295-310) each rebuild their own
   nudge/prefill/stepper composition around them. DESIGN-CHANGES.md's
   cross-cutting tail records "the two workout loggers (modal + inline)
   duplicate progression logic" as standing tech debt. A progression-behavior
   change must be applied and TESTED on all three surfaces (this is exactly
   the "tested Today, bug lived in logFoot" failure class — see
   `yardsmith-debugging-playbook`).
4. **Dual week clocks.** `weekStartDate()` (040:80) is PLAN-anchored (rolls
   with `ff_start`); `weekStartDateCal()` (085:357) is calendar Monday
   00:00 local. Both are in active use and easy to confuse — recorded tech
   debt in DESIGN-CHANGES.md. Pick deliberately: leaderboard/scorecard/weekly
   stats use the calendar clock; plan math uses the plan clock.
5. **`thisWeekStats` locale-vs-ISO bug: FIXED, with a residual edge.** The
   historical latent bug (locale date string compared to an ISO week start —
   alphabetically always true, deltas never showed) was fixed in the PR #61
   data-hygiene pass; 085:360-378 now compares `e.iso >= wsStr` and carries
   the explanatory comment. Residual: `ff_body` rows whose `iso` could not be
   backfilled (unparseable legacy `date`) evaluate `("" >= wsStr)` = false
   and silently fall out of "this week" — accepted for stragglers, but don't
   create new `ff_body` rows without `iso`+`ts` (`logBodyEntry` does this
   correctly; use it).
6. **Share-card stale wordmark — OPEN DEFECT as of 2026-07-08.** The canvas
   header still draws the pre-rebrand split wordmark: `g.fillText("Fairway",…)`
   + `g.fillText("Fuel",…)` at 055:19-21, while the footer draws "Yardsmith"
   (055:47). Every shared PNG (session recap, Sunday Scorecard, speed test)
   ships the old brand in its header. The fix is two strings + the accent
   split (mirror `Yard`|`smith` per the rebrand's email-template fix), then
   rebuild; no one has claimed it yet. Verify still present:
   `grep -n '"Fairway"' src/js/app/055-*.js`.
7. **es2017 syntax ceiling.** esbuild minifies with `target:"es2017"`
   (build.mjs:36-38) — the emitted syntax stays within the codebase's
   async/await baseline. esbuild will transform some newer syntax down, but
   don't lean on that: the codebase style is deliberately ES5-flavored
   (`var`, `function`, string concat) and reviewers should keep new code
   consistent with the file it lives in. Also note nothing transpiles
   `cloud-sync.js`/`coach.js` (repo root, hand-maintained) at all.

---

## 8. Load-bearing invariants — the do-not-break list

Each has a one-line WHY; incidents behind them live in
`yardsmith-failure-archaeology`; ship process in `yardsmith-change-control`.

1. **Never edit repo-root `index.html`/`app.js`/`styles.css`/`sw.js`.**
   Build outputs (GENERATED headers). Edit `src/`, run
   `node scripts/build.mjs`, commit source + outputs together — CI has no
   build step; the committed outputs ARE the site.
2. **Never rename the `"fairwayfuel"` profile key or any stored `ff_*`
   key** — sync, migrations, and every reader depend on the names; the
   rebrand deliberately kept them (CLAUDE.md).
3. **New roaming `ff_*` key ⇒ same-PR entry in cloud-sync.js `KEYS`, and if
   it holds history, in `MERGE` too, plus a `?v=` pin bump** in both
   templates. A missed MERGE entry silently degrades to cloud-wins =
   cross-device data loss. (Full checklist: `yardsmith-data-and-sync`.)
4. **All storage goes through `lsGet`/`lsSet`/`lsRemove`** (040:10-26).
   Direct `localStorage` writes bypass the memo cache (stale reads) and skip
   `ff-data-changed` (no sync push). Mutate a returned object only if you
   `lsSet` it back in the same tick (contract comment 040:2-8).
5. **Respect the IIFE scope rules** (§1): hoisted functions may be called
   cross-module freely; `var` values may not be read before the declaring
   file runs — use the typeof-guard or try/catch idioms; new modules pick a
   number prefix consistent with their load-time dependencies.
6. **Deletions need tombstones** — `ffTomb(key)` (050:197) BEFORE removing
   `ff_log`/`ff_history` entries, or the next cloud merge resurrects them;
   re-creation must carry a newer `ts`/`_ts` than the tombstone.
7. **`ff_body` identity is `iso` (YYYY-MM-DD) + `ts`**; the locale `date`
   string is display-only. Any new dated series needs a locale-proof key, or
   a new `ff_schema` rung in 005-migrations.js.
8. **Never force-push; never hand-resolve conflicts in generated outputs** —
   take either side and rebuild (CLAUDE.md parallel-session protocol).
9. **Rest check-offs stay in `ff_rest`, never `ff_log`** — Octane, streaks,
   and the leaderboard count `ff_log` only (040:146-147).
10. **Dark theme is generated** into `src/css/styles.css` between the
    `GENERATED-DARK` markers (currently styles.css:1937-2504) by
    `python3 scripts/gen-dark-theme.py`; hand overrides go in that script's
    `CORE` list; light styles above the markers only. (Pipeline details:
    `yardsmith-build-and-env`.)
11. **Future plan days render as read-only previews** — `dayCardHtml(featured,
    true, false)` for future days (035:660-672); an interactive render
    auto-created sessions the moment a user peeked ahead. And **`effTarget`
    stays the single target source** for display AND prescriptions (§6).
12. **Billing columns are RLS-pinned server-side** — only the service-role
    webhook writes them; keep secrets out of client code
    (`yardsmith-run-and-deploy` owns the secrets inventory).
13. **es2017 ceiling** (§7.7) — don't introduce newer syntax than the
    codebase's async/await baseline; keep style consistent per file.
14. **The SW's document fetch keeps `{cache:'no-store'}` and the fetch
    handler stays same-origin-only** (sw.template.js:63, 66-78) — the former
    beats GitHub Pages' `max-age=600` staleness, the latter keeps Supabase
    traffic out of the cache entirely. The register-side update-on-resume
    calls (900-sw-register.js:13-19) are equally load-bearing for installed
    PWAs.

---

## Provenance and maintenance

All facts verified 2026-07-08 against HEAD `f21930a`, build `04f691fff1`
(24 app parts). Line numbers WILL drift as files are edited — treat every
`NNN:LLL` reference here as "verified 2026-07-08" and re-anchor with the
commands below before citing them onward.

- Module list + line counts: `ls src/js/app/ src/js/global/ && wc -l src/js/app/*.js`
- Build contract + es2017 target: `sed -n '29,54p' scripts/build.mjs`
- Build determinism (run in a SCRATCH copy — never in the repo, it rewrites
  outputs): copy `src/ scripts/ package.json` to a temp dir, `node
  scripts/build.mjs`, then `sha256sum` the four outputs against the repo's.
  Verified matching on 2026-07-08 (`v=04f691fff1`).
- Hoisting examples: `sed -n '1,12p' src/js/app/005-migrations.js` and
  `sed -n '9,11p' src/js/app/040-workout-logger.js`
- typeof-guard census: `grep -rn "typeof planState\|typeof renderPhase" src/js/app/`
- setView + data-goview: `grep -n "function setView\|data-goview" src/js/app/015-*.js`
- Symbol map: `grep -rn "function <name>" src/js/app/` per symbol
- SW policy: `sed -n '59,90p' src/sw.template.js`; update cadence:
  `cat src/js/global/900-sw-register.js`
- Octane/wave locations: `grep -n "function ffScore\|function logBodyEntry" src/js/app/070-*.js`
  and `grep -n "function purposeFor\|function effTarget\|function prescribeW" src/js/app/035-*.js`
- Share-card defect still open?: `grep -n '"Fairway"' src/js/app/055-*.js`
  (no hits = someone fixed it; update §7.6)
- Manual pins current values: `grep -n "cloud-sync.js?v=\|coach.js?v=" src/index.template.html src/sw.template.js`
  (v=112 / v=88 as of 2026-07-08)
- Dark markers: `grep -n "GENERATED-DARK" src/css/styles.css`
- Empty placeholder: `wc -l src/js/app/005-core-boot.js` (1 line, blank)
