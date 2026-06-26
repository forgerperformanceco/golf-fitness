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
11. [Sources & further reading](#11-sources--further-reading)
12. [Disclaimer](#12-disclaimer)

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
1. **Protein = ~1 g per lb of bodyweight, rounded to an even number** (lands on clean
   targets like 180 / 190 / 200 g).
2. **Fat is capped at a hard 65 g maximum** — never higher.
3. **Carbs fill the remaining calories**, rounded to an even number.

### Why this works
- **Protein first** because it's the most important macro for body composition (see §4).
- **Fat second, with a floor in mind.** Dietary fat supports hormones (including
  testosterone) and the absorption of fat-soluble vitamins. The usual *minimum* is
  ~0.3 g/lb (≈0.6–0.8 g/kg) or ~20% of calories. The app's **65 g cap** is a deliberate
  *ceiling*: it keeps fat from crowding out carbs, which are the macro that actually
  fuels hard training and a long round of golf. For most people in the 180–220 lb range,
  65 g sits comfortably above the hormonal minimum while leaving plenty of room for carbs.
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

Protein is the single most important dietary lever for building or keeping muscle.

- **Total daily intake** is what matters most: **~1.6–2.2 g/kg (0.7–1.0 g/lb)** of
  bodyweight supports maximal muscle protein synthesis for most trainees. ~1 g/lb is a
  simple, effective target — and slightly higher (up to ~1.1 g/lb) helps preserve muscle
  in a deficit.
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
  Cut 3 — with the pre- and post-workout feedings sitting *around training* on top of
  those. The app splits protein, fat, and your "non-timing" carbs evenly across the main
  meals, then feeds the pre/post carbs separately.
- **Tip:** on training days, time one main meal to land right after your session so its
  protein doubles as your post-workout meal — fewer feedings, same effect.

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
- **Periodization:** cycling phases (hypertrophy → strength → power) lets you build size,
  then make it strong, then make it fast. FairwayFuel's 20-week plan uses exactly this
  arc: Mass Base → Strength Convert → Power & Speed.

### Strength → Power → Speed (why order matters)
- **Strength** = max force you can produce. Build it with heavy, lower-rep work.
- **Power** = force × velocity — applying force *fast.* Built with explosive, ballistic,
  and Olympic-style lifts at high intent.
- **Rate of Force Development (RFD)** = how quickly you can reach high force. This is the
  quality most tied to throwing/striking/swinging speed, trained with jumps, throws, and
  light-load max-velocity work.
- You convert mass → strength → power → **speed** in sequence. Pure size that can't fire
  fast doesn't move a golf club (or a barbell) quickly.

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

Everything else — TDEE, macros, protein targets, surplus/deficit size, nutrient timing,
meal frequency — is **the same as for any fit, muscle-building athlete.**

---

## 10. The app's exact formulas & config

So this file fully documents the data behind FairwayFuel.

### Macro logic (per day)
```
protein_g = round_even( bodyweight_lb )           // ~1 g/lb, even
fat_g     = min( round(fat_per_kg × weight_kg), 65 )   // hard 65 g cap
carb_kcal = target_kcal − (protein_g × 4) − (fat_g × 9)
carb_g    = round_even( carb_kcal / 4 )           // fills the rest, even
```
`round_even(n)` = round to the nearest even number (never below 0).

### Per-goal settings
| Goal | Calorie adj | Fat target (pre-cap) | Pre-WO carb % | Post-WO carb % | Rec. meals |
|---|---|---|---|---|---|
| Lean Bulk | +10% | 0.9 g/kg | 25% | 30% | 4 |
| Bulk | +20% | 1.0 g/kg | 25% | 35% | 5 |
| Maintain | ±0% | 0.9 g/kg | 25% | 25% | 4 |
| Cut / Lean Out | −20% | 0.8 g/kg | 30% | 35% | 3 |

> Fat target is pre-cap; the 65 g ceiling always wins. Pre/post carb % are taken from the
> **total daily carbs**; the remainder is split across the main meals.

### Carb-timing clock anchors
| Slot | Assumed training time | Pre-carbs (~90 min before) | Post-carbs (~90 min after) |
|---|---|---|---|
| Morning | 7:00 AM | ~5:30 AM | ~8:30 AM |
| Midday | 12:00 PM | ~10:30 AM | ~1:30 PM |
| Afternoon | 4:00 PM | ~2:30 PM | ~5:30 PM |
| Evening | 7:00 PM | ~5:30 PM | ~8:30 PM |

### Meal plan
```
per_main_meal_protein = round( protein_g / meals )
per_main_meal_fat     = round( fat_g / meals )
per_main_meal_carbs   = round( rest_carbs / meals )   // rest = total − pre − post
```

### 20-week training arc
| Phase | Weeks | Focus | Rep range |
|---|---|---|---|
| Mass Base | 1–8 | Bodybuilder hypertrophy | 8–15 |
| Strength Convert | 9–13 | Maximal strength | 3–6 |
| Power & Speed | 14–20 | Explosive / overspeed | Max velocity |

---

## 11. Sources & further reading

The figures above reflect mainstream, evidence-based sports-nutrition and strength
guidance. Authoritative bodies and resources to go deeper (search by name):

- **International Society of Sports Nutrition (ISSN)** position stands — Protein &
  Exercise; Nutrient Timing; Diets & Body Composition; Meal Frequency. (Open-access in
  the *Journal of the International Society of Sports Nutrition*.)
- **American College of Sports Medicine (ACSM) / Academy of Nutrition and Dietetics /
  Dietitians of Canada** joint position: *Nutrition and Athletic Performance.*
- **Mifflin MD, St Jeor ST, et al. (1990)** — the BMR equation used here.
- **Brad Schoenfeld** — research and books on hypertrophy (volume, frequency, rep ranges).
- **Eric Helms / "The Muscle and Strength Pyramid"** — practical hierarchy of nutrition
  and training priorities (adherence → calories → macros → timing → supplements).
- **Stronger by Science** (articles by Greg Nuckols et al.) — evidence reviews on
  hypertrophy, protein, and programming.
- **Golf-specific:** Titleist Performance Institute (TPI) for golf fitness, mobility, and
  speed training concepts; SuperSpeed Golf for overspeed-training protocols.

> These are cited by name rather than as fabricated links. Verify specifics against the
> primary sources — recommendations evolve.

---

## 12. Disclaimer

This document is educational and reflects general, evidence-based ranges — not
individualized medical or dietetic advice. Energy and macro estimates carry inherent
error and are starting points to be adjusted against real-world results. Consult a
qualified physician, registered dietitian, or coach before starting a new diet or
training program, especially if you have any medical condition.
