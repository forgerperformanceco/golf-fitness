# Yardsmith — Supabase backend

```
supabase/
  schema.sql                      # idempotent mirror of every migration (profiles, billing, leaderboard, push, RLS)
  migrations/                     # the real database history — CI runs these; live is applied by hand
  tests/database/                 # pgTAP: `supabase test db` (RLS, grants, is_subscribed, billing RPC)
  functions/
    _shared/cors.ts               # CORS + JSON helpers
    _shared/knowledge.ts          # the AI coach's cached knowledge base
    ai-coach/index.ts             # Claude-backed coach (signed-in users; Pro gate only when REQUIRE_SUBSCRIPTION=1 — off during early access)
    delete-account/index.ts       # permanent account+data deletion; cancels Paddle billing first once PADDLE_API_KEY is set
    paddle-webhook/index.ts       # writes subscription state (service-role)
    product-health/index.ts       # anonymous feature-use / crash signals (function logs only)
    push-daily/index.ts           # hourly web-push sender (scheduled, x-cron-secret)
```

## How it deploys

- **Edge functions** deploy automatically through **Supabase's GitHub
  integration**: every merge to `main` that changes `supabase/functions/**`
  redeploys them (each keeps `verify_jwt = false` from `config.toml`).
  That includes `paddle-webhook`: it ships on merge like the rest, and does
  nothing until `PADDLE_WEBHOOK_SECRET` is set (no signature can verify, so
  every request is rejected). A hand deploy (`GO-LIVE-CHECKLIST.md` step 3) is
  only needed to get a change live before it merges.
- **Function secrets** are set once in Supabase: Dashboard → Edge Functions →
  Secrets, or `supabase secrets set NAME=value`. Today: `ANTHROPIC_API_KEY`,
  `AI_COACH_MODEL`, `ALLOWED_ORIGIN`, the VAPID pair, `PUSH_CRON_SECRET`. At
  billing launch: `PADDLE_WEBHOOK_SECRET`, `PADDLE_API_KEY`, `PADDLE_ENV`
  (`sandbox` while testing), then `REQUIRE_SUBSCRIPTION=1` on switch-on day.
- **Database changes** ship as files in `supabase/migrations/` (mirrored into the
  idempotent `schema.sql`). CI (`quality.yml`) runs every migration and the pgTAP
  tests against a local Supabase on each PR; applying one to the live project is a
  manual step (Supabase MCP `apply_migration`, `supabase db push`, or the SQL
  editor) — then check `list_migrations`.
- Functions deploy on merge but migrations are applied by hand, so a function
  must keep working against the previous schema until its migration lands.

## Billing and Pro (off during early access)

- `profiles.subscription_status` and the other billing columns are written only by
  billing webhooks through service-role RPCs — never by the browser (column grants
  allow only `data`, `updated_at`, `rev`).
- Each provider subscription is one row in `private.billing_subscriptions`, with its
  own out-of-order guard. The `profiles` columns are a summary of the user's best
  subscription (`private.sync_billing_summary`), so a late event from an old
  subscription can't lock out a newer, paid one.
- **Pro = the provider's status:** `active`, `trialing`, or `past_due` (the provider
  is still retrying the card). Dates never grant or remove Pro. `is_subscribed()`
  (what the app caches as `ff_pro`) and the ai-coach gate use the same rule.
- An event for a deleted account returns `orphaned` and is acknowledged (HTTP 200,
  logged as `paddle_event_orphaned`), so Paddle stops retrying it.
- Only Paddle has a webhook today. App Store / Google Play subscribers are Pro on the
  server only once a store webhook exists — required before `REQUIRE_SUBSCRIPTION=1`
  (`GO-LIVE-CHECKLIST.md` step 5).
- SQL editor checks run with no signed-in user (`auth.uid()` is null): target rows by
  explicit uuid.

## What stays secret

| Key                         | Where it lives            | In the browser? |
|-----------------------------|---------------------------|-----------------|
| Supabase **anon/publishable** | client + functions        | ✅ safe          |
| Supabase **service role**   | functions only            | ❌ never         |
| **Anthropic** API key       | ai-coach function secret  | ❌ never         |
| **Paddle** webhook secret   | paddle-webhook secret     | ❌ never         |
| **Paddle** API key          | delete-account secret     | ❌ never         |
| Paddle **client token**     | client (Paddle.js)        | ✅ safe          |
