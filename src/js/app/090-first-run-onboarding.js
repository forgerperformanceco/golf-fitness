  /* ===================== FIRST-RUN ONBOARDING ===================== */
  // A guided wizard that writes into the SAME state/inputs the Calc tab uses
  // (single source of truth) then runs calc(), so the plan, macros and Score
  // are correct from the very first tap. The Calc tab stays the "edit" surface.
  function obSetSeg(id, attr, val){
    var seg=$(id); if(!seg) return;
    Array.prototype.forEach.call(seg.querySelectorAll("button"), function(b){
      b.classList.toggle("active", b.getAttribute(attr)===String(val)); });
  }
  function obSetGoal(val){
    var g=$("goals"); if(!g) return;
    Array.prototype.forEach.call(g.querySelectorAll(".goal"), function(b){
      b.classList.toggle("active", b.getAttribute("data-goal")===val); });
  }
  function maybeOnboard(shared){
    if(shared) return;                          // friend viewing a shared ?link= plan
    if(lsGet("ff_onboarded", false)) return;    // already onboarded
    if(!FF_FRESH){ lsSet("ff_onboarded", true); return; }   // returning user → grandfather, don't pop
    startOnboarding();
  }
  function startOnboarding(seed){
    var ob={ step:0, total:6, goal:"leanbulk", sex:"male", age:"", weight:"",
             hf:"5", hin:"10", activity:"1.55", workout:"morning", freq:4, equip:"full", speed:"", drive:"",
             prep:[], revisit:!!seed, hadPlan:!!planStart(), goalyds:(lsGet("ff_goalyds",null)||15) };
    function inferEquipPreset(){
      if(typeof planState==="undefined") return "full";
      var e=planState.equip||{};
      if(e.barbell || e.legpress || e.cable) return "full";
      if(e.dumbbells || e.bench || e.kettlebell || e.pullupbar) return "home";
      if(e.bands) return "minimal";
      return "bodyweight";
    }
    // On a re-run (from Account) seed every field from saved numbers. On a brand-new
    // first run, leave age & weight blank so the user gives real answers (biggest macro
    // drivers) — height/activity keep sensible soft defaults they can tweak.
    if(seed){
      if($("age")&&$("age").value) ob.age=$("age").value;
      if($("weight")&&$("weight").value) ob.weight=$("weight").value;
      if($("heightFt")&&$("heightFt").value) ob.hf=$("heightFt").value;
      if($("heightIn")&&$("heightIn").value) ob.hin=$("heightIn").value;
      if($("activity")&&$("activity").value) ob.activity=$("activity").value;
      ob.goal=state.goal||"leanbulk"; ob.sex=state.sex||"male"; ob.workout=state.workout||"morning";
      ob.prep=Array.isArray(state.prep)?state.prep.slice():[];
      ob.equip=state.equipPreset||inferEquipPreset();
      if(typeof planState!=="undefined" && planState.freq) ob.freq=planState.freq;
      var oldBody=lsGet("ff_body",[]);
      for(var obi=oldBody.length-1;obi>=0;obi--){
        if(!ob.speed && oldBody[obi]&&oldBody[obi].s!=="") ob.speed=String(oldBody[obi].s||"");
        if(!ob.drive && oldBody[obi]&&oldBody[obi].d!=="") ob.drive=String(oldBody[obi].d||"");
        if(ob.speed&&ob.drive) break;
      }
    }
    ob.original={ weight:ob.weight, speed:ob.speed, drive:ob.drive };

    var root=document.createElement("div");
    root.className="ob"; root.id="obRoot";
    document.body.appendChild(root);
    document.body.style.overflow="hidden";
    function close(){ document.body.style.overflow=""; root.remove(); }

    var GOAL_CARDS=[
      {v:"leanbulk", ic:"🏗️", t:"Lean Bulk", tag:"+10%", d:"Slow, quality mass — add power and keep your swing mobile. Best default."},
      {v:"bulk", ic:"💪", t:"Bulk", tag:"+20%", d:"Aggressive off-season size & strength to max out speed potential."},
      {v:"maintain", ic:"⛳", t:"In-Season", tag:"Maintain", d:"Hold your build & energy through a tournament stretch."},
      {v:"cut", ic:"🔥", t:"Lean Out", tag:"−20%", d:"Drop fat, protect muscle — better power-to-weight = more speed."}
    ];
    var EQ_CARDS=[
      {v:"full", ic:"🏟️", t:"Full gym", d:"Commercial gym — barbells, machines, cables, the works."},
      {v:"home", ic:"🏠", t:"Home gym", d:"Dumbbells, a bench, pull-up bar, bands, kettlebell."},
      {v:"minimal", ic:"🎒", t:"Minimal", d:"Bodyweight plus a resistance band or two."},
      {v:"bodyweight", ic:"🤸", t:"Bodyweight only", d:"Just you — the plan adapts every lift."}
    ];

    // Push profile into the real app state + recompute. Idempotent: safe to call repeatedly.
    function applyProfile(){
      state.sex=ob.sex; state.goal=ob.goal; state.workout=ob.workout;
      state.prep=ob.prep.slice(); state.equipPreset=ob.equip;
      if(ob.age) $("age").value=ob.age;
      if(ob.weight) $("weight").value=ob.weight;
      $("heightFt").value=ob.hf||5; $("heightIn").value=ob.hin||10;
      $("activity").value=ob.activity;
      if(typeof planState!=="undefined") planState.freq=ob.freq;
      obSetSeg("sexSeg","data-sex",ob.sex);
      obSetSeg("workoutSeg","data-workout",ob.workout);
      obSetGoal(ob.goal);
      if(ob.equip) applyEquipPreset(ob.equip);
      try{ calc(); }catch(e){}
      try{ persist(); }catch(e){}
    }
    // Seed or update today's baseline through the shared deduping writer.
    function pushBaseline(){
      var changed=!ob.revisit || ob.weight!==ob.original.weight || ob.speed!==ob.original.speed || ob.drive!==ob.original.drive;
      if(changed && (ob.weight || ob.speed || ob.drive)) logBodyEntry(ob.weight||"",ob.speed||"",ob.drive||"");
    }
    function finish(startNow){
      applyProfile(); pushBaseline(); lsSet("ff_onboarded", true);
      lsSet("ff_goalyds", parseInt(ob.goalyds,10)||15);
      close();
      if(startNow){
        // Re-personalizing must never reset an active season or erase its place.
        if(!ob.hadPlan){ try{ startPlanAtWeek(1); }catch(e){} }
        setView("plan"); try{ renderPhase(); }catch(e){}
      }
      else setView("dash");
      renderDash();
      try{ if(window.FFHealth) window.FFHealth.track("onboarding_completed",
        {started_plan:!!startNow,revisit:!!ob.revisit}); }catch(e){}
    }
    function prepToggleHtml(){
      var opts=[["back","Back","stack & brace"],["hips","Hips","turn freely"],["shoulders","Shoulders","swing volume"],["knees","Knees","lower days"]];
      return '<div class="ob-prep" id="obPrep">'+opts.map(function(o){
        return '<button type="button" data-prep="'+o[0]+'" class="'+(ob.prep.indexOf(o[0])!==-1?"sel":"")+'"><b>'+o[1]+'</b><small>'+o[2]+'</small></button>';
      }).join("")+'</div>';
    }
    function weekPreviewHtml(){
      var days=activeDays().filter(function(d){ return d.type!=="rest"; });
      var equipLabel=(EQ_CARDS.filter(function(x){ return x.v===ob.equip; })[0]||EQ_CARDS[0]).t;
      return '<div class="ob-week">'+
        '<div class="ob-weektop"><span>YOUR FIRST WEEK</span><b>'+ob.freq+' sessions · '+equipLabel+'</b></div>'+
        days.slice(0,ob.freq).map(function(d,i){
          var nm=(d.name.split("—")[1]||d.name).trim();
          return '<div class="ob-weekday"><span class="ow-n">'+(i+1)+'</span><span class="ow-t"><b>'+nm+'</b><small>'+sessionMinutes(d)+' min · '+(d.type==="speed"?"speed & power":"strength")+'</small></span><span class="ow-ok">✓</span></div>';
        }).join("")+'</div>';
    }

    function segPick(id, set){
      var seg=$(id); if(!seg) return;
      Array.prototype.forEach.call(seg.querySelectorAll("button"), function(b){
        b.onclick=function(){
          Array.prototype.forEach.call(seg.querySelectorAll("button"), function(x){ x.classList.remove("sel"); });
          b.classList.add("sel"); set(b.getAttribute("data-v"));
        };
      });
    }
    function readStep(s){
      if(s===2){
        ob.age=($("obAge").value||"").trim();
        ob.weight=($("obWeight").value||"").trim();
        ob.hf=($("obHf").value||"").trim()||"5";
        ob.hin=($("obHin").value||"").trim()||"10";
        ob.activity=$("obAct").value;
      }
      if(s===4){ ob.speed=($("obSpeed")?$("obSpeed").value:"").trim(); ob.drive=($("obDrive")?$("obDrive").value:"").trim(); }
    }
    function advance(s){
      readStep(s);
      var err=$("obErr");
      if(s===2){
        if(!ob.weight || +ob.weight<60 || +ob.weight>500){ if(err) err.textContent="Enter your bodyweight so we can size your fuel."; return; }
        if(ob.age && (+ob.age<14 || +ob.age>90)){ if(err) err.textContent="Enter a real age (14–90)."; return; }
      }
      if(s===3 && !ob.equip){ if(err) err.textContent="Pick the equipment setup closest to yours."; return; }
      if(s===4){
        if(ob.drive && (+ob.drive<80 || +ob.drive>400)){ if(err) err.textContent="Enter driver carry between 80 and 400 yards, or leave it blank."; return; }
        if(ob.speed && (+ob.speed<30 || +ob.speed>130)){ if(err) err.textContent="Enter 7-iron speed between 30 and 130 mph, or leave it blank."; return; }
      }
      if(s===4) applyProfile();   // compute targets + adapted week for the reveal
      if(s===5){ finish(true); return; }
      ob.step++; render();
    }

    function render(){
      var s=ob.step, pct=Math.round((s/(ob.total-1))*100);
      var kicker="", title="", body="", nextLabel="Continue";
      // Skip is available from the FIRST page (never trap someone in setup) and lives at the
      // BOTTOM of the card — the old top-right link sat under the iPhone status bar on the
      // installed app (viewport-fit=cover) and couldn't be tapped. The reveal has its own
      // "start later" link, so the generic skip hides there.
      var showBack=s>0, showSkip=s<5;

      if(s===0){
        // Lean welcome — they already installed/opened the app; don't re-pitch it.
        // One hook, one promise, straight into the questions ("under a minute" starts now).
        body='<div class="ob-kicker"><span class="ball"></span> The Golfer’s Mass &amp; Speed System</div>'+
          '<div class="ob-brand">Yard<span class="em">smith</span></div>'+
          '<div class="ob-hook">Turn muscle<br>into <span class="em">distance</span>.</div>'+
          '<p class="ob-p"><b>Four quick choices.</b> Then see the exact first week built around your body, schedule, equipment and distance goal.</p>'+
          '<div class="ob-promise"><span>~45 sec</span><span>No account needed</span><span>Change anytime</span></div>';
        nextLabel=ob.revisit?"Update my plan →":"Build my plan →";
      } else if(s===1){
        kicker="Step 1 of 4 · Outcome"; title="What does winning look like?";
        body='<div class="ob-opts">'+GOAL_CARDS.map(function(g){
          return '<button type="button" class="ob-opt'+(ob.goal===g.v?' sel':'')+'" data-goal="'+g.v+'">'+
            '<span class="obo-ic">'+g.ic+'</span><span class="obo-tx">'+
            '<span class="obo-t">'+g.t+' <span class="obo-tag">'+g.tag+'</span></span>'+
            '<span class="obo-d">'+g.d+'</span></span></button>';
        }).join("")+'</div>'+
          '<div class="ob-mission"><span>20-WEEK DISTANCE MISSION</span><div class="ob-seg" id="obGoalYds">'+[10,15,25].map(function(y){
            return '<button type="button" data-v="'+y+'" class="'+(String(ob.goalyds)===String(y)?"sel":"")+'">+'+y+' yds</button>';
          }).join("")+'</div></div>';
      } else if(s===2){
        kicker="Step 2 of 4 · Body & fuel"; title="Size the engine";
        body='<div class="ob-field"><label>Sex <span>(BMR formula)</span></label>'+
            '<div class="ob-seg" id="obSex">'+
            '<button type="button" data-v="male" class="'+(ob.sex==="male"?"sel":"")+'">Male</button>'+
            '<button type="button" data-v="female" class="'+(ob.sex==="female"?"sel":"")+'">Female</button></div></div>'+
          '<div class="ob-row"><div class="ob-field" style="flex:1"><label>Age</label>'+
            '<input class="ob-in" id="obAge" type="number" inputmode="numeric" placeholder="32" value="'+escAttr(ob.age)+'" /></div>'+
            '<div class="ob-field" style="flex:1"><label>Weight (lb)</label>'+
            '<input class="ob-in" id="obWeight" type="number" inputmode="decimal" placeholder="'+ffBench(ob.sex, ob.age).weight+'" value="'+escAttr(ob.weight)+'" /></div></div>'+
          '<div class="ob-field"><label>Height</label><div class="ob-row">'+
            '<input class="ob-in" id="obHf" type="number" inputmode="numeric" placeholder="ft" value="'+escAttr(ob.hf)+'" />'+
            '<input class="ob-in" id="obHin" type="number" inputmode="numeric" placeholder="in" value="'+escAttr(ob.hin)+'" /></div></div>'+
          '<div class="ob-field"><label>Typical activity</label><select class="ob-select" id="obAct">'+
            [["1.2","Mostly seated"],["1.375","Light — golf + some training"],["1.55","Moderate — train 3–5×/week"],
             ["1.725","Very active — hard training most days"],["1.9","Athlete — high-volume / two-a-days"]].map(function(o){
              return '<option value="'+o[0]+'"'+(ob.activity===o[0]?" selected":"")+'>'+o[1]+'</option>'; }).join("")+'</select></div>';
      } else if(s===3){
        kicker="Step 3 of 4 · Real life"; title="Make the plan fit your week";
        body=
          '<div class="ob-field"><label>When do you usually train?</label><div class="ob-seg" id="obWk">'+
            [["morning","Morning"],["midday","Midday"],["afternoon","Afternoon"],["evening","Evening"]].map(function(o){
              return '<button type="button" data-v="'+o[0]+'" class="'+(ob.workout===o[0]?"sel":"")+'">'+o[1]+'</button>'; }).join("")+'</div></div>'+
          '<div class="ob-field"><label>Training sessions per week</label><div class="ob-seg" id="obFreq">'+
            [["4","4 days"],["5","5 days"]].map(function(o){
              return '<button type="button" data-v="'+o[0]+'" class="'+(String(ob.freq)===o[0]?"sel":"")+'">'+o[1]+'</button>'; }).join("")+'</div></div>'+
          '<div class="ob-field"><label>Equipment</label></div>'+
          '<div class="ob-opts ob-equipopts">'+EQ_CARDS.map(function(g){
            return '<button type="button" class="ob-opt'+(ob.equip===g.v?' sel':'')+'" data-equip="'+g.v+'">'+
              '<span class="obo-ic">'+g.ic+'</span><span class="obo-tx">'+
              '<span class="obo-t">'+g.t+'</span><span class="obo-d">'+g.d+'</span></span></button>';
          }).join("")+'</div>';
      } else if(s===4){
        kicker="Step 4 of 4 · Starting line"; title="Give the plan something to beat";
        body='<p class="ob-p" style="margin-top:-4px">Optional. One number creates your baseline now; otherwise Yardsmith will guide the test later.</p>'+
          '<div class="ob-field"><label>Driver carry (yds) — your headline distance</label>'+
            '<input class="ob-in" id="obDrive" type="number" inputmode="decimal" placeholder="e.g. '+ffBench(ob.sex, ob.age).drive+'" value="'+escAttr(ob.drive)+'" /></div>'+
          '<div class="ob-field"><label>7-iron clubhead speed (mph)</label>'+
            '<input class="ob-in" id="obSpeed" type="number" inputmode="decimal" placeholder="e.g. '+ffBench(ob.sex, ob.age).seven+'" value="'+escAttr(ob.speed)+'" /></div>'+
          '<div class="ob-field ob-prepfield"><label>Anything that benefits from extra prep? <span>(optional, not a diagnosis)</span></label>'+
            prepToggleHtml()+'</div>'+
          '<p class="ob-p ob-quiet">Selected areas get one conservative prep move in relevant warm-ups. The 3-minute mobility screen refines this later.</p>';
        nextLabel="Show me my plan →";
      } else if(s===5){
        var t=lsGet("ff_targets",null);
        var baseline=lbEsc(ob.drive?ob.drive+" yd driver":(ob.speed?ob.speed+" mph 7-iron":"guided test waiting"));
        kicker=ob.revisit?"Updated without losing your place":"Built for you"; title=ob.revisit?"Your plan just adapted":"This is your opening week";
        body='<div class="ob-reveal"><div><span>MISSION</span><b>+'+(parseInt(ob.goalyds,10)||15)+' yards</b></div>'+
            '<div><span>BASELINE</span><b>'+baseline+'</b></div></div>'+
          weekPreviewHtml()+
          '<div class="ob-sum">'+
            '<div class="ob-sumv"><div class="v">'+(t?t.kcal:"—")+'</div><div class="k">kcal / day</div></div>'+
            '<div class="ob-sumv"><div class="v">'+(t?t.proteinG:"—")+'<small>g</small></div><div class="k">protein</div></div>'+
            '<div class="ob-sumv"><div class="v">'+(t?t.carbG:"—")+'<small>g</small></div><div class="k">carbs</div></div></div>'+
          '<div class="ob-fit"><b>Why this fits:</b> '+ob.freq+' sessions at '+ob.workout+' · '+((EQ_CARDS.filter(function(x){return x.v===ob.equip;})[0]||EQ_CARDS[0]).t.toLowerCase())+
            (ob.prep.length?' · extra prep for '+ob.prep.join(", "):'')+'.</div>'+
          '<p class="ob-p ob-quiet">Meals begin with these targets. Personalize foods anytime from Fuel. Your mobility screen will fine-tune warm-ups after setup.</p>'+
          (ob.hadPlan
            ? '<div class="ob-startcue">✓ Your completed sessions and current week stay exactly where they are. Only future guidance updates.</div>'
            : '<div class="ob-startcue">📅 Start now and today becomes Day 1. Nothing begins until you choose it.</div>');
        nextLabel=ob.hadPlan?"Save & see my updated plan →":"Start my first week →";
      }

      root.innerHTML=
        '<div class="ob-top"><div class="ob-prog"><span style="width:'+pct+'%"></span></div></div>'+
        '<div class="ob-main"><div class="ob-card">'+
          (kicker?'<div class="ob-kicker">'+kicker+'</div>':'')+
          (title?'<h2 class="ob-h">'+title+'</h2>':'')+ body+
          '<div class="ob-err" id="obErr"></div>'+
          '<div class="ob-nav">'+
            (showBack?'<button type="button" class="ob-back" id="obBack">Back</button>':'')+
            '<button type="button" class="ob-next" id="obNext">'+nextLabel+'</button></div>'+
          (showSkip?'<button type="button" class="ob-later" id="obSkip">'+(ob.revisit?"Exit setup":"Skip setup — just look around")+'</button>':'')+
          (s===5?'<button type="button" class="ob-later" id="obLater">'+(ob.hadPlan?"Save & return home":"Save it — I’ll start later")+'</button>':'')+
        '</div></div>';

      var skip=$("obSkip"); if(skip) skip.onclick=function(){ lsSet("ff_onboarded",true); close();
        try{ if(window.FFHealth) window.FFHealth.track("onboarding_skipped"); }catch(e){} };
      var back=$("obBack"); if(back) back.onclick=function(){ readStep(s); ob.step--; render(); };
      var later=$("obLater"); if(later) later.onclick=function(){ finish(false); };
      if(s===1) Array.prototype.forEach.call(root.querySelectorAll("[data-goal]"), function(b){
        b.onclick=function(){ ob.goal=b.getAttribute("data-goal"); render(); }; });
      if(s===1) segPick("obGoalYds", function(v){ ob.goalyds=parseInt(v,10)||15; });
      if(s===2) segPick("obSex", function(v){ ob.sex=v; });
      if(s===3){ segPick("obWk", function(v){ ob.workout=v; }); segPick("obFreq", function(v){ ob.freq=parseInt(v,10); }); }
      if(s===3) Array.prototype.forEach.call(root.querySelectorAll("[data-equip]"), function(b){
        b.onclick=function(){ ob.equip=b.getAttribute("data-equip"); render(); }; });
      if(s===4){ var prep=$("obPrep"); if(prep) prep.onclick=function(e){
        var b=e.target.closest("[data-prep]"); if(!b) return;
        var key=b.getAttribute("data-prep"), i=ob.prep.indexOf(key);
        if(i===-1) ob.prep.push(key); else ob.prep.splice(i,1);
        b.classList.toggle("sel",i===-1);
      }; }
      var next=$("obNext"); if(next) next.onclick=function(){ advance(s); };
    }
    render();
  }

  try{ migrateDayNames(); }catch(e){}   // re-key workouts logged under the old "(Squat)" day labels
  restore();      // bring back the user's saved inputs/equipment/tab
  var sharedLink = applyShareParams();   // a shared ?link= overrides local state so friends see your numbers
  // Returning users (and shared-link viewers) start with the calculator collapsed to a summary.
  calcCollapsed = !sharedLink && !FF_FRESH && lsGet("ff_targets", null) != null;
  calc();
  try{ applyCalcCollapse(); }catch(e){}
  var cs=$("calcSummary"); if(cs) cs.addEventListener("click", function(e){
    if(e.target.closest("[data-calcedit]")){ calcCollapsed=!calcCollapsed; applyCalcCollapse(); }
  });
  // Returning users have the brand in the top bar already — drop the big dashboard hero so
  // the Score leads. New users (no targets yet) keep it as the first-impression header.
  var dh=document.querySelector(".dash-hero");
  if(dh && !FF_FRESH && lsGet("ff_targets", null) != null) dh.hidden=true;
  renderEquip();
  renderPhase();
  renderDash();         // home overview (default landing tab)
  // The plan/day are derived live from the start date, but they only recompute when something
  // renders. An installed PWA / native shell can sit open (or backgrounded) across midnight or a
  // whole week boundary and never re-render — so the workouts appear "stuck" on the old week.
  // Re-render the date-driven views whenever the app is shown again on a NEW calendar day, and
  // move the reminders to match. Cheap (only fires on an actual day change), so it's safe to
  // hang off visibility/focus/pageshow.
  var ffLastDay = todayStr();
  function ffRefreshForNewDay(){
    try{
      var now = todayStr();
      if(now === ffLastDay) return;   // same day — nothing to roll over
      ffLastDay = now;
      try{ calc(); }catch(_){}          // rebuild macros + meal schedule for the new day (rest vs train)
      renderPhase();
      if(typeof renderDash==="function") renderDash();
      try{ ffNotifReschedule(); }catch(_){}   // reminders follow the new week/day
    }catch(e){}
  }
  document.addEventListener("visibilitychange", function(){ if(!document.hidden) ffRefreshForNewDay(); });
  window.addEventListener("focus", ffRefreshForNewDay);
  window.addEventListener("pageshow", ffRefreshForNewDay);
  try{ var bootView=(document.querySelector("#tabs button.active")||{getAttribute:function(){return "dash";}}).getAttribute("data-view"); showTipFor(bootView); }catch(e){}
  // App-shortcut deep links (long-press the installed icon): ?go=plan|calc|gameday|progress
  try{ var go=(new URLSearchParams(location.search)).get("go"); if(go && document.getElementById("view-"+go)) setView(go); }catch(e){}
  // Notification deep links land on the exact job, then clean the launch URL so
  // a refresh never re-opens a ritual the user already handled.
  try{
    var launchQ=new URLSearchParams(location.search);
    if(launchQ.get("src")==="push"){
      var launchKind=launchQ.get("kind")||"train";
      setTimeout(function(){ try{ ffOpenReminder(launchKind); }catch(_){} },300);
      if(history&&history.replaceState) history.replaceState({},"",location.pathname);
    }
  }catch(e){}
  maybeOnboard(sharedLink);   // first-run guided setup (no-op for returning users)
