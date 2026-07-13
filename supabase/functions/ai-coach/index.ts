// ============================================================================
// Yardsmith AI Coach — Supabase Edge Function (Deno).
//
// The browser POSTs the user's question + a compact snapshot of their own app
// data (macro targets, recent log, clubhead-speed trend). This function:
//   1. Verifies the caller's Supabase JWT (must be a logged-in user).
//   2. (No paywall during early access — every signed-in golfer gets the coach.)
//   3. Calls Claude with the cached knowledge base as the system prompt and the
//      user's own numbers as context, then streams the answer back as SSE.
//
// SECURITY: the Anthropic API key is read from an Edge Function secret and never
// leaves the server. The browser only ever holds the Supabase publishable key.
//
// Deploy:
//   supabase functions deploy ai-coach
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// ============================================================================

import Anthropic from "npm:@anthropic-ai/sdk@0.111.0";
import { createClient } from "npm:@supabase/supabase-js@2.110.2";
import { corsFor, preflight, json } from "../_shared/cors.ts";
import { COACH_KNOWLEDGE } from "../_shared/knowledge.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
// Default to the most capable model. For high-volume / low-stakes turns,
// claude-sonnet-4-6 or claude-haiku-4-5 are cheaper drop-in swaps.
const MODEL = Deno.env.get("AI_COACH_MODEL") ?? "claude-opus-4-8";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_BODY_BYTES = 32_768;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_HISTORY_CHARS = 4_000;

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

interface CoachRequest {
  message: string;                 // the user's question
  history?: { role: "user" | "assistant"; content: string }[];
  profile?: Record<string, unknown>;   // their `fairwayfuel` blob
  targets?: Record<string, unknown>;   // computed macros: { target, proteinG, carbG, fatG, mealN, goal }
  score?: unknown;                     // Yardsmith Score + pillar breakdown
  recentLog?: unknown;                 // trimmed ff_log / speed trend
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight(req);
  if (req.method !== "POST") return json(req, { error: "POST only" }, 405);

  // ── 1. Authenticate the caller via their Supabase JWT ────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(req, { error: "Not signed in" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json(req, { error: "Invalid session" }, 401);

  // Atomic, server-side quota. The service role is used only for this restricted
  // RPC; its key never leaves the function.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: quotaRows, error: quotaErr } = await admin.rpc("consume_ai_coach_quota", {
    p_user_id: user.id,
  });
  if (quotaErr) return json(req, { error: "quota_unavailable" }, 503);
  const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
  if (!quota?.allowed) {
    return new Response(JSON.stringify({
      error: "rate_limited",
      message: quota?.daily_remaining === 0
        ? "Daily coach limit reached. Try again tomorrow."
        : "Too many coach requests. Take a breath and try again shortly.",
    }), {
      status: 429,
      headers: {
        ...corsFor(req),
        "Content-Type": "application/json",
        "Retry-After": String(quota?.retry_after_seconds || 60),
      },
    });
  }

  // ── 2. Access: open to all signed-in users (no paywall during early access) ─
  // The cost gate is intentionally removed for now — any logged-in golfer gets
  // the full coach. To re-introduce paid tiers later, gate on is_subscribed here.

  // ── 3. Build the prompt ──────────────────────────────────────────────────
  const declaredLength = Number(req.headers.get("content-length") || "0");
  if (declaredLength > MAX_BODY_BYTES) return json(req, { error: "Request too large" }, 413);
  let raw = "";
  try { raw = await req.text(); } catch { return json(req, { error: "Bad request" }, 400); }
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return json(req, { error: "Request too large" }, 413);
  }
  let body: CoachRequest;
  try { body = JSON.parse(raw); } catch { return json(req, { error: "Bad JSON" }, 400); }
  if (!body || typeof body !== "object" || typeof body.message !== "string") {
    return json(req, { error: "Invalid request" }, 400);
  }
  body.message = body.message.trim();
  if (!body.message) return json(req, { error: "Empty message" }, 400);
  if (body.message.length > MAX_MESSAGE_CHARS) return json(req, { error: "Message too long" }, 400);
  const cleanHistory = Array.isArray(body.history) ? body.history.slice(-8).filter((m) =>
    m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
  ).map((m) => ({ role: m.role, content: m.content.slice(0, MAX_HISTORY_CHARS) })) : [];

  // The big knowledge base is a CACHED system block — written to Anthropic's
  // prompt cache once, then read at ~0.1x cost on every later message.
  const system: Anthropic.TextBlockParam[] = [{
    type: "text",
    text: COACH_KNOWLEDGE,
    cache_control: { type: "ephemeral" },
  }];

  // The user's own numbers, passed as compact context so the coach is personal.
  const ctx = {
    profile: body.profile ?? null,
    macroTargets: body.targets ?? null,
    fairwayFuelScore: body.score ?? null,
    recent: body.recentLog ?? null,
  };
  const contextBlock =
    "MY CURRENT DATA (use these exact numbers; if a field is null, ask for it):\n" +
    JSON.stringify(ctx, null, 2);

  const messages: Anthropic.MessageParam[] = [
    ...cleanHistory,
    { role: "user", content: `${contextBlock}\n\nQUESTION: ${body.message.trim()}` },
  ];

  // ── 4. Stream Claude's answer back to the browser as SSE ─────────────────
  try {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 1500,
      thinking: { type: "adaptive" },   // adaptive thinking on 4.6+ models
      system,
      messages,
    });

    const encoder = new TextEncoder();
    const sse = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(sse, {
      headers: { ...corsFor(req), "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    return json(req, { error: "coach_failed", detail: String(e) }, 500);
  }
});
