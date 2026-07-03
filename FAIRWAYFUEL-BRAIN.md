# FairwayFuel — Company Brain

The single onboarding + context document for FairwayFuel: what it is, how it's
built, what we believe, how we're positioned, what we've decided (and rejected),
how it ships, and what's still open. Start here; every section points to the
deeper doc when there is one.

> **Status snapshot** (keep current): live PWA at **fairwayfuel.app**; free, no
> paywall; Supabase backend wired but billing/AI gated off pending launch; native
> Android project ready to build; iOS via cloud build; app-store accounts not yet
> created. Service worker cache **v116**.

---

## 0. Table of contents
1. What FairwayFuel is (thesis + one-liners)
2. The product (tabs, features, mechanics)
3. Architecture & data model
4. The evidence base (why anyone should trust it)
5. Competitive positioning (esp. vs DRVN)
6. Decisions log — what we chose and what we killed
7. Distribution & app-store path
8. Ops: CI/CD, release discipline, hosting
9. Monetization & roadmap
10. Open threads / next actions
11. Conventions & house rules
12. Doc index

---

## 1. What FairwayFuel is

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

Four tabs (bottom nav): **Home (dash) · Fuel (calc) · Train (plan) · You (account)**.

### Home
- **Driver-carry hero** — the star metric (yards), with a "▲ +N yds vs your start"
  gain and a **Distance Mission** progress bar (+5…+30 yds goal).
- **Octane** — a 0–100 composite "engine" score (consistency + clubhead-speed gain
  + strength e1RM + power-to-weight), shown as a fuel gauge. It's a *trajectory*
  score built from the user's own data; only counts pillars they've fed.
- **Insight** — one prioritized "your focus" nudge from a rules engine over the
  user's data.
- **At-a-glance tiles**, a **Week-so-far recap** card (sessions vs target, 7-iron
  + weight deltas this calendar week → links to the leaderboard), **Log today**
  (weight / 7-iron / driver), coach entry, metabolism, game-day.

### Fuel (the macro engine — a moat)
- TDEE (Mifflin–St Jeor) → goal calorie adjustment → protein/carb/fat targets.
- Per-meal macro breakdown, **carb timing around the training slot**, realistic
  **male-appropriate** foods, and a **shopping list** built from a favorites picker.
- Training-time is *referenced here* (drives carb timing) but **edited in You** —
  single source of truth.

### Train (the 20-week plan)
- Start-date-anchored **rolling 7-day** cycle (not weekday-bound), 20 weeks.
- Concurrent training (strength + power + speed every week), distributed rest
  (never two rest days in a row; running a 5-day split by default).
- A **Speed & Power day** with a **Gym ↔ Field** toggle and a "Speed 101"
  explainer; evidence-ranked drills (jump + throws lead).
- Per-exercise coaching (form cues, common mistakes, "why for your swing", video
  link). Inline logger with **set carry-forward**, finish-to-history, clear/delete.
- **Rest days are check-off-able** (their own `ff_rest` key so they never inflate
  training stats); the weekly "X of N done" nudge stays training-only.

### You (account + settings hub)
- Sign in (magic-link/OTP, optional), cloud sync, **Your numbers** (edit macros),
  **Your training setup** (distance mission, training days/week, training time —
  all tap-to-change, all synced), favorite foods, reminders toggle, **Delete
  account** (App-Store-required), install prompts.

---

## 3. Architecture & data model

**Frontend:** a **static single-file PWA** — `index.html` (~5k+ lines: all UI,
logic, styles) + `sw.js` (offline service worker) + `cloud-sync.js` + `coach.js`.
No build step for the web app. Installs to home screen; works offline.

**Backend:** **Supabase** —
- Auth: email **magic-link / OTP** (the in-app *code* flow is the reliable path
  for installed apps).
- `profiles` table: one row/user, a synced `data` JSONB blob + subscription
  columns (webhook-written only, RLS-protected).
- `leaderboard` table: opt-in, handle-only (never email); boards for score /
  speed / streak / **this-week sessions**.
- Edge Functions (Deno): **`ai-coach`** (Claude-backed, knowledge base as a
  cached system prompt), **`delete-account`** (service-role user deletion +
  cascade), **`paddle-webhook`** (billing, off during early access).
- CORS allows the website **and** the native shells (`capacitor://localhost`,
  `http://localhost`).

**Sync model:** localStorage is the source of truth per device; `cloud-sync.js`
merges a blob to `profiles` with additive unions (`ff_log`, `ff_body`,
`ff_history`, `ff_rest`) + deletion tombstones (`ff_deleted`). Key data keys:
`fairwayfuel` (profile), `ff_body` (weight/7-iron/driver by date), `ff_log`,
`ff_history`, `ff_start`, `ff_goalyds`, `ff_rest`, plus prefs.

**Key derived objects:** Octane (`ff_score`), macro targets (`ff_targets`),
`ffBench()` sex/age-calibrated reference numbers.

**Deployment:** GitHub Pages (Fastly CDN) on the **main** branch, custom domain
**fairwayfuel.app** (CNAME). Repo: **forgerperformanceco/fairwayfuel** (public).

---

## 4. The evidence base

FairwayFuel's credibility rests on **independent, public, peer-reviewed sourcing**
— never a competitor's compiled/branded data. Two reference docs hold it:

- **`CLUBHEAD-SPEED-REFERENCE.md`** — the biomechanics + strength/power evidence
  (§1 technique-is-last-layer, §2 kinetic chain, §9 overspeed review, §10 session
  design, §11 thesis stress-test, §12 the three-force coaching lens, §13 sources).
- **`NUTRITION-AND-TRAINING-REFERENCE.md`** — the fuel science + training
  principles + the deadlift/hinge build.

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
  maps 1:1 onto the force-plate GRF science; the speed day already trains all three.

**Sourcing discipline:** we synthesize public science and cite it with confidence
levels; we do **not** copy competitor documents, branded protocols, or marketing
copy (see §5). On-camera "demo" numbers are treated as illustrative, never as
measured effects.

**How the evidence was built:** multiple adversarially-verified deep-research
passes + direct reads of the primary papers (Brennan 2024, Johnson 2025, Evans &
Tuttle 2015, etc.).

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
  (Break 90/80/70, Break 300 Yards, Breaking 100 MPH, All Out Speed, Golf Gains,
  Golf Strong) fronted by celebrity coaches (Bryan Bros, Martin Borgmeier);
  weekly leaderboards; pro shop; in both app stores.
- **What DRVN still doesn't do:** nutrition, or a conversational coach that reads
  your own numbers. Our moat is intact.

### Our moat (unchanged)
1. **Nutrition + fueling** — a whole pillar they skip.
2. **AI coach** that reads *this user's* macros, log, and speed trend.
3. **Yards-first framing** — we lead with driver carry; they lead with a fitness score.
4. **Free, offline, no hardware.**

### The rule on competitor content
Borrow the **public science and proven UX patterns**; never copy their **data,
branded protocols, trademarked names, or written/marketing content**. Their
"Certified Pro" PDFs and sales pages are standard public concepts wrapped in DRVN
branding — we already hold the underlying facts from primary sources, so there's
nothing to gain and real risk in mirroring them.

**Strategic truth:** *we don't beat DRVN by building a better copy of DRVN's
knowledge base.* We win on what they don't do — and, right now, on **distribution**
(they're in the stores; we're a URL). Shipping the app matters more than more docs.

---

## 6. Decisions log — chosen & rejected

**Chosen (built this cycle):**
- **DISTANCE reframe** — driver carry is the hero; renamed the 0–100 score to
  **Octane**; flexible measurement (launch monitor OR eyeball).
- **Gym ↔ Field toggle** on the speed day + Speed 101 education.
- **Distributed rest** (no weekends-off, no two-in-a-row) + leg-day order fix.
- **Rest days completable** (own key; doesn't inflate stats; nudge stays training-only).
- **Distance Mission** (+5…+30 yds goal, hero progress bar, editable).
- **Population calibration** — `ffBench()` sex/age-aware reference numbers +
  coach knowledge; Octane already self-calibrates (trend-based).
- **Weekly leaderboard energy** — dashboard recap card + a "This week" board.
- **Local notifications** (native app) — day-aware training reminders, no backend.
- **Settings consolidation** — one "training setup" card (mission, days, time) in
  You; training-time made a read-only reference in Fuel (killed the duplication).
- **In-app account deletion** (App-Store requirement) + auto-deploy.

**Rejected (deliberately):**
- **Building out macro *tracking*** (barcode-scan calorie logging) — commodity;
  a million apps do it. We build *toward distance* instead.
- **The "Dyno Day" / Octane Assessment** (a DRVN-style test battery) — drags us
  into their lane (synthetic fitness tests) when our scoreboard is the real
  outcome (yards). *Don't revive this.*
- **Ingesting DRVN's marketing/curriculum PDFs** — already-held facts + branded
  content we shouldn't copy.
- **Cloudways / VPS hosting** — wrong tool for a static PWA.

---

## 7. Distribution & app-store path

Native wrapper: **Capacitor**, appId **`app.fairwayfuel`**. Web app unchanged;
`www/` is assembled from served files (`npm run build:www`) and bundled.

- **Android** — buildable **on Windows** in Android Studio. The `android/` project
  is generated, committed, icon/splash baked in. Path: `npm install` → `npm run
  sync` → open `android/` → signed `.aab` → Play Console. Guide:
  **`ANDROID-LAUNCH-STEP-BY-STEP.md`** (with copy-paste store listing + the
  1024×500 feature graphic in `assets/play/`).
- **iOS** — no Mac needed: **Codemagic** cloud build (`codemagic.yaml`,
  **`CODEMAGIC-SETUP.md`**). Managed signing, TestFlight upload.
- **Full runbook:** `BUILD-NATIVE-APP.md`.

**Compliance already handled / flagged:**
- **Account deletion** — built (Account → Delete my account).
- **Play Billing caveat** — Google requires Play Billing for in-app digital
  purchases. FairwayFuel is free at launch (fine); when we monetize, the Android
  app must use Play Billing or keep payment entirely on the website — **do not**
  sell subscriptions inside the Android app via Paddle.

**OPEN: Play Console account type.** The GitHub org "forgerperformanceco" =
Bobby's **peptide** company (Forger Performance Co), **not** FairwayFuel's
publisher. FairwayFuel has no legal entity yet → default recommendation is a
**Personal** developer account (publish as yourself, display name "FairwayFuel"),
accepting the **20-tester / 14-day closed-testing** gate that Google now requires
of new personal accounts before production. Organization account (no 20-tester
gate, branded name) needs a registered entity + D-U-N-S number. **You can't switch
type later — decide deliberately.** (Undecided as of this writing.)

---

## 8. Ops: CI/CD, release discipline, hosting

**Two GitHub Actions workflows:**
- **`deploy.yml`** — GitHub Pages. Now hardened: `concurrency` with
  **cancel-in-progress: true** (no more queue-timeout failures on rapid pushes),
  **paths-ignore** for docs/backend/native, and it **stages only served files**
  (rsync deny-list into `_site/`, CNAME kept) so `.md` strategy docs / `social/` /
  tooling are **not** published to fairwayfuel.app.
- **`deploy-functions.yml`** — applies `supabase/schema.sql` + deploys the edge
  functions on any push touching `supabase/**` (delete-account always; ai-coach
  when `ANTHROPIC_API_KEY` secret is set). Hands-off.

**Release discipline (do this on every served-file change):**
1. Bump the service-worker cache in `sw.js`: `var CACHE='fairwayfuel-vNN'`.
2. If `cloud-sync.js` or `coach.js` changed, bump its `?v=` query string in
   **both** `index.html` and the `sw.js` ASSETS list.
3. Native app: run `npm run sync` before building so the wrapper picks up changes.
4. Verify with the headless Playwright pattern (chromium at `/opt/pw-browsers`,
   `--no-sandbox`, seed localStorage, assert behavior).

**Hosting note:** GitHub Pages is great for a static PWA. **Before flipping on paid
subscriptions**, move to **Cloudflare Pages** (free, commercial-OK ToS, header/
cache control that would reduce the SW cache-bump dance) — *not* Cloudways. Only a
DNS + connect-repo change; no code changes.

---

## 9. Monetization & roadmap

Plan of record: **`ROADMAP.md`**. Phases:
- **Phase 0 (shipped):** free PWA + optional cloud sync.
- **Phase 1:** accounts + billing spine (Paddle as Merchant-of-Record; `profiles`
  subscription columns; entitlement read). *Scaffolded, off.*
- **Phase 2:** the AI coach as the reason to subscribe (server-side Claude, cached
  knowledge base, per-user context). *Function scaffolded.*
- **Phase 3:** normalized data tables, food/exercise DBs, native shell (in progress
  via Capacitor), push notifications.

**Free forever:** calculator, 20-week plan, offline, single-device.
**FairwayFuel Pro (future):** AI coach, dynamic adaptation, cross-device history,
analytics. Monthly + discounted annual, 7-day trial. Cost control via prompt
caching on the knowledge base.

Secrets: Anthropic key, Paddle webhook secret, Supabase service-role — **server
side only**, never in the browser. Only the Supabase publishable key ships client.

---

## 10. Open threads / next actions

1. **Decide the Play Console account type** (Personal vs Organization) — see §7.
   This is the current gating decision for the Android launch.
2. **Ship Android** — first build on the Windows laptop, then internal testing →
   (20-tester closed test if Personal) → production.
3. **iOS via Codemagic** — after Android, or in parallel.
4. **Before monetizing:** Play Billing compliance + move hosting to Cloudflare Pages.
5. **Push notifications** — deps installed, not yet wired to APNs/FCM.
6. **HealthKit / Health Connect** — auto-pull bodyweight; strong native-only upgrade
   for a later version.

---

## 11. Conventions & house rules

- **Evidence ethos:** independent/public/peer-reviewed sources, cited with
  confidence levels. Never copy a competitor's data, branded protocol, trademark,
  or written/marketing content. Demo/anecdote numbers are illustrative, not effects.
- **Honesty in copy:** frame goals as goals, not guarantees ("+15 yds is your
  mission we track," not "you will gain 15 yds"). No vendor-style "+X mph" promises.
- **Male-appropriate, real, purchasable foods** in the meal engine (grocery-list minded).
- **Single source of truth** for each setting; reference (don't duplicate) elsewhere.
- **Keep the free app working at every step;** monetization is additive layers.
- **Don't clone DRVN;** win on nutrition + AI + yards + distribution.
- **Model identity** and internal identifiers never go into committed artifacts.

---

## 12. Doc index

| Doc | What it holds |
|---|---|
| `FAIRWAYFUEL-BRAIN.md` | **This file** — the company brain / start here |
| `CLUBHEAD-SPEED-REFERENCE.md` | Biomechanics + strength/power evidence, session design, thesis validation, three-force lens, sources |
| `NUTRITION-AND-TRAINING-REFERENCE.md` | Fuel science, training principles, hinge/deadlift build |
| `COMPETITIVE-LANDSCAPE.md` | Market lanes, DRVN, moat, borrow-vs-avoid rules |
| `ROADMAP.md` | Product + revenue phases, billing/AI plan, secrets |
| `FAIRWAYFUEL-SCORE.md` | The Octane score design |
| `COACH-PERSONA.md` | AI coach voice/persona |
| `BUILD-NATIVE-APP.md` | Capacitor build runbook (iOS + Android) |
| `ANDROID-LAUNCH-STEP-BY-STEP.md` | Full Windows→Play walkthrough + store listing copy |
| `ANDROID-WINDOWS-QUICKSTART.md` | Short Android build quickstart |
| `CODEMAGIC-SETUP.md` | iOS-from-Windows cloud build setup |
| `GO-LIVE-CHECKLIST.md` / `LAUNCH-GUIDE.md` | Launch/config steps |
| `supabase/` | Schema + edge functions + deploy workflow |

> Keep this brain current: when a major decision, feature, or number changes,
> update the relevant section here and the deeper doc it points to.
