# FairwayFuel — Supabase backend

```
supabase/
  schema.sql                      # profiles + leaderboard + RLS + triggers
  functions/
    _shared/cors.ts               # CORS + JSON helpers
    _shared/knowledge.ts          # the AI coach's cached knowledge base
    ai-coach/index.ts             # Claude-backed coach (signed-in users; no paywall)
    delete-account/index.ts       # permanent account+data deletion (service-role)
    paddle-webhook/index.ts       # writes subscription state (service-role)
```

## Deploys itself from GitHub (hands-off)

`.github/workflows/deploy-functions.yml` runs on every push that touches
`supabase/**` (and can be run manually from the Actions tab). It:

1. **Applies `schema.sql`** through the Supabase **Management API** using the
   `SUPABASE_ACCESS_TOKEN` secret — no database password needed. The schema is
   idempotent, so it's safe to re-apply on every push.
2. **Deploys the `delete-account` function** — always (it needs no extra secret;
   Supabase injects the service-role key into every function).
3. **Deploys the `ai-coach` function** and sets its `ANTHROPIC_API_KEY` secret —
   *only if* `ANTHROPIC_API_KEY` is configured as a repo secret. If it isn't, the
   schema still applies (so the leaderboard works) and the coach step is skipped
   with a warning.

### Repo secrets it uses
| Secret                  | Required | Purpose                                        |
|-------------------------|----------|------------------------------------------------|
| `SUPABASE_ACCESS_TOKEN` | yes      | Apply SQL + deploy functions (your PAT)        |
| `ANTHROPIC_API_KEY`     | optional | Deploy + power the AI coach (server-side only) |

So to bring up the leaderboard you push (already done) — nothing manual. To turn
on the coach, add `ANTHROPIC_API_KEY` in **Settings → Secrets and variables →
Actions** and re-run the workflow.

> `paddle-webhook` is **not** auto-deployed (billing is off during early access).
> When you turn billing back on: `supabase functions deploy paddle-webhook` and
> set `PADDLE_WEBHOOK_SECRET`.

## What stays secret

| Key                         | Where it lives            | In the browser? |
|-----------------------------|---------------------------|-----------------|
| Supabase **anon/publishable** | client + functions        | ✅ safe          |
| Supabase **service role**   | functions only            | ❌ never         |
| **Anthropic** API key       | ai-coach function secret  | ❌ never         |
| **Paddle** webhook secret   | paddle-webhook secret     | ❌ never         |
| Paddle **client token**     | client (Paddle.js)        | ✅ safe          |
