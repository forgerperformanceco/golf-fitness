# Yardsmith Score — feature spec

One number for a golfer's **build-to-speed progress**, shown as an on-brand fuel
gauge (E→F). It's our answer to the one measurability edge competitors have (e.g.
DRVN's composite assessment) — but built entirely from **our own data**, so there's
no IP overlap. See `COMPETITIVE-LANDSCAPE.md`.

> **What it is (and isn't):** a *progress + consistency* score, not a leaderboard or
> an absolute fitness rating. We don't publish normative tables (that would mean
> borrowing other apps' proprietary data). Instead the gauge reads **your trajectory**
> — are you showing up, getting faster, getting stronger, and turning mass into speed.

Status: **shipped (v1, client-side)**. Lives in `index.html`, rendered at the top of
the Train view as `.ffscore`. No backend required — it reads localStorage the app
already writes.

## Inputs (all already captured)
| Source | Used for |
|---|---|
| `ff_log` (`{"week\|day": {ex:[{name,target,sets:[{w,r}]}]}}`) | consistency + strength e1RM |
| `ff_body` (`[{date,w,s}]`, w=lb, s=7-iron mph) | speed trend + power-to-weight |
| `ff_week` | weeks elapsed (for "expected sessions") |
| `planState.freq` (4/5) | expected sessions per week |
| `ff_mobility` (`[{ts,date,tests:{trunk,hip,squat},score}]`) | mobility pillar (3-move self-screen, each test 0/1/2) |

## Pillars & weights (0–100, rescaled to the pillars that have data)
| Pillar | Max | How it's scored |
|---|---|---|
| **Consistency** | 35 | `sessionsLogged / (freq × min(week,8))`, clamped 0–1, ×35. Rewards showing up. |
| **Clubhead speed** | 30 | 7-iron gain from first entry: `15 + gain% × 220`, clamped 0–30. (Neutral start ≈15.) |
| **Strength (e1RM)** | 25 | Avg gain in estimated 1RM (Epley `w·(1+r/30)`) on the big lifts (squat/DL/bench/press/row/RDL/hinge/hip-thrust/pull-up), first→best: `10 + gain% × 150`, clamped 0–25. |
| **Power-to-weight** | 10 | Is speed outpacing bodyweight? `5 + (speedGain% − weightGain%) × 250`, clamped 0–10. Leaner-and-faster scores highest. |
| **Mobility** | 10 | Latest 3-move screen (seated trunk rotation, 90/90 hips, overhead deep squat — each 0/1/2) → `score/100 × 10`. Flags "Re-screen due" past ~5 weeks. Durability framing, not a speed claim. |

**Rescaling:** pillars with no data yet are shown locked ("Add a 7-iron speed", etc.)
and excluded from the denominator, so the gauge is fair on day one and grows more
accurate as data accrues. With no data at all, the gauge reads `–`.

**Display:** semicircular fuel gauge (E→F arc + needle), the number in the gauge
center, four pillar bars beneath, and an adaptive coaching note that points the user
at their lowest-scoring pillar.

## Verified
Headless (Chromium) with seeded data: gauge **63**, needle rotation correct
(`score/100×180−90`), pillars compute from real log/body data, no JS errors.

## Next (Phase 2/3 — needs the backend)
- **AI explanation:** the coach (already wired) reads these same numbers — have it
  narrate "your speed bar is maxed but consistency is the gap; here's the week."
- **Server-side score** once `ff_log` is normalized into tables (`COMPETITIVE-LANDSCAPE.md`
  → Yardsmith Score, `ROADMAP.md` Phase 3) so the trend survives device loss and
  feeds analytics.
- ~~Optional mobility pillar~~ — **shipped** as the 5th pillar (see table above): an
  original 3-move self-screen (no borrowed assessment IP) that also routes targeted
  moves into the day warm-ups. See `DESIGN-CHANGES.md`.
