# FairwayFuel → Google Play — the whole thing, step by step (Windows)

Everything to take FairwayFuel from this repo to live on the Play Store. The
`android/` project, icons, splash, and store graphics are **already built and
committed** — you install two tools, build a signed file, and fill in forms.

Rough time: **~2–3 focused hours**, plus Google's account verification (can take
1–2 days the first time — start that early).

---

## PHASE 0 — Accounts & installs (one time)

1. **Node.js LTS** — https://nodejs.org → run the installer, accept defaults.
2. **Android Studio** — https://developer.android.com/studio → install (it brings
   its own Java + Android SDK; just click through).
3. **Google Play Developer account** — https://play.google.com/console/signup →
   $25 one-time. Google verifies your identity; **do this first** since it can
   take a day or two.
4. **Git** (to get the code) — https://git-scm.com if you don't have it.

---

## PHASE 1 — Get the code and build the web bundle

Open a terminal (Command Prompt / PowerShell) in a folder where you keep code:

```bat
git clone https://github.com/forgerperformanceco/fairwayfuel.git
cd fairwayfuel
npm install
npm run sync
```

- `npm install` pulls the Capacitor libraries the app links against.
- `npm run sync` builds the web app into `www/` and copies it into the Android
  project. **Run `npm run sync` again any time you change the app.**

---

## PHASE 2 — Open in Android Studio & smoke-test

1. Android Studio → **File → Open** → select the **`android`** folder (not the
   repo root). Click through the trust prompt.
2. Wait for **Gradle sync** to finish (bottom status bar). First time it
   downloads build tools — a few minutes is normal. If it offers an **Android
   Gradle Plugin upgrade**, you can accept it; if a build fails after, decline
   and re-sync.
3. Test it: click the green **Run ▶** with an emulator (Device Manager → create
   one) or a USB-connected phone with **Developer options → USB debugging** on.
   You should see the FairwayFuel splash, then the app. Sign in, poke around.

---

## PHASE 3 — Build the signed App Bundle (.aab)

1. **Build → Generate Signed App Bundle / APK → Android App Bundle → Next.**
2. **Create new…** keystore (first time only):
   - Key store path: e.g. `C:\keys\fairwayfuel-upload.jks`
   - Set a password; alias `fairwayfuel`; another password; validity 25+ years;
     fill in name/org (anything reasonable).
   - **⚠️ BACK THIS FILE + PASSWORDS UP FOREVER (cloud + offline).** Lose it and
     you can never update the app again — you'd have to publish a brand-new listing.
3. Select the keystore, **release** variant → **Finish.**
4. Android Studio shows a notification with a link to the `.aab`
   (`android/app/release/app-release.aab`).

---

## PHASE 4 — Create the app in Play Console

https://play.google.com/console → **Create app**:
- App name: **FairwayFuel** · Language: English (US)
- App or game: **App** · Free or paid: **Free**
- Accept the declarations → **Create app.**

Then work down the **Dashboard → "Set up your app"** checklist. The content is
all below (Phase 5). Upload the build under:
**Testing → Internal testing → Create new release →** upload your `.aab` →
name the release (e.g. `1.0 (1)`) → **Save → Review → Start rollout.**
Add your own email as a tester and install via the opt-in link to verify.

When you're happy: **Production → Create new release** (reuse the same bundle) →
submit for review.

---

## PHASE 5 — Copy-paste store content

### Graphics (all in the repo, ready to upload)
| Asset | File | Play field |
|---|---|---|
| App icon (512×512) | `assets/play/play-icon-512.png` | App icon |
| Feature graphic (1024×500) | `assets/play/feature-graphic.png` | Feature graphic |
| Phone screenshots | `shot-home.png`, `shot-train.png` (repo root) | Phone screenshots (need ≥2) |

> Tip: grab 2–3 more screenshots from the running app (emulator → camera icon)
> for a richer listing — the Score/hero, the Fuel tab, and the AI coach are good.

### App name (max 30)
```
FairwayFuel: Golf Distance
```

### Short description (max 80)
```
Build muscle, swing faster, hit it farther. Training + fuel built for golfers.
```

### Full description (max 4000)
```
FairwayFuel is the golf training app built on one simple, evidence-backed idea:
build the right kind of muscle, turn it into power, and the yards follow.

Most golf apps track your score. FairwayFuel builds the engine behind your
swing — then proves it with your own driver distance and clubhead-speed trend.

WHAT YOU GET
• A 20-week strength, power and speed plan made for golfers — lift like a
  bodybuilder, move like an athlete.
• A Speed & Power day with a Gym or Field option, built around the exercises
  that research links most strongly to clubhead speed.
• A macro & meal engine: your calories and protein/carb/fat targets, per-meal
  breakdowns, and a shopping list built around foods you actually eat.
• Distance & speed tracking: log your driver carry and 7-iron speed and watch
  the gain — your own numbers are the proof.
• Octane — one score that ties together showing up, getting stronger, getting
  faster, and turning mass into speed.
• An AI coach that reads your own numbers and answers in plain language.
• Works offline, installs to your phone, and syncs across devices when you
  sign in (optional — no password, just an emailed code).

THE HONEST PART
Strength and power are the top physical drivers of clubhead speed; general
flexibility barely moves it. So we train the engine and keep mobility work for
what it actually earns — protecting your back. We don't promise a magic
number; we help you build the body that hits it farther and let your own
before/after do the talking.

Free. No ads. Evidence-based starting points — not medical advice. Consult a
professional before starting any training or nutrition program.
```

### Other fields
- **Category:** Health & Fitness
- **Contact email:** bobbydenisclay@gmail.com
- **Privacy policy:** https://fairwayfuel.app/privacy.html

### App content declarations (Dashboard → App content)
- **Data safety:** you collect **email** (account/login) and **bodyweight +
  workout data** (app function). Data is encrypted in transit. Users can
  **request deletion in-app** (Account → Delete my account). Not shared with
  third parties; not used for advertising/tracking.
- **Content rating:** fill the questionnaire honestly (no violence/sex/etc.) →
  you'll get **Everyone / PEGI 3**.
- **Target audience:** 18+ (nutrition/training guidance for adults) — avoids the
  extra Families-policy requirements.
- **Ads:** No ads.
- **Government / News / COVID apps:** No.

---

## ⚠️ Two compliance things to know
1. **Don't sell subscriptions inside the Android app via Paddle.** Google Play
   requires **Google Play Billing** for in-app digital purchases. FairwayFuel is
   free at launch, so this is fine now — but if you add paid tiers, the Android
   app must use Play Billing (or keep payment entirely on the website, outside
   the app, per Google's rules). Flag this before you monetize.
2. **Account deletion** is already implemented (Data safety asks about it) — good.

---

## PHASE 6 — Every future update
1. Change the app, bump the service-worker cache in `sw.js`, push (web goes live).
2. `npm run sync`
3. In `android/app/build.gradle` raise **`versionCode`** by 1 and set a new
   **`versionName`** (e.g. `"1.1"`).
4. **Build → Generate Signed App Bundle** with the **same keystore** → upload the
   new `.aab` to Play (Internal testing → then Production).

---

That's the whole path. Stuck on any screen? Screenshot/paste the error and I'll
walk you through it — Gradle sync and the data-safety form are the usual snags.
