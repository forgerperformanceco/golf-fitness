# FairwayFuel — Nutrition & Training Reference

The knowledge base behind the FairwayFuel calculator and training plan. This is the
"why" behind every number the app produces, plus the broader sports-nutrition and
bodybuilding principles it's built on.

> **Important framing — is this golf-specific or just fitness?**
> Mostly **fitness.** The science of calories, macros, protein targets, and nutrient
> timing is about **body composition and athletic performance in general** — it is
> essentially identical for a golfer, a lifter, or any physique/strength athlete.
> Golf only changes things at the *margins* (see [§9](#9-where-golf-actually-changes-things)).
> So the right mental model is: **be a fit, well-fueled athlete first; apply the small
> golf-specific tweaks second.** Building muscle and fueling it correctly is a
> general-athlete problem, not a golf problem. The golf lens matters most for *what you
> do with* that fitness — turning mass into clubhead speed, and fueling a 4–5 hour round.

---

## Table of contents
1. [Energy: BMR & TDEE](#1-energy-bmr--tdee)
2. [Goal calorie adjustments](#2-goal-calorie-adjustments)
3. [Macro rules (and the science behind them)](#3-macro-rules-and-the-science-behind-them)
4. [Protein: the master nutrient](#4-protein-the-master-nutrient)
5. [Nutrient timing: pre- & post-workout](#5-nutrient-timing-pre--post-workout)
6. [Meal frequency & per-meal distribution](#6-meal-frequency--per-meal-distribution)
7. [Bodybuilding / hypertrophy principles](#7-bodybuilding--hypertrophy-principles)
8. [Gaining ~10 lb of muscle: realistic rate & timeline](#8-gaining-10-lb-of-muscle-realistic-rate--timeline)
9. [Where golf actually changes things](#9-where-golf-actually-changes-things)
10. [The app's exact formulas & config](#10-the-apps-exact-formulas--config)
11. [Supplements: the few that actually work](#11-supplements-the-few-that-actually-work)
12. [How FairwayFuel compares to other calculators](#12-how-fairwayfuel-compares-to-other-calculators)
13. [Applied example: Bryson DeChambeau (vetted)](#13-applied-example-bryson-dechambeau-vetted)
14. [Sources & further reading](#14-sources--further-reading)
15. [Disclaimer](#15-disclaimer)

---

## 1. Energy: BMR & TDEE

**BMR (Basal Metabolic Rate)** — calories burned at complete rest. FairwayFuel uses the
**Mifflin–St Jeor equation**, the most accurate predictive formula for the general
population:

```
Men:   BMR = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) + 5
Women: BMR = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) − 161
```

**TDEE (Total Daily Energy Expenditure)** = BMR × an activity multiplier:

| Activity level | Multiplier | Description |
|---|---|---|
| Sedentary | 1.20 | Desk job, little/no exercise |
| Light | 1.375 | Light training 1–3×/week |
| Moderate | 1.55 | Training 3–5×/week |
| Very active | 1.725 | Hard training 6–7×/week |
| Athlete | 1.90 | 2-a-days / physical job + training |

TDEE is your **maintenance** calories — eat this and weight stays roughly stable.
Everything else is an adjustment up or down from here.

> **Reality check:** predictive equations carry a ±10% error. They are a *starting
> point.* Track bodyweight for 2–3 weeks and adjust calories ±100–200/day based on the
> actual trend, not the formula.

---

## 2. Goal calorie adjustments

| Goal | Adjustment | Typical use |
|---|---|---|
| **Lean Bulk** | **+10%** (~+250–350 kcal) | Slow, lean muscle gain — minimal fat |
| **Bulk** | **+20%** (~+400–600 kcal) | Aggressive off-season mass |
| **Maintain** | **±0%** | Hold composition (e.g. in-season) |
| **Cut / Lean Out** | **−20%** (~−400–600 kcal) | Fat loss while protecting muscle |

**Surplus size matters.** Muscle is built slowly; a bigger surplus mostly adds *fat*,
not extra muscle. For most trainees past the beginner stage, a **+10–15% lean bulk** is
the sweet spot. A larger +20% bulk is for hard-gainers or those prioritizing strength
over leanness, and should be followed by a cut.

**Deficit size matters too.** A ~20% deficit (~0.5–1% bodyweight/week loss) is
aggressive enough to lose fat steadily but moderate enough — with high protein and hard
training — to retain muscle. Crash deficits cost muscle and performance.

---

## 3. Macro rules (and the science behind them)

FairwayFuel sets macros in a fixed priority order: **protein → fat → carbs fill the
rest.** This is the standard physique-athlete approach.

### The app's rules (user-tuned)
1. **Protein = 1.0–1.2 g per lb of bodyweight (per goal), rounded to an even number** —
   higher on a bulk/cut. See [§4](#4-protein-the-master-nutrient).
2. **Fat is capped at a hard maximum — 65 g** (50 g on a cut). Never higher.
3. **Carbs fill the remaining calories**, rounded to an even number, then **distributed
   across the day** (bigger dinner, low-fat post-workout meal — see [§6](#6-meal-frequency--per-meal-distribution)).

### Why this works
- **Protein first** because it's the most important macro for body composition (see §4).
- **Fat second, with a floor in mind.** Dietary fat supports hormones (including
  testosterone) and the absorption of fat-soluble vitamins. The usual *minimum* is
  ~0.3 g/lb (≈0.6–0.8 g/kg) or ~20% of calories. The app's fat **cap** is a deliberate
  *ceiling*: it keeps fat from crowding out carbs, which are the macro that actually
  fuels hard training and a long round of golf. For most people in the 180–220 lb range,
  the **65 g** cap sits comfortably above the hormonal minimum while leaving room for carbs.
  On a **cut the cap drops to 50 g** — on a deficit those ~135 calories are better spent on
  protein (muscle retention) and carbs (training performance), and 50 g still lands near the
  ~20%-of-calories floor for most cutters.
- **Carbs last** because they're the "performance and flexibility" macro — they fuel
  high-intensity work, refill muscle glycogen, and are easiest to flex up (bulk) or down
  (cut) without touching the protein/fat that protect muscle and hormones.

### Standard evidence-based ranges (for context)
| Macro | Common range | Notes |
|---|---|---|
| Protein | 0.7–1.0 g/lb (1.6–2.2 g/kg) | Higher end on a cut |
| Fat | 0.3–0.5 g/lb (≈20–35% kcal) | Don't go below ~0.3 g/lb |
| Carbs | Remainder | 3–5 g/kg general; 5–8+ g/kg for high-volume training |

Calorie values: **protein 4 kcal/g, carbs 4 kcal/g, fat 9 kcal/g.**

---

## 4. Protein: the master nutrient

Protein is the single most important dietary lever for building or keeping muscle —
**when in doubt, err high.** It's satiating, it has the highest thermic effect, and
overshooting the "optimal" number costs nothing but a little money.

**What the research says (and why we bias upward):**
- **Morton et al. 2018** (meta-analysis, 49 RCTs, *Br J Sports Med*): muscle/strength gains
  *plateau* around **1.6 g/kg/day**, but the confidence interval runs up to **~2.2 g/kg
  (1.0 g/lb)** — so 1 g/lb is the smart upper anchor for building.
- **Helms et al. 2014** (review for lean athletes): in a **calorie deficit, go higher —
  2.3–3.1 g/kg (≈1.1–1.4 g/lb)** — and the leaner you are, the higher in that range, to
  protect muscle.
- **ISSN** position stand: 1.4–2.0 g/kg supports most athletes; for **fat loss, intakes
  >3.0 g/kg** are supported in lean, resistance-trained individuals.

**What FairwayFuel uses** (per-goal, erring high — 1 g/lb minimum everywhere):

| Goal | Protein |
|---|---|
| In-Season Maintain | **1.0 g/lb** |
| Lean Bulk | **1.1 g/lb** |
| Bulk | **1.15 g/lb** |
| Cut / Lean Out | **1.2 g/lb** |

Protein ticks **up on a bulk** (to back the extra training volume) and is **highest on a
cut** (muscle preservation in a deficit). For a 165 lb athlete that's ~166 g maintaining,
182 g lean bulking, 190 g bulking, and 198 g cutting.

- **~1 g/lb is the floor, not the ceiling.** Total daily intake is what matters most;
  hitting the number every day beats perfect timing.
- **Per-meal dose:** muscle protein synthesis is maximized by roughly **0.4 g/kg per
  meal** (~0.18 g/lb, ≈30–50 g for most people) — enough to clear the "leucine
  threshold" that triggers the building response.
- **Distribution:** spreading protein across **3–5 meals**, each hitting that threshold,
  is modestly better for muscle than skewing it all into 1–2 meals.
- **Quality:** complete proteins (meat, fish, eggs, dairy, whey) or well-combined plant
  proteins. Whey post-workout is convenient and fast-digesting but not magic — total
  daily intake dominates.
- **Leucine** is the key trigger amino acid (~2.5–3 g per meal); animal proteins and
  whey are naturally rich in it.

---

## 5. Nutrient timing: pre- & post-workout

Timing is a **fine-tuning** tool — real, but secondary to hitting your daily totals.
Its biggest practical value is *fueling the session* and *kick-starting recovery.*

### Pre-workout (≈ 60–90 min before)
- **Carbs** top off muscle glycogen and blood glucose so you can train hard. The app
  allocates a chunk of your daily carbs here (more on a cut, where carbs are scarce and
  best spent around training).
- Favor **easily digestible** carbs: oats, banana, rice, toast, or a sports drink.
- Include some **protein** (20–40 g) if it's been >3–4 hours since your last meal.
- **Training fasted (early morning)?** Fine for many people. Either have the pre-carbs
  *as you start* / sip a carb drink during, or just prioritize the **post-workout meal**.
  For pure performance on hard sessions, having some carbs beforehand usually wins.

### Post-workout (within ≈ 60 min of finishing)
- The "anabolic window" is wider than old bro-science claimed — it's roughly a few
  hours, not 30 minutes — **but** the post-workout meal is still your best single
  glycogen-refill and recovery opportunity, so make it count.
- **Carbs** rapidly replenish glycogen (most important if you train again within ~24 h).
  Faster carbs (rice, potatoes, fruit, dextrose) refill quickest.
- **Protein** (~30–50 g) supplies the amino acids for repair and growth. **Pair carbs
  with protein** post-workout.
- **Per-plan emphasis** (how FairwayFuel weights it):
  - **Bulk** → load the post-workout window hardest (biggest glycogen + growth window).
  - **Lean Bulk** → post-workout is your main "build" feeding.
  - **Maintain** → split fairly evenly around training; save some carbs for the round.
  - **Cut** → concentrate limited carbs tightly around the workout; stay lower elsewhere.

### Hydration & electrolytes
- ~5–7 mL/kg water in the 2–4 h before training; replace ~125–150% of fluid lost in
  sweat afterward. Sodium and potassium matter for long, hot sessions — and for golf.

---

## 6. Meal frequency & per-meal distribution

- **Total intake > meal frequency.** Whether you eat 3 or 6 meals, daily totals drive
  results. Frequency is mostly about **adherence, hunger, and hitting per-meal protein.**
- **Practical sweet spot: 3–5 meals/day**, each with a protein dose above the leucine
  threshold (~30–50 g).
- **More meals** help when you need to eat a *lot* (bulking) or prefer smaller, frequent
  feedings. **Fewer, larger meals** are often more satiating on a **cut.**
- FairwayFuel's recommended **main-meal counts**: Lean Bulk 4 · Bulk 5 · Maintain 4 ·
  Cut 3 — with a pre-workout carb snack and the post-workout meal placed *around training*.

### How FairwayFuel distributes the macros (not evenly!)
Real people don't eat identical meals. The app **weights each meal by its role** so the
day reads like a normal one:
- **Dinner** is the biggest meal — most protein, more fat.
- **Breakfast** carries a bit more fat (eggs) and carbs (oats).
- **Snacks** are lighter.
- The **post-workout meal goes low-fat / high-carb** — fat slows digestion and blunts the
  glycogen refill, so it's pushed to the *other* meals.
- Each meal is **clock-timed and shifts with your workout slot** (the meal nearest training
  becomes the post-workout meal). All meals still **sum exactly** to your daily totals.
- **Per-meal protein** lands above the leucine threshold (~30–50 g) at every main meal.

---

## 7. Bodybuilding / hypertrophy principles

The training side of adding muscle ("build like a bodybuilder").

- **Progressive overload** is the engine: over time, add weight, reps, or sets. If the
  load never increases, the muscle has no reason to grow. **Log every session.**
- **Volume** drives hypertrophy: roughly **10–20 hard sets per muscle group per week**
  for most intermediates, split across 2 sessions/muscle/week.
- **Rep ranges:** hypertrophy happens across a wide range (~5–30 reps) *if sets are
  taken close to failure* (~0–3 reps in reserve). The classic **8–15 rep** zone is
  time-efficient and joint-friendly for most accessory work; heavier **3–6 rep** work
  builds the maximal strength that raises your ceiling.
- **Exercise selection:** anchor on compound lifts (squat, deadlift, hinge, press, row,
  pull-up) for the most muscle worked per unit time, then add isolation for lagging areas.
- **Rest:** 1.5–3 min for hypertrophy accessory work; 3–5 min for heavy strength sets.
- **Recovery is where growth happens:** 7–9 h sleep, managed stress, and enough food.
  You don't grow in the gym — you grow recovering from it.
- **Periodization — consistent & concurrent beats block-switching here.** You do *not*
  need to spend weeks on pure hypertrophy, then switch to a pure strength block, then a
  pure power block. The evidence is clear:
  - **For muscle growth, the periodization model barely matters when volume is equated.**
    Meta-analyses (Schoenfeld/Grgic; linear vs. daily-undulating) find essentially *no
    difference* in hypertrophy between block, linear, and undulating models.
  - **For strength, undulating/concurrent is equal or slightly better**, especially as you
    advance (~3–5% better 1RM in trained lifters when volume is matched).
  - **Block periodization mainly helps advanced/elite athletes** who need novel stimuli.
    For everyone else, a **consistent week that trains all qualities together** is just as
    effective for size, a touch better for strength, and keeps speed sharp year-round.
  - You **don't lose muscle** training this way — there's no "interference" between lifting
    for size and lifting for strength/power, and brief intensity shifts don't detrain you.
- **So FairwayFuel uses one consistent, concurrent week for all 20 weeks** — heavy strength,
  hypertrophy volume, and power/speed in every week — progressed by **progressive overload**
  (add a little weight or a rep most weeks) with a **deload every 6th week.**

### Strength · Power · Speed (the qualities you train together)
- **Strength** = max force you can produce. Built with heavy, lower-rep compound work.
- **Power** = force × velocity — applying force *fast.* Explosive/ballistic lifts and jumps.
- **Rate of Force Development (RFD)** = how quickly you reach high force — the quality most
  tied to swing speed, trained with jumps, throws, and overspeed swings.
- These aren't a strict sequence — **train them concurrently.** More muscle raises your
  force ceiling, strength makes that muscle useful, and power/speed work turns it into
  clubhead speed. Pure size that can't fire fast doesn't move a club (or a barbell) quickly.

---

## 8. Gaining ~10 lb of muscle: realistic rate & timeline

- **Muscle is built slowly.** Realistic *lean* gain rates:
  - Beginner: ~1–1.5 lb/month (~0.25–0.5% bodyweight/week)
  - Intermediate: ~0.5–1 lb/month
  - Advanced: ~0.25–0.5 lb/month
- Target a scale-weight gain of **~0.25–0.5% of bodyweight per week** (~0.5–0.75 lb/week
  for a 180–200 lb person). Faster than that is mostly fat, which hurts mobility and
  rotation.
- **10 lb of *muscle*** therefore realistically takes an intermediate **~4–8 months** of
  consistent lean-bulk training and eating — not weeks. Some of the *scale* gain will be
  fat and water; plan a short cut afterward to reveal the new muscle.
- **Non-negotiables for the 10 lb:** progressive overload, ~1 g/lb protein daily, a
  modest surplus (+10%), and 7–9 h sleep. Miss any one and the rate stalls.

---

## 9. Where golf actually changes things

This is the short list — almost everything above is general fitness. Golf only adds:

1. **Power-to-weight ratio.** Clubhead speed comes from power *relative to bodyweight* and
   how fast you rotate — not raw size. Don't bulk into immobility. A leaner, more powerful
   athlete often out-drives a heavier, slower one. This is why FairwayFuel frames bulking
   as a *means to speed*, with a Lean Out phase to follow.
2. **Mobility & rotation are sacred.** Big muscles that can't turn won't help your driver.
   Keep thoracic-rotation and hip-mobility work in even during a hard bulk.
3. **On-course fueling (the genuinely golf-specific bit).** A round is **4–5 hours of
   low-intensity walking plus repeated high-skill, high-focus efforts.** Nutrition goals
   shift from *building* to *sustaining energy and cognition*:
   - **Steady carbs** every few holes (fruit, trail mix, a banana, a sandwich) to keep
     blood glucose and focus stable — late-round mental fatigue wrecks scores.
   - **Hydration + electrolytes**, especially in heat — even mild dehydration degrades
     focus and fine motor control.
   - **Avoid big sugar spikes/crashes** and heavy, greasy meals mid-round.
   - Don't slash carbs during tournament stretches; the brain and the swing both run on
     glucose over a long day.
4. **Speed training transfer.** Overspeed swing protocols, rotational med-ball throws, and
   anti-rotation core work translate gym power into the specific rotational pattern of the
   golf swing. (This is training, not nutrition — but it's the golf-specific payoff of the
   mass you build.)

### Golf-strength exercise selection (what credible sources agree on)
Reputable golf-fitness sources (University of Utah Health's golf clinic, Golf Digest,
Par4Success) converge on the same priorities — which this program already covers:
- **Hips + thoracic-spine rotation/mobility** — the two joints built for the swing's turn.
- **Ground-up power** — force starts at the ground: squat, deadlift, jumps, lateral bound.
- **Core as conduit AND brake** — anti-rotation (Pallof, plank) to *decelerate* and create
  the whip, not endless crunches.
- **Hip hinge / RDL** — Golf Digest calls the Romanian deadlift "one of golf's magic exercises."
- **Rotational power** — med-ball rotational throws and slams.
- **Single-leg & lateral work** — stability plus the swing's lateral weight shift. *(A lateral
  bound was added to the speed day for exactly this.)*

Everything else — TDEE, macros, protein targets, surplus/deficit size, nutrient timing,
meal frequency — is **the same as for any fit, muscle-building athlete.**

---

## 10. The app's exact formulas & config

So this file fully documents the data behind FairwayFuel.

### Macro logic (per day)
```
protein_g = round_even( bodyweight_lb × protein_per_lb )    // per goal (1.0–1.2), even
fat_g     = min( round(fat_per_kg × weight_kg), fat_cap )   // 65 g, or 50 g on a cut
carb_kcal = target_kcal − (protein_g × 4) − (fat_g × 9)
carb_g    = round_even( carb_kcal / 4 )           // fills the rest, even
```
`round_even(n)` = round to the nearest even number (never below 0).

### Per-goal settings
| Goal | Calorie adj | Protein | Fat target (pre-cap) | Fat cap | Pre-WO carb % | Post-WO carb % | Rec. meals |
|---|---|---|---|---|---|---|---|
| Lean Bulk | +10% | 1.1 g/lb | 0.9 g/kg | 65 g | 25% | 30% | 4 |
| Bulk | +20% | 1.15 g/lb | 1.0 g/kg | 65 g | 25% | 35% | 5 |
| Maintain | ±0% | 1.0 g/lb | 0.9 g/kg | 65 g | 25% | 25% | 4 |
| Cut / Lean Out | −20% | 1.2 g/lb | 0.8 g/kg | **50 g** | 30% | 35% | 3 |

> Fat target is pre-cap; the cap always wins. Pre/post carb % are taken from the **total
> daily carbs**; the remainder is split across the main meals, which are then **clock-timed
> across the day and anchored around your workout** — the meal nearest training becomes the
> post-workout meal, with a separate pre-workout carb feeding ~90 min before.

### Carb-timing clock anchors
| Slot | Assumed training time | Pre-carbs (~90 min before) | Post-carbs (~90 min after) |
|---|---|---|---|
| Morning | 7:00 AM | ~5:30 AM | ~8:30 AM |
| Midday | 12:00 PM | ~10:30 AM | ~1:30 PM |
| Afternoon | 4:00 PM | ~2:30 PM | ~5:30 PM |
| Evening | 7:00 PM | ~5:30 PM | ~8:30 PM |

### Meal plan (role-weighted, not even)
Macros are **distributed by meal role**, not split evenly, then summed to match the daily
total exactly. All carbs (including pre/post-workout) are split across every feeding by
weight, so portions shrink as you add meals:

| Meal role | Protein wt | Carb wt | Fat wt |
|---|---|---|---|
| Breakfast | 0.95 | 1.05 | 1.25 |
| Lunch | 1.05 | 1.00 | 1.00 |
| Dinner | 1.15 | 0.90 | 1.35 |
| Snack | 0.70 | 0.80 | 0.55 |
| Post-workout meal | (by role) | 1.60 | role × 0.35 |
| Pre-workout snack | 0 | 0.80 | 0 |

### 20-week training: one consistent, concurrent week
Run the **same week for all 20 weeks** (4 or 5 training days). Every week trains all three
qualities — no block-switching (see §7 for the evidence).

| Day | Focus | Rep ranges |
|---|---|---|
| Day 1 — Lower (Squat) | Heavy squat + hypertrophy accessories | 4–5 heavy, 8–15 |
| Day 2 — Upper (Push) | Heavy press + hypertrophy | 4–5 heavy, 8–15 |
| Day 3 — Speed & Power | Overspeed swings, throws, jumps, ground force | max velocity |
| Day 4 — Lower (Hinge + Power) | Jump + heavy deadlift/hinge + accessories | power, 4 heavy, 8–12 |
| Day 5 — Upper (Pull + Rotate) | Pulls + rotational power | 6–15 |

Progress by **progressive overload** (add weight or a rep most weeks); **deload every 6th
week** (lighter loads/volume). Eat in a **Lean Bulk** the whole time.

---

## 11. Supplements: the few that actually work

Most supplements are a waste of money. A short list has real, repeatable evidence and is
relevant to building mass and swing speed:

- **Creatine monohydrate — 3–5 g/day, every day** (timing irrelevant). The most
  evidence-backed legal supplement there is: more strength, power, lean mass, and
  training capacity — all of which feed clubhead speed. Cheap. No loading phase needed.
- **Protein powder (whey or plant)** — not magic, just a convenient way to *hit your
  daily protein number.* Useful post-workout or when whole food isn't handy.
- **Caffeine — ~3 mg/kg ~45–60 min pre-session** — a genuine performance and focus
  boost for training (and the front nine).
- **Vitamin D / creatine / electrolytes** for general health and hydration on long, hot
  rounds. Get most micronutrients from food first.

Everything else (BCAAs, testosterone "boosters", fat burners, exotic pre-workouts) is
mostly marketing. Food, protein, creatine, sleep, and progressive overload do ~95% of it.

---

## 12. How FairwayFuel compares to other calculators

FairwayFuel's logic lines up with the most respected evidence-based calculators — and
errs slightly higher on protein, by design.

| Source | Protein | Fat | Carbs | Surplus / deficit |
|---|---|---|---|---|
| **RippedBody** (Andy Morgan / Leangains) | ~1 g/lb | 15–25% kcal (cut), 20–30% (maint/bulk) | remainder | adjust via carb:fat 2:1 |
| **Bony to Beastly** | 0.7–1 g/lb | 20–40% kcal | 40–60% kcal | bulk ≈ +750 kcal, ~0.5 lb/wk |
| **Bodybuilding.com** | ~30% kcal (gain) / 40% (loss) | 20–30% kcal | 40% kcal | by goal & body type |
| **FairwayFuel** | **1.0–1.2 g/lb** | **≤65 g (50 g cut)** | remainder | +10/+20% or −20% |

Common ground across all of them: **protein set by bodyweight first, fat second (with a
floor/ceiling), carbs fill the rest, and a moderate surplus (~+10–20%) gained at roughly
0.5 lb/week.** Where they differ is mostly preference. FairwayFuel deliberately runs
protein at the **top** of the evidence range, caps fat to protect carbs (which fuel hard
training and a long round), and adds the golf-specific carb-timing and meal schedule.

---

## 13. Applied example: Bryson DeChambeau (vetted)

DeChambeau is the most public test of the "build mass → make it speed" idea. The internet
is full of "Bryson workout" articles — **most are reconstructed, unverified, or
exaggerated.** Here's the honest split.

**✅ Worth copying (credible, evidence-aligned, already in this plan):**
- **Mass → force → speed pipeline.** He added ~40 lb and roughly *doubled force output*,
  which drove swing speed from ~117 to 130–140+ mph. Bigger, stronger muscle = a higher
  speed ceiling. (Roskopf / MAT; Como force-plate work.)
- **Compound lifts as the base** — squat, deadlift, RDL, hip thrust, bench, row — plus
  isolation for weak links. **Plyometrics** (box jumps) and **med-ball throws** for power.
- **Ground force + footwork** (push off the ground, lead foot fires early) and **overspeed
  swing training** with weekly radar tracking — the actual speed transfer.
- **Strength + mobility together** (MAT, plus yoga/flexibility work) so the bigger body
  can still rotate.
- **Basics that matter:** ~1 g/lb+ protein, **creatine**, hydration, and lots of sleep.

**🚩 Clickbait — do NOT copy:**
- **"23 lb of muscle in 12 weeks" / "27 lb fat lost at the same time."** Physiologically
  implausible — real lean-muscle gain is ~0.5–1 lb/month for intermediates (see §8).
  These numbers come from content-farm body-fat estimates, not reality.
- **"Exact Bryson routine" splits** (e.g. Mon chest/shoulders…) on aggregator sites are
  *reconstructed guesses*, often self-contradictory ("isolation over compound" then
  listing heavy compounds). Don't treat them as gospel.
- **"Better than steroids"** and similar — marketing hyperbole.
- The **dirty bulk itself.** His 6,000-cal everything-goes phase caused dizziness, gut
  issues and mood swings, and he later stripped ~20–30 lb to a leaner, *still-fast* build
  that won the 2024 U.S. Open. The lesson: a **clean lean bulk beats a dirty one.**

**Bottom line:** this program already encodes what's credible from his approach. We did
not change the training based on the dubious "routine" articles — they validate the
principles; their numbers don't survive scrutiny.

---

## 14. Sources & further reading

**Primary / authoritative (highest confidence):**
- **Morton RW, et al. (2018)** — meta-analysis of protein & resistance training, *Br J
  Sports Med* (the 1.6 g/kg plateau, ~2.2 g/kg CI).
- **Helms ER, et al. (2014)** — protein for lean athletes in a deficit (2.3–3.1 g/kg).
- **ISSN position stands** — Protein & Exercise; Nutrient Timing; Diets & Body Comp.
- **ACSM / AND / DC** joint position: *Nutrition and Athletic Performance.*
- **Mifflin–St Jeor (1990)** — the BMR equation used here.
- **Schoenfeld B.** (hypertrophy research); **Helms E.** *Muscle & Strength Pyramids*;
  **Stronger by Science** (Greg Nuckols) — evidence reviews.
- **Periodization (for §7):** systematic reviews/meta-analyses on **linear vs. daily
  undulating periodization** (similar hypertrophy when volume is equated; undulating ≈ or
  slightly better for strength); **concurrent-training "interference"** reviews (no
  meaningful interference between resistance modalities). See Stronger by Science,
  *"Periodization: What the Data Say."*

**Practitioner macro calculators (credible, used for the §12 comparison):**
- RippedBody (Andy Morgan): https://rippedbody.com/macro-calculator/ and /updated-bulking-guidelines/
- Bony to Beastly: https://bonytobeastly.com/bulking-macros/
- Bodybuilding.com — *The 3 Keys for Counting Macronutrient Ratios*
- MyProtein — *Nutrition Guide for Bodybuilders*
- University of Toledo, Endocrinology — *Macronutrient Considerations* (PDF handout)

**Golf-strength training (credible):**
- University of Utah Health — *Your Strength Training Guide for a Better Golf Game* (golf-clinic DPT).
- Golf Digest — *10 of our favorite exercises for golfers*; *Golf is a ground-up sport*.
- Par4Success — golf-specific home-gym workouts (golf-fitness specialists).
- Hydrow — *15 best strength exercises for golfers* (content marketing, but the exercises are standard/sound).

**Bryson DeChambeau (use with judgement — see §13 for what's vetted):**
- Golf Digest — *Bryson bulks up for distance* and Joel Beall's *"Being Like Bryson"
  3-month experiment* (reputable reporting / honest first-person test).
- Golf.com — *Bryson explains his speed-training secret*.
- Golf Monthly — interview with his fitness coach.
- CNN — *6,000 calories a day* (trainer Greg Roskopf); PGA Tour — Masters dizziness.
- DRVN Golf — *What golfers can learn* (golf-fitness framing).
- GolfWRX (Jaacob Bowden, PGA) — speed-coach article; protein/creatine advice is sound,
  but its "23 lb muscle in 12 weeks" result is not credible (see §13).
- Men's Health UK; EssentiallySports; TotalShape — **lower confidence** (mainstream/
  content sites; treat specific "routines" as unverified).

> Practitioner and media links are for further reading. Where a claim mattered, it was
> checked against the primary sources above — and flagged in §13 when it didn't hold up.

---

## 15. Disclaimer

This document is educational and reflects general, evidence-based ranges — not
individualized medical or dietetic advice. Energy and macro estimates carry inherent
error and are starting points to be adjusted against real-world results. Consult a
qualified physician, registered dietitian, or coach before starting a new diet or
training program, especially if you have any medical condition.
