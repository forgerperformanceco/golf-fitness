  /* ===================== ACCESS — the free week, then Yardsmith Pro =====================
     Plan of record (YARDSMITH-BRAIN §9, Oct 2026): free download → a FREE WEEK →
     Yardsmith Pro ($14.99/mo · $79.99/yr). OFF until store billing is live:
     with FF_PAYWALL false, ffAccess() is "full" for everyone and nothing below
     changes what anyone sees.

     When it's on, three states:
       "preview" — the first 7 calendar days. Each workout opens ON ITS DAY: future
                   days are locked teasers (type + minutes, no exercise list), no
                   Full-week browse, no jumping weeks, no logging ahead. The whole
                   program is one repeated week, so hiding the rest of week 1 is
                   what keeps it from being read in one sitting.
       "locked"  — day 8+, not subscribed. Workouts, speed tests and the coach
                   open the Pro sheet. Everything already logged stays readable.
       "full"    — subscribed (or the switch is off).

     The free-week clock (ff_free_week) roams and merges EARLIEST-wins, and the
     oldest logged workout also counts — restarting the plan or reinstalling
     and signing back in doesn't buy a second free week.
     Test on any device: ?paywall=1 turns it on for this tab session, ?paywall=0 off. */
  var FF_PAYWALL=false;            // master switch — flip on only once FFBilling exists on every platform
  var FF_FREE_DAYS=7;
  var FF_PRICES={                  // display defaults; a store bridge (FFBilling.prices) overrides with localized prices
    annual:  { price:"$79.99", per:"/ year",  note:"$6.67 a month · 7-day free trial", tag:"Best value" },
    monthly: { price:"$14.99", per:"/ month", note:"Cancel any time" }
  };
  var FF_TERMS_URL="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
  (function(){
    var m=/(?:^|[?&])paywall=([01])/.exec(String(location.search||""));
    if(m) try{ if(m[1]==="1") sessionStorage.setItem("ff_paywall_test","1"); else sessionStorage.removeItem("ff_paywall_test"); }catch(_){}
  })();
  var ffPwPlan="annual";

  function ffPaywallOn(){
    if(FF_PAYWALL) return true;
    try{ return sessionStorage.getItem("ff_paywall_test")==="1"; }catch(_){ return false; }
  }
  // The free week starts the first time a set-up user is seen (stamped once) —
  // or earlier, if they have older workouts.
  function ffFreeWeekStart(){
    var t=lsGet("ff_free_week",0)||0, h=lsGet("ff_history",[]);
    if(Array.isArray(h)) h.forEach(function(e){
      var x=e && (e.doneTs||e.ts);
      if(typeof x==="number" && x>0 && (!t || x<t)) t=x;
    });
    return t||null;
  }
  function ffStampFreeWeek(){
    if(lsGet("ff_onboarded",false) && !lsGet("ff_free_week",0)) lsSet("ff_free_week", Date.now());
  }
  function ffFreeDaysLeft(){
    var s=ffFreeWeekStart(); if(!s) return FF_FREE_DAYS;
    var a=new Date(s); a.setHours(0,0,0,0);
    var b=new Date(); b.setHours(0,0,0,0);
    return Math.max(0, FF_FREE_DAYS-Math.round((b-a)/864e5));
  }
  // Subscribed? A native store bridge answers first (StoreKit / Play Billing via
  // FFBilling, added with the store builds); otherwise the server's own answer
  // (public.is_subscribed, webhook-written), cached so it works offline.
  function ffIsPro(){
    try{ if(window.FFBilling && typeof window.FFBilling.isPro==="function" && window.FFBilling.isPro()) return true; }catch(_){}
    var c=lsGet("ff_pro",null);
    return !!(c && c.pro);
  }
  function ffAccess(){
    if(!ffPaywallOn() || ffIsPro()) return "full";
    return ffFreeDaysLeft()>0 ? "preview" : "locked";
  }
  function ffRefreshPro(){
    var F=window.FF; if(!ffPaywallOn() || !F || !F.getAccessToken) return Promise.resolve(ffIsPro());
    return F.getAccessToken().then(function(tok){
      if(!tok) return ffIsPro();
      return fetch(F.supabaseUrl+"/rest/v1/rpc/is_subscribed", {
        method:"POST", body:"{}",
        headers:{ apikey:F.anonKey, Authorization:"Bearer "+tok, "Content-Type":"application/json" }
      }).then(function(r){ return r.ok ? r.json() : null; }).then(function(pro){
        if(typeof pro!=="boolean") return ffIsPro();
        var was=ffIsPro();
        lsSet("ff_pro", { pro:pro, ts:Date.now() });
        if(was!==pro) ffAccessRerender();
        return pro;
      });
    }).catch(function(){ return ffIsPro(); });
  }
  function ffAccessRerender(){
    try{ renderPhase(); }catch(_){}
    try{ renderDash(); }catch(_){}
    try{ if(typeof renderAccount==="function") renderAccount(); }catch(_){}
  }

  /* ---- Gates (called at the top of each entry point) ---- */
  // Starting a workout: free-week days open on their date; after the week, Pro.
  // Finishing a session that was already started is always allowed.
  function ffCanStartWorkout(dayName, resuming){
    var a=ffAccess();
    if(a==="full" || resuming) return true;
    if(a==="locked"){ ffPaywallOpen("workout"); return false; }
    if(isFutureDay(dayName)){ ffToast("This one opens on its day — during your free week each workout unlocks on schedule."); return false; }
    return true;
  }
  function ffCanUse(what){
    if(ffAccess()!=="locked") return true;
    ffPaywallOpen(what); return false;
  }
  // The coach lives in coach.js (outside this bundle): wrap its two entry points.
  function ffGateCoach(){
    var c=window.FFCoach; if(!c || c.__ffGated) return;
    var open=c.open, ask=c.ask;
    c.open=function(){ if(!ffCanUse("coach")) return; return open.apply(c, arguments); };
    c.ask=function(){ if(!ffCanUse("coach")) return; return ask.apply(c, arguments); };
    c.__ffGated=true;
  }
  window.addEventListener("load", ffGateCoach);
  // Signing in asks the server; signing out (or switching accounts) drops the
  // cached answer so one account's Pro never carries over to another.
  window.addEventListener("ff-auth", function(e){
    if(!(e.detail && e.detail.user)){ if(lsGet("ff_pro",null)){ lsSet("ff_pro",null); ffAccessRerender(); } return; }
    ffRefreshPro();
  });

  /* ---- What the gated screens show instead ---- */
  // A free-week day that hasn't arrived: what it is, not what's in it.
  function ffLockedDayHtml(d){
    var dt=dayCalDate(d.name), n=(d.ex||[]).length;
    var when=dt ? dt.toLocaleDateString(undefined,{weekday:"long"}) : "on its day";
    var nm=(d.name.split("—")[1]||d.name).trim();
    return '<div class="pw-day"><div class="pw-day-ic" aria-hidden="true">🔒</div>'+
      '<div class="pw-day-t">'+ffEsc(nm)+'</div>'+
      '<div class="pw-day-s">About '+sessionMinutes(d)+' min'+(n?' · '+n+' exercises':'')+' · opens '+ffEsc(when)+'</div>'+
      '<p class="pw-day-p">During your free week each workout unlocks on its day. With Yardsmith Pro you can see the whole plan and train ahead.</p>'+
      '<button type="button" class="pw-link" data-paywall="preview">See Yardsmith Pro ›</button></div>';
  }
  // After the free week: the one card on Home and Train.
  function ffLockedCardHtml(where){
    var wk=curWeek(), wave=WAVES[waveFor(wk)];
    var tag=where==="home" ? 'button type="button" class="nu-card pw-card" data-paywall="workout"' : 'div class="nu-card pw-card pw-card-train"';
    return '<'+tag+'>'+
      '<div class="nu-kick">Your free week is done</div>'+
      '<div class="nu-title">Keep your plan going</div>'+
      '<div class="nu-sub">Week '+wk+' is '+(/^[AEIOU]/.test(wave.label)?'an ':'a ')+wave.label+' week. From here the app sets every weight from what you lifted — that’s Yardsmith Pro.</div>'+
      (where==="home" ? nuCta("See Yardsmith Pro") : '<button type="button" class="train-today-cta" data-paywall="workout"><span><small>YARDSMITH PRO</small><b>Unlock week '+wk+'</b></span><i>›</i></button>')+
      '</'+(where==="home"?'button':'div')+'>';
  }
  // You tab status card.
  function ffAccessCardHtml(){
    var a=ffAccess();
    if(!ffPaywallOn())
      return '<div class="acct-card"><div class="acct-head">⛳ Free during early access</div>'+
        '<p class="acct-p">You’ve got everything: AI coaching, the full training plan, macro tuning, progress tracking and the leaderboard.</p>'+
        '<div class="acct-plan">Plan: <b>Early access</b> · free</div></div>';
    if(a==="full")
      return '<div class="acct-card"><div class="acct-head">⛳ Yardsmith Pro</div>'+
        '<p class="acct-p">Every workout, your weights set for you, swing-speed tracking and the coach. Manage or cancel any time in your store account.</p>'+
        '<div class="acct-plan">Plan: <b>Pro</b> ✓</div>'+
        '<button class="acct-btn ghost" data-pwrestore="1">Restore purchases</button></div>';
    var left=ffFreeDaysLeft();
    return '<div class="acct-card"><div class="acct-head">⛳ '+(a==="preview"?'Free week · '+left+' day'+(left===1?'':'s')+' left':'Free plan')+'</div>'+
      '<p class="acct-p">'+(a==="preview"
        ? 'Each workout opens on its day this week. After that, Yardsmith Pro keeps the plan going.'
        : 'Your history, Stats, meals and targets stay free. Workouts, speed tests and the coach are Yardsmith Pro.')+'</p>'+
      '<button class="acct-btn" data-paywall="account">See Yardsmith Pro</button>'+
      '<button class="acct-btn ghost" data-pwrestore="1">Restore purchases</button></div>';
  }

  /* ---- The Pro sheet ---- */
  function ffPwPrices(){
    try{ if(window.FFBilling && typeof window.FFBilling.prices==="function"){ var p=window.FFBilling.prices(); if(p && p.annual && p.monthly) return p; } }catch(_){}
    return FF_PRICES;
  }
  function ffPaywallHtml(reason){
    var wk=curWeek(), P=ffPwPrices();
    var head={
      workout:["Your free week is done","Week "+wk+" is ready. From here the app sets every weight from what you actually lifted."],
      coach:["The coach is part of Pro","Ask anything about your plan, your meals or your numbers — answers built on your own logs."],
      speedtest:["Speed tests are part of Pro","Test every two weeks and watch the plan turn into clubhead speed."],
      preview:["See the whole plan","Your free week opens one workout a day. Pro opens everything — and keeps it going for all 20 weeks."]
    }[reason] || ["Yardsmith Pro","The whole 20-week plan, run for you."];
    function opt(k){
      var o=P[k];
      return '<button type="button" class="pw-opt'+(ffPwPlan===k?' on':'')+'" data-pwplan="'+k+'" aria-pressed="'+(ffPwPlan===k)+'">'+
        '<span class="pw-opt-l"><b>'+(k==="annual"?'Yearly':'Monthly')+'</b><small>'+ffEsc(o.note||"")+'</small></span>'+
        '<span class="pw-opt-r"><b>'+ffEsc(o.price)+'</b><small>'+ffEsc(o.per||"")+'</small></span>'+
        (o.tag?'<span class="pw-opt-tag">'+ffEsc(o.tag)+'</span>':'')+'</button>';
    }
    return '<div class="pw-kick">Yardsmith Pro</div>'+
      '<h2 class="pw-h" id="pwTitle">'+head[0]+'</h2><p class="pw-p">'+head[1]+'</p>'+
      '<ul class="pw-list">'+
        '<li>Every workout for 20 weeks — weights set for you, week by week</li>'+
        '<li>Build, heavy and easy weeks, timed for you</li>'+
        '<li>Swing-speed tests and trends</li>'+
        '<li>Your AI coach</li></ul>'+
      '<div class="pw-opts">'+opt("annual")+opt("monthly")+'</div>'+
      '<button type="button" class="pw-go" data-pwbuy="1">'+(ffPwPlan==="annual"?'Start 7-day free trial':'Continue')+'</button>'+
      '<p class="pw-fine">'+(ffPwPlan==="annual"
        ? 'Free for 7 days, then '+ffEsc(P.annual.price)+' a year. '
        : ffEsc(P.monthly.price)+' a month. ')+
        'Renews automatically until you cancel — cancel any time in your store account, at least 24 hours before it renews.</p>'+
      '<p class="pw-keep">Everything you’ve logged stays yours, Pro or not.</p>'+
      '<div class="pw-links"><button type="button" class="pw-link" data-pwrestore="1">Restore purchases</button>'+
        '<a href="'+FF_TERMS_URL+'" target="_blank" rel="noopener">Terms</a>'+
        '<a href="privacy.html" target="_blank" rel="noopener">Privacy</a></div>';
  }
  function ffPaywallEnsure(){
    if($("pwModal")) return;
    var m=document.createElement("div"); m.id="pwModal"; m.className="swap-modal pw-modal"; m.hidden=true;
    m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","pwTitle");
    m.innerHTML='<div class="swap-card"><div class="swap-head"><span>⛳ Yardsmith Pro</span>'+
      '<button class="swap-x" id="pwX" type="button" aria-label="Close">×</button></div><div class="swap-body" id="pwBody"></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", function(e){
      if(e.target===m || e.target.closest("#pwX")){ ffPaywallClose(); return; }
      var pl=e.target.closest("[data-pwplan]");
      if(pl){ ffPwPlan=pl.getAttribute("data-pwplan"); $("pwBody").innerHTML=ffPaywallHtml(m.getAttribute("data-reason")); return; }
      if(e.target.closest("[data-pwbuy]")){ ffStartCheckout(ffPwPlan); return; }
    });
    m.addEventListener("keydown", function(e){ if(e.key==="Escape"){ e.preventDefault(); ffPaywallClose(); } });
  }
  function ffPaywallOpen(reason){
    ffPaywallEnsure();
    var m=$("pwModal"); m.setAttribute("data-reason", reason||"");
    $("pwBody").innerHTML=ffPaywallHtml(reason);
    m.hidden=false; document.body.style.overflow="hidden";
    setTimeout(function(){ var b=m.querySelector("[data-pwbuy]"); if(b) try{ b.focus(); }catch(_){} }, 30);
    try{ if(window.FFHealth) window.FFHealth.track("paywall_shown",{reason:reason||"other"}); }catch(_){}
  }
  function ffPaywallClose(){
    var m=$("pwModal"); if(!m || m.hidden) return;
    m.hidden=true; document.body.style.overflow="";
  }
  // Buying goes through the platform's store (FFBilling: StoreKit on iPhone, Play
  // Billing on Android, Paddle on the web — wired with the store builds).
  function ffStartCheckout(plan){
    try{ if(window.FFHealth) window.FFHealth.track("paywall_buy_tap",{plan:plan}); }catch(_){}
    var B=window.FFBilling;
    if(!B || typeof B.purchase!=="function"){ ffToast("Subscriptions open soon — thanks for your patience."); return; }
    Promise.resolve(B.purchase(plan)).then(function(ok){
      if(!ok) return;
      return ffRefreshPro().then(function(){
        if(B.isPro && !B.isPro() && !ffIsPro()) return;
        ffPaywallClose(); ffAccessRerender();
        ffToast("Welcome to Yardsmith Pro — the whole plan is open.");
      });
    }).catch(function(){ ffToast("That didn’t go through — you haven’t been charged. Try again in a moment."); });
  }
  function ffRestorePurchases(){
    var B=window.FFBilling;
    Promise.resolve(B && typeof B.restore==="function" ? B.restore() : null)
      .then(function(){ return ffRefreshPro(); })
      .then(function(){
        if(ffIsPro()){ ffPaywallClose(); ffAccessRerender(); ffToast("Yardsmith Pro restored."); }
        else ffToast("No subscription found for this account.");
      }).catch(function(){ ffToast("Couldn’t reach the store — try again in a moment."); });
  }
  document.addEventListener("click", function(e){
    var p=e.target.closest("[data-paywall]");
    if(p){ e.preventDefault(); ffPaywallOpen(p.getAttribute("data-paywall")); return; }
    if(e.target.closest("[data-pwrestore]")){ e.preventDefault(); ffRestorePurchases(); }
  });
  function ffAccessBoot(){
    ffStampFreeWeek();
    ffGateCoach();
    if(ffPaywallOn()) ffRefreshPro();
  }
