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
        out.push({prio:58, sig:"spr:"+L.name+":"+Math.round(L.last), ic:"🏋️", title:"Strength PR — "+ffEsc(L.name),
          body:"Estimated 1RM up to <b>"+Math.round(L.last)+" lb</b>. Force is the raw material for clubhead speed — this is exactly how mass becomes yards.", ask:null});
      else if(L.n>=3){
        var recent=L.series.slice(-3), rmax=Math.max.apply(null,recent);
        if(L.last<=rmax && L.last<=L.best-0.5)
          out.push({prio:60, sig:"sstall:"+L.name+":"+Math.round(L.last), ic:"🧱", title:ffEsc(L.name)+" has stalled",
            body:"Estimated 1RM has plateaued around <b>"+Math.round(L.last)+" lb</b>. Try the double-progression bump — hold the load until you hit the top of every set's rep range, then add a little — or take a deload week.",
            ask:"My "+L.name+" estimated 1RM has stalled for a few sessions. How should I adjust my training to start progressing again?"});
      }
    });

    // No filler card. A "keep going" pat-on-the-back every quiet day trains the
    // eye to scroll past this slot — real signals only, so the slot stays loud.
    if(!hasData)
      out.push({prio:40, sig:"firststeps", ic:"🌟", title:"Let's get your first data points",
        body:"Do a workout from Home, then add today's bodyweight and 7-iron speed with <b>Log something</b>. Two data points and your trends start climbing.", ask:null});

    return out.sort(function(a,b){ return b.prio-a.prio; });
  }
  /* ----- HOME = one big button. The next thing to do, in plain words, with a
     visible action label; then three quiet rows (meals, progress, log) and the
     coach. Everything else lives on its own tab. (Simplification pass, Sep 2026:
     the readiness card, the day timeline, the progress fold and the weekly plan
     all left Home — readiness still asks before a workout starts, and the week
     review lives on Stats.) ----- */
  function todaySlot(){ var dop=dayOfPlan(); if(dop==null) return null; return stripDays()[dop-1]||null; }
  // A missed workout is never a broken streak or a reason to restart. Surface
  // the oldest unfinished session whose calendar slot has already passed, then
  // let the normal player bank it without moving dates or erasing progress.
  function missedWorkout(){
    if(!planStart()) return null;
    if(typeof seasonComplete==="function" && seasonComplete()) return null;   // season over: nothing is missed
    var days=stripDays(), through=Math.max(0,(dayOfPlan()||1)-1), wk=curWeek();
    for(var i=0;i<through;i++){
      var d=days[i]; if(!d || d.type==="rest") continue;
      if(!sessionFinished(getSession(wk,d.name)) && !sessionSkipped(wk,d.name)) return d;
    }
    return null;
  }
  function nuCta(label){ return '<span class="nu-cta">'+label+' <i aria-hidden="true">›</i></span>'; }
  function nuMinutes(d){ var m=0; try{ m=sessionMinutes(d); }catch(_){} return m?('About '+m+' min · '):''; }
  function nextUpCard(){
    if(!planStart())
      return '<button type="button" class="nu-card" data-homestart="1">'+
        '<div class="nu-kick">Get started</div><div class="nu-title">Start your 20-week plan</div>'+
        '<div class="nu-sub">Today becomes day 1. Your workouts, meals and speed tests are set up for you.</div>'+
        nuCta("Start my plan")+'</button>';
    if(typeof seasonComplete==="function" && seasonComplete())
      return '<button type="button" class="nu-card" data-goview="plan">'+
        '<div class="nu-kick">🏁 Season complete</div><div class="nu-title">You finished all 20 weeks</div>'+
        '<div class="nu-sub">Start a new season on Train — your history and trends carry over.</div>'+
        nuCta("See what’s next")+'</button>';
    var wk=curWeek(), missed=missedWorkout(), d=todaySlot();
    if(missed){
      var old=getSession(wk,missed.name), mid=sessionInProgress(old);
      return '<div class="nu-catchup"><button type="button" class="nu-card catchup" data-startplayer="'+escAttr(missed.name)+'" data-catchup="1">'+
        '<div class="nu-kick">Catch up</div>'+
        '<div class="nu-title">'+missed.name.replace(/^Day \d+ — /,"")+'</div>'+
        '<div class="nu-sub">'+(mid?'You started this one — finish it today and your plan stays on track.':'You missed this one — do it today and your plan stays on track.')+'</div>'+
        nuCta(mid?'Finish workout':'Start workout')+'</button>'+
        '<button type="button" class="nu-skip" data-skipsession="'+escAttr(missed.name)+'" data-skipweek="'+wk+'">Skip it <span>and keep my plan moving</span></button></div>';
    }
    if(d && d.type!=="rest"){
      var sess=getSession(wk, d.name);
      if(!(sess && sess.finishedAt)){
        var started=sessionInProgress(sess);
        return '<button type="button" class="nu-card" data-startplayer="'+escAttr(d.name)+'">'+
          '<div class="nu-kick">Today’s workout · Week '+wk+' · '+WAVES[waveFor(wk)].label+' week</div>'+
          '<div class="nu-title">'+d.name.replace(/^Day \d+ — /,"")+'</div>'+
          '<div class="nu-sub">'+(started?'Pick up where you left off — everything’s saved.':nuMinutes(d)+'The app walks you through every set.')+'</div>'+
          nuCta(started?'Resume workout':'Start workout')+'</button>';
      }
    }
    if(speedTestDue() && lsGet("ff_body",[]).some(function(e){ return e && e.s; }))
      return '<button type="button" class="nu-card alt" data-speedtest="1">'+
        '<div class="nu-kick">Today · Speed test</div><div class="nu-title">🎯 Test your swing speed</div>'+
        '<div class="nu-sub">3 full swings with a 7-iron — the best one counts. See what two weeks of training bought you.</div>'+
        nuCta("Start the test")+'</button>';
    if(mobDue())
      return '<button type="button" class="nu-card alt" data-mobscreen="1">'+
        '<div class="nu-kick">Today · 3 minutes</div><div class="nu-title">🧭 Mobility check</div>'+
        '<div class="nu-sub">Three quick moves — trunk, hips, deep squat. It tunes your warm-ups.</div>'+
        nuCta("Start the check")+'</button>';
    if(d && d.type==="rest"){
      // A logged round IS today's activity — it satisfies the rest/"Play 18" day
      // and the card acknowledges the golf instead of nudging recovery.
      var rtd=(typeof roundToday==="function")?roundToday():null;
      var doneR=restDone(wk, dayKey(d)) || !!rtd;
      return '<button type="button" class="nu-card rest" data-nurest="'+escAttr(dayKey(d))+'">'+
        (doneR?'<span class="nu-go">✓</span>':'')+
        '<div class="nu-kick">Today · '+(rtd?'Golf day':'Rest day')+'</div>'+
        '<div class="nu-title">'+(rtd?'Round logged ⛳':(doneR?'Rest day done ✓':'🌱 Rest and recover'))+'</div>'+
        '<div class="nu-sub">'+(rtd?'18 holes is your workout today. Eat well and recover.':(doneR?'Recovery counts. Back at it tomorrow.':'Walk 9 holes, stretch or foam roll — then tap here.'))+'</div>'+
        (doneR?'':nuCta("Mark it done"))+'</button>';
    }
    return '<button type="button" class="nu-card rest" data-goview="plan"><span class="nu-go">✓</span>'+
      '<div class="nu-kick">Today</div><div class="nu-title">Today’s workout is done ✓</div>'+
      '<div class="nu-sub">Nice work. Eat well and let it build — tomorrow’s workout is ready.</div></button>';
  }
  function openingEventOnce(key,event,props){
    var seen=lsGet("ff_activation_events",{}); if(!seen||typeof seen!=="object") seen={};
    if(seen[key]) return;
    seen[key]=Date.now(); lsSet("ff_activation_events",seen);
    try{ if(window.FFHealth) window.FFHealth.track(event,props||{}); }catch(e){}
  }
  function openingRoundState(){
    var trained=sessionsByWeek().length>0;
    var fueled=false, f=fuelLog();
    Object.keys(f).some(function(iso){
      var state=fuelStateFor(iso);
      if(state==="on"||state==="close"){ fueled=true; return true; }
      return false;
    });
    var body=lsGet("ff_body",[]);
    var baseline=speedTests().length>0 || body.some(function(e){ return e && e.s!=null && e.s!==""; });
    return {trained:trained,fueled:fueled,baseline:baseline,
      done:(trained?1:0)+(fueled?1:0)+(baseline?1:0)};
  }
  // Workouts finished before the current plan began (a restart after a break,
  // or season 2) — that golfer already knows the moves; no checklist for them.
  function ffVeteran(){
    var st=Date.parse(planStart()), h=lsGet("ff_history",[]);
    return !isNaN(st) && Array.isArray(h) && h.some(function(e){ var t=e && (e.doneTs||e.ts); return t && t<st; });
  }
  function openingRoundHtml(){
    if(!planStart()) return "";
    var s=openingRoundState(), completedAt=lsGet("ff_opening_round_complete",0);
    if(!completedAt && ffVeteran()) return "";
    if(s.trained) openingEventOnce("train","activation_step",{step:"train"});
    if(s.fueled) openingEventOnce("fuel","activation_step",{step:"fuel"});
    if(s.baseline) openingEventOnce("baseline","activation_step",{step:"baseline"});
    if(s.done===3 && !completedAt){
      completedAt=Date.now(); lsSet("ff_opening_round_complete",completedAt);
      openingEventOnce("complete","activation_completed",{});
      setTimeout(function(){ try{ ffCelebrate(); ffToast("You’re all set — workout, meals and speed test done ⛳"); }catch(e){} },80);
    }
    // The completed state gets one victory lap, then leaves Home clean.
    if(s.done===3 && completedAt && Date.now()-completedAt>2*864e5) return "";
    // Never a permanent fixture: two weeks in, it has taught what it can.
    if(s.done<3 && (daysSinceStart()||0)>=14) return "";
    var steps=[
      {key:"train",ic:"🏋️",t:"Do your first workout",sub:"The app walks you through every set",done:s.trained,attr:' data-goview="plan"'},
      {key:"fuel",ic:"🍽️",t:"Check off a day of meals",sub:"Tap ✓ as you eat — no calorie counting",done:s.fueled,attr:' data-goview="calc"'},
      {key:"baseline",ic:"🎯",t:"Test your swing speed",sub:"3 swings with a 7-iron — your starting point",done:s.baseline,attr:' data-speedtest="1"'}
    ];
    var title=s.done===3?"You’re all set ✓":(s.done===2?"One more to go":(s.done===1?"Good start":"Three things to try first"));
    return '<section class="opening-round'+(s.done===3?' complete':'')+'" aria-label="Getting started">'+
      '<div class="or-top"><span><small>GETTING STARTED</small><b>'+title+'</b></span><strong>'+s.done+'<i>/3</i></strong></div>'+
      '<div class="or-track" aria-label="'+s.done+' of 3 done">'+[0,1,2].map(function(i){return '<i'+(i<s.done?' class="on"':'')+'></i>';}).join("")+'</div>'+
      '<div class="or-steps">'+steps.map(function(x){
        return '<button type="button" class="or-step'+(x.done?' done':'')+'"'+x.attr+' data-activation="'+x.key+'">'+
          '<span class="or-check">'+(x.done?'✓':x.ic)+'</span><span><b>'+x.t+'</b><small>'+(x.done?'Done':x.sub)+'</small></span><i>›</i></button>';
      }).join("")+'</div>'+
      (s.done===3?'<div class="or-win">✓ Workout, meals and speed test done. Your progress tracking starts here.</div>':'')+
      '</section>';
  }
  /* ----- WEEKLY PLAN ("flight plan")
     Sprint 3's retention loop, now on Stats (it left Home in the Sep 2026
     simplification pass; Home only shows a one-line "Review your week" row once
     the week can be closed). It turns an abstract "be consistent" goal into three
     visible jobs: train to the authored frequency, fuel on most days, and capture
     one body or performance signal. The week can still be closed when imperfect —
     reflection should pull a golfer back in, never become another streak to lose. ----- */
  var weekReviewOpen=false;
  function weeklyKey(){
    var d=weekStartDateCal();
    return ffISO(d);
  }
  function weeklyLoopState(){
    var start=weekStartDateCal(), startMs=start.getTime(), now=new Date();
    var freq=(typeof planState!=="undefined"&&planState.freq)||4;
    var sessions=lsGet("ff_history",[]).filter(function(h){ return h && (h.ts||0)>=startMs; }).length;
    var fuelDays=0;
    for(var i=0;i<7;i++){
      var d=new Date(start); d.setDate(start.getDate()+i);
      if(d>now) break;
      var f=fuelStateFor(ffISO(d));
      if(f==="on"||f==="close") fuelDays++;
    }
    var checkin=lsGet("ff_body",[]).some(function(e){
      var t=e&&(e.ts||new Date(e.date||0).getTime());
      return !!(t && !isNaN(t) && t>=startMs && (e.w||e.s||e.d));
    }) || mobTests().some(function(m){ return (m.ts||0)>=startMs; });
    var fuelTarget=Math.min(5,Math.max(3,freq));
    var day=(now.getDay()+6)%7, pace=Math.ceil(freq*(day+1)/7);
    var trainingDone=sessions>=freq, fuelDone=fuelDays>=fuelTarget;
    var done=(trainingDone?1:0)+(fuelDone?1:0)+(checkin?1:0);
    var reviews=lsGet("ff_weekly_reviews",{});
    if(!reviews||typeof reviews!=="object") reviews={};
    return {key:weeklyKey(),week:curWeek(),freq:freq,sessions:sessions,
      fuelDays:fuelDays,fuelTarget:fuelTarget,checkin:checkin,done:done,
      onPace:sessions>=pace,closeable:day>=5||trainingDone,review:reviews[weeklyKey()]||null};
  }
  function weeklyNext(s){
    if(s.sessions<s.freq) return {key:"train",label:"Do your next workout",sub:(s.freq-s.sessions)+" left this week",attr:' data-goview="plan"'};
    if(s.fuelDays<s.fuelTarget) return {key:"fuel",label:"Check off today’s meals",sub:(s.fuelTarget-s.fuelDays)+" more good day"+(s.fuelTarget-s.fuelDays===1?"":"s")+" this week",attr:' data-goview="calc"'};
    if(!s.checkin) return {key:"checkin",label:"Log one number",sub:"Bodyweight, swing speed or driver distance",attr:' data-weighin="1"'};
    return {key:"close",label:"Review your week",sub:"One minute: what went well and what’s next",attr:' data-weekclose="1"'};
  }
  function weeklyReviewCopy(s){
    var win=s.sessions>=s.freq ? "You did every workout." :
      (s.sessions ? "You did "+s.sessions+" workout"+(s.sessions===1?"":"s")+" — the work still counts." : "No workouts this week. The next one gets you going again.");
    var lesson=s.fuelDays>=s.fuelTarget ? "Your meals backed up the training." :
      (s.fuelDays ? "Meals checked off on "+s.fuelDays+" day"+(s.fuelDays===1?"":"s")+" — make the next meal the easy win." : "Checking off meals is the easiest win waiting for you.");
    return {win:win,lesson:lesson,next:"Week "+Math.min(20,s.week+1)+" keeps your history and starts with a clean card."};
  }
  function weeklyFlightHtml(){
    if(!planStart() || seasonComplete()) return "";
    var s=weeklyLoopState(), next=weeklyNext(s), review=weeklyReviewCopy(s);
    var title=s.review?"Week reviewed ✓":(s.done===3?"All three done":(s.onPace?"On track this week":"One workout gets the week moving"));
    var rows=[
      {ic:"🏋️",label:"Train",value:Math.min(s.sessions,s.freq)+"/"+s.freq,done:s.sessions>=s.freq},
      {ic:"🍽️",label:"Meals",value:Math.min(s.fuelDays,s.fuelTarget)+"/"+s.fuelTarget+" days",done:s.fuelDays>=s.fuelTarget},
      {ic:"📍",label:"Check-in",value:s.checkin?"Done":"Not yet",done:s.checkin}
    ];
    return '<section class="weekly-flight'+(s.review?' reviewed':'')+'" aria-label="This week">'+
      '<div class="wf-head"><span><small>WEEK '+s.week+' · THIS WEEK</small><b>'+title+'</b></span>'+
        '<strong>'+s.done+'<i>/3</i></strong></div>'+
      '<div class="wf-signals">'+rows.map(function(r){
        return '<div class="wf-signal'+(r.done?' done':'')+'"><span>'+r.ic+'</span><b>'+r.label+'</b><small>'+r.value+'</small></div>';
      }).join("")+'</div>'+
      (weekReviewOpen||s.review
        ? '<div class="wf-review"><div><small>WHAT WENT WELL</small><b>'+review.win+'</b></div>'+
            '<div><small>WHAT TO WORK ON</small><b>'+review.lesson+'</b></div>'+
            '<div><small>NEXT WEEK</small><b>'+review.next+'</b></div>'+
            (!s.review?'<button type="button" data-weekbank="1">Save this week ✓</button>':
              '<button type="button" data-weekshare="1">'+ffIcon("share",14)+' Share the week</button>')+'</div>'
        : '<button type="button" class="wf-next"'+next.attr+' data-weekaction="'+next.key+'">'+
            '<span><small>NEXT UP</small><b>'+next.label+'</b><em>'+next.sub+'</em></span><i>›</i></button>'+
          (s.closeable?'<button type="button" class="wf-close" data-weekclose="1">Review this week</button>':''))+
      '</section>';
  }
  function shareWeeklyFlight(){
    var s=weeklyLoopState(), r=weeklyReviewCopy(s);
    var txt="My Yardsmith week "+s.week+": "+s.sessions+"/"+s.freq+" workouts · "+
      s.fuelDays+" days of meals checked off"+(s.checkin?" · check-in done":"")+" — Yardsmith ⛳";
    ffShareImage({
      kick:"My week · Week "+s.week,
      big:s.sessions+"/"+s.freq,unit:"workouts",
      badge:s.done===3?"✅ ALL THREE DONE":null,
      lines:["🍽️ "+s.fuelDays+" day"+(s.fuelDays===1?"":"s")+" of meals checked off",
        s.checkin?"📍 Check-in done":"📍 Check-in next week",
        "⛳ "+r.win]
    },txt);
  }
  // Home rows: one line each, same shape, all quiet next to the big button.
  function homeRow(ic, title, sub, attr, extra){
    return '<div class="home-row"><button type="button" class="hr-main"'+attr+'>'+
      '<span class="hr-ic" aria-hidden="true">'+ic+'</span>'+
      '<span class="hr-tx"><b>'+title+'</b><small>'+sub+'</small></span>'+
      '<span class="hr-go" aria-hidden="true">›</span></button>'+(extra||'')+'</div>';
  }
  // Meals: the day's count and the NEXT meal, checked off right here with one
  // tap — the full day lives on Fuel.
  function homeMealsRow(){
    if(typeof ffSchedule==="undefined" || !ffSchedule || !ffSchedule.length)
      return homeRow("🍽️","Today’s meals","Set up your meal plan — it takes a minute",' data-goview="calc"');
    var fd=fuelDay(ffISO())||{ m:{} }, n=ffSchedule.length, done=0, ni=-1;
    ffSchedule.forEach(function(sl,i){ if(fd.m && fd.m[i]) done++; else if(ni<0) ni=i; });
    var sub, check='';
    var tune=false;
    try{ var ac=adaptiveDue() && adaptiveCheck(); tune=!!(ac && !ac.onTrack); }catch(_){}
    if(ni<0 || fd.rating==="on" || fd.rating==="close") sub=(fd.rating?"Day rated":"All "+n+" done")+" ✓ — nice.";
    else {
      var fresh=done===0 && !Object.keys(fuelLog()).length;
      sub=fresh ? "Tap ✓ when you eat one. No calorie counting." : done+" of "+n+" done · next: "+ffEsc(ffSchedule[ni].label);
      check='<button type="button" class="hr-check" data-fuelmeal="'+ni+'" data-fuelval="a" aria-label="Mark '+escAttr(ffSchedule[ni].label)+' as eaten">'+
        '<span aria-hidden="true">✓</span><small>Ate it</small></button>';
    }
    // The ~10-day calorie check-in lives on Fuel; Home just says it's waiting.
    if(tune) sub="Calorie check-in ready — tap to see it";
    return homeRow("🍽️","Today’s meals",sub,' data-goview="calc"',check);
  }
  // Progress: the outcome numbers (driver, 7-iron) — the effort count only
  // until the first measurement exists.
  function homeProgressRow(){
    var bits=[], drv=null, sp=null;
    try{ drv=driveStats(); }catch(_){}
    lsGet("ff_body",[]).forEach(function(e){ var v=parseFloat(e && e.s); if(v>0) sp=v; });
    if(drv) bits.push("Driver "+drv.latest+" yd"+(drv.n>=2 && drv.gain>0?" (+"+drv.gain+")":""));
    if(sp!=null) bits.push("7-iron "+sp+" mph");
    if(!bits.length){
      var n=0; try{ n=sessionsByWeek().length; }catch(_){}
      bits.push(n ? n+" workout"+(n===1?"":"s")+" done" : "Starts with your first workout");
    }
    return homeRow("📈","Your progress",bits.join(" · "),' data-goview="progress"');
  }
  // Coach: the one live coaching signal (a stall, a PR, flat speed) when there
  // is one — otherwise the general read. Tapping opens the AI coach on it.
  function homeCoachRow(){
    var seen=ffInsightSeen(), top=null;
    try{ top=ffInsights().filter(function(i){ return i.ask && i.sig!=="coldspeed" && seen.indexOf(i.sig)<0; })[0]||null; }catch(_){}
    if(top) return homeRow("💬",String(top.title).replace(/<[^>]*>/g,""),"Ask the coach about it",
      ' data-insask="'+escAttr(top.ask)+'" data-inssig="'+escAttr(top.sig)+'"');
    return homeRow("💬","Ask the coach","A quick read on your numbers and what to focus on",' data-ask="read"');
  }
  // Weekends (or once the week's workouts are done): one line to close the week.
  // The review itself lives on Stats with the rest of the week's numbers.
  function weekReviewRowHtml(){
    if(!planStart() || seasonComplete()) return "";
    var s=weeklyLoopState(); if(!s.closeable || s.review) return "";
    return homeRow("📋","Review your week","Week "+s.week+" · takes a minute",' data-weekreview="1"');
  }
  function renderDash(){
    var el=$("dashBody"); if(!el) return;
    var dd=$("dashDate");
    if(dd){ try{ dd.textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}); }catch(_){} }
    // Octane's daily trace accumulates from renders (Home used to draw the hero
    // gauge); keep feeding it so the Stats trend has no gaps.
    try{ saveScoreSnapshot(ffScore()); }catch(_){}
    // ONE big button — the next thing to do. Then quiet rows; nothing else.
    var html='<section class="today-command" aria-label="Today">'+nextUpCard()+'</section>';
    html+='<div class="home-rows">'+homeMealsRow()+homeProgressRow()+
      homeRow("＋","Log something","Weight, swing speed, driver or a round",' data-qopen="1"')+
      weekReviewRowHtml()+homeCoachRow()+'</div>';
    html+=openingRoundHtml();                  // first two weeks only
    try{ html+=dashTipHtml(); }catch(e){}      // education stays below the daily job
    el.innerHTML=html;
  }
  // The weekly card lives on Stats — refresh whichever screen shows it.
  function weeklyRefresh(){
    try{ renderDash(); }catch(_){}
    try{ if($("view-progress") && $("view-progress").classList.contains("active")) renderProgress(); }catch(_){}
  }
  document.addEventListener("click",function(e){
    if(e.target.closest("[data-homestart]")){
      startPlanAtWeek(1);
      try{ ffToast("Day 1 is today — let’s go ⛳"); }catch(_){}
      return;
    }
    if(e.target.closest("[data-weekreview]")){
      weekReviewOpen=true;
      setView("progress");
      setTimeout(function(){
        var w=document.querySelector("#view-progress .weekly-flight");
        if(w) try{ w.scrollIntoView({behavior:ffReduced()?"auto":"smooth",block:"start"}); }catch(_){}
      },350);
      return;
    }
  });
  document.addEventListener("click",function(e){
    var skip=e.target.closest("[data-skipsession]");
    if(skip){
      skipSession(parseInt(skip.getAttribute("data-skipweek"),10)||curWeek(),skip.getAttribute("data-skipsession"));
      try{ ffToast("Skipped — your plan keeps moving."); }catch(_){}
      renderDash();
      return;
    }
    var catchup=e.target.closest("[data-catchup]");
    if(catchup) openingEventOnce("catchup:"+curWeek()+":"+dayOfPlan(),"catchup_started",{week:curWeek()});
    var action=e.target.closest("[data-weekaction]");
    if(action) openingEventOnce("weekaction:"+weeklyKey()+":"+action.getAttribute("data-weekaction"),
      "weekly_action_started",{action:action.getAttribute("data-weekaction"),week:curWeek()});
    if(e.target.closest("[data-weekclose]")){
      weekReviewOpen=true; weeklyRefresh(); return;
    }
    if(e.target.closest("[data-weekbank]")){
      var s=weeklyLoopState(), reviews=lsGet("ff_weekly_reviews",{});
      if(!reviews||typeof reviews!=="object") reviews={};
      reviews[s.key]={ts:Date.now(),sessions:s.sessions,fuelDays:s.fuelDays,checkin:s.checkin};
      lsSet("ff_weekly_reviews",reviews);
      openingEventOnce("weekbank:"+s.key,"weekly_review_completed",
        {week:s.week,band:s.done===3?"complete":(s.done===2?"solid":"building")});
      weekReviewOpen=false;
      try{ ffCelebrate(); ffToast("Week saved — next week starts with a clean card ⛳"); }catch(_){}
      weeklyRefresh(); return;
    }
    if(e.target.closest("[data-weekshare]")){
      openingEventOnce("weekshare:"+weeklyKey(),"weekly_review_shared",{week:curWeek()});
      shareWeeklyFlight();
    }
  });
