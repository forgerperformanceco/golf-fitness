// ============================================================================
// Yardsmith — Delete Account — Supabase Edge Function (Deno).
//
// Permanently deletes the signed-in user's account and ALL their data. This is
// required by the Apple App Store (any app with account creation must offer
// in-app account deletion) and is good practice everywhere.
//
// Flow:
//   1. Verify the caller's Supabase JWT (must be a logged-in user).
//   2. Billing (only when the PADDLE_API_KEY secret is set): cancel, effective
//      immediately, every Paddle subscription on the account that can still
//      bill. Once the account is gone nothing could stop those renewals. If a
//      cancel fails we delete NOTHING and return 502, so the user can retry or
//      email support. Without the key (billing not live) this step is skipped.
//      App Store / Google Play subscriptions can't be canceled from here — the
//      store owns them, and the user cancels them in the store.
//   3. Using the SERVICE-ROLE key (server-only), delete the auth user.
//      `profiles` and `leaderboard` both FK auth.users(id) ON DELETE CASCADE,
//      so their rows are removed automatically. We also delete them explicitly
//      first as a belt-and-suspenders guard in case a cascade is ever dropped.
//
// SECURITY: the service-role key is read from the Edge Function environment
// (Supabase injects SUPABASE_SERVICE_ROLE_KEY automatically) and never leaves
// the server. The browser only ever holds the publishable anon key + the user's
// own JWT — which is exactly what proves *which* account may be deleted.
//
// Deploy:
//   supabase functions deploy delete-account
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided to
//  every function by default. Before Paddle billing goes live also set
//  PADDLE_API_KEY — server-only — and PADDLE_ENV=sandbox while testing.)
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2.110.2";
import { preflight, json } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY") ?? "";
const PADDLE_API = Deno.env.get("PADDLE_ENV") === "sandbox"
  ? "https://sandbox-api.paddle.com"
  : "https://api.paddle.com";
// Statuses that can still bill (or be resumed into billing).
const BILLABLE = ["active", "trialing", "past_due", "paused"];

type Admin = ReturnType<typeof createClient>;

function paddle(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${PADDLE_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${PADDLE_API_KEY}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
}

// The account's Paddle subscriptions that can still bill: the one the profile
// shows, plus any other live one (billing_subscriptions_to_cancel; until that
// migration is applied the profile alone is used). Null = couldn't read.
async function paddleSubscriptionsToCancel(admin: Admin, userId: string): Promise<string[] | null> {
  const { data: prof, error } = await admin.from("profiles")
    .select("billing_provider, billing_subscription_id, subscription_status")
    .eq("id", userId).maybeSingle();
  if (error) return null;
  const ids = new Set<string>();
  if (prof?.billing_provider === "paddle" && prof.billing_subscription_id &&
      BILLABLE.includes(prof.subscription_status)) ids.add(prof.billing_subscription_id);
  const { data: rows, error: rpcErr } = await admin.rpc("billing_subscriptions_to_cancel", { p_user_id: userId });
  if (!rpcErr && Array.isArray(rows)) {
    for (const r of rows) if (r?.provider === "paddle" && r.subscription_id) ids.add(r.subscription_id);
  }
  return [...ids];
}

// True once the subscription can no longer renew.
async function cancelPaddleSubscription(id: string): Promise<boolean> {
  const path = `/subscriptions/${encodeURIComponent(id)}`;
  try {
    const res = await paddle(`${path}/cancel`, {
      method: "POST",
      body: JSON.stringify({ effective_from: "immediately" }),
    });
    if (res.ok) return true;
    // Refused — maybe it's already canceled, or set to cancel at period end.
    const check = await paddle(path);
    if (!check.ok) return false;
    const sub = (await check.json())?.data;
    return sub?.status === "canceled" || sub?.scheduled_change?.action === "cancel";
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight(req);
  if (req.method !== "POST") return json(req, { error: "POST only" }, 405);

  // ── 1. Authenticate the caller via their Supabase JWT ────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(req, { error: "Not signed in" }, 401);

  const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await asUser.auth.getUser();
  if (authErr || !user) return json(req, { error: "Invalid session" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── 2. Stop Paddle billing first (only once billing is configured) ───────
  if (PADDLE_API_KEY) {
    const subs = await paddleSubscriptionsToCancel(admin, user.id);
    if (subs === null) {
      console.error(JSON.stringify({ kind: "delete_account_billing_read_failed" }));
      return json(req, { error: "billing_cancel_failed" }, 502);
    }
    for (const id of subs) {
      if (!(await cancelPaddleSubscription(id))) {
        console.error(JSON.stringify({ kind: "delete_account_billing_cancel_failed", subscription_id: id }));
        return json(req, { error: "billing_cancel_failed" }, 502);
      }
    }
  }

  // ── 3. Delete everything with the service-role client ────────────────────
  // Explicit data purge first (cascade would also handle these).
  await admin.from("leaderboard").delete().eq("user_id", user.id);
  await admin.from("profiles").delete().eq("id", user.id);

  // Delete the auth identity itself — this is the part the browser cannot do.
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error(JSON.stringify({ kind: "delete_account_failed", message: delErr.message }));
    return json(req, { error: "delete_failed" }, 500);
  }

  return json(req, { ok: true });
});
