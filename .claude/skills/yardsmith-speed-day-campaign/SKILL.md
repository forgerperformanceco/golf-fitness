---
name: yardsmith-speed-day-campaign
description: >
  THE EXECUTABLE CAMPAIGN for Yardsmith's hardest live problem: pressure-testing
  the Speed & Power day (drill selection, volume, overspeed protocol) against
  the evidence base — YARDSMITH-BRAIN open thread 7. Load this when asked to
  "pressure-test the speed day", "review/improve the Speed & Power day",
  "check the overspeed protocol", "is the speed day evidence-based", "change a
  speed drill", "tune speed-day volume", or anything touching
  PHASES[0].speed / purposeFor / overspeedDose / speedDrillTarget in
  src/js/app/035-training-plan.js. Numbered phases with exact commands,
  expected observations at every gate, a ranked solution menu with theory
  obligations, fenced wrong paths, and a validation/promotion protocol routed
  through yardsmith-change-control. Keywords: speed day, Speed & Power,
  overspeed, CMJ, jump, med-ball throw, Brennan 2024, zr, wave trim, ballistic,
  drill selection, 7-iron speed test.
---

# The Speed & Power day campaign — pressure-test the day that turns muscle into yards

**Mission** (YARDSMITH-BRAIN.md:432-433, open thread 7): *"Pressure-test the
Speed & Power day (selection, volume, overspeed protocol) — the day with the
most direct clubhead-speed transfer."* This skill is the end-to-end runbook: it
extracts the current prescription programmatically, maps every drill to its
evidence status, ranks candidate changes (each with the proof it owes),
implements strictly through change control, and defines measurable promotion
criteria. A session with zero prior context can run it phase by phase.

**When NOT to use this skill:** commit/merge/release mechanics
(→ `yardsmith-change-control` — Phase 3 routes through it, never around it);
the domain theory itself — effect sizes, wave params, e1RM math, glossary
(→ `golf-fitness-domain-reference`); the general verification recipes this
campaign instantiates (→ `yardsmith-proof-and-analysis-toolkit`); Playwright
mechanics and harness gotchas (→ `yardsmith-playwright-harness`); pass/fail
thresholds and the audit pack (→ `yardsmith-validation-and-qa`); localStorage
key shapes (→ `yardsmith-data-and-sync`); what counts as evidence and the
idea lifecycle in general (→ `yardsmith-research-methodology`). If you're
debugging a *bug* on the speed day rather than pressure-testing its design,
start with `yardsmith-debugging-playbook`.

All file:line references below are as of 2026-07-08, HEAD `f21930a`, build
hash `04f691fff1`. Re-verify anchors per the Provenance section before
trusting a line number after the repo has moved.

---

## 0. The system under test — 10-minute orientation

The Speed & Power day is **data + a target pipeline**, all in
`src/js/app/035-training-plan.js` (rendered/rebuilt per CLAUDE.md: edit
`src/`, never root outputs, then `node scripts/build.mjs`):

| Piece | Where | What it is |
|---|---|---|
| Drill lists (the day itself) | 035:9-35 (`PHASES[0].speed`) | Two variants: `field` (7 drills) and `gym` (6 drills), each `[name, "S × R", description]`. Chosen by `speedMode()` (035:221-225): sticky `ff_speedmode`, else `barbell owned → gym`. |
| Day slot in the week | 035:46 (`days5[3]`) and 035:67 (`days4[3]`) | `{ name:"Day 3 — Speed & Power", tag:"speed", type:"speed" }` — same day object in both frequencies. |
| Drill classification | 035:349-360 (`purposeFor`) | Regex → 🌀 rotation / ⚡ power / 🏋️ strength / 💪 hypertrophy. **Order matters**: Single-Arm → rotation → power → strength → default 💪. This function silently drives every wave prescription — the 6932f28 incident lives here. |
| Wave phase | 035:410-421 (`waveFor`) | week → accumulate/intensify/deload/peak (6-week cycles, ≥19 peak, `ff_event` remaps). |
| Volume transform | 035:430-440 (`waveAdjust`) + 035:442 (`effTarget`) | intensify: 🏋️ −2 reps (floor 3), 💪 −1 set; deload: −1 set all; peak: −1 set for ⚡/🌀, −2 otherwise. Set floor 2 (`trimSets`, 035:425-427). |
| Overspeed ramp | 035:445-450 (`overspeedDose`) | Its own dose, ignoring the authored "3 × 5": `2×5` (wk≤2, deload, peak) → `3×5` (wk≤8) → `4×5` (wk≥9). |
| The one dispatch | 035:451-454 (`speedDrillTarget`) | `/Overspeed/i` → `overspeedDose(week)`, else `effTarget(sr, name, week)`. Used by BOTH the day card (035:483) and the logger/player session builder (`buildSession`, 040:238-242) — display and logging cannot drift. |
| Player effort note | 070:171 | `purposeFor(x.name)==="⚡" ? "max intent · full rest" : effortNote(x.target)` — note the 🌀 gap, see Phase 1. |
| Speed-test ritual | 060-speed-test-day…js:18-19, 107-120 | Biweekly (`SPEEDTEST_EVERY=14`, due at ≥13 days since ANY speed entry), 3 max-intent 7-iron swings, best-of writes `ff_body` (via `logBodyEntry`) + `ff_speedtest`. |
| Evidence base | `CLUBHEAD-SPEED-REFERENCE.md` §9 (231-338) + §10 (342-411) | The overspeed review and the session-design evidence. The banned claims live in §9.2/§9.6. |

Jargon: **zr** = z-transformed pooled correlation (Brennan et al. 2024 meta-
analysis); **overspeed** = swinging a light implement at max intent; **CMJ** =
countermovement jump. Everything else → `golf-fitness-domain-reference`.

---

## Phase 0 — Baseline extraction (run before touching anything)

Extract what the app **actually prescribes today**, from source, for both
modes across representative weeks (1, 4, 6, 9, 12, 19 = accumulate, intensify,
deload, accumulate-cycle-2, deload-2, peak).

**Command** (from the repo root; the script is shipped with this skill and ran
green on 2026-07-08 — output recorded in `scripts/baseline-2026-07-08.txt`):

```
node .claude/skills/yardsmith-speed-day-campaign/scripts/dump-speed-day.mjs
```

The script loads the real `035-training-plan.js` in a `node:vm` sandbox
(stubs: no `ff_event`, no `ff_speedmode` override, no user swaps,
`planStart() = null`, goal `leanbulk`) and calls the same `speedDrillTarget`/`purposeFor`
the app calls. It also **asserts five invariants** and exits non-zero on any
violation — it is simultaneously the Phase-1 regression gate.

**Expected observation** — exactly this (the recorded 2026-07-08 baseline):

```
# wave per week: wk1=accumulate · wk4=intensify · wk6=deload · wk9=accumulate · wk12=deload · wk19=peak

## FIELD mode (7 drills)
| drill                     | class | authored     | wk1          | wk4          | wk6          | wk9          | wk12         | wk19         |
| Countermovement jump      | ⚡     | 4 × 3        | 4 × 3        | 4 × 3        | 3 × 3        | 4 × 3        | 3 × 3        | 3 × 3        |
| Rotational med-ball throw | 🌀    | 4 × 4 / side | 4 × 4 / side | 4 × 4 / side | 3 × 4 / side | 4 × 4 / side | 3 × 4 / side | 3 × 4 / side |
| Seated chest throw        | ⚡     | 3 × 4        | 3 × 4        | 3 × 4        | 2 × 4        | 3 × 4        | 2 × 4        | 2 × 4        |
| Lateral bound             | ⚡     | 3 × 4 / side | 3 × 4 / side | 3 × 4 / side | 2 × 4 / side | 3 × 4 / side | 2 × 4 / side | 2 × 4 / side |
| Overhead med-ball slam    | ⚡     | 3 × 4        | 3 × 4        | 3 × 4        | 2 × 4        | 3 × 4        | 2 × 4        | 2 × 4        |
| Ground-force footwork     | ⚡     | 3 × 5 / side | 3 × 5 / side | 3 × 5 / side | 2 × 5 / side | 3 × 5 / side | 2 × 5 / side | 2 × 5 / side |
| Overspeed swings          | ⚡ramp | 3 × 5        | 2 × 5        | 3 × 5        | 2 × 5        | 4 × 5        | 2 × 5        | 2 × 5        |

## GYM mode (6 drills)
| drill                     | class | authored     | wk1          | wk4          | wk6          | wk9          | wk12         | wk19         |
| Trap-bar jump             | ⚡     | 4 × 3        | 4 × 3        | 4 × 3        | 3 × 3        | 4 × 3        | 3 × 3        | 3 × 3        |
| Landmine rotational throw | 🌀    | 4 × 4 / side | 4 × 4 / side | 4 × 4 / side | 3 × 4 / side | 4 × 4 / side | 3 × 4 / side | 3 × 4 / side |
| Speed bench press         | ⚡     | 4 × 4        | 4 × 4        | 4 × 4        | 3 × 4        | 4 × 4        | 3 × 4        | 3 × 4        |
| Kettlebell swing          | ⚡     | 3 × 6        | 3 × 6        | 3 × 6        | 2 × 6        | 3 × 6        | 2 × 6        | 2 × 6        |
| Cable lateral chop        | 🌀    | 3 × 4 / side | 3 × 4 / side | 3 × 4 / side | 2 × 4 / side | 3 × 4 / side | 2 × 4 / side | 2 × 4 / side |
| Overspeed swings          | ⚡ramp | 3 × 5        | 2 × 5        | 3 × 5        | 2 × 5        | 4 × 5        | 2 × 5        | 2 × 5        |

ALL INVARIANTS PASS (A no-💪 · B hold at accumulate/intensify · C -1 set at deload/peak · D overspeed ramp · E retain no-op)
```

**GATE 0 — hand-inspection.** Pick two rows and re-derive them from source by
eye: (a) "Seated chest throw 3 × 4" at wk19: `purposeFor` hits `/Throw/` in
the power regex (035:357) → ⚡ → peak trims 1 set (035:438) → `2 × 4` ✓;
(b) Overspeed wk9: `waveFor(9)`=accumulate, week>8 → `4 × 5` (035:445-450) ✓.
Also confirm the drill lists in the table byte-match 035:15-21 and 035:27-32.

- **If the script exits non-zero or the table differs from the recorded
  baseline** → the plan source has changed since 2026-07-08. STOP; diff
  `git log --oneline -- src/js/app/035-training-plan.js` since `f21930a`,
  re-derive the new baseline by hand-inspection, and only then continue with
  the NEW table as your baseline (update the recorded output alongside your
  work). If the invariant failure is not explained by an intentional commit →
  you have found a live wave-engine regression: jump to **Phase 1's branch**
  (the 6932f28 recipe) before any design work.
- **If you also want the rendered-DOM confirmation** (belt and braces, or if
  vm-vs-app drift is suspected): use the `yardsmith-playwright-harness`
  recipe, seed a started plan, jump to each week via the Plan & settings
  "Jump to week" control (035:722-724), open the Full-week view and read the
  speed-day table cells (`.speedday table.ex td.sets`). The numbers must equal
  the script's table — `dayCardHtml` calls the same `speedDrillTarget`
  (035:483).

Two structural facts to note while you're here (both verified 2026-07-08):
- The **authored "3 × 5" for Overspeed swings is never displayed** — 
  `speedDrillTarget` short-circuits to `overspeedDose(week)` (035:452). Editing
  the authored string changes nothing; the ramp function is the truth.
- **Retain mode (goal maintain/cut) is a deliberate no-op on the speed day** —
  `adjSets` only trims 💪, and no speed drill is 💪 (invariant A). The Plan &
  settings banner promises "heavy lifts & all speed work stay at full"
  (035:719); invariant E in the script enforces it.

---

## Phase 1 — Evidence mapping (every drill gets its receipt)

Map each baseline drill to its evidence status in
`CLUBHEAD-SPEED-REFERENCE.md`. Read §10.1 (lines 349-380), §10.2 (382-391),
§10.3 (393-406) and §9 (231-338) in full — they are short and they ARE the
theory this campaign runs on.

The Brennan et al. 2024 pooled effect sizes (zr, CLUBHEAD ref 354-365) — the
ranking the day must embody:

| Quality | zr | Drills that carry it (baseline) |
|---|---|---|
| Jump impulse | **0.82** (strongest) | Countermovement jump / Trap-bar jump — CMJ variant is explicitly the best jump (Wells 2018, ref 375-376) |
| Upper-body explosive | **0.67** | Seated chest throw / Speed bench press; Overhead med-ball slam |
| Rotational + seated throws BOTH required | Read 2013 r≈0.67 amateurs; Turner 2016 seated r≈0.71 pros (ref 377-380) | Rotational med-ball throw / Landmine rotational throw + the seated/chest throws |
| Lower-body strength-speed / ground force | §12 trifecta (vertical·lateral·rotational) | Lateral bound, Ground-force footwork, Kettlebell swing, Cable lateral chop |
| Flexibility −0.04, Balance −0.06 | **NOT significant** (ref 364-365) | Correctly absent from the day |
| Overspeed clubs | Thin/ACUTE only (§9.2): +2.6 mph first-set-only, smash factor d=−0.82, no independent multi-week RCT | Overspeed swings — last slot, ramped, "the add-on, not the main event" (035:21) |

**Expected observations at this gate — verify each against your Phase-0 table:**

1. **Jumps and throws lead the day.** First drill in both modes is the jump
   (zr 0.82 quality); throws follow; overspeed is last. Session order = the
   §10.3 rule "explosive work FIRST, on a fresh CNS" (ref 398-399). ✓ today.
2. **Both throw variants present** (rotational AND seated/chest) per ref
   377-380. ✓ in both modes (field: Rotational med-ball throw + Seated chest
   throw; gym: Landmine rotational throw + Speed bench press).
3. **Reps 3-6 per set, low, "stop when a rep slows"** (§10.3, ref 400-402;
   suggested dose 3-4 sets × ~5 reps at ref 387). Baseline sets×reps all fall
   in 2-4 sets × 3-6 reps. Intro copy carries stop-when-slow (035:13, 25). ✓.
4. **Ballistic work is never wave-trimmed like an accessory**: invariants B/C
   in the script — ⚡/🌀 hold full dose through accumulate AND intensify, lose
   exactly one set at deload/peak. **If you ever see a speed drill drop 2 sets
   at peak, drop a set at intensify, or get a "drop 2 reps go heavier"
   prescription → that is the 6932f28 class of bug** (a name slipped past
   `purposeFor`'s regexes). BRANCH: run the wave-engine unit-case verification
   recipe in `yardsmith-proof-and-analysis-toolkit` (the 6932f28 pattern:
   enumerated classification cases + wave-adjustment cases + rendered plan at
   weeks 1/4/19) and fix classification BEFORE resuming design work here.
5. **Overspeed framed as adjunct, never promised**: card copy says "Modest
   evidence — the add-on, not the main event" (035:21, 32); the day note leads
   with jumps/throws (035:11). ✓.

**Known residual finding (verified 2026-07-08, pre-logged for Phase 2):** the
Workout Player's dim effort note (070:171) special-cases only ⚡ — 🌀 ballistic
drills (Rotational med-ball throw, Landmine rotational throw, Cable lateral
chop) fall through to `effortNote(x.target)` and display **"RIR 2–3 · rest 2–3
min"** — a grind note on max-intent rotational throws. Their **dose** is
protected (6932f28 fixed that); the **coaching copy** in the player is the
un-fixed tail of the same incident. This contradicts §10.3 "full rest between
efforts" and the day's own intro. It is candidate S5 below.

**GATE 1:** you can state, for every drill in the baseline, (a) which evidence
row justifies it and (b) which wave behavior it exhibits — with no drill
unaccounted for. Write this mapping down (it becomes the "Findings" half of
your eventual DESIGN-CHANGES entry). If any drill has NO evidence row, that is
a Phase-2 finding, not a reason to delete it on the spot.

---

## Phase 2 — Gap analysis: the ranked solution menu

Each candidate carries its **theory/derivation obligation** — the proof you
owe before it may reach Phase 3. Work top-down; stop when the owner's appetite
or the evidence runs out. Do NOT bundle candidates: one candidate = one change
= one verification.

| # | Candidate | Obligation (what you must derive/show first) |
|---|---|---|
| **S1** | **Reorder or replace a drill** (e.g. promote/demote within the day, swap a movement family) | Effect-size support from CLUBHEAD ref §10.1 — the new order must non-strictly follow the zr ranking (jump ≥ throws ≥ ground-force ≥ overspeed) and keep BOTH throw variants (ref 377-380). A replacement drill must map to an equal-or-stronger evidence row than what it replaces, and its NAME must classify correctly (Phase 4 `purposeFor` check is mandatory for any new/renamed drill). |
| **S2** | **Change the overspeed ramp dosage** (`overspeedDose`, 035:445-450) | The honesty constraint (§9.2/§9.6): evidence is thin and acute — no independent multi-week RCT exists (§9.7, ref 334-338), so any change must keep overspeed an "honestly-framed adjunct": it may not grow to rival the jumps/throws in volume, may not move earlier in the day, and NO copy change may increase claimed benefit. Dose changes must also keep the §9.5 mitigations (ramp-in, deload back-off, stop-when-slow, both sides). Cite only the ~4% combined-training number (ref 275-287) if a number is needed at all. |
| **S3** | **Change volume/rest/set-count on jumps/throws** | Session-design rules §10.3 (ref 393-406): explosive first, 3-5 reps ballistic, full rest, ~2 quality sessions/week, stop at velocity drop-off; plus the §10.2 dose precedent (3-4 × ~5). Any set-count change must re-run the Phase-0 script and re-derive what deload/peak produce (floor is 2 sets — `trimSets` 035:426; authoring a 2-set drill means deload/peak cannot trim it further, decide if that's intended). |
| **S4** | **Improve the biweekly speed-test signal quality** (060 module) | The repeatability rationale for the 7-iron: NUTRITION-AND-TRAINING-REFERENCE.md:486-487 — "7-iron is more repeatable than driver, so the week-to-week trend is a cleaner signal". Any protocol change (swing count, warm-up, cadence) must argue reduced variance or reduced bias of the trend, not vibes; must keep "same tool every test" (060:5-6, 105); must not break the due-clock rule that ANY newest speed entry resets the 14-day timer (060:9-17) or the `ff_body`/`ff_speedtest` write path (060:107-120 — data shapes belong to `yardsmith-data-and-sync`). |
| **S5** | **Fix the 🌀 player effort note** (070:171) — pre-verified finding from Phase 1 | Smallest candidate, do first if doing anything: derivation is already done (ballistic 🌀 work is max-intent/full-rest per §10.3 and the card's own cues). The fix must key off `purposeFor(x.name)` being ⚡ OR 🌀 (or better: off ballistic-ness), not off another name regex. Copy change only — zero dose change, so Phase-4 wave cases must come out IDENTICAL to baseline. |
| **S6** | **Copy/framing improvements** (Speed 101, intro, note text — 035:11-13, 25; `speed101Html` 045:132) | House honesty rules: goals are goals, never promises; no "+X mph" vendor framing; the only citable number is ~4% CHS "typical, not promised" (ref 286-287, 318-326). Voice rules → `yardsmith-docs-and-writing`. |

Ranking rationale: S5 is a verified defect with a finished derivation (fix >
analysis). S1-S3 are the actual open thread 7 and need the owner's read on the
evidence mapping. S4 improves the *measurement* that judges everything else —
valuable but it changes the scoreboard, so never bundle it with S1-S3 (you'd
be moving the ruler and the object in one commit). S6 is cheap polish.

**GATE 2 (decision gate — involves the owner):** present the Phase-1 mapping +
the menu with obligations. **Do not proceed to Phase 3 without an explicit
pick.** Record the decision (chosen AND explicitly-rejected candidates) — that
record is what closes or narrows BRAIN open thread 7 even if the answer is
"the day already matches the evidence; no change" (a legitimate, valuable
outcome: the pressure-test then simply produces the Verified mapping + BRAIN
note and ends).

---

## Phase 3 — Implementation (strictly through change control)

Load `yardsmith-change-control` NOW and follow it; this section only adds the
campaign-specific specifics. Non-negotiables restated because they are the
ones this campaign is most likely to trip:

1. **Edit `src/` only** — the day lives in `src/js/app/035-training-plan.js`;
   player copy in `070-…js`; Speed 101 in `045-…js`; test ritual in `060-…js`.
   Never touch root `app.js`/`index.html`/`styles.css`/`sw.js`.
2. **Any renamed or added drill: verify `purposeFor` classification the moment
   you name it** (035:349-360). Run the Phase-0 script — invariant A/B/C will
   catch a misclassified name instantly. Naming guidance from the regexes:
   rotational ballistic names need `Chop|Rotation(al)|Punch|Russian Twist` →
   🌀; other ballistic names need `Jump|Bound|Slam|Chest Pass|Throw|Toss|
   Clean|Overspeed|Footwork|Swing|Broad|Plyo|^Speed␣` → ⚡. A name matching
   NONE of these becomes 💪 and will be gutted at peak — the exact 6932f28
   failure. Beware the booby traps already encoded: `Landmine Press` is
   deliberately NOT 🌀 (it's a chest press); rotation is checked before power
   so "Rotational … throw" stays 🌀.
3. If a new drill needs gear, wire it in the `EX` substitution map (035:130-172)
   with ordered fallbacks down to bodyweight, or accept `equipNeedsFor`'s
   regex inference (035:179-209) — check what it infers for your exact name.
4. **Dose changes go in the functions, not the copy** — if you change
   `overspeedDose` you MUST update the three copy surfaces that state the ramp:
   the two Overspeed card notes (035:21 and 035:32) and any Speed 101/playbook
   text that repeats it. Grep before you ship:
   `grep -rn "2×5\|2\\\\u00d75\|structured ramp" src/`.
5. **Rebuild**: `node scripts/build.mjs` (CSS touched too → 
   `python3 scripts/gen-dark-theme.py && node scripts/build.mjs`). Commit src +
   outputs together. **Manual `?v=` pins stay untouched** (currently
   `cloud-sync.js?v=112`, `coach.js?v=88`) — this campaign has no business in
   either file; if a candidate somehow drags you into them, that's a
   change-control matter, follow its pin rule.
6. **No stored-key changes.** `ff_speedmode`, `ff_speedtest`, `ff_body`,
   `ff_swaps` keep their names and shapes. S4 changes that alter any synced
   shape require the `yardsmith-data-and-sync` add-a-key checklist — treat
   that as scope escalation and re-gate with the owner.

---

## Phase 4 — Validation & promotion (measurable, never by eye)

This is the 6932f28 verification pattern instantiated (see the commit message:
`git show 6932f28 -s --format=%B` — it is the house template for this exact
surface). Success = ALL of the following, each a countable assertion:

1. **The Phase-0 script, re-run, exits 0** and its table equals your PREDICTED
   post-change table — which you must write down BEFORE running (the
   hypothesis-predicts-numbers-first rule, → `yardsmith-research-methodology`).
   For copy-only candidates (S5/S6) the prediction is: byte-identical to the
   recorded baseline.
2. **Classification unit cases**: every drill name in both modes (13 rows) +
   any new/renamed names + the known traps ("Landmine Press" ≠ 🌀,
   "Speed bench press" = ⚡, "Cable lateral chop" = 🌀, "Barbell Bench Press" =
   🏋️) asserted against `purposeFor`. The 6932f28 fix used 37 classification
   + 10 wave-adjustment cases; match that coverage class. The Phase-0 script
   already encodes the wave-adjustment matrix (13 drills × 6 weeks); extend it
   in your scratchpad if your change adds names — recipe details in
   `yardsmith-proof-and-analysis-toolkit`.
3. **Rendered-plan checks at weeks 1/4/19** (accumulate/intensify/peak) via the
   `yardsmith-playwright-harness` recipe: the speed-day card and the player
   station targets show the predicted numbers; **zero pageerrors**; no leaked
   `undefined`/`NaN`/`{{V}}`. If the player was touched (S5): assert the dim
   note for each 🌀 drill now reads the intended text at all three weeks.
4. **The relevant audits green** per `yardsmith-validation-and-qa`:
   `audit-train.mjs` 18/18 (the speed day is one of its states) is mandatory
   for any Train-surface change; `audit-type.mjs` if copy length/format
   changed; full battery for anything structural.
5. **Build determinism**: rebuild → `git status` shows only your intended
   files; committed outputs match `build(src)`.
6. **Docs of record** (→ `yardsmith-docs-and-writing` for templates):
   a **DESIGN-CHANGES.md entry with a "Verified" paragraph** naming the exact
   assertions and counts (note: new sections are appended after §51 in
   DESCENDING numeric order — read the file tail first), and a
   **YARDSMITH-BRAIN.md update**: decisions-log line (§6) for what was chosen
   AND rejected, plus edit open thread 7 (§10) to its new state — closed,
   narrowed, or explicitly "pressure-tested 2026-MM-DD, no change warranted".
   The wave-engine fix 6932f28 itself never got a DESIGN-CHANGES section
   (verified by grep 2026-07-08) — do not repeat that gap.
7. **Promotion** = merge to main per `yardsmith-change-control` (remember:
   merge deploys the live site with no CI build/tests) + post-deploy FF_BUILD
   check per `yardsmith-run-and-deploy`.

**The scoreboard caveat:** the ultimate metric — does the user's 7-iron trend
improve faster — is NOT measurable inside this repo (no usage data lands
here). Do not claim it. The campaign's honest, measurable claim is: *the
prescribed day now matches the best available evidence, provably, at every
week of the wave.* Per §9.6: "your own numbers are the evidence" — the app
proves per-user, the repo proves per-prescription.

---

## Fenced wrong paths — do NOT go here

Settled battles and banned moves (sources: YARDSMITH-BRAIN.md §6 Rejected list
lines 315-322, CLUBHEAD ref §9.2/§9.6, CLAUDE.md invariants):

- **Do NOT revive the "Dyno Day" / synthetic test battery** (BRAIN:318-320,
  marked *Don't revive*). Pressure-testing the speed day ≠ adding a DRVN-style
  10-test assessment. The scoreboard stays yards / the 7-iron trend.
- **Do NOT import DRVN protocols or ingest their marketing/curriculum PDFs**
  (BRAIN:321; competitive rules → `yardsmith-external-positioning`). Borrow
  published science, never a competitor's branded programming.
- **Do NOT cite refuted or vendor numbers**: the MyGolfSpy "+8.2 mph" figure is
  explicitly refuted — never cite it (ref 272-273); no "+5 mph in 6 weeks"
  vendor claims (ref 325-326); no promised mph gains anywhere in copy — the
  only defensible figure is ~4% CHS from combined training, framed "typical,
  not promised" (ref 286-287).
- **Do NOT trim ballistic doses at peak beyond the one-set ease, and never at
  intensify** — peak exists to keep speed work crisp (035:373-379 comment,
  invariants B/C). Any candidate that cuts ⚡/🌀 harder than 🏋️/💪 has the
  evidence exactly backwards.
- **Do NOT promote overspeed to a headline** — more volume than the ramp's
  4×5 ceiling, first-slot placement, or benefit-forward copy all violate the
  §9 review this app is built on.
- **Do NOT touch stored key names** (`ff_speedmode`, `ff_speedtest`,
  `ff_body`, the `"fairwayfuel"` profile key) — CLAUDE.md invariant; renames
  wipe user data.
- **Do NOT edit the generated root files** or hand-resolve conflicts in them —
  take either side and rebuild.
- **Do NOT judge by eye.** "The table looks right" is not a gate; the counts
  in Phase 4 are.

---

## Provenance and maintenance

All facts verified against the repo on **2026-07-08** at HEAD `f21930a`,
build hash `04f691fff1`. Re-verification one-liners:

- Baseline still true / plan source unchanged:
  `node .claude/skills/yardsmith-speed-day-campaign/scripts/dump-speed-day.mjs`
  (must print the table above + ALL INVARIANTS PASS; recorded copy at
  `scripts/baseline-2026-07-08.txt` beside this file) and
  `git log --oneline f21930a.. -- src/js/app/035-training-plan.js` (empty ⇒
  anchors 035:* above are still exact).
- Function anchors: `grep -n "function purposeFor\|function waveFor\|function waveAdjust\|function effTarget\|function overspeedDose\|function speedDrillTarget" src/js/app/035-training-plan.js`
  (expect 349/410/430/442/445/451).
- Player 🌀 effort-note quirk still present:
  `grep -n 'purposeFor(x.name)==="⚡"' src/js/app/070-workout-player-full-screen-guided-sessio.js`
  (line 171; if it now includes 🌀, candidate S5 is done — update Phase 1/2).
- Evidence sections: `grep -n "^## 9\.\|^## 10\.\|^### 9\.2\|^### 10\.1" CLUBHEAD-SPEED-REFERENCE.md`
  (expect 231/342/256/349); zr table at 354-365; refuted figure at 272-273.
- Open thread 7 still open: `grep -n "Pressure-test the Speed" YARDSMITH-BRAIN.md`
  (line 432 as of 2026-07-08; if reworded/removed, read §10 before running
  this campaign — it may be done or re-scoped).
- Manual pins (Phase 3 step 5): `grep -n "cloud-sync.js?v=\|coach.js?v=" src/index.template.html src/sw.template.js`
  (v=112 / v=88 as of 2026-07-08).
- Speed-test cadence: `grep -n "SPEEDTEST_EVERY" src/js/app/060-speed-test-day-the-biweekly-testing-ritu.js` (=14, line 18).
- Sibling-skill availability: this skill cross-references
  `yardsmith-proof-and-analysis-toolkit` and `yardsmith-research-methodology`
  (both present in `.claude/skills/` as of 2026-07-09) — if either is ever
  absent, the 6932f28 pattern summary in Phase 4 above is self-sufficient
  (the commit message itself, `git show 6932f28`, is the primary source).

Honest gaps: (1) the Playwright rendered-plan walk described in Gate 0/Phase 4
was NOT shipped as a script here — it depends on the harness recipe owned by
`yardsmith-playwright-harness`; the vm-based extractor was chosen as the
shipped, deterministic gate because display and logger provably share
`speedDrillTarget` (035:483, 040:238-242). (2) The live-user question — has
any real user's speed trend validated the day — cannot be answered from this
repo and is deliberately outside the campaign's success criteria.
