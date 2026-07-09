---
name: golf-fitness-domain-reference
description: >
  The domain theory of Yardsmith AS IMPLEMENTED IN THIS APP — the one home for
  domain math. Load this when you need to: understand or change the training
  thesis / evidence base (clubhead speed, Brennan 2024 effect sizes, the
  SCIENCE behind a contested claim — for whether we may PUBLISH a claim, load
  yardsmith-external-positioning instead); modify or verify wave periodization
  (waveFor/effTarget/purposeFor/overspeedDose in 035-training-plan.js); touch
  prescribed loads, double progression, e1RM/Epley; touch the macro calculator
  (Mifflin–St Jeor, GOALS table, meal role weights, carb timing, ff_kcal_adj);
  touch the Octane score pillars, the 7-iron speed test, the mobility screen, or
  fuel adherence scoring; or define any jargon term (TDEE, RIR, deload, CMJ,
  smash factor, CHS, concurrent training…). Keywords: periodization, macros,
  protein, deload, peak, overspeed, clubhead speed, Octane, e1RM, speed test,
  mobility, glossary, effect size, banned claims.
---

# Golf-fitness domain reference (as applied in Yardsmith)

All file:line references verified at HEAD `f21930a`, 2026-07-08. This is the
theory-and-math reference, not a textbook: every number here is either in the
repo's evidence docs (`CLUBHEAD-SPEED-REFERENCE.md`, `NUTRITION-AND-TRAINING-REFERENCE.md`)
or in the shipped code, and the code is the final authority when they disagree.

**When NOT to use this skill.** Storage shapes, sync/merge semantics, and the
`ff_*` key catalog → `yardsmith-data-and-sync`. Module layout / IIFE contract →
`yardsmith-architecture-contract`. How to test any of this → `yardsmith-playwright-harness`
and `yardsmith-validation-and-qa`. Shipping a change to the Speed & Power day
specifically → `yardsmith-speed-day-campaign` (it routes back here for theory).
Public/marketing claims policy → `yardsmith-external-positioning` §3 (it owns
the allowed/banned publication rulings and framing; §2 below records only each
claim's scientific status). Historical incidents (e.g. the wave-engine misfire) →
`yardsmith-failure-archaeology`.

---

## 1. The thesis

**Driving distance is a physical output before a technical one: lean mass →
power → yards.** Yardsmith builds muscle *as a means to clubhead speed* —
"Turn muscle into distance" (YARDSMITH-BRAIN.md §1). The honest phrasing the
repo insists on: **"lean/quality mass → power → distance," not bulk**
(CLUBHEAD-SPEED-REFERENCE.md §11, closing note). Corollaries baked into product
decisions:

- **Flexibility is NOT a speed lever.** It is an *injury* lever (see §7 below).
  Never sell stretching or mobility as a way to gain mph.
- **A cut is a speed phase, not an aesthetics phase** — dropping fat while
  protecting muscle raises power-to-weight (025-macro-calculator.js:21-24 copy).
- **Prove it per-user**: the app's own driver-carry and 7-iron trends are the
  evidence, never a marketing stat (CLUBHEAD §9.6).
- **Concurrent beats block-switching** at equated volume — one consistent week
  trains strength + hypertrophy + power/speed for all 20 weeks; this is a
  settled decision (NUTRITION §7), don't re-fight it.

### 1.1 The anchor evidence — Brennan et al. 2024

*Sports Medicine* 54:1553–1577, doi:10.1007/s40279-024-02004-5. Meta-analysis,
20 studies of 3039 screened; pooled z-transformed correlations (`zr`) with
driver clubhead speed (CHS). Full table in CLUBHEAD-SPEED-REFERENCE.md §10.1:

| Physical quality | zr [95% CI] |
|---|---|
| **Jump impulse** | **0.82 [0.63–1.02]** — strongest of all |
| Upper-body **explosive** strength (med-ball throw velocity) | **0.67 [0.53–0.80]** |
| Jump peak power | 0.66 [0.53–0.79] |
| Jump displacement (height) | 0.53 [0.28–0.78] |
| Upper-body non-explosive strength | 0.48 [0.28–0.68] |
| Lower-body strength | 0.47 [0.24–0.69] |
| Anthropometry (size/mass) | 0.43 [0.29–0.58] |
| Muscle capacity | 0.17 [0.04–0.31] (trivial but significant) |
| **Flexibility** | **−0.04 [−0.33 to 0.26] — NOT significant** |
| **Balance** | **−0.06 [−0.46 to 0.34] — NOT significant** |

Two headline reads (CLUBHEAD §10.1): jump *impulse* is the single strongest
correlate, and explosive upper-body strength (0.67) beats non-explosive (0.48)
— it's *how fast* you make force, not just how much.

**Corroborations** (CLUBHEAD §11.2, §10.1):
- **Ehlert 2021** (three-level meta-analysis, *Eur J Sport Sci*): upper-body
  power r≈0.51 > lower-body strength r≈0.46 > upper-body strength r≈0.41 >
  lower-body power r≈0.38; **general/passive flexibility r≈0.03 [−0.08 to
  0.14] — crosses zero**.
- **Johnson et al. 2025** (NCAA D-I, n=21, 11F/10M): isometric upper-body
  strength + vertical jump r=0.70–0.82 with CHS; sexes differ in absolutes but
  not rotational kinematics (basis for the app's sex/age-calibrated benchmarks,
  `ffBench` in 070-workout-player…js:784-796). Small exploratory sample —
  supporting, not definitive.
- Mass→speed: fat-free mass ↔ CHS r≈0.42 (juniors, growth-confounded); body
  mass r≈0.51 (elite males) — ~20–26% of variance, correlational (CLUBHEAD §11.1).
- Causal evidence: 8-week periodized barbell program raised CHS while a
  bodyweight/rotational control group's CHS *declined* (p=0.028, Oranchuk 2020);
  10 weeks of resistance training raised driver speed and distance in 45 amateur
  women (Hegedus 2016); +4.9% CHS in ~71-year-old men (Thompson 2007). All
  small-n, directionally consistent (CLUBHEAD §11.3, §11.7).

This ranking is why the Speed & Power day **leads with a countermovement jump
and both rotational and seated/chest med-ball throws** (best jump variant:
CMJ > squat jump > drop jump, Wells 2018; rotational throw predicts best in
amateurs, seated throw in PGA pros — so the plan includes both; CLUBHEAD §10.1).

## 2. Scientific status of contested claims

This section records only the SCIENCE — what the evidence says each contested
claim is worth. **The may-we-print-it ruling, the full banned list with
mandatory framing, and everything about public/marketing wording live in
`yardsmith-external-positioning` §3** (mechanically enforced by
`claims-lint.mjs`, shipped by `yardsmith-research-frontier`). Load that skill
before writing any outward-facing copy; this table is for understanding the
evidence, not for deciding what to publish.

| Claim | Scientific status |
|---|---|
| "+8.2 mph average" (MyGolfSpy overspeed tester figure) | **REFUTED** — fact-checked in the independent review (CLUBHEAD §9.2) |
| Vendor "+X mph in N weeks" (SuperSpeed/TheStack-style) | Vendor/affiliated marketing, not independent science; the two companies have litigated over each other's ads (CLUBHEAD §9.2) |
| Overspeed clubs add lasting speed | **UNPROVEN** — no independent, peer-reviewed, multi-week RCT exists for SuperSpeed or TheStack. Independent evidence is acute-only: weighted-club warm-up gave a transient **+2.6 mph in the first set only**, did NOT transfer to ball speed — **smash factor dropped, d=−0.82** (Hebert-Losier & Wardell 2021, n=12); overspeed sticks were **no better than a bodyweight warm-up** (Bliss et al. 2021, n=13) (CLUBHEAD §9.2) |
| Flexibility/stretching adds clubhead speed | **NOT SIGNIFICANT** — zr=−0.04 (Brennan 2024), r≈0.03 (Ehlert 2021); not a speed lever (CLUBHEAD §11.2) |
| Bryson "23 lb of muscle in 12 weeks" / "27 lb fat lost simultaneously" | Physiologically implausible content-farm numbers (NUTRITION §13) |
| Long-drive "sink vs load" on-camera ~20 mph demos | Illustrative, self-selected extremes — anecdote, not a measured effect (CLUBHEAD §12.1) |
| Han force-plate study as PMID 28822263 | Wrong ID — it is **PMID 31042142** (CLUBHEAD §11.5) |

**The one defensible headline number: ~4% CHS from combined training.**
Uthoff, Sommerfield & Pichardo 2021 (J Strength Cond Res, 20-study systematic
review): general/nonspecific strength alone ~+1.6% CHS; **combined nonspecific
+ golf-specific ~+4.1% CHS** (~+5.2% distance; per-study range 1.5–11.1%)
(CLUBHEAD §9.3). How this number may be phrased publicly (the "typical, not
promised" rule and the mph/yard translation) → `yardsmith-external-positioning`
§3. Overspeed swings ship in-app only as a low-cost, honestly-framed
**adjunct** ("modest evidence — the add-on, not the main event", the in-app
copy at 035-training-plan.js:21). Caution analogue: baseball weighted-ball
training produced ~24% structural elbow injuries vs 0% controls in the best
RCT (Reinold 2018) — the *caution* transfers to golf, not the numbers
(CLUBHEAD §9.4).

Open questions the evidence cannot answer (bounds on future claims, CLUBHEAD
§9.7, §11.8): no independent longitudinal overspeed-club RCT; golf-specific
overspeed injury incidence unmeasured; optimal dose unknown; no quantified
max-strength "threshold"; thoracic-rotation ROM vs CHS unconfirmed.

## 3. Wave periodization — exactly as implemented

Everything below is `src/js/app/035-training-plan.js`. The 20-week plan is ONE
authored base week (`PHASES[0]`, lines 4-76: `days5` = 5-day split, `days4` =
balanced 4-day, plus a Speed & Power day with `field`/`gym` variants chosen by
`speedMode()` at 221-225 — remembered in `ff_speedmode`, defaulted to gym if a
barbell is owned). The week itself never changes; a **target-transform
pipeline** reshapes it per week and per goal.

### 3.1 The pipeline: `effTarget(sr, name, week)` (line 442)

```
effTarget = waveAdjust( adjSets(sr, name), name, week )
```

`sr` is the authored target string (e.g. `"4 × 6 (heavy · fast up)"`). This is
the **single source of truth** for both display and the loggers' prescriptions
— never compute a target any other way, or they drift (load-bearing invariant).

### 3.2 `purposeFor(name)` — the four classes (lines 349-360)

Regex classification of every exercise name, **checked in this order**:

| Class | Meaning | Matched by (in priority order) |
|---|---|---|
| 🌀 golf rotation | rotation/anti-rotation | `Single-Arm` first; then `Wood-?chop \| \bChop\b \| Rotation(al) \| Pallof \| Landmine(?! Press) \| Punch \| Russian Twist` |
| ⚡ power/speed | ballistic/velocity work | `Jump \| Bound \| Slam \| Chest Pass \| Throw \| Toss \| \bClean\b \| Overspeed \| Footwork \| Swing \| Broad \| Plyo \| ^Speed\s` |
| 🏋️ strength | heavy compounds | `Back Squat \| Front Squat \| Leg Press \| Hack Squat \| Bench Press \| Deadlift \| Overhead Press \| Pull-up \| Romanian` |
| 💪 mass | everything else (hypertrophy accessory) | default |

Rotation is checked **before** power so rotational throws/chops stay 🌀;
`Landmine Press` is explicitly excluded from 🌀 (it's a chest press). ⚡ work
must **never** receive the 🏋️ "drop reps, go heavier" prescription nor be
trimmed like a 💪 accessory — that exact bug shipped and was fixed in commit
`6932f28` ("Seated chest throw" read as 💪 and got gutted at Peak; "Speed bench
press" matched `/Bench Press/` and got the strength prescription). **Any new
catalog/exercise name must be checked against `purposeFor()` before shipping**
— string-matching names to derive training logic is fragile by design.

### 3.3 `waveFor(week)` — 6-week cycles + 2-week Peak (lines 410-421)

```
pos = ((week−1) % 6) + 1
pos 1–3  → accumulate   (weeks 1-3, 7-9, 13-15)
pos 4–5  → intensify    (weeks 4-5, 10-11, 16-17)
pos 6    → deload       (weeks 6, 12, 18)
week ≥19 → peak         (weeks 19-20)
```

**`ff_event` re-anchoring** (`eventInfo()`, 398-409; override at 411-415): a
stored `{date, name}` big-event date maps to a plan week only if it falls
0–139 days after `planStart()` (weeks 1-20) and is not >1 day past. Then:
**event week and the week before → peak; the week after → deload**; all other
weeks keep the base cadence. `curWeek()` itself is date-anchored:
`floor(daysSinceStart/7)+1` clamped 1-20 (040-workout-logger.js:69-74).

### 3.4 `adjSets` + `waveAdjust` — what each phase does to each class

**Retain mode first** (`trainRetain()`, 365: goal is `maintain` or `cut`):
`adjSets` (366-369) trims **one set off 💪 accessories only** (floor 2 sets);
🏋️/⚡/🌀 untouched — that's what protects muscle and clubhead speed in a
deficit.

Then `waveAdjust` (430-440), using `bumpReps` (first `×N` in the string,
422-424) and `trimSets` (leading set count, floor 2, 425-427):

| Wave | 🏋️ strength | 💪 mass | ⚡ power | 🌀 rotation |
|---|---|---|---|---|
| Accumulate | unchanged (add reps toward the top of range yourself) | unchanged | unchanged | unchanged |
| Intensify | **−2 reps (floor 3)** — only if `plainReps` | **−1 set** | unchanged | unchanged |
| Deload | −1 set | −1 set | −1 set | −1 set |
| Peak | **−2 sets** | **−2 sets** | −1 set | −1 set |

`plainReps(sr)` (429) = `/[×x]\s*\d+\s*($|\/|\()/` — rep counts shift only on
plain rep targets, **never** distance/time work ("3 × 40 yd" is exempt).
Deload's "~60% loads" comes from the load prescription (§4), not the target
string.

### 3.5 Overspeed dose ramp — `overspeedDose(week)` (445-450)

Overspeed swings bypass `effTarget` entirely (`speedDrillTarget`, 451-454:
any name matching `/Overspeed/i`):

```
deload or peak week, OR week ≤ 2  →  2 × 5
week 3–8                          →  3 × 5
week ≥ 9                          →  4 × 5
```

A skill/neural dose, not a hypertrophy target: ramp in, back off when fatigue
management matters. In-app framing (035:21): light stick at MAX intent, both
sides, full rest, "modest evidence — the add-on, not the main event."

### 3.6 Session furniture (for completeness)

- **Power primers** (`primerFor`, 325-332): one explosive drill first-and-fresh
  on every lift day — jump 4×3 (squat/lower), med-ball chest pass 4×4 (push),
  Russian KB swing 5×5 (hinge), rotational throw 4×4/side (pull/rotate). Gives
  3-4×/week speed exposure with no metabolic fatigue (NUTRITION §10).
- **RIR/rest copy** (035:295-299): heavy or ≤6 reps → "RIR 2(–3) · rest 2–3 min";
  ≥13 reps → "RIR 1 · rest ~75s"; else "RIR 1–2 · rest ~90s". Rest-timer
  defaults: 120 s between sets, 180 s between lifts (045-inline-logger…js:11).
- **Warm-ups** (`warmupBase`/`warmupList`, 302-324): 5-min day-specific
  mobility list + ramp-up sets; the mobility screen routes targeted fixes in
  (§7). Warm-ups are checklist-only and **never enter the log** — deliberately,
  so e1RM math stays clean (DESIGN-CHANGES.md ~line 256).

## 4. Double progression + load math + e1RM

- **Double progression** (the progression model everywhere): hold the load
  until you hit the **top of the rep range on every working set**, then add a
  small increment. `progressReady(lx, target)` (040-workout-logger.js:170-175):
  needs ≥2 working sets last session, all with reps ≥ the target's top reps.
- **Increment**: `incNum(name)` (040:168) = **5 lb** if name matches
  `/Squat|Deadlift|Hinge|Lunge|Hip Thrust|Leg Press|Romanian|Swing|Carry/i`,
  else **2.5 lb**. Display band `incFor` (040:165): "5–10 lb" / "2.5–5 lb".
- **Prescribed load** `prescribeW(lastW, name, ready, wave)`
  (035-training-plan.js:457-462):
  ```
  no last weight        → null (no prescription; show last as-is)
  wave === "deload"     → max(5, round(lastW × 0.6 / 5) × 5)   // ~60%, rounded to 5 lb
  ready (progression)   → lastW + incNum(name)
  otherwise             → null
  ```
  Prescriptions render as input **placeholders** with one-tap commit — never
  phantom logged values (a recorded deliberate preference).
- **e1RM — Epley estimate** (070-workout-player…js:596-597):
  `e1RM(w, r) = w × (1 + r/30)`; returns 0 unless w>0 and r≥1. Used by the
  Octane strength pillar, PR detection, and exercise history.

## 5. Macro math — exactly as implemented in 025-macro-calculator.js

### 5.1 The daily pipeline (`calc()`, lines 177-300)

```
weightKg = lb / 2.20462 ;  heightCm = (ft×12 + in) × 2.54
BMR  = 10×weightKg + 6.25×heightCm − 5×age + (male ? +5 : −161)   // Mifflin–St Jeor (line 185)
TDEE = BMR × activity          // 1.2 / 1.375 / 1.55 / 1.725 / 1.9 (line 26 labels)
target = TDEE × (1 + goal.pct)
proteinG = round5( target × goal.proteinPct / 4 )   // ← computed BEFORE the adaptive nudge
target  += ff_kcal_adj                               // metabolism check-in (lines 206-207)
fatG     = goal.fatG                                 // fixed grams
carbG    = round5( (target − proteinG×4 − fatG×9) / 4 ), floored at 0
```

**Order matters**: `ff_kcal_adj` is added *after* protein is set, so the
adaptive nudge flows entirely into carbs (protein and fat are fixed). Macro
kcal values: protein 4, carb 4, fat 9. `round5` = nearest multiple of 5.
Results are stashed to `ff_targets` `{goal,kcal,proteinG,carbG,fatG,mealN,tdee}`
for the AI coach (lines 293-298).

### 5.2 The goal table (`GOALS`, lines 8-25; doc: NUTRITION §10)

| Goal (key) | kcal adj | Protein %kcal | Fat fixed g | Weekly BW target | Rec. meals |
|---|---|---|---|---|---|
| Lean Bulk (`leanbulk`) | **+10%** | 30% | 65 | +0.25–0.5%/wk | 4 |
| Bulk (`bulk`) | **+20%** | 30% | 70 | +0.5–0.75%/wk | 5 |
| In-Season Maintain (`maintain`) | ±0% | 30% | 55 | hold | 4 |
| Lean Out / Cut (`cut`) | **−20%** | **35%** | 50 | −1 to −0.5%/wk | 3 |

Protein-as-%kcal lands most golfers ~0.9–1.1 g/lb building, ~1.0–1.3 g/lb
cutting — deliberately at the top of the evidence range (Morton 2018 plateau at
1.6 g/kg with CI to ~2.2; Helms 2014 for deficits; NUTRITION §4). Fixed fat
grams all sit above the ~0.3 g/lb hormonal floor. The keys above are the only
valid `state.goal` / profile `goal` values — test seeds must use them exactly
(`'leanbulk'`, not `'lean'`).

### 5.3 Meal scheduling + role weights (lines 213-270)

- Eating window **7:30–20:00**; N main meals spaced evenly (single meal → 12:30).
- Training slot anchors (`WORKOUT_SLOTS`, 61-66): morning 7:00, midday 12:00,
  afternoon 16:00, evening 19:00. **Post-workout = anchor + 1.5 h; pre-workout
  = anchor − 1.5 h** (the "~90 min" windows).
- The meal nearest the post window is snapped to it and becomes the
  **post-workout meal**. Labels: first = Breakfast, last = Dinner, one Lunch if
  11:30 ≤ t < 15:00, rest Snacks.
- If a non-post meal sits within **45 min** of the pre window it doubles as
  pre-workout fuel (carb weight **+0.6**); otherwise a separate **Pre-workout
  snack** is added (carbs only, weight 0.8, zero protein/fat).
- Role weights (`ROLEW`, 243-246) — meals are weighted, not even:

  | Role | Protein | Carb | Fat |
  |---|---|---|---|
  | Breakfast | 0.95 | 1.05 | 1.25 |
  | Lunch | 1.05 | 1.00 | 1.00 |
  | Dinner | 1.15 | 0.90 | 1.35 |
  | Snack | 0.70 | 0.80 | 0.55 |
  | Post-workout meal | (its role's p) | **1.60** | role's f **× 0.35** |
  | Pre-workout snack | 0 | 0.80 | 0 |

  Post-workout goes high-carb/low-fat (fat blunts the glycogen refill). Carbs
  are split across **all** feedings by weight, so portions shrink as meals are
  added. `distribute`/`distribute5` (74-88) is a largest-remainder split in
  whole 5 g units that **sums exactly** to the daily total.

### 5.4 The metabolism check-in (adaptive calories)

070-workout-player…js:950-999 + apply handler 085-progress-stats-view.js:678-679.
MacroFactor-style: the calculator is a starting guess; the scale is the meter.

- `weightTrend()` (954-967): least-squares slope over `ff_body` weights within
  the last 32 days; needs ≥2 points spanning ≥10 days. Returns lb/week.
- Due (`adaptiveDue`, 980): a trend exists AND ≥10 days since `ff_lastcheckin`.
- `adaptiveCheck()` (968-979): `desired` = midpoint of the goal's weekly band ×
  bodyweight (0 for maintain); `error = measuredRate − desired`; tolerance
  `max(0.25 lb/wk, |desired|×0.6)`. If off-track:
  `delta = −round(error × 500 / 50) × 50`, clamped **±250 kcal** per check-in
  (≈500 kcal/day per lb/wk of error ≈ 3500 kcal/lb ÷ 7).
- Applying adds delta to `ff_kcal_adj`, clamped **±600 kcal total** (085:678),
  stamps `ff_lastcheckin`, and reruns `calc()` — the change lands in carbs (§5.1).

### 5.5 Fuel adherence score (feeds Octane pillar 6)

030-fuel…js:32-42. Check-off adherence, not calorie accounting:
`fuelScoreFor(iso)` for a logged day = day rating if present (**on = 1,
close = 0.6, off = 0.15**), else the checked meals: ✓ ate-it (`"a"`) = 1,
≈ close (`"c"`) = 0.75, summed and divided by the day's meal count `n`
(capped at 1). `fuelStateFor`: ≥0.85 "on", ≥0.5 "close", else "off";
streak counts on/close days. Storage shape and the 95-day cap →
`yardsmith-data-and-sync`.

## 6. The 7-iron speed test — rationale + biweekly protocol

**Why 7-iron, not driver:** it's more repeatable, so the week-to-week trend is
a cleaner signal that mass is becoming speed (CLUBHEAD §5). Public context
norms (ballpark only; the app never scores against them): PGA Tour ~90 mph
7-iron / ~113 driver; average male amateur ~75–80 / ~93 mph; smash factor tops
out ~1.48–1.50 driver, ~1.33 7-iron. In-app placeholders use `ffBench()`
(070:784-796): typical male amateur 85 mph 7-iron / 245 yd drive (75/210 at
50+), female 65/175 (60/160 at 50+) — **context lines only; all scoring is
trend-vs-your-own-baseline**. Note: `seven:85` / `drive:245` sit above the
reference doc's amateur averages and even above ffBench's own range string
("~75–80 mph") — whether aspirational placeholder or drift is unresolved; see
`yardsmith-research-frontier` problem 4 before treating them as norms.

Protocol as implemented (060-speed-test…js):

- Cadence `SPEEDTEST_EVERY = 14` days; **due when days-since ≥ 13** or no
  entry exists (lines 18-19). The clock counts the newest speed number of ANY
  kind — guided test or manual/onboarding baseline — so a baseline logged today
  doesn't immediately demand a retest (`daysSinceTest`, 11-17).
- Ritual: warm-up checklist (leg swings ×10/side, 90/90 switches ×6/side,
  open-book T-spine ×8/side, build-up swings 10 ramping 50→90%) → **3
  max-intent 7-iron swings, full rest between, best one counts** → same
  measuring tool every test (launch monitor, radar app, or sim — consistency
  makes the trend honest).
- Saving (107-120): best writes into `ff_body` via `logBodyEntry("", best, "")`
  — the single writer — so trends, Octane, and the leaderboard all feed
  automatically; a detailed `{ts, date, week, swings[3], best}` entry lands in
  `ff_speedtest` (capped 60); PR = beats all-time best; the leaderboard
  republish flag is cleared.
- **House conversion: +1 mph 7-iron ≈ +2 yards of carry** — used in the
  glossary (009-glossary.js:21), the share card (060:123-131, `gain×2`), and
  Stats copy (070:862). A rule-of-thumb for copy, not a measured claim.

## 7. Mobility = durability, never speed

The two claims must never be conflated (CLUBHEAD §11.6; NUTRITION §9.2):

1. **General/passive flexibility does not predict clubhead speed** (r≈0.03
   Ehlert; zr=−0.04 NS Brennan).
2. **Specific rotational mobility is tied to injury**: amateur golfers with
   low-back pain showed a **~10° lead-hip internal-rotation deficit** (21.1° vs
   31.1°, est. Cohen's d≈1.1 — large; PMID 19897166). Association, not proven
   cause, and lead hip only. Thoracic-rotation ROM vs CHS is *unconfirmed*.

So mobility work stays in the program — framed as injury insurance and
"the mass you add never costs you rotation" — and is never pitched as a speed
hack. Implementation (065-mobility-screen…js):

- **3-move self-screen**, ~3 min, no gear: seated trunk rotation, 90/90 hip
  switch, overhead deep squat — each scored 0/1/2 (lines 8-18).
- **Score = round(sum / 6 × 100)** → 0–100 (line 88); entries `{ts, date,
  tests{trunk,hip,squat}, score}` capped at 40 (line 90).
- Cadence: re-screen due every **28 days** (`mobDue`, 21); the Octane pillar
  shows "Re-screen due" past **35 days** (070:683).
- **Warm-up routing** (`mobLimits` 23-27 → `warmupList` 035:312-324): any test
  scoring <2 injects a targeted fix into the relevant warm-ups — trunk →
  open-book T-spine (alt: thread-the-needle); hip → 90/90 switches (alt:
  adductor rock-backs), lower days only; squat → deep-squat holds + ankle
  rockers, lower days only. Never duplicates a move already in the list.

## 8. Octane — the pillar formulas (all six)

Engine: `ffScore()` at 070-workout-player…js:621-714. A 0–100 **trajectory +
consistency** score (fuel-gauge E→F), never a normative fitness rating and
never a leaderboard — no published norm tables, by policy (OCTANE-SCORE.md
header; that policy is current even though the doc is stale, see below).

| # | Pillar | Max | Formula (all `clamp`ed to [0, max]) | Needs |
|---|---|---|---|---|
| 1 | Consistency | 35 | `35 × clamp(sessionsLogged / (freq × min(week,8)), 0, 1)` — freq from `planState.freq` (default 4); sessions = all `ff_log` entries | ≥1 logged session |
| 2 | Clubhead speed | 30 | `15 + speedGain% × 220` where gain = (last − first)/first over `ff_body` 7-iron entries; neutral start = 15/30 | ≥2 speed entries |
| 3 | Strength (e1RM) | 25 | `10 + avgGain% × 150`; per-lift Epley e1RM, first session's top vs best-ever, averaged over lifts matching `/Squat\|Deadlift\|Bench\|Press\|Row\|Romanian\|Hinge\|Hip Thrust\|Pull-?up\|Chin/i` (605-619) | logged weights across weeks |
| 4 | Power-to-weight | 10 | `5 + (speedGain% − weightGain%) × 250` — speed outpacing bodyweight scores high | ≥2 speeds AND ≥2 weights |
| 5 | Mobility | 10 | `lastScreenScore / 100 × 10`; "re-screen due" note past 35 days | ≥1 screen |
| 6 | Fuel | 10 | `avg(fuelScoreFor) × 10` over the last **≤7 logged days within a 14-day lookback** (693-698) | ≥1 fuel-logged day |

**Rescaling rule** (709-713): only pillars with data count —
`score = round(gotPts / gotMax × 100)` over the *have* pillars; with no data at
all the score is `null` and the gauge reads "–". Fair on day one, sharper as
data accrues.

**Coaching summary** (`ffScoreSummary`, 723-732): picks the "biggest lever" —
the weakest have-pillar by pts/max, unless the weakest is >60% filled and a
locked pillar exists, in which case the largest locked pillar wins. Lever copy
per pillar in `FF_LEVER` (715-722).

Related rules: rest-day check-offs live in `ff_rest` and deliberately do NOT
feed Octane or streaks (only `ff_log` sessions count); `ff_score` is a
device-local snapshot written for the AI coach (`saveScoreSnapshot`).

**⚠️ OCTANE-SCORE.md is stale** (last touched by the rebrand commit `89bab89`
only): it documents 5 pillars — **the shipped 6th pillar, Fuel (weight 10), is
missing** — and says the gauge renders "at the top of the Train view" when it
now lives in the Stats **Octane hub**. Trust this skill + the code; the current
record is DESIGN-CHANGES.md ("Octane: Fuel is the 6th pillar", ~line 277).

## 9. Glossary — every domain term a session will meet

Domain terms only; storage/infra terms (tombstone, CAS, merge registry, blob…)
are defined in `yardsmith-data-and-sync`. The app ships its own user-facing
glossary (`FF_TERMS`, 009-glossary.js:8-25) — keep the two consistent if you
edit either.

**Energy & nutrition**
- **BMR** — Basal Metabolic Rate: calories burned at complete rest. Computed
  via **Mifflin–St Jeor** (the most accurate general-population predictive
  equation; ±10% error, so it's a starting point the scale then corrects).
- **TDEE** — Total Daily Energy Expenditure = BMR × activity multiplier
  (1.2–1.9). Maintenance calories; every goal is an adjustment from it.
- **Surplus / deficit** — eating above/below TDEE. App goals: +10% (lean bulk),
  +20% (bulk), 0 (maintain), −20% (cut).
- **Macro** — protein / carbs / fat, at 4 / 4 / 9 kcal per gram. Set in
  priority order: protein → fat → carbs fill the rest.
- **Lean Bulk / Bulk / Maintain / Cut (Lean Out)** — the four goals
  (`GOALS` keys `leanbulk`/`bulk`/`maintain`/`cut`). A cut here is a speed
  phase: protect muscle, drop fat, raise power-to-weight.
- **Leucine threshold** — the per-meal protein dose (~0.4 g/kg, ≈30–50 g) that
  maximally triggers muscle protein synthesis; why protein spreads across 3–5
  meals.
- **Carb timing / pre- & post-workout windows** — carbs concentrated ~90 min
  before and ~90 min after the training slot; post-workout meal goes
  high-carb/low-fat. A fine-tuning tool, secondary to daily totals.
- **Metabolism check-in** — the ~10-day adaptive loop comparing measured
  weight trend to the goal's intended rate, nudging calories (±250/check-in,
  ±600 total) into carbs.
- **Fuel adherence** — did the planned meals happen (✓/≈/day-rating), scored
  0–1 per day. Deliberately not calorie tracking (anti-MyFitnessPal stance).

**Training**
- **Concurrent training** — training strength, hypertrophy, and power/speed in
  the same week, every week (vs block periodization). Yardsmith's settled
  model: equal for size, ≈ or better for strength, keeps speed sharp.
- **Block periodization** — sequential dedicated blocks (hypertrophy → strength
  → power). Rejected here except as the *wave* overlay below.
- **Interference effect** — endurance work blunting power gains; running is
  the worst offender. The plan prescribes no endurance; prefer cycling if
  conditioning is added.
- **Wave periodization** — the 6-week Accumulate → Intensify → Deload cycle
  (+2-week Peak) overlaid on the one concurrent week (§3).
- **Accumulate / Intensify / Deload / Peak** — build volume / drop reps &
  raise loads / recover (−1 set, ~60% loads) / cut volume ~half, hold
  intensity.
- **Deload** — a planned easy week; recovery is when adaptation lands. Not
  lost time.
- **Taper / peaking** — pre-event: cut volume 40–50% for ≤2 weeks holding
  intensity (~3–6% power bump). Implemented via `ff_event` re-anchoring.
- **Progressive overload** — the growth engine: add weight, reps, or sets over
  time; log every session.
- **Double progression** — hold the load until the top of the rep range on
  every set, then add 2.5–5 lb (upper) / 5–10 lb (lower) (§4).
- **1RM / e1RM / Epley** — one-rep max; estimated 1RM from a lighter set via
  Epley `w × (1 + r/30)`. Lets strength compare across different set/rep days.
- **RIR** — reps in reserve: clean reps left short of failure. "RIR 2" = stop
  2 shy. Each lift shows target RIR + rest.
- **Hard set** — a working set taken close to failure (~0–3 RIR). Hypertrophy
  shows steep diminishing returns past ~10–12 hard sets/muscle/week.
- **Hypertrophy** — muscle growth; the 💪 accessory work (8–15 reps typical).
- **Retain mode** — the training consequence of maintain/cut goals: one set
  trimmed from 💪 accessories only.
- **Primer** — the single explosive drill opening every lift day, first and
  fresh (jump / chest pass / KB swing / rotational throw).
- **RFD** — rate of force development: how fast you reach high force; the
  quality most tied to swing speed.
- **CMJ** — countermovement jump: dip then explode up. The best-evidenced jump
  variant and the Speed & Power day's lead drill.
- **Plyometrics / ballistic** — jump/throw training where the load is
  accelerated through release/takeoff; low reps (3–5), max intent, full rest,
  stop when a rep slows.
- **Overspeed training** — swinging a lighter-than-normal implement at maximal
  intent to push swing velocity. Mechanism-plausible, thin independent
  evidence; an adjunct in this app, never the headline (§2).
- **PAP / potentiation** — "post-activation potentiation" warm-up effects;
  unproven for CHS in golf (one null study) — don't overrate it.

**Golf / measurement**
- **CHS** — clubhead speed (mph), measured at impact. The app's trained
  intermediate outcome.
- **Ball speed** — speed of the ball off the face; what actually creates
  distance together with launch conditions.
- **Smash factor** — ball speed ÷ club speed; strike-quality check. Ceiling
  ~1.48–1.50 driver, ~1.33 7-iron. (Why the +2.6 mph overspeed result didn't
  become distance: smash dropped.)
- **Carry / driver carry** — air distance, roll excluded. The app's headline
  outcome, stored per-day on `ff_body.d`.
- **7-iron speed test** — the biweekly best-of-3 max-swing ritual (§6);
  7-iron because it's more repeatable than driver.
- **Kinetic chain / summation of speed** — segments (ground → hips → torso →
  arms → club) firing proximal-to-distal, each decelerating to sling the next.
- **X-factor (stretch)** — hip–shoulder separation at/after the top of the
  backswing; among the strongest swing-speed correlates.
- **GRF** — ground-reaction force; the three-force coaching lens = vertical
  (jump), lateral (shift), rotational (free moment) — all three trained on the
  speed day.
- **Anti-rotation** — core work resisting rotation (Pallof press, dead bug);
  trains the trunk "brake" that slings the club.
- **90/90** — the hip mobility position/switch drill (both knees at 90°).
- **Lead-hip internal rotation** — the specific mobility measure whose ~10°
  deficit is tied to golfer low-back pain (§7).
- **Power-to-weight** — clubhead speed relative to bodyweight; keeps a bulk
  honest (Octane pillar 4).

**App-specific coinages** (user-facing; full copy in `FF_TERMS`)
- **Octane** — the 0–100 six-pillar engine score, shown as a fuel gauge (E→F).
- **Mission** — the driver-carry goal (+5…+30 yds, `ff_goalyds`); a goal that
  is tracked, never a promised gain.
- **Banked** — done and saved into history/trends.
- **Iron moved** — total volume: Σ(weight × reps).
- **Receipts** — correlations from the user's own rounds proving training →
  ball flight (appear after ~5 rounds).
- **Sunday Scorecard** — the week summarized as six golf "holes" (sessions,
  iron moved, speed test, weigh-ins, mobility, fuel days).
- **Speed Test Day** — §6's ritual. **Field/Gym speed mode** — the two Speed &
  Power day variants (`ff_speedmode`).
- **20-week season** — the whole plan arc: waves + deloads + 2-week peak,
  aimed at the mission (and `ff_event` if set).

**Evidence vocabulary**
- **Meta-analysis** — pooled statistical synthesis of many studies; the app's
  preferred evidence tier.
- **zr** — z-transformed pooled correlation (Brennan 2024's effect metric);
  read like r: ~0.5 moderate, ~0.8 strong.
- **NS** — not significant: the 95% CI crosses zero (flexibility, balance).
- **r** — Pearson correlation. **d** — Cohen's d standardized difference
  (±0.8 = large). **RCT** — randomized controlled trial.
- **Acute vs longitudinal** — one-session effect vs multi-week training
  effect. The overspeed-club literature is almost entirely *acute* — the core
  reason its claims are capped (§2).

## Provenance and maintenance

Facts date-stamped 2026-07-08, HEAD `f21930a`. Line numbers drift with edits —
re-verify before citing:

- Wave engine: `grep -n "purposeFor\|waveFor\|effTarget\|overspeedDose\|prescribeW" src/js/app/035-training-plan.js`
- Epley + Octane pillars: `grep -n "e1RM\|function ffScore" src/js/app/070-workout-player-full-screen-guided-sessio.js` (engine ~lines 591-732)
- Macro pipeline + GOALS: `sed -n '8,25p;177,300p' src/js/app/025-macro-calculator.js`
- Adaptive check-in: `grep -n "weightTrend\|adaptiveCheck\|adaptiveDue" src/js/app/070-workout-player-full-screen-guided-sessio.js`; clamp: `grep -n "ff_kcal_adj" src/js/app/085-progress-stats-view.js`
- Speed test cadence: `grep -n "SPEEDTEST_EVERY\|speedTestDue" src/js/app/060-speed-test-day-the-biweekly-testing-ritu.js`
- Mobility scoring/cadence: `grep -n "mobDue\|score=Math.round" src/js/app/065-mobility-screen-the-3-move-durability-ch.js`
- Fuel scoring: `grep -n "fuelScoreFor\|fuelStateFor" src/js/app/030-fuel-check-off-adherence-not-accounting.js`
- Progression helpers: `grep -n "progressReady\|incNum\|incFor" src/js/app/040-workout-logger.js`
- Effect sizes / banned claims: CLUBHEAD-SPEED-REFERENCE.md §§9-11 (search
  "+8.2" for the refutation, "0.82 \[0.63" for the Brennan table, "4.1%" for
  the defensible number).
- OCTANE-SCORE.md staleness: `git log --oneline -1 -- OCTANE-SCORE.md` — if it
  has been edited since `89bab89`, re-check whether the 6-pillar gap was fixed
  and update §8 here.
- The AI coach's knowledge base (`supabase/functions/_shared/knowledge.ts`)
  mirrors these docs; if you change domain numbers here or in the reference
  docs, check whether knowledge.ts needs the same change (manual discipline —
  no tooling enforces it).
