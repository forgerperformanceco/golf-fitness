# Web push setup — reminders that land with the app closed

The client side already ships: the Account tab's "Smart reminders" card upgrades
to a real push subscription automatically once this backend exists, and the
service worker deep-links every notification to its exact job.
Production provisioning is automated through GitHub Actions for Supabase project
`tbwmckmyzoxzhpqlomsp`; no database password or dashboard cron setup is needed.

How it works, in one paragraph: when a signed-in user turns reminders on, the
app stores their push subscription in a `push_subs` row along with their
timezone, respectful send hour, and a **7-day schedule of state-aware jobs**
(training, catch-up, speed test, week-close, optional recovery, or skip),
refreshed on every app open. An Edge
Function (`push-daily`) is called hourly, and for each row where it's currently the
user's chosen hour it sends today's scheduled message — or, if the schedule has
gone stale because the app hasn't been opened in over a week, a re-engagement
nudge. Finished jobs and Essential-mode rest days are suppressed. One send per
local day, one-hour TTL, expired subscriptions pruned.

## 1 · Create the table

SQL Editor → run `supabase/schema.sql` (it's idempotent — re-running the whole
file is safe and this is the intended path). The new `push_subs` table and its
own-row RLS policies are at the bottom.

## 2 · Configure the repository secrets

Repository Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | the `FF_PUSH_PUB` value in `cloud-sync.js` (they must match) |
| `VAPID_PRIVATE_KEY` | the private half — **never commit it**. It was handed over in the build session that shipped this; if you don't have it, run `node scripts/gen-vapid.mjs` to mint a fresh pair (then update `FF_PUSH_PUB` in cloud-sync.js, bump its `?v=` pin in `src/index.template.html` + `src/sw.template.js`, rebuild — and every device must re-toggle reminders). |
| `PUSH_CRON_SECRET` | any long random string, e.g. from `openssl rand -hex 24` — the hourly action sends it back |

## 3 · Deploy and schedule

`.github/workflows/deploy-functions.yml` requires all three secrets, copies them
to Supabase, and deploys the function whenever backend code changes.
`.github/workflows/push-reminders.yml` calls the protected sender at minute five
of every hour and can also be run manually for verification.

## 4 · Verify

1. On your phone (installed PWA or browser), sign in, Account → Smart reminders
   → Turn on reminders. In Table Editor, `push_subs` should now have a row whose
   `week` holds 7 dated jobs with `kind`, `url`, and optional `skip`.
2. Force a send without waiting for the hourly schedule: temporarily set that
   row's `hour` to the current hour in your timezone and `last_sent` to null,
   then run **Send Smart Reminders** from GitHub Actions. Its response reports
   `{sent, gone, skipped, failed}` and the notification should hit the device
   with the app closed.
3. Put `hour` back (or just reopen the app — it rewrites the row on open).

## Notes

- **iOS**: web push requires the app to be **installed to the Home Screen**
  (iOS 16.4+) — Safari-tab visitors fall back to the open-tab reminders.
- Turning reminders **off** deletes the row and unsubscribes the browser.
  Deleting the account cascades `push_subs` rows away.
- Cost: one function invocation per hour, a handful of rows — comfortably
  inside the Supabase free tier.
