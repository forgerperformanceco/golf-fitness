# Web push setup — reminders that land with the app closed

The client side already ships: the Account tab's "Turn on reminders" upgrades
to a real push subscription automatically once this backend exists, and the
service worker's push handler has been in place since the notifications pass.
This guide is the one-time server setup (~10 minutes, all in the Supabase
dashboard for project `tbwmckmyzoxzhpqlomsp`).

How it works, in one paragraph: when a signed-in user turns reminders on, the
app stores their push subscription in a `push_subs` row along with their
timezone, training-slot hour, and a **7-day schedule of day-aware messages**
(same copy as the in-app reminders), refreshed on every app open. An Edge
Function (`push-daily`) runs hourly, and for each row where it's currently the
user's training hour it sends today's scheduled message — or, if the schedule
has gone stale because the app hasn't been opened in over a week, a
re-engagement nudge. One send per local day, expired subscriptions are pruned.

## 1 · Create the table

SQL Editor → run `supabase/schema.sql` (it's idempotent — re-running the whole
file is safe and this is the intended path). The new `push_subs` table and its
own-row RLS policies are at the bottom.

## 2 · Deploy the Edge Function

Same as ai-coach / delete-account:

```
supabase functions deploy push-daily
```

(or paste `supabase/functions/push-daily/index.ts` into Dashboard → Edge
Functions → New function named `push-daily`). `supabase/config.toml` already
sets `verify_jwt = false` for it — like paddle-webhook, it checks its own
`x-cron-secret` header instead.

## 3 · Set the function secrets

Dashboard → Edge Functions → push-daily → Secrets (or `supabase secrets set`):

| Secret | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | the `FF_PUSH_PUB` value in `cloud-sync.js` (they must match) |
| `VAPID_PRIVATE_KEY` | the private half — **never commit it**. It was handed over in the build session that shipped this; if you don't have it, run `node scripts/gen-vapid.mjs` to mint a fresh pair (then update `FF_PUSH_PUB` in cloud-sync.js, bump its `?v=` pin in `src/index.template.html` + `src/sw.template.js`, rebuild — and every device must re-toggle reminders). |
| `PUSH_CRON_SECRET` | any long random string, e.g. from `openssl rand -hex 24` — the cron job sends it back in step 4 |

## 4 · Schedule the hourly send

Dashboard → Database → Extensions: enable **pg_cron** and **pg_net**.
Then SQL Editor (fill in the two placeholders — the anon key is the same
public one at the top of `cloud-sync.js`):

```sql
select cron.schedule('ff-push-hourly', '5 * * * *', $cron$
  select net.http_post(
    url     := 'https://tbwmckmyzoxzhpqlomsp.supabase.co/functions/v1/push-daily',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <ANON_KEY>',
      'x-cron-secret', '<PUSH_CRON_SECRET>'),
    body := '{}'::jsonb);
$cron$);
```

## 5 · Verify

1. On your phone (installed PWA or browser), sign in, Account → Turn on
   reminders. In Table Editor, `push_subs` should now have a row whose `week`
   holds 7 dated messages.
2. Force a send without waiting for your training hour: temporarily set that
   row's `hour` to the current hour in your timezone and `last_sent` to null,
   then trigger the function once:
   `curl -X POST https://tbwmckmyzoxzhpqlomsp.supabase.co/functions/v1/push-daily -H "Authorization: Bearer <ANON_KEY>" -H "x-cron-secret: <PUSH_CRON_SECRET>"`
   — the response reports `{sent, gone, skipped, failed}` and the notification
   should hit the device with the app closed.
3. Put `hour` back (or just reopen the app — it rewrites the row on open).

## Notes

- **iOS**: web push requires the app to be **installed to the Home Screen**
  (iOS 16.4+) — Safari-tab visitors fall back to the open-tab reminders.
- Turning reminders **off** deletes the row and unsubscribes the browser.
  Deleting the account cascades `push_subs` rows away.
- Cost: one function invocation per hour, a handful of rows — comfortably
  inside the Supabase free tier.
