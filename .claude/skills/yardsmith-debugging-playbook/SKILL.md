---
name: yardsmith-debugging-playbook
description: >
  Symptom→triage playbook for debugging Yardsmith (the golf-fitness PWA in this
  repo). Load this FIRST when a user or device reports something broken: "app
  shows an old version / my change isn't live", "data lost / workouts
  misremembered / deleted things came back", "workouts stuck on last week /
  wrong day", "bottom bars stranded or hidden on iPhone", "page jumps to the
  top when I tap", "sets/reps look wrong for this week", "blank page / app
  won't boot", "my Playwright test passes but did nothing", "test reads stale
  localStorage". Gives the discriminating experiment for each symptom, the
  exact commands, and where the fix lives — plus the first-question discipline
  (ask which FF_BUILD before assuming a code bug).
---

# Yardsmith debugging playbook

Symptom-first triage for the live app at yardsmith.golf and for local/harness
debugging. Every claim below was re-verified against the repo at HEAD
`f21930a` (2026-07-08); line numbers cite that state.

**When NOT to use this skill.** This is for *diagnosing a reported symptom*.
For the full incident history and settled don't-revive battles →
`yardsmith-failure-archaeology`. For how the build/IIFE/SW work in general →
`yardsmith-architecture-contract` and `yardsmith-build-and-env`. For the
localStorage key catalog and sync protocol details → `yardsmith-data-and-sync`.
For writing/running the Playwright harness itself → `yardsmith-playwright-harness`.
For what evidence a fix needs before merging → `yardsmith-validation-and-qa`
and `yardsmith-change-control` (never route around it).

---

## Rule zero: first-question discipline

**Before assuming a code bug in ANY live report, ask which build the device is
on.** The You/Account tab has a "🔄 App version" card showing `window.FF_BUILD`
(a 10-char content hash). Compare it to the deployed hash.

Why this is rule zero: a user reported "the speed section never updated" after
a fix shipped — an entire debugging round was nearly spent on it before it
turned out to be a stale home-screen PWA cache, not code. The compact speed day
"was live all along, just not reaching the home-screen app"
(DESIGN-CHANGES.md §58, lines 1452–1455; the fix era is §57, commit `27e5655`).

```bash
# hash the repo says should be live (committed build output):
grep -o 'FF_BUILD="[a-f0-9]*"' index.html          # → FF_BUILD="04f691fff1" as of 2026-07-08
# hash actually deployed (run where you have open internet; sandbox proxies may 403 the domain):
curl -s https://yardsmith.golf/ | grep -o 'FF_BUILD="[a-f0-9]*"'
# proxy-friendly fallback (verified working through this sandbox's proxy):
curl -s https://raw.githubusercontent.com/forgerperformanceco/golf-fitness/main/index.html \
  | grep -o 'FF_BUILD="[a-f0-9]*"'
```

On the device: You tab → "App version" card (rendered at
`src/js/app/080-game-day-round-day-fueling-warm-up-plan.js:465-467`), or
DevTools console: `window.FF_BUILD`.

- Device hash ≠ deployed hash → it's a **staleness** problem, go to §1.
- Hashes match and the symptom persists → real bug, pick the matching section.

---

## Symptom → triage index

| Symptom (user's words) | Likely class | Section |
|---|---|---|
| "It still shows the old version / your fix isn't there / even in incognito" | Delivery staleness (SW / CDN / Pages / resumed PWA) | §1 |
| "It forgot my workout" / "deleted workouts came back" / "duplicate days" | Sync merge semantics | §2 |
| "The plan is stuck on last week" / "wrong day showing" | Date rollover / plan anchoring / locale keys | §3 |
| "The tab bar is floating mid-screen / disappeared" (iPhone) | iOS visual-viewport physics | §4 |
| "Every tap throws me back to the top of the page" | innerHTML re-render scroll loss | §5 |
| "Why is it prescribing 4×6 this week?" / power drills gutted | Wave engine / purposeFor classification | §6 |
| Blank page, `{{V}}` visible in HTML, boot ReferenceError | Build not run / template leak / module ordering | §7 |
| "My Playwright test is green but asserted nothing" | Harness seed silently dropped | §8 |
| "Harness reads values I just wrote — but stale" | `lsGet` memo cache not invalidated | §9 |

---

## §1 · "User/device sees an old version" — the staleness ladder

**Story.** Staleness is the single most recurring failure theme in this repo
(~120 manual SW cache bumps in the first 9 days). Four distinct mechanisms were
found and fixed, one per rung: SW cache (`5d8261d`, installed PWAs never ran
`reg.update()`), CDN edge (`cf590f5` — "still says 6 digits even in incognito";
unversioned `cloud-sync.js`/`coach.js` URLs cached at GitHub Pages' shared CDN
edge, which incognito does NOT skip), automatic hashing replacing manual bumps
(`dce7a6f` #13), and Pages' `max-age=600` on HTML defeating even a
network-first SW fetch (`27e5655` #56/doc §57 — "I'm refreshing the
save-to-home version and it's not working"). Full saga →
`yardsmith-failure-archaeology`.

**Climb the ladder in order** (each rung has a discriminating check):

1. **Is the deploy actually out?** Green run in GitHub Actions
   (`.github/workflows/deploy.yml`), and the raw-GitHub/`yardsmith.golf` curl
   from Rule zero shows the new hash. Remember: **CI does not build** — the
   committed root outputs are what ships. If you edited `src/` but the curl
   shows the old hash *and your commit is on main*, you forgot to rebuild and
   commit the outputs (§7).
2. **Resumed-PWA no-load-event.** A home-screen PWA usually *resumes* from the
   app switcher without firing `load`, so a load-only update check would miss
   updates for days — the resume-time `reg.update()` cadence and
   single-reload-on-`controllerchange` that fix this are described in
   `yardsmith-architecture-contract` §5. Discriminating test:
   fully close and reopen the PWA — if that fixes it, the device just hadn't
   run an update check yet.
3. **Pages `max-age=600`.** GitHub Pages serves HTML with a 10-minute HTTP
   cache; the SW's `{cache:'no-store'}` document fetch exists precisely to
   beat this (mechanism → `yardsmith-architecture-contract` §5). But if a
   device is within ~10 min of a deploy and NOT SW-controlled (first visit,
   or SW unregistered), plain browser cache can still serve stale HTML —
   wait 10 min or hard-reload.
4. **CDN edge on the manually-pinned files.** `cloud-sync.js` and `coach.js`
   are NOT content-hashed; they carry manual `?v=` pins (v=112 / v=88 as of
   2026-07-08; which template lines and the full mechanics →
   `yardsmith-build-and-env` §4). If you edited either file and did not bump
   its pin in BOTH templates, every user gets the old bytes from the CDN edge
   forever — the exact `cf590f5` incident ("The code on main was correct —
   the bytes users got were stale"). Discriminating check:
   `curl -s https://yardsmith.golf/cloud-sync.js?v=112 | head` vs the repo file.
5. **Wedged SW / Cache Storage.** Last resort, on the device: You tab →
   "↻ Force refresh to the latest". `ffForceUpdate()`
   (`src/js/app/080-…-warm-up-plan.js:333-349`) unregisters every SW, deletes
   all Cache Storage, hard-reloads with a 2.5s watchdog. localStorage data is
   untouched. Note from §57: a stuck client must receive the new SW once (full
   close/reopen or one force-refresh) before the automatic path self-heals.

**Where the machinery lives.** The canonical mechanism description (cache
naming, precache list, fetch policy, update cadence, with line references) is
`yardsmith-architecture-contract` §5; escape hatch and version card are in
module 080 (rung 5 above). Never hand-bump a `yardsmith-vNNN` cache name —
that treadmill is dead; the hash does it (see `yardsmith-build-and-env`).

---

## §2 · "Data lost / workouts misremembered / deleted things came back"

**Story.** The longest saga in the repo: whole-blob last-write-wins erased
just-finished workouts (`747eb6d`, "the app keeps misremembering my completed
workouts"), fixed by union merges; deletions then resurrected through the union
until tombstones (`9b5a3dc`); two open devices still blind-overwrote each other
until rev-guarded compare-and-swap + an explicit merge registry (`5473249`
#60) — which also caught four keys (`ff_rounds`, `ff_speedtest`, `ff_mobility`,
`ff_fuel`) that had silently drifted to cloud-wins despite holding history;
locale-keyed `ff_body` rows made duplicate days after merges (`02b1f6d` #61).
Full chronicle → `yardsmith-failure-archaeology`; protocol details →
`yardsmith-data-and-sync`.

**Triage decision tree** (all code refs are `cloud-sync.js` at repo root):

1. **Is sync even healthy?** On the device console:
   `JSON.parse(localStorage.getItem('ff_sync_status'))` → `{state, ts, okTs,
   err}` (written by `noteSync`, lines 205-218; device-local, deliberately not
   synced). The Account hero card shows the same as "☁ Synced · N min ago" or
   "⚠ Sync failing — last good sync …" (`ffSyncLine`,
   `080-…-warm-up-plan.js:259-266`). A stale `okTs` means the device has been
   offline-from-the-cloud for that long; anything "lost" may simply never have
   been pushed.
2. **Is the key in `KEYS` at all?** Line 20. Not listed → it never roams;
   "loss" on another device is expected behavior.
3. **Is the key in the `MERGE` registry?** Lines 431-440. Every ADDITIVE key
   (accumulating history) must declare a union there; **any key not in `MERGE`
   is treated as a setting and takes the cloud value on conflict** — the
   registry comment says it plainly: "a missed entry means cross-device data
   loss for that key." If someone added a new history key without a MERGE
   entry, you've found the bug. (New-key checklist lives in
   `yardsmith-data-and-sync`.)
4. **Deleted things came back?** Deletions must write tombstones first:
   `ffTomb(key)` puts `ff_deleted["L:week|day"]` / `["H:histId"] = Date.now()`
   (`src/js/app/050-exercise-history-….js:197`; used by clear-workout at :204,
   history delete at :220, full reset via `resetPlanFull` at
   `040-workout-logger.js:134-135`). Tombstones are applied LAST in
   `mergeBlob` (cloud-sync.js:441-468): a delete holds unless the entry was
   re-created with a **newer** `_ts`/`ts`. Resurrection ⇒ either the delete
   path skipped `ffTomb`, or the resurrected entry carries a newer timestamp
   (check both timestamps).
5. **Two-device clobbering?** Push is a CAS loop (lines 248-299): `UPDATE
   profiles SET data=…, rev=base+1 WHERE id=uid AND rev=base`; zero rows →
   pull, `mergeBlob`, retry ≤3. Caveat: if the live DB schema lacks the `rev`
   column, `revMode` flips false (line 191) and pushes silently degrade to the
   old blind upsert — check `ff_sync_status.err` history and the Supabase
   `profiles` table for a `rev` column before trusting CAS.
6. **Duplicate days in weight/speed data?** `ff_body` identity is the ISO
   `iso` field (backfilled by the `ff_schema` v1 migration,
   `src/js/app/005-migrations.js`); the locale `date` string is display-only.
   Duplicates ⇒ rows missing `iso` (migration didn't run on some device) —
   see §3's locale lesson.

**Recovery options** (in escalating order): the Account tab backup
export/restore (JSON file, `080-…-warm-up-plan.js:285-315`); the
`profiles_history` table keeps the last 10 blob revisions server-side
(schema from #61) for corrupted-blob rollback. For reproducing merge bugs
without a browser, the vm-sandbox `test-sync.mjs` pattern is in
`yardsmith-proof-and-analysis-toolkit`.

**Related but benign:** one automatic reload right after sign-in is by design —
`syncOnLogin` reloads once (guarded by sessionStorage `ff_synced_once`,
cloud-sync.js:503-504) only when the merge changed local state. An *infinite*
reload loop would be a regression of `1794eac` (Jun 27).

---

## §3 · "Workouts stuck on prior week / wrong day"

**Story.** `7ada915` (Jul 5, "plan now rolls to the new week/day on a calendar
boundary") fixed two independent causes: (1) nothing re-rendered on reopen — an
installed PWA backgrounded across midnight never recomputed the week; (2) week
math anchored to the time-of-day you started, not midnight, so DST could shift
the boundary. The sibling lesson: locale date strings used as identity/compare
keys (`851485c` day-label rename; `02b1f6d` ISO identity; the old
`thisWeekStats` compared "Jul 8, 2026" ≥ "2026-07-06" — alphabetically ALWAYS
true, so deltas never showed).

**How it works now** (all in `src/js/app/040-workout-logger.js`):

- The plan runs off **`ff_start`** (a datetime string; `planStart()` :58) —
  there is no stored "current week". `daysSinceStart()` (:63-68) normalizes
  BOTH ends to local midnight and rounds, so rollover happens exactly at
  midnight and DST's 23/25-hour days can't drift the count.
  `curWeek()` = `floor(days/7)+1` clamped 1-20 (:69-74; falls back to legacy
  `ff_week` only when no start date). `dayOfPlan()` = `(days % 7)+1` (:76-78).
- Re-render on resume: `ffRefreshForNewDay()`
  (`src/js/app/090-first-run-onboarding.js:274-286`) re-renders Train + Home
  and reschedules reminders on `visibilitychange`/`focus`/`pageshow`, but only
  when `todayStr()` actually changed.

**Discriminating experiments:**

```js
// on the affected device's console:
JSON.parse(localStorage.getItem('ff_start'))   // the anchor — is it what you expect?
window.FF_BUILD                                 // rule zero: pre-7ada915 builds had this bug
```

- Wrong week for a *correct* `ff_start` → arithmetic bug; reproduce with a
  seeded `ff_start` in the harness at a chosen fake date.
- Correct week after a manual reload, wrong before → resume-refresh path
  broken (090:274-286).
- Off-by-one only across a DST change or for users in another locale → date
  identity bug; check every comparison touches `iso`/`ts`, never locale `date`
  strings. The fixed reference implementation is `thisWeekStats()`
  (`src/js/app/085-progress-stats-view.js:360-374` — the comment there
  memorializes the alphabetical-compare bug).
- Renamed a day label? Day names are `ff_log` keys. Any rename needs an
  idempotent every-load migration like `migrateDayNames()` (040:38-56), which
  also self-heals old keys reintroduced by cloud sync.

---

## §4 · "iOS bottom bars stranded / hidden"

**Story — four rounds, one afternoon (Jul 6), each fix wrong until the last:**

1. `6d12a02` #33 — bars stranded mid-screen after the keyboard closed; added a
   keyboard detector.
2. `90f7a15` #34 — **same-day HOTFIX**: the detector's heuristic
   (`innerHeight - vv.height > 60`) misread pinch-zoom/URL-bar shifts as
   "keyboard open" and hid the tab bar/FAB/pause bar with no way back.
3. `0e4cb75` #35 — actual root cause: once iOS zooms even slightly,
   `position:fixed` stops tracking the visual viewport — and **rapid +/-
   stepper taps register as double-tap-zoom**. Fix: `html { touch-action:
   pan-x pan-y }` + `touch-action: manipulation` on controls
   (`src/css/styles.css:1858-1859`) + `maximum-scale=1.0` in the viewport meta
   (`src/index.template.html:5`).
4. `c9c0d38` #37 — blocking zoom can't un-zoom an already-zoomed session, so
   the bars now **translate to the visible bottom on every `visualViewport`
   change**, rAF-throttled, phones only.

**Where the fix lives now:** the pinning IIFE in
`src/js/app/007-motion.js:114-152` — computes
`dy = (vv.offsetTop + vv.height) - window.innerHeight` and applies
`translateY(dy)` to `#mobileTabs`, `#ffFab`, `#plPauseBar`; keyboard state sets
`body.ff-kb`, and `styles.css:1643` hides the three bars under it. Keyboard
detection requires a focused editable AND `vv.scale < 1.15` AND a >150px gap.

**Triage:**

- Bars *hidden* with no keyboard → `document.body.classList.contains('ff-kb')`
  in the console; if true with no focused input, the detector heuristic
  regressed (round-2 class of bug). A plain tap anywhere is the failsafe
  (`pointerdown` handler, 007-motion.js:148-150).
- Bars *floating mid-screen* → check whether the page is zoomed
  (`window.visualViewport.scale` ≠ 1). If new UI reintroduced zoomability
  (e.g. a control without `touch-action`), that's round-3 class.
- Reproducing needs a REAL iOS device or simulator — desktop Chrome and the
  Playwright harness do not exhibit iOS visual-viewport physics. Don't claim
  this fixed on harness evidence alone.

---

## §5 · "View jumps to the top on tap"

**Story.** `1e30ffa` #64/doc §65: the workout player's `plRender()` swapped
`plBody.innerHTML` and reset `scrollTop` to 0 on EVERY render — tapping a rep
stepper or checking a set mid-list threw the user to the top. Fix: keep the
scroll position when re-rendering the *same* station, reset only on station
change. `879862b` #65/doc §66 then audited every other in-place re-render in
the app (16 interaction points) and recorded "all clean".

**Where the pattern lives:**
`src/js/app/070-workout-player-full-screen-guided-sessio.js:219-222`:

```js
var keep=(player.renderedSt===player.st)?body.scrollTop:0;
body.innerHTML=plStationHtml();
body.scrollTop=keep;
player.renderedSt=player.st;
```

**Triage.** This app renders by innerHTML string swap everywhere (see
`yardsmith-architecture-contract`), so ANY new interactive element inside a
re-rendered container can regress this. Discriminating experiment: scroll the
container, trigger the interaction, read `el.scrollTop` before/after — in the
harness this is the `audit-scroll.mjs` pattern (16/16 standard;
`yardsmith-validation-and-qa` owns the audit spec). A close cousin is any
other JS-held UI state lost across a re-render (fold open/close, focus) — same
diagnosis: state must be captured before the swap and re-applied after, or
held outside the DOM.

---

## §6 · "Wrong sets/reps prescribed"

**Story.** `6932f28` (Jul 7, "Wave engine: stop mis-prescribing the ballistic
speed drills"): `purposeFor()` classifies every exercise by name-regex, and the
wave engine derives prescriptions from the class. "Seated chest throw" and
"Cable lateral chop" fell through to 💪 hypertrophy — so Peak cut them 3×4 →
1×4, gutting power work in the weeks meant to keep speed crisp — and "Speed
bench press" matched the 🏋️ big-lift regex, receiving "drop 2 reps, go
heavier": exactly wrong for a velocity lift. Fix: rotation checked before
power, ballistic regex broadened (Throw/Toss/Clean/`^Speed `), `Landmine
Press` explicitly excluded from rotation. Verified then with 37 classification
+ 10 wave-adjustment unit cases (that pattern → `yardsmith-proof-and-analysis-toolkit`).

**The pipeline** (all `src/js/app/035-training-plan.js`): `effTarget(sr, name,
week) = waveAdjust(adjSets(sr,name), name, week)` (:442) — the ONE source for
both the displayed plan and the logger's prescriptions.

- `purposeFor(name)` :349-360 — order matters: Single-Arm → 🌀 rotation → ⚡
  ballistic → 🏋️ big lifts → 💪 default.
- `adjSets` :366 — Retain mode (goal maintain/cut) trims one set off 💪 only.
- `waveFor(week)` :410-420 — 6-week cadence (1-3 accumulate, 4-5 intensify, 6
  deload), weeks ≥19 peak; an `ff_event` date re-anchors (event week & week
  before → peak, week after → deload).
- `waveAdjust` :430-439 — intensify: 🏋️ −2 reps (floor 3, plain-rep targets
  only — never "3 × 40 yd"), 💪 −1 set; deload: −1 set all; peak: −1 set for
  ⚡/🌀, −2 otherwise.
- Overspeed swings bypass the wave: `overspeedDose` :445 (2×5 → 3×5 → 4×5
  ramp, back to 2×5 on deload/peak) via `speedDrillTarget` :451.
- Loads: `prescribeW` :457 (deload ≈60% rounded to 5; progression-ready → +inc).

**Discriminating experiment — run the shipped triage tool** (extracts these
exact functions from source; selftest re-runs the 6932f28 regression cases):

```bash
node .claude/skills/yardsmith-debugging-playbook/scripts/triage-wave.mjs --selftest
node .claude/skills/yardsmith-debugging-playbook/scripts/triage-wave.mjs "Seated chest throw" "3 × 4"
node .claude/skills/yardsmith-debugging-playbook/scripts/triage-wave.mjs "Lat Pulldown" "3 × 10" cut
```

Compare the printed 20-week table with what the app shows. Table right, app
wrong → the bug is downstream (rendering, `curWeek()` §3, or a logger not
using `effTarget`). Table wrong → classification/wave bug; fix in 035.
Caveats: the tool stubs `ff_event` (test Big-Event re-anchoring in the app),
and the user's *goal* changes 💪 volume (Retain mode) — always ask goal + week
+ whether an event date is set before judging a prescription wrong.

**Standing rule from the incident:** any new exercise added to the catalog or
`PHASES` must be checked against `purposeFor()` — string-matching names into
training logic is inherently fragile. Domain rationale (why ⚡ must hold full
doses) → `golf-fitness-domain-reference`.

---

## §7 · "Blank page / broken boot"

Three distinct causes; tell them apart in this order.

1. **Build outputs stale or hand-edited.** The root `index.html`, `app.js`,
   `styles.css`, `sw.js` are GENERATED (each carries a header:
   `/* GENERATED (minified) by scripts/build.mjs — edit src/…, not this
   file. */`). CI does not build; whatever is committed ships. Symptoms:
   "my src/ change does nothing", or "my fix disappeared" (a hand edit to a
   root file was overwritten by the next build).
   ```bash
   node scripts/build.mjs && git status --porcelain   # dirty outputs = they were stale
   ```
   Committed outputs are the deterministic product of `src/` — a clean status
   after rebuild certifies you were current. Build mechanics →
   `yardsmith-build-and-env`.
2. **Unreplaced `{{V}}` placeholders.** Templates use `{{V}}` for the content
   hash; the build replaces every instance. If a served page shows literal
   `{{V}}` (asset URLs 404, SW cache named `yardsmith-{{V}}`), someone served
   or copied a template instead of the build output.
   ```bash
   grep -c '{{V}}' index.html app.js sw.js styles.css   # must print 0 for all four
   # (note: grep exits 1 when the count is 0 — that exit code is the GOOD outcome here)
   ```
   Leaked-`{{V}}` is also a standing assertion in the audit scripts
   (`yardsmith-validation-and-qa`).
3. **Module-ordering / shared-IIFE boot error.** All of `src/js/app/*.js`
   concatenates (sorted by filename) into ONE IIFE — a single top-level
   exception kills everything after it, leaving a blank or half-dead page.
   Function declarations hoist across modules; **`var` values do not** — a new
   module whose top-level code reads another module's `var` before that file
   runs gets `undefined` and typically throws. Discriminating experiment: open
   the console (or harness `page.on('pageerror')`) — a boot-time
   ReferenceError/TypeError near the top of `app.js` means ordering; check the
   new file's numeric prefix against what it depends on, and guard like the
   codebase does (`if (typeof planState === "undefined") return;`). Contract
   details → `yardsmith-architecture-contract`.

Fastest whole-boot check: the smoke harness (zero pageerrors + `FF_BUILD` is a
10-char hash + no `{{V}}` in the body) — recipe in `yardsmith-playwright-harness`.

---

## §8 · "My Playwright test silently does nothing"

**Story** (DESIGN-CHANGES §48, lines 1016-1021 — "burned an hour"): a seed
function that CALLS another seed function breaks inside `addInitScript` —
Playwright serializes only the outer function, the closure reference throws
inside the page, and **the page silently gets NO seed**. The test then runs
against a fresh-user app (onboarding wizard on screen), and loose assertions
happily pass. Green test, nothing tested.

**Discriminating experiment:** assert the seed took, at the top of every test:

```js
const seeded = await page.evaluate(() => !!localStorage.getItem('fairwayfuel'));
if (!seeded) throw new Error('seed did not apply — is the seed self-contained?');
// also collect page errors from the very start:
page.on('pageerror', e => errs.push(String(e)));
```

Rules of thumb: seeds must be fully self-contained (inline every helper);
seed the profile under the literal key `"fairwayfuel"` (never renamed — see
CLAUDE.md) with a real `GOALS` key (`leanbulk`, not `lean`); Stats trend cards
sit behind a `hasAny` gate (`src/js/app/085-progress-stats-view.js:257`) so
they need a body/log entry to exist at all. The complete gotcha list, the
verified harness recipe, and the shipped serve/smoke/seed scripts live in
`yardsmith-playwright-harness` — load it before writing any test.

---

## §9 · "Harness reads stale data" — the `lsGet` memo cache

**Story** (`433a182` #63/doc §64): `lsGet` memoizes parsed localStorage (a
Stats render used to JSON.parse the big keys ~90 times). The cache is
invalidated by `lsSet`/`lsRemove`, by cloud-sync merges via the
`ff-external-write` window event, and by the cross-tab `storage` event
(`src/js/app/040-workout-logger.js:9-32`). A harness (or console) write that
pokes `localStorage.setItem` directly triggers NONE of those — the app keeps
serving the memoized old value. The docs' verdict when tests hit this: "the
cache working as designed" (§64) — two tests were fixed, not the cache.

**Fix in test code** — after any direct localStorage write from page context
*while the app is running*:

```js
await page.evaluate(() => {
  localStorage.setItem('ff_body', JSON.stringify(rows));
  window.dispatchEvent(new Event('ff-external-write'));   // nukes the lsGet memo
});
```

(Seeds via `addInitScript` run before the app boots, so they don't need this.)

**Same trap in app code:** any new feature writing storage directly instead of
through `lsGet`/`lsSet`/`lsRemove` bypasses both the cache AND the
`ff-data-changed` event, so its writes neither render fresh nor sync. If a
value "won't update" in the UI but is correct in DevTools → Application →
Local Storage, grep the write path for direct `localStorage.setItem` calls.
Storage-layer contract → `yardsmith-data-and-sync`.

---

## Cross-cutting triage habits

- **Reproduce before fixing, on the surface the user actually touched.** The
  speed-day reset bug survived three fixes because tests exercised the Today
  path while the button lived in the Full-week footer (`ada5c0b` #59
  post-mortem; user: "you had me feeling crazy"). If a symptom names a view
  mode ("full week", "speed day", "signed out"), test THAT state — the
  state-matrix audit standard is in `yardsmith-validation-and-qa`.
- **"Correct on main" ≠ "correct on the device."** Two incidents
  (`cf590f5`, doc §58) were bytes-in-flight, not code. Rule zero first.
- **Zero `git revert`s in this repo's history** — fixes go forward with the
  rationale in the commit message; before "fixing" behavior you find odd,
  check `yardsmith-failure-archaeology` for a settled battle you'd be
  re-fighting.
- **Ship the evidence with the fix**: a "Verified" paragraph in
  DESIGN-CHANGES.md naming what was asserted — conventions in
  `yardsmith-docs-and-writing`, gating rules in `yardsmith-change-control`.

---

## Provenance and maintenance (as of 2026-07-08, HEAD `f21930a`)

Re-verify before trusting volatile facts:

```bash
git log -1 --format='%h %s'                              # HEAD still f21930a?
grep -o 'FF_BUILD="[a-f0-9]*"' index.html                # build hash (04f691fff1 today)
grep -n 'cloud-sync.js?v=\|coach.js?v=' src/index.template.html src/sw.template.js  # pins 112 / 88 today
grep -n 'var KEYS' cloud-sync.js                         # KEYS still line 20 (26 keys)
grep -n 'var MERGE' cloud-sync.js                        # MERGE registry (line 431 today)
grep -n 'function purposeFor' src/js/app/035-training-plan.js   # line 349 today
grep -n 'renderedSt' src/js/app/070-workout-player-full-screen-guided-sessio.js  # 219-222 today
node .claude/skills/yardsmith-debugging-playbook/scripts/triage-wave.mjs --selftest  # must end "all green"
```

`triage-wave.mjs` extracts functions from `035-training-plan.js` by name +
brace-matching; if that file is refactored (functions renamed/moved), the
script fails loudly with the function name — update its `FNS` list. Line-number
citations throughout this skill drift with edits; the grep commands above
re-anchor the load-bearing ones. The live-site curl is blocked by this
sandbox's proxy (403 CONNECT as of 2026-07-08); the raw.githubusercontent
fallback was verified working here.
