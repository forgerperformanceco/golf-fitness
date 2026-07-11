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
