// ============================================================================
// FairwayFuel — Stripe webhook (Supabase Edge Function, Deno).
//
// Receives Stripe subscription events, verifies the signature, and writes the
// user's subscription state into public.profiles using the SERVICE-ROLE key
// (which bypasses RLS — the browser can never set these columns itself).
//
// We map a Stripe customer back to a Supabase user via the `client_reference_id`
// (set to the Supabase user id when the Checkout Session is created) and/or the
// `stripe_customer_id` we store on first checkout.
//
// Deploy (note: --no-verify-jwt — Stripe calls this, not a logged-in user):
//   supabase functions deploy stripe-webhook --no-verify-jwt
//   supabase secrets set STRIPE_SECRET_KEY=sk_...  STRIPE_WEBHOOK_SECRET=whsec_...
// ============================================================================

import Stripe from "npm:stripe@^17";
import { createClient } from "npm:@supabase/supabase-js@^2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-12-18.acacia" });
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

// Service-role client: bypasses RLS so it can write billing columns.
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

async function setSubscription(match: { id?: string; customer?: string }, fields: Record<string, unknown>) {
  let q = admin.from("profiles").update(fields);
  if (match.id) q = q.eq("id", match.id);
  else if (match.customer) q = q.eq("stripe_customer_id", match.customer);
  else return;
  const { error } = await q;
  if (error) console.error("profiles update failed:", error.message);
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, sig, WEBHOOK_SECRET);
  } catch (e) {
    return new Response(`Signature verification failed: ${e}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        // client_reference_id was set to the Supabase user id at checkout creation.
        const userId = s.client_reference_id ?? undefined;
        const sub = s.subscription
          ? await stripe.subscriptions.retrieve(s.subscription as string)
          : null;
        await setSubscription({ id: userId, customer: s.customer as string }, {
          stripe_customer_id: s.customer as string,
          subscription_status: sub?.status ?? "active",
          plan: sub?.items.data[0]?.price.id ?? null,
          current_period_end: sub ? new Date(sub.current_period_end * 1000).toISOString() : null,
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await setSubscription({ customer: sub.customer as string }, {
          subscription_status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
          plan: sub.items.data[0]?.price.id ?? null,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        });
        break;
      }
      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break;
    }
  } catch (e) {
    console.error("webhook handler error:", e);
    return new Response("handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
