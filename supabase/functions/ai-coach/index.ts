// ============================================================================
// FairwayFuel AI Coach — Supabase Edge Function (Deno).
//
// The browser POSTs the user's question + a compact snapshot of their own app
// data (macro targets, recent log, clubhead-speed trend). This function:
//   1. Verifies the caller's Supabase JWT (must be a logged-in user).
//   2. Checks the user has an active subscription / trial (entitlement gate).
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

import Anthropic from "npm:@anthropic-ai/sdk@^0.70";
import { createClient } from "npm:@supabase/supabase-js@^2";
import { corsHeaders, preflight, json } from "../_shared/cors.ts";
import { COACH_KNOWLEDGE } from "../_shared/knowledge.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
// Default to the most capable model. For high-volume / low-stakes turns,
// claude-sonnet-4-6 or claude-haiku-4-5 are cheaper drop-in swaps.
const MODEL = Deno.env.get("AI_COACH_MODEL") ?? "claude-opus-4-8";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

interface CoachRequest {
  message: string;                 // the user's question
  history?: { role: "user" | "assistant"; content: string }[];
  profile?: Record<string, unknown>;   // their `fairwayfuel` blob
  targets?: Record<string, unknown>;   // computed macros: { target, proteinG, carbG, fatG, mealN, goal }
  score?: unknown;                     // FairwayFuel Score + pillar breakdown
  recentLog?: unknown;                 // trimmed ff_log / speed trend
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // ── 1. Authenticate the caller via their Supabase JWT ────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Not signed in" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: "Invalid session" }, 401);

  // ── 2. Entitlement gate: active subscription or live trial ───────────────
  const { data: subscribed } = await supabase.rpc("is_subscribed", { uid: user.id });
  if (!subscribed) {
    return json({ error: "subscription_required",
      message: "The AI coach is part of FairwayFuel Pro. Start your free trial to chat." }, 402);
  }

  // ── 3. Build the prompt ──────────────────────────────────────────────────
  let body: CoachRequest;
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  if (!body.message?.trim()) return json({ error: "Empty message" }, 400);

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
    ...(body.history ?? []).slice(-8).map((m) => ({ role: m.role, content: m.content })),
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
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    return json({ error: "coach_failed", detail: String(e) }, 500);
  }
});
