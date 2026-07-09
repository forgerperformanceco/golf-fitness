---
name: yardsmith-research-frontier
description: >
  The open-problems map: where Yardsmith can beat SOTA as THE BEST EVIDENCE
  ENGINE IN GOLF FITNESS. Six frontier problems (overspeed evidence gap,
  adaptive prescription, fuel↔golf coupling, population calibration,
  evidence-engine infrastructure, N-of-1 experiments), each with: why current
  SOTA fails, the specific asset already in this repo, the first three
  concrete steps IN THIS REPO, and a falsifiable "you have a result when…"
  milestone. Ships scripts/frontier-extract.mjs (backup → research tables) and
  scripts/claims-lint.mjs (banned-claim check). Load when asked: "what should
  Yardsmith research/study", "where can we beat DRVN/SOTA", "can we prove
  overspeed works", "publishable", "dataset", "cohort", "pre-registration",
  "make the coach adaptive", "does fuel adherence matter", "are the norms
  right", "research roadmap", "novel contribution", "moat via evidence".
  Everything here is OPEN/CANDIDATE — nothing in this skill is a shipped claim.
---

# The Yardsmith research frontier — six open problems where this repo can beat SOTA

As of 2026-07-08, HEAD `f21930a`. Every fact below was re-verified against this
repo at that commit; every `file:line` is checkable.

**The frontier definition (owner's choice):** Yardsmith wins not by more
features but by becoming **the best evidence engine in golf fitness** — the
product whose training claims are the most honestly sourced, and whose users'
own longitudinal data eventually *generates* evidence the field doesn't have.
This is the productization of two standing house positions:
`CLUBHEAD-SPEED-REFERENCE.md:327-328` ("**Prove it per-user, not by claim:**
the app's own before/after driver-carry + 7-iron trend is the honest
substitute for a marketing stat") and `YARDSMITH-BRAIN.md:451` (the evidence
ethos: independent/peer-reviewed sources, cited with confidence levels).

**Status discipline (absolute):** every problem in this file is **OPEN**. Every
proposed number (cohort sizes, thresholds, effect gates) is a **CANDIDATE
default**, chosen to be falsifiable, not blessed. Nothing here may be cited as
"Yardsmith found X" until it has passed the evidence bar (sibling skill
`yardsmith-research-methodology`) and the public-claims gate
(`yardsmith-external-positioning`). A null result is a result — record it in
`YARDSMITH-BRAIN.md` §6 with a don't-revive-without-new-data marker, per
`yardsmith-docs-and-writing`.

## When NOT to use this skill

| You actually want to… | Use instead |
|---|---|
| Execute the designated current campaign (pressure-test the Speed & Power day, BRAIN open thread 7) | `yardsmith-speed-day-campaign` — that is the *live runbook*; this skill only frames the research problem behind it |
| Look up domain math (wave params, e1RM/Epley, Octane pillars, macro formulas, Brennan 2024 effect sizes, glossary) | `golf-fitness-domain-reference` |
| Decide what may be said publicly / banned numbers / citation standards | `yardsmith-external-positioning` |
| Learn the evidence bar, hypothesis lifecycle, where ideas come from | `yardsmith-research-methodology` (sibling, part of this 16-skill library) |
| Run a specific analysis recipe (effect-size reading, unit-case proofs, vm-sandbox sync proofs) | `yardsmith-proof-and-analysis-toolkit` (sibling) |
| Change any code/doc this skill motivates | route through `yardsmith-change-control` — no research idea bypasses the merge gate |
| Key shapes, merge strategies, add-a-key checklist | `yardsmith-data-and-sync` |

## What qualifies as a frontier problem (the three tests)

A problem belongs here only if ALL three hold:

1. **The gap is real in the literature or the market** — citable from the
   repo's own reference docs or verifiable outside, not vibes.
2. **Yardsmith holds a specific asset TODAY** — a named key, function, or data
   stream that exists at HEAD, not a feature we'd have to build first.
3. **A falsifiable milestone can be written down in advance** — including what
   a *negative* result looks like and what we do with it.

## Hard constraints shared by every problem (read before starting any)

These bound what any Yardsmith research result can honestly be:

- **User base reality:** as of 2026-07-08 the repo records no usage metrics and
  no user cohort beyond the owner (open question in every discovery report).
  Until real users exist, everything is **N-of-1 pilot work** — valuable for
  building the machinery, never for cross-user claims.
- **No research-consent infrastructure exists.** Profiles blobs are RLS-private
  (`supabase/schema.sql`); the only consented shared data is the opt-in
  `leaderboard` table (`supabase/schema.sql:200-216`: handle, score, speed,
  speed_gain, streak, sessions, goal, week_sessions, week_start — note:
  **no sex/age columns**). Mining
  private blobs for research is off the table; building consent + anonymized
  export IS part of the frontier (problems 1 and 4).
- **Retention caps truncate history** (all verified in src): `ff_speedtest`
  last 60 entries (060:115), `ff_rounds` last 60 (082:74), `ff_fuel` last 95
  days (030:12-15), `ff_mobility` last 40. At biweekly cadence 60 speed tests ≈
  2.3 years (fine); **95 days of fuel is the binding constraint** for any
  season-long coupling analysis (problem 3).
- **The data lives client-side.** The honest extraction path today is the
  Account tab's backup export (`ffExportData`,
  `src/js/app/080-game-day…js:276-297`, shape
  `{app:"Yardsmith",kind:"backup",version:1,exported,data:{ff_*…}}`). This
  skill ships `scripts/frontier-extract.mjs` which turns one such file into
  research tables (run green — see Provenance).
- **Any new persisted field/key** a study needs goes through the add-a-key
  checklist in `yardsmith-data-and-sync` (KEYS + MERGE + `?v=` pin in the same
  PR) and `yardsmith-change-control`. Never rename existing `ff_*` keys.
- **Claims gate:** no result leaves the repo (marketing, store listing, coach
  copy) without `yardsmith-external-positioning`. The refuted "+8.2 mph" and
  all vendor "+X mph" promises stay banned regardless of what we find
  (`CLUBHEAD-SPEED-REFERENCE.md:272-273,325-326`).

---

## Problem 1 — The overspeed evidence gap (OPEN; feeds BRAIN open thread 7)

**Why current SOTA fails.** Verified in the repo's own independent review,
`CLUBHEAD-SPEED-REFERENCE.md` §9.2 (lines 256-273): **"No independent,
peer-reviewed, multi-week randomized trial** of clubhead-speed gains was found
for SuperSpeed *or* The Stack System" (line 268). What exists is acute warm-up
work: +2.6 mph *first set only* with **no ball-speed transfer** (smash factor
*dropped*, d = −0.82; Hebert-Losier & Wardell 2021), and a null vs bodyweight
warm-up (Bliss 2021). The marquee vendor numbers are vendor-sourced; the viral
"+8.2 mph" figure is refuted (line 272-273). §9.7 (line 332) lists the open
science: no longitudinal isolation, injury incidence unmeasured, **optimal
dose unknown, durability after stopping unknown**. Vendors sell dosing
programs; nobody has published honest longitudinal dose-response data from
real amateurs. That is the gap.

**Yardsmith's asset (exists today).**
- **Structured, wave-aware dosing already prescribed in code**: `overspeedDose(week)`
  (`src/js/app/035-training-plan.js:445-450`) — 2×5 weeks ≤2 and deload/peak,
  3×5 to week 8, 4×5 after; wired via `speedDrillTarget` (035:451-454).
- **Per-set adherence capture already flows into `ff_log`**: `buildSession`
  builds real set rows (w/r/done) for speed-day drills including "Overspeed
  swings" (`src/js/app/040-workout-logger.js:238-242`) — so prescribed-vs-
  completed dose is *reconstructable from logs*, not self-reported.
- **A standardized outcome instrument**: the biweekly guided 7-iron test
  (`SPEEDTEST_EVERY = 14`, 060:18) with warm-up checklist, 3 max swings,
  same-tool guidance, writing `ff_speedtest` `{ts,date,week,swings[3],best}`
  (060:113-116) plus `ff_body` — both cross-device merged
  (`cloud-sync.js:437`), so series survive device churn.
- **The distance cross-check** the acute literature says you need (CHS without
  ball speed misleads — the smash-factor drop): driver carry lives in the same
  `ff_body` rows (`d` field) and on-course drives via `ff_rounds`.

**First three steps in this repo.**
1. **Baseline extraction (works now):** export a backup from the Account tab,
   then `node .claude/skills/yardsmith-research-frontier/scripts/frontier-extract.mjs backup.json`
   → `overspeedAdherence` (per-week prescribed vs completed sets, wave-labeled)
   + `speedTests` + `speedEntries` + driver carry. This is the dataset schema a
   cohort version would aggregate.
2. **Author the pre-registration in-repo** (via change control): a
   `RESEARCH-PREREG-OVERSPEED.md` stating, *before any analysis*: hypothesis
   (predicted CHS slope difference between high- vs low-adherence blocks, with
   numbers per `yardsmith-research-methodology`), the mandatory negative
   controls (driver-carry must move with CHS, else we've reproduced the
   smash-factor artifact; deload weeks excluded from dose exposure), exclusion
   rules (tool changes mid-series — the app itself warns "same tool each test",
   060:105), and the analysis code (extend `frontier-extract.mjs`).
3. **Define the cohort gate + consent design.** CANDIDATE gate: no cross-user
   analysis until ≥20 consented users with ≥12 weeks each and ≥70% of speed
   days logged. Consent = a new explicit opt-in (like the leaderboard's
   `opted_in`) plus a server-side anonymized export path — a schema change, so
   `yardsmith-data-and-sync` + `yardsmith-change-control` own the mechanics.

**You have a result when…** a pre-registered analysis over the gated cohort
produces an adherence↔CHS-trend effect estimate with a confidence interval —
*in either direction*. "Overspeed dose showed no detectable effect on 7-iron
trend beyond the base program in N users over M weeks" is a *publishable,
SOTA-advancing* result (it would be the first independent longitudinal data,
per §9.2) and must be recorded with the same prominence as a positive one.
**Fenced path:** publishing an owner-only N-of-1 curve as if it were evidence
— it's machinery validation only.

---

## Problem 2 — Adaptive prescription beyond double progression (OPEN)

**Why current SOTA fails.** Consumer training apps prescribe with fixed rules;
DRVN's coaching "is programmed, not conversational"
(`COMPETITIVE-LANDSCAPE.md:21`), and Yardsmith's own progression is a fixed
rule too: double progression (`progressReady`, 040:170-176 — top of rep range
on every working set → +2.5/5 lb via `incNum`, 040:168) plus a calendar-driven
wave (`waveFor`, 035:410-421) that never looks at the user's response.
Autoregulation exists in the S&C literature (RPE/velocity-based), but no golf
fitness app closes the loop between *logged outcome trends* and *next week's
prescription*. (CANDIDATE framing: we have not audited every app on the market
— re-verify the competitive claim before ever saying it publicly.)

**Yardsmith's asset (exists today).**
- **A working adaptive loop to copy — in nutrition, not training**: the
  metabolism check-in fits a least-squares slope to `ff_body` weight
  (`weightTrend`, 070:954-967), compares it to the goal's intended rate, and
  nudges `ff_kcal_adj` ±50…250 kcal every ~10 days (`adaptiveCheck`/
  `adaptiveDue`, 070:968-980; applied at 085:678-679, clamped ±600). The
  MacroFactor-style pattern — "the calculator is a starting guess; the scale
  is the true meter" (070:950-953) — is exactly the shape a training
  autoregulator needs.
- **The response signals already computed**: per-lift e1RM series
  (`bigLiftStats`, 085:92-105, Epley at 070:596-597) and speed-trend coupling
  (`ff_speedtest`/`ff_body`). The insights engine already *detects* the
  regimes an adaptive engine would act on — speed flat ≥3 weeks (075:69-71),
  mass-gaining-but-speed-flat (075:77-79), lift e1RM stalled (075:88-91) — but
  today it only *talks* (a card + a coach prompt); it never changes the
  prescription.
- **A single interception point**: the whole plan flows through one pure
  pipeline, `effTarget(sr,name,week)` (035:442) — display and both loggers
  share it, so an adaptive transform added there cannot drift between surfaces
  (invariant 11 in `yardsmith-architecture-contract`).

**First three steps in this repo.**
1. **Extract the response dataset**: `frontier-extract.mjs` already emits
   `e1rmSeries` + `speedEntries` + `weight` per week. Quantify, on real logs,
   how often the 075 stall conditions fire and how long stalls last under pure
   double progression. That base rate decides whether adaptation is even worth
   building.
2. **Spec the adaptive rule as a pure function first** — e.g.
   `adaptTarget(base, name, week, signals)` layered after `effTarget` — with a
   full unit-case battery *before* wiring, exactly the `6932f28` wave-engine
   verification pattern (37 classification + 10 adjustment cases; recipe in
   `yardsmith-proof-and-analysis-toolkit`). The 6932f28 incident is the
   standing warning: prescription logic that isn't unit-cased mis-doses
   silently (`yardsmith-failure-archaeology`).
3. **Shadow-mode backtest, never live-first**: run the candidate rule over
   historical `ff_log` and report where it would have *diverged* from what
   double progression actually prescribed, and whether divergences precede the
   stalls it claims to break. Ship it as an analysis script beside
   `frontier-extract.mjs`; no user-facing change until shadow results exist.

**You have a result when…** the shadow backtest shows (a) divergence from
double progression in a meaningful share of sessions (CANDIDATE: ≥10%), AND
(b) a pre-stated association between divergence points and subsequent stall
breaks — or it shows neither, in which case double progression is *vindicated*
and the finding "simple double progression was not measurably beatable on our
data" is recorded in BRAIN §6 as a settled battle. **Fenced path:** shipping
adaptive prescriptions to users because the idea sounds smart — the wave
engine's history says untested prescription logic hurts real training weeks.

---

## Problem 3 — Fuel-adherence ↔ performance coupling (OPEN)

**Why current SOTA fails.** The two halves of the market don't hold both data
streams: nutrition trackers (MyFitnessPal-class) have no golf outcomes, and
golf fitness apps have no nutrition — DRVN's own weakness column reads "No
nutrition" (`COMPETITIVE-LANDSCAPE.md:21`). Sports-nutrition literature on
amateur golf performance is essentially absent (the repo's references cover
fueling *prescriptions*, not measured adherence→outcome coupling in golfers).
Nobody can currently answer "do fueled golfers actually fade less?" with data.

**Yardsmith's asset (exists today).** The only place all three streams share
one record, keyed to the same ISO days:
- **Daily fuel adherence as a score, not a diary**: `ff_fuel` per-day
  `{m,rating,n,ts}` scored by `fuelScoreFor` (030:32-38: rating on=1 /
  close=0.6 / off=0.15; else checked meals a=1 / c=0.75 over n).
- **On-course outcomes with a stamina channel**: `ff_rounds` rows carry
  `energy: strong|faded|gassed` and `driving: bomb|norm|short` chips plus
  score/drive (082:13-14,63-76) — "faded late" is precisely the fuel-sensitive
  outcome.
- **A correlation engine with honesty gates already in production**:
  `rdInsights` (082:111-154) computes training↔round couplings (drives within
  2 days of a lift vs 3+; deload-week freshness) behind explicit gates — ≥2
  rounds per side, ≥5 yd gap, max 3 insights — under the stated design rule
  "the card never dresses noise up as a finding" (082:93-98). Fuel is the
  missing third input to this engine.

**First three steps in this repo.**
1. **Extraction (works now)**: `frontier-extract.mjs` emits `fuelDaily`
   (ISO + score + plan week) and `rounds` side by side — compute the first
   trailing-window coupling offline (e.g. mean fuel score over the 3 days
   before each round, split by `energy`).
2. **Pre-register the first coupling hypothesis with numbers**: CANDIDATE —
   "rounds preceded by a 3-day mean fuel score ≥0.85 show a lower
   faded/gassed rate than rounds below 0.5; predicted gap ≥20 percentage
   points, else we call it null." Include the confounder plan (rounds
   correlate with weekends; deload weeks touch both fuel routine and
   freshness — `rdPlanWeek`/`waveFor` labels are already extractable).
3. **Solve the 95-day cap before the season-long version**: `ff_fuel` prunes
   to 95 days (030:12-15) so a full-season study loses its early fuel data.
   Candidate fixes (choose via change control, shapes via
   `yardsmith-data-and-sync`): keep a compact per-day score archive (score
   only, not meals — tiny), or rely on periodic backup exports as snapshots.
   Do NOT silently raise the cap — the 1MB blob guard and write-amplification
   history (#62) are why caps exist.
4. *(When gates pass)* the shipping surface already exists: a fourth
   `rdInsights` rule ("🥗 Rounds after fueled days…") behind the same
   ≥N-per-side gating — a few lines in 082, routed through change control.

**You have a result when…** a pre-registered fuel↔energy (or fuel↔late-round
drive) coupling clears its stated gate on the owner pilot AND replicates on
the first consented cohort — or fails to, and the null ("fuel adherence above
X showed no detectable stamina effect at our sample size") is recorded. Either
way Yardsmith holds the first dataset that can even *ask* the question.
**Fenced path:** shipping the receipt card off the owner's own handful of
rounds — the 082 gates exist precisely to stop that.

---

## Problem 4 — Population calibration of the benchmarks (OPEN)

**Why current SOTA fails.** Public norms are coarse launch-monitor averages
(TrackMan/FlightScope buckets, `CLUBHEAD-SPEED-REFERENCE.md:137-149`), mostly
male-centric, with almost nothing for 50+ or female amateurs; DRVN's composite
("Golf Fitness Handicap™") is proprietary and unpublishable by us
(`yardsmith-external-positioning` borrow-vs-never-copy rule). Yardsmith's own
`ffBench(sx,age)` (070:784-796) is four hardcoded buckets (sex × 50+) sourced
"from public launch-monitor / amateur norms" (comment, 070:781-783) — used for
placeholders and context lines only, never scoring (scoring is
trend-vs-own-baseline everywhere; Octane publishes no normative tables, per
`OCTANE-SCORE` doctrine in `golf-fitness-domain-reference`).

**A concrete audit finding to start from (verified, unresolved intent):**
`ffBench` male non-senior returns `seven:85` while its *own* `range` string
says "~75–80 mph 7-iron" (070:795), and the reference doc puts the *average
male amateur* at ~75–80 mph with ~85 belonging to scratch/low-handicap players
(`CLUBHEAD-SPEED-REFERENCE.md:146-147`); `drive:245` similarly sits above the
doc's ~215 yd average carry. Whether the placeholder is deliberately
aspirational or a drift bug is not recorded anywhere — resolving and
documenting that is step 1.

**Yardsmith's asset (exists today).** The opt-in `leaderboard` table
(`supabase/schema.sql:200-216`) is a *consented* seed of a real amateur
distribution: score, latest 7-iron speed, %gain, streak, sessions, goal
division — populated by the same standardized biweekly test instrument
(problem 1), which is better provenance than "range session with unknown
club" numbers behind the public tables.

**First three steps in this repo.**
1. **Audit + document**: reconcile each `ffBench` number against
   `CLUBHEAD-SPEED-REFERENCE.md:137-149`; resolve the 85-vs-75–80 and
   245-vs-215 discrepancies (decide: aspirational placeholder or bug), record
   the decision in DESIGN-CHANGES with rationale, and add a source comment per
   number in 070.
2. **Design consented capture of the missing covariates**: the leaderboard has
   no sex/age columns, so distribution-by-bucket needs a schema addition +
   explicit user disclosure (RLS/migration mechanics via
   `yardsmith-data-and-sync`; store-compliance angle via
   `yardsmith-external-positioning`).
3. **Set the minimum-N gate per bucket** before any user-derived number ever
   replaces a literature number: CANDIDATE ≥50 consented users per sex×age
   bucket, refreshed quarterly; below the gate, `ffBench` stays
   literature-sourced with citations.

**You have a result when…** every number `ffBench` returns carries an explicit
source — either a literature citation or "Yardsmith consented distribution,
n=…, as of …" — and at least one bucket's placeholder is empirically derived
and demonstrably different from the literature table (that difference — real
amateurs who *train* vs range-population averages — is itself a novel,
publishable observation). Null form: our users match the public tables, and we
say so. **Fenced path:** mining private profile blobs for distributions, and
publishing any normative table for Octane (settled: Octane is trajectory, not
a leaderboard — `golf-fitness-domain-reference`).

---

## Problem 5 — Evidence-engine infrastructure itself (OPEN)

**Why current SOTA fails.** No fitness product keeps its coaching claims in
*machine-verifiable* lockstep with sources. Even Yardsmith's own pipeline —
reference docs with per-claim confidence levels (`CLUBHEAD-SPEED-REFERENCE.md`
§9 carries a confidence label on every figure) distilled into the AI coach's
cached system block — relies on a comment: "update it in lockstep with the
reference doc" (`supabase/functions/_shared/knowledge.ts:1-10`). The source
investigator's open question stands: lockstep is manual discipline, no tooling.
Manual discipline is exactly what the staleness history says decays
(`yardsmith-failure-archaeology`; `OCTANE-SCORE.md` and `ROADMAP.md` already
drifted stale within days — staleness map in `yardsmith-docs-and-writing`).

**Yardsmith's asset (exists today).** The raw material is unusually good: a
banned-claims list with exact refuted numbers (§9.2), honesty framing embedded
in shipped copy (the speed day's "Modest evidence — the add-on, not the main
event", 035:21,32), grounding rules inside the coach prompt itself
(knowledge.ts OPERATING RULES: NO BROWSING, NEVER INVENT DATA), and the
`sources/` ingestion rules (owned by `yardsmith-external-positioning`).

**First three steps in this repo.**
1. **Run the shipped linter (exists, green at HEAD):**
   `node .claude/skills/yardsmith-research-frontier/scripts/claims-lint.mjs`
   — scans the 27 coaching surfaces (src/js/app, index template, coach.js,
   knowledge.ts) for banned patterns (+8.2 mph, "+X mph in N weeks",
   guarantee-next-to-mph/yards) and asserts the required honesty markers are
   still present. Verified: exits 0 on HEAD; exits 1 when a violation is
   seeded (test procedure in Provenance).
2. **Build the claims registry** (change-controlled doc): one table mapping
   every quantitative claim the coach/app copy makes → source → confidence
   level → the surface(s) that state it. Start from the §9/§10 figures and
   knowledge.ts; the registry is what lets the linter grow beyond banned
   strings to "every stated number has a registered source".
3. **Wire the linter into the full-battery convention**: add it to the
   pre-merge battery defined by `yardsmith-validation-and-qa` (which owns what
   "green" means) so a claims violation blocks a merge like a failed audit
   does. CI promotion is a separate, owner-level decision (the repo currently
   runs zero tests in CI — `yardsmith-run-and-deploy`).

**You have a result when…** the linter (a) stays green across ≥1 month of real
merges, (b) is demonstrated to catch a seeded violation at review time, and
(c) the registry covers 100% of quantitative claims on coaching surfaces —
i.e., "no unsourced number can ship" becomes a property of the repo, not a
habit. This one is pure engineering: no cohort needed, achievable now.

---

## Problem 6 — The N-of-1 experiment engine (CANDIDATE — most speculative)

**Why current SOTA fails.** Consumer apps show correlations at best; nobody
offers structured *within-user experiments* (pre-registered on/off blocks with
a stated readout) for golf training, even though single-subject designs are
the honest way to answer "does X work *for you*" — and the overspeed question
(problem 1) is exactly the kind vendors answer with marketing instead.

**Yardsmith's asset.** `rdInsights` (082:111-154) is already a gated
within-subject comparison engine; the plan already produces natural on/off
structure (deload/peak weeks via `waveFor`; `overspeedDose` drops to 2×5 on
deload); `ff_event` re-anchors phases, proving the plan tolerates scheduled
perturbations; and the biweekly test is a fixed-cadence readout instrument.

**First three steps in this repo.** (1) Design the first self-experiment on
paper only: ABAB overspeed blocks (e.g. 4 weeks on / 4 off) against the
biweekly 7-iron readout, with the wash-in/wash-out and "durability after
stopping" question from §9.7 built in; (2) verify feasibility against the wave
calendar — blocks must not collide with deload/peak in ways that confound the
readout (extract the schedule with `frontier-extract.mjs` wave labels);
(3) only then consider a minimal in-app surface (a "protocol block" flag on
the speed day) via change control. **You have a result when…** one completed,
pre-registered ABAB cycle on a consenting user produces block-labeled speed
data whose analysis was specified before block 1 — the *machinery* result;
any training conclusion still needs replication. Treat this problem as the lab
bench for problem 1, not a product feature promise.

---

## Shipped tooling (both run green before shipping — see Provenance)

| Script | What it does | Run |
|---|---|---|
| `scripts/frontier-extract.mjs` | Backup JSON → research tables: per-week overspeed prescribed-vs-completed (wave-labeled), speed-test + 7-iron series, per-lift e1RM series, daily fuel scores, rounds, weight. Read-only. Replicates app math with `file:line` provenance in its header. | `node scripts/frontier-extract.mjs scripts/fixtures/sample-backup.json --asof 2026-07-08` |
| `scripts/claims-lint.mjs` | Fails (exit 1) if any coaching surface contains a banned claim pattern; fails if required honesty markers vanish. | `node scripts/claims-lint.mjs` (repo root auto-detected) |
| `scripts/fixtures/sample-backup.json` | Synthetic, internally-consistent backup (week-9 leanbulk user) — doubles as a shape reference for the export format. | — |

**Known limitation (honest):** `frontier-extract.mjs` re-implements
`waveFor`/`overspeedDose`/`curWeek`/`fuelScoreFor`/e1RM rather than importing
them (the app is a browser IIFE; there is no module export surface). Each
replica cites its source lines; any change to those functions requires
re-syncing the script. A vm-sandbox harness that runs the *real* built app.js
(the `test-sync.mjs` pattern, see `yardsmith-proof-and-analysis-toolkit`)
would remove the drift risk — worthwhile upgrade if these analyses become
routine.

## How a frontier result gets adopted (the only route)

1. Idea → pre-registered hypothesis with predicted numbers
   (`yardsmith-research-methodology` owns the bar).
2. Analysis on extracted data; adversarial pass; negative controls.
3. Repo changes (instrumentation, new keys, insight rules) →
   `yardsmith-change-control`, with data-model duties from
   `yardsmith-data-and-sync` and verification per `yardsmith-validation-and-qa`.
4. Result recorded in `YARDSMITH-BRAIN.md` §6 (adopted or retired-with-marker)
   and `DESIGN-CHANGES.md` if a surface changed — "a decision that lives only
   in one chat doesn't exist."
5. Public wording, if any, through `yardsmith-external-positioning`. Until
   then the strongest sentence permitted is the standing house line: *your own
   numbers are the evidence* (`CLUBHEAD-SPEED-REFERENCE.md:327-328`).

## Provenance and maintenance (as of 2026-07-08, HEAD `f21930a`)

Re-verify before relying on any anchor above:

- Line anchors: `grep -n "function overspeedDose" src/js/app/035-training-plan.js`
  (expect ~445); `grep -n 'day.type==="speed"' src/js/app/040-workout-logger.js`
  (expect ~238); `grep -n "SPEEDTEST_EVERY" src/js/app/060-speed-test-*.js`
  (expect 18); `grep -n "function fuelScoreFor" src/js/app/030-fuel-*.js`
  (expect 32); `grep -n "function rdInsights" src/js/app/082-round-debrief.js`
  (expect ~111); `grep -n "function weightTrend\|function adaptiveCheck\|function ffBench" src/js/app/070-workout-player-*.js`
  (expect ~954/968/784); `grep -n "function bigLiftStats" src/js/app/085-progress-stats-view.js`
  (expect 92); `grep -n "leaderboard" supabase/schema.sql` (table at ~200).
- Evidence-gap citations: `grep -n "No independent, peer-reviewed" CLUBHEAD-SPEED-REFERENCE.md`
  (expect 268); `grep -n "8.2 mph" CLUBHEAD-SPEED-REFERENCE.md` (272);
  `grep -n "9.7 Open questions" CLUBHEAD-SPEED-REFERENCE.md` (332);
  norms table at 137-149. BRAIN open thread 7: `grep -n "Pressure-test the Speed" YARDSMITH-BRAIN.md` (432).
- Retention caps: `grep -n "slice(-60)\|length>60\|<=95\|slice(-40)" src/js/app/0{3,6,8}*.js`.
- Scripts were run green on 2026-07-08:
  `node scripts/frontier-extract.mjs scripts/fixtures/sample-backup.json --asof 2026-07-08`
  → exit 0; spot-checked outputs: Back Squat 225×8 → e1RM 285 (Epley ✓),
  fuel 2026-06-08 → 0.9375 ✓, week/wave labels match `curWeek`/`waveFor` math ✓.
  `node scripts/claims-lint.mjs` → exit 0, "clean (27 surfaces scanned)";
  seeding `+8.2 mph` into a scratch copy of knowledge.ts and pointing the
  linter at it → exit 1 with the violation named. Re-run both after any change
  to 035/040/030/070 math or to the banned-claims list.
- Volatile facts to re-check before acting: user-base size (repo records
  none), leaderboard column set (schema.sql), whether `RESEARCH-PREREG-*.md`
  or a claims registry now exists (`ls *.md | grep -i research`), and whether
  the sibling skills `yardsmith-research-methodology` /
  `yardsmith-proof-and-analysis-toolkit` have landed in `.claude/skills/`.
