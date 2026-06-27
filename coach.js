/* ============================================================================
   FairwayFuel — AI Coach chat (client).

   Injects a floating "Ask Coach" launcher + chat panel. When the user is signed
   in (via cloud-sync.js), it calls the `ai-coach` Supabase Edge Function with the
   user's JWT and a compact snapshot of THEIR data (profile, macro targets, recent
   log) and streams the answer back.

   The Anthropic API key lives only in the Edge Function — never here. This file
   only ever holds the user's own access token + the public anon key.

   Until the backend is deployed (or the user subscribes), it degrades gracefully:
   it explains what the coach is and prompts sign-in / early access — the rest of
   the app is untouched.
   ============================================================================ */
(function () {
  "use strict";

  var FN_PATH = "/functions/v1/ai-coach";
  var history = [];          // [{role, content}]
  var busy = false;
  var panel, log, input, sendBtn;

  // ---- Context the coach reads from the app (the user's own numbers) ----
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function context() {
    var body = lsGet("ff_body") || [];
    var logObj = lsGet("ff_log") || {};
    return {
      profile: lsGet("fairwayfuel"),
      targets: lsGet("ff_targets"),
      score: lsGet("ff_score"),          // FairwayFuel Score + pillar breakdown
      recentLog: {
        week: lsGet("ff_week") || 1,
        sessionsLogged: Object.keys(logObj).length,
        body: body.slice(-6)             // recent bodyweight + 7-iron speed entries
      }
    };
  }

  function signedIn() { return !!(window.FF && window.FF.user); }
  function backendReady() { return !!(window.FF && window.FF.supabaseUrl); }

  // ---- UI ----
  function injectStyles() {
    var css = ''
      + '.ffc-fab{position:fixed;right:14px;bottom:16px;z-index:70;display:inline-flex;align-items:center;gap:8px;'
      + 'background:#11643a;color:#fff;border:0;border-radius:999px;padding:13px 17px;font:700 13.5px system-ui,sans-serif;'
      + 'cursor:pointer;box-shadow:0 6px 20px rgba(8,40,22,.32);}'
      + '.ffc-fab:active{transform:translateY(1px);}'
      + '.ffc-fab .d{width:7px;height:7px;border-radius:50%;background:#7be0a0;box-shadow:0 0 0 0 rgba(123,224,160,.7);}'
      + '.ffc-wrap{position:fixed;inset:0;background:rgba(8,24,15,.5);z-index:80;display:flex;align-items:flex-end;'
      + 'justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;}'
      + '.ffc-wrap.open{opacity:1;pointer-events:auto;}'
      + '.ffc-panel{background:#f7faf7;width:100%;max-width:560px;height:80vh;max-height:80vh;border-radius:20px 20px 0 0;'
      + 'display:flex;flex-direction:column;overflow:hidden;transform:translateY(24px);transition:transform .22s;}'
      + '.ffc-wrap.open .ffc-panel{transform:none;}'
      + '.ffc-head{background:linear-gradient(160deg,#0f2417,#14532d);color:#fff;padding:15px 18px;display:flex;'
      + 'align-items:center;justify-content:space-between;}'
      + '.ffc-head h3{margin:0;font-size:16px;display:flex;align-items:center;gap:8px;}'
      + '.ffc-head p{margin:2px 0 0;font-size:11.5px;color:#bfe6cd;}'
      + '.ffc-x{background:rgba(255,255,255,.14);border:0;color:#fff;width:30px;height:30px;border-radius:50%;font-size:16px;cursor:pointer;}'
      + '.ffc-log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:11px;}'
      + '.ffc-msg{max-width:85%;padding:11px 14px;border-radius:14px;font-size:14px;line-height:1.5;white-space:pre-wrap;}'
      + '.ffc-msg.user{align-self:flex-end;background:#11643a;color:#fff;border-bottom-right-radius:5px;}'
      + '.ffc-msg.bot{align-self:flex-start;background:#fff;color:#16301f;border:1px solid #dce8e0;border-bottom-left-radius:5px;}'
      + '.ffc-msg.note{align-self:center;background:#eef6f0;color:#3f6450;font-size:12.5px;text-align:center;max-width:95%;}'
      + '.ffc-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 16px 10px;}'
      + '.ffc-chip{background:#eaf3ec;border:1px solid #cfe5d6;color:#1c5a37;border-radius:999px;padding:8px 12px;'
      + 'font-size:12px;cursor:pointer;}'
      + '.ffc-in{display:flex;gap:8px;padding:12px;border-top:1px solid #e2ece5;background:#fff;}'
      + '.ffc-in textarea{flex:1;resize:none;border:1.5px solid #cdddd2;border-radius:12px;padding:11px 13px;'
      + 'font:15px system-ui;max-height:96px;}'
      + '.ffc-send{background:#11643a;color:#fff;border:0;border-radius:12px;padding:0 18px;font:700 14px system-ui;cursor:pointer;}'
      + '.ffc-send:disabled{opacity:.5;}'
      + '.ffc-cta{background:#11643a;color:#fff;border:0;border-radius:10px;padding:11px 16px;font:700 14px system-ui;cursor:pointer;margin-top:4px;}'
      + '.ffc-dots span{display:inline-block;width:6px;height:6px;margin:0 1px;border-radius:50%;background:#9bbfa9;animation:ffcb 1s infinite;}'
      + '.ffc-dots span:nth-child(2){animation-delay:.2s;} .ffc-dots span:nth-child(3){animation-delay:.4s;}'
      + '@keyframes ffcb{0%,80%,100%{opacity:.3;}40%{opacity:1;}}'
      + '@media(max-width:600px){.ffc-fab{bottom:74px;}}';   // clear the bottom tab bar on mobile
    var s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
  }

  function bubble(role, text) {
    var d = document.createElement("div");
    d.className = "ffc-msg " + role;
    d.textContent = text;
    log.appendChild(d); log.scrollTop = log.scrollHeight;
    return d;
  }

  var STARTERS = [
    "Build me today's meals from my macros",
    "Read my log — am I progressing?",
    "How do I raise my FairwayFuel Score?",
    "What should I eat before a round?"
  ];

  function greet() {
    log.innerHTML = "";
    if (!backendReady() || !signedIn()) {
      bubble("bot", "I'm your FairwayFuel coach. I read your own numbers — macro targets, training log, and 7-iron speed — and give you specific, golf-smart advice on what to eat and how to train.");
      var note = document.createElement("div");
      note.className = "ffc-msg note";
      note.innerHTML = signedIn()
        ? "The coach is part of <b>FairwayFuel Pro</b> — almost ready. You'll be able to start a free trial here soon."
        : "Sign in to use the coach so it can sync to your plan.";
      log.appendChild(note);
      if (!signedIn() && window.FF && window.FF.signIn) {
        var btn = document.createElement("button");
        btn.className = "ffc-cta"; btn.textContent = "☁ Sign in to save";
        btn.onclick = function () { window.FF.signIn(); };
        var wrap = document.createElement("div"); wrap.style.textAlign = "center"; wrap.appendChild(btn);
        log.appendChild(wrap);
      }
      setComposer(false);
      return;
    }
    bubble("bot", "Hey — I'm your FairwayFuel coach. Ask me what to eat to hit your macros, how to adapt a session, or whether your log shows real progress. I'm working from your own numbers.");
    renderChips();
    setComposer(true);
  }

  function renderChips() {
    var old = panel.querySelector(".ffc-chips"); if (old) old.remove();
    var row = document.createElement("div"); row.className = "ffc-chips";
    STARTERS.forEach(function (s) {
      var c = document.createElement("button"); c.className = "ffc-chip"; c.textContent = s;
      c.onclick = function () { input.value = s; send(); };
      row.appendChild(c);
    });
    panel.insertBefore(row, panel.querySelector(".ffc-in"));
  }

  function setComposer(on) {
    input.disabled = !on; sendBtn.disabled = !on;
    input.placeholder = on ? "Ask your coach…" : "Sign in to chat with your coach";
  }

  async function send() {
    if (busy) return;
    var text = (input.value || "").trim();
    if (!text) return;
    if (!signedIn() || !backendReady()) { greet(); return; }
    var chips = panel.querySelector(".ffc-chips"); if (chips) chips.remove();

    input.value = ""; bubble("user", text);
    history.push({ role: "user", content: text });
    busy = true; sendBtn.disabled = true;

    var typing = bubble("bot", "");
    typing.innerHTML = '<span class="ffc-dots"><span></span><span></span><span></span></span>';
    var acc = "", started = false;

    try {
      var token = await window.FF.getAccessToken();
      if (!token) { typing.textContent = "Your session expired — please sign in again."; busy = false; return; }
      var ctx = context();
      var res = await fetch(window.FF.supabaseUrl + FN_PATH, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "apikey": window.FF.anonKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: text,
          history: history.slice(-8),
          profile: ctx.profile, targets: ctx.targets, recentLog: ctx.recentLog
        })
      });

      if (res.status === 402) {
        var j = await res.json().catch(function () { return {}; });
        typing.classList.remove("bot"); typing.classList.add("note");
        typing.innerHTML = (j.message || "The coach is part of FairwayFuel Pro.") + "<br><br><b>Pro is almost here</b> — you're on the early-access list.";
        busy = false; return;
      }
      if (res.status === 401) { typing.textContent = "Please sign in again to use the coach."; busy = false; return; }
      if (!res.ok || !res.body) { throw new Error("HTTP " + res.status); }

      var reader = res.body.getReader(), dec = new TextDecoder(), buf = "";
      while (true) {
        var chunk = await reader.read();
        if (chunk.done) break;
        buf += dec.decode(chunk.value, { stream: true });
        var idx;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          var line = buf.slice(0, idx).replace(/^data: /, ""); buf = buf.slice(idx + 2);
          if (!line) continue;
          try {
            var ev = JSON.parse(line);
            if (ev.text) { if (!started) { typing.textContent = ""; started = true; } acc += ev.text; typing.textContent = acc; log.scrollTop = log.scrollHeight; }
            else if (ev.error) { if (!started) typing.textContent = "Sorry — the coach hit an error. Try again."; }
          } catch (e) {}
        }
      }
      if (!acc) typing.textContent = "Sorry — I didn't catch that. Try rephrasing?";
      else history.push({ role: "assistant", content: acc });
    } catch (e) {
      typing.classList.remove("bot"); typing.classList.add("note");
      typing.innerHTML = "The coach isn't live yet — the AI backend is still being set up. Everything else in the app works offline as usual.";
    } finally {
      busy = false; sendBtn.disabled = false; input.focus();
    }
  }

  function open() { panel.parentNode.classList.add("open"); document.body.style.overflow = "hidden"; greet(); setTimeout(function () { if (!input.disabled) input.focus(); }, 250); }
  function close() { panel.parentNode.classList.remove("open"); document.body.style.overflow = ""; }

  function mount() {
    injectStyles();
    var fab = document.createElement("button");
    fab.className = "ffc-fab"; fab.type = "button";
    fab.innerHTML = '<span class="d"></span>💬 Ask Coach';
    fab.addEventListener("click", open);
    document.body.appendChild(fab);

    var wrap = document.createElement("div"); wrap.className = "ffc-wrap";
    wrap.innerHTML =
      '<div class="ffc-panel">'
      + '<div class="ffc-head"><div><h3>⛳ FairwayFuel Coach</h3><p>Personal to your plan · powered by AI</p></div>'
      + '<button class="ffc-x" aria-label="Close">×</button></div>'
      + '<div class="ffc-log"></div>'
      + '<div class="ffc-in"><textarea rows="1" placeholder="Ask your coach…"></textarea>'
      + '<button class="ffc-send">Send</button></div>'
      + '</div>';
    document.body.appendChild(wrap);

    panel = wrap.querySelector(".ffc-panel");
    log = wrap.querySelector(".ffc-log");
    input = wrap.querySelector("textarea");
    sendBtn = wrap.querySelector(".ffc-send");

    wrap.querySelector(".ffc-x").addEventListener("click", close);
    wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });
    sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
    input.addEventListener("input", function () { input.style.height = "auto"; input.style.height = Math.min(96, input.scrollHeight) + "px"; });

    // Re-render greeting when auth changes while the panel is open.
    window.addEventListener("ff-auth", function () { if (panel.parentNode.classList.contains("open")) greet(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
