/* ============================================================================
   FairwayFuel — optional cloud login + progress sync (Supabase, magic-link).

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
  var KEYS = ["fairwayfuel", "ff_week", "ff_log", "ff_body", "ff_start", "ff_planview", "ff_swaps", "ff_onboarded", "ff_handle", "ff_kcal_adj", "ff_lastcheckin", "ff_gameday"];

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

  // ---- Opt-in public leaderboard (handles only, never email) ----
  // Reads work for anyone (anon read of opted-in rows via RLS); writes require
  // a signed-in user and only ever touch that user's own row.
  window.FF.leaderboard = {
    list: async function (board, limit) {
      var col = board === "speed" ? "speed" : (board === "streak" ? "streak" : "score");
      try {
        var r = await sb.from("leaderboard")
          .select("handle,score,speed,streak,sessions,goal,speed_gain")
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

  var user = null;
  var lastSnapshot = null;   // JSON of the last state we know matches the cloud
  var pushing = false;

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
  async function push() {
    if (!user || pushing) return;
    var snap = snapshot();
    if (snap === lastSnapshot) return;
    pushing = true;
    try {
      var res = await sb.from("profiles").upsert({
        id: user.id, data: JSON.parse(snap), updated_at: new Date().toISOString()
      });
      if (!res.error) lastSnapshot = snap;
    } catch (e) {}
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

  // On login: seed the cloud from this device if empty, otherwise pull the cloud down.
  async function syncOnLogin() {
    var row;
    try {
      var r = await sb.from("profiles").select("data").eq("id", user.id).maybeSingle();
      row = r.data;
    } catch (e) { return; }

    if (!row || row.data == null) {            // first login anywhere → seed from local
      lastSnapshot = null; await push();
      return;
    }
    var cloudStr = JSON.stringify(row.data);
    var localObj; try { localObj = JSON.parse(snapshot()); } catch (e) { localObj = {}; }
    if (stable(row.data) === stable(localObj)) { // already in sync (ignoring key order)
      lastSnapshot = cloudStr;
      return;
    }
    writeBlob(cloudStr);                        // cloud wins on login
    lastSnapshot = cloudStr;
    // Re-render once with the synced data. Guarded with sessionStorage so the app's own
    // startup writes can never turn this into an endless reload loop.
    if (!sessionStorage.getItem("ff_synced_once")) {
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
      + '<p>Enter your email and we’ll send a one-tap login link — no password. '
      + 'Your calculator and full workout log then sync across your devices.</p>'
      + '<input type="email" id="ffEmail" placeholder="you@email.com" autocomplete="email" />'
      + '<button class="go" id="ffGo">Send my login link</button>'
      + '<div class="ff-msg" id="ffMsg"></div>'
      + '<button class="x" id="ffX">Maybe later</button>'
      + '</div>';
    document.body.appendChild(modal);
    var email = modal.querySelector("#ffEmail");
    var go = modal.querySelector("#ffGo");
    var msg = modal.querySelector("#ffMsg");
    email.focus();
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    modal.querySelector("#ffX").addEventListener("click", closeModal);
    go.addEventListener("click", async function () {
      var v = (email.value || "").trim();
      if (!/.+@.+\..+/.test(v)) { msg.className = "ff-msg err"; msg.textContent = "Enter a valid email."; return; }
      go.disabled = true; msg.className = "ff-msg"; msg.textContent = "Sending…";
      try {
        var r = await sb.auth.signInWithOtp({ email: v, options: { emailRedirectTo: location.href } });
        if (r.error) throw r.error;
        msg.className = "ff-msg ok"; msg.textContent = "Check your email for the login link ✉️";
      } catch (e) {
        msg.className = "ff-msg err"; msg.textContent = (e && e.message) || "Couldn’t send — try again.";
        go.disabled = false;
      }
    });
    email.addEventListener("keydown", function (e) { if (e.key === "Enter") go.click(); });
  }
  function closeModal() { if (modal) { modal.remove(); modal = null; } }

  function onPillClick() {
    if (user) { if (confirm("Sign out of FairwayFuel on this device?")) sb.auth.signOut(); }
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

  // Push local changes up: poll for changes while signed in, and flush on the way out.
  setInterval(function () { if (user) push(); }, 8000);
  window.addEventListener("pagehide", function () { if (user) push(); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden" && user) push();
  });
})();
