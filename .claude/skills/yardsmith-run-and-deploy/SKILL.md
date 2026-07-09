---
name: yardsmith-run-and-deploy
description: >
  Run and operate Yardsmith: serve the app locally; understand exactly what
  happens on merge to main (deploy.yml Pages publish, deploy-functions.yml
  Supabase apply); verify a deploy landed (Actions -> live site -> in-app App
  version card / FF_BUILD); explain and debug the PWA update path for stale
  devices; ship the native Android (.aab, Windows/Android Studio) and iOS
  (Codemagic) builds; the full secrets inventory (browser-safe vs server-only
  vs GitHub Actions). Load this when the task mentions: deploy, GitHub Pages,
  yardsmith.golf, fairwayfuel.app, CNAME, Actions, rsync deny-list, Supabase
  functions deploy, stale app / old build / force refresh / service-worker
  update (operator reference — for a live device seeing an old version load
  yardsmith-debugging-playbook first), FF_BUILD, TestFlight, Play Store,
  Codemagic, .aab, VAPID, secrets.
---

# Yardsmith — run and deploy

Everything here was re-verified against the repo on **2026-07-08**
(HEAD `f21930a`, build hash `04f691fff1`). Yardsmith is a static vanilla-JS
PWA: **the committed build outputs at the repo root ARE the deployed site** —
there is no build step in CI, no server, no framework.

**When NOT to use this skill — go to the sibling instead:**

| Task | Sibling skill |
|---|---|
| Build mechanics: `build.mjs`, `{{V}}` hashing, `?v=` pin rules, dark theme, fresh-clone env setup | `yardsmith-build-and-env` |
| Writing/running Playwright tests, the local `serve.mjs`/`smoke.mjs` harness scripts | `yardsmith-playwright-harness` |
| What evidence gates a merge; git/parallel-session protocol; release checklist | `yardsmith-change-control` |
| Triaging a live bug report ("is it stale delivery or a code bug?") | `yardsmith-debugging-playbook` |
| The history of the staleness/CDN incidents that produced this machinery | `yardsmith-failure-archaeology` |
| localStorage keys, Supabase schema/RLS/sync protocol details | `yardsmith-data-and-sync` |
| Which docs are stale and the docs-of-record precedence | `yardsmith-docs-and-writing` |

---

## 1. The topology — what lands where

| Thing | Where | Notes |
|---|---|---|
| Web app | **https://yardsmith.golf** — GitHub Pages (Fastly CDN) from `main` of `forgerperformanceco/golf-fitness` | Custom domain via the `CNAME` file (contains `yardsmith.golf`). Pages serves HTML with `Cache-Control: max-age=600` — this is why the SW fetches documents with `no-store` (§6). |
| Old domain | **fairwayfuel.app** → wildcard **301 redirect** to yardsmith.golf, configured at Porkbun (registrar level, not in this repo) | Recorded in `YARDSMITH-BRAIN.md` §10.1 as done Jul 2026. Not verifiable from this sandbox (the agent proxy 403s outbound curl to these domains — verify from a normal browser). |
| Backend | Supabase project **`tbwmckmyzoxzhpqlomsp`** (`https://tbwmckmyzoxzhpqlomsp.supabase.co`) | Postgres + 4 Edge Functions under `supabase/functions/`. |
| Native apps | **Nowhere yet.** `android/` is committed (versionCode 1, never uploaded); `ios/` and `www/` are not committed (gitignored / generated). No store presence exists as of 2026-07-08 (BRAIN §10.2–4: blocked on LLC paperwork → Organization store accounts). |

There is **no uptime monitoring, no error reporting, no synthetic probe**. The
post-deploy signals are: a green Actions run, the live site's `FF_BUILD`, and
user reports.

---

## 2. Serve the app locally

The app must be served over HTTP (the service worker and some fetches don't
work from `file://`), and what you serve must be the **BUILT output** — the
repo root. If you changed anything under `src/`, rebuild first
(`node scripts/build.mjs` — mechanics in `yardsmith-build-and-env`).

Simplest server (verified working 2026-07-08, Python 3.11.15 — booted headless
Chromium against it: zero page errors, `window.FF_BUILD === "04f691fff1"`, and
`manifest.webmanifest` served with the correct `application/manifest+json` MIME
on this box):

```sh
cd /home/user/golf-fitness
python3 -m http.server 8123 --bind 127.0.0.1
# app at http://127.0.0.1:8123/
```

Gotchas:

- **The SW registers on localhost too** and caches aggressively. If you serve,
  edit, rebuild, and re-load in the *same* browser profile, you can see stale
  bytes. In headless test contexts this doesn't bite (fresh context each run);
  in a real browser use DevTools → Application → Service Workers → "Update on
  reload", or just use a different port.
- For **programmatic/headless** serving + driving (the normal way in this
  environment — there is no GUI browser), use the harness in
  `yardsmith-playwright-harness`: it ships a node `http.Server`-over-repo-root
  script plus the seeded-localStorage boot recipe. Same principle: it serves
  the repo root, i.e. the built output.
- `python3 -m http.server`'s MIME table is system-dependent; if a *different*
  machine serves `manifest.webmanifest` as `application/octet-stream` the app
  still boots (only PWA-install metadata is affected). Re-check with:
  `curl -sI http://127.0.0.1:8123/manifest.webmanifest | grep -i content-type`.

---

## 3. What happens on merge to `main` — `.github/workflows/deploy.yml`

Only two workflows exist in `.github/workflows/`: `deploy.yml` (Pages) and
`deploy-functions.yml` (Supabase). Neither runs tests, lint, or a build.
Walkthrough of `deploy.yml` (84 lines):

**Triggers (lines 7–24):** push to `main` — plus a leftover Era-1 branch
`claude/golf-macro-calculator-j2e9vk` (line 11, harmless legacy — that branch
no longer exists on the remote as of 2026-07-08) — and manual `workflow_dispatch`.

**`paths-ignore` (lines 12–23):** a push does NOT deploy if it only touches
`**.md`, `supabase/**`, `android/**`, `ios/**`, `assets/**`, `scripts/**`,
`src/**`, `package.json`, `package-lock.json`, `capacitor.config.json`, or
`codemagic.yaml`. Two consequences you must internalize:

1. **Doc-only or backend-only commits never redeploy the site** (that was the
   point — every push used to queue a full Pages deploy until it timed out).
2. **A commit that touches only `src/` does not deploy** — correctly, because
   the served files didn't change. This is the flip side of the repo's #1
   rule: if you edit `src/` and forget to rebuild+commit the root outputs, the
   push looks successful but **nothing ships and no workflow even runs**.
   Always commit `src/` changes together with the rebuilt
   `index.html`/`app.js`/`styles.css`/`sw.js`.

**Concurrency (lines 36–38):** `group: pages, cancel-in-progress: true` — a
newer push cancels an older queued/in-progress deploy. Safe because
`actions/deploy-pages` publishes **atomically**: a cancelled run never leaves
the live site half-updated; latest push wins.

**The rsync deny-list (lines 63–74):** the checkout is staged into `_site/`
with `rsync -a` excluding: `.git`, `.github`, `_site`, `node_modules`, `www`,
`supabase`, `android`, `ios`, `assets`, `scripts`, `src`, `social`, `*.md`,
`.env*`, `.gitignore`, `package.json`, `package-lock.json`,
`capacitor.config.json`, `codemagic.yaml`, `logo-source*.png`. It is a
**deny-list on purpose** (comment at lines 60–62): a newly added served asset
(a new image, a new font) is published automatically without touching the
workflow — but a newly added *private* file at the repo root WILL go public
unless you add an exclude. Check this whenever adding root-level files.

**Exactly what publishes** (I enumerated the tracked files surviving the
deny-list at `f21930a` — 30 files):

```
CNAME  index.html  app.js  styles.css  sw.js  cloud-sync.js  coach.js
privacy.html  manifest.webmanifest  fonts/ffnum.woff2
icon.svg  icon-192.png  icon-512.png  apple-touch-icon.png  logo-dark-mark.png
og-image.png  shot-home.png  shot-train.png  splash/ (12 apple-splash-*.png)
```

**CNAME must survive** (workflow comment, lines 60–61): deleting or excluding
`CNAME` breaks the custom domain. It rides through the deny-list untouched.

Then `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4` publish
`_site/`. End-to-end a deploy typically completes in a couple of minutes;
"deployed" means the Fastly edge starts serving the new bytes (HTML still
subject to `max-age=600` edge/browser caching — see §6 for why users still get
updates promptly).

---

## 4. Backend deploys — `.github/workflows/deploy-functions.yml`

**Triggers:** push to `main` touching `supabase/**` or the workflow file
itself, plus `workflow_dispatch` (Actions tab → "Deploy Supabase (schema +
functions)" → Run workflow).

**Steps, in order:**

1. **Hard-fails without the `SUPABASE_ACCESS_TOKEN` repo secret** (lines
   29–32). Detects optional `ANTHROPIC_API_KEY` (lines 34–42) — missing is a
   warning, not an error.
2. **Applies `supabase/schema.sql` via the Supabase Management API** (lines
   48–61): `jq -Rs` wraps the whole file as one query and POSTs it to
   `https://api.supabase.com/v1/projects/tbwmckmyzoxzhpqlomsp/database/query`
   with the access token as Bearer — deliberately **no database password**
   anywhere. `schema.sql` is written idempotent (`IF NOT EXISTS` / `ADD COLUMN
   IF NOT EXISTS`), so re-applying the whole file on every push is the
   intended path. HTTP ≥ 300 fails the job with the response printed.
3. **Deploys Edge Functions via the Supabase CLI** (`supabase/setup-cli@v1`):
   - `delete-account` — **always** (needs no extra secret; Supabase injects
     SUPABASE_URL / ANON / SERVICE_ROLE into every function).
   - `ai-coach` — **only if `ANTHROPIC_API_KEY` is set as a repo secret**; the
     workflow first runs `supabase secrets set ANTHROPIC_API_KEY=…` so the
     function has its server-side key.
   - `paddle-webhook` — **never auto-deployed**: billing is off during early
     access (`supabase/README.md`). Manual: `supabase functions deploy
     paddle-webhook` + set `PADDLE_WEBHOOK_SECRET`, per `GO-LIVE-CHECKLIST.md` §3.
   - `push-daily` — **never auto-deployed**: it's a one-time manual setup with
     secrets + a pg_cron schedule, per `PUSH-SETUP.md` (steps 2–4 there).

All four functions have `verify_jwt = false` in `supabase/config.toml`, each
with a documented reason: browser-called functions (`ai-coach`,
`delete-account`) would have their CORS preflight (OPTIONS, no token) 401'd by
the gateway before their own Bearer/getUser auth runs; server-called ones
(`paddle-webhook`, `push-daily`) verify a Paddle signature / `x-cron-secret`
header themselves.

Whether this workflow has ever run green, and whether the repo secrets are
actually configured, **cannot be proven from the repo** — `supabase/README.md`
says the leaderboard push was "already done", implying at least one successful
run, but treat live Actions/DB state as unverified until you check the Actions
tab.

---

## 5. Post-deploy verification runbook

Run after every merge that changes served files:

1. **Actions green.** Repo → Actions tab → "Deploy Yardsmith to GitHub Pages"
   newest run has a green check (and, if you touched `supabase/**`, "Deploy
   Supabase (schema + functions)" too). A run that never appears usually means
   `paths-ignore` swallowed the push — did you commit the rebuilt outputs (§3
   consequence 2)?
2. **Know the expected hash.** Locally:
   `grep -o 'FF_BUILD="[0-9a-f]*"' index.html` (currently `04f691fff1`), or
   for the pushed commit: `git show origin/main:index.html | grep -o 'FF_BUILD="[0-9a-f]*"'`.
3. **Live-site check.**
   `curl -s https://yardsmith.golf/index.html | grep -o 'FF_BUILD="[0-9a-f]*"'`
   must match step 2. **Caveat:** in this Claude sandbox the agent proxy 403s
   yardsmith.golf — run this from a machine with normal egress, or have the
   owner do step 4 instead.
4. **In-app check (the app is its own canary).** Account tab (labelled **You**
   in the mobile tab bar) → "🔄 App version" card → "You're on build
   **&lt;hash&gt;**". That is `window.FF_BUILD`
   (`src/js/app/080-game-day-round-day-fueling-warm-up-plan.js:465-467`,
   stamped at `src/index.template.html:362`). The card renders signed-in or
   not. If it matches the committed hash, the device has the deploy.
5. **If a device lags:** the same card's **"↻ Force refresh to the latest"**
   button runs `ffForceUpdate()` (same file, line 333): unregisters every SW
   registration, deletes every Cache Storage entry, hard-reloads, with a 2.5s
   watchdog so a wedged SW can never hang it. **localStorage is untouched — no
   user data is lost.** This is the escape hatch of last resort; the automatic
   path (§6) should make it unnecessary.

First-triage discipline: when a user reports a "bug", check which FF_BUILD
their device shows **before** assuming a code bug — full triage tree in
`yardsmith-debugging-playbook`.

---

## 6. The PWA update path, end to end (why users get updates)

A PWA (Progressive Web App) installs to the home screen and caches itself via
a service worker (SW) — which is exactly how devices get stuck on old builds.
The client-side mechanism (content-hashed cache name, network-first
`{cache:'no-store'}` document fetch, resume-time update checks,
skipWaiting + single controllerchange reload, the Capacitor skip) is owned by
`yardsmith-architecture-contract` §5 — read it there. The operator-side facts
this skill adds:

1. **The deploy side of staleness: GitHub Pages serves HTML with
   `max-age=600`.** That 10-minute HTTP cache is why the SW's no-store
   document fetch exists, and why a device that is NOT SW-controlled (first
   visit, or SW unregistered) can look stale for up to ~10 minutes after a
   deploy even with everything working correctly.
2. **Manual-pin exception.** `cloud-sync.js` and `coach.js` sit outside the
   hash system (root-level hand-edited files, currently `?v=112` / `?v=88`).
   If you edit them and forget the pin bump, the CDN edge keeps serving the
   old bytes even though `main` is correct. Pin mechanics + which files:
   `yardsmith-build-and-env` §4.
3. **Native shells skip the SW entirely** — bundled files there update via
   store releases, not this pipeline.

**What to tell a user whose device looks stale:** open the app, wait a moment
(the resume-time check + one auto-reload usually lands the update), check the
App version card; if still old, tap "Force refresh to the latest" — it cannot
lose data. If a *browser-tab* (not installed) user is stale, a normal reload
suffices.

---

## 7. Native ship paths — **documented, never yet run**

As of 2026-07-08 the repo cannot prove any native build has ever executed:
no store presence, no `www/` or `ios/` committed, `android/` at
`versionCode 1`, and BRAIN §10.3–4 still lists "Ship Android" / "iOS via
Codemagic" as open next actions (blocked on the Texas LLC → Organization
store accounts). Treat everything below as a written-but-unexercised runbook;
expect first-run friction.

### Android — local build on Windows (the recommended path)

Runbook of record: `ANDROID-LAUNCH-STEP-BY-STEP.md` (184 lines — includes the
copy-paste Play store listing, graphics list, and data-safety declarations).
Summary of the mechanical spine (its Phases 1–3):

```bat
git clone https://github.com/forgerperformanceco/golf-fitness.git
cd golf-fitness
npm install
npm run sync        :: = node scripts/build-www.mjs && cap sync (package.json)
```

`scripts/build-www.mjs` allow-list-copies only the served files + `splash/` +
`fonts/` into `www/` (fresh each run, so removed assets never linger), which
Capacitor copies into `android/` (`capacitor.config.json`: appId
`app.yardsmith`, `webDir: "www"`). Then: Android Studio → open the **`android`**
folder → Run ▶ to smoke-test → **Build → Generate Signed App Bundle** →
create/reuse the upload keystore (⚠️ back it up forever — losing it
permanently blocks updates) → `.aab` lands at
`android/app/release/app-release.aab` → upload to Play Console (Internal
testing first). Re-run `npm run sync` after any web-app change; bump
`versionCode`/`versionName` in `android/app/build.gradle` per store release.

Two compliance facts from that guide worth knowing before touching stores:
never sell subscriptions inside the Android app via Paddle (Play Billing
required for in-app digital goods — fine today, the app is free), and account
deletion is already implemented (Data safety form asks).

### iOS — Codemagic cloud builds (no Mac)

One-time UI setup: `CODEMAGIC-SETUP.md`. Pipeline: `codemagic.yaml`, two
workflows, both starting from `npm ci` → `npm run build:www` → `cap add/sync`
(the native project is generated **fresh in CI** — that's why `ios/` isn't
committed):

- **`ios-app-store`** (mac_mini_m2, Node 20, latest Xcode): auto code-signing
  via an App Store Connect API key that **must be named exactly
  `Yardsmith ASC key`** in Codemagic's integrations
  (`codemagic.yaml:24` references it by that string; `CODEMAGIC-SETUP.md`
  Part 1 walks the .p8/Key ID/Issuer ID upload). Sets the build number via
  `agvtool` from `$PROJECT_BUILD_NUMBER`, builds a signed IPA
  (`ios/App/App.xcworkspace`, scheme `App`, bundle id `app.yardsmith`), and
  publishes to **TestFlight** (`submit_to_testflight: true`; App Store
  submission deliberately not enabled yet).
- **`android-play`** (linux_x2, optional — local Windows build is easier):
  signs with a Codemagic-uploaded keystore that must be named
  **`yardsmith_upload`**, runs `./gradlew bundleRelease`, and publishes the
  `.aab` to the Play **internal** track as a **draft**
  (`track: internal`, `submit_as_draft: true`) using an encrypted env var
  `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` (a Play service-account JSON).
  **Known gap, verified:** this workflow presumes release signing is wired
  into Gradle, but `android/app/build.gradle` has **no `signingConfigs` block
  today** — `CODEMAGIC-SETUP.md` Part 2 step 3 has the exact block to add
  (env-var-driven via `CM_KEYSTORE_*`) before the Codemagic Android path can
  produce a signed bundle.

### Stale instructions to ignore in the native guides

`CODEMAGIC-SETUP.md` ("Every release" step 1), `ANDROID-LAUNCH-STEP-BY-STEP.md`
(Phase 6 step 1) and `BUILD-NATIVE-APP.md` (§2, line 64) all still say "bump
the service-worker cache in `sw.js`" — that is **obsolete**; cache busting has
been automatic (content hash) since the modularization. Never hand-edit
`sw.js`. Full doc staleness map: `yardsmith-docs-and-writing`.

---

## 8. Secrets inventory

The rule (BRAIN §9, `.env.example` header): only the Supabase URL + anon
(publishable) key and the VAPID public key ever ship in the browser;
everything else is server-side. `.env` is gitignored; `.env.example` holds
placeholders only.

| Secret | Class | Where it lives (verified) |
|---|---|---|
| `SUPABASE_URL` | browser-safe | Hardcoded `cloud-sync.js:15` (`https://tbwmckmyzoxzhpqlomsp.supabase.co`) |
| `SUPABASE_ANON_KEY` | browser-safe | Hardcoded `cloud-sync.js:16` (`sb_publishable_…`) |
| VAPID public key | browser-safe | `FF_PUSH_PUB`, `cloud-sync.js:170` (`BHhvzZKW…`); must equal the `VAPID_PUBLIC_KEY` function secret |
| `PADDLE_CLIENT_TOKEN` | browser-safe (future) | Not wired yet — for Paddle.js checkout when billing turns on |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Injected into Edge Functions by Supabase automatically; never in client code |
| `ANTHROPIC_API_KEY` | server-only | Edge Function secret (set by deploy-functions.yml from the repo secret) |
| `AI_COACH_MODEL` | server-only config | Function secret; default `claude-opus-4-8` (`.env.example`) |
| `ALLOWED_ORIGIN` | server-only config | Function secret; CORS origin override, defaults to `https://yardsmith.golf` (`supabase/functions/_shared/cors.ts:11`) |
| `PADDLE_WEBHOOK_SECRET` | server-only | Function secret for `paddle-webhook` (manual, when billing turns on) |
| `VAPID_PRIVATE_KEY` | server-only | `push-daily` function secret ONLY. Not in the repo, not in `.env.example`. PUSH-SETUP.md: "handed over in the build session that shipped this" — i.e. it exists only in Supabase secrets (+ a past chat). |
| `PUSH_CRON_SECRET` | server-only | `push-daily` function secret; pg_cron sends it back as `x-cron-secret` |
| `SUPABASE_ACCESS_TOKEN` | GitHub Actions repo secret | **Required** by deploy-functions.yml (schema apply + CLI deploys) |
| `ANTHROPIC_API_KEY` | GitHub Actions repo secret | **Optional** — gates the ai-coach deploy step |

**VAPID rotation warning** (`scripts/gen-vapid.mjs` header, verified): the
script mints a P-256 pair, **prints and never writes**. Rotating keys
invalidates **every existing push subscription** — each device must toggle
reminders off/on again — so only regenerate if the private key leaks. Full
rotation ritual (from the script's own output): update `FF_PUSH_PUB` in
`cloud-sync.js`, bump its `?v=` pin in `src/index.template.html` +
`src/sw.template.js`, rebuild, and set both `VAPID_*` secrets on `push-daily`.

**Step-by-step ops runbooks — use these, don't re-derive them:**

- `GO-LIVE-CHECKLIST.md` (99 lines): turning on the paid backend — DB schema,
  ai-coach deploy + smoke (the HTTP 402 "Pro gate" is the *correct*
  unsubscribed response; SQL-flip your own `subscription_status` to `active`
  to smoke the model, then flip back), Paddle product/webhook wiring, the
  remaining client subscribe-button work, rollback notes, cost control.
- `PUSH-SETUP.md` (85 lines): one-time web-push server setup — schema,
  `push-daily` deploy, the three secrets, the pg_cron
  `cron.schedule('ff-push-hourly','5 * * * *', …)` snippet, and a curl-based
  verification that reports `{sent, gone, skipped, failed}`. iOS note: web
  push needs the PWA installed to the Home Screen (iOS 16.4+).

Whether push is actually live in production (private key set, cron scheduled)
is **not provable from the repo** — check the Supabase dashboard (Edge
Functions → push-daily → Secrets; Database → cron jobs) before assuming.

---

## Provenance and maintenance

All facts verified 2026-07-08 at HEAD `f21930a`, build `04f691fff1`. Things
that drift, and the one-liner to re-verify each:

```sh
# Current build hash (committed vs live):
grep -o 'FF_BUILD="[0-9a-f]*"' index.html
curl -s https://yardsmith.golf/index.html | grep -o 'FF_BUILD="[0-9a-f]*"'   # blocked in this sandbox; run with open egress

# Manual pins (cloud-sync / coach):
grep -n '?v=' src/index.template.html src/sw.template.js

# Workflow inventory + deny-list still as described:
ls .github/workflows && sed -n '56,75p' .github/workflows/deploy.yml

# Exactly what publishes (tracked files surviving the deny-list). Mirrors
# rsync semantics: slash-less exclude patterns match path BASENAMES at any
# depth (so e.g. .claude/skills/*/scripts/ and every *.md are excluded too):
git ls-files \
  | grep -vE '(^|/)(\.github|_site|node_modules|www|supabase|android|ios|assets|scripts|src|social)(/|$)' \
  | grep -vE '\.md$|(^|/)(\.env[^/]*|\.gitignore|package\.json|package-lock\.json|capacitor\.config\.json|codemagic\.yaml|logo-source[^/]*\.png)$'

# Supabase project ref + function JWT posture:
grep -n project .github/workflows/deploy-functions.yml supabase/config.toml | head

# Local-serve smoke still green (needs the global playwright at /opt/node22/…
# and Chromium at /opt/pw-browsers/ — both environment-provided, may drift;
# full recipe in yardsmith-playwright-harness):
python3 -m http.server 8123 --bind 127.0.0.1 &  # then drive it headless and check window.FF_BUILD

# Codemagic Android signing gap still open?
grep -n signingConfigs android/app/build.gradle || echo "still missing — see CODEMAGIC-SETUP.md Part 2 step 3"

# Native ship status (open threads):
grep -n 'Ship Android\|Codemagic' YARDSMITH-BRAIN.md

# fairwayfuel.app 301 (from a machine with open egress):
curl -sI https://fairwayfuel.app/ | grep -iE '^(HTTP|location)'
```

Unverifiable-from-repo state (re-check at the source before relying on it):
GitHub Actions secret configuration and run history (Actions tab); live
Supabase schema/secrets/cron state (dashboard); the Porkbun 301; Codemagic
account/integration existence; store account status.
