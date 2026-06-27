// Shared CORS headers for FairwayFuel Edge Functions.
// Lock `Access-Control-Allow-Origin` down to the live site in production.
export const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "https://fairwayfuel.app";

export const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

export function preflight(): Response {
  return new Response("ok", { headers: corsHeaders });
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
