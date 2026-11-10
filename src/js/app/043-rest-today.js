  /* ===================== REST TODAY (Nov 2026) =====================
     "I need to skip my workout today — my back hurts. Make it a rest day and
     give me our normal off-day stretches." One tap turns today's workout day
     into a rest day: the session is skipped (ff_skipped_sessions, so the
     catch-up nudge, next-workout pick and reminders all treat it as resolved)
     and the day plays as a rest day — the 10-minute routine, its own recovery
     and cardio check-offs (keyed by the workout's name), and a way back:
       · Undo — the workout returns to today;
       · "Do <it> on <day> instead" — when a later open rest day this week can
         take it, swap them (ffMoveDay; moving a workout un-skips it).
     Nothing here diagnoses anything: the card keeps every move pain-free and
     names the red flags worth getting checked. */

  // Today's slot is this workout day.
  function ffIsTodaySlot(name){
    var dop=dayOfPlan(), t=dop?stripDays()[dop-1]:null;
    return !!(name && t && t.type!=="rest" && t.name===name);
  }
  // A later rest day this week that could take today's skipped workout, or null.
  // Prefers a day that dodges what the arranger avoids (a round day, heavy legs
  // back to back or the day before a round); falls back to the first open one.
  function ffRestMoveTarget(d){
    if(typeof ffAccess==="function" && ffAccess()!=="full") return null;
    var dop=dayOfPlan(), ws=weekStartDate(), g=gdState(), wk=curWeek();
    if(!dop || !ws || (g.arrangeWeek && wk<g.arrangeWeek)) return null;   // ffMoveDay would refuse
    var s=stripDays(), ti=dop-1;
    if(!d || !s[ti] || s[ti].name!==d.name) return null;                  // only today's workout
    var wd0=ws.getDay(), off=ffOffDays(), play=ffPlayDays(), first=null, good=null;
    for(var i=ti+1;i<7 && !good;i++){
      var x=s[i];
      if(!x || x.type!=="rest" || off.indexOf((wd0+i)%7)!==-1 || ffDayLogged(wk,x)) continue;
      var c={ i:i, day:FF_WD[(wd0+i)%7] }; if(!first) first=c;
      var onRound=play.indexOf((wd0+i)%7)!==-1, legs=ffHeavyLegs(d),
          prev=(i-1===ti)?null:s[i-1], next=(i+1<7)?s[i+1]:null;
      if(onRound) continue;
      if(legs && ((prev && ffHeavyLegs(prev)) || (next && ffHeavyLegs(next)) || play.indexOf((wd0+i+1)%7)!==-1)) continue;
      good=c;
    }
    return good||first;
  }
  function restInsteadCardHtml(d, interactive){
    var wk=curWeek(), key=dayKey(d), rdone=restDone(wk,key), cdone=cardioDone(wk,key),
        today=ffIsTodaySlot(d.name), short=d.name.replace(/^Day \d+ — /,""),
        mv=(today && !rdone && !cdone) ? ffRestMoveTarget(d) : null;
    return '<div class="day rest-instead'+(rdone?" rest-done":"")+'"><div class="day-head">'+d.name+' <span class="tag rest">Rest day</span></div>'+
      '<div class="restday">'+(today
          ? '🛌 <b>Today’s a rest day.</b> '+ffEsc(short)+' is skipped this week and the plan carries on. '
          : '🛌 <b>Skipped. Rested instead.</b> ')+
        'Ten easy minutes below: keep every move pain-free and skip any that pinch. An easy walk only if you feel up to it.</div>'+
      (interactive ? '<div class="rest-routine">'+recoveryHtml()+'</div>'
        : '<details class="prelift cool"><summary>🌀 Keep your turn — the 10-min routine</summary><div class="prelift-body">'+recoveryHtml()+'</div></details>')+
      '<button class="rest-check'+(rdone?" done":"")+'" type="button" data-restday="'+escAttr(key)+'">'+
        (rdone?"✓ Recovery logged — tap to undo":"Mark recovery done")+'</button>'+
      z2Html(key, cdone)+
      '<div class="ri-acts">'+
        (mv?'<button type="button" class="ri-btn" data-restmove="'+mv.i+'" data-restname="'+escAttr(d.name)+'">Do '+ffEsc(wsShort(d))+' on '+mv.day+' instead</button>':'')+
        '<button type="button" class="ri-btn ghost" data-restundo="'+escAttr(d.name)+'">'+(today?'Undo, I’ll train today':'Undo the skip')+'</button></div>'+
      '<div class="ri-note">Pain that runs down a leg, or comes with numbness or weakness, is worth getting checked.</div></div>';
  }
  // The entry point (Train's today card, Home, the readiness check-in).
  function ffRestTodayBtnHtml(name, cls){
    return '<button type="button" class="'+(cls||"ri-skip")+'" data-resttoday="'+escAttr(name)+'">Not feeling it? <span>Make today a rest day</span></button>';
  }
  function ffRestToday(name){
    var wk=curWeek();
    if(!ffIsTodaySlot(name) || sessionFinished(getSession(wk,name))) return false;
    skipSession(wk, name);
    try{ if(typeof ffTick==="function") ffTick(10); }catch(_){}
    ffToast("Today’s a rest day. "+name.replace(/^Day \d+ — /,"")+" is skipped; undo it on Train.");
    try{ renderPhase(); }catch(_){}
    try{ renderDash(); }catch(_){}
    return true;
  }
  function ffRestUndo(name){
    var wk=curWeek(); if(!name || !sessionSkipped(wk,name)) return false;
    unskipSession(wk, name);
    ffToast(ffIsTodaySlot(name) ? "It’s back on: "+name.replace(/^Day \d+ — /,"")+" is today’s workout." : "Back on your week.");
    try{ renderPhase(); }catch(_){}
    try{ renderDash(); }catch(_){}
    return true;
  }
  // Move today's skipped workout to a later rest day: un-skip, swap, and if the
  // swap is refused (its toast says why), it stays skipped and today stays rest.
  function ffRestMove(name, to){
    var dop=dayOfPlan(), wk=curWeek();
    if(!dop || !ffIsTodaySlot(name) || !sessionSkipped(wk,name)) return false;
    unskipSession(wk, name);
    ffMoveDay(dop-1, to);
    var s=stripDays();
    if(s[to] && s[to].name===name) return true;
    skipSession(wk, name);
    try{ renderPhase(); }catch(_){}
    try{ renderDash(); }catch(_){}
    return false;
  }
  document.addEventListener("click", function(e){
    var t=e.target.closest && e.target.closest("[data-resttoday],[data-restundo],[data-restmove]");
    if(!t) return;
    if(t.hasAttribute("data-resttoday")){
      if(t.closest("#readinessModal") && typeof ffReadinessClose==="function") ffReadinessClose();
      ffRestToday(t.getAttribute("data-resttoday")); return;
    }
    if(t.hasAttribute("data-restundo")){ ffRestUndo(t.getAttribute("data-restundo")); return; }
    ffRestMove(t.getAttribute("data-restname"), parseInt(t.getAttribute("data-restmove"),10));
  });
