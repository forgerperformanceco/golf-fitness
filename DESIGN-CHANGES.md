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
