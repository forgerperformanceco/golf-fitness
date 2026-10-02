# Yardsmith — Nutrition & Training Reference

The knowledge base behind the Yardsmith calculator and training plan. This is the
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
   - [9a. Evidence update — hypertrophy for a golfer (Sep 2026)](#9a-evidence-update--hypertrophy-for-a-golfer-sep-2026)
10. [The app's exact formulas & config](#10-the-apps-exact-formulas--config)
11. [Supplements: the few that actually work](#11-supplements-the-few-that-actually-work)
12. [How Yardsmith compares to other calculators](#12-how-yardsmith-compares-to-other-calculators)
13. [Applied example: Bryson DeChambeau (vetted)](#13-applied-example-bryson-dechambeau-vetted)
14. [Applied example: Rory McIlroy — 2025 Masters (vetted)](#14-applied-example-rory-mcilroy--2025-masters-vetted)
15. [Sources & further reading](#15-sources--further-reading)
16. [Disclaimer](#16-disclaimer)

---

## 1. Energy: BMR & TDEE

**BMR (Basal Metabolic Rate)** — calories burned at complete rest. Yardsmith uses the
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
| **Lean Bulk** | **+10%** (~+250–350 kcal) | Slow muscle gain with the least fat — the default for lean-to-average builds |
| **Bulk** | **+20%** (~+400–600 kcal) | Faster scale gain; most of the extra is fat |
| **Maintain** | **±0%** | Hold composition (e.g. in-season) |
| **Cut / Lean Out** | **−20%** (~−400–600 kcal) | Fat loss while protecting muscle |

**Surplus size matters.** Muscle is built slowly; a bigger surplus mostly adds *fat*,
not extra muscle. For most trainees past the beginner stage, a **modest ~+10% lean bulk**
is the sweet spot. A larger +20% bulk gains scale weight faster, but in trained lifters the
extra lands mostly as fat: over 8 weeks a +15% surplus added skinfold thickness but no
extra muscle thickness or 1-RM compared with +5% (Helms 2023, n=21, abstract read). So Bulk
is **not** a faster route to strength or speed — it suits newer, leaner lifters who accept
more fat and plan a Lean Out after.

**Starting goal by body size (Oct 2026).** Onboarding suggests a goal from height and weight
(`ffSuggestGoal` in `024-macro-model.js`): BMI under 27 → **Lean Bulk** (the default);
27–30 → **In-Season Maintain** (hold weight while lifting — muscle up, fat down); in the obese
range (≥30) → **Lean Out**: with high protein and heavy lifting, muscle still builds in a
deficit, and a surplus at that size mostly adds fat. It is a suggestion, never a lock — BMI
misreads very muscular lifters, who can pick any goal.

**Deficit size matters too.** A ~20% deficit (~0.5–1% bodyweight/week loss) is
aggressive enough to lose fat steadily but moderate enough — with high protein and hard
training — to retain muscle. Crash deficits cost muscle and performance.

> **The throughline: this is a mass-and-clubhead-speed program first.** Every goal serves
> that. Lean Bulk/Bulk add the muscle that raises your force (and speed) ceiling;
> Maintain holds it in-season. **A cut is not an aesthetics phase — it's a speed phase:**
> dropping fat while protecting muscle raises **power-to-weight**, so you swing **as fast
> or faster at a lighter, more athletic bodyweight** (see [§9](#9-where-golf-actually-changes-things)).
> Keep protein high and the speed/power work in even on a cut so the deficit costs fat, not mph.

---

## 3. Macro rules (and the science behind them)

Yardsmith sets macros in a fixed priority order: **protein → fat → carbs fill the
rest.** This is the standard physique-athlete approach.

### The app's rules (user-tuned)
1. **Protein scales with reference body weight** — **0.85 g/lb** maintaining,
   **0.9 g/lb** building, and **1.0 g/lb** on a cut. See [§4](#4-protein-the-master-nutrient).
2. **Fat scales with reference body weight** — **0.3 g/lb** on a cut and **0.35 g/lb**
   otherwise, clamped to 45–100 g/day — then raised if needed so fat stays at or above
   **~20% of calories** (Oct 2026: on big-calorie days the body-size anchor alone let fat fall
   to 13–19%). See `ffMacroTargets` in `src/js/app/024-macro-model.js` for the exact rounding.
3. **Carbs fill the remaining calories**, then everything is **distributed across the day**
   (bigger dinner, a lighter-fat post-workout meal — see [§6](#6-meal-frequency--per-meal-distribution)).
4. **Every number is rounded to the nearest 5 g** (and calories to the nearest 5) so the
   targets are clean and easy to hit — 200 g protein, not 197.

### Why this works
- **Protein tied to body size** avoids the excessive prescriptions that percentage-of-calorie
  formulas create for high-calorie athletes. The cut target rises modestly when muscle is
  most at risk (see §4).
- **Fat tied to body size** avoids a fixed target being too low for a large athlete or too
  high for a small athlete, while the clamp keeps the output practical.
- **Carbs last** because they're the "performance and flexibility" macro — they fuel
  high-intensity work, refill muscle glycogen, and are easiest to flex up (bulk) or down
  (cut) without touching the protein/fat that protect muscle and hormones.

### Standard evidence-based ranges (for context)
| Macro | Common range | Notes |
|---|---|---|
| Protein | ≈0.7–1.0 g/lb / 1.6–2.2 g/kg | Higher end on a cut |
| Fat | ≥0.3 g/lb (often ≈20–35% kcal) | App: 0.30–0.35 g/lb reference weight, clamped 45–100 g/day, and kept ≥~20% kcal |
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
- **Helms et al. 2014** (systematic review, resistance-trained lean athletes in a deficit):
  **2.3–3.1 g/kg of fat-free mass** (≈1.0–1.4 g per lb of *lean* mass, not body weight),
  scaled up with the depth of the deficit and with leanness. For a lean 180-lb lifter at ~12%
  fat that is ~165–225 g/day; Yardsmith's cut (1.0 g/lb of reference weight) gives 180 g,
  inside the range.
- **ISSN** position stand: 1.4–2.0 g/kg supports most athletes; for **fat loss, intakes
  >3.0 g/kg** are supported in lean, resistance-trained individuals.

**What Yardsmith uses** (protein per pound of reference weight, rounded to 5 g):

| Goal | Protein target |
|---|---|
| In-Season Maintain | **0.85 g/lb** |
| Lean Bulk | **0.9 g/lb** |
| Bulk | **0.9 g/lb** |
| Cut / Lean Out | **1.0 g/lb** |

The reference weight is capped at the body weight corresponding to BMI 30 when needed,
because total weight becomes a poor proxy for lean mass at extremes. A cut uses the high
end of the general evidence-based range because muscle retention matters more in a deficit.

- **~1 g/lb is a practical upper anchor for most users, not a mandatory floor.** Total daily intake is what matters most;
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
- **Carbs** rapidly replenish glycogen. Speed of refill matters most if you train or play
  hard again within **~8 h** (e.g. a lift and a round the same day); with a day between
  sessions, **total daily carbs** do the job. Faster carbs (rice, potatoes, fruit, dextrose)
  refill quickest.
- **Protein** (~30–50 g) supplies the amino acids for repair and growth. **Pair carbs
  with protein** post-workout.
- **Per-plan emphasis** (how Yardsmith weights it):
  - **Bulk** → load the post-workout window hardest (biggest glycogen + growth window).
  - **Lean Bulk** → post-workout is your main "build" feeding.
  - **Maintain** → split fairly evenly around training; save some carbs for the round.
  - **Cut** → concentrate limited carbs tightly around the workout; stay lower elsewhere.

### Hydration & electrolytes
- ~5–7 mL/kg water in the 2–4 h before training; replace ~125–150% of fluid lost in
  sweat afterward. Sodium and potassium matter for long, hot sessions — and for golf.

### Alcohol & recovery
The 19th hole is real, so the coach answers this straight instead of deflecting:
- **Eat the protein + carb meal first.**
- **Big doses blunt muscle-building.** After a lift + cycling session, ~1.5 g/kg of alcohol
  (~8–9 US standard drinks for an 80 kg golfer) cut myofibrillar protein synthesis **~24%
  even with 25 g protein** (~37% with carbs instead of protein) (Parr 2014, *PLoS One*
  9:e88384, n=8 men).
- **Low doses look benign but the data are thin.** ~0.5 g/kg (~3 standard drinks at 80 kg)
  did not slow strength recovery after muscle-damaging exercise (Barnes 2011, *Eur J Appl
  Physiol* 111:725–729, abstract read). Nothing direct exists in between.
- **Practical line:** on lift days and build phases keep it to **1–2 drinks**, after the meal.
- **It counts.** Alcohol is 7 kcal/g and lands in the day's calories — it matters most on a cut.
- **Hot rounds:** rehydrate with water + electrolytes first. After a ~2% bodyweight sweat loss,
  a 4% alcohol drink tended to raise urine output vs alcohol-free drinks; the effect was small
  at ≤2% (Shirreffs & Maughan 1997, *J Appl Physiol* 83:1152, abstract read).

---

## 6. Meal frequency & per-meal distribution

- **Total intake > meal frequency.** Whether you eat 3 or 6 meals, daily totals drive
  results. Frequency is mostly about **adherence, hunger, and hitting per-meal protein.**
- **Practical sweet spot: 3–5 meals/day**, each with a protein dose above the leucine
  threshold (~30–50 g).
- **More meals** help when you need to eat a *lot* (bulking) or prefer smaller, frequent
  feedings. **Fewer, larger meals** are often more satiating on a **cut.**
- Yardsmith's recommended **main-meal counts**: Lean Bulk 4 · Bulk 5 · Maintain 4 ·
  Cut 3 — with a pre-workout carb snack and the post-workout meal placed *around training*.

### How Yardsmith distributes the macros (not evenly!)
Real people don't eat identical meals. The app **weights each meal by its role** so the
day reads like a normal one:
- **Dinner** is the biggest meal — most protein, more fat.
- **Breakfast** carries a bit more fat (eggs) and carbs (oats).
- **Snacks** are lighter.
- The **post-workout meal goes high-carb and lighter on fat** (its fat share is ×0.35), so
  there's room for the big carb + protein dose and it sits easy; the fat moves to the
  *other* meals. That's a comfort choice, not physiology: for once-a-day training, fat in
  the post meal is fine either way — with adequate daily carbs, adding fat and protein to
  recovery meals did not change 24-h muscle glycogen storage (Burke 1995, *J Appl Physiol*
  78:2187–2192, abstract read).
- Each meal is **clock-timed and shifts with your workout slot** (the meal nearest training
  becomes the post-workout meal). All meals still **sum exactly** to your daily totals.
- **Per-meal protein** lands above the leucine threshold (~30–50 g) at every main meal.

---

## 7. Bodybuilding / hypertrophy principles

The training side of adding muscle ("build like a bodybuilder").

- **Progressive overload** is the engine: over time, add weight, reps, or sets. If the
  load never increases, the muscle has no reason to grow. **Log every session.**
- **Volume** drives hypertrophy: roughly **10–20 hard sets per muscle group per week** is
  the range for *maximizing* growth in most intermediates; lower volumes still build muscle,
  just less (graded dose-response — Schoenfeld 2017; Pelland 2025). Growth keeps rising with
  more weekly sets (diminishing returns, not a wall); a provisional per-**session** ceiling
  sits around ~11 sets per muscle (preprint). Count synergist sets as **half** a set.
  Spreading a muscle over ~2 sessions a week helps strength more than size where the split
  allows. **Yardsmith's plan is more moderate than this on purpose** — upper body once a
  week, prime movers around 10 sets, low-transfer muscles lower; the exact per-muscle doses
  are in [§9a](#9a-evidence-update--hypertrophy-for-a-golfer-sep-2026).
- **Rep ranges:** hypertrophy happens across a wide range (~5–30 reps) *if sets are
  taken close to failure* (~0–3 reps in reserve). The classic **8–15 rep** zone is
  time-efficient and joint-friendly for most accessory work; heavier **3–6 rep** work
  builds the maximal strength that raises your ceiling.
- **Exercise selection:** anchor on compound lifts (squat, deadlift, hinge, press, row,
  pull-up) for the most muscle worked per unit time, then add isolation for lagging areas.
- **Rest:** ≥90 s for hypertrophy accessory work (shorter than ~60 s costs growth —
  Singer 2024); 2–3+ min for heavy strength sets.
- **Train muscles long (stretch bias).** Muscles grow more when loaded in the lengthened
  position — the best-evidenced "bodybuilding" lever (see §9a).
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
- **So Yardsmith uses one consistent, concurrent week for all 20 weeks** — heavy strength,
  hypertrophy volume, and power/speed in every week — progressed by **double progression**
  (hold the load and build reps until every set hits its target, then add the smallest jump)
  inside 6-week waves with a **deload every 6th week** (exact rules in [§10](#10-the-apps-exact-formulas--config)).

### Time off and coming back (detraining)
Breaks happen — travel, injury, the season. What the evidence says, and what the app does:
- **Short breaks cost little.** Strength performance is generally held for up to **~4 weeks**
  of inactivity, though highly trained athletes' eccentric force and sport-specific power can
  fall sooner (Mujika & Padilla 2001, *MSSE* 33:1297–1303, abstract read). Significant losses
  in strength and endurance can occur once a break runs **beyond ~2–4 weeks**, at a rate that
  depends on training history (Spiering 2021, *JSCR* 35:1449–1458, full text read). Losses grow
  with the length of the break and are larger in people over 65 and in less-trained people
  (Bosquet 2013, *Scand J Med Sci Sports* 23:e140–e149, meta-analysis of 103 studies, abstract
  read).
- **What's lost comes back faster than it was first built.** In untrained adults, strength and
  muscle size lost over a 10-week break were regained quickly — mostly in the first weeks of
  retraining — so the on-off group ended up matching a group that did the same amount of
  training without the break, and strength held up better than size during the break
  (Halonen 2024, *Scand J Med Sci Sports* 34:e14739, n=42 completers, abstract read).
  Repeated 3-week breaks between 6-week blocks likewise gave hypertrophy similar to 24 weeks
  of continuous training (Ogasawara 2013, *Eur J Appl Physiol* 113:975–985, abstract read).
- **The cheapest protection** is the maintenance dose: strength and size can hold on one heavy
  session a week with ~1 set per exercise at normal loads in younger adults; older adults
  (60–75 in the studies) need up to ~2 sessions and 2–3 sets per exercise to keep size
  (Spiering 2021; Bickel 2011).
- **What the app does (Oct 2026):** after **14+ days** with no activity it shows *Welcome back*
  (pick up where the calendar is, or ease back in at week 1 — all history and loads kept; ease
  back in is recommended at **28+ days**). Loads are judged **per lift** (`ffDose` in 077): when
  a lift was last done at full dose **14+ days** ago it gets **no add-weight jump**; at **28+
  days** it starts at **~90%** of the last working weight, cued at RIR 2 ("easing back in"),
  and progression resumes from there. After an "Ease back in" restart, a lift with no log this
  season falls back to its last full-dose session from before the restart. The 14-day trigger is a re-orientation choice, not a physiological threshold; 28 days
  sits at the top of the ~2–4-week window above, and ~90% is a conservative design choice,
  not a measured loss. None of this has golf-specific data: how fast *clubhead speed* fades
  after training stops is still unmeasured (CLUBHEAD §11.8).

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

- **Muscle is built slowly.** Realistic *lean* gain rates (practitioner rules of thumb in the
  style of the McDonald/Aragon models — not trial data):
  - Beginner: ~1–1.5 lb/month
  - Intermediate: ~0.5–1 lb/month
  - Advanced: ~0.25–0.5 lb/month
- Target a **scale-weight** gain of **~0.25–0.5% of bodyweight per week** on Lean Bulk —
  ~0.45–0.9 lb/week at 180 lb, ~0.5–1.0 lb/week at 200 lb (Iraki 2019 off-season
  recommendation; the most-trained lifters aim for the low end, novices can aim higher).
  That is a scale target, not a muscle rate: at it, much of the gain is fat, water and
  glycogen. Faster than that is mostly fat (Helms 2023), which hurts mobility and rotation.
- **10 lb of *muscle*** therefore realistically takes an intermediate **~10–20 months** of
  consistent lean-bulk training and eating (a true beginner ~7–10 months) — not weeks. Part
  of the *scale* gain will be fat and water; plan a short Lean Out afterward to reveal the
  new muscle.
- **Non-negotiables for the 10 lb:** progressive overload, ~1 g/lb protein daily, a
  modest surplus (+10%), and 7–9 h sleep. Miss any one and the rate stalls.

---

## 9. Where golf actually changes things

This is the short list — almost everything above is general fitness. Golf only adds:

> **The full "what physically produces clubhead speed" breakdown** — the kinetic chain,
> X-factor, ground force, the driver→exercise map, and public speed benchmarks — lives in
> its companion doc [`CLUBHEAD-SPEED-REFERENCE.md`](./CLUBHEAD-SPEED-REFERENCE.md).

> **Does the "mass → distance" thesis actually hold?** An independent, peer-reviewed-first
> research pass (verified in `CLUBHEAD-SPEED-REFERENCE.md` §11) says **yes, with the framing this
> program already uses.** Lean/fat-free mass tracks with clubhead-speed gains (fat-free-mass ↔ CHS
> **r ≈ 0.42**; body mass **r ≈ 0.51** in elite males); **strength and power are the dominant
> physical drivers** (upper-body power **r ≈ 0.51**, lower-body strength **r ≈ 0.46**; 1RM back
> squat **r ≈ 0.54–0.64**), and controlled programs *raise* driver speed and distance in men, women,
> and 50+ golfers. The nuance that shapes our language: it's **lean, fast-firing muscle → power →
> distance**, **not bulk** — and **general flexibility does essentially nothing for speed
> (r ≈ 0.03).** So build the muscle, convert it to power, and keep the mobility work for what it
> *actually* earns (injury-proofing, below).

1. **Power-to-weight ratio.** Clubhead speed comes from power *relative to bodyweight* and
   how fast you rotate — not raw size. Don't bulk into immobility. A leaner, more powerful
   athlete often out-drives a heavier, slower one. This is why Yardsmith frames bulking
   as a *means to speed*, with a Lean Out phase to follow.
2. **Mobility & rotation earn their place — mostly as injury insurance.** Big muscles that
   can't turn won't help your driver, but be honest about *why* we train mobility: passive
   flexibility does **not** predict clubhead speed (r ≈ 0.03), whereas a **lead-hip
   internal-rotation deficit (~10°) is strongly tied to golfers' low-back pain.** So we keep
   thoracic-rotation and hip-mobility work in — even during a hard bulk — to **protect the
   back and preserve the range the swing needs**, not as a speed hack. *(Detail: CLUBHEAD §11.6.)*
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
4. **Speed training transfer.** Jumps, rotational med-ball throws and anti-rotation core work
   (with light overspeed swings as a once-a-week adjunct) translate gym power into the
   specific rotational pattern of the golf swing. (This is training, not nutrition — but it's
   the golf-specific payoff of the mass you build.)

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

### Building the hinge — the deadlift, in the right order
The posterior-chain hinge (RDL / deadlift) is the highest-value golf strength lift: it builds
exactly the glute–hamstring–back drive the downswing runs on. Build it in three stages — a
standard, injury-smart strength-and-conditioning progression, reinforced by golf-fitness
coaching:

1. **Screen readiness first (a club is all you need).**
   - **Seated good morning** — sit tall, club across the shoulders, hinge from the hips to ~45°
     past vertical keeping a **neutral spine** (no rounding, no over-arching). Isolates and
     grooves the hip hinge.
   - **Single-leg RDL (± rotation)** — balance on one leg, hinge to mid-shin, fire the glute;
     add a rotation over the lead side for a golf-specific version. Tests balance, glute
     control and ground contact *before* you load a bar. If the pattern is ragged here, groove
     it before loading.
2. **Learn light, then load: band → kettlebell → barbell.** A band teaches the fire-through-the
   -range feel with **zero spinal load**; a kettlebell adds load with less technical demand than
   a bar; the barbell comes once the pattern is automatic. Cues throughout: **chest down, knees
   out, hips back, neutral spine — drop into the ground, then push up.**
3. **Then progressively overload.** Once the pattern is solid, drive the big lift up over
   **6–12 weeks** (higher reps / lighter → heavier / lower reps) — the same double-progression
   the plan already uses.

**Trap bar: the recommended swap for most golfers.** At the same submaximal load the
hexagonal (trap) bar gave **lower peak moments at the lumbar spine, hip and ankle, a higher
peak moment at the knee, and more peak force, velocity and power** than a straight bar
(Swinton 2011, *JSCR* 25:2000–2009, 19 male powerlifters, abstract read; 1RM 265 vs 245 kg).
It measured joint moments, not spinal shear, and the straight bar works the hamstrings
(concentric) and spinal erectors (eccentric) a little harder while the trap bar works the quads
more (Camara 2016, *JSCR* 30:1183–1188, abstract read) — so both are legitimate; neither is
"unsafe".

**What the plan does:** the 5-day hinge day (Day 4) prescribes a **conventional (straight-bar)
Deadlift** — every gym has one, and the stored name keeps everyone's history intact. The
**Trap-Bar Deadlift is its first one-tap swap** and the recommended pick for most golfers who
have a trap bar, **especially with any back history**; the swap sticks for the rest of the plan.
Expect a slightly heavier number on the trap bar. The 4-day plan's heavy hinge is the Romanian
Deadlift. Conventional and sumo stay fine alternates for variety or hip preference.

**The swing payoff — and the fault it fixes.** Hinge strength shows up as **holding posture
through impact.** When the glutes/posterior chain are too weak to stabilize, golfers stand up
out of their hinge into the ball — **early extension** — which sprays the strike and leaks
speed. A strong, stable hinge is what lets you keep your angles and *deliver* force instead of
giving up position. (Consistency matters as much as load: train the hinge regularly and heavy
stops feeling "novel" — long gaps are what make a return to lifting feel stiff and sore.)

Everything else — TDEE, macros, protein targets, surplus/deficit size, nutrient timing,
meal frequency — is **the same as for any fit, muscle-building athlete.**

---

## 9a. Evidence update — hypertrophy for a golfer (Sep 2026)

A literature pass (2021–2026, two parallel reviews) aimed at one question: how to keep the
program's "build like a bodybuilder" identity while optimizing for clubhead speed.
**Method caveat:** the reviewers could read abstracts and search-result text but not full
papers, and several 2026 papers post-date the reviewing model's training data. Numbers are
as reported in abstracts; anything marked *unverified* could not be confirmed. Nothing here
may be used in public claims until checked against the full paper (see
`yardsmith-external-positioning`).

**Shipped from this pass (Sep 30, 2026):**

| Change | Evidence | Confidence |
|---|---|---|
| Cable pushdown → **cable overhead triceps extension** (both splits) | Overhead grew triceps 19.9% vs 13.5% for pushdowns (Maeo 2023, *Eur J Sport Sci*, doi 10.1080/17461391.2022.2100279) | moderate |
| **Seated leg curl added** to the 4-day plan (it had no knee-flexion work) | Seated beat prone curls: whole hamstrings +14.1% vs +9.3%, biceps femoris long head +14.4% vs +6.5% (Maeo 2021, *MSSE*, PMID 33009197) | moderate |
| Leg extension: **lean back / recline** cue | Reclined (40° hip) beat upright for rectus femoris growth (Larsen 2024/25, *J Sports Sci*, doi 10.1080/02640414.2024.2444713) | moderate |
| Calf raise: **pause in the bottom stretch** cue | Stretched-range partials grew medial gastrocnemius 15.2% vs 6.7% (Kassiano 2023, *JSCR*) | moderate |
| Lowering tempo **3 s → controlled 1–2 s** | Rep duration 0.5–8 s grows muscle equally (Schoenfeld 2015, PMID 25601394; Enes 2025, *JSCR*); ≤2 s eccentrics gave larger jump gains (Amdi & King 2025, *J Sports Sci*, PMID 40692176) | moderate |
| Rest on ≥13-rep sets **75 s → 90 s** | >60 s beats shorter for growth; no difference beyond ~90 s (Singer 2024, *Front Sports Act Living*, PMID 39205815) | low–moderate |

Existing users keep any swap they chose for the old pushdown (`FF_PLAN_RENAMED` in 040);
the new exercises start with no history, so the first session asks for a working weight.

**Confirmed (no change needed):** 5–30 rep ranges; double progression; moderate volume held
while cutting (Roth 2023); RIR 2 on heavy sets and RIR 1–2 on hypertrophy sets, with the last
set of a hypertrophy accessory taken to RIR 0–1 on Lean Bulk / Bulk (growth improves closer
to failure, strength doesn't — Robinson 2024, *Sports Med*, doi 10.1007/s40279-024-02069-2;
Refalo 2023/2024). Since Oct 2026 that last-set-to-failure cue is **never** shown in Easy or
Peak weeks, on a readiness recovery day, on loaded lunges/split squats, on an accessory that
comes before a heavy compound that day, or in a new lifter's first 2 weeks.

**Corrected (Oct 2026) — what the plan actually doses.** An earlier version of this section
"confirmed" 10–20 weekly sets and ~2 sessions per muscle. The plan does neither for most
muscles. Build-week doses in fractional sets (synergists count half; ranges depend on how
lunges, deadlifts and rows are counted):

| Muscle | 4-day | 5-day | Sessions / week |
|---|---|---|---|
| Quads | 10 | ~15 | 1 / 2 |
| Glutes | ~8.5–10 | ~12.5–14.5 | 1 / 2 |
| Hamstrings | 7 | 8 | 1 / 2 |
| Back (lats + upper back) | ~14 direct (~15.5 fractional) | same | 1 (all on the pull day) |
| Chest · triceps · biceps | 10 each | 10 each | 1 |
| Side delts | ~5 | ~5 | 1 |
| Rear delts | ~6.5–10 | ~6.5–10 | 1 |
| Calves | 3 | 4 | 1 |

- **Frequency:** every upper-body muscle is trained **once a week** in both splits (one push
  day, one pull day). The lower body is trained **twice a week on the 5-day plan** (quads day +
  hinge day); on the default 4-day plan it gets **one heavy day** plus ballistic work (the
  lift-day primers and the speed-day jumps/swings).
- **Waves and goals lower these:** Heavy weeks take a set off the 💪 accessories (lateral raises
  3→2, calves 4→3 on 5-day / 3→2 on 4-day); Retain mode (Lean Out / In-Season) trims one more
  (floor 2); Easy and Peak weeks are lower again. The pull day carries ~15.5 fractional back
  sets (14 direct) in Build weeks, ~13 in Heavy, ~11 in Easy and ~9 in Peak weeks.
- **Why it's defensible:** lower weekly volumes still build muscle, just less (Schoenfeld 2017;
  Pelland 2025); at equal volume, frequency barely changes growth (Schoenfeld 2019; Pelland 2025)
  but does independently help strength (Pelland 2025). The prime movers sit around 10 sets;
  low-transfer muscles (side delts, calves, knee-flexion hamstrings) sit lower to save recovery
  for the heavy and speed work. The cost is a likely modest strength-frequency loss for the
  upper body (and the 4-day lower body) and below-maximal growth for the low-dose muscles.
- **The coach** now states these real doses and frequencies, advises within the plan, and only
  if asked suggests one optional extra set for a lagging muscle (`knowledge.ts`).

**Why the bodybuilding identity is defensible, not decorative:**
- **Lifting doesn't cost the turn.** Full-range resistance training improves range of motion
  about as much as stretching (Alizadeh 2023, *Sports Med*, 55 studies, ES 0.73 vs control,
  0.08 vs stretching; Afonso 2021; Favro 2025). Supports "the mass you add won't cost your
  rotation" — provided lifts are full range.
- **Lean mass predicts speed long-term.** Elite juniors followed 5 years (n=323): lean body
  mass was the strongest modifiable predictor of CHS (β≈0.43 vs age 0.14; Nagashima 2026,
  *Int J Sports Sci Coach*) — juniors, so growth confounds it. Early gains are neural
  (Hegedus 2016: women gained speed with no lean-mass change).
- **Heavy and fast force still lead.** In tour pros, driver CHS correlated with trunk rotation
  peak power (r≈0.89, males), CMJ impulse/power (r≈0.67–0.78) and IMTP peak force (r≈0.75,
  males) (Johansen 2026, *Scand J Med Sci Sports*). Hypertrophy sits beside the heavy and
  ballistic work, never instead of it.
- **Gap:** no trial compares bodybuilding-style vs strength/power training for CHS.

**Open leads (not shipped):**
- **New training meta-analysis:** Johansen et al. 2026, *Sports Med* (33 studies, n=798):
  controlled training raised CHS ~+1.05 m/s (≈2.3 mph), ball speed ~+2.2 m/s, carry
  ~+9.3 m — **GRADE certainty low**. Would supersede Uthoff 2021's ~4.1% as the headline
  number **once the full paper is read**; until then the public-claims rules are unchanged.
- **OPEN OWNER DECISION — frequency & volume.** Keep the moderate, once-a-week-upper split as a
  deliberate choice (and say so everywhere, as the docs and coach now do), or restructure:
  - swap Single-Arm DB Row (pull day) with Single-Arm DB Bench Press (push day) in both splits —
    every upper prime mover gets a second, 3-set exposure and the pull day drops to ~11 direct
    back sets (both moves are 🌀, so wave/retain prescriptions don't change; history matches by
    name);
  - give the 4-day lower body a second heavy exposure (e.g. 2 of the RDL or leg-press sets on
    another day — the strength-frequency benefit is about heavy compound sets, not accessories);
  - raise the low-dose muscles (e.g. a second knee-flexion exposure on 5-day, 4 × 15 lateral
    raises, a calf raise on 5-day Day 4).
  Evidence for the trade-off: Schoenfeld 2019; Pelland 2025 (frequency helps strength, barely
  growth); Remmert/Pelland 2025 preprint (~11 fractional sets per muscle per session).
- **Per-session cap:** gains flatten past ~11 fractional sets per muscle per session (Remmert,
  Pelland 2025 preprint, not peer reviewed). The pull day in **both** splits is 14 direct back
  sets (~15.5 fractional) in Build weeks — the swap above would fix it.
- **In-season maintenance mode (not shipped).** Today In-Season Maintain only switches on
  Retain mode (one set off 💪 accessories, no to-failure cue; heavy lifts and speed work at full)
  on the same 4–5-day week, and Home/Octane still count sessions against 4–5 days. Evidence
  for a real mode: strength holds on ~1 heavy session/week with ~1 set per exercise; size in
  older lifters (60–75 in the studies) needs up to ~2 sessions and 2–3 sets per exercise
  (Spiering 2021; Bickel 2011). A real mode would be a 2–3-session in-season template (heavy
  lower/push/pull at 2–3 sets, primers and the speed day kept) with consistency scored against
  that frequency.
- **OPEN OWNER DECISION — population on-ramps.** The plan doesn't scale week 1 by experience,
  age or body size (shipped: self-chosen first loads at RIR 2, the readiness trim, the overspeed
  ramp, and no to-failure sets in a new lifter's first 2 weeks). Undecided:
  - **experience-level volume on-ramp** — a never-lifted user gets 71 (4-day) / 85 (5-day)
    lift-day working sets in week 1 (26 in the 4-day session 1), 3–4 sets per exercise; novice guidance is 1–3 sets per exercise
    (ACSM 2009 progression models, abstract read). Needs an experience input (stored inside the
    `fairwayfuel` profile, no new key) and a history-based stage so a season-2 restart doesn't
    re-trigger it;
  - **pull-up capacity gate** — Weighted Pull-up 4 × 6 leads the pull day for every Full/Home
    user; route users who can't do ~6 strict bodyweight reps to an assisted / band / negative
    variant first;
  - **plyometric gating** — landing-heavy jumps and bounds aren't gated by body mass, age or
    landing competency; today "land soft, low box first" is a coaching cue, not a gate.
- **Round timing (open lead, not shipped).** The week anchors to the weekday the user pressed
  Start and nothing knows when they play. For a Saturday golfer, 4 of 7 start days on the
  5-day plan (2 of 7 on the 4-day) put a lower-body session on the round day or the day
  before. Muscle-damaging, eccentric-heavy work can lower force and power for days afterward
  when unaccustomed (Byrne 2004, *Sports Med* 34:49–69, review, abstract read) — the repeated-bout
  effect shrinks this once the lifts are familiar. A low-volume heavy or ballistic "primer"
  1.75–48 h before shows a small benefit in other sports (Harrison 2019, *Sports Med*
  49:1499–1514, review; 2026 delayed-priming meta, g≈0.18, low certainty). Candidate: an
  optional "I usually play" day stored inside the roaming `ff_gameday` object, used to rotate
  the week at plan start so round days land on Rest / Play 18 and no lower day sits the day
  before; plus a day-before nudge. Extrapolated — no golf study.
- **Arm balance:** golfers' triceps strength and biceps:triceps ratio correlated with driving
  distance (PLOS One 2024, PMID 39042614; effect sizes unverified).

---

## 10. The app's exact formulas & config

So this file fully documents the data behind Yardsmith.

### Macro logic (per day)
`ffDayTargets` → `ffMacroTargets` in `src/js/app/024-macro-model.js`, called from `calc()` in
`src/js/app/025-macro-calculator.js`:
```
base_kcal    = max(TDEE × (1 + calorie_adj), floor)           // floor: 1200 women / 1500 men
adj          = clamp(ff_kcal_adj, max(−600, min(0, floor − base_kcal)), +600)
target_kcal  = max(base_kcal + adj, floor)                    // check-in nudge
reference_lb = min(bodyweight_lb, BMI-30 weight at the user's height)
protein_g    = round5( reference_lb × protein_per_lb )
fat_g        = round5( clamp(reference_lb × fat_per_lb, 45, 100) )
fat_g        = max(fat_g, ceil(target_kcal × 0.20 / 45) × 5)  // Oct 2026: fat ≥ 20% kcal, may pass 100 g
carb_g       = round5( max(0, target_kcal − protein_g×4 − fat_g×9) / 4 )   // fills the rest
target_kcal  = max(target_kcal, protein_g×4 + fat_g×9 + carb_g×4)
```
`round5(n)` = round to the nearest multiple of 5. Calories are also shown rounded to 5.
Protein and the body-size fat anchor don't depend on calories, so a check-in nudge lands in
carbs (and, since the 20% floor, partly in fat on a big-calorie day). The 20% floor
(`FAT_MIN_PCT`) applies to every goal. The code wins if this block and it ever disagree.

### Per-goal settings
| Goal | Calorie adj | Protein (g/lb ref.) | Fat (g/lb ref.) | Weekly target | Post-WO carb wt | Rec. meals |
|---|---|---|---|---|---|---|
| Lean Bulk | +10% | 0.90 | 0.35 | **+0.25–0.5%/wk** | 1.60 | 4 |
| Bulk | +20% | 0.90 | 0.35 | **+0.5–0.75%/wk** | 1.60 | 5 |
| Maintain | ±0% | 0.85 | 0.35 | hold (±0) | 1.60 | 4 |
| Cut / Lean Out | −20% | 1.00 | 0.30 | **−1 to −0.5%/wk** | 1.60 | 3 |

> **Weekly target** is a % of bodyweight per week, shown in the app as a live lb/week band
> (e.g. a 175 lb lean-bulker sees ≈ +0.4–0.9 lb/week). Gain bands scale from the BMI-30
> reference weight, loss bands from total weight (`ffWeeklyLb`). Lean Bulk is the default
> goal; onboarding suggests In-Season Maintain at BMI 27–30 and Lean Out at ≥30 (§2). Carbs — including pre/post-workout —
> are split across **every feeding by weight**, so portions shrink as you add meals. Meals
> are **clock-timed and anchored around your workout**: the meal nearest training becomes the
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
Run the **same authored week for all 20 weeks** (4 or 5 training days) — `PHASES[0]` in
`src/js/app/035-training-plan.js`. Every week trains all three qualities — no block-switching
(see §7 for the evidence); the 6-week waves below reshape sets and reps, not the exercises.

| Day (5-day plan) | What's in it | Targets |
|---|---|---|
| Day 1 — Lower (Quads) | **Heavy leg press (fast up)** + RDL, walking lunge, leg extension, standing calf raise, hanging leg raise | 4×6 heavy; 3×8–4×12 |
| Day 2 — Upper (Push) | **Heavy barbell bench (fast up)** + incline DB press, standing overhead press, single-arm DB bench, lateral raise, cable overhead triceps extension, cable wood-chop | 4×5 heavy; 3–4 × 6–15 |
| Rest / Play 18 | — | — |
| Day 3 — Speed & Power | Field or gym version: a jump (CMJ or light trap-bar jump), a rotational throw, an upper-body ballistic (seated chest throw or speed bench), a hip-power drill (slam or KB swing), a lateral drill, then **overspeed swings last** | 3–4 × 3–6, max intent; overspeed 2×5→4×5 |
| Day 4 — Lower (Hinge + Power) | Seated leg curl, **heavy conventional deadlift (fast up; Trap-Bar Deadlift is the first swap)**, hip thrust, Bulgarian split squat, Pallof press, farmer carry | 4×4 heavy; 3–4 × 8–12 |
| Day 5 — Upper (Pull + Rotate) | **Weighted pull-up (fast up)**, chest-supported row, lat pulldown, single-arm DB row, face pull, DB curl, wrist curl + reverse | 4×6; 2–4 × 8–15 |
| Rest / Play 18 | — | — |

The main lower lift is the **leg press, not the back squat** (heavy, explosive, far less spinal
load and technical fatigue — the rationale the coach carries in `knowledge.ts`); a lifter who
prefers the barbell squat can swap it back in.

**4-day option (balanced, not a deletion).** Choosing 4 days does **not** simply drop a day —
it runs a purpose-built balanced split so pushing and pulling stay matched: **Day 1 Lower
(Quads & Hinge)** — heavy RDL (4×6, fast up) + leg press, hip thrust, walking lunge, leg
extension, seated leg curl, calf raise, Pallof press · **Day 2 Upper (Push)** · **Day 3 Speed &
Power** · **Day 4 Upper (Pull + Rotate)** (Push and Pull identical to the 5-day days), with
rest days between. Both lower patterns live on Day 1, anti-rotation and rotational power are
retained, and no upper-body pulling is lost. Real frequency and per-muscle doses: §9a.

**Every training day opens with a 5-minute warm-up** — hip and thoracic-spine mobility on
the relevant days (90/90 switches, open-book rotations, leg swings, band pull-aparts), plus
ramp-up sets — because mobility and rotation are sacred for the swing (see §9).

**Effort** (`effortNote`). Each lift shows a target RIR (reps in reserve) and rest: heavy
compounds **RIR 2** (rest 2–3 min); ≤6-rep work **RIR 2–3**; other lifts **RIR 1–2** (RIR 1 at
13+ reps), rest ≥90 s; timed holds "steady hold"; power drills **max intent, full rest**, stop
when a rep slows. **Easy weeks and readiness recovery days are RIR 3+ on every lift.** On Lean
Bulk / Bulk the **last set** of a 💪 hypertrophy accessory goes to **RIR 0–1** in Build and
Heavy weeks (DESIGN-CHANGES §76) — never (Oct 2026) in Peak weeks, on lunges / split squats /
step-ups / Nordics / sissy squats, on an accessory that comes before a 🏋️ lift that day, in a
new lifter's first 2 weeks (plan weeks 1–2 with no earlier training history in the app), the
first time a lift is done ("find your working weight", RIR 2), or the first session back after
28+ days off that lift. In Retain mode (Lean Out / In-Season) accessories keep a rep back.

**Progression — double progression against one target number.** Each lift has ONE target
(e.g. 4 × 5), not a range. Hold the weight until **every working set reaches the target reps**
(at least 2 working sets logged, judged against the target that session was prescribed),
then the logger pre-fills **the smallest jump the gym actually stocks** (`incNum`, Oct 2026):
**+5 lb** on lower-body compounds, **+2.5 lb** on barbell upper-body lifts, **+5 lb** on
dumbbells, kettlebells, cables and machine stacks, **no load bump** on med balls. On the big
lifts every rep should still move fast; if reps grind, hold. **Power drills never get an
automatic load bump** (jumps, throws, swings, speed bench progress by intent and output; load
goes up only while every rep stays explosive), and **Peak weeks hold loads** (no jumps). Load-progression and
rep-progression build muscle about equally (Plotkin 2022, *PeerJ* 10:e14142, n=43 trained,
abstract read), so the single-target model is a choice of simplicity, not a compromise.

**The waves** (`waveFor` / `waveAdjust` / `effTarget`):
- **Build** (wks 1–3, 7–9, 13–15) — targets as written; hold the load and build reps until
  every set hits the target.
- **Heavy** (wks 4–5, 10–11, 16–17) — 🏋️ big-lift rep targets drop ~2 (floor 3) and the
  suggested load is **rescaled for the new rep target** (`repShiftLoad`, Oct 2026: an Epley-style
  ratio from the reps actually logged, clamped to −15%/+10%, so the effort matches; it scales
  back down when Build reps return); 💪 accessories drop a set (floor 2).
- **Easy / deload** (wks 6, 12, 18) — one set less on every lift and drill (nothing below 2
  sets), overspeed back to 2×5, RIR 3+, and the logger suggests **~60% loads** (a reduction
  always reduces, even on very light loads — `ffReduceLoad`).
- **Peak** (wks 19–20) — 🏋️ and 💪 lifts drop 2 sets, ⚡ and 🌀 drills 1 (floor 2), overspeed
  2×5; **same reps, loads stay heavy**. That is ~37% fewer weekly sets on a building goal
  (5-day 107→67, 4-day 93→59) and ~25–27% on Lean Out / In-Season (92→67, 81→59), because
  Retain mode's accessories already sit at the 2-set floor. No heavy singles/doubles.
- **Big Event date** (`ff_event`): the event week **and the week before** become Peak (so the
  taper starts 7–13 days out), the week after becomes Easy; everything else keeps the cadence.
- **Retain mode** (goal Lean Out or In-Season Maintain): one set off every 💪 accessory (floor 2)
  before the wave applies; 🏋️ / ⚡ / 🌀 untouched.
- **Coming back after a break** (Oct 2026), per lift: 14+ days since its last full-dose
  session → no add-weight jump; 28+ days → ~90% of the last working weight (§7 "Time off").

**Power primers (speed on every lift day).** Each lift day opens with a single explosive
"primer" done **first, fresh**, chosen from the day's name by `primerFor`: rotational med-ball
throw (pull day), explosive med-ball chest pass (push day), Russian kettlebell swing (hinge
day), box or squat jump (the quads / lower day — both splits' Day 1, including the 4-day
"Quads & Hinge" day since Oct 2026, so 4-day users get a lift-day jump again). The match is on
the day's *name*, so renaming a day can silently change its primer — check `primerFor` after
any rename. Kept to a few max-intent reps with full
rest (~5 min), primers give speed **4–5 exposures a week** (4 on the 4-day plan, 5 on the 5-day: one primer per lift day plus the Speed & Power day) and add
no metabolic fatigue, so they don't cost hypertrophy. Any boost to the heavy lift that follows
is small and unreliable after a full warm-up (PAP/PAPE is unproven in golf — CLUBHEAD §10.3), so
it isn't a selling point. The **Speed & Power day stays**: jumps and throws lead it, and
overspeed swings are its last drill — primers supplement it, they don't replace it. The rule
that makes it work: low-rep, max intent, fully rested, always first. The app's note tells
newcomers to jumps and throws to start with 2 sets and build up — advice, not an automatic ramp.

**Tracking the payoff:** run the **Speed Test every 2 weeks** (`SPEEDTEST_EVERY = 14` in
`060-speed-test…js`: warm up, 3 max-intent 7-iron swings, best counts). 7-iron is more
repeatable than driver, so the trend is a cleaner signal that the mass you're building is
converting into speed. Manual entries are allowed any day.

### Evidence-based refinements (research-validated)

A deep review of the literature (clubhead-speed transfer, power/explosivity, mobility,
hypertrophy/periodization, injury prevention) confirmed the program is well-aligned and added
these tweaks:

- **Power, not flexibility, drives clubhead speed.** Meta-analyses find flexibility/balance are
  **not** significantly associated with CHS (r≈0.03); the strongest correlates are jump impulse
  (zr≈0.82, Brennan 2024 — CLUBHEAD §10.1) and upper-body explosive/med-ball power. Mobility work
  stays — but for **ROM, X-factor and injury prevention**, not as a "speed" method.
- **Overspeed: light, fast, and an adjunct.** Light loads moved fast preferentially build
  velocity (load specificity — CLUBHEAD §9.1). In the app, overspeed swings are **once a week, the
  last drill of the Speed & Power day**, on a fixed ramp (`overspeedDose`): 2×5 in weeks 1–2, 3×5
  to week 8, 4×5 from week 9, eased back to 2×5 in Easy and Peak weeks. Independent evidence is
  acute only (CLUBHEAD §9.2), and the best weekly frequency is unknown (§9.7) — the popular
  3×/week-with-a-rest-day schedule is a vendor protocol, not independent evidence, and there is
  no separate strength "readiness check" for it (the daily readiness check can trim the whole
  session).
- **Velocity quality.** Power reps build speed only while they're fast — **stop a set the instant
  reps visibly slow**; keep loads light and rest full. (Velocity-loss research.)
- **Eccentric / deceleration.** The low back is the #1 golf injury and most non-contact injuries
  occur in deceleration; eccentric work cuts strain injuries ~50%. Lifts use a **controlled
  1–2 s lowering** (Sep 2026: slower adds no growth, and ≤2 s eccentrics gave better jump
  gains — §9a). For jumps, **landing before height** is a coaching cue ("land soft", low box
  first), not an enforced gate — gating plyometrics by body mass, age or landing skill is an
  open owner decision (§9a).
- **Grip / forearm.** Grip strength correlates with ball speed and protects the lead wrist/elbow
  (top amateur upper-limb injuries) — added direct wrist work on the pull day.
- **Volume realism.** Hypertrophy keeps rising past ~10–12 hard sets/muscle/week but with
  diminishing returns (Pelland 2025), and strength needs even fewer — so the program holds
  moderate volume rather than chasing it, preserving recovery for the power/speed work. The
  real per-muscle doses (several muscles below 10 sets, upper body once a week) are in §9a.
- **In-season.** Picking **In-Season Maintain** switches on Retain mode: one set off the 💪
  accessories (floor 2) and no to-failure cue, while heavy lifts, primers and all speed work stay
  at full — on the same 4–5-day week (Home and Octane still count against it). True maintenance
  can be far leaner — strength holds on ~1 heavy session/week at ~1 set per exercise in younger
  adults, while lifters ~60–75 needed up to ~2 sessions and 2–3 sets per exercise to keep size
  (Spiering 2021; Bickel 2011) — but the app has **no 2-day in-season template yet** (open lead,
  §9a).
- **Peaking.** Set a Big Event date and the event week plus the week before become Peak weeks
  (7–13 days out): lifts drop 2 sets, drills 1, same reps, heavy loads — ~a third fewer weekly
  sets on a building goal, ~25% on Lean Out / In-Season (§10 waves), followed by an Easy week.
  In other sports (mostly endurance time trials), the best tapers cut volume ~41–60% while
  holding intensity and frequency (Bosquet 2007, *MSSE* 39:1358–1365, meta-analysis, abstract
  read), so the app's taper is on the gentle side. **No golf study has measured a taper's
  payoff**, so the app promises no % gain — the 7-iron speed test on the day is the proof
  (CLUBHEAD §11.8).
- **Sleep is a performance variable.** Sleep loss degrades **skill control** (swing tempo/strike)
  more than strength — aim 7–9 h.

> Concurrent-training note: the interference effect mainly blunts **power**, and **running** is
> the worst offender. This program prescribes no endurance work; if you add conditioning, prefer
> **cycling**, keep it in a separate session, and keep volume modest.

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
  boost for training (and the front nine). **But it costs sleep for hours:** keep it at
  least **~8 h before bed**, longer for big doses — caffeine cut total sleep by ~45 min on
  average, and to avoid that a ~107 mg coffee needed ≥8.8 h and a ~217 mg pre-workout
  ≥13.2 h before bed (Gardiner 2023, *Sleep Med Rev* 69:101764, meta-analysis, abstract
  read). So the full dose suits morning and midday sessions; **afternoon (4 PM) and evening
  (7 PM) trainers should use less or none**, since sleep is a non-negotiable for muscle and
  recovery. Sensitivity varies a lot between people.
- **Vitamin D / creatine / electrolytes** for general health and hydration on long, hot
  rounds. Get most micronutrients from food first.

Everything else (BCAAs, testosterone "boosters", fat burners, exotic pre-workouts) is
mostly marketing. Food, protein, creatine, sleep, and progressive overload do ~95% of it.

---

## 12. How Yardsmith compares to other calculators

Yardsmith's logic lines up with the most respected evidence-based calculators — and
errs slightly higher on protein, by design.

| Source | Protein | Fat | Carbs | Surplus / deficit |
|---|---|---|---|---|
| **RippedBody** (Andy Morgan / Leangains) | ~1 g/lb | 15–25% kcal (cut), 20–30% (maint/bulk) | remainder | adjust via carb:fat 2:1 |
| **Bony to Beastly** | 0.7–1 g/lb | 20–40% kcal | 40–60% kcal | bulk ≈ +750 kcal, ~0.5 lb/wk |
| **Bodybuilding.com** | ~30% kcal (gain) / 40% (loss) | 20–30% kcal | 40% kcal | by goal & body type |
| **Yardsmith** | **0.85–1.0 g/lb reference weight (BMI-30 cap)** | **0.30–0.35 g/lb reference weight, 45–100 g, ≥~20% kcal** | remainder | +10/+20% or −20% |

Common ground across all of them: **protein set by bodyweight first, fat second (with a
floor/ceiling), carbs fill the rest, and a moderate surplus (~+10–20%) gained at roughly
0.5 lb/week.** Where they differ is mostly preference. Yardsmith deliberately runs
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

## 14. Applied example: Rory McIlroy — 2025 Masters (vetted)

McIlroy's 2025 Masters win — completing the career Grand Slam — is the clearest modern
proof of the "train like an athlete, for years, to play better golf" thesis. His
publicly-reported program lines up almost exactly with what Yardsmith already
prescribes. *(Facts below are drawn from mainstream reporting and trainer/recovery-coach
interviews — Golf Monthly, WHOOP, and similar — not from any single proprietary source;
where a claim mattered it was cross-checked against multiple outlets.)*

**✅ Worth copying (credible, evidence-aligned, already in this plan):**
- **Long-horizon, phase-based development.** He began structured training with exercise
  physiologist Dr. Steve McGregor around **2010**, on a **stability → strength → power**
  progression; the green jacket arrived ~**15 years** later. The lesson is the one in
  [§8](#8-gaining-10-lb-of-muscle-realistic-rate--timeline): real athleticism is built
  over **months and years, not weeks** — which is exactly why Yardsmith runs repeatable
  20-week blocks, not a "12-week transformation."
- **A concurrent in-season micro-split.** In tournament weeks he reportedly runs ~3
  quality gym touches — a **heavy strength day** (trap-bar deadlifts, weighted pull-ups),
  a **golf-only day**, and an **explosive power day** (box jumps, medicine-ball throws,
  light loads moved fast) — then mobility/activation the rest of the week. This is the
  same **concurrent, low-volume/high-intensity in-season** idea described in
  [§10](#10-the-apps-exact-formulas--config) (the app's In-Season goal trims only accessory
  volume today; a true 2–3-session in-season template is an open lead, §9a).
- **Power trained explosively and fresh.** Box and broad jumps, rotational and overhead
  medicine-ball throws, landmine rotations and cable work — for **ground force** and
  **anti-rotation**. These are the same rate-of-force-development, rotational-power, and
  "core as a brake" priorities in our speed day and lift-day **power primers**
  ([§7](#7-bodybuilding--hypertrophy-principles), [§9](#9-where-golf-actually-changes-things)).
- **Recovery treated as training.** Post-round easy bike spin, pneumatic compression
  (Normatec), percussion (Theragun), and sleep/strain monitoring (WHOOP) — mirroring our
  "recovery is where growth happens, **7–9 h sleep**" rule ([§7](#7-bodybuilding--hypertrophy-principles)).

**🚩 Treat with caution (don't copy blindly):**
- **Exact "celebrity routines" are reconstructions.** The specific sets/reps/loads in
  aggregator articles are inferred, not gospel. Use the *principles*; set your own loads
  by **double progression** ([§10](#10-the-apps-exact-formulas--config)).
- **The gear is optimization, not the cause.** Normatec/Theragun/WHOOP help him recover —
  they don't create the result. Sleep, food, and progressive overload do ~95% of it
  ([§11](#11-supplements-the-few-that-actually-work)).
- **Don't chase his numbers.** Tour-pro loads and speeds are the product of 15 years of
  training and full-time support. The **transfer principle** copies; the absolute numbers
  don't.

**Bottom line:** McIlroy's program is an elite, well-resourced version of the *same*
concurrent, power-biased, recovery-anchored approach Yardsmith encodes — built
patiently over years. It validates the method; the specific routine numbers are not the
point.

---

## 15. Sources & further reading

**Primary / authoritative (highest confidence):**
- **Morton RW, et al. (2018)** — meta-analysis of protein & resistance training, *Br J
  Sports Med* (the 1.6 g/kg plateau, ~2.2 g/kg CI).
- **Helms ER, Zinn C, Rowlands DS, Brown SR (2014)** — systematic review, protein for
  resistance-trained lean athletes in a deficit: **2.3–3.1 g/kg of fat-free mass**, *Int J Sport
  Nutr Exerc Metab* 24:127–138.
- **Helms ER, et al. (2023)** — small (+5%) vs large (+15%) energy surplus in 21 trained lifters,
  8 weeks: faster gain mostly added fat, not muscle thickness or 1-RM, *Sports Med Open* 9:102
  (abstract read).
- **Iraki J, Fitschen P, Espinar S, Helms E (2019)** — off-season bodybuilding nutrition review:
  gain ~0.25–0.5% of bodyweight/week, the most-trained at the low end, *Sports* 7:154 (abstract read).
- **Burke LM, et al. (1995)** — adding fat + protein to carbohydrate recovery meals did not change
  24-h muscle glycogen storage, *J Appl Physiol* 78:2187–2192 (abstract read).
- **Gardiner C, et al. (2023)** — caffeine and subsequent sleep, meta-analysis, *Sleep Med Rev*
  69:101764 (abstract read).
- **Alcohol (§5):** Parr EB, et al. (2014) *PLoS One* 9:e88384; Barnes MJ, Mundel T, Stannard SR
  (2011) *Eur J Appl Physiol* 111:725–729; Shirreffs SM, Maughan RJ (1997) *J Appl Physiol*
  83:1152–1158 (abstracts read).
- **Detraining / maintenance (§7, §9a, §10):** Spiering BA, Mujika I, Sharp MA, Foulis SA (2021)
  *J Strength Cond Res* 35:1449–1458 (full text read); Bickel CS, Cross JM, Bamman MM (2011)
  *Med Sci Sports Exerc* 43:1177–1187; Mujika I, Padilla S (2001) *Med Sci Sports Exerc*
  33:1297–1303; Bosquet L, et al. (2013) *Scand J Med Sci Sports* 23:e140–e149; Halonen E, et al.
  (2024) *Scand J Med Sci Sports* 34:e14739; Ogasawara R, et al. (2013) *Eur J Appl Physiol*
  113:975–985 (abstracts read unless noted).
- **Volume, frequency & progression (§7, §9a, §10):** Schoenfeld BJ, Ogborn D, Krieger JW (2017)
  *J Sports Sci* (weekly-volume dose-response); Schoenfeld BJ, Grgic J, Krieger J (2019) *J Sports
  Sci* (frequency at equal volume); Pelland JC, et al. (2025) *Sports Med* 56:481–505; Remmert JF,
  Pelland JC, et al. (2025) SportRxiv preprint (per-session ceiling, not peer reviewed); Plotkin D,
  et al. (2022) *PeerJ* 10:e14142 (load vs rep progression); ACSM (2009) *Med Sci Sports Exerc*
  41:687–708 (novice 1–3 sets per exercise).
- **Deadlift bars (§9):** Swinton PA, et al. (2011) *J Strength Cond Res* 25:2000–2009; Camara et al.
  (2016) *J Strength Cond Res* 30:1183–1188 (abstracts read).
- **Tapering & round timing (§9a, §10):** Bosquet L, Montpetit J, Arvisais D, Mujika I (2007)
  *Med Sci Sports Exerc* 39:1358–1365; Byrne C, Twist C, Eston R (2004) *Sports Med* 34:49–69;
  Harrison PW, et al. (2019) *Sports Med* 49:1499–1514 (abstracts read).
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

## 16. Disclaimer

This document is educational and reflects general, evidence-based ranges — not
individualized medical or dietetic advice. Energy and macro estimates carry inherent
error and are starting points to be adjusted against real-world results. Consult a
qualified physician, registered dietitian, or coach before starting a new diet or
training program, especially if you have any medical condition.
