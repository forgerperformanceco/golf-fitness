  /* ===================== MACRO CALCULATOR ===================== */
  var state = { sex: "male", goal: "leanbulk", workout: "morning", meals: null };
  var lastMealPlan = null;   // last computed { meal, timing } — shared with the unified Meals card

  // Recommended number of main meals per plan (pre/post-workout feedings are extra, around training).
  var MEALS_REC = { leanbulk: 4, bulk: 5, maintain: 4, cut: 3 };

  var GOALS = {
    leanbulk: { label: "Lean Bulk", pct: 0.10, proteinPct: 0.30, fatG: 65, weekly:[0.0025,0.005],
      preFrac: 0.25, postFrac: 0.30,
      timing: "Post-workout is your <b>build window</b> — keep it the biggest carb feeding of the day.",
      note: "A clean surplus builds <b>quality mass and force</b> — the lean, fast body out-drives the heavy one." },
    bulk: { label: "Bulk", pct: 0.20, proteinPct: 0.30, fatG: 70, weekly:[0.005,0.0075],
      preFrac: 0.25, postFrac: 0.35,
      timing: "<b>Load post-workout hard</b> — your biggest glycogen-refill and growth window.",
      note: "Aggressive surplus for <b>max strength &amp; speed</b>. High protein, high carb, plenty of fat. Quality food, not a dirty bulk." },
    maintain: { label: "In-Season Maintain", pct: 0.0, proteinPct: 0.30, fatG: 55, weekly:null,
      preFrac: 0.25, postFrac: 0.25,
      timing: "Split carbs <b>evenly around training</b>, and save some to fuel your round.",
      note: "Hold your build and <b>steady energy across a 4–5 hour round</b>. Don't slash carbs on tournament weeks." },
    cut: { label: "Lean Out", pct: -0.20, proteinPct: 0.35, fatG: 50, weekly:[-0.01,-0.005],
      preFrac: 0.30, postFrac: 0.35,
      timing: "<b>Concentrate limited carbs around the workout</b>; stay lower the rest of the day.",
      note: "A cut here is <b>in service of speed</b>: a high-protein deficit that protects muscle while you drop fat, so you <b>keep or gain clubhead speed</b> at a lighter, more powerful bodyweight. Don't crash — that costs muscle and speed." }
  };
  var ACTIVITY_LABELS = { "1.2":"Sedentary","1.375":"Light","1.55":"Moderate","1.725":"Very Active","1.9":"Athlete" };

  // Training-page copy that matches the chosen macro goal (the workout itself is the
  // same for now — only the framing changes so it doesn't always say "gain 10 lb").
  var GOAL_TRAIN = {
    leanbulk: {
      phase: "🏗️ Build phase · matches your <b>Lean Bulk</b> macros",
      lead: "<b>Add lean muscle</b> and turn it into <b>clubhead speed</b> — one consistent week that builds size, strength and speed together, all 20 weeks.",
      foldTitle: "📈 How to add the muscle (and keep your swing)",
      rate: "<b>Clean surplus:</b> Lean Bulk (+10%), gain <b>~0.5–0.75 lb/week</b> — not a dirty bulk." },
    bulk: {
      phase: "💪 Mass phase · matches your <b>Bulk</b> macros",
      lead: "<b>Pack on size and strength</b> and convert it to <b>clubhead speed</b> — the same week, fueled by a bigger surplus. Plan a Lean Out afterward to reveal it.",
      foldTitle: "📈 How to gain the mass (and keep your swing)",
      rate: "<b>Surplus:</b> Bulk (+20%), faster scale gain — <b>plan a Lean Out after</b> to show the muscle." },
    maintain: {
      phase: "⛳ In-season · matches your <b>Maintain</b> macros",
      lead: "<b>Hold your muscle and sharpen your speed</b> — the in-season week: heavy enough to keep strength, lighter on volume, all the speed work intact.",
      foldTitle: "📈 How to hold size &amp; speed in-season",
      rate: "<b>Maintenance calories:</b> hold your weight — the scale stays roughly flat while you keep strength and speed." },
    cut: {
      phase: "🔻 Lean-out phase · matches your <b>Lean Out</b> macros",
      lead: "<b>Keep your muscle and clubhead speed while you lean out</b> — train heavy to protect strength, keep the power work, let the deficit drop the fat. Leaner = better power-to-weight = more speed.",
      foldTitle: "📈 How to lean out without losing speed",
      rate: "<b>Moderate deficit:</b> Lean Out (−20%), ~<b>0.5–1%/week</b> — high protein + heavy lifting protect muscle and speed." }
  };
  function updatePlanCopy(){
    var g = GOAL_TRAIN[state.goal] || GOAL_TRAIN.leanbulk;
    var pe=$("planPhase"); if(pe) pe.innerHTML=g.phase;
    var pl=$("planLead"); if(pl) pl.innerHTML=g.lead;
    var pf=$("planFoldTitle"); if(pf) pf.innerHTML=g.foldTitle;
    var rb=$("planRateBullet"); if(rb) rb.innerHTML=g.rate;
  }

  // Anchor training hour (24h) per slot. Pre = 90 min before, post ≈ 90 min after start.
  var WORKOUT_SLOTS = {
    morning:   { label: "Morning",   anchor: 7 },
    midday:    { label: "Midday",    anchor: 12 },
    afternoon: { label: "Afternoon", anchor: 16 },
    evening:   { label: "Evening",   anchor: 19 }
  };

  function $(id){ return document.getElementById(id); }
  function num(id){ var v=parseFloat($(id).value); return isNaN(v)?0:v; }
  function round(n){ return Math.round(n); }
  function round5(n){ return Math.round(n/5)*5; }
  function roundEven(n){ var e=Math.round(n/2)*2; return e<0?0:e; }
  // Split a whole-gram total across meals by weight, integers that sum exactly (largest-remainder).
  function distribute(total, weights){
    total=Math.max(0, Math.round(total));
    var sum=0; weights.forEach(function(w){ sum+=w; });
    if(sum<=0) return weights.map(function(){ return 0; });
    var raw=weights.map(function(w){ return total*w/sum; });
    var fl=raw.map(function(v){ return Math.floor(v); });
    var used=0; fl.forEach(function(v){ used+=v; });
    var order=raw.map(function(v,i){ return [v-fl[i], i]; }).sort(function(a,b){ return b[0]-a[0]; });
    for(var k=0;k<total-used;k++){ fl[order[k%order.length][1]]++; }
    return fl;
  }
  // Split a total (a multiple of 5) across meals in clean 5 g increments that sum exactly.
  function distribute5(total, weights){
    return distribute(Math.round(total/5), weights).map(function(u){ return u*5; });
  }
  function formatTime(h){
    h=((h%24)+24)%24;
    var hr=Math.floor(h), min=Math.round((h-hr)*60);
    if(min===60){ hr++; min=0; }
    var ampm=hr>=12?"PM":"AM";
    var h12=hr%12; if(h12===0) h12=12;
    return h12+":"+(min<10?"0":"")+min+" "+ampm;
  }

  function wireSeg(segId, attr, key, onChange){
    var seg=$(segId);
    seg.addEventListener("click", function(e){
      var btn=e.target.closest("button"); if(!btn) return;
      Array.prototype.forEach.call(seg.querySelectorAll("button"), function(b){ b.classList.remove("active"); });
      btn.classList.add("active"); state[key]=btn.getAttribute(attr);
      if(onChange) onChange(); calc();
    });
  }
  wireSeg("sexSeg","data-sex","sex");
  // Training time is edited in the Account "training setup" card (single home); the
  // Fuel tab only references it — so no workoutSeg control lives here anymore.

  $("goals").addEventListener("click", function(e){
    var btn=e.target.closest(".goal"); if(!btn) return;
    Array.prototype.forEach.call(this.querySelectorAll(".goal"), function(b){ b.classList.remove("active"); });
    btn.classList.add("active"); state.goal=btn.getAttribute("data-goal"); calc();
    if(typeof renderPhase==="function") renderPhase();   // goal drives the Build/Retain training mode
  });
  ["age","weight","heightFt","heightIn","activity"].forEach(function(id){
    $(id).addEventListener("input", calc);
  });
  // Meal-count buttons live inside the re-rendered results, so delegate from the stable parent.
  $("results").addEventListener("click", function(e){
    var b=e.target.closest("[data-meals]");
    if(b){ state.meals=parseInt(b.getAttribute("data-meals"),10); calc(); return; }
    var row=e.target.closest(".sched-row.tappable");
    if(row){ row.classList.toggle("open"); }
  });
  $("resetBtn").addEventListener("click", function(){
    try { localStorage.removeItem("fairwayfuel"); } catch(e){}
    location.href = location.origin + location.pathname;   // drop any share params too
  });

  // ---- Shareable plan link: encode the calculator settings into the URL ----
  var SHARE_KEYS = { s:"sex", g:"goal", w:"workout", m:"meals", a:"age",
    wt:"weight", hf:"heightFt", hi:"heightIn", ac:"activity" };
  function buildShareURL(){
    var p=new URLSearchParams();
    p.set("s",state.sex); p.set("g",state.goal); p.set("w",state.workout);
    if(state.meals) p.set("m",state.meals);
    ["a:age","wt:weight","hf:heightFt","hi:heightIn","ac:activity"].forEach(function(pair){
      var k=pair.split(":")[0], id=pair.split(":")[1], v=$(id)?$(id).value:"";
      if(v!=="") p.set(k,v);
    });
    return location.origin + location.pathname + "?" + p.toString();
  }
  function applyShareParams(){
    if(!location.search || location.search==="?") return false;
    var q=new URLSearchParams(location.search);
    var get=function(k){ return q.get(k); };
    ["a:age","wt:weight","hf:heightFt","hi:heightIn","ac:activity"].forEach(function(pair){
      var k=pair.split(":")[0], id=pair.split(":")[1];
      if(q.has(k) && $(id)) $(id).value=q.get(k);
    });
    function act(segId, attr, val){
      var seg=$(segId); if(!seg||val==null) return;
      Array.prototype.forEach.call(seg.querySelectorAll("button"), function(b){
        b.classList.toggle("active", b.getAttribute(attr)===String(val)); });
    }
    if(q.has("s")){ state.sex=get("s"); act("sexSeg","data-sex",get("s")); }
    if(q.has("w")){ state.workout=get("w"); act("workoutSeg","data-workout",get("w")); }
    if(q.has("g")){ state.goal=get("g");
      Array.prototype.forEach.call($("goals").querySelectorAll(".goal"), function(b){
        b.classList.toggle("active", b.getAttribute("data-goal")===get("g")); }); }
    if(q.has("m")) state.meals=parseInt(get("m"),10);
    return true;
  }
  $("shareBtn").addEventListener("click", function(){
    var url=buildShareURL(), btn=this, hint=$("shareHint");
    function ok(){ btn.classList.add("done"); btn.textContent="✓ Link copied!";
      hint.textContent="Pasted to your clipboard — text or AirDrop it to a friend.";
      setTimeout(function(){ btn.classList.remove("done"); btn.textContent="🔗 Copy my plan link";
        hint.textContent="Sends a friend this calculator pre-filled with your exact numbers."; }, 2600); }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(ok).catch(function(){ prompt("Copy your plan link:", url); });
    } else { prompt("Copy your plan link:", url); }
  });

  function calc(){
    var age=num("age");
    var weightLb=num("weight");
    var heightCm=(num("heightFt")*12+num("heightIn"))*2.54;
    var weightKg=weightLb/2.20462;

    if(weightLb<=0||heightCm<=0||age<=0){ $("results").innerHTML=placeholder(); updateFoodTargets(0,0,0); try{ renderFFMeals(); }catch(e){} return; }

    var bmr=10*weightKg+6.25*heightCm-5*age+(state.sex==="male"?5:-161);
    var activity=parseFloat($("activity").value);
    var tdee=bmr*activity;
    var g=GOALS[state.goal];
    var target=tdee*(1+g.pct);

    // Weekly bodyweight-change target = bodyweight × goal band (fraction/week).
    var weekly=null;
    if(g.weekly){
      // Magnitudes, sorted small→large so the band always reads low–high.
      var m=[Math.abs(weightLb*g.weekly[0]), Math.abs(weightLb*g.weekly[1])].sort(function(a,b){return a-b;});
      var f1=function(x){ return (Math.round(x*10)/10).toFixed(1); };
      weekly={ gain:g.weekly[1]>0, lo:f1(m[0]), hi:f1(m[1]),
        loMo:f1(m[0]*4), hiMo:f1(m[1]*4) };
    }

    // Protein = % of calories; fat = fixed grams per goal; carbs fill the rest. All rounded to 5 g.
    var proteinG=round5(target*g.proteinPct/4);
    var fatG=g.fatG;
    // Adaptive nudge from the metabolism check-in (weight-trend tuning) — flows
    // into carbs, since protein and fat are fixed.
    var kcalAdj = lsGet("ff_kcal_adj", 0);
    target += kcalAdj;
    var proteinKcal=proteinG*4, fatKcal=fatG*9;
    var carbKcal=target - proteinKcal - fatKcal, carbG=round5(carbKcal/4);
    if(carbG<0){ carbG=0; }
    carbKcal=carbG*4;

    // ---- Meal plan + nutrient timing: one weighted distribution across the whole day ----
    var slot=WORKOUT_SLOTS[state.workout];
    var mealN = state.meals || MEALS_REC[state.goal];
    var postT = slot.anchor + 1.5, preT = slot.anchor - 1.5;
    var FIRST = 7.5, LAST = 20.0;                 // eating window 7:30 AM – 8:00 PM

    var meals = [];
    for (var mi=0; mi<mealN; mi++){
      meals.push({ time: mealN===1 ? 12.5 : FIRST + mi*(LAST-FIRST)/(mealN-1), isPost:false });
    }
    // The meal nearest the post-workout window becomes the post-workout meal.
    var ni=0, best=99; meals.forEach(function(m,i){ var d=Math.abs(m.time-postT); if(d<best){best=d;ni=i;} });
    meals[ni].time = postT; meals[ni].isPost = true;
    meals.sort(function(a,b){ return a.time-b.time; });

    // Name meals: first = Breakfast, last = Dinner, one midday Lunch, the rest Snacks.
    var lunchUsed=false;
    meals.forEach(function(m,i){
      if(i===0) m.label="Breakfast";
      else if(i===meals.length-1) m.label="Dinner";
      else if(!lunchUsed && m.time>=11.5 && m.time<15){ m.label="Lunch"; lunchUsed=true; }
      else m.label="Snack";
    });
    // Pre-workout: if a meal already sits within ~45 min of the pre window, that meal IS
    // your pre-workout fuel; otherwise add a small separate pre-workout snack.
    var preIdx=0, preDist=99;
    meals.forEach(function(m,i){ var d=Math.abs(m.time-preT); if(d<preDist){ preDist=d; preIdx=i; } });
    var preMerged = preDist<=0.75 && !meals[preIdx].isPost;
    if(preMerged) meals[preIdx].isPreMeal=true;
    // Relative weights — dinner biggest, breakfast carries more fat (eggs), snacks light.
    var ROLEW = {
      Breakfast:{p:0.95,c:1.05,f:1.25}, Lunch:{p:1.05,c:1.00,f:1.00},
      Dinner:{p:1.15,c:0.90,f:1.35}, Snack:{p:0.70,c:0.80,f:0.55}
    };
    // Protein & fat split across the main meals (post-workout meal goes low-fat).
    var pArr=distribute5(proteinG, meals.map(function(m){ return ROLEW[m.label].p; }));
    var fArr=distribute5(fatG, meals.map(function(m){ return m.isPost ? ROLEW[m.label].f*0.35 : ROLEW[m.label].f; }));
    meals.forEach(function(m,i){ m.p=pArr[i]; m.f=fArr[i]; });

    // Carbs split across ALL feedings (main meals + pre-workout snack) — so the pre and
    // post amounts shrink naturally as you add meals, instead of being a fixed % of the day.
    var pre = { kind:"pre", time:preT, label:"Pre-workout", p:0, f:0 };
    var carbFeeds = meals.map(function(m){
      var w = m.isPost ? 1.6 : ROLEW[m.label].c;
      if(m.isPreMeal) w += 0.6;                   // this meal doubles as pre-workout fuel
      return { ref:m, w:w };
    });
    if(!preMerged) carbFeeds.push({ ref:pre, w:0.8 });   // separate top-off snack
    var cArr=distribute5(carbG, carbFeeds.map(function(f){ return f.w; }));
    carbFeeds.forEach(function(f,i){ f.ref.c=cArr[i]; });

    var postMeal=meals[0], preMeal=meals[0];
    meals.forEach(function(m){ if(m.isPost) postMeal=m; if(m.isPreMeal) preMeal=m; });
    var feedList = preMerged ? meals.slice() : meals.concat([pre]);
    var schedule = feedList.sort(function(a,b){ return a.time-b.time; }).map(function(f){
      return { kind:f.kind||"meal", label:f.label, time:formatTime(f.time), t:f.time,
        isPost:!!f.isPost, isPre:!!f.isPreMeal, p:f.p||0, c:f.c||0, f:f.f||0 };
    });

    var preCarbs = preMerged ? preMeal.c : pre.c;
    var timing={
      slot: slot.label,
      preG: preCarbs, postG: postMeal.c, restG: Math.max(0, carbG - preCarbs - postMeal.c),
      preTime: formatTime(preMerged ? preMeal.time : preT), postTime: formatTime(postT),
      trainTime: formatTime(slot.anchor), fasted: state.workout==="morning", note: g.timing
    };
    var meal = { n: mealN, recommended: MEALS_REC[state.goal], slot: slot.label, schedule: schedule };
    ffSchedule = schedule;   // today's meal slots — the fuel check-off logs against these
    lastMealPlan = { meal: meal, timing: timing };   // stash for the unified Meals card

    render({ bmr:bmr,tdee:tdee,target:target,activity:activity,
      proteinG:proteinG,fatG:fatG,carbG:carbG,
      proteinKcal:proteinKcal,fatKcal:fatKcal,carbKcal:carbKcal,
      goal:g,pct:g.pct, timing:timing, meal:meal, weekly:weekly });
    updateFoodTargets(proteinG, carbG, mealN);
    try{ renderFFMeals(); }catch(e){}
    try{ applyCalcCollapse(); }catch(e){}
    updatePlanCopy();                 // keep the Train-tab framing in step with the goal
    // Stash the computed targets so the AI coach can use the user's exact numbers.
    try {
      localStorage.setItem("ff_targets", JSON.stringify({
        goal: g.label, kcal: Math.round(target/5)*5, proteinG: proteinG, carbG: carbG, fatG: fatG,
        mealN: mealN, tdee: Math.round(tdee)
      }));
    } catch(e){}
    persist();
  }
  function placeholder(){ return '<div class="placeholder"><div class="big">⛳</div>Enter your details to see your calorie target and macros.</div>'; }

  // ---- Dynamic food helper: turn the user's numbers into example portions ----
  // Broad, realistic pools (cooked weights, named cuts) so "Another option" gives variety.
  var CARB_UNITS = [
    {one:"1 cup cooked rice", g:45}, {one:"1 large bagel", g:50}, {one:"a medium potato", g:37},
    {one:"a medium sweet potato", g:27}, {one:"1 cup cooked pasta", g:43}, {one:"2 slices bread", g:30},
    {one:"1 cup oats (dry)", g:54}, {one:"1 banana", g:27}, {one:"1 cup berries", g:17},
    {one:"a large apple", g:30}, {one:"3 medjool dates", g:54}, {one:"½ cup granola", g:35},
    {one:"2 rice cakes", g:14}, {one:"1 tbsp honey", g:17}
  ];
  var PROT_UNITS = [
    {one:"4 oz cooked chicken breast", g:35}, {one:"4 oz cooked sirloin", g:33},
    {one:"4 oz cooked salmon", g:29}, {one:"4 oz cooked lean turkey", g:34},
    {one:"1 scoop whey", g:25}, {one:"1 cup Greek yogurt", g:23},
    {one:"1 can tuna", g:27}, {one:"3 eggs", g:18}, {one:"½ cup cottage cheese", g:13}
  ];
  // Like buildCombo, but rotates which item leads so repeated calls give variety.
  function buildComboVaried(target, units, rot){
    rot = rot||0;
    var elig = units.filter(function(u){ return u.g <= target+12; });
    if(!elig.length){ var sm=units.slice().sort(function(a,b){ return a.g-b.g; })[0]; return { text:sm.one, sum:sm.g }; }
    var primary = elig[rot % elig.length];
    var picks=[primary.one], sum=primary.g, rem=target-primary.g;
    var rest = units.filter(function(u){ return u!==primary; }).sort(function(a,b){ return b.g-a.g; });
    for(var i=0;i<rest.length && rem>9;i++){
      if(rest[i].g <= rem+10){ picks.push(rest[i].one); sum+=rest[i].g; rem-=rest[i].g; }
    }
    return { text:picks.join(" + "), sum:sum };
  }
  function buildCombo(target, units){
    var rem=target, picks=[], sum=0;
    for(var i=0;i<units.length && rem>9;i++){
      var u=units[i];
      if(u.g<=rem+10){ picks.push(u.one); rem-=u.g; sum+=u.g; }
    }
    if(!picks.length){ picks.push(units[units.length-1].one); sum=units[units.length-1].g; }
    return { text:picks.join(" + "), sum:sum };
  }
  // Role-tuned food pools for example meals (post-workout = fast carbs + lean protein, etc.)
  var MEAL_PROT = {
    Breakfast:[{one:"1 scoop whey",g:25},{one:"1 cup Greek yogurt",g:23},{one:"3 eggs",g:18},{one:"1 cup high-protein cereal",g:13}],
    Lunch:[{one:"4 oz chicken or turkey",g:35},{one:"4 oz lean beef",g:30}],
    Dinner:[{one:"6 oz chicken or steak",g:50},{one:"4 oz salmon",g:29}],
    Snack:[{one:"a Fairlife Core Power (30g)",g:30},{one:"a whey shake",g:25},{one:"1 cup Greek yogurt",g:23},{one:"1 oz beef jerky",g:11},{one:"½ cup cottage cheese",g:13}],
    post:[{one:"a Fairlife Core Power (30g)",g:30},{one:"4 oz chicken breast",g:35},{one:"1 scoop whey",g:25}],
    def:[{one:"4 oz chicken breast",g:35},{one:"4 oz lean beef",g:30},{one:"3 eggs",g:18}]
  };
  var MEAL_CARB = {
    Breakfast:[{one:"1 cup oats",g:54},{one:"1 banana",g:27},{one:"a bowl of low-fat cereal",g:36},{one:"2 slices toast",g:30},{one:"1 cup berries",g:15}],
    Lunch:[{one:"1 cup rice",g:45},{one:"a wrap or 2 slices bread",g:30},{one:"a baked potato",g:37}],
    Dinner:[{one:"1 cup rice",g:45},{one:"a baked potato",g:37}],
    Snack:[{one:"a Rice Krispies Treat",g:17},{one:"a bowl of Cocoa Pebbles",g:36},{one:"pretzels (1 oz)",g:23},{one:"a banana",g:27},{one:"an apple",g:25},{one:"rice cakes",g:14}],
    post:[{one:"a bowl of Cocoa Pebbles",g:36},{one:"1 cup white rice",g:45},{one:"1 banana",g:27},{one:"1 tbsp honey",g:17}],
    pre:[{one:"a Rice Krispies Treat",g:17},{one:"1 banana",g:27},{one:"½ cup oats",g:27},{one:"1 tbsp honey",g:17}],
    def:[{one:"1 cup rice",g:45},{one:"a baked potato",g:37},{one:"1 banana",g:27}]
  };
  function exampleMeal(s){
    // Breakfast keeps breakfast foods even when it doubles as the post-workout meal —
    // nobody eats chicken & rice at 7am. (Dynamic, user-chosen options come with the AI phase.)
    var key = s.kind==="pre" ? "pre" : (s.label==="Breakfast" ? "Breakfast" : (s.isPost ? "post" : s.label));
    var cPool = MEAL_CARB[key] || MEAL_CARB.def;
    var c = buildCombo(s.c||0, cPool);
    if(s.kind==="pre" || !s.p) return c.text + " (fast carbs)";
    var pPool = MEAL_PROT[key] || MEAL_PROT.def;
    var p = buildCombo(s.p, pPool);
    var fat = (s.f>=12) ? " + a little healthy fat (eggs, avocado, nuts or olive oil)" : "";
    var veg = (key==="Dinner"||key==="Lunch") ? " + veg" : "";
    return p.text + " + " + c.text + veg + fat;
  }
  var foodRoll=0, lastFood=null;
  function updateFoodTargets(proteinG, carbG, mealN){
    var el=$("foodDynamic"); if(!el) return;
    if(!proteinG || !carbG){ el.innerHTML=""; lastFood=null; return; }
    lastFood = { p:proteinG, c:carbG, m:mealN };
    var cPer=Math.round(carbG/mealN/5)*5, pPer=Math.round(proteinG/mealN/5)*5;
    var c=buildComboVaried(cPer, CARB_UNITS, foodRoll), p=buildComboVaried(pPer, PROT_UNITS, foodRoll);
    el.innerHTML =
      '<div class="fd-head">Your numbers → on the plate</div>'+
      '<div class="fd-day">~<b>'+proteinG+'g</b> protein · ~<b>'+carbG+'g</b> carbs a day, across <b>'+mealN+'</b> meals — about <b>'+pPer+'g</b> protein &amp; <b>'+cPer+'g</b> carbs each.</div>'+
      '<div class="fd-row"><span class="fd-tag">🍗 ~'+pPer+'g protein</span> '+p.text+' <span class="fd-sum">(≈'+p.sum+'g)</span></div>'+
      '<div class="fd-row"><span class="fd-tag">🍚 ~'+cPer+'g carbs</span> '+c.text+' <span class="fd-sum">(≈'+c.sum+'g)</span></div>'+
      '<button type="button" class="fd-swap" id="foodSwap">🔄 Another option</button>'+
      '<button type="button" class="fd-ai" data-ask="meals">🤖 Build my full day</button>'+
      '<div class="fd-note">…or pick your own from the lists below to match those numbers.</div>';
  }

  /* ================= FOOD PREFERENCES — favorites personalize meals =================
     A tagged food library. The picker reads it; the deterministic recommender and
     day-planner filter/boost by the user's likes, avoids and hard dietary restrictions.
     Restrictions are HARD (never shown); likes/avoids are SOFT (rank up / hide). */
  var FF_FOODS = [
    // proteins  (tags = "contains" flags used by restrictions)
    {id:"chicken", n:"Chicken breast", e:"🍗", cat:"protein", p:35,c:0,f:4,  serv:"4 oz cooked", tags:["meat"]},
    {id:"turkey",  n:"Lean turkey",    e:"🦃", cat:"protein", p:34,c:0,f:3,  serv:"4 oz cooked", tags:["meat"]},
    {id:"beef",    n:"Lean ground beef",e:"🥩",cat:"protein", p:30,c:0,f:10, serv:"4 oz 90/10",  tags:["meat"]},
    {id:"steak",   n:"Sirloin steak",  e:"🥩", cat:"protein", p:33,c:0,f:9,  serv:"4 oz cooked", tags:["meat"]},
    {id:"salmon",  n:"Salmon",         e:"🐟", cat:"protein", p:29,c:0,f:11, serv:"4 oz cooked", tags:["fish"]},
    {id:"tuna",    n:"Canned tuna",    e:"🐟", cat:"protein", p:30,c:0,f:1,  serv:"1 can",       tags:["fish"]},
    {id:"shrimp",  n:"Shrimp",         e:"🦐", cat:"protein", p:24,c:0,f:1,  serv:"4 oz",        tags:["fish"]},
    {id:"eggs",    n:"Eggs",           e:"🥚", cat:"protein", p:18,c:1,f:15, serv:"3 large",     tags:["egg"]},
    {id:"eggwhite",n:"Egg whites",     e:"🥚", cat:"protein", p:13,c:1,f:0,  serv:"½ cup",       tags:["egg"]},
    {id:"greekyog",n:"Greek yogurt",   e:"🥛", cat:"protein", p:23,c:9,f:0,  serv:"1 cup nonfat",tags:["dairy"]},
    {id:"cottage", n:"Cottage cheese", e:"🧀", cat:"protein", p:25,c:6,f:2,  serv:"1 cup",       tags:["dairy"]},
    {id:"whey",    n:"Whey protein",   e:"🥤", cat:"protein", p:25,c:3,f:1,  serv:"1 scoop",     tags:["dairy"]},
    {id:"fairlife",n:"Fairlife (30g)", e:"🥤", cat:"protein", p:30,c:5,f:5,  serv:"1 bottle",    tags:["dairy"]},
    {id:"deli",    n:"Deli turkey/ham",e:"🍖", cat:"protein", p:18,c:1,f:2,  serv:"3 oz",        tags:["meat"]},
    {id:"jerky",   n:"Beef jerky",     e:"🥩", cat:"protein", p:11,c:3,f:1,  serv:"1 oz",        tags:["meat"]},
    {id:"tofu",    n:"Tofu",           e:"🌱", cat:"protein", p:20,c:4,f:11, serv:"½ block firm",tags:[]},
    {id:"tempeh",  n:"Tempeh",         e:"🌱", cat:"protein", p:20,c:8,f:11, serv:"3 oz",        tags:[]},
    {id:"protcer", n:"Protein cereal", e:"🥣", cat:"protein", p:13,c:14,f:3, serv:"1 cup",       tags:[]},
    // carbs & grains
    {id:"rice",    n:"White rice",     e:"🍚", cat:"carb", p:4,c:45,f:0, serv:"1 cup cooked",   tags:[]},
    {id:"pasta",   n:"Pasta",          e:"🍝", cat:"carb", p:8,c:43,f:1, serv:"1 cup cooked",   tags:["gluten"]},
    {id:"potato",  n:"Baked potato",   e:"🥔", cat:"carb", p:4,c:37,f:0, serv:"1 medium",       tags:[]},
    {id:"sweetpot",n:"Sweet potato",   e:"🍠", cat:"carb", p:2,c:26,f:0, serv:"1 medium",       tags:[]},
    {id:"bagel",   n:"Bagel",          e:"🥯", cat:"carb", p:9,c:50,f:1, serv:"1 plain",        tags:["gluten"]},
    {id:"bread",   n:"Bread",          e:"🍞", cat:"carb", p:8,c:30,f:2, serv:"2 slices",       tags:["gluten"]},
    {id:"tortilla",n:"Flour tortilla", e:"🌯", cat:"carb", p:4,c:35,f:4, serv:"1 large",        tags:["gluten"]},
    {id:"oats",    n:"Oats",           e:"🌾", cat:"carb", p:5,c:27,f:3, serv:"½ cup dry",      tags:[]},
    {id:"quinoa",  n:"Quinoa",         e:"🌾", cat:"carb", p:8,c:39,f:4, serv:"1 cup cooked",   tags:[]},
    // fruit
    {id:"banana",  n:"Banana",         e:"🍌", cat:"fruit", p:1,c:27,f:0, serv:"1 medium", tags:[]},
    {id:"apple",   n:"Apple",          e:"🍎", cat:"fruit", p:0,c:25,f:0, serv:"1 medium", tags:[]},
    {id:"orange",  n:"Orange",         e:"🍊", cat:"fruit", p:1,c:22,f:0, serv:"1 large",  tags:[]},
    {id:"grapes",  n:"Grapes",         e:"🍇", cat:"fruit", p:1,c:27,f:0, serv:"1 cup",    tags:[]},
    {id:"berries", n:"Berries",        e:"🫐", cat:"fruit", p:1,c:15,f:0, serv:"1 cup",    tags:[]},
    {id:"mango",   n:"Mango",          e:"🥭", cat:"fruit", p:1,c:25,f:0, serv:"1 cup",    tags:[]},
    {id:"pineapple",n:"Pineapple",     e:"🍍", cat:"fruit", p:1,c:22,f:0, serv:"1 cup",    tags:[]},
    // fast fuel (around training / on course)
    {id:"honey",   n:"Honey",          e:"🍯", cat:"fast", p:0,c:17,f:0, serv:"1 tbsp",    tags:[]},
    {id:"dates",   n:"Medjool dates",  e:"🌴", cat:"fast", p:0,c:18,f:0, serv:"1 date",    tags:[]},
    {id:"ricecake",n:"Rice cakes",     e:"🍘", cat:"fast", p:1,c:14,f:0, serv:"2 cakes",   tags:[]},
    {id:"sportsdr",n:"Sports drink",   e:"🥤", cat:"fast", p:0,c:36,f:0, serv:"20 oz",     tags:[]},
    {id:"raisins", n:"Raisins",        e:"🍇", cat:"fast", p:1,c:32,f:0, serv:"¼ cup",     tags:[]},
    // snacks (low-fat quick wins)
    {id:"rkt",     n:"Rice Krispies Treat",e:"🍬",cat:"snack", p:1,c:17,f:2, serv:"1 bar", tags:["gluten"]},
    {id:"cocoapeb",n:"Cocoa Pebbles",  e:"🥣", cat:"snack", p:1,c:36,f:1, serv:"1 cup",    tags:[]},
    {id:"poptart", n:"Pop-Tart",       e:"🧇", cat:"snack", p:2,c:37,f:5, serv:"1 pastry", tags:["gluten"]},
    {id:"pretzels",n:"Pretzels",       e:"🥨", cat:"snack", p:3,c:23,f:1, serv:"1 oz",     tags:["gluten"]},
    {id:"graham",  n:"Graham crackers",e:"🍪", cat:"snack", p:2,c:22,f:3, serv:"4 crackers",tags:["gluten"]},
    {id:"pudding", n:"FF pudding cup", e:"🍮", cat:"snack", p:2,c:22,f:0, serv:"1 cup",    tags:["dairy"]},
    {id:"gummies", n:"Fruit gummies",  e:"🐻", cat:"snack", p:0,c:22,f:0, serv:"handful",  tags:[]},
    {id:"popcorn", n:"Popcorn",        e:"🍿", cat:"snack", p:3,c:19,f:3, serv:"3 cups air",tags:[]},
    // fats & nuts
    {id:"avocado", n:"Avocado",        e:"🥑", cat:"fat", p:2,c:9,f:15, serv:"½",          tags:[]},
    {id:"pb",      n:"Peanut butter",  e:"🥜", cat:"fat", p:7,c:6,f:16, serv:"2 tbsp",     tags:["nuts"]},
    {id:"almonds", n:"Almonds",        e:"🌰", cat:"fat", p:6,c:6,f:14, serv:"1 oz",       tags:["nuts"]},
    {id:"oliveoil",n:"Olive oil",      e:"🫒", cat:"fat", p:0,c:0,f:14, serv:"1 tbsp",     tags:[]},
    // veggies
    {id:"broccoli",n:"Broccoli",       e:"🥦", cat:"veg", p:3,c:6,f:0, serv:"1 cup",       tags:[]},
    {id:"salad",   n:"Mixed veg/salad",e:"🥗", cat:"veg", p:2,c:8,f:0, serv:"a big handful",tags:[]},
    // ---- US regional staples (.reg = where they're common; shown only in that region) ----
    {id:"grits",    n:"Grits",          e:"🌽", cat:"carb",    p:3, c:33,f:1,  serv:"1 cup cooked", tags:[], reg:["SOUTH"]},
    {id:"collard",  n:"Collard greens", e:"🥬", cat:"veg",     p:4, c:10,f:0,  serv:"1 cup cooked", tags:[], reg:["SOUTH"]},
    {id:"blackeye", n:"Black-eyed peas",e:"🫘", cat:"carb",    p:13,c:35,f:1,  serv:"1 cup cooked", tags:[], reg:["SOUTH","TEXAS"]},
    {id:"peach",    n:"Peach",          e:"🍑", cat:"fruit",   p:1, c:15,f:0,  serv:"1 medium",     tags:[], reg:["SOUTH"]},
    {id:"catfish",  n:"Catfish",        e:"🐟", cat:"protein", p:32,c:0, f:9,  serv:"5 oz cooked",  tags:["fish"], reg:["SOUTH","TEXAS"]},
    {id:"pinto",    n:"Pinto beans",    e:"🫘", cat:"carb",    p:15,c:45,f:1,  serv:"1 cup cooked", tags:[], reg:["TEXAS","MOUNTAIN"]},
    {id:"corn",     n:"Sweet corn",     e:"🌽", cat:"carb",    p:5, c:31,f:1,  serv:"1 cup",        tags:[], reg:["MIDWEST"]},
    {id:"porkloin", n:"Pork loin",      e:"🥩", cat:"protein", p:34,c:0, f:6,  serv:"4 oz cooked",  tags:["meat"], reg:["MIDWEST","SOUTH"]},
    {id:"cod",      n:"Cod",            e:"🐟", cat:"protein", p:30,c:0, f:1,  serv:"5 oz cooked",  tags:["fish"], reg:["NE","WEST"]},
    {id:"trout",    n:"Trout",          e:"🐟", cat:"protein", p:32,c:0, f:8,  serv:"5 oz cooked",  tags:["fish"], reg:["MOUNTAIN","WEST"]},
    // ---- expanded library (national) ----
    {id:"groundturkey",n:"Ground turkey",e:"🦃",cat:"protein",p:33,c:0, f:8, serv:"4 oz 93/7",   tags:["meat"]},
    {id:"porkchop",  n:"Pork chop",      e:"🥩",cat:"protein",p:32,c:0, f:9, serv:"4 oz cooked",  tags:["meat"]},
    {id:"tilapia",   n:"Tilapia",        e:"🐟",cat:"protein",p:30,c:0, f:3, serv:"5 oz cooked",  tags:["fish"]},
    {id:"sardines",  n:"Sardines",       e:"🐟",cat:"protein",p:23,c:0, f:11,serv:"1 can",        tags:["fish"]},
    {id:"canchicken",n:"Canned chicken", e:"🥫",cat:"protein",p:21,c:0, f:2, serv:"3 oz",         tags:["meat"]},
    {id:"ham",       n:"Ham",            e:"🍖",cat:"protein",p:20,c:1, f:5, serv:"3 oz",         tags:["meat"]},
    {id:"milk",      n:"Milk (2%)",      e:"🥛",cat:"protein",p:8, c:12,f:5, serv:"1 cup",        tags:["dairy"]},
    {id:"skyr",      n:"Skyr",           e:"🥛",cat:"protein",p:17,c:6, f:0, serv:"¾ cup",        tags:["dairy"]},
    {id:"stringcheese",n:"String cheese",e:"🧀",cat:"protein",p:7, c:1, f:6, serv:"1 stick",      tags:["dairy"]},
    {id:"edamame",   n:"Edamame",        e:"🫛",cat:"protein",p:17,c:14,f:8, serv:"1 cup",        tags:[]},
    {id:"seitan",    n:"Seitan",         e:"🌱",cat:"protein",p:21,c:4, f:1, serv:"3 oz",         tags:["gluten"]},
    {id:"proteinbar",n:"Protein bar",    e:"🍫",cat:"protein",p:20,c:22,f:7, serv:"1 bar",        tags:[]},
    {id:"chickenthigh",n:"Chicken thigh",e:"🍗",cat:"protein",p:25,c:0, f:11,serv:"4 oz cooked",  tags:["meat"]},
    {id:"flanksteak",n:"Flank steak",    e:"🥩",cat:"protein",p:30,c:0, f:8, serv:"4 oz cooked",  tags:["meat"]},
    {id:"groundchicken",n:"Ground chicken",e:"🍗",cat:"protein",p:23,c:0,f:9, serv:"4 oz 93/7",    tags:["meat"]},
    {id:"chocmilk",  n:"Chocolate milk", e:"🥛",cat:"fast",   p:8, c:26,f:5, serv:"1 cup",        tags:["dairy"]},
    {id:"brownrice", n:"Brown rice",     e:"🍚",cat:"carb",p:5, c:45,f:2, serv:"1 cup cooked", tags:[]},
    {id:"couscous",  n:"Couscous",       e:"🌾",cat:"carb",p:6, c:36,f:0, serv:"1 cup cooked", tags:["gluten"]},
    {id:"farro",     n:"Farro",          e:"🌾",cat:"carb",p:6, c:37,f:1, serv:"1 cup cooked", tags:["gluten"]},
    {id:"englishmuffin",n:"English muffin",e:"🥯",cat:"carb",p:5,c:26,f:1,serv:"1 muffin",     tags:["gluten"]},
    {id:"corntortilla",n:"Corn tortillas",e:"🌮",cat:"carb",p:2,c:24,f:2, serv:"2 small",      tags:[]},
    {id:"blackbeans",n:"Black beans",    e:"🫘",cat:"carb",p:15,c:41,f:1, serv:"1 cup cooked", tags:[]},
    {id:"chickpeas", n:"Chickpeas",      e:"🫘",cat:"carb",p:15,c:45,f:4, serv:"1 cup cooked", tags:[]},
    {id:"kidneybeans",n:"Kidney beans",  e:"🫘",cat:"carb",p:15,c:40,f:1, serv:"1 cup cooked", tags:[]},
    {id:"lentils",   n:"Lentils",        e:"🫘",cat:"carb",p:18,c:40,f:1, serv:"1 cup cooked", tags:[]},
    {id:"peas",      n:"Green peas",     e:"🫛",cat:"carb",p:8, c:25,f:0, serv:"1 cup",        tags:[]},
    {id:"cereal",    n:"Whole-grain cereal",e:"🥣",cat:"carb",p:4,c:40,f:1,serv:"1 cup",       tags:[]},
    {id:"pancakes",  n:"Pancakes",       e:"🥞",cat:"carb",p:6, c:44,f:6, serv:"2 medium",     tags:["gluten"]},
    {id:"waffle",    n:"Waffle",         e:"🧇",cat:"carb",p:5, c:30,f:7, serv:"1 waffle",     tags:["gluten"]},
    {id:"creamwheat",n:"Cream of wheat", e:"🥣",cat:"carb",p:4, c:30,f:0, serv:"1 cup cooked", tags:["gluten"]},
    {id:"strawberries",n:"Strawberries", e:"🍓",cat:"fruit",p:1,c:11,f:0, serv:"1 cup",    tags:[]},
    {id:"blueberries",n:"Blueberries",   e:"🫐",cat:"fruit",p:1,c:21,f:0, serv:"1 cup",    tags:[]},
    {id:"watermelon",n:"Watermelon",     e:"🍉",cat:"fruit",p:1,c:11,f:0, serv:"1 cup",    tags:[]},
    {id:"pear",      n:"Pear",           e:"🍐",cat:"fruit",p:1,c:27,f:0, serv:"1 medium", tags:[]},
    {id:"cherries",  n:"Cherries",       e:"🍒",cat:"fruit",p:1,c:19,f:0, serv:"1 cup",    tags:[]},
    {id:"kiwi",      n:"Kiwi",           e:"🥝",cat:"fruit",p:1,c:10,f:0, serv:"1 medium", tags:[]},
    {id:"cantaloupe",n:"Cantaloupe",     e:"🍈",cat:"fruit",p:1,c:13,f:0, serv:"1 cup",    tags:[]},
    {id:"spinach",   n:"Spinach",        e:"🥬",cat:"veg",p:3,c:4,f:0,  serv:"2 cups raw", tags:[]},
    {id:"greenbeans",n:"Green beans",    e:"🫛",cat:"veg",p:2,c:8,f:0,  serv:"1 cup",      tags:[]},
    {id:"asparagus", n:"Asparagus",      e:"🌿",cat:"veg",p:3,c:5,f:0,  serv:"1 cup",      tags:[]},
    {id:"carrots",   n:"Carrots",        e:"🥕",cat:"veg",p:1,c:12,f:0, serv:"1 cup",      tags:[]},
    {id:"bellpepper",n:"Bell pepper",    e:"🫑",cat:"veg",p:1,c:9,f:0,  serv:"1 cup",      tags:[]},
    {id:"zucchini",  n:"Zucchini",       e:"🥒",cat:"veg",p:2,c:4,f:0,  serv:"1 cup",      tags:[]},
    {id:"cauliflower",n:"Cauliflower",   e:"🥦",cat:"veg",p:2,c:5,f:0,  serv:"1 cup",      tags:[]},
    {id:"brussels",  n:"Brussels sprouts",e:"🥬",cat:"veg",p:3,c:8,f:0, serv:"1 cup",      tags:[]},
    {id:"tomato",    n:"Tomato",         e:"🍅",cat:"veg",p:1,c:5,f:0,  serv:"1 cup",      tags:[]},
    {id:"mushrooms", n:"Mushrooms",      e:"🍄",cat:"veg",p:3,c:3,f:0,  serv:"1 cup",      tags:[]},
    {id:"cucumber",  n:"Cucumber",       e:"🥒",cat:"veg",p:1,c:4,f:0,  serv:"1 cup",      tags:[]},
    {id:"juice",     n:"Fruit juice",    e:"🧃",cat:"fast",p:1,c:28,f:0, serv:"1 cup",     tags:[]},
    {id:"gel",       n:"Energy gel",     e:"🟢",cat:"fast",p:0,c:22,f:0, serv:"1 packet",  tags:[]},
    {id:"granolabar",n:"Granola bar",    e:"🍫",cat:"snack",p:3,c:24,f:5,serv:"1 bar",       tags:[]},
    {id:"trailmix",  n:"Trail mix",      e:"🥜",cat:"snack",p:5,c:20,f:10,serv:"¼ cup",      tags:["nuts"]},
    {id:"crackers",  n:"Crackers",       e:"🍘",cat:"snack",p:3,c:20,f:4,serv:"10 crackers", tags:["gluten"]},
    {id:"figbar",    n:"Fig bars",       e:"🍪",cat:"snack",p:2,c:24,f:2,serv:"2 bars",      tags:["gluten"]},
    {id:"tortillachips",n:"Tortilla chips",e:"🌽",cat:"snack",p:2,c:19,f:7,serv:"1 oz",      tags:[]},
    {id:"darkchoc",  n:"Dark chocolate", e:"🍫",cat:"snack",p:2,c:13,f:9,serv:"1 oz",        tags:["dairy"]},
    {id:"walnuts",   n:"Walnuts",        e:"🌰",cat:"fat",p:4,c:4,f:18, serv:"1 oz",   tags:["nuts"]},
    {id:"cashews",   n:"Cashews",        e:"🌰",cat:"fat",p:5,c:9,f:12, serv:"1 oz",   tags:["nuts"]},
    {id:"almondbutter",n:"Almond butter",e:"🥜",cat:"fat",p:7,c:6,f:18, serv:"2 tbsp", tags:["nuts"]},
    {id:"chia",      n:"Chia seeds",     e:"🌱",cat:"fat",p:5,c:12,f:9, serv:"2 tbsp",  tags:[]},
    {id:"cheddar",   n:"Cheddar cheese", e:"🧀",cat:"fat",p:7,c:1,f:9,  serv:"1 oz",    tags:["dairy"]},
    // ============ REGIONAL STAPLES (expanded) — shown only in the matching region ============
    // Northeast — New England, NY, NJ, PA
    {id:"haddock",  n:"Haddock",        e:"🐟",cat:"protein",p:27,c:0, f:1, serv:"5 oz cooked", tags:["fish"], reg:["NE"]},
    {id:"lobster",  n:"Lobster",        e:"🦞",cat:"protein",p:28,c:1, f:1, serv:"5 oz",        tags:["fish"], reg:["NE"]},
    {id:"clams",    n:"Clams",          e:"🦪",cat:"protein",p:22,c:4, f:1, serv:"3 oz",        tags:["fish"], reg:["NE"]},
    {id:"cranberry",n:"Cranberries",    e:"🫐",cat:"fruit",  p:0, c:12,f:0, serv:"½ cup",       tags:[],       reg:["NE"]},
    {id:"maple",    n:"Maple syrup",    e:"🍁",cat:"fast",   p:0, c:13,f:0, serv:"1 tbsp",      tags:[],       reg:["NE"]},
    // South — Southeast & Mid-Atlantic
    {id:"okra",     n:"Okra",           e:"🌿",cat:"veg",    p:2, c:7, f:0, serv:"1 cup",       tags:[],       reg:["SOUTH"]},
    {id:"limabeans",n:"Lima beans",     e:"🫘",cat:"carb",   p:11,c:31,f:1, serv:"1 cup cooked",tags:[],       reg:["SOUTH"]},
    {id:"turnipgreens",n:"Turnip greens",e:"🥬",cat:"veg",   p:2, c:6, f:0, serv:"1 cup",       tags:[],       reg:["SOUTH"]},
    {id:"pecans",   n:"Pecans",         e:"🌰",cat:"fat",    p:3, c:4, f:20,serv:"1 oz",        tags:["nuts"], reg:["SOUTH","TEXAS"]},
    {id:"cornbread",n:"Cornbread",      e:"🍞",cat:"carb",   p:4, c:28,f:5, serv:"1 piece",     tags:["gluten"],reg:["SOUTH"]},
    {id:"shrimpgulf",n:"Gulf shrimp",   e:"🦐",cat:"protein",p:24,c:0, f:1, serv:"4 oz",        tags:["fish"], reg:["SOUTH","TEXAS"]},
    // Texas & South-Central — TX, OK, AR, LA
    {id:"brisket",  n:"Beef brisket",   e:"🥩",cat:"protein",p:26,c:0, f:12,serv:"4 oz cooked", tags:["meat"], reg:["TEXAS"]},
    {id:"crawfish", n:"Crawfish",       e:"🦐",cat:"protein",p:14,c:0, f:1, serv:"3 oz",        tags:["fish"], reg:["TEXAS"]},
    {id:"redbeans", n:"Red beans",      e:"🫘",cat:"carb",   p:15,c:40,f:1, serv:"1 cup cooked",tags:[],       reg:["TEXAS"]},
    // Midwest — Great Lakes & Plains
    {id:"walleye",  n:"Walleye",        e:"🐟",cat:"protein",p:28,c:0, f:2, serv:"5 oz cooked", tags:["fish"], reg:["MIDWEST"]},
    {id:"perch",    n:"Yellow perch",   e:"🐟",cat:"protein",p:21,c:0, f:1, serv:"4 oz",        tags:["fish"], reg:["MIDWEST"]},
    {id:"porktender",n:"Pork tenderloin",e:"🥩",cat:"protein",p:26,c:0,f:4, serv:"4 oz cooked", tags:["meat"], reg:["MIDWEST"]},
    {id:"wildrice", n:"Wild rice",      e:"🌾",cat:"carb",   p:7, c:35,f:1, serv:"1 cup cooked",tags:[],       reg:["MIDWEST"]},
    // Mountain West — CO, AZ, UT, NV, ID, MT
    {id:"bison",    n:"Bison",          e:"🦬",cat:"protein",p:24,c:0, f:7, serv:"4 oz cooked", tags:["meat"], reg:["MOUNTAIN"]},
    {id:"elk",      n:"Elk",            e:"🦌",cat:"protein",p:30,c:0, f:3, serv:"4 oz cooked", tags:["meat"], reg:["MOUNTAIN"]},
    {id:"greenchile",n:"Green chile",   e:"🌶️",cat:"veg",   p:1, c:8, f:0, serv:"1 cup",       tags:[],       reg:["MOUNTAIN","TEXAS"]},
    // West Coast — CA, OR, WA, AK, HI
    {id:"halibut",  n:"Halibut",        e:"🐟",cat:"protein",p:30,c:0, f:3, serv:"5 oz cooked", tags:["fish"], reg:["WEST"]},
    {id:"dungeness",n:"Dungeness crab", e:"🦀",cat:"protein",p:20,c:0, f:1, serv:"4 oz",        tags:["fish"], reg:["WEST"]},
    {id:"ahituna",  n:"Ahi tuna (poke)",e:"🐟",cat:"protein",p:29,c:0, f:1, serv:"5 oz",        tags:["fish"], reg:["WEST"]},
    {id:"mahimahi", n:"Mahi-mahi",      e:"🐟",cat:"protein",p:27,c:0, f:1, serv:"5 oz cooked", tags:["fish"], reg:["WEST"]},
    {id:"kale",     n:"Kale",           e:"🥬",cat:"veg",    p:3, c:7, f:0, serv:"2 cups raw",  tags:[],       reg:["WEST"]},
    {id:"artichoke",n:"Artichoke",      e:"🌿",cat:"veg",    p:4, c:14,f:0, serv:"1 medium",    tags:[],       reg:["WEST"]},
    {id:"sourdough",n:"Sourdough",      e:"🍞",cat:"carb",   p:4, c:30,f:1, serv:"2 slices",    tags:["gluten"],reg:["WEST"]}
  ];
  var FF_RESTRICT = [
    {id:"vegetarian",label:"Vegetarian", e:"🥦", blocks:["meat","fish"]},
    {id:"vegan",     label:"Vegan",      e:"🌱", blocks:["meat","fish","dairy","egg"]},
    {id:"dairyfree", label:"Dairy-free", e:"🥛", blocks:["dairy"]},
    {id:"glutenfree",label:"Gluten-free",e:"🌾", blocks:["gluten"]},
    {id:"nutfree",   label:"Nut allergy",e:"🥜", blocks:["nuts"]},
    {id:"noseafood", label:"No seafood", e:"🐟", blocks:["fish"]}
  ];
  var FFP_GROUP_OF = { protein:"Proteins", carb:"Carbs & grains", fruit:"Fruit", fast:"Fast fuel", snack:"Snacks", fat:"Fats & nuts", veg:"Veggies" };
  var FFP_GROUPS = ["Proteins","Carbs & grains","Fruit","Fast fuel","Snacks","Fats & nuts","Veggies"];
  var ffRoll=0, ffShowDay=false, ffMealsBound=false, ffWeekDay=0, ffWeekRoll=0;
  var FF_AISLE = { protein:"🥩 Proteins", carb:"🍚 Carbs & grains", fruit:"🍎 Produce", veg:"🥦 Produce", fast:"⚡ Snacks & fast carbs", snack:"⚡ Snacks & fast carbs", fat:"🥑 Fats & oils" };
  var FF_AISLE_ORDER = ["🥩 Proteins","🍚 Carbs & grains","🍎 Produce","⚡ Snacks & fast carbs","🥑 Fats & oils"];

  function ffFind(arr,id){ for(var i=0;i<arr.length;i++) if(arr[i].id===id) return arr[i]; return null; }
  function ffPrefs(){ var p=lsGet("ff_foodprefs",null); p=p||{}; return { liked:p.liked||[], avoid:p.avoid||[], restrict:p.restrict||[] }; }
  function ffSavePrefs(p){ lsSet("ff_foodprefs", { liked:p.liked||[], avoid:p.avoid||[], restrict:p.restrict||[] }); }
  function ffRestrictBlocks(p){ var s={}; (p.restrict||[]).forEach(function(id){ var r=ffFind(FF_RESTRICT,id); if(r) r.blocks.forEach(function(b){ s[b]=1; }); }); return s; }
  function ffFoodBlocked(f,p){ var b=ffRestrictBlocks(p); return (f.tags||[]).some(function(t){ return b[t]; }); }
  function ffAllowed(f,p){ return !ffFoodBlocked(f,p) && (p.avoid||[]).indexOf(f.id)<0 && ffFoodInRegion(f); }
  function ffIsLiked(f,p){ return (p.liked||[]).indexOf(f.id)>=0; }
  function ffHasPrefs(p){ return (p.liked&&p.liked.length) || (p.restrict&&p.restrict.length) || (p.avoid&&p.avoid.length); }
  // Hide foods in the static "What do I eat?" reference list that clash with dietary restrictions.
  function applyFoodFoldPrefs(){
    var blocked=ffRestrictBlocks(ffPrefs());
    Array.prototype.forEach.call(document.querySelectorAll('.foodfold li[data-ffc]'), function(li){
      var tags=(li.getAttribute('data-ffc')||'').split(',');
      li.style.display = tags.some(function(t){ return blocked[t]; }) ? 'none' : '';
    });
    Array.prototype.forEach.call(document.querySelectorAll('.foodfold .fold-body ul'), function(ul){
      var anyVisible=Array.prototype.some.call(ul.querySelectorAll('li'), function(li){ return li.style.display!=='none'; });
      ul.style.display = anyVisible ? '' : 'none';
      var h=ul.previousElementSibling; if(h && h.tagName==='H4') h.style.display = anyVisible ? '' : 'none';
    });
  }

  function ffCycleFood(p,id){
    var L=p.liked, A=p.avoid, li=L.indexOf(id), ai=A.indexOf(id);
    if(li<0 && ai<0) L.push(id);                 // neutral → love
    else if(li>=0){ L.splice(li,1); A.push(id); } // love → avoid
    else A.splice(ai,1);                          // avoid → neutral
  }
  function ffToggleRestrict(p,id){ var R=p.restrict, i=R.indexOf(id); if(i<0) R.push(id); else R.splice(i,1); }

  function ffChip(f,p){
    var liked=ffIsLiked(f,p), avoid=(p.avoid||[]).indexOf(f.id)>=0, blk=ffFoodBlocked(f,p);
    var cls=blk?'dim':(liked?'lk':(avoid?'av':''));
    return '<button type="button" class="ffp-f '+cls+'" data-fff="'+f.id+'"'+(blk?' disabled':'')+'>'+f.e+' '+f.n+'</button>';
  }
  function ffPickerHtml(p){
    var reg=ffRegion(), R=US_REGIONS[reg]||US_REGIONS.US;
    var html='<div class="ffp-legend">Tap once = <b class="lk">♥ love it</b>, again = <b class="av">✕ avoid</b>. We build your meals around your loves.</div>'+
      '<div class="ffp-grp"><div class="ffp-gh">Your ZIP <span style="font-weight:500;text-transform:none;letter-spacing:0">— tailors meals to foods common near you</span></div>'+
      '<div class="ffp-ziprow"><input id="ffZipInput" class="ffp-zip" type="text" inputmode="numeric" maxlength="5" placeholder="e.g. 30301" value="'+escAttr(ffZip())+'" />'+
      '<span class="ffp-reg">📍 '+R.label+'</span></div></div>'+
      '<div class="ffp-grp"><div class="ffp-gh">Dietary needs</div><div class="ffp-chips">'+
      FF_RESTRICT.map(function(r){ var on=(p.restrict||[]).indexOf(r.id)>=0;
        return '<button type="button" class="ffp-r'+(on?' on':'')+'" data-ffr="'+r.id+'">'+r.e+' '+r.label+'</button>'; }).join("")+
      '</div></div>';
    function byName(a,b){ return a.n.localeCompare(b.n); }
    // Regional staples first (only the ones common in this region), alphabetical
    if(reg!=="US"){
      var local=FF_FOODS.filter(function(f){ return f.reg && f.reg.indexOf(reg)>=0; }).sort(byName);
      if(local.length)
        html+='<div class="ffp-grp"><div class="ffp-gh">📍 Common in the '+R.label+'</div><div class="ffp-chips">'+
          local.map(function(f){ return ffChip(f,p); }).join("")+'</div></div>';
    }
    FFP_GROUPS.forEach(function(g){
      var items=FF_FOODS.filter(function(f){ return FFP_GROUP_OF[f.cat]===g && (!f.reg || f.reg.indexOf(reg)>=0); }).sort(byName);
      if(!items.length) return;
      html+='<div class="ffp-grp"><div class="ffp-gh">'+g+'</div><div class="ffp-chips">'+
        items.map(function(f){ return ffChip(f,p); }).join("")+'</div></div>';
    });
    return html;
  }

  // Foods that fit a breakfast plate (keeps steak & tuna off the 7am meal).
  var FF_AM = {oats:1,eggs:1,eggwhite:1,greekyog:1,cottage:1,whey:1,fairlife:1,protcer:1,banana:1,berries:1,apple:1,orange:1,cocoapeb:1,bagel:1,bread:1,pb:1,honey:1,
    milk:1,skyr:1,chocmilk:1,englishmuffin:1,cereal:1,pancakes:1,waffle:1,creamwheat:1,blueberries:1,strawberries:1,juice:1,granolabar:1,proteinbar:1,almondbutter:1,chia:1,maple:1,cranberry:1};
  // ---- Meal-context appropriateness — keep lunch/dinner savory & "real-meal", snacks light ----
  // Breakfast uses FF_AM above. 'main' = lunch/dinner; 'snack' = a between-meals bite.
  var FF_NOT_MAIN_PROT = {whey:1,greekyog:1,cottage:1,protcer:1,proteinbar:1,milk:1,skyr:1,stringcheese:1,jerky:1,fairlife:1,eggwhite:1,eggs:1};
  var FF_NOT_MAIN_CARB = {oats:1,cereal:1,pancakes:1,waffle:1,creamwheat:1,englishmuffin:1};   // breakfast carbs
  var FF_MAIN_FAT = {oliveoil:1,avocado:1,cheddar:1};   // dinner-friendly fats only — no nut butters / handfuls of nuts
  var FF_SNACK_PROT = {jerky:1,deli:1,ham:1,stringcheese:1,greekyog:1,cottage:1,skyr:1,whey:1,fairlife:1,proteinbar:1,milk:1,eggs:1,tuna:1,canchicken:1,edamame:1};
  function ffMainOk(f){
    if(f.cat==='veg') return true;
    if(f.cat==='protein') return !FF_NOT_MAIN_PROT[f.id];   // cooked meats/fish/tofu — not whey/yogurt/jerky
    if(f.cat==='carb')    return !FF_NOT_MAIN_CARB[f.id];   // rice/pasta/potato/beans — not oats/cereal/pancakes
    if(f.cat==='fat')     return !!FF_MAIN_FAT[f.id];       // olive oil / avocado / cheese only
    return false;                                           // fruit / fast / snack aren't a dinner component
  }
  function ffSnackOk(f){
    if(f.cat==='snack'||f.cat==='fast'||f.cat==='fruit'||f.cat==='fat') return true;
    if(f.cat==='protein') return !!FF_SNACK_PROT[f.id];    // grab-and-go proteins, not a cooked steak
    return false;                                           // no rice/pasta as a "snack"
  }
  function ffMealCtx(name){
    if(name==="Breakfast") return "am";
    if(name==="Lunch"||name==="Dinner"||name==="Evening") return "main";
    if(name==="Snack") return "snack";
    return null;
  }
  // role list: liked-first, fall back to all allowed.
  // role 'prot'|'carb'|'snack'|'fat'.  slot 'am' biases to breakfast foods.
  function ffRoleList(p, role, ctx){
    var cats = role==='prot' ? ['protein'] : (role==='snack' ? ['snack','fast','fruit'] : (role==='fat' ? ['fat'] : (role==='veg' ? ['veg'] : ['carb','fruit','fast','snack'])));
    var all=FF_FOODS.filter(function(f){ return cats.indexOf(f.cat)>=0 && ffAllowed(f,p); });
    if(role==='carb') all=all.filter(function(f){ return f.f<=6; });   // keep carb sources low-fat
    if(role==='fat')  all=all.filter(function(f){ return f.f>=10; });  // real fat sources only
    if(ctx==='am'){
      var likedAm=all.filter(function(f){ return FF_AM[f.id] && ffIsLiked(f,p); });
      if(likedAm.length) return likedAm;                                // liked AND breakfast-y
      var likedAny=all.filter(function(f){ return ffIsLiked(f,p); });
      if(likedAny.length) return likedAny;                              // respect likes over am-ness
      var am=all.filter(function(f){ return FF_AM[f.id]; });
      return am.length?am:all;
    }
    if(ctx==='main' || ctx==='snack'){
      // Keep meals true to context — savory mains at lunch/dinner, light bites at snacks — so a
      // breakfast spread (peanut butter, cereal, yogurt) never lands on a dinner plate.
      var okFn = ctx==='main' ? ffMainOk : ffSnackOk;
      var ctxFoods=all.filter(okFn);
      var likedCtx=ctxFoods.filter(function(f){ return ffIsLiked(f,p); });
      if(likedCtx.length) return likedCtx;                              // liked AND meal-appropriate
      if(ctxFoods.length) return ctxFoods;                              // appropriate beats a liked-but-wrong food
      var likedAny2=all.filter(function(f){ return ffIsLiked(f,p); });
      if(likedAny2.length) return likedAny2;
      return all;
    }
    var liked=all.filter(function(f){ return ffIsLiked(f,p); });
    return liked.length?liked:all;
  }
  function ffProtPick(list,target,roll){
    if(!list.length) return null;
    // Rank by closeness to the protein target, penalizing fat so we don't lean on a fatty
    // protein (eggs/salmon) to hit a big number — that's what blew the fat budget.
    var score=function(f){ return Math.abs(f.p-target)+f.f*1.2; };
    var pool=list.slice().sort(function(a,b){ return score(a)-score(b); });
    var top=pool.slice(0,Math.min(4,pool.length));
    return top[(roll||0)%top.length];
  }
  function ffCarbCombo(list,target,roll){
    if(!list.length) return {picks:[],sum:0};
    var pool=list.slice().sort(function(a,b){ return b.c-a.c; });
    var n=pool.length, start=(roll||0)%n, picks=[], sum=0, rem=target;
    for(var k=0;k<n && rem>8;k++){ var f=pool[(start+k)%n]; if(f.c<=rem+10 && picks.indexOf(f)<0){ picks.push(f); sum+=f.c; rem-=f.c; } }
    if(!picks.length) picks.push(pool[start]), sum=pool[start].c;
    return {picks:picks, sum:sum};
  }
  /* ----- US regional flavor: bias the food plan toward staples common in the user's
     part of the country, derived from their ZIP code (offline — just the first digit →
     region; no lookup/network). US-only, imperial units, US brand names. ----- */
  var US_REGIONS = {
    NE:      { label:"Northeast",            note:"New England, NY, NJ, PA" },
    SOUTH:   { label:"South",                note:"Southeast & Mid-Atlantic" },
    MIDWEST: { label:"Midwest",              note:"Great Lakes & Plains" },
    TEXAS:   { label:"Texas & South-Central",note:"TX, OK, AR, LA" },
    MOUNTAIN:{ label:"Mountain West",        note:"CO, AZ, UT, NV, ID, MT" },
    WEST:    { label:"West Coast",           note:"CA, OR, WA, AK, HI" },
    US:      { label:"Anywhere in the US",   note:"national staples" }
  };
  var US_REGION_ORDER = ["US","NE","SOUTH","MIDWEST","TEXAS","MOUNTAIN","WEST"];
  function ffZip(){ return lsGet("ff_zip",""); }
  function ffRegionFromZip(z){
    z=String(z||"").trim(); if(!/^\d/.test(z)) return null;
    return ({"0":"NE","1":"NE","2":"SOUTH","3":"SOUTH","4":"MIDWEST","5":"MIDWEST","6":"MIDWEST","7":"TEXAS","8":"MOUNTAIN","9":"WEST"})[z.charAt(0)] || null;
  }
  function ffRegion(){
    var ov=lsGet("ff_region",null); if(ov && US_REGIONS[ov]) return ov;
    var byZip=ffRegionFromZip(ffZip()); if(byZip) return byZip;
    return "US";   // no regional bias until a ZIP pins a region (US timezones are too coarse)
  }
  // National foods (no .reg) are always eligible; regional foods only when a ZIP has
  // pinned a specific region (no bias in the generic "US" state).
  function ffFoodInRegion(f){ if(!f.reg) return true; var r=ffRegion(); return r!=="US" && f.reg.indexOf(r)>=0; }
  function ffName(f){ return f.n; }            // US names (kept as a single hook)
  function ffLabel(f){ return f.e+' '+f.serv+' '+f.n.toLowerCase(); }
  function ffParseQty(s){ if(s==="½")return .5; if(s==="¼")return .25; if(s==="¾")return .75; var v=parseFloat(s); return isNaN(v)?1:v; }
  function ffFmtQty(q){ q=Math.round(q*4)/4; var w=Math.floor(q+1e-9), fr=Math.round((q-w)*100)/100, fs={0:"",0.25:"¼",0.5:"½",0.75:"¾"}[fr]||""; if(w===0) return fs||"0"; return fs?(w+fs):(""+w); }
  // Scale a food's serving toward a macro target so portions are realistic (e.g. "6 oz chicken").
  function ffServLabel(f,mult){
    if(mult===1) return ffLabel(f);
    var m=/^([½¼¾]|[\d.]+)\s*(.*)$/.exec(f.serv||"");
    if(m){ var q=ffParseQty(m[1])*mult; return f.e+" "+ffFmtQty(q)+" "+m[2]+" "+ffName(f).toLowerCase(); }
    return f.e+" "+ffFmtQty(mult)+"× "+f.serv+" "+ffName(f).toLowerCase();
  }
  function ffProtScaled(list,target,roll,maxFat){
    var f=ffProtPick(list,target,roll); if(!f) return null;
    var mult = f.p>0 ? target/f.p : 1;
    mult = Math.max(1, Math.min(2.5, Math.round(mult*2)/2));   // 1–2.5× in half steps
    if(f.f>=10) mult=Math.min(mult,1.5);   // fatty proteins (eggs, salmon) — realistic portions
    if(maxFat!=null && f.f>0 && f.f*mult>maxFat){             // keep protein-borne fat inside the meal's fat budget
      mult=Math.max(0.5, Math.floor((maxFat/f.f)*2)/2);       // (a fatty protein can drop below one serving when fat is tight)
    }
    return { food:f, mult:mult, P:Math.round(f.p*mult), C:Math.round(f.c*mult), label:ffServLabel(f,mult) };
  }
  // pick & scale a fat source to cover a fat deficit (avocado, olive oil, nuts, PB)
  function ffPickFat(list,target,roll){
    if(!list.length) return null;
    var f=list[(roll||0)%list.length], mult=f.f>0?target/f.f:1;
    mult=Math.max(0.25, Math.min(1.5, Math.round(mult*4)/4));   // 0.25–1.5 in quarter steps (no overshoot)
    return { food:f, mult:mult, P:Math.round(f.p*mult), C:Math.round(f.c*mult), F:Math.round(f.f*mult), label:ffServLabel(f,mult) };
  }
  function ffServParse(serv){
    var m=/^([½¼¾]|[\d.]+)\s*([A-Za-z]+)?/.exec(serv||"");
    if(!m) return { qty:1, unit:"" };
    return { qty:ffParseQty(m[1]), unit:(m[2]||"").toLowerCase() };
  }
  function ffMealNames(n){
    if(n<=3) return ["Breakfast","Lunch","Dinner"];
    if(n===4) return ["Breakfast","Lunch","Snack","Dinner"];
    if(n===5) return ["Breakfast","Snack","Lunch","Snack","Dinner"];
    return ["Breakfast","Snack","Lunch","Snack","Dinner","Evening"];
  }
  // Macro-complete day planner: targets protein, carbs AND fat, and is meal-aware
  // (breakfast foods at breakfast; the biggest, fastest carbs around training).
  function ffPlanDay(p,t,roll){
    var n=Math.max(1,Math.min(6,t.m||4)), names=ffMealNames(n);
    var postIdx = n>=4 ? n-2 : (n-1);                         // the carb-loaded "around training" meal
    var w=[]; for(var i=0;i<n;i++) w.push(i===postIdx?1.6:(names[i]==="Snack"?0.7:1));
    var wsum=w.reduce(function(a,b){return a+b;},0)||1;
    var slots=[], totP=0,totC=0,totF=0;
    // Running budgets so the DAY sums to target instead of N independently-rounded meals.
    // Whole-food servings round up, so fixed per-meal aims drift OVER; here each meal aims at
    // what's left ÷ meals remaining, the last meal absorbs the remainder, and a meal with the
    // carb budget already spent gets no forced carb. ~30g of carbs is held back for the pre snack.
    var pLeft=t.p, fLeft=(t.f||60), preReserve=(n>=3?30:0), cLeft=Math.max(0,t.c-preReserve), wLeft=wsum;
    // Pass 1 — protein + carbs per meal (each carries its own natural fat)
    for(var j=0;j<n;j++){
      var isPost=(j===postIdx), mealsLeft=n-j, ctx=ffMealCtx(names[j]);
      var pAim=Math.max(1, Math.round(pLeft/mealsLeft));
      var cTarget=wLeft>0?Math.round(cLeft*w[j]/wLeft):0;
      var fatShare=Math.max(6, Math.round(fLeft/mealsLeft));   // this meal's fair share of the fat budget
      var ps=ffProtScaled(ffRoleList(p,'prot',ctx), pAim, roll+j, fatShare);
      // Post-workout SNACK meals get fast carbs; a post-workout MAIN meal keeps savory carbs
      // (white rice/potato are already fast) so dinner isn't steak + berries + honey.
      var snackCarb=isPost && ctx!=='main';
      var carbList=ffRoleList(p, snackCarb?'snack':'carb', snackCarb?null:ctx);
      if(!carbList.length) carbList=ffRoleList(p,'carb',ctx);
      // A veggie side rounds out the main meals (and surfaces liked/regional vegetables).
      var isMain=(names[j]==="Lunch"||names[j]==="Dinner"||names[j]==="Evening");
      var vlist=isMain?ffRoleList(p,'veg',null):[], veg=vlist.length?vlist[(roll+j)%vlist.length]:null;
      var protC=ps?ps.C:0, protF=ps?Math.round(ps.food.f*ps.mult):0;
      var cNeed=Math.max(0, cTarget-protC-(veg?veg.c:0));
      var combo=cNeed>=12 ? ffCarbCombo(carbList, cNeed, roll+j) : {picks:[],sum:0};
      var carbF=combo.picks.reduce(function(a,f){return a+f.f;},0);
      var labels=(ps?[ps.label]:[]).concat(combo.picks.map(ffLabel)).concat(veg?[ffLabel(veg)]:[]);
      var foods=[]; if(ps) foods.push({food:ps.food, servings:ps.mult});
      combo.picks.forEach(function(f){ foods.push({food:f, servings:1}); });
      if(veg) foods.push({food:veg, servings:1});
      var P=(ps?ps.P:0)+(veg?veg.p:0), C=protC+combo.sum+(veg?veg.c:0), F=protF+carbF+(veg?veg.f:0);
      totP+=P; totC+=C; totF+=F;
      pLeft-=P; cLeft-=C; wLeft-=w[j]; fLeft-=F;
      slots.push({ name:names[j], items:labels, foods:foods, P:P, C:C, F:F, post:isPost });
    }
    // Pass 1b — top up CARBS toward target if a few-meal day undershot (high per-meal carb
    // targets can outrun the liked foods). Adds into the biggest-carb meals until on target.
    var cgap=Math.round((t.c-preReserve)-totC);
    if(cgap>=15){
      var corder=slots.map(function(s,i){return i;}).sort(function(a,b){ return slots[b].C-slots[a].C; });
      for(var cc=0; cc<corder.length && cgap>=15; cc++){
        var sidx=corder[cc], cpool=ffRoleList(p,'carb',ffMealCtx(slots[sidx].name));   // carbs appropriate to THAT meal
        if(!cpool.length) continue;
        var add=ffCarbCombo(cpool, Math.min(cgap,35), roll+sidx+3);   // cap per meal so it spreads, not one kitchen-sink meal
        add.picks.forEach(function(f){
          slots[sidx].items.push(ffLabel(f)); slots[sidx].foods.push({food:f, servings:1});
          slots[sidx].P+=f.p; slots[sidx].C+=f.c; slots[sidx].F+=f.f;
          totP+=f.p; totC+=f.c; totF+=f.f; cgap-=f.c;
        });
      }
    }
    // Pass 2 — top up FAT to the daily target only, into the lowest-fat meals (avoids overshoot)
    var gap=Math.round((t.f||60)-totF);
    if(gap>=6){
      var order=slots.map(function(s,i){return i;}).sort(function(a,b){ return slots[a].F-slots[b].F; });
      for(var k=0;k<order.length && gap>=6;k++){
        var si=order[k], fpool=ffRoleList(p,'fat',ffMealCtx(slots[si].name));   // dinner fats stay savory; spreads only at breakfast/snack
        var fat=fpool.length?ffPickFat(fpool, Math.min(gap,20), roll+si):null;
        if(!fat) continue;
        slots[si].items.push(fat.label); slots[si].foods.push({food:fat.food, servings:fat.mult});
        slots[si].P+=fat.P; slots[si].C+=fat.C; slots[si].F+=fat.F;
        totP+=fat.P; totC+=fat.C; totF+=fat.F; gap-=fat.F;
      }
    }
    // Split training fuel into a small PRE-workout fast-carb snack + the POST-workout meal.
    if(n>=3){
      var pidx=-1; for(var pi=0;pi<slots.length;pi++){ if(slots[pi].post){ pidx=pi; break; } }
      if(pidx>=0){
        var fastPool=ffRoleList(p,'snack',null).filter(function(f){ return f.cat==='fast'||f.cat==='fruit'; });
        if(!fastPool.length) fastPool=ffRoleList(p,'snack',null);
        var pre=ffCarbCombo(fastPool, 30, roll+7);
        if(pre.picks.length){
          var preF=pre.picks.reduce(function(a,f){return a+f.f;},0), preP=pre.picks.reduce(function(a,f){return a+f.p;},0);
          slots.splice(pidx, 0, { name:"Pre-workout", items:pre.picks.map(ffLabel),
            foods:pre.picks.map(function(f){return {food:f, servings:1};}), P:preP, C:pre.sum, F:preF, pre:true });
          totP+=preP; totC+=pre.sum; totF+=preF;
        }
      }
    }
    // Final reconcile: discrete whole-food servings round up, and topping one macro can nudge
    // another over. Trim whatever overshot (worst macro first, biggest contributor in ½-serving
    // steps) and rebuild every plate's labels + macros from its foods, so the plate, the per-meal
    // numbers and the day total all agree and land at — not over — your targets.
    ffReconcile(slots, {P:t.p, C:t.c, F:(t.f||60)});
    var TP=0,TC=0,TF=0; slots.forEach(function(s){ TP+=s.P; TC+=s.C; TF+=s.F; });
    return { slots:slots, totals:{P:TP,C:TC,F:TF}, target:{P:t.p,C:t.c,F:(t.f||60)} };
  }
  function ffReconcile(slots, target){
    function rebuild(s){
      var P=0,C=0,F=0;
      s.foods.forEach(function(x){ P+=x.food.p*x.servings; C+=x.food.c*x.servings; F+=x.food.f*x.servings; });
      s.P=Math.round(P); s.C=Math.round(C); s.F=Math.round(F);
      s.items=s.foods.map(function(x){ return ffServLabel(x.food, x.servings); });
    }
    function totals(){ var T={p:0,c:0,f:0}; slots.forEach(function(s){ s.foods.forEach(function(x){ T.p+=x.food.p*x.servings; T.c+=x.food.c*x.servings; T.f+=x.food.f*x.servings; }); }); return T; }
    var tgt={p:target.P,c:target.C,f:target.F}, tol={p:8,c:12,f:6};
    for(var pass=0; pass<80; pass++){
      var T=totals(), M=null, mx=0;
      ['f','p','c'].forEach(function(k){ var over=T[k]-tgt[k]-tol[k]; if(over>mx){ mx=over; M=k; } });   // fat first, then protein, then carbs
      if(!M) break;
      var best=null, bv=0;
      slots.forEach(function(s,si){ s.foods.forEach(function(x,xi){ var c=x.food[M]*x.servings; if(x.servings>0.5 && c>bv){ bv=c; best=[si,xi]; } }); });
      if(!best) break;
      var fx=slots[best[0]].foods[best[1]];
      fx.servings=Math.round((fx.servings-0.5)*2)/2;
      if(fx.servings<0.5) slots[best[0]].foods.splice(best[1],1);
    }
    slots.forEach(rebuild);
  }
  // Aggregate a day's foods into a shopping list with summed quantities.
  function ffShopping(slots){
    var agg={}, order=[];
    slots.forEach(function(s){ s.foods.forEach(function(x){
      if(!agg[x.food.id]){ agg[x.food.id]={food:x.food, servings:0}; order.push(x.food.id); }
      agg[x.food.id].servings+=x.servings;
    }); });
    return order.map(function(id){
      var a=agg[id], ps=ffServParse(a.food.serv);
      return { food:a.food, qty:ps.qty*a.servings, unit:ps.unit, servings:a.servings };
    });
  }
  function ffPlural(unit,q){
    if(q<=1) return unit;
    if(unit==="cup") return "cups";
    if(/^(date|cake|slice|scoop|bottle|can|bar|treat|block)$/.test(unit)) return unit+"s";
    return unit;
  }
  function ffQtyLabel(it){
    if(!it.unit){ var s=Math.max(1,Math.round(it.servings)); return s>1?("×"+s):"1"; }
    var measure=(it.unit==="oz"||it.unit==="cup"||it.unit==="tbsp");
    var q=measure ? Math.round(it.qty*2)/2 : Math.max(1,Math.round(it.qty));
    return ffFmtQty(q)+" "+ffPlural(it.unit,q);
  }
  function ffTotCell(label,val,target,cls){
    var ok = target ? Math.abs(val-target)<=Math.max(8,target*0.12) : false;
    return '<div class="ffm-tot-cell '+cls+(ok?' ok':'')+'"><div class="ttc-v">'+val+'<small>/'+target+'g</small></div><div class="ttc-l">'+label+'</div></div>';
  }

  function ffPrefsPrompt(p){
    function names(ids){ return (ids||[]).map(function(id){ var f=ffFind(FF_FOODS,id); return f?f.n:null; }).filter(Boolean); }
    var liked=names(p.liked), avoid=names(p.avoid),
        restrict=(p.restrict||[]).map(function(id){ var r=ffFind(FF_RESTRICT,id); return r?r.label:null; }).filter(Boolean);
    var parts=[];
    if(liked.length) parts.push("Foods I like: "+liked.join(", ")+".");
    if(avoid.length) parts.push("Please avoid: "+avoid.join(", ")+".");
    if(restrict.length) parts.push("Hard dietary restrictions (never include): "+restrict.join(", ")+".");
    return parts.join(" ");
  }
  function ffAskCoach(kind){
    var p=ffPrefs(), pp=ffPrefsPrompt(p);
    var prompt = kind==="week"
      ? "Build me a simple 1-day repeatable meal plan plus a short grocery list that hits my macro targets. "+pp+" Realistic and low-fuss — breakfast as breakfast, faster carbs around training, keep fat moderate."
      : "Give me 3 simple meal ideas I can actually make that hit my per-meal protein and carbs, built around foods I like. "+pp+" Use cooked weights and keep fat in check.";
    if(window.FFCoach && window.FFCoach.ready()) window.FFCoach.ask(prompt, kind==="week"?"Your meal plan":"Meal ideas");
  }

  function ffTargets(){
    var tg=lsGet("ff_targets",null);
    var f=(tg && tg.fatG)?tg.fatG:60;
    if(lastFood) return { p:lastFood.p, c:lastFood.c, f:f, m:lastFood.m };
    if(tg && tg.proteinG) return { p:tg.proteinG, c:tg.carbG, f:f, m:(state.meals||MEALS_REC[state.goal]||4) };
    return null;
  }
  function ffItemsHtml(labels){ return labels.map(function(l){ return '<span class="ffm-it">'+l+'</span>'; }).join('<span class="ffm-plus">+</span>'); }
  function ffMealTag(s){ return s.pre?' <em>· fast carbs before</em>':(s.post?' <em>· post-workout recovery</em>':''); }

  function renderFFMeals(){
    var card=$("ffMealsCard"), el=$("ffMeals"); if(!el) return;
    try{ applyFoodFoldPrefs(); }catch(e){}
    var t=ffTargets();
    if(!t){ if(card) card.hidden=true; el.innerHTML=""; return; }
    if(card) card.hidden=false;
    var p=ffPrefs(), hasPrefs=ffHasPrefs(p), html="";
    // 1. Carb timing around training — "when to eat" sits right above "what to eat".
    if(lastMealPlan && lastMealPlan.timing){ try{ html+=timingBlock(lastMealPlan.timing); }catch(e){} }
    if(!hasPrefs){
      // 2a. The generic per-meal split (the schedule the calculator builds) + an upgrade nudge.
      if(lastMealPlan && lastMealPlan.meal){ try{ html+=mealBlock(lastMealPlan.meal); }catch(e){} }
      html+='<div class="ffm-cta"><div class="ffm-cta-ic">🍽️</div>'+
        '<div class="ffm-cta-tx"><b>Make these meals yours</b><span>Swap the example foods for the ones you actually eat — we’ll rebuild this split and a shopping list around them.</span></div>'+
        '<button type="button" class="ffm-cta-btn" data-ffaction="edit">Pick my foods</button></div>';
    } else {
      // 2b. The same per-meal split, built from foods you love, with a one-day shopping list.
      var plan=ffPlanDay(p,t,ffRoll);
      html+='<div class="meals"><div class="meals-head"><span>🍽️ Your Meals</span>'+
        '<span class="meal-pick"><span class="meal-pick-lbl">meals/day</span><span class="seg meal-seg">'+
          [3,4,5,6].map(function(n){ return '<button type="button" data-meals="'+n+'"'+((t.m||4)===n?' class="active"':'')+'>'+n+'</button>'; }).join("")+
        '</span></span></div><div class="meals-body">';
      html+='<div class="sched-title">'+ffIcon("calendar",14)+' Your day — <b>'+(t.m||4)+' meals</b>, built around <b>foods you love</b></div>';
      plan.slots.forEach(function(s){
        html+='<div class="ffm-meal"><div class="ffm-meal-h">'+s.name+ffMealTag(s)+' <span>≈ '+s.P+'P · '+s.C+'C · '+s.F+'F</span></div>'+
          '<div class="ffm-items">'+ffItemsHtml(s.items)+'</div></div>';
      });
      var tt=plan.totals, tg2=plan.target;
      html+='<div class="ffm-tot"><div class="ffm-tot-h">Day total vs your target</div><div class="ffm-tot-row">'+
        ffTotCell('Protein',tt.P,tg2.P,'p')+ffTotCell('Carbs',tt.C,tg2.C,'c')+ffTotCell('Fat',tt.F,tg2.F,'f')+'</div></div>';
      var shop=ffShopping(plan.slots);
      if(shop.length){
        html+='<div class="ffm-groc"><div class="ffm-groc-h">🛒 Shopping list <span>· one day</span></div><ul class="ffm-shop">'+
          shop.map(function(it){ return '<li><span class="shop-n">'+it.food.e+' '+ffName(it.food)+'</span><span class="shop-q">'+ffQtyLabel(it)+'</span></li>'; }).join("")+'</ul></div>';
      }
      html+='<div class="ffm-acts">'+
        '<button type="button" class="ffm-act" data-ffaction="reroll">🔁 Shuffle</button>'+
        '<button type="button" class="ffm-act" data-ffaction="ideas">🤖 Coach ideas</button>'+
        '<button type="button" class="ffm-act" data-ffaction="week">🗓️ Plan my week</button>'+
        '<button type="button" class="ffm-act" data-ffaction="edit">✏️ Edit foods</button></div>';
      html+='<div class="meal-foot">Macro-complete — protein, carbs <b>and</b> fat all targeted. Portions are starting points; faster carbs cluster around training.</div>';
      html+='</div></div>';
    }
    el.innerHTML=html;
    if(!ffMealsBound && card){
      ffMealsBound=true;
      card.addEventListener("click", function(e){
        var row=e.target.closest(".sched-row.tappable");
        if(row){ row.classList.toggle("open"); return; }   // tap a meal for a food example
        var mb=e.target.closest("[data-meals]");
        if(mb){ state.meals=parseInt(mb.getAttribute("data-meals"),10); calc(); return; }
        var b=e.target.closest("[data-ffaction]"); if(!b) return;
        var act=b.getAttribute("data-ffaction");
        if(act==="edit") openFoodPrefs();
        else if(act==="reroll"){ ffRoll++; renderFFMeals(); }
        else if(act==="ideas") ffAskCoach("ideas");
        else if(act==="week") openWeekPlan();
      });
    }
  }
  function ffHasLikes(p){ return p.liked && p.liked.length; }

  /* Favorites editor — a light modal reused from onboarding + Settings. */
  function openFoodPrefs(){
    var m=$("ffPrefsModal");
    if(!m){
      m=document.createElement("div"); m.id="ffPrefsModal"; m.className="swap-modal"; m.hidden=true;
      m.innerHTML='<div class="swap-card ffp-card"><div class="swap-head"><span>🍽️ Your favorite foods</span>'+
        '<button class="swap-x" id="ffPrefsX" type="button" aria-label="Close">×</button></div>'+
        '<div class="swap-body" id="ffPrefsBody"></div>'+
        '<div class="ffp-donebar"><button type="button" class="ffp-donebtn" id="ffPrefsDone">Done</button></div></div>';
      document.body.appendChild(m);
      m.addEventListener("click", function(e){ if(e.target===m || e.target.closest("#ffPrefsX") || e.target.closest("#ffPrefsDone")) closeFoodPrefs(); });
      var body=m.querySelector("#ffPrefsBody");
      body.addEventListener("click", function(e){
        var fb=e.target.closest("[data-fff]"), rb=e.target.closest("[data-ffr]");
        if(!fb && !rb) return;
        var p=ffPrefs();
        if(fb) ffCycleFood(p, fb.getAttribute("data-fff"));
        if(rb) ffToggleRestrict(p, rb.getAttribute("data-ffr"));
        ffSavePrefs(p); body.innerHTML=ffPickerHtml(p);
      });
      body.addEventListener("input", function(e){
        if(e.target.id==="ffZipInput"){
          var z=e.target.value.replace(/\D/g,"").slice(0,5); if(z!==e.target.value) e.target.value=z;
          lsSet("ff_zip", z); localStorage.removeItem("ff_region");
          var lbl=body.querySelector(".ffp-reg"); if(lbl) lbl.textContent="📍 "+(US_REGIONS[ffRegion()]||US_REGIONS.US).label;
        }
      });
      body.addEventListener("change", function(e){ if(e.target.id==="ffZipInput"){ body.innerHTML=ffPickerHtml(ffPrefs()); } });
    }
    $("ffPrefsBody").innerHTML=ffPickerHtml(ffPrefs());
    m.hidden=false; document.body.style.overflow="hidden";
  }
  function closeFoodPrefs(){
    var m=$("ffPrefsModal"); if(m) m.hidden=true; document.body.style.overflow="";
    try{ persist(); }catch(e){}
    try{ renderFFMeals(); }catch(e){}
    try{ if(curView==="account") renderAccount(); }catch(e){}
  }

  /* ===== Weekly meal plan + whole-week shopping list (opt-in sheet) ===== */
  function ffWeekPlans(p,t){ var days=[]; for(var d=0; d<7; d++) days.push(ffPlanDay(p,t,(ffWeekRoll*97)+(d*7)+1)); return days; }
  function ffWeekQty(it){
    if(it.unit==="oz"){ var oz=Math.round(it.qty); return oz>=16 ? (Math.round(oz/16*10)/10)+" lb" : oz+" oz"; }
    if(!it.unit) return "×"+Math.max(1,Math.round(it.servings));
    var measure=(it.unit==="cup"||it.unit==="tbsp"), q=measure?Math.round(it.qty*2)/2:Math.max(1,Math.round(it.qty));
    return ffFmtQty(q)+" "+ffPlural(it.unit,q);
  }
  function ffWeekGroups(days){
    var allSlots=[]; days.forEach(function(pl){ allSlots=allSlots.concat(pl.slots); });
    var shop=ffShopping(allSlots), groups={};
    shop.forEach(function(it){ var a=FF_AISLE[it.food.cat]||"🛒 Other"; (groups[a]=groups[a]||[]).push(it); });
    return groups;
  }
  function ffWeekBodyHtml(){
    var p=ffPrefs(), t=ffTargets();
    if(!t) return '<div class="ffm-day-note">Add your numbers on the Fuel tab first, then come back to plan your week.</div>';
    var days=ffWeekPlans(p,t), d=Math.max(0,Math.min(6, ffWeekDay||0)), plan=days[d];
    var strip='<div class="ffw-strip">'+days.map(function(_,i){ return '<button type="button" class="ffw-day'+(i===d?' on':'')+'" data-ffwday="'+i+'">Day '+(i+1)+'</button>'; }).join("")+'</div>';
    var meals=''; plan.slots.forEach(function(s){
      meals+='<div class="ffm-meal"><div class="ffm-meal-h">'+s.name+ffMealTag(s)+' <span>≈ '+s.P+'P · '+s.C+'C · '+s.F+'F</span></div><div class="ffm-items">'+ffItemsHtml(s.items)+'</div></div>';
    });
    var tt=plan.totals, tg=plan.target;
    var totals='<div class="ffm-tot"><div class="ffm-tot-row">'+ffTotCell('Protein',tt.P,tg.P,'p')+ffTotCell('Carbs',tt.C,tg.C,'c')+ffTotCell('Fat',tt.F,tg.F,'f')+'</div></div>';
    var groups=ffWeekGroups(days), groc='<div class="ffm-groc"><div class="ffm-groc-h">🛒 Whole-week shopping list <span>· 7 days</span></div>';
    FF_AISLE_ORDER.concat(["🛒 Other"]).forEach(function(a){ if(!groups[a]) return;
      groc+='<div class="ffw-aisle">'+a+'</div><ul class="ffm-shop">'+groups[a].map(function(it){ return '<li><span class="shop-n">'+it.food.e+' '+ffName(it.food)+'</span><span class="shop-q">'+ffWeekQty(it)+'</span></li>'; }).join("")+'</ul>';
    });
    groc+='<button type="button" class="ffw-copy" data-ffwcopy="1">📋 Copy shopping list</button></div>';
    return '<div class="ffw-intro">Seven varied days, each balanced to your daily target. Tap a day to see its meals — then shop the whole week in one trip below.</div>'+
      strip+
      '<div class="ffw-dayhdr"><span>Day '+(d+1)+' · '+(t.m||4)+' meals</span><button type="button" class="ffm-mini" data-ffwshuffle="1">🔁 Shuffle week</button></div>'+
      meals+totals+groc;
  }
  function ffCopyWeekList(btn){
    var p=ffPrefs(), t=ffTargets(); if(!t) return;
    var groups=ffWeekGroups(ffWeekPlans(p,t)), lines=["FairwayFuel — 7-day shopping list",""];
    FF_AISLE_ORDER.concat(["🛒 Other"]).forEach(function(a){ if(!groups[a]) return;
      lines.push(a.replace(/^\S+\s/,"").toUpperCase());
      groups[a].forEach(function(it){ lines.push("- "+ffName(it.food)+" — "+ffWeekQty(it)); });
      lines.push("");
    });
    ffCopyText(lines.join("\n"), btn);
  }
  function ffCopyText(text, btn){
    function done(){ if(btn){ var o=btn.textContent; btn.textContent="Copied ✓"; setTimeout(function(){ btn.textContent=o; },1600); } }
    function fallback(){ try{ var ta=document.createElement("textarea"); ta.value=text; ta.style.position="fixed"; ta.style.opacity="0"; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand("copy"); ta.remove(); done(); }catch(e){} }
    try{ if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(done, fallback); return; } }catch(e){}
    fallback();
  }
  function openWeekPlan(){
    var m=$("ffWeekModal");
    if(!m){
      m=document.createElement("div"); m.id="ffWeekModal"; m.className="swap-modal"; m.hidden=true;
      m.innerHTML='<div class="swap-card ffp-card"><div class="swap-head"><span>🗓️ Your week</span><button class="swap-x" id="ffWeekX" type="button" aria-label="Close">×</button></div><div class="swap-body" id="ffWeekBody"></div></div>';
      document.body.appendChild(m);
      m.addEventListener("click", function(e){
        if(e.target===m || e.target.closest("#ffWeekX")){ closeWeekPlan(); return; }
        var db=e.target.closest("[data-ffwday]"); if(db){ ffWeekDay=parseInt(db.getAttribute("data-ffwday"),10); $("ffWeekBody").innerHTML=ffWeekBodyHtml(); $("ffWeekBody").scrollTop=0; return; }
        if(e.target.closest("[data-ffwshuffle]")){ ffWeekRoll++; ffWeekDay=0; $("ffWeekBody").innerHTML=ffWeekBodyHtml(); return; }
        var cp=e.target.closest("[data-ffwcopy]"); if(cp){ ffCopyWeekList(cp); return; }
      });
    }
    ffWeekDay=0; $("ffWeekBody").innerHTML=ffWeekBodyHtml();
    m.hidden=false; document.body.style.overflow="hidden";
  }
  function closeWeekPlan(){ var m=$("ffWeekModal"); if(m) m.hidden=true; document.body.style.overflow=""; }

  // Prominent "how fast should the scale move" band under the calorie hero.
  function targetBand(w,goal){
    if(!w){
      return '<div class="target hold"><div class="target-h">Goal: hold your weight</div>'+
        '<div class="target-sub">In-season maintenance — the scale should stay <b>flat</b>. '+
        'If it drifts more than ~1 lb/week either way, nudge carbs up or down.</div></div>';
    }
    var cls=w.gain?"gain":"loss", verb=w.gain?"gain":"lose", arrow=w.gain?"▲":"▼";
    return '<div class="target '+cls+'">'+
      '<div class="target-h">'+arrow+' Weekly target: '+verb+' <b>'+w.lo+'–'+w.hi+' lb/week</b></div>'+
      '<div class="target-sub">That’s about <b>'+w.loMo+'–'+w.hiMo+' lb/month</b>. '+
      'Weigh in 3–4×/week, same conditions, and track the <b>weekly average</b> — not any single day. '+
      (w.gain
        ? 'Going faster than this is mostly fat, not muscle. If the scale stalls 2+ weeks, add ~100–150 carbs.'
        : 'Going faster than this costs muscle and speed. If you stall 2+ weeks, trim ~100–150 carbs.')+
      '</div></div>';
  }

  /* ----- Collapse the calculator into a compact "Your numbers" summary once it's set.
     The inputs rarely change after setup, so returning users see a one-line summary they
     tap to edit — keeping the Fuel page focused on targets + meals. ----- */
  var calcCollapsed = false;
  function calcSummaryHtml(t){
    function v(id){ return $(id)?($(id).value||"").trim():""; }
    var w=v("weight"), a=v("age"), hf=v("heightFt"), hin=v("heightIn");
    var goal=(t&&t.goal) || (GOALS[state.goal]&&GOALS[state.goal].label) || "Your numbers";
    var bits=[]; if(w) bits.push(w+" lb"); if(hf) bits.push(hf+"′"+(hin||0)+"″"); if(a) bits.push(a+" yr");
    if(t&&t.kcal) bits.push(t.kcal+" kcal");
    return '<div class="cs-line"><span class="cs-ic">🧮</span><span class="cs-tx"><b>'+goal+'</b><span>'+bits.join(" · ")+'</span></span>'+
      '<button type="button" class="cs-edit" data-calcedit="1">'+(calcCollapsed?"Edit":"▴ Done")+'</button></div>';
  }
  function applyCalcCollapse(){
    var f=$("calcForm"), s=$("calcSummary"); if(!f||!s) return;
    var t=lsGet("ff_targets",null), has=!!(t&&t.kcal);
    if(!has){ f.hidden=false; s.hidden=true; return; }    // brand-new user → full form, no summary
    s.hidden=false; s.innerHTML=calcSummaryHtml(t); f.hidden=calcCollapsed;
  }
  function render(r){
    var totalK=r.proteinKcal+r.fatKcal+r.carbKcal;
    var pPct=totalK?r.proteinKcal/totalK*100:0, cPct=totalK?r.carbKcal/totalK*100:0, fPct=totalK?r.fatKcal/totalK*100:0;
    var pctTxt = r.pct===0?"maintenance":(r.pct>0?"+"+Math.round(r.pct*100)+"% surplus":Math.round(r.pct*100)+"% deficit");
    var deltaKcal=round(r.target-r.tdee);
    var deltaTxt = deltaKcal===0?"±0 kcal/day":(deltaKcal>0?"+"+deltaKcal+" kcal/day":deltaKcal+" kcal/day");

    var adjNow=lsGet("ff_kcal_adj",0);
    var html="";
    html+='<div class="result-hero">'+
      '<div class="kcal">'+round(totalK)+' <small>kcal/day</small></div>'+
      '<div class="goal-label">'+r.goal.label+' &middot; '+pctTxt+'</div>'+
      '<div class="tdee-line">Maintenance (TDEE): <b>'+round5(r.tdee)+' kcal</b> &nbsp;·&nbsp; Goal target: <b>'+round5(r.target)+' kcal</b> ('+deltaTxt+')</div>'+
      (adjNow!==0 ? '<div class="tuned-note">📊 Tuned <b>'+(adjNow>0?'+':'')+adjNow+' kcal</b> from your actual weight trend</div>' : '')+
      '</div>';
    html+=targetBand(r.weekly,r.goal);
    html+='<div class="macros">'+
      macroCard("p","Protein",r.proteinG,r.proteinKcal,pPct)+
      macroCard("c","Carbs",r.carbG,r.carbKcal,cPct)+
      macroCard("f","Fat",r.fatG,r.fatKcal,fPct)+'</div>';
    html+='<div class="golf-note"><b>⛳ '+r.goal.label+':</b> '+r.goal.note+'</div>';
    html+='<details class="fold"><summary>How this is calculated</summary><div class="fold-body breakdown"><table>'+
      tr("BMR (Mifflin–St Jeor)",round5(r.bmr)+" kcal")+
      tr("Activity multiplier","×"+r.activity+" ("+ACTIVITY_LABELS[String(r.activity)]+")")+
      tr("TDEE / Maintenance",round5(r.tdee)+" kcal")+
      tr("Goal adjustment",deltaTxt)+
      tr("Daily target",round5(r.target)+" kcal")+
      tr("Protein",Math.round(r.goal.proteinPct*100)+"% of calories ("+r.proteinG+" g)")+
      tr("Fat","set target ("+r.fatG+" g)")+
      tr("Carbs","the rest ("+r.carbG+" g)")+
      '</table></div></details>';
    $("results").innerHTML=html;
  }
  function macroCard(cls,label,grams,kcal,pct){
    return '<div class="macro '+cls+'"><div class="mlabel">'+label+'</div>'+
      '<div class="mg">'+round(grams)+'<small>g</small></div>'+
      '<div class="mkcal">'+round(kcal)+' kcal · '+Math.round(pct)+'%</div>'+
      '<div class="mbar"><i style="width:'+Math.min(100,pct)+'%"></i></div></div>';
  }
  function tr(a,b){ return '<tr><td>'+a+'</td><td>'+b+'</td></tr>'; }
