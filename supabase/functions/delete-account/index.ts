// ============================================================================
// FairwayFuel — Delete Account — Supabase Edge Function (Deno).
//
// Permanently deletes the signed-in user's account and ALL their data. This is
// required by the Apple App Store (any app with account creation must offer
// in-app account deletion) and is good practice everywhere.
//
// Flow:
//   1. Verify the caller's Supabase JWT (must be a logged-in user).
//   2. Using the SERVICE-ROLE key (server-only), delete the auth user.
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
// (No extra secrets needed — SUPABASE_URL / SUPABASE_ANON_KEY /
//  SUPABASE_SERVICE_ROLE_KEY are provided to every function by default.)
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@^2";
import { corsHeaders, preflight, json } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // ── 1. Authenticate the caller via their Supabase JWT ────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Not signed in" }, 401);

  const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await asUser.auth.getUser();
  if (authErr || !user) return json({ error: "Invalid session" }, 401);

  // ── 2. Delete everything with the service-role client ────────────────────
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Explicit data purge first (cascade would also handle these).
  await admin.from("leaderboard").delete().eq("user_id", user.id);
  await admin.from("profiles").delete().eq("id", user.id);

  // Delete the auth identity itself — this is the part the browser cannot do.
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return json({ error: "delete_failed", detail: delErr.message }, 500);

  return json({ ok: true });
});
