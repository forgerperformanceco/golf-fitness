---
name: yardsmith-proof-and-analysis-toolkit
description: >
  "Prove it, don't just install it" — Yardsmith's first-principles proof
  recipes, each with a worked example from this repo's own history and, where
  possible, a shipped runnable script. Load this when you need to: verify
  classification-driven logic with enumerated unit cases (the 6932f28
  wave-engine pattern); prove a cloud-sync.js merge/CAS/tombstone change
  without a browser (vm-sandbox, scripts/sync-proof.mjs); profile
  boot/interaction cost with real numbers (scripts/profile-ui.mjs); translate
  a research effect size into an ordering/dose decision (Brennan 2024 → speed
  day); prove a generator is deterministic/idempotent; hand-verify a number
  the app shows (e1RM, wave dose, macro split); or refute a reported "bug"
  adversarially (the FF_BUILD stale-build discriminator). Keywords: prove,
  verify, unit cases, vm sandbox, mock Supabase, CAS, tombstone, profile,
  DOMContentLoaded, JSON.parse cost, determinism, idempotence, effect size,
  zr, hand-check, refutation, stale build.
---

# Yardsmith proof & analysis toolkit

Verified against HEAD `f21930a`, build `04f691fff1`, 2026-07-08. All file:line
references checked at that commit; re-verify per the Provenance section if the
repo has moved.

This repo's working standard: **a change is not done when the code compiles or
even when a demo looks right — it's done when an experiment that could have
falsified it ran and didn't.** Every recipe below is that standard turned into
steps, each anchored to a real episode from this repo where the recipe caught
(or would have caught) a real defect. The recipes are ranked roughly by how
often you'll need them.

**Shipped runnable proofs** (all run green 2026-07-08; re-run any time — they
touch nothing, exit 0 = green):

| Script | Proves | Green output today |
|---|---|---|
| `scripts/wave-cases.mjs` | Wave-engine classification + dose pipeline (Recipe 2) | `89/89 cases green` |
| `scripts/sync-proof.mjs` | Sync merge/CAS/tombstone/no-rev semantics (Recipe 3) | `24/24 checks green` |
| `scripts/profile-ui.mjs` | Boot + interaction cost on a heavy account (Recipe 4) | DCL ~95–180ms, 24 parses at DCL, 1 parse on tab→Stats, `all assertions green` |

```
node .claude/skills/yardsmith-proof-and-analysis-toolkit/scripts/wave-cases.mjs
node .claude/skills/yardsmith-proof-and-analysis-toolkit/scripts/sync-proof.mjs
node .claude/skills/yardsmith-proof-and-analysis-toolkit/scripts/profile-ui.mjs
```

`profile-ui.mjs` imports the serve/launch library from
`yardsmith-playwright-harness/scripts/serve.mjs` (that skill owns the launch
recipe); the other two need nothing beyond Node and the repo.

**When NOT to use this skill.** What thresholds count as "green" and which
checks gate a merge → `yardsmith-validation-and-qa` (it owns the audit pack and
the evidence bar; this skill owns the *techniques* and worked examples). How to
drive the app headlessly (server, Chromium paths, seed laws) →
`yardsmith-playwright-harness`. The domain formulas themselves (Epley, wave
params, macro math, Brennan table) → `golf-fitness-domain-reference`. The
incidents referenced here as history → `yardsmith-failure-archaeology`.
Actually committing/merging a proven change → `yardsmith-change-control`. The
philosophical evidence bar (one mechanism explains all observations, assigned
refutation) → `yardsmith-research-methodology`; this skill is its toolbox.

---

## Recipe 1 — Effect-size reading → app decision

**When to reach for it.** Any time research evidence is supposed to change what
the app *does*: ordering exercises, setting a dose, adding/removing a feature,
writing coaching copy. The failure mode this prevents: cherry-picking a study
that supports what you already built, or treating "in the literature" as a
design spec.

**Steps.**

1. Get the pooled effect size with its confidence interval, not the abstract's
   adjective. For clubhead speed the anchor is Brennan et al. 2024 (pooled
   `zr` with 95% CI) — the full ranked table lives in
   `CLUBHEAD-SPEED-REFERENCE.md` §10.1 (around line 351) and is restated with
   definitions in `golf-fitness-domain-reference`.
2. **Rank, then map rank → prominence.** The strongest correlates get first
   position, most sets, and the headline copy. Weaker-but-significant gets
   included but demoted. This is a *relative* read — effect sizes ordering
   things is far more robust than any single absolute number.
3. **Use the negative results as hard constraints, not omissions.** A CI that
   crosses zero means the app must not *claim* or *dose for* that pathway —
   but the feature can survive under a different, honest justification.
4. Check the moderators before transferring: population (elite vs amateur),
   measure (the "best throw variant is population-dependent" note in §10.1),
   and study size. Where the literature is silent (in-session order, rest),
   say so and extrapolate from general S&C practice at lower confidence —
   exactly what §10.3 does.
5. Encode the decision where it executes AND record why (doc duty →
   `yardsmith-docs-and-writing`).

**Worked example (verified in the shipped code).** Brennan 2024: jump impulse
zr = 0.82 [0.63–1.02] (strongest), explosive upper-body 0.67 > non-explosive
0.48, flexibility **−0.04 [−0.33 to 0.26] NOT significant**. Three app
decisions fell out mechanically:

- **Ordering/dose:** the Speed & Power day *leads* with a countermovement jump
  (its card copy: "The #1 physical predictor of clubhead speed"), then
  rotational + seated throws, 3–5 reps, explosive first — see
  `src/js/app/035-training-plan.js:11-21` (day note: "Jumps and throws are the
  strongest predictors of clubhead speed, so they lead").
- **The negative result used, not buried:** flexibility −0.04 NS did NOT
  delete the mobility feature — it *reframed* it. The mobility screen is
  explicitly "swing insurance", never a speed lever
  (`src/js/app/065-mobility-screen-…js:1-7`: "flexibility is NOT a speed
  lever"), and no speed claim anywhere rides on mobility.
- **Honest demotion:** overspeed swings, whose independent evidence is
  acute-only, are labeled in the card itself "Modest evidence — the add-on,
  not the main event" (035:21, 32) and get their own capped ramp
  (`overspeedDose`, 035:445) instead of the wave's progression.

**What "proven" looks like.** You can state, for each ordered element of the
feature: the effect size that put it there, the CI, and where a
zero-crossing CI constrained a claim. If you can't, the design is taste, not
evidence — which is allowed, but must be recorded as taste. Changing the Speed
& Power day specifically? Route through `yardsmith-speed-day-campaign`.

---

## Recipe 2 — Enumerated unit-case verification of classification-driven logic

**When to reach for it.** Whenever behavior is derived from **string-matching a
name** (regex classifiers) or any small pure function whose output fans out
into many downstream decisions. In this repo: `purposeFor()` (035:349) drives
the entire wave's dose logic; `exGroupFor`/`equipNeedsFor` (040/035) classify
250+ catalog lifts. The failure mode: a regex silently misfiles ONE name and a
correct-looking pipeline produces a wrong prescription for weeks.

**The incident that created the pattern** (commit `6932f28`, 2026-07-07 —
message is the primary source, `git show 6932f28 --stat` after un-shallowing
per `yardsmith-build-and-env`): "Seated chest throw" and "Cable lateral chop"
classified as 💪 hypertrophy → Peak cut them 3×4 → 1×4 ("power drills gutted
in the weeks meant to keep speed work crisp"); "Speed bench press" matched
`/Bench Press/` → got the 🏋️ "drop 2 reps, go heavier" prescription — exactly
wrong for a velocity lift. The fix reordered rotation before power, broadened
the regexes, excluded "Landmine Press", and was **verified with 37
classification cases + 10 wave-adjustment cases (unit) + the rendered plan at
weeks 1/4/19** (Speed bench holds 4×4 through Intensify, chest throw holds
3×4, both trim exactly one set at Peak, Barbell Bench still intensifies to
4×3).

**Steps.**

1. **Extract the real functions, don't reimplement them.** A reimplementation
   proves your understanding, not the code. The shipped
   `scripts/wave-cases.mjs` slices the actual `function` declarations out of
   `src/js/app/035-training-plan.js` by name (brace-balancing, comment- and
   string-aware) and evaluates them with stubs for the only three
   cross-module symbols they touch (`state`, `lsGet`, `planStart` — the IIFE
   scope contract is in `yardsmith-architecture-contract`).
2. **Enumerate cases across the whole input taxonomy**, not just the bug:
   every class (🏋️/💪/⚡/🌀), every regression name, every deliberate
   exclusion, the ordering-sensitive names ("Landmine rotational throw" must
   hit rotation *before* power), and the guards (`plainReps` never shifts
   "3 × 40 yd").
3. **Add wave/dose cases at the phase boundaries** — weeks 1 (accumulate), 4
   (intensify), 6 (deload), 19 (peak) — plus mode interactions (Retain-mode
   `goal:"cut"` trims stack to a floor of 2, never below).
4. **Guard the fixture data against drift**: the script asserts the authored
   doses it hardcodes ("Speed bench press" 4×4 etc.) still exist verbatim in
   035, so a future re-author of the plan turns the test red instead of
   silently testing stale numbers.
5. **Finish at the rendered level** for at least a spot check: unit cases
   prove the pipeline, a rendered-plan look at weeks 1/4/19 (harness →
   `yardsmith-playwright-harness`; Train-state matrix → audit-train in
   `yardsmith-validation-and-qa`) proves the pipeline is what the UI calls.

**Worked example.** Run it:

```
node .claude/skills/yardsmith-proof-and-analysis-toolkit/scripts/wave-cases.mjs
# → A. purposeFor classification (41 cases) … 89/89 cases green
```

Covers exactly the 6932f28 regression set: `purposeFor("Seated chest
throw")==="⚡"`, `purposeFor("Cable lateral chop")==="🌀"`, `purposeFor("Speed
bench press")==="⚡"`, `purposeFor("Landmine Press")==="💪"` (deliberate
exclusion), and the commit's dose numbers: Speed bench `4 × 4` unchanged at
week 4, `3 × 4` at week 19; Barbell Bench `4 × 5 (…)` → `4 × 3 (…)` at
intensify, `2 × 5 (…)` at peak. Plus `overspeedDose` ramp (2×5 → 3×5 → 4×5,
back to 2×5 on deload/peak), the `ff_event` peak re-anchor, and `prescribeW`
(deload 200 → 120).

**What "proven" looks like.** Case count and green total in the Verified
paragraph ("89/89 unit cases + rendered plan at weeks 1/4/19"), AND the rule
the incident encoded: **any new name added to `EXERCISE_DB`, `EX`, or `PHASES`
gets run through this script (add it as a case) before it ships.**

---

## Recipe 3 — vm-sandbox proof of sync semantics

**When to reach for it.** ANY change to `cloud-sync.js` (merge functions, the
`MERGE` registry, CAS/push logic, tombstones, `syncOnLogin`), or adding a new
roaming `ff_*` key. A browser boot **cannot** prove merge semantics — you'd
need two devices and a live backend — and this is the subsystem whose failures
read as "the app forgot my workouts" (the multi-incident saga →
`yardsmith-failure-archaeology`). The evidence bar that a vm-sandbox run is
*required* for cloud-sync changes is owned by `yardsmith-validation-and-qa`
§7; this is the recipe and the working example.

**The trick.** `cloud-sync.js` is a self-contained IIFE that only touches
`window`, `document`, `localStorage`, `sessionStorage`, `location`, timers,
and `window.supabase.createClient`. So: run the **real file, byte-for-byte**
inside `node:vm` with those globals mocked, and script the "cloud" as an
in-memory row. Key mock decisions (all in `scripts/sync-proof.mjs`):

- `window` = a real Node `EventTarget` (Node ≥ 18 has `EventTarget`, `Event`,
  `CustomEvent` as globals) → the file's own `addEventListener`/
  `dispatchEvent` wiring just works.
- Pre-set `window.supabase = { createClient: () => mockClient }` — `loadSdk()`
  short-circuits on `window.supabase` and never creates a script tag.
- Seed a fake `sb-…auth-token` localStorage key so `hasSession()` is true and
  `ensureSb()` runs at boot; capture the `onAuthStateChange` callback and fire
  `("SIGNED_IN", {user})` yourself to trigger `syncOnLogin()`.
- Set `window.FF_ACCOUNT_TAB = true` to skip the floating sign-in pill (less
  DOM to stub).
- The mock query builder is *thenable* (`then()` on the builder object), so
  `await sb.from("profiles").update(...).eq(...).select("rev")` and
  `.maybeSingle()` both resolve against the same in-memory row with a real
  `rev` counter. It counts `upserts` (blind writes) and `casMisses`
  (guarded updates that matched zero rows) so the proof can assert the CAS
  path *actually fired* rather than passing vacuously.
- **Flush without waiting out the 12s coalesce:** dispatch `new
  Event("pagehide")` on `window` — cloud-sync's pagehide handler calls
  `push()` immediately.
- Stub `setInterval` to a no-op (the file's 30s safety poll would otherwise
  hold the process open); stub `location.reload` to a counter (the login-merge
  reload is one of the assertions).

**Worked example.** Run it:

```
node .claude/skills/yardsmith-proof-and-analysis-toolkit/scripts/sync-proof.mjs
# → S1..S4 … 24/24 checks green
```

The four scenarios mirror the Verified paragraph of DESIGN-CHANGES.md §61
(the sync-integrity PR, commit `5473249`):

| # | Scenario | Asserts |
|---|---|---|
| S1 | Login merge | both devices' `ff_rounds` survive; settings (`fairwayfuel.goal`) take the cloud value; merged blob pushed (rev 1→2 via CAS, zero upserts); exactly ONE reload, `ff_synced_once` guard set |
| S2 | Concurrent push | device 2 moves the cloud first → this device's `UPDATE … WHERE rev=` hits zero rows (`casMisses ≥ 1`) → pull, `mergeBlob`, retry → final cloud holds A+B+C+D rounds AND the other device's settings change; zero blind upserts |
| S3 | Tombstones | a deletion with ts newer than the entry holds through the merge (locally and in the pushed cloud blob); a re-log with a NEWER `_ts` beats its tombstone and the outlived tombstone is pruned |
| S4 | No-rev schema | PostgREST "column profiles.rev does not exist" → `revMode=false` legacy upsert fallback, and the union merge still runs (both sides' rounds in the upserted blob) |

**What "proven" looks like.** All four behaviors green against your changed
`cloud-sync.js`, recorded with check counts. If you add a merge function or a
key to `MERGE`, add a scenario (or extend S1) *in the same change* — the
registry's own comment says a missed entry "means cross-device data loss for
that key" (cloud-sync.js:426-430). Key shapes and the add-a-key checklist →
`yardsmith-data-and-sync`. Remember `cloud-sync.js` edits also bump the `?v=`
pin in BOTH templates (`yardsmith-change-control`).

---

## Recipe 4 — Performance profiling with numbers

**When to reach for it.** Before AND after any "make it faster" change; when
boot or a tab switch feels heavy; when reviewing a change that touches the
storage layer or render loops. The rule: **no perf claim without a
measurement pair on the same machine.** "Feels snappier" has zero evidential
value here.

**The incident/worked example** (DESIGN-CHANGES.md §64, commit `433a182`,
PR D): `lsGet` used to hit `localStorage.getItem` + `JSON.parse` on EVERY
call — renders re-parsed the same multi-hundred-KB blobs dozens of times. The
proof was a profile on a **seeded heavy account**, before vs after the
memoized cache + minified builds: boot DOMContentLoaded **826ms → 97ms**;
JSON.parse calls at DCL **266 → 23** (~0.4MB re-parsed → ~0); tab → Stats
**41ms/90 parses → 35ms/2**; every other interaction re-parses 0 bytes.

**Steps** (all implemented in `scripts/profile-ui.mjs` — read it as the
template):

1. **Seed a heavy account, not a fresh one.** Fresh users hide O(data) costs.
   The shipped seed: 19 weeks in, 72 logged sessions (`ff_log` +
   `ff_history`), 130 `ff_body` rows, 90 `ff_fuel` days, 10 speed tests —
   self-contained function per the harness seed laws.
2. **Instrument the costly primitive from time zero**: an `addInitScript`
   wraps `JSON.parse` with a count + bytes counter and snapshots it at
   `DOMContentLoaded`. Parse counts are the *deterministic* signal — wall
   clock varies with machine load, but a code path that parses 266 blobs
   parses 266 blobs every time.
3. Read wall clock from navigation timing
   (`performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd`),
   not hand-rolled `Date.now()` around `goto`.
4. **Measure an interaction too** (reset counters → click → wait for the
   view): boot-only profiles miss per-render costs.
5. Compare before/after on the same box; report both numbers. For guards that
   survive in a script, assert on parse *counts* with generous bounds, never
   on absolute ms.

**Run it:**

```
node .claude/skills/yardsmith-proof-and-analysis-toolkit/scripts/profile-ui.mjs
# → boot: DOMContentLoaded ~95–180ms · JSON.parse at DCL: 24 calls / 81KB
#   tab → Stats: ~120ms · 1 parses / 0KB re-parsed · all assertions green
```

Today's output independently reproduces §64's "after" numbers (24 parses vs
the recorded 23; ~97ms-class DCL). The script's soft guards (boot parses < 75,
tab-switch parses < 30 — ~3× headroom) exist so a regression of the §64 bug
class turns a routine run red without making the check flaky.

**What "proven" looks like.** A before/after table in the Verified paragraph
with DCL ms, parse count, bytes re-parsed, and at least one interaction — like
§64's. If you only have "after", you haven't proven an improvement.

---

## Recipe 5 — Determinism and idempotence proofs

**When to reach for it.** Anything generated must be provably a pure function
of its inputs: the build outputs (from `src/`), the dark theme (from the light
CSS + the generator's CORE list). This is what makes "conflicts in generated
files are resolved by taking either side and rebuilding" safe, and what makes
a hand-edit to a generated file detectable at all.

**The general method (scratchpad-copy + hash pair):**

1. **Never run the transform in the working repo just to check** — it would
   dirty outputs mid-review. Copy the inputs+outputs to scratch.
2. Hash the committed outputs (`sha256sum … > before.sha`).
3. Run the transform once → `sha256sum -c before.sha`. All OK = the committed
   outputs are exactly transform(inputs) — **determinism**.
4. Run the transform *again* (or the generator then the transform) → still OK
   = the generator is a fixed point on current inputs — **idempotence**. A
   generator that isn't idempotent will produce phantom diffs forever.

**Worked example.** Both proofs pass on this repo today: rebuild reproduces
the four committed root outputs byte-for-byte, and
`gen-dark-theme.py && build.mjs` leaves the hash at `04f691fff1` (generator
prints `dark theme: 279 rules x2 variants, 1 media-scoped`). The exact
canonical command block, current hashes, and what a mismatch means live in
**`yardsmith-validation-and-qa` §6 ("Golden checks")** — run those, don't
retype them. Background on the `{{V}}` hash mechanics →
`yardsmith-build-and-env`.

**What "proven" looks like.** `sha256sum -c` printing OK for every generated
file, twice (post-transform and post-generator+transform). Apply the same
pattern to any NEW generator you add: its output must be committed, and this
proof must be runnable against it.

---

## Recipe 6 — Domain math hand-checks

**When to reach for it.** Whenever a number the app displays is questioned
("is this prescription right?"), whenever you change any formula, and as the
final step of reviewing a Fuel/Train diff. The formulas' single home (with
rationale and units) is `golf-fitness-domain-reference` — this recipe is how
to *check a live number against them by hand*. Every check below was executed
2026-07-08 and matched.

**e1RM (Epley).** `e1RM(w, r) = w × (1 + r/30)` (070:596-597; warm-up sets
never enter the log, so they can't pollute this). Hand-check: a logged
200 lb × 6 set → 200 × 1.2 = **240**; 225 × 3 → **247.5**. Any e1RM the Stats
PR wall shows must be reproducible this way from a visible set.

**Wave dose arithmetic.** Take the authored target from `PHASES` (035:36-…),
walk it through the pipeline `effTarget = waveAdjust(adjSets(target))`
by hand using the week's wave (`waveFor`, 035:410): e.g. Barbell Bench
Press "4 × 5" in week 4 (intensify, 🏋️) → reps −2 floor 3 → **"4 × 3"**;
week 6 (deload) → sets −1 → **"3 × 5"**. Prescribed deload load: last
weight × 0.6 rounded to 5 (`prescribeW`, 035:457-462): 200 → **120**.
Progression jump when every working set hits the top of the range: +5 lb
lower-body pattern names, +2.5 otherwise (`incNum`, 040:168). If a hand-walk
disagrees with the UI, run Recipe 2's script before touching anything — the
discrepancy is usually a classification, not the arithmetic.

**Macro targets (Mifflin–St Jeor → goal → split).** Worked check, male 185 lb,
5'11", 34 y, activity 1.55, Lean Bulk (+10%), `ff_kcal_adj` 0 — computed by
hand from 025:180-209 and confirmed against the live app's `ff_targets` blob:

```
kg = 185/2.20462 = 83.91;  cm = 71×2.54 = 180.34
BMR  = 10×83.91 + 6.25×180.34 − 5×34 + 5 = 1801
TDEE = 1801 × 1.55 = 2792
target = 2792 × 1.10 = 3071  → app shows kcal 3070 (round5)
protein = round5(3071×0.30/4) = 230 g;  fat = 65 g (GOALS.leanbulk, 025:9)
carbs = round5((3071 − 230×4 − 65×9)/4) = 390 g
```

App's actual `ff_targets` for that profile: `{kcal:3070, proteinG:230,
carbG:390, fatG:65, tdee:2792}` — exact match. To reproduce: seed that profile
via the harness and read
`JSON.parse(localStorage.getItem('ff_targets'))` after boot.

**Per-meal split (largest remainder).** `distribute(total, weights)`
(025:74-84) floors the proportional shares then hands leftover grams to the
largest fractional remainders, so integers always sum exactly. Hand-check with
the real function (extracted the Recipe-2 way): `distribute(230,
[0.95, 1.05, 1.30, 0.70])` → `[55, 60, 75, 40]` (sums to 230);
`distribute5(390, [1, 1, 1.6, 1])` → `[85, 85, 135, 85]` (5 g steps, sums to
390); ties go to the earlier meal (`distribute(103,[1,1,1])` → `[35,34,34]`).
**Any meal card's grams must sum to the day's target exactly** — a
one-gram-off sum means someone bypassed `distribute`.

**What "proven" looks like.** The on-screen number, the hand computation, and
the formula's file:line all in agreement — written down. If the app and the
reference doc disagree, the code is the shipped truth; flag the doc
(`yardsmith-docs-and-writing`).

---

## Recipe 7 — Adversarial refutation of a reported bug

**When to reach for it.** EVERY user/owner bug report, before writing any fix.
The discipline: **try to prove the bug is NOT in the code you're about to
change.** A fix built on an unverified reproduction is how you get fix-the-fix
chains (the four-round iOS bars saga → `yardsmith-failure-archaeology`).

**Steps.**

1. **Establish which bytes the reporter is running.** This is the single
   highest-yield question in this repo's history. The You-tab "🔄 App version"
   card shows `window.FF_BUILD` (a 10-char content hash injected as `{{V}}`);
   compare it to the hash in the committed `index.html`. Mismatch → it's a
   delivery/staleness problem, not a code problem (update path + force-refresh
   → `yardsmith-run-and-deploy`; symptom triage → `yardsmith-debugging-playbook`).
2. **Reproduce against known bytes**: rebuild, serve the repo root, drive the
   exact reported surface (not the neighboring one — §60's "green tests, real
   bug" post-mortem: the tests exercised Today while the button lived in the
   Full-week `logFoot`).
3. **State the competing hypotheses and find the discriminating observation**
   — the one fact that is impossible under one hypothesis.
4. Only after the code hypothesis survives refutation do you write the fix —
   with the reproduction as its regression test.

**Worked example (DESIGN-CHANGES.md §58, 2026-07-07).** Owner report: the
compact speed day "never updated" on his phone. Hypothesis A: the §55 speed-day
compaction code was broken. Hypothesis B: his installed PWA was serving a
stale build. Discriminator: **FF_BUILD on the device vs HEAD**. Outcome,
recorded verbatim in §58: "the earlier 'speed section never updated' was the
stale-PWA cache from §57, not a code issue — **the compact speed day was live
all along, just not reaching the home-screen app.**" Zero code was changed for
that report; the real fix was §57's update-reliability work (no-store document
fetch, resume-time `reg.update()`, force-refresh escape hatch). Had the session
"fixed" the speed-day code on the report's face value, it would have churned
working code and left every stale device stale.

**What "proven" looks like (for a refutation).** A written line of the form
"report R is explained by X, not Y, because observation O is impossible under
Y" — plus the class-level follow-up if X is systemic. The first-question habit
("which FF_BUILD?") is codified in `yardsmith-debugging-playbook`; this recipe
is the general form for hypotheses that playbook doesn't list yet.

---

## Choosing a recipe (cheat sheet)

| You're about to… | Recipe |
|---|---|
| Justify or change exercise order/dose from research | 1 (then 6 for the arithmetic, 2 if classifiers are involved) |
| Add/rename anything in `EXERCISE_DB`/`EX`/`PHASES`, touch `purposeFor`/`waveAdjust` | 2 |
| Touch `cloud-sync.js` or add a roaming key | 3 (mandatory — validation-and-qa §7) |
| Claim anything is faster/lighter | 4 |
| Touch build scripts, templates, or the dark-theme generator | 5 |
| Doubt a number on screen | 6 |
| Respond to any bug report | 7 first, always |

---

## Provenance and maintenance

All facts verified 2026-07-08 at HEAD `f21930a`, build `04f691fff1`. One-line
re-verification for anything that may drift:

- **Shipped scripts still green:** run the three commands at the top; expected
  `89/89`, `24/24`, `all assertions green`. They are the fastest staleness
  detector for this whole skill — `wave-cases.mjs` in particular fails loudly
  if 035's functions are renamed or the authored doses change.
- **Line refs into 035** (`purposeFor` 349, `waveFor` 410, `waveAdjust` 430,
  `effTarget` 442, `overspeedDose` 445, `prescribeW` 457):
  `grep -n "function \(purposeFor\|waveFor\|waveAdjust\|effTarget\|overspeedDose\|prescribeW\)" src/js/app/035-training-plan.js`
- **cloud-sync internals** (`MERGE` 431, `mergeBlob` 441, CAS update ~279-282,
  `syncOnLogin` 471): `grep -n "var MERGE\|function mergeBlob\|function syncOnLogin\|\.eq(\"rev\"" cloud-sync.js`
- **Formula refs:** `grep -n "Epley" src/js/app/070-*.js` (596-597);
  `grep -n "function distribute" src/js/app/025-macro-calculator.js` (74, 86);
  BMR/GOALS: 025:8-25, 180-209.
- **Worked-example numbers:** 6932f28 commit message (`git show 6932f28` —
  needs the un-shallowed clone, see `yardsmith-build-and-env`); §64 perf
  numbers at DESIGN-CHANGES.md ~1239-1243; §61 vm-sandbox Verified paragraph
  ~1376-1383; §58 refutation ~1452-1454; Brennan table
  CLUBHEAD-SPEED-REFERENCE.md ~351-365.
- **Current manual pins** (stated here only as context for Recipe 3's "bump
  the pin" reminder): `grep -n "cloud-sync.js?v=\|coach.js?v=" src/index.template.html src/sw.template.js`
  → v=112 / v=88 today.
- **Environment paths** (`/opt/pw-browsers`, global Playwright) are owned and
  re-verified by `yardsmith-playwright-harness`; `profile-ui.mjs` resolves
  them through that skill's library, so it inherits fixes made there.

Honest gaps: (a) the original 37+10 case list from `6932f28` was never
committed — `wave-cases.mjs` reconstructs and extends the pattern (89 cases)
from the commit message's named regressions and the current code, so it is a
faithful *pattern* revival, not the historical artifact; (b) `profile-ui.mjs`
can only show the §64 "after" state — the 826ms "before" is not reproducible
without checking out pre-`433a182` code; (c) the function-extraction helper in
`wave-cases.mjs` is deliberately naive about braces inside regex literals
(none exist in the extracted functions today) — it throws on a missing
function but could mis-slice if such a regex is ever added; extend it then.
