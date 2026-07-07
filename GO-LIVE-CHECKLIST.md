# Yardsmith — Go-Live Checklist (backend + Pro)

Copy-paste steps to turn on the paid backend: the **AI coach** and **subscriptions**.
Nothing here touches the free app — it stays live the whole time. Order matters; each
step is verifiable before the next. See `ROADMAP.md` for the why and `supabase/README.md`
for the file map.

> **Prereqs:** the Supabase project already exists (its URL + anon key are wired into
> `cloud-sync.js`). You'll need the Supabase CLI (`npm i -g supabase`), an Anthropic API
> key, and a Paddle account.

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
get the "Yardsmith Pro" gate (HTTP 402) — that's correct. To smoke-test the model
before billing exists, temporarily flip your own row:
```sql
update profiles set subscription_status='active' where id = auth.uid();
```
Ask "How do I raise my Yardsmith Score?" — it should answer using your own numbers,
then set it back to `free`.

---

## 3. Paddle subscriptions (20 min)

Paddle is a **Merchant of Record** — it collects payment and remits sales tax/VAT for
you. Sign up at paddle.com and choose the **"Digital products or SaaS"** category (the
web checkout), not "Mobile apps" (that's for native iOS/Android IAP).

1. **Product + prices:** Paddle → Catalog → create "Yardsmith Pro" with a monthly
   price and an annual price. Copy both **price IDs** (`pri_...`).
2. **Secret + deploy:**
   ```sh
   supabase secrets set PADDLE_WEBHOOK_SECRET=pdl_ntfset_...   # from step 4
   supabase functions deploy paddle-webhook --no-verify-jwt
   ```
3. **Checkout:** open Paddle.js checkout for a signed-in user and pass
   `customData: { user_id: <supabase user id> }` so the webhook can map the
   subscription back to the user (plus their email to prefill).
4. **Webhook:** Paddle → Developer tools → Notifications → add a destination =
   `https://tbwmckmyzoxzhpqlomsp.supabase.co/functions/v1/paddle-webhook`, subscribe to
   `subscription.created`, `subscription.activated`, `subscription.updated`,
   `subscription.canceled`, `subscription.paused`. Copy the **signing secret** into step 2.

> Use Paddle **sandbox** while testing (separate dashboard + keys), then switch to
> production keys and `PADDLE_ENV=production`.

**Verify:** run a sandbox checkout → the webhook flips your `subscription_status` to
`active`/`trialing` → the coach answers without the gate. Cancel → `canceled`.

---

## 4. Client subscribe button (remaining client work)

The coach already shows the Pro gate; the only client piece left is a **"Start free
trial / Subscribe"** button that opens the **Paddle.js** overlay checkout for a
signed-in user (load `https://cdn.paddle.com/paddle/v2/paddle.js`, init with the
`PADDLE_CLIENT_TOKEN`, then `Paddle.Checkout.open({ items:[{priceId}], customData:{ user_id }})`).
Wire it into the gate in `coach.js` (the 402 branch) and the Account tab's Pro card
once the price IDs exist. A free trial is configured on the Paddle **price** itself;
the `is_subscribed` RPC already honors `trialing` + `trial_ends_at`.

---

## Rollback / safety
- Free app is unaffected by all of the above — if a function misbehaves, the coach simply
  shows "not live yet" and everything else keeps working.
- All secrets are server-side (Edge Function secrets); the browser only ever holds the
  Supabase anon key. Never put `ANTHROPIC_API_KEY`, the Paddle webhook secret, or the Supabase
  service-role key in client code or `cloud-sync.js`.
- `.env` is git-ignored; only `.env.example` (placeholders) is committed.

## Cost control once live
- The coach's knowledge base is sent as a **cached** system block → ~0.1× on reads.
- Swap `AI_COACH_MODEL` to `claude-sonnet-4-6` or `claude-haiku-4-5` for cheaper
  high-volume turns if needed (`supabase secrets set AI_COACH_MODEL=...`).
- Add per-user rate limits before a public launch; track tokens/user vs. revenue.
