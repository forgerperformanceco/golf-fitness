  /* ===================== MOBILITY SCREEN — the 3-move durability check =====================
     Strength & power drive clubhead speed; mobility is trained so the mass you add
     never costs you rotation or durability (see the reference docs — flexibility is
     NOT a speed lever, it's swing insurance). A ~3-minute self-screen, first thing
     after setup and every 4 weeks: seated trunk rotation, 90/90 hips, overhead deep
     squat. Scores 0-100, becomes the Octane's 5th pillar, and anything tight routes
     extra targeted moves straight into that day's warm-up. */
  var MOB_TESTS = [
    { key:"trunk", ic:"🌀", t:"Seated trunk rotation",
      d:"Sit tall on a chair, arms crossed on your chest, feet planted. Turn your shoulders as far as you can each way <b>without the hips moving</b>.",
      lbl:["🔴 Tight / pinches","🟡 Close, one side tighter","✅ ~45°+ both ways, smooth"] },
    { key:"hip", ic:"🦵", t:"90/90 hip switch",
      d:"Sit on the floor, one leg bent 90° in front, the other 90° behind. Keeping your chest tall, <b>switch sides without using your hands</b>.",
      lbl:["🔴 Can't switch / knees float high","🟡 Get there, but it's a grind","✅ Smooth both ways, knees near floor"] },
    { key:"squat", ic:"🏋️", t:"Overhead deep squat",
      d:"Feet shoulder-width, arms straight overhead. Squat as deep as you can — <b>heels down, chest tall, arms staying up</b>.",
      lbl:["🔴 Heels lift / arms fall forward","🟡 Below parallel but it's work","✅ Deep, heels down, arms overhead"] }
  ];
  function mobTests(){ var t=lsGet("ff_mobility",[]); return Array.isArray(t)?t:[]; }
  function lastMob(){ var t=mobTests(); return t.length?t[t.length-1]:null; }
  function mobDue(){ var lm=lastMob(); return !lm || (Date.now()-lm.ts)>=28*864e5; }
  // Which areas the latest screen flagged (score < pass) → drives warm-up routing.
  function mobLimits(){
    var lm=lastMob(); if(!lm || !lm.tests) return {};
    var out={}; MOB_TESTS.forEach(function(t){ if((lm.tests[t.key]|0)<2) out[t.key]=true; });
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
      if(e.target.closest("[data-mobsave]")){ saveMobility(); return; }
      if(e.target.closest("[data-mobdone]")){ closeMobility(); return; }
    });
  }
  function openMobility(){
    mobEnsureModal();
    mobState={ vals:{}, saved:null };
    renderMobility();
    $("mobModal").hidden=false; document.body.style.overflow="hidden";
  }
  function closeMobility(){
    var m=$("mobModal"); if(m) m.hidden=true; document.body.style.overflow=""; mobState=null;
    try{ renderPhase(); }catch(e){} try{ renderDash(); }catch(e){}
    try{ if($("view-progress") && $("view-progress").classList.contains("active")) renderProgress(); }catch(e){}
    try{ if($("view-account") && $("view-account").classList.contains("active")) renderAccount(); }catch(e){}
  }
  var MOB_FIX = {
    trunk:"open-book T-spine rotations added to your warm-ups",
    hip:"extra 90/90 + adductor rock-backs added to lower-day warm-ups",
    squat:"deep-squat holds + ankle rockers added to lower-day warm-ups"
  };
  function renderMobility(){
    var body=$("mobBody"); if(!body || !mobState) return;
    if(mobState.saved){
      var r=mobState.saved;
      var flags=MOB_TESTS.filter(function(t){ return (r.tests[t.key]|0)<2; });
      body.innerHTML='<div class="mob-res">'+
        '<div class="st-res-kick">Mobility score</div>'+
        '<div class="mob-res-num">'+r.score+'<span>/100</span></div>'+
        (flags.length
          ? flags.map(function(t){ return '<div class="mob-flag"><b>'+t.ic+' '+t.t+':</b> '+MOB_FIX[t.key]+'.</div>'; }).join("")+
            '<div class="mob-flag ok">Hit those every session and re-screen in 4 weeks — moving well is what lets the new mass become speed.</div>'
          : '<div class="mob-flag ok">✅ Moving well everywhere. Keep the warm-ups honest and re-screen in 4 weeks — mass should never cost you turn.</div>')+
        '<button class="mob-save" data-mobdone="1">Done</button></div>';
      return;
    }
    var done=MOB_TESTS.every(function(t){ return mobState.vals[t.key]!=null; });
    body.innerHTML='<div class="st-note" style="margin:0 0 12px;">~3 minutes, no gear. Score honestly — a 🔴 just means your warm-ups get smarter, and it becomes the 5th pillar of your Octane.</div>'+
      MOB_TESTS.map(function(t){
        return '<div class="mob-test"><div class="mob-t">'+t.ic+' '+t.t+'</div><div class="mob-d">'+t.d+'</div>'+
          '<div class="mob-opts">'+[0,1,2].map(function(v){
            return '<button type="button" class="'+(mobState.vals[t.key]===v?'on':'')+'" data-mobt="'+t.key+'" data-mobv="'+v+'">'+t.lbl[v]+'</button>';
          }).join("")+'</div></div>';
      }).join("")+
      '<button class="mob-save" data-mobsave="1"'+(done?'':' disabled')+'>✓ Save my screen</button>';
  }
  function saveMobility(){
    if(!mobState) return;
    var sum=0; MOB_TESTS.forEach(function(t){ sum+=(mobState.vals[t.key]|0); });
    var score=Math.round(sum/(MOB_TESTS.length*2)*100);
    var entry={ ts:Date.now(), date:todayStr(), tests:{ trunk:mobState.vals.trunk|0, hip:mobState.vals.hip|0, squat:mobState.vals.squat|0 }, score:score };
    var t=mobTests(); t.push(entry); if(t.length>40) t=t.slice(-40);
    lsSet("ff_mobility", t);
    mobState.saved=entry;
    renderMobility();
  }
