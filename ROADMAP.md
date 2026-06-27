# FairwayFuel — Product & Revenue Roadmap

How FairwayFuel goes from a free static PWA to a subscription app with an AI coach.
This file is the plan of record. The scaffolding it describes lives in `/supabase`
and `.env.example`; nothing here is wired to a live billing or AI backend yet —
each phase is gated behind a deliberate "go" so we never ship a half-built paywall.

> **Guiding principle:** the free app must keep working at every step. Cloud login,
> subscriptions, and AI are *additive layers*. A logged-out user on an old phone still
> gets the full calculator and 20-week plan, offline. We only ever gate the *new*
> value (AI coach, cross-device sync extras), never the core tool.

> **Market positioning** lives in [`COMPETITIVE-LANDSCAPE.md`](./COMPETITIVE-LANDSCAPE.md):
> how we differ from DRVN / GolfForever / JoeyD / swing-analysis apps, what we can borrow
> without infringing, and the "FairwayFuel Score" that closes our one measurability gap.

---

## Where we are today (Phase 0 — shipped)

- **Static PWA** on GitHub Pages: single `index.html` + `sw.js` (offline) + `manifest`.
- **Custom domain** `fairwayfuel.app` (Porkbun DNS → GitHub Pages, `CNAME`).
- **Optional cloud login** (`cloud-sync.js`): Supabase magic-link auth + a `profiles`
  row that syncs the localStorage blob (`fairwayfuel`, `ff_week`, `ff_log`, `ff_body`)
  across devices. Free, no paywall.
- **Knowledge base**: `NUTRITION-AND-TRAINING-REFERENCE.md` — the evidence behind every
  number. This doubles as the AI coach's source of truth (see Phase 2).

**Data model the cloud already syncs** (one JSON blob per user, keyed by `auth.uid`):

| Key            | Holds                                                      |
|----------------|-----------------------------------------------------------|
| `fairwayfuel`  | profile + goal: `{sex, goal, workout, meals, age, weight, heightFt, heightIn, activity, freq, equip}` |
| `ff_week`      | which training week the user is on                        |
| `ff_log`       | per-session set/rep/weight log + 7-iron clubhead speed    |
| `ff_body`      | bodyweight log                                            |

This is the substrate the AI coach reads to be personal. No new data capture is needed
to start coaching — the app already records goal, macros, training log, and speed trend.

---

## Phase 1 — Accounts & the billing spine (no AI yet)

**Goal:** a real account system with a subscription state we can gate features on,
without changing the free experience.

1. **`profiles` table hardening** (`supabase/schema.sql`):
   - Keep the existing `id / data jsonb / updated_at` sync row.
   - Add subscription columns: `stripe_customer_id`, `subscription_status`,
     `plan`, `current_period_end`, `trial_ends_at`.
   - **Row-level security**: every user can read/write only their own row
     (`auth.uid() = id`). The subscription columns are written **only** by the
     Stripe webhook using the service-role key — the browser can read its own
     status but can never set itself to "active".
2. **Stripe** (`supabase/functions/stripe-webhook`):
   - One product, a monthly price (and an annual price at a discount).
   - Checkout opened from the app; on `checkout.session.completed` /
     `customer.subscription.updated|deleted` the webhook updates the user's
     `subscription_status`. Signature-verified, service-role write.
3. **Entitlement helper** in the client: read `subscription_status` from the user's
   own profile row to decide whether to show AI features. A 7-day free trial via
   `trial_ends_at` so people can try the coach before paying.

**Definition of done:** a user can subscribe, the webhook flips them to `active`,
and the app can read that state. Still no AI — we're proving the money path first.

---

## Phase 2 — The AI coach (the reason to subscribe)

**Goal:** a dynamic coach that answers "what should I eat / how should I train / am I
on track?" grounded in *this user's own numbers* and our evidence base — not generic
chatbot output.

- **Server-side only** (`supabase/functions/ai-coach`): a Supabase Edge Function
  (Deno) calls the Claude API. **The Anthropic API key never touches the browser** —
  it lives in the function's secrets. The browser calls our function with the user's
  Supabase JWT; the function verifies the JWT, checks the subscription is active,
  then calls Claude.
- **Grounding (RAG-lite, today):** the function's system prompt is the distilled
  `NUTRITION-AND-TRAINING-REFERENCE.md` knowledge base, sent with
  **prompt caching** (`cache_control: ephemeral`) so the big knowledge block is
  written to cache once and read at ~0.1× cost on every subsequent message —
  the single biggest cost lever at scale.
- **Personalization:** the user's current `fairwayfuel` profile + macro targets +
  recent `ff_log`/`ff_body`/clubhead-speed trend are passed as a compact context
  block in the user turn. The coach can then say "you're 15g under your carb target
  and your 7-iron speed stalled two weeks — here's the fix," not platitudes.
- **Model:** default `claude-opus-4-8` for quality; `claude-sonnet-4-6` /
  `claude-haiku-4-5` are drop-in cheaper options for high-volume/low-stakes turns
  (noted in the function). Adaptive thinking on; streaming for long answers.

**Use cases that justify the subscription:**
- "Build me today's meals from my macros and what's in my fridge."
- "I only have dumbbells today — adapt the session."
- "Read my log: am I progressing, and what do I change next week?"
- Dynamic meal swaps (the user's flagged next want: ask for different food choices).

**Definition of done:** a subscribed user chats with a coach that cites their own
numbers and our evidence base, with the API key fully server-side and cost controlled
by prompt caching + per-user rate limits.

---

## Phase 3 — Deeper repositories & a native shell

**Goal:** the "deep, deep repositories" — structured, queryable data the AI gets
smarter from, and a real app-store presence.

- **Structured tables** beyond the single sync blob: normalized `workout_logs`,
  `body_metrics`, `meals_logged`, `speed_tests` so the coach (and analytics) can
  query trends server-side instead of parsing one JSON blob. Migrate the blob into
  these gradually; keep the blob as the offline cache.
- **Food/exercise reference DB:** a real foods table (with cooked/raw weights and
  macros) and an exercises table (cues, video, substitutions) so meal/exercise
  suggestions are picked from data, not hard-coded arrays — and become dynamic to
  user requests.
- **Vector search** over the knowledge base + the user's own history once the
  reference content grows past what fits in a cached prompt.
- **Native shell:** wrap the PWA (Capacitor) for the App Store / Play Store, or go
  React Native if native features (HealthKit, push) earn their keep. Push
  notifications for "log today's session" and "speed-test day."

---

## Monetization

- **Free forever:** calculator, 20-week plan, offline PWA, single-device save.
- **FairwayFuel Pro (subscription):** the AI coach, dynamic meal/training adaptation,
  cross-device sync history, progress analytics. Monthly with a discounted annual;
  7-day free trial.
- **Cost control:** prompt caching on the knowledge base (largest lever), cheaper
  model tiers for low-stakes turns, per-user rate limits, and streaming to avoid
  timeouts. Track tokens per user against subscription revenue to keep margin healthy.

---

## Security & secrets (non-negotiable)

- **Anthropic API key:** server-side only (Edge Function secret). Never shipped to the
  browser, never committed. `.env.example` holds placeholders only.
- **Stripe secret key & webhook secret:** server-side only.
- **Supabase service-role key:** server-side only (webhook writes subscription state).
  The browser uses **only** the publishable/anon key, which is safe to ship.
- **RLS everywhere:** users touch only their own row; subscription columns are
  webhook-written, never client-writable.
- `.env` is git-ignored; only `.env.example` (placeholders) is committed.

---

## Build order (what to do, in order)

1. **Phase 1 spine** — apply `schema.sql`, stand up the Stripe webhook, add the
   entitlement read in the client. *(Scaffolded now; deploy when ready to charge.)*
2. **Phase 2 coach** — deploy `ai-coach` with the cached knowledge base, gate it on
   subscription, ship a minimal chat UI in the app. *(Function scaffolded now.)*
3. **Phase 3 depth** — normalize the data, add the food/exercise DBs, native shell.

Each phase is independently shippable and leaves the free app fully working.
