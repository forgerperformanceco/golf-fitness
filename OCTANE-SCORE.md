# Octane — feature spec

One number for a golfer's **build-to-speed progress**, shown as an on-brand fuel
gauge (E→F). It's our answer to the one measurability edge competitors have (e.g.
DRVN's composite assessment) — but built entirely from **our own data**, so there's
no IP overlap. See `COMPETITIVE-LANDSCAPE.md`. (Earlier docs call it the "Yardsmith
Score"; the app has called it **Octane** since the rebrand. The coach receives it as
`yardsmithScore` — same number.)

> **What it is (and isn't):** a *progress + consistency* score, not a leaderboard or
> an absolute fitness rating. We don't publish normative tables (that would mean
> borrowing other apps' proprietary data). Instead the gauge reads **your trajectory**
> — are you showing up, getting faster, getting stronger, turning mass into speed,
> staying mobile, and eating the plan.

Status: **shipped (client-side)**. Engine: `ffScore()` in
`src/js/app/070-workout-player-full-screen-guided-sessio.js`; card: `renderScoreCard()`
in the same file. It lives on the **Stats tab** (`renderProgress()` in
`085-progress-stats-view.js`): gauge + one-line summary, with the six pillar bars in a
"What drives it — the six pillars" fold (closed by default). No backend required — it reads
localStorage the app already writes.

## Inputs (all already captured)
| Source | Used for |
|---|---|
| `ff_log` / finished sessions (`sessionsByWeek()`) | consistency + strength e1RM |
| `ff_body` (`[{iso,date,ts,w,s,d,ss}]`, w=lb, s=7-iron mph, ss=source tag) | speed trend + power-to-weight (this season only) |
| `curWeek()` | weeks elapsed (for "expected sessions") |
| `planState.freq` (4/5) | expected sessions per week |
| `state.goal` + `GOALS[goal].weekly` (025) | the goal's weekly bodyweight band, for power-to-weight |
| `ff_mobility` (`[{ts,date,tests:{trunk,hip,squat},score}]`) | mobility pillar (3-move self-screen, each test 0/1/2) |
| `ff_fuel` via `fuelScoreFor(iso)` (030) | fuel pillar (meal check-off adherence) |

## Pillars & weights (0–100, rescaled to the pillars that have data)
| Pillar | Max | How it's scored |
|---|---|---|
| **Consistency** | 35 | Finished sessions in the last `min(week,8)` plan weeks ÷ `(freq × min(week,8))`, clamped 0–1, ×35. Rewards showing up; decays if you stop. |
| **Clubhead speed** | 30 | **This season's** 7-iron trend (Oct 2026): a least-squares line through the season's tests (from 2 weeks before plan start; rough guesses never count, and once a guided Speed Test exists older untagged numbers stop anchoring — `ffSeasonSpeedRows` in 060), its rise shrunk toward 0 by test noise (`ffSpeedSignal`: counts only past max(1.5 mph, 2 SE)). `15 + effGain% × 220`, clamped 0–30 (neutral ≈15; a move inside the noise reads "Steady"). |
| **Strength (e1RM)** | 25 | Avg gain in estimated 1RM (Epley `w·(1+r/30)`) on the big compound lifts (`isBigLift` — squat/deadlift/bench/press/row/RDL/hinge/hip thrust/pull-up; no throws, speed work or Pallof), first → best: `10 + gain% × 150`, clamped 0–25. |
| **Power-to-weight** | 10 | **Goal-aware (Oct 2026).** Is speed rising relative to bodyweight *for your goal*? On Lean Bulk / Bulk, weight gained inside the goal's weekly band doesn't count against you — only gaining faster than the band does. On Lean Out / Maintain, weight loss alone earns nothing — speed has to hold or rise. Speed changes inside normal test-to-test noise count as no change. Weight pace = least-squares slope over the last 8 weeks of this season vs the goal's planned pace, with the Fuel check-in's on-track tolerance (max(0.5 lb, 60% of the goal rate, 2 SE)); `5 + (effSpeedGain − excessGain) × 250`, clamped 0–10. Exact code: `ffP2wRead()` in 070. |
| **Mobility** | 10 | Latest 3-move screen (seated trunk rotation, 90/90 hips, overhead deep squat — each 0/1/2) → `score/100 × 10`. Re-screen due every 28 days; the pillar flags "Re-screen due" past 35. Durability framing, not a speed claim. |
| **Fuel** | 10 | Average `fuelScoreFor()` (meal check-offs or a day rating, 0–1) over the last ≤7 logged days within a 14-day window, ×10. Adherence, not calorie accounting. |

**Rescaling:** pillars with no data yet are shown locked ("Add a 7-iron speed", "Take the
3-move screen", "Check off today's meals", …) and excluded from the denominator, so the gauge
is fair on day one and grows more accurate as data accrues. With no data at all, the gauge
reads `–`.

**Display:** semicircular fuel gauge (E→F arc + needle) with the number in the centre, an
adaptive one-line summary that names the biggest lever (the weakest pillar with data, or the
biggest locked pillar when the weakest is already >60% full), and the six pillar bars in a
fold; tapping a pillar opens what moves it. The power-to-weight lever ("keep the surplus
lean…") only makes sense when someone is gaining faster than their goal's band — never for an
on-plan bulk. A daily snapshot goes to `ff_score_hist` (the trend sparkline) and `ff_score`
(what the AI coach reads).

## Verified
Original v1: headless (Chromium) with seeded data — gauge **63**, needle rotation correct
(`score/100×180−90`), pillars compute from real log/body data, no JS errors. Re-verify the
six-pillar card on Stats after any `ffScore()` change (yardsmith-playwright-harness).

## Next (needs the backend)
- **AI explanation:** the coach (already wired, `knowledge.ts` "Octane" section) reads these
  same pillars — keep that section in step with this table.
- **Server-side score** once `ff_log` is normalized into tables (`COMPETITIVE-LANDSCAPE.md`,
  `ROADMAP.md` Phase 3) so the trend survives device loss and feeds analytics.
- ~~Mobility pillar~~ — **shipped** as the 5th pillar: an original 3-move self-screen (no
  borrowed assessment IP) that also routes targeted moves into the day warm-ups.
- ~~Fuel pillar~~ — **shipped** as the 6th pillar (see `DESIGN-CHANGES.md`, "Octane: Fuel is the
  6th pillar").
