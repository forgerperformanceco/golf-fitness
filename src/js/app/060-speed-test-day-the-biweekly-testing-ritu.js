  /* ===================== SPEED TEST DAY — the biweekly testing ritual =====================
     Testing IS the engagement mechanic: every 2 weeks, warm up, take 3 max-intent
     7-iron swings, keep the best. The result writes into ff_body (so trends, Octane
     and the leaderboard all feed automatically) plus a detailed ff_speedtest log.
     A launch monitor is ideal; a consistent phone app or net session works too —
     same tool every test is what makes the trend honest. */
  function speedTests(){ var t=lsGet("ff_speedtest",[]); return Array.isArray(t)?t:[]; }
  function lastSpeedTest(){ var t=speedTests(); return t.length?t[t.length-1]:null; }
  // Days since the newest speed number of ANY kind — a guided test or a manual/
  // onboarding entry — so a baseline logged today doesn't immediately demand a retest.
  // Counted in CALENDAR days (local midnights), from locale-proof fields only:
  // an ff_body row's `iso` (YYYY-MM-DD) or `ts`. Never `new Date(e.date)` — the
  // display date is locale text ("30 sept 2026") and parses as NaN outside
  // English, which silently dropped the baseline and made the test "due".
  function stDayStart(v){
    var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(typeof v==="string"?v:"");
    var d=m ? new Date(+m[1], +m[2]-1, +m[3]) : new Date(v);
    if(isNaN(d.getTime())) return null;
    d.setHours(0,0,0,0); return d.getTime();
  }
  // A rough onboarding guess (row.ss "g") isn't a test: with only a guess the
  // first real test is due now, not 13 days later.
  function daysSinceTest(){
    var t=null, lt=lastSpeedTest(); if(lt && lt.ts) t=stDayStart(lt.ts);
    var body=lsGet("ff_body",[]);
    for(var i=body.length-1;i>=0;i--){ var e=body[i];
      if(e && e.s!=null && e.s!=="" && e.ss!=="g"){ var ts=stDayStart(e.iso || e.ts); if(ts!=null) t=Math.max(t||0, ts); break; } }
    if(t==null) return null;
    var today=new Date(); today.setHours(0,0,0,0);
    return Math.max(0, Math.round((today.getTime()-t)/864e5));   // round: DST days are 23/25h
  }
  var SPEEDTEST_EVERY = 14;   // days — the biweekly cadence
  // Due from day 13 (a test on a Monday is due again by the Sunday before the
  // two-week mark), so the countdown on the Train card counts to THAT day.
  var SPEEDTEST_DUE_AT = SPEEDTEST_EVERY-1;
  function speedTestDue(){ var d=daysSinceTest(); return d==null || d>=SPEEDTEST_DUE_AT; }
  // Plausible 7-iron clubhead speeds (mph) — one range for the guided test, the
  // quick log and onboarding. Tour players average ~90 (CLUBHEAD-SPEED-REFERENCE
  // §5), so 30–130 keeps every real swing and rejects typos like 180 for 80.
  var SPEED_MIN=30, SPEED_MAX=130;
  function speedInRange(n){ return !isNaN(n) && n>=SPEED_MIN && n<=SPEED_MAX; }

  /* ----- One speed series and one noise rule for every trend (Oct 2026 audit) -----
     Octane, the Story, the forecast, the Home insights, the PR check and the
     share card all read 7-iron speed through ffSpeedRows + ffSpeedSignal, so
     they can't disagree. ff_body rows carry `ss` (speed source) from Oct 2026:
     "t" guided test, "m" a measured number (quick log, measured onboarding
     value), "g" a rough onboarding guess. */
  // The first guided test's day (local midnight), or null.
  function ffFirstTestDay(){
    var first=null;
    speedTests().forEach(function(x){ var d=x && stDayStart(x.ts); if(d!=null && (first==null || d<first)) first=d; });
    (lsGet("ff_body",[])||[]).forEach(function(e){ if(e && e.ss==="t"){ var d=stDayStart(e.iso||e.ts); if(d!=null && (first==null || d<first)) first=d; } });
    return first;
  }
  // Speed rows that may anchor a trend, oldest first: {t (day start), s, iso, ss}.
  //  - dated by iso/ts, never the locale `date` text;
  //  - only plausible numbers (an old out-of-range typo can't be a best or a baseline);
  //  - a rough guess never counts;
  //  - once a guided test exists it is the baseline: older UNTAGGED numbers (the
  //    pre-Oct-2026 onboarding entry or quick logs — a guess can't be told from a
  //    measurement there) stop anchoring. Tagged measurements before it stay.
  function ffSpeedRows(){
    var body=lsGet("ff_body",[]), rows=[];
    (Array.isArray(body)?body:[]).forEach(function(e){
      if(!e || e.ss==="g") return;
      var s=parseFloat(e.s), t=stDayStart(e.iso||e.ts);
      if(t!=null && speedInRange(s)) rows.push({ t:t, s:s, iso:e.iso||"", ss:e.ss||"" });
    });
    rows.sort(function(a,b){ return a.t-b.t; });
    var first=ffFirstTestDay();
    if(first!=null) rows=rows.filter(function(r){ return r.t>=first || r.ss; });
    return rows;
  }
  // Octane measures THIS season (strength and consistency restart with the
  // plan, so speed and power-to-weight do too). A number from the 2 weeks
  // before the start still counts as the season's baseline.
  function ffSeasonFrom(){
    var s=planStart(); if(!s) return null;
    var d=new Date(s); if(isNaN(d.getTime())) return null;
    d.setHours(0,0,0,0); return d.getTime()-14*864e5;
  }
  function ffSeasonSpeedRows(){
    var from=ffSeasonFrom(), r=ffSpeedRows();
    return from==null ? r : r.filter(function(x){ return x.t>=from; });
  }
  // Is a speed change real? A best-of-3 test on the same device still moves
  // ~1–1.5 mph between sessions (sleep, warm-up, weather, strike). One simple
  // model for every trend: a least-squares line through the tests; per-test
  // noise = SPEED_NOISE mph (an assumption pending reliability data) shrunk
  // toward the user's own scatter around that line as tests build up (floor
  // 0.8, ceiling 4); the change = the line's rise from first test to last. It
  // counts only when it beats max(SPEED_MDC, 2 standard errors) — smaller
  // moves are "steady". The 076 forecast uses the same line and noise.
  var SPEED_NOISE=1.2, SPEED_MDC=1.5;
  function ffSpeedNoise(rows){
    var n=rows.length, p=SPEED_NOISE;
    if(n<3) return p;
    var t0=rows[0].t, sx=0, sy=0, sxx=0, sxy=0;
    rows.forEach(function(r){ var x=(r.t-t0)/6048e5; sx+=x; sy+=r.s; sxx+=x*x; sxy+=x*r.s; });
    var den=n*sxx-sx*sx, b=den>0 ? (n*sxy-sx*sy)/den : 0, a=(sy-b*sx)/n, rss=0;
    rows.forEach(function(r){ var e=r.s-(a+b*(r.t-t0)/6048e5); rss+=e*e; });
    return Math.min(4, Math.max(0.8, Math.sqrt((rss+3*p*p)/((n-2)+3))));
  }
  // → { n, verdict "none"|"early"|"up"|"down"|"steady", base / now (the line
  //     at the first and the latest test), change (mph), thr (the noise line),
  //     eff (change shrunk toward 0 by the noise — smooth, no jump at the
  //     line), best, spanDays }
  function ffSpeedSignal(rows){
    rows=rows||[];
    var n=rows.length, vals=rows.map(function(r){ return r.s; });
    var span=n>=2 ? (rows[n-1].t-rows[0].t)/6048e5 : 0;   // weeks
    if(n<2 || !(span>0)) return { n:n, verdict:n?"early":"none", base:n?vals[0]:null, now:n?vals[n-1]:null, change:0, thr:null, eff:0,
      best:n?Math.max.apply(null,vals):null, spanDays:0 };
    var xs=rows.map(function(r){ return (r.t-rows[0].t)/6048e5; });
    var xb=xs.reduce(function(a,b){ return a+b; },0)/n, yb=vals.reduce(function(a,b){ return a+b; },0)/n, sxx=0, sxy=0;
    xs.forEach(function(x,i){ sxx+=(x-xb)*(x-xb); sxy+=(x-xb)*(vals[i]-yb); });
    var b=sxy/sxx, a=yb-b*xb, change=b*span;
    var thr=Math.max(SPEED_MDC, 2*ffSpeedNoise(rows)*span/Math.sqrt(sxx));
    var eff=change===0 ? 0 : change*Math.max(0, 1-Math.pow(thr/Math.abs(change),2));
    return { n:n, verdict:change>=thr?"up":(change<=-thr?"down":"steady"),
      base:Math.round(a*10)/10, now:Math.round((a+change)*10)/10, change:Math.round(change*10)/10,
      thr:Math.round(thr*10)/10, eff:eff, best:Math.max.apply(null,vals),
      spanDays:Math.round(span*7) };
  }
  // A new number far from the last real one (>15%) is usually a typo (108 for
  // 80) or a driver speed — the test and the quick log ask once to confirm.
  function ffSpeedJump(v){
    v=parseFloat(v); var r=ffSpeedRows(); if(!r.length || !(v>0)) return null;
    var last=r[r.length-1].s, pct=(v-last)/last;
    return Math.abs(pct)>0.15 ? { last:last, pct:Math.round(pct*100) } : null;
  }
  function speedTestCardHtml(){
    var lt=lastSpeedTest(), d=daysSinceTest();
    if(speedTestDue()){
      return '<div class="stest-card due"><div class="stest-t">'+ffIcon("target",15)+' Speed Test Day — it’s due</div>'+
        '<div class="stest-b">Every 2 weeks: warm up, then <b>3 max-intent 7-iron swings</b> — best one counts. '+
        (lt?('Last best: <b>'+lt.best+' mph</b>. Beat it.'):'This one sets your tested baseline.')+
        ' The retest is the scoreboard that proves the plan.</div>'+
        '<button class="stest-go" data-speedtest="1">'+ffIcon("play",13)+' Run today’s test</button></div>';
    }
    var left=Math.max(1, SPEEDTEST_DUE_AT-d);   // same threshold speedTestDue() uses
    return '<div class="stest-card"><div class="stest-b">'+ffIcon("target",14)+' Next speed test in <b>'+left+'</b> day'+(left===1?'':'s')+
      (lt?(' · last best <b>'+lt.best+' mph</b>'):'')+' — <button class="stest-link" data-speedtest="1">test early</button></div></div>';
  }
  var stState=null;
  function stEnsureModal(){
    if($("stModal")) return;
    var m=document.createElement("div"); m.id="stModal"; m.className="swap-modal"; m.hidden=true;
    m.innerHTML='<div class="swap-card"><div class="swap-head"><span id="stTitle">'+ffIcon("target",16)+' Speed Test</span>'+
      '<button class="swap-x" id="stX" type="button" aria-label="Close">×</button></div><div class="swap-body" id="stBody"></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", function(e){
      if(e.target===m || e.target.closest("#stX")){ closeSpeedTest(); return; }
      if(e.target.closest("[data-stwu]")){ e.target.closest("[data-stwu]").classList.toggle("done"); return; }
      if(e.target.closest("[data-stsave]")){ saveSpeedTest(); return; }
      if(e.target.closest("[data-stshare]")){ shareSpeedTest(); return; }
      if(e.target.closest("[data-stdone]")){ closeSpeedTest(); return; }
    });
    m.addEventListener("input", function(e){
      var t=e.target; if(!t.classList.contains("st-swing")) return;
      stState.swings[+t.getAttribute("data-sts")]=t.value;
      var best=stBest(), bb=$("stBestBox"), sv=$("stSaveBtn");
      if(bb) bb.innerHTML=stBestHtml();
      if(sv) sv.disabled=!best;
    });
  }
  function openSpeedTest(){
    if(!ffCanUse("speedtest")) return;                   // Pro after the free week (036)
    stEnsureModal();
    stState={ swings:["","",""], saved:null };
    renderSpeedTest();
    $("stModal").hidden=false; document.body.style.overflow="hidden";
  }
  function closeSpeedTest(){
    var m=$("stModal"); if(m) m.hidden=true; document.body.style.overflow=""; stState=null;
    try{ renderPhase(); }catch(e){} try{ renderDash(); }catch(e){}
    try{ if($("view-progress") && $("view-progress").classList.contains("active")) renderProgress(); }catch(e){}
  }
  // Any filled-in swing outside the plausible range blocks the save (a typo
  // would otherwise become an all-time PR and a fake trend).
  function stBad(){
    if(!stState) return false;
    return stState.swings.some(function(v){ return String(v||"").trim()!=="" && !speedInRange(parseFloat(v)); });
  }
  function stBest(){
    if(!stState || stBad()) return null;
    var v=stState.swings.map(parseFloat).filter(speedInRange);
    return v.length?Math.max.apply(null,v):null;
  }
  function stBestHtml(){
    if(stBad()) return '<span class="ff-inerr" role="alert">7-iron speed should be '+SPEED_MIN+'–'+SPEED_MAX+' mph — check for a typo.</span>';
    var best=stBest();
    if(best && stState.okJump===best){
      var j=ffSpeedJump(best);
      if(j) return '<span class="ff-inerr" role="alert">That’s '+Math.abs(j.pct)+'% '+(j.pct>0?'above':'below')+' your last number ('+j.last+' mph). Same tool, real 7-iron swings? Tap <b>Lock in</b> again to save.</span>';
    }
    return best ? ('Best of the day: <b>'+best+' mph</b>') : 'Enter at least one swing.';
  }
  // The speeds that count (ffSpeedRows), oldest first — the Octane drill-in sparkline.
  function stSpeedHistory(){
    return ffSpeedRows().map(function(r){ return r.s; });
  }
  function renderSpeedTest(){
    var body=$("stBody"); if(!body || !stState) return;
    if(stState.saved){
      // Gains and the PR badge only past the noise line (ffSpeedSignal): a
      // 0.3 mph "record" on a no-change day is the test wobbling, not progress.
      var r=stState.saved, g=r.sig, real=!!(g && (g.verdict==="up" || g.verdict==="down"));
      body.innerHTML='<div class="st-result">'+
        '<div class="st-res-kick">Today’s best · 7-iron</div>'+
        '<div class="st-res-num">'+r.best+'<span>mph</span></div>'+
        (r.pr?'<div class="st-pr">🚀 NEW ALL-TIME PR</div>':'')+
        '<div class="st-gain">'+
          (r.first ? 'This is your tested baseline — every test from here is measured against it.<br>'
            : (real ? ('Your trend is '+(g.change>0?'▲ <b>+':'▼ <b>')+g.change+' mph</b> since your baseline ≈ <b>'+(g.change>0?'+':'')+Math.round(g.change*2)+' yards</b> of carry.<br>')
            : ('Within normal test-to-test variation of your baseline (about ±'+g.thr+' mph) — the trend over several tests is what counts.<br>')))+
          (r.newBest && !r.pr ? 'Your best number yet — the next tests will show if it holds.'
            : (r.prevBest!=null && !r.pr ? ('All-time best: <b>'+r.prevBest+' mph</b> — that’s the number to hunt next test.') : 'Logged to your trend, Octane and the board.'))+
        '</div>'+
        '<button class="st-share" data-stshare="1">'+ffIcon("share",14)+' Share it</button>'+
        '<button class="st-save" data-stdone="1">Done — next test in 2 weeks</button>'+
        '</div>';
      return;
    }
    var wu=[["Leg swings","×10/side"],["90/90 hip switches","×6/side"],["Open-book T-spine","×8/side"],["Build-up swings","10 · ramp 50→90%"]];
    body.innerHTML=
      '<div class="st-sec">1 · Warm up <small>— never test cold (~5 min, tap to check off)</small></div>'+
      '<div class="wu">'+wu.map(function(x){ return '<button type="button" class="wu-row" data-stwu="1"><span class="wu-move">'+x[0]+'</span><span class="wu-dose">'+x[1]+'</span></button>'; }).join("")+'</div>'+
      '<div class="st-sec">2 · Three max swings <small>— 7-iron, full rest between, same tool every test</small></div>'+
      '<div class="st-swings">'+[0,1,2].map(function(i){
        return '<input class="st-swing" type="number" inputmode="decimal" placeholder="Swing '+(i+1)+'" data-sts="'+i+'" value="'+escAttr(stState.swings[i]||"")+'" />';
      }).join("")+'</div>'+
      '<div class="st-best" id="stBestBox">'+stBestHtml()+'</div>'+
      '<button class="st-save" id="stSaveBtn" data-stsave="1"'+(stBest()?'':' disabled')+'>✓ Lock in today’s best</button>'+
      '<div class="st-note">Launch monitor, radar app or sim — anything works as long as it’s the <b>same tool each test</b>. Your trend vs your own baseline is the number that matters.</div>';
  }
  function saveSpeedTest(){
    var best=stBest(); if(!best) return;
    // Far from the last real number? Ask once before it lands in every trend.
    if(ffSpeedJump(best) && stState.okJump!==best){
      stState.okJump=best; var bb=$("stBestBox"); if(bb) bb.innerHTML=stBestHtml(); return; }
    var today=stDayStart(ffISO());
    logBodyEntry("", String(best), "", "t");
    var t=speedTests();
    t.push({ ts:Date.now(), date:todayStr(), week:curWeek(), swings:stState.swings.slice(), best:best });
    if(t.length>60) t=t.slice(-60);
    lsSet("ff_speedtest", t);
    try{ sessionStorage.removeItem("ff_lb_pub"); }catch(e){}   // republish to the board
    // Read AFTER saving: the first guided test re-anchors the series (ffSpeedRows),
    // so "baseline" and "best" are measured against what will count from now on.
    var rows=ffSpeedRows(), prev=rows.filter(function(x){ return x.t<today; });
    var prevBest=prev.length ? Math.max.apply(null, prev.map(function(x){ return x.s; })) : null;
    var sig=ffSpeedSignal(rows), newBest=prevBest!=null && best>prevBest;
    stState.saved={ best:best, newBest:newBest, pr:newBest && sig.verdict==="up", prevBest:prevBest, sig:sig, first:!prev.length };
    renderSpeedTest();
  }
  function shareSpeedTest(){
    if(!stState || !stState.saved) return;
    var r=stState.saved, gain=(r.sig && r.sig.verdict==="up") ? r.sig.change : 0;   // only a real gain is shared
    var txt=(r.pr?"New 7-iron speed PR: ":"7-iron speed test: ")+r.best+" mph"+
      (gain>0?(" (+"+gain+" mph ≈ +"+Math.round(gain*2)+" yds since baseline)"):"")+
      " — training with Yardsmith ⛳";
    ffShareImage({
      kick:"Speed test · 7-iron", big:String(r.best), unit:"mph",
      badge:(r.pr?"🚀 NEW ALL-TIME PR":null),
      lines:[ gain>0?("▲ +"+gain+" mph since baseline ≈ +"+Math.round(gain*2)+" yards"):null,
              "3 max-intent swings — best one counts" ]
    }, txt);
  }
  // One listener for every "run the test" button (Train card, dashboard focus, Stats).
  document.addEventListener("click", function(e){
    if(e.target.closest("[data-speedtest]")){ openSpeedTest(); return; }
    if(e.target.closest("[data-mobscreen]")) openMobility();
  });
