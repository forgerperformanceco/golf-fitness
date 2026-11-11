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
      // Power check (below): offered on the result, run in the same modal.
      if(e.target.closest("[data-pwgo]") && stState){ stState.power=pwFresh(); renderSpeedTest(); return; }
      // A ball chip updates in place (no re-render): keyboard and screen-reader
      // focus stay on the chip, and the pressed state is announced.
      var pb=e.target.closest("[data-pwball]");
      if(pb && stState && stState.power){
        stState.power.ball=+pb.getAttribute("data-pwball");
        Array.prototype.forEach.call(m.querySelectorAll("[data-pwball]"), function(b){
          b.classList.toggle("on", b===pb); b.setAttribute("aria-pressed", String(b===pb)); });
        pwSync(false); return; }
      if(e.target.closest("[data-pwsave]")){ savePowerCheck(); return; }
      if(e.target.closest("[data-pwskip],[data-pwdone]")){ closeSpeedTest(); return; }
    });
    m.addEventListener("input", function(e){
      var t=e.target;
      if(stState && stState.power && (t.id==="pwJump" || t.id==="pwChest")){
        stState.power[t.id==="pwJump"?"jump":"chest"]=t.value; pwSync(true); return; }
      if(!t.classList.contains("st-swing")) return;
      stState.swings[+t.getAttribute("data-sts")]=t.value;
      var best=stBest(), bb=$("stBestBox"), sv=$("stSaveBtn");
      if(bb) bb.innerHTML=stBestHtml();
      if(sv) sv.disabled=!best;
    });
    // Leaving a power field runs the full check ("1" is an error once you're done typing).
    m.addEventListener("change", function(e){
      if(stState && stState.power && (e.target.id==="pwJump" || e.target.id==="pwChest")) pwSync(false);
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
  function renderSpeedTest(){
    var body=$("stBody"); if(!body || !stState) return;
    var ttl=$("stTitle"); if(ttl) ttl.innerHTML=stState.power ? (ffIcon("bolt",16)+' Power check') : (ffIcon("target",16)+' Speed Test');
    if(stState.power){ body.innerHTML=powerCheckHtml(); return; }
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
        (powerDue() ? powerOfferHtml() : '')+
        '<button class="st-save" data-stdone="1">Done — next test in 2 weeks</button>'+
        '</div>';
      return;
    }
    var wu=[["Leg swings","×10/side"],["90/90 hip switches","×6/side"],["Open-book T-spine","×8/side"],["Build-up swings","10 · ramp 50→90%"]];
    body.innerHTML=
      '<div class="st-sec">1 · Warm up <small>— never test cold (~5 min, tap to check off)</small></div>'+
      '<div class="wu">'+wu.map(function(x){ return '<button type="button" class="wu-row" data-stwu="1"><span class="wu-move">'+x[0]+(typeof cueHtml==="function"?cueHtml(x[0]):"")+'</span><span class="wu-dose">'+x[1]+'</span></button>'; }).join("")+'</div>'+
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
  /* ----- Power check — a jump and a throw, every other speed test (Nov 2026) -----
     Power is the gym number most tied to clubhead speed: jump impulse and
     upper-body explosive strength lead both meta-analyses, while flexibility
     and balance show no link (Brennan 2024; Ehlert 2021 — reports/Golf TPI
     assessments.md). So about once a month the speed test offers two at-home
     tests AFTER the three swings (the swing protocol stays the same), in our
     own words:
       - jump and reach: inches from a standing reach mark to the jump touch;
       - seated chest throw (optional, needs a med ball): feet, with the ball
         weight, and only same-ball throws are ever compared.
     Saved to ff_power [{ts, date, week, jump, chest, ball}] (cap 40 that keeps the
     first of each measure — pwCap; synced as a unionSeries by ts with the same cap). No outside norms: your own first check is the yardstick. */
  var POWER_DUE_AT=21;              // days: every other speed test (~monthly), never the very next one
  var JUMP_MIN=2, JUMP_MAX=48;      // inches
  var CHEST_MIN=3, CHEST_MAX=60;    // feet
  var PW_BALLS=[4,6,8,10,12,14];    // lb
  // The smallest change worth calling real. Assumptions until users' own repeat
  // data says otherwise: a hand-marked best-of-3 jump wobbles about an inch; a
  // seated throw about 5%, never under a foot.
  var JUMP_MDC=1;
  function chestMdc(ft){ return Math.max(1, Math.round(ft*0.5)/10); }
  function powerChecks(){
    var t=lsGet("ff_power",[]);
    return (Array.isArray(t)?t:[]).filter(function(e){ return e && typeof e==="object"; })
      .slice().sort(function(a,b){ return (a.ts||0)-(b.ts||0); });
  }
  function lastPower(){ var t=powerChecks(); return t.length?t[t.length-1]:null; }
  function daysSincePower(){
    var lp=lastPower(), d=lp && lp.ts ? stDayStart(lp.ts) : null; if(d==null) return null;
    var today=new Date(); today.setHours(0,0,0,0);
    return Math.max(0, Math.round((today.getTime()-d)/864e5));
  }
  function powerDue(){ var d=daysSincePower(); return d==null || d>=POWER_DUE_AT; }
  function pwNum(v){ var s=String(v==null?"":v).trim(); return s==="" ? null : parseFloat(s); }
  function jumpOk(n){ return typeof n==="number" && !isNaN(n) && n>=JUMP_MIN && n<=JUMP_MAX; }
  function chestOk(n){ return typeof n==="number" && !isNaN(n) && n>=CHEST_MIN && n<=CHEST_MAX; }
  function pwFmt(n){ return String(Math.round(n*10)/10); }
  function pwFresh(){
    var lastBall=null;
    powerChecks().forEach(function(e){ if(e.ball) lastBall=e.ball; });
    return { jump:"", chest:"", ball:lastBall, saved:null };
  }
  // What's wrong with the form right now → {err, ready}. `live` = mid-typing: a
  // number under the floor may be unfinished ("1" on the way to 18), so it
  // blocks the save without an error until the field is left or Save is tapped.
  function pwCheck(p, live){
    var j=pwNum(p.jump), c=pwNum(p.chest), hold=false;
    function unfinished(n, min){ return live && typeof n==="number" && n>=0 && n<min; }
    if(j!=null && !jumpOk(j)){ if(unfinished(j, JUMP_MIN)) hold=true;
      else return { err:"The jump should be "+JUMP_MIN+"–"+JUMP_MAX+" inches — check for a typo." }; }
    if(c!=null && !chestOk(c)){ if(unfinished(c, CHEST_MIN)) hold=true;
      else return { err:"The throw should be "+CHEST_MIN+"–"+CHEST_MAX+" feet — check for a typo." }; }
    if(c!=null && !p.ball) return { err:"Pick the ball’s weight — only throws with the same ball are compared." };
    return { err:null, ready:!hold && (j!=null || c!=null) };
  }
  // A number far from the last one (>25%; a real month moves a few percent) is
  // usually a typo (28 for 18) and would sit in the history for years — ask once.
  // The throw is checked against the last throw with the same ball only.
  var PW_FAR=25;
  function pwBigJump(p){
    var prior=powerChecks(), r=null;
    function far(key, val, ball, label, unit){
      if(r || !(val>0)) return;
      var cmp=pwCompare(prior, key, val, ball); if(!cmp || !(cmp.last>0)) return;
      var pct=Math.round((val-cmp.last)/cmp.last*100);
      if(Math.abs(pct)>PW_FAR) r={ msg:"That’s "+Math.abs(pct)+"% "+(pct>0?"above":"below")+" your last "+label+" ("+pwFmt(cmp.last)+" "+unit+"). "+
        "Measured the same way? Tap Save again if it’s right." };
    }
    far("jump", pwNum(p.jump), null, "jump", "in");
    far("chest", pwNum(p.chest), p.ball, p.ball+" lb throw", "ft");
    return r;
  }
  function pwKey(p){ return [p.jump, p.chest, p.ball].join("|"); }
  // The one message line: a range/ball error, else the "far from last" question
  // while the numbers it was asked about are still the ones entered.
  function pwMsg(p, r){ return r.err || (p.warn && p.okBig===pwKey(p) ? p.warn : ""); }
  // Keep the button and the error line current while typing (no re-render, so
  // the keyboard stays up).
  function pwSync(live){
    var p=stState && stState.power; if(!p) return;
    var r=pwCheck(p, live), msg=pwMsg(p, r), er=$("pwErr"), sv=$("pwSaveBtn");
    if(er){ er.hidden=!msg; er.textContent=msg; }
    if(sv) sv.disabled=!!r.err || !r.ready;
  }
  // One measure against its own history (entries saved BEFORE this one):
  // → null on the first, else {n, last, dLast, first, dFirst, mdc}.
  function pwCompare(prior, key, val, ball){
    var xs=prior.filter(function(e){ return typeof e[key]==="number" && (key!=="chest" || e.ball===ball); });
    if(!xs.length) return null;
    var last=xs[xs.length-1][key], first=xs[0][key];
    return { n:xs.length, last:last, dLast:Math.round((val-last)*10)/10, first:first,
      dFirst:Math.round((val-first)*10)/10, mdc:key==="jump" ? JUMP_MDC : chestMdc(val) };
  }
  // The words for one comparison. Changes inside the noise line read as "the
  // same" — a half-inch "gain" is the tape measure, not the training.
  function pwDeltaText(c, unit){
    if(!c) return 'Your first one — the baseline every check is measured against.';
    function d(x){ return (x>0?'▲ <b>+':'▼ <b>')+pwFmt(Math.abs(x))+' '+unit+'</b>'; }
    var vsLast=Math.abs(c.dLast)>=c.mdc ? d(c.dLast)+' since last check' : 'About the same as last check (±'+pwFmt(c.mdc)+' '+unit+' is normal wobble)';
    var vsFirst=c.n<2 ? '' : (Math.abs(c.dFirst)>=c.mdc ? ' · '+d(c.dFirst)+' since your first' : ' · level with your first');
    return vsLast+vsFirst+'.';
  }
  function powerOfferHtml(){
    var lp=lastPower();
    return '<div class="pwr-offer"><div class="pwr-offer-t">'+ffIcon("bolt",15)+' Power check — '+(lp?'due':'set your baseline')+'</div>'+
      '<div class="pwr-offer-b">Two minutes while you’re warm: your best <b>jump</b> and, if you have a med ball, a <b>seated chest throw</b>. '+
      'Power is the gym test most closely tied to clubhead speed — about once a month.</div>'+
      '<button type="button" class="st-share" data-pwgo="1">Add the power check</button></div>';
  }
  function powerCheckHtml(){
    var p=stState.power;
    if(p.saved){
      var r=p.saved;
      return '<div class="st-result"><div class="st-res-kick">Power check</div>'+
        (r.jump!=null ? '<div class="pwr-res"><div class="pwr-res-n">'+pwFmt(r.jump)+'<span>in</span></div><div class="pwr-res-l">Jump and reach</div>'+
          '<div class="pwr-res-d">'+pwDeltaText(r.cj,"in")+'</div></div>' : '')+
        (r.chest!=null ? '<div class="pwr-res"><div class="pwr-res-n">'+pwFmt(r.chest)+'<span>ft</span></div><div class="pwr-res-l">Seated chest throw · '+r.ball+' lb ball</div>'+
          '<div class="pwr-res-d">'+pwDeltaText(r.cc,"ft")+'</div></div>' : '')+
        '<div class="st-gain">Power moves slower than one check can show — watch it across a few.'+
          (ffSpeedRows().length ? ' It’s on your Stats speed card.' : '')+'</div>'+
        '<button type="button" class="st-save" data-pwdone="1">Done — next power check in about a month</button></div>';
    }
    var chk=pwCheck(p), msg=pwMsg(p, chk);
    return '<div class="pwr-safe">Stop if anything hurts — '+(stState.saved ? 'skip it today; the speed test already counts.' : 'skip it today and try another day.')+'</div>'+
      '<div class="st-sec">1 · Jump and reach <small>— best of 3, in inches</small></div>'+
      '<div class="pwr-how">Stand side-on to a wall, feet flat, and reach as high as you can — mark it (chalk, a wet fingertip or a piece of tape). '+
        'Then dip, jump straight up and touch the wall as high as you can. Land soft and quiet. Measure from the mark to your highest touch.'+
        (ffLowImpact() ? ' <b>Go easy:</b> a small dip, a quiet landing — one good jump is plenty.' : '')+'</div>'+
      '<input class="pwr-in" id="pwJump" type="number" inputmode="decimal" step="0.5" placeholder="Best jump (in)" aria-label="Best jump in inches" value="'+escAttr(p.jump||"")+'" />'+
      '<div class="st-sec">2 · Seated chest throw <small>— optional, needs a med ball</small></div>'+
      '<div class="pwr-how">Sit on the floor with your back against a wall, legs out. Hold the ball at your chest and push it straight out as far as you can — your back stays on the wall. '+
        'Measure from the wall to where it first lands. Best of 3.</div>'+
      '<div class="pwr-balls" role="group" aria-label="Ball weight"><span>Ball</span>'+PW_BALLS.map(function(b){
        return '<button type="button" class="'+(p.ball===b?'on':'')+'" data-pwball="'+b+'" aria-pressed="'+(p.ball===b)+'">'+b+' lb</button>'; }).join("")+'</div>'+
      '<input class="pwr-in" id="pwChest" type="number" inputmode="decimal" step="0.5" placeholder="Best throw (ft)" aria-label="Best throw in feet" value="'+escAttr(p.chest||"")+'" />'+
      '<div class="ff-inerr" id="pwErr" role="alert"'+(msg?'':' hidden')+'>'+msg+'</div>'+
      '<button type="button" class="st-save" id="pwSaveBtn" data-pwsave="1"'+(chk.err||!chk.ready?' disabled':'')+'>✓ Save power check</button>'+
      '<div class="st-note">Same wall, same ball, same floor every time — the trend against your own first check is the number that matters.</div>'+
      '<button type="button" class="pwr-skip" data-pwskip="1">Skip it today</button>';
  }
  // Cap the history without moving a baseline (Codex, #129): the first jump and
  // the first throw with each ball weight always stay — they're what "since your
  // first" means — and the rest are the newest. Oldest first in and out. MUST
  // keep exactly the same entries as powerCap in cloud-sync.js (unit-tested).
  function pwCap(list, cap){
    if(list.length<=cap) return list;
    var pin={}, jump=false, balls={}, out=[], room;
    list.forEach(function(e, i){
      if(!e) return;
      if(typeof e.jump==="number" && !jump){ jump=true; pin[i]=true; }
      if(typeof e.chest==="number" && e.ball!=null && !balls[e.ball]){ balls[e.ball]=true; pin[i]=true; }
    });
    room=cap-Object.keys(pin).length;
    for(var i=list.length-1; i>=0; i--){
      if(pin[i]) out.push(list[i]);
      else if(room>0){ room--; out.push(list[i]); }
    }
    return out.reverse();
  }
  function savePowerCheck(){
    var p=stState && stState.power; if(!p || p.saved) return;
    var chk=pwCheck(p); if(chk.err || !chk.ready){ pwSync(false); return; }
    var big=pwBigJump(p);
    if(big && p.okBig!==pwKey(p)){ p.okBig=pwKey(p); p.warn=big.msg; pwSync(false); return; }
    var j=pwNum(p.jump), c=pwNum(p.chest), prior=powerChecks();
    var e={ ts:Date.now(), date:todayStr(), week:curWeek(), jump:j, chest:c, ball:c!=null ? p.ball : null };
    var pw=prior.concat([e]);
    if(pw.length>40) pw=pwCap(pw, 40);
    lsSet("ff_power", pw);
    p.saved={ jump:j, chest:c, ball:e.ball,
      cj:j!=null ? pwCompare(prior,"jump",j) : null, cc:c!=null ? pwCompare(prior,"chest",c,e.ball) : null };
    renderSpeedTest();
  }
  // Straight into the power check (the quick sheet, Stats): no swings first.
  function openPowerCheck(){
    if(!ffCanUse("powercheck")) return;
    stEnsureModal();
    stState={ swings:["","",""], saved:null, power:pwFresh() };
    renderSpeedTest();
    $("stModal").hidden=false; document.body.style.overflow="hidden";
  }
  // One line for the Stats speed card: the latest of each, against the first.
  function powerSummaryHtml(){
    var t=powerChecks(); if(!t.length) return '';
    function latest(key){ for(var i=t.length-1;i>=0;i--) if(typeof t[i][key]==="number") return t[i]; return null; }
    var lj=latest("jump"), lc=latest("chest"), bits=[];
    if(lj){ var cj=pwCompare(t.filter(function(e){ return e.ts<lj.ts; }),"jump",lj.jump);
      bits.push('Jump <b>'+pwFmt(lj.jump)+' in</b>'+(cj && cj.n>=1 && Math.abs(cj.dFirst)>=cj.mdc ? ' <small>('+(cj.dFirst>0?'+':'')+pwFmt(cj.dFirst)+' since first)</small>' : '')); }
    if(lc){ var cc=pwCompare(t.filter(function(e){ return e.ts<lc.ts; }),"chest",lc.chest,lc.ball);
      var cNote=[lc.ball ? lc.ball+' lb' : '', cc && Math.abs(cc.dFirst)>=cc.mdc ? (cc.dFirst>0?'+':'')+pwFmt(cc.dFirst)+' since first' : ''].filter(Boolean).join(', ');
      bits.push('Chest throw <b>'+pwFmt(lc.chest)+' ft</b>'+(cNote ? ' <small>'+cNote+'</small>' : '')); }
    return '<div class="pwr-sum">'+ffIcon("bolt",13)+'<span><b class="pwr-sum-t">Power</b> '+bits.join(' · ')+
      (powerDue() ? ' — <button type="button" class="stest-link" data-powercheck="1">check due</button>' : '')+'</span></div>';
  }
  // One listener for every "run the test" button (Train card, dashboard focus, Stats).
  document.addEventListener("click", function(e){
    if(e.target.closest("[data-speedtest]")){ openSpeedTest(); return; }
    if(e.target.closest("[data-powercheck]")){ openPowerCheck(); return; }
    if(e.target.closest("[data-mobscreen]")) openMobility();
  });
