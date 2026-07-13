/* ============================================================================
   Yardsmith — push-daily: the hourly web-push sender.

   Called every hour by pg_cron (see the cron.schedule snippet at the bottom of
   supabase/schema.sql). For each subscription in push_subs it computes "now"
   in the subscriber's timezone; when the local hour matches their training
   slot and nothing was sent today, it sends today's entry from the row's
   7-day `week` schedule (written by the app on every open — same day-aware
   copy as the in-app reminders). A stale schedule (no entry for today = the
   app hasn't been opened in over a week) falls back to a re-engagement nudge,
   which is exactly the moment push earns its keep.

   Secrets (Dashboard → Edge Functions → push-daily → Secrets):
     VAPID_PUBLIC_KEY   — must match FF_PUSH_PUB in cloud-sync.js
     VAPID_PRIVATE_KEY  — its private half; NEVER commit this
     PUSH_CRON_SECRET   — shared secret the cron job sends as x-cron-secret
   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
   ============================================================================ */
import { createClient } from "npm:@supabase/supabase-js@2.110.2";
import webpush from "npm:web-push@3.6.7";

type SubRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
  tz: string | null;
  hour: number;
  week: unknown;
  last_sent: string | null;
};

type DayMsg = { d?: string; title?: string; body?: string };

const FALLBACK = {
  title: "It's been a minute ⛳",
  body: "Your plan picks up right where you left off — one session gets the streak moving again.",
};

function localNow(tz: string): { date: string; hour: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const hour = parseInt(get("hour"), 10);
    if (isNaN(hour)) return null;
    return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: hour % 24 };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get("PUSH_CRON_SECRET");
  if (!cronSecret) {
    return new Response(JSON.stringify({ error: "PUSH_CRON_SECRET is not configured" }), { status: 500 });
  }
  if (req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  const pub = Deno.env.get("VAPID_PUBLIC_KEY");
  const priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) {
    return new Response(JSON.stringify({ error: "VAPID keys are not configured" }), { status: 500 });
  }
  webpush.setVapidDetails("mailto:bobbydenisclay@gmail.com", pub, priv);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await admin.from("push_subs").select("*");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0, gone = 0, skipped = 0, failed = 0;
  for (const s of (data ?? []) as SubRow[]) {
    const now = localNow(s.tz || "UTC");
    if (!now || now.hour !== s.hour || s.last_sent === now.date) { skipped++; continue; }

    const week: DayMsg[] = Array.isArray(s.week) ? (s.week as DayMsg[]) : [];
    const today = week.find((m) => m && m.d === now.date);
    const msg = (today && today.title) ? today : FALLBACK;

    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: msg.title, body: msg.body, tag: "ff-daily" }),
        { TTL: 3600 },   // stale reminders are worse than none
      );
      sent++;
      await admin.from("push_subs").update({ last_sent: now.date }).eq("endpoint", s.endpoint);
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode ?? 0;
      if (code === 404 || code === 410) {
        // The browser revoked/expired this subscription — it will never work again.
        gone++;
        await admin.from("push_subs").delete().eq("endpoint", s.endpoint);
      } else {
        failed++;
      }
    }
  }

  return new Response(JSON.stringify({ sent, gone, skipped, failed }), {
    headers: { "content-type": "application/json" },
  });
});
