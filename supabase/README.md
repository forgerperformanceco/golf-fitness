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
    stripe-webhook/index.ts       # writes subscription state (service-role)
```

## Bring it up (when ready to charge)

1. **Database** — apply the schema:
   ```sh
   supabase db push          # or paste schema.sql into the SQL Editor
   ```
2. **Secrets** (server-side only — never in the browser):
   ```sh
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase secrets set STRIPE_SECRET_KEY=sk_...  STRIPE_WEBHOOK_SECRET=whsec_...
   # SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
   # automatically into deployed functions.
   ```
3. **Deploy functions:**
   ```sh
   supabase functions deploy ai-coach
   supabase functions deploy stripe-webhook --no-verify-jwt   # Stripe calls this, not a user
   ```
4. **Stripe** — create a product + monthly/annual prices, point a webhook at the
   `stripe-webhook` function URL, set `client_reference_id` to the Supabase user id
   when you create the Checkout Session.
5. **Client** — add the chat UI + a "Start free trial / Subscribe" button to
   `index.html`; gate the coach on the user's `subscription_status`.

## What stays secret

| Key                         | Where it lives            | In the browser? |
|-----------------------------|---------------------------|-----------------|
| Supabase **anon/publishable** | client + functions        | ✅ safe          |
| Supabase **service role**   | functions only            | ❌ never         |
| **Anthropic** API key       | ai-coach function secret  | ❌ never         |
| **Stripe** secret + webhook | stripe-webhook secret     | ❌ never         |
