  /* ===================== WORKOUT LOGGER ===================== */
  /* Storage access — the ONE way to touch ff_* state. lsGet memoizes the
     parsed value (a Stats render used to JSON.parse ff_log/ff_body/ff_history
     ~90 times); every write path invalidates: lsSet/lsRemove here, cloud-sync
     merges via the ff-external-write event, other tabs via the storage event.
     Callers may mutate a returned object ONLY when they lsSet it back in the
     same tick (the codebase's existing convention — audited; a mutation left
     unsaved was already a bug before the cache). */
  var __ls;   // lazily created: module 005 (migrations) calls lsGet before this file's statements run
  function lsGet(k,def){
    if (!__ls) __ls = {};
    var c = __ls[k];
    if (!c){
      var v = null;
      try{ v = JSON.parse(localStorage.getItem(k)); }catch(e){ v = null; }
      c = __ls[k] = { v: v };
    }
    return c.v == null ? def : c.v;
  }
  function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){}
    if (!__ls) __ls = {};
    __ls[k] = { v: v };
    try{ window.dispatchEvent(new Event("ff-data-changed")); }catch(e){} }   // nudge cloud-sync to push promptly
  function lsRemove(k){ try{ localStorage.removeItem(k); }catch(e){}
    if (__ls) delete __ls[k];
    try{ window.dispatchEvent(new Event("ff-data-changed")); }catch(e){} }
  // cloud-sync rewrites keys wholesale after a merge; another tab can too.
  window.addEventListener("ff-external-write", function(){ __ls = {}; });
  window.addEventListener("storage", function(e){
    if(!e || !e.key) { __ls = {}; return; }
    if(e.key === "fairwayfuel" || e.key.indexOf("ff_") === 0) delete __ls[e.key];
  });

  // Day labels changed when back squat → leg press (the day-name is the log key). Re-key any
  // workouts logged under the old labels so completed-workout history survives the rename.
  // Idempotent + self-healing: runs each load, so if cloud sync re-introduces an old key it
  // gets folded back in on the next load. Only writes when something actually changed.
  function migrateDayNames(){
    var rename = {
      "Day 1 — Lower (Squat)": "Day 1 — Lower (Quads)",
      "Day 1 — Lower (Squat & Hinge)": "Day 1 — Lower (Quads & Hinge)"
    };
    function filledSets(s){ var n=0; if(s&&s.ex) s.ex.forEach(function(x){ (x.sets||[]).forEach(function(st){ if(st&&(st.w||st.r||st.done)) n++; }); }); return n; }
    try {
      var L = lsGet("ff_log", null); if(!L || typeof L !== "object") return;
      var out = {}, changed = false;
      Object.keys(L).forEach(function(k){
        var bar = k.indexOf("|"), nk = k;
        if(bar >= 0){ var dn = k.slice(bar+1); if(rename[dn]){ nk = k.slice(0,bar) + "|" + rename[dn]; changed = true; } }
        if(out[nk] === undefined) out[nk] = L[k];
        else out[nk] = filledSets(L[k]) > filledSets(out[nk]) ? L[k] : out[nk];   // collision → keep the fuller log
      });
      if(changed) lsSet("ff_log", out);
    } catch(e){}
  }
  function escAttr(s){ return ffAttr(s); }
  // The plan runs off a START DATE: once you start, it auto-knows your week. No dropdown.
  function planStart(){ return lsGet("ff_start", null); }
  // Whole CALENDAR days from the plan's start day to today. Both ends are normalized to
  // local midnight and the diff is rounded, so the plan rolls over exactly when a new
  // calendar day begins (not at the clock-time you happened to start) and DST's 23/25-hour
  // days can't push the count off by one.
  function daysSinceStart(){
    var s = planStart(); if(!s) return null;
    var start = new Date(s); start.setHours(0,0,0,0);
    var today = new Date(); today.setHours(0,0,0,0);
    return Math.max(0, Math.round((today.getTime() - start.getTime()) / 864e5));
  }
  // The plan is 20 weeks = 140 days. Past that, curWeek() still clamps to 20 for
  // display math, but the season is OVER: no new logging may be handed a week-20
  // key (it would reopen/overwrite finished week-20 sessions and their history).
  // Train shows the season-complete card; startPlayer/openLogger refuse new work.
  function seasonComplete(){ var d=daysSinceStart(); return d!=null && d>=140; }
  function curWeek(){
    if(planStart()!=null){
      return Math.max(1, Math.min(20, Math.floor(daysSinceStart()/7) + 1));
    }
    return lsGet("ff_week", 1);   // legacy fallback before the plan is started
  }
  function dayOfPlan(){            // 1–7 within the current week
    if(planStart()==null) return null;
    return (daysSinceStart() % 7) + 1;
  }
  // Real calendar dates for the week strip, anchored to when the user started.
  function weekStartDate(){
    var s = planStart(); if(!s) return null;
    var d = new Date(s); d.setHours(0,0,0,0);
    d.setDate(d.getDate() + (curWeek()-1)*7);
    return d;
  }
  function chipDate(i){
    var ws = weekStartDate(); if(!ws) return null;
    var d = new Date(ws); d.setDate(d.getDate() + i); return d;
  }
  function fmtChipDate(d){           // compact: weekday + day-of-month (fits a 7-day row)
    try { return d.toLocaleDateString(undefined,{weekday:"short"}) + " " + d.getDate(); }
    catch(e){ return ""; }
  }
  function sameDay(a,b){ return !!(a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()); }
  // A training/speed day's real calendar date (from its slot in the week strip).
  // Rest days repeat, so this is only meaningful for the uniquely-named work days.
  function dayCalDate(dayName){
    var ds=stripDays();
    for(var i=0;i<ds.length;i++){ if(ds[i].name===dayName) return chipDate(i); }
    return null;
  }
  // "Future" = the day's date is after today. A future day is a preview, not a
  // logbook: merely opening it must never start a session (that would back/forward-
  // date your history and make the week strip lie). You can still log it early on
  // purpose from an explicit button — this only kills the accidental auto-log.
  function isFutureDay(dayName){
    var d=dayCalDate(dayName); if(!d) return false;
    var t=new Date(); t.setHours(0,0,0,0);
    var dd=new Date(d); dd.setHours(0,0,0,0);
    return dd.getTime() > t.getTime();
  }
  // The week strip as a full 7-day week: each training/speed day, then the program's
  // rest entry repeated to fill out every remaining calendar day.
  function stripDays(){
    var ds=ffBaseWeek();
    return ffApplyLayout(ds, ffLayoutNow()) || ffArrangeWeek(ds);
  }
  // The day arrays are authored as a full 7-slot week with rest days already in position
  // (distributed, never two in a row) — keep that order; pad with a rest if a week is short.
  function ffBaseWeek(){
    var ds = activeDays().slice(0,7);
    if(ds.length < 7){
      var restDay=null; activeDays().forEach(function(d){ if(d.type==="rest" && !restDay) restDay=d; });
      while(ds.length < 7 && restDay) ds.push(restDay);
    }
    return ds;
  }
  // Is a hand-made order actually shaping this week? (A saved order for a different
  // plan size is kept for when you switch back, but it isn't "your order" right now.)
  function ffLayoutActive(){ return !!ffApplyLayout(ffBaseWeek(), ffLayoutNow()); }
  /* The golfer's own week order (Nov 2026): set by holding a day in the week
     strip and dragging it onto another (042). ff_gameday.layout = 7 dayKeys
     indexed by WEEKDAY (0 = Sunday), so it repeats every week whatever day the
     plan started on. It wins over the automatic arrangement; it is ignored
     unless it holds exactly this week's days (a 4↔5-day or in-season switch
     makes it stale, and switching back brings it back). */
  function ffLayoutNow(){
    var g=lsGet("ff_gameday", null); if(!g) return null;
    var lay=(g.arrangeWeek && curWeek()<g.arrangeWeek) ? g.prevLayout : g.layout;
    return (Array.isArray(lay) && lay.length===7) ? lay : null;
  }
  function ffApplyLayout(ds, lay){
    if(!lay) return null;
    var ws=weekStartDate(); if(!ws) return null;
    var pool=ds.slice(), out=[], wd0=ws.getDay();
    for(var i=0;i<7;i++){
      var k=lay[(wd0+i)%7], j=-1;
      for(var x=0;x<pool.length;x++) if(dayKey(pool[x])===k){ j=x; break; }
      if(j===-1) return null;
      out.push(pool.splice(j,1)[0]);
    }
    return out;
  }
  /* Arrange the week around rounds. With play days set (Train › Plan settings,
     ff_gameday.days), the training days move so rounds land on rest days and a
     heavy-legs day never sits the day before a round (muscle-damaging leg work
     dents power for ~1–2 days — Byrne 2004) — nor the back + rotation day (Nov 2026,
     ffBackRotate). Before Nov 29, 2026 the plan's ORDER was kept (only the starting
     point rotates); from then the game-week rules below may reorder it. Spacing
     counts too: back-to-back training days and two leg days in a row cost points. Deterministic, and
     the same every week (weekdays repeat), so it only moves when play days
     change — and a change made mid-week applies from next week (ffPlayDaysNow).
     Days off (Nov 2026, ff_gameday.off): weekdays the golfer never trains. They
     block a slot like a round does (without the legs-before-a-round rule), and
     outrank rounds when the week is overbooked. */
  function ffHeavyLegs(d){ return !!d && d.type!=="rest" && d.type!=="speed" && /Lower|Squat|Hinge|Quads|Full Body/.test(d.name); }
  // The back + rotation day (Upper (Pull + Rotate): weighted pull-ups, rows, cable
  // rotations). Lats, mid-back and the trunk rotators drive the turn, and a hard pull
  // day leaves them stiff for a day or two (owner, Nov 2026: back day on Friday before
  // weekend golf "gets me in trouble"). Like heavy legs, never the day before a round.
  function ffBackRotate(d){ return !!d && d.type!=="rest" && d.type!=="speed" && /Pull/.test(d.name) && !/Lower|Squat|Hinge|Quads|Full Body/.test(d.name); }
  // The back-day rule applies to plan weeks that START on or after its release, so a week
  // already under way never reshuffles. Decided from the plan's own dates rather than a
  // stored marker, so every device agrees whatever order cloud sync lands in (Codex, #134).
  var FF_BACK_RULE_FROM=new Date(2026,10,15).getTime();
  /* The game week (Nov 2026; owner: "odd starting with a speed day after a golf
     weekend"). The plan template puts Speed & Power straight after a "Rest / Play 18"
     slot, so rotating it around real rounds put speed next to a round in almost every
     week. From weeks starting Nov 29, 2026 the arranger may REORDER the days, not only
     rotate them, and scores the week the way a team sport builds one around game day:
       · speed the day after heavy legs     +5  leg damage dents jump power 1–2 days (Byrne 2004)
       · speed right before / after a round +3 each  three straight days of max-speed rotation, a stale session
       · back + rotation the day after one  +2  more rotation on a back that just played
       · heavy legs the day after a round   +1.5
       · heavy legs two days before a round +1.5, +1 for the deadlift day (its soreness lasts longest)
     on top of the hard rules, raised so nothing above can outweigh them: heavy legs the day
     before a round +30, the back day +20, legs on back-to-back days +12. Ties go to the plan's
     own order (fewest moves from a rotation of it). Gated by the week's start date like the
     back-day rule, so a week under way never moves. */
  var FF_WEEK_V2_FROM=new Date(2026,10,29).getTime();
  function ffPerms(n){
    var out=[];
    (function go(acc, left){
      if(!left.length){ out.push(acc); return; }
      for(var i=0;i<left.length;i++) go(acc.concat([left[i]]), left.slice(0,i).concat(left.slice(i+1)));
    })([], (function(){ var a=[]; for(var i=0;i<n;i++) a.push(i); return a; })());
    return out;
  }
  // The search is a few milliseconds and the week is read many times per render: remember it.
  var ffArrMemo={ k:null, v:null };
  function ffArrangeWeek(ds){
    var play=ffPlayDaysNow(), off=ffOffDaysNow(); if(!play.length && !off.length) return ds;
    var ws=weekStartDate(); if(!ws) return ds;
    var mk=ws.getTime()+"|"+play.join(",")+"|"+off.join(",")+"|"+ds.map(function(d){ return d.name; }).join("|");
    if(ffArrMemo.k===mk) return ffArrMemo.v.slice();
    var out=ffArrangeWeekRaw(ds, play, off, ws);
    ffArrMemo={ k:mk, v:out.slice() };
    return out;
  }
  function ffArrangeWeekRaw(ds, play, off, ws){
    var backRule=ws.getTime()>=FF_BACK_RULE_FROM, v2=ws.getTime()>=FF_WEEK_V2_FROM;
    var wd0=ws.getDay(), isPlay=function(i){ return play.indexOf((wd0+i)%7)!==-1; },
      isOff=function(i){ return off.indexOf((wd0+i)%7)!==-1; };
    var train=ds.filter(function(d){ return d.type!=="rest"; }), rests=ds.filter(function(d){ return d.type==="rest"; });
    var k=train.length; if(!k || k>7) return ds;
    var authored=ds.map(function(d){ return d.type!=="rest"; });
    var best=null, bestScore=Infinity;
    function combos(start, left, acc, out){
      if(!left){ out.push(acc.slice()); return; }
      for(var i=start;i<=7-left;i++){ acc.push(i); combos(i+1, left-1, acc, out); acc.pop(); }
    }
    var slotSets=[]; combos(0, k, [], slotSets);
    // Game week: only the placements with the fewest workouts on days off / round days are
    // candidates (what "never train on a day off or a round day" means), which also keeps
    // the full reorder search cheap on a phone.
    if(v2){
      var cost=function(sl){ var c=0; sl.forEach(function(i){ c+=isOff(i)?1000:(isPlay(i)?100:0); }); return c; };
      var minC=Infinity; slotSets.forEach(function(sl){ minC=Math.min(minC, cost(sl)); });
      slotSets=slotSets.filter(function(sl){ return cost(sl)===minC; });
    }
    // The orders to try: every reordering (v2), or only rotations of the plan's order.
    var orders=[];
    if(v2) ffPerms(k).forEach(function(o){
      var mis=k; for(var r0=0;r0<k;r0++){ var m=0; for(var j0=0;j0<k;j0++) if(o[j0]!==(j0+r0)%k) m++; if(m<mis) mis=m; }
      orders.push({ o:o, tb:mis*0.05 });
    });
    else for(var r1=0;r1<k;r1++){ var o1=[]; for(var j1=0;j1<k;j1++) o1.push((j1+r1)%k); orders.push({ o:o1, tb:r1*0.01 }); }
    slotSets.forEach(function(slots){
      orders.forEach(function(ord){
        var week=new Array(7), sc=0;
        slots.forEach(function(si, j){ week[si]=train[ord.o[j]]; });
        for(var i=0;i<7;i++){
          var d=week[i], nx=week[(i+1)%7];
          // Never train on a day off or a round day. If the week is overbooked, a
          // workout lands on a round day before it ever lands on a day off.
          if(d && isOff(i)) sc+=1000; else if(d && isPlay(i)) sc+=100;
          // The hard rules. Under the game week they're raised so no sum of game-week
          // points can ever buy one back (review, Nov 2026: speed +5 +3 outweighed a +10).
          if(ffHeavyLegs(d) && isPlay((i+1)%7)) sc+=(v2?30:10);     // no heavy legs the day before
          if(backRule && ffBackRotate(d) && isPlay((i+1)%7)) sc+=(v2?20:6); // …nor the back + rotation day (legs win if overbooked)
          if(d && nx) sc+=1;                                        // spacing (wraps into next week)
          if(ffHeavyLegs(d) && ffHeavyLegs(nx)) sc+=(v2?12:3);      // never two leg days in a row
          if(!!d!==authored[i]) sc+=0.1;                            // stay close to the authored week
          if(v2 && d){                                              // the game week (see FF_WEEK_V2_FROM)
            var pv=week[(i+6)%7], after=isPlay((i+6)%7), before=isPlay((i+1)%7);
            if(d.type==="speed"){ if(ffHeavyLegs(pv)) sc+=5; if(after) sc+=3; if(before) sc+=3; }
            if(after && ffBackRotate(d)) sc+=2;
            if(after && ffHeavyLegs(d)) sc+=1.5;
            if(ffHeavyLegs(d) && isPlay((i+2)%7)) sc+=1.5+((/Hinge/.test(d.name) && !/Quads/.test(d.name)) ? 1 : 0);
          }
        }
        sc+=ord.tb;
        if(sc<bestScore){ bestScore=sc; best=week; }
      });
    });
    if(!best) return ds;
    var ri=0;
    for(var i=0;i<7;i++) if(!best[i]) best[i]=rests[ri++]||rests[0];
    return best;
  }
  // The play days in force for THIS week: a change made after the week already
  // has logged work waits for next week, so nothing done today jumps around.
  function ffPlayDaysNow(){
    if(typeof ffPlayDays!=="function") return [];
    var g=lsGet("ff_gameday", null);
    if(g && g.arrangeWeek && curWeek()<g.arrangeWeek && Array.isArray(g.prevDays))
      return g.prevDays.filter(function(x){ return x===(x|0) && x>=0 && x<=6; });
    return ffPlayDays();
  }
  // Weekdays the golfer never trains (0 = Sunday), set in Train › Plan settings.
  // On the existing roaming ff_gameday object, like play days — no new key.
  function ffOffDays(){
    var g=lsGet("ff_gameday", null), d=(g && Array.isArray(g.off)) ? g.off : [];
    return d.filter(function(x){ return x===(x|0) && x>=0 && x<=6; });
  }
  // The days off in force for THIS week (same mid-week rule as play days). A
  // pending change saved before days off existed has no prevOff: none were set.
  function ffOffDaysNow(){
    var g=lsGet("ff_gameday", null);
    if(g && g.arrangeWeek && curWeek()<g.arrangeWeek)
      return (Array.isArray(g.prevOff) ? g.prevOff : []).filter(function(x){ return x===(x|0) && x>=0 && x<=6; });
    return ffOffDays();
  }
  // Save a play-day / day-off change. If this week already has logged work, the
  // new layout waits for next week: snapshot BOTH lists once, so whatever was in
  // force stays in force until then. The snapshot is taken BEFORE apply(g) runs —
  // lsGet hands back its cached object, so g IS what ffPlayDaysNow/ffOffDaysNow read.
  function ffSaveSchedule(apply){
    // Any check-off this week freezes the layout: rest-day marks (recovery AND
    // cardio) are keyed by the rest slot, so re-arranging would move them to
    // another calendar day (Codex, #117). A skip too: "Rest today" pins the
    // skipped workout to today's calendar day (043).
    var g=gdState(), wk=planStart()?curWeek():0, busy=wk && stripDays().some(function(x){
      return x.type==="rest" ? (restDone(wk, dayKey(x)) || cardioDone(wk, dayKey(x))) : (!!getSession(wk, x.name) || sessionSkipped(wk, x.name)); });
    if(busy){ if(!(g.arrangeWeek>wk)){ g.prevDays=ffPlayDaysNow().slice(); g.prevOff=ffOffDaysNow().slice(); g.prevLayout=ffLayoutNow(); } g.arrangeWeek=wk+1; }
    else { delete g.arrangeWeek; delete g.prevDays; delete g.prevOff; delete g.prevLayout; }
    apply(g); gdSave(g);
  }
  // Start (or re-anchor) the plan so that "today" lands in the given week.
  // Outside Pro (once billing is on) every start is week 1 — no week jump (036).
  function startPlanAtWeek(n){
    if(ffAccess()!=="full") n=1;
    var back = (Math.max(1, n) - 1) * 7;
    var d = new Date(Date.now() - back * 864e5);
    lsSet("ff_start", d.toISOString());
    ffStampFreeWeek();   // a plan start also starts the free week (a shared ?link= visitor skips setup)
    renderPhase(); if(typeof renderDash==="function") renderDash();
  }
  // Full plan reset: start date + logged workouts (keeps body/speed history +
  // calculator). Tombstone every wiped session FIRST — without them the next
  // cloud-sync merge would resurrect the old season's log from the server.
  // Everything keyed "week|day" is season-scoped and goes too: rest check-offs
  // (ff_rest) and skip marks — else week 1 of the new season opens pre-checked —
  // plus a paused-player marker pointing at a session that no longer exists.
  // (cloud-sync drops ff_rest/ff_skipped_sessions entries older than the new
  // ff_start on merge, so the old season's marks can't come back.)
  function resetPlanFull(){
    try{ Object.keys(getLog()).forEach(function(k){ ffTomb("L:"+k); }); }catch(e){}
    ["ff_start","ff_log","ff_week","ff_planview","ff_skipped_sessions","ff_rest","ff_pl_paused"].forEach(lsRemove);
    try{ window.dispatchEvent(new Event("ff-data-changed")); }catch(e){}
    focusDay=null;
    renderPhase();
    if(typeof renderDash==="function") renderDash();
    if(typeof renderAccount==="function") renderAccount();
  }
  function getLog(){ return lsGet("ff_log",{}); }
  function getSession(w,d){ return getLog()[w+"|"+d]||null; }
  // A session exists as soon as the player saves the first bit of work, but it
  // is not "banked" until the user explicitly finishes it. Keep this distinction
  // shared so Train, Home, Stats, streaks and leaderboards tell the same truth.
  function sessionFinished(s){ return !!(s && s.finishedAt); }
  function sessionInProgress(s){ return !!(s && !s.finishedAt); }
  function getSkippedSessions(){ var s=lsGet("ff_skipped_sessions",{}); return (s&&typeof s==="object")?s:{}; }
  // Values are timestamps: >0 = skipped at that time, <0 = un-skipped at |t|.
  // Removal is a NEGATIVE stamp, never a delete — the sync union keeps the
  // newest |ts| per key, so a delete would be resurrected by another device.
  function sessionSkipped(w,d){ return getSkippedSessions()[w+"|"+d] > 0; }
  function skipSession(w,d){
    var s=getSkippedSessions(), k=w+"|"+d;
    s[k]=Date.now();
    lsSet("ff_skipped_sessions",s);
  }
  function unskipSession(w,d){
    var s=getSkippedSessions(), k=w+"|"+d;
    if(s[k] > 0){ s[k]=-Date.now(); lsSet("ff_skipped_sessions",s); }
  }
  // A skipped, unfinished workout day that plays as a rest day ("Rest today", 043):
  // today's, or an earlier one that has its recovery or cardio logged (it stays a
  // rest day with its ✓, and stays put — Codex, #123). A plain catch-up "Skip it"
  // keeps its workout card, so it can still be logged late.
  function ffRestInstead(w,d){
    if(!(d && d.type!=="rest" && sessionSkipped(w,d.name) && !sessionFinished(getSession(w,d.name)))) return false;
    return (w===curWeek() && ffIsTodaySlot(d.name)) || restDone(w,dayKey(d)) || cardioDone(w,dayKey(d));
  }
  function saveSession(w,d,s){
    if(s) s._ts=Date.now();
    var L=getLog(); L[w+"|"+d]=s; lsSet("ff_log",L);
    // A completed workout wins over an earlier skip on every device.
    if(sessionFinished(s)){
      var skipped=getSkippedSessions(), k=w+"|"+d;
      if(skipped[k] > 0){ skipped[k]=-Date.now(); lsSet("ff_skipped_sessions",skipped); }
    }
  }
  // Rest-day check-off — kept in its OWN key so it never counts as a training
  // session (Octane, streaks, leaderboard all read ff_log, not this).
  function getRest(){ var r=lsGet("ff_rest",{}); return (r&&typeof r==="object")?r:{}; }
  // Same timestamp convention as skips: >0 = checked off, <0 = undone at |t|
  // (an undo must out-stamp the check-off on every device, so never delete).
  function restDone(w,d){ return getRest()[w+"|"+d] > 0; }
  function toggleRestDone(w,d){ var r=getRest(), k=w+"|"+d; r[k]=(r[k] > 0) ? -Date.now() : Date.now(); lsSet("ff_rest",r); }
  // Easy (Zone 2) cardio on a rest day (Nov 2026): its own check-off, stored in
  // ff_rest under "week|day|cardio" with the same signed-timestamp convention, so
  // it syncs (unionDeleted), clears with a plan reset and drops with an old season
  // exactly like the rest check-off — and never touches restDone("week|day").
  function cardioDone(w,d){ return getRest()[w+"|"+d+"|cardio"] > 0; }
  function toggleCardioDone(w,d){ var r=getRest(), k=w+"|"+d+"|cardio"; r[k]=(r[k] > 0) ? -Date.now() : Date.now(); lsSet("ff_rest",r); }
  // Every rest day shares the display name "Rest / Play 18", so key its check-off
  // by the day's slot position in the week — otherwise both rest days would toggle
  // as one. Training days have unique names, so they key by name as before.
  function dayKey(d){ if(!d) return ""; if(d.type!=="rest") return d.name; var i=activeDays().indexOf(d); return i>=0?("rest@"+i):d.name; }
  function parseSets(t){ var m=String(t).match(/(\d+)\s*[×x]/); return m?Math.min(8,Math.max(1,parseInt(m[1],10))):3; }
  // Your order for a day: the order you last ran it in is its order next time
  // (owner, Nov 2026: "I don't love the flow of the day" — curl and extension
  // first). The player's reorder sheet sets it; "Plan order" there puts it back.
  // Rows match by plan slot (orig, else the name), so swaps and the Back defaults
  // keep their place; a row the last session didn't have keeps its own slot.
  // Reads the latest session of that day from an EARLIER week, so this week's
  // session is the one that sets next week's order.
  function ffLastOrder(dayName, week){
    var L=getLog(), best=null, bw=-1;
    Object.keys(L).forEach(function(k){
      var i=k.indexOf("|"); if(i<0 || k.slice(i+1)!==dayName) return;
      var w=parseInt(k.slice(0,i),10), s=L[k];
      if(!(w<week) || w<=bw || !s || !Array.isArray(s.ex)) return;
      bw=w; best=s;
    });
    return best ? best.ex.map(function(x){ return x ? (x.orig||x.name) : ""; }) : null;
  }
  // The permutation (indices into d.ex) that puts a day in your order, or null for
  // the plan's own. Sessions are BUILT in plan order — gear subs dedupe and the
  // readiness smart trim keep the first two plan lifts whole, as always — and only
  // then put in your order (review: building in your order handed a slot a
  // different gear sub, and protected whatever you'd moved to the top).
  function ffDayPerm(d, week){
    var rows=(d && d.ex) || [];
    if(rows.length<2) return null;
    var ord=ffLastOrder(d.name, week); if(!ord) return null;
    var pos=rows.map(function(r){ var a=ord.indexOf(r[0]); return a>=0 ? a : ord.indexOf(applySwapName(r[0])); });
    var known=[]; pos.forEach(function(p, i){ if(p>=0) known.push(i); });
    if(known.length<2) return null;
    var sorted=known.slice().sort(function(a, b){ return pos[a]-pos[b]; });
    if(sorted.join()===known.join()) return null;   // already the plan's order
    var q=0;
    return rows.map(function(r, i){ return pos[i]>=0 ? sorted[q++] : i; });
  }
  function ffDayRows(d, week){
    var p=ffDayPerm(d, week), rows=(d && d.ex) || [];
    return p ? p.map(function(i){ return rows[i]; }) : rows;
  }
  function findDay(name){ var f=null; activeDays().forEach(function(d){ if(d.name===name) f=d; }); return f; }
  function todayStr(){ try{ return new Date().toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}); }catch(e){ return ""; } }
  // What progression reads from: per exercise, its most recent FULL-DOSE earlier
  // log. Deload weeks (~60% loads) and recovery-dose readiness sessions (~75%) are
  // skipped — progressing off them made the week after a deload prescribe ~60%.
  // Same-day entries win; an exercise never logged on this day falls back to its
  // latest occurrence on ANY day (a 4<->5 days/week switch renames the days, which
  // used to reset every lift to "first time"). Only if no full-dose entry exists
  // does a reduced one serve, flagged _reduced so no load is prescribed off it.
  // Returns a composite session { ex:[…] } — callers match x.name as before.
  //
  // Every entry carries _ts — when that session was done (its ff_history finish
  // time when there is one: ff_log's _ts moves on every edit and a backup restore)
  // — so ffDose (077) can ease a returner back in instead of adding weight.
  // A lift with no full-dose log THIS season falls back to its newest full-dose
  // ff_history entry from before the plan started (_prior): "Ease back in" and
  // season 2 reset the plan log, never the user's loads.
  function lastSessionFor(day, beforeW){
    var L=getLog(), same={}, any={}, low={}, names=[], seen={};
    function saw(n, t){ if(t && !(seen[n]>=t)) seen[n]=t; }
    var st=Date.parse(planStart()||"")||0, hist=lsGet("ff_history",[]), done={}, prior={}, priorLow={};
    if(Array.isArray(hist)) hist.forEach(function(h){
      if(!h || !h.ex) return;
      var t=h.doneTs||h.ts||0;
      if(st && t>=st){ var key=h.week+"|"+h.day; if(!done[key] || t>done[key]) done[key]=t; return; }
      var b=sessFullDose(h, h.week) ? prior : priorLow;
      h.ex.forEach(function(x){
        if(!x || !x.name || !(x.sets||[]).some(function(s2){ return s2 && (s2.w||s2.r); })) return;
        if(!b[x.name] || t>b[x.name].ts) b[x.name]={ x:x, ts:t };
        saw(x.name, t);
      });
    });
    Object.keys(L).forEach(function(k){
      var i=k.indexOf("|"); if(i<0) return;
      var w=parseInt(k.slice(0,i),10), dn=k.slice(i+1), s=L[k];
      if(!(w<beforeW) || !s || !s.ex) return;
      // Started, then skipped ("Rest today" mid-session): an abandoned set isn't a dose to progress from.
      if(!s.finishedAt && sessionSkipped(w, dn)) return;
      var full=sessFullDose(s, w), ts=done[w+"|"+dn]||(typeof s._ts==="number"?s._ts:0);
      s.ex.forEach(function(x){
        if(!x || !x.name || !(x.sets||[]).some(function(st2){ return st2 && (st2.w||st2.r); })) return;
        var bucket=!full ? low : (dn===day ? same : any), cur=bucket[x.name];
        if(names.indexOf(x.name)<0) names.push(x.name);
        saw(x.name, ts);
        // Keep the one before too (prev): a maintaining plan needs two clean sessions to add load.
        if(!cur || w>cur.w || (w===cur.w && dn===day)) bucket[x.name]={ w:w, x:x, ts:ts, prev:(cur && cur.w<w) ? cur : (cur ? cur.prev : null) };
        else if(w<cur.w && (!cur.prev || w>cur.prev.w)) cur.prev={ w:w, x:x, ts:ts };
      });
    });
    Object.keys(prior).concat(Object.keys(priorLow)).forEach(function(n){ if(names.indexOf(n)<0) names.push(n); });
    if(!names.length) return null;
    // _ts: when the reference session was done. _seen: when the lift was last done
    // at ANY dose — a deload or recovery day is training, not time off, so the
    // "how long since" rules (no bump at 14+ days, ease back in at 28+) read it.
    function lxOf(x, ts, extra){ var o={ name:x.name, orig:x.orig, target:x.target, sets:x.sets||[], feel:x.feel, _ts:ts, _seen:Math.max(ts||0, seen[x.name]||0) }; if(extra) o[extra]=true; return o; }
    return { ex: names.map(function(n){
      var hit=same[n]||any[n];
      if(hit){ var o=lxOf(hit.x, hit.ts); if(hit.prev) o._prev={ target:hit.prev.x.target, sets:hit.prev.x.sets||[], feel:hit.prev.x.feel }; return o; }
      if(prior[n]) return lxOf(prior[n].x, prior[n].ts, "_prior");   // an earlier season's full dose
      var lw=low[n]||priorLow[n];
      return lxOf(lw.x, lw.ts, "_reduced");
    }) };
  }
  // A full-dose session (ff_log session or ff_history entry): not a deload week
  // and not a recovery-dose readiness day. Shared by progression (lastSessionFor)
  // and the stall insight (bigLiftStats) so they can't drift apart.
  function sessFullDose(s, w){
    if(!s) return false;
    var rd=s.readiness, band=rd ? (rd.original ? "ready" : rd.band) : s.rb;
    return (s.wave||waveFor(w))!=="deload" && band!=="recharge";
  }
  // Did the rep target change since that session (a Heavy week, or back to Build)?
  // Then the reps placeholder seeds from TODAY's target, not last time's reps.
  function repsShifted(lx, x){
    var a=lx&&topReps(lx.target), b=x&&topReps(x.target);
    return !!(a && b && a!==b);
  }
  function topReps(t){ var m=String(t).match(/[×x]\s*(\d+)/); return m?parseInt(m[1],10):null; }
  // A movement measured by DISTANCE, not reps — its authored target reads
  // "3 × 40 yd" (loaded carries). The set's second slot then logs YARDS, so the
  // loggers relabel the "reps" column and seed the prescribed distance. Same
  // /yd/ signal the wave engine keys on to skip rep bumps (035 waveAdjust) —
  // keep them in step so display and prescription never drift.
  function isDistEx(t){ return /\byd\b|yards?\b/i.test(t||""); }
  // Lower-case unit for the second slot. A hold (by name or a "30 s" target) is
  // seconds even under an older yard/rep target — the name wins.
  function repWord(t, n){ return (isTimeEx(t) || isHoldEx(n)) ? "sec" : (isDistEx(t) ? "yards" : "reps"); }
  // "30 s", "40 yd", "12 reps" — one set's second slot with its unit.
  function repsText(r, x){ return r+(isTimedEx(x) ? " s" : (isDistEx(x && x.target) ? " yd" : " reps")); }
  function repSeed(t){ var n=topReps(t); return n!=null ? String(n) : ""; }
  // Single smallest sensible jump for the one-tap "add weight" nudge (progress by LOAD,
  // holding reps/sets), by equipment — a step the gym actually stocks:
  //   med ball → 0 (no load bump: a heavier ball slows the throw)
  //   lower-body compounds → 5 · barbell upper body → 2.5 (1.25 lb plates a side)
  //   dumbbells, kettlebells, cables and machine stacks → 5 · anything else → 2.5
  function incNum(name){
    var n=String(name||""), needs=" "+(equipNeedsFor(n)||[]).join(" ")+" ";
    if(/ medball /.test(needs) || (/Med-?Ball|Medicine Ball|Chest Throw|Chest Pass|Slam|Scoop|Shotput/i.test(n) && !/Landmine|Cable|Band|Barbell/i.test(n))) return 0;
    if(/Squat|Deadlift|Hinge|Lunge|Hip Thrust|Leg[- ]Press|Romanian|\bRDL\b|Swing|Carry/i.test(n)) return 5;
    if(isBarbell(n)) return 2.5;
    if(/ (dumbbells|kettlebell|cable|latpulldown|seatedrow|pecdeck|legext|legcurl|chestpress|shoulderpress|preacher|calfmachine|abductor|hipthrustm|assisted|machine-any) /.test(needs) || /\bDB\b|Dumbbell/i.test(n)) return 5;
    return 2.5;
  }
  function incFor(name){ var i=incNum(name); return i ? i+" lb" : "a little"; }
  // Ready to add weight = last session hit the top of the rep range on every working set.
  function progressReady(lx, target){
    var top=topReps(target); if(!top||!lx||lx._reduced) return false;   // never progress off a deload/recovery load
    if(lx.feel==="grind") return false;   // every rep, but nothing left: own it once more first (player's "How did that feel?")
    var working=lx.sets.filter(function(st){ return st.r!==""&&st.r!=null&&!isNaN(parseInt(st.r,10)); });
    if(working.length<2) return false;
    return working.every(function(st){ return parseInt(st.r,10)>=top; });
  }
  function logFoot(name){
    var sess=getSession(curWeek(), name), done=sessionFinished(sess);
    if(!sess) return '<div class="day-foot"><button class="logbtn" data-logday="'+escAttr(name)+'">'+ffIcon("play",13)+' Log workout</button></div>';
    if(!done) return '<div class="day-foot"><button class="logbtn" data-logday="'+escAttr(name)+'">'+ffIcon("play",13)+' Resume workout</button>'+
      '<button class="logbtn reset" data-clearday="'+escAttr(name)+'">↺ Clear / reset this workout</button></div>';
    // Logged: full-width edit button + a reset, so a logged day shown as a static
    // card can be cleared without hunting for the Today finish bar.
    return '<div class="day-foot"><button class="logbtn logged" data-logday="'+escAttr(name)+'">✓ Logged — tap to edit</button>'+
      '<button class="logbtn reset" data-clearday="'+escAttr(name)+'">↺ Clear / reset this workout</button></div>';
  }

  // ---- User lift swaps: pick a valid same-muscle replacement; it sticks in the plan ----
  function getSwaps(){ return lsGet("ff_swaps", {}); }
  // Plan lifts renamed by an evidence update keep the swap a user chose for the
  // old name (swaps are keyed by the ORIGINAL plan name); setting or resetting
  // the new one clears the old key so a reset really returns to the default.
  var FF_PLAN_RENAMED={ "Cable Overhead Triceps Extension":"Cable Triceps Pushdown" };
  // Plan defaults that depend on the person, not the gear. "Back" (setup, or
  // You › Your plan › Extra care) keeps the leg days heavy and fast but takes the
  // load off the spine where a lift puts it there:
  //  - The heavy hinge → the trap-bar deadlift: lower peak lumbar and hip moments,
  //    and more force, bar speed and power, than the straight bar (Swinton 2011,
  //    J Strength Cond Res 25:2000). The 4-day plan's heavy hinge is the Romanian
  //    deadlift, so there it's the RDL that becomes the trap bar.
  //  - A plan that already has the deadlift (5-day, in-season) keeps one trap-bar
  //    lift and its second hinge, the RDL, goes single-leg: half the weight in the
  //    hands, the same hamstring stretch, and the lead-hip control the swing uses.
  //  - Calf raises come off the shoulders: the standing machine stacks its load on
  //    the spine; the leg-press version trains the same straight-knee calf.
  // Training itself stays: exercise lowers the risk of a low-back pain episode
  // (Steffens 2016, JAMA Intern Med 176:199). An explicit swap — including back to
  // the authored lift — always wins.
  function ffBackOn(){ return typeof state!=="undefined" && Array.isArray(state.prep) && state.prep.indexOf("back")!==-1; }
  function ffPlanHasLift(n){
    return activeDays().some(function(d){ return (d.ex||[]).some(function(r){ return r[0]===n; }); });
  }
  function ffProfileDefault(name){
    if(!ffBackOn()) return null;
    var bar=!!planState.equip.barbell;
    if(name==="Deadlift") return bar ? "Trap-Bar Deadlift" : null;
    if(name==="Romanian Deadlift"){
      if(ffPlanHasLift("Deadlift")) return "Single-Leg RDL";
      return bar ? "Trap-Bar Deadlift" : null;
    }
    if(name==="Standing Calf Raise") return planState.equip.legpress ? "Leg-Press Calf Raise" : "Single-Leg Calf Raise";
    return null;
  }
  // A single-leg lift in a two-leg slot reads per leg: "3 × 8" → "3 × 8 / leg" —
  // the Back default or your own swap. ffLegTarget (050) does the same mid-session.
  function ffProfileSr(orig, sr){
    var s=String(sr||""), d=applySwapName(orig);
    if(d===orig || !/^Single-?Leg /i.test(d) || /\/\s*(leg|side)/i.test(s)) return sr;
    return s.replace(/^(\s*\d+\s*×\s*\d+(?:\s*[–-]\s*\d+)?)/, "$1 / leg");
  }
  function applySwapName(name){ var s=getSwaps(), old=FF_PLAN_RENAMED[name]; return s[name] || (old && s[old]) || ffProfileDefault(name) || name; }
  function setSwap(orig, neu){ var s=getSwaps(); if(FF_PLAN_RENAMED[orig]) delete s[FF_PLAN_RENAMED[orig]];
    // Choosing the authored lift over a profile default is a real choice — keep it.
    if(neu===orig && ffProfileDefault(orig)) s[orig]=orig;
    else if(!neu || neu===orig) delete s[orig]; else s[orig]=neu;
    lsSet("ff_swaps", s); }
  // Pull-up capacity check: the pull day opens with Weighted Pull-up 4 × 6, which
  // most new lifters (and many heavier golfers) can't do for one strict rep.
  // Asked ONCE, before the first pull session, on Home and the Train card:
  // "Not yet" swaps in the best assisted version the gear allows (ff_swaps), so
  // the rows, history and progression all follow the swap like any other.
  function ffPullCapNeeded(d){
    if(!d || !d.ex || !d.ex.some(function(r){ return r[0]==="Weighted Pull-up"; })) return false;
    if(getSwaps()["Weighted Pull-up"] || !planState.equip.pullupbar) return false;
    if((lsGet("ff_insights_seen",[])||[]).indexOf("pullup-cap")!==-1) return false;
    var h=lsGet("ff_history",[]);
    return !(Array.isArray(h) && h.some(function(e){ return e && (e.ex||[]).some(function(x){
      return x && /Pull-?up|Chin-?up/i.test(x.name||"") && (x.sets||[]).some(function(st){ return st && parseInt(st.r,10)>0; }); }); }));
  }
  function ffPullCapHtml(d){
    if(!ffPullCapNeeded(d)) return "";
    return '<div class="pull-cap" role="group" aria-label="Pull-up check"><b>Quick check:</b> can you do 6 strict pull-ups (chin over the bar, no swinging)?'+
      '<div class="pull-cap-btns"><button type="button" data-pullcap="yes">Yes</button><button type="button" data-pullcap="no">Not yet</button></div></div>';
  }
  function ffPullAssist(){
    if(planState.equip.assisted) return "Assisted Pull-up";
    if(planState.equip.bands) return "Band-assisted Pull-up";
    return "Negative Pull-up (5 s lowering)";
  }
  document.addEventListener("click", function(e){
    var b=e.target.closest("[data-pullcap]"); if(!b) return;
    var s=lsGet("ff_insights_seen",[])||[]; if(s.indexOf("pullup-cap")===-1){ s.push("pullup-cap"); lsSet("ff_insights_seen", s); }
    if(b.getAttribute("data-pullcap")==="no"){
      var alt=ffPullAssist(); setSwap("Weighted Pull-up", alt);
      ffToast("Swapped to "+alt+" — same sets. Build to 6 clean reps, then try the bar.");
    } else ffToast("Pull-ups it is — start with bodyweight; add weight once every set hits 6.");
    try{ renderPhase(); }catch(_){}
    try{ renderDash(); }catch(_){}
  });
  // Valid, equally-hard alternatives by movement pattern (no weakling subs).
  // ---- Exercise database — grouped by movement pattern. Powers swap options AND
  // the "Add a lift" picker. Names match the plan/EX entries so swaps resolve gear. ----
  var EXERCISE_DB = {
    "Quads — squat pattern": ["Back Squat","Front Squat","Leg Press","Hack Squat","Machine Hack Squat","Goblet Squat","Smith Machine Squat","Belt Squat","Box Squat","Safety-Bar Squat","Pendulum Squat","Landmine Squat","Cyclist Squat","Single-Leg Leg Press","Leg Extension","Sissy Squat","Zercher Squat"],
    "Single-leg / lunge": ["Walking Lunge","Reverse Lunge","Deficit Reverse Lunge","Bulgarian Split Squat","Rear-Foot-Elevated Split Squat","Front-Foot-Elevated Split Squat","Step-up","Forward Lunge","Lateral Lunge","Curtsy Lunge","Split Squat","Pistol Squat","Skater Squat","Cossack Squat"],
    "Hinge / posterior chain": ["Conventional Deadlift","Romanian Deadlift","DB Romanian Deadlift","Stiff-Leg Deadlift","Snatch-Grip Deadlift","Deficit Deadlift","Trap-Bar Deadlift","Sumo Deadlift","Rack Pull","Good Morning","Single-Leg RDL","Kettlebell RDL","Hip Thrust","Single-Leg Hip Thrust","Glute-Ham Raise","Lying Leg Curl","Seated Leg Curl","Nordic Curl","Back Extension","45° Hyperextension","Reverse Hyper","Cable Pull-Through"],
    "Push — chest (horizontal)": ["Barbell Bench Press","Incline Barbell Press","Decline Bench Press","Flat DB Press","Incline DB Press","Smith Bench Press","Smith Incline Press","Machine Chest Press","Machine Incline Press","Plate-Loaded Chest Press","Plate-Loaded Incline Press","Weighted Dip","Push-up","Deficit Push-up","Cable Fly","Incline DB Fly","Machine Fly","High-to-Low Cable Fly","Low-to-High Cable Fly","Cable Crossover","Single-Arm Cable Fly","Single-Arm Cable Chest Press","Cable Chest Press","Pec Deck","Svend Press","Floor Press","Landmine Press"],
    "Push — shoulders (vertical)": ["Standing Overhead Press","Seated DB Shoulder Press","Push Press","Arnold Press","Machine Shoulder Press","Plate-Loaded Shoulder Press","Z-Press","Lateral Raise","Seated DB Lateral Raise","Cable Lateral Raise","Leaning Cable Lateral Raise","Single-Arm Cable Lateral Raise","Machine Lateral Raise","Rear-Delt Fly","Reverse Pec Deck","Machine Rear-Delt Fly","Cable Rear-Delt Fly","Single-Arm Cable Rear-Delt Fly","Cable Y-Raise","Face Pull","Front Raise","Cable Front Raise","Upright Row","Cable Upright Row"],
    "Pull — lats (vertical)": ["Weighted Pull-up","Chin-up","Neutral-Grip Pull-up","Lat Pulldown","Machine Pulldown","Chest-Supported Machine Pulldown","Single-Arm Lat Pulldown","Half-Kneeling Cable Pulldown","Kneeling Cable Pulldown","Neutral-Grip Pulldown","Wide-Grip Pulldown","Rope Lat Pulldown","Assisted Pull-up","Straight-Arm Pulldown","Single-Arm Straight-Arm Pulldown","Cable Pullover"],
    "Pull — back (horizontal)": ["Chest-Supported Row","Chest-Supported DB Row","Barbell Row","Pendlay Row","Seal Row","Helms Row","Seated Cable Row","Single-Arm Cable Row","Single-Arm Low Cable Row","Wide Cable Row","Cable Face-Away Row","T-Bar Row","Single-Arm DB Row","Machine Row","Machine High Row","Inverted Row","Meadows Row","Kroc Row"],
    "Biceps": ["DB Curl","Barbell Curl","Hammer Curl","Cable Curl","Single-Arm Cable Curl","Bayesian Cable Curl","Cable Rope Hammer Curl","High Cable Curl","Preacher Curl","Machine Preacher Curl","Incline DB Curl","Concentration Curl","EZ-Bar Curl","Cable EZ-Bar Curl","Reverse Curl","Drag Curl","Zottman Curl","Spider Curl"],
    "Triceps": ["Cable Triceps Pushdown","Rope Pushdown","Single-Arm Cable Pushdown","Cable Overhead Triceps Extension","Single-Arm Cable Triceps Extension","Overhead Triceps Extension","Close-Grip Bench Press","Weighted Dip","Machine Dip","Bench Dip","Skull Crusher","JM Press","Tate Press","DB Kickback","Cable Kickback","Diamond Push-up"],
    "Calves": ["Standing Calf Raise","Standing Machine Calf Raise","Seated Calf Raise","Leg-Press Calf Raise","Hack-Squat Calf Raise","Single-Leg Calf Raise","Smith Calf Raise","Tibialis Raise","Donkey Calf Raise"],
    "Core / anti-rotation": ["Pallof Press","Single-Arm Pallof Press","Cable Pallof Iso Hold","Cable Wood-chop","High-to-Low Cable Chop","Low-to-High Cable Chop","Cable Rotation","Half-Kneeling Cable Rotation","Landmine Rotation","Hanging Leg Raise","Hanging Knee Raise","Cable Crunch","Single-Arm Cable Crunch","Weighted Decline Sit-up","Ab Wheel Rollout","Plank","Weighted Plank","Side Plank","Russian Twist","Dead Bug","Bird Dog","Hollow Hold","Copenhagen Plank"],
    "Grip / carries": ["Farmer Carry","Fat-Grip Farmer Carry","Suitcase Carry","Trap-Bar Carry","Wrist Curl + Reverse","Reverse Wrist Curl","Plate Pinch","Dead Hang","Wrist Roller","Plate Wrist Roller","Towel Pull-up"],
    "Power / speed (golf)": ["Box Jump","Broad Jump","Lateral Bound","Vertical Jump","Depth Jump","Overhead Med-Ball Slam","Rotational Med-Ball Throw","Split-Stance Rotational Throw","Step-Behind Rotational Throw","Med-Ball Shotput Throw","Med-Ball Chest Pass","Med-Ball Scoop Toss","Kettlebell Swing","Kettlebell Clean","Hang Power Clean","Jump Squat","Trap-Bar Jump","Banded Rotational Pull","Overspeed Swings","Ground-Force Footwork"]
  };
  var EX_GROUP_ORDER = Object.keys(EXERCISE_DB);
  // Classify an exercise name → its group (specific patterns first, so e.g. "Leg Curl"
  // lands in Hinge not Biceps, and "Close-Grip Bench" in Triceps not Chest).
  function exGroupFor(n){
    n=n||"";
    if(/Jump|Bound|Slam|Throw|Chest Pass|Scoop|Overspeed|Footwork|Clean|Snatch(?!-?Grip)|Plyo|Pogo|Banded Rotation/i.test(n)) return "Power / speed (golf)";
    if(/Calf|Tibialis/i.test(n)) return "Calves";
    if(/Carry|Farmer|Suitcase|Wrist|Forearm|Plate Pinch|Dead Hang|Wrist Roller|Towel Pull/i.test(n)) return "Grip / carries";
    if(/Triceps|Pushdown|Skull|Close.?Grip|Kickback|Diamond Push|JM Press|Tate Press/i.test(n)) return "Triceps";
    if(/Pallof|Wood.?chop|\bChop\b|Landmine Rotation|Rotation|Russian Twist|\bPlank\b|Dead ?Bug|Bird ?Dog|Hollow|Ab Wheel|Crunch|Leg Raise|Knee Raise|Sit.?up|Copenhagen|Anti.?Rotation/i.test(n)) return "Core / anti-rotation";
    if(/Curl/i.test(n) && !/Leg Curl|\bHam(string)?\b|Nordic|Wrist/i.test(n)) return "Biceps";   // \bHam\b: "Hammer Curl" IS biceps
    if(/Lunge|Split Squat|Step.?up|Bulgarian|Pistol|Skater|Cossack/i.test(n)) return "Single-leg / lunge";
    if(/Deadlift|Romanian|\bRDL\b|Trap.?Bar|Sumo|Rack Pull|Good ?Morning|Hip Thrust|Glute|Leg Curl|Nordic|Back Extension|Hyperext|Reverse Hyper|Kettlebell Swing|\bSwing\b|Pull.?Through|Hinge/i.test(n)) return "Hinge / posterior chain";
    if(/Squat|Leg Press|Hack|Leg Extension|Sissy|Belt Squat|Pendulum/i.test(n)) return "Quads — squat pattern";
    if(/Overhead Press|Shoulder Press|Military|OHP|Arnold|Push Press|Z.?Press|Lateral Raise|Rear.?Delt|Reverse Pec Deck|Face Pull|Front Raise|Y.?Raise|Upright Row|Standing .*Press/i.test(n)) return "Push — shoulders (vertical)";
    if(/Bench|Incline.*Press|Decline|Chest Press|\bDip\b|Push.?up|\bFly\b|Crossover|Pec Deck|Svend|Floor Press|Landmine Press|Flat .*Press|Floor .*Press/i.test(n)) return "Push — chest (horizontal)";
    if(/Pull.?up|Chin.?up|Pulldown|Pullover|\bLat\b/i.test(n)) return "Pull — lats (vertical)";
    if(/Row|Meadows|Kroc|Pendlay/i.test(n)) return "Pull — back (horizontal)";
    return null;
  }
  function swapOptionsFor(n){
    var g=exGroupFor(n);
    if(g && EXERCISE_DB[g]){
      var opts=EXERCISE_DB[g].slice();
      // The plan's heavy "Deadlift" takes either bar; the trap bar (less load on
      // the low back at the same weight) is the first one-tap swap.
      if(/^(Conventional )?Deadlift$/i.test(normName(String(n||"")))){
        var ti=opts.indexOf("Trap-Bar Deadlift"); if(ti>0){ opts.splice(ti,1); opts.unshift("Trap-Bar Deadlift"); }
      }
      return opts;
    }
    return ["Back Squat","Romanian Deadlift","Weighted Pull-up","Barbell Bench Press"];
  }

  var logState=null;
  function buildSession(day, week){
    var existing=getSession(week, day.name);
    if(existing){
      // A hold saved under its slot's rep/yard target (before holds logged seconds)
      // reads in seconds too — the same holdTarget a fresh session gets.
      var c=JSON.parse(JSON.stringify(existing));
      (c.ex||[]).forEach(function(x){ if(x && isHoldEx(x.name) && !isTimeEx(x.target)) x.target=holdTarget(x.target, x.name); });
      return c;
    }
    return freshSession(day, week);
  }
  function freshSession(day, week){
    // dayTargets (035): user swaps + gear subs (deduped like the card), retain
    // trim + wave shift — the same list the "About N min" estimate counts.
    var ex = dayTargets(day, week, true).map(function(t){   // plan order: subs + readiness as always
      var n=parseSets(t.target), sets=[]; for(var i=0;i<n;i++) sets.push({w:"",r:"",done:false});
      return { name:t.name, orig:t.orig, target:t.target, sets:sets }; });
    // wave = the wave this session was RUN at. An event taper re-anchors waves only
    // until the recovery week ends, so waveFor(week) later forgets that week was a
    // deload — lastSessionFor reads this stamp first so it still skips those loads.
    var built={ date:"", wave:waveFor(week), ex:ex };
    if(typeof ffApplyReadiness==="function") built=ffApplyReadiness(built,day,week);
    var p=(day && day.ex) ? ffDayPerm(day, week) : null;   // then your order (ffDayPerm)
    if(p && built && built.ex && built.ex.length===p.length) built.ex=p.map(function(i){ return built.ex[i]; });
    return built;
  }
  // What the plan gives each slot this week: day name → orig → { name, target }.
  function ffPlanNames(wk){
    var out={};
    activeDays().forEach(function(d){
      if(!d.ex) return; var m=out[d.name]={};
      dayTargets(d, wk).forEach(function(t){ m[t.orig]={ name:t.name, target:t.target }; });
    });
    return out;
  }
  // A plan-level change (Extra care in You or setup) also reaches this week's
  // sessions that hold no work yet: opening today's workout saves it, so without
  // this the old lifts would stay until next week. `before` is ffPlanNames from
  // just before the change. Only rows still showing what the plan gave them and
  // whose slot now resolves to another lift change (name, and "/ leg" in the
  // target); readiness trims, added or removed lifts, your order and one-off swaps
  // stay. Stamped old _ts + 1, not now: it beats this session's own stale copy in
  // the sync merge, but never a session logged (or cleared) on another device.
  // A session with any set entered or ticked, or a finished one, is never touched.
  // The new lift's target. A readiness trim (077) only cut the set count, so that
  // count stays and the reps, units and "/ leg" come from the new lift (Codex #144).
  function ffRetarget(x, was, now){
    var t=String(x.target||""), n=t.match(/^\s*(\d+)/);
    if(x.baseTarget) x.baseTarget=now.target;
    if(t===was.target || !n) return now.target;
    return String(now.target).replace(/^(\s*)\d+/, function(_, sp){ return sp+n[1]; });
  }
  function ffRefreshUntouched(before){
    if(!before) return;
    var wk=curWeek(), after=ffPlanNames(wk), L=getLog(), changed=false;
    Object.keys(after).forEach(function(dn){
      var k=wk+"|"+dn, s=L[k], b=before[dn]||{}, a=after[dn];
      if(!s || sessionFinished(s) || !Array.isArray(s.ex) || s.ex.some(function(x){
        return x && (x.sets||[]).some(function(st){ return st && (st.w||st.r||st.done); }); })) return;
      var hit=false;
      s.ex.forEach(function(x){
        var o=x && x.orig, was=o && b[o], now=o && a[o];
        if(!was || !now || x.name!==was.name || now.name===was.name) return;
        x.target=ffRetarget(x, was, now); x.name=now.name; hit=true;
      });
      if(hit){ s._ts=(typeof s._ts==="number" ? s._ts : 0)+1; L[k]=s; changed=true; }
    });
    if(changed) lsSet("ff_log", L);
  }
  function openLogger(dayName,readinessChecked){
    var day=findDay(dayName); if(!day) return;
    // Past day 140 the season is over — never hand out a week-20 key for new work.
    if(seasonComplete()){ ffSeasonOverNudge(); return; }
    if(!readinessChecked && typeof ffReadinessNeedsCheck==="function" && ffReadinessNeedsCheck(day)){
      ffReadinessOpen(dayName,"manual"); return;
    }
    var week=curWeek();
    logState={ week:week, day:dayName, sess:buildSession(day, week) };
    $("logTitle").textContent=dayName;
    var rr=logState.sess.readiness, rm=rr&&typeof ffReadinessMeta==="function"
      ?ffReadinessMeta(rr.original?"ready":rr.band):null;
    $("logSub").textContent="Week "+week+" of 20"+(rm?" · "+rm.label:"");
    renderLogBody();
    $("logModal").hidden=false;
    $("logModal").classList.add("open");
    $("logModal").setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
  }
  function closeLogger(){ $("logModal").classList.remove("open"); $("logModal").setAttribute("aria-hidden","true"); $("logModal").hidden=true; document.body.style.overflow=""; logState=null; renderPhase(); }
  // The logger window's dim numbers for an empty set — and what ✓ saves if it's left
  // untouched (Nov 2026): today's dosed load from last time's set, last reps (today's
  // when the rep target changed). Never invents a number; bodyweight has no weight.
  function logGhost(x, lx, si, week, s){
    var ls=lx && lx.sets && lx.sets[si], sh=repsShifted(lx, x), w="";
    if(ls && ls.w){ var d=ffDose(ls.w, x, lx, week, s).w; w=String(d!=null ? d : ls.w); }
    var r=(ls && ls.r && !sh) ? String(ls.r) : ((isDistEx(x.target) || isTimeEx(x.target) || sh) ? repSeed(x.target) : "");
    return { w:isBodyweightEx(x.name) ? "" : w, r:r };
  }
  function renderLogBody(){
    var s=logState.sess, week=logState.week, day=logState.day;
    var last=lastSessionFor(day, week), html="", wv=waveFor(week);
    if(s.readiness&&typeof ffReadinessMeta==="function"){
      var rm=ffReadinessMeta(s.readiness.original?"ready":s.readiness.band);
      html+='<div class="logx-nudge ready-log"><b>'+rm.label+':</b> '+rm.copy+'</div>';
    }
    s.ex.forEach(function(x, xi){
      var lx=null;
      if(last){ last.ex.forEach(function(e){ if(e.name===x.name) lx=e; }); }
      // Same load read as the player + inline logger (077 ffDose): deload ~60%,
      // recovery dose ~75% with no add-weight nudge, progression-ready +1 jump.
      var topLast=0; if(lx) lx.sets.forEach(function(st){ var w=parseFloat(st.w); if(w>topLast) topLast=w; });
      var dose=ffDose(topLast||null, x, lx, week, s);
      var ref="";
      if(dose.band==="recharge" && lx){
        ref='<div class="logx-nudge">🌱 Recovery dose — '+(dose.w!=null?'about <b>'+dose.w+' lb</b>':'70–80% of normal')+', no PR chasing.</div>';
      } else if(wv==="deload" && lx){
        ref='<div class="logx-nudge">🪫 Easy week — run ~60% of last week’s loads, a set less on most lifts. Recovery is the workout.</div>';
      } else if(dose.back){
        ref='<div class="logx-nudge">👋 Welcome back — ease in at about <b>'+dose.w+' lb</b> (~90% of last time). Leave 2 reps in the tank.</div>';
      } else if(dose.shift==="up"){
        ref='<div class="logx-nudge">🔥 Fewer reps today, so more weight — about <b>'+dose.w+' lb</b>.</div>';
      } else if(dose.shift==="down"){
        ref='<div class="logx-nudge">🏗️ More reps today, so a little lighter — about <b>'+dose.w+' lb</b>.</div>';
      } else if(dose.shift==="match"){
        ref='<div class="logx-nudge">🎯 Today: about <b>'+dose.w+' lb</b> — matched to the reps you got last time.</div>';
      } else if(dose.bump && dose.w!=null){
        ref='<div class="logx-nudge">✅ Hit all reps last time — go up to <b>'+dose.w+' lb</b> this session</div>';
      } else if(lx){
        var lbw=isBodyweightEx(x.name);
        var d=lx.sets.filter(function(st){return st.w||st.r;}).map(function(st){
          return (lbw && st.r) ? repsText(st.r, x) : (st.w||"–")+"×"+(st.r ? st.r+(isTimedEx(x)?" s":"") : "–"); }).join(", ");
        if(d) ref='<div class="logx-last">Last time: '+ffEsc(d)+'</div>';
      }
      var hasLastW = !!(lx && lx.sets.some(function(st){return st.w;}));
      var bw=isBodyweightEx(x.name);
      html+='<div class="logx"><div class="logx-name">'+ffEsc(x.name)+'</div><div class="logx-target">Target: '+ffEsc(x.target)+'</div>'+ref+
        '<div class="setlabels"><div>Set</div><div>'+(bw?"Load":"Weight")+'</div><div>'+({sec:"Sec",yards:"Yards"}[repWord(x.target, x.name)]||"Reps")+'</div><div></div></div>';
      x.sets.forEach(function(st, si){
        var g=logGhost(x, lx, si, week, s);   // the dim numbers — and what ✓ saves if untouched
        var lsW=g.w||"–", lsR=g.r||"–";
        html+='<div class="setrow'+(st.done?" is-done":"")+'">'+
          '<div class="snum">'+(si+1)+'</div>'+
          (bw ? '<div class="setbw" aria-label="bodyweight">BW</div>'
              : '<input type="number" inputmode="decimal" placeholder="'+escAttr(lsW)+'" value="'+escAttr(st.w||"")+'" data-x="'+xi+'" data-s="'+si+'" data-f="w" />')+
          '<input type="number" inputmode="numeric" placeholder="'+escAttr(lsR)+'" value="'+escAttr(st.r||"")+'" data-x="'+xi+'" data-s="'+si+'" data-f="r" />'+
          '<button class="donebtn'+(st.done?" on":"")+'" data-x="'+xi+'" data-s="'+si+'" data-done="1" aria-label="set done">✓</button></div>';
      });
      // Fill = last session's weights, or the dosed load on a lighter day (easy
      // week ~60%, recovery dose ~75%, first session back ~90%) — never 100%
      // into a session whose banner says lighter.
      var fillLbl = wv==="deload" ? "↻ Fill easy-week loads (~60%)"
        : (dose.band==="recharge" ? "↻ Fill recovery loads (~75%)"
        : (dose.back ? "↻ Fill ease-in loads (~90%)" : "↻ Fill last session’s weights"));
      html+='<div class="logx-foot"><button class="addset" data-x="'+xi+'" data-add="1">+ Add set</button>'+
        (hasLastW?'<button class="filllast" data-fill="'+xi+'">'+fillLbl+'</button>':'')+'</div></div>';
    });
    $("logBody").innerHTML=html;
  }
  function saveLog(){ if(!logState) return; if(!logState.sess.date) logState.sess.date=todayStr(); saveSession(logState.week, logState.day, logState.sess); }

  $("logBody").addEventListener("input", function(e){
    var t=e.target; if(t.tagName!=="INPUT") return;
    logState.sess.ex[+t.getAttribute("data-x")].sets[+t.getAttribute("data-s")][t.getAttribute("data-f")]=t.value;
    saveLog();
  });
  $("logBody").addEventListener("click", function(e){
    var dn=e.target.closest("[data-done]");
    if(dn){
      var dxi=+dn.getAttribute("data-x"), dsi=+dn.getAttribute("data-s"), dx=logState.sess.ex[dxi], st=dx.sets[dsi];
      st.done=!st.done;
      if(st.done){   // ticked untouched → save the numbers it was showing, so it logs
        var dls=lastSessionFor(logState.day, logState.week), dlx=null;
        if(dls) dls.ex.forEach(function(e2){ if(e2.name===dx.name) dlx=e2; });
        var g=logGhost(dx, dlx, dsi, logState.week, logState.sess);
        if(!st.w && g.w) st.w=g.w;
        if(!st.r && g.r) st.r=g.r;
      }
      saveLog(); renderLogBody(); return; }
    var ad=e.target.closest("[data-add]");
    if(ad){ logState.sess.ex[+ad.getAttribute("data-x")].sets.push({w:"",r:"",done:false}); saveLog(); renderLogBody(); return; }
    var fl=e.target.closest("[data-fill]");
    if(fl){
      var xi=+fl.getAttribute("data-fill"), x=logState.sess.ex[xi];
      var lastS=lastSessionFor(logState.day, logState.week), lx=null;
      if(lastS) lastS.ex.forEach(function(e2){ if(e2.name===x.name) lx=e2; });
      if(lx){
        var wk=logState.week, ss=logState.sess, red=waveFor(wk)==="deload" || ffSessBand(ss)==="recharge" || ffBackFor(lx);
        x.sets.forEach(function(st, si){
          var lw=lx.sets[si] && lx.sets[si].w; if(!lw) return;
          var d=red ? ffDose(lw, x, lx, wk, ss).w : null;   // the same reduced load the placeholder shows
          st.w=(d!=null) ? String(d) : lw;
        });
        saveLog(); renderLogBody(); }
    }
  });
  $("logClose").addEventListener("click", closeLogger);
  $("logDone").addEventListener("click", closeLogger);
  $("logModal").addEventListener("click", function(e){ if(e.target===$("logModal")) closeLogger(); });
