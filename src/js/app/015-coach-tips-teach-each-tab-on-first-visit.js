  /* ===================== COACH TIPS — teach each tab on first visit =====================
     A new user (the friend who "missed it completely") gets a one-time, dismissible
     banner the first time they open each tab: what the page is for + its key action.
     The Home tab, when signed out, becomes a sign-in nudge so people actually log in
     and the AI features turn on. Seen tips are remembered in ff_tips_seen (and synced). */
  function ffSignedIn(){ return !!(window.FF && window.FF.user); }
  var FF_TIPS = {
    dash:    { key:"dash",  ic:"🏠", t:"This is your home base",
      b:"Your daily <b>Octane score</b>, a coach's read, and quick tiles into every part of the app live here. Tap any tile to dive in." },
    calc:    { key:"calc",  ic:"🍽️", t:"Fuel — your meals & macros",
      b:"Set your numbers once, then tap <b>“Build my day”</b> for a full day of meals and a shopping list built around your favorite foods." },
    plan:    { key:"plan",  ic:"🏋️", t:"Train — your 20-week speed plan",
      b:"Each session starts with the <b>warm-up + daily power</b> work (the amber box) — don't skip it, that's where clubhead speed is made." },
    progress:{ key:"prog",  ic:"📈", t:"Stats — track it to grow it",
      b:"Log your <b>lifts, bodyweight and 7-iron speed</b> here. Every entry feeds your Octane so you can watch the trend climb." },
    gameday: { key:"gday",  ic:"⛳", t:"Game Day — fuel your round",
      b:"Enter your tee time and we build a <b>timed plan</b>: pre-round meal, first-tee warm-up, on-course fueling and the turn snack." },
    account: { key:"acct",  ic:"☁", t:"You — sign in to unlock everything",
      b:"Sign in (free, one tap, no password) to <b>back up your progress</b> across devices and turn on the <b>AI coach</b>." }
  };
  // Home tab while signed out → make it the sign-in nudge instead of the generic home tip.
  var FF_TIP_SIGNIN = { key:"signin", cls:"tip-signin", ic:"👋", t:"New here? Sign in first",
    b:"It's <b>free</b> and takes one tap (email link, no password). Signing in turns on the <b>AI coach</b> and saves your progress across devices.",
    cta:"Sign in — it's free" };
  // ---- Install-to-home-screen controller ----
  // Android/desktop Chrome fire beforeinstallprompt; we capture it so a tap can show the
  // real native install sheet (instead of telling people to dig through a menu). iOS has
  // no API, so there we show the Share → Add to Home Screen steps.
  function ffStandalone(){ try{ return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone===true; }catch(e){ return false; } }
  function ffIsIOS(){ return /iPad|iPhone|iPod/.test(navigator.userAgent||"") && !window.MSStream; }
  var ffDeferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function(e){
    e.preventDefault(); ffDeferredPrompt = e;
    // The event can land after first paint — refresh the install affordances so the
    // one-tap button appears.
    try{ var av=document.querySelector(".view.active"); if(av) showTipFor(av.id.replace("view-","")); }catch(_){}
    try{ if($("view-account") && $("view-account").classList.contains("active")) renderAccount(); }catch(_){}
  });
  window.addEventListener("appinstalled", function(){ ffDeferredPrompt = null; });
  function ffPromptInstall(){
    if(!ffDeferredPrompt) return false;
    var p = ffDeferredPrompt; ffDeferredPrompt = null;
    try{ p.prompt(); if(p.userChoice) p.userChoice.then(function(){}); }catch(e){}
    return true;
  }
  function ffInstallTip(){
    if(ffStandalone()) return null;
    var seen = lsGet("ff_tips_seen", []); if(seen.indexOf("install")>=0) return null;
    if(ffIsIOS()){
      return { key:"install", cls:"tip-install", ic:"📲", t:"Keep FairwayFuel one tap away",
        b:"Tap the <b>Share</b> icon (□ with ↑) in Safari's bar, then <b>“Add to Home Screen.”</b> It installs like a real app and works offline." };
    }
    if(ffDeferredPrompt){
      return { key:"install", cls:"tip-install", ic:"📲", t:"Install FairwayFuel",
        b:"Add it to your home screen — opens full-screen, works offline, always one tap away.",
        cta:"Install app", ctaAction:"install" };
    }
    return { key:"install", cls:"tip-install", ic:"📲", t:"Keep FairwayFuel one tap away",
      b:"In your browser menu, tap <b>“Install app”</b> / <b>“Add to Home Screen.”</b> It works offline like a real app." };
  }
  function ffTipHtml(tip){
    if(!tip) return '';
    var seen = lsGet("ff_tips_seen", []);
    if(seen.indexOf(tip.key) >= 0) return '';
    return '<div class="tip'+(tip.cls?' '+tip.cls:'')+'" data-tipkey="'+tip.key+'">'+
      '<span class="tip-ic">'+tip.ic+'</span>'+
      '<div class="tip-tx"><div class="tip-t">'+tip.t+'</div><div class="tip-b">'+tip.b+'</div>'+
      (tip.cta ? '<button type="button" class="tip-cta" data-tipcta="'+(tip.ctaAction||'signin')+'">'+tip.cta+'</button>' : '')+
      '</div>'+
      '<button type="button" class="tip-x" data-tipclose="'+tip.key+'" aria-label="Dismiss">×</button></div>';
  }
  // Home renders its own tip INSIDE the dash flow (below the next-up card) so
  // the nudge never outranks the action — and re-renders keep it consistent.
  function dashTipHtml(){
    var tip = !ffSignedIn() ? FF_TIP_SIGNIN : (ffInstallTip() || FF_TIPS.dash);
    return ffTipHtml(tip);
  }
  function showTipFor(view){
    if(view==="dash") return;   // Home owns its tip inline (renderDash)
    var host = document.getElementById("view-"+view); if(!host) return;
    var old = host.querySelector(":scope > .tip"); if(old) old.remove();
    if(view==="account" && ffSignedIn()) return;   // "sign in to unlock" would be wrong
    var html = ffTipHtml(FF_TIPS[view]);
    if(!html) return;
    var el = document.createElement("div");
    el.innerHTML = html;
    host.insertBefore(el.firstChild, host.firstChild);
  }
  function ffSeeTip(key){ var s=lsGet("ff_tips_seen", []); if(s.indexOf(key)<0){ s.push(key); lsSet("ff_tips_seen", s); } }
  // One delegated handler for every tip's close button + the sign-in CTA.
  document.addEventListener("click", function(e){
    var x = e.target.closest("[data-tipclose]");
    if(x){ var t=x.closest(".tip"); ffSeeTip(x.getAttribute("data-tipclose")); if(t) t.remove(); try{ persist(); }catch(_){} return; }
    var c = e.target.closest("[data-tipcta]");
    if(c){
      var act = c.getAttribute("data-tipcta");
      if(act==="install"){ ffPromptInstall(); }
      else { if(window.FF&&window.FF.signIn) window.FF.signIn(); else setView("account"); }
    }
  });
  function setView(view, scroll){
    var apply=function(){
      [tabs, mobileTabs].forEach(function(bar){
        Array.prototype.forEach.call(bar.querySelectorAll("button"), function(b){
          b.classList.toggle("active", b.getAttribute("data-view")===view);
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll(".view"), function(v){
        v.classList.toggle("active", v.id === "view-" + view);
      });
      if(view==="dash") { try{ renderDash(); }catch(e){} }
      if(view==="calc") { try{ ffRefreshCalcTrainTime(); }catch(e){} }
      if(view==="account") { try{ renderAccount(); }catch(e){} }
      if(view==="progress") { try{ renderProgress(); }catch(e){} }
      if(view==="gameday") { try{ renderGameDay(); }catch(e){} }
      try{ showTipFor(view); }catch(e){}
    };
    // Cross-fade between tabs — an instant swap reads cheap. Falls back to the
    // plain swap where the View Transitions API is missing or motion is reduced.
    var wasActive=document.querySelector(".view.active");
    var changing=!wasActive || wasActive.id!=="view-"+view;
    try{
      if(changing && document.startViewTransition && !ffReduced()) document.startViewTransition(apply);
      else apply();
    }catch(e){ apply(); }
    if(scroll!==false) window.scrollTo({ top: 0, behavior: "smooth" });
    try { persist(); } catch(e){}
  }
  [tabs, mobileTabs].forEach(function(bar){
    bar.addEventListener("click", function(e){
      var btn=e.target.closest("button"); if(!btn) return;
      setView(btn.getAttribute("data-view"));
    });
  });
  // Any [data-goview] button anywhere navigates — one delegated handler so
  // drill-in actions (Octane "Go lift ›" etc.) work on every view, not just
  // wherever a local listener happened to cover.
  document.addEventListener("click", function(e){
    var t=e.target.closest("[data-goview]");
    if(t) setView(t.getAttribute("data-goview"));
  });
  // The brand wordmark is a home button.
  var wordmark=$("wordmark");
  if(wordmark) wordmark.addEventListener("click", function(){ setView("dash"); });

  // Installed-app refresh: standalone PWAs have no browser reload, so after the magic-link
  // login (or any time you want fresh data) this re-runs the app. Only shown when installed.
  if(ffStandalone()) document.body.classList.add("ff-standalone");
  var appRefresh=$("appRefresh");
  if(appRefresh) appRefresh.addEventListener("click", function(){
    appRefresh.classList.add("spin");
    try{ if(window.FF && window.FF.user) {} }catch(e){}
    try{ if("serviceWorker" in navigator){ navigator.serviceWorker.getRegistration().then(function(r){ if(r) r.update(); }); } }catch(e){}
    setTimeout(function(){ location.reload(); }, 350);
  });
