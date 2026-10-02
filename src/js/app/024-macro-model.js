  /* ===================== PURE MACRO MODEL =====================
     DOM-free so boundary cases can be tested in Node. Protein and fat scale
     from body weight rather than calories; a BMI-30 reference cap prevents
     extreme prescriptions when total weight is a poor lean-mass proxy.
     The day's meal split, the weight-trend fit and the check-in call live here
     too, so the Fuel tab, the check-in card and the tests share one copy. */
  function ffRound5(n){ return Math.round(n/5)*5; }
  function ffClamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
  // Body-mass index from the calculator's units (lb, cm). 0 when unknown.
  function ffBmi(weightLb, heightCm){
    var kg=(Number(weightLb)||0)/2.20462, m=(Number(heightCm)||0)/100;
    return kg>0 && m>0 ? kg/(m*m) : 0;
  }
  // The goal we suggest from height and weight. It only recommends: the user
  // picks anything, and BMI can't tell muscle from fat, so the copy around it
  // says so. BMI 30+ → Lean Out (heavy lifting + high protein still builds
  // muscle in a deficit; a surplus there mostly adds fat), 27–30 → hold weight
  // and recomp, otherwise Lean Bulk. Keys stay leanbulk|bulk|maintain|cut.
  function ffSuggestGoal(weightLb, heightCm){
    var bmi=ffBmi(weightLb, heightCm);
    return bmi>=30 ? "cut" : (bmi>=27 ? "maintain" : "leanbulk");
  }
  // Total weight is a poor lean-mass proxy above BMI 30, so protein, fat and
  // the GAIN rate scale from the weight at BMI 30 (never above actual weight).
  function ffReferenceLb(weightLb, heightCm){
    var w=Math.max(0,Number(weightLb)||0), m=Math.max(0,Number(heightCm)||0)/100;
    var bmi30Lb=m>0 ? 30*m*m*2.20462 : w;
    return Math.min(w, bmi30Lb||w);
  }
  // Signed lb/week for a goal's weekly fraction of bodyweight. Gains scale from
  // the reference weight, losses from total weight (the usual %-of-bodyweight
  // band). The Fuel scale band and the check-in both read this one function.
  function ffWeeklyLb(frac, weightLb, heightCm){
    frac=Number(frac)||0;
    return frac*(frac>0 ? ffReferenceLb(weightLb, heightCm) : Math.max(0,Number(weightLb)||0));
  }
  function ffMacroTargets(input){
    var weightLb=Math.max(0,Number(input.weightLb)||0);
    var heightCm=Math.max(0,Number(input.heightCm)||0);
    var target=Math.max(0,Number(input.targetKcal)||0)+(Number(input.kcalAdj)||0);
    var proteinPerLb=Number(input.proteinPerLb)||0.9;
    var fatPerLb=Number(input.fatPerLb)||0.35;
    var referenceLb=ffReferenceLb(weightLb,heightCm);
    var proteinG=ffRound5(referenceLb*proteinPerLb);
    var fatG=ffRound5(ffClamp(referenceLb*fatPerLb,45,100));
    // Safety floor: check-in nudges and small bodies must never prescribe below a
    // sane minimum (input.floorKcal, e.g. 1200 women / 1500 men). And the shown
    // target is never below protein+fat alone, so screen, stored targets and the
    // coach all agree on one number.
    var floorKcal=Math.max(0,Number(input.floorKcal)||0);
    var raw=target;
    target=Math.max(target,floorKcal);
    // Fat never below input.fatMinPct of calories (AMDR 20–35%; ACSM/AND/DC 2016
    // discourages <20%). Rounded UP to 5 g so it never lands at 19.8%, and it may
    // pass the 100 g clamp on a very big target. The difference comes out of carbs.
    var fatMinPct=Math.max(0,Number(input.fatMinPct)||0);
    if(fatMinPct>0) fatG=Math.max(fatG, Math.ceil(target*fatMinPct/45-1e-9)*5);
    var carbG=ffRound5(Math.max(0,(target-proteinG*4-fatG*9)/4));
    target=Math.max(target,proteinG*4+fatG*9+carbG*4);
    // floored = the safety floor is what set the number (raw at or below it) —
    // true even when the protein+fat guard then lifts it a few kcal (1205).
    return { target:target, raw:raw, floorKcal:floorKcal, floored:floorKcal>0 && raw<=floorKcal+0.5,
      referenceLb:referenceLb, proteinG:proteinG, fatG:fatG, carbG:carbG,
      proteinKcal:proteinG*4, fatKcal:fatG*9, carbKcal:carbG*4 };
  }

  // One pure call for the calculator (025 calc) and the tests: Mifflin–St Jeor
  // BMR → TDEE → the goal target, lifted to the safety floor (1200 women / 1500
  // men), then tuned by the check-in adjustment — clamped to the range that can
  // still move the target — and split into macros. o = { sex, age, weightLb,
  // heightCm, activity, goal (a GOALS entry), kcalAdj, fatMinPct }.
  function ffDayTargets(o){
    var weightLb=Math.max(0,Number(o.weightLb)||0), heightCm=Math.max(0,Number(o.heightCm)||0);
    var bmr=10*(weightLb/2.20462)+6.25*heightCm-5*(Number(o.age)||0)+(o.sex==="male"?5:-161);
    var tdee=bmr*(Number(o.activity)||0);
    var floorKcal=(o.sex==="female"?1200:1500);
    // Tuning moves the target from the floored base, so a nudge the floor
    // would swallow is never stored or offered (ffAdjRange / ffCheckin).
    var baseTarget=Math.max(tdee*(1+o.goal.pct), floorKcal);
    // Whole kcal: the base has decimals, and a raw clamp showed "Tuned −81.0737… kcal".
    var adjR=ffAdjRange(baseTarget, floorKcal), effAdj=Math.round(ffClamp(Number(o.kcalAdj)||0, adjR.lo, adjR.hi));
    var macroIn={ weightLb:weightLb, heightCm:heightCm, targetKcal:baseTarget, kcalAdj:effAdj,
      proteinPerLb:o.goal.proteinPerLb, fatPerLb:o.goal.fatPerLb, fatMinPct:o.fatMinPct, floorKcal:floorKcal };
    return { bmr:bmr, tdee:tdee, floorKcal:floorKcal, baseTarget:baseTarget, lo:adjR.lo, hi:adjR.hi,
      effAdj:effAdj, macroIn:macroIn, macro:ffMacroTargets(macroIn) };
  }

  /* ----- The day's meal split ----- */
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
  // Relative weights — dinner biggest, breakfast carries more fat (eggs), snacks light.
  var FF_ROLEW = {
    Breakfast:{p:0.95,c:1.05,f:1.25}, Lunch:{p:1.05,c:1.00,f:1.00},
    Dinner:{p:1.15,c:0.90,f:1.35}, Snack:{p:0.70,c:0.80,f:0.55}
  };
  // o = { proteinG, fatG, carbG, mealN, anchor (training hour, 24h), rest }.
  // Returns the main meals (time in hours, label, p/c/f, isPost/isPreMeal), the
  // separate carb-only pre-workout snack, and whether pre merged into a meal.
  function ffMealPlan(o){
    var mealN=Math.max(1, o.mealN|0), rest=!!o.rest;
    var postT=o.anchor+1.5, preT=o.anchor-1.5;
    var FIRST=7.5, LAST=20.0;                     // eating window 7:30 AM – 8:00 PM
    var meals=[];
    for(var mi=0; mi<mealN; mi++){
      meals.push({ time: mealN===1 ? 12.5 : FIRST + mi*(LAST-FIRST)/(mealN-1), isPost:false });
    }
    // The meal nearest the post-workout window becomes the post-workout meal.
    // (Rest day: no workout window — leave every meal a plain meal.)
    if(!rest){
      var ni=0, best=99; meals.forEach(function(m,i){ var d=Math.abs(m.time-postT); if(d<best){best=d;ni=i;} });
      meals[ni].time=postT; meals[ni].isPost=true;
      meals.sort(function(a,b){ return a.time-b.time; });
    }
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
    // (Rest day: no pre-workout window — skip the pre snack and the pre flag.)
    var preIdx=0, preDist=99;
    meals.forEach(function(m,i){ var d=Math.abs(m.time-preT); if(d<preDist){ preDist=d; preIdx=i; } });
    var preMerged = rest || (preDist<=0.75 && !meals[preIdx].isPost);
    if(preMerged && !rest) meals[preIdx].isPreMeal=true;
    // Protein & fat split across the main meals. The post-workout feeding gets at
    // least a main meal's protein share whatever its clock label — an afternoon
    // lifter's 5:30 PM "Snack" used to get the day's smallest dose right after
    // lifting. It stays lighter on fat to leave room for the carbs.
    var pArr=distribute5(o.proteinG, meals.map(function(m){ var p=FF_ROLEW[m.label].p; return m.isPost ? Math.max(p, FF_ROLEW.Lunch.p) : p; }));
    var fArr=distribute5(o.fatG, meals.map(function(m){ return m.isPost ? FF_ROLEW[m.label].f*0.35 : FF_ROLEW[m.label].f; }));
    meals.forEach(function(m,i){ m.p=pArr[i]; m.f=fArr[i]; });
    // Carbs split across ALL feedings (main meals + pre-workout snack) — so the pre and
    // post amounts shrink naturally as you add meals, instead of being a fixed % of the day.
    var pre = { kind:"pre", time:preT, label:"Pre-workout", p:0, f:0 };
    var carbFeeds = meals.map(function(m){
      var w = m.isPost ? 1.6 : FF_ROLEW[m.label].c;
      if(m.isPreMeal) w += 0.6;                   // this meal doubles as pre-workout fuel
      return { ref:m, w:w };
    });
    if(!preMerged) carbFeeds.push({ ref:pre, w:0.8 });   // separate top-off snack
    var cArr=distribute5(o.carbG, carbFeeds.map(function(f){ return f.w; }));
    carbFeeds.forEach(function(f,i){ f.ref.c=cArr[i]; });
    var postMeal=meals[0], preMeal=meals[0];
    meals.forEach(function(m){ if(m.isPost) postMeal=m; if(m.isPreMeal) preMeal=m; });
    return { meals:meals, pre:pre, preMerged:preMerged, postMeal:postMeal, preMeal:preMeal, postT:postT, preT:preT };
  }

  /* ----- Metabolism check-in math ----- */
  // Least-squares weight trend from [{t (ms), w (lb)}] sorted by time, with the
  // slope's standard error, so the check-in can tell a real trend from day-to-day
  // scale noise (water, salt, stored carbs: ±1–2 lb). It needs 6+ weigh-ins over
  // 12+ days — fewer can't beat that noise.
  var FF_TREND_MIN_N=6, FF_TREND_MIN_DAYS=12;
  function ffTrendFit(pts){
    if(!pts || pts.length<FF_TREND_MIN_N) return null;
    var spanDays=(pts[pts.length-1].t-pts[0].t)/864e5;
    if(spanDays<FF_TREND_MIN_DAYS) return null;
    var n=pts.length, t0=pts[0].t, sx=0,sy=0,sxy=0,sxx=0;
    pts.forEach(function(p){ var x=(p.t-t0)/864e5; sx+=x; sy+=p.w; sxy+=x*p.w; sxx+=x*x; });
    var denom=n*sxx-sx*sx; if(denom<=0) return null;
    var slope=(n*sxy-sx*sy)/denom, a=(sy-slope*sx)/n, rss=0;   // lb/day
    pts.forEach(function(p){ var x=(p.t-t0)/864e5, r=p.w-(a+slope*x); rss+=r*r; });
    var se=Math.sqrt(rss/(n-2)/(denom/n))*7;                    // lb/week
    return { ratePerWeek:slope*7, se:se, n:n, days:Math.round(spanDays), lastW:pts[pts.length-1].w };
  }
  // The check-in call. tr = ffTrendFit result, desired = the goal's signed lb/wk,
  // room = { down, up } kcal the target can still move (null = unknown).
  // On track = within max(½ lb/wk, 60% of the goal rate, 2 standard errors):
  // anything inside that is scale noise, not metabolism. Off track → half the
  // gap (500 kcal/day ≈ 1 lb/wk), in 50s, capped ±250 and to the room left. A
  // change the calorie floor (or the ±600 cap) would swallow is never offered:
  // deltaKcal 0 with atLimit set.
  function ffCheckin(tr, desired, room){
    desired=Number(desired)||0;
    var error=tr.ratePerWeek-desired;                                     // + = heavier than intended
    var tol=Math.max(0.5, Math.abs(desired)*0.6, 2*(tr.se||0));
    var onTrack=Math.abs(error)<=tol, delta=0, atLimit=false;
    if(!onTrack){
      delta=-Math.round(error*5)*50;
      delta=Math.max(-250, Math.min(250, delta));
      if(room){
        if(delta<0) delta=Math.max(delta, -Math.floor(Math.max(0, room.down||0)/50)*50);
        else delta=Math.min(delta, Math.floor(Math.max(0, room.up||0)/50)*50);
        if(delta===0){ delta=0; atLimit=true; }
      }
    }
    // Goal-aware wording: on a cut, being lighter than planned means LOSING FASTER.
    var pace = desired>0 ? (error<0?"gaining slower than planned":"gaining faster than planned")
      : (desired<0 ? (error<0?"losing faster than planned":"losing slower than planned")
      : (error>0?"drifting up":"drifting down"));
    return { rate:tr.ratePerWeek, desired:desired, error:error, tol:tol, onTrack:onTrack,
      deltaKcal:delta, deltaCarb:Math.round(delta/4), atLimit:atLimit, wantDown:error>0, pace:pace,
      days:tr.days, n:tr.n };
  }
  // The range ff_kcal_adj may usefully take for a goal: never below what the
  // calorie floor would swallow, never past ±600. base = the goal target before
  // tuning, already lifted to the floor. Whole kcal (rounded up, so base+lo
  // never dips under the floor).
  function ffAdjRange(base, floorKcal){
    return { lo:Math.max(-600, Math.min(0, Math.ceil((Number(floorKcal)||0)-(Number(base)||0)))), hi:600 };
  }
