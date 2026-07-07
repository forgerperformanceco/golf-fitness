  /* ===================== PROACTIVE COACHING — "Your focus" insights =====================
     A rules engine over the user's OWN data. It detects real signals (a speed stall, a PR,
     a streak about to slip, mass that hasn't converted to speed, a stalled lift, going
     quiet) and surfaces ONE prioritized, actionable card on the dashboard — the retention
     anchor. Deterministic + offline + free; the optional "go deeper" button is the AI layer
     (it opens the coach with a tailored prompt, so we never spend tokens on a passive load). */
  function ffInsightSeen(){ return lsGet("ff_insights_seen", []); }
  function ffDismissInsight(sig){ var s=ffInsightSeen(); if(s.indexOf(sig)<0){ s.push(sig); if(s.length>40) s=s.slice(-40); lsSet("ff_insights_seen", s); } }
  function ffInsights(){
    var out=[], body=lsGet("ff_body",[]), sessions=sessionsByWeek();
    var freq=(typeof planState!=="undefined" && planState.freq)?planState.freq:4, wk=curWeek();
    var spd=body.map(function(e){ return { t:new Date(e.date).getTime(), s:parseFloat(e.s) }; })
                .filter(function(p){ return !isNaN(p.t) && !isNaN(p.s); }).sort(function(a,b){ return a.t-b.t; });
    var lastSpeed=spd.length?spd[spd.length-1].s:null;
    var times=[]; body.forEach(function(e){ var t=new Date(e.date).getTime(); if(!isNaN(t)) times.push(t); });
    sessions.forEach(function(se){ var t=new Date(se.s&&se.s.date).getTime(); if(!isNaN(t)) times.push(t); });
    var lastAct=times.length?Math.max.apply(null,times):null;
    var daysIdle=lastAct!=null?Math.floor((Date.now()-lastAct)/864e5):null;
    var hasData=body.length>0 || sessions.length>0;
    var thisWk=sessions.filter(function(se){ return se.w===wk; }).length;

    if(spd.length===0 && hasData)
      out.push({prio:55, sig:"coldspeed", ic:"⚡", title:"Start your speed trend",
        body:"You're putting in the work — now capture the payoff. Run the guided <b>speed test</b> — warm-up, 3 max swings, best one counts — and every session starts proving itself.",
        act:"speedtest", actLabel:"🎯 Run the test",
        ask:"I haven't logged a clubhead speed yet — how do I measure my 7-iron speed and what's a realistic number for my level?"});

    // Mobility screen — first-time nudge, then the 4-week re-screen cadence.
    var mobLast=(typeof lastMob==="function")?lastMob():null;
    if(!mobLast && hasData)
      out.push({prio:79, sig:"mob0", ic:"🧭", title:"3-minute mobility screen",
        body:"Adding muscle should never cost you turn. Three quick self-tests — trunk rotation, hips, deep squat — become your Octane's <b>5th pillar</b> and tune your warm-ups to whatever's tight.",
        act:"mobscreen", actLabel:"🧭 Take the screen"});
    else if(mobLast && (Date.now()-mobLast.ts)>=28*864e5)
      out.push({prio:72, sig:"mobre:"+Math.floor(Date.now()/(14*864e5)), ic:"🧭", title:"Mobility re-screen due",
        body:"It's been 4+ weeks since your last screen (score <b>"+mobLast.score+"/100</b>). Re-run the 3 moves to prove the new mass is staying mobile — and to clear the extra warm-up work if you've loosened up.",
        act:"mobscreen", actLabel:"🧭 Re-run the screen"});

    // The biweekly retest ritual — testing is the scoreboard, so it gets its own nudge.
    if(spd.length>0 && speedTestDue() && planStart())
      out.push({prio:82, sig:"stest:"+Math.floor(Date.now()/(7*864e5)), ic:"🎯", title:"Speed Test Day",
        body:(daysSinceTest()!=null?("It's been <b>"+daysSinceTest()+" days</b> since your last test. "):"")+
          "Warm up, take <b>3 max-intent 7-iron swings</b>, keep the best. Two weeks of training since the last one — time to see what it bought you.",
        act:"speedtest", actLabel:"🎯 Run today's test"});

    if(daysIdle!=null && daysIdle>=6 && hasData)
      out.push({prio:95, sig:"reengage:"+Math.floor(Date.now()/(3*864e5)), ic:"👋", title:"Pick the streak back up",
        body:"It's been <b>"+daysIdle+" days</b> since your last entry. One quick log today — bodyweight or a workout — keeps your trend and Octane alive.", ask:null});

    if(daysIdle!=null && daysIdle<6){
      if(thisWk===0)
        out.push({prio:76, sig:"streak0:wk"+wk, ic:"🔥", title:"No sessions logged this week",
          body:"Get one in to keep your momentum. Your plan calls for <b>"+freq+"</b> this week — even a single session protects the habit.", ask:null});
      else if(thisWk<freq)
        out.push({prio:74, sig:"streak:wk"+wk+":"+thisWk, ic:"🔥", title:thisWk+" of "+freq+" sessions this week",
          body:"<b>"+(freq-thisWk)+" more</b> keeps your week on plan. Showing up is the single biggest lever on your Octane — consistency beats intensity.", ask:null});
    }

    if(spd.length>=2){
      var latest=spd[spd.length-1], base=spd[0].s, prevMax=Math.max.apply(null, spd.slice(0,-1).map(function(p){ return p.s; }));
      var spanDays=(latest.t-spd[0].t)/864e5;
      if(latest.s>prevMax+0.4){
        var gain=Math.round((latest.s-base)*10)/10;
        out.push({prio:84, sig:"pr:"+latest.s, ic:"🚀", title:"New 7-iron PR — "+latest.s+" mph",
          body:(gain>0?("Up <b>+"+gain+" mph</b> from baseline ≈ <b>+"+Math.round(gain*2)+" yards</b> of carry. "):"")+"Whatever you're doing is working — keep the overspeed work crisp and fully rested.",
          ask:"I just hit a new 7-iron speed PR. How do I keep progressing from here without plateauing or losing the gains?"});
      } else if(spd.length>=3 && spanDays>=14 && latest.s<=base+0.4){
        var wks=Math.round(spanDays/7);
        out.push({prio:80, sig:"stall:"+latest.s+":"+wks, ic:"📉", title:"Speed's been flat ~"+wks+" weeks",
          body:"You've kept training but the 7-iron number hasn't moved. Usual culprits: not enough true <b>overspeed</b> work, under-recovery, or under-fueling around training. Want the fix tailored to you?",
          ask:"My 7-iron clubhead speed has been flat for about "+wks+" weeks even though I've kept training. What are the most likely causes and exactly how do I break the plateau?"});
      }
    }

    var tr=weightTrend();
    if(tr && tr.ratePerWeek>0.25 && spd.length>=2 && spd[spd.length-1].s<=spd[0].s+0.4)
      out.push({prio:78, sig:"convert:"+Math.round(tr.ratePerWeek*10), ic:"🔁", title:"Turn that mass into speed",
        body:"You're gaining weight (<b>"+(tr.ratePerWeek>0?'+':'')+(Math.round(tr.ratePerWeek*10)/10)+" lb/wk</b>) but 7-iron speed is flat — the new muscle hasn't been <i>converted</i> yet. Bias toward overspeed swings, jumps and med-ball throws, and make sure you're not over-bulking.",
        ask:"I've added bodyweight but my clubhead speed hasn't gone up. How do I convert the new mass into actual swing speed?"});

    bigLiftStats().slice(0,4).forEach(function(L){
      if(L.n>=2 && L.last===L.best && L.last>L.first)
        out.push({prio:58, sig:"spr:"+L.name+":"+Math.round(L.last), ic:"🏋️", title:"Strength PR — "+L.name,
          body:"Estimated 1RM up to <b>"+Math.round(L.last)+" lb</b>. Force is the raw material for clubhead speed — this is exactly how mass becomes yards.", ask:null});
      else if(L.n>=3){
        var recent=L.series.slice(-3), rmax=Math.max.apply(null,recent);
        if(L.last<=rmax && L.last<=L.best-0.5)
          out.push({prio:60, sig:"sstall:"+L.name+":"+Math.round(L.last), ic:"🧱", title:L.name+" has stalled",
            body:"Estimated 1RM has plateaued around <b>"+Math.round(L.last)+" lb</b>. Try the double-progression bump — hold the load until you hit the top of every set's rep range, then add a little — or take a deload week.",
            ask:"My "+L.name+" estimated 1RM has stalled for a few sessions. How should I adjust my training to start progressing again?"});
      }
    });

    // No filler card. A "keep going" pat-on-the-back every quiet day trains the
    // eye to scroll past this slot — real signals only, so the slot stays loud.
    if(!hasData)
      out.push({prio:40, sig:"firststeps", ic:"🌟", title:"Let's get your first data points",
        body:"Log a workout on the <b>Train</b> tab and drop today's bodyweight + 7-iron speed below. Two data points and your trends — and your Octane — start climbing.", ask:null});

    return out.sort(function(a,b){ return b.prio-a.prio; });
  }
  function renderInsight(){
    var seen=ffInsightSeen(), list=ffInsights().filter(function(i){ return seen.indexOf(i.sig)<0; });
    if(!list.length) return '';
    var i=list[0];
    return '<div class="insight">'+
      '<button class="insight-x" data-insdismiss="'+escAttr(i.sig)+'" aria-label="Dismiss">×</button>'+
      '<div class="insight-top"><span class="insight-ic">'+i.ic+'</span><span class="insight-kick">Your focus</span></div>'+
      '<div class="insight-title">'+i.title+'</div>'+
      '<div class="insight-body">'+i.body+'</div>'+
      (i.act?'<button class="insight-cta" data-'+i.act+'="1">'+(i.actLabel||'Open')+'</button>':'')+
      (i.ask?'<button class="insight-cta" data-insask="'+escAttr(i.ask)+'">💬 Go deeper with the coach</button>':'')+
      '</div>';
  }
  /* ----- HOME = the Today spine: one primary action, then the day in time order.
     Deep dives stay on their tabs; Home answers "what do I do right now?" ----- */
  function todaySlot(){ var dop=dayOfPlan(); if(dop==null) return null; return stripDays()[dop-1]||null; }
  function nextUpCard(){
    if(!planStart())
      return '<button type="button" class="nu-card" data-goview="plan"><span class="nu-go">›</span>'+
        '<div class="nu-kick">Next up</div><div class="nu-title">Start your 20-week plan</div>'+
        '<div class="nu-sub">Today becomes Day 1 — fuel, lifts and speed work, dialed to you.</div></button>';
    var wk=curWeek(), d=todaySlot();
    if(d && d.type!=="rest"){
      var sess=getSession(wk, d.name);
      if(!(sess && sess.finishedAt)){
        var started=!!(sess && (sess.ex||[]).some(function(x){ return (x.sets||[]).some(function(st){ return st.w||st.r||st.done; }); }));
        return '<button type="button" class="nu-card" data-startplayer="'+escAttr(d.name)+'"><span class="nu-go">›</span>'+
          '<div class="nu-kick">Next up · Week '+wk+' · '+WAVES[waveFor(wk)].label+'</div>'+
          '<div class="nu-title">'+(started?'Resume: ':ffIcon("play",13)+' ')+d.name.replace(/^Day \d+ — /,"")+'</div>'+
          '<div class="nu-sub">'+(started?'Picking up right where you left off — everything’s saved.':'Guided player — warm-up, prescribed loads, rest timer.')+'</div></button>';
      }
    }
    if(speedTestDue() && lsGet("ff_body",[]).some(function(e){ return e && e.s; }))
      return '<button type="button" class="nu-card alt" data-speedtest="1"><span class="nu-go">›</span>'+
        '<div class="nu-kick">Next up · The scoreboard</div><div class="nu-title">🎯 Speed Test Day</div>'+
        '<div class="nu-sub">3 max-intent 7-iron swings — best one counts. Two weeks of work; time to cash it in.</div></button>';
    if(mobDue())
      return '<button type="button" class="nu-card alt" data-mobscreen="1"><span class="nu-go">›</span>'+
        '<div class="nu-kick">Next up · 3 minutes</div><div class="nu-title">🧭 Mobility screen</div>'+
        '<div class="nu-sub">Trunk · hips · deep squat — completes your Octane and tunes your warm-ups.</div></button>';
    if(d && d.type==="rest"){
      var doneR=restDone(wk, dayKey(d));
      return '<button type="button" class="nu-card rest" data-nurest="'+escAttr(dayKey(d))+'"><span class="nu-go">'+(doneR?'✓':'›')+'</span>'+
        '<div class="nu-kick">Next up · Recovery day</div><div class="nu-title">'+(doneR?'Recovery banked ✓':'🌱 Recover on purpose')+'</div>'+
        '<div class="nu-sub">'+(doneR?'Growth happens today. See you tomorrow.':'Walk a casual 9, mobility flow, foam roll — tap to log it.')+'</div></button>';
    }
    return '<button type="button" class="nu-card rest" data-goview="plan"><span class="nu-go">›</span>'+
      '<div class="nu-kick">Next up</div><div class="nu-title">Today is banked ✓</div>'+
      '<div class="nu-sub">Session done. Eat to your targets and let it build — tomorrow’s plan is ready.</div></button>';
  }
  // Calm-pass state: whether the "✓ N banked" pill is expanded (session-only —
  // the fold resets each visit, which is the calm default).
  var tlShowDone=false;
  function timelineHtml(){
    if(!planStart()) return '';
    var hour=FF_SLOT_HOUR[(typeof state!=="undefined" && state.workout)||"morning"]||17;
    var nowH=new Date().getHours();
    var today=todayStr(), row=null, body=lsGet("ff_body",[]);
    for(var i=body.length-1;i>=0;i--){ if(body[i] && body[i].date===today){ row=body[i]; break; } }
    var weighed=!!(row && row.w);
    var d=todaySlot(), train=d && d.type!=="rest";
    var sess=train?getSession(curWeek(), d.name):null, trained=!!(sess && sess.finishedAt);
    var restDoneToday=(d && d.type==="rest")?restDone(curWeek(), dayKey(d)):false;
    // The full card (used for exactly ONE row — the next thing to do) and the
    // slim row (everything else). Same tap targets and data- attributes either
    // way; the calm pass only changes how much ink each row gets.
    function full(e, now){
      return '<div class="tl-item'+(e.done?" done":"")+(now?" now":"")+'">'+
        '<div class="tl-when">'+e.when+'</div><div class="tl-rail"><span class="tl-dot"></span></div>'+
        '<button type="button" class="tl-card"'+(e.attr||' disabled')+'>'+
        '<span class="tl-ic">'+e.ic+'</span><span class="tl-tx"><span class="tl-t">'+e.t+'</span><span class="tl-s">'+e.sub+'</span></span>'+
        (e.attr?'<span class="tl-go">›</span>':'')+'</button></div>';
    }
    function slim(e){
      return '<div class="tl-item slim'+(e.done?" done":"")+'">'+
        '<div class="tl-when">'+e.when+'</div><div class="tl-rail"><span class="tl-dot"></span></div>'+
        '<button type="button" class="tl-card"'+(e.attr||' disabled')+'>'+
        '<span class="tl-ic">'+e.ic+'</span><span class="tl-tx"><span class="tl-t">'+e.t+'</span></span>'+
        (e.attr?'<span class="tl-go">›</span>':'')+'</button></div>';
    }
    function entry(min, when, ic, t, sub, o){ o=o||{};
      return { min:min, when:when, ic:ic, t:t, sub:sub, attr:o.attr, done:!!o.done }; }
    var fdT=fuelDay(ffISO())||{ m:{} };
    // The full daily checklist: EVERY meal from today's plan is a one-tap
    // check-off here, time-sorted around the training block — the fuel loop
    // lives on Home; the Fuel tab stays the detail view.
    var fuelChip='';
    if(ffSchedule && ffSchedule.length){
      var nDone=0; ffSchedule.forEach(function(sl,i){ if(fdT.m && fdT.m[i]) nDone++; });
      var mealsOk=nDone>=ffSchedule.length || fdT.rating==="on" || fdT.rating==="close";
      var trainOk=train ? trained : restDoneToday;
      if(mealsOk && trainOk && weighed){
        // Everything on the list is done — the marker becomes the reward.
        fuelChip='<button type="button" class="tl-fuelchip full" data-goview="progress">✓ Day banked</button>';
      } else {
        fuelChip='<button type="button" class="tl-fuelchip'+(nDone>=ffSchedule.length?" full":"")+'" data-goview="calc">'+
          ffIcon("gauge",12)+' '+nDone+'/'+ffSchedule.length+' fueled</button>';
      }
    }
    var entries=[];
    entries.push(entry(7*60,"AM","⚖️","Morning weigh-in",
      weighed?("Logged — "+row.w+" lb ✓"):"Same scale, same time — feeds your trend & Octane",
      { done:weighed, attr:' data-qopen="1"' }));
    if(train){
      entries.push(entry(hour*60, fmtMin(hour*60),"🏋️",d.name.replace(/^Day \d+ — /,""),
        trained?"Done — banked to history":(WAVES[waveFor(curWeek())].label+" week · guided player"),
        { attr:' data-startplayer="'+escAttr(d.name)+'"', done:trained }));
    } else if(d){
      entries.push(entry(12*60, fmtMin(12*60),"🌱","Active recovery",
        restDoneToday?"Recovery logged":"Walk 9, mobility flow, foam roll — growth day",
        { attr:' data-nurest="'+escAttr(dayKey(d))+'"', done:restDoneToday }));
    }
    if(ffSchedule && ffSchedule.length){
      ffSchedule.forEach(function(sl,i){
        var done=!!(fdT.m && fdT.m[i]);
        var mins=(sl.t!=null)? Math.round(sl.t*60) : (9+i*3)*60;
        var ic=(sl.kind==="pre"||sl.isPre)?"🍚":(sl.isPost?"🥤":"🍽️");
        var macro=(sl.p?sl.p+"P":"")+(sl.c?((sl.p?" · ":"")+sl.c+"C"):"");
        entries.push(entry(mins, fmtMin(mins), ic, sl.label,
          done?"Banked ✓ — tap to undo":(macro?macro+" — tap when eaten":"Tap when eaten"),
          { attr:' data-fuelmeal="'+i+'" data-fuelval="a"', done:done }));
      });
    } else if(train){
      // No meal plan built yet — keep generic fuel guidance rows.
      entries.push(entry((hour-1)*60, fmtMin((hour-1)*60),"🍚","Pre-workout fuel",
        "Carbs + lean protein ~60–90 min out", { attr:' data-goview="calc"', done:trained || nowH>hour }));
      entries.push(entry((hour+1)*60, fmtMin((hour+1)*60),"🥤","Post-workout meal",
        "Protein + fast carbs within ~45 min", { attr:' data-goview="calc"', done:trained && nowH>hour+1 }));
    }
    var rd=(typeof roundToday==="function")?roundToday():null;
    if(rd){
      entries.push(entry(24*60,"Any","⛳","Round banked ✓",
        [(rd.score!=null?("shot "+rd.score):null),(rd.drive?(Math.round(rd.drive)+" yd bomb"):null),(rd.energy==="strong"?"finished strong":null)].filter(Boolean).join(" · ")||"tap to edit",
        { attr:' data-roundlog="1"', done:true }));
    } else {
      entries.push(entry(24*60+1,"Any","⛳","Playing a round?","Plan it — and log how it went after",{ attr:' data-goview="gameday"' }));
    }
    entries.sort(function(a,b){ return a.min-b.min; });
    // Calm layout: everything done folds into one pill; the FIRST undone item
    // gets the full card ("what do I do right now?"); the rest of the day is
    // slim one-line rows — same taps, a fraction of the ink.
    var doneList=entries.filter(function(e){ return e.done; });
    var pending=entries.filter(function(e){ return !e.done; });
    var wkday=''; try{ wkday=new Date().toLocaleDateString(undefined,{weekday:"long"}); }catch(e){}
    var h='<div class="tl"><div class="tl-h"><span>'+ffIcon("calendar",13)+' Your '+(wkday||'day')+'</span>'+fuelChip+'</div>';
    if(doneList.length){
      h+='<button type="button" class="tl-donepill" data-tldone="1">✓ '+doneList.length+' banked'+
        '<span>'+(tlShowDone?'hide':'show')+'</span></button>';
      if(tlShowDone) h+=doneList.map(slim).join("");
    }
    pending.forEach(function(e,i){ h+= i===0 ? full(e, true) : slim(e); });
    h+='</div>';
    return h;
  }
  document.addEventListener("click", function(e){
    if(!e.target.closest("[data-tldone]")) return;
    tlShowDone=!tlShowDone;
    try{ renderDash(); }catch(_){}
  });
  function renderDash(){
    var el=$("dashBody"); if(!el) return;
    // Action first (the Hevy rule), status second, ONE advice card ever —
    // the metabolism check-in outranks the focus nudge when it's due.
    var html = nextUpCard();         // the ONE thing to do right now
    try{ html += dashTipHtml(); }catch(e){}   // one-time nudge, never above the action
    // One coaching voice at a time: when an advice card is showing, the hero's
    // lever line steps down to a quiet tag; otherwise the hero carries the coaching.
    var advice = renderAdaptiveCard() || renderInsight();
    html += renderHeroCard(!!advice);
    html += advice;
    html += timelineHtml();          // the day, in time order
    html += '<button class="dash-ai" data-ask="read"><span class="dai-ic">💬</span>'+
      '<span class="dai-tx"><b>Coach’s read</b><span>A quick AI take on your numbers &amp; what to focus on</span></span>'+
      '<span class="dai-go">›</span></button>';
    el.innerHTML=html;
  }
