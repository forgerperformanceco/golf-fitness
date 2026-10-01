  /* ===================== YARDSMITH BRAIN =====================
     The deterministic layer beneath the conversational coach:
       1) turns raw logs into compact signals,
       2) chooses one next-best intervention,
       3) builds an honest six-week forecast with visible assumptions.
     The LLM explains this read; it does not invent it. */
  function ffBrainNum(v){ v=parseFloat(v); return isFinite(v)?v:null; }
  function ffBrainTime(row, fallback){
    if(row && row.ts) return +row.ts;
    var raw=row && (row.iso||row.date), t=raw?Date.parse(raw):NaN;
    return isNaN(t)?fallback:t;
  }
  function ffBrainRound(v, places){
    var p=Math.pow(10,places||0); return Math.round(v*p)/p;
  }
  // Speed = 060's one series (ffSpeedRows: real numbers only, dated by iso,
  // anchored on the first guided test). The raw read below is only a fallback
  // for a standalone load of this module.
  function ffBrainSpeedSeries(){
    if(typeof ffSpeedRows==="function") return ffSpeedRows().map(function(r){ return { speed:r.s, ts:r.t }; });
    var rows=lsGet("ff_body",[]), out=[];
    rows.forEach(function(row,i){
      var speed=ffBrainNum(row&&row.s); if(speed==null) return;
      out.push({ speed:speed, ts:ffBrainTime(row,Date.now()-(rows.length-i)*14*864e5) });
    });
    return out.sort(function(a,b){ return a.ts-b.ts; });
  }
  function ffBrainFuelScore(day){
    if(!day) return null;
    // Same score as the Fuel tab (030 ffFuelDayScore — slots weighted by size).
    if(typeof ffFuelDayScore==="function") return ffFuelDayScore(day);
    if(day.rating) return day.rating==="on"?1:(day.rating==="close"?.6:.15);
    var keys=Object.keys(day.m||{}); if(!keys.length) return null;
    var sum=0; keys.forEach(function(k){ sum+=day.m[k]==="a"?1:.75; });
    return Math.min(1,sum/(day.n||4));
  }
  function ffBrainSignals(){
    var now=Date.now(), weekAgo=now-7*864e5, hist=lsGet("ff_history",[]);
    var sessions7=hist.filter(function(h){ return h && (+h.ts||0)>=weekAgo; }).length;
    var profile=lsGet("fairwayfuel",{})||{}, targetFreq=+(profile.freq||4);
    var fuel=lsGet("ff_fuel",{})||{}, fuelVals=[];
    Object.keys(fuel).sort().slice(-7).forEach(function(k){
      var v=ffBrainFuelScore(fuel[k]); if(v!=null) fuelVals.push(v);
    });
    var fuelAvg=fuelVals.length?fuelVals.reduce(function(a,b){ return a+b; },0)/fuelVals.length:null;
    var speeds=ffBrainSpeedSeries(), speedNow=speeds.length?speeds[speeds.length-1].speed:null;
    var speedBase=speeds.length?speeds[0].speed:null;
    var spanDays=speeds.length>=2?(speeds[speeds.length-1].ts-speeds[0].ts)/864e5:0;
    // The noise-gated reads (060 ffSpeedSignal): lifetime, and this season (the plateau check).
    var sig=null, sea=null;
    if(typeof ffSpeedSignal==="function"){
      try{ sig=ffSpeedSignal(ffSpeedRows()); sea=ffSpeedSignal(ffSeasonSpeedRows()); }catch(e){}
    }
    var recentTs=0;
    hist.forEach(function(h){ recentTs=Math.max(recentTs,+h.ts||0); });
    (lsGet("ff_body",[])||[]).forEach(function(b){ recentTs=Math.max(recentTs,+b.ts||0); });
    var score=lsGet("ff_score",null), trend=null;
    var started=typeof planStart==="function" && !!planStart();
    try{ trend=weightTrend(); }catch(e){}
    var readiness=(typeof ffReadinessToday==="function")?ffReadinessToday():null;
    return {
      planWeek:(started&&typeof curWeek==="function")?curWeek():null,
      phase:(started&&typeof curWeek==="function"&&typeof waveFor==="function"&&typeof WAVES!=="undefined")?WAVES[waveFor(curWeek())].label:null,
      sessionsLast7:sessions7, weeklyTarget:targetFreq,
      trainingAdherence:Math.min(1,sessions7/Math.max(1,targetFreq)),
      fuelDaysLogged:fuelVals.length, fuelAdherence:fuelAvg==null?null:ffBrainRound(fuelAvg,2),
      speedTests:speeds.length, speedNow:speedNow,
      // Recent level vs baseline (060's rule), and whether it beats test noise.
      speedGain:sig&&sig.n>=2?sig.change:(speedNow!=null&&speedBase!=null?ffBrainRound(speedNow-speedBase,1):null),
      speedTrend:sig&&sig.n>=2?sig.verdict:null, speedNoiseMph:sig&&sig.thr!=null?sig.thr:null,
      speedSpanDays:Math.round(spanDays),
      seasonSpeedTests:sea?sea.n:null, seasonSpeedSpanDays:sea?sea.spanDays:null, seasonSpeedTrend:sea&&sea.n>=2?sea.verdict:null,
      weightRatePerWeek:trend&&trend.ratePerWeek!=null?ffBrainRound(trend.ratePerWeek,2):null,
      octane:score&&score.score!=null?score.score:null,
      daysSinceAnyLog:recentTs?Math.floor((now-recentTs)/864e5):null,
      readiness:readiness?{band:readiness.band,score:readiness.score,original:!!readiness.original}:null
    };
  }
  function ffBrainDecision(signals){
    if(typeof planStart!=="function" || !planStart()) return { key:"start", title:"Start the season", reason:"Your plan has not started, so there is nothing to adapt yet.", action:"Start Week 1 and establish today as Day 1." };
    if(signals.readiness&&signals.readiness.band==="recharge"&&!signals.readiness.original)
      return {key:"readiness",title:"Protect today's quality",reason:"Sleep, body, and energy point to a recovery dose today.",action:"Run the adapted two-set session at 70–80% and leave PRs for a better day."};
    if(signals.speedTests===0) return { key:"baseline", title:"Bank the speed baseline", reason:"Without a 7-iron baseline, the app cannot prove whether the work is buying speed.", action:"Run the guided three-swing Speed Test; best swing counts." };
    if(typeof speedTestDue==="function" && speedTestDue()) return { key:"retest", title:"Reassess speed now", reason:"The biweekly testing window is open, and a fresh outcome is more valuable than another guess.", action:"Warm up, take three max-intent 7-iron swings, and log the best." };
    if(signals.daysSinceAnyLog!=null && signals.daysSinceAnyLog>=6)
      return { key:"reengage", title:"Restart the feedback loop", reason:"The brain has gone "+signals.daysSinceAnyLog+" days without a new signal.", action:"Log one workout, weigh-in, or speed test today." };
    if(signals.sessionsLast7<Math.max(1,signals.weeklyTarget-1))
      return { key:"consistency", title:"Protect training consistency", reason:"You have banked "+signals.sessionsLast7+" of "+signals.weeklyTarget+" planned sessions in the last seven days.", action:"Complete the next prescribed session before adding extra work." };
    if(signals.fuelAdherence!=null && signals.fuelDaysLogged>=3 && signals.fuelAdherence<.65)
      return { key:"fuel", title:"Close the fuel gap", reason:"Your recent fuel adherence is "+Math.round(signals.fuelAdherence*100)+"%, which can cap recovery and training quality.", action:"Bank every planned feeding for the next two days, starting with protein and workout carbs." };
    // A plateau needs 4+ tests across 8+ weeks THIS season with no gain past
    // test noise — a real ~0.15 mph/week gain can't show sooner, and last
    // season's gain must not hide a flat one now.
    if(signals.seasonSpeedTests>=4 && signals.seasonSpeedSpanDays>=56 && signals.seasonSpeedTrend && signals.seasonSpeedTrend!=="up")
      return { key:"plateau", title:"Speed hasn't clearly moved", reason:signals.seasonSpeedTests+" tests across "+signals.seasonSpeedSpanDays+" days this season show no gain bigger than normal test-to-test variation"+(signals.speedNoiseMph?" (about ±"+signals.speedNoiseMph+" mph)":"")+".", action:"Keep strength work, but protect full-rest jumps, throws, and overspeed quality this week." };
    if(typeof mobDue==="function" && mobDue())
      return { key:"mobility", title:"Refresh the durability read", reason:"Your mobility screen is due, so warm-up personalization may be stale.", action:"Run the three-move screen before the next lower-body or speed session." };
    return { key:"stay", title:"Stay on the winning dose", reason:"Training, testing, and recovery signals do not show a reason to change the plan.", action:"Complete the next prescribed session and keep the next reassessment date." };
  }
  /* Six-week outlook, calibrated (Oct 2026 audit). The old range was a fixed
     ±0.7–1.1 mph around a first-to-last slope, labelled "High" from the test
     count alone — on no-change data it held the true speed about 1 time in 4.
     Now: a least-squares line through every dated test (weeks); per-test noise
     TE = 060's prior (SPEED_NOISE) shrunk toward the scatter around that line
     (ffSpeedNoise), never under 1 mph; the 95% range for the true speed six weeks out,
     ±1.96·TE·√(1/n + (t_F−t̄)²/Sxx), never past what the slope cap allows; the
     label from that width (≤±1.5 mph High, ≤±3 Medium, else Low). Under three
     tests or four weeks of testing it doesn't forecast at all. */
  var FF_FC_CAP=0.5;   // mph/week either way: 3 mph in six weeks — already past the ~4% a whole program typically adds
  function ffBrainForecast(signals){
    var s=ffBrainSpeedSeries(), n=s.length;
    if(n<3) return {
      status:"building", horizonWeeks:6, confidence:"Not ready",
      reason:"Three dated 7-iron speed tests are required.", next:"Run the guided Speed Test every 2 weeks — three tests across a month make an honest range."
    };
    var first=s[0], last=s[n-1], days=Math.max(1,(last.ts-first.ts)/864e5);
    if(days<28) return {
      status:"building", horizonWeeks:6, confidence:"Low",
      reason:"Your tests span less than four weeks.", next:"Keep testing every 2 weeks so a real trend can stand out from test-day noise."
    };
    var xs=s.map(function(p){ return (p.ts-first.ts)/6048e5; }), ys=s.map(function(p){ return p.speed; });
    var tb=xs.reduce(function(a,b){ return a+b; },0)/n, yb=ys.reduce(function(a,b){ return a+b; },0)/n, sxx=0, sxy=0;
    xs.forEach(function(x,i){ sxx+=(x-tb)*(x-tb); sxy+=(x-tb)*(ys[i]-yb); });
    var b=sxx>0?sxy/sxx:0, a=yb-b*tb, xl=xs[n-1], level=a+b*xl;
    // Never under 1 mph here: a lucky run of tight tests must not buy a
    // "High" six-week range (that's where the old label failed most).
    var te=Math.max(1, (typeof ffSpeedNoise==="function")?ffSpeedNoise(s.map(function(p){ return { t:p.ts, s:p.speed }; })):1.2);
    var adherence=.55+.45*Math.max(0,Math.min(1,signals.trainingAdherence));
    var centre=level+Math.max(-FF_FC_CAP,Math.min(FF_FC_CAP,b))*adherence*6, tF=xl+6;
    var hw=1.96*te*Math.sqrt(1/n+(tF-tb)*(tF-tb)/sxx), seL=1.96*te*Math.sqrt(1/n+(xl-tb)*(xl-tb)/sxx);
    var low=ffBrainRound(Math.max(centre-hw, level-seL-FF_FC_CAP*6),1);
    var high=ffBrainRound(Math.min(centre+hw, level+seL+FF_FC_CAP*6),1);
    var half=(high-low)/2, conf=half<=1.5?"High":(half<=3?"Medium":"Low");
    var gainLow=ffBrainRound(low-last.speed,1), gainHigh=ffBrainRound(high-last.speed,1);
    return {
      status:"ready", horizonWeeks:6, confidence:conf, current7Iron:last.speed,
      projected7Iron:{ low:low, high:high },
      projectedGain:{ low:gainLow, high:gainHigh },
      estimated7IronCarryGainYards:{ low:Math.round(gainLow*2), high:Math.round(gainHigh*2) },
      basis:[
        n+" dated speed tests across "+Math.round(days)+" days",
        signals.sessionsLast7+" of "+signals.weeklyTarget+" sessions in the last seven days",
        "a 95% range: test days wobble about ±"+ffBrainRound(te,1)+" mph, and the trend is capped at ±"+FF_FC_CAP+" mph a week"
      ],
      disclaimer:"Directional estimate, not a promise. Testing conditions and strike quality can move the result — a wide range means the trend isn't clear yet."
    };
  }
  // What the coach needs to talk about THIS week (Oct 2026 audit: it was told
  // "week 1" and saw no plan or log). The real week and wave (the plain name
  // the app shows + the engine's key), this week's prescribed days (exercises
  // and targets after swaps, gear and the wave, each marked past/today/ahead)
  // with any logged top sets, and the big lifts' e1RM trend. While the free
  // week opens one day at a time (036 "preview") days ahead are left out;
  // nothing when locked. A few KB — the ai-coach request is capped at 32 KB.
  function ffBrainTraining(){
    try{
      if(typeof planStart!=="function" || !planStart() || typeof curWeek!=="function" || typeof stripDays!=="function") return null;
      var access=(typeof ffAccess==="function")?ffAccess():"full";
      if(access==="locked") return null;
      var wk=curWeek(), key=(typeof waveFor==="function")?waveFor(wk):null, dop=(typeof dayOfPlan==="function")?dayOfPlan():null;
      var out={ week:wk, ofWeeks:20, wave:(key&&typeof WAVES!=="undefined"&&WAVES[key])?WAVES[key].label:null, waveKey:key,
        dayOfWeek:dop, days:[], lifts:[] };
      var L=(typeof getLog==="function")?getLog():{}, seen={};
      stripDays().forEach(function(d, i){
        if(!d || d.type==="rest" || seen[d.name]) return; seen[d.name]=1;
        var when=dop==null?null:(i+1<dop?"past":(i+1===dop?"today":"ahead"));
        if(access==="preview" && when==="ahead") return;
        var log=L[wk+"|"+d.name], tg=[];
        try{ tg=dayTargets(d, wk); }catch(e){}
        var row={ day:d.name, when:when,
          status:log?(sessionFinished(log)?"done":"started"):((typeof sessionSkipped==="function"&&sessionSkipped(wk,d.name))?"skipped":"not started"),
          ex:tg.slice(0,9).map(function(t){
            var x={ name:t.name, target:t.target }, lx=log&&(log.ex||[]).filter(function(e){ return e&&e.name===t.name; })[0], top=null;
            if(lx) (lx.sets||[]).forEach(function(st){
              var w=parseFloat(st.w)||0, r=parseInt(st.r,10)||0; if(!r) return;
              var e=w?e1RM(w,r):r/100; if(!top || e>top.e) top={ e:e, w:w, r:r }; });
            if(top) x.top=top.w?(top.w+"×"+top.r):(top.r+" reps");
            return x; }) };
        out.days.push(row);
      });
      if(typeof bigLiftStats==="function") out.lifts=bigLiftStats().slice(0,6).map(function(x){
        return { name:x.name, firstE1rm:Math.round(x.first), lastE1rm:Math.round(x.last), bestE1rm:Math.round(x.best), sessions:x.n }; });
      return out;
    }catch(e){ return null; }
  }
  function ffBrainSnapshot(){
    var signals=ffBrainSignals();
    return { version:1, generatedAt:new Date().toISOString(), signals:signals,
      intervention:ffBrainDecision(signals), forecast:ffBrainForecast(signals), training:ffBrainTraining() };
  }
  window.FFBrain={
    version:1,
    snapshot:ffBrainSnapshot,
    training:ffBrainTraining,
    decision:function(){ var s=ffBrainSignals(); return ffBrainDecision(s); },
    forecast:function(){ var s=ffBrainSignals(); return ffBrainForecast(s); }
  };
