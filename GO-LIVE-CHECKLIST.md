# FairwayFuel — Go-Live Checklist (backend + Pro)

Copy-paste steps to turn on the paid backend: the **AI coach** and **subscriptions**.
Nothing here touches the free app — it stays live the whole time. Order matters; each
step is verifiable before the next. See `ROADMAP.md` for the why and `supabase/README.md`
for the file map.

> **Prereqs:** the Supabase project already exists (its URL + anon key are wired into
> `cloud-sync.js`). You'll need the Supabase CLI (`npm i -g supabase`), an Anthropic API
> key, and a Stripe account.

---

## 1. Database (5 min)

```sh
supabase link --project-ref tbwmckmyzoxzhpqlomsp   # this project
supabase db push                                   # applies supabase/schema.sql
```
Or paste `supabase/schema.sql` into Supabase → SQL Editor → Run.

**Verify:** Table editor shows `profiles` with the subscription columns
(`subscription_status` defaults to `free`), and a new signup auto-creates a row.

---

## 2. AI coach function (10 min)

```sh
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...      # server-side only
supabase secrets set ALLOWED_ORIGIN=https://fairwayfuel.app
supabase functions deploy ai-coach
```

**Verify:** open the live site, sign in, tap **💬 Ask Coach**. While unsubscribed you'll
get the "FairwayFuel Pro" gate (HTTP 402) — that's correct. To smoke-test the model
before billing exists, temporarily flip your own row:
```sql
update profiles set subscription_status='active' where id = auth.uid();
```
Ask "How do I raise my FairwayFuel Score?" — it should answer using your own numbers,
then set it back to `free`.

---

## 3. Stripe subscriptions (20 min)

1. **Product + prices:** Stripe → Products → create "FairwayFuel Pro" with a monthly
   price and an annual price. Copy both price IDs.
2. **Secrets:**
   ```sh
   supabase secrets set STRIPE_SECRET_KEY=sk_live_...      # or sk_test_ while testing
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...    # from step 4
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
3. **Checkout:** create the Checkout Session with `mode: subscription`,
   `client_reference_id = <supabase user id>` (so the webhook can map the customer back),
   and `success_url` / `cancel_url` pointing at the site.
4. **Webhook:** Stripe → Developers → Webhooks → add endpoint =
   `https://tbwmckmyzoxzhpqlomsp.supabase.co/functions/v1/stripe-webhook`, subscribe to
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Copy the signing secret into step 2.

**Verify:** run a test checkout → the webhook flips your `subscription_status` to
`active` → the coach answers without the gate. Cancel → it returns to `canceled`.

---

## 4. Client subscribe button (remaining client work)

The coach already shows the Pro gate; the only client piece left is a **"Start free
trial / Subscribe"** button that opens the Stripe Checkout URL for a signed-in user.
Wire it into the gate in `coach.js` (the 402 branch) once the prices exist. Optionally
set `trial_ends_at = now() + interval '7 days'` on first checkout for a free trial
(the `is_subscribed` RPC already honors it).

---

## Rollback / safety
- Free app is unaffected by all of the above — if a function misbehaves, the coach simply
  shows "not live yet" and everything else keeps working.
- All secrets are server-side (Edge Function secrets); the browser only ever holds the
  Supabase anon key. Never put `ANTHROPIC_API_KEY`, the Stripe secret, or the Supabase
  service-role key in client code or `cloud-sync.js`.
- `.env` is git-ignored; only `.env.example` (placeholders) is committed.

## Cost control once live
- The coach's knowledge base is sent as a **cached** system block → ~0.1× on reads.
- Swap `AI_COACH_MODEL` to `claude-sonnet-4-6` or `claude-haiku-4-5` for cheaper
  high-volume turns if needed (`supabase secrets set AI_COACH_MODEL=...`).
- Add per-user rate limits before a public launch; track tokens/user vs. revenue.
