// Shared CORS + JSON helpers for Yardsmith Edge Functions.
//
// Allowed origins: the live website PLUS the Capacitor native-shell origins, so
// the very same functions serve both the web PWA and the wrapped App Store /
// Play Store apps. In the native WebView the request Origin is:
//   • iOS (WKWebView, capacitor scheme) → capacitor://localhost
//   • Android                            → http://localhost
// We echo the request origin when it's on the allow-list, else fall back to the
// live site. Override/extend the primary origin with the ALLOWED_ORIGIN secret.
const ALLOWED = new Set<string>([
  Deno.env.get("ALLOWED_ORIGIN") ?? "https://fairwayfuel.app",
  "https://fairwayfuel.app",
  "capacitor://localhost",   // iOS native shell
  "http://localhost",        // Android native shell
  "https://localhost",       // some WebView configurations
]);

export function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allow = ALLOWED.has(origin) ? origin : "https://fairwayfuel.app";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function preflight(req: Request): Response {
  return new Response("ok", { headers: corsFor(req) });
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(req), "Content-Type": "application/json" },
  });
}
