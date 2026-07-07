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
  function daysSinceTest(){
    var t=null, lt=lastSpeedTest(); if(lt) t=lt.ts;
    var body=lsGet("ff_body",[]);
    for(var i=body.length-1;i>=0;i--){ var e=body[i];
      if(e && e.s!=null && e.s!==""){ var ts=new Date(e.date).getTime(); if(!isNaN(ts)) t=Math.max(t||0, ts); break; } }
    return t==null ? null : Math.max(0, Math.floor((Date.now()-t)/864e5));
  }
  var SPEEDTEST_EVERY = 14;   // days — the biweekly cadence
  function speedTestDue(){ var d=daysSinceTest(); return d==null || d>=(SPEEDTEST_EVERY-1); }
  function speedTestCardHtml(){
    var lt=lastSpeedTest(), d=daysSinceTest();
    if(speedTestDue()){
      return '<div class="stest-card due"><div class="stest-t">'+ffIcon("target",15)+' Speed Test Day — it’s due</div>'+
        '<div class="stest-b">Every 2 weeks: warm up, then <b>3 max-intent 7-iron swings</b> — best one counts. '+
        (lt?('Last best: <b>'+lt.best+' mph</b>. Beat it.'):'This one sets your tested baseline.')+
        ' The retest is the scoreboard that proves the plan.</div>'+
        '<button class="stest-go" data-speedtest="1">'+ffIcon("play",13)+' Run today’s test</button></div>';
    }
    var left=Math.max(1, SPEEDTEST_EVERY-d);
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
  function stBest(){
    if(!stState) return null;
    var v=stState.swings.map(parseFloat).filter(function(n){ return n>0; });
    return v.length?Math.max.apply(null,v):null;
  }
  function stBestHtml(){
    var best=stBest();
    return best ? ('Best of the day: <b>'+best+' mph</b>') : 'Enter at least one swing.';
  }
  function stSpeedHistory(){
    return lsGet("ff_body",[]).map(function(e){ return parseFloat(e.s); }).filter(function(v){ return !isNaN(v); });
  }
  function renderSpeedTest(){
    var body=$("stBody"); if(!body || !stState) return;
    if(stState.saved){
      var r=stState.saved, gainB=(r.baseline!=null)?Math.round((r.best-r.baseline)*10)/10:null;
      body.innerHTML='<div class="st-result">'+
        '<div class="st-res-kick">Today’s best · 7-iron</div>'+
        '<div class="st-res-num">'+r.best+'<span>mph</span></div>'+
        (r.pr?'<div class="st-pr">🚀 NEW ALL-TIME PR</div>':'')+
        '<div class="st-gain">'+
          (gainB!=null && gainB!==0 ? ((gainB>0?'▲ <b>+':'▼ <b>')+gainB+' mph</b> vs your baseline ≈ <b>'+(gainB>0?'+':'')+Math.round(gainB*2)+' yards</b> of carry.<br>') : '')+
          (r.prevBest!=null && !r.pr ? ('All-time best: <b>'+r.prevBest+' mph</b> — that’s the number to hunt next test.') : 'Logged to your trend, Octane and the board.')+
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
    var hist=stSpeedHistory();
    var prevBest=hist.length?Math.max.apply(null,hist):null;
    var baseline=hist.length?hist[0]:null;
    logBodyEntry("", String(best), "");
    var t=speedTests();
    t.push({ ts:Date.now(), date:todayStr(), week:curWeek(), swings:stState.swings.slice(), best:best });
    if(t.length>60) t=t.slice(-60);
    lsSet("ff_speedtest", t);
    try{ sessionStorage.removeItem("ff_lb_pub"); }catch(e){}   // republish to the board
    stState.saved={ best:best, pr:(prevBest!=null && best>prevBest), prevBest:prevBest, baseline:(baseline!=null?baseline:best) };
    renderSpeedTest();
  }
  function shareSpeedTest(){
    if(!stState || !stState.saved) return;
    var r=stState.saved, gain=(r.baseline!=null)?Math.round((r.best-r.baseline)*10)/10:0;
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
