  /* ===================== FUEL CHECK-OFF — adherence, not accounting =====================
     The app wrote today's meals; the user just says whether they happened. Each slot
     is ✓ ate it / ≈ close; a one-tap day rating covers fully off-plan days (travel,
     cookouts) so the record never dies for honest reasons. Scores land on the Today
     timeline, the Sunday Scorecard, a fuel streak, and Octane's 6th pillar. The
     metabolism check-in stays the quantitative truth — the scale audits everything. */
  var ffSchedule=null, fuelNumsOpen=false;
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
    if(cur && cur.rating===r){ delete f[iso]; }               // tap again to clear
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
  }
  // Every check-off surface routes through one listener.
  document.addEventListener("click", function(e){
    var fm=e.target.closest("[data-fuelmeal]");
    if(fm){ fuelSetMeal(+fm.getAttribute("data-fuelmeal"), fm.getAttribute("data-fuelval")); fuelRefresh(); return; }
    var fr=e.target.closest("[data-fuelrate]");
    if(fr){ fuelRate(fr.getAttribute("data-fuelrate")); fuelRefresh(); return; }
    if(e.target.closest("[data-fuelnums]")){ fuelNumsOpen=!fuelNumsOpen; try{ calc(); }catch(e2){} return; }
  });
  function fuelSummaryHtml(m){
    var d=fuelDay(ffISO())||{ m:{} }, n=m.schedule.length;
    var done=Object.keys(d.m||{}).length, streak=fuelStreak();
    var line;
    if(d.rating){
      line = d.rating==="on" ? "Day logged: <b>on target</b> ✓ — rated, not itemized. The scale keeps score."
           : d.rating==="close" ? "Day logged: <b>close</b> — good enough to keep the streak alive."
           : "Day logged: <b>off the rails</b> — happens. Tomorrow’s plan is already written.";
    } else if(done===0){
      line = "Tap ✓ on each meal as it happens — <b>adherence, not accounting</b>. Ten seconds a day.";
    } else if(done>=n){
      line = "<b>All "+n+" feedings banked ✓</b> — that’s a fueled engine. See you at the scale.";
    } else {
      // the biggest remaining meal is the coaching hint
      var big=null, bigI=-1;
      m.schedule.forEach(function(sl,i){ if(d.m[i]) return;
        var k=(sl.p||0)*4+(sl.c||0)*4+(sl.f||0)*9;
        if(!big || k>big._k){ big=sl; big._k=k; bigI=i; } });
      line = "<b>"+done+" of "+n+"</b> down"+(big?(" — <b>"+big.label+"</b> is your biggest block left."):".");
    }
    var nums='';
    if(fuelNumsOpen && !d.rating){
      var kc=0,pg=0;
      m.schedule.forEach(function(sl,i){ var v=d.m[i]; if(!v) return;
        var f=(v==="a")?1:0.75;
        kc+=((sl.p||0)*4+(sl.c||0)*4+(sl.f||0)*9)*f; pg+=(sl.p||0)*f; });
      var t=lsGet("ff_targets",null);
      nums='<div class="fuel-nums">≈ <b>'+Math.round(kc).toLocaleString()+'</b>'+(t?' / '+t.kcal.toLocaleString():'')+' kcal · <b>'+Math.round(pg)+'</b>'+(t?' / '+t.proteinG:'')+'g protein banked</div>';
    }
    return '<div class="fuel-sum'+(d.rating?' rated-'+d.rating:'')+'">'+
      '<div class="fuel-sum-top"><span class="fuel-sum-t">🍽️ Today’s fuel</span>'+
      (streak>0?'<span class="fuel-streak">🔥 '+streak+'-day fuel streak</span>':'')+'</div>'+
      '<div class="fuel-sum-line">'+line+'</div>'+nums+
      (!d.rating?'<button type="button" class="fuel-numbtn" data-fuelnums="1">'+(fuelNumsOpen?'Hide numbers':'Show the numbers')+'</button>':'')+
      '<div class="frate"><span class="frate-lbl">Ate off-plan?</span>'+
        [["on","✓ On target"],["close","≈ Close"],["off","✗ Off the rails"]].map(function(o){
          return '<button type="button" class="frate-chip'+(d.rating===o[0]?' on':'')+'" data-fuelrate="'+o[0]+'">'+o[1]+'</button>'; }).join("")+
      '</div></div>';
  }

  function mealBlock(m){
    var opts="";
    [3,4,5,6].forEach(function(n){
      opts+='<button type="button" data-meals="'+n+'"'+(n===m.n?' class="active"':'')+'>'+n+'</button>';
    });
    var recTxt = m.n===m.recommended ? "recommended for this plan" : "recommended: "+m.recommended;

    var fd=fuelDay(ffISO())||{ m:{} };
    function fchk(i){
      var v=fd.m?fd.m[i]:null;
      return '<div class="fchk">'+
        '<button type="button" class="fchk-b'+(v==="a"?" on":"")+'" data-fuelmeal="'+i+'" data-fuelval="a" aria-label="Ate it">✓</button>'+
        '<button type="button" class="fchk-b close'+(v==="c"?" on":"")+'" data-fuelmeal="'+i+'" data-fuelval="c" aria-label="Ate something close">≈</button>'+
        '</div>';
    }
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
    h+='<div class="meals-head"><span>🍽️ Meal Plan</span>'+
       '<span class="meal-pick"><span class="meal-pick-lbl">meals/day</span><span class="seg meal-seg">'+opts+'</span></span></div>';
    h+='<div class="meals-body">';
    h+=fuelSummaryHtml(m);
    h+='<div class="sched-title">📅 Your day &mdash; <b>'+m.n+' meals</b> <span class="rec">('+recTxt+')</span>, portioned for a <b>'+m.slot+'</b> workout</div>';
    h+='<div class="sched">'+rows+'</div>';
    h+='<div class="meal-foot">Tap any meal for a food example · times are guides — shift the day to fit your schedule.</div>';
    h+='</div></div>';
    return h;
  }

  function timingBlock(t){
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
