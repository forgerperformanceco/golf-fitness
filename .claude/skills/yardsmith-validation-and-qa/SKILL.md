---
name: yardsmith-validation-and-qa
description: >
  WHAT counts as evidence in Yardsmith and the thresholds that define "green".
  Load when: you are about to claim a change is "verified", "tested", "works",
  or "done"; before merging/pushing any served-file change; when deciding which
  checks a change needs (UI tweak vs Train logic vs sync vs CSS); when asked to
  "check for bugs", "audit", "run the tests", or "make sure nothing broke";
  when writing a Verified paragraph for DESIGN-CHANGES.md; or when a reviewer
  asks what the acceptance bars are (44px tap targets, 11px type floor,
  11/12/13/13.5 band, scroll preservation, contrast, zero page errors,
  18/18 / 16/16). Ships the repo's first durable regression pack:
  scripts/audit-train.mjs, audit-scroll.mjs, audit-type.mjs,
  audit-contrast.mjs. Owns WHAT to assert; HOW to drive the app headlessly
  lives in yardsmith-playwright-harness.
---

# Yardsmith validation & QA — what counts as evidence

## When NOT to use this skill

- **How to boot/drive the app headlessly** (serve+launch recipe, seed library,
  every harness gotcha: self-contained seeds, `reducedMotion`, `ff-external-write`,
  GOALS keys, the `hasAny` gate, 390×844, the `"fairwayfuel"` profile key) →
  `yardsmith-playwright-harness`. This skill defines *green*; that one gets you
  a running app to measure.
- **Whether you may merge, and the release checklist** → `yardsmith-change-control`.
  Evidence from here is an *input* to that gate, never a bypass of it.
- **Build mechanics** ({{V}} hashing, dark-theme regen pipeline, watch mode,
  environment/tool versions) → `yardsmith-build-and-env`. The golden checks below
  *use* the build; they don't explain it.
- **Doc formats** (full DESIGN-CHANGES entry template, BRAIN update duty, doc
  precedence) → `yardsmith-docs-and-writing`. This skill owns only the
  **Verified paragraph** convention inside that entry format.
- **Worked first-principles proofs** (vm-sandbox sync-merge proof recipe, wave-engine
  unit-case verification, perf profiling) → `yardsmith-proof-and-analysis-toolkit`.
- **Debugging a failure you've observed** → `yardsmith-debugging-playbook`
  (first question there: which FF_BUILD is the device on?).

---

## 1. The standard: what "Verified" means here

A change to this app is **Verified** when — and only when —

1. **A headless script drove the real BUILT app** (repo-root outputs, rebuilt
   first) **and asserted the behavior**, with **zero page errors and zero
   console errors** throughout, and
2. that evidence is **recorded as a `**Verified**` paragraph in
   `DESIGN-CHANGES.md`** stating exactly what was asserted and the pass counts.

Everything else is weaker and does not count on its own:

- **Screenshots are supplements, never the evidence.** They get eyeballed for
  layout sanity (wraps, clips, both themes) after the assertions pass —
  DESIGN-CHANGES entries say "screenshots eyeballed" *in addition to* named
  assertion counts, never instead of them.
- "I read the code and it looks right" is not evidence. The repo's own
  post-mortem (DESIGN-CHANGES.md §60, commit `ada5c0b`) is the reason: tests
  exercised the Today path while the broken reset button lived in `logFoot` —
  **"green tests, real bug."** Owner's words, preserved in the doc: *"you had
  me feeling crazy. Make sure you are checking for bugs along the build."*
- Manual clicking in a browser is exploration, not verification — it leaves no
  paragraph and no pass count.

The convention is declared in `YARDSMITH-BRAIN.md` (Release discipline, line
375, step 5): *"Verify with the headless Playwright pattern (chromium at
`/opt/pw-browsers`, `--no-sandbox`, seed localStorage, build first, assert
behavior)."* `DESIGN-CHANGES.md` contains 21 `**Verified` paragraphs (count as
of 2026-07-08) — that file is the de facto test log of the project.

### The Verified paragraph (write one for every shipped change)

Append to your DESIGN-CHANGES entry (full entry format →
`yardsmith-docs-and-writing`):

```
**Verified** (scripts/audit-train.mjs + a change-specific script): <the
behavior asserted, with numbers — e.g. "Full-week logged day exposes a working
[data-clearday] reset; logged button spans ~91% of its card; two-tap clears
it">; audit-train 18/18, audit-scroll 16/16, audit-type clean, audit-contrast
zero under 3.0:1; zero page errors; 390×844 light+dark screenshots eyeballed.
```

Name the scripts, state the counts, state zero-errors explicitly. A Verified
paragraph that says only "tested, works" is a doc bug.

---

## 2. The honest history — and what this pack changes

**No test file had EVER been committed to this repo before this skill library**
(verified 2026-07-08: `git ls-files` has no test/audit .mjs;
`git log --all --diff-filter=A` over all 281 commits shows no `test-*.mjs` or
`audit-*.mjs` ever added — the only "test" file in history is the Capacitor
template's `ExampleUnitTest.java` scaffold). Every suite named in
DESIGN-CHANGES.md — `test-sync.mjs` (25 checks), `test-train3.mjs`,
`test-player.mjs`, `test-plscroll.mjs`, the original `audit-train.mjs`, all
~24 of them — lived in a session scratchpad and **died with its session**.
What survived was the prose: the Verified paragraphs and the documented
invariants.

**The four scripts in `scripts/` here are the project's first durable
regression pack.** They were recreated from the documented invariants
(DESIGN-CHANGES §§4, 60, 66, 67), run green against the committed build, and
are now repo-tracked. Future sessions: **run them instead of rewriting them**,
and extend them in place — that is the whole point. Per-change feature scripts
can stay ephemeral; the audits must not regress to scratchpad-only.

Pass counts **as of 2026-07-08, HEAD `f21930a`, build `04f691fff1`**:

| Script | Result | Historical standard it recreates |
|---|---|---|
| `scripts/audit-train.mjs` | **18/18 clean** (9 states × light/dark) | §60's 18/18 |
| `scripts/audit-scroll.mjs` | **16/16 preserve scroll** | §66's 16/16 |
| `scripts/audit-type.mjs` | **clean** across 7 surfaces; band exactly 11/12/13/13.5; only `.ws-date` renders at 10.5 | §67 |
| `scripts/audit-contrast.mjs` | **clean** — 0 of 1408 text nodes under 3.0:1 (6 views × 2 themes; 1 allowlisted known defect, see §5) | §4 |

Run them (from anywhere in the repo; each is fully self-contained — embeds its
own static server, Playwright resolution and Chromium discovery):

```
node scripts/build.mjs                                                  # audits drive the BUILT output
node .claude/skills/yardsmith-validation-and-qa/scripts/audit-train.mjs
node .claude/skills/yardsmith-validation-and-qa/scripts/audit-scroll.mjs
node .claude/skills/yardsmith-validation-and-qa/scripts/audit-type.mjs
node .claude/skills/yardsmith-validation-and-qa/scripts/audit-contrast.mjs
```

Exit code 0 = green; failures print with locators. Env overrides (rarely
needed): `YS_ROOT=<repo root>`, `PW_CHROME=<chromium binary>`, `DEBUG=1`
(type/contrast histograms). Each run takes ~20–60s.

---

## 3. Acceptance thresholds — the bars that define "green"

| # | Invariant | Threshold | Enforced by | Origin |
|---|---|---|---|---|
| 1 | Page/console errors | **Zero**, in every state, both themes (sandbox network noise `net::ERR`/`Failed to load resource` filtered — nothing else) | all four audits + every ad-hoc script | every Verified paragraph |
| 2 | Leaked placeholder text | No `undefined`, `NaN`, `[object Object]`, or unreplaced `{{V}}` in rendered text | audit-train | §60 |
| 3 | Tap targets | ≥ 44px tall: `.planview-seg button`, `.ws-chip`, `.logbtn` (the §60 set) + `.pl-start`, `.sb-go` | audit-train | §60 (bumped 33/37/39px → 44) |
| 4 | Log button width | `.logbtn` ≥ 0.8 × its `.day-foot` width (no half-pills) | audit-train | §59/§60 |
| 5 | Warm-up folds | `details.prelift` never `[open]` by default, any state | audit-train | §55–§58 (settled: collapsed everywhere) |
| 6 | Reset reachability | Every logged day exposes a reset (`[data-clearworkout]` finish-bar OR `[data-clearday]` logFoot) in every view mode | audit-train | §59/§60 — the bug that survived its own fix |
| 7 | Type floor | No text under 10.5px, ever; **words never under 11px** — 10.5px only for the §67 micro-label allowlist (week-strip dates `.ws-date`, swap badge, chart numbers, option tags, YOU pill) | audit-type | §67 |
| 8 | Type band | Every rendered size in [11, 13.5] is EXACTLY 11 / 12 / 13 / 13.5 | audit-type | §67 |
| 9 | Scroll preservation | Every in-place re-render keeps the EXACT scroll position (window scrollers and overlay scrollers). Only two intentional resets exist: tab switch in `setView`, day switch in the Fuel week sheet; the player resets only on station *change* (070:216-223) | audit-scroll | §64–§66 |
| 10 | Contrast | Every visible text node ≥ **3.0:1** against its effective background, in BOTH themes (this pack's enforced floor — §4's fixes were all "under 3:1". Full WCAG AA 4.5:1 for small text is NOT currently met everywhere; `DEBUG=1` on audit-contrast lists the 3.0–4.5 band for a future pass) | audit-contrast | §4 |
| 11 | State-matrix breadth | Train changes verified across all 9 states × both themes = **18/18**; scroll changes across all 16 interaction points = **16/16** | audit-train / audit-scroll | §60 / §66 |
| 12 | Build integrity | Committed root outputs byte-match a rebuild; dark-theme regen idempotent; boot shows a 10-char `FF_BUILD`, no `{{V}}` | golden checks (§6) | §11, §57 |

Thresholds are floors, not targets — a change-specific script must ALSO assert
the change's own behavior (the audits only prove you didn't break the standing
invariants).

---

## 4. Which evidence which change needs (the full-battery discipline)

The historical convention: before shipping **structural** changes, prior
suites are re-run — §67 shipped only after "full battery green —
home2/train3/stats3/fuel2, audit-train 18/18, audit-scroll 16/16, plscroll,
contrast audit zero fails". The named feature suites are gone (see §2), so the
modern equivalent is: **the four durable audits + a change-specific script +
the golden checks.**

| Change type | Required evidence before commit |
|---|---|
| Copy/docs only (no served file) | none of this — but keep docs-of-record current |
| Any CSS change | audit-contrast + audit-type (+ dark regen — see `yardsmith-build-and-env`), plus audit-train if Train-area selectors are touched |
| Train tab / plan / logger logic | **audit-train 18/18** + a change-specific script asserting the new behavior in the state(s) it lives in — test the surface the control actually renders on (Today AND Full-week AND speed day; §60's lesson) |
| Any view's render function (`renderDash`, `calc`, `renderPhase`, `renderProgress`, `renderAccount`, `renderGameDay`) or a new in-place re-render | **audit-scroll 16/16** — and if you added an interaction that re-renders in place, ADD it to the INTERACTIONS table in audit-scroll.mjs in the same PR |
| New text/labels/font sizes | audit-type (band discipline: pick from 11/12/13/13.5 below 14px) |
| cloud-sync.js / merge / CAS / new synced key | vm-sandbox proof (below) + boot smoke; pin bump + MERGE/KEYS duty → `yardsmith-data-and-sync` |
| Build scripts, templates, sw.template.js | golden checks (§6) + boot smoke + one full audit pass |
| Structural / cross-cutting (module moves, storage layer, nav) | **everything**: all four audits + golden checks + change-specific script |
| supabase/functions TypeScript | esbuild syntax-check (the documented §40 pattern — there is no Deno test runner here) + the curl/SQL runbooks in `yardsmith-run-and-deploy` |

Merging is gated by `yardsmith-change-control` regardless of what's green here.

---

## 5. The audit pack — design, known gaps, how to extend

All four scripts share the same embedded core: static server over the repo
root, Playwright from repo `node_modules` (`playwright-core`) or the global
`/opt/node22/lib/node_modules/playwright`, newest Chromium under
`/opt/pw-browsers/`, 390×844, `reducedMotion:'reduce'`, seeds via one
`addInitScript` that writes JSON to localStorage. They may LOOK like the
harness skill's scripts — that's deliberate; they must run standalone even if
the sibling skill is deleted.

### audit-train.mjs — the state matrix (9 × light/dark = 18)

States: `not-started`, `today-lift-fresh`, `today-lift-manual`,
`today-lift-logged`, `speed-fresh`, `speed-logged`, `deload-week`,
`fullweek-fresh`, `fullweek-logged` — all 9 documented §60 states recreated,
none dropped. Non-obvious seed mechanics (all verified against source):

- Day names carry a real em dash: `"Day 1 — Lower (Quads)"`; `ff_log` keys are
  `"<week>|<day name>"` (040-workout-logger.js:144).
- The featured card is `nextWorkout()` = first *un-logged* non-rest day
  (070:922) — so "logged" states must either log the earlier days too or click
  the day's week-strip chip (`focusChip` in the script) to focus it.
- `speed-fresh` = start 3 days ago (day 4 of the `days5` week is the speed
  day) with Days 1–2 logged; `deload-week` = start 35 days ago (week 6).
- A finished session needs `finishedAt` for the "✓ Session finished" CTA;
  bare existence in `ff_log` is enough for logFoot's logged/reset state.

**Known gap (deliberate):** `.rest-check` (rest-day check-off) measures
**42px** tall — it was never in §60's 44px fix set, so it is excluded from the
hard-fail selector list (documented in the script). Candidate one-line CSS
fix for a future UI pass; when bumped, add `.rest-check` to the audit's
selector list in the same PR.

**Extend:** new Train state (e.g. peak week, event-anchored taper, 4-day
split) → add a row to `STATES` with seed + `expect`; new invariant → add to
`sweep()`. Keep 9×2 as the floor; growing the matrix is always allowed,
shrinking it needs a DESIGN-CHANGES entry saying why.

### audit-scroll.mjs — 16 in-place re-render points

All 16 documented §66 interactions recreated, none dropped: Home meal
check-off; Fuel meal ✓ / "Show the numbers" / day-rating chip; Stats fold open
+ close (`[data-pftoggle]` → full `renderProgress`); Train equipment preset +
speed-day Field/Gym seg; Round holes + transport chips; Account goal-yards /
frequency / workout-time / theme chips; logger-modal set check-off (scroller =
`#logBody`); history-sheet delete deep in a 15-entry list (scroller =
`.swap-card`, two-tap armed delete).

Two measurement subtleties the script handles (learned building it):

- Clicks are dispatched with `el.click()` *inside* the page — Playwright's
  actionability auto-scroll would otherwise move the page between the
  "record" and "compare" reads.
- The recorded window offset is parked ≥250px above max-scroll: a re-render
  that legitimately shrinks the page by a few px would otherwise CLAMP
  `scrollY` and read as a false failure. The assertion itself stays EXACT
  equality (before === after), plus "recorded scroll was non-zero" so a check
  can't pass vacuously.

**Extend:** any new button that re-renders its container in place gets a row
in `INTERACTIONS` (same PR as the feature). `pre`/`pre2` hooks handle setup
clicks (opening folds/modals).

### audit-type.mjs — floor + band across 7 surfaces

6 views + the Workout Player, seeded lived-in account. Asserts the §3
thresholds 7–8. The 10.5px micro-label allowlist is an explicit selector list
(`MICRO_OK`) — on the current build only `.ws-date` actually renders at
10.5px; the other allowlisted selectors are §67's documented micro-label set,
kept so legitimate micro-labels don't false-fail later. New text below 11px
that isn't in the allowlist fails loudly. `DEBUG=1` prints the size histogram
with per-size sample text — use it to locate any violation in seconds.

### audit-contrast.mjs — every text node, both themes, floor 3.0:1

Walks every visible text node on the 6 views × 2 themes (1408 nodes on the
current build), composites the effective background up the ancestor chain
(alpha-aware), and computes the WCAG 2.x ratio. Nodes over background-images/
gradients are skipped and counted (~314 — mostly hero cards; a ratio against
a gradient is undefined; if you need those covered, screenshot-sample them in
a change-specific script).

**Enforced floor: 3.0:1** — the level §4's four findings were fixed to. This
is deliberately NOT full WCAG AA (4.5:1 small text); the app's muted/hint text
lives between 3.0 and 4.5 by design. `DEBUG=1` lists that band if an
accessibility pass ever wants to raise the bar.

**Known defect allowlist (1 entry):** `.tip.tip-signin .tip-cta` ("Sign in —
it's free", signed-out Home) is white on `#e8923a` = **2.44:1 in BOTH themes**
(`src/css/styles.css:1450`; the dark block never overrides the CTA
background). **This audit found it when first built** — the exact §4 violation
class, introduced after that pass. It is WARN-not-FAIL so the pack gates on
new regressions. The fix is a normal src/ CSS change (darken the orange →
dark-theme regen → rebuild → delete the allowlist branch in the script →
re-run green), routed through `yardsmith-change-control`.

---

## 6. Golden checks — the build-integrity floor

Run these when touching build scripts/templates, when a rebase touched
generated outputs, or when anything smells stale. All three PASS as of
2026-07-08 @ `f21930a`.

**1. Build determinism — rebuilt outputs byte-match committed ones.** Use the
shipped, run-green implementation (it copies to scratch, resolves esbuild by
reusing repo `node_modules` or running `npm ci` in the copy, and checks
dark-theme idempotence too):

```
bash .claude/skills/yardsmith-build-and-env/scripts/check-build-determinism.sh
```

If you must do it by hand, never run the build in the working repo just to
check (it would dirty outputs mid-review); copy to scratch — INCLUDING
`package-lock.json` — and `npm ci` there (the repo ships with no
`node_modules`, so a bare `node scripts/build.mjs` in the copy dies with
"Cannot find module 'esbuild'"):

```
SP=$(mktemp -d)
cp -r src scripts package.json package-lock.json index.html app.js styles.css sw.js "$SP/"
cd "$SP"
npm ci --no-audit --no-fund
sha256sum index.html app.js styles.css sw.js > before.sha
node scripts/build.mjs
sha256sum -c before.sha   # 4× OK = committed outputs are exactly build(src)
```

Do NOT improvise `npm install` without the lockfile: an esbuild version other
than the lockfile pin legitimately produces different minified bytes (per
`yardsmith-build-and-env` §6), which would false-fail this check.

A mismatch (with the pinned esbuild) means someone hand-edited a generated
root file or forgot to commit a rebuild — fix by rebuilding from src/ and
committing both (rule and rationale → `yardsmith-change-control`).

**2. Dark-theme idempotence.** Covered by the same shipped script above; by
hand, in the same scratch copy:

```
python3 scripts/gen-dark-theme.py && node scripts/build.mjs
sha256sum -c before.sha   # still OK = generator is a fixed point on current CSS
```

(Currently prints `dark theme: 279 rules x2 variants, 1 media-scoped` and the
hash stays `04f691fff1`.) If this changes bytes on an untouched tree, someone
edited inside the GENERATED-DARK markers by hand — regenerate from the
script's CORE list (pipeline → `yardsmith-build-and-env`).

**3. Boot smoke.** The harness skill ships it:
`node .claude/skills/yardsmith-playwright-harness/scripts/smoke.mjs`. Green
means: zero page errors, `window.FF_BUILD` is a 10-char hash matching
`index.html`, no `{{V}}` in served HTML, seeded Home renders. Every audit in
this pack independently re-asserts the zero-error part on every boot.

---

## 7. Non-browser evidence: the vm-sandbox pattern for sync

Browser suites cannot prove merge/CAS semantics (you'd need two devices and a
real backend). The house pattern — established by the (session-lost)
`test-sync.mjs`, Verified paragraph in DESIGN-CHANGES.md §61 — is:

- Load the **real `cloud-sync.js` source** (repo root — it's an IIFE reading
  `window`/`localStorage`/`document`) into a `node:vm` context whose globals
  are mocks: a localStorage stub over a Map, a `window.supabase.createClient`
  returning a scripted mock (rows, `.eq("rev", …)` responses, injected CAS
  conflicts), stub `document`/events.
- Then assert the merge registry semantics directly: both devices' additive
  keys survive a login merge; a concurrent push CAS-conflicts, pulls, merges,
  lands with both sides' data (rev advances without blind upserts); tombstoned
  entries stay deleted; a no-`rev` schema falls back to legacy upsert and
  still unions. (The registry: `MERGE` at cloud-sync.js:431, `mergeBlob` at
  :441, CAS update at :281.)

**Evidence bar for any cloud-sync.js change: a vm-sandbox run proving those
four behaviors, recorded in the Verified paragraph** — a browser boot alone is
NOT sufficient evidence for sync. Full worked recipe + example →
`yardsmith-proof-and-analysis-toolkit`. Key catalog and MERGE/KEYS duty →
`yardsmith-data-and-sync`.

---

## 8. Adding validation for a new feature — the checklist

1. **Rebuild** (`node scripts/build.mjs`), always, before any measurement.
2. Write a **change-specific script** asserting the new behavior (harness
   recipe + seeds → `yardsmith-playwright-harness`). Assert on **every surface
   the control renders on** — enumerate the states/views first (§60's lesson);
   if the feature lives in the Train tab, that means the audit-train state
   list, not just Today.
3. **Extend the pack in the same PR** where the feature touches its domain:
   new Train state → `STATES` in audit-train; new in-place re-render →
   `INTERACTIONS` in audit-scroll; new micro-label → `MICRO_OK` in audit-type
   (only if genuinely numeric/badge — words stay ≥11px); fixed a known gap →
   delete its allowlist entry.
4. Run the **audits relevant to the change type** (table in §4); run the whole
   pack + golden checks for structural changes.
5. **Record the Verified paragraph** with script names and pass counts; update
   the pass counts in this SKILL.md if the denominators changed (18/18, 16/16
   are the current floors).
6. If an invariant cannot be met, do not silently weaken a threshold: either
   fix the feature, or add a **documented allowlist entry in the script + a
   note here + a DESIGN-CHANGES entry** (the `.rest-check` / `.tip-cta`
   precedents). A threshold change itself is a decision — record it (doc duty
   → `yardsmith-docs-and-writing`).

**Flakiness policy:** these audits are deterministic (fixed seeds, reduced
motion, rAF-settled reads); the pack was run twice back-to-back green before
shipping. If a check flakes for you, that is a bug in the check — fix or
remove it rather than retry-until-green; a flaky check is worse than no check
because it trains sessions to ignore red.

### Findings this pack has already produced (candidate fixes, not yet done)

- `.tip.tip-signin .tip-cta` white-on-`#e8923a` = 2.44:1 both themes
  (styles.css:1450) — real contrast bug, allowlisted in audit-contrast.
- `.rest-check` 42px tall — under the 44px tap standard, excluded from
  audit-train's hard-fail set.

Both are ~one-line CSS fixes; whoever takes them: fix in `src/css/styles.css`,
regen dark theme, rebuild, remove the allowlist/exclusion, re-run the pack
green, record in DESIGN-CHANGES.

---

## Provenance and maintenance

All facts verified 2026-07-08 against HEAD `f21930a`, build `04f691fff1`.
Re-verify anything load-bearing before relying on it:

- Pass counts / pack health: just run the four commands in §2 (rebuild first).
  If counts differ from this file, trust the run and update this file.
- Current build hash + pins: `grep -o 'FF_BUILD="[a-f0-9]*"' index.html`;
  `grep -o 'cloud-sync.js?v=[0-9]*\|coach.js?v=[0-9]*' index.html sw.js`
  (were `04f691fff1`, v=112, v=88).
- "No test ever committed before this pack":
  `git log --all --diff-filter=A --name-only --format= | grep -E 'test|audit'`
  (needs full history — if `test -f .git/shallow` says shallow, unshallow
  first; → `yardsmith-build-and-env`).
- Verified-paragraph count: `grep -c '^\*\*Verified' DESIGN-CHANGES.md` (21).
- Section anchors cited here: §4 ≈ line 105, §60 ≈ 1389, §61 ≈ 1345,
  §65 ≈ 1186, §66 ≈ 1159, §67 ≈ 1121 of DESIGN-CHANGES.md
  (`grep -n '^## ' DESIGN-CHANGES.md`). Note the file's sections run
  1–51 then newest-first 67…52.
- Environment paths (may drift): Playwright global
  `/opt/node22/lib/node_modules/playwright` (1.56.1), Chromium
  `ls /opt/pw-browsers/` (chromium-1194). The scripts self-discover both and
  take `PW_CHROME`/`YS_ROOT` overrides.
- Known-gap wording in the scripts vs reality: re-run audit-contrast with the
  allowlist branch temporarily removed to confirm `.tip-cta` is still 2.44:1,
  and measure `.rest-check` height in audit-train's sweep if a CSS pass
  touched it.
- Threshold provenance: the 3.0:1 contrast floor, the §60 tap-target set, and
  the micro-label allowlist are THIS pack's codification of prose standards —
  the original scratchpad scripts are lost (see §2), so exact historical
  parameters could not be diffed. The invariants match the documented
  assertions; parameters were chosen to be the strictest values the current
  committed build actually satisfies.
