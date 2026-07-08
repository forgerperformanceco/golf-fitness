/* ============================================================================
   Yardsmith — optional cloud login + progress sync (Supabase, magic-link).

   HOW TO TURN IT ON (≈5 min, see LAUNCH-GUIDE.md §3):
     1. Create a free project at supabase.com.
     2. Settings → API → copy the Project URL and the "anon public" key below.
     3. Authentication → Providers → enable Email (magic link).
     4. SQL editor → run the `profiles` table snippet from the launch guide.
   Until SUPABASE_URL is filled in, this file is a NO-OP: the app keeps working
   exactly as before (saving locally per-device), with no login UI shown.
   ============================================================================ */
(function () {
  "use strict";

  var SUPABASE_URL  = "https://tbwmckmyzoxzhpqlomsp.supabase.co";   // e.g. "https://abcdwxyz.supabase.co"
  var SUPABASE_ANON = "sb_publishable_bOf591Xidfd_WLCYEYwaiQ_1kCbhbmi";   // publishable/anon key (safe to ship in the browser)

  // Everything the app persists to localStorage — the full progress blob.
  // ff_start = the plan's start date (so the calendar/week follows you across devices).
  var KEYS = ["fairwayfuel", "ff_week", "ff_log", "ff_body", "ff_start", "ff_planview", "ff_swaps", "ff_onboarded", "ff_handle", "ff_kcal_adj", "ff_lastcheckin", "ff_gameday", "ff_foodprefs", "ff_insights_seen", "ff_region", "ff_zip", "ff_tips_seen", "ff_history", "ff_deleted", "ff_rest", "ff_goalyds", "ff_speedtest", "ff_mobility", "ff_event", "ff_fuel", "ff_rounds"];

  // Disabled until configured, or if the Supabase SDK didn't load (e.g. offline).
  if (!SUPABASE_URL || !SUPABASE_ANON || !window.supabase) return;

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true }
  });

  // Expose a tiny auth surface so other modules (e.g. coach.js) can call our
  // backend with the user's JWT. We never expose the service-role key here —
  // only the publishable anon key and the current user's access token.
  window.FF = window.FF || {};
  window.FF.supabaseUrl = SUPABASE_URL;
  window.FF.anonKey = SUPABASE_ANON;
  window.FF.user = null;
  window.FF.getAccessToken = async function () {
    try { var r = await sb.auth.getSession(); return (r.data.session && r.data.session.access_token) || null; }
    catch (e) { return null; }
  };
  window.FF.signIn = function () { try { openModal(); } catch (e) {} };
  window.FF.signOut = function () { try { sb.auth.signOut(); } catch (e) {} };

  // Permanently delete the account + all synced data (App Store requirement).
  // Server-side deletion (auth user + cascaded rows) happens in the
  // delete-account Edge Function; here we then wipe every local trace so a
  // stale device can't re-push a "resurrected" profile. Returns {ok:true} or
  // {error:...}; the caller confirms with the user and reloads on success.
  window.FF.deleteAccount = async function () {
    var token = null;
    try { token = await window.FF.getAccessToken(); } catch (e) {}
    if (!token) return { error: "not-signed-in" };
    try {
      var res = await fetch(SUPABASE_URL + "/functions/v1/delete-account", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "apikey": SUPABASE_ANON,
          "Content-Type": "application/json"
        }
      });
      var out = {}; try { out = await res.json(); } catch (e) {}
      if (!res.ok || !out.ok) return { error: (out && out.error) || ("http " + res.status) };
      // Stop any pending push from re-creating a row, then wipe all local app data.
      lastSnapshot = null;
      try {
        var drop = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k === "fairwayfuel" || k.indexOf("ff_") === 0) drop.push(k);
        }
        drop.forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) {}
      try { sessionStorage.removeItem("ff_synced_once"); } catch (e) {}
      try { await sb.auth.signOut(); } catch (e) {}
      user = null; window.FF.user = null;
      return { ok: true };
    } catch (e) { return { error: String(e) }; }
  };

  // ---- Opt-in public leaderboard (handles only, never email) ----
  // Reads work for anyone (anon read of opted-in rows via RLS); writes require
  // a signed-in user and only ever touch that user's own row.
  window.FF.leaderboard = {
    list: async function (board, limit) {
      var col = board === "speed" ? "speed"
              : board === "streak" ? "streak"
              : board === "week" ? "week_sessions"
              : "score";
      try {
        var r = await sb.from("leaderboard")
          .select("handle,score,speed,streak,sessions,goal,speed_gain,week_sessions,week_start")
          .eq("opted_in", true).not(col, "is", null)
          .order(col, { ascending: false }).limit(limit || 50);
        return r.error ? [] : (r.data || []);
      } catch (e) { return []; }
    },
    getMine: async function () {
      if (!user) return null;
      try {
        var r = await sb.from("leaderboard").select("*").eq("user_id", user.id).maybeSingle();
        return r.data || null;
      } catch (e) { return null; }
    },
    publish: async function (row) {
      if (!user) return { error: "not signed in" };
      try {
        var rec = Object.assign({ user_id: user.id, opted_in: true, updated_at: new Date().toISOString() }, row);
        var r = await sb.from("leaderboard").upsert(rec, { onConflict: "user_id" });
        return r.error ? { error: r.error.message } : { ok: true };
      } catch (e) { return { error: String(e) }; }
    },
    leave: async function () {
      if (!user) return;
      try { await sb.from("leaderboard").delete().eq("user_id", user.id); } catch (e) {}
    }
  };

  // ---- Web push (server reminders) ----
  // The VAPID PUBLIC key — safe to ship (it only identifies our push server);
  // its private half lives in Supabase Edge Function secrets. Regenerate the
  // pair with `node scripts/gen-vapid.mjs` (doing so invalidates existing
  // subscriptions — every device must re-toggle reminders).
  var FF_PUSH_PUB = "BHhvzZKWGc_ULisImsEa_faL5TNqlGA9pKuSC4UaDp7TyglKv7Wxg1EH9fmmjSsYbTkHq-FJOL_NiuJGO9N8Og4";
  window.FF.pushKey = FF_PUSH_PUB;
  // Upsert this browser's subscription + its 7-day message schedule (the app
  // rebuilds `week` on every open so the copy stays day-aware server-side).
  window.FF.pushSave = async function (row) {
    if (!user) return { error: "not-signed-in" };
    try {
      var rec = Object.assign({ user_id: user.id }, row);
      var r = await sb.from("push_subs").upsert(rec, { onConflict: "endpoint" });
      return r.error ? { error: r.error.message } : { ok: true };
    } catch (e) { return { error: String(e) }; }
  };
  window.FF.pushRemove = async function (endpoint) {
    if (!user || !endpoint) return;
    try { await sb.from("push_subs").delete().eq("endpoint", endpoint); } catch (e) {}
  };

  var user = null;
  var lastSnapshot = null;   // JSON of the last state we know matches the cloud
  var lastRev = null;        // profiles.rev we last saw (null = not read yet)
  var revMode = true;        // false → the project's schema predates the rev column: legacy blind upsert
  var pushing = false;

  // Supabase/PostgREST error for a column the schema doesn't have yet — the
  // signal to fall back to the pre-rev sync path until schema.sql is re-applied.
  function isMissingRev(err) {
    var m = String((err && err.message) || "").toLowerCase();
    return m.indexOf("rev") !== -1 && (m.indexOf("column") !== -1 || m.indexOf("schema") !== -1);
  }

  // ---- Sync health (device-local, surfaced in the Account tab) ----
  // Every push/pull outcome lands in ff_sync_status so a persistently failing
  // sync is VISIBLE instead of silently eating months of data. Deliberately
  // NOT in KEYS — each device reports the health of its own link to the cloud.
  function noteSync(ok, err) {
    try {
      var prev = {};
      try { prev = JSON.parse(localStorage.getItem("ff_sync_status")) || {}; } catch (e) {}
      var rec = {
        state: ok ? "ok" : "error",
        ts: Date.now(),
        okTs: ok ? Date.now() : (prev.okTs || null),   // last GOOD sync survives failures
        err: ok ? null : String((err && err.message) || err || "sync failed").slice(0, 200)
      };
      localStorage.setItem("ff_sync_status", JSON.stringify(rec));
      window.dispatchEvent(new CustomEvent("ff-sync-status", { detail: rec }));
    } catch (e) {}
  }

  function snapshot() {
    var blob = {};
    KEYS.forEach(function (k) {
      var raw = localStorage.getItem(k);
      if (raw != null) { try { blob[k] = JSON.parse(raw); } catch (e) {} }
    });
    return JSON.stringify(blob);
  }

  function writeBlob(str) {
    try {
      var blob = JSON.parse(str) || {};
      KEYS.forEach(function (k) {
        if (blob[k] != null) localStorage.setItem(k, JSON.stringify(blob[k]));
      });
    } catch (e) {}
  }

  // ---- Cloud read/write ----
  // Every push is a compare-and-swap on profiles.rev: it only lands if the cloud
  // still holds the revision this device last saw. Zero rows updated = another
  // device moved the cloud first → pull its blob, MERGE (same union rules as
  // login), and retry with the merged state. This is what stops two open devices
  // from silently overwriting each other between logins — before this guard,
  // whichever device pushed last erased the other's changes wholesale.
  async function push() {
    if (!user || pushing) return;
    if (snapshot() === lastSnapshot) return;
    pushing = true;
    try {
      for (var attempt = 0; attempt < 3; attempt++) {
        var snap = snapshot();     // re-read each attempt: a conflict merge rewrites local state

        if (!revMode) {            // schema not migrated yet → the old blind upsert (pre-rev behavior)
          var res = await sb.from("profiles").upsert({
            id: user.id, data: JSON.parse(snap), updated_at: new Date().toISOString()
          });
          if (!res.error) { lastSnapshot = snap; noteSync(true); }
          else noteSync(false, res.error);
          break;
        }

        if (lastRev == null) {     // pushed before login-sync read the rev → read it now
          var pre = await sb.from("profiles").select("rev").eq("id", user.id).maybeSingle();
          if (pre.error) { if (isMissingRev(pre.error)) { revMode = false; continue; } noteSync(false, pre.error); break; }
          if (!pre.data) {         // no row yet (very old account / trigger raced) → seed one
            var ins = await sb.from("profiles").insert({ id: user.id, data: JSON.parse(snap), rev: 1 }).select("rev");
            if (!ins.error) { lastRev = 1; lastSnapshot = snap; noteSync(true); break; }
            if (isMissingRev(ins.error)) { revMode = false; continue; }
            continue;              // row appeared concurrently → retry via the guarded path
          }
          lastRev = pre.data.rev || 0;
        }

        var base = lastRev;
        var r = await sb.from("profiles")
          .update({ data: JSON.parse(snap), rev: base + 1, updated_at: new Date().toISOString() })
          .eq("id", user.id).eq("rev", base)
          .select("rev");
        if (r.error) {
          if (isMissingRev(r.error)) { revMode = false; continue; }
          noteSync(false, r.error); break;
        }
        if (r.data && r.data.length) { lastRev = base + 1; lastSnapshot = snap; noteSync(true); break; }

        // Conflict: pull the newer cloud blob, merge additively, retry with the result.
        var cur = await sb.from("profiles").select("data,rev").eq("id", user.id).maybeSingle();
        if (cur.error || !cur.data) { noteSync(false, (cur && cur.error) || new Error("conflict re-read failed")); break; }
        var localObj; try { localObj = JSON.parse(snapshot()); } catch (e) { localObj = {}; }
        writeBlob(JSON.stringify(mergeBlob(localObj, cur.data.data || {})));
        lastRev = cur.data.rev || 0;
        if (attempt === 2) noteSync(false, new Error("sync conflict persisted — will retry"));
      }
    } catch (e) { noteSync(false, e); }
    pushing = false;
  }

  // Stable, key-sorted JSON so cosmetic ordering never looks like a real change.
  function stable(v) {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
    return "{" + Object.keys(v).sort().map(function (k) {
      return JSON.stringify(k) + ":" + stable(v[k]);
    }).join(",") + "}";
  }

  // ---- Conflict-safe merge ----
  // The workout log and body history are ADDITIVE — a session completed on either
  // device (or logged locally but not yet pushed) must never be dropped. Blindly
  // letting the cloud overwrite local used to lose un-pushed completions on reopen,
  // which read as "the app forgot my workouts." We union those two keys; everything
  // else keeps the prior "cloud wins" behavior.
  function loggedSetCount(sess) {
    if (!sess || !sess.ex) return 0;
    var n = 0;
    (sess.ex || []).forEach(function (x) {
      (x.sets || []).forEach(function (st) { if (st && (st.w || st.r || st.done)) n++; });
    });
    return n;
  }
  function unionLog(local, cloud) {
    local = (local && typeof local === "object") ? local : {};
    cloud = (cloud && typeof cloud === "object") ? cloud : {};
    var out = {};
    Object.keys(cloud).forEach(function (k) { out[k] = cloud[k]; });
    Object.keys(local).forEach(function (k) {
      if (!(k in out)) { out[k] = local[k]; return; }
      // On a collision the newer edit wins (so a re-log after a delete survives); with no
      // timestamps (older data) fall back to keeping the more-complete session.
      var a = local[k], b = out[k], ta = (a && a._ts) || 0, tb = (b && b._ts) || 0;
      out[k] = (ta !== tb) ? (ta > tb ? a : b) : (loggedSetCount(a) >= loggedSetCount(b) ? a : b);
    });
    return out;
  }
  // Deletion tombstones: { "L:week|day": ts, "H:histId": ts } — keep the latest ts per key.
  function unionDeleted(local, cloud) {
    local = (local && typeof local === "object") ? local : {};
    cloud = (cloud && typeof cloud === "object") ? cloud : {};
    var out = {};
    Object.keys(cloud).forEach(function (k) { out[k] = cloud[k]; });
    Object.keys(local).forEach(function (k) { if (!(k in out) || local[k] > out[k]) out[k] = local[k]; });
    return out;
  }
  function unionBody(local, cloud) {
    local = Array.isArray(local) ? local : [];
    cloud = Array.isArray(cloud) ? cloud : [];
    var byDate = {}, loose = [];
    cloud.concat(local).forEach(function (e) {           // local last → its fields win
      if (!e) return;
      if (e.date) byDate[e.date] = Object.assign({}, byDate[e.date], e);
      else loose.push(e);
    });
    var out = Object.keys(byDate).map(function (k) { return byDate[k]; });
    out.sort(function (a, b) { return String(a.date || "").localeCompare(String(b.date || "")); });
    return out.concat(loose);
  }
  function unionHistory(local, cloud) {
    local = Array.isArray(local) ? local : [];
    cloud = Array.isArray(cloud) ? cloud : [];
    var byId = {};
    cloud.concat(local).forEach(function (e) {                // later (local) wins ties via >=
      if (!e) return;
      var id = e.id || JSON.stringify(e);
      if (!byId[id] || (e.ts || 0) >= (byId[id].ts || 0)) byId[id] = e;
    });
    var out = Object.keys(byId).map(function (k) { return byId[k]; });
    out.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    return out;
  }
  // Generic additive series: array of timestamped entries — union by key, newer
  // `ts` wins a collision (local wins ties), chronological order (oldest first,
  // matching the app's append order), capped to the app's own retention limit.
  function unionSeries(local, cloud, keyFn, cap) {
    local = Array.isArray(local) ? local : [];
    cloud = Array.isArray(cloud) ? cloud : [];
    var byK = {};
    cloud.concat(local).forEach(function (e) {
      if (!e) return;
      var k = String(keyFn(e));
      if (!byK[k] || (e.ts || 0) >= (byK[k].ts || 0)) byK[k] = e;
    });
    var out = Object.keys(byK).map(function (k) { return byK[k]; });
    out.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    if (cap && out.length > cap) out = out.slice(out.length - cap);
    return out;
  }
  // Fuel check-offs: { "YYYY-MM-DD": {m:{}, rating, n, ts} } — per-day record,
  // the newer day-record wins (meal detail vs day rating are exclusive modes, so
  // field-merging two same-day records could resurrect deliberately cleared
  // meals). Keeps the app's 95-day retention (ISO keys sort chronologically).
  function unionFuel(local, cloud) {
    local = (local && typeof local === "object") ? local : {};
    cloud = (cloud && typeof cloud === "object") ? cloud : {};
    var out = {};
    Object.keys(cloud).forEach(function (k) { out[k] = cloud[k]; });
    Object.keys(local).forEach(function (k) {
      var a = local[k], b = out[k];
      if (!b || ((a && a.ts) || 0) >= ((b && b.ts) || 0)) out[k] = a;
    });
    var keys = Object.keys(out);
    if (keys.length > 95) { keys.sort(); keys.slice(0, keys.length - 95).forEach(function (k) { delete out[k]; }); }
    return out;
  }
  // ---- Merge registry ----
  // Every ADDITIVE key (history the user accumulates) must declare its union
  // here; keys without an entry are settings and take the cloud value on
  // conflict. Adding a new ff_* history key? Add its merge here in the same PR —
  // a missed entry means cross-device data loss for that key.
  var MERGE = {
    ff_log:       unionLog,
    ff_body:      unionBody,
    ff_history:   unionHistory,
    ff_rest:      unionDeleted,                                                            // check-offs: latest ts per day wins
    ff_rounds:    function (l, c) { return unionSeries(l, c, function (e) { return e.id || e.ts; }, 60); },
    ff_speedtest: function (l, c) { return unionSeries(l, c, function (e) { return e.ts; }, 60); },
    ff_mobility:  function (l, c) { return unionSeries(l, c, function (e) { return e.ts; }, 40); },
    ff_fuel:      unionFuel
  };
  function mergeBlob(local, cloud) {
    local = local || {}; cloud = cloud || {};
    var out = {};
    KEYS.forEach(function (k) {
      if (MERGE[k]) out[k] = MERGE[k](local[k], cloud[k]);
      else if (cloud[k] !== undefined) out[k] = cloud[k];   // settings: cloud wins on conflict
      else if (local[k] !== undefined) out[k] = local[k];
    });
    Object.keys(local).forEach(function (k) { if (out[k] === undefined) out[k] = local[k]; });
    // Apply deletions last so a cleared workout stays gone across devices — unless it was
    // re-logged / re-finished AFTER the delete (a newer timestamp beats the tombstone).
    var del = unionDeleted(local.ff_deleted, cloud.ff_deleted);
    if (out.ff_log) Object.keys(out.ff_log).forEach(function (k) {
      var t = del["L:" + k], st = out.ff_log[k];
      if (t && t > ((st && st._ts) || 0)) delete out.ff_log[k];
    });
    if (Array.isArray(out.ff_history)) out.ff_history = out.ff_history.filter(function (e) {
      var t = e && del["H:" + e.id];
      return !(t && t > (e.ts || 0));
    });
    // Drop tombstones the data has already outlived (re-created newer) so the set can't grow forever.
    Object.keys(del).forEach(function (tk) {
      if (tk.slice(0, 2) === "L:") { var st = out.ff_log && out.ff_log[tk.slice(2)]; if (st && ((st._ts) || 0) >= del[tk]) delete del[tk]; }
      else if (tk.slice(0, 2) === "H:") { var id = tk.slice(2); if (Array.isArray(out.ff_history) && out.ff_history.some(function (e) { return e && e.id === id && (e.ts || 0) >= del[tk]; })) delete del[tk]; }
    });
    out.ff_deleted = del;
    return out;
  }

  // On login: seed the cloud from this device if empty, otherwise pull the cloud down.
  async function syncOnLogin() {
    var row;
    try {
      var r = await sb.from("profiles").select("data,rev").eq("id", user.id).maybeSingle();
      if (r.error && isMissingRev(r.error)) {   // schema not migrated yet → pre-rev select
        revMode = false;
        r = await sb.from("profiles").select("data").eq("id", user.id).maybeSingle();
      }
      if (r.error) { noteSync(false, r.error); return; }
      row = r.data;
    } catch (e) { noteSync(false, e); return; }
    lastRev = row ? (row.rev || 0) : null;

    if (!row || row.data == null) {            // first login anywhere → seed from local
      lastSnapshot = null; await push();
      return;
    }
    var localObj; try { localObj = JSON.parse(snapshot()); } catch (e) { localObj = {}; }
    if (stable(row.data) === stable(localObj)) { // already in sync (ignoring key order)
      lastSnapshot = JSON.stringify(row.data);
      noteSync(true);
      return;
    }
    // Merge (don't overwrite): union the additive logs so a completed workout or body
    // entry on EITHER side survives, then push the merged result so the cloud catches up.
    var mergedObj = mergeBlob(localObj, row.data);
    var localChanged = stable(mergedObj) !== stable(localObj);
    writeBlob(JSON.stringify(mergedObj));
    lastSnapshot = null;                        // force the merged state up to the cloud
    await push();
    // Only reload if the merge actually changed what's on this device — and only once,
    // guarded so the app's own startup writes can't cause an endless reload loop.
    if (localChanged && !sessionStorage.getItem("ff_synced_once")) {
      try { sessionStorage.setItem("ff_synced_once", "1"); } catch (e) {}
      location.reload();
    }
  }

  // ---- Tiny auth UI (injected so index.html needs no markup) ----
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }

  function injectStyles() {
    var css = ''
      + '.ff-auth{position:fixed;top:12px;right:12px;z-index:50;}'
      + '.ff-pill{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.92);'
      + 'border:1px solid #cdddd2;color:#1c3a28;font:600 12.5px/1 system-ui,sans-serif;'
      + 'padding:9px 13px;border-radius:999px;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,.14);}'
      + '.ff-pill:active{transform:translateY(1px);}'
      + '.ff-pill.in{background:#11643a;color:#fff;border-color:#11643a;}'
      + '.ff-modal{position:fixed;inset:0;background:rgba(8,24,16,.55);display:flex;align-items:center;'
      + 'justify-content:center;z-index:60;padding:20px;}'
      + '.ff-card{background:#fff;border-radius:16px;max-width:360px;width:100%;padding:24px 22px;'
      + 'box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;}'
      + '.ff-card h3{margin:2px 0 4px;font-size:20px;color:#143a26;}'
      + '.ff-card p{margin:0 0 16px;font-size:13px;color:#5a6b60;line-height:1.5;}'
      + '.ff-card input{width:100%;box-sizing:border-box;font-size:16px;padding:12px 14px;border:1.5px solid #cdddd2;'
      + 'border-radius:10px;margin-bottom:12px;}'
      + '.ff-card button.go{width:100%;background:#11643a;color:#fff;border:0;border-radius:10px;'
      + 'font:700 15px system-ui;padding:13px;cursor:pointer;}'
      + '.ff-card button.go:disabled{opacity:.6;}'
      + '.ff-card .x{background:none;border:0;color:#8a978e;font-size:13px;margin-top:12px;cursor:pointer;}'
      + '.ff-msg{font-size:13px;margin-top:6px;min-height:18px;}'
      + '.ff-msg.ok{color:#11643a;} .ff-msg.err{color:#c0392b;}'
      + '@media(max-width:600px){.ff-auth{top:8px;right:8px;}.ff-pill{padding:8px 11px;font-size:12px;}}';
    document.head.appendChild(el("style", null, css));
  }

  var pill, modal;
  function renderPill() {
    if (!pill) return;     // pill suppressed when the app has a dedicated Account tab
    if (user) {
      var name = (user.email || "account").split("@")[0];
      pill.className = "ff-pill in";
      pill.innerHTML = "☁ " + name + " · Sign out";
    } else {
      pill.className = "ff-pill";
      pill.innerHTML = "☁ Sign in to save";
    }
  }

  function openModal() {
    modal = el("div", { class: "ff-modal" });
    modal.innerHTML =
      '<div class="ff-card" role="dialog" aria-label="Sign in">'
      + '<h3>Save your progress</h3>'
      + '<p id="ffSub">Enter your email — we’ll send a <b>sign-in code</b> and a login link, no password. '
      + 'Your calculator and full workout log then sync across your devices.</p>'
      + '<input type="email" id="ffEmail" placeholder="you@email.com" autocomplete="email" inputmode="email" />'
      + '<input type="text" id="ffCode" placeholder="Enter the code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" style="display:none;letter-spacing:4px;text-align:center;font-weight:700;" />'
      + '<button class="go" id="ffGo">Send my code</button>'
      + '<div class="ff-msg" id="ffMsg"></div>'
      + '<button class="x" id="ffX">Maybe later</button>'
      + '</div>';
    document.body.appendChild(modal);
    var email = modal.querySelector("#ffEmail");
    var code = modal.querySelector("#ffCode");
    var go = modal.querySelector("#ffGo");
    var msg = modal.querySelector("#ffMsg");
    var sub = modal.querySelector("#ffSub");
    var stage = "email";
    email.focus();
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    modal.querySelector("#ffX").addEventListener("click", closeModal);

    async function sendCode() {
      var v = (email.value || "").trim();
      if (!/.+@.+\..+/.test(v)) { msg.className = "ff-msg err"; msg.textContent = "Enter a valid email."; return; }
      go.disabled = true; msg.className = "ff-msg"; msg.textContent = "Sending…";
      try {
        var r = await sb.auth.signInWithOtp({ email: v, options: { emailRedirectTo: location.href } });
        if (r.error) throw r.error;
        // Move to code entry — typing the code signs you in IN THIS APP, which is the only
        // reliable path for an installed iPhone app (the email link opens Safari, a separate
        // login). The link still works too for anyone who prefers it.
        stage = "code";
        sub.innerHTML = 'We emailed <b>' + v + '</b>. Type the <b>code</b> below to sign in right here — or tap the link in the email.';
        email.setAttribute("readonly", "readonly");
        code.style.display = "block";
        go.textContent = "Verify & sign in";
        go.disabled = false;
        msg.className = "ff-msg ok"; msg.textContent = "Check your email ✉️";
        code.focus();
      } catch (e) {
        msg.className = "ff-msg err"; msg.textContent = (e && e.message) || "Couldn’t send — try again.";
        go.disabled = false;
      }
    }
    async function verifyCode() {
      var v = (email.value || "").trim();
      var t = (code.value || "").replace(/\D/g, "");
      if (t.length < 6) { msg.className = "ff-msg err"; msg.textContent = "Enter the code from the email."; return; }
      go.disabled = true; msg.className = "ff-msg"; msg.textContent = "Signing in…";
      try {
        var r = await sb.auth.verifyOtp({ email: v, token: t, type: "email" });
        if (r.error) throw r.error;
        msg.className = "ff-msg ok"; msg.textContent = "Signed in ✓";
        // onAuthStateChange (SIGNED_IN) closes the modal and runs the sync.
      } catch (e) {
        msg.className = "ff-msg err"; msg.textContent = (e && e.message) || "That code didn’t work — double-check it.";
        go.disabled = false;
      }
    }
    go.addEventListener("click", function () { if (stage === "email") sendCode(); else verifyCode(); });
    email.addEventListener("keydown", function (e) { if (e.key === "Enter") go.click(); });
    code.addEventListener("keydown", function (e) { if (e.key === "Enter") go.click(); });
  }
  function closeModal() { if (modal) { modal.remove(); modal = null; } }

  function onPillClick() {
    if (user) { if (confirm("Sign out of Yardsmith on this device?")) sb.auth.signOut(); }
    else openModal();
  }

  function mount() {
    injectStyles();   // styles power the sign-in modal too, so always inject them
    // If the host app has its own Account tab, skip the floating pill — login lives there.
    if (window.FF_ACCOUNT_TAB) return;
    var box = el("div", { class: "ff-auth" });
    pill = el("button", { class: "ff-pill", type: "button" }, "☁ Sign in to save");
    pill.addEventListener("click", onPillClick);
    box.appendChild(pill);
    document.body.appendChild(box);
    renderPill();
  }

  // ---- Wire it all up ----
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  sb.auth.onAuthStateChange(function (event, session) {
    user = session && session.user;
    window.FF.user = user;
    renderPill();
    closeModal();
    // Let coach.js (and anything else) react to login/logout.
    try { window.dispatchEvent(new CustomEvent("ff-auth", { detail: { user: user } })); } catch (e) {}
    if (event === "SIGNED_IN" && user) syncOnLogin();
  });

  // Push promptly after the app changes data (debounced) so a completed workout lands
  // in the cloud almost immediately instead of waiting for the next poll. push() itself
  // no-ops when nothing actually changed, so coalescing many edits into one is cheap.
  var changeTimer = null;
  function pushSoon() {
    if (!user) return;
    if (changeTimer) clearTimeout(changeTimer);
    changeTimer = setTimeout(function () { changeTimer = null; push(); }, 1200);
  }
  window.addEventListener("ff-data-changed", pushSoon);

  // Safety net: poll for changes while signed in, and flush on the way out.
  setInterval(function () { if (user) push(); }, 8000);
  window.addEventListener("pagehide", function () { if (user) push(); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden" && user) push();
  });
})();
