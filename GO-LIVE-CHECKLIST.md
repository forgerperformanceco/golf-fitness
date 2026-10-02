# Yardsmith — Go-Live Checklist (backend + Pro)

Copy-paste steps to turn on the paid backend: the **AI coach** behind **Yardsmith Pro**
and **subscriptions** on the web (Paddle), iPhone (App Store) and Android (Google Play).
Nothing here touches the free app until step 8 — it stays live the whole time. Order
matters; each step is verifiable before the next. See `YARDSMITH-BRAIN.md` §9 for the
plan of record, `ROADMAP.md` for the why and `supabase/README.md` for the file map.

There are **two switches**, and they behave differently:

| Switch | Where | How it changes |
|---|---|---|
| `FF_PAYWALL` | `src/js/app/036-access-free-week-and-pro.js`, compiled into `app.js` | A new web deploy, or a **new store binary** — see step 6 |
| `REQUIRE_SUBSCRIPTION=1` | ai-coach function secret | Instantly, server-side (`supabase secrets set` / `unset`) |

> **Prereqs:** the Supabase project already exists (its URL + anon key are wired into
> `cloud-sync.js`). You'll need the Supabase CLI (`npm i -g supabase`), an Anthropic API
> key, a Paddle account, and (for the stores) App Store Connect / Play Console access.

---

## 0. Where things stand (Oct 2026)

- `FF_PAYWALL=false` and `REQUIRE_SUBSCRIPTION` is unset: everyone gets everything.
- No `window.FFBilling` bridge exists on any platform, so the Pro sheet's buy button
  only shows "Subscriptions open soon".
- `paddle-webhook` redeploys on every merge like the other functions (the GitHub
  integration redeployed it with ai-coach, delete-account and push-daily on
  2026-09-30). It does nothing yet: with no `PADDLE_WEBHOOK_SECRET` no signature can
  verify, so it rejects every request and writes nothing. No App Store / Google Play webhook exists yet
  (step 5).
- Migration `20261001204500_billing_per_subscription_entitlement.sql` is written and
  CI-tested but **not applied** to the live project (step 1).
- **The owner's row is hand-set to Pro.** The live project's only profile has
  `subscription_status='active'` and `billing_provider` null — no billing record
  behind it (a leftover from the old smoke test, or a comp). It stays Pro forever and,
  signed in, always sees the app as `full`. If it isn't meant to be a comp, reset it
  in the SQL editor with the uuid from Auth → Users:
  ```sql
  update public.profiles set subscription_status='free' where id='<owner uuid>';
  ```
  If it is a comp, record that in `YARDSMITH-BRAIN.md` §9.

**Testing the paywall before launch:** `?paywall=1` turns it on for one browser tab
session (`?paywall=0` turns it off). Test **signed out, or signed in to an account that
isn't Pro**: a signed-in account that `is_subscribed()` reports as Pro caches
`ff_pro={pro:true}` and always sees `full` — the preview and locked states never show
on the owner's account.

---

## 1. Database

Migrations live in `supabase/migrations/` (mirrored into the idempotent
`supabase/schema.sql`). CI runs them on every PR; applying them to the live project
is a manual step:

```sh
supabase link --project-ref tbwmckmyzoxzhpqlomsp   # this project
supabase db push                                   # applies migration files the project hasn't run
```
Or paste each pending migration file into Supabase → SQL Editor → Run (or Supabase MCP
`apply_migration`). Pending as of Oct 2026: `20261001204500_billing_per_subscription_entitlement.sql`.
Paste `schema.sql` only into a brand-new project.

**Verify:** `list_migrations` (or Database → Migrations) shows `20261001204500`, and in
the SQL editor `select count(*) from private.billing_subscriptions;` runs.

How entitlement works after this migration:
- Every provider subscription is its own row in `private.billing_subscriptions`, with
  its own out-of-order guard. The billing columns on `profiles` are a summary of the
  user's best subscription, so a late event from an old subscription can't lock out a
  newer, paid one.
- **Pro = the provider's status**: `active`, `trialing`, or `past_due` (the provider is
  still retrying the card). Dates never grant or remove Pro. `is_subscribed()` and the
  coach gate use the same rule.

---

## 2. AI coach function (10 min)

```sh
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...      # server-side only
supabase secrets set ALLOWED_ORIGIN=https://yardsmith.golf
supabase functions deploy ai-coach
```

**Verify:** open the live site, sign in, tap **💬 Ask Coach** — it answers. There is no
Pro gate yet: the coach returns HTTP 402 ("Yardsmith Pro") only after
`REQUIRE_SUBSCRIPTION=1` is set (step 8), and then only for accounts **at least 7 days
old** (newer accounts are in their free week).

To smoke-test the Pro path on your own account, set your row by its uuid. The SQL
editor runs with no signed-in user, so `auth.uid()` is null there — use the id from
Auth → Users:
```sql
update public.profiles set subscription_status='active' where id='<your uuid>';
-- …test…, then put it back:
update public.profiles set subscription_status='free' where id='<your uuid>';
```
("Impersonate user" won't work: browser roles can't write billing columns.)

---

## 3. Paddle subscriptions — web (20 min)

Paddle is a **Merchant of Record** — it collects payment and remits sales tax/VAT for
you. Sign up at paddle.com and choose the **"Digital products or SaaS"** category (the
web checkout), not "Mobile apps" (that's for native iOS/Android IAP).

1. **Product + prices:** Paddle → Catalog → create "Yardsmith Pro" with a monthly
   price and an annual price (the annual one carries the 7-day trial). Copy both
   **price IDs** (`pri_...`).
2. **Secrets + deploy:**
   ```sh
   supabase secrets set PADDLE_WEBHOOK_SECRET=pdl_ntfset_...   # from step 4 below
   supabase secrets set PADDLE_API_KEY=...                     # server-only; delete-account cancels with it
   supabase secrets set PADDLE_ENV=sandbox                     # while testing; unset (or production) when live
   supabase functions deploy paddle-webhook --no-verify-jwt   # optional: merges already deploy it
   supabase functions deploy delete-account                    # optional, same
   ```
   Both functions already ship on merge to `main`; a hand deploy only matters if
   you need a change live before it merges. Setting the secrets is the real switch.
   `PADDLE_API_KEY` must be set before anyone can buy on the web: with it,
   **deleting an account first cancels its Paddle subscriptions** (effective
   immediately) and deletes nothing if Paddle can't confirm. Without it, deletion
   leaves a paid subscription billing an account that no longer exists.
3. **Checkout** is opened by the web billing bridge (step 4) for a **signed-in** user
   with `customData: { user_id: <supabase user id> }`, so the webhook can find them.
4. **Webhook:** Paddle → Developer tools → Notifications → add a destination =
   `https://tbwmckmyzoxzhpqlomsp.supabase.co/functions/v1/paddle-webhook`, subscribe to
   `subscription.created`, `subscription.activated`, `subscription.updated`,
   `subscription.canceled`, `subscription.paused`, `subscription.resumed`
   (`past_due` arrives through `subscription.updated`). Copy the **signing secret**
   into step 2.
5. **Failed payments:** in Paddle's payment-recovery (dunning) settings, make sure a
   subscription whose retries run out ends **canceled or paused**. `past_due` keeps Pro
   while Paddle retries, and that event is what ends it.

> Use Paddle **sandbox** while testing (separate dashboard + keys), then switch to
> production keys and unset `PADDLE_ENV` (or set `production`).

**Verify (sandbox):**
- Checkout → the webhook writes a row in `private.billing_subscriptions` and your
  profile shows `active`/`trialing` → `is_subscribed()` is true.
- Cancel → `canceled`.
- Delete a sandbox account that has an active subscription → Paddle shows the
  subscription canceled, and the account is gone.
- Re-send a webhook for that deleted account from Paddle → `200`, and the function
  log shows `paddle_event_orphaned` (no retry loop).

---

## 4. Web billing bridge (`window.FFBilling` on the web) + CSP

Every purchase goes through `ffStartCheckout` → `window.FFBilling` in
`src/js/app/036-access-free-week-and-pro.js`. Nothing goes through `coach.js`: the
client coach gate is `ffGateCoach` in 036. coach.js's 402 branch shows the server's
message and fires `ff-paywall`, which opens the Pro sheet when the paywall is on.

Build a web `window.FFBilling` (web build only — native builds use StoreKit / Play
Billing) that follows the bridge contract written at the top of 036 (`isPro`,
`prices`, `purchase`, `restore`, `platform: "web"`, `manageUrl`, `termsUrl`, and the
`ff-billing-changed` event):
- `purchase(plan)`: if signed out, send the user to sign-in first. Then load
  `https://cdn.paddle.com/paddle/v2/paddle.js`, initialize it with `PADDLE_CLIENT_TOKEN`
  (sandbox environment while testing) and open
  `Paddle.Checkout.open({ items:[{ priceId }], customData:{ user_id: FF.user.id } })`
  with the price ID for `plan` (`annual` / `monthly`). Report "purchased" on
  `checkout.completed`.
- After a purchase or restore, `ffRefreshPro()` re-reads `is_subscribed()` into
  `ff_pro`. The webhook lands a few seconds after checkout, so retry it a few times.
- `isPro()` can be false on the web — `ffIsPro()` then falls back to the server's
  cached answer (`ff_pro`).
- `manageUrl`: the Paddle customer portal (where web buyers cancel). `termsUrl`: the
  Yardsmith Terms of Use page (step 7).

**CSP — same change as the bridge.** The page's CSP (`src/index.template.html`, the
`Content-Security-Policy` meta tag) blocks Paddle today. Add:
- `script-src`: `https://cdn.paddle.com`
- `frame-src` (new directive): `https://buy.paddle.com https://sandbox-buy.paddle.com`
- `connect-src`: Paddle's checkout API origins, production and sandbox

Confirm the exact list against Paddle's published CSP guidance, then
`node scripts/build.mjs`. Never edit the root `index.html` by hand. The meta CSP
applies on localhost too, so the sandbox checkout test catches anything missing.

---

## 5. App Store / Google Play: server entitlement — REQUIRED before `REQUIRE_SUBSCRIPTION=1`

The coach gate and `is_subscribed()` read only `profiles.subscription_status`, and only
billing **webhooks** write it. Today only Paddle has one. Without a store webhook, an
iPhone or Android subscriber looks Pro on their phone (FFBilling says so) but the
server doesn't know: from day 8 every coach question gets 402 "Your free week is done",
and they aren't Pro on the web or another device.

Pick one (vendor not chosen yet):
- **(a) RevenueCat** — one webhook function. Check its shared `Authorization` secret.
  Set the app user id to the Supabase user id (`Purchases.logIn(uid)` on sign-in, so a
  purchase made signed-out moves to the account). Map: `INITIAL_PURCHASE` / `RENEWAL` /
  `UNCANCELLATION` / `PRODUCT_CHANGE` → `active` (`trialing` for a trial period);
  `BILLING_ISSUE` → `past_due` only while the event carries a grace-period expiry
  (the store's grace period), otherwise `paused`; `CANCELLATION` (auto-renew off) →
  stays `active` until it expires; `EXPIRATION` → `canceled`; `TRANSFER` → move it to
  the new user.
- **(b) Direct** — **App Store Server Notifications v2** (verify the `signedPayload`
  JWS chain to Apple Root CA G3; set `appAccountToken` = Supabase uid at purchase)
  **plus Google Play RTDN** (Pub/Sub push; verify its OIDC token; look the purchase up
  with `purchases.subscriptionsv2.get`; acknowledge purchases; set
  `obfuscatedExternalAccountId` = Supabase uid).

Either way:
- Write through a new service-role-only RPC modeled on `apply_paddle_subscription`:
  dedupe by (provider, event id), upsert the row in `private.billing_subscriptions`
  (provider `app_store` / `play_store`, or `revenuecat`), then call
  `private.sync_billing_summary(user)`. `is_subscribed()` and the coach gate then work
  unchanged. `past_due` counts as Pro, so map **only the store's grace period** to it:
  Apple `DID_FAIL_TO_RENEW` with subtype `GRACE_PERIOD`, Play
  `SUBSCRIPTION_IN_GRACE_PERIOD`. Billing retry **without** a grace period (Apple
  `DID_FAIL_TO_RENEW` with no subtype, up to 60 days) and Play account hold
  (`SUBSCRIPTION_ON_HOLD`) → `paused` — both stores cut access there. Apple
  `DID_RENEW` with subtype `BILLING_RECOVERY` and Play `SUBSCRIPTION_RECOVERED` /
  `SUBSCRIPTION_RESTARTED` → back to `active`. Expired, revoked or refunded →
  `canceled`.
- Don't put a sign-in wall in front of an App Store purchase (guideline 5.1.1(v)) —
  attach the purchase when they sign in. Only the web (Paddle) path requires sign-in.
- The native FFBilling bridge calls `ffRefreshPro()` after purchase and restore.

**Verify with an account OLDER than 7 days** (newer accounts are in the server's free
week and hide the bug): sandbox purchase on iPhone and on Android → `is_subscribed()`
is true for that account on the web → with `REQUIRE_SUBSCRIPTION=1` the coach answers.

---

## 6. Before the first store binary ships — old binaries can't be flipped

`FF_PAYWALL` is compiled into `app.js`, and the native apps run their bundled copy. A
binary built with `FF_PAYWALL=false` says "Free during early access" and has no buy
button **for as long as it's installed** — nothing remote can turn its paywall on.
`REQUIRE_SUBSCRIPTION` is server-side, so once it's set those users get the coach's 402
("start it from the You tab") with no way to subscribe in that build.

So, before the first store release:
- A 402 from the coach already opens the Pro sheet when the paywall is on (coach.js
  fires `ff-paywall`; 036 listens). With the paywall off the build just shows the
  server's text — so check that text still makes sense to someone who can't buy in
  that build ("update Yardsmith to subscribe").
- Don't ship a binary with `FF_PAYWALL=true` unless its `FFBilling` can actually sell:
  `ffPaywallOn()` doesn't check for a bridge, so a build without one would lock users
  behind a sheet whose buy button only says "Subscriptions open soon".
- Decide what users still on pre-billing builds get when `REQUIRE_SUBSCRIPTION` flips:
  a founding / grandfather grant written to their profile, or an "update the app"
  message (the 402 text comes from the server, and old builds show it as-is). Record
  it in `YARDSMITH-BRAIN.md` §9.

---

## 7. Terms of Use, privacy page, account-deletion copy

- **Terms of Use.** There is no Yardsmith terms page. The Pro sheet links the bridge's
  `termsUrl`; without one it falls back to Apple's standard App Store EULA
  (`FF_TERMS_URL` in 036) on iPhone only, and shows no Terms link on Android or the web.
  Apple's EULA covers App Store purchases only and says nothing about Yardsmith's
  renewal, cancellation or refund terms. Before launch add `terms.html` next to
  `privacy.html`: Long Game Labs LLC, the plans and prices, auto-renewal, how to cancel
  on each platform, refunds (Apple / Google / Paddle), the free week and the trial, and
  that App Store purchases are also covered by Apple's standard EULA. In the same
  change:
  - add `./terms.html` to `ASSETS` and to the HTML cache-key choice in
    `src/sw.template.js` (otherwise opening Terms overwrites the offline copy of the app);
  - add `terms.html` to `FILES` in `scripts/build-www.mjs` (or the native apps 404 it);
  - link it from the Pro sheet on every platform (set each bridge's `termsUrl` to it),
    update the matching assertions in `tests/paywall.test.mjs`, and rebuild.
  - App Store Connect: keep Apple's standard EULA (Terms link in the description) or
    upload the terms as a custom EULA.
- **Privacy page.** On launch day, rewrite the "early-access app is free" paragraph in
  `privacy.html` to say how the App Store, Google Play and Paddle each take payment.
- **Deleting an account.** Paddle subscriptions are canceled by `delete-account` (step
  3). App Store / Google Play subscriptions can't be canceled by us. Add a line to the
  in-app delete confirm and to `delete-account.html`: "Deleting your account doesn't
  cancel a subscription bought through the App Store or Google Play — cancel it in your
  store's subscription settings", linking
  `https://apps.apple.com/account/subscriptions` and
  `https://play.google.com/store/account/subscriptions`.

---

## 8. Flip it on (same day)

Only after steps 1–7 are done and verified:
1. Ship `FF_PAYWALL=true` — web by merge to `main`; iOS / Android by store release.
2. `supabase secrets set REQUIRE_SUBSCRIPTION=1` the same day.
3. Decide what pre-launch early-access users get (BRAIN §9 item 4 — their free-week
   clocks are months old, so they'd see the lock at once).
4. Check with a non-Pro account older than 7 days: workouts, speed test and coach open
   the Pro sheet; buy in sandbox → everything unlocks on every device.

---

## Rollback / safety
- `supabase secrets unset REQUIRE_SUBSCRIPTION` opens the coach to everyone again,
  instantly. `FF_PAYWALL` needs a new build (and, for the stores, a review).
- Free app features are unaffected by steps 1–7 — if a function misbehaves, the coach
  simply shows "not live yet" and everything else keeps working.
- All secrets are server-side (Edge Function secrets); the browser only ever holds the
  Supabase anon key and the Paddle client token. Never put `ANTHROPIC_API_KEY`, the
  Paddle webhook secret, `PADDLE_API_KEY`, or the Supabase service-role key in client
  code or `cloud-sync.js`.
- `.env` is git-ignored; only `.env.example` (placeholders) is committed.

## Cost control once live
- The coach's knowledge base is sent as a **cached** system block → ~0.1× on reads.
- The coach runs on `claude-sonnet-5-5` by default; swap with
  `supabase secrets set AI_COACH_MODEL=...` (e.g. `claude-haiku-4-5` for cheaper turns).
- Per-user limits (5/min, 50/day) and a global ceiling (1000 coach turns/day,
  migration `20260930110636`) are in place; track tokens/user vs. revenue.
