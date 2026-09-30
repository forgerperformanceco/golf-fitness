# Yardsmith — Supabase backend

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

## How it deploys

- **Edge functions** deploy automatically through **Supabase's GitHub
  integration**: every merge to `main` that changes `supabase/functions/**`
  redeploys them (each keeps `verify_jwt = false` from `config.toml`).
- **Function secrets** (`ANTHROPIC_API_KEY`, `AI_COACH_MODEL`, the VAPID pair,
  `PUSH_CRON_SECRET`, later `PADDLE_WEBHOOK_SECRET`) are set once in Supabase:
  Dashboard → Edge Functions → Secrets, or `supabase secrets set NAME=value`.
- **Database changes** ship as files in `supabase/migrations/` (mirrored into the
  idempotent `schema.sql`). CI (`quality.yml`) runs every migration against a
  local Supabase on each PR; applying one to the live project is a manual step
  (Supabase MCP `apply_migration` or the SQL editor) — then check
  `list_migrations`.

## What stays secret

| Key                         | Where it lives            | In the browser? |
|-----------------------------|---------------------------|-----------------|
| Supabase **anon/publishable** | client + functions        | ✅ safe          |
| Supabase **service role**   | functions only            | ❌ never         |
| **Anthropic** API key       | ai-coach function secret  | ❌ never         |
| **Paddle** webhook secret   | paddle-webhook secret     | ❌ never         |
| Paddle **client token**     | client (Paddle.js)        | ✅ safe          |
