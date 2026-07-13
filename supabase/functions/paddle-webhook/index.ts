// ============================================================================
// Yardsmith — Paddle Billing webhook (Supabase Edge Function, Deno).
//
// Receives Paddle subscription events, verifies the signature, and writes the
// user's subscription state into public.profiles using the SERVICE-ROLE key
// (which bypasses RLS — the browser can never set these columns itself).
//
// We map a Paddle subscription back to a Supabase user via `custom_data.user_id`,
// which you set when opening the Paddle checkout (Paddle.js: `customData`).
//
// Signature verification follows Paddle Billing's scheme:
//   header  Paddle-Signature: ts=<unix>;h1=<hmac-sha256 hex>
//   signed payload = `${ts}:${rawBody}`, key = your webhook secret.
//
// Deploy (Paddle calls this, not a logged-in user → no JWT):
//   supabase functions deploy paddle-webhook --no-verify-jwt
//   supabase secrets set PADDLE_WEBHOOK_SECRET=pdl_ntfset_...
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2.110.2";

const WEBHOOK_SECRET = Deno.env.get("PADDLE_WEBHOOK_SECRET")!;
const SIGNATURE_TOLERANCE_SECONDS = 300;
const MAX_BODY_BYTES = 262_144;

// Service-role client: bypasses RLS so it can write billing columns.
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// Constant-time-ish hex compare.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verify(rawBody: string, sigHeader: string | null): Promise<boolean> {
  if (!sigHeader) return false;
  const parts: Record<string, string> = {};
  for (const kv of sigHeader.split(";")) {
    const i = kv.indexOf("=");
    if (i > 0) parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
  const ts = parts["ts"], h1 = parts["h1"];
  if (!ts || !h1) return false;
  const tsSeconds = Number(ts);
  if (!Number.isFinite(tsSeconds) || Math.abs(Math.floor(Date.now() / 1000) - tsSeconds) > SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${rawBody}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return safeEqual(hex, h1.toLowerCase());
}

// Map a Paddle subscription event onto our profiles columns.
async function applySubscription(event: any, canceled: boolean) {
  const data = event?.data;
  const userId = data?.custom_data?.user_id as string | undefined;
  const eventId = event?.event_id;
  const occurredAt = event?.occurred_at;
  if (!eventId || !occurredAt || (!userId && !data?.customer_id)) {
    throw new Error("paddle event is missing identity or ordering fields");
  }
  const { data: result, error } = await admin.rpc("apply_paddle_subscription", {
    p_event_id: eventId,
    p_occurred_at: occurredAt,
    p_user_id: userId ?? null,
    p_customer_id: data?.customer_id ?? null,
    p_subscription_id: data?.id ?? null,
    p_status: canceled ? "canceled" : (data?.status ?? "active"),
    p_plan: data?.items?.[0]?.price?.id ?? null,
    p_period_end: data?.current_billing_period?.ends_at ?? null,
    p_trial_end: data?.items?.[0]?.trial_dates?.ends_at ?? null,
  });
  if (error) throw new Error(`subscription apply failed: ${error.message}`);
  return result;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const declaredLength = Number(req.headers.get("content-length") || "0");
  if (declaredLength > MAX_BODY_BYTES) return new Response("payload too large", { status: 413 });
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return new Response("payload too large", { status: 413 });
  }
  if (!(await verify(raw, req.headers.get("Paddle-Signature")))) {
    return new Response("invalid signature", { status: 400 });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }

  try {
    switch (event.event_type) {
      case "subscription.created":
      case "subscription.activated":
      case "subscription.updated":
      case "subscription.resumed":
        await applySubscription(event, false);
        break;
      case "subscription.canceled":
      case "subscription.paused":
        await applySubscription(event, true);
        break;
      default:
        // Acknowledge unhandled events so Paddle stops retrying.
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
