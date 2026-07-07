/* ============================================================================
   Yardsmith — AI woven through the app (no corner bubble).

   The AI is summoned IN CONTEXT from inline buttons across the app
   (Dashboard "Coach's read", Fuel "Build my meals", Train "Coach this week").
   Each opens one shared answer sheet, seeded with that screen's data.

   Public API (used by index.html):
     window.FFCoach.ask(prompt)   — open the sheet and ask this, seeded with the
                                    user's own numbers (macros, log, Score).
     window.FFCoach.open()        — open the sheet for a free-form question.
     window.FFCoach.ready()       — true once mounted.

   The Anthropic key lives only in the Edge Function — never here. Until the
   backend is deployed (or the user subscribes), the sheet explains itself and
   the rest of the app is untouched.
   ============================================================================ */
(function () {
  "use strict";

  var FN_PATH = "/functions/v1/ai-coach";
  var history = [];
  var busy = false;
  var sheet, wrap, log, input, sendBtn;

  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function context() {
    var body = lsGet("ff_body") || [], logObj = lsGet("ff_log") || {};
    return {
      profile: lsGet("fairwayfuel"),
      targets: lsGet("ff_targets"),
      score: lsGet("ff_score"),
      recentLog: { week: lsGet("ff_week") || 1, sessionsLogged: Object.keys(logObj).length, body: body.slice(-6) }
    };
  }
  function signedIn() { return !!(window.FF && window.FF.user); }
  function backendReady() { return !!(window.FF && window.FF.supabaseUrl); }

  function injectStyles() {
    var css = ''
      + '.ffc-wrap{position:fixed;inset:0;background:rgba(8,24,15,.5);z-index:80;display:flex;align-items:flex-end;'
      + 'justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;}'
      + '.ffc-wrap.open{opacity:1;pointer-events:auto;}'
      + '.ffc-sheet{background:#f6faf6;width:100%;max-width:560px;height:88vh;max-height:88vh;border-radius:22px 22px 0 0;'
      + 'display:flex;flex-direction:column;overflow:hidden;transform:translateY(26px);transition:transform .22s;box-shadow:0 -8px 40px rgba(8,30,18,.35);}'
      + '.ffc-wrap.open .ffc-sheet{transform:none;}'
      + '.ffc-grab{width:38px;height:4px;border-radius:99px;background:rgba(255,255,255,.45);margin:8px auto 0;}'
      + '.ffc-head{background:linear-gradient(160deg,#0f2417,#14532d);color:#fff;padding:6px 18px 14px;display:flex;'
      + 'align-items:center;justify-content:space-between;}'
      + '.ffc-head h3{margin:0;font-size:15px;display:flex;align-items:center;gap:8px;}'
      + '.ffc-head .ffc-ctx{margin:2px 0 0;font-size:11px;color:#bfe6cd;}'
      + '.ffc-x{background:rgba(255,255,255,.16);border:0;color:#fff;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;}'
      + '.ffc-log{flex:1;overflow-y:auto;padding:18px 16px;display:flex;flex-direction:column;gap:14px;}'
      + '.ffc-msg{font-size:14.5px;line-height:1.62;}'
      + '.ffc-msg.user{align-self:flex-end;max-width:85%;background:#11643a;color:#fff;padding:10px 14px;border-radius:15px;border-bottom-right-radius:5px;white-space:pre-wrap;}'
      + '.ffc-msg.bot{align-self:stretch;color:#16301f;padding:2px 2px 2px 13px;border-left:3px solid #cfe6d6;}'
      + '.ffc-msg.bot p{margin:0 0 9px;} .ffc-msg.bot p:last-child{margin-bottom:0;}'
      + '.ffc-msg.bot p.h{margin:13px 0 5px;font-size:14px;}'
      + '.ffc-msg.bot strong{color:#0f5132;font-weight:700;}'
      + '.ffc-msg.bot ul,.ffc-msg.bot ol{margin:5px 0 10px;padding-left:20px;} .ffc-msg.bot li{margin:4px 0;}'
      + '.ffc-msg.bot code{background:#eaf3ec;padding:1px 5px;border-radius:5px;font-size:13px;}'
      + '.ffc-msg.note{align-self:center;background:#eef6f0;color:#3f6450;font-size:12.5px;text-align:center;max-width:96%;padding:11px 14px;border-radius:12px;line-height:1.5;}'
      + '.ffc-cta{background:#11643a;color:#fff;border:0;border-radius:10px;padding:11px 16px;font:700 14px system-ui;cursor:pointer;margin-top:4px;}'
      + '.ffc-in{display:flex;gap:8px;padding:12px;border-top:1px solid #e2ece5;background:#fff;}'
      + '.ffc-in textarea{flex:1;resize:none;border:1.5px solid #cdddd2;border-radius:12px;padding:11px 13px;font:15px system-ui;max-height:96px;}'
      + '.ffc-send{background:#11643a;color:#fff;border:0;border-radius:12px;padding:0 18px;font:700 14px system-ui;cursor:pointer;}'
      + '.ffc-send:disabled{opacity:.5;}'
      + '.ffc-dots span{display:inline-block;width:6px;height:6px;margin:0 1px;border-radius:50%;background:#9bbfa9;animation:ffcb 1s infinite;}'
      + '.ffc-dots span:nth-child(2){animation-delay:.2s;}.ffc-dots span:nth-child(3){animation-delay:.4s;}'
      + '@keyframes ffcb{0%,80%,100%{opacity:.3;}40%{opacity:1;}}';
    var s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
  }

  // --- tiny, safe markdown → HTML for the coach's replies (readability) ---
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function inlineMd(s) {
    return s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>")
      .replace(/`([^`]+?)`/g, "<code>$1</code>");
  }
  function mdToHtml(src) {
    var lines = esc(src).split(/\r?\n/), out = [], list = null, para = [];
    function flushPara() { if (para.length) { out.push("<p>" + para.join("<br>") + "</p>"); para = []; } }
    function closeList() { if (list) { out.push("</" + list + ">"); list = null; } }
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      var ol = ln.match(/^\s*\d+\.\s+(.*)$/), ul = ln.match(/^\s*[-*•]\s+(.*)$/), h = ln.match(/^\s*#{1,6}\s+(.*)$/);
      if (ol) { flushPara(); if (list !== "ol") { closeList(); list = "ol"; out.push("<ol>"); } out.push("<li>" + inlineMd(ol[1]) + "</li>"); continue; }
      if (ul) { flushPara(); if (list !== "ul") { closeList(); list = "ul"; out.push("<ul>"); } out.push("<li>" + inlineMd(ul[1]) + "</li>"); continue; }
      closeList();
      if (ln.trim() === "") { flushPara(); continue; }
      if (h) { flushPara(); out.push("<p class='h'><strong>" + inlineMd(h[1]) + "</strong></p>"); continue; }
      para.push(inlineMd(ln));
    }
    flushPara(); closeList();
    return out.join("");
  }
  function render(d, role, text) {
    if (role === "bot") d.innerHTML = mdToHtml(text); else d.textContent = text;
  }
  function bubble(role, text) {
    var d = document.createElement("div");
    d.className = "ffc-msg " + role; render(d, role, text);
    log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
  }

  function degradedState() {
    log.innerHTML = "";
    bubble("bot", "I'm your Yardsmith coach — I work from your own numbers (macros, training log, 7-iron speed and your Score) to give specific, golf-smart advice.");
    var note = document.createElement("div");
    note.className = "ffc-msg note";
    note.innerHTML = signedIn()
      ? "The coach turns on once the backend is deployed. Everything else in the app works now."
      : "Sign in so the coach can read your plan — it's <b>free</b>, one tap, no password. Full access.";
    log.appendChild(note);
    if (!signedIn()) {
      var btn = document.createElement("button");
      btn.className = "ffc-cta";
      btn.style.alignSelf = "center";
      btn.textContent = "Sign in — it's free";
      btn.onclick = function () {
        if (window.FF && window.FF.signIn) window.FF.signIn();
        else { close(); var t = document.querySelector('[data-view="account"]'); if (t) t.click(); }
      };
      log.appendChild(btn);
    }
    setComposer(false);
  }
  function setComposer(on) {
    input.disabled = !on; sendBtn.disabled = !on;
    input.placeholder = on ? "Ask a follow-up…" : "Sign in to chat";
  }

  function setCtx(label) {
    var c = sheet.querySelector(".ffc-ctx");
    c.textContent = label || "Personal to your plan";
  }

  function open(label) {
    wrap.classList.add("open"); document.body.style.overflow = "hidden";
    setCtx(label);
    if (!signedIn() || !backendReady()) { degradedState(); return; }
    if (!log.children.length) bubble("bot", "What do you want to work on? I've got your numbers loaded.");
    setComposer(true);
    setTimeout(function () { if (!input.disabled) input.focus(); }, 250);
  }
  function close() { wrap.classList.remove("open"); document.body.style.overflow = ""; }

  async function send(explicit) {
    if (busy) return;
    var text = (explicit != null ? explicit : (input.value || "")).trim();
    if (!text) return;
    if (!signedIn() || !backendReady()) { degradedState(); return; }
    input.value = ""; bubble("user", text);
    history.push({ role: "user", content: text });
    busy = true; sendBtn.disabled = true;
    var typing = bubble("bot", "");
    typing.innerHTML = '<span class="ffc-dots"><span></span><span></span><span></span></span>';
    var acc = "", started = false;
    try {
      var token = await window.FF.getAccessToken();
      if (!token) { typing.textContent = "Your session expired — sign in again on the You tab."; busy = false; return; }
      var ctx = context();
      var res = await fetch(window.FF.supabaseUrl + FN_PATH, {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "apikey": window.FF.anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: history.slice(-8),
          profile: ctx.profile, targets: ctx.targets, score: ctx.score, recentLog: ctx.recentLog })
      });
      if (res.status === 402) {
        var j = await res.json().catch(function () { return {}; });
        typing.classList.remove("bot"); typing.classList.add("note");
        typing.innerHTML = j.message || "The coach is temporarily unavailable — try again shortly.";
        busy = false; return;
      }
      if (res.status === 401) { typing.textContent = "Please sign in again (You tab)."; busy = false; return; }
      if (!res.ok || !res.body) {
        var errBody = "";
        try { errBody = (await res.text()).slice(0, 160); } catch (e) {}
        typing.classList.remove("bot"); typing.classList.add("note");
        typing.textContent = "Coach error (HTTP " + res.status + ")" + (errBody ? ": " + errBody : "") + ".";
        busy = false; return;
      }
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = "";
      while (true) {
        var chunk = await reader.read(); if (chunk.done) break;
        buf += dec.decode(chunk.value, { stream: true });
        var idx;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          var line = buf.slice(0, idx).replace(/^data: /, ""); buf = buf.slice(idx + 2);
          if (!line) continue;
          try {
            var ev = JSON.parse(line);
            if (ev.text) { if (!started) { typing.textContent = ""; started = true; } acc += ev.text; typing.innerHTML = mdToHtml(acc); log.scrollTop = log.scrollHeight; }
            else if (ev.error && !started) typing.textContent = "Sorry — the coach hit an error. Try again.";
          } catch (e) {}
        }
      }
      if (!acc) typing.textContent = "Sorry — I didn't catch that. Try rephrasing?";
      else history.push({ role: "assistant", content: acc });
    } catch (e) {
      typing.classList.remove("bot"); typing.classList.add("note");
      typing.innerHTML = "Couldn't reach the coach (network/CORS). If you've deployed it, re-run the deploy after the latest fix, and check the function is set to <b>verify_jwt = false</b>.";
    } finally {
      busy = false; sendBtn.disabled = false; if (!input.disabled) input.focus();
    }
  }

  function mount() {
    injectStyles();
    wrap = document.createElement("div"); wrap.className = "ffc-wrap";
    wrap.innerHTML =
      '<div class="ffc-sheet">'
      + '<div class="ffc-grab"></div>'
      + '<div class="ffc-head"><div><h3>⛳ Yardsmith Coach</h3><div class="ffc-ctx">Personal to your plan</div></div>'
      + '<button class="ffc-x" aria-label="Close">×</button></div>'
      + '<div class="ffc-log"></div>'
      + '<div class="ffc-in"><textarea rows="1" placeholder="Ask a follow-up…"></textarea><button class="ffc-send">Send</button></div>'
      + '</div>';
    document.body.appendChild(wrap);
    sheet = wrap.querySelector(".ffc-sheet");
    log = wrap.querySelector(".ffc-log");
    input = wrap.querySelector("textarea");
    sendBtn = wrap.querySelector(".ffc-send");
    wrap.querySelector(".ffc-x").addEventListener("click", close);
    wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });
    sendBtn.addEventListener("click", function () { send(); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
    input.addEventListener("input", function () { input.style.height = "auto"; input.style.height = Math.min(96, input.scrollHeight) + "px"; });
    window.addEventListener("ff-auth", function () { if (wrap.classList.contains("open")) open(sheet.querySelector(".ffc-ctx").textContent); });

    window.FFCoach = {
      ready: function () { return true; },
      open: function (label) { open(label || "Personal to your plan"); },
      ask: function (prompt, label) {
        history = [];                 // fresh contextual thread
        wrap.classList.add("open"); document.body.style.overflow = "hidden";
        setCtx(label || "Personal to your plan");
        if (signedIn() && backendReady()) { log.innerHTML = ""; setComposer(true); send(prompt); }
        else degradedState();         // signed out / not deployed → explain, don't blank
      }
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
