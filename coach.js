/* ============================================================================
   FairwayFuel — AI woven through the app (no corner bubble).

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
      + '.ffc-sheet{background:#f7faf7;width:100%;max-width:560px;height:78vh;max-height:78vh;border-radius:20px 20px 0 0;'
      + 'display:flex;flex-direction:column;overflow:hidden;transform:translateY(26px);transition:transform .22s;}'
      + '.ffc-wrap.open .ffc-sheet{transform:none;}'
      + '.ffc-head{background:linear-gradient(160deg,#0f2417,#14532d);color:#fff;padding:14px 18px;display:flex;'
      + 'align-items:center;justify-content:space-between;}'
      + '.ffc-head h3{margin:0;font-size:15px;display:flex;align-items:center;gap:8px;}'
      + '.ffc-head .ffc-ctx{margin:2px 0 0;font-size:11px;color:#bfe6cd;}'
      + '.ffc-x{background:rgba(255,255,255,.14);border:0;color:#fff;width:30px;height:30px;border-radius:50%;font-size:16px;cursor:pointer;}'
      + '.ffc-log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:11px;}'
      + '.ffc-msg{max-width:88%;padding:11px 14px;border-radius:14px;font-size:14px;line-height:1.5;white-space:pre-wrap;}'
      + '.ffc-msg.user{align-self:flex-end;background:#11643a;color:#fff;border-bottom-right-radius:5px;}'
      + '.ffc-msg.bot{align-self:flex-start;background:#fff;color:#16301f;border:1px solid #dce8e0;border-bottom-left-radius:5px;}'
      + '.ffc-msg.note{align-self:center;background:#eef6f0;color:#3f6450;font-size:12.5px;text-align:center;max-width:96%;}'
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

  function bubble(role, text) {
    var d = document.createElement("div");
    d.className = "ffc-msg " + role; d.textContent = text;
    log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
  }

  function degradedState() {
    log.innerHTML = "";
    bubble("bot", "I'm your FairwayFuel coach — I work from your own numbers (macros, training log, 7-iron speed and your Score) to give specific, golf-smart advice.");
    var note = document.createElement("div");
    note.className = "ffc-msg note";
    note.innerHTML = signedIn()
      ? "The coach is part of <b>FairwayFuel Pro</b> — almost ready. You'll start a free trial right here soon."
      : "Sign in (the <b>You</b> tab) so the coach can read your plan.";
    log.appendChild(note);
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
        typing.innerHTML = (j.message || "The coach is part of FairwayFuel Pro.") + "<br><br><b>Pro is almost here</b> — you're on the early-access list.";
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
            if (ev.text) { if (!started) { typing.textContent = ""; started = true; } acc += ev.text; typing.textContent = acc; log.scrollTop = log.scrollHeight; }
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
      + '<div class="ffc-head"><div><h3>⛳ FairwayFuel Coach</h3><div class="ffc-ctx">Personal to your plan</div></div>'
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
