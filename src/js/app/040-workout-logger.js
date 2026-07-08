  /* ===================== WORKOUT LOGGER ===================== */
  function lsGet(k,def){ try{ var v=JSON.parse(localStorage.getItem(k)); return v==null?def:v; }catch(e){ return def; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){}
    try{ window.dispatchEvent(new Event("ff-data-changed")); }catch(e){} }   // nudge cloud-sync to push promptly

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
  function escAttr(s){ return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;"); }
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
  function startPlanAtWeek(n){
    var back = (Math.max(1, n) - 1) * 7;
    var d = new Date(Date.now() - back * 864e5);
    lsSet("ff_start", d.toISOString());
    renderPhase(); if(typeof renderDash==="function") renderDash();
  }
  // Full plan reset: start date + logged workouts (keeps body/speed history +
  // calculator). Tombstone every wiped session FIRST — without them the next
  // cloud-sync merge would resurrect the old season's log from the server.
  function resetPlanFull(){
    try{ Object.keys(getLog()).forEach(function(k){ ffTomb("L:"+k); }); }catch(e){}
    ["ff_start","ff_log","ff_week","ff_planview"].forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
    try{ window.dispatchEvent(new Event("ff-data-changed")); }catch(e){}
    focusDay=null;
    renderPhase();
    if(typeof renderDash==="function") renderDash();
    if(typeof renderAccount==="function") renderAccount();
  }
  function getLog(){ return lsGet("ff_log",{}); }
  function getSession(w,d){ return getLog()[w+"|"+d]||null; }
  function saveSession(w,d,s){ if(s) s._ts=Date.now(); var L=getLog(); L[w+"|"+d]=s; lsSet("ff_log",L); }
  // Rest-day check-off — kept in its OWN key so it never counts as a training
  // session (Octane, streaks, leaderboard all read ff_log, not this).
  function getRest(){ var r=lsGet("ff_rest",{}); return (r&&typeof r==="object")?r:{}; }
  function restDone(w,d){ return !!getRest()[w+"|"+d]; }
  function toggleRestDone(w,d){ var r=getRest(), k=w+"|"+d; if(r[k]) delete r[k]; else r[k]=Date.now(); lsSet("ff_rest",r); }
  // Every rest day shares the display name "Rest / Play 18", so key its check-off
  // by the day's slot position in the week — otherwise both rest days would toggle
  // as one. Training days have unique names, so they key by name as before.
  function dayKey(d){ if(!d) return ""; if(d.type!=="rest") return d.name; var i=activeDays().indexOf(d); return i>=0?("rest@"+i):d.name; }
  function parseSets(t){ var m=String(t).match(/(\d+)\s*[×x]/); return m?Math.min(8,Math.max(1,parseInt(m[1],10))):3; }
  function findDay(name){ var f=null; activeDays().forEach(function(d){ if(d.name===name) f=d; }); return f; }
  function todayStr(){ try{ return new Date().toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}); }catch(e){ return ""; } }
  function lastSessionFor(day, beforeW){
    var L=getLog(), best=null, bw=-1;
    Object.keys(L).forEach(function(k){ var i=k.indexOf("|"); var w=parseInt(k.slice(0,i),10), dn=k.slice(i+1);
      if(dn===day && w<beforeW && w>bw){ bw=w; best=L[k]; } });
    return best;
  }
  function topReps(t){ var m=String(t).match(/[×x]\s*(\d+)/); return m?parseInt(m[1],10):null; }
  function incFor(name){ return /Squat|Deadlift|Hinge|Lunge|Hip Thrust|Leg Press|Romanian|Swing|Carry/i.test(name) ? "5–10 lb" : "2.5–5 lb"; }
  // Single smallest sensible jump for the one-tap "add weight" nudge (progress by LOAD,
  // holding reps/sets) — big lower-body compounds jump 5 lb, everything else 2.5 lb.
  function incNum(name){ return /Squat|Deadlift|Hinge|Lunge|Hip Thrust|Leg Press|Romanian|Swing|Carry/i.test(name) ? 5 : 2.5; }
  // Ready to add weight = last session hit the top of the rep range on every working set.
  function progressReady(lx, target){
    var top=topReps(target); if(!top||!lx) return false;
    var working=lx.sets.filter(function(st){ return st.r!==""&&st.r!=null&&!isNaN(parseInt(st.r,10)); });
    if(working.length<2) return false;
    return working.every(function(st){ return parseInt(st.r,10)>=top; });
  }
  function logFoot(name){
    var done=!!getSession(curWeek(), name);
    if(!done) return '<div class="day-foot"><button class="logbtn" data-logday="'+escAttr(name)+'">'+ffIcon("play",13)+' Log workout</button></div>';
    // Logged: full-width edit button + a reset, so any logged day (Full-week or a
    // non-featured day) can be cleared without hunting for the Today finish bar.
    return '<div class="day-foot"><button class="logbtn logged" data-logday="'+escAttr(name)+'">✓ Logged — tap to edit</button>'+
      '<button class="logbtn reset" data-clearday="'+escAttr(name)+'">↺ Clear / reset this workout</button></div>';
  }

  // ---- User lift swaps: pick a valid same-muscle replacement; it sticks in the plan ----
  function getSwaps(){ return lsGet("ff_swaps", {}); }
  function applySwapName(name){ var s=getSwaps(); return s[name] || name; }
  function setSwap(orig, neu){ var s=getSwaps(); if(!neu || neu===orig) delete s[orig]; else s[orig]=neu; lsSet("ff_swaps", s); }
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
    if(/Curl/i.test(n) && !/Leg Curl|Ham|Nordic|Wrist/i.test(n)) return "Biceps";
    if(/Lunge|Split Squat|Step.?up|Bulgarian|Pistol|Skater|Cossack/i.test(n)) return "Single-leg / lunge";
    if(/Deadlift|Romanian|\bRDL\b|Trap.?Bar|Sumo|Rack Pull|Good ?Morning|Hip Thrust|Glute|Leg Curl|Nordic|Back Extension|Hyperext|Reverse Hyper|Kettlebell Swing|\bSwing\b|Pull.?Through|Hinge/i.test(n)) return "Hinge / posterior chain";
    if(/Squat|Leg Press|Hack|Leg Extension|Sissy|Belt Squat|Pendulum/i.test(n)) return "Quads — squat pattern";
    if(/Overhead Press|Shoulder Press|Military|OHP|Arnold|Push Press|Z.?Press|Lateral Raise|Rear.?Delt|Reverse Pec Deck|Face Pull|Front Raise|Y.?Raise|Upright Row/i.test(n)) return "Push — shoulders (vertical)";
    if(/Bench|Incline.*Press|Decline|Chest Press|\bDip\b|Push.?up|\bFly\b|Crossover|Pec Deck|Svend|Floor Press|Landmine Press/i.test(n)) return "Push — chest (horizontal)";
    if(/Pull.?up|Chin.?up|Pulldown|Pullover|\bLat\b/i.test(n)) return "Pull — lats (vertical)";
    if(/Row|Meadows|Kroc|Pendlay/i.test(n)) return "Pull — back (horizontal)";
    return null;
  }
  function swapOptionsFor(n){
    var g=exGroupFor(n);
    if(g && EXERCISE_DB[g]) return EXERCISE_DB[g].slice();
    return ["Back Squat","Romanian Deadlift","Weighted Pull-up","Barbell Bench Press"];
  }

  var logState=null;
  function buildSession(day, week){
    var existing=getSession(week, day.name);
    if(existing) return JSON.parse(JSON.stringify(existing));
    var ex;
    if(day.type==="speed"){
      ex = PHASES[0].speed[speedMode()].ex.map(function(e){ var base=applySwapName(e[0]);
        var tgt=speedDrillTarget(base, e[1], week);
        var n=parseSets(tgt), sets=[]; for(var i=0;i<n;i++) sets.push({w:"",r:"",done:false});
        return { name:base, orig:e[0], target:tgt, sets:sets }; });
    } else {
      ex = day.ex.map(function(row){ var base=applySwapName(row[0]);   // user swap first
        var r=resolveEx(base,row[1]); var nm=(r.status==="swap")?r.name:base;
        var tgt=effTarget(r.sr||row[1], nm, week);   // Retain trim + wave shift — log to match
        var n=parseSets(tgt), sets=[]; for(var i=0;i<n;i++) sets.push({w:"",r:"",done:false});
        return { name:nm, orig:row[0], target:tgt, sets:sets }; });
    }
    return { date:"", ex:ex };
  }
  function openLogger(dayName){
    var day=findDay(dayName); if(!day) return;
    var week=curWeek();
    logState={ week:week, day:dayName, sess:buildSession(day, week) };
    $("logTitle").textContent=dayName;
    $("logSub").textContent="Week "+week+" of 20";
    renderLogBody();
    $("logModal").classList.add("open");
    document.body.style.overflow="hidden";
  }
  function closeLogger(){ $("logModal").classList.remove("open"); document.body.style.overflow=""; logState=null; renderPhase(); }
  function renderLogBody(){
    var s=logState.sess, week=logState.week, day=logState.day;
    var last=lastSessionFor(day, week), html="", wv=waveFor(week);
    s.ex.forEach(function(x, xi){
      var lx=null;
      if(last){ last.ex.forEach(function(e){ if(e.name===x.name) lx=e; }); }
      var ref="";
      if(wv==="deload" && lx){
        ref='<div class="logx-nudge">🪫 Deload — run ~60% of last week’s loads, one set less. Recovery is the workout.</div>';
      } else if(progressReady(lx, x.target)){
        ref='<div class="logx-nudge">✅ Hit all reps last week — go up ~'+incFor(x.name)+' this session</div>';
      } else if(lx){
        var d=lx.sets.filter(function(st){return st.w||st.r;}).map(function(st){return (st.w||"–")+"×"+(st.r||"–");}).join(", ");
        if(d) ref='<div class="logx-last">Last week: '+d+'</div>';
      }
      var hasLastW = !!(lx && lx.sets.some(function(st){return st.w;}));
      html+='<div class="logx"><div class="logx-name">'+x.name+'</div><div class="logx-target">Target: '+x.target+'</div>'+ref+
        '<div class="setlabels"><div>Set</div><div>Weight</div><div>Reps</div><div></div></div>';
      x.sets.forEach(function(st, si){
        var lsW = (lx && lx.sets[si] && lx.sets[si].w) ? lx.sets[si].w : "–";
        var lsR = (lx && lx.sets[si] && lx.sets[si].r) ? lx.sets[si].r : "–";
        html+='<div class="setrow'+(st.done?" is-done":"")+'">'+
          '<div class="snum">'+(si+1)+'</div>'+
          '<input type="number" inputmode="decimal" placeholder="'+escAttr(lsW)+'" value="'+(st.w||"")+'" data-x="'+xi+'" data-s="'+si+'" data-f="w" />'+
          '<input type="number" inputmode="numeric" placeholder="'+escAttr(lsR)+'" value="'+(st.r||"")+'" data-x="'+xi+'" data-s="'+si+'" data-f="r" />'+
          '<button class="donebtn'+(st.done?" on":"")+'" data-x="'+xi+'" data-s="'+si+'" data-done="1" aria-label="set done">✓</button></div>';
      });
      html+='<div class="logx-foot"><button class="addset" data-x="'+xi+'" data-add="1">+ Add set</button>'+
        (hasLastW?'<button class="filllast" data-fill="'+xi+'">↻ Fill last week’s weights</button>':'')+'</div></div>';
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
      if(lx){ x.sets.forEach(function(st, si){ if(lx.sets[si] && lx.sets[si].w) st.w=lx.sets[si].w; }); saveLog(); renderLogBody(); }
    }
  });
  $("logClose").addEventListener("click", closeLogger);
  $("logDone").addEventListener("click", closeLogger);
  $("logModal").addEventListener("click", function(e){ if(e.target===$("logModal")) closeLogger(); });
