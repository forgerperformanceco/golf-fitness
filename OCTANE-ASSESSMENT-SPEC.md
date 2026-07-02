# Dyno Day — the Octane Assessment (spec)

The answer to DRVN's Golf Fitness Handicap™, built from our own evidence and our
own data. A guided, self-administered test battery that turns Octane from an
*inferred* score into a *tested* one — and gives the app a recurring ritual.

> **Brand hook.** Octane is the fuel; the engine metaphor runs through the app.
> A **dyno run** is how you measure an engine's real output — so the assessment
> is **"Dyno Day: put your engine on the dyno."** (Fallback name if it doesn't
> land: "Octane Test.")

---

## 1. Goals

1. **Close DRVN's headline feature** (assessment → score → re-test ritual)
   without copying their tests, scoring, or trademarks.
2. **Make Octane mean more** — today it's computed passively from logs; after
   this, part of it is *measured on test day*.
3. **Create the retention loop** — a scheduled re-test every 6 weeks, landing on
   the deload weeks the plan already has (testing fresh/tapered is *more*
   principled than testing mid-block).
4. **Stay us:** zero required equipment, works on a phone in a backyard, honest
   about what each test predicts, free.

## 2. Design principles

- **Outcome-anchored.** DRVN's battery is all gym-side inputs. Ours *includes
  the golf outcomes* (driver carry, clubhead speed) — "we test the thing you
  actually want, not just the things that build it."
- **Evidence-ranked tests only.** Every test maps to a verified finding in
  `CLUBHEAD-SPEED-REFERENCE.md` (§10–§11).
- **Self-administrable.** Tape measure + phone. Med ball optional; battery
  rescales when a test is skipped (same pattern as Octane's pillars).
- **Consistency over precision.** Same ball, same method, same spot every time —
  we score *your trend* first, absolute bands second (same stance as the
  "launch monitor or eyeball" driver-distance philosophy).
- **Calibrated bands** by sex (profile) and age (<40 / 40–54 / 55+) where public
  norms exist; improvement-vs-baseline where they don't.

## 3. The battery — 8 tests, ~20 minutes, 3 blocks

| # | Test | Protocol (self-administered) | Evidence anchor | Scored |
|---|---|---|---|---|
| **Distance block** — *the outcome* |||||
| 1 | **Driver carry** | 5 balls, same measurement method each time (monitor, GPS, or landmark); enter the median | The point of the app | Trend vs baseline |
| 2 | **7-iron clubhead speed** (or driver speed if measured) | 3 swings, best; same device/method each time | CHS = the engine output (already logged in-app) | Trend vs baseline |
| **Power block** — *jump + throw explain ~49–74% of CHS variance (Read 2013; Turner 2016)* |||||
| 3 | **Standing broad jump** | Toes on a line, jump, measure to rear heel; best of 3 | Lower-body ballistic power — jump metrics are the strongest CHS correlate family (zr≈0.82, Brennan 2024; CMJ r≈0.73 Oranchuk) — broad jump is the tape-measurable field proxy | Bands + trend |
| 4 | **Seated med-ball chest throw** *(optional — needs a ball)* | Sit against a wall, legs flat, two-hand chest pass; best of 3, same ball forever (6–12 lb) | The *pro-side* CHS predictor (r≈0.71, Turner 2016) | Trend-first |
| 5 | **Rotational med-ball throw** *(optional)* | Standing side-on, hip-height scoop throw, each side; best per side | The *amateur-side* predictor (r≈0.67, Read 2013); L/R asymmetry is a coaching signal | Trend-first |
| **Strength block** — *1RM squat ↔ CHS r≈0.54–0.64* |||||
| 6 | **Big-lift e1RM** *(auto — no test needed)* | Pulled from the training log (squat/RDL/press family, Epley) — gym users test nothing extra; field-only users do **max push-ups in one set** instead | Dynamic strength beats isometric for CHS (2024 meta); push-up norms are public | Bands + trend |
| **Durability block** — *mobility is the injury lever, not the speed lever (§11.6)* |||||
| 7 | **Lead-hip internal rotation screen** | Seated on a chair, feet planted wide, drop both knees toward the lead side; rate shin angle against on-screen diagrams (1–5) | ~10° lead-hip IR deficit ↔ low-back pain, d≈1.1 (21° painful vs 31° controls) | Bands (5 ≈ ≥30°, 1 ≈ ≤20°) |
| 8 | **Trunk rotation screen** | Seated tall, club across chest, rotate each way; rate reach against landmarks (45°/60°/75°/90°) | Injury/durability screen — honestly framed (thoracic ROM ↔ speed is UNCONFIRMED; we say "protects your back and preserves your turn," never "adds speed") | Bands |

**Deliberate differences from DRVN** (IP + positioning): different tests
(outcome-anchored, golf-swing measures included), different scoring (0–5 bands
feeding Octane 0–100, not a 50-point "handicap" with categories), different
name, improvement-first philosophy, free.

## 4. Scoring

- Each test → **0–5 band**, calibrated by sex + age group. Sources: published
  broad-jump and push-up norms (public domain fitness-testing tables); hip IR
  bands anchored to the 21°/31° low-back-pain study; throws and golf outcomes
  scored primarily as **% change vs your own baseline** (ball weight and
  measurement method vary person-to-person — absolute bands would be fake
  precision).
- **Battery score** = mean of completed tests' bands, rescaled 0–100 (skipped
  tests don't count against you — same rescale pattern as Octane's pillars).
- **First run = baseline.** Bands display, but the headline framing is "this is
  your starting line," mirroring the app's existing baseline-then-trend pattern.

### Octane integration — a 5th pillar
`ffScore()` gains a **"Tested (Dyno)"** pillar, `max: 20`, present only once ≥1
assessment exists (the existing rescale handles absence — no migration):

- **First assessment:** pillar = battery score × 0.6 (you get credit for
  testing, headroom to grow).
- **Re-tests:** pillar = blend of current battery band (40%) + improvement vs
  baseline (60%) — improvement-weighted like every other pillar.
- Existing pillar weights stay; Octane remains 0–100, the number users know.

## 5. Scheduling — the ritual

- **Baseline:** dashboard card (and end-of-onboarding pointer) until the first
  run: *"🔧 Dyno Day — 20 minutes, no gym. Get your baseline before Week 1
  does."*
- **Re-test cadence:** deload weeks — **6, 12, 18** (`wk % 6 === 0`, already in
  the plan) plus a **Week 20 final dyno** (the graduation moment: "+N yds and
  +N Octane since Week 1"). Five data points across the 20-week plan.
- **Nudges:** during a deload week with no assessment logged that week, the
  dashboard insight stack surfaces "Dyno Day is this week — test fresh."
  (Existing insight-priority system; no new notification infra needed.)
- Tests can be split across 2 days within the week (mobility screens any day;
  power tests on a fresh day).

## 6. UX flow

1. **Entry points:** dashboard card (when due), a "🔧 Dyno" row in the Train
   tab during deload weeks, Progress tab history section.
2. **Wizard, one test per screen:** what/why (one line, evidence-flavored),
   diagram/landmarks, input field (number or 1–5 tap-scale for the screens),
   instant band feedback ("Broad jump 7'2\" — Band 4 for your group"), skip
   button on optional tests.
3. **Results screen:** battery score, per-test bands, deltas vs last test (▲/▼),
   what to work on next (worst band → maps to the existing `FF_LEVER`-style
   advice), share-style summary card.
4. **Progress tab:** assessment history table + per-test sparklines (reuse the
   existing sparkline helper).
5. **AI coach:** latest assessment JSON added to the coach context payload so
   it can say "your rotational throw lags your chest throw — your engine makes
   force but isn't delivering it rotationally; here's the emphasis."

## 7. Data model & sync

- New localStorage key **`ff_assess`**: array of
  `{ id, date, week, tests: { drv:{v}, chs:{v}, jump:{v,band}, chest:{v},
  rot:{vL,vR}, str:{v,band,src:"e1rm"|"pushup"}, hipIR:{band}, trunk:{bandL,bandR} },
  score, _ts }`.
- **cloud-sync:** add `ff_assess` to `KEYS`; merge with the same
  id/ts union used for `ff_history` (additive, latest-ts wins per id).
- Driver carry + speed entered during the wizard also write through
  `logBodyEntry` so the existing trends/hero pick them up automatically.
- SW cache + `cloud-sync.js?v=` bumps on ship, per the standard release drill.

## 8. Out of scope (v1)

- Video capture / CV analysis of the tests (measurement apps' lane).
- Junior calibration (adult bands only; juniors get trend-only scoring).
- Leaderboard integration of battery scores (later — weekly boards revamp).
- Any wearable/HealthKit input (native-app phase).

## 9. Build checklist

1. Scoring tables + `ffAssessScore()` (pure functions, unit-testable in Node).
2. Wizard UI + results card (Train tab), history in Progress.
3. `ff_assess` storage + cloud-sync union + tombstone-safe delete.
4. Octane 5th pillar + dashboard nudge card + deload-week surfacing.
5. Coach context payload addition.
6. Headless tests: full wizard run writes one entry; skip-rescale math; Octane
   pillar appears; re-test delta rendering; sync merge.
7. Update `COMPETITIVE-LANDSCAPE.md` (DRVN Feb-2026 relaunch + our answer) and
   `FAIRWAYFUEL-SCORE.md` (new pillar).
