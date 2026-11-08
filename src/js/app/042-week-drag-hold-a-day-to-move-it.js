  /* ===================== WEEK DRAG — hold a day, drag it onto another =====================
     Owner ask (Nov 2026): "long press on the days of the week and drag them around".
     Hold a chip in Train's week strip (~0.4 s), drag it onto another chip, let go:
     the two days swap, and the new order becomes YOUR week from now on
     (ff_gameday.layout, read by stripDays in 040). Guard rails, not handcuffs:
       - a day you've already logged (a started workout, a checked rest or cardio)
         stays put, so history never jumps to another date;
       - a workout can't land on one of your days off;
       - legs back to back, or heavy legs the day before a round, is allowed but
         flagged, since that's the user's call.
     Touch has its own path: once the hold fires, touchmove is cancelled so the
     page doesn't scroll out from under the finger. Mouse uses pointer events. */

  // Is anything logged on this day of THIS week?
  function ffDayLogged(wk, d){
    if(!d) return false;
    if(d.type==="rest") return restDone(wk, dayKey(d)) || cardioDone(wk, dayKey(d));
    return !!getSession(wk, d.name);
  }
  var FF_WD=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  // Swap strip positions a and b, save the result as the golfer's week, say what happened.
  // Returns the message shown (handy for tests), or "" when nothing moved.
  function ffMoveDay(a, b){
    if(a===b || a==null || b==null) return "";
    if(typeof ffAccess==="function" && ffAccess()!=="full") return "";
    var g=gdState(), wk=curWeek(), ws=weekStartDate();
    if(!ws) return "";
    var msg;
    if(g.arrangeWeek && wk<g.arrangeWeek){
      msg="Your new days start next week. Move days around after that."; ffToast(msg); return msg;
    }
    var s=stripDays().slice(), wd0=ws.getDay(), da=s[a], db=s[b];
    if(!da || !db || (da.type==="rest" && db.type==="rest")) return "";   // rest ↔ rest changes nothing
    if(ffDayLogged(wk, da) || ffDayLogged(wk, db)){
      msg="Days you've already logged stay put."; ffToast(msg); return msg;
    }
    var off=ffOffDays(), offAt=function(i){ return off.indexOf((wd0+i)%7)!==-1; };
    if((da.type!=="rest" && offAt(b)) || (db.type!=="rest" && offAt(a))){
      var odd=(da.type!=="rest" && offAt(b)) ? b : a;
      msg=FF_WD[(wd0+odd)%7]+" is a day off. Turn it back on in Plan settings first."; ffToast(msg); return msg;
    }
    s[a]=db; s[b]=da;
    var lay=new Array(7);
    for(var i=0;i<7;i++) lay[(wd0+i)%7]=dayKey(s[i]);
    g.layout=lay; gdSave(g);
    // Flag (don't block) the combos the automatic arrangement avoids.
    var play=ffPlayDays(), warn="";
    for(var j=0;j<7 && !warn;j++){
      var cur=s[j], nx=s[(j+1)%7];
      if(ffHeavyLegs(cur) && ffHeavyLegs(nx)) warn=" Heads up: that puts legs on back-to-back days.";
      else if(ffHeavyLegs(cur) && play.indexOf((wd0+j+1)%7)!==-1) warn=" Heads up: heavy legs the day before a round.";
    }
    if(da.type!=="rest" && db.type!=="rest")
      msg="Swapped "+wsShort(da)+" ("+FF_WD[(wd0+b)%7]+") and "+wsShort(db)+" ("+FF_WD[(wd0+a)%7]+"). Your week keeps this order."+warn;
    else {
      var moved=da.type!=="rest" ? da : db, to=(moved===da) ? b : a;
      msg="Moved "+wsShort(moved)+" to "+FF_WD[(wd0+to)%7]+". Your week keeps this order."+warn;
    }
    ffToast(msg);
    try{ window.dispatchEvent(new Event("ff-data-changed")); }catch(_){}
    try{ renderPhase(); }catch(_){}
    try{ renderDash(); }catch(_){}
    return msg;
  }

  // "Reset to automatic" under the strip. Same mid-week rule as every schedule
  // change: with something logged this week, the reset waits for next week.
  document.addEventListener("click", function(e){
    var r=e.target.closest && e.target.closest("[data-layoutreset]"); if(!r) return;
    var wk=curWeek(), queued=false;
    ffSaveSchedule(function(g){ delete g.layout; queued=!!(g.arrangeWeek && wk<g.arrangeWeek); });
    ffToast(queued ? "Back to the automatic week from next week." : "Back to the automatic week.");
    try{ renderPhase(); }catch(_){}
    try{ renderDash(); }catch(_){}
  });

  (function(){
    var HOLD=400, SLOP=10, st=null, swallowUntil=0;
    function chipAt(x, y){
      var el=document.elementFromPoint(x, y);
      return (el && el.closest) ? el.closest(".weekstrip .ws-chip") : null;
    }
    function idx(chip){ return Array.prototype.indexOf.call(chip.parentElement.children, chip); }
    function begin(chip, x, y, kind){
      if(typeof ffAccess==="function" && ffAccess()!=="full") return;
      st={ chip:chip, from:idx(chip), x0:x, y0:y, kind:kind, drag:false, over:null };
      st.timer=setTimeout(function(){
        if(!st) return;
        st.drag=true;
        st.chip.classList.add("ws-lift");
        if(st.chip.parentElement) st.chip.parentElement.classList.add("ws-dragging");
        try{ if(typeof ffTick==="function") ffTick(); }catch(_){}
      }, HOLD);
    }
    function move(x, y){
      if(!st) return false;
      if(!st.drag){
        // Moved before the hold fired: it's a scroll or a tap, not a drag.
        if(Math.abs(x-st.x0)>SLOP || Math.abs(y-st.y0)>SLOP){ clearTimeout(st.timer); st=null; }
        return false;
      }
      var c=chipAt(x, y); if(c===st.chip) c=null;
      if(c!==st.over){
        if(st.over) st.over.classList.remove("ws-over");
        st.over=c; if(c) c.classList.add("ws-over");
      }
      return true;
    }
    function finish(drop){
      if(!st) return;
      var s=st; st=null; clearTimeout(s.timer);
      if(!s.drag) return;
      s.chip.classList.remove("ws-lift");
      if(s.chip.parentElement) s.chip.parentElement.classList.remove("ws-dragging");
      if(s.over) s.over.classList.remove("ws-over");
      swallowUntil=Date.now()+500;              // the release must not also tap a day
      if(drop && s.over && s.over.parentElement) ffMoveDay(s.from, idx(s.over));
    }
    // Touch
    document.addEventListener("touchstart", function(e){
      var chip=e.target.closest && e.target.closest(".weekstrip .ws-chip");
      if(!chip || e.touches.length!==1) return;
      begin(chip, e.touches[0].clientX, e.touches[0].clientY, "touch");
    }, { passive:true });
    document.addEventListener("touchmove", function(e){
      if(!st || st.kind!=="touch") return;
      var t=e.touches[0]; if(!t) return;
      if(move(t.clientX, t.clientY) && e.cancelable) e.preventDefault();   // dragging: no page scroll
    }, { passive:false });
    document.addEventListener("touchend", function(){ if(st && st.kind==="touch") finish(true); });
    document.addEventListener("touchcancel", function(){ if(st && st.kind==="touch") finish(false); });
    // Mouse / pen
    document.addEventListener("pointerdown", function(e){
      if(e.pointerType==="touch" || e.button!==0) return;
      var chip=e.target.closest && e.target.closest(".weekstrip .ws-chip"); if(!chip) return;
      begin(chip, e.clientX, e.clientY, "pointer");
    });
    document.addEventListener("pointermove", function(e){ if(st && st.kind==="pointer") move(e.clientX, e.clientY); });
    document.addEventListener("pointerup", function(){ if(st && st.kind==="pointer") finish(true); });
    document.addEventListener("pointercancel", function(){ if(st && st.kind==="pointer") finish(false); });
    // A long press must not open a context menu, and the release must not select a day.
    document.addEventListener("contextmenu", function(e){
      if(e.target.closest && e.target.closest(".weekstrip .ws-chip")) e.preventDefault();
    });
    document.addEventListener("click", function(e){
      if(Date.now()<swallowUntil && e.target.closest && e.target.closest(".weekstrip")){
        e.preventDefault(); e.stopImmediatePropagation(); swallowUntil=0;
      }
    }, true);
  })();
