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
    // The day arrays are authored as a full 7-slot week with rest days already in position
    // (distributed, never two in a row) — keep that order; pad with a rest if a week is short.
    var ds = activeDays().slice(0,7);
    if(ds.length < 7){
      var restDay=null; activeDays().forEach(function(d){ if(d.type==="rest" && !restDay) restDay=d; });
      while(ds.length < 7 && restDay) ds.push(restDay);
    }
    return ds;
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
  // Every rest day shares the display name "Rest / Play 18", so key its check-off
  // by the day's slot position in the week — otherwise both rest days would toggle
  // as one. Training days have unique names, so they key by name as before.
  function dayKey(d){ if(!d) return ""; if(d.type!=="rest") return d.name; var i=activeDays().indexOf(d); return i>=0?("rest@"+i):d.name; }
  function parseSets(t){ var m=String(t).match(/(\d+)\s*[×x]/); return m?Math.min(8,Math.max(1,parseInt(m[1],10))):3; }
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
      var full=sessFullDose(s, w), ts=done[w+"|"+dn]||(typeof s._ts==="number"?s._ts:0);
      s.ex.forEach(function(x){
        if(!x || !x.name || !(x.sets||[]).some(function(st2){ return st2 && (st2.w||st2.r); })) return;
        var bucket=!full ? low : (dn===day ? same : any), cur=bucket[x.name];
        if(names.indexOf(x.name)<0) names.push(x.name);
        saw(x.name, ts);
        if(!cur || w>cur.w || (w===cur.w && dn===day)) bucket[x.name]={ w:w, x:x, ts:ts };
      });
    });
    Object.keys(prior).concat(Object.keys(priorLow)).forEach(function(n){ if(names.indexOf(n)<0) names.push(n); });
    if(!names.length) return null;
    // _ts: when the reference session was done. _seen: when the lift was last done
    // at ANY dose — a deload or recovery day is training, not time off, so the
    // "how long since" rules (no bump at 14+ days, ease back in at 28+) read it.
    function lxOf(x, ts, extra){ var o={ name:x.name, orig:x.orig, target:x.target, sets:x.sets||[], _ts:ts, _seen:Math.max(ts||0, seen[x.name]||0) }; if(extra) o[extra]=true; return o; }
    return { ex: names.map(function(n){
      var hit=same[n]||any[n];
      if(hit) return lxOf(hit.x, hit.ts);
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
  function repWord(t){ return isDistEx(t) ? "yards" : "reps"; }   // lower-case unit
  function repSeed(t){ var n=topReps(t); return n!=null ? String(n) : ""; }
  // Single smallest sensible jump for the one-tap "add weight" nudge (progress by LOAD,
  // holding reps/sets), by equipment — a step the gym actually stocks:
  //   med ball → 0 (no load bump: a heavier ball slows the throw)
  //   lower-body compounds → 5 · barbell upper body → 2.5 (1.25 lb plates a side)
  //   dumbbells, kettlebells, cables and machine stacks → 5 · anything else → 2.5
  function incNum(name){
    var n=String(name||""), needs=" "+(equipNeedsFor(n)||[]).join(" ")+" ";
    if(/ medball /.test(needs) || (/Med-?Ball|Medicine Ball|Chest Throw|Chest Pass|Slam|Scoop|Shotput/i.test(n) && !/Landmine|Cable|Band|Barbell/i.test(n))) return 0;
    if(/Squat|Deadlift|Hinge|Lunge|Hip Thrust|Leg Press|Romanian|Swing|Carry/i.test(n)) return 5;
    if(isBarbell(n)) return 2.5;
    if(/ (dumbbells|kettlebell|cable|latpulldown|seatedrow|pecdeck|legext|legcurl|chestpress|shoulderpress|preacher|calfmachine|abductor|hipthrustm|assisted|machine-any) /.test(needs) || /\bDB\b|Dumbbell/i.test(n)) return 5;
    return 2.5;
  }
  function incFor(name){ var i=incNum(name); return i ? i+" lb" : "a little"; }
  // Ready to add weight = last session hit the top of the rep range on every working set.
  function progressReady(lx, target){
    var top=topReps(target); if(!top||!lx||lx._reduced) return false;   // never progress off a deload/recovery load
    var working=lx.sets.filter(function(st){ return st.r!==""&&st.r!=null&&!isNaN(parseInt(st.r,10)); });
    if(working.length<2) return false;
    return working.every(function(st){ return parseInt(st.r,10)>=top; });
  }
  function logFoot(name){
    var sess=getSession(curWeek(), name), done=sessionFinished(sess);
    if(!sess) return '<div class="day-foot"><button class="logbtn" data-logday="'+escAttr(name)+'">'+ffIcon("play",13)+' Log workout</button></div>';
    if(!done) return '<div class="day-foot"><button class="logbtn" data-logday="'+escAttr(name)+'">'+ffIcon("play",13)+' Resume workout</button>'+
      '<button class="logbtn reset" data-clearday="'+escAttr(name)+'">↺ Clear / reset this workout</button></div>';
    // Logged: full-width edit button + a reset, so any logged day (Full-week or a
    // non-featured day) can be cleared without hunting for the Today finish bar.
    return '<div class="day-foot"><button class="logbtn logged" data-logday="'+escAttr(name)+'">✓ Logged — tap to edit</button>'+
      '<button class="logbtn reset" data-clearday="'+escAttr(name)+'">↺ Clear / reset this workout</button></div>';
  }

  // ---- User lift swaps: pick a valid same-muscle replacement; it sticks in the plan ----
  function getSwaps(){ return lsGet("ff_swaps", {}); }
  // Plan lifts renamed by an evidence update keep the swap a user chose for the
  // old name (swaps are keyed by the ORIGINAL plan name); setting or resetting
  // the new one clears the old key so a reset really returns to the default.
  var FF_PLAN_RENAMED={ "Cable Overhead Triceps Extension":"Cable Triceps Pushdown" };
  function applySwapName(name){ var s=getSwaps(), old=FF_PLAN_RENAMED[name]; return s[name] || (old && s[old]) || name; }
  function setSwap(orig, neu){ var s=getSwaps(); if(FF_PLAN_RENAMED[orig]) delete s[FF_PLAN_RENAMED[orig]];
    if(!neu || neu===orig) delete s[orig]; else s[orig]=neu; lsSet("ff_swaps", s); }
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
    "Core / anti-rotation": ["Pallof Press","Single-Arm Pallof Press","Cable Pallof Iso Hold","Cable Wood-chop","High-to-Low Cable Chop","Low-to-High Cable Chop","Cable Rotation","Landmine Rotation","Hanging Leg Raise","Hanging Knee Raise","Cable Crunch","Single-Arm Cable Crunch","Weighted Decline Sit-up","Ab Wheel Rollout","Plank","Weighted Plank","Side Plank","Russian Twist","Dead Bug","Bird Dog","Hollow Hold","Copenhagen Plank"],
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
    if(existing) return JSON.parse(JSON.stringify(existing));
    // dayTargets (035): user swaps + gear subs (deduped like the card), retain
    // trim + wave shift — the same list the "About N min" estimate counts.
    var ex = dayTargets(day, week).map(function(t){
      var n=parseSets(t.target), sets=[]; for(var i=0;i<n;i++) sets.push({w:"",r:"",done:false});
      return { name:t.name, orig:t.orig, target:t.target, sets:sets }; });
    // wave = the wave this session was RUN at. An event taper re-anchors waves only
    // until the recovery week ends, so waveFor(week) later forgets that week was a
    // deload — lastSessionFor reads this stamp first so it still skips those loads.
    var built={ date:"", wave:waveFor(week), ex:ex };
    return (typeof ffApplyReadiness==="function")?ffApplyReadiness(built,day,week):built;
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
        var d=lx.sets.filter(function(st){return st.w||st.r;}).map(function(st){return (st.w||"–")+"×"+(st.r||"–");}).join(", ");
        if(d) ref='<div class="logx-last">Last time: '+ffEsc(d)+'</div>';
      }
      var hasLastW = !!(lx && lx.sets.some(function(st){return st.w;}));
      var dist=isDistEx(x.target), bw=isBodyweightEx(x.name);
      html+='<div class="logx"><div class="logx-name">'+ffEsc(x.name)+'</div><div class="logx-target">Target: '+ffEsc(x.target)+'</div>'+ref+
        '<div class="setlabels"><div>Set</div><div>'+(bw?"Load":"Weight")+'</div><div>'+(dist?"Yards":"Reps")+'</div><div></div></div>';
      x.sets.forEach(function(st, si){
        var lsW = (lx && lx.sets[si] && lx.sets[si].w) ? lx.sets[si].w : "–";
        var sw = (lsW!=="–") ? ffDose(lsW, x, lx, week, s).w : null;   // prescribed load leads the placeholder
        if(sw!=null) lsW=String(sw);
        var lsR = (lx && lx.sets[si] && lx.sets[si].r && !repsShifted(lx, x)) ? lx.sets[si].r : ((dist || repsShifted(lx, x)) ? repSeed(x.target) : "–");
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
    if(dn){ var st=logState.sess.ex[+dn.getAttribute("data-x")].sets[+dn.getAttribute("data-s")]; st.done=!st.done; saveLog(); renderLogBody(); return; }
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
