  /* ===================== WELCOME BACK — returning after a break =====================
     Opening the app after weeks away used to land on "week 11 · heavy" of a plan
     the user no longer remembered, with a catch-up card, a readiness prompt and a
     checklist all competing for the first tap. After 14+ days with no activity of
     ANY kind, one screen says where they are, how the app works in three lines,
     and asks one question: start again at week 1 (history kept) or pick up where
     the calendar is. The answer is stamped in ff_welcome_back (roams, so every
     device agrees); "Decide later" hides it for this app session only.
     Signed-in devices wait for the first cloud merge before judging — a stale
     tablet must not greet someone who trained yesterday on their phone. */
  var WB_GAP_DAYS=14;
  var ffWbLaunch=String(location.search||"");   // captured before 090 cleans push/deep-link URLs
  // Newest timestamp of anything the user DID: workouts (finished or started),
  // weigh-ins, meal check-offs, rest/skip marks, rounds, tests, check-ins, week
  // reviews — plus the plan start and the last welcome-back answer.
  function ffLastActiveTs(){
    var last=0, cap=Date.now()+864e5;
    function see(v){
      var t=(typeof v==="number")?Math.abs(v):Date.parse(v);
      if(t>last && t<=cap) last=t;
    }
    function each(key, fn){
      var v=lsGet(key,null); if(!v || typeof v!=="object") return;
      var list=Array.isArray(v)?v:Object.keys(v).map(function(k){ return v[k]; });
      list.forEach(function(e){ try{ fn(e); }catch(_){} });
    }
    see(planStart());
    see(lsGet("ff_welcome_back",0));
    each("ff_history", function(h){ if(h){ see(h.doneTs||0); see(h.ts||0); } });
    each("ff_log", function(s){ if(s) see(s._ts||0); });
    each("ff_body", function(e){ if(e) see(e.ts||e.date||0); });
    each("ff_rest", see);
    each("ff_skipped_sessions", see);
    each("ff_fuel", function(d){ if(d) see(d.ts||0); });
    ["ff_rounds","ff_speedtest","ff_mobility","ff_readiness","ff_weekly_reviews"].forEach(function(k){
      each(k, function(e){ if(e) see(e.ts||e.date||0); });
    });
    return last||null;
  }
  function ffLastWorkoutTs(){
    var last=0, h=lsGet("ff_history",[]);
    if(Array.isArray(h)) h.forEach(function(e){
      var t=e && (e.doneTs||e.ts);
      if(typeof t==="number" && t>last) last=t;
    });
    return last||null;
  }
  function ffWelcomeBackDue(){
    if(!lsGet("ff_onboarded",false) || !planStart()) return null;
    try{ if(sessionStorage.getItem("ff_wb_later")==="1") return null; }catch(_){}
    var last=ffLastActiveTs(); if(!last) return null;
    var days=Math.floor((Date.now()-last)/864e5);
    return days>=WB_GAP_DAYS ? { days:days, lastWorkout:ffLastWorkoutTs() } : null;
  }
  function ffAwayText(days){
    if(days>=60){ var mo=Math.floor(days/30); return mo+" months"; }
    var w=Math.floor(days/7); return w+" week"+(w===1?"":"s");
  }
  function ffWelcomeBackHtml(s){
    var over=seasonComplete(), wk=curWeek(), wave=WAVES[waveFor(wk)];
    var lastTxt="";
    if(s.lastWorkout){
      try{ lastTxt=new Date(s.lastWorkout).toLocaleDateString(undefined,{month:"short",day:"numeric"}); }catch(_){}
    }
    // A month or more off: a fresh week 1 is the kinder restart (loads start
    // from where the body is now). Shorter breaks: carry on is the default.
    var restartFirst=over || s.days>=28;
    var restart='<button type="button" class="ob-opt" data-wbchoice="restart">'+
      '<span class="obo-ic">🌱</span><span class="obo-tx">'+
      '<span class="obo-t">'+(over?'Start a new 20 weeks':'Ease back in')+(restartFirst?' <span class="obo-tag">Recommended</span>':'')+'</span>'+
      '<span class="obo-d">Week 1 starts today. Every workout, lift and trend you logged stays.</span></span></button>';
    var pickup=over ? '' :
      '<button type="button" class="ob-opt" data-wbchoice="pickup">'+
      '<span class="obo-ic">⏩</span><span class="obo-tx">'+
      '<span class="obo-t">Pick up at week '+wk+(restartFirst?'':' <span class="obo-tag">Recommended</span>')+'</span>'+
      '<span class="obo-d">'+wave.label+' week — carry on from today’s workout.</span></span></button>';
    return '<div class="ob-main"><div class="ob-card" role="dialog" aria-modal="true" aria-labelledby="wbTitle">'+
      '<div class="ob-kicker"><span class="ball"></span> Welcome back</div>'+
      '<h2 class="ob-h" id="wbTitle">It’s been '+ffAwayText(s.days)+'</h2>'+
      '<p class="ob-p">'+(lastTxt?'Your last workout was <b>'+lastTxt+'</b>. ':'')+
        (over?'Your 20-week plan ran out while you were away. ':'')+'Everything you logged is saved.</p>'+
      '<div class="ob-week wb-how"><div class="ob-weektop"><span>HOW YARDSMITH WORKS</span></div>'+
        '<div class="ob-weekday"><span class="ow-n">🏋️</span><span class="ow-t"><b>Lift</b><small>Open Home and tap Start. The app sets every weight.</small></span><span></span></div>'+
        '<div class="ob-weekday"><span class="ow-n">🍽️</span><span class="ow-t"><b>Eat</b><small>Tap ✓ when you eat a meal. No calorie counting.</small></span><span></span></div>'+
        '<div class="ob-weekday"><span class="ow-n">🎯</span><span class="ow-t"><b>Measure</b><small>Test your swing speed every 2 weeks to see it working.</small></span><span></span></div>'+
      '</div>'+
      '<div class="wb-q">Where do you want to start?</div>'+
      '<div class="ob-opts">'+(restartFirst?restart+pickup:pickup+restart)+'</div>'+
      '<button type="button" class="ob-later" data-wbchoice="later">Decide later</button>'+
      '</div></div>';
  }
  function ffWelcomeBackClose(){
    var root=$("wbRoot"); if(!root) return;
    root.remove(); document.body.style.overflow="";
  }
  function ffWelcomeBackOpen(s){
    if($("wbRoot")) return;
    var root=document.createElement("div");
    root.className="ob wb"; root.id="wbRoot";
    root.innerHTML=ffWelcomeBackHtml(s);
    document.body.appendChild(root);
    document.body.style.overflow="hidden";
    root.addEventListener("click", function(e){
      var b=e.target.closest("[data-wbchoice]"); if(!b) return;
      ffWelcomeBackChoose(b.getAttribute("data-wbchoice"), s);
    });
    root.addEventListener("keydown", function(e){
      if(e.key==="Escape"){ e.preventDefault(); ffWelcomeBackChoose("later", s); }
    });
    setTimeout(function(){ var f=root.querySelector("[data-wbchoice]"); if(f) try{ f.focus(); }catch(_){} }, 30);
    try{ if(window.FFHealth) window.FFHealth.track("welcome_back_shown",{weeks:Math.floor(s.days/7)}); }catch(_){}
  }
  function ffWelcomeBackChoose(choice, s){
    ffWelcomeBackClose();
    if(choice==="later"){
      try{ sessionStorage.setItem("ff_wb_later","1"); }catch(_){}
    } else {
      if(choice==="restart"){ resetPlanFull(); startPlanAtWeek(1); }
      // "Pick up" means from TODAY: this week's already-passed sessions are
      // set aside (skip marks — still doable from Train), so the first thing
      // after "welcome back" is today's workout, not a "you missed this" card.
      if(choice==="pickup"){
        try{ var m, n=0; while((m=missedWorkout()) && n++<7) skipSession(curWeek(), m.name); }catch(_){}
      }
      lsSet("ff_welcome_back", Date.now());
      // Land on Home, where the one big button is today's workout.
      try{ setView("dash"); }catch(_){}
    }
    try{ renderPhase(); }catch(_){}
    try{ renderDash(); }catch(_){}
    if(choice==="restart") ffToast("Week 1 starts today — your history is all still here.");
    else if(choice==="pickup") ffToast("Welcome back — week "+curWeek()+" it is.");
    try{ if(window.FFHealth) window.FFHealth.track("welcome_back_choice",{choice:choice,weeks:Math.floor(s.days/7)}); }catch(_){}
  }
  function ffMaybeWelcomeBack(){
    // Never stack on setup, the workout player or another sheet.
    if($("wbRoot") || $("obRoot")) return;
    var pl=$("playerRoot"); if(pl && !pl.hidden) return;
    if(document.querySelector(".qsheet:not([hidden]),.swap-modal:not([hidden]),.modal-back.open")) return;
    var s=ffWelcomeBackDue(); if(s) ffWelcomeBackOpen(s);
  }
  // Fresh data from another device (cloud merge) can make the greeting wrong
  // after it opened — close it quietly if the user was active after all.
  window.addEventListener("ff-external-write", function(){
    if($("wbRoot") && !ffWelcomeBackDue()) ffWelcomeBackClose();
  });
  function ffWelcomeBackBoot(shared){
    // A shared ?link= view, a notification tap or an app-shortcut deep link came
    // for a specific job — don't put a question in front of it.
    if(shared || /(^|[?&])(src=push|go=)/.test(ffWbLaunch)) return;
    var ran=false;
    function run(){ if(ran) return; ran=true; ffMaybeWelcomeBack(); }
    var signedIn=false;
    try{
      for(var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i);
        if(k && k.indexOf("sb-")===0 && k.indexOf("auth-token")!==-1){ signedIn=true; break; }
      }
    }catch(_){}
    if(!signedIn){ setTimeout(run, 350); return; }
    // First sync outcome (ok or error) — or give up waiting after 6s.
    window.addEventListener("ff-sync-status", function once(){
      window.removeEventListener("ff-sync-status", once);
      setTimeout(run, 150);
    });
    setTimeout(run, 6000);
  }
