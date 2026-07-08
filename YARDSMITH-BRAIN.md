# Yardsmith — Company Brain

The single onboarding + context document for Yardsmith: what it is, how it's
built, what we believe, how we're positioned, what we've decided (and rejected),
how it ships, and what's still open. Start here; every section points to the
deeper doc when there is one.

> **Status snapshot** (keep current): live PWA at **yardsmith.golf** (domain
> purchased Jul 2026; fairwayfuel.app redirects); free, no paywall; Supabase
> backend wired but billing + AI coach gated off pending launch; native Android
> project ready to build; iOS via cloud build; app-store accounts not yet created.
> **The web app is now a modular `src/` codebase with a build step** (see §3) —
> the committed root files are generated build outputs. Service worker cache is
> **content-hash stamped** (no manual version bumps).
>
> **Rebrand (Jul 2026): FairwayFuel → Yardsmith.** A live federal trademark
> application for FAIRWAY FUEL (Ser. 99663152, filed Feb 20 2026, Class 32 golf
> energy/sports drinks) plus two more "Fairway Fuel" golf-nutrition brands made
> the old name legally risky and SEO-crowded in our own concept space. Renamed
> before any store presence existed (the cheapest possible moment). Bundle id is
> now **`app.yardsmith`**. The localStorage profile key stays `"fairwayfuel"` and
> all `ff_*` keys are unchanged — renaming them would wipe existing users' data
> for zero user-visible gain.

---

## 0. Table of contents
1. What Yardsmith is (thesis + one-liners)
2. The product (tabs, features, mechanics)
3. Architecture & build system & data model
4. The evidence base (why anyone should trust it)
5. Competitive positioning (esp. vs DRVN)
6. Decisions log — what we chose and what we killed
7. Distribution & app-store path
8. Ops: build, CI/CD, release discipline, hosting
9. Monetization & roadmap
10. Open threads / next actions
11. Conventions & house rules
12. Doc index

---

## 1. What Yardsmith is

**One-liner:** *Turn muscle into distance* — a golf fitness + nutrition app that
builds the athletic engine (strength, power, fuel) and converts it into driver
distance, then proves it with the golfer's own numbers.

**The thesis (validated, see §4):** driving distance is a **physical** output
before a technical one. Build lean muscle → convert to power → the yards follow.
It's muscle *quality and power*, not bulk; flexibility barely matters for speed.

**Positioning in one breath:** most golf apps either *coach the swing* or
*measure the swing*. We own the lane they skip — **nutrition + strength/power +
an AI coach that reads your own numbers** — and we lead with the outcome every
golfer actually wants: **yards**.

**Taglines in use:** "Turn muscle into distance." · "Eat · Lift · Bomb."

---

## 2. The product

**Five tabs:** **Dashboard (dash) · Fuel (calc) · Train (plan) · Progress
(progress) · Account (account)**. Interactions run on a motion/physics layer
(View Transitions between tabs, drag-physics bottom sheets); controls use an
in-house SVG icon set, and technical terms are tap-to-explain via a glossary.
First visit to each tab fires a one-time coaching tip.

### Dashboard (the Today spine)
- **Driver-carry hero** — the star metric (yards), with a "▲ +N yds vs your start"
  gain and a **Distance Mission** progress bar (+5…+30 yds goal).
- **Octane** — a 0–100 composite "engine" score shown as a fuel gauge, built from
  **six pillars**: training consistency, clubhead-speed gain, strength e1RM,
  power-to-weight, the **mobility screen** (5th pillar), and **fuel adherence**
  (6th pillar). It's a *trajectory* score off the user's own data; only counts
  pillars they've fed. Full design in `OCTANE-SCORE.md`.
- **One coaching voice** — a single prioritized "your focus" insight from a rules
  engine over the user's data (no filler; the hero defers to the advice slot).
- **The day as a timeline** — the day's primary action first, quick-log for
  weight / 7-iron / driver, meal check-offs, coach entry, game-day / round-day.

### Fuel (the macro engine — a moat)
- TDEE (Mifflin–St Jeor) → goal calorie adjustment → protein/carb/fat targets.
- Per-meal macro breakdown, **carb timing around the training slot**, realistic
  **male-appropriate** foods, and a **shopping list** built from a favorites picker.
- **Fuel check-off loop** — mark meals hit, rate the day, build a streak; this is
  adherence (not calorie accounting) and feeds Octane's 6th pillar.
- Training-time is *referenced here* (drives carb timing) but **edited in Account**
  — single source of truth.

### Train (the 20-week plan + Workout Player)
- Start-date-anchored **rolling 7-day** cycle (not weekday-bound), 20 weeks,
  concurrent (strength + power + speed every week), distributed rest (never two
  rest days in a row; 5-day split by default, 4-day option).
- **Real periodization in waves** — the 20 weeks run as **6-week cycles**:
  **Accumulate** (wk 1–3 · 7–9 · 13–15, volume, add reps to the top of the range)
  → **Intensify** (wk 4–5 · 10–11 · 16–17, big lifts drop ~2 reps / go heavier)
  → **Deload** (wk 6 · 12 · 18, one less set, ~60% loads), then a **2-week peak**
  to finish. **The logger prescribes matching loads** — overload and deloads are
  applied for the user, not hand-managed.
- **Workout Player** — full-screen guided sessions: one station at a time,
  prescribed loads, a rest-timer bar, set values that carry forward, live recap.
  Exiting a live workout **pauses** it (banked clock + resume bar); you can
  **reorder lifts and remove sets mid-workout**.
- **Speed & Power day** with a **Gym ↔ Field** toggle and a "Speed 101" explainer;
  evidence-ranked drills (jump + throws lead); overspeed swings run a **structured
  ramp** (2×5 → 3×5 → 4×5, deload back to 2×5). A **biweekly Speed Test** ritual
  captures the trend.
- **Equipment-aware swap + add-lift pickers** over a 200+ movement library
  (grouped by pattern), **plus a custom-exercise entry** for anything not in the
  library. Per-exercise coaching (form cues, common mistakes, "why for your
  swing"), **per-lift history sheets + session notes**.
- **Mobility screen** — a 3-move durability self-check that routes warm-ups and
  feeds Octane's 5th pillar.
- **Rest days are check-off-able** (own `ff_rest` key so they never inflate
  training stats); the weekly "X of N done" nudge stays training-only.

### Progress (Stats — the narrative)
- **Stats 3.0** consolidates to three stories: the **Octane hub** (each pillar
  folds open), a merged gym/strength view, and a **20-week Season map** that
  absorbs the Sunday scorecard. **Scrubbable trend charts** (touch a curve, read
  your season). Event-anchored **Season Peak**.
- **Round Debrief** closes the gym-to-course loop; **leaderboard** is opt-in,
  handle-only (score / speed / streak / this-week sessions).

### Account (settings hub)
- Sign in (magic-link/OTP, optional), **cloud sync with visible sync health** +
  one-tap **backup export/restore**, **Your numbers** (edit macros), **training
  setup** (distance mission, days/week, training time — all tap-to-change, synced),
  favorite foods, **reminders** (local + real web push), **Auto / Light / Dark**
  theme, replay guided setup / tips, **Delete account** (store-required), install
  prompts, branded **share cards** (PNGs generated on-device).

---

## 3. Architecture, build system & data model

**Frontend — a modular vanilla-JS PWA with a build step.** No framework. The
**source of truth is `src/`**; the files served at the repo root
(`index.html`, `app.js`, `styles.css`, `sw.js`) are **generated build outputs**
(each carries a `GENERATED` header) committed so Pages/Capacitor serve them with
zero infra. **Never hand-edit the root files — edit `src/` and rebuild.**

| To change… | Edit… |
|---|---|
| App behavior / a feature | `src/js/app/NNN-*.js` (numbered modules, one per area) |
| Code outside the IIFE (SW registration) | `src/js/global/*.js` |
| Styles | `src/css/styles.css` (above the `GENERATED-DARK` markers) |
| Page markup / meta / script tags | `src/index.template.html` |
| Service-worker logic | `src/sw.template.js` |

`node scripts/build.mjs` (or `--watch`) concatenates `src/js/app/*.js` (sorted by
filename) into **one IIFE** — modules share one scope, so a function declared in
any module is visible to all (exactly like the old monolith). `src/js/global/*.js`
is appended after. `{{V}}` placeholders become a **10-char content hash**, so
**cache-busting is automatic** — no manual `yardsmith-vNNN` SW bumps, no `?v=`
edits for app.js/styles.css. (`cloud-sync.js` and `coach.js` keep **manual `?v=`
pins** — currently `?v=108` and `?v=88` — bump those in `src/index.template.html`
+ `src/sw.template.js` when you edit them.) Dark theme is **generated** into the
CSS between `GENERATED-DARK` markers via `python3 scripts/gen-dark-theme.py`.

The **app modules** (roughly): `005 core-boot`, `006 icons`, `007 motion`,
`008 sheets`, `009 glossary`, `010 tab-nav`, `015 coach-tips`, `020 persistence`,
`025 macro-calculator`, `030 fuel-check-off`, `035 training-plan` (periodization),
`040 workout-logger`, `045 inline-logger`, `050 exercise-history`,
`055 share-cards`, `060 speed-test`, `065 mobility-screen`, `070 workout-player`,
`075 proactive-coaching`, `080 game-day / notifications / web-push / theme /
backup`, `082 round-debrief`, `085 progress-stats`, `090 first-run-onboarding`.

**Service worker:** content-hash cache; **network-first for HTML with
`cache: no-store`** (so a GitHub-Pages `max-age=600` copy can't serve a stale
`index.html` after deploy), cache-first for other assets; VAPID `push` +
`notificationclick` handlers. Resume-time update checks + a force-refresh escape
hatch; the in-app **Refresh** button (installed PWAs have no browser reload)
lands you back on **Dashboard**.

**Backend — Supabase:**
- Auth: email **magic-link / OTP** (the in-app *code* flow is reliable for
  installed apps).
- `profiles` table: one row/user, a synced `data` JSONB blob + subscription
  columns (webhook-written only, RLS-protected).
- `leaderboard` table: opt-in, handle-only (never email); score / speed / streak /
  this-week sessions.
- Edge Functions (Deno): **`ai-coach`** (Claude-backed, knowledge base as a cached
  system prompt), **`delete-account`** (service-role deletion + cascade),
  **`paddle-webhook`** (billing, off during early access), **`push-daily`**
  (scheduled sender for the VAPID web-push reminders).
- CORS allows the website **and** the native shells (`capacitor://localhost`,
  `http://localhost`).

**Sync model:** localStorage is the source of truth per device; `cloud-sync.js`
merges a blob to `profiles` with additive unions (`ff_log`, `ff_body`,
`ff_history`, `ff_rest`) + deletion tombstones (`ff_deleted`). Key data keys:
`fairwayfuel` (profile, incl. active `view`), `ff_targets` (macros), `ff_body`
(weight/7-iron/driver by date), `ff_log`, `ff_history`, `ff_start`, `ff_goalyds`,
`ff_rest`, `ff_notes`, `ff_theme`, `ff_notif` / `ff_push`, `ff_speedtest`,
`ff_mob`, `ff_round`, plus fuel-check-off + prefs. Derived: Octane (`ff_score`),
`ffBench()` sex/age-calibrated reference numbers.

**Deployment:** GitHub Pages (Fastly CDN) on the **main** branch, custom domain
**yardsmith.golf** (CNAME). Repo: **forgerperformanceco/golf-fitness** (public).

---

## 4. The evidence base

Yardsmith's credibility rests on **independent, public, peer-reviewed sourcing**
— never a competitor's compiled/branded data. Two reference docs hold it:

- **`CLUBHEAD-SPEED-REFERENCE.md`** — the biomechanics + strength/power evidence
  (§1 technique-is-last-layer, §2 kinetic chain, §9 overspeed review, §10 session
  design, §11 thesis stress-test, §12 the three-force coaching lens, §13 sources).
- **`NUTRITION-AND-TRAINING-REFERENCE.md`** — the fuel science + training
  principles (incl. 10–20 sets/muscle/week, primary heavy 4–6 / accessories 8–15)
  + the deadlift/hinge build.

**Headline findings we stand on (verified, with effect sizes):**
- **Strength & power are the dominant physical drivers of clubhead speed;
  flexibility is not.** Brennan et al. 2024 (*Sports Medicine* meta-analysis, 20
  studies): pooled zr — **jump impulse 0.82** (strongest), explosive upper-body
  **0.67** (> non-explosive 0.48), lower-body strength 0.47, anthropometry 0.43;
  **flexibility −0.04 and balance −0.06 are NOT significant.** Ehlert 2021
  corroborates (flexibility r≈0.03).
- **Mass → speed holds, but as _lean_ mass → power → distance**, not bulk
  (fat-free mass ↔ CHS r≈0.42; body mass r≈0.51).
- **Training works across populations** — collegiate men & women, older men
  (+4.9%), amateur women; the *levers* are shared, the *absolute* numbers differ
  by sex/age (basis for our calibration). Johnson et al. 2025 (NCAA D-I, n=21):
  isometric UB strength + vertical jump r=0.70–0.82 with CHS; sex differences in
  absolutes but not rotational kinematics.
- **Mobility is an injury lever, not a speed lever** — general flexibility doesn't
  predict speed, but a ~10° lead-hip internal-rotation deficit is tied to low-back
  pain. So mobility work is framed as durability, never a speed hack.
- **Three ground forces** (vertical / lateral / rotational) — a coaching lens that
  maps 1:1 onto the force-plate GRF science; the speed day trains all three.

**Sourcing discipline:** we synthesize public science and cite it with confidence
levels; we do **not** copy competitor documents, branded protocols, or marketing
copy (see §5). On-camera "demo" numbers are treated as illustrative, never as
measured effects.

The AI coach's knowledge base (`supabase/functions/_shared/knowledge.ts`) mirrors
these docs so it can coach from the same evidence, calibrated to the user's sex/age.

---

## 5. Competitive positioning (primarily vs DRVN)

Full analysis: **`COMPETITIVE-LANDSCAPE.md`**.

**The field, three lanes:** swing *coaches* (lessons), swing *measurement*
(launch monitors / 3D), and *training* apps (DRVN, GolfForever, Fitforgolf,
JoeyD, TheStack). **Nobody owns training × nutrition × conversational AI coach.**
That intersection is ours.

### DRVN (our stated primary competitor)
- Relaunched Feb 2026 around the **Golf Fitness Handicap™** — a 10-test battery
  (5 mobility + 5 fitness), scored to 50, re-tested every 6 weeks; program library
  fronted by celebrity coaches; weekly leaderboards; pro shop; in both app stores.
- **What DRVN still doesn't do:** nutrition, or a conversational coach that reads
  your own numbers. Our moat is intact.

### Our moat (unchanged)
1. **Nutrition + fueling** — a whole pillar they skip.
2. **AI coach** that reads *this user's* macros, log, and speed trend.
3. **Yards-first framing** — we lead with driver carry; they lead with a fitness score.
4. **Free, offline, no hardware.**

### The rule on competitor content
Borrow the **public science and proven UX patterns**; never copy their **data,
branded protocols, trademarked names, or written/marketing content**. We already
hold the underlying facts from primary sources — nothing to gain, real risk in
mirroring them.

**Strategic truth:** *we don't beat DRVN by copying DRVN's knowledge base.* We win
on what they don't do — and, right now, on **distribution** (they're in the
stores; we're a URL). Shipping the app matters more than more docs.

---

## 6. Decisions log — chosen & rejected

**Chosen / built (cumulative):**
- **DISTANCE reframe** — driver carry is the hero; the 0–100 score is **Octane**
  (now 6 pillars incl. mobility + fuel adherence); flexible measurement.
- **Real periodization** — 6-week Accumulate → Intensify → Deload waves + 2-week
  peak, with **auto-prescribed loads** (overload applied for you).
- **Workout Player** — full-screen guided sessions, prescribed loads, rest bar,
  pause/resume, reorder/remove mid-workout; **inline logger** on the Today card.
- **One-tap load nudge** — hit all reps → fill last weight + one small jump
  (progress by weight, holding reps/sets).
- **Equipment-aware swap + add-lift** over a 200+ library, **+ custom exercises**;
  per-lift history sheets + notes.
- **Speed day** — Gym ↔ Field, Speed 101, structured overspeed ramp, biweekly
  **Speed Test** ritual. **Mobility screen** (3-move) as Octane's 5th pillar.
- **Fuel check-off** adherence loop (day rating + streak) as Octane's 6th pillar.
- **Distributed rest** + best-practice leg-day order (compound first, Leg
  Extension as finisher) + a restored knee-flexion **leg curl**.
- **Distance Mission**, **population calibration** (`ffBench()`), **weekly
  leaderboard energy**, **Round Debrief** (gym-to-course loop).
- **Real web push** (VAPID subscription + `push-daily` Edge Function) — reminders
  land even with the app closed; local reminders remain the fallback.
- **Modularization** — `src/` source tree + `scripts/build.mjs`, hash-versioned
  outputs (automatic cache-busting).
- **Design system** — motion/physics layer, drag-physics sheets, SVG icon chrome,
  Auto/Light/Dark theme, tap-to-explain glossary, ~800KB asset diet.
- **Trust** — visible sync health + one-tap backup export/restore; **in-app
  account deletion**; PWA update reliability (no-store HTML, resume-time checks,
  force-refresh escape hatch); refresh returns to Home.

**Rejected (deliberately):**
- **Macro *tracking*** (barcode calorie logging) — commodity; we build *toward
  distance* instead.
- **The "Dyno Day" / Octane Assessment** (a DRVN-style synthetic test battery) —
  drags us into their lane when our scoreboard is the real outcome (yards).
  *Don't revive.*
- **Ingesting DRVN's marketing/curriculum PDFs** — held facts + branded content.
- **Cloudways / VPS hosting** — wrong tool for a static PWA.

---

## 7. Distribution & app-store path

Native wrapper: **Capacitor**, appId **`app.yardsmith`**. Web app unchanged;
`www/` is assembled from the served files (`npm run build:www`, which runs after
`scripts/build.mjs`) and bundled.

- **Android** — buildable **on Windows** in Android Studio. The `android/` project
  is generated, committed, icon/splash baked in. Path: `npm install` → `npm run
  sync` → open `android/` → signed `.aab` → Play Console. Guide:
  **`ANDROID-LAUNCH-STEP-BY-STEP.md`** (copy-paste store listing + the 1024×500
  feature graphic in `assets/play/`).
- **iOS** — no Mac needed: **Codemagic** cloud build (`codemagic.yaml`,
  **`CODEMAGIC-SETUP.md`**). Managed signing, TestFlight upload.
- **Full runbook:** `BUILD-NATIVE-APP.md`.

**Compliance handled / flagged:**
- **Account deletion** — built (Account → Delete my account).
- **Play Billing caveat** — Google requires Play Billing for in-app digital
  purchases. Free at launch (fine); when we monetize, the Android app must use
  Play Billing or keep payment entirely on the website — **do not** sell subs
  inside the Android app via Paddle.

**OPEN: Play Console account type.** The GitHub org "forgerperformanceco" =
Bobby's **peptide** company (Forger Performance Co), **not** Yardsmith's
publisher. Yardsmith has no legal entity yet → default recommendation is a
**Personal** developer account (display name "Yardsmith"), accepting the
**20-tester / 14-day closed-testing** gate. Organization account (no gate,
branded name) needs a registered entity + D-U-N-S number. **You can't switch type
later — decide deliberately.** (Undecided.)

---

## 8. Ops: build, CI/CD, release discipline, hosting

**Build:** `node scripts/build.mjs` regenerates `index.html` / `app.js` /
`styles.css` / `sw.js` from `src/`. **There is no build step in CI** — the
committed outputs are what ships — so **always rebuild and commit `src/` + the
generated outputs together.**

**Two GitHub Actions workflows:**
- **`deploy.yml`** — GitHub Pages. `concurrency` with **cancel-in-progress: true**
  (latest push wins, no queue-timeout), **paths-ignore** for docs/backend/native,
  and **stages only served files** (rsync deny-list into `_site/`, CNAME kept) so
  `.md` strategy docs / `src/` / `social/` / tooling are **not** published to the
  app domain.
- **`deploy-functions.yml`** — applies `supabase/schema.sql` + deploys the edge
  functions on any push touching `supabase/**` (delete-account/push-daily always;
  ai-coach when `ANTHROPIC_API_KEY` is set). Hands-off.

**Release discipline (every served-file change):**
1. **Edit `src/`, not the root files.** Run `node scripts/build.mjs`.
2. **No manual SW cache bump** — the hash is automatic. Only bump the manual `?v=`
   on **`cloud-sync.js` / `coach.js`** if you edited those (in
   `src/index.template.html` + `src/sw.template.js`).
3. CSS change → `python3 scripts/gen-dark-theme.py && node scripts/build.mjs`.
4. Native app: `npm run sync` before building so the wrapper picks up changes.
5. Verify with the headless Playwright pattern (chromium at `/opt/pw-browsers`,
   `--no-sandbox`, seed localStorage, **build first**, assert behavior). Commit
   `src/` + the regenerated root outputs in one commit.

**Hosting note:** GitHub Pages is fine for a static PWA. **Before flipping on paid
subscriptions**, move to **Cloudflare Pages** (free, commercial-OK ToS, header/
cache control) — *not* Cloudways. DNS + connect-repo only; no code changes.

---

## 9. Monetization & roadmap

Plan of record: **`ROADMAP.md`**. Phases:
- **Phase 0 (shipped):** free PWA + optional cloud sync + the full training/fuel/
  progress product above.
- **Phase 1:** accounts + billing spine (Paddle as Merchant-of-Record; `profiles`
  subscription columns; entitlement read). *Scaffolded, off.*
- **Phase 2:** the AI coach as the reason to subscribe (server-side Claude, cached
  knowledge base, per-user context). *Function built, gated off.*
- **Phase 3 (largely shipped):** native shell (Capacitor), **push notifications
  (VAPID web push live)**; remaining — normalized data tables, food/exercise DBs.

**Free forever:** calculator, 20-week plan, offline, single-device.
**Yardsmith Pro (future):** AI coach, dynamic adaptation, cross-device history,
analytics. Monthly + discounted annual, 7-day trial. Cost control via prompt
caching on the knowledge base.

Secrets: Anthropic key, Paddle webhook secret, Supabase service-role, VAPID
private key — **server side only**, never in the browser. Only the Supabase
publishable key + VAPID public key ship client.

---

## 10. Open threads / next actions

1. **Domain cutover: DONE (Jul 2026).** yardsmith.golf serves the site (DNS →
   GitHub Pages, CNAME flipped); fairwayfuel.app 301-redirects (wildcard, at
   Porkbun); Supabase Site URL/redirects + magic-link template updated; Resend
   verified on yardsmith.golf and the SMTP sender moved to signin@yardsmith.golf.
   fairwayfuel.app's DNS keeps its old Resend records harmlessly. Remaining
   one-liner: file the YARDSMITH trademark in Classes 9/41/42.
2. **Decide the Play Console account type** (Personal vs Organization) — see §7.
   The current gating decision for the Android launch.
3. **Ship Android** — first build on Windows, internal testing → (20-tester closed
   test if Personal) → production.
4. **iOS via Codemagic** — after Android, or in parallel.
5. **Before monetizing:** Play Billing compliance + move hosting to Cloudflare Pages.
6. **HealthKit / Health Connect** — auto-pull bodyweight; strong native-only upgrade.
7. **Pressure-test the Speed & Power day** (selection, volume, overspeed protocol) —
   the day with the most direct clubhead-speed transfer.

---

## 11. Conventions & house rules

- **Edit `src/`, never the generated root files;** rebuild (`node scripts/build.mjs`)
  and commit source + outputs together. No manual SW cache bump.
- **Evidence ethos:** independent/public/peer-reviewed sources, cited with
  confidence levels. Never copy a competitor's data, branded protocol, trademark,
  or written/marketing content. Demo/anecdote numbers are illustrative, not effects.
- **Honesty in copy:** frame goals as goals, not guarantees ("+15 yds is your
  mission we track," not "you will gain 15 yds"). No vendor-style "+X mph" promises.
- **Male-appropriate, real, purchasable foods** in the meal engine.
- **Single source of truth** for each setting; reference (don't duplicate) elsewhere.
- **Keep the free app working at every step;** monetization is additive layers.
- **Don't clone DRVN;** win on nutrition + AI + yards + distribution.
- **Model identity** and internal identifiers never go into committed artifacts.

---

## 12. Doc index

| Doc | What it holds |
|---|---|
| `YARDSMITH-BRAIN.md` | **This file** — the company brain / start here |
| `CLAUDE.md` | Repo guide: the `src/` build rule, dark theme, deploy, testing |
| `DESIGN-CHANGES.md` | Running log of design/feature changes + Playwright patterns |
| `CLUBHEAD-SPEED-REFERENCE.md` | Biomechanics + strength/power evidence, session design, thesis validation, three-force lens, sources |
| `NUTRITION-AND-TRAINING-REFERENCE.md` | Fuel science, hypertrophy principles, hinge/deadlift build |
| `COMPETITIVE-LANDSCAPE.md` | Market lanes, DRVN, moat, borrow-vs-avoid rules |
| `ROADMAP.md` | Product + revenue phases, billing/AI plan, secrets |
| `OCTANE-SCORE.md` | The Octane score design (the six pillars) |
| `COACH-PERSONA.md` | AI coach voice/persona |
| `BUILD-NATIVE-APP.md` | Capacitor build runbook (iOS + Android) |
| `ANDROID-LAUNCH-STEP-BY-STEP.md` | Full Windows→Play walkthrough + store listing copy |
| `ANDROID-WINDOWS-QUICKSTART.md` | Short Android build quickstart |
| `CODEMAGIC-SETUP.md` | iOS-from-Windows cloud build setup |
| `PUSH-SETUP.md` | VAPID web-push setup (keys + the `push-daily` sender) |
| `GO-LIVE-CHECKLIST.md` / `LAUNCH-GUIDE.md` | Launch/config steps |
| `src/` | The app source (numbered modules; build with `scripts/build.mjs`) |
| `supabase/` | Schema + edge functions + deploy workflow |

> Keep this brain current: when a major decision, feature, or number changes,
> update the relevant section here and the deeper doc it points to.
