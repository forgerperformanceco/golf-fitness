  /* ===================== FUEL CHECK-OFF — adherence, not accounting =====================
     The app wrote today's meals; the user just says whether they happened. Each slot
     is ✓ ate it / ≈ close; a one-tap day rating covers fully off-plan days (travel,
     cookouts) so the record never dies for honest reasons. Scores land on the Today
     timeline, the Sunday Scorecard, a fuel streak, and Octane's 6th pillar. The
     metabolism check-in stays the quantitative truth — the scale audits everything. */
  var ffSchedule=null;
  function ffISO(d){ d=d||new Date(); var m=d.getMonth()+1, dd=d.getDate();
    return d.getFullYear()+"-"+(m<10?"0":"")+m+"-"+(dd<10?"0":"")+dd; }
  function fuelLog(){ var f=lsGet("ff_fuel",{}); return (f && typeof f==="object")?f:{}; }
  function fuelDay(iso){ return fuelLog()[iso]||null; }
  function fuelPrune(f){
    var keys=Object.keys(f); if(keys.length<=95) return f;
    keys.sort(); keys.slice(0, keys.length-95).forEach(function(k){ delete f[k]; });
    return f;
  }
  function fuelSetMeal(idx, val){
    var f=fuelLog(), iso=ffISO(), d=f[iso]||{ m:{} };
    d.m=d.m||{};
    if(d.m[idx]===val) delete d.m[idx]; else d.m[idx]=val;   // tap again to clear
    d.rating=null;                                            // meal detail beats a day rating
    d.n=(ffSchedule?ffSchedule.length:4)||4;
    d.ts=Date.now(); f[iso]=d;
    lsSet("ff_fuel", fuelPrune(f));
  }
  function fuelRate(r){
    var f=fuelLog(), iso=ffISO(), cur=f[iso];
    // Tap again to clear — as a NEWER empty record, not a delete: a deleted day
    // would come back from another device's older copy on the next sync merge.
    if(cur && cur.rating===r){ f[iso]={ m:{}, rating:null, n:(ffSchedule?ffSchedule.length:4)||4, ts:Date.now() }; }
    else f[iso]={ m:{}, rating:r, n:(ffSchedule?ffSchedule.length:4)||4, ts:Date.now() };
    lsSet("ff_fuel", fuelPrune(f));
  }
  function fuelScoreFor(iso){
    var d=fuelDay(iso); if(!d) return null;
    if(d.rating) return d.rating==="on"?1:(d.rating==="close"?0.6:0.15);
    var keys=Object.keys(d.m||{}); if(!keys.length) return null;
    var sum=0; keys.forEach(function(k){ sum += d.m[k]==="a"?1:0.75; });
    return Math.min(1, sum/(d.n||4));
  }
  function fuelStateFor(iso){
    var sc=fuelScoreFor(iso); if(sc==null) return null;
    return sc>=0.85?"on":(sc>=0.5?"close":"off");
  }
  function fuelStreak(){
    var st=0, d=new Date();
    if(fuelStateFor(ffISO(d))==null) d.setDate(d.getDate()-1);
    for(var i=0;i<365;i++){
      var t=fuelStateFor(ffISO(d));
      if(t==="on"||t==="close"){ st++; d.setDate(d.getDate()-1); } else break;
    }
    return st;
  }
  function fuelRefresh(){
    try{ calc(); }catch(e){}
    try{ renderDash(); }catch(e){}
    try{ if($("view-progress") && $("view-progress").classList.contains("active")) renderProgress(); }catch(e){}
    try{ renderFuelToday(); }catch(e){}
  }
  /* ----- The Fuel "Today" strip: the daily answer, first -----
     MFP leads with calories remaining; we lead with the next unchecked meal
     (one-tap check-off), the fueled count, and the protein/carbs still owed —
     summed live from the unchecked schedule slots. A fully banked day gets the
     reward state. Lives at the top of the Fuel tab; the plan and meal cards
     below stay the reference. */
  function renderFuelToday(){
    var el=$("fuelToday"); if(!el) return;
    var t=lsGet("ff_targets",null);
    // The ~10-day calorie check-in (weight trend vs goal) leads Fuel when due.
    var adapt=""; try{ adapt=renderAdaptiveCard(); }catch(_){}
    if(!t || !t.kcal || typeof ffSchedule==="undefined" || !ffSchedule || !ffSchedule.length){ el.innerHTML=adapt; return; }
    var fd=fuelDay(ffISO())||{ m:{} };
    var n=ffSchedule.length, done=0, next=null, ni=-1, remP=0, remC=0, remF=0, remK=0;
    ffSchedule.forEach(function(sl,i){
      if(fd.m && fd.m[i]){ done++; return; }
      if(!next){ next=sl; ni=i; }
      remP+=(sl.p||0); remC+=(sl.c||0); remF+=(sl.f||0);
      remK+=(sl.p||0)*4+(sl.c||0)*4+(sl.f||0)*9;
    });
    var streak=fuelStreak();
    var streakHtml=streak>0?'<span class="ft-streak">'+ffIcon("flame",12)+' '+streak+'-day streak</span>':'';
    if(!next){
      el.innerHTML=adapt+'<div class="ftoday done"><span class="ft-ic">✅</span>'+
        '<span class="ft-tx"><span class="ft-kicker">TODAY’S MEALS</span><b>All meals done ✓</b><span>All '+n+' checked off — recover, grow, repeat.</span></span>'+
        streakHtml+'</div>';
      return;
    }
    var time=(next.t!=null)?fmtMin(Math.round(next.t*60)):"";
    var macro=(next.p?next.p+"P":"")+(next.c?((next.p?" · ":"")+next.c+"C"):"")+(next.f?" · "+next.f+"F":"");
    var progress=Math.round(done/n*100);
    el.innerHTML=adapt+'<div class="ftoday">'+
      '<div class="ft-head"><span class="ft-kicker">TODAY’S MEALS</span><span>'+streakHtml+done+' of '+n+' done</span></div>'+
      '<button type="button" class="ft-next" data-fuelmeal="'+ni+'" data-fuelval="a">'+
        '<span class="ft-ic">🍽️</span><span class="ft-tx"><b>Next: '+next.label+(time?' · '+time:'')+'</b>'+
        '<span>'+(macro||'Your next planned meal')+'</span></span><span class="ft-bank">Ate it <i class="ft-chk">✓</i></span></button>'+
      (done===0 && !fd.rating ? '<div class="ft-hint">Tap ✓ when you eat a meal — no calorie counting.</div>' : '')+
      '<div class="ft-progress" aria-label="'+progress+'% of meals completed"><i style="width:'+progress+'%"></i></div>'+
      '<div class="ft-rem-grid">'+
        '<span><b>'+Math.round(remK).toLocaleString()+'</b><small>kcal left</small></span>'+
        '<span><b>'+remP+'g</b><small>protein</small></span>'+
        '<span><b>'+remC+'g</b><small>carbs</small></span>'+
        '<span><b>'+remF+'g</b><small>fat</small></span></div>'+
      fuelRateHtml(fd)+
      '</div>';
  }
  // Didn't tick meals? Rate the whole day instead — one tap, same streak.
  function fuelRateHtml(d){
    var line = !d.rating ? '' : '<div class="ft-rated">'+(d.rating==="on" ? "Day rated: <b>on plan</b> ✓"
      : d.rating==="close" ? "Day rated: <b>close</b> — that still counts."
      : "Day rated: <b>off plan</b> — it happens. Tomorrow’s plan is already written.")+'</div>';
    return line+'<div class="frate"><span class="frate-lbl">Or rate the whole day:</span>'+
      [["on","✓ On plan"],["close","≈ Close"],["off","✗ Off plan"]].map(function(o){
        return '<button type="button" class="frate-chip'+(d.rating===o[0]?' on':'')+'" data-fuelrate="'+o[0]+'">'+o[1]+'</button>'; }).join("")+
      '</div>';
  }
  // Every check-off surface routes through one listener.
  document.addEventListener("click", function(e){
    var fm=e.target.closest("[data-fuelmeal]");
    if(fm){ fuelSetMeal(+fm.getAttribute("data-fuelmeal"), fm.getAttribute("data-fuelval")); fuelRefresh(); return; }
    var fr=e.target.closest("[data-fuelrate]");
    if(fr){ fuelRate(fr.getAttribute("data-fuelrate")); fuelRefresh(); return; }
  });
  // The ✓/≈ pair for schedule slot i — shared by the generic schedule, the
  // foods-you-love meal cards, and any other surface that shows a meal.
  function ffFchkHtml(i){
    var fd=fuelDay(ffISO())||{ m:{} };
    var v=fd.m?fd.m[i]:null;
    return '<div class="fchk">'+
      '<button type="button" class="fchk-b'+(v==="a"?" on":"")+'" data-fuelmeal="'+i+'" data-fuelval="a" aria-label="Ate it">✓</button>'+
      '<button type="button" class="fchk-b close'+(v==="c"?" on":"")+'" data-fuelmeal="'+i+'" data-fuelval="c" aria-label="Ate something close">≈</button>'+
      '</div>';
  }
  // One plain heading for the day's list (both the generic and foods-you-love views).
  function fuelListHead(n, rest, slot){
    return '<div class="meals-head"><span>All of today’s meals</span>'+
      '<span class="meals-sub">'+n+' meals · '+(rest?'rest day':String(slot||'').toLowerCase()+' workout')+'</span></div>';
  }
  function mealBlock(m){
    var fd=fuelDay(ffISO())||{ m:{} };
    function fchk(i){ return ffFchkHtml(i); }
    var rows = m.schedule.map(function(s, i){
      var v=fd.m?fd.m[i]:null, done=v?' fdone':'';
      if(s.kind==="pre"){
        return '<div class="sched-row pre tappable'+done+'">'+
          '<div class="sched-time">'+s.time+'</div>'+
          '<div class="sched-body"><div class="sched-name">⚡ '+s.label+' <span class="sched-tag pre">snack</span></div>'+
          '<div class="sched-macros">'+s.c+'g carbs</div>'+
          '<div class="meal-eg">🍽️ Example: '+exampleMeal(s)+'</div></div>'+fchk(i)+'</div>';
      }
      var tag = s.isPost ? ' <span class="sched-tag post">post-workout</span>'
              : (s.isPre ? ' <span class="sched-tag pre">pre-workout</span>' : '');
      return '<div class="sched-row meal tappable'+done+'">'+
        '<div class="sched-time">'+s.time+'</div>'+
        '<div class="sched-body"><div class="sched-name">🍽️ '+s.label+tag+'</div>'+
        '<div class="sched-macros"><b>'+s.p+'</b>P · <b>'+s.c+'</b>C · <b>'+s.f+'</b>F'+
        (s.isPost? ' <span class="sched-plus">— biggest carb meal</span>':'')+'</div>'+
        '<div class="meal-eg">🍽️ Example: '+exampleMeal(s)+'</div></div>'+fchk(i)+'</div>';
    }).join("");

    var h="";
    h+='<div class="meals">';
    h+=fuelListHead(m.n, m.rest, m.slot);
    h+='<div class="meals-body">';
    h+='<div class="sched">'+rows+'</div>';
    h+='<div class="meal-foot">Tap a meal for a food idea. Times are a guide — shift the day to fit your schedule.</div>';
    h+='</div></div>';
    return h;
  }

  function timingBlock(t){
    // Rest day: no workout to time carbs around — one even-split note, no windows.
    if(t.rest){
      return '<div class="timing"><div class="timing-head"><span>🕒 Carb Timing</span>'+
        '<span class="when">Rest day</span></div>'+
        '<div class="timing-foot">No workout today — spread your <b>'+t.dayCarbs+'g carbs</b> '+
        'evenly across your meals. '+t.note+'</div></div>';
    }
    var preTip = t.fasted
      ? "Fasted? Take it as you start, or prioritize the post-workout meal."
      : "Fast carbs ~60–90 min before (oats, banana, rice).";
    var postTip = "Within ~60 min, with protein (rice, potatoes, fruit).";
    var h="";
    h+='<div class="timing">';
    h+='<div class="timing-head"><span>🕒 Carb Timing</span><span class="when">'+t.slot+' &middot; train ≈ '+t.trainTime+'</span></div>';
    h+='<div class="timing-rows">';
    h+='<div class="twin pre"><div class="tlabel">Pre-Workout</div>'+
       '<div class="tgrams">'+t.preG+'<small>g carbs</small></div>'+
       '<div class="tclock">≈ '+t.preTime+'</div>'+
       '<div class="ttip">'+preTip+'</div></div>';
    h+='<div class="twin post"><div class="tlabel">Post-Workout</div>'+
       '<div class="tgrams">'+t.postG+'<small>g carbs</small></div>'+
       '<div class="tclock">≈ '+t.postTime+'</div>'+
       '<div class="ttip">'+postTip+'</div></div>';
    h+='</div>';
    h+='<div class="timing-foot"><b>'+t.restG+'g carbs</b> across your other meals. '+t.note+'</div>';
    h+='</div>';
    return h;
  }
  calc();
