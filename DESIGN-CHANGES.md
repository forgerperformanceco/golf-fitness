# Design changes — engagement & performance upgrade (Jul 2026)

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
  types — FairwayFuel's warm-ups live in the checklist and never enter the
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
the golf ever happened. This is the feature only FairwayFuel can own: Arccos
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
PR to friends shouldn't look like an ad. Footer now reads "FairwayFuel · Turn
muscle into distance ⛳" (brand, no URL), and the share/clipboard text
fallbacks dropped the https link too ("— training with FairwayFuel ⛳").

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
  `fairwayfuel-backup-YYYY-MM-DD.json` (`{app,kind:"backup",version,exported,
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
  "🔁 How FairwayFuel works" sheet from the You tab (next to the new
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
