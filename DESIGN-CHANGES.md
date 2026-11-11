# Design changes — engagement & performance upgrade (Jul 2026)

## Single-leg glute bridge on the hinge day (Nov 11, 2026)

TPI piece #2. The owner had asked whether there were "lifting and exercise pieces we could steal".
The hinge day now holds the pelvis on one leg.

- **The plan:**
  - Right after the hip thrust comes **Single-leg Glute Bridge, 2 × 10 / leg (pause at the top ·
    hips level)**. That's 5-day Day 4 (Hinge + Power) and 4-day Day 1 (Quads & Hinge).
  - One hip-thrust set moved to it: 5-day 4 → 3 × 8, 4-day 3 → 2 × 8. Glutes come out +1 set a
    week.
  - In-season days are untouched.
  - It's 💪, so the on-ramp, retain and wave trims apply as usual (it already sits at the 2-set
    floor).
- **The case:** one leg holds the pelvis level while the hip drives, which is the lead side's job
  through the weight shift. It also shows a side-to-side difference a two-leg hip thrust hides. The
  copy is durability and control, never speed or injury prevention. The evidence is cross-sectional
  (Tsai 2010) plus an RCT that raised hip strength but not performance (Hamada 2025), written up in
  NUTRITION §9a.
- **How-to:** it has its own cue and golf "why" (045 `exerciseForm` / `liftWhy`): hips level, pause
  2 s, lower slowly. Single-Leg Hip Thrust shares them; the two-leg hip thrust keeps its own.
- **Never to failure:** like lunges and split squats, single-leg hip work isn't taken to failure on a
  bulk (`effortNote`). That covers the bridge, the single-leg hip thrust and the single-leg RDL.
- **No lift twice on a day:** with no bench, the hip thrust's new last sub is a two-leg Glute Bridge
  (2 × 15, pause), so it doesn't become a second single-leg bridge. The day gains one set, not two.
- **Pre-PR independent review:**
  - The first version also re-resolved a day whenever a user's own swap duplicated a planned lift,
    moving the plan's row to its next sub. That fired on ordinary picker swaps and demoted heavy
    lifts:
    - Incline DB Press → Barbell Bench Press turned the heavy bench into a DB press;
    - Leg Extension → Leg Press turned the leg press into a goblet squat.
    In each case the lift lost its history, and the case it was written for can't happen through
    the app. It was removed, and a test now pins that those swaps leave the plan's lifts alone.
  - The same review moved the bridge out of "to failure" and cut the no-bench fallback from 3 to 2
    sets.
  - Accepted as is: a user who already swapped Hip Thrust → Single-Leg Hip Thrust now also gets the
    floor bridge. That's two single-leg glute lifts, by their own choice.
- **Verified:**
  - New tests in `tests/training-engine.test.mjs` (6) and `tests/exercise-cues.test.mjs` (a new
    `slbridge` cue family) cover:
    - the plan rows in both splits, with in-season untouched;
    - bodyweight presets with no duplicate names;
    - user swaps that duplicate a planned lift leaving it alone (bench, RDL, leg press), and the
      bridge never moving;
    - the 2-set no-bench fallback;
    - no failure for single-leg hip work;
    - the cues coming ahead of the hip-thrust entry, with no speed or prevention words.
  - The review tests fail on the first version; the rest fail against main.
  - Suite 300/300. The 4-day Day 1 session estimate stays in its 75–95 min band.
  - A Playwright e2e passes in light and dark, with zero page errors; every new assertion fails on
    main's build. On a pinned hinge day (Wed Nov 11) it checks:
    - the bridge listed right after the hip thrust, with its note. The hip thrust shows 2 × 8 in
      week 2, because the on-ramp takes a set off;
    - a picker swap that duplicates the Deadlift leaving the plan's rows alone, with nothing
      relabelled;
    - true bodyweight-only gear giving Single-leg RDL, Glute Bridge and the single-leg bridge, with
      no duplicates.
  - Audits match baseline: train 18/18, scroll 16/16, contrast clean, type 1 known (Fuel "Ate it").
  - The release gate and claims-lint are clean.

## Power check: a jump and a throw, about monthly, on Speed Test Day (Nov 11, 2026)

The first piece taken from the TPI research (owner: "I'm hoping there were some lifting and exercise
pieces we could steal"). Both meta-analyses put power at the top of what tracks clubhead speed (jump
impulse zr≈0.82, upper-body explosive strength zr≈0.67; Brennan 2024), with flexibility and balance at
zero, and TPI's own campus session adds a jump and med-ball throws to its screen. Yardsmith tracked
speed and mobility but no power number.

- **When:** every other speed test (`POWER_DUE_AT=21` days; never done = due). The speed test's
  result shows a "Power check — due / set your baseline" card above Done. It comes **after** the three
  swings, so the swing protocol is unchanged. Tapping Done skips it.
- **The form** (same `#stModal`, header becomes "Power check"):
  - A pain stop comes first: "Stop if anything hurts — skip it today; the speed test already counts".
    Opened on its own, it reads "skip it today and try another day".
  - **Jump and reach**, best of 3, in inches, with "Land soft and quiet". A low-impact profile
    (`ffLowImpact`: 60+, BMI 30+ or a flagged health question) also gets "Go easy: a small dip, a quiet
    landing — one good jump is plenty".
  - An optional **seated chest throw**, best of 3, in feet, with ball-weight chips (4–14 lb). The last
    ball used is preselected. A throw without a ball weight can't save.
  - Range checks catch typos (2–48 in, 3–60 ft). A number under the floor while typing ("1" on the
    way to 18) only blocks Save; the error appears when the field is left.
  - A number more than 25% from your last one (the last same-ball throw, for the throw) asks once,
    like the speed test's 15% check. Tapping Save again saves it.
  - Typing never re-renders, so the keyboard stays up. Ball chips update in place, so keyboard and
    screen-reader focus stays on the chip.
  - Past the free week, locked users see their own Pro sheet ("Power checks are part of Pro", reason
    `powercheck`).
- **The result:** each number against your own checks. A throw is only ever compared with the same
  ball.
  - Changes inside the noise line read "About the same as last check (±1 in is normal wobble)". That
    line is ±1 in for the jump and ±5% (never under 1 ft) for the throw; both are assumptions pending
    repeat data.
  - From the second prior check on, it also shows the change since your first check.
  - No outside norms; TPI's published power norms are deliberately not used.
- **Elsewhere:**
  - The Stats speed card gets a one-line Power summary, with a 44px "check due" link when due. The
    result only points to that card when it exists (once there's a counted speed number).
  - The Log sheet gets a "Power check" row that opens the form directly.
  - Welcome-back counts a power check as activity.
- **Data:**
  - New roaming key `ff_power` `[{ts, date, week, jump, chest, ball}]`.
  - It's in `KEYS`, with a MERGE `unionSeries` by `ts`, capped at 40 in both the merge and the
    module.
  - The cap never moves a baseline (Codex, #129). The first jump and the first throw with each ball
    weight always stay; the rest are the newest. This is the same rule in `pwCap` (060) and
    `powerCap` (cloud-sync), unit-tested to keep identical entries on 200 random lists.
  - The cloud-sync pin went v121 → v123 in both templates.
  - Not an Octane input: first see whether it moves with 7-iron speed user by user.
  - The data-contract script now also allowlists `ff_notif_today`, which was already device-local
    (since the evening reminder) but was missing from the list.
- **Pre-PR independent review:** 6 findings, all fixed with a failing test first:
  - the ball chip dropped focus;
  - the pain line was wrong when the check was opened on its own;
  - locked users saw the speed-test paywall copy;
  - the result promised a Stats line that could be absent;
  - an in-range typo became a permanent baseline;
  - the range error flashed while typing, and the Stats link was 32px.
  - It also hardened "undefined lb" for a hand-edited entry.
  - Reviewer note, not a bug: a device still on cloud-sync v121 drops `ff_power` from the cloud copy
    until a v122 device pushes again. Every new roaming key has this transition.
- **Verified:**
  - `tests/power-check.test.mjs` (20 tests; all fail against main) covers:
    - due timing (14 days not due, 21 and 28 due, out-of-order lists);
    - the form rules and the ball default;
    - same-ball comparisons and the noise-line words;
    - the save shape and cap;
    - the Stats line and the Log-sheet wiring;
    - the swing protocol left untouched and no outside names in the copy;
    - a two-device `ff_power` union through the real MERGE entry.
    - the review fixes listed above.
    - the baseline-keeping cap on both the app and sync sides (Codex, #129).
  - Suite 294/294. The sync proof passes 24/24.
  - A Playwright e2e on the built app passes in light and dark, with zero page errors. It covers:
    - the offer on a first speed test;
    - the form, error and focus behaviour, with every control ≥44px. That includes no error flash
      while typing "1", the error on leaving the field, and keyboard focus kept on a ball chip; these
      checks fail on the pre-review build;
    - the baseline result and the saved entry;
    - the Stats line;
    - the Log-sheet entry with the ball remembered: +1.5 in reads as a gain, +1 ft on 23 ft reads as
      "about the same";
    - no offer on the next speed test;
    - Skip saving nothing;
    - +44% asking once, then saving;
    - a 44px "check due" link on Stats that opens the form.
  - Audits match baseline: train 18/18, scroll 16/16, contrast clean, type 1 known (Fuel "Ate it").
  - Data contract, release gate and claims-lint are clean.

## The turn check ignores one shaky move, and stops for pain (Nov 11, 2026)

From the TPI research report: single self-rated screen items are the least reliable layer of any
movement screen (even trained raters agree least on individual items; a warm-up or 18 holes shifts
scores by ~10%), so the Build turn guard (halves the surplus, trims arm isolation, adds rotation)
was firing on noise. And the screen had no pain stop, the biggest gap between an app screen and an
in-person assessment. Owner: "build both fixes."

- **The guard needs a clear or a confirmed drop** (065 `ffTurnGuard`):
  - **Clear:** the moves both screens share fall ≥2 levels in total vs the screen before (one move
    ✅→🔴, or two moves down one). One move up doesn't cancel another's two-level fall.
  - **Confirmed:** a move below the level it was at before it dropped, on the last two screens or
    more (`mobDown`: an earlier screen higher than every screen since, with ≥2 screens since). It
    holds however many screens the move stays down, not a rolling three-screen window (Codex, #128):
    a clear drop that holds stays guarded; partly back but still below stays guarded; back to where
    it was lifts it; dip, back, dip starts over.
  - **One move a level lower on its own:** no guard; on Build, when this screen didn't just switch
    the guard on (a 2 → 1 → 0 slide does — Codex, #128), the result screen says "…came back a level
    lower. One move on one day can be noise, so nothing changes yet. If it's still lower on your
    next check, your plan adjusts to protect your turn." (`mobWatch`).
  - Same shape returned (`dropped`, `ts`, `label`, plus `why`), so every reader is unchanged.
- **Same conditions every time:** the intro now says do it cold, before you train, around the same
  time of day, and never right after a round.
- **Pain stops the screen:** a "Before you start" check (sharp pain, pain that runs down an arm or
  leg, numbness or tingling, pain that wakes you at night) and a "Sharp pain on this one? Stop
  here" link on every move. Either ends with "Get that looked at before you test it… See a doctor
  or physical therapist, and run the turn check again once you've been cleared", and **nothing is
  saved**, so the plan, the Octane and the guard don't move. No diagnosis, no back-specific claims.

**Verified:** `npm test` 274/274 (the guard test is now 16 enumerated cases across two and three
screens, goals and mixed screens; plus the watch note; both fail on the old rule). Playwright,
built app, light + dark, zero page errors: the pain check comes first with no tests showing; "Yes"
and a mid-screen stop both end on the clinician message and save nothing; "No" shows the
same-conditions note and a pain stop on all five moves; one move a level lower saves with the
"nothing changes yet" note and no guard on Train; the same move still lower next check turns on
"Turn guard on" (hip rotation); a 4th screen still down stays guarded; back to ✅ lifts it; a fresh
one-level dip shows the note with no guard; sliding on to 🔴 turns the guard on with no "nothing
changes yet". Audits: train 18/18, scroll 16/16, type 1 known, contrast clean.
Release gate and claims-lint clean.

## Train stays simple outside a workout (Nov 11, 2026)

Owner, with a screenshot of Train on a finished Push day (the full Previous / LBS / REPS set tables
with ticks, the warm-up fold, a progress bar): "I kinda want all this hidden or simplified. I only
need to see and edit the full workout when I am working out."

- **The set tables only while logging by typing** (035 `dayCardHtml`): `manual` is now the
  "Log by typing" pref AND an unfinished workout. It used to be `hasWork || pref`, so any day with
  logged sets (every workout finished in the player) rendered the full editable tables on Train.
- **A finished or started day shows a compact list of what you did** (`slDoneText`): "✓ 3 sets ·
  best 230 × 6" under each lift, tap for its history; "To change a set, open the workout above"
  (the hero opens the player, where editing lives). The finished-day hero now reads **"Review or
  edit this workout"**, not "Replay finished session" (owner: "we can reopen the workout to edit it
  afterward"); it opens on the recap with every saved set, Back reaches any lift.
- **No "do these first" warm-up fold on a finished day**; the cool-down fold stays.
- **No finish / "saved to history" block on Today** unless typing an unfinished workout — just the
  "↺ Clear / reset this workout" link (every logged day keeps a reset: the audit-train invariant,
  failure-archaeology §4).
- **"Not feeling it? Make today a rest day" only while looking at today** or at the missed workout
  Train leads with on its own, not while browsing another day (a missed day you tapped included;
  Codex, #127).

**Verified:** `npm test` 273/273. Playwright, built app, light + dark, typing pref off and on, zero
page errors: a finished Push day (tapped on the strip) → "Review or edit this workout", no set tables,
"✓ 3 sets · best 230 × 6" / "best 60 × 10", no warm-up fold, only the reset link, no rest-today link;
today's unfinished Hinge → compact list (pref off) or the typing tables (pref on), rest-today link
back. Edit afterward: the finished Push day's "Review or edit this workout" → the player opens with
the saved sets → Back to Bench → set 3 changed 230 × 5 → 230 × 6 is saved, still finished. The
rest-today e2e (all scenarios, with its plan start pinned per harness gotcha #13) still green. Audits: train 18/18 (every logged day exposes a reset), scroll 16/16, type 1 known, contrast
clean. Release gate and claims-lint clean.

## Push day is all push, Pull day all pull (Nov 11, 2026)

Owner, in the player on Push day at Single-Arm Cable Row: "Isn't this a back exercise — on push
day?" … "Feels weird in a push day tbh" … "Yes all. Push all pull." This reverses the Oct 2
"chest and back twice a week" swap (DESIGN-CHANGES "Program update"; NUTRITION §9a).

- **Both splits (4- and 5-day):** Push day's Single-Arm DB Row → **Single-Arm DB Bench Press**
  (it keeps the one-arm, resist-the-twist 🌀 work); Pull day: Single-Arm DB Bench Press →
  **Single-Arm DB Row**, and **Lat Pulldown out** (the pull-ups cover the pattern, and with no bar the
  pull-up already swaps to a pulldown, so it would have been there twice).
- **Volume:** chest 10 sets once a week (was 10 over two days); back 10 once a week (was 13 / 15
  over two days). Inside the effective range; per-session sets stay under the ~11 cap.
- **History carries:** loads match by lift name, falling back to any day's log, so each one-arm lift
  keeps its numbers on its new day. Logged sessions keep their own lift lists. In-season full-body
  days are unchanged (a row fits a full-body day).
- No day names changed (`ff_log` is keyed by day name).
- **Every gear setup keeps a vertical pull** (Codex, #126): with no bar, the pull-up's swap order
  is now pulldown → band pulldown → **Sliding Floor Lat Pull** → DB Row → inverted row. Before, a
  bodyweight or dumbbells-only pull day became rows on rows once the Lat Pulldown left (Bodyweight
  was "Inverted Row, Doorframe Row, Single-Arm Doorframe Row"). Same order for the in-season Pull-up.

**Verified:** `npm test` 273/273 (incl. a vertical pull on the pull day for the full, home, minimal,
bodyweight and dumbbells-only setups, both splits, plus in-season; it failed before the swap fix);
Playwright Full-week view (light + dark, zero page errors) shows the one-arm press on Push and the one-arm row on Pull with no pulldown; audits train 18/18, scroll 16/16, type 1 known, contrast clean. The Oct test "upper body is trained twice a week" is replaced by
"push day is all push, pull day is all pull, in both splits" (no back lift on push day, no chest
press on pull day, the one-arm lifts on their own days, no pulldown next to the pull-ups, chest and
back ≥ 10 sets/week), which fails on the old program. The per-session cap test still passes.

## "How did the last set feel?" — a grind holds the weight (Nov 11, 2026)

Owner said yes to the gap named when he asked about progressive overload: reps alone can't tell an
easy 4 from a grinding 4, so a grinding top set still earned the jump.

- **The question** (player, 070 `plFeelHtml`): once every set of a loaded lift is ticked (with a
  weight logged), three chips: **Easy** "3+ reps left" · **Solid** "1–2 left" · **Grind** "nothing
  left". Optional; tap again to clear. Not for throws, jumps or bodyweight drills. Saved as
  `ex[].feel` on the session (roams with `ff_log`) and in permanent history (`ff_history`, so a Grind
  still holds after a plan restart). A line confirms the pick ("Got it. Next time holds this weight so
  you can own every rep."). The rating belongs to the sets it was given for: adding, removing or
  un-ticking a set, or swapping the lift, clears it (Codex, #125).
- **The rule** (040 `progressReady`): a Grind is not ready, so next session holds the weight and the
  player says "💪 Last time was a grind at 225 lb. Hold it and own every rep." (`dose.grind`). The next
  non-grind session with every rep earns the jump. On a maintaining plan a Grind breaks the
  two-in-a-row (`_prev` carries its feel). Easy / Solid / no answer: unchanged.
- Science: a coarse reps-in-reserve read (RIR-based autoregulation) without asking for numbers.
- The inline (type-it-yourself) logger doesn't ask; no answer = the normal rule.

**Verified:** `npm test` 272/272 with the ramp-up and maintaining changes (new: Grind holds, Easy/Solid/none don't, the next clean session
earns it, a Grind breaks a maintain plan's pair; `tests/set-feel.test.mjs`: asked only after every set
with a weight, never for throws/jumps/bodyweight, pick + meaning + tap-to-clear, the hold copy). Both
new files fail on the old code. Playwright, built app, light + dark, zero page errors, Deadlift on
the Hinge day: no question until all four sets are ticked → Grind saved on the session → tap again
clears → Easy saved; with a Grind at 225 last time → "Last time was a grind at 225 lb. Hold it…" and
the placeholder stays 225 (a clean 225 → 230).

## Maintaining plans add weight more slowly (Nov 11, 2026)

Owner, after asking whether progressive overload is built in: "maybe we take it a little easier on
maintaining plans." It is built in (double progression, the wave, rep-change load matching,
readiness/deload/return guards, stall and PR cards), and it ran the same on every plan: one session
with every rep at the target meant more weight next time, on a maintain or cut goal too.

- **Maintaining = a maintain/cut goal, or an in-season plan** (`ffEasyProgress`, 035, next to
  `trainRetain`). There the jump needs every rep, on every working set, at that weight **two
  sessions in a row** (a top set alone isn't holding it: 225/200/200/200 doesn't count; Codex, #125)
  (`ffHeldTwice` in 077, fed by `lastSessionFor`'s new `_prev`, the previous full-dose session of the
  lift). After one clean session the player says "🎯 Maintaining: hold 225 lb. Hit every rep again and
  it goes up next time." Building plans are unchanged. One `ffDose` gate, so the player, the inline
  logger and the Train card all agree.
- **No "has stalled" card on maintaining plans**: holding a weight is the plan there.
- Science: strength is kept by keeping intensity; volume can drop substantially (Bickel 2011,
  Spiering 2021). Slower load increases fit a cut (recovery is limited) and in-season (rounds come
  first) as well as maintain.

**Verified:** `npm test` 264/264 (new: maintain + cut hold after one clean session, add after two,
hold after a miss the session before, hold with only one session on record, building unchanged; which
plans count as maintaining; the stall gate and player copy). Both new tests fail on the old code.
Playwright, built app, light + dark, zero page errors, Deadlift on the Hinge day: Build, 225 hit once
→ "You earned more weight — today: 230 lb" (placeholder 230); Maintain, once → "Maintaining: hold 225
lb…" (placeholder 225); Maintain, twice → 230.

## Ramp-up sets move to the first main lift, with real numbers (Nov 11, 2026)

Owner, with a screenshot of the player's Station 1: "Can't have warmup reps here cause we haven't
started yet." The opening warm-up ended with "Light ramp-up sets — about half your working weight for
10, then three-quarters for 5" before any lift or weight was on screen.

- **Gone from the opening warm-up** (`warmupBase`, 035) on the Push/Upper, Lower and Full Body days
  (and the fallback's "Ramp to working weight"); the Train card's warm-up fold follows. The speed day
  keeps its "Ramp-up jumps and throws" (easy reps of the day's own drills, no load to know).
- **On the first main lift instead** (player, 070): `ffRampIndex` picks today's first 🏋️ loaded lift
  (Bench on Push; the Deadlift on Hinge, not the Seated Leg Curl that opens it; never a pull-up, so
  the Pull day has none, as before). Under the prescription: "🔥 Ramp up first (not logged): 10 ×
  115 lb, then 5 × 175 lb. Then your working sets." `ffRampSets` = ~50% × 10 and ~75% × 5 of today's
  weight (the prescription, else last time's top), nearest 5 lb, never under the empty bar ("the empty
  bar"); no numbers yet → "a light set of 10, then a heavier set of 5, building toward your first
  working weight." Hidden once set 1 is ticked. A known weight too light to ramp (the empty bar, 10 lb
  dumbbells) gets no ramp line at all (Codex, #124).

**Verified:** `npm test` 263/263 (new `tests/ramp-up-sets.test.mjs`: no ramp in any lift-day warm-up,
the speed day keeps its jumps; the 50/75% maths incl. the empty-bar floor and too-light cases; the
first-main-lift pick; no line for a known too-light weight, which failed before the fix). Playwright, built app, light + dark, zero page errors: Push from Home's
catch-up → Station 1 has no ramp → Bench (lift 1) shows the ramp → gone after set 1 → lift 2 none;
Hinge with a 225 lb Deadlift last time → the ramp is on the Deadlift (lift 2) with "10 × 115 lb, then
5 × 175 lb". Audits: train 18/18, scroll 16/16, type 1 known, contrast clean. Release gate and
claims-lint clean. Harness gotcha #13 added (a fixed clock doesn't fix the seeded plan start).

## Rest today: skip today's workout, get the rest-day routine (Nov 10, 2026)

Owner: "I need to skip my workout today because I'm not feeling good, my back hurts… make this an
off day, a rest day, and give me… our normal off day routine."

- **One tap: "Not feeling it? Make today a rest day."** Under Train's hero (whichever day is
  featured, so a missed earlier workout leading Train doesn't hide it), under Home's today card and
  on Home's catch-up card, and in the readiness check-in result (which already said "Sharp pain…
  skip training" but had no way to). Only for today's own, unfinished, not-yet-rested workout.
- **What it does:** `skipSession` (the existing `ff_skipped_sessions` signed-timestamp key: roams,
  and next-workout pick and coach already treat it as resolved), and **today** then plays as a rest
  day (`ffRestInstead`, 040: today's slot, or an earlier day this week rested with recovery/cardio
  logged — it keeps its "✓ Rest" chip, a "Rested." card and stays put; Codex, #123): the normal 10-minute routine, optional Zone 2, its
  own recovery/cardio check-offs (keyed by the workout's name in `ff_rest`), hero "Start recovery",
  header "Rest day", chip "Rest", Home "Today · Rest day". Copy: keep every move pain-free, skip any
  that pinch; an easy walk only if you feel up to it; "Pain that runs down a leg, or comes with
  numbness or weakness, is worth getting checked." No diagnosis, no back-specific routine (the owner
  asked for the normal one).
- **While today is rested, nothing pushes training:** Home and today's reminder drop the catch-up for
  an earlier missed workout (back tomorrow, like the played-18 rule), and no speed-test or mobility
  nudge. A paused session's resume bar steps aside (kept for Undo); a skipped, unfinished session's
  sets no longer feed next week's loads (`lastSessionFor`). No "Log by typing" row on the rest day.
- **Undo, I'll train today:** un-skips (negative stamp: syncs, never a delete) and clears check-offs
  made under the workout's name, so a second rest the same week starts clean.
- **Kept:** a rested day with a check-off stays put (`ffDayLogged`); a skip counts as "this week is
  busy", so a mid-week days-off change queues for next week instead of sliding the skipped workout
  onto another day; dragging a skipped workout (042) un-skips it (you'll do it there). The week count
  keeps a skipped workout in its total ("2 of 4"), matching the Scorecard and coach.
- **Dropped after the pre-PR review:** a "Do Hinge on Friday instead" button. It ran `ffMoveDay`,
  which saves the weekday layout for good ("Your week keeps this order"), so a sick-day tap would
  have reordered every later week. Hold-and-drag stays the deliberate way.
- Earlier skips with nothing logged (the catch-up's "Skip it") keep their workout card and name, so
  they can be logged late. Home's "Mark it done" now re-renders Train too (a stale Train tap used to undo it).
- New module `043-rest-today.js`; `z2Html` split out of the rest card for reuse; `.ready-link`
  min-height 44px (the check-in's links were 31px).

**Pre-PR independent review** (fresh agent, spec + diff): 9 findings, all reproduced. Fixed: the
catch-up still led Home and the push after resting (high); the entry point hidden behind a missed
workout; the move rewriting the week; the move bypassing the check-off guard; the pause bar and
partial sets after resting mid-session; nudges returning after a move; past skips dressed as today's
rest; the manual-log row, link height and orphan check-off after Undo. Name-keyed state under a
4↔5-day switch on the same day is accepted. A re-review of the fixes confirmed all 9; it and Codex
then found a rested-and-ticked day losing its stay-put lock the next morning (fixed: it stays a rest
day). Accepted: deliberately dragging today's rested workout to a later day makes today an ordinary
rest day, so a due speed test can lead again. Not ours: another device's local schedule isn't
rebuilt by a cloud merge until it's opened.

**Harness fix:** the four audits filtered `net::ERR`/`Failed to load resource` as sandbox network
noise but not a CORS-blocked fetch, so the product-health beacon (allowed origin: yardsmith.golf)
failed every audit from a local server (main too: 0/18, 0/16, contrast FAIL). The filter now also
drops `blocked by CORS policy`; with it, main and this branch are back to the documented baseline.

**Verified:** `npm test` 259/259 (rest-today surfaces incl. the catch-up rule; schedule cases for
skip/undo, today-only, drag un-skips, undo clears check-offs, stay-put and the busy week; a
progression case: an abandoned skipped session's 200 lb set no longer beats the last real 300).
Playwright, built app, clock fixed to a Wednesday Hinge day, light + dark, zero page errors in every
scenario: rest from Train (card, routine, Zone 2, copy, no move button, hero/header/chip, no finish
bar/readiness/manual row) → Home leads "Today · Rest day" → done on Home shows done on Train → a past
catch-up skip keeps its workout card → Undo restores the workout and clears the check-off; the next
morning a rested-and-ticked day reads "✓ Rest" with a "Rested." card; rest from Home; with missed workouts (catch-up card and Train both offer it; afterwards Home leads with rest,
no catch-up); mid-session (pause bar hides, returns on Undo); from the check-in (closes, no player).
Audits: train 18/18, scroll 16/16, type 1 known (Fuel "Ate it"), contrast clean. Release gate and
claims-lint clean.

## Closed-app reminders actually reach the server (Nov 9, 2026)

Owner turned reminders on and asked "can you check it's working?" — it wasn't. The phone (installed
PWA, signed in, permission granted, push subscription created) sent its save and got **403
`permission denied for table push_subs`**; the app silently fell back to open-tab reminders, so
nothing arrived with the app closed. `push_subs` had **zero rows**: no one's closed-app reminders had
ever registered since the July hardening (#73).

- **Root cause:** #73 moved `push_subs` to column grants and left `endpoint` out of UPDATE. The client
  saves with an upsert (`ON CONFLICT (endpoint) DO UPDATE SET endpoint = EXCLUDED.endpoint, …`) and
  Postgres checks UPDATE on every SET column, even when no conflict happens, so every save failed.
  Reproduced with the exact statement as `authenticated` (rolled back) before touching anything.
- **Fix (DB):** migration `20261109234611_push_subs_upsert_endpoint_grant` — `grant update (endpoint)`.
  RLS still scopes updates to the caller's own rows (they could already delete + insert them);
  `last_sent` / `created_at` stay server-only. Same rolled-back statement now succeeds.
- **Self-heal (080 `ffPushResync`):** reminders on (`ff_notif`) but never registered (`ff_push_on`
  unset) → one forced save per app load once push is possible (signed in, permission granted), so
  existing installs reconnect on their next open with no re-toggle. Not spent while signed out.
- **One a day across the handover (`ffPushWeek`):** if this browser already showed today's nudge on
  the open-tab path, the uploaded schedule marks today `skip`, so the server can't send a second.
- **Honest card:** reminders on but not connected now reads "Closed-app delivery isn't connected yet.
  Yardsmith retries each time you open it; until then reminders fire while it's open." (It used to
  say "Turn them on…" while they were on.)

**Verified:** `tests/push-subscribe-heal.test.mjs` (7) pins the UPDATE grant to the exact columns the
client upserts (replaying every migration and schema.sql), the heal rules and the today-skip; 5 of 7
fail on the old code. `npm test` 246/246. Playwright (built app, light + dark): reminders on + no
`ff_push_on` → sign-in makes exactly one forced save carrying the endpoint and a 7-day week,
`ff_push_on` flips, card says "Delivered even when the app is closed"; a failed save leaves the
honest copy, tries once per load, and the next load connects; zero page errors. Release gate and
claims-lint clean.

## Played today? Keep your turn — the evening round reminder (Nov 9, 2026)

Owner: rounds happen during the day, so "I'd like to do something that evening" — yes to an evening
stretch reminder on round days.

- **On a rest day with a round logged today and the stretch routine not yet marked done**
  (`ffReminderMessage`, 080), today's one reminder becomes **"Played today? Keep your turn 🌀 — 10
  minutes of turn stretches this evening. The round twisted you one way all day."** at **7 PM**
  (`kind:"turn"`, deep-links to Train). Marking recovery done turns it off; the normal rest-day path
  then resumes (a due speed test or the Sunday week review can still go out), but the missed-workout
  catch-up stays off that day, as on Home (#120). Lift days and future days are unchanged.
- **A day can carry its own send hour** (`h`, bounded **7–19** by every sender: `ffMsgHour` in the
  app, `sendHour` in push-daily). 19 because the hourly run fires at :05 and GitHub often starts it
  later — 7:05–7:59 PM keeps the "never before 7 AM or after 8 PM" promise; an 8 PM slot would not.
- **Still one notification a day, on every path:**
  - *Server* (push-daily): skips once `last_sent` is today, matches on the day's own hour, and a
    quiet (`skip`) day **no longer writes `last_sent`** — a round logged after the usual hour can still
    get its evening nudge. A failed `last_sent` write is now logged (it is what prevents a second
    send later that day).
  - *Native app* (`ffNotifReschedule`): a device-local `ff_notif_today` records when today's
    notification was due; once that time has passed, today is spent and a later reschedule can't add
    a second one. Written only on change (every `lsSet` fires `ff-data-changed` → reschedule).
  - *Open tab* (`ffWebNotifCheck`): judged on the day's own hour, never at or after 8 PM, one a day.
- The settings line **Next reminder** uses the day's own hour, and its emoji strip is now
  Unicode-aware (`/u`) — 🌀 is an astral character and left a broken half without it.

**Process trial — independent review before the PR** (owner agreed after the planner/builder/
reviewer cards): a fresh-context reviewer agent got the spec and the diff, not my reasoning, before
the PR existed. It found **2 major** (native path could send two in a day after a late-logged
round; the open-tab fallback could fire after 8 PM), **4 minor** (Next-reminder time + broken
emoji; a played Sunday losing the week review; "8 PM" landing at 8:05–8:59; an unchecked
`last_sent` write) and test gaps — every one confirmed and fixed above before pushing for review.
My own tests had passed on all of them.

**Then Codex on the PR found 4 more (all P2), and the pattern matters:** three were edge cases in
the *fix* for the reviewer's top finding — the new `ff_notif_today` record was written even when
`schedule()` failed, was left behind when reminders were switched off before tonight's slot
(re-enabling later would wrongly treat the day as spent), and travelled in backups — and one asked
for the `last_sent` write to be retried, not just logged. All four reproduced as failing unit cases
first, then fixed: the record is kept only once the schedule succeeds, a pending one is cleared on
disable / no-plan / failed schedule (a delivered one stays), `ff_notif_today` and `ff_notif_lastday`
join `ffBackupSkip`, and push-daily retries the marker up to 3 times. **Trial result:** the
pre-PR reviewer caught the two biggest problems (double notification, after-8-PM ping) and the
Codex round still earned its keep on the code those fixes added. Both layers are worth keeping for
changes of this size; a second pre-PR pass on the fix commit would likely have caught Codex's three.

**Verified:** `npm test` 239/239 with `tests/round-evening-reminder.test.mjs` (the message: played vs
stretched vs missed vs daily mode vs speed-test fall-through, lift days and future days unchanged;
client/server hour rule 7–19 run from the real TypeScript via esbuild; the server's one-a-day and
quiet-day source guards; native scheduling at the day's hour + no second notification after today's
was due + a cancelled pending one clears the record + yesterday's record ignored; open tab: not yet /
7 PM shown / one a day / nothing at 8 PM or later for any kind; the settings line at 7:00 PM with no
broken emoji; the Codex round: no record after a failed schedule, a pending record cleared on
disable and a delivered one kept, bookkeeping keys skipped by backups, the marker retry); the new
cases fail on the old source. Playwright, light + dark
(scratchpad/test-round-reminder.mjs, native path with a LocalNotifications stub, clock at 2 PM):
12/12 — no nudge before the round; logging a round on Train schedules exactly one, tonight at 19:00,
still one notification today; marking recovery done cancels it; zero page errors. Earlier suites
green (round day, cardio, days off, drag). Audits: audit-train 18/18, audit-scroll 16/16,
audit-contrast clean (1,591 nodes), audit-type 1 (Fuel "Ate it", same as main). Release gate and
claims-lint green. Not testable here: real web push delivery (needs a signed-in, subscribed device).

## Played 18? Train counts it (Nov 9, 2026)

Owner: "I played this morning, and now I'm looking at it, and it's like, oh, rest day, do these things.
But I don't want to do zone 2 cardio because I played a round."

- **Today's rest card on Train** gets **⛳ Played a round today? Log it — it counts as your cardio**,
  which opens the existing 20-second round log (`data-roundlog`, 082 — score, longest drive, how the
  body held up; feeds Stats and the driver-carry trend).
- **Once today has a round** (`ffTodayRound`, 035 — `roundToday()` when the card is today's slot):
  the card's tag reads **Played**, the copy says the round was today's work and to skip the cardio,
  the **Zone 2 box is replaced** by "⛳ Round logged — cardio covered · tap to edit", today's strip chip
  ticks ✓, and the Train hero reads **Round logged ⛳** (tap to edit). The 10-minute stretch routine
  stays (optional), since it helps the turn after 18. Other rest days keep their cardio.
- **Saving a round re-renders Train** (082 `rdSave` now calls `renderPhase()`; before, only Home
  refreshed).
- **Home doesn't push a missed workout on a rest day you played** (075): the catch-up card yields to
  the existing "Round logged ⛳" card for today; it comes back tomorrow and is always on Train's strip.

**Design decisions**
- **Reuse the round log, not a new "I played" toggle**: one tap more, but the round lands in Stats and
  the gym-to-course story instead of a dead flag; rounds are date-keyed, so nothing moves with the week
  layout.
- **Rest days only.** On a lift day a morning round doesn't cancel the lift; the existing Skip /
  catch-up flow covers that.

**Verified** (Playwright on the built output, seeded week-2 user with today a day off and a recent turn
check, light + dark, scratchpad/test-roundday.mjs): 34/34 — before, Home leads with the missed
workout and today's rest card shows Zone 2 plus the "Played a round today?" button; it opens the round
log; logging Strong all 18 / 84 stores the round and Train re-renders on its own: no Zone 2 box, the
round note and edit button, the "Played" tag, the stretch routine still there, the hero "Round logged
⛳", today's chip ✓; edit reopens today's round (84); the full week keeps Zone 2 on the other rest days
(2 of 3); Home shows "Round logged ⛳"; no leaked junk; zero page errors. `npm test` 229/229 with a new
`round-day.test.mjs` (today's slot only, no round / no plan → nothing; the card, chip, hero, re-render
and Home guards). Earlier suites green (cardio, cardio-busy, cool-down, days off, drag, turn guard).
Audits: audit-train 18/18, audit-scroll 16/16, audit-contrast clean (1,591 nodes), audit-type 1 (Fuel
"Ate it", same as main). Release gate and claims-lint green.

## A buzz when you pick up a day (Nov 9, 2026)

Owner: "Can you make it vibrate on the hard press?"

- **The week drag now has feel:** a medium buzz when the held day lifts, a light tick for each day you
  slide over, and a light tap when it lands (042 → `ffTick(18 / 8 / 10)`).
- **`ffTick` (007) uses the native Haptics plugin inside the app shell** (`window.Capacitor.Plugins.
  Haptics`, already a dependency; same access pattern as LocalNotifications): numbers map to
  light (< 12) / medium (12–19) / heavy (≥ 20) Taptic impacts, celebration patterns to the "success"
  buzz. In a browser it stays `navigator.vibrate`. Every existing tick (set check-offs, PRs, round
  logged) gets real iPhone haptics the same way once the native app ships.
- **Reduce Motion no longer mutes native taps.** It's an animation setting; natively the OS haptics
  switch (iOS: Settings › Sounds & Haptics › System Haptics) decides. In a browser — which exposes no
  haptics setting — reduced motion still turns vibration off.

**Honest limit — iPhone in Safari / home-screen web app: no buzz.** Safari has never supported the
Vibration API, and the only workaround (a hidden `<input type="checkbox" switch>`) was restricted to a
direct tap (WebKit bug 285120, fixed Jan 2025) and, per the `ios-haptics` package's README, closed in
iOS 26.5. The hold fires on a timer, not a tap, so it couldn't use that trick anyway. Android Chrome
vibrates today; iPhone gets it with the native app (TestFlight / App Store). The native path is
unit- and browser-tested against a stubbed plugin, not yet on a device — check it on the first
TestFlight build.

**Verified** (Playwright on the built output, light + dark, scratchpad/test-haptics.mjs): 36/36 —
browser path (navigator.vibrate recorded) and native-shell path (stubbed Capacitor Haptics recorded),
mouse and real touch drags: exactly one lift buzz (vibrate 18 / impact MEDIUM), a light tick per day
passed over (2 × vibrate 8 / impact LIGHT), a landing tap (vibrate 10 / impact LIGHT) with the day
moved; native taps still fire with Reduce Motion on; a browser with Reduce Motion on stays silent and
the move still works; zero page errors. `npm test` 227/227 with a new `haptics.test.mjs` (strength
mapping, success buzz, rejected plugin promise swallowed, browser vibrate, reduced-motion rules, the
drag's three ticks). Drag suites, step 1, cool-down and days off re-ran green; audit-train 18/18;
release gate and claims-lint green.

## Hold a day and drag it: your own week order (Nov 8, 2026)

Owner, after Days off shipped: "be able to long press on the days of the week and drag them around, I
think." The Days-off section below chose picking days over free dragging; the owner wants the direct
control, so this adds it with the same guard rails expressed as rules and warnings.

- **Train › Today week strip:** hold a day (~0.4 s; the chip lifts, with a haptic tick where
  supported), drag it onto another day (dashed outline), let go: the two swap. A hint under the strip
  says so; once you've moved something it reads "Your own order. **Reset to automatic**".
- **Your order sticks.** Saved as `ff_gameday.layout`: 7 day keys indexed by weekday (0 = Sunday), so
  it repeats every week whatever day the plan started on. `stripDays` (040) uses it ahead of the
  automatic arrangement; it is ignored when it no longer matches the plan's days (4 ↔ 5 days or
  in-season) and comes back if you switch back.
- **Guard rails:** a day you've already logged this week (a started workout, a checked rest day or
  cardio) stays put, so history never jumps to another date; a workout can't be dropped on a day off
  ("Wednesday is a day off. Turn it back on in Plan settings first."); rest ↔ rest does nothing; a
  queued schedule change blocks moves until it lands. **Legs on back-to-back days** and **heavy legs
  the day before a round** are allowed but flagged in the toast ("Heads up: …") — the owner's call.
- **Changing days off or round days resets a custom order** (the week is re-arranged around them,
  with a toast), through the same `ffSaveSchedule`, which now snapshots `prevLayout` with the other
  lists, so a mid-week change still waits for next week. **Reset to automatic** follows the same rule.
- **Review fixes** (Codex, #118), each reproduced in the browser first (scratchpad/test-drag-review.mjs,
  14/14 after):
  - *Train's featured workout follows the arranged week.* `nextWorkout()` (070) walked the plan's
    authored order, so after swapping the week's first and last workouts the strip led with Pull while
    Train's hero and Start button still offered Quads. It now walks the strip (calendar) order once a
    plan has started — which also keeps it in step with a week arranged around rounds or days off.
  - *"Your own order" only when it applies.* After a 4 ↔ 5-day switch the saved order is kept for the
    way back but isn't shaping the week; the hint still claimed it and its Reset would have deleted it.
    `ffLayoutActive()` (040) now drives the hint and the reset toasts.
  - Found while re-testing: the release of a drag swallows the next click for 0.35 s (was 0.5 s), long
    enough for the release's own click and short enough not to eat a deliberate tap.
- **Gesture** (042): touch uses touch events — moving more than 10 px before the hold fires cancels it
  (it's a scroll or a tap), and once the hold fires `touchmove` is cancelled so the page doesn't scroll
  under the finger; mouse/pen use pointer events. A long press never opens a context menu, and the
  release never also selects a day. Chips get `user-select:none` and no iOS callout.

**Design decisions**
- **Swap, not insert.** Dropping a day onto another swaps the two, so every other day stays where it
  was — predictable on a 7-chip strip, and it can never shuffle a logged day.
- **Warn, don't block, on leg spacing.** Days off are a hard rule the golfer set; leg spacing is
  advice, so it's a heads-up he can ignore.

**Verified** (Playwright on the built output, seeded week-2 user, light + dark,
scratchpad/test-drag.mjs): 42/42 — the hint shows; a mouse hold lifts the chip and highlights the
target; dropping Quads on a rest day moves it ("Moved Quads to Saturday. Your week keeps this order."),
saves a 7-slot `ff_gameday.layout`, and the hint offers Reset; a quick tap still just selects a day; the
order survives a reload; two workouts swap ("Swapped …"); Reset brings back the automatic week; a REAL
touch drag (CDP touch events with vertical wobble) moves the day without scrolling the page, and a quick
swipe moves nothing; a logged workout stays put; a workout can't land on a day off; no leaked junk; zero
page errors. `npm test` 224/224 with three new cases (layout by weekday across week starts, stale and
junk layouts ignored, queued layouts; moves: save by weekday, swaps, rest ↔ rest no-op, round and
back-to-back-legs warnings, logged workout and logged cardio locked, day-off refusal, queued change
blocks; next workout in calendar order) and `ffLayoutActive` cases. Earlier suites green (steps 1, 3, 4,
days off, overbooked, cardio, cardio-busy, cool-down, play days).
Audits: audit-train 18/18, audit-scroll 16/16, audit-contrast clean (1,597 nodes), audit-type 1 (Fuel
"Ate it", same as main). Release gate and claims-lint green.

## Easy (Zone 2) cardio on rest days (Nov 8, 2026)

Owner, planning cardio or stretches on his days off: "easy cardio stuff. Can you like work that in so
that we could check it or click it or do something?"

- **Every rest day card** (Train › Today and Full week, so days off too) now ends with a
  **🚶 Easy cardio (Zone 2)** block, *optional · 20–40 min*: "Walk (9 holes counts), an incline
  treadmill or the bike, easy enough to talk in full sentences. Skip running and hard intervals here:
  they cut into power the most." A **Mark cardio done** button checks it off (tap again to undo).
- **Its own check-off**, separate from "Mark recovery done" (the stretch routine): `cardioDone` /
  `toggleCardioDone` (040) store `ff_rest["week|dayKey|cardio"]` with the same signed-timestamp
  convention as rest check-offs. So it syncs through `ff_rest`'s existing `unionDeleted` merge (latest
  tap wins on every device), clears with a plan reset, drops with an old season, and counts as activity
  for the welcome-back screen — with no new key and no `cloud-sync.js` change. `restDone("week|dayKey")`
  is untouched.
- **A cardio check-off freezes the week's layout** (Codex review, #117), like a recovery check-off:
  rest-day marks are keyed by the rest slot, so a days-off or play-day change applied mid-week would
  move the ✓ to another calendar day. `ffSaveSchedule`'s busy test now counts `cardioDone` too.
  Reproduced first (old build: the change applied at once, `arrangeWeek` unset), then fixed — the
  change queues for next week, the row says "Starts next week" and today keeps its ✓
  (scratchpad/test-cardio-busy.mjs, 10/10).

**Design decisions**
- **Easy only.** The concurrent-training note (NUTRITION ref §10) is the rule: interference mainly
  blunts power and running is the worst offender, so the block steers to walking and cycling at a
  talking pace and away from runs and intervals. The talk test is the intensity check — no heart-rate
  zones to set up. No speed or fat-loss claim.
- **A check, not a log.** No minutes or heart-rate entry: he asked for something to tap. The 10-day
  calorie check-in already corrects for the extra burn through the weight trend.
- Home's rest-day card is unchanged (it is one big tap target that marks the rest day); the cardio
  check lives on the Train card with the stretch routine.

**Verified** (Playwright on the built output, seeded week-2 user with today set as a day off, light +
dark, scratchpad/test-cardio.mjs): 24/24 — today's rest card shows the block with its copy; tapping
logs it ("✓ Cardio logged — tap to undo") and stores only `2|rest@2|cardio` (the recovery button stays
unchecked); it survives a reload; a second tap undoes it with a negative stamp; the Full week shows one
block per rest day; no leaked junk; zero page errors. `npm test` 221/221 with a new case (own key,
undo stamps, independent of the rest check, two-device merge via the real `unionDeleted`). Earlier
suites green (cool-down, days off, overbooked days off, step 5). Audits: audit-train 18/18,
audit-scroll 16/16, audit-contrast clean (1,595 nodes), audit-type 1 (Fuel "Ate it", same as main).
Release gate and claims-lint green.

## Days off: pick the days you never train (Nov 8, 2026)

Owner: "I'm taking Sunday off, possibly even Monday … Can we like reorganize the days? That'd be
pretty sick if you could rearrange them based on how you want to."

- **Train › Plan settings › Days off** — seven day buttons (S M T W T F S), right under Training
  days / week. Tap the days you never train; the week strip moves the workouts onto the other days,
  **same order**, with leg days kept apart. Rest days fill the days off.
- **Same engine as play days.** `ffArrangeWeek` (040) already moved the week so rounds land on rest
  days; a day off now blocks a slot exactly like a round, without the no-heavy-legs-the-day-before
  rule (that one is about rounds). Both can be set together.
- **Every workout always keeps a day.** A day off that would leave fewer non-off days than workouts
  is refused with a toast ("You train 5 days a week, so that would leave too few days…"). If the count
  later changes (4 → 5 days a week), the row says one workout now lands on a day off.
- **Days off outrank rounds when the week is overbooked** (Codex review, #116). Sunday + Monday off
  and Tuesday play on 5 days leaves 4 open days, and the arranger used to put the 5th workout on
  Monday. A day off now costs 1000 and a round 100, so the extra workout lands on the round day, and
  the play row says "5 workouts but only 4 open days, so one lands on a round day. Train fewer days a
  week, or try In-season." The play day itself is never refused (it also drives round-day fueling),
  and the day-off cap counts only days off, so a Saturday golfer can still take Sunday and Monday off.
  Reproduced first: a unit case (Monday got Upper (Push)) and the browser (old build: Pull on Monday;
  Monday-off refused with Saturday play), then fixed (scratchpad/test-daysoff-over.mjs, 24/24).
- **Mid-week changes wait for next week**, like play days: if this week already has logged work, the
  layout switches next week and the row says "Starts next week, so this week's workouts stay put."
  One save (`ffSaveSchedule`) snapshots both play days and days off before the change — `lsGet` hands
  back its cached object, so the snapshot has to come first.
- **Storage:** `ff_gameday.off` (weekdays, 0 = Sunday), next to `ff_gameday.days` — the same roaming
  setting object, no new key, no `cloud-sync.js` change. A change queued before this existed (no
  `prevOff`) reads as no days off for the rest of that week.

**Design decisions**
- **Pick days off, not drag workouts around.** Free placement invites two leg days in a row or heavy
  legs the day before a round. Choosing the days and letting the plan keep its order and spacing gives
  the control he asked for without breaking the program.
- Two days off on the 5-day plan means five training days in a row. That's allowed (it's a split, and
  leg days stay apart), and the row doesn't nag about it.

**Verified** (Playwright on the built output, seeded week-2 user, light + dark,
scratchpad/test-daysoff.mjs): 52/52 — on the 4- and 5-day plans, tapping S and M marks them off, the
week strip shows Rest on Sunday and Monday with all 4/5 workouts on the other days, the sub-label
confirms; on 5 days a 3rd day off is refused with the toast; the choice survives a reload as
`ff_gameday.off = [0,1]`; un-tapping Monday puts it back; with work already logged this week the row
says "Starts next week", the strip doesn't move and the change is queued for week 3; no leaked junk;
zero page errors. The play-day toggle still saves and rearranges (test-playday-regress 4/4). `npm test`
220/220 with two new cases (Sun+Mon off across four week-start days and 4/5/2/3-day plans: nothing on a
day off, every workout kept in order, no two leg days in a row, days off + rounds together, junk
ignored; the mid-week rule incl. a pending change saved before days off existed). Earlier suites green
(cool-down, step 5, foldable screens). Audits: audit-train 18/18, audit-scroll 16/16, audit-contrast
clean (1,595 nodes), audit-type 1 (Fuel "Ate it", same as main).

## Rotation through range, and the arm that extends (Nov 8, 2026)

Step 5 of the golf-first plan. Owner: "im down for whatever you think is a great idea and matches with
science. you've heard my struggles: poor rotation, poor arm extension, stiff muscles."

**The check first** (BRAIN thread 10 asked for it): the authored week already had the Cable Wood-chop
(push day, 3 × 10/side, "rotate from the hips"), the Pallof Press (4-day pull day — anti-rotation, it
resists turning) and rotational throws (speed day — ballistic). None of them loads the upper back
slowly to the end of its turn with the hips held still, which is the range a bulk takes away.

- **New lift: Half-Kneeling Cable Rotation, 2 × 8 / side (slow · pause at the end)**, on both
  Pull + Rotate days (4-day Day 4, 5-day Day 5), right after the Face Pull. Gear swaps: bands →
  Half-Kneeling Band Rotation (same dose); bodyweight only → Half-Kneeling Thoracic Rotation,
  2 × 10 / side, hands behind the head. In the swap / add-a-lift catalog under Core.
  Classifies 🌀 (wave-shielded, RIR-graded, not ballistic), and the turn guard's set add already
  matches it (`turnGuardAdds`). Its own how-to (045 `exerciseForm` / `liftWhy`, ahead of the generic
  rotation entry): hips and front knee stay square, the turn comes from the upper back, pause a beat
  at the end, light.
- **Wall biceps & chest stretch, 2 × 30s/side** (palm on a wall behind you at shoulder height, arm
  straight, thumb down, turn away): added to the Pull + Rotate cool-down (now 4 holds, ~7 min), and it
  replaces the bent-arm doorway pec stretch in the rest-day routine, which stays exactly 10 min. The
  push-day cool-down keeps the doorway stretch, so the chest still gets both.
- **Curls coach the straight arm.** Every biceps curl (not leg, hamstring, Nordic or wrist curls)
  gets its own how-to: "Straighten the elbow all the way at the bottom of every rep — the stretched
  bottom half grows the biceps more than the top does, and it helps keep your arm able to extend
  through the ball."
- **Chops coach the end range:** "Turn all the way through and pause a beat at the end, then control
  the return."
- **The no-gear version logs as BW** (Codex review, #115): `isBodyweightEx` only knew jumps and
  plyos, so a bodyweight-only user got a weight box (and load progression) on the hands-behind-the-head
  thoracic rotation. It now counts "Thoracic Rotation" as no-load. Reproduced first: the player showed
  2 weight inputs and no BW cell on the old build; after the fix, a BW cell and no weight box, while the
  cable version keeps its weight box (scratchpad/test-step5-bw.mjs, light + dark, 12/12).

**Design decisions**
- **Strength through range, not more stretching alone.** Resistance training through a full range
  improves range about as well as stretching (Afonso 2021; Alizadeh 2023), and it builds strength at the
  end of the turn, where a stretch can't. The stretch still earns its place for the biceps/front
  shoulder, which no lift in the week lengthens.
- **Why the wall stretch for the chicken wing.** The owner described the biceps "pulling back" as he
  extends. The muscles that resist a straight lead arm through impact are the biceps (it crosses both
  the elbow and shoulder) and the front of the chest/shoulder; a straight-arm, thumb-down stretch with
  the arm behind the body lengthens both at once, which the bent-elbow doorway stretch doesn't.
- **Why the curl cue.** Training elbow flexion in the extended-elbow half grew the distal biceps more
  than the flexed half (Pedrosa 2023, doi 10.3390/sports11020039); long-muscle-length training tends to
  be best for the biceps (Kassiano 2023 review, doi 10.1519/JSC.0000000000004415); full range and
  lengthened partials come out about equal (Wolf 2025, doi 10.7717/peerj.18904; Gschneidner 2025,
  doi 10.1080/02640414.2025.2567805). So "full range, all the way straight" costs no growth.
- **Slow and light, after the heavy lifts.** It's range work, so it sits after the pull-ups, rows and
  press, and the cue says it is not an oblique builder.
- No speed claim anywhere: this is durability for the turn (claims-lint clean).

**Verified** (Playwright on the built output, seeded week-2 user, light + dark,
scratchpad/test-step5.mjs): 46/46 — on both the 4- and 5-day plans the Pull + Rotate card lists the
Half-Kneeling Cable Rotation between Face Pull and DB Curl at 2 × 8 / side; its cool-down carries the
wall biceps & chest stretch with its cue and reads ~7 min; the rest-day routine shows the wall stretch,
no doorway stretch, ~10 min; the how-to sheets show the rotation cues, the curl's straight-arm cue and
the chop's end-range pause; bands-only gear swaps to the band rotation at 2 × 8, bodyweight-only to the
thoracic rotation at 2 × 10, both keeping the how-to; no leaked junk; zero page errors. `npm test`
218/218 with two new cases (the authored rows, classification and gear swaps; the curl / rotation /
chop how-tos and the rest-day swap), the cool-down bound now allowing the 4th pull-day hold, and a
turn-guard case adding a set to the new lift; the new cases fail on the old source. Earlier suites
re-ran green (step 1, turn guard, review fixes, turn check, cool-down). Standing audits: audit-train
18/18, audit-scroll 16/16, audit-contrast clean (1,577 nodes), audit-type 1 (Fuel "Ate it", same as
main). Release gate and claims-lint green.

## The turn check: five golf moves replace the 3-move screen (Nov 8, 2026)

Step 4 of the golf-first plan (owner: "build it.."). He also described the problem it targets: late in
a bulk, "when I try to extend my arms in a golf swing, my biceps feel too big. Like I want to pull the
club in and chicken wing a bit."

- **Five moves, each 0/1/2** (`MOB_TESTS`, 065): seated trunk rotation (unchanged — its key `trunk`
  carries across versions), seated hip rotation (`hiprot`), coil — shoulders vs hips in golf posture
  (`coil`), lead arm across the chest (`leadarm`), and an overhead reach against a wall for the lats
  (`lats`). The 90/90 switch and overhead deep squat are gone. ~4 minutes; copy across Home, the quick
  sheet, Stats, the You plan card and the coach says 5 moves.
- **Entries** come from a pure `mobEntry()` (unit-tested): every v2 key, `v:2`, and the score over
  however many moves were scored, so the Octane pillar stays 0–100.
- **Old screens stay readable.** `mobLimits()` reads whatever keys an entry holds, so a v1 screen keeps
  routing its fixes until it's re-run, and the turn guard compares only shared keys, so the v1 → v2
  switch can only trip on trunk rotation (proven through the real sheet in test-step3-review).
- **New routing** (035): coil → golf-posture turns in every warm-up; lead arm → shoulder CARs in
  upper warm-ups and the cross-body stretch in every cool-down; lats → a dead hang in upper warm-ups
  and the lat stretch in every cool-down; hip rotation → the old hip fixes (90/90 or adductor
  rock-backs, and 90/90 lift-offs).
- **Full-body days get both halves' fixes** (Codex review, #114): the in-season 2/3-day plans'
  "Full Body A (Squat + Press)" named no upper-body word, so a tight lead arm or lats added nothing
  to its warm-up. `warmupList` now counts "Full Body" as upper and lower. Reproduced with a failing
  unit case first (no dead hang on Full Body A), then fixed; Full Body B already matched both.
- The result screen's closing line said moving well "lets the new mass become speed" — off-thesis
  (mobility is durability, not a speed lever); it now says the muscle you add should never cost
  your turn.

**Design decisions**
- **Why these five.** Better golfers differ from average ones in rotation range, not front-to-back
  flexibility (McHugh 2022), and shoulder–hip separation tracks ball speed (Myers 2008) — so trunk,
  hips and coil. Bodybuilding-style training costs shoulder rotation (Barlow 2002; Kolber 2009), and
  the owner's chicken-wing describes the lead arm and lats — so the cross-body reach and the wall reach.
  The overhead squat mostly tested ankles and was the least golf-specific move.
- **New keys, not reused ones.** Reusing `hip` for a different test would let the guard compare a
  90/90 switch against a seated rotation and fire falsely at the version switch.
- **One score per move**, with "one side clearly tighter" as the 🟡 — per-side storage would double the
  data model for little gain at this stage.

**Verified** (Playwright on the built output, seeded week-2 user, light + dark,
scratchpad/test-step4.mjs): 34/34 — the quick sheet reads "5 moves · ~4 minutes"; the sheet shows the
five moves in order with save disabled until all are scored; answers 2/1/1/0/1 save as a v2 entry
`{trunk,hiprot,coil,leadarm,lats}` scoring 50/100 with 4 flagged moves and their fixes; Train's Full
week then carries golf-posture turns, dead hang, shoulder CARs, adductor rock-back (90/90 is already in
the lower warm-up), the cross-body stretch, the lat stretch and 90/90 lift-offs, all marked from the
screen; a seeded v1 screen still routes the deep-squat hold and lift-offs; no leaked junk; zero page
errors. `npm test` 216/216 with two new cases (`mobEntry` + v1/v2 `mobLimits`; v2 routing with no
duplicates), and the cue-coverage test now includes every v2 fix. Earlier suites re-ran green (turn guard
30/30, review fixes 16/16 — its sheet now answers v2 moves —, step 1 28/28, cool-down 46/46). Standing
audits: audit-train 18/18, audit-scroll 16/16, audit-contrast clean (1,577 nodes), audit-type 1 (Fuel
"Ate it", same as main). Release gate green.

## The turn guard: a Build that starts costing your turn slows itself down (Nov 8, 2026)

Owner, worried a golf-first build would still leave him "too rigid … can't turn around and wipe my
own butt vibes" after 5–10 lb of muscle, approved this as step 3 of the golf-first plan ("Do it").

- **Trigger** (`ffTurnGuard`, 065): on Build or a legacy Bulk, the latest mobility screen scoring
  lower on any move than the screen before it. It holds until a later screen doesn't drop. It
  compares whatever tests both screens share, so the planned golf-specific screen (step 4) works
  unchanged.
- **Calories** (`ffGoal`, 025): one goal object for every reader — `calc()`, power-to-weight and
  the 10-day check-in (070). Guarded, the surplus AND the target gain rate are halved (+10% → +5%;
  0.25–0.5%/wk → 0.125–0.25%/wk), so the check-in judges the slower pace instead of adding the
  calories back. `GOALS` itself is never mutated; a deficit is never "halved".
- **Training** (`adjSets` + `turnGuardTrims` / `turnGuardAdds`, 035): chest, shoulder and arm 💪
  isolation lose a set (floor 2) and rotation-through-range 🌀 lifts (wood-chops, cable rotations)
  gain one. Classified with the existing history grouping (`exGroupFor`), not a new name regex.
  Heavy 🏋️ lifts, ⚡ power, legs, face pulls / rear delts, Pallof (anti-rotation) and the speed
  day's ballistic throws and chops are untouched.
- **Where it shows:** Home's coach row reads "Protecting your turn" (its ask opens the coach on what
  changed); Train shows a `deload-banner turn-guard` line; Fuel reads "Build · +5% surplus" with
  the guard note; the plan fold's rate bullet says so. The coach knowledge (`knowledge.ts`)
  describes the guard.

**Design decisions**
- **Step 2 (goal dials) dropped.** Yardsmith's Build week already puts the volume where golf wants
  it (§9a: chest 10, side delts 6 vs quads 10–13, glutes 10–15.5, hamstrings 9.5–13 sets/week; the
  owner's physique plan ran chest 14, side delts 10, glutes 2). Reshuffling more sets would be a
  guess, not evidence. The guard is the response that's earned: it acts only when this user's own
  screen shows a loss.
- **Why those muscles.** Bodybuilders showed ~11° less shoulder internal rotation than
  non-lifters (Barlow 2002, PMID 12173950) and pec/delt-biased recreational lifters lost shoulder
  range (Kolber 2009); lifting in general improves range (Alizadeh 2023). So the guard trims the
  isolation that builds that mass, not legs or the heavy lifts that make speed.
- **Codex review fixes (#113).** (1) Saving a screen re-renders Train and Home but never re-ran
  `calc()`, so Fuel and `ff_targets` kept the old surplus until a reload — `closeMobility()` now
  runs `calc()`, and an `ff-external-write` listener (deferred past 040's cache bust) re-runs it when
  a cloud merge flips the guard (`ffGuardSig`). (2) In an in-season mode every lift is capped at 2
  sets, so the guard's set changes were moot while the banner promised them; `ffTurnGuardTrains()`
  now skips them there and the banner, plan bullet, card and coach mention only the halved surplus.
  All three behaviours reproduced on the pre-fix build first (scratchpad/test-step3-review.mjs:
  3080 → 3080 kcal after a screen, 3080 → 3080 after a merge, banner promising sets), then 16/16
  fixed in light + dark.
- **No "clear it now" button.** The re-screen action appears only 2+ weeks after the drop, so the
  guard can't be cleared by re-testing the same afternoon.

**Verified** (Playwright on the built output, seeded week-2 user with two screens, light + dark,
scratchpad/test-step3.mjs): 30/30. Guarded: Home's coach row says "Protecting your turn"; Train
shows the banner naming hips; Lateral Raise 3 × 15 → 2 × 15 (the new-lifter on-ramp already took one
set) and Cable Wood-chop 3 → 4 × 10/side; Face Pull and Bench unchanged; Fuel reads "Build · +5%
surplus" with the guard note and targets 2,940 kcal vs 3,080 unguarded. No drop: no row, no banner,
+10%. Lean Out with a drop: never guarded. No leaked junk, zero page errors. `npm test` 214/214 with
three new cases (the trigger, 17 exercise outcomes including the floor of 2, and `ffGoal` halving
both numbers without mutating `GOALS`). Earlier suites re-ran: step 1 28/28, cool-down 46/46.
Standing audits: audit-train 18/18, audit-scroll 16/16, audit-contrast clean (1,577 nodes),
audit-type 1 (Fuel "Ate it", same as main). Release gate green.

## Build, not Bulk — and a how-to under every stretch (Nov 8, 2026)

Owner, the day after the keep-your-turn cool-down shipped: "How do I do those keep your turn
stretches lol" — the lists named moves without saying how to do them. Then, after a golfer friend
told him to train for golf rather than bodybuilding: "We just need to have build, not bulk. I'm not
sure that golfers are trying to bulk. They're trying to build."

- **A how-to under every mobility move** (`moveCue` / `cueHtml` in 035): one line under each move in
  the Train warm-up, cool-down and rest-day lists, the guided player's warm-up station and recap
  (`plCueHtml`, 070), the speed-test warm-up (060) and the Game Day warm-up (080). 31 moves. Exact
  names on purpose — `exerciseForm`'s first-match regex chain would mis-cue them ("Open-book
  rotation" reads as a rotation lift). Power primers are lifts, so they keep the lift how-to sheet.
- **Build replaces Lean Bulk** (label only — the stored key stays `leanbulk`). Fuel picker, setup,
  plan copy and the coach's knowledge say Build. `lbGoalTag` maps an old "Lean Bulk" leaderboard row
  to Build.
- **Bulk (+20%) is retired.** Setup no longer offers it; the Fuel picker's Bulk button is `hidden`
  unless the user is already on it (`ffSyncSegs` and the profile `restore()` both un-hide it for
  them). A legacy Bulk user keeps their setting; after tapping Build, Bulk stays visible for that
  visit so an accidental tap can be undone, and is gone on the next load. The key `bulk` and its
  GOALS entry stay — never rename or delete a stored value someone may hold.
- **Shared links can't enrol anyone in Bulk** (Codex review on #112): `applyShareParams` maps `?g=bulk`
  to Build for a new visitor. Reproduced first on the pre-fix build (a fresh visitor landed on Bulk with
  the button showing), then fixed — scratchpad/test-sharelink.mjs 4/4.
- The goal help is "Which goal should I pick?" and explains why there's no Bulk.

**Design decisions**
- **Why retire rather than reword.** The app already said a +20% surplus mostly adds fat with no
  extra speed (Helms 2023). Offering it anyway contradicted the thesis; the owner's own physique
  bulk cost him mobility. Golf-first goals are now Build / In-Season / Lean Out.
- **Inline cue, not a sheet.** Mobility rows are a checklist people tap through mid-session; one
  muted line under the name reads in the gym without opening anything.

**Verified** (Playwright on the built output, seeded week-2 user, light + dark,
scratchpad/test-step1.mjs): 28/28 — Full week shows 51 checklist rows, every one with a cue except the
4 power primers; the player's warm-up (4/4) and recap cool-down (3/3) carry cues; Fuel's summary and
view say Build with no "Lean Bulk"; visible goals are Build | In-Season | Lean Out; the help reads
"Which goal should I pick?"; a seeded legacy Bulk user sees Bulk visible and active, can switch to
Build (saved as `leanbulk`) and still sees Bulk that visit; no leaked junk; zero page errors. That
legacy test caught a real bug first: `restore()` set Bulk active but left it hidden. `npm test`
211/211, including a new coverage test that fails if any move in any of the five lists lacks a cue. The Nov 7 cool-down suite re-ran 46/46; its recap scroll check now scrolls the last hold to the bottom first (the taller, cued recap made the old check measure Playwright's own auto-scroll), and the tap keeps 193→193.
Standing audits (filtered for the localhost telemetry CORS noise): audit-train 18/18, audit-scroll
16/16, audit-contrast clean at 1,577 text nodes, audit-type 1 violation (Fuel "Ate it", same as
main). Release gate green.

## Keep your turn: a rotation cool-down and a real rest-day routine (Nov 7, 2026)

Owner, on his own winter bulk (on a traditional plan, not Yardsmith): "I’m finding that
flexibility is becoming a problem … We need to make sure we account for flexibility and not
just explosiveness", then "It’s the traditional golf coiling and twisting that becomes a
problem", then "Can we fix yardsmijt or update it?"

Yardsmith already had the warm-up side of this (the 3-move screen, routed warm-up moves, 🌀
rotation lifts and rotational throws). The gap was dose: static holds never happened anywhere,
and the rest-day card promised "TODAY’S ACTION · 10 MIN" with nothing behind it but "Walk a
casual 9, stretch, foam roll." Range gains need ~5+ min per muscle per week over 5+ days
(Thomas 2018); five minutes of moving warm-up drills can't reach that.

- **Cool-down after every session** (`cooldownList` / `cooldownHtml` in 035): three static
  holds, rotation first — 90/90 hold (one set over the front shin, one toward the back knee),
  open-book hold, cross-body shoulder stretch (lead arm at the top), plus a pec stretch on push
  days, a turning lat stretch on pull days, a half-kneeling hip-flexor stretch on lower days.
  ~4–6 min. Shown in the guided player's recap above Finish (`plCooldownHtml`, taps toggle in
  place so the recap's count-ups and PR moment don't replay) and as a collapsed green
  `details.prelift.cool` fold on every lift and speed day card, Today and Full week.
- **The rest-day routine is real now** (`recoveryList`): six moves, ~10 min, open on Today's
  rest card, folded in Full week. The copy says "Ten minutes to keep your turn, then walk a
  casual 9 if you can."
- **Screen flags reach both** (`cdAddFixes`): trunk → thread-the-needle, hip → 90/90 lift-offs,
  squat → deep-squat hold (lower days). `MOB_FIX` copy now says warm-ups, cool-downs and rest
  days.
- **Session estimates include the cool-down** (`sessionMinutes`), so "~N MIN" stays honest.
- **Copy fixes:** the speed-day explainer said flexibility "doesn’t predict it at all"; it now
  says *general* flexibility doesn't, and that rotation is the range a full turn needs (McHugh
  2022 found transverse-plane hip flexibility tracked ball speed in 25 golfers — cross-sectional,
  and it doesn't make mobility a speed lever). The Train romcue no longer claims full-range
  lifting alone "keeps your turn"; the Fuel plan fold's mobility bullet points at the new
  routines. The AI coach (`knowledge.ts`) knows about the cool-down and rest-day routine.

**Design decisions**
- **Holds after, never before.** Static holds of 60 s+ per muscle cut performance ~4.6% right
  after (Behm 2016), so the warm-up stays dynamic and the holds sit in the cool-down and on rest
  days. Two 30-second sets per side keep each hold under that threshold anyway.
- **Folded on cards, open only where it's the day's job.** Calm doctrine: the cool-down is a
  collapsed fold like the warm-up (the audit invariant still holds: no warm-up or cool-down fold
  opens by default). The Today rest card shows the routine open, because it is that day's whole
  action.
- **Checklist only, nothing stored.** Same `data-wu` toggle as the warm-up; no new `ff_*` key,
  no Octane input, nothing to sync. If cool-down adherence ever needs to count, that's a
  data-model change (KEYS + MERGE) — not done here.
- **Still durability, not speed.** No copy says stretching adds mph; every line frames it as
  keeping your turn while you add muscle.

**Verified** (Playwright on the built output, seeded week-2 user, light + dark,
scratchpad/test-cooldown.mjs): 44/44 — Today shows a collapsed cool-down fold with 3 holds and
a minutes estimate; tapping checks a hold off; Full week renders a cool-down/routine fold on all
7 days (2 rest) with zero folds open; the rest routine lists 6 moves at ~10 min; the speed
explainer says "general flexibility" and the old absolute line is gone; the player recap shows 3
holds, toggles on/off in place with scroll kept (270→270 on a 560px-tall viewport) and Finish
still next; a flagged screen (trunk 1, hip 0, squat 1) routes thread-the-needle, 90/90 lift-offs
and the deep-squat hold with no duplicate move in any list; no leaked `undefined`/`NaN`; zero
page errors. Standing audits, run against this branch and an untouched `origin/main` worktree:
audit-train 18/18, audit-scroll 16/16, audit-contrast clean (1,549 text nodes, up from 1,541 on
main), audit-type 1 violation (Fuel "Ate it" — the same on main). `npm test` 210/210, with two new
unit cases in tests/training-engine.test.mjs (every split's cool-down has a 90/90 hold at 4–6 min, the rest
routine is exactly 10 min, no warm-up carries a 30 s+ hold; screen flags route without duplicates or leaking
between calls). The helpers are plain functions (`cdHold`, not shared `var` arrays) so the test harness can
extract them by name; `warmupHtml` keeps its inline rows for the same reason. Two environment notes for the
next session: the audits look for `/opt/pw-browsers/chromium-*/chrome-linux/chrome`, which no
longer exists (pass `PW_CHROME=/opt/pw-browsers/chromium`), and on a 127.0.0.1 server every
audit and smoke.mjs fails on a CORS console error from the `product-health` telemetry call (also
on main) — filter it to see the real result. Release gate green.

## In-season plans, a week arranged around rounds, and a setup health check (Oct 2, 2026)

User: "build these, make the 2-3 day in season plan optionable obviously" — the three items
the program update left open.

- **In-season is a 4-way choice** (Train › Plan settings; `inseason` in the profile, where
  old `true` reads as "Fewer sets"):
  - **Off** — the regular 4/5-day week.
  - **Fewer sets** — the same week, every lift at 2 hard sets (power 3), same weights.
  - **2 days** — `PHASES.days2`, two full-body maintenance days:
    - A: leg press, bench, RDL, row, lateral raise, Pallof.
    - B: deadlift, weighted pull-up, overhead press, split squat, single-arm row,
      wood-chop.
    - Main lifts 3 heavy sets, accessories 2, ~14 hard sets a session.
    - A opens with a jump and B with a rotational throw.
  - **3 days** — `days3`, the same two days plus Speed & Power.
  - Shared rules:
    - Same lift names, so loads and history carry over.
    - Waves still apply.
    - `ffSessionsPerWeek()` replaces every `planState.freq` session target (Octane
      consistency, insights, weekly card, Stats, You summary), so a 2-day week is scored
      as 2.
    - `planState.freq` is kept for when the season ends.
- **The week arranges itself around rounds** (`ffArrangeWeek` in `stripDays`):
  - With play days set, the training days are placed so rounds land on rest days and no
    heavy-legs day sits the day before a round. Back-to-back sessions and two leg days in
    a row are penalised.
  - The plan's order is kept; only the starting point and spacing move.
  - Deterministic, and the same every week. Rest check-off keys don't move, because they
    are keyed by authored index.
  - A change made after the week has logged work applies from next week
    (`ff_gameday.arrangeWeek/prevDays`), so nothing already done jumps around.
  - The full-week view follows the arranged order. The settings line says what's
    happening.
- **Health check at setup** (step 1, under the body numbers) and in You › Your plan:
  - Plain-language versions of the standard pre-exercise screening questions, modelled on
    the PAR-Q+: heart/blood pressure, chest pain, dizziness/fainting, another long-term
    condition, long-term medication, a bone/joint/muscle problem, told to exercise only
    with supervision, and pregnancy/recent birth (asked of women only).
  - Tap any that apply; most people tap none. It never blocks setup.
  - Any "yes" → a 4-week on-ramp (one set off accessories, no all-out sets) and the lighter
    landing dose, until "My doctor has cleared me" is tapped.
  - Red flags (heart, chest pain, dizziness, supervised-only) get "Please get your
    doctor's OK before you train".
  - Answers ride in the profile (`state.health = {q, ts, cleared}`); changing them resets
    the clearance.
  - The coach knows all of this (knowledge.ts) and reads it from the profile.
- **Verified:**
  - npm test 208/208, including the new `tests/season-schedule-health.test.mjs` (6).
  - Scratchpad `verify-season.mjs`: 21/21 with zero page errors. It covers the in-season
    options switching Train/Home, the next two play days becoming rest days with no heavy
    legs before, and the health check in setup → profile → You → cleared.

## Font & design consistency pass (Oct 2, 2026)

User: "do a font and design check and make sure that there's consistency among the pages."

**Measured first:** a headless inventory of every view (light and dark) recorded the
rendered font family, size and weight of all text, plus every card's corners, padding and
gutter, every button and every uppercase label.
- **Already consistent:** page headers (kicker 11px, title 28px/900, subline 13px/600 on
  every tab), the 14px gutter, and the "Your plan / More / The details" section headings.
- **Drift found:**
  - Three font families were rendering. 217 CSS rules named `system-ui` while the body
    used the -apple-system stack, and form controls used the browser default (Arial on
    Linux/ChromeOS; Stats visibly rendered in a different face).
  - Nine font weights, including 520/550/650/720/750/780/820/850.
  - Collapsible rows differed on every tab: Train 15px plus a grey ▾; Fuel 15px no icon
    plus a green ⌄, and 14px plus a grey ▾; You an icon tile, title, summary and ⌄.
  - Dark feature cards at 16/18/20px corners, light cards and rows at 12/14/16px.
  - Primary buttons at 10/11/13/15px corners.
  - In-card overlines at seven letter-spacings.
  - Game Day had no page header.

**Fixed:**
- **One font:**
  - A `--font` token is used by the body and by every `font:` shorthand, in styles.css,
    coach.js and cloud-sync.js (pins bumped to v93 / v121).
  - `button, input, select, textarea { font-family: inherit }`.
  - Weights snap to 400/500/600/700/800/900.
- **One row pattern:** the new `ffRowSummary` (icon tile + title + summary + green ⌄) is
  used by the You groups, Train's "How the plan works" and "Plan settings" (now
  `.row-fold`, with a live summary such as "5 days a week · equipment"), and Fuel's
  Daily targets / Carb timing / What to eat.
  - The Daily targets macros moved into the summary line (no right-hand column to wrap).
  - The food guide's dark-mode olive tint is gone.
- **Corners:**
  - Cards and rows 16px (Home rows and the Ate-it tile were 14; Train folds and the
    warm-up fold were 14/12).
  - Dark feature cards 18px (Fuel's today card and the story card were 20; the You
    sign-in hero was 16).
  - Tall CTAs 14px; standard buttons 12px.
  - Train's "Start my plan" is now 48px tall (it measured 43px once buttons inherited
    the app font).
- **Labels:**
  - In-card overlines at 12px/800/.09em: Fuel's today kicker, Train week label,
    weekly-card next-up, player, recap, Pro sheet, speed-test result, onboarding loop.
  - Section headings at 12px/800/.1em: Stats sub-sections, chart heads, swap/add sheets.
- **Game Day** now opens with the same page header as the five tabs ("Your round ·
  Game Day · one line"); its separate dark title card was removed.

**After:** one rendered family on every view (plus the numerals face for figures); every
top-level card 16px and every feature card 18px.

**Verified:**
- npm test 202/202 (the You-groups CSS assertion follows the shared selector).
- Audits: train 18/18, scroll 16/16, contrast clean in both themes, type only the known
  `ft-bank` flag.
- Release gate, data contract and claims-lint clean; build deterministic.
- Paywall, program and simplify Playwright checks green; smoke shows only the known
  tunnel-error flag.

## Program update — the audit's owner decisions, built (Oct 2, 2026)

User: "lets fix the program changes" — the eight decisions the deep audit left open. All
are evidence-led, and each change is small enough to keep history and wave invariants intact.
No day names changed (`ff_log` is keyed by day name) and no new storage keys were added.

- **Chest and back twice a week (both splits):**
  - The single-arm DB row moved to the push day and the single-arm DB bench press to the
    pull day. Both are 🌀, so wave and retain doses are unchanged and history matches by
    name.
  - Chest-supported row 4 → 3 sets, keeping the pull day under the ~11-set per-session cap.
- **Low-dose muscles:**
  - Lateral raise 4 × 15.
  - 5-day: seated leg curl added to Day 1 (knee flexion twice a week) and a calf raise to
    Day 4.
  - 4-day: leg curl and calf raise 4 × 12.
  - 4-day: Pallof press moved to the pull day, so Day 1 is 25 sets.
  - Build-week doses: hamstrings 9.5 / 13, side delts 6, calves 4 / 7, back 13 / 15
    (4-day / 5-day). No muscle passes ~12 sets in one session.
- **New-lifter volume on-ramp:** with no lifting before the plan, weeks 1–2 take one set off
  each 💪 accessory, on top of the no-failure rule.
- **In-season mode** (Train › Plan settings, `inseason` in the profile):
  - Every lift at 2 hard sets and power at 3, with the same reps and weights.
  - The toast and the playbook explain it.
- **Play days** (Plan settings chips, stored in `ff_gameday.days`):
  - On a leg day before or on a round, Home shows a short note.
  - When an upper day is still open this week, the note offers "Do Upper (…) today
    instead". It never offers a future day in the free week.
- **Pull-up check:**
  - Asked once on Home and the Train card before the first pull session.
  - "Not yet" swaps in an assisted machine, band-assisted or negative pull-up (`ff_swaps`).
  - The answer is marked `pullup-cap` in `ff_insights_seen`.
- **Lighter landings:** BMI 30+ or age 60+ get one set off jumps and bounds on the speed day,
  with a soft-landing cue.
- **Trap bar for a flagged back:** "Back" in setup plus a barbell makes the Trap-Bar Deadlift
  the default, badged "back-friendly default". An explicit swap back to the straight bar
  sticks.
- **Gym speed day:** with a med ball, the seated chest throw replaces the speed bench (4 × 4;
  a true release).
- **Verified:**
  - npm test 202/202, including the new `tests/program-changes.test.mjs` (9).
  - wave-cases 93/93. The on-ramp and in-season layers are stubbed off there, so the base
    engine stays pinned.
  - Audits: train 18/18 (5-day Day 1 now 7 rows), scroll 16/16, contrast clean.
  - claims-lint clean; the paywall Playwright check is green.
  - Scratchpad `verify-program.mjs` (round note, pull-up check, in-season, play days, trap
    bar, chest throw, low-impact dose) is green, with zero page errors.
- **Still open:**
  - A 2–3-session in-season template.
  - Rotating the week so round days land on rest days.
  - A fuller health screen.

## Deep audit → 130 verified fixes: paywall, backend, training science (Oct 2, 2026)

User: "take a dive into the code and make sure the new feature is really going to function
and examine the database … and a deep understanding of fitness. The backbone … has to be
rooted in science and particularly bodybuilding style workouts FOR golf people."

**Method.**
- Nine independent auditors: paywall entry points, paywall state/timing, free-week leaks,
  backend/live-DB congruence, and five science lenses (volume/structure, progression math,
  golf health/injury, nutrition, coach/doc congruence).
- A completeness critic added four gap audits: returning after a break, safety for
  beginners/older/heavier users, whether the Octane/Stats signals are trustworthy, and
  store-bridge readiness.
- Every finding was adversarially verified (a reproduction or evidence lens, plus a
  skeptic for high/critical findings): 132 findings, 130 survived.
- Fixes ran in two lanes (client code; backend + coach knowledge/docs), followed by a
  per-cluster skeptic review, an integration run and a repair round.

**Verified at the end:**
- npm test 193/193, `npm run check`, data contract, release gate, claims-lint.
- wave-cases 93/93; audits: train 18/18, scroll 16/16, contrast clean.
- Paywall Playwright check 40/40; build deterministic.
- Only the two known pre-existing failures remain (smoke tunnel errors; audit-type
  `ft-bank`).

### Paywall (still switched off)
- **Resume:** a session already in progress stays finishable after the free week, with a
  Resume button above the lock card on Home and Train.
- **Welcome back:** doesn't appear for locked users, so they can't wipe the season and
  then hit the paywall.
- **Backups:**
  - Never carry `ff_pro`, so a JSON file can't unlock Pro.
  - `ff_free_week` imports earliest-wins.
- **Pro cache:**
  - Now `{pro, ts, uid}`, trusted only while a stored Supabase session for that uid
    exists.
  - An expired-token offline open no longer clears it.
- **Free-week clock:**
  - Validated and clamped (≤7 days; future stamps become now).
  - Also stamped at plan start.
  - Signed-in clients align it to `min(local, profiles.created_at)`, the server's clock.
    The server never reads client data.
- **Week jumps:** not offered outside "full" access (the picker is hidden and
  `startPlanAtWeek` clamps to week 1).
- **Coach:** wrapped the moment coach.js assigns `window.FFCoach` (a window accessor).
  A server 402 `subscription_required` fires `ff-paywall`, which opens the Pro sheet.
- **Reminders:** workout and speed-test reminders are not scheduled for days the user
  will be locked.
- **Store-bridge contract** (written in the 036 header):
  - `isPro()` is a sync boolean; only `=== true` counts.
  - `prices()` may be async and carries `trialDays` only for eligible users.
  - `purchase()` returns `{status, charged?}`.
  - Also: `platform`, `manageUrl`, `termsUrl`.
  - The bridge dispatches `ff-billing-changed`.
  - Purchase messages depend on the status; "Welcome" only once Pro is confirmed.
  - Cancellation copy is per platform.

### Backend (nothing changes today; migration NOT yet applied live)
- **New migration `20261001204500_billing_per_subscription_entitlement.sql`:**
  - `private.billing_subscriptions` tracks each subscription separately, with a per-sub
    out-of-order guard, so an old subscription's event can't overwrite a newer paid one.
  - Entitlement is status-only (`active`/`trialing`/`past_due` grace). A stale
    `trial_ends_at` no longer overrides a cancel.
- **paddle-webhook:** returns 200 for deleted users instead of a 500 retry loop.
- **delete-account:** cancels an active Paddle subscription only when `PADDLE_API_KEY`
  is set.
- **pgTAP:** the authorization tests cover all of the above.
- **Docs:** GO-LIVE-CHECKLIST.md and supabase/README.md were corrected:
  - Explicit-uuid SQL (auth.uid() is null in the SQL editor).
  - The store webhook must exist before `REQUIRE_SUBSCRIPTION=1`.
  - Terms page, CSP for Paddle, dunning settings.

### Training engine (the science backbone)
- **Ballistic/power drills never get load increments** (they progress by intent). The
  push-day wood-chop is a 🌀 control drill, not ballistic.
- **Heavy weeks rescale the load** for the lower rep target (Epley-consistent, rounded to
  the equipment step), so a Heavy week is actually heavier.
- **Load reductions:** every one (deload ~60%, recovery dose) goes through one
  `ffReduceLoad` helper that really reduces light loads. The modal "fill" uses the dosed
  load.
- **Equipment-aware increments:**
  - Med ball: no bump.
  - Dumbbells and cables: 5 lb.
  - Barbell lower body: 5 lb; barbell upper body: 2.5 lb.
- **Effort notes are wave-, band- and position-aware.** There is no "to failure" cue:
  - in Easy, Peak or recovery-dose sessions;
  - on loaded lunges or split squats;
  - right before a heavy compound (the curl-first order is kept);
  - during a new lifter's first 2 weeks (the on-ramp).
- **Returning after a break:**
  - Season resets ("Ease back in", season 2) fall back to lifetime `ff_history`, so loads
    survive.
  - Measured from a lift's last session at any dose (a deload is not a break):
    - ≥14 days: no bump;
    - ≥28 days: ~90% with an ease-in line.
  - PR checks use lifetime data, so there are no false "New ceiling" toasts.
- **Smaller fixes:**
  - Stall insights compare only full-dose same-wave sessions (they no longer fire every
    Heavy or Easy week).
  - No back-to-back deloads around an event.
  - Smart trim never cuts a 🏋️ lift.
  - The jump primer was restored on the 4-day Quads day.
  - "About N min" counts the real dose.
  - Bodyweight swaps are regressions with their own targets, not harder progressions.
  - One shared `isBigLift` (no Pallof, throws or speed bench in strength stats).
  - Speed-day warm-up ends with a ballistic ramp.
  - Trap-bar deadlift is the first one-tap swap for the deadlift.

### Cues & copy
- **Cue routing fixed:**
  - Chops no longer get jump cues.
  - Pallof is cued to *resist* rotation.
  - Raises, rows, presses, split squats, push-ups, dips and Nordics each have correct
    cues.
  - Jump cues teach soft landings.
- **Honest copy:**
  - Peak/taper copy matches the engine (no "~3–6% power bump").
  - Progression copy states the real rule.
  - In-season copy describes Retain mode.
  - Bulk copy is honest (a bigger surplus means more fat, not more speed).
  - Lean-bulk rates are consistent.
- **Game Day:**
  - Warm-up ends with real-club speed swings (the overspeed stick is optional).
  - An evidence-based carb guide for the round.
  - One alcohol line.
- **Smaller fixes:**
  - The overspeed-blaming insight text was deleted.
  - Round "receipts" need a minimum sample and use hedged wording.
  - ffBench male <50 is now 78 mph / 215 yd.
  - Onboarding has a one-line health note.

### Nutrition engine
- **Goal suggestion:** `ffSuggestGoal` — BMI ≥30 suggests Lean Out, 27–30 suggests
  In-Season Maintain, else Lean Bulk. It's preselected but still a choice, and onboarding
  now asks Body before Outcome.
- **Fat floor:** 20% of kcal on every goal (the rest from carbs).
- **Post-workout meal:** gets at least a main meal's protein.
- **Metabolism check-in:**
  - Needs 6+ weigh-ins over 12+ days.
  - Noise-aware tolerance; corrections in half-gap steps ≤250.
  - The adjustment is a whole number of kcal.
  - Never silently piles up past the calorie floor.
  - "Got it" snoozes 10 days via `checkin-ok:<day>` in `ff_insights_seen`.
- **Fuel adherence:** weighted by slot kcal (`d.w` inside `ff_fuel` records), so the
  carb-only pre-workout snack isn't a full meal.

### Progress signals & coach context
- **Speed anchor:**
  - The first guided test anchors the trend; onboarding *guesses* are tagged `ss:'g'`
    and never become the baseline.
  - One plausible 7-iron range, 30–130 mph.
- **Noise model:** NEW PR, Story verdicts and the Octane speed pillar respect it.
  - Constants: `SPEED_NOISE` 1.2 mph, `SPEED_MDC` 1.5 mph, forecast TE floor 1 mph,
    `DRIVE_MDC` 6 yd.
  - These are **unsourced design assumptions** pending 7-iron between-day reliability
    data.
- **Forecast:** confidence labels widened or downgraded to match real coverage.
- **Power-to-weight is goal-aware:**
  - On plan for a lean bulk = on track.
  - On a cut, weight loss alone can't max the pillar.
  - Octane speed and power-to-weight are season-scoped.
- **Dates:** insights parse iso/ts, never locale strings.
- **Coach context:** the coach now gets the real week, wave (plain and internal names),
  this week's plan targets and a compact recent log. coach.js v92.

### Coach knowledge & evidence docs
knowledge.ts, NUTRITION/CLUBHEAD references, OCTANE-SCORE.md and the domain skill now
describe exactly what ships:
- **Overspeed:** once a week, 2×5→3×5→4×5, biweekly test.
- **Six-pillar Octane.**
- **Real per-muscle doses and frequency** (upper body once a week): no "~2
  sessions/muscle" claim.
- **Nutrition:** caffeine timing, alcohol & recovery, post-workout fat wording, Helms
  2014 per lean mass.
- **Training:** detraining/return-to-training, in-season = Retain mode.

### Open owner decisions (recorded, not built)
- **Split/frequency and volume:**
  - Upper body is trained once a week.
  - Hamstrings, side/rear delts and calves sit below the app's own weekly-set guidance.
  - Options: a second 4-day lower exposure, or a row/press swap.
- **Experience-level volume on-ramp for beginners.** Only the effort on-ramp shipped.
- **Pull-up capacity gate; plyometric gating by mass/age; a full pre-participation
  questionnaire.**
- **A true in-season template (2–3 sessions) and round-aware scheduling.**
- **Gym speed day:** add the seated chest throw (speed-day campaign S1).
- **A trap-bar default.** Today it's the first swap.
- **Billing:**
  - Store webhook vendor (RevenueCat vs native ASSN v2 + Play RTDN).
  - terms.html.
  - Whether the live owner row ('active', no provider) is a deliberate comp.
  - The policy for pre-billing native builds.

## Free week → Yardsmith Pro — built, switched off (Oct 1, 2026)

User: "If I start this thing on Apple Store, won't people download for free?" → "How do
we just give the first workout as a demo?" → "7 days they can see every workout tho" →
"Okay but hide as much as possible the first week that makes sense." Pricing and rules
in YARDSMITH-BRAIN §9. New module `036-access-free-week-and-pro.js`; `FF_PAYWALL=false`
so **nothing changes for anyone today** except the You tab's old "No paywall" promise,
now "Free during early access". Preview it with `?paywall=1`.

- **Free week (days 1–7):** Train is Today-only. The Full-week toggle and Jump-to-week are
  gone. Future workout chips show 🔒, and tapping one shows a dashed teaser card: name,
  minutes, exercise count, "opens Friday", and "See Yardsmith Pro ›". It never shows the
  exercise list, and there's no "log it early". Today's workout and past days are fully
  open.
- **After the free week:**
  - Home's one big button becomes "Your free week is done · Keep your plan going".
  - Train shows the hero plus one card with an "Unlock week N" button. There's no strip,
    list or Start button.
  - `startPlayer`, `openSpeedTest` and `FFCoach.open/ask` all route to the Pro sheet.
  - Resuming a session that was already started is allowed.
  - Stats, history, Fuel and You stay readable.
- **The Pro sheet** (a swap-modal shell):
  - The headline depends on why it opened.
  - Four ✓ benefits.
  - Yearly (preselected, "Best value", $6.67/mo) and Monthly cards. *(Updated Oct 2:
    trial wording appears only when the store bridge reports `trialDays>0` for an
    eligible user; otherwise the button reads "Continue".)*
  - Fine print covering auto-renewal and cancellation.
  - "Everything you've logged stays yours, Pro or not."
  - Restore purchases · Terms · Privacy. *(Updated Oct 2: Terms = the bridge's
    `termsUrl`, else Apple's EULA on iOS only, else no link until terms.html exists.)*
  - With no `FFBilling` bridge, the buy button only toasts "Subscriptions open soon".
- **You tab:**
  - Paywall off: an early-access card at the bottom.
  - Paywall on: the status card ("Free week · N days left" / "Free plan" / "Yardsmith
    Pro ✓"). *(Updated Oct 2: shown above the folded groups for non-Pro users; Pro
    users keep it inside "Your plan".)*
- **Dark theme:** `.pw-go` and `.pw-opt-tag` are excluded from the generator (they're the
  bright primary, like `.train-today-cta`).
- **Analytics:** `paywall_shown{reason}`, `paywall_buy_tap{plan}` (product-health v7).
- **Tests:** `tests/paywall.test.mjs`. The scratchpad Playwright run covers all four
  states (off / free week / locked / Pro): 40/40.

## Hypertrophy evidence update — six changes (Sep 30, 2026)

User: "any scientific evidence you can find and use towards optimizing lifting for a
golfer and keeping our 'bodybuilding' affection alive?" Two parallel literature reviews
(2021–2026 hypertrophy science; golf-specific strength/body composition) — full write-up,
citations, confidence and the open leads in NUTRITION-AND-TRAINING-REFERENCE.md **§9a**.
The user approved the six changes:

1. **Cable Triceps Pushdown → Cable Overhead Triceps Extension** (both splits; long-head
   stretch, Maeo 2023). New substitution entry (dumbbell / band overhead extension,
   diamond push-up). `FF_PLAN_RENAMED` in 040 carries a user's existing pushdown swap
   over to the new name; setting or resetting the new one clears the old key.
2. **Seated Leg Curl added to the 4-day Day 1** (it had no knee-flexion work; seated beat
   lying, Maeo 2021). Day 1 grows by 3 sets.
3. **Cues:** leg extension "lean back / recline the seat" (Larsen 2024/25); calf raise
   "pause 1–2 s in the deep stretch at the bottom" (Kassiano 2023); new overhead-triceps
   form entry; leg-curl cue says seated beats lying.
4. **Tempo:** "control the lowering (~3 sec)" → "(1–2 sec), then drive up fast" (no growth
   benefit from slower; ≤2 s eccentrics gave better jump gains — Amdi & King 2025).
5. **Rest:** ≥13-rep sets "rest ~75s" → "rest ~90s" (Singer 2024).
6. **Docs:** the reference doc's "steep diminishing returns past ~10–12 sets" corrected
   (Pelland 2025: growth keeps rising; the sharper cap is per session); the AI coach's
   knowledge base and the domain skill updated to match (knowledge.ts redeploys with the
   ai-coach function on merge).

Not shipped (open leads in §9a): the 2026 training meta-analysis as a new headline number
(needs the full paper first — low GRADE certainty), a per-session cap on the 14-set pull
day, an in-season maintenance mode, round-timing guidance.

**Verified:** `npm test` 66/66 (new `tests/hypertrophy-evidence.test.mjs`: the swaps,
tempo/rest/cue copy, the coach knowledge, and the swap carry-over + reset); wave-cases
91/91 (new names classified 💪); `check-release` 4/4; data contract; claims-lint clean;
audit-train 18/18; audit-scroll 16/16; audit-contrast clean; audit-type only the known
`.ft-bank` flag. Headless: 5-day push day shows the overhead extension, 4-day Day 1 lists
the seated curl, an old pushdown swap still shows the user's choice, no "~3 sec" copy,
zero page errors.

## You pass — sign-in on top, four folded groups (Sep 30, 2026)

The last tab in the simplification series, and the longest: 15 separate cards
in one scroll (4,053px, 538 words on the active seed).

1. **Layout.** The sign-in / account card stays on top. Everything else is in
   four folded groups (`<details class="acct-group">`), each a row with a
   one-line summary so you can read your settings without opening anything:
   - **Your plan** — "Lean Bulk · 5 days · morning": your numbers + re-run
     setup, training setup (mission, days, time, big event), favorite foods,
     mobility screen, start the plan over.
   - **Reminders & look** — "Reminders off · Auto theme": smart reminders,
     appearance.
   - **Your data** — "On this phone / Synced · backup, privacy": backup &
     export, product-health toggle, delete account (signed in).
   - **Help & app** — "How it works, app updates": install the app, show me
     around, app version / force refresh, full access.
   Feedback / Privacy / Delete-account links stay at the bottom.
2. **State.** Every setting change re-renders the tab, so open groups are held
   in `acctOpen` (toggle captured, written back at render — the Home-fold
   pattern). Deep links open their group first: the Stats season card's "Set
   your event date" now carries `data-acctopen="plan" data-acctfocus="acctEvDate"`
   and lands on the field.
3. **Dark mode:** the sign-in card's bright button was being dimmed by the
   generator; `.acct-card.hero` rules are now excluded (the card is dark in both
   themes).
4. **Audits:** audit-scroll's four You cases, audit-contrast and audit-type now
   open the groups before tapping/measuring, so coverage is unchanged.

Result: 4,053 → 1,134px and 538 → 98 words when folded; the same controls one
tap away.

**Verified:** `npm test` 63/63 (new You-tab test); `check-release` 4/4; data
contract; claims-lint clean; audit-train 18/18; audit-scroll 16/16; audit-contrast
clean (You groups opened); audit-type only the known `.ft-bank` flag; smoke
functional checks pass. Headless: 4 groups folded with sign-in on top, a group
stays open after a setting re-renders the tab, summaries update (days, theme),
the event-date deep link opens Your plan and scrolls the field into view, zero
page errors; light + dark captures.

## Train pass — the workout on top, one "More" group below (Sep 30, 2026)

Train's top already worked (the workout, Start, the week strip, the lift list).
Below the list sat five items in five styles: a dashed "Prefer typing? Log
manually here" link, a green "Coach this week · Adjust" bar, a "Workout history"
link, and two folds.

1. **"More" group.** A quiet "MORE" heading, then matching rows (Home's
   `.home-row` via `homeRow()`): **Log by typing instead** (moved out of the lift
   list; only offered on a loggable day, and hidden while manual mode is on —
   the existing "Hide manual logging" link still turns it off), **Adjust this
   week** (the coach, `data-ask="train"`), **Workout history**. The two folds
   follow, dressed as rows: **How the plan works** (was "Coaching playbook")
   and **Plan settings** (was "Plan & settings"; `#setFold` id kept).
2. **Dark mode:** the main Start button (`.train-today-cta`) kept its bright
   fill — the generator had been darkening it into a dull green card. Excluded
   in `gen-dark-theme.py`; the lighter recovery-day variant still darkens, with
   its caption pinned in `CORE`.
3. Dead CSS (`.train-ai`, `.train-link`) removed.

Page height is about the same (1,630 → 1,760px on the active seed: taller,
tappable rows replace thin links); the gain is one consistent look and a clear
split between "today's workout" and "everything else".

**Verified:** `npm test` 62/62; `check-release` 4/4; data contract; claims-lint
clean; audit-train 18/18 (includes rest/recovery states in both themes);
audit-scroll 16/16; audit-contrast clean; audit-type only the known `.ft-bank`
flag; smoke functional checks pass. Headless: More shows 3 rows, "Log by typing
instead" switches to the manual logger and hides itself, the way back works,
history opens, Plan settings opens with its controls, zero page errors; light +
dark captures.

## Stats pass — the answer first, then "The details" (Sep 30, 2026)

Third tab under the "one clear thing on top, the rest folded" rule. Three big
dark cards in a row (the progress story, the 6-week outlook, the Octane gauge)
all answered "is it working?", and the story repeated Octane's pillars in its
own "What's working" list.

1. **The story is the answer.** Its "What's working" pillar list is gone (the
   same pillars are one tap away in Octane). It gains one line from the 6-week
   outlook: "Next 6 weeks, if you keep this up: 80.2–82.3 mph 7-iron · low
   confidence" — only when the forecast is ready.
2. **This week** stays second (the weekly plan card from the Home pass).
3. **"The details"** heading, then the evidence: Octane first ("See the
   details ↓" still jumps there), the full outlook card (range, reasoning,
   coach button), then speed / gym / season / unlocks / leaderboard / coach.
   The clubhead-speed card now starts closed like the others (`PF_DEFAULTS`
   empty); the story already shows the number. The outlook's "building" card
   (not enough tests yet) is no longer shown — the story already says the next
   test sharpens the read.
4. Dead CSS for the removed pieces deleted.

Result on the active seed: 2,690 → 2,347px, 330 → 292 words.

**Verified:** `npm test` 62/62 (performance-story test asserts no pillar list in
the story, the outlook line, and the details order); `check-release` 4/4; data
contract; claims-lint clean; audit-train 18/18; audit-scroll 16/16;
audit-contrast clean; audit-type only the known `.ft-bank` flag; smoke functional
checks pass. Headless: outlook line present with data and absent without, "See
the details" lands on Octane, speed card opens on tap, "Why this range" opens,
zero page errors.

## Fuel pass — one "today" card, then "Your plan" (Sep 30, 2026)

User, after the Home pass: "should we take a similar approach to the other
tabs?" → agreed rule for the non-Home tabs: one clear thing on top, everything
else folded (not Home's single button — these tabs hold the detail). Fuel went
first because it was the most confusing: "today's meals" appeared twice (the top
card, then a "Today's fuel" box inside a "Meal Plan" card with its own dark
header bar and a 3/4/5/6 picker), and four separate white cards of settings
followed, one with an empty band of padding.

1. **Today's meals card (top, 030 `renderFuelToday`).** Next meal + "Ate it ✓",
   a first-day hint ("Tap ✓ when you eat a meal — no calorie counting"),
   progress, what's left (kcal/protein/carbs/fat), and **"Or rate the whole
   day: On plan / Close / Off plan"** — moved up from the old summary box, with
   a "Day rated: …" line once used. The fuel streak sits in the card header.
   The "See today's meals" link is gone (the list is right below).
2. **The day's list.** "All of today's meals · 4 meals · morning workout" as a
   plain heading — no dark header bar, no picker, no second summary (the
   `fuelSummaryHtml` box and its "Show the numbers" toggle are deleted). Same
   treatment in the foods-you-love view. "Make these meals yours" became one
   tappable row: "Use foods you actually eat ›".
3. **Your plan.** A small "YOUR PLAN" heading over slim folds: **Daily targets**
   (now also holds **Meals per day**, with "recommended for your plan"), **Carb
   timing around training** (moved out of the meal card into its own fold,
   `#fuelTimingFold`), **What do I eat to hit these numbers?** (the empty padding
   band removed), and **Your details** (was "On the Tee · Your Numbers").
4. **Dark theme.** The always-dark Today's-meals card (`.ftoday`, `.ft-*`) is now
   excluded from the generator like the big-button pill — it had been darkening
   the progress bar's bright end. Dead CSS for the removed pieces deleted.

Result on the active seed: page 2,362 → 1,921px, 251 → 207 words, the same jobs.

**Verified:** `npm test` 62/62 (progressive-disclosure test now asserts the
"Your plan" order, the timing fold, the rating in the top card and meals-per-day
in the targets fold); `check-release` 4/4; data contract holds; claims-lint
clean; audit-train 18/18; audit-scroll 16/16 (the removed "show numbers" case is
replaced by `fuel-meals-per-day`, a full calc() re-render; it taps the active
count because changing the count adds a row above the picker and scroll
anchoring rightly shifts scrollY by that row); audit-contrast clean;
audit-type only the known `.ft-bank` flag; smoke functional checks pass.
Headless: list ✓ and top-card "Ate it" both update the count, the hint hides
after the first check, rating from the top card, meals-per-day rebuilds the list
with the fold staying open, carb timing opens, the foods-you-love view uses the
same heading with no picker/summary, zero page errors; light + dark captures.

## Simplification pass — "where do I even start?" (Sep 30, 2026)

User: "The app is still confusing to use/start. Opening it after a couple of
months and I can't even remember where to start, which means a new person will
have no idea. We have to simplify the experience." Screenshots of a returning
user (plan started 75 days ago, 2 workouts) showed a catch-up card, a readiness
card, a 3-step "Opening Round", two folds and a floating ＋ Log all competing for
the first tap, in jargon ("Pick up the thread · No reset", "Intensify", "banked",
"adherence, not accounting"). This pass shipped ideas 1–4 + 7 of the proposal;
tab consolidation (5) and grouping the You tab (6) are deferred (BRAIN §10).

1. **Welcome back (new `087-welcome-back-return-after-a-break.js`).** After 14+
   days with no activity of ANY kind (workouts started or finished, weigh-ins,
   meal check-offs, rest/skip marks, rounds, tests, check-ins, week reviews,
   plan start, last answer), one full-screen card: "It's been N weeks · your last
   workout was <date> · everything is saved", "How Yardsmith works" in three
   lines (Lift / Eat / Measure), and one question. **Ease back in** = the
   season-2 reset (`resetPlanFull` + `startPlanAtWeek(1)`; history, lifts and
   trends stay) — recommended at 28+ days or when the season ran out. **Pick up
   at week N** = keep the calendar, and this week's already-passed sessions get
   skip marks so the next screen is today's workout, not "you missed this".
   **Decide later** = hidden for this app session (sessionStorage). The answer
   stamps `ff_welcome_back` (new ROAMING key → cloud-sync `KEYS`, pin v=119) so
   every device agrees. Signed-in devices wait for the first sync outcome
   (`ff-sync-status`, 6s cap) before judging, and a later cloud merge that shows
   recent activity closes the card — a stale tablet must not greet someone who
   trained yesterday on their phone. Skipped for shared links, push-notification
   launches and `?go=` deep links. Also checked when the app resumes on a new day.
   Analytics: `welcome_back_shown {weeks}` / `welcome_back_choice {choice,weeks}`
   (product-health.js v=6 + the edge-function allow-list).
2. **Home is one big button.** `renderDash` = the next-up card + quiet rows:
   **Today's meals** (x of N done · next meal, with a one-tap "✓ Ate it"), **Your
   progress** (driver / 7-iron numbers → Stats), **Log something** (opens the
   quick-log sheet), **Review your week** (only once the week can be closed),
   **Coach** (the one live coaching signal — a PR, a stall, flat speed — or the
   general read; asking marks it seen). The big card now always SAYS its action
   in a bright pill ("Start workout ›", "Start the test ›", "Mark it done ›").
   Gone from Home: the readiness card (Start already asks the 20-second
   check-in), the day timeline fold, the progress fold (hero card + insight
   card — both deleted as dead code), and the weekly flight plan (now on
   Stats, right under the story). The calorie check-in card moved to the top of
   Fuel; the meals row says "Calorie check-in ready" when it's waiting. The
   Octane daily trace (`ff_score_hist`) is still fed from every Home render.
   The page header shows today's date.
3. **Getting started (was "Opening Round").** Plain steps — "Do your first
   workout / Check off a day of meals / Test your swing speed". It now expires
   14 days into the plan if unfinished, and never shows for returning golfers
   (history from before the current plan start, e.g. after a restart).
4. **Setup ends by starting.** "Start my first week" now lands on a last screen:
   "Your first workout is ready — About 55 min" → **Start workout now** (opens
   the guided player; readiness asks first as usual) or **Later — take me to
   Home**. Re-running setup (hadPlan) still saves and returns to Train.
5. **Plain words.** Waves display as **Build / Heavy / Easy / Peak week** (keys
   unchanged: accumulate/intensify/deload/peak). Train hero reads "WEEK 11 OF
   20 · 🔥 HEAVY WEEK" (mission dropped from the kicker; the Build/Retain chip
   removed). Catch-up: "Catch up — You missed this one — do it today and your
   plan stays on track." Fuel: "Today's meals · x of N done", "Ate it ✓", "Tap ✓
   when you eat a meal — no calorie counting", "Or rate the whole day: On plan /
   Close / Off plan". Stats: "YOUR PROGRESS", "workouts done", confidence reads
   "Clear trend / Trend forming / Too early to tell", "What's working", "WORK ON
   NEXT", "Speed test due". "banked" → "done"/"logged" on the main surfaces.
   First-visit tips rewritten ("Start here every day — the big button is always
   the next thing to do").
6. **Cleanups.** The floating ＋ Log button is gone (it covered content on every
   tab); the sheet opens from any `[data-qopen]` and gained a "Playing today?"
   row → Game Day (its only in-app entry was the removed timeline). The header
   context pill ("TODAY") is gone — it duplicated each page's title and read as a
   button. The Stats contradiction is fixed: the consistency pillar said "0
   sessions logged · last 8 wk" under the story's "2 sessions banked"; it now
   says "0 in the last 8 wk · 2 total". Train's pre-check-in readiness card is
   gone (Start asks); the scored dose card still shows after a check-in.
   `.nu-skip` grew to the 44px tap floor. ~100 lines of dead Home CSS removed.
7. **Dark theme.** `--green-900` had no dark value (the Getting started and
   weekly-card titles rendered dark-on-dark) — pinned in `CORE`. The big
   button's action pill is excluded from the generator (it sits on the
   always-dark Today card; darkening it hid the affordance).

**Verified:** `npm test` 62/62 (new `tests/welcome-back.test.mjs`; the
literal-asserting sprint tests were updated to the new behavior, not deleted);
`check-release.mjs` 4/4; `npm run check`; data contract holds (all 47 lsSet keys
accounted for); audit-train 18/18 (its fixture now stamps `ff_welcome_back` — the
deload-week state starts 35 quiet days back and was correctly greeted);
audit-scroll 16/16; audit-contrast clean; audit-type has only the known
intentional `.ft-bank` flag; smoke functional checks all pass (red only from the
sandbox-blocked product-health fetch). Headless walkthroughs: fresh setup → "first
workout is ready" → Later → Home and → Start now → readiness modal; a 75-day
returning user → Welcome back → restart (week 1, no checklist) / pick up (today's
week-11 workout, no catch-up) / decide later (hidden on same-session reload);
active user Home/Train/Fuel/Stats in light and dark.

## Pre-launch review — six-area bug sweep (Sep 30, 2026)

User: "We've never gone live because I don't think this is quite ready. Do a
code review and ensure all bugs are gone." Six parallel reviewers (data/sync,
training, Fuel, Home/shell/account, Stats/sharing, backend/security) reported
about 80 findings, most proved headless or in a vm sandbox. Every finding was
checked against the code before fixing. What changed, by area:

1. **Sync (cloud-sync.js v=118).** The login merge ran only on `SIGNED_IN`, so a
   cold open with an expired token (`TOKEN_REFRESHED`/`INITIAL_SESSION`) pushed
   stale local state over the cloud. It now merges on the first authenticated
   event of every page, and pushes wait for it. Settings merge three-way against
   a device-local base (`ff_sync_base`), so one device's push no longer reverts
   another's setting change. A different account signing in is asked before
   anything is combined (`ff_sync_owner`). Rest/skip "undo" is a timestamped
   negative marker; check-offs older than the plan start drop on merge. Body days
   take the newer edit; backup restore pushes as authoritative. Sign-out drops
   this browser's push subscription.
2. **Training.** Weeks after a deload no longer prescribe ~60% loads
   (progression reads the last full-dose session). Day 140+ shows "Season
   complete" and never reuses week-20 keys. Pause/resume across a week rollover
   keeps the session. The event taper keeps its post-event deload. One dose helper
   (`ffDose`) covers the player, inline and modal loggers. Clearing a workout no
   longer deletes earlier seasons' history. Also: no duplicate substitutes, speed
   copy on ballistic drills, Octane consistency decays, classifier fixes, and a
   `doneTs` finish time on history.
3. **Fuel.** A malformed shared link (`?g=foo`) crashed boot and could persist
   through sync; values are now validated, and a link never overwrites a saved
   profile. There's a calorie safety floor (1200 women / 1500 men), targets are
   written before the renders that read them, the example day mirrors today's
   schedule so ✓ hits the right slot, shopping-list units are fixed, and reset
   covers the calculator only.
4. **Home/shell/account.** Finishing a workout reschedules reminders (no stale
   "next rep" nudge), with a loop guard on `ff_push_on`. The SW never caches a
   404/5xx as the offline shell. Home folds keep their open state. Other fixes:
   tab-title encoding, the saved view (async transitions, Game Day), the midnight
   featured day, the event-name field, round-log pre-fill, coach queueing and
   dark/safe-area styling, and the onboarding link clearing the home indicator.
5. **Stats/sharing.** Re-running setup no longer fakes a "measured" speed/drive
   row. Other fixes: the live leaderboard streak and week-filtered board, dates
   from ts/iso (locale-safe), range-checked quick-log/round/speed-test inputs,
   season map scoped to the current plan, and the evidence button always opens.
   Forecast and season-map state survive re-renders, share failures fall back to
   download/clipboard, and zero baselines are ignored (no "+Infinity%").
6. **Backend/security.** push-daily: host allow-list, 10s timeouts, paging,
   batches, constant-time cron secret. Migration `20260930110636`:
   push_subs bounds and a 10-per-user cap, anon can't read leaderboard
   `user_id`, and a global 1000/day AI ceiling. The coach knowledge base drops
   banned performance claims. ai-coach: user-first history, room for thinking,
   stop reason forwarded, no error-detail leaks. The coach model is now
   `claude-sonnet-5-5` with server-side refusal fallback. product-health reads
   bodies with a byte cap; paddle-webhook is out of auto-deploy; the legacy
   Pages branch is removed. Every user-text sink (lift names, event name,
   handle, notes) is escaped.
7. **Type scale.** 24 off-band sizes were snapped to 11/12/13/13.5.

**Verified:** `check-release.mjs` 4/4; `npm run check`; `npm test` 55/55;
`check-data-contract` holds; `claims-lint` clean; audit-train 18/18,
audit-scroll 16/16, audit-contrast clean (1494 nodes, both themes); audit-type
has 1 flag, the intentional icon-only `.ft-bank` on narrow screens. Yardsmith
card test ALL GREEN. The reviewers' repro scripts were re-run after the fixes:
sync proofs P1/P4/P8 no longer reproduce, and P2/P3 are fixed by design with
new proofs. Fuel t1/t2/t7/t9 are clean, and Home t1/t4/t6/t8/t10/t12/t14/t15
are fixed. A runtime XSS sweep (script payloads in every free-text field,
every tab and fold, both themes) fired nothing, and in-app checks for the
calorie floor and midnight round log pass. The migration applied and
re-applied cleanly on a local Postgres, with the cap, HTTPS check, anon column
grant and global AI ceiling all exercised. The coach stream call type-checks
against SDK 0.111.0. smoke.mjs is red only on the sandbox-blocked boot-time
`product-health` request (same on `main`).

**Known and deferred (low):** a plant-only cut plan runs 25–35% short on
protein; Fuel check-offs are keyed by schedule position; paddle-webhook user
binding waits for billing; the CSP still allows inline script; OTP sign-up has
no captcha.

## The Yardsmith card — a player card built from your own numbers (Sep 28, 2026)

User: "build the Yardsmith card." It's our answer to DRVN's pre-release player
card (photo, a /100 rating, an "ELITE" tier). That card ranks golfers against
each other, so it flatters players who are already elite. Ours measures a
golfer against their own start.

1. **Entry point:** "Share my Yardsmith card" on the Stats tab's Performance
   Story card, shown once there's any real number (44px target, 13px type).
   One tap renders a 1080×1350 PNG through the same share → download →
   copy-text path as every other card (`ffShareBlob`, 055).
2. **Hero = progress since your start:** driver-carry gain ("+13 yds",
   "228 → 241 yds"), else 7-iron speed gain, else today's carry or speed, else
   sessions banked, else Octane. Driver comes first because we lead with yards.
3. **Distance mission bar:** the golfer's goal and % there. It appears only once
   there's a positive gain, so a share card never prints "0%".
4. **Up to four tiles:** Octane (sparkline from `ff_score_hist`), driver carry,
   7-iron speed (sparklines at 3+ entries), strength (+% big-lift e1RM), and a
   live week streak that counts back from this week, so it's never stale. The
   hero's metric isn't repeated as a tile.
5. **Header/footer:** wordmark, "WEEK N OF 20", and the leaderboard handle only
   if the golfer chose one; yardsmith.golf in the footer.
6. **Honesty rules:** only the golfer's own logged numbers. No rank against
   other golfers, no tiers, no mph→yards estimates. A drop is never shown as a
   gain: that tile shows today's value with no delta.
7. `ffCardCanvas`/`ffCardBlob` were factored out of `ffMakeCard`, and the
   existing cards draw identically.

**Verified:** headless at 390×844 across 5 data states × light/dark (no data,
early user, full progress, numbers going down, sessions only). Checked: the
button appears only when there's data, a 330×44 target, 13px type, a
1080×1350 PNG handed to a stubbed native share sheet, and the share text (e.g.
"+13 yds of driver carry since Aug 16 · Octane 68 · 7-iron 84.5 mph · big lifts
+18% · 5-week streak"). The going-down card has no ▲, − or NaN. Zero page
errors. The download fallback saves `yardsmith-card.png`. All cards were checked
by eye. Also green: `check-release.mjs` 4/4, `npm run check`, `npm test` 54/54,
`audit-contrast` (1494 nodes, both themes). `audit-type` (25 findings) and
`smoke.mjs` are red on `main` already, and the findings are identical on base
vs this branch. None involve the new button; smoke's only failure is the
sandbox blocking the boot-time `product-health` ping.

## Share-card wordmark — the last FairwayFuel straggler (Sep 28, 2026)

Every PNG the app generates for sharing (session recap, Sunday Scorecard, speed
test) still drew the pre-rebrand wordmark "Fairway"+"Fuel" in its header while
its footer said "Yardsmith". The rebrand sweeps searched for `FairwayFuel` and
the split-HTML `Fairway<span>Fuel</span>` pattern; the canvas draws the two
halves as separate `fillText` strings, which matched neither. The header now
draws `Yard` (white) + `smith` (accent green), mirroring the in-app wordmark.
Lesson for any future brand sweep: grep each *half* of an old split wordmark,
canvas strings included.

**Verified:** rebuilt (FF_BUILD `05af081028`); `check-release.mjs` passed all
four gates; `ffMakeCard` rendered headlessly to a 1080×1350 PNG reading
"Yardsmith" in both header and footer; the built app booted headlessly at
390×844 with zero page errors; `"Fairway"` has 0 hits in `app.js`.

## Sprint 5 — Daily Readiness → Adaptive Session (Jul 26, 2026)

Sprint 5 makes the authored program responsive without turning Yardsmith into a
medical device or a settings maze:

1. **Three honest taps:** sleep, body, and energy create a readiness read in
   roughly 20 seconds. The check-in appears on Home and Train and intercepts only
   the first start of a new session; resumptions are never blocked.
2. **A deterministic dose, not AI improvisation:** Full Send keeps the authored
   plan; Smart Trim preserves the first two lifts and removes one later accessory
   set; Recovery Dose keeps two crisp sets per lift and suggests roughly 75% load.
3. **The plan never moves:** readiness changes today's dose only. Week, phase,
   exercise order, completion truth, and missed-session recovery remain intact.
4. **The golfer stays in control:** every reduced dose offers “Keep the original
   session,” and the whole check-in can be skipped.
5. **One coaching brain:** today's band is visible inside the workout player,
   becomes a deterministic Brain signal, and is supplied to the conversational
   coach so both surfaces explain the same decision.
6. **Private by design:** signed-in users can sync a bounded 60-day readiness
   history. Anonymous telemetry receives only the coarse band and whether the
   original session was chosen—never sleep, soreness, energy, or health values.
7. **Safety boundary:** the result explicitly redirects sharp pain, new injury,
   dizziness, or illness away from training and toward appropriate care.

## Sprint 4 — smart re-engagement (Jul 26, 2026)

Sprint 4 lets Yardsmith coach while closed without becoming notification noise:

1. **One useful job:** the shared seven-day reminder engine now prioritizes an
   overdue session, today's unfinished workout, a due speed test, or Sunday
   week-close. A workout already banked suppresses its notification.
2. **Essential vs Daily:** Essential (the default) keeps rest days silent. Daily
   adds intentional recovery nudges. Both modes cap delivery at one notification
   per local day and expire stale sends after one hour.
3. **Respectful timing:** users choose training time or one hour before. The final
   send hour is clamped to 7 AM–8 PM, and Account shows the exact next scheduled
   reminder before it fires.
4. **Exact deep links:** notification payloads carry a constrained same-origin
   route. Tapping opens Train, launches Speed Test Day, or expands the Weekly
   Flight Plan review instead of dropping users onto a generic Home screen.
5. **Web, PWA and native parity:** the same message decision powers Supabase web
   push, open-tab fallback reminders, and Capacitor local notifications.
6. **Safe delivery intelligence:** the Edge Function validates title, body, kind
   and URL; skips completed/rest jobs; prunes expired endpoints; and records only
   coarse message-kind logs. Opt-in, opt-out, settings changes and opens extend
   the anonymous product-health allow-list without subscription keys, identity,
   workout contents or health data.

The Account card is now a transparent control surface: delivery status, next
message, mode, timing, and off switch are visible together.

## Sprint 3 — the weekly performance loop (Jul 26, 2026)

Sprint 3 moves the engagement system from first-week activation to durable,
low-pressure retention:

1. **Weekly Flight Plan:** after the Opening Round's two-day victory lap, Home
   gains one compact weekly card with three signals: complete the authored
   training frequency, fuel on 3–5 days (scaled to training frequency), and
   capture one body/performance check-in. The card reads calendar-week history,
   fuel, body, speed, distance and mobility data already owned by the user.
2. **Pace, not streak anxiety:** the headline compares sessions with the natural
   pace through the current weekday. Falling behind becomes “one good rep changes
   the week”; an imperfect week never resets history or presents failure copy.
3. **One next win:** the card routes to the highest-value unfinished loop —
   training, fuel, check-in, then review — instead of presenting three competing
   calls to action.
4. **Week-close ritual:** from the weekend (or once training is complete), users
   can review the win, the lesson and the next tee, then bank the week. The review
   persists by Monday week key, merges safely across signed-in devices, and
   produces a branded, shareable recap.
5. **Privacy-safe retention measurement:** next-action starts, week reviews and
   recap shares join the strict first-party allow-list. Only action, plan week and
   a coarse completion band are accepted; no identity, health values, workout
   details or free text leave the device.

The loop deliberately waits until activation is complete so Home never stacks
two onboarding systems. It adds depth for returning golfers while keeping the
daily primary action dominant.

## Sprint 2 — activation, momentum and forgiving return (Jul 26, 2026)

Sprint 2 closes the gap between “the plan is powerful” and “I know how to build
a habit with it” without adding a noisy badge/feed layer:

1. **Opening Round:** after a plan begins, Home connects the three signals that
   make Yardsmith useful — one banked workout, one fueled day and one 7-iron
   baseline. The 0/3 card advances from “three wins” to a two-day victory lap,
   then removes itself permanently so experienced users keep a clean Home.
2. **Weekly momentum in one line:** the existing collapsed Progress row now says
   sessions completed, fueled days and speed-test status. No new dashboard or
   competing score.
3. **Never-miss-twice recovery:** if a scheduled workout passes unfinished,
   Home promotes the oldest missed session with “Pick up the thread · No reset.”
   Completing it uses the normal player and preserves dates, logs and season
   position — no guilt, silent skipping or destructive restart.
4. **Anonymous funnel signals:** activation steps, activation completion and
   catch-up starts extend the first-party allow-list from Sprint 1. They remain
   session-anonymous and contain no account, health, workout or free-text data.

Regression coverage executes the catch-up decision and the three-signal
activation state, while mobile light/dark browser QA verifies the full Opening
Round hierarchy and accessible labels.

Three features shipped together, aimed at the same goal from three angles:
make the plan *coach itself* (periodization), make progress *feel like an event*
(the speed-test ritual), and make mass gain *provably safe for the swing*
(the mobility pillar). This file records what changed, the design decisions made
along the way, and the follow-ups they open up.

---

## 1 · Real periodization + auto-progression (Train)

**What changed**
- The 20 weeks now run in **6-week waves**: Accumulate (wks 1–3, 7–9, 13–15) →
  Intensify (4–5, 10–11, 16–17) → Deload (6, 12, 18), closing with a 2-week
  **Peak** (19–20). Implemented as a target-transform pipeline
  (`waveFor`/`waveAdjust`/`effTarget`) over the authored week — the base program
  stays one source of truth; the wave is applied at render/log time.
- **Intensify:** big lifts (🏋️) drop ~2 reps (floor 3) so loads climb; hypertrophy
  accessories (💪) drop a set. **Deload:** one set less everywhere. **Peak:** volume
  cut ~half on lifts, one set off speed/rotation work, loads stay heavy.
- **Prescribed loads in the logger:** the weight-input *placeholder* now shows what
  to lift today — last weight + one jump when double-progression triggers, ~60%
  (rounded to 5 lb) on deload weeks, with a one-tap "fill deload loads" button.
  The PREVIOUS column keeps the raw history.
- Hero line shows the phase (`WEEK 7 / 20 · 🏗️ ACCUMULATE`); a banner explains
  any non-accumulate week. Brochure chips and the playbook copy were rewritten to
  describe what the app now actually does (the old "Deload every 6th week" chip
  had no backing logic — that marketing/implementation gap is closed).

**Design decisions**
- **Placeholders, not values.** Auto-writing suggested weights into the inputs
  would save phantom data if the user never trained. Placeholders read as "the
  coach filled in the card" without polluting the log; one tap commits them.
- **Rep shifts skip distance/time work** (`3 × 40 yd` carries) via a plain-reps
  guard, and never touch power drills — those progress by intent/output, not reps.
- Retain mode (goal-driven accessory trim) composes with the wave; the set floor
  of 2 prevents double-trimming below a meaningful dose.

## 2 · Speed Test Day — the biweekly ritual (Train · Home · Stats)

**What changed**
- A guided **speed test** every 14 days: warm-up checklist → 3 max-intent 7-iron
  swings → best-of locked in. Result writes through the existing `logBodyEntry`
  path, so trends, Octane, insights and the leaderboard all feed automatically;
  swing-level detail is kept in a new synced `ff_speedtest` key.
- Result screen celebrates: all-time-PR banner, "+X mph ≈ +2X yards" conversion,
  and a **Share** button (`navigator.share`, clipboard fallback).
- Due-state surfaces in three places: a card on the Speed & Power day (countdown
  when not due), a "Your focus" card on Home (prio just below re-engagement),
  and a button/countdown on the Stats speed chart.
- **Overspeed swings** went from a static optional line to a structured ramp:
  2×5 (weeks 1–2) → 3×5 → 4×5 (from week 9), dropping to 2×5 on deload/peak
  weeks. Copy keeps the honest "modest evidence" framing per
  `CLUBHEAD-SPEED-REFERENCE.md`.
- **Web reminders:** the reminders card on the You tab now appears in browsers/
  PWAs too (previously Capacitor-only). Best-effort local: fires the day's
  training-slot nudge while the app is open/installed (load + visibility +
  15-min tick, once per day). `sw.js` gained `push`/`notificationclick`
  handlers, ready for real server push.

**Design decisions**
- **The test clock counts any newest speed entry**, not just guided tests — an
  onboarding baseline logged today shouldn't immediately demand a retest.
  (Found while testing: the test nudge outranked the mobility screen on day one.)
- Same-tool honesty: copy pushes "same measurement tool every test" rather than
  pretending launch-monitor accuracy.
- **True web push deferred** (recorded follow-up): needs VAPID keys, a
  subscription table, and a scheduled Edge Function sender. The SW handler and
  the UI split are already in place, so shipping it later is additive —
  aligns with ROADMAP Phase 3 ("wire push").

## 3 · Mobility screen — the 5th Octane pillar (Home · You · Train warm-ups)

**What changed**
- A ~3-minute, no-gear **3-move self-screen**: seated trunk rotation, 90/90 hip
  switch, overhead deep squat — each scored Tight/Close/Smooth (0/1/2), total
  0–100, stored in a new synced `ff_mobility` key.
- Joins **Octane as the 5th pillar** (weight 10; the gauge already rescales to
  pillars-with-data, so old users lose nothing until they screen). Stale screens
  (>5 weeks) show "Re-screen due".
- **Warm-up routing:** flagged areas inject targeted moves into the matching day
  warm-ups (trunk → open-book T-spine / thread-the-needle; hips → extra 90/90 /
  adductor rock-backs; squat → deep-squat holds + ankle rockers), pattern-aware
  so a day never gets a duplicate of a move it already has. Injected rows are
  labeled "from your mobility screen".
- Prompted as the **first dashboard focus card** after setup (prio above streak
  nudges, below re-engagement/speed-test), re-due every 4 weeks; also runnable
  any time from the You tab. The onboarding summary step announces it.

**Design decisions**
- **Not a wizard step.** Onboarding already runs 8 steps and promises "under a
  minute"; asking someone to get on the floor mid-signup kills completion. The
  screen lands as the first thing the dashboard asks for instead — same intent
  ("at onboarding"), better funnel.
- **Durability framing, not a speed claim.** The app's own evidence stance
  (flexibility ≈ no speed correlation) is preserved: everywhere the screen
  appears, the copy sells it as "mass should never cost you turn," the exact
  gap none of the competitors (DRVN/GolfForever/Stack) close.
- Tests are original wordings of common-knowledge movement checks — no TPI or
  competitor assessment IP (per COMPETITIVE-LANDSCAPE "borrow vs avoid").

---

## 4 · Design optimization pass (Jul 2026, follow-up to the feature drop)

**What changed**
- **Dark mode.** Generated from the light stylesheet by `scripts/gen-dark-theme.py`,
  which parses every rule, classifies colors by lightness, and emits a
  `@media (prefers-color-scheme: dark)` block (~230 overrides, ~11KB) between
  `GENERATED-DARK` markers in `index.html`. Light backgrounds darken with hue
  kept and saturation capped; dark text lightens; rules already on dark/mid
  surfaces (the hero cards) are left untouched. **Re-run the script after any
  CSS change.** Token audit: `--green-800`/`--green-700` are text-only in light
  mode, so dark mode lightens them; the two rules using `--green-700` as a
  button background are pinned. `color-scheme` meta + root declared so form
  controls follow.
- **Type scale.** Every font-size ≤12.5px bumped one notch (143 declarations;
  new floor 12px) — the 50+ demographic reads hint text, chip labels and the
  logger without squinting. Octane gauge E/F labels bumped and recolored
  `#7fb295 → #9ccfb0` for contrast.
- **Tap targets.** Insight dismiss ×, tip ×, modal ×, history delete grown to
  36–38px; the inline progression buttons ("add 5 lb", "fill deload loads")
  became padded pills instead of bare underlined text.
- **Train tab.** The warm-up/power-primer box now auto-collapses when the
  session already has logged work — a mid-workout reopen lands on the lifts —
  and stays expanded on a fresh day (the "do these first" intent is preserved).
- **One quick-log.** Home and Stats now share a single `quickLogHtml()` block
  (`.qlog`) with identical fields/labels/hint styling. The third copy in the
  old Train "Progress & history" fold was dead code (defined, never called) —
  deleted along with its orphaned click handler.
- **Asset diet.** `logo-dark-mark.png` (rendered at ≤84 CSS px) resized
  1254→256px: 350KB → **7.8KB**. `icon-512` 132→10.5KB, `icon-192` 26→4KB,
  `apple-touch-icon` 24→3.7KB, `og-image` 331→110KB (and dropped from the SW
  precache — only social scrapers fetch it). ~800KB off first load/install.
- **Onboarding step 0** trimmed to brand + one-line promise — the feature
  pitch was re-selling the app to someone who already opened it.

**Follow-up (same week): manual theme control + contrast audit.** User feedback
surfaced unreadable text. A programmatic contrast audit (Playwright walking every
visible text node vs its effective background, both schemes) found four real
issues: `.sb-link` was near-white green on a white card in the Train settings
fold (pre-existing light-mode bug — now `--green-700`, with the light variant
scoped to the dark start banner); the mobile tab bar kept its light rgba
background in dark mode (rgba is skipped by the generator — now a hand pin);
the amber nutrient-timing surfaces use `var(--sand)` (no hex to transform —
`--sand`/`--sand-dark` now overridden in the dark root); and the white-on-gray
"Recover"/"Speed" day tags were under 3:1 in both modes (chips darkened).
An **Appearance setting (Auto / Light / Dark)** was added to the You tab:
`ff_theme` is stored per-device (deliberately not synced), a pre-paint head
script applies it to avoid a flash, and the generator now emits every dark rule
twice — `@media (prefers-color-scheme: dark)` guarded by
`html:not([data-theme="light"])`, plus a forced `html[data-theme="dark"]`
variant (~36KB total). The contrast audit script pattern is worth keeping in CI.

**Deliberate deviations / not done**
- No full px→rem conversion: the type bump addresses legibility directly;
  a rem sweep across ~600 declarations is high-churn for marginal gain. If
  system-font-size support becomes a priority, do it as its own pass.
- Radius normalization skipped: the 10–14px spread reads fine in practice and
  a mechanical change would touch 200+ rules for a subtle win. Revisit if a
  component library is ever extracted.
- Dark mode is system-driven only (no in-app toggle) — matching platform
  convention and keeping settings surface small.

## 5 · Flow redesign (Jul 2026): Player · Today spine · Progress narrative

Three structural features reorganizing the app around *moments in the user's
day* instead of feature categories. Shipped one at a time, each E2E-tested.

**A · Workout Player.** "Start workout" enters a full-screen guided session:
warm-up checklist → power primer → one lift per screen (prescribed load huge
and wave-aware, ± steppers seeded from the prescription, per-set history,
plate math) → auto rest countdown on set completion → recap (volume, e1RM
PRs / first benchmarks, session time, Octane, share). Writes to the same
`ff_log` session as the inline logger, saving continuously; mid-session exit
resumes on the first unfinished lift. *Deliberately always dark* — a focus
mode, identical in both themes, which also keeps it out of the dark-theme
generator's blast radius. The inline logger remains the browse/edit surface.

**B · Today spine (Home).** One dominant **Next-up card** picks the single
most important action (today's session → resume → speed test → mobility
screen → recovery day → banked), then the day renders as a **timeline** in
time order anchored to the user's training slot (weigh-in with live done
state → pre-workout fuel → session → post-workout meal → Game Day jump-off).
A **floating ＋** on every tab opens a bottom sheet: quick log + jump-offs.
Removed: the tile grid, the on-Home log form, the standalone Game Day banner.

**C · Progress narrative (Stats).** The Octane gauge became a **hub** — each
pillar taps open to a drill-in (trend spark, what it means, the one action
that moves it, wired straight into the player/test/screen). The **Season
map** renders the 20-week campaign tee-to-pin: wave phases as colored
terrain, deloads marked, speed tests flying flags with their mph, YOU pinned
to the current week (auto-scrolled into view). The **Sunday Scorecard**
closes each week as a 5-hole golf card (sessions, iron moved, speed test,
weigh-ins, mobility) with status chips and a share action.

Bug found by testing: the scorecard's weigh-in count compared locale date
strings against an ISO week-start (always true) — fixed with timestamp
comparison. Note: the older `thisWeekStats()` has the same latent comparison
for its speed/weight deltas; queued as tech debt.

## 6 · Share cards + event-anchored Peak (Jul 2026)

- **Branded PNG share cards**, drawn on-device with canvas (no servers, no
  loaded assets): dark-green brand gradient, hero number, PR badge, detail
  lines, footer. Used by the session recap, the Sunday Scorecard and the
  speed test. Shares the image file via `navigator.share` where supported;
  falls back to downloading the PNG; last resort copies the text version.
- **🏆 Big event date** (`ff_event`, synced): set on the You tab (date +
  optional name). If it lands inside the 20-week block, the taper re-anchors —
  the event week and the week before become **Peak** (volume cut, intensity
  held, per the playbook's 7–10 day taper) and the week after deloads to
  absorb it; the base cadence continues elsewhere. The Season map flies a 🏆
  at the event week and explains the re-anchor in its footer; without an
  event it invites you to set one.

## 7 · Player round 2 + drill swaps + event UI (user feedback)

- **Speed-day drills are swappable everywhere** ("I don't have or know those
  things sometimes"): the player, the inline logger and the day cards all
  honor `ff_swaps` for drills now — swap a landmine throw for a med-ball
  throw once and it sticks. Swapped drills show the badge and swap their
  stale drill note for the new movement's power cue.
- **Player additions:** per-lift effort chip (RIR + rest for lifts, "max
  intent · full rest" for power work — never RIR-grade a jump), and
  "＋ Add one more lift" on the recap station (inserts a new station and
  lands on it; recap stays last).
- **Big Event selector redesigned** from inline-styled flex soup to labeled
  DATE / NAME fields on a grid, a status note ("Lands in week 4 — weeks 3–4
  become your peak"), and a proper clear button. Verified light + dark.

## 8 · Equipment-aware pickers

`equipNeedsFor(name)` infers required gear for all ~250 library lifts (the
authored `EX` map is authoritative for programmed lifts; everything else by
name pattern, with `machine-any` counting any selected machine). The swap
picker now sorts what-you-own first and groups the rest under a "needs gear
you haven't added — still selectable" divider with per-option needs chips;
the Add-a-lift picker dims and chips unowned options in place. Deliberately
badge-and-sort, never hide: the inference is heuristic and users may have
access to gear they didn't list.

## 9 · Per-exercise history + session notes (the Hevy-parity pass)

- **Exercise history sheet**: tap 📊 on any lift (player station, inline
  logger, or a Stats strength row) → PR badges (best e1RM / heaviest set /
  best session volume, each dated), the e1RM trend chart, and every past
  session's sets — from permanent `ff_history` plus any in-progress `ff_log`
  session (marked "in progress"). All from existing data; presentation only.
- **Session notes**: a notes field on the player recap, saved live with the
  session and carried into `ff_history`; notes surface in the workout-history
  list and on the matching rows of the exercise sheet. Free coaching context
  for the AI coach later.
- **Deliberately skipped from the Hevy checklist**: warm-up/failure set
  types — Yardsmith's warm-ups live in the checklist and never enter the
  log, so e1RM math is already clean without per-set typing. Revisit only if
  users start logging ramp-up sets.

## 10 · Fuel check-off — adherence, not accounting (user-approved design)

The nutrition loop closed WITHOUT becoming a food diary (the docs' anti-MFP
stance holds): the app wrote today's meals, so the user just says whether
they happened. Each meal-plan slot gets ✓ ate it / ≈ close (~75% credit);
a **one-tap day rating** (On target / Close / Off the rails) covers fully
off-plan days so streaks never die for honest reasons — all three design
decisions user-approved (day-rating fallback · Octane pillar now · 
qualitative-first with numbers on tap).

- Data: `ff_fuel` (synced), ISO-date keyed, slot count stored at log time so
  past days score correctly if meal count changes; pruned at ~95 days.
- Fuel tab: "Today's fuel" summary card — qualitative line ("2 of 5 down —
  Dinner is your biggest block left"), 🔥 fuel streak, "Show the numbers"
  toggle (banked kcal/protein vs targets), off-plan rating chips.
- Today timeline: pre/post-workout rows are now one-tap fuel toggles.
- Sunday Scorecard: hole 6 "Fuel days N/7" (ON PLAN / BUILDING / LOG FUEL).
- Octane: **Fuel is the 6th pillar** (weight 10, avg of last 7 logged days
  in a 14-day window; gauge rescales so nobody's score moves until they log).
- The metabolism check-in remains the quantitative auditor — lazy "on
  target" taps get corrected by the scale within ~3 weeks.

## 11 · Modularization — src/ tree + committed build outputs

Why: the single-file index.html had grown past 7,000 lines / ~560 KB. Every
feature edit meant amending one giant file, and because HTML is fetched
network-first by the service worker, every visit re-downloaded the whole app
even when nothing changed.

- **Source of truth moved to `src/`**: 18 numbered JS modules in `src/js/app/`
  (split on the section banners the monolith already had), SW registration in
  `src/js/global/`, `src/css/styles.css`, `src/index.template.html`,
  `src/sw.template.js`. See CLAUDE.md for the edit → build workflow.
- **`scripts/build.mjs`** concatenates the app modules into ONE IIFE (shared
  scope preserved — zero refactor risk, no import/export rewrite) and stamps a
  sha256 content hash into every `{{V}}` placeholder.
- **Committed outputs, zero-build deploy unchanged**: index.html (23 KB,
  markup only), app.js (386 KB), styles.css (169 KB), sw.js. GitHub Pages and
  Capacitor keep serving plain files.
- **Performance shape change**: the network-first document dropped
  ~560 KB → 23 KB; app.js/styles.css are cache-first with hash-busted URLs, so
  a repeat visit re-downloads code only when the code actually changed.
- **Manual version bumps eliminated**: the SW cache name and app asset `?v=`
  pins now derive from the content hash (previously hand-bumped v121→v133 —
  an error-prone ritual). cloud-sync.js / coach.js keep manual pins.
- `scripts/gen-dark-theme.py` retargeted to `src/css/styles.css` (plain CSS
  now, no `<style>` extraction); deploy.yml excludes `src/`; build-www.mjs
  allow-list gained app.js + styles.css.
- Full Playwright regression (e2e, player, today, fuel, narrative, exhist,
  equipswap, theme matrix, contrast audit) re-run against the BUILT output —
  all green, zero console errors.

## 12 · Motion system — the physics layer (premium-feel pass 1 of 3)

Diagnosis: the app behaved premium but didn't feel it — every interaction was
instant, and instant reads as cheap. This pass adds ~200ms of physics to the
moments that matter, all in a new `src/js/app/007-motion.js` + one CSS block.

- **Tab switches cross-fade** via the View Transitions API (160ms, quick and
  quiet), with a plain-swap fallback for browsers without it.
- **Numbers count up.** Any element rendered with `data-countup` animates
  0 → value with an ease-out curve; the final value is in the markup, so if
  motion is off the number is simply there. Applied to the Octane gauge digit
  and the recap's "lb moved" / sets stats. A single debounced MutationObserver
  animates whatever a render produces — no per-render wiring.
- **The Octane arc sweeps** E → score (0.9s) instead of appearing pre-filled.
- **Every overlay arrives the same way**: scrim fades (180ms), sheet springs
  up with a slight overshoot (300ms) — swap picker, quick-log sheet, exercise
  history; the Workout Player and its recap rise in.
- **PR celebration**: the first time a session's recap shows a PR, a 1.4s
  confetti burst (brand greens + gold, self-removing canvas) + a haptic
  triple-tick. A moment, not a light show.
- **Haptic ticks** (`navigator.vibrate`, Android; silently ignored on iOS
  web): set checked off (12ms), PR (25-45-25). Rest-timer end already buzzed.
- **`prefers-reduced-motion` kills all of it** — one global media query zeroes
  every animation/transition, count-ups render final values immediately, and
  confetti/haptics are gated off.
- Press states were already a consistent per-button idiom (47 `:active`
  rules) — left as-is.
- Testing note: all Playwright suites now set `reducedMotion: 'reduce'` so
  number assertions can't race count-ups; a dedicated test-motion.mjs verifies
  the animated path (mid-flight state, settle-at-target, sweep, confetti
  lifecycle, sheet keyframes) and the reduced-motion off-switch.

## 13 · Icon chrome — SVG strokes replace emoji in the controls (premium pass 2a)

The "middle path": emoji stay in coach COPY (personality lives in the words);
the CHROME — tab bar, headers, buttons, chips — gets a consistent inline-SVG
stroke set. Why: emoji are rendered by the OS, so the app looked different on
every device, couldn't be tinted to brand green, and didn't dim in dark mode.

- `src/js/app/006-icons.js`: 15 icons on a 24-unit grid, 2px round stroke,
  `currentColor` → they inherit text color and theme for free. `ffIcon(name,
  size, cls)` returns the inline SVG string.
- Converted chrome: mobile tab bar (home/fuel-pump/barbell/chart/user, inlined
  in the template), Octane header (gauge), exercise purpose chips everywhere
  (barbell/dumbbell/bolt/rotate via `ffPurposeIc()` — `purposeFor()` still
  returns its emoji token because logic compares on it; only the render maps
  to an icon), every ▶ CTA (filled play triangle — outline read weak at 13px),
  share buttons, quick-log sheet actions (barbell/target/compass), speed-test
  and mobility headers, player Why/History/Swap buttons (info/history/swap),
  fuel streak (flame), "Your day" headers (calendar).
- Kept as emoji: coach tips, insight copy, wave labels (🔥 INTENSIFY), toasts,
  recap PR banner (🚀), plate-math hint — anywhere the emoji is part of a
  sentence rather than a control.

## 14 · Display numerals — hero numbers get an instrumentation face (premium pass 2b)

This is a numbers product, but 252 yds / 83 mph / Octane 43 rendered in the
same system font as body copy. Hero figures now use **Barlow Condensed
SemiBold** (OFL, DIN-derived — motorsport/instrumentation DNA that fits the
Octane metaphor).

- `fonts/ffnum.woff2` — ~12KB self-hosted subset (basic latin + a few symbols,
  so "83 mph" and "E/F" stay one voice; no external font hosts, CSP-clean).
- `@font-face` with `font-display:swap` (numbers never block on the font) +
  `<link rel="preload">` so it's usually there before first paint; added to
  the SW asset cache and the Capacitor `www/` bundle (fonts/ dir).
- Applied to: driver-carry hero, Octane gauge digit, player recap "lb moved" +
  stat tiles, rest timer, speed-test and mobility result numbers, and the
  Fuel macro grids (kcal/day, per-macro grams).
- Condensed metrics: negative tracking tuned for system-ui reset to ~0, and
  sizes bumped (58→66px hero, 34→38 gauge, etc.) so the narrower face keeps
  its presence.

## 15 · One-sheet interaction model — drag physics on every overlay (premium pass 3a)

Every bottom sheet in the app now responds to touch the way a native app does:
grab the header, the card follows your finger (scrim dims proportionally),
flick or drag past ~30% and it dismisses with momentum, release early and it
springs back. The drag handle pill appears on every sheet head.

- `src/js/app/008-sheets.js` — one pointer-event controller covers all three
  overlay shells: the `.swap-card` family (swaps, add-lift, exercise history,
  demos, speed test, mobility, food prefs, week plan), the workout-logger
  `.modal`, and the quick-log `.qsheet-card`.
- Key design decision: dismissal ends with a synthetic click on the sheet's
  scrim — every overlay already closes on `e.target === root` — so each
  feature's own cleanup (body scroll locks, state resets, re-renders) runs
  untouched. Zero rewrites of feature open/close code.
- Drag starts only from the header/handle (never content), so scrolling sheet
  bodies never fights the gesture; `touch-action:none` on heads hands the
  vertical gesture to the controller. Buttons in heads (×) still tap.
- The Workout Player is deliberately NOT draggable — it's a mode, not a panel.
- test-sheets.mjs: flick dismisses + style/scroll-lock cleanup, small drag
  snaps back, drag close runs feature close paths, × and scrim-tap unchanged,
  handle pill rendered, `.modal` shell drags too.

## 16 · Scrubbable trend charts (premium pass 3b)

The trend curves went from a report to an instrument: touch any chart and a
crosshair + readout follow your finger — `83 mph · Jun 29` — across the whole
series. Release and it fades. The value renders in the numeral face.

- `pcLine()` upgraded in place (all three callers inherit): Catmull-Rom → cubic
  bezier smoothing (clamped so overshoot can't poke outside the plot), the
  existing gradient fill kept, and a scrub layer (`.pcwrap` wrapper carrying
  values/labels/unit in data attributes + one delegated pointer controller).
- Wired with real dates: Stats speed chart (mph) and bodyweight chart (lb) from
  ff_body entries; the exercise-history sheet's e1RM chart (lb) from session
  dates. Tiny sparklines (lift rows) stay static — too small to scrub.
- touch-action:none on charts so a scrub never fights page scroll; readout
  clamps inside the plot; nearest-point snapping, not interpolation — you read
  entries you actually logged.

## 17 · Fix: Octane drill-in actions were dead on the Progress view

User-reported: "Go lift ›" (and "Open this week ›" / "Open today's meals ›")
did nothing. Root cause: `[data-goview]` navigation was only handled by the
DASHBOARD's local click listener — the Progress view's listener never handled
it, so drill-in action buttons fell through silently. (The speed/mobility
actions "worked" only because their modals listen at document level.)

Fix: one document-level delegated navigator next to `setView()` — any
`[data-goview]` button now works on every view, current and future; the
dashboard-local duplicate removed. Lesson recorded: feature-local click
listeners quietly don't compose — cross-view actions belong on `document`.

## 18 · The whole day on Home — every meal is a checklist row (user request)

User: "shouldn't the macro check-off be on the Home screen in the daily
checklist?" Yes — the daily loop lives on Home; switching to the Fuel tab to
check meals broke it.

- The "Your day" timeline now renders EVERY meal from today's plan
  (`ffSchedule`) as a one-tap check-off row at its planned time — label,
  protein/carb line, "tap when eaten" → "Banked ✓ — tap to undo" — time-sorted
  around the weigh-in and training block. Rest days get the meal rows too
  (fuel matters most on growth days).
- A "N/M meals" chip sits in the timeline header (gauge icon, fills green when
  complete) and jumps to the Fuel tab — which remains the detail view:
  numbers-on-tap, off-plan day rating, streak.
- Same `data-fuelmeal` indices and `ff_fuel` writes as the Fuel tab — the two
  surfaces are views over one store, verified in-sync both directions.
- Schedule slots now carry raw time (`t`, hours) so the timeline can sort;
  when no meal plan has been built yet, the old generic pre/post guidance rows
  remain as the fallback.

## 19 · One-day shopping list collapses (user request)

The shopping list is a scan-later artifact, not a daily read — it now renders
as a collapsed `<details>` fold ("🛒 Shopping list · one day · N items") using
the app's existing fold idiom, so the Meals card ends at the day-total instead
of a long ingredient list. Tap to expand; the weekly sheet is unchanged.

## 20 · Fix: fuel check-off missing for foods-you-love users (user-reported)

The check-off UI (Today's-fuel summary with the 3 day-rating chips + the ✓/≈
buttons per meal) only rendered on the GENERIC meal schedule — the branch shown
before a user picks favorite foods. Anyone who had picked foods got the
upgraded "Your Meals" cards with no check-off at all. Found because the owner
uses food prefs; the earlier verification seeded a prefs-less user.

- The foods-you-love meal cards now carry the same summary card and per-meal
  ✓/≈ buttons. Each food-built meal is mapped to its schedule slot (label
  match, pre/post-aware, first-unused for duplicate "Snack" names) so the
  check-offs write the SAME ff_fuel indices as the schedule and Home timeline.
- ffFchkHtml() extracted as the one shared ✓/≈ renderer.
- Checked cards fade + strike; verified in-sync with the Home chip both ways.
- Testing lesson recorded: seed BOTH user shapes (with and without food prefs)
  — the Fuel tab renders a different tree for each.

## 21 · "Your Meals" is labeled as a sample (user request)

The foods-you-love day read like a prescription. It now says what it is:
header "An example day — N meals from foods you love" plus a one-line note —
"This is a sample that hits your numbers — eat it as written or anything
close, and still check it off. The macros are the assignment, not the menu.
Shuffle deals another day." Keeps the adherence model honest: ✓ means "I ate
this or its equivalent," which is exactly how the scoring treats it.

## 22 · Fuel-day cleanup — time order, one reference fold, one reward (user-reported)

User: workout snacks out of order on the sample menu; the daily success
experience needed tightening. Three fixes:

- **The example day renders in schedule order** — the day as you'll live it
  (pre-workout before breakfast on a morning-training day), each meal stamped
  with its planned time. Was: the food generator's build order.
- **The recovery meal anchors to the actual post-workout slot** from the
  schedule (morning lifters recover at breakfast, evening lifters at dinner)
  instead of a fixed position in the meal list — composition (fast carbs) and
  the "post-workout recovery" tag now land on the right meal.
- **The carb-timing block folds to one line** ("🕒 Carb timing · 60g pre ·
  120g post") once the user has built the day from their foods — the same
  info is embedded in the meal order and tags; stays expanded for new users.
- **"✓ Day banked"**: when every meal is checked (or the day is rated
  on/close), training or recovery is done, and the weigh-in is logged, the
  Home timeline's meals chip becomes the day's completion marker and links to
  Progress.

## 23 · Fold swap — timing expanded, example day collapsed (owner's call, correct)

§22 folded the carb-timing block and left the meal list expanded. The owner
flipped it, and he's right: what earns permanent screen space is what changes
behavior TODAY. The pre/post carb block is the daily actionable (short, tied
to training time); the sample menu is reference material (long, read once).

- Timing block: always expanded again.
- "An example day" is now a collapsed fold containing the sample note, the
  time-ordered meal cards (checks inside), day totals, the shopping fold and
  the Shuffle/Coach/Week/Edit actions. Its header carries live progress —
  "4 meals · from your foods · 2 ✓" — so it reads as a checklist even closed.
- "Today's fuel" (status line + 3 rating chips) stays visible above the fold.
- Division of labor is now clean: HOME is where you live the day (timeline
  check-offs), FUEL is where you manage and review it.

## 24 · Phone-width polish on the fuel folds (user screenshot)

On a real 390pt phone the new layout wrapped ugly: the example-day fold row
squeezed its title and sub onto cramped broken lines, and the "Your Meals"
header wrapped the meals/day picker onto a second row inside the gradient.

- Fold row: title nowraps, sub shortened to "N meals · n ✓" (the "from your
  foods" detail lives inside), sub ellipsizes instead of wrapping, row padding
  bumped — reads as one clean line.
- Meals header: under 480px the "meals/day" text label hides (the 3/4/5/6
  segment is self-explanatory), the segment tightens, and the header is pinned
  to one row.
- Testing note: layout verified at 390×844 dark — the owner's actual viewing
  conditions — not just the 420px harness default.

## 25 · "Today's fuel" gutter fix (user-reported)

The card carried its own 14px side margins on top of the meals body's 16px
padding — inset 30px while the example-day fold sat at 16px, so it read as a
small box floating inside a box. Leftover spacing from the container it was
originally designed in. Side margins zeroed to share the fold's gutter,
padding evened, and the status line ("4 of 5 down…") bumped to 14.5px — it is
the tab's primary readout.

## 26 · Count labels: the pre-workout snack is not a "meal" (user-reported)

With 4 meals/day the schedule has 5 check slots (the pre-workout snack is its
own slot), and every count said "meals" — technically wrong, as the owner
noted. The snack SHOULD count toward the day (it's fueling you check off);
the labels now say what's being counted:
- Home chip: "2/5 fueled" (was "2/5 meals")
- Example-day fold: "4 meals + pre · 2 ✓"
- The summary's "4 of 5 down" is unit-less and stays.

## 27 · Round Debrief — the gym-to-course loop closes (the golf feature)

The whole app pointed at the course and then looked away: waves peak you for
an event, speed tests every two weeks, round-day fueling — and no record that
the golf ever happened. This is the feature only Yardsmith can own: Arccos
tracks the course but not the gym; Hevy tracks the gym but not the course.

- **A ~20-second post-round ritual** (swap-card sheet — inherits drag physics
  + entrance): score (optional), longest drive, driving feel (bombing it /
  normal / short), and the question no golf app asks — how did the BODY hold
  up? (strong all 18 / faded late / gassed). Stored in new synced `ff_rounds`
  (cloud-sync KEYS + pin bump to v106), capped at 60 rounds.
- **Course data feeds the engine**: the longest drive writes into the
  driver-carry trend via the existing `logBodyEntry` path — the Home hero
  number is now fed by actual golf. A new on-course best fires the PR
  celebration (confetti + haptic + "that's the gym showing up" toast).
- **Entry points**: quick-log sheet action, Game Day CTA ("Just played? Log
  your round — 20 seconds" → "✓ Round banked"), and the Home timeline round
  row flips to "Round banked ✓ — shot 86 · 265 yd bomb · finished strong".
- **Stats: "On the course"** — best on-course drive (numeral face), the
  stamina story ("2 of 3 rounds finished strong — fading late is a fuel +
  conditioning problem; both are in the plan"), last 3 rounds, log button.
- Follow-ups queued: scorecard hole for rounds; deload-week vs energy
  correlation once data accumulates; round count into Octane consistency.

## 28 · Base input styling covered only number/select (user-reported via Big event)

The polished input style targeted `input[type="number"], select` — every
`type="text"`, `date`, and `time` input rendered with raw browser defaults
(on iOS: the grey centered mini-pill). That's what made the Big event date/
name fields look wrong; the Game Day tee-time and leaderboard handle had the
same gap. Base rule extended to text/date/time (+ focus ring), with the iOS
quirks handled: `-webkit-appearance:none`, left-aligned
`::-webkit-date-and-time-value`, 47px min-height, 16px font (no zoom-on-focus).

## 29 · Player: set values carry forward (user request)

Set 1's weight and reps now flow through the exercise the way Hevy does it:
- Later empty sets GHOST the nearest earlier set's values as placeholders
  (kept as placeholders, not values, so unchecked sets never inflate volume
  or fire phantom PRs — the recap counts any set with w+r).
- Tapping ✓ on an empty set commits the carried values — one tap repeats
  the work.
- The +/− steppers on an empty later set start from the carried value
  (205 → tap + → 210), not the prescription.
- "Nearest earlier" beats "set 1": bump set 3 to 215×5 and set 4 inherits
  215×5. First set with no session data still seeds from the prescribed
  load, unchanged.

## 30 · Catalog: machine + plate-loaded presses (user request)

Added to the exercise catalog (swap picker + add-lift picker, both driven by
EXERCISE_DB): **Machine Incline Press**, **Plate-Loaded Incline Press**,
**Plate-Loaded Chest Press** (chest group) and **Plate-Loaded Shoulder Press**
(shoulders group). Equipment inference extended so machine/plate-loaded
incline+chest presses gate on the chest-press machine toggle and the shoulder
variant on the shoulder-press toggle — own-gear-first ordering and the "not
in your gym" flag apply automatically.

## 31 · Exiting a live workout now PAUSES it (user request)

Exiting mid-session always preserved the data (sets save continuously), but
nothing said so, and the session clock kept running while you were away.

- **The clock stops.** On exit, elapsed active time banks into the session
  (`activeMs`); the recap's "session time" is banked + current stint, so a
  workout split around an errand reports honest minutes.
- **A paused bar follows you.** A slim mini-player bar ("⏸ Workout paused —
  Lower · 12 sets done · ▶ Resume") sits above the tab bar on every view
  until the session is resumed or finished. Tap = resume exactly where you
  were (values intact, first unfinished lift). The FAB lifts out of its way.
- Lifecycle: set on exit-with-unfinished-work, cleared on resume/finish, and
  self-heals if the session was completed elsewhere (inline logger). Kept in
  device-local storage — a pause is an activity of THIS phone, not synced
  state. Refreshes on ff-data-changed.

## 32 · Player: reorder lifts + remove sets mid-workout (user request)

- **Reorder**: hold the exercise name (~550ms, haptic tick) and a sheet lists
  today's lifts — drag a row (live swap as you cross) or tap ↑/↓. The session
  order, stations, saved log and inline logger all follow; the player keeps
  showing the lift you were on. Done lifts show struck-through.
- **Remove a set**: hold a set row to remove THAT set, or use the new
  "＋ Add set / − Remove set" buttons under the sets (remove takes the last).
  The last remaining set is protected ("swap or remove the lift instead").
  A hint line under the sets teaches both holds.
- buildSession returns the saved session verbatim, so reordering and set
  counts survive close/reopen without any migration.

## 33 · Fix: bottom bar stranded mid-screen on iOS (user screenshot)

`position:fixed; bottom:0` elements (tab bar, FAB, pause bar) get left
floating mid-air on iOS after the on-screen keyboard closes — the visual
viewport shrinks and Safari doesn't re-anchor fixed elements. Now the app
tracks `visualViewport`: while the keyboard is up the pinned bars hide
(`body.ff-kb` — they shouldn't sit above a keyboard anyway); on close, a
one-frame transform nudge forces the compositor to re-anchor them. Also
fires on focusout as a belt-and-braces.

## 34 · HOTFIX: keyboard detector hid the bars without a keyboard (user-reported, urgent)

§33's keyboard heuristic — `innerHeight - vv.height > 60` — misread pinch-zoom
(which shrinks vv.height with no keyboard) and low-threshold viewport shifts
as "keyboard open", sticking `body.ff-kb` and hiding the tab bar, FAB and
pause bar with no way back. Mid-workout, that read as "the bar is gone."

Detector rebuilt on three conditions, all required: (1) an editable element is
actually FOCUSED, (2) `vv.scale < 1.15` and gap computed as
`innerHeight − vv.height × vv.scale` so zoom mathematically cancels out,
(3) gap > 150px (real keyboards are 250+; 60 was in URL-bar-collapse range).
Plus a failsafe: any tap while ff-kb is set with no field focused re-syncs
immediately — the hide class can never outlive its cause.

Lesson recorded: a heuristic that HIDES navigation needs a positive signal
(focused field), not just a geometric one.

## 35 · Root cause of the floating bars: the page was ZOOMED (user-reported)

"Still floating as I scroll" after §34 pinned it: once iOS pinch- or
double-tap-zooms a page even slightly, position:fixed elements stop tracking
the visual viewport and drift while panning. The workout player made
accidental zoom easy — RAPID +/− STEPPER TAPS read as double-tap-zoom.

Fix — the app now behaves like an app, not a document:
- `html{ touch-action: pan-x pan-y; }` blocks pinch-zoom and double-tap zoom
  while leaving scrolling untouched (per-element touch-action for charts,
  sheet heads and reorder rows still overrides locally);
- `button/input/select/textarea/a { touch-action: manipulation; }` kills the
  double-tap-zoom path on every control (and the 300ms tap delay with it);
- `maximum-scale=1` added to the viewport meta as belt-and-braces.
Recovery for an already-zoomed session: double-tap once or reopen the app.

## 36 · Share cards: no website link (user request)

The PNG footer read "fairwayfuel.app · Turn muscle into distance" — sharing a
PR to friends shouldn't look like an ad. Footer now reads "Yardsmith · Turn
muscle into distance ⛳" (brand, no URL), and the share/clipboard text
fallbacks dropped the https link too ("— training with Yardsmith ⛳").

## 37 · The hype pack — live PRs, milestones, PR Wall (user request: "I need some motivation")

- **Live set-level PRs.** The moment a checked set beats your all-time e1RM
  for that lift: confetti + haptic + toast ("🚀 e1RM PR — Romanian Deadlift
  294 lb. New ceiling.") and a gradient PR badge pinned to the station. Fires
  once per lift per session, only on a NEW ceiling — no confetti fatigue. The
  recap moment stays.
- **Milestones.** Finishing a session checks two lifetime ladders — sessions
  banked (5·10·25·50·75·100·150·200·300) and iron moved (50k → 2M lb) — and
  celebrates crossings ("🏆 25 sessions banked — that's a habit, not a
  phase."). Celebrated levels stored per device so each fires once.
- **🏆 PR Wall on Stats** (top of the trends): top-3 lift e1RMs with dates,
  7-iron speed best, longest drive, biggest single session, and a lifetime
  line ("Lifetime: 21,000 lb moved · 4 sessions banked") in the numeral face.

## 38 · Floating bars, round 3: pin to the VISUAL viewport (user-reported)

Blocking zoom (§35) prevents new zoom but can't un-zoom an already-zoomed
standalone session — and the nudge hack didn't help there. New approach
attacks the symptom directly: on every visualViewport resize/scroll (and
window scroll), the pinned bars are translated to the VISIBLE bottom
(`dy = vv.offsetTop + vv.height − innerHeight`, rAF-throttled). In a healthy
viewport dy=0 and it's a no-op; zoomed, mid-pan, or post-keyboard, the bars
stay glued to the bottom of what you can see. Phones only (≤760px); the
desktop pause-bar centering moved from transform to margin so the pinner owns
the transform channel. Relaunching the installed app still resets zoom fully.

## 39 · Sync trust: visible sync health + backup/export (make-it-great #1 of 3)

**Why.** `cloud-sync.js` swallowed every error silently (recorded tech debt) —
a persistently failing push would only be discovered the day a new phone came
up empty. And all data lived in localStorage + one cloud blob with no copy the
user owns.

**What.**
- `cloud-sync.js` now records every push/pull outcome to `ff_sync_status`
  (device-local, deliberately NOT in the sync `KEYS`) and dispatches
  `ff-sync-status`. The record keeps `okTs` (last *good* sync) through
  failures. Pin bumped to `?v=107`.
- Account hero (signed in) shows a live line: "☁ Synced · 2 min ago" →
  "⚠ Sync failing — last good sync 1 hr ago" (amber `.acct-synced.warn`,
  hero variant `#ffd28a`). The `ff-sync-status` listener updates just the
  line in place — no full re-render while the user is mid-edit in the card.
- New "💾 Backup & export" Account card: **Export** writes
  `yardsmith-backup-YYYY-MM-DD.json` (`{app,kind:"backup",version,exported,
  data:{every ff_* key + fairwayfuel}}`) — share sheet on iOS (a[download]
  is unreliable in installed PWAs), anchor download elsewhere. **Restore**
  file-picks a backup, validates it looks like one, confirms (copy notes the
  cloud merge keeps workout history), writes keys, fires `ff-data-changed`,
  reloads. Garbage files are rejected without touching data.

**Verified** (test-backup.mjs): signed-out card copy, ok→warn live flip,
export parses with correct keys, restore round-trip survives reload,
bad-file rejection. e2e suite green.

## 40 · Real web push — reminders with the app closed (make-it-great #2 of 3)

**Why.** Every retention mechanic built this year (streaks, milestones, Day
banked) only fires if the user opens the app. This was the recorded Phase-3
follow-up: "true web push deferred… needs VAPID keys, a subscription table,
and a scheduled Edge Function sender."

**Design: the server never understands the plan.** On every app open (and on
login / training-time / frequency change) the client writes its `push_subs`
row with tz, training-slot hour, and a **7-day schedule of day-aware messages**
(`ffPushWeek()` — same copy as the Capacitor local reminders). The hourly
`push-daily` Edge Function just sends "today's entry at the user's hour".
A schedule with no entry for today means the app hasn't been opened in a week
— exactly when the function switches to its re-engagement fallback copy.
One send per local day (`last_sent`), 404/410 prunes the row.

**Pieces.**
- `cloud-sync.js` (pin `?v=108`): `FF.pushKey` (VAPID public key),
  `FF.pushSave` (upsert own row), `FF.pushRemove`. Private key is in Edge
  Function secrets only — never committed.
- `080` module: "Turn on reminders" upgrades to `pushManager.subscribe`
  when signed in + backend configured; falls back to the open-tab path
  otherwise (and on subscribe failure). Toggle-off deletes the row and
  unsubscribes. `ffWebNotifCheck` skips while push is live (no double-notify).
  Card copy advertises "delivered even when the app is closed" / nudges
  sign-in when that's the missing piece.
- `supabase/schema.sql`: `push_subs` + own-row RLS + touch trigger +
  commented `cron.schedule` snippet. `supabase/functions/push-daily/index.ts`
  (npm:web-push, x-cron-secret guard, per-tz hour matching via Intl).
  `config.toml`: `verify_jwt=false` (paddle-webhook pattern).
- `scripts/gen-vapid.mjs` mints a keypair (prints, never writes).
  `PUSH-SETUP.md`: the ~10-minute dashboard checklist (table → deploy →
  secrets → pg_cron) + a curl-based verification path.

**Server setup is a one-time user action** (needs dashboard access; secrets
can't ship in a public repo). Until then the client detects the absence and
behaves exactly as before.

**Verified** (test-push.mjs, stubbed pushManager + FF backend): subscribe
passes a 65-byte applicationServerKey and saves endpoint/keys/tz/hour + a
7-day week with train AND rest copy on local dates; training-time change
re-saves with the new hour; local fallback skipped while push on; toggle-off
removes row + unsubscribes. Edge Function TS syntax-checked with esbuild.

## 41 · Receipts — training ↔ round correlations (make-it-great #3 of 3)

**Why.** The thesis is "train like a bodybuilder → hit it further," and the
app now logs both sides (sessions + rounds) but never proved the connection
back to the user. This was the queued §27 follow-up ("deload-week vs energy
correlation once data accumulates").

**What.** `rdInsights()` in 082 computes up to three findings from the user's
own data, rendered as a "Receipts" block in the Stats "On the course" card:
1. **Scoring trend** — first-3 vs last-3 scored rounds (needs 5+ scored;
   ±2 strokes to speak). Improvement AND regression copy.
2. **Fresh legs** — avg drive within ≤2 days of a logged session (ff_history
   ts) vs 3+ days out (needs 2+ rounds per bucket, ≥5 yds gap; copy flips
   direction if more rest wins).
3. **Deload freshness** — avg drive in deload/peak weeks (`waveFor` on the
   round's plan week) vs loading weeks (same gates).

Every insight is gated on sample size AND effect size so the card never
dresses noise up as a finding; under 5 rounds a dashed "keep logging — at ~5
rounds this card starts showing receipts" hint sets the expectation instead.
Rounds resolve to days via `ts` (fallback: parsed `date`), weeks via
`planStart()`.

**Verified** (test-receipts.mjs): engineered 6-round seed fires all three
with correct arithmetic (checked by hand); 1-round seed shows the hint and
zero findings; light + dark screenshots reviewed; zero page errors.
Gotcha re-learned: Stats trend cards (course card included) sit behind the
`hasAny` gate — seeds need a body/log entry.

## 42 · Calm pass A — Home answers one question (user's friend: "a lot of info all at once")

**Why.** Outside feedback: the app isn't unintuitive because features are
wrong — every tab opens with everything it knows, so nothing reads as the
priority. Fix is progressive disclosure, not removal. Pass A of three
(Home → Stats → empty states).

**What.** `timelineHtml()` rebuilt on an entries model:
- **Done items fold** into one dashed "✓ N banked · show" pill (tap toggles;
  session-only state, so the calm default returns each visit).
- **Exactly one full card** — the first undone item in time order (the
  "what do I do right now?" answer) — keeps its subtitle and the pulsing
  `now` dot.
- **Everything else goes slim**: time + icon + title + chevron, one line.
  Same `data-` attributes on every row, so slim meals still check off with
  one tap (verified: tap moves the row into the pill count and re-renders).

CSS: `.tl-donepill`, `.tl-item.slim` compact variants; dark theme
regenerated. No data or handler changes — pure ink reduction.

**Verified** (test-calm-home.mjs): default = 1 full/`now` card + slim rest +
pill; pill toggles done rows in/out; slim meal tap banks it; zero page
errors; 390×844 light+dark screenshots reviewed. (Test-seed gotcha: profile
`goal` must be a real GOALS key — 'leanbulk', not 'lean'.)

## 43 · Calm pass B — Stats folds to headline rows

**Why.** Stats had grown to ~10 full-height cards — a wall of everything.
Pass B of the calm pass: every card folds to one line (title · headline
stat · chevron), expanding on tap.

**What.** New fold system in 085 (`pfIsOpen`/`pfHead`/`pfCard` + document
`data-pftoggle` handler): state in `ff_statsfold` (device-local, NOT
synced — like theme). The stat renders only on the CLOSED row (the open
card says it bigger). `openCls` preserves special containers (dark
`pcard season`, dashed `scorecard`). Defaults: **Octane hub and quick-log
never fold, Speed opens**, everything else starts closed — first paint is
hub + speed trend + 8 quiet rows.
- Converted: speed / strength / bodyweight / consistency (inline),
  PR Wall (070), course card (082), season map, Sunday Scorecard,
  leaderboard (seg moved into the body; **loadLeaderboard only fires when
  the fold is open** — no network for a closed row).
- Closed-row stats carry the headline: "84 mph ▲ +4", "266 yds · 1 round",
  "263 lb best e1RM", "Wk 9/20 · Accumulate", "0/4 sessions", "▲ N bests".
- 390px: closed titles ellipsize (`.pf-closed .pc-t`), `pf-side` no-shrink;
  Sunday title trimmed to "Wk N".

**Verified** (test-calm-stats.mjs): defaults (8 closed + speed open + hub +
quick-log), expand persists across view changes via ff_statsfold, speed
collapses to its stat row, lb lazy-loads only when opened, season/scorecard
containers intact when open; e2e + receipts suites green (receipts test now
opens the course fold first). Follow-up noted: Home "Week so far →
Leaderboard" button lands on Stats with the lb fold closed — consider
auto-opening it from that entry point.

## 44 · Calm pass C — empty states earn their place

**Why.** A user without data saw a stack of "log X and this appears"
placeholder cards — six promises shouting at once. Cards should *appear as
you earn them*.

**What.**
- New `lockedStrip()` in 085: everything without data collects into ONE
  dashed "🔓 Unlocks as you log" card — icon, name, and the action that
  earns it, each row deep-linking (`data-speedtest`, `data-roundlog`,
  `data-goview="plan"`).
- `prWallHtml` and `courseCardHtml` now return `''` with no data (their
  pc-need placeholders deleted); renderProgress detects the empty string
  and adds the strip row instead. Inline cards (speed / strength / weight /
  consistency) branch to the strip on empty. The `hasAny=false` "No trends
  yet" card is gone — the strip IS the empty state.
- Home: "Week so far" recap hides until any session or body entry exists
  (next-up card is the fresh-user guide).
- Bodyweight single-entry copy tightened ("One more weigh-in and the trend
  line appears").

**Verified** (test-calm-unlock.mjs): fresh user → zero pc-need placeholders,
zero empty-cards, one 4-row strip; the speed row opens #stModal; partial
data (speed+weight only) → speed card open + weight row + PR Wall row
(legitimately earned via speed best) + 3-row strip for course/strength/
consistency; Home recap hidden fresh. e2e suite green; light screenshots
reviewed.

## 45 · The intuitive pass — glossary, one log door, gesture hints, the loop

**Why.** The calm pass fixed density; this fixes predictability — the other
half of the friend's feedback. Three gaps: invented vocabulary nobody
explains, the core "log something" verb scattered across doors, and
invisible gestures.

**What.**
- **Glossary (new `009-glossary.js`).** 12 terms (Octane, banked, iron
  moved, e1RM, season, waves, deload, Sunday Scorecard, receipts, carry,
  speed test, power-to-weight) in `FF_TERMS`; `ffTerm(key,label)` renders a
  dotted-underline span; tap → one-sentence bottom sheet → "See all terms"
  full dictionary. The 009 document listener registers before every other
  and uses `stopImmediatePropagation`, so a term tap inside an interactive
  parent (Home hero goview button, Stats fold header, scorecard row) opens
  the sheet WITHOUT triggering the parent — verified both ways. Wired:
  hero Octane, Octane hub header, scorecard "Iron moved"/"Speed test",
  receipts header, strength-card e1RM foot, Train wave banner.
- **One log door.** The FAB is now a labeled "＋ Log" pill; its sheet
  ("＋ Log anything") gains the missing verb — "Check off a meal" showing
  the next unchecked meal — so workout/meal/weight/speed/round all live
  behind one predictable button. (Sheet's element listener fires before
  030's document check-off handler; it just closes + toasts.)
- **Self-retiring gesture hint.** The player's "hold to reorder / remove"
  hint now renders only until the first successful long-press
  (`ff_hint_press`, set inside the 550ms timer callback).
- **The loop.** `ffLoopHtml()` — weigh in → train → eat → play & log →
  Octane climbs → repeat — added to onboarding's final screen and to a
  "🔁 How Yardsmith works" sheet from the You tab (next to the new
  "📖 What the terms mean" button). Styled for light sheets AND the dark
  onboarding shell.

**Verified** (test-intuitive.mjs): hero term opens sheet w/o navigating;
glossary lists 12; scorecard term doesn't collapse the fold; FAB label +
meal row checks meal 0 and closes; hint visible on lift stations, gone
after a real long-press (flag set, reorder opened); loop renders 5 steps in
both the Account sheet and onboarding step 7 (wizard walked end-to-end).
e2e suite green, zero page errors. Gotcha: player sets/hint only exist on
LIFT stations — advance past the warm-up before asserting.

## 46 · Home 2.0 — the benchmark pass (user: "full run through of the homepage")

**Method.** Full-page captures of Home in fresh / active / dark states,
evaluated against Hevy (action-first + week dots), Whoop (dynamic status
line), Apple Fitness (glanceable rings), MFP. Findings → one rebuild.

**Findings → fixes.**
1. *Action buried* (nag + 270px hero above "Next up") → **order flip**:
   next-up card first (the Hevy rule), hero second; tips render INSIDE the
   dash flow below the action (`dashTipHtml()` — showTipFor no longer owns
   dash; fixed a first-cut bug where host-level insertBefore with a
   dashBody anchor threw and killed the tip, and a missing `</div>` that
   swallowed the rest of Home into the tip).
2. *Static hero copy* ("Your engine — lifting, fuel & speed work", same
   every day; Whoop's line changes daily) → the hero Octane subline now
   reuses `ffScoreSummary(r)` — the Stats hub's "biggest lever now" read.
   Stale baseline line tightened to "Baseline banked — your next logged
   drive starts the climb."
3. *No glanceable week* (the "Week so far · 0 of 4 workouts" text row was
   weak, and Monday-reset made it read like failure) → **Hevy-style week
   strip in the hero**: Mon–Sun dots, filled = session finished that day
   (ff_history by local midnight), ring = today, "N/freq this week".
   `renderWeekRecap` no longer rendered (function kept).
4. *Two advice cards could stack* (Your Focus + Metabolism check-in) →
   ONE slot: `renderAdaptiveCard() || renderInsight()` — the due check-in
   outranks the nudge.
5. *Undated day* → timeline header now "Your Monday" (locale weekday).

**Verified** (test-home2.mjs): child order next-up → tip → hero → advice →
timeline → coach; advice cards ≤1; week-recap gone; 7 dots with filled
count matching this week's history + today ringed + "1/4 this week"; hero
subline is the dynamic lever; tip sits after the action; header carries the
weekday. Non-dash tips re-verified on all four tabs; calm-home + e2e suites
green; zero page errors.

## 47 · One coaching voice (user: "is anything too much?")

**Finding.** After Home 2.0, three coaching surfaces could speak at once:
the hero's lever line, the advice card, and the Coach's read button. Plus
a filler insight ("You're stacking the work", prio 8) rendered on quiet
days — wallpaper that trains the eye to skip the slot.

**What.**
- **Filler insight removed.** The advice slot now renders real signals only
  (PRs, stalls, streak risk, check-ins, re-engagement); quiet days show no
  card. The no-data "first steps" card stays (it's actionable).
- **One voice rule.** `renderDash` computes the advice card first and passes
  `muted` into `renderHeroCard`: advice showing → hero subline steps down to
  "Your engine — tap for the full breakdown."; no advice → the hero carries
  the dynamic lever line. Exactly one piece of coaching per screen, always.
- **Footer folded.** The five-line methodology/disclaimer paragraph is now a
  one-line native `<details>` ("Evidence-based starting points — not medical
  advice. How it's calculated ›") with the full text a tap away.

Deliberately kept: sign-in tip (one-time), round suggestion row (slim, and
it's the golf identity), Coach's read (the AI door).

**Verified** (test-home2.mjs): advice present → muted tag; dismissing every
insight + snoozing the check-in → hero picks the lever line back up on the
same render; "stacking the work" never renders; footer `<details>` closed
by default with the one-line summary. Suites green.

## 48 · Fuel 2.0 — the benchmark pass (same concepts as Home)

**Method.** Full-page captures (fresh/active/prefs) vs MFP/MacroFactor.
(Audit-harness gotcha burned an hour: a seed function that CALLS another
seed function breaks inside `addInitScript` — Playwright serializes only
the outer function, the closure reference throws, the page silently gets
NO seed. The "bug" in the first capture was a genuinely fresh user with
the onboarding wizard painted at the top of a fullPage shot. Seeds must
be self-contained.)

**Findings → fixes.**
1. *The daily answer was at 65% scroll* ("1 of 5 down…" inside the Meals
   card; MFP leads with calories remaining) → **Today strip** at the top
   of Fuel (`#fuelToday`, `renderFuelToday()` in 030, refreshed from
   fuelRefresh + calc): the next unchecked meal with its time and macros
   as a one-tap check-off, fueled count, and **remaining P/C summed live
   from the unchecked schedule slots**. All meals banked → "Fuel day
   banked" reward state.
2. *Set-once outranked touch-daily* → section order is now Plan → Meals →
   food ideas → **Your Numbers last** (template reorder; `.grid` is
   single-column everywhere so no desktop impact). Profile card's
   redundant sub-line removed.
3. *Three explainer paragraphs between the numbers* → the weekly-target
   band and the goal note moved INSIDE the "How this is calculated — and
   how fast the scale should move" fold; one compact scale line stays
   visible ("▲ Scale target: 0.5–0.9 lb/wk · judge the weekly average").
   "Maintenance (TDEE)" is now a glossary term (new `tdee` entry).

**Verified** (test-fuel2.mjs): strip shows next meal + time, remaining
175P/320C matches unchecked slots and decrements on tap (→110P/245C),
banking all 5 flips to the done state; section order asserted; band+note
in the closed fold with the slim line + tdee term visible; legacy fuel
suites green (test-fuel's timeline probe updated for calm-pass slim rows).

## 49 · Train 2.0 — the benchmark pass (the player is the way; the spreadsheet is opt-in)

**Finding.** Today view rendered the ENTIRE inline logging spreadsheet —
~2,500px of empty set tables — directly under a "Start workout" button
whose guided player does the same job better. Hevy shows a compact
exercise list + one Start CTA; we showed both interfaces at once.
(Page: 3,771px → 2,171px.)

**What.**
- **Compact session list by default**: each lift as a slim row (purpose
  icon + name + set×rep scheme), tap → its full history sheet
  (`data-exhist`, document-level). One note line points Why/swaps/logging
  at the player. `pl-start` stays the single CTA; warm-up doctrine box
  unchanged.
- **Manual logging is opt-in**: "⌨️ Prefer typing? Log manually here"
  sets `ff_manual_log` (device-local) and renders the classic ilogBox +
  finish bar, with a dashed "back to the simple list" exit. **Typed work
  always forces the tables open** regardless of the pref — entered sets
  are never hidden — and the exit button doesn't render once work exists.
  Finish/clear bar renders only in manual mode (the player has its own
  finish flow).

**Verified** (test-train2.mjs): default = 7 rows, zero `.il-set` tables,
no finish bar, Start CTA present; row tap opens #xhModal; toggle
round-trips through `ff_manual_log`; typed 225 survives re-render and
forces tables with no exit button; player opens from the CTA. e2e /
equipswap / player suites green.

**Test-harness lessons recorded:** tab switches don't re-run renderPhase
(by design) — force re-renders via the planview seg; and `nextWorkout()`
deliberately advances past any day WITH a session, so after typing, tests
must refocus the day via its week-strip chip. (Pre-existing quirk worth a
future look: a typed-but-unfinished day loses the default focus once you
leave the tab — the chip shows it, but "Resume" might deserve the focus.)

## 50 · Stats 2.0 — one log door, finished

**Method.** Full-page rich/sparse captures. Stats had already absorbed
passes B (folds) + C (unlock strip) + receipts, so structure was sound
(hub → ritual rows → open speed trend → headline rows → strip →
leaderboard → coach). Two real findings — both violations of rules we
set on other tabs:
1. *Two log doors.* The in-page "Log today" card was a second copy of the
   exact inputs the ＋ Log sheet carries (same `quickLogHtml`). Replaced
   with a slim `qopen-row` ("📝 Log today — weight · 7-iron · driver")
   that opens the sheet — one door, everywhere. (CSS gotcha: `.qlog-row`
   was already the sheet form's class — the new row is `.qopen-row`.)
2. *Copy pointed at furniture that moved.* Five "add it below" strings
   (speed/weight empty states, both unlock-strip weight rows, the Home
   hero empty state, the first-steps insight) now point at **＋ Log**;
   the unlock weight rows deep-link via `data-qopen`.
Plus the header's redundant sub-line removed.

**Verified**: zero inputs left in `#progressBody`; the row opens the
sheet (3 inputs); header sub gone; e2e + calm-stats suites green (their
informational quickLog probes now read false, as designed). The PR-Wall
"missing row" in the audit shot was the fullPage tab-bar paint band —
DOM probe shows all 8 folds present.

## 51 · You-tab check (user: "double check the You page just in case")

**Audit result: healthy.** Live sync line, backup card, training setup,
glossary/loop entries all in place from earlier passes. Two grammar nits:
1. "⛳ Full access — unlocked" (read-once marketing) sat in slot #2,
   outranking reminders/appearance/training setup on every visit → moved
   to the bottom, above the feedback links.
2. "Your training plan" was a mislabeled danger card (its only action is
   the reset, but the title read like plan management — which is the
   "Your training setup" card above) → renamed "↺ Start the plan over".

**Verified**: card order (install → reminders → appearance → numbers →
setup → mobility → backup → foods → start-over → show-me-around →
full-access), reset button wired, zero page errors.

## 80 · Fresh-eyes streamlining pass (owner: "anything that needs updating… simplistic and streamlined… make it top tier")

A full visual + audit sweep of every primary view (Home, Fuel, Train, Stats, You)
with a realistic week-5 user, light and dark, after the parallel "sprint" series
(#81–#90, #94–#95) landed. Verdict: the information architecture is sound —
Train and Fuel are action-first with folds, Home is one command card then
folds — but the sprint work eroded two standards set earlier, and Stats says one
thing twice. Fixed exactly those; nothing added.

**1 · Type floor restored (the §67 11px rule).** The sweep found 41 rules below
11px introduced since the type pass: every tab's `view-head-kicker` (10.5),
"DAILY READINESS" (9), "TODAY'S WORKOUT" (9.5), the Fuel hero's KCAL/PROTEIN/
CARBS/FAT labels (8.5!), and the Stats story/outlook kickers, pills and captions
(9–10.5). All raised to 11px; kickers keep their tracking. The only sub-11px
rule left is the intentional `.ws-date` week-strip label (10.5, per §67).

**2 · Tap targets.** Home's timeline rows (`.tl-card` — the meal / weigh-in /
workout check-off rows, the primary Home interaction) measured 33px tall; now
`min-height:44px` (slim variant 40). Fuel's meals-per-day segment buttons were
38×29; now ≥40×40.

**3 · Stats: same advice printed twice.** The Performance Story's "BIGGEST
OPPORTUNITY" block and the Octane card's "Biggest lever now" both read from
`FF_LEVER` — identical text, two cards apart. `renderScoreCard(compact, noLever)`
now takes a flag; Stats passes it when the Story rendered its next-block, and the
Octane summary keeps its tone line but points at the breakdown instead of
repeating the lever. Home's compact Octane and every other caller are unchanged.

**Looked at and deliberately left alone:** the "Opening Round complete" toast
(properly guarded — fires once; the 2-day victory-lap card is intentional), the
You tab's two sign-in CTAs (the top one is the dismissible first-visit coach tip,
not a permanent duplicate), and the two AI-coach doors on Stats (distinct asks:
a forecast-specific one and the generic one).

**Verified** (Playwright, 5 views × light/dark): sub-11px text nodes went from
3/6/4/10/2 per view to 0 everywhere except the one intentional label; timeline
rows ≥44px; meal-count buttons ≥40px; zero page errors on all views; Stats shows
the lever exactly once.

## 79 · Octane breakdown polish + composite trend (competitive read: DRVN screenshots)

Owner shared DRVN screenshots — they've rolled their Golf Fitness Handicap /50
into a "Player Rating" /100 with a tappable sub-score breakdown and a progression
chart. We borrowed the **generic UX pattern** (composite-with-legible-breakdown),
never their names/metrics/tests/wearables, and applied it to Octane — our own
six-pillar score from the user's own data.

Two changes to the Octane card (`renderScoreCard`, 070):
- **Legible pillar rows.** Each pillar was a single bar with a bare, cryptic
  points number ("23"). Now it's a small block: label + **pts/max** on top (so the
  number and the fill bar agree), the pillar's **real metric surfaced on the face**
  ("+5.1% 7-iron", "Speed outpacing weight" — previously tap-only), and the bar
  below. Locked pillars show `＋` and their next step ("Take the 3-move screen").
- **Octane trend.** `saveScoreSnapshot` now also appends a daily composite score to
  a local, capped `ff_score_hist` trace, and the breakdown draws an **Octane trend**
  sparkline + delta once ≥2 days exist. Deliberately NOT synced: the score is
  "gain from your first entry," so a past day can't be backfilled — it accumulates
  forward and self-heals on any device.

Stayed in lane: no "Player Rating"/"FUSION" naming, no synthetic test battery
(the settled "Dyno Day" rejection), no wearable dependency. Recorded the DRVN
evolution in `YARDSMITH-BRAIN.md` §5 and `COMPETITIVE-LANDSCAPE.md`.

**Verified** (Playwright): breakdown open with seeded data — all six pillars
render a metric line; pillars with data read `26/30` / `10/10`, locked ones read
`＋`; the trend chip draws a sparkline + delta from `ff_score_hist`; zero page
errors.

## 78 · Skip-link stops peeking out on notched phones (user report: "skip to main content button out of place")

The "Skip to main content" accessibility link was leaking into view at the
top-left — overlapping the status-bar clock — inside the full-screen workout
player. Cause: its `top` was `calc(10px + env(safe-area-inset-top))`, but the
hide transform was a fixed `translateY(-180%)`. On a notched iPhone the inset
(~59px) pushed the link *down* further than −180% (~75px) pulled it *up*, so
~30px stayed on-screen. The player's dark-green background matches the link's
own `#0b3d22` pill, so it stood out there.

Fix: the hidden state is now inset-independent — `top:10px` with
`transform:translateY(calc(-100% - 24px))`, which fully clears the element's own
height regardless of notch depth. The safe-area inset moved into the focused
position (`translateY(calc(env(safe-area-inset-top, 0px) + 4px))`), with an
explicit `0px` fallback so the `calc()` never goes invalid and drops the reveal.

**Verified** (Playwright, player open): unfocused the link sits at top −52 /
bottom −14 (fully above the viewport); on keyboard focus it reveals at top 14
(below the status bar); on blur it returns to −52. Inset-independence proven by
construction — `top` no longer references `env()`.

## 77 · Resume returns to where you left off (user: "when you resume a workout it should go to where you left off")

The player already paused cleanly — banking active time and surfacing the
resume bar — but on resume it used a "first unfinished lift" heuristic, which
sent you back to a lift you'd deliberately skipped and lost your warm-up/primer
position entirely. Now `plClose` stamps `ff_pl_paused` with `st:player.st` (the
exact station index), and `startPlayer` restores that station when the paused
blob matches this same day+week and `st` is still in range. The first-unfinished
scan stays as a fallback for any session that has logged data but no saved
station (older paused blobs, or work seeded from another surface).

**Why station index, not lift index**: "where you left off" includes the
warm-up and power-primer stations, not just lifts — a lift-only cursor couldn't
represent them, and would still fight the user on skipped lifts.

**Verified** (Playwright): started a Lower day, advanced to the 3rd lift with
the first two left unfinished, logged a set, exited. Paused blob carried
`st:4`; resume landed on "Hip Thrust" (the left-off station) rather than
"Romanian Deadlift" (the first lift the old heuristic jumped to).
test-pause / test-player regressions still green; zero page errors.

## 76 · RIR is goal-aware — bulk pushes the accessory work to failure (owner: "during a bulk you don't leave RIR")

Owner's point, taken with the evidence-based nuance: on a bulk the surplus
supports training the HYPERTROPHY ACCESSORY work close to failure (Refalo 2023
— closer-to-failure sets edge out for size, and the extra fatigue only bites
when you can't recover from it). But "no RIR" isn't right for the whole day —
heavy compounds still leave RIR 2 (technique/tweak risk, it's a force stimulus)
and power/speed drills never go to failure ("stop when a rep slows"), which is
load-bearing for the clubhead-speed outcome.

`effortNote(t, name)` (035) now takes the exercise name and keys off goal +
purpose class:
- Goal **bulk / lean bulk** AND `purposeFor(name)==="💪"` (mass accessory) →
  **"RIR 0–1 · last set to failure · rest ~90s"** (last set, not every set —
  captures the stimulus without frying the session).
- Heavy compounds (🏋️, or any "heavy"/≤6-rep target) → RIR 2 / 2–3, unchanged.
- Power/speed (⚡ ballistic) → the player already shows "max intent · full
  rest"; unaffected.
- **Cut / maintain** → unchanged (RIR 1–2 / 1), a rep kept back to manage
  fatigue in a deficit.

Threaded the name through both call sites (Train card `effortNote(row[1],
base)`, player `effortNote(x.target, x.name)`); `.effort` chip drops
`white-space:nowrap` so the longer bulk string wraps cleanly.

**Verified**: on BULK, accessories (leg ext, calf raise, incline DB press, hip
thrust, lunges) read "last set to failure" while heavy compounds (deadlift,
bench, OHP, leg press) and anti-rotation core (Pallof) keep their RIR; on CUT
every lift keeps a rep back; audit-train 18/18, player/train3/contrast green,
zero page errors. (audit-type's only <11px hits are the intentional 10.5px
week-strip date labels from §67 — unchanged here.)

## 75 · Bodyweight jumps stop asking for a weight (user report)

"Box jumps have weight?" A box jump (and the field-mode lead, Countermovement
jump) rendered a weight stepper + the strength-lift prescription copy — "find a
weight you can own with 2 reps in reserve," a grind cue that also contradicted
the "max intent · full rest" chip right above it.

New `isBodyweightEx(name)` classifier (035, beside `isBallistic`): true for
bodyweight jumps/bounds/plyos (`\bJump\b|\bBound\b|Plyo|Pogo|\bHop\b|
Skater|Broad`), explicitly EXCLUDING anything loaded (Trap-?bar, Dumbbell/DB,
Barbell/Bar, Kettlebell/KB, Weighted, Med-?ball, Landmine, Cable, Band, Sled).
So Countermovement/Box/Broad/Squat jumps and Lateral Bounds drop the load
field; Trap-bar jump, KB swing, med-ball throws and every barbell lift keep it.

Applied to all three loggers: the load slot becomes a static **BW** chip
(dashed, muted) instead of a weight input/stepper — player (`.pl-bw`), inline
(`.il-bw`, column LBS→LOAD), modal (`.setbw`, column Weight→Load). The player's
prescription line for a bodyweight drill now reads "⚡ Bodyweight — every rep
max height, land soft, full rest. Log the reps." No weight, no RIR grind cue.
Reps stepper + ✓ stay; only reps are logged (jumps never fed e1RM/volume
anyway — `bigLiftStats`' KEY regex excludes them — so no data-model change).

**Verified**: field-mode player Lift 1 (Countermovement jump) shows the BW
chip, no weight stepper, rep stepper intact, bodyweight prescription; gym-mode
Lift 1 (Trap-bar jump, loaded) still shows the weight stepper; classifier
spot-checked across 18 drill names (jumps→BW, everything loaded→weight);
audit-train 18/18, player/train3/carry/scroll/contrast green, zero page errors.

## 74 · Golf day counts + Train agrees with Home on rest days (owner decision)

Follow-up to the rest/golf-day audit. Owner picked: (1b) wire a logged round
to satisfy the day, (2) make the Train tab feature today's rest, (3) leave
Octane a pure training index (no change).

**A logged round IS today's activity (075).** On a "Rest / Play 18" day, a
round logged today now satisfies the day: `restDoneToday` folds in
`roundToday()`, so the day banks via round + meals + weigh-in (the "✓ Day
banked" pill). The Home hero acknowledges it — "Round in the books ⛳ · 18
played is your day" instead of nudging recovery — and the redundant "Active
recovery" row is suppressed when a round exists (the "Round banked ✓" row
already stands in). Recovery-only rest days are unchanged.

**Train agrees with Home on what "today" is (035).** The Train featured card
defaulted to `nextWorkout()`, which skips rest days — so on a rest day Home
said "Recover today" while Train foregrounded the next workout (sometimes a
future "Coming up" preview). Now, on a rest day with no explicit focus, the
featured card is TODAY (the recovery card); the next workout stays one
strip-tap away. Workout days and explicit focus are unchanged.

**Octane unchanged** — recovery/rounds still don't feed the score (owner kept
it a pure training-output index).

Not done (declined this round): full round-day fueling replacing the rest
meal plan, and a tee-time notification — Game Day stays the manual round
planner.

**Verified** (test-golfday.mjs, isolated contexts): rest + round → Home hero
"Round in the books", recovery row gone; round + weigh + meals → "Day banked";
rest + no round unchanged (recovery hero + row); Train features "Rest / Play
18" with the Mark-recovery button and no Coming-up preview; training day still
shows its workout hero. home2/today/train3/round/restfuel/weighin/stats3 green,
audit-train 18/18, zero page errors.

## 73 · Weigh-in is scale-only + two rest-day copy contradictions (user report + audit)

**Morning weigh-in shouldn't ask for swing stats.** The Home "Morning weigh-in"
row opened the full "Log anything" sheet — weight PLUS 7-iron mph, driver yds,
and speed-test/round/mobility action rows. Now it opens a scale-only variant:
`quickLogHtml(prefix, hint, weightOnly)` (070) renders just the Weight field
when `weightOnly`, and the weigh-in row (`data-weighin`, 075) opens
`openSheet(true)` (085) — header "⚖️ Morning weigh-in", one input, no action
rows. The FAB's full "Log anything" sheet is unchanged (all three fields).
`logBodyEntry` already writes only non-empty fields, so it stores weight alone.

**Two rest-day copy contradictions found in a full rest/golf-day audit:**
- Fuel meal card (`030`) read "…portioned for a **Morning** workout" on rest
  days — directly under the "Rest day — no workout" timing block. Now
  rest-aware: "portioned evenly — **rest day**" (drives off `meal.rest`, new
  flag on the meal object in 025).
- Game Day refuel step (`080`) said "your **post-workout meal** works great",
  referencing a meal the rest-day Fuel tab says doesn't exist. Reworded to "a
  round is real work, refuel it" — accurate in a round context.

**Verified**: tapping Morning weigh-in opens a one-field scale sheet, saves
weight-only, FAB still shows all three; rest-day meal card reads "rest day",
training day still "Morning workout"; home2/fuel2/stats3/restfuel/weighin
suites green, zero page errors.

(A broader audit of rest-day / golf-playing-day consistency across all
sections surfaced deeper product questions — Game Day being decoupled from the
"Rest / Play 18" plan day, whether recovery/rounds should earn Octane — which
are being taken to the owner as a decision rather than changed unilaterally.)

## 72 · No pre-workout meal on rest days (user report)

"You're showing pre-workout meal on off days and it prob shouldn't be a
thing." The meal schedule `calc()` builds was workout-anchored every day: it
added a pre-workout snack (or flagged a meal "pre-workout") and a
post-workout carb-loaded meal regardless of whether today was a training day.
On a rest day that framing is wrong — there's no workout to fuel around.

`calc()` (025) now detects whether TODAY is a rest day (off `stripDays()` /
`dayOfPlan()`, guarded so a not-yet-started plan stays a training day). On a
rest day:
- no separate pre-workout snack and no `isPreMeal` flag — the "🍚 Pre-workout"
  row disappears from the Home timeline (075) and the Fuel schedule list (030);
- no post-workout emphasis (`isPost` unset) — no "post-workout · biggest carb
  meal" tag, and the day's carbs/fat spread EVENLY across meals instead of
  spiking one;
- the Carb-Timing fold (030 `timingBlock`) renders a rest-day note ("No
  workout today — spread your Ng carbs evenly") instead of the pre/post
  windows;
- the example-day menu (`ffPlanDay`) drops the around-training meal and its
  30 g pre-snack reserve.

Also: `ffRefreshForNewDay` (090) now re-runs `calc()` on the date-change
re-render, so a lift→rest rollover rebuilds the schedule instead of the
timeline showing yesterday's pre/post until the Fuel tab is next opened.
Macros are conserved (dropping the pre feed just redistributes its carbs);
`ff_fuel` check-off indices still line up because Home and Fuel render the
same `ffSchedule`.

**Verified**: rest days (plan day 3 and 5) show no pre-workout on Home or
Fuel and a "Rest day" timing note; training days (day 1, day 2) keep the
pre-workout meal; fuel/fuel2/home2/tlmeals/carry/today suites green, zero
page errors.

## 71 · Speed-day pressure-test: FIELD drill order tightened to the zr ranking (open thread 7, S1)

Follow-up to §70's pressure-test. Owner chose candidate **S1** (drill reorder)
after the exploration; **S2** (overspeed ramp dose) and **S3** (jump/throw
volume) were reviewed and explicitly declined — the ramp is already an honestly
framed adjunct and the doses already sit inside the §10.2/§10.3 envelope, so
neither permitted an evidence-mandated change.

**Change:** in FIELD mode, moved **Overhead med-ball slam** ahead of **Lateral
bound** (slot 5 → 4). The slam is a med-ball throw — the 0.67 upper-body/
total-body explosive tier (Brennan 2024) — while Lateral bound is a lateral
plyometric nearer the lower ground-force tier (~0.47). Grouping all three
throws/slams before the ground-force drills makes the day's order
non-strictly follow the zr ranking (jump 0.82 → throws/UB-explosive 0.67 →
ground force → overspeed). GYM mode was already ordered correctly and is
unchanged. Both throw variants stay present; overspeed stays last. Pure reorder
— no rename, both drills classify `⚡`, so every wave prescription is identical.

The prior order deliberately *alternated* upper/lower to distribute fatigue;
the owner's call was to prioritize strict evidence-grouping over alternation.

**Verified**:
- Dose gate (`dump-speed-day.mjs`): FIELD table now reads CMJ → Rot throw →
  Seated chest throw → **Overhead med-ball slam** → **Lateral bound** →
  Ground-force footwork → Overspeed; every per-drill dose unchanged across
  wk 1/4/6/9/12/19; ALL INVARIANTS PASS (order-independent A–E). GYM table
  byte-identical.
- Rendered FIELD Player at weeks 1/4/19: station sequence equals the expected
  post-reorder order, overspeed last, zero pageerrors.
- `audit-train.mjs`: 18/18 clean (gym-mode states unaffected).
- Build deterministic: only `035` + generated outputs changed; `styles.css`
  untouched; no `?v=` pin, no stored-key change.

## 70 · Speed-day pressure-test: Player effort note for rotational throws (open thread 7, S5)

Pressure-tested the Speed & Power day (drill selection, volume, overspeed
protocol) against the evidence base — YARDSMITH-BRAIN open thread 7. **Finding:
the day already matches the Brennan 2024 effect-size ranking** — both modes lead
with the jump (zr 0.82, the strongest CHS correlate; CMJ is the best jump
variant per Wells 2018), carry both throw variants (rotational + seated/chest,
per Read 2013 / Turner 2016), keep reps low, demote overspeed to a last-slot
honestly-framed adjunct, and correctly omit flexibility (−0.04) and balance
(−0.06). No drill is unaccounted for and no ballistic dose is over-trimmed at
peak (the 6932f28 wave invariants still hold).

**The one defect (S5):** the Workout Player's dim effort note special-cased only
`⚡` (`070:171`), so the three max-intent `🌀` rotational throws — Rotational
med-ball throw, Landmine rotational throw, Cable lateral chop — fell through to
`effortNote()` and rendered **"RIR 2–3 · rest 2–3 min"**, a *hypertrophy grind*
cue on max-intent power work. That contradicts CLUBHEAD-SPEED-REFERENCE §10.3
("full rest between efforts") and the day's own framing. Their **dose** was
already protected by 6932f28; this was the un-fixed *copy* tail of that same
incident.

**Fix (copy-only, zero dose change):** added a shared `isBallistic(name)` helper
next to `purposeFor` (`035`) — true for every `⚡` drill PLUS the rotational
`🌀` names carrying an explosive verb (Throw/Toss/Slam/Chest Pass/Chop/Punch).
The Player note now keys off `isBallistic(x.name)` instead of `purposeFor(...)==="⚡"`.
Deliberately narrower than "⚡ or 🌀": the `🌀` bucket also holds anti-rotation /
iso core (Pallof, Russian Twist, bare Rotation) and ~15 Single-Arm accessories
(rows, curls, flys) which are RIR-graded strength work — those keep their
`effortNote`. The new predicate is a strict *superset* of the old one, so the
change is monotonic: no station can flip max-intent → graded.

**Verified**:
- Dose gate (`dump-speed-day.mjs`): output byte-identical to the recorded
  baseline; ALL INVARIANTS PASS (A–E) — confirms copy-only, zero dose drift.
- Classification unit cases: 34/34 — the 3 speed-day `🌀` throws + all `⚡`
  drills → ballistic; Pallof/Iso-hold/Russian Twist/Single-Arm accessories/bare
  Rotation → graded; strength/hypertrophy → graded; `Landmine Press` trap → graded.
- Rendered Player at weeks 1/4/19 (accumulate/intensify/peak): all 6 gym-mode
  drills — including Landmine rotational throw and Cable lateral chop — read
  "max intent · full rest"; zero pageerrors; no leaked undefined/NaN/`{{V}}`.
- `audit-train.mjs`: 18/18 clean.
- Build deterministic: only `035`, `070` and their generated outputs changed;
  `styles.css` untouched; no `?v=` pin touched (no stored-key or sync change).

## 69 · Distance moves log yards, not reps (user request)

"Things that need distance logged instead ask for reps." Loaded carries carry
a distance target ("Farmer Carry — 3 × 40 yd"), but all three loggers labeled
the second set field "reps" and gave no seed, so the field read as nonsense.

New shared signal in 040 keyed off the authored target string — the SAME
`/yd/` test the wave engine already uses to skip rep bumps (035 waveAdjust),
so display and prescription can't drift: `isDistEx(target)`,
`repWord(target)` ("yards" | "reps"), `repSeed(target)` (the target distance).
Applied to every logging surface:

- **Player** (070): the second stepper's placeholder reads "yards" for a
  carry, "reps" otherwise; the stepper already seeds from `× 40`, so ± works.
- **Inline logger** (045): the `LBS / REPS` column header becomes `LBS /
  YARDS`; the field seeds the prescribed distance when there's no prior.
- **Modal logger** (040): the `Weight / Reps` header becomes `Weight /
  Yards`; placeholder seeds the distance.

Detection is by target, not exercise name, so it needs no classifier change
(architecture weak-point #1) and auto-covers any future "X yd" target plus
carry swaps that keep the slot's distance target. Storage is unchanged — the
yardage lives in the same `r` slot; carries are already excluded from e1RM/PR
math (`bigLiftStats` KEY regex omits "Carry"), so no bogus strength PRs.

**Verified**: player shows "reps" on the hinge day's lifts and "yards" on
Farmer Carry; inline + modal headers read YARDS/Yards only for the carry
(seed 40); train3, player, exercise-history, 18-state audit all green, zero
page errors.

## 68 · Hinge day starts with leg curls (user request)

"I'd like the hinge day to start with leg curls instead of end." Day 4 —
Lower (Hinge + Power) on the 5-day plan now opens with Seated Leg Curl
3 × 12, then Deadlift, Hip Thrust, Bulgarian Split Squat, Pallof Press,
Farmer Carry. Order-only change — targets, swaps, and per-lift history all
key off the exercise name, so past logs and prescriptions carry over
untouched. In-progress sessions keep the order they started with; the new
order applies from the next fresh session.

**Verified**: Train list renders Seated Leg Curl first on the focused hinge
day; the guided player's first lift station is Seated Leg Curl; train3 /
18-state audit / full player suite all green, zero page errors.

## 67 · Type pass: legibility floor + one scale (user: "Audit for font consistency and clarity overall — fix it all")

The audit found one body font used consistently (system stack + FF Numeral
for hero numbers, all with fallbacks) but **42 distinct font sizes** — 13 of
them inside the visually-indistinguishable 11–13.5px band — plus text down
to 8.5px, weights 800 AND 900 both in heavy use, and letter-spacing mixing
px and em units. Three fixes, all shipped together:

**1. Legibility floor.** Words never render below 11px; numeric/badge
micro-labels (week-strip dates, "YOU" pill, swapped badge, bar-chart
numbers, option tags) get a 10.5px floor. Raised: week-strip dates
8.5 → 10.5 and names 10 → 11 (the strip you glance at daily), Account
setup explainers 10.4 → 11 (`.acct-set-lbl small` had no size — browser
0.8em default), Fuel meal timing tags 10.5 → 11, inline-logger column
headers 10.5 → 11, set-sheet labels 10.5 → 11, swap badge 9 → 10.5,
done-pill hint 10.5 → 11, uppercase kickers (`.insight-kick`, `.wu-h`,
`.ob-sumv .k`) 10.5 → 11, onboarding feature notes 10 → 11, `.seteq-label
small` explicit 11. Week strip re-fit: chip gap 3 → 2px, side padding
dropped, date spacing −.3px so "Mon 13" renders unclipped at the new size.

**2. Band collapse.** The 11–13.5px pile-up (11.5/11.6/11.8/12.2/12.3/
12.5/12.6/12.8/13.2 among them) collapsed to **11 / 12 / 13 / 13.5** —
verified first that those values never appear outside font declarations.
Rendered screens now use a clean ladder (Round and Account: 9 sizes,
was 11; every screen's small-text band is exactly 11/12/13/13.5).

**3. Weight + tracking consolidation.** All `font-weight:900` → 800 (the
system font renders them near-identically; the few 900s still measured
come from the browser's `b { font-weight: bolder }` inside 800 parents —
inherent, not stylesheet). Uppercase-label letter-spacing unified to two
em tiers: .05em (badges/labels) and .09em (kickers) — was seven px values.

**Verified**: rendered type audit (audit-type.mjs) across all 6 views +
player: zero words under 11px, band exactly 11/12/13/13.5 everywhere;
before/after full-page screenshots eyeballed (no wraps, no clips, week
strip fits all 7 chips); full battery green — home2/train3/stats3/fuel2,
audit-train 18/18, audit-scroll 16/16, plscroll, contrast audit zero fails.

## 66 · Scroll-preservation audit: every other section checked, all clean

Follow-up to §65 ("evaluate any other sections this might be possible on"):
a Playwright audit (audit-scroll.mjs) drives every in-place interaction that
triggers a re-render and asserts the scroll position survives, on both the
window-scrolled views and the overlays with their own scrollable bodies:

- Home: meal check-off in the timeline
- Fuel: meal ✓, "show the numbers" toggle, day-rating chip
- Stats: fold open AND fold close (`data-pftoggle` → full renderProgress)
- Train: equipment preset chip (settings fold → renderPhase), speed-day
  Field/Gym seg
- Round: holes + transport chips (→ renderGameDay)
- Account: goal-yards / frequency / workout-time / theme chips
  (→ renderAccount)
- Inline logger modal: set check-off (re-renders `#logBody`)
- Workout-history sheet: deleting a row deep in a 15-entry list
  (re-renders `#swapBody`)

**Result: 16/16 keep the exact scroll position; zero page errors.** The
player (§65) was the only surface that force-reset scroll — the main views
replace innerHTML of a child container while the WINDOW is the scroller, so
the browser preserves position, and the sheets re-render the same scroll
node in place. The two remaining `scrollTop = 0` sites in the code are both
intentional navigations (tab switch in setView, day switch in the Fuel week
sheet). No code changes needed.

## 65 · Player: steppers no longer scroll you back to the top (user report)

"Adding a rep during a workout makes the screen go back to the top of the
page annoyingly." Root cause: `plRender()` force-set `plBody.scrollTop = 0`
on EVERY re-render — correct when moving between stations, wrong for the
in-place updates (rep/weight steppers, set check-offs, warm-up toggles, why
folds) that also re-render. On a lift with enough sets to overflow the
screen, tapping ＋ next to set 4 threw you back to the top every time.

Fix: `plRender` remembers which station it last drew (`player.renderedSt`);
same station → the scroll position is captured before the innerHTML swap and
restored after, different station → top, as before.

**Verified** (new test-plscroll.mjs, short viewport so the station
overflows): rep step, weight step, and set check-off all keep scroll (180 →
180); Next and Back both land at the top; full test-player.mjs suite still
green; zero page errors.

## 64 · UI code health (PR D): storage cache, dead code, lazy SDK, minified builds

Coding-standpoint pass on the front end (same evaluation the backend got):
four changes that make the shipped code smaller, boot faster, and every
interaction cheaper — zero visual/behavior change.

**1. Memoized storage layer (040).** `lsGet` used to hit
`localStorage.getItem` + `JSON.parse` on EVERY call — renders re-parsed the
same multi-hundred-KB blobs dozens of times. `lsGet`/`lsSet`/`lsRemove` now
sit on a per-key parsed-value cache; direct `localStorage.*`/`JSON.parse`
call sites across the modules were converted to the helpers so the cache is
the single path. Invalidation: `lsSet`/`lsRemove` update in place; a new
`ff-external-write` window event (dispatched by cloud-sync's `writeBlob`/
`deleteAccount` and by `ffImportData`) drops the whole cache; the cross-tab
`storage` event drops the affected key. The cache is lazily initialized
because module 005 (migrations) calls `lsGet` before 040's statements run.

**2. Dead code removed.** `renderWeekRecap` + its `prAdd` handler branch and
`dTile` (all unreachable since Home 2.0 / Stats 3.0) deleted, along with
their orphaned CSS families (`.dash-grid`, `.wk-recap`/`.wr-*`,
`.dtile`/`.dt-*`, `.dash-log`/`.dl-*` — zero references).

**3. Lazy Supabase SDK (cloud-sync v=111 → v=112).** The 130KB SDK was a
render-blocking CDN `<script>` for every visitor, signed in or not. The tag
is gone from the template; cloud-sync now loads it on demand (`loadSdk` →
memoized `ensureSb`, which retries on failure) — at boot only when a session
token or a magic-link redirect is present, otherwise on the first tap of
Sign in / leaderboard / push. Signed-out visitors never fetch it.

**4. Minified builds (scripts/build.mjs + esbuild devDependency).** src/
stays readable; the committed outputs are now minified (`target: es2017`).
The content hash is computed over the MINIFIED bytes, so even an esbuild
upgrade busts the cache correctly. app.js 468KB → 312KB (gz 148KB → 102KB),
styles.css 190KB → 158KB (gz 35KB → 29KB); sw.js minified too.

**Measured (profile-ui.mjs, same seeded heavy account):** boot
DOMContentLoaded **826ms → 97ms**; JSON.parse calls at DCL **266 → 23**
(0.4MB re-parsed → ~0); tab → Stats **41ms/90 parses → 35ms/2**; every other
interaction (fold toggle, tab switches, meal check-off) now re-parses **0**
bytes.

**Verified**: full battery against the minified build — test-sync (25 checks
incl. new S0: signed-out boot never touches the SDK, sign-in loads it),
test-pushsig, test-migrate (16), test-train3, test-stats3, test-forceupdate,
test-home2, test-hype, test-fuel2, audit-train (18/18 states). Two test-only
fixes: harness direct-`localStorage` writes now dispatch `ff-external-write`
(the cache working as designed), and sync tests await the async-wired auth
callback.

## 63 · Backend scale (DB review PR C): write-amplification cuts

Three functional changes that cut the backend's per-user write volume — the
cost that actually grows with usage in the blob-sync model.

**1. Client push cadence (cloud-sync, pin v=110 → v=111).** Every push writes
the ENTIRE blob; the old cadence was a 1.2s debounce + an 8s poll, so a
mid-workout logging session produced a full-blob write every few seconds per
user. Automatic pushes now coalesce to at most one per ~12s (`PUSH_MIN_MS`;
`pushSoon` schedules the trailing edge), and the safety poll widened 8s → 30s
(real changes arrive via `ff-data-changed`; the poll is only a net). The
pagehide/visibility-hidden flushes stay immediate, so backgrounding the app
never loses the tail — the crash-loss window grows from ~1.2s to ~12s, the
same class as before. **~8× fewer writes** during active logging.

**2. Server history churn (schema.sql).** §62's `profiles_history` trigger
snapshotted on every data change — at logging cadence that meant a blob-sized
insert + prune per push. Now throttled to **one snapshot per 10 minutes per
user**: same recovery power ("restore from 10 minutes ago" is the point;
"from 12 seconds ago" is noise), and the 10 kept snapshots now span hours of
active use instead of two minutes. ~99% fewer history writes.

**3. push_subs resync (080).** The 7-day reminder schedule was re-upserted on
every app open + every ff-auth, though its content only changes once a
calendar day (or when the training slot/plan moves). `ffPushSubscribe` now
hashes the payload (`ff_push_sig`, device-local) and skips the upsert when
byte-identical to the last successful upload. The date rollover busts the
signature daily; the explicit reminders toggle passes `force=true` (a
server-dropped row is always re-created); unsubscribe clears the signature.
Cuts push_subs writes from per-open to ~per-day per device.

**Verified**: test-sync.mjs S6 (login push arms the throttle; burst edits
produce ZERO writes inside the window; pagehide flushes immediately with the
latest value; a deferred edit lands on its own after the window); new
test-pushsig.mjs (stubbed SW/pushSave, real `ffPushResync` in-page: first
resync writes + stores the signature, repeat resyncs are skipped, changing
the training hour via the real Account control writes again with the new
hour, zero page errors); migrate/home/force-update suites green.

## 62 · Data hygiene (DB review PR B): ISO identity + migrations + recovery + constraints

Second half of the structural database review.

**1. Locale-proof identity for body entries.** `ff_body` rows were keyed by
`toLocaleDateString()` strings — different per device language (duplicate days
after a merge) and alphabetically sorted ("Apr 30" before "Feb 1"). Now:
- New `src/js/app/005-migrations.js`: a device-local `ff_schema` version + a
  run-once ladder at boot. v1 backfills `iso` (YYYY-MM-DD) + `ts` onto every
  parseable legacy row (unparseable rows are left untouched; array order
  preserved). Every future shape change gets a rung here instead of scattered
  defensive parsing.
- `logBodyEntry` writes `iso` + `ts` from birth and matches today's row by
  `iso` (raw-date fallback for pre-migration stragglers).
- cloud-sync `unionBody` keys on `bodyKey()` = `iso` → parsed-date-ISO → raw
  string, backfills `iso` on merged output (so a not-yet-migrated device's
  rows normalize during merge instead of duplicating), and sorts by the ISO
  key — **chronological**, not alphabetical. Pin v=109 → v=110.
- Fixed the latent readers: `thisWeekStats` compared locale dates to an ISO
  week-start string ("Jul 8, 2026" >= "2026-07-06" is alphabetically ALWAYS
  true — the week deltas never showed); now compares `iso`. `weekCard`
  weigh-ins + `weightTrend` prefer `e.ts`.

**2. Train reset-path mismatch.** "Restart from week 1" (Plan & settings)
called `resetPlan()` — cleared only the start date, so the "restarted" plan
resurfaced weeks 1–20 of the old season's `ff_log` as already-logged days. It
now runs `resetPlanFull()` (same as the You tab), and `resetPlanFull` first
**tombstones every wiped session** — without that, the next cloud merge
resurrected the old log from the server. Permanent `ff_history` untouched.
`resetPlan()` deleted (no callers).

**3. Recovery + guardrails (schema.sql — re-apply in the SQL editor):**
- `profiles_history`: a trigger snapshots the previous blob on every data
  change and prunes to the last 10 per user — the "restore from Tuesday"
  lever if a bad merge/bug ever writes a corrupted blob. RLS: own-row read;
  writes only via the trigger.
- `profiles_size_guard`: rejects blobs > 1MB (a runaway client can't wedge
  sync; the error surfaces in the Account sync-health line).
- Leaderboard: `char_length(handle) between 2 and 20` + unique index on
  `lower(handle)` (impersonation guard; wrapped in a DO block so existing
  dupes don't abort the script). Client maps the 23505 to "that handle is
  taken — pick another."
- push_subs housekeeping: commented weekly pg_cron prune of subscriptions
  untouched for 90+ days.

**Verified**: test-sync.mjs S5 (same-day legacy + iso rows merge to ONE entry
keeping both sides' fields, legacy rows get iso backfilled, order is
chronological); new test-migrate.mjs (16 checks: ladder stamps ff_schema=1,
backfills iso/ts, preserves unparseable rows + order + display strings, charts
render, ＋ Log writes iso/ts and re-logging today updates the same row; Train
reset clears the log, tombstones every key, keeps history, shows the start
card; zero page errors). Stats/Home/Train suites re-run green.

## 61 · Sync integrity (DB review PR A): rev-guarded pushes + merge registry

Structural review of the data layer found two ways the sync engine could
silently lose data as multi-device use grows; both fixed here.

**1. Every push is now a compare-and-swap, not a blind overwrite.**
`profiles` gains a `rev bigint` (schema.sql — re-apply in the Supabase SQL
editor). `push()` does `UPDATE … SET rev = seen+1 WHERE id = uid AND rev =
seen`; zero rows updated means another device moved the cloud first, so the
client pulls that blob, runs the SAME union merge as login, and retries (≤3
attempts, `pushing` guard intact). Before this, merging only happened at
login — two open devices blind-upserted whole blobs over each other every 8s.
Legacy fallback: if the project's schema lacks `rev` (PGRST "column" error →
`isMissingRev`), the client drops to the old upsert path so sync keeps working
until schema.sql is re-applied.

**2. Merge registry — additive keys can't silently miss their union.**
`mergeBlob`'s if/else chain became a `MERGE` map: any ff_* key holding
accumulated history declares its union there; unlisted keys are settings
(cloud wins on conflict). This fixed four keys that had drifted into
cloud-wins despite being additive — a round/meal-check/speed-test/mobility
logged on one device could vanish at the next login merge:
- `ff_rounds` → `unionSeries` by `id` (cap 60, chronological)
- `ff_speedtest` → `unionSeries` by `ts` (cap 60)
- `ff_mobility` → `unionSeries` by `ts` (cap 40)
- `ff_fuel` → `unionFuel`: per-ISO-day, newer `ts` record wins (meal-detail
  vs day-rating are exclusive modes, so field-merging could resurrect
  deliberately cleared meals), 95-day retention preserved.

cloud-sync.js pin bumped v=108 → v=109 (template + SW precache).

**Verified** (scratchpad/test-sync.mjs — runs the real cloud-sync.js in a vm
sandbox against a mock Supabase): login merge keeps both devices' rounds +
speed test + mobility + fuel days while settings stay cloud-wins; a concurrent
push CAS-conflicts, pulls, merges and lands with BOTH devices' new rounds and
the other device's settings change (rev advances 1→3, zero blind upserts);
tombstoned sessions/history stay deleted through the registry merge; a
no-rev schema falls back to legacy upsert and still unions. App-boot smoke
(Home + Stats suites) green.

**User action**: re-run `supabase/schema.sql` in the Supabase SQL editor
(adds the `rev` column — same 2-minute process as before). The app works
either way; the CAS guard activates once the column exists.

## 60 · Train-page bug sweep + tap targets (user: "you had me feeling crazy. Make sure you are checking for bugs along the build")

Post-mortem on why the speed-day reset survived several rounds: my tests
exercised the **Today** interactive path while the actual button lived in
`logFoot` (Full-week / non-featured days) — green tests, real bug. Fix for the
process, not just the symptom: a `scratchpad/audit-train.mjs` state-matrix sweep
that drives the Train tab through **9 states × light/dark = 18** (not-started,
today lift fresh/manual/logged, speed fresh/logged, deload week, full-week
fresh/logged) and asserts hard invariants in each:
- zero app/console errors (sandbox-only external-CDN failures filtered out),
- no leaked `undefined` / `NaN` / `[object Object]` / unreplaced `{{V}}`,
- every logged day exposes a reset (finish-bar clear OR `logFoot` reset),
- no half-width `.logbtn` (ratio ≥ 0.8 of its `.day-foot`),
- warm-up folds never `[open]` by default,
- tap targets ≥ 44px.

The sweep came back clean on the functional invariants (the §59 fixes hold in
every state, both themes) and surfaced one real nit: the Today/Full-week toggle
(33px), week-strip chips (37px) and log buttons (39px) were under the 44px
mobile standard. Bumped `.planview-seg button`, `.ws-chip`, and `.logbtn` to
`min-height:44px`. Re-run: 18/18 clean.

## 59 · Trim the Train prose + fix the logged-day button/reset everywhere (user: "shorten the words… speed day still doesn't have the reset button and the logged button is still half size")

Two things.

**Shorter copy.** The user clarified the clutter is the long "why" paragraphs,
not the (already-folded) playbook. Cut roughly in half across the Train page —
the speed rationale (`note`) and both field/gym intros, the four wave straps
(`WAVES[*].strap`, which also feed the deload banner + season map), the rest-day
line, the range cue (`romcue`), the primer caution note, and the exercise-list
notes ("swaps, cues & logging live in the player"). Meaning preserved, words
gone; the deep coaching still lives in the player + the playbook fold.

**The half-size logged button + missing reset.** `logFoot()` (the per-day
log/edit button used in Full-week and non-featured days) rendered a single
right-aligned `inline-flex` pill — half-width on mobile, and with no reset. Root
cause of both reports: the earlier clear/reset work only reached the Today
finish bar, not `logFoot`. Fixes:
- `.day-foot` is now a full-width stacked column; `.logbtn` is `width:100%`
  centered — no more half pill.
- A logged day's `logFoot` now shows **✓ Logged — tap to edit** *and* a
  full-width **↺ Clear / reset this workout** (two-tap confirm, `.logbtn.reset`).
- `clearWorkout()` refactored to `clearWorkoutFor(week, day)` (day-scoped, no
  `ilog` needed); new `[data-clearday]` handler in the plan listener drives it.
  So the speed day — and every logged day, in any view — can be reset in place.

Verified in test-train3.mjs: Full-week logged day exposes a working
`[data-clearday]` reset, the logged button spans ~91% of its card (was ~half),
two-tap clears it; train2/hype/force-update suites green; no test referenced the
old copy.

## 58 · Fold the Full-week warm-ups too (user: "collapse the daily warmups on this train page view")

§56 folded the warm-up on the Today card, but the **Full week** view still
printed every day's warm-up checklist inline — 4–5 expanded warm-ups down one
scroll. Each non-interactive day card (lift + speed) now wraps its warm-up in
the same collapsed `<details class="prelift">` fold as the Today card, so the
week reads as a list of day headers with a one-tap "🔥 Warm-up …" row on each.
Verified in test-train3.mjs: full-week has ≥4 day cards, every one has a
`details.prelift`, none open by default, zero warm-ups inline outside a fold,
log buttons intact.

(Also confirmed with the user: the earlier "speed section never updated" was
the stale-PWA cache from §57, not a code issue — the compact speed day was
live all along, just not reaching the home-screen app.)

## 57 · PWA update reliability (user: "I'm refreshing the save-to-home version and it's not working")

The installed (home-screen) PWA wasn't picking up new builds on refresh. Three
compounding causes, three fixes:

1. **HTTP-cache staleness on the HTML.** GitHub Pages serves HTML with
   `max-age=600`, and the SW's network-first document fetch used the default
   cache mode — so for ~10 min after a deploy it could hand back a stale
   `index.html` (old hashed `app.js` → old app) even online. The SW now fetches
   the document with `{ cache: 'no-store' }`, guaranteeing the fresh HTML that
   points at the new hashed assets (offline still falls back to cache).
2. **Standalone PWAs resume, they don't reload.** `reg.update()` ran only on
   `load`, which a home-screen app often skips when reopened from the app
   switcher — so the update check could be missed for days. Now it also runs on
   `visibilitychange→visible`, `focus`, and `pageshow[persisted]`. A new SW
   self-activates (`skipWaiting`) and the existing `controllerchange` handler
   reloads once.
3. **No manual escape hatch.** New **🔄 App version** card on the You tab shows
   the live build hash (`window.FF_BUILD`, injected into the HTML template as
   `{{V}}`) and a **↻ Force refresh to the latest** button — `ffForceUpdate()`
   unregisters every SW, deletes every Cache Storage entry, and hard-reloads
   (2.5s watchdog so a wedged SW can't hang it). Data is untouched (it's all in
   localStorage, not the asset cache).

Note: the stuck client has to receive this new SW once (a full close/reopen or
one Force-refresh) before the automatic path self-heals future updates.
Verified in test-forceupdate.mjs (build stamp is a 10-char hash and shows on
the card, button present, click flips it + clears Cache Storage, zero errors).

## 56 · Warm-up collapsed by default on every Today card (user: "it's the whole train day… I thought we collapsed a little more")

The warm-up & power primer `<details>` opened by default (since §36 —
"do these first, easy to miss"). It's the single biggest block on the Today
card, and it's prep, not the workout — the guided player runs it for you
anyway. Now it starts **collapsed** on both lift and speed days: one
"🔥 Warm-up & power primer — do these first ▾" row, one tap to open. The
exercise list is now the visible focus directly under the Start button.
Lift Today card ≈ 674px (7 exercises visible, warm-up folded) vs the taller
open-warm-up version. Verified in test-train3.mjs (warm-up present but not
`[open]`, exercise rows still visible, speed day same).

## 55 · Speed day compaction (user: "I thought the train day / the workout was more collapsed")

Train 2.0 (§36) made lift days compact — a tight drill list with the warm-up
and set tables folded — but the Speed & Power day kept its old full layout:
warm-up open inline, the complete drills table with every cue printed, plus
the intro / "why this order" / no-gear prose, all expanded. So it towered
over every lift day. The featured (interactive) speed day now uses the same
`.day-focus` model as a lift day:

- Player CTA ("▶ Start / Resume / ✓ replay speed session") up top.
- Warm-up + the field/gym toggle + all the prose (intro, speed-101,
  "why this order", no-gear) behind one `.prelift` fold — open when there's
  no logged work yet, collapsed once you start (same rule as lift days).
- The six drills as a compact `.sess-list` (icon · name · target · ›,
  tap → history) instead of the inline description table. The full table +
  prose remain the **Full-week** reference view (`interactive=false`
  unchanged).

Fresh interactive card ≈ 455px vs the old multi-screen card. Verified in
test-train3.mjs (speed block): compact `.day-focus`, no inline `table.ex`,
warm-up folded, fresh day lists all 6 drills with the warm-up open,
Full-week view keeps the full table + per-day log buttons, finish/clear
still work, zero page errors.

## 54 · Speed day parity (user: "Speed day is missing reset and the box is half sized")

The §53 clear/reset fix landed on lift days but not the Speed & Power day —
its `dayCardHtml` branch has always short-circuited before the interactive
lift path, so it never set `ilog`. Result: the finish bar came up empty (no
Finish, no Clear), and the day fell back to the small right-aligned
`logFoot` "✓ Logged — tap to edit" pill — the "half-sized box." Now the
featured (today/past) Speed day sets `ilog` from `buildSession` like a lift
day, so the full-width **✓ Finish / ↺ Clear / reset** bar renders below it,
and the compact `logFoot` is dropped when interactive (the Full-week view
keeps its per-day log buttons). The player CTA now also reflects state
("✓ Speed session done — replay it" once logged). Verified in
test-train3.mjs (speed block): finish bar + clear present, no `.logbtn`
half-box, two-tap clears the speed session, full-week still shows log
buttons, zero page errors.

## 53 · Train fixes (user: "take out the stats… reset a workout… a future day starts to log it")

Three reports from a day of real use on the Train tab:

1. **The "📊 See your full progress → Stats" shortcut is gone.** The bottom
   tab bar already has a Stats tab and the Train hero carries the week
   progress bar, so the in-Train link was a redundant third door. Workout
   history stays (it's a different destination — the log modal, not Stats).
2. **A logged day always offers clear/reset.** The finish bar now renders
   whenever the featured day has a saved session *or* typed work (was:
   only while manual-log mode was on or work was typed), so a workout
   finished in the guided player still surfaces its reset control on the
   Train card. Button relabeled **"↺ Clear / reset this workout"** (the
   existing two-tap confirm + `clearWorkout()` tombstone flow is unchanged).
3. **Opening a future day previews it instead of starting a log.** Tapping
   a day that hasn't arrived used to render the interactive inline logger
   (auto-set `ilog`, finish bar, editable/`Resume` state) — it "started to
   log it." A featured day whose calendar date is after today (new
   `isFutureDay()`/`dayCalDate()` in 040, off the week-strip position) now
   renders **read-only**: the plan + warm-up to preview, an amber
   "📅 Coming up {date}" banner, and no auto-session. Training early is
   still possible on purpose via the card's **Log workout** button (no
   guard added — the fix is that *opening* ≠ *logging*, not blocking
   intent). Nothing is written to `ff_log` on open.

`.upcoming-banner` themes off tokens (no hand-pinned dark variant needed).

**Verified** (test-train3.mjs): stats link absent + history link + hero
bar present; today renders interactive; a future chip → upcoming banner,
no `.day-focus`/finish bar/inputs, exercise table still previews, explicit
log path intact, `ff_log` untouched on open; a logged day → finish bar with
"↺ Clear / reset", two-tap wipes the session and un-marks the chip; zero
page errors. test-train2 re-run green (no regression to the compact list,
manual toggle, or player).

## 52 · Stats 3.0 — consolidation (user: "still doing too much… can we consolidate?")

The 2.0 folds made every card cheap, but eight parallel rows is still eight
parallel decisions, and the two always-open cards each did several jobs.
This pass groups by **story**, not by data source:

1. **Octane hub folds its pillars.** The gauge + biggest-lever line is the
   daily answer; the six pillar bars are the breakdown, now behind
   "What drives it — the six pillars ›" (ff_statsfold key `pillars`, closed
   by default, same toggle plumbing as every other fold). Pillar drill-ins
   unchanged inside the fold.
2. **Speed card trimmed to its story.** Keeps number → chart → "+N yards"
   payoff → baseline/best foot. The "typical amateur is X–Y mph" paragraph
   moved into the `speedtest` glossary term (new `dyn` hook on FF_TERMS:
   a function whose output is appended when the sheet opens, so the line
   stays age/sex-personalized via `ffBench()`); a term link sits in the
   card foot. The "next test in N days" countdown is gone — the test only
   claims a slot on the day it's due (`speedTestDue()` → CTA).
3. **🏋️ Gym & body**: PR Wall + Strength (e1RM rows) + Bodyweight +
   Consistency were four folds answering one question ("is the gym work
   working?") → merged into ONE fold with `.pc-sec` sub-headers.
   `prWallHtml()` → `prWallInner()` (returns content, not a card). Missing
   sub-sections nudge inline (`pc-need` one-liners) instead of spawning
   separate cards; the closed row's stat is best e1RM → bodyweight →
   session count, whichever exists first.
4. **🗺️ Your season** absorbs the Sunday Scorecard: map = where you are in
   the plan, scorecard = how this week of it is going — one plan story.
   Scorecard grid re-colored inside the dark season card (`.season .sc-*`
   overrides); share button and glossary terms intact. `scorecardHtml()`
   deleted; `sunday` fold key retired.
5. **"📝 Log today" row deleted** — it duplicated the labeled ＋ Log FAB
   floating on the same screen (`.qopen-row` CSS removed with it; the
   dead `.scorecard`/`.sc-head`/`.pc-bench` styles removed too).

Page is now: Octane (gauge + lever) → Speed (open) → 3 story rows + Leaderboard
→ coach button. **Rich-state height 1,574px → 975px (−38%)**. Old fold keys
(`prwall`/`strength`/`weight`/`consist`/`sunday`) simply orphan in
`ff_statsfold` — harmless.

**Verified** (test-stats3.mjs, 21 checks): fold set exactly
pillars/speed/course/gym/season/lb; pillars expand to 6 bars + drill-in +
collapse; gym card carries all four sections, lift rows still open the
history sheet; season card = map + 6 holes + share, terms open sheets
without toggling the fold; state survives tab round-trips; closed-row
stats correct; fresh user gets the 4-row unlock strip and nothing else;
zero page errors light/dark. Legacy tests patched (test-hype opens the gym
fold to find the PR wall; test-intuitive targets `season` instead of
`sunday`; test-calm-stats superseded by test-stats3).

## Cross-cutting notes / recorded follow-ups

- `ff_speedtest` and `ff_mobility` were added to the cloud-sync `KEYS` blob
  (cloud-wins merge like other non-log keys). If two devices screen/test on the
  same day the newer push wins — acceptable for low-frequency rituals; move to
  additive merge if it ever matters.
- SW cache bumped to `fairwayfuel-v122`; `cloud-sync.js` pin bumped to `?v=103`.
- **Tech-debt observations from this pass** (not addressed here, worth a future
  pass): the 5.8k-line single-file app is nearing the practical limit for safe
  editing; `cloud-sync.js` swallows every error silently (a persistently failing
  push is invisible); `weekStartDate` (plan-anchored) vs `weekStartDateCal`
  (calendar Monday) coexist and are easy to confuse; the two workout loggers
  (modal + inline) duplicate progression logic.
- **Ideas queued by these features:** streak/badge layer on top of the test
  ritual; a "peak for an event" mode that aligns the wave's Peak with a real
  tournament date from the user; server push for re-engagement (the biggest
  remaining retention lever); mobility trend chart on Stats once a few screens
  accumulate.
