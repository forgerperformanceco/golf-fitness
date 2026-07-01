# FairwayFuel — Build the iOS & Android apps (Capacitor)

This wraps the existing web app (unchanged) in native iOS/Android shells so it
can ship on the **App Store** and **Google Play**. The web PWA at fairwayfuel.app
keeps working exactly as-is; this is packaging, not a rewrite.

**What's already scaffolded in this repo (done for you):**

| File | Purpose |
|---|---|
| `capacitor.config.json` | App id **`app.fairwayfuel`**, name, `webDir: www`, brand splash colors |
| `package.json` | Capacitor + plugin deps and helper scripts |
| `scripts/build-www.mjs` | Assembles `www/` (only the served files) for Capacitor to bundle |
| `assets/icon.png`, `assets/splash*.png` | Source art for native icon + splash generation |
| CORS (`supabase/functions/_shared/cors.ts`) | Already allows the native shells (`capacitor://localhost`, `http://localhost`) |
| SW guard (`index.html`) | Service worker is skipped inside the native shell |

**What you do (needs a Mac + the store accounts):** everything below.

---

## 0. One-time prerequisites

- **Node 18+** (you have it).
- **Xcode** (latest) + **CocoaPods** (`sudo gem install cocoapods`) — iOS builds. **macOS only.**
- **Android Studio** (latest) + JDK 17 — Android builds. Any OS.
- **Apple Developer Program** — $99/yr → https://developer.apple.com/programs/
- **Google Play Developer** — $25 once → https://play.google.com/console/signup

---

## 1. First-time setup (once)

```bash
cd golf-fitness
npm install                    # installs Capacitor + plugins (writes package-lock.json)

npm run add:ios                # builds www/ then generates the ios/ project
npm run add:android            # builds www/ then generates the android/ project
```

Generate the native app icons + splash from the source art in `assets/`:

```bash
npm install -D @capacitor/assets
npx @capacitor/assets generate --iconBackgroundColor '#0b3d22' \
  --splashBackgroundColor '#0b3d22' --iconBackgroundColorDark '#0b3d22' \
  --splashBackgroundColorDark '#0b3d22'
npx cap sync                   # copies web + assets into both native projects
```

Then **commit the `ios/` and `android/` folders** (their generated web bundle and
build output are gitignored; the project files themselves are tracked).

---

## 2. Every release (repeat each time you ship an update)

The web app and the bundled copy must stay in lockstep. On every release:

1. **Bump the service-worker cache** in `sw.js` (`fairwayfuel-vNN`) — same as any web change.
2. Rebuild + copy the web bundle into the native projects:
   ```bash
   npm run sync                 # = build-www.mjs + cap sync
   ```
3. Bump the app version:
   - **iOS:** Xcode → target → *General* → Version + Build.
   - **Android:** `android/app/build.gradle` → `versionCode` (increment) + `versionName`.
4. Build & upload (sections 3 / 4).

> Small content tweaks can still just go to the live website. Rebuild the native
> apps when you want those changes in the store binaries (store review applies).

---

## 3. iOS → App Store

```bash
npm run open:ios               # opens ios/App/App.xcworkspace in Xcode
```

In Xcode:
1. **Signing & Capabilities** → select your Apple Developer **Team**. Bundle id is
   `app.fairwayfuel`.
2. Add capability **Push Notifications** (and Background Modes → Remote
   notifications) if/when you turn on the nudge notifications.
3. **Privacy manifest**: add `PrivacyInfo.xcprivacy` declaring data use (email for
   login, bodyweight — collected, linked to the user, not used for tracking).
4. Set the **Version/Build**, choose *Any iOS Device*, then **Product → Archive**.
5. **Distribute App → App Store Connect → Upload.**
6. In **App Store Connect**: create the app record (bundle id `app.fairwayfuel`),
   fill the listing (use `shot-home.png` / `shot-train.png` for screenshots),
   set the **privacy “nutrition” labels**, link **Privacy Policy URL** →
   `https://fairwayfuel.app/privacy.html`, then submit for review (TestFlight first
   is recommended).

**Review notes to include (avoids the usual rejections):**
- **Account deletion:** *Account tab → Delete my account* (Guideline 5.1.1(v) — already built).
- **Guideline 4.2 (“minimum functionality”):** describe the real features — logged
  training plan, macro/meal engine, clubhead-speed tracking, AI coach. Turning on
  push notifications strengthens this.
- **Demo account:** provide a test email + note that sign-in uses an emailed code.

---

## 4. Android → Google Play

```bash
npm run open:android           # opens android/ in Android Studio
```

1. **Build → Generate Signed Bundle / APK → Android App Bundle (.aab).** Create/keep
   an upload keystore **safe** (losing it blocks future updates).
2. In **Play Console**: create the app (package `app.fairwayfuel`), complete the
   **Data safety** form (email + bodyweight; account deletion available in-app AND
   note the URL/flow), add the **Privacy Policy** URL, upload the `.aab` to internal
   testing → then production.

---

## 5. Known caveats & later polish

- **Sign-in:** the emailed **code** flow works everywhere (built for installed apps).
  The emailed **link** opens Safari/Chrome, not the app — that's fine for now. To make
  the link deep-link back into the app later, set up **Universal Links (iOS)** /
  **App Links (Android)** and add those redirect URLs in Supabase → Auth → URL config.
- **Backend/CORS:** already handled — the edge functions allow the native origins, so
  the coach, sync, and account-deletion all work from inside the app with no change.
- **Push notifications:** deps are installed but not wired. When you want the
  “log today’s workout” nudge, add `@capacitor/push-notifications` registration +
  APNs (iOS) / FCM (Android) setup.
- **HealthKit / Health Connect** (auto-pull bodyweight) is a strong native-only
  upgrade for a later version — a community Capacitor plugin covers both.

---

## Quick reference

```bash
npm run build:www     # assemble www/ from the served files
npm run sync          # build:www + cap sync (do this every release)
npm run open:ios      # Xcode
npm run open:android  # Android Studio
```
