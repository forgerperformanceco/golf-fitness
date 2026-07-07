# Yardsmith — Android on Windows (first build → Google Play)

The `android/` project is **already generated and committed** (correct app id
`app.yardsmith`, your green icon + splash baked in). You just install two
tools, build a signed bundle, and upload it. No Mac, no cloud.

---

## One-time installs
1. **Node.js LTS** — https://nodejs.org (needed to sync the web app into the shell).
2. **Android Studio** — https://developer.android.com/studio (bundles its own JDK).
3. **Google Play Developer account** — $25 once → https://play.google.com/console/signup

---

## Build the app bundle (.aab)

From a terminal in the repo folder:
```bat
npm install          :: pulls Capacitor libs the Android build links against
npm run sync         :: builds www/ and copies it into the Android project
```

Then in **Android Studio**:
1. **File → Open →** select the `android` folder. Let Gradle finish syncing
   (first open downloads Gradle + the Android build tools — a few minutes).
2. Plug in an Android phone (USB debugging) or start an emulator and hit **Run ▶**
   to smoke-test it first.
3. **Build → Generate Signed App Bundle / APK → Android App Bundle.**
4. **Create new keystore** (first time): pick a file path + passwords, an alias
   (e.g. `yardsmith`). **⚠️ Back this keystore up somewhere safe forever** —
   lose it and you can never update the app again.
5. Choose the **release** build variant → **Finish.** The `.aab` lands in
   `android/app/release/` (Android Studio shows a link).

---

## Ship it to Google Play
1. **Play Console → Create app** — name *Yardsmith*, app (not game), free.
2. **Create app → Internal testing → Create release → upload the `.aab`.**
3. Fill the required forms (Play won't publish until these are done):
   - **App content → Data safety:** you collect **email** (login) and
     **bodyweight** (fitness). Account deletion is available **in-app**
     (Account → Delete my account) — declare that + the app itself.
   - **Privacy policy URL:** `https://yardsmith.golf/privacy.html`
   - Store listing: short/long description, your icon, screenshots
     (`shot-home.png`, `shot-train.png`).
4. Roll out to **Internal testing** first (instant, invite yourself), then
   promote to **Production** when you're happy.

---

## Every update afterward
1. Bump the service-worker cache in `sw.js` and push (web goes live via Pages).
2. `npm run sync`
3. Bump the version in **`android/app/build.gradle`**: increase `versionCode`
   (integer, must go up every upload) and set a new `versionName` (e.g. `"1.1"`).
4. Generate a new signed bundle **with the same keystore** → upload to Play.

---

### Notes
- **You must run `npm run sync` before every build** — the web app lives in
  `www/` (and inside the app) and is regenerated from the source files; it's not
  committed into the Android project on purpose.
- Backend (login, sync, coach, account deletion) already works from inside the
  app — the edge functions allow the native origin. Nothing to configure.
- iOS whenever you want it: `CODEMAGIC-SETUP.md` (cloud Mac, still no Mac needed).
