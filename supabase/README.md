# FairwayFuel — Supabase backend (scaffolding)

This folder is the **prestaging** backend for FairwayFuel Pro (subscriptions + AI
coach). It is wired but **not yet deployed** — see `../ROADMAP.md` for the phase plan.
Nothing here changes the free static app; it's all additive.

```
supabase/
  schema.sql                      # profiles + subscription columns + RLS + triggers
  functions/
    _shared/cors.ts               # CORS + JSON helpers
    _shared/knowledge.ts          # the AI coach's cached knowledge base
    ai-coach/index.ts             # Claude-backed coach (JWT + subscription gated)
    paddle-webhook/index.ts       # writes subscription state (service-role)
```

## Bring it up (when ready to charge)

1. **Database** — apply the schema:
   ```sh
   supabase db push          # or paste schema.sql into the SQL Editor
   ```
2. **Secrets** (server-side only — never in the browser):
   ```sh
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase secrets set PADDLE_WEBHOOK_SECRET=pdl_ntfset_...
   # SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
   # automatically into deployed functions.
   ```
3. **Deploy functions:**
   ```sh
   supabase functions deploy ai-coach
   supabase functions deploy paddle-webhook --no-verify-jwt   # Paddle calls this, not a user
   ```
4. **Paddle** — create a product + monthly/annual prices, point a webhook destination at
   the `paddle-webhook` function URL, and pass `customData.user_id = <supabase user id>`
   when you open the Paddle.js checkout.
5. **Client** — add the chat UI + a "Start free trial / Subscribe" button to
   `index.html`; gate the coach on the user's `subscription_status`.

## What stays secret

| Key                         | Where it lives            | In the browser? |
|-----------------------------|---------------------------|-----------------|
| Supabase **anon/publishable** | client + functions        | ✅ safe          |
| Supabase **service role**   | functions only            | ❌ never         |
| **Anthropic** API key       | ai-coach function secret  | ❌ never         |
| **Paddle** webhook secret   | paddle-webhook secret     | ❌ never         |
| Paddle **client token**     | client (Paddle.js)        | ✅ safe          |
