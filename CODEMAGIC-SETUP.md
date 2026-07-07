# Yardsmith — ship iOS (and Android) from Windows via Codemagic

You don't have a Mac, and you don't need one. **Codemagic** runs a cloud macOS
machine that builds, signs and uploads the iOS app for you. This guide is the
one-time UI setup that pairs with the committed `codemagic.yaml`.

> **TL;DR paths**
> - **iOS** → Codemagic (below). No Mac involved.
> - **Android** → easiest is **Android Studio on your Windows laptop**
>   (`BUILD-NATIVE-APP.md` §4). Codemagic can also do it (Part 2).

---

## What you need first

| Thing | Cost | Where |
|---|---|---|
| Apple Developer Program | $99 / yr | https://developer.apple.com/programs/ (enroll from Windows) |
| Codemagic account | Free tier (~500 min/mo) | https://codemagic.io — sign in with GitHub |
| Google Play Developer (Android only) | $25 once | https://play.google.com/console/signup |

---

## Part 1 — iOS to the App Store (the main event)

### 1. Make an App Store Connect API key (lets Codemagic sign + upload)
1. https://appstoreconnect.apple.com → **Users and Access → Integrations →
   App Store Connect API**.
2. **Generate API Key**, role **App Manager** (or Admin).
3. Download the **`.p8`** file (one-time!) and note the **Key ID** and the
   **Issuer ID** at the top of the page.

### 2. Add that key to Codemagic
1. Codemagic → **Teams / Personal Account → Integrations → App Store Connect →
   Connect**.
2. Upload the `.p8`, paste the **Key ID** + **Issuer ID**, and name it
   **exactly** `Yardsmith ASC key` (this name is referenced in
   `codemagic.yaml` → `integrations.app_store_connect`).

### 3. Create the app record
- In **App Store Connect → Apps → +**, create a new app with bundle id
  **`app.yardsmith`**, platform iOS. (If the bundle id isn't offered, register
  it under **Certificates, Identifiers & Profiles → Identifiers** first — or let
  Codemagic's automatic signing create it on the first build.)

### 4. Connect the repo and run
1. Codemagic → **Add application → GitHub → `forgerperformanceco/golf-fitness`**.
   It auto-detects `codemagic.yaml`.
2. Pick the **Yardsmith iOS — App Store** workflow → **Start new build**.
3. Codemagic will: install deps → build `www/` → generate the iOS project →
   sign with your key → produce a signed `.ipa` → upload to **TestFlight**.

### 5. Test, then submit
- Install via **TestFlight** on your iPhone and check it end-to-end.
- Back in App Store Connect, fill the listing (screenshots: `shot-home.png`,
  `shot-train.png`), set **privacy labels**, add the **Privacy Policy URL**
  `https://yardsmith.golf/privacy.html`, then **Submit for Review**.

**Reviewer notes to paste** (from `BUILD-NATIVE-APP.md` §3):
- Account deletion: *Account tab → Delete my account* (Guideline 5.1.1(v)).
- Sign-in uses an emailed **code**; provide a demo email.
- Real functionality (training plan, macro/meal engine, speed tracking, AI
  coach) for Guideline 4.2.

---

## Part 2 — Android (optional; local is easier)

**Simplest:** build it on your Windows laptop in Android Studio —
`BUILD-NATIVE-APP.md` §4. You never need Codemagic for Android.

**If you'd rather Codemagic build it too**, Android needs its signing wired into
the project (iOS didn't, because Xcode profiles handle that at build time). Do
this once on Windows:

1. Generate + commit the Android project:
   ```bash
   npm install
   npx cap add android
   ```
2. Create an **upload keystore** (keep it safe forever — losing it blocks
   updates):
   ```bash
   keytool -genkey -v -keystore yardsmith-upload.keystore ^
     -alias yardsmith -keyalg RSA -keysize 2048 -validity 10000
   ```
3. Add this signing block to **`android/app/build.gradle`** inside `android { }`,
   then commit the `android/` folder:
   ```gradle
   signingConfigs {
       release {
           if (System.getenv("CM_KEYSTORE_PATH")) {
               storeFile file(System.getenv("CM_KEYSTORE_PATH"))
               storePassword System.getenv("CM_KEYSTORE_PASSWORD")
               keyAlias System.getenv("CM_KEY_ALIAS")
               keyPassword System.getenv("CM_KEY_PASSWORD")
           }
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
       }
   }
   ```
   *(For a local Android Studio build instead, point these at your keystore
   file/passwords directly, or use Android Studio's Generate Signed Bundle UI.)*
4. In Codemagic → **Code signing identities → Android keystores**, upload the
   keystore and name it **`yardsmith_upload`** (matches `codemagic.yaml`).
5. For auto-publishing to Play: create a **Google Play service account**, grant
   it release access, download the JSON, and add it in Codemagic as an encrypted
   env var **`GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`**. (Or skip publishing and just
   download the `.aab` artifact to upload manually.)
6. Run the **Yardsmith Android — Play** workflow.

---

## Every release (recap)
1. Bump the SW cache in `sw.js` and push (web updates go live via Pages).
2. Start the Codemagic workflow(s) — they rebuild `www/`, sync native, sign, ship.
3. Bump the version string when you want a new store build (Codemagic
   auto-increments the iOS build number via `$PROJECT_BUILD_NUMBER`).
