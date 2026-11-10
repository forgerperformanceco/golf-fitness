  /* ===================== REST TODAY (Nov 2026) =====================
     "I need to skip my workout today — my back hurts. Make it a rest day and
     give me our normal off-day stretches." One tap turns today's workout day
     into a rest day: the session is skipped (ff_skipped_sessions, so the
     catch-up nudge, next-workout pick and reminders all treat it as resolved)
     and the day plays as a rest day — the 10-minute routine, its own recovery
     and cardio check-offs (keyed by the workout's name), and Undo. No "move it
     to another day" button: that rewrote the weekly order for good (pre-PR
     review); hold-and-drag (042) is the deliberate way, and dragging a skipped
     workout un-skips it. While today is rested, the catch-up nudge, speed test
     and mobility check stay quiet (Home, reminders): not on a sore day.
     Nothing here diagnoses anything: the card keeps every move pain-free and
     names the red flags worth getting checked. */

  // Today's slot is this workout day.
  function ffIsTodaySlot(name){
    var dop=dayOfPlan(), t=dop?stripDays()[dop-1]:null;
    return !!(name && t && t.type!=="rest" && t.name===name);
  }
  function restInsteadCardHtml(d, interactive){
    var wk=curWeek(), key=dayKey(d), rdone=restDone(wk,key), cdone=cardioDone(wk,key),
        short=d.name.replace(/^Day \d+ — /,""), today=ffIsTodaySlot(d.name);
    return '<div class="day rest-instead'+(rdone?" rest-done":"")+'"><div class="day-head">'+d.name+' <span class="tag rest">Rest day</span></div>'+
      '<div class="restday">'+(today
        ? '🛌 <b>Today’s a rest day.</b> '+ffEsc(short)+' is skipped this week and the plan carries on. '+
          'Ten easy minutes below: keep every move pain-free and skip any that pinch. An easy walk only if you feel up to it.'
        : '🛌 <b>Rested.</b> '+ffEsc(short)+' was skipped that day and the plan carried on.')+'</div>'+
      (interactive ? '<div class="rest-routine">'+recoveryHtml()+'</div>'
        : '<details class="prelift cool"><summary>🌀 Keep your turn — the 10-min routine</summary><div class="prelift-body">'+recoveryHtml()+'</div></details>')+
      '<button class="rest-check'+(rdone?" done":"")+'" type="button" data-restday="'+escAttr(key)+'">'+
        (rdone?"✓ Recovery logged — tap to undo":"Mark recovery done")+'</button>'+
      z2Html(key, cdone)+
      '<div class="ri-acts"><button type="button" class="ri-btn ghost" data-restundo="'+escAttr(d.name)+'">'+(today?'Undo, I’ll train today':'Undo the skip')+'</button></div>'+
      '<div class="ri-note">Pain that runs down a leg, or comes with numbness or weakness, is worth getting checked.</div></div>';
  }
  // Today's slot when it's a workout that can still be rested (not finished, not rested yet).
  function ffRestableToday(){
    var dop=dayOfPlan(), t=dop?stripDays()[dop-1]:null, wk=curWeek();
    if(!t || t.type==="rest" || sessionFinished(getSession(wk,t.name)) || sessionSkipped(wk,t.name)) return null;
    return t;
  }
  // The entry point (Train's today area, Home, the readiness check-in).
  function ffRestTodayBtnHtml(name, cls){
    return '<button type="button" class="'+(cls||"ri-skip")+'" data-resttoday="'+escAttr(name)+'">Not feeling it? <span>Make today a rest day</span></button>';
  }
  function ffRestToday(name){
    var wk=curWeek();
    if(!ffIsTodaySlot(name) || sessionFinished(getSession(wk,name))) return false;
    skipSession(wk, name);
    try{ if(typeof ffTick==="function") ffTick(10); }catch(_){}
    try{ if(typeof plPauseSync==="function") plPauseSync(); }catch(_){}   // a paused session's bar steps aside
    ffToast("Today’s a rest day. "+name.replace(/^Day \d+ — /,"")+" is skipped; undo it on Train.");
    try{ renderPhase(); }catch(_){}
    try{ renderDash(); }catch(_){}
    return true;
  }
  function ffRestUndo(name){
    var wk=curWeek(); if(!name || !sessionSkipped(wk,name)) return false;
    // Training after all: the rest-day check-offs made under this workout's name go too,
    // so a second rest the same week starts clean (pre-PR review).
    if(restDone(wk,name)) toggleRestDone(wk,name);
    if(cardioDone(wk,name)) toggleCardioDone(wk,name);
    unskipSession(wk, name);
    try{ if(typeof plPauseSync==="function") plPauseSync(); }catch(_){}
    ffToast(ffIsTodaySlot(name) ? "It’s back on: "+name.replace(/^Day \d+ — /,"")+" is today’s workout." : "Back on your week.");
    try{ renderPhase(); }catch(_){}
    try{ renderDash(); }catch(_){}
    return true;
  }
  document.addEventListener("click", function(e){
    var t=e.target.closest && e.target.closest("[data-resttoday],[data-restundo]");
    if(!t) return;
    if(t.hasAttribute("data-resttoday")){
      if(t.closest("#readinessModal") && typeof ffReadinessClose==="function") ffReadinessClose();
      ffRestToday(t.getAttribute("data-resttoday")); return;
    }
    ffRestUndo(t.getAttribute("data-restundo"));
  });
