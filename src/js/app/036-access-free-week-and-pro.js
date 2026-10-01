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
                   open the Pro sheet. Everything already logged stays readable,
                   and a workout already under way can always be finished.
       "full"    — subscribed (or the switch is off).

     The free-week clock (ff_free_week) roams and merges EARLIEST-wins, and the
     oldest logged workout also counts — restarting the plan or reinstalling
     and signing back in doesn't buy a second free week. Signed in, it also
     starts no later than the account itself (profiles.created_at — what the
     coach's server check counts from), so the app and the coach always agree.
     Test on any device: ?paywall=1 turns it on for this tab session, ?paywall=0 off.

     ---- The store bridge: window.FFBilling (added with the store builds) ----
     StoreKit on iPhone, Play Billing on Android, Paddle on the web. Anything
     missing or malformed fails CLOSED: no Pro, no trial promise, no fake price.
       isPro()        → boolean, synchronous — the bridge's cached entitlement.
                        Only === true counts; a Promise or anything else is "no"
                        (store SDKs are async: keep a snapshot, refresh it, and
                        fire "ff-billing-changed" when it changes).
       prices()       → {annual:{price,per,note,trialDays}, monthly:{price,per,note}}
                        or a Promise of it — localized strings straight from the
                        store. note is the plan line (e.g. "£6.67 a month"), never
                        the trial. trialDays > 0 ONLY when the store says THIS
                        user is eligible for the intro offer; otherwise 0/absent.
       purchase(plan) → Promise of {status:"purchased"|"pending"|"cancelled"|"failed",
                        charged?:boolean}. charged:false on "failed" means the store
                        reports nothing was charged; without it we never say so.
                        On the web the bridge opens checkout only for a signed-in
                        user and passes window.FF.user.id as Paddle customData.user_id.
       restore()      → Promise, resolves when the store's restore is done.
       platform       → "ios" | "android" | "web".
       manageUrl      → optional (the web needs it): where to manage or cancel.
       termsUrl       → optional: the Terms of Use the Pro sheet links to.
     The bridge dispatches window event "ff-billing-changed" whenever entitlement
     or prices change: first load, an Ask-to-Buy or pending payment clearing, a
     renewal, a refund. */
  var FF_PAYWALL=false;            // master switch — flip on only once FFBilling exists on every platform
  var FF_FREE_DAYS=7;
  var FF_PRICES={                  // display defaults while no store exists (web preview) — never a trial claim
    annual:  { price:"$79.99", per:"/ year",  note:"$6.67 a month", tag:"Best value" },
    monthly: { price:"$14.99", per:"/ month", note:"Cancel any time" }
  };
  var FF_TERMS_URL="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";   // Apple's standard EULA — iOS only
  (function(){
    var m=/(?:^|[?&])paywall=([01])/.exec(String(location.search||""));
    if(m) try{ if(m[1]==="1") sessionStorage.setItem("ff_paywall_test","1"); else sessionStorage.removeItem("ff_paywall_test"); }catch(_){}
  })();
  var ffPwPlan="annual", ffPwLivePrices=null, ffPwBusy=false;

  function ffPaywallOn(){
    if(FF_PAYWALL) return true;
    try{ return sessionStorage.getItem("ff_paywall_test")==="1"; }catch(_){ return false; }
  }
  // A stamp is a positive epoch-ms number (a numeric string from a hand-edited
  // backup is read as its number). Anything else counts as no stamp.
  function ffStampVal(v){
    if(typeof v==="string" && /^\d{10,}$/.test(v)) v=+v;
    return (typeof v==="number" && isFinite(v) && v>0) ? v : 0;
  }
  // The free week starts the first time a set-up user is seen (stamped once) —
  // or earlier, if they have older workouts. Nothing in the future counts.
  function ffFreeWeekStart(){
    var now=Date.now(), t=ffStampVal(lsGet("ff_free_week",0)), h=lsGet("ff_history",[]);
    if(t>now) t=now;
    if(Array.isArray(h)) h.forEach(function(e){
      var x=e && (e.doneTs||e.ts);
      if(typeof x==="number" && x>0 && x<=now && (!t || x<t)) t=x;
    });
    return t||null;
  }
  // Stamp once set up — finishing setup, or starting a plan (a shared ?link=
  // visitor skips setup). A missing or garbage stamp is (re)stamped now; so is
  // one from a clock that ran more than a day ahead (a smaller skew between two
  // devices must not drag the roaming, earliest-wins stamp around).
  function ffStampFreeWeek(){
    if(!lsGet("ff_onboarded",false) && !planStart()) return;
    var raw=lsGet("ff_free_week",0), v=ffStampVal(raw), now=Date.now();
    if(!v || v>now+864e5) lsSet("ff_free_week", now);
    else if(v!==raw) lsSet("ff_free_week", v);
  }
  // Whole calendar days from the free week's first day to `date` (default today).
  function ffFreeDayIdx(date){
    var s=ffFreeWeekStart(); if(!s) return 0;
    var a=new Date(s); a.setHours(0,0,0,0);
    var b=new Date(date||Date.now()); b.setHours(0,0,0,0);
    return Math.round((b-a)/864e5);
  }
  function ffFreeDaysLeft(){
    return Math.min(FF_FREE_DAYS, Math.max(0, FF_FREE_DAYS-ffFreeDayIdx()));
  }
  // The stored Supabase session, read synchronously (the same test cloud-sync's
  // hasSession uses): the user id, "" if a session exists but its id can't be
  // read, null when signed out. A backup restore only writes ff_* keys, so it
  // can never forge this.
  function ffStoredSessionUid(){
    var any=null;
    try{
      for(var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i)||"";
        if(k.indexOf("sb-")!==0 || k.indexOf("auth-token")===-1) continue;
        any="";
        if(/-auth-token$/.test(k)){ try{ var s=JSON.parse(localStorage.getItem(k)); if(s && s.user && s.user.id) return String(s.user.id); }catch(_){} }
      }
    }catch(_){}
    return any;
  }
  // Subscribed? A native store bridge answers first (strictly true — see the
  // contract above); otherwise the server's own answer (public.is_subscribed,
  // webhook-written), cached so it works offline — but only for the signed-in
  // account that fetched it.
  function ffIsPro(){
    try{ var B=window.FFBilling; if(B && typeof B.isPro==="function" && B.isPro()===true) return true; }catch(_){}
    var c=lsGet("ff_pro",null); if(!(c && c.pro===true)) return false;
    var sid=ffStoredSessionUid();
    return sid!=null && (!sid || c.uid===sid);
  }
  // Access on a given calendar day: reminders scheduled ahead ask about THEIR day.
  function ffAccessAt(date){
    if(!ffPaywallOn() || ffIsPro()) return "full";
    return ffFreeDayIdx(date)<FF_FREE_DAYS ? "preview" : "locked";
  }
  function ffAccess(){ return ffAccessAt(); }
  function ffJwtSub(tok){
    try{ var p=String(tok).split(".")[1].replace(/-/g,"+").replace(/_/g,"/"); while(p.length%4) p+="=";
      return JSON.parse(atob(p)).sub||null; }catch(_){ return null; }
  }
  function ffRefreshPro(){
    var F=window.FF; if(!ffPaywallOn() || !F || !F.getAccessToken) return Promise.resolve(ffIsPro());
    return F.getAccessToken().then(function(tok){
      if(!tok) return ffIsPro();
      var uid=(F.user && F.user.id) || ffJwtSub(tok) || null;
      var H={ apikey:F.anonKey, Authorization:"Bearer "+tok, "Content-Type":"application/json" };
      if(uid) ffAlignFreeWeek(F, uid, H);
      return fetch(F.supabaseUrl+"/rest/v1/rpc/is_subscribed", { method:"POST", body:"{}", headers:H })
        .then(function(r){ return r.ok ? r.json() : null; }).then(function(pro){
          if(typeof pro!=="boolean") return ffIsPro();
          var was=ffAccess();
          lsSet("ff_pro", { pro:pro, ts:Date.now(), uid:uid });
          if(was!==ffAccess()) ffAccessRerender();
          return pro;
        });
    }).catch(function(){ return ffIsPro(); });
  }
  // The coach's server check counts the free week from account creation
  // (profiles.created_at — no client can write it; the server never reads the
  // client's clock). Start the app's clock no later than that, so the app never
  // says "days left" while the coach says "done". RLS lets a user read only
  // their own row.
  function ffAlignFreeWeek(F, uid, H){
    return fetch(F.supabaseUrl+"/rest/v1/profiles?select=created_at&id=eq."+encodeURIComponent(uid), { headers:H })
      .then(function(r){ return r.ok ? r.json() : null; }).then(function(rows){
        // Postgres sends microseconds; trim to milliseconds for every browser's parser.
        var c=Array.isArray(rows) && rows[0] ? Date.parse(String(rows[0].created_at||"").replace(/(\.\d{3})\d+/, "$1")) : NaN;
        if(!(c>0)) return;
        var cur=ffStampVal(lsGet("ff_free_week",0));
        if(cur && c>=cur) return;
        var was=ffAccess();
        lsSet("ff_free_week", c);
        if(was!==ffAccess()) ffAccessRerender();
      }).catch(function(){});
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
  // A workout already under way this week (started, not finished, not skipped).
  // After the free week it stays finishable: Home and Train offer "Resume".
  function ffResumeDay(){
    if(!planStart()) return null;
    var wk=curWeek(), ds=stripDays();
    for(var i=0;i<ds.length;i++){
      var d=ds[i];
      if(d && d.type!=="rest" && sessionInProgress(getSession(wk,d.name)) && !sessionSkipped(wk,d.name)) return d;
    }
    return null;
  }
  // The coach lives in coach.js (outside this bundle): wrap its two entry points.
  function ffGateCoach(){
    var c=window.FFCoach; if(!c || c.__ffGated) return;
    var open=c.open, ask=c.ask;
    c.open=function(){ if(!ffCanUse("coach")) return; return open.apply(c, arguments); };
    c.ask=function(){ if(!ffCanUse("coach")) return; return ask.apply(c, arguments); };
    c.__ffGated=true;
  }
  // coach.js is deferred, so it assigns window.FFCoach after this bundle runs:
  // wrap it the moment it's assigned — no early window where a tap reaches the
  // coach unwrapped. The load listener stays as a fallback.
  function ffWatchCoach(){
    var cur=window.FFCoach;
    try{
      Object.defineProperty(window, "FFCoach", { configurable:true, enumerable:true,
        get:function(){ return cur; },
        set:function(v){ cur=v; try{ ffGateCoach(); }catch(_){} } });
    }catch(_){ document.addEventListener("DOMContentLoaded", ffGateCoach); }
  }
  ffWatchCoach();
  window.addEventListener("load", ffGateCoach);
  // Signing in asks the server. The cached answer belongs to one account: it's
  // dropped when another account signs in, and on a real sign-out — auth-js
  // deletes the stored session before it reports one. An expired token that
  // can't refresh (offline, an auth outage) also reports "no user" but KEEPS the
  // stored session: a paying user opening the app at the gym stays Pro.
  function ffOnAuth(e){
    var u=e && e.detail && e.detail.user, c=lsGet("ff_pro",null);
    if(!u){
      if(c && ffStoredSessionUid()==null){ lsSet("ff_pro",null); ffAccessRerender(); }
      return;
    }
    if(c && c.uid && c.uid!==u.id){ lsSet("ff_pro",null); ffAccessRerender(); }
    ffRefreshPro();
  }
  window.addEventListener("ff-auth", ffOnAuth);
  // The store's entitlement or prices changed (see the contract above).
  function ffOnBillingChanged(){
    if(!ffPaywallOn()) return;
    ffPwLoadPrices();
    ffRefreshPro().then(function(){
      ffAccessRerender();
      var m=$("pwModal");
      if(!m || m.hidden || ffPwBusy) return;
      if(ffIsPro()){ ffPaywallClose(); ffToast("Yardsmith Pro is on — the whole plan is open."); }
      else ffPwRerender();
    });
  }
  window.addEventListener("ff-billing-changed", ffOnBillingChanged);
  // coach.js heard "subscription required" from the server (a lagging clock
  // here, or an older build): put the Pro sheet over its message.
  function ffOnPaywallEvent(e){
    if(!ffPaywallOn()) return;
    var r=e && e.detail && e.detail.reason;
    ffPaywallOpen(r==="coach"||r==="workout"||r==="speedtest" ? r : "coach");
  }
  window.addEventListener("ff-paywall", ffOnPaywallEvent);

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
  // Above the lock card: the workout already under way, to finish.
  function ffResumeCardHtml(d, where){
    var nm=(d.name.split("—")[1]||d.name).trim();
    if(where==="home")
      return '<button type="button" class="nu-card catchup" data-startplayer="'+ffAttr(d.name)+'">'+
        '<div class="nu-kick">You started this one</div><div class="nu-title">'+ffEsc(nm)+'</div>'+
        '<div class="nu-sub">Finish it any time — everything you logged is saved.</div>'+nuCta("Resume workout")+'</button>';
    return '<button type="button" class="train-today-cta" data-startplayer="'+ffAttr(d.name)+'">'+
      '<span><small>YOU STARTED · '+ffEsc(nm.toUpperCase())+'</small><b>Resume workout</b></span><i>›</i></button>';
  }
  function ffLockedWithResumeHtml(where){
    var d=ffResumeDay(), lock=ffLockedCardHtml(where);
    if(!d) return lock;
    return where==="home" ? '<div class="nu-catchup">'+ffResumeCardHtml(d,"home")+lock+'</div>' : ffResumeCardHtml(d,"train")+lock;
  }
  // Store helpers for the sheet and the You card.
  function ffPwPlatform(){
    var B=window.FFBilling, p=B && B.platform;
    if(p==="ios" || p==="android" || p==="web") return p;
    return B ? "" : "web";
  }
  function ffPwUrl(u){ return (typeof u==="string" && /^(https:\/\/[^\s"'<>]+|[\w\-]+\.html)$/i.test(u)) ? u : ""; }
  function ffPwTermsUrl(){
    return ffPwUrl(window.FFBilling && window.FFBilling.termsUrl) || (ffPwPlatform()==="ios" ? FF_TERMS_URL : "");
  }
  function ffPwManageHow(){
    var p=ffPwPlatform();
    return p==="ios" ? "in your App Store subscriptions" : p==="android" ? "in your Google Play subscriptions" : "from the You tab";
  }
  // You tab status card.
  function ffAccessCardHtml(){
    var a=ffAccess();
    if(!ffPaywallOn())
      return '<div class="acct-card"><div class="acct-head">⛳ Free during early access</div>'+
        '<p class="acct-p">You’ve got everything: AI coaching, the full training plan, macro tuning, progress tracking and the leaderboard.</p>'+
        '<div class="acct-plan">Plan: <b>Early access</b> · free</div></div>';
    if(a==="full"){
      var mu=ffPwUrl(window.FFBilling && window.FFBilling.manageUrl), p=ffPwPlatform();
      return '<div class="acct-card"><div class="acct-head">⛳ Yardsmith Pro</div>'+
        '<p class="acct-p">Every workout, your weights set for you, swing-speed tracking and the coach. '+
          (p==="ios"||p==="android" ? 'Manage or cancel any time '+ffPwManageHow()+'.' : (mu ? 'Manage or cancel any time below.' : 'Manage or cancel any time where you subscribed.'))+'</p>'+
        '<div class="acct-plan">Plan: <b>Pro</b> ✓</div>'+
        (mu ? '<button class="acct-btn ghost" data-pwmanage="1">Manage subscription</button>' : '')+
        '<button class="acct-btn ghost" data-pwrestore="1">Restore purchases</button></div>';
    }
    var left=ffFreeDaysLeft();
    return '<div class="acct-card"><div class="acct-head">⛳ '+(a==="preview"?'Free week · '+left+' day'+(left===1?'':'s')+' left':'Free plan')+'</div>'+
      '<p class="acct-p">'+(a==="preview"
        ? 'Each workout opens on its day this week. After that, Yardsmith Pro keeps the plan going.'
        : 'Your history, Stats, meals and targets stay free. Workouts, speed tests and the coach are Yardsmith Pro.')+'</p>'+
      '<button class="acct-btn" data-paywall="account">See Yardsmith Pro</button>'+
      '<button class="acct-btn ghost" data-pwrestore="1">Restore purchases</button></div>';
  }

  /* ---- The Pro sheet ---- */
  // Prices come from the store (localized, async); the USD defaults only while
  // no store exists at all. With a store but no prices yet: "Loading", and the
  // buy button waits.
  function ffPwLoadPrices(){
    var B=window.FFBilling; if(!B || typeof B.prices!=="function") return Promise.resolve(null);
    var p; try{ p=B.prices(); }catch(_){ return Promise.resolve(null); }
    if(p && typeof p.then!=="function"){ if(p.annual && p.monthly) ffPwLivePrices=p; return Promise.resolve(p); }
    return Promise.resolve(p).then(function(v){
      if(v && v.annual && v.monthly){ ffPwLivePrices=v; ffPwRerender(); }
      return v;
    }).catch(function(){ return null; });
  }
  function ffPwPrices(){
    if(ffPwLivePrices) return ffPwLivePrices;
    var B=window.FFBilling;
    return (B && typeof B.purchase==="function") ? null : FF_PRICES;
  }
  // A free trial is promised only when the store says this user gets one.
  function ffPwTrial(o){
    var n=o && o.trialDays;
    return (typeof n==="number" && isFinite(n) && n>0) ? Math.min(31, Math.floor(n)) : 0;
  }
  function ffPaywallHtml(reason){
    var wk=curWeek(), P=ffPwPrices(), plat=ffPwPlatform(), terms=ffPwTermsUrl();
    var head={
      workout:["Your free week is done","Week "+wk+" is ready. From here the app sets every weight from what you actually lifted."],
      coach:["The coach is part of Pro","Ask anything about your plan, your meals or your numbers — answers built on your own logs."],
      speedtest:["Speed tests are part of Pro","Test every two weeks and watch the plan turn into clubhead speed."],
      preview:["See the whole plan","Your free week opens one workout a day. Pro opens everything — and keeps it going for all 20 weeks."]
    }[reason] || ["Yardsmith Pro","The whole 20-week plan, run for you."];
    function opt(k){
      var o=(P && P[k]) || {}, tr=ffPwTrial(o);
      return '<button type="button" class="pw-opt'+(ffPwPlan===k?' on':'')+'" data-pwplan="'+k+'" aria-pressed="'+(ffPwPlan===k)+'">'+
        '<span class="pw-opt-l"><b>'+(k==="annual"?'Yearly':'Monthly')+'</b><small>'+(P ? ffEsc((o.note||"")+(tr?(o.note?' · ':'')+tr+'-day free trial':'')) : 'Loading price…')+'</small></span>'+
        '<span class="pw-opt-r"><b>'+(P ? ffEsc(o.price||"") : '—')+'</b><small>'+(P ? ffEsc(o.per||"") : '')+'</small></span>'+
        (o.tag?'<span class="pw-opt-tag">'+ffEsc(o.tag)+'</span>':'')+'</button>';
    }
    var sel=P && P[ffPwPlan], tr=ffPwTrial(sel), unit=ffPwPlan==="annual"?"year":"month";
    var cta=ffPwBusy ? 'One moment…' : (!P ? 'Loading prices…' : (tr ? 'Start '+tr+'-day free trial' : 'Continue'));
    var cancel=plat==="ios" ? 'cancel any time in your App Store subscriptions, at least 24 hours before it renews.'
      : plat==="android" ? 'cancel any time in your Google Play subscriptions.'
      : 'cancel any time from the You tab.';
    return '<div class="pw-kick">Yardsmith Pro</div>'+
      '<h2 class="pw-h" id="pwTitle">'+head[0]+'</h2><p class="pw-p">'+head[1]+'</p>'+
      '<ul class="pw-list">'+
        '<li>Every workout for 20 weeks — weights set for you, week by week</li>'+
        '<li>Build, heavy and easy weeks, timed for you</li>'+
        '<li>Swing-speed tests and trends</li>'+
        '<li>Your AI coach</li></ul>'+
      '<div class="pw-opts">'+opt("annual")+opt("monthly")+'</div>'+
      '<button type="button" class="pw-go" data-pwbuy="1"'+(ffPwBusy||!P?' disabled aria-disabled="true"':'')+'>'+cta+'</button>'+
      '<p class="pw-fine">'+(sel
        ? (tr ? 'Free for '+tr+' days, then '+ffEsc(sel.price)+' a '+unit+'. ' : ffEsc(sel.price)+' a '+unit+'. ')
        : '')+
        'Renews automatically until you cancel — '+cancel+'</p>'+
      '<p class="pw-keep">Everything you’ve logged stays yours, Pro or not.</p>'+
      '<div class="pw-links"><button type="button" class="pw-link" data-pwrestore="1">Restore purchases</button>'+
        (terms ? '<a href="'+ffAttr(terms)+'" target="_blank" rel="noopener">Terms</a>' : '')+
        '<a href="privacy.html" target="_blank" rel="noopener">Privacy</a></div>';
  }
  function ffPwRerender(){
    var m=$("pwModal"); if(m && !m.hidden) $("pwBody").innerHTML=ffPaywallHtml(m.getAttribute("data-reason"));
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
      if(pl){ ffPwPlan=pl.getAttribute("data-pwplan"); ffPwRerender(); return; }
      if(e.target.closest("[data-pwbuy]")){ ffStartCheckout(ffPwPlan); return; }
    });
    m.addEventListener("keydown", function(e){ if(e.key==="Escape"){ e.preventDefault(); ffPaywallClose(); } });
  }
  function ffPaywallOpen(reason){
    ffPaywallEnsure();
    var m=$("pwModal"); m.setAttribute("data-reason", reason||"");
    ffPwLoadPrices();
    $("pwBody").innerHTML=ffPaywallHtml(reason);
    m.hidden=false; document.body.style.overflow="hidden";
    setTimeout(function(){ var b=m.querySelector("[data-pwbuy]"); if(b) try{ b.focus(); }catch(_){} }, 30);
    try{ if(window.FFHealth) window.FFHealth.track("paywall_shown",{reason:reason||"other"}); }catch(_){}
  }
  function ffPaywallClose(){
    var m=$("pwModal"); if(!m || m.hidden) return;
    m.hidden=true; document.body.style.overflow="";
  }
  // Buying goes through the platform's store (FFBilling, contract above). What
  // we tell the user follows what the store reported — never a guess about money.
  function ffStartCheckout(plan){
    if(ffPwBusy) return;
    try{ if(window.FFHealth) window.FFHealth.track("paywall_buy_tap",{plan:plan}); }catch(_){}
    var B=window.FFBilling;
    if(!B || typeof B.purchase!=="function"){ ffToast("Subscriptions open soon — thanks for your patience."); return; }
    if(!ffPwPrices()) return;                    // prices still loading (the button says so)
    ffPwBusy=true; ffPwRerender();
    function idle(){ ffPwBusy=false; ffPwRerender(); }
    return new Promise(function(r){ r(B.purchase(plan)); }).then(function(res){
      var st=res===true ? "purchased" : String((res && res.status) || "failed");
      if(st==="purchased") return ffPwConfirm();
      idle();
      if(st==="cancelled") return;
      if(st==="pending"){ ffPaywallClose(); ffToast("Waiting for approval — Pro opens as soon as the payment goes through."); return; }
      ffToast(res && res.charged===false
        ? "That didn’t go through. Nothing was charged — try again in a moment."
        : "That didn’t go through. If you were charged, tap Restore purchases.");
    }).catch(function(){
      idle();
      ffToast("That didn’t go through. If you were charged, tap Restore purchases.");
    });
  }
  // A purchase counts once Pro actually shows up — from the store bridge or the
  // server (a web payment's webhook can land a few seconds after checkout).
  var FF_PW_WAITS=[0,2000,4000,8000];
  function ffPwConfirm(){
    return new Promise(function(done){
      (function tryN(i){
        ffRefreshPro().then(function(){
          if(ffIsPro()){
            ffPwBusy=false; ffPaywallClose(); ffAccessRerender();
            ffToast("Welcome to Yardsmith Pro — the whole plan is open."); return done(true);
          }
          if(i+1<FF_PW_WAITS.length){ setTimeout(function(){ tryN(i+1); }, FF_PW_WAITS[i+1]); return; }
          ffPwBusy=false; ffPaywallClose();
          ffToast("Payment received — Pro can take a minute to open. If it doesn’t, tap Restore purchases.");
          done(false);
        });
      })(0);
    });
  }
  function ffRestorePurchases(){
    var B=window.FFBilling, F=window.FF;
    return new Promise(function(r){ r(B && typeof B.restore==="function" ? B.restore() : null); })
      .then(function(){ return ffRefreshPro(); })
      .then(function(){
        if(ffIsPro()){ ffPaywallClose(); ffAccessRerender(); ffToast("Yardsmith Pro restored."); return; }
        // On the web a subscription belongs to an account — signed out, there's
        // nothing to look up yet. (The sign-in window sits below the Pro sheet.)
        var p=ffPwPlatform();
        if(p!=="ios" && p!=="android" && ffStoredSessionUid()==null && F && typeof F.signIn==="function"){
          ffPaywallClose();
          ffToast("Sign in with the email you subscribed with — Pro comes back on its own.");
          F.signIn(); return;
        }
        ffToast("No subscription found for this account.");
      }).catch(function(){ ffToast("Couldn’t reach the store — try again in a moment."); });
  }
  document.addEventListener("click", function(e){
    var p=e.target.closest("[data-paywall]");
    if(p){
      e.preventDefault();
      if(ffAccess()==="full"){ ffAccessRerender(); return; }   // a stale card: Pro arrived since it was drawn
      ffPaywallOpen(p.getAttribute("data-paywall")); return;
    }
    if(e.target.closest("[data-pwrestore]")){ e.preventDefault(); ffRestorePurchases(); return; }
    if(e.target.closest("[data-pwmanage]")){
      e.preventDefault();
      var u=ffPwUrl(window.FFBilling && window.FFBilling.manageUrl);
      if(u) try{ window.open(u, "_blank", "noopener"); }catch(_){}
    }
  });
  function ffAccessBoot(){
    ffStampFreeWeek();
    ffGateCoach();
    if(ffPaywallOn()){ ffRefreshPro(); ffPwLoadPrices(); }
  }
