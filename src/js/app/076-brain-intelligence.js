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
  function ffBrainSpeedSeries(){
    var rows=lsGet("ff_body",[]), out=[];
    rows.forEach(function(row,i){
      var speed=ffBrainNum(row&&row.s); if(speed==null) return;
      out.push({ speed:speed, ts:ffBrainTime(row,Date.now()-(rows.length-i)*14*864e5) });
    });
    return out.sort(function(a,b){ return a.ts-b.ts; });
  }
  function ffBrainFuelScore(day){
    if(!day) return null;
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
    var recentTs=0;
    hist.forEach(function(h){ recentTs=Math.max(recentTs,+h.ts||0); });
    (lsGet("ff_body",[])||[]).forEach(function(b){ recentTs=Math.max(recentTs,+b.ts||0); });
    var score=lsGet("ff_score",null), trend=null;
    var started=typeof planStart==="function" && !!planStart();
    try{ trend=weightTrend(); }catch(e){}
    return {
      planWeek:(started&&typeof curWeek==="function")?curWeek():null,
      phase:(started&&typeof curWeek==="function"&&typeof waveFor==="function"&&typeof WAVES!=="undefined")?WAVES[waveFor(curWeek())].label:null,
      sessionsLast7:sessions7, weeklyTarget:targetFreq,
      trainingAdherence:Math.min(1,sessions7/Math.max(1,targetFreq)),
      fuelDaysLogged:fuelVals.length, fuelAdherence:fuelAvg==null?null:ffBrainRound(fuelAvg,2),
      speedTests:speeds.length, speedNow:speedNow, speedGain:speedNow!=null&&speedBase!=null?ffBrainRound(speedNow-speedBase,1):null,
      speedSpanDays:Math.round(spanDays),
      weightRatePerWeek:trend&&trend.ratePerWeek!=null?ffBrainRound(trend.ratePerWeek,2):null,
      octane:score&&score.score!=null?score.score:null,
      daysSinceAnyLog:recentTs?Math.floor((now-recentTs)/864e5):null
    };
  }
  function ffBrainDecision(signals){
    if(typeof planStart!=="function" || !planStart()) return { key:"start", title:"Start the season", reason:"Your plan has not started, so there is nothing to adapt yet.", action:"Start Week 1 and establish today as Day 1." };
    if(signals.speedTests===0) return { key:"baseline", title:"Bank the speed baseline", reason:"Without a 7-iron baseline, the app cannot prove whether the work is buying speed.", action:"Run the guided three-swing Speed Test; best swing counts." };
    if(typeof speedTestDue==="function" && speedTestDue()) return { key:"retest", title:"Reassess speed now", reason:"The biweekly testing window is open, and a fresh outcome is more valuable than another guess.", action:"Warm up, take three max-intent 7-iron swings, and log the best." };
    if(signals.daysSinceAnyLog!=null && signals.daysSinceAnyLog>=6)
      return { key:"reengage", title:"Restart the feedback loop", reason:"The brain has gone "+signals.daysSinceAnyLog+" days without a new signal.", action:"Log one workout, weigh-in, or speed test today." };
    if(signals.sessionsLast7<Math.max(1,signals.weeklyTarget-1))
      return { key:"consistency", title:"Protect training consistency", reason:"You have banked "+signals.sessionsLast7+" of "+signals.weeklyTarget+" planned sessions in the last seven days.", action:"Complete the next prescribed session before adding extra work." };
    if(signals.fuelAdherence!=null && signals.fuelDaysLogged>=3 && signals.fuelAdherence<.65)
      return { key:"fuel", title:"Close the fuel gap", reason:"Your recent fuel adherence is "+Math.round(signals.fuelAdherence*100)+"%, which can cap recovery and training quality.", action:"Bank every planned feeding for the next two days, starting with protein and workout carbs." };
    if(signals.speedTests>=3 && signals.speedSpanDays>=21 && signals.speedGain<=.4)
      return { key:"plateau", title:"Break the speed plateau", reason:"Three or more tests across "+signals.speedSpanDays+" days show no meaningful speed gain yet.", action:"Keep strength work, but protect full-rest jumps, throws, and overspeed quality this week." };
    if(typeof mobDue==="function" && mobDue())
      return { key:"mobility", title:"Refresh the durability read", reason:"Your mobility screen is due, so warm-up personalization may be stale.", action:"Run the three-move screen before the next lower-body or speed session." };
    return { key:"stay", title:"Stay on the winning dose", reason:"Training, testing, and recovery signals do not show a reason to change the plan.", action:"Complete the next prescribed session and keep the next reassessment date." };
  }
  function ffBrainForecast(signals){
    var s=ffBrainSpeedSeries();
    if(s.length<2) return {
      status:"building", horizonWeeks:6, confidence:"Not ready",
      reason:"Two dated 7-iron speed tests are required.", next:"Run one more guided Speed Test at least seven days after the first."
    };
    var first=s[0], last=s[s.length-1], days=Math.max(1,(last.ts-first.ts)/864e5);
    if(days<7) return {
      status:"building", horizonWeeks:6, confidence:"Low",
      reason:"The current tests are less than seven days apart.", next:"Retest after a full training week so noise does not masquerade as progress."
    };
    var rawPerWeek=(last.speed-first.speed)/(days/7);
    var capped=Math.max(-.5,Math.min(.75,rawPerWeek));
    var evidence=Math.min(1,.35+(s.length-2)*.18+Math.min(42,days)/84);
    var adherence=.55+.45*Math.max(0,Math.min(1,signals.trainingAdherence));
    var projected=capped*6*evidence*adherence;
    var uncertainty=1.35-(Math.min(1,evidence)*.65);
    var low=ffBrainRound(last.speed+projected-uncertainty,1);
    var high=ffBrainRound(last.speed+projected+uncertainty,1);
    var gainLow=ffBrainRound(low-last.speed,1), gainHigh=ffBrainRound(high-last.speed,1);
    var conf=evidence>=.72?"High":(evidence>=.5?"Medium":"Low");
    return {
      status:"ready", horizonWeeks:6, confidence:conf, current7Iron:last.speed,
      projected7Iron:{ low:low, high:high },
      projectedGain:{ low:gainLow, high:gainHigh },
      estimated7IronCarryGainYards:{ low:Math.round(gainLow*2), high:Math.round(gainHigh*2) },
      basis:[
        s.length+" dated speed tests across "+Math.round(days)+" days",
        signals.sessionsLast7+" of "+signals.weeklyTarget+" sessions in the last seven days",
        "trend capped to a realistic directional range"
      ],
      disclaimer:"Directional estimate, not a promise. Testing conditions and strike quality can move the result."
    };
  }
  function ffBrainSnapshot(){
    var signals=ffBrainSignals();
    return { version:1, generatedAt:new Date().toISOString(), signals:signals,
      intervention:ffBrainDecision(signals), forecast:ffBrainForecast(signals) };
  }
  window.FFBrain={
    version:1,
    snapshot:ffBrainSnapshot,
    decision:function(){ var s=ffBrainSignals(); return ffBrainDecision(s); },
    forecast:function(){ var s=ffBrainSignals(); return ffBrainForecast(s); }
  };
