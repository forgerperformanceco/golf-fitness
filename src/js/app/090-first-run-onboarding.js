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
    var ob={ step:0, total:8, goal:"leanbulk", sex:"male", age:"", weight:"",
             hf:"5", hin:"10", activity:"1.55", workout:"morning", freq:4, equip:"", speed:"", drive:"", based:false,
             goalyds:(lsGet("ff_goalyds",null)||15) };
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
      if(typeof planState!=="undefined" && planState.freq) ob.freq=planState.freq;
    }
    ob.prefs = (function(){ var s=lsGet("ff_foodprefs",null); return s?{liked:(s.liked||[]).slice(),avoid:(s.avoid||[]).slice(),restrict:(s.restrict||[]).slice()}:{liked:[],avoid:[],restrict:[]}; })();

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
    // Seed the first bodyweight/speed entry once, as the Score's baseline.
    function pushBaseline(){
      if(ob.based) return; ob.based=true;
      if(ob.weight || ob.speed || ob.drive){
        var body=lsGet("ff_body",[]);
        body.push({ date:todayStr(), w:ob.weight||"", s:ob.speed||"", d:ob.drive||"" });
        lsSet("ff_body", body);
      }
    }
    function finish(startNow){
      applyProfile(); pushBaseline(); ffSavePrefs(ob.prefs); lsSet("ff_onboarded", true);
      lsSet("ff_goalyds", parseInt(ob.goalyds,10)||15);
      close();
      if(startNow){ try{ startPlanAtWeek(1); }catch(e){} setView("plan"); try{ renderPhase(); }catch(e){} }
      else setView("dash");
      renderDash();
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
      }
      if(s===3) ob.activity=$("obAct").value;
      if(s===5){ ob.speed=($("obSpeed")?$("obSpeed").value:"").trim(); ob.drive=($("obDrive")?$("obDrive").value:"").trim(); }
    }
    function advance(s){
      readStep(s);
      var err=$("obErr");
      if(s===2){
        if(!ob.weight || +ob.weight<60 || +ob.weight>500){ if(err) err.textContent="Enter your bodyweight so we can size your fuel."; return; }
        if(ob.age && (+ob.age<14 || +ob.age>90)){ if(err) err.textContent="Enter a real age (14–90)."; return; }
      }
      if(s===5) applyProfile();   // compute targets so the summary can show them
      if(s===7){ finish(true); return; }
      ob.step++; render();
    }

    function render(){
      var s=ob.step, pct=Math.round((s/(ob.total-1))*100);
      var kicker="", title="", body="", nextLabel="Continue";
      // Skip is available from the FIRST page (never trap someone in setup) and lives at the
      // BOTTOM of the card — the old top-right link sat under the iPhone status bar on the
      // installed app (viewport-fit=cover) and couldn't be tapped. Step 7 has its own
      // "start later" link, so the generic skip hides there.
      var showBack=s>0, showSkip=s<7;

      if(s===0){
        // Lean welcome — they already installed/opened the app; don't re-pitch it.
        // One hook, one promise, straight into the questions ("under a minute" starts now).
        body='<div class="ob-kicker"><span class="ball"></span> The Golfer’s Mass &amp; Speed System</div>'+
          '<div class="ob-brand">Yard<span class="em">smith</span></div>'+
          '<div class="ob-hook">Turn muscle<br>into <span class="em">distance</span>.</div>'+
          '<p class="ob-p">Six quick questions dial your <b>fuel, 20-week plan and yardage mission</b> to you. Under a minute — let’s go.</p>';
        nextLabel="Build my plan →";
      } else if(s===1){
        kicker="Step 1 of 7 · Goal"; title="What are you chasing right now?";
        body='<div class="ob-opts">'+GOAL_CARDS.map(function(g){
          return '<button type="button" class="ob-opt'+(ob.goal===g.v?' sel':'')+'" data-goal="'+g.v+'">'+
            '<span class="obo-ic">'+g.ic+'</span><span class="obo-tx">'+
            '<span class="obo-t">'+g.t+' <span class="obo-tag">'+g.tag+'</span></span>'+
            '<span class="obo-d">'+g.d+'</span></span></button>';
        }).join("")+'</div>';
      } else if(s===2){
        kicker="Step 2 of 7 · About you"; title="The engine behind your numbers";
        body='<div class="ob-field"><label>Sex <span>(BMR formula)</span></label>'+
            '<div class="ob-seg" id="obSex">'+
            '<button type="button" data-v="male" class="'+(ob.sex==="male"?"sel":"")+'">Male</button>'+
            '<button type="button" data-v="female" class="'+(ob.sex==="female"?"sel":"")+'">Female</button></div></div>'+
          '<div class="ob-row"><div class="ob-field" style="flex:1"><label>Age</label>'+
            '<input class="ob-in" id="obAge" type="number" inputmode="numeric" placeholder="32" value="'+ob.age+'" /></div>'+
            '<div class="ob-field" style="flex:1"><label>Weight (lb)</label>'+
            '<input class="ob-in" id="obWeight" type="number" inputmode="decimal" placeholder="'+ffBench(ob.sex, ob.age).weight+'" value="'+ob.weight+'" /></div></div>'+
          '<div class="ob-field"><label>Height</label><div class="ob-row">'+
            '<input class="ob-in" id="obHf" type="number" inputmode="numeric" placeholder="ft" value="'+ob.hf+'" />'+
            '<input class="ob-in" id="obHin" type="number" inputmode="numeric" placeholder="in" value="'+ob.hin+'" /></div></div>';
      } else if(s===3){
        kicker="Step 3 of 7 · Training"; title="How you train";
        body='<div class="ob-field"><label>Activity level</label><select class="ob-select" id="obAct">'+
            [["1.2","Sedentary — desk job, little exercise"],["1.375","Light — range/play + light lifting"],
             ["1.55","Moderate — gym 3–5×/wk + golf"],["1.725","Very Active — hard training 6–7×/wk, walking 18s"],
             ["1.9","Athlete — 2-a-days, walking + speed work"]].map(function(o){
              return '<option value="'+o[0]+'"'+(ob.activity===o[0]?" selected":"")+'>'+o[1]+'</option>'; }).join("")+'</select></div>'+
          '<div class="ob-field"><label>When do you usually train?</label><div class="ob-seg" id="obWk">'+
            [["morning","Morning"],["midday","Midday"],["afternoon","Afternoon"],["evening","Evening"]].map(function(o){
              return '<button type="button" data-v="'+o[0]+'" class="'+(ob.workout===o[0]?"sel":"")+'">'+o[1]+'</button>'; }).join("")+'</div></div>'+
          '<div class="ob-field"><label>Lifting days per week</label><div class="ob-seg" id="obFreq">'+
            [["4","4 days"],["5","5 days"]].map(function(o){
              return '<button type="button" data-v="'+o[0]+'" class="'+(String(ob.freq)===o[0]?"sel":"")+'">'+o[1]+'</button>'; }).join("")+'</div></div>';
      } else if(s===4){
        kicker="Step 4 of 7 · Equipment"; title="What can you train with?";
        body='<p class="ob-p" style="margin-top:-4px">We swap every exercise to fit your gear. Pick the closest — you can fine-tune any item later in <b>Settings</b>.</p>'+
          '<div class="ob-opts">'+EQ_CARDS.map(function(g){
            return '<button type="button" class="ob-opt'+(ob.equip===g.v?' sel':'')+'" data-equip="'+g.v+'">'+
              '<span class="obo-ic">'+g.ic+'</span><span class="obo-tx">'+
              '<span class="obo-t">'+g.t+'</span><span class="obo-d">'+g.d+'</span></span></button>';
          }).join("")+'</div>';
      } else if(s===5){
        kicker="Step 5 of 7 · Baseline"; title="Your starting line";
        body='<p class="ob-p" style="margin-top:-4px">Set your starting numbers so you can watch them climb. Add either — or skip and log later.</p>'+
          '<div class="ob-field"><label>Driver carry (yds) — your headline distance</label>'+
            '<input class="ob-in" id="obDrive" type="number" inputmode="decimal" placeholder="e.g. '+ffBench(ob.sex, ob.age).drive+'" value="'+ob.drive+'" /></div>'+
          '<div class="ob-field"><label>7-iron clubhead speed (mph)</label>'+
            '<input class="ob-in" id="obSpeed" type="number" inputmode="decimal" placeholder="e.g. '+ffBench(ob.sex, ob.age).seven+'" value="'+ob.speed+'" /></div>'+
          '<div class="ob-field"><label>Your mission — yards to add over the 20 weeks</label>'+
            '<div class="ob-seg" id="obGoalYds">'+[10,15,25].map(function(y){
              return '<button type="button" data-v="'+y+'" class="'+(String(ob.goalyds)===String(y)?"sel":"")+'">+'+y+' yds</button>';
            }).join("")+'</div></div>'+
          '<p class="ob-p" style="font-size:13px;color:#9ccfb0;margin:0">A launch monitor or an on-course guess both work. Your mission is a goal you chase — the app tracks it against your real drives.</p>';
        nextLabel="Continue →";
      } else if(s===6){
        kicker="Step 6 of 7 · Your foods"; title="What do you actually eat?";
        body='<p class="ob-p" style="margin-top:-4px">Tap the foods you love and flag any dietary needs up top — we’ll build your meal ideas and a full day around them. Totally optional; skip if you’d rather.</p>'+
          '<div class="ob-foodwrap" id="obFood">'+ffPickerHtml(ob.prefs)+'</div>';
        nextLabel="Continue →";
      } else if(s===7){
        var t=lsGet("ff_targets",null);
        kicker="You’re set"; title="Your plan is dialed in";
        body='<div class="ob-sum">'+
            '<div class="ob-sumv"><div class="v">'+(t?t.kcal:"—")+'</div><div class="k">kcal / day</div></div>'+
            '<div class="ob-sumv"><div class="v">'+(t?t.proteinG:"—")+'<small>g</small></div><div class="k">protein</div></div>'+
            '<div class="ob-sumv"><div class="v">'+(t?t.carbG:"—")+'<small>g</small></div><div class="k">carbs</div></div></div>'+
          '<p class="ob-p">That’s your daily fuel for <b>'+((GOALS[ob.goal]&&GOALS[ob.goal].label)||"your goal")+'</b>. Your 20-week plan is aimed at <b>+'+(parseInt(ob.goalyds,10)||15)+' yds</b> — tracked against your real drives.</p>'+
          '<div class="ob-loophead">The whole system is one loop:</div>'+ffLoopHtml()+
          '<p class="ob-p" style="font-size:13px">🧭 First thing on your dashboard: a <b>3-minute mobility screen</b> — it tunes your warm-ups to what’s tight and completes your Octane score.</p>'+
          '<div class="ob-startcue">📅 Tapping below makes <b>today Day 1</b> — your Week 1 plan starts <b>right now</b> and counts forward from today. (Just looking? Use the link below — nothing starts until you say go.)</div>';
        nextLabel="Start — today is Day 1 →";
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
          (showSkip?'<button type="button" class="ob-later" id="obSkip">Skip setup — just look around</button>':'')+
          (s===7?'<button type="button" class="ob-later" id="obLater">I’ll start later — just look around</button>':'')+
        '</div></div>';

      var skip=$("obSkip"); if(skip) skip.onclick=function(){ lsSet("ff_onboarded",true); close(); };
      var back=$("obBack"); if(back) back.onclick=function(){ readStep(s); ob.step--; render(); };
      var later=$("obLater"); if(later) later.onclick=function(){ finish(false); };
      if(s===1) Array.prototype.forEach.call(root.querySelectorAll("[data-goal]"), function(b){
        b.onclick=function(){ ob.goal=b.getAttribute("data-goal"); render(); }; });
      if(s===2) segPick("obSex", function(v){ ob.sex=v; });
      if(s===5) segPick("obGoalYds", function(v){ ob.goalyds=parseInt(v,10)||15; });
      if(s===3){ segPick("obWk", function(v){ ob.workout=v; }); segPick("obFreq", function(v){ ob.freq=parseInt(v,10); }); }
      if(s===4) Array.prototype.forEach.call(root.querySelectorAll("[data-equip]"), function(b){
        b.onclick=function(){ ob.equip=b.getAttribute("data-equip"); applyEquipPreset(ob.equip); render(); }; });
      if(s===6){ var fw=$("obFood"); if(fw){ fw.addEventListener("click", function(e){
        var fb=e.target.closest("[data-fff]"), rb=e.target.closest("[data-ffr]");
        if(!fb && !rb) return;
        if(fb) ffCycleFood(ob.prefs, fb.getAttribute("data-fff"));
        if(rb) ffToggleRestrict(ob.prefs, rb.getAttribute("data-ffr"));
        fw.innerHTML=ffPickerHtml(ob.prefs);
      });
      fw.addEventListener("input", function(e){ if(e.target.id==="ffZipInput"){ var z=e.target.value.replace(/\D/g,"").slice(0,5); if(z!==e.target.value) e.target.value=z; lsSet("ff_zip", z); localStorage.removeItem("ff_region"); var lbl=fw.querySelector(".ffp-reg"); if(lbl) lbl.textContent="📍 "+(US_REGIONS[ffRegion()]||US_REGIONS.US).label; } });
      fw.addEventListener("change", function(e){ if(e.target.id==="ffZipInput"){ fw.innerHTML=ffPickerHtml(ob.prefs); } }); } }
      var next=$("obNext"); if(next) next.onclick=function(){ advance(s); };
    }
    render();
  }

  try{ migrateDayNames(); }catch(e){}   // re-key workouts logged under the old "(Squat)" day labels
  restore();      // bring back the user's saved inputs/equipment/tab
  var sharedLink = applyShareParams();   // a shared ?link= overrides local state so friends see your numbers
  // Returning users (and shared-link viewers) start with the calculator collapsed to a summary.
  calcCollapsed = !sharedLink && !FF_FRESH && !!localStorage.getItem("ff_targets");
  calc();
  try{ applyCalcCollapse(); }catch(e){}
  var cs=$("calcSummary"); if(cs) cs.addEventListener("click", function(e){
    if(e.target.closest("[data-calcedit]")){ calcCollapsed=!calcCollapsed; applyCalcCollapse(); }
  });
  // Returning users have the brand in the top bar already — drop the big dashboard hero so
  // the Score leads. New users (no targets yet) keep it as the first-impression header.
  var dh=document.querySelector(".dash-hero");
  if(dh && !FF_FRESH && localStorage.getItem("ff_targets")) dh.hidden=true;
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
  maybeOnboard(sharedLink);   // first-run guided setup (no-op for returning users)
