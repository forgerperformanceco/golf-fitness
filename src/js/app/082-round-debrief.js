  /* ===================== ROUND DEBRIEF — the gym-to-course loop ===================== */
  // The whole app points at the course; this is where the course reports back.
  // A ~20-second post-round ritual: score (optional), longest drive, how the
  // driving felt, and how the BODY held up. The drive feeds the driver-carry
  // trend automatically (an on-course best triggers the PR moment), and Stats
  // grows an "On the course" card — the proof the work is paying off in golf.
  function ffRounds(){ return lsGet("ff_rounds", []); }
  function roundToday(){
    var t=todayStr(), r=null;
    ffRounds().forEach(function(e){ if(e && e.date===t) r=e; });
    return r;
  }
  var RD_DRIVING={ bomb:"Bombing it", norm:"Normal", short:"Short" };
  var RD_ENERGY={ strong:"Strong all 18", faded:"Faded late", gassed:"Gassed" };
  var rdSel={ driving:null, energy:null };

  function rdEnsure(){
    if($("rdModal")) return;
    var m=document.createElement("div"); m.id="rdModal"; m.className="swap-modal"; m.hidden=true;
    m.innerHTML='<div class="swap-card"><div class="swap-head"><span>⛳ Log your round</span>'+
      '<button class="swap-x" id="rdX" type="button" aria-label="Close">×</button></div>'+
      '<div class="swap-body" id="rdBody"></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", function(e){
      if(e.target===m || e.target.closest("#rdX")){ m.hidden=true; document.body.style.overflow=""; return; }
      var ch=e.target.closest("[data-rdchip]");
      if(ch){
        var k=ch.getAttribute("data-rdchip"), v=ch.getAttribute("data-rdval");
        rdSel[k]=(rdSel[k]===v)?null:v;
        rdRender(); return;
      }
      if(e.target.closest("#rdSave")){ rdSave(); return; }
    });
  }
  function rdChips(key, map){
    return '<div class="rd-chips">'+Object.keys(map).map(function(k){
      return '<button type="button" class="frate-chip'+(rdSel[key]===k?" on":"")+'" data-rdchip="'+key+'" data-rdval="'+k+'">'+map[k]+'</button>';
    }).join("")+'</div>';
  }
  function rdRender(){
    var ex=roundToday();
    var score=$("rdScore")?$("rdScore").value:(ex&&ex.score!=null?ex.score:"");
    var drive=$("rdDrive")?$("rdDrive").value:(ex&&ex.drive!=null?ex.drive:"");
    $("rdBody").innerHTML=
      '<div class="swap-sub">Twenty seconds while it’s fresh — this is where the gym work proves out.</div>'+
      '<div class="rd-grid">'+
        '<label class="rd-f"><span>Score <em>optional</em></span><input id="rdScore" type="number" inputmode="numeric" placeholder="86" value="'+escAttr(String(score))+'"/></label>'+
        '<label class="rd-f"><span>Longest drive <em>yds</em></span><input id="rdDrive" type="number" inputmode="numeric" placeholder="250" value="'+escAttr(String(drive))+'"/></label>'+
      '</div>'+
      '<div class="rd-lbl">How was the driving?</div>'+rdChips("driving", RD_DRIVING)+
      '<div class="rd-lbl">How did the body hold up?</div>'+rdChips("energy", RD_ENERGY)+
      '<button type="button" class="rd-save" id="rdSave">✓ Bank the round</button>'+
      '<div class="rd-foot">Your longest drive feeds the driver-carry trend on Home & Stats.</div>';
  }
  function openRoundLog(){
    rdEnsure();
    var ex=roundToday();
    rdSel.driving=ex?ex.driving||null:null;
    rdSel.energy=ex?ex.energy||null:null;
    rdRender();
    $("rdModal").hidden=false;
  }
  function rdSave(){
    var score=parseInt($("rdScore").value,10), drive=parseFloat($("rdDrive").value);
    if(isNaN(score)) score=null;
    if(isNaN(drive)||drive<=0) drive=null;
    if(score==null && drive==null && !rdSel.driving && !rdSel.energy){ ffToast("Add at least one thing about the round"); return; }
    // On-course PR? Compare against every driver-carry entry BEFORE writing.
    var prevBest=0; try{ driveList().forEach(function(e){ if(e.y>prevBest) prevBest=e.y; }); }catch(e){}
    var rounds=ffRounds(), today=todayStr(), ex=null;
    rounds.forEach(function(e){ if(e && e.date===today) ex=e; });
    if(!ex){ ex={ id:"r"+Date.now(), ts:Date.now(), date:today }; rounds.push(ex); }
    ex.score=score; ex.drive=drive; ex.driving=rdSel.driving; ex.energy=rdSel.energy;
    if(rounds.length>60) rounds=rounds.slice(rounds.length-60);
    lsSet("ff_rounds", rounds);
    if(drive!=null){ try{ logBodyEntry("","",String(drive)); }catch(e){} }
    $("rdModal").hidden=true; document.body.style.overflow="";
    if(drive!=null && drive>prevBest && prevBest>0){
      try{ ffCelebrate(); ffTick([25,45,25]); }catch(e){}
      ffToast("🚀 On-course PR — "+Math.round(drive)+" yds. That’s the gym showing up.");
    } else {
      ffToast("Round banked ⛳");
    }
    try{ renderDash(); }catch(e){}
    try{ if($("view-progress")&&$("view-progress").classList.contains("active")) renderProgress(); }catch(e){}
    try{ if($("view-gameday")&&$("view-gameday").classList.contains("active")) renderGameDay(); }catch(e){}
  }
  // One entry point attribute, usable anywhere: quick-log sheet, Game Day, Stats, timeline.
  document.addEventListener("click", function(e){
    if(e.target.closest("[data-roundlog]")) openRoundLog();
  });

  /* ----- Receipts: training ↔ round correlations -----
     The thesis is "train like a bodybuilder → hit it further." Once enough
     rounds are banked, prove it back with the user's OWN data: scoring trend,
     drives near vs far from gym days, deload-week freshness. Every insight is
     gated (enough rounds on both sides of the split, non-trivial gap) so the
     card never dresses noise up as a finding. */
  function rdDayTs(r){
    var t=(r && r.ts) ? r.ts : Date.parse((r && r.date) || "");
    if(!t || isNaN(t)) return null;
    var d=new Date(t); d.setHours(0,0,0,0); return d.getTime();
  }
  function rdPlanWeek(ts){
    var s=planStart(); if(!s || ts==null) return null;
    var st=new Date(s); st.setHours(0,0,0,0);
    var days=Math.round((ts-st.getTime())/864e5);
    return (days>=0 && days<140) ? Math.floor(days/7)+1 : null;
  }
  function rdAvg(a){ return a.length ? a.reduce(function(x,y){return x+y;},0)/a.length : null; }
  function rdInsights(rounds){
    var out=[];
    // 1 · Scoring trend — first 3 vs last 3 scored rounds (needs 5+ so they don't overlap much).
    var scored=rounds.filter(function(r){ return r.score!=null; });
    if(scored.length>=5){
      var early=rdAvg(scored.slice(0,3).map(function(r){return r.score;}));
      var late=rdAvg(scored.slice(-3).map(function(r){return r.score;}));
      var d=Math.round(early-late);
      if(d>=2) out.push('📉 <b>Scoring '+d+' strokes better</b> — last 3 rounds avg '+Math.round(late)+' vs '+Math.round(early)+' when you started logging.');
      else if(d<=-2) out.push('🧊 Scores are up '+(-d)+' vs your first logged rounds ('+Math.round(late)+' vs '+Math.round(early)+') — worth a look at what changed: sleep, fuel, range time.');
    }
    // 2 · Fresh legs — drives within 2 days of a logged session vs 3+ days out.
    var lifts=[]; try{ lsGet("ff_history",[]).forEach(function(e){
      if(e && e.ts){ var d2=new Date(e.ts); d2.setHours(0,0,0,0); lifts.push(d2.getTime()); } }); }catch(e){}
    lifts.sort(function(a,b){return a-b;});
    if(lifts.length){
      var near=[], far=[];
      rounds.forEach(function(r){
        if(!r.drive) return;
        var ts=rdDayTs(r); if(ts==null) return;
        var last=null; lifts.forEach(function(lt){ if(lt<=ts) last=lt; });
        if(last==null) return;
        ((ts-last)/864e5<=2 ? near : far).push(r.drive);
      });
      if(near.length>=2 && far.length>=2){
        var nA=Math.round(rdAvg(near)), fA=Math.round(rdAvg(far));
        if(nA-fA>=5) out.push('🏋️ <b>Drives avg '+nA+' yds within 2 days of a lift</b> vs '+fA+' further out — keep rounds close to gym days.');
        else if(fA-nA>=5) out.push('🛌 Drives avg <b>'+fA+' yds with 3+ days after lifting</b> vs '+nA+' closer in — your legs like a little more space before tee time.');
      }
    }
    // 3 · Deload freshness — drives in deload/peak (recovery) weeks vs loading weeks.
    var fresh=[], loaded=[];
    rounds.forEach(function(r){
      if(!r.drive) return;
      var wk=rdPlanWeek(rdDayTs(r)); if(wk==null) return;
      var wv="accumulate"; try{ wv=waveFor(wk); }catch(e){}
      ((wv==="deload"||wv==="peak") ? fresh : loaded).push(r.drive);
    });
    if(fresh.length>=2 && loaded.length>=2){
      var frA=Math.round(rdAvg(fresh)), loA=Math.round(rdAvg(loaded));
      if(frA-loA>=5) out.push('🪫 <b>Recovery-week drives avg '+frA+' yds</b> vs '+loA+' in loading weeks — that’s the deload doing its job. Plan big rounds for fresh weeks.');
    }
    return out.slice(0,3);
  }

  // The Stats proof card: rounds, best drive, and the stamina story.
  // Returns '' before the first round — the Stats "unlocks" strip advertises
  // it instead of an empty card taking up a slot.
  function courseCardHtml(){
    var rounds=ffRounds().slice().reverse();
    if(!rounds.length) return '';
    var bd=0; rounds.forEach(function(r){ if(r.drive&&r.drive>bd) bd=r.drive; });
    var h='';
    {
      var strong=rounds.filter(function(r){ return r.energy==="strong"; }).length;
      var rated=rounds.filter(function(r){ return r.energy; }).length;
      if(bd>0) h+='<div class="pc-now">'+Math.round(bd)+'<span>yds best on-course drive</span></div>';
      if(rated>0) h+='<div class="rd-stam">'+(strong===rated
        ? '💪 Finished <b>strong</b> in all '+rated+' rated round'+(rated===1?"":"s")+' — the endurance work is holding.'
        : '<b>'+strong+' of '+rated+'</b> rounds finished strong. Fading late is a fuel + conditioning problem — both are in the plan.')+'</div>';
      h+='<div class="rd-list">'+rounds.slice(0,3).map(function(r){
        return '<div class="rd-r"><span class="rd-d">'+lbEsc(r.date)+'</span>'+
          '<span class="rd-v">'+(r.score!=null?('<b>'+r.score+'</b>'):'—')+'</span>'+
          '<span class="rd-v">'+(r.drive?('<b>'+Math.round(r.drive)+'</b> yds'):'—')+'</span>'+
          '<span class="rd-e">'+(r.energy?RD_ENERGY[r.energy]:'')+'</span></div>';
      }).join("")+'</div>';
      // Receipts: what the training is doing for actual golf, from the user's own data.
      var ins=[]; try{ ins=rdInsights(ffRounds()); }catch(e){}
      if(ins.length){
        h+='<div class="rd-ins-h">'+ffTerm('receipts','Receipts')+'</div>'+ins.map(function(t){
          return '<div class="rd-ins">'+t+'</div>'; }).join("");
      } else if(rounds.length<5){
        h+='<div class="rd-ins dim">🧾 Keep logging — at ~5 rounds this card starts showing receipts: scoring trend, drives near vs far from gym days, deload-week distance.</div>';
      }
    }
    h+='<button type="button" class="fd-act" data-roundlog="1">⛳ Log a round ›</button>';
    return pfCard('course','⛳ On the course',
      (bd>0?'<span class="pf-num">'+Math.round(bd)+' yds</span>':'')+
      (rounds.length?'<span class="pc-delta neu">'+rounds.length+' round'+(rounds.length===1?"":"s")+'</span>':''), h);
  }
