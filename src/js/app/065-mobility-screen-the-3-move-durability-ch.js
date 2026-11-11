  /* ===================== MOBILITY SCREEN — the golf turn check =====================
     Strength & power drive clubhead speed; mobility is trained so the mass you add
     never costs you rotation or durability (see the reference docs — general
     flexibility is NOT a speed lever, it's swing insurance). A ~4-minute self-check,
     first thing after setup and every 4 weeks. Scores 0-100, becomes the Octane's
     5th pillar, routes targeted moves into warm-ups, cool-downs and rest days, and
     drives the Build turn guard.
     Nov 2026 (v2): the turn, not general flexibility — better golfers differ in
     rotation range, not front-to-back flexibility (McHugh 2022); bodybuilding-
     style lifters lose shoulder rotation (Barlow 2002; Kolber 2009). Trunk rotation
     is unchanged (its key carries across versions); the 90/90 switch and overhead
     squat became hip rotation, coil separation, the lead arm across the chest and
     an overhead reach for the lats. v1 entries ({trunk,hip,squat}) stay readable. */
  var MOB_TESTS = [
    { key:"trunk", ic:"🌀", t:"Seated trunk rotation",
      d:"Sit tall on a bench, arms crossed on your chest, feet planted. Turn your shoulders as far as you can each way <b>without the hips moving</b>.",
      lbl:["🔴 Tight / pinches","🟡 Close, or one side tighter","✅ ~45°+ both ways, smooth"] },
    { key:"hiprot", ic:"🦵", t:"Seated hip rotation",
      d:"Sit on the edge of a bench, knees bent 90° and hip-width. Keep one knee still and swing that foot <b>outward</b> like a pendulum — that turns the hip inward. Both sides; the hip stays down on the bench.",
      lbl:["🔴 Under ~20°, or it pinches","🟡 Gets there, or one side is clearly tighter","✅ ~35°+ both sides, and even"] },
    { key:"coil", ic:"⛳", t:"Coil: shoulders vs hips",
      d:"Golf posture, arms crossed on your chest. Turn your shoulders back while the <b>belt buckle keeps pointing at the ball</b>, then turn the belt buckle while the shoulders stay still.",
      lbl:["🔴 Hips and shoulders move together","🟡 One way is a fight","✅ Each moves on its own, no sway"] },
    { key:"leadarm", ic:"💪", t:"Lead arm across the chest",
      d:"Stand tall, lead arm straight out in front at shoulder height. Bring it across your chest as far as it goes <b>without the chest turning or the shoulder hiking</b>.",
      lbl:["🔴 Stops short, or pinches in front","🟡 Close, but it's tight","✅ Elbow reaches the middle of your chest"] },
    { key:"lats", ic:"🙌", t:"Overhead reach (lats)",
      d:"Back against a wall, feet a small step out, knees soft, <b>low back flat on the wall</b>. Raise both straight arms overhead toward the wall.",
      lbl:["🔴 Arms stop well short, or the back arches","🟡 Close, but the low back wants to arch","✅ Thumbs touch the wall, back stays flat"] }
  ];
  // A screen entry from the answers (pure, unit-tested): every v2 key, the 0-100
  // score over however many moves were scored, and a version marker.
  function mobEntry(vals, ts, date){
    var tests={}, sum=0;
    MOB_TESTS.forEach(function(t){ var v=(vals&&vals[t.key])|0; tests[t.key]=v; sum+=v; });
    return { ts:ts, date:date, v:2, tests:tests, score:Math.round(sum/(MOB_TESTS.length*2)*100) };
  }
  function mobTests(){ var t=lsGet("ff_mobility",[]); return Array.isArray(t)?t:[]; }
  function lastMob(){ var t=mobTests(); return t.length?t[t.length-1]:null; }
  // Turn guardrail (Nov 2026): on a gaining goal, a turn check that comes back worse
  // means the build may be starting to cost the turn. One self-rated move a level
  // lower is inside the noise (single items are the shakiest part of any movement
  // screen, and a warm-up or a round shifts scores), so the guard needs either a
  // CLEAR drop — two levels or more across the moves both screens share (one move
  // from ✅ to 🔴, or two moves down one) — or a CONFIRMED one: a move lower than it
  // was, two screens running. It holds while that's true and lifts when the turn
  // comes back. Compares only moves the screens share, so a screen with different
  // moves still works. Called from calc() before this module's vars exist — hence
  // the literal names.
  function ffTurnGuard(){
    if(typeof state==="undefined" || !state || (state.goal!=="leanbulk" && state.goal!=="bulk")) return null;
    var t=mobTests(); if(t.length<2) return null;
    var a=t[t.length-2], b=t[t.length-1], z=t.length>2 ? t[t.length-3] : null;
    if(!a || !b || !a.tests || !b.tests) return null;
    var names={ trunk:"trunk rotation", hip:"hips", squat:"deep squat", hiprot:"hip rotation",
      coil:"shoulder–hip separation", leadarm:"lead arm", lats:"overhead reach" };
    function has(e,k){ return !!(e && e.tests && Object.prototype.hasOwnProperty.call(e.tests,k)); }
    var shared=Object.keys(b.tests).filter(function(k){ return has(a,k); });
    var fall=shared.reduce(function(n,k){ return n+Math.max(0,(a.tests[k]|0)-(b.tests[k]|0)); }, 0);
    var dropped=shared.filter(function(k){
      var lowerNow=(b.tests[k]|0)<(a.tests[k]|0),
          confirmed=has(z,k) && (a.tests[k]|0)<(z.tests[k]|0) && (b.tests[k]|0)<(z.tests[k]|0);
      return (fall>=2 && lowerNow) || confirmed;
    });
    if(!dropped.length) return null;
    return { dropped:dropped, ts:b.ts||0, why:(fall>=2?"clear":"confirmed"),
      label:dropped.map(function(k){ return names[k]||k; }).join(" and ") };
  }
  // A single move a level lower than last time, not enough for the guard: the result
  // screen says so, so the user knows what the next check decides.
  function mobWatch(prev, cur){
    if(!prev || !prev.tests || !cur || !cur.tests) return null;
    var shared=Object.keys(cur.tests).filter(function(k){ return Object.prototype.hasOwnProperty.call(prev.tests,k); });
    var down=shared.filter(function(k){ return (cur.tests[k]|0)<(prev.tests[k]|0); });
    var fall=down.reduce(function(n,k){ return n+((prev.tests[k]|0)-(cur.tests[k]|0)); }, 0);
    return (fall===1) ? down[0] : null;
  }
  function mobDue(){ var lm=lastMob(); return !lm || (Date.now()-lm.ts)>=28*864e5; }
  // Which areas the latest screen flagged (score < pass) → drives the routing.
  // Reads whatever keys the entry holds, so a v1 screen still routes until re-run.
  function mobLimits(){
    var lm=lastMob(); if(!lm || !lm.tests) return {};
    var out={}; Object.keys(lm.tests).forEach(function(k){ if((lm.tests[k]|0)<2) out[k]=true; });
    return out;
  }
  var mobState=null;
  function mobEnsureModal(){
    if($("mobModal")) return;
    var m=document.createElement("div"); m.id="mobModal"; m.className="swap-modal"; m.hidden=true;
    m.innerHTML='<div class="swap-card"><div class="swap-head"><span>'+ffIcon("compass",16)+' Mobility screen</span>'+
      '<button class="swap-x" id="mobX" type="button" aria-label="Close">×</button></div><div class="swap-body" id="mobBody"></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", function(e){
      if(e.target===m || e.target.closest("#mobX")){ closeMobility(); return; }
      var ob=e.target.closest("[data-mobt]");
      if(ob){ mobState.vals[ob.getAttribute("data-mobt")]=+ob.getAttribute("data-mobv"); renderMobility(); return; }
      if(e.target.closest("[data-mobclear]")){ mobState.cleared=true; renderMobility(); return; }
      if(e.target.closest("[data-mobstop]")){ mobState.stopped=true; renderMobility(); return; }
      if(e.target.closest("[data-mobsave]")){ saveMobility(); return; }
      if(e.target.closest("[data-mobdone]")){ closeMobility(); return; }
    });
  }
  function openMobility(){
    mobEnsureModal();
    mobState={ vals:{}, saved:null, cleared:false, stopped:false };
    renderMobility();
    $("mobModal").hidden=false; document.body.style.overflow="hidden";
  }
  function closeMobility(){
    var m=$("mobModal"); if(m) m.hidden=true; document.body.style.overflow=""; mobState=null;
    try{ calc(); }catch(e){}   // a new screen can switch the turn guard (and Build's surplus) on or off
    try{ renderPhase(); }catch(e){} try{ renderDash(); }catch(e){}
    try{ if($("view-progress") && $("view-progress").classList.contains("active")) renderProgress(); }catch(e){}
    try{ if($("view-account") && $("view-account").classList.contains("active")) renderAccount(); }catch(e){}
  }
  var MOB_FIX = {
    trunk:"open-book + thread-the-needle added to your warm-ups, cool-downs and rest days",
    hip:"extra 90/90 work added to lower-day warm-ups, cool-downs and rest days",
    squat:"deep-squat holds + ankle rockers added to lower-day warm-ups, cool-downs and rest days",
    hiprot:"extra hip work (90/90 switches or adductor rock-backs) added to lower-day warm-ups, and 90/90 lift-offs to cool-downs and rest days",
    coil:"golf-posture turns (shoulders turn, belt buckle stays) added to every warm-up",
    leadarm:"shoulder circles added to upper-day warm-ups, and a cross-body stretch to every cool-down",
    lats:"a dead hang added to upper-day warm-ups, and a lat stretch to every cool-down"
  };
  function renderMobility(){
    var body=$("mobBody"); if(!body || !mobState) return;
    // Pain stops the screen (Nov 2026): a red-flag check first, and a stop on every move.
    // Nothing is saved, so the plan, the Octane and the turn guard don't move.
    if(mobState.stopped){
      body.innerHTML='<div class="mob-res"><div class="st-res-kick">Screen stopped</div>'+
        '<div class="mob-stop">🩺 <b>Get that looked at before you test it.</b> Pain like that isn’t something to score or stretch through. '+
          'See a doctor or physical therapist, and run the turn check again once you’ve been cleared.</div>'+
        '<div class="mob-flag ok">Nothing was saved, so your plan and your Octane are unchanged.</div>'+
        '<button class="mob-save" data-mobdone="1">Close</button></div>';
      return;
    }
    if(!mobState.cleared){
      body.innerHTML='<div class="mob-test mob-check"><div class="mob-t">Before you start</div>'+
        '<div class="mob-d">Any of these right now? <b>Sharp pain</b>, pain that <b>runs down an arm or leg</b>, <b>numbness or tingling</b>, or pain that <b>wakes you at night</b>.</div>'+
        '<div class="mob-opts"><button type="button" data-mobclear="1">No, good to go</button><button type="button" data-mobstop="1">Yes</button></div></div>';
      return;
    }
    if(mobState.saved){
      var r=mobState.saved;
      var flags=MOB_TESTS.filter(function(t){ return (r.tests[t.key]|0)<2; });
      body.innerHTML='<div class="mob-res">'+
        '<div class="st-res-kick">Mobility score</div>'+
        '<div class="mob-res-num">'+r.score+'<span>/100</span></div>'+
        (mobState.watch ? '<div class="mob-flag">'+mobState.watch+'</div>' : '')+
        (flags.length
          ? flags.map(function(t){ return '<div class="mob-flag"><b>'+t.ic+' '+t.t+':</b> '+MOB_FIX[t.key]+'.</div>'; }).join("")+
            '<div class="mob-flag ok">Hit those every session and re-check in 4 weeks — the muscle you add should never cost you your turn.</div>'
          : '<div class="mob-flag ok">✅ Moving well everywhere. Keep the warm-ups honest and re-screen in 4 weeks — mass should never cost you turn.</div>')+
        '<button class="mob-save" data-mobdone="1">Done</button></div>';
      return;
    }
    var done=MOB_TESTS.every(function(t){ return mobState.vals[t.key]!=null; });
    body.innerHTML='<div class="st-note" style="margin:0 0 12px;">~4 minutes, no gear: five moves your golf turn depends on. Score honestly — a 🔴 just routes the right stretches into your sessions, and it becomes the 5th pillar of your Octane. '+
        '<b>Same conditions every time:</b> do it cold, before you train, around the same time of day, and never right after a round — a warm-up or 18 holes shifts the scores.</div>'+
      MOB_TESTS.map(function(t){
        return '<div class="mob-test"><div class="mob-t">'+t.ic+' '+t.t+'</div><div class="mob-d">'+t.d+'</div>'+
          '<div class="mob-opts">'+[0,1,2].map(function(v){
            return '<button type="button" class="'+(mobState.vals[t.key]===v?'on':'')+'" data-mobt="'+t.key+'" data-mobv="'+v+'">'+t.lbl[v]+'</button>';
          }).join("")+'</div>'+
          '<button type="button" class="mob-hurt" data-mobstop="1">Sharp pain on this one? Stop here</button></div>';
      }).join("")+
      '<button class="mob-save" data-mobsave="1"'+(done?'':' disabled')+'>✓ Save my screen</button>';
  }
  function saveMobility(){
    if(!mobState) return;
    var entry=mobEntry(mobState.vals, Date.now(), todayStr());
    var t=mobTests(), prev=t.length?t[t.length-1]:null;
    var wk=mobWatch(prev, entry), wt=wk && MOB_TESTS.filter(function(x){ return x.key===wk; })[0];
    // One move a level lower: inside the noise on its own. Say what the next check decides.
    mobState.watch=wt ? '<b>'+wt.ic+' '+wt.t+' came back a level lower.</b> One move on one day can be noise, so nothing changes yet. If it’s still lower on your next check, your plan adjusts to protect your turn.' : null;
    t.push(entry); if(t.length>40) t=t.slice(-40);
    lsSet("ff_mobility", t);
    mobState.saved=entry;
    renderMobility();
  }
