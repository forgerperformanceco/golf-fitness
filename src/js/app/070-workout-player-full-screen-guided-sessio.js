  /* ===================== WORKOUT PLAYER — full-screen guided session =====================
     One station at a time: warm-up checklist → power primer → each lift (prescribed
     load front and center, steppers, auto rest countdown) → recap with volume, PRs
     and a share moment. Reads/writes the SAME ff_log session as the inline logger,
     saving on every change — exit any time, nothing is lost. Always dark (focus mode). */
  var player=null, plRestTimer=null, plRestEnd=0, plRestTotal=0;
  function plLiftBase(day){ return (day.type==="speed") ? 1 : 2; }   // stations before the first lift
  function startPlayer(dayName){
    var day=findDay(dayName); if(!day || day.type==="rest") return;
    var week=curWeek();
    var sess=buildSession(day, week);
    var prevBest={}; bigLiftStats().forEach(function(L){ prevBest[L.name]=L.best; });
    var stations=[{type:"warmup"}];
    if(day.type!=="speed") stations.push({type:"primer"});
    sess.ex.forEach(function(x, xi){ stations.push({type:"lift", xi:xi}); });
    stations.push({type:"recap"});
    player={ day:day, dayName:day.name, week:week, sess:sess, stations:stations, st:0,
             wuDone:{}, prDone:false, prevBest:prevBest, startedAt:Date.now(),
             octBefore:(ffScore().score||0) };
    // Mid-workout resume: if any set already has data, land on the first unfinished lift.
    var hasAny=sess.ex.some(function(x){ return x.sets.some(function(s){ return s.w||s.r||s.done; }); });
    if(hasAny){
      for(var i=0;i<sess.ex.length;i++){
        if(!sess.ex[i].sets.every(function(s){ return s.done; })){ player.st=plLiftBase(day)+i; break; }
      }
    }
    plEnsure();
    plRender();
    $("playerRoot").hidden=false;
    document.body.style.overflow="hidden";
    try{ localStorage.removeItem("ff_pl_paused"); }catch(e){}
    plPauseSync();
  }
  function plClose(){
    plStopRest();
    var r=$("playerRoot"); if(r) r.hidden=true;
    document.body.style.overflow="";
    if(player){
      focusDay=player.dayName;   // stay on the session you were in (Resume, not next day)
      // Exiting mid-session PAUSES it: bank the active time (the recap clock
      // stops while you're away) and surface the resume bar on every view.
      var sess=player.sess, started=player.startedAt;
      var hasWork=sess && sess.ex && sess.ex.some(function(x){ return (x.sets||[]).some(function(st){ return st.w||st.r||st.done; }); });
      if(hasWork && !sess.finishedAt){
        sess.activeMs=(sess.activeMs||0)+Math.max(0, Date.now()-started);
        try{ saveSession(player.week, player.dayName, sess); }catch(e){}
        try{ localStorage.setItem("ff_pl_paused", JSON.stringify({ day:player.dayName, week:player.week })); }catch(e){}
      }
    }
    player=null;
    try{ renderPhase(); }catch(e){}
    try{ renderDash(); }catch(e){}
    plPauseSync();
  }
  function plSave(){
    if(!player) return;
    if(!player.sess.date) player.sess.date=todayStr();
    saveSession(player.week, player.dayName, player.sess);
  }
  function plStopRest(){ if(plRestTimer){ clearInterval(plRestTimer); plRestTimer=null; } var b=$("plRestBar"); if(b) b.hidden=true; }
  function plStartRest(secs, label){
    plRestEnd=Date.now()+secs*1000; plRestTotal=secs*1000;
    var b=$("plRestBar"); if(!b) return;
    b.hidden=false;
    var lb=b.querySelector(".pl-rest-lb"); if(lb) lb.textContent=label||"Rest";
    if(!plRestTimer) plRestTimer=setInterval(plTickRest, 250);
    plTickRest();
  }
  function plTickRest(){
    var b=$("plRestBar"); if(!b || !player){ plStopRest(); return; }
    var left=plRestEnd-Date.now();
    if(left<=0){
      var t=b.querySelector(".pl-rest-time"); if(t) t.textContent="GO 💥";
      var f=b.querySelector(".pl-rest-fill"); if(f) f.style.width="100%";
      try{ navigator.vibrate && navigator.vibrate(180); }catch(e){}
      clearInterval(plRestTimer); plRestTimer=null;
      setTimeout(function(){ var b2=$("plRestBar"); if(b2) b2.hidden=true; }, 1500);
      return;
    }
    var s=Math.ceil(left/1000), m=Math.floor(s/60), sc=s%60;
    var t2=b.querySelector(".pl-rest-time"); if(t2) t2.textContent=(m>0?m+":":"")+(m>0&&sc<10?"0":"")+sc;
    var f2=b.querySelector(".pl-rest-fill"); if(f2) f2.style.width=Math.round((1-left/plRestTotal)*100)+"%";
  }
  function plStationDone(i){
    var st=player.stations[i];
    if(st.type==="warmup"){ var list=warmupList(player.day.type==="speed"?"speed":player.dayName); return Object.keys(player.wuDone).length>=list.length; }
    if(st.type==="primer") return player.prDone;
    if(st.type==="lift"){ var x=player.sess.ex[st.xi]; return x && x.sets.length>0 && x.sets.every(function(s){ return s.done; }); }
    return false;
  }
  function plLastFor(name){
    var last=lastSessionFor(player.dayName, player.week), lx=null;
    if(last) last.ex.forEach(function(e){ if(e.name===name) lx=e; });
    return lx;
  }
  function plStationHtml(){
    var st=player.stations[player.st], day=player.day;
    if(st.type==="warmup"){
      var items=warmupList(day.type==="speed"?"speed":player.dayName);
      return '<div class="pl-skick">Station 1 · Warm-up — never lift cold</div>'+
        '<div class="pl-exname">Get the engine warm</div>'+
        '<div class="pl-cue">~5 minutes. Tap each move as you finish it.</div>'+
        '<div class="pl-list">'+items.map(function(m,i){
          return '<button type="button" class="pl-item'+(player.wuDone[i]?" done":"")+'" data-plwu="'+i+'">'+
            '<span>'+(player.wuDone[i]?"✓ ":"")+m[0]+(m[2]?' <small style="color:#d4b06a">· from your mobility screen</small>':'')+'</span><span class="dose">'+m[1]+'</span></button>';
        }).join("")+'</div>';
    }
    if(st.type==="primer"){
      var p=primerFor(player.dayName);
      return '<div class="pl-skick">Station 2 · Power primer — fresh, max intent</div>'+
        '<div class="pl-exname">'+p.move+'</div>'+
        '<div class="pl-target">'+p.dose+'</div>'+
        '<div class="pl-cue">'+(p.note||"")+' Every rep explosive — the second a rep slows, the set is over. Full rest between sets.</div>'+
        '<div class="pl-list"><button type="button" class="pl-item'+(player.prDone?" done":"")+'" data-plprimer="1">'+
          '<span>'+(player.prDone?"✓ Primer done":"Mark primer done")+'</span><span class="dose">'+p.dose+'</span></button></div>'+
        '<div class="pl-note">⚠️ '+PRIMER_NOTE+'</div>';
    }
    if(st.type==="lift"){
      var x=player.sess.ex[st.xi], lx=plLastFor(x.name), wv=waveFor(player.week);
      var ready=progressReady(lx, x.target);
      var topLast=0; if(lx) lx.sets.forEach(function(s){ var w=parseFloat(s.w); if(w>topLast) topLast=w; });
      var presc=prescribeW(topLast||null, x.name, ready, wv);
      var cue=liftWhy(x.name).cue;
      // This session's values carry forward: the nearest EARLIER set with data
      // ghosts into later empty sets, and tapping ✓ on an empty set commits it.
      function plCarry(sets, si, f){
        for(var k=si-1;k>=0;k--){ if(sets[k] && sets[k][f]) return sets[k][f]; }
        return null;
      }
      var setsHtml=x.sets.map(function(s2, si){
        var pw=(lx&&lx.sets[si]&&lx.sets[si].w)?lx.sets[si].w:null, pr=(lx&&lx.sets[si]&&lx.sets[si].r)?lx.sets[si].r:null;
        var wVal=s2.w||"", rVal=s2.r||"";
        var cw=plCarry(x.sets, si, "w"), cr=plCarry(x.sets, si, "r");
        var wPh=cw!=null?cw:(presc!=null?presc:(pw||"lbs"));
        var rPh=cr!=null?cr:(pr||"reps");
        var pm=(isBarbell(x.name)&&s2.w)?platesFor(s2.w):"";
        return '<div class="pl-set'+(s2.done?" done":"")+'" data-plsetrow="'+si+'">'+
          '<div class="pl-set-head"><span>SET '+(si+1)+'</span><span>last: '+(pw?(pw+' × '+(pr||'–')):'–')+'</span></div>'+
          '<div class="pl-set-row">'+
            '<div class="pl-stp"><button type="button" data-plstep="w" data-dir="-1" data-si="'+si+'">−</button>'+
              '<input class="pl-in" type="number" inputmode="decimal" placeholder="'+escAttr(wPh)+'" value="'+escAttr(wVal)+'" data-plf="w" data-si="'+si+'"/>'+
              '<button type="button" data-plstep="w" data-dir="1" data-si="'+si+'">＋</button></div>'+
            '<div class="pl-stp reps"><button type="button" data-plstep="r" data-dir="-1" data-si="'+si+'">−</button>'+
              '<input class="pl-in" type="number" inputmode="numeric" placeholder="'+escAttr(rPh)+'" value="'+escAttr(rVal)+'" data-plf="r" data-si="'+si+'"/>'+
              '<button type="button" data-plstep="r" data-dir="1" data-si="'+si+'">＋</button></div>'+
            '<button type="button" class="pl-check'+(s2.done?" on":"")+'" data-plcheck="'+si+'" aria-label="set done">✓</button>'+
          '</div>'+(pm?'<div class="pl-plates">🏋️ '+pm+'</div>':'')+'</div>';
      }).join("");
      setsHtml+='<div class="pl-setops">'+
        '<button type="button" data-plsetadd="1">＋ Add set</button>'+
        '<button type="button" data-plsetrem="1">− Remove set</button>'+
        (lsGet("ff_hint_press",false)?'':'<span class="pl-setops-hint">✋ hold a set to remove it · hold the name to reorder</span>')+'</div>';
      var livePr=(player.prHit && player.prHit[x.name])
        ? '<div class="pl-livepr">🚀 e1RM PR — <b>'+Math.round(player.prHit[x.name])+'</b> lb</div>' : '';
      var prescLine = presc!=null
        ? (wv==="deload" ? '🪫 Deload — today: <b>'+presc+' lb</b> (~60% of last week)' : '📈 Progression earned — today: <b>'+presc+' lb</b>')
        : (topLast ? 'Last time’s top: <b>'+topLast+' lb</b> — beat the reps, then the load follows.' : 'First time — find a weight you can own with 2 reps in reserve.');
      var whyOpen=!!(player.whyOpen && player.whyOpen[st.xi]);
      var acts='<div class="pl-acts">'+
        '<button type="button" class="'+(whyOpen?'on':'')+'" data-plwhy="'+st.xi+'">'+ffIcon("info",13)+' Why</button>'+
        '<button type="button" data-exhist="'+escAttr(x.name)+'">'+ffIcon("history",13)+' History</button>'+
        '<button type="button" data-plswap="'+st.xi+'">'+ffIcon("swap",13)+' Swap</button>'+
        '</div>';
      var whyBox=whyOpen
        ? '<div class="pl-whybox">'+liftWhy(x.name).why+
          '<br><button type="button" class="pl-howto" data-plhowto="'+escAttr(x.name)+'">'+ffIcon("play",12)+' How to do it · muscles &amp; form</button></div>'
        : '';
      return '<div class="pl-skick">Lift '+(st.xi+1)+' of '+player.sess.ex.length+'</div>'+
        '<div class="pl-exname">'+ffPurposeIc(x.name,17)+' '+x.name+'</div>'+
        '<span class="pl-target">'+x.target+'</span>'+
        '<span class="pl-target dim">'+(purposeFor(x.name)==="⚡"?"max intent · full rest":effortNote(x.target))+'</span>'+
        '<div class="pl-presc">'+prescLine+'</div>'+
        '<div class="pl-cue">⚡ '+cue+'</div>'+
        acts+whyBox+livePr+
        '<div class="pl-sets">'+setsHtml+'</div>';
    }
    // recap
    var done=0, vol=0, prs=[], firsts=[];
    player.sess.ex.forEach(function(x){
      var top=0;
      (x.sets||[]).forEach(function(s){ if(s.w||s.r||s.done) done++;
        var w=parseFloat(s.w), r=parseFloat(s.r); if(w>0&&r>0){ vol+=w*r; top=Math.max(top, e1RM(w,r)); } });
      if(top>0){
        var pb=player.prevBest[x.name];
        if(pb!=null && top>pb+0.5) prs.push({ name:x.name, e1:Math.round(top) });
        else if(pb==null && /Squat|Deadlift|Bench|Press|Row|Romanian|Hinge|Hip Thrust|Pull-?up|Chin/i.test(x.name)) firsts.push(x.name);
      }
    });
    var mins=Math.max(1, Math.round(((player.sess.activeMs||0)+(Date.now()-player.startedAt))/60000));
    var octNow=ffScore().score||0, dOct=octNow-player.octBefore;
    return '<div class="pl-recap">'+
      '<div class="pl-recap-kick">Session complete</div>'+
      '<div class="pl-recap-big">'+(vol>0?('<span data-countup="'+vol+'" data-cu-fmt="locale">'+vol.toLocaleString()+'</span><span style="font-size:18px;color:#9fc4ac"> lb moved</span>'):'Work banked 💪')+'</div>'+
      prs.map(function(p){ return '<div class="pl-pr">🚀 PR — '+p.name+' e1RM '+p.e1+' lb</div>'; }).join(" ")+
      (firsts.length?'<div class="pl-first">📌 Benchmarks set: '+firsts.join(", ")+'</div>':'')+
      '<div class="pl-statrow">'+
        '<div class="pl-stat"><div class="v" data-countup="'+done+'">'+done+'</div><div class="k">sets logged</div></div>'+
        '<div class="pl-stat"><div class="v">'+mins+'m</div><div class="k">session time</div></div>'+
        '<div class="pl-stat"><div class="v">'+octNow+(dOct>0?' <small style="color:#8be9ac">▲'+dOct+'</small>':'')+'</div><div class="k">Octane</div></div>'+
      '</div>'+
      '<div class="pl-cue" style="text-align:center">'+(prs.length?'Force is the raw material for clubhead speed — that PR is yards in the bank.':'Consistency is the biggest lever on your Octane. Session banked.')+'</div>'+
      '<textarea class="pl-notes" id="plNote" rows="2" maxlength="240" placeholder="Session notes — sleep, energy, aches… (saved with the workout)">'+lbEsc(player.sess.note||"")+'</textarea>'+
      '<button class="pl-share" data-pladdlift="1" style="border-color:rgba(255,255,255,.25);color:#dff1e4;">＋ Add one more lift</button>'+
      '<button class="pl-share" data-plshare="1">'+ffIcon("share",15)+' Share this session</button>'+
      '</div>';
  }
  function plRender(){
    if(!player) return;
    var head='<div class="pl-toprow"><button class="pl-x" data-plx="1" aria-label="Exit player">×</button>'+
      '<div class="pl-headtx"><div class="pl-kick">WEEK '+player.week+' · '+WAVES[waveFor(player.week)].label.toUpperCase()+'</div>'+
      '<div class="pl-title">'+player.dayName.replace(/^Day \d+ — /,'')+'</div></div></div>'+
      '<div class="pl-dots">'+player.stations.map(function(s,i){
        return '<span class="pl-dot'+(i===player.st?' cur':(i<player.st||plStationDone(i)?' done':''))+'"></span>'; }).join("")+'</div>';
    $("plTop").innerHTML=head;
    $("plBody").innerHTML=plStationHtml();
    $("plBody").scrollTop=0;
    $("plPrev").disabled=player.st===0;
    $("plNext").textContent = (player.stations[player.st].type==="recap") ? "✓ Finish workout" : "Next ›";
    // PR moment: the first time this session's recap shows a PR, make it feel like one.
    if(player.stations[player.st].type==="recap" && !player.celebrated && $("plBody").querySelector(".pl-pr")){
      player.celebrated=true;
      try{ ffCelebrate(); ffTick([25,45,25]); }catch(e){}
    }
  }
  function plFinish(){
    if(!player) return;
    plSave();
    player.sess.finishedAt=todayStr();
    saveSession(player.week, player.dayName, player.sess);
    try{ localStorage.removeItem("ff_pl_paused"); }catch(e){}
    pushHistory(player.week, player.dayName, player.sess);
    try{ ffMilestones(); }catch(e){}
    focusDay=player.dayName;
    ffToast("Workout saved to history 💪 Nice work.");
    plClose();
  }
  function plShare(){
    if(!player) return;
    var vol=0, prs=[];
    player.sess.ex.forEach(function(x){ var top=0;
      (x.sets||[]).forEach(function(s){ var w=parseFloat(s.w), r=parseFloat(s.r); if(w>0&&r>0){ vol+=w*r; top=Math.max(top, e1RM(w,r)); } });
      var pb=player.prevBest[x.name];
      if(top>0 && pb!=null && top>pb+0.5) prs.push(x.name+" e1RM "+Math.round(top)+" lb");
    });
    var txt=player.dayName.replace(/^Day \d+ — /,'')+" done 💪 "+(vol>0?vol.toLocaleString()+" lb moved":"session banked")+
      (prs.length?(" · PR: "+prs.join(", ")):"")+" — training with FairwayFuel ⛳";
    var mins=Math.max(1, Math.round(((player.sess.activeMs||0)+(Date.now()-player.startedAt))/60000));
    ffShareImage({
      kick:"Session complete · Week "+player.week,
      big:(vol>0?vol.toLocaleString():"✓"), unit:(vol>0?"lb moved":""),
      badge:(prs.length?("🚀 PR — "+prs[0]):null),
      lines:[ player.dayName.replace(/^Day \d+ — /,""), mins+" min · "+WAVES[waveFor(player.week)].label+" week",
              (prs.length>1?("+ "+(prs.length-1)+" more PR"+(prs.length>2?"s":"")):null) ]
    }, txt);
  }
  function plEnsure(){
    if($("playerRoot")) return;
    var r=document.createElement("div");
    r.id="playerRoot"; r.className="pl-root"; r.hidden=true;
    r.innerHTML='<div class="pl-top" id="plTop"></div>'+
      '<div class="pl-body" id="plBody"></div>'+
      '<div class="pl-restbar" id="plRestBar" hidden><div class="pl-rest-in">'+
        '<span class="pl-rest-time">0:00</span><span class="pl-rest-lb" style="font-size:12.5px;color:#9fc4ac;">Rest</span>'+
        '<span class="pl-rest-track"><span class="pl-rest-fill" style="width:0%"></span></span>'+
        '<button class="pl-rest-skip" data-plskiprest="1" type="button">Skip</button></div></div>'+
      '<div class="pl-nav"><button class="pl-prev" id="plPrev" data-plprev="1" type="button">‹ Back</button>'+
      '<button class="pl-next" id="plNext" data-plnextbtn="1" type="button">Next ›</button></div>';
    document.body.appendChild(r);
    r.addEventListener("click", function(e){
      if(!player) return;
      if(e.target.closest("[data-plx]")){ plSave(); plClose(); return; }
      if(e.target.closest("[data-plskiprest]")){ plStopRest(); return; }
      if(e.target.closest("[data-plprev]")){ if(player.st>0){ player.st--; plRender(); } return; }
      if(e.target.closest("[data-plnextbtn]")){
        if(player.stations[player.st].type==="recap"){ plFinish(); return; }
        plSave(); player.st++; plRender(); return;
      }
      var wu=e.target.closest("[data-plwu]");
      if(wu){ var wi=+wu.getAttribute("data-plwu");
        if(player.wuDone[wi]) delete player.wuDone[wi]; else player.wuDone[wi]=true;
        plRender(); return; }
      if(e.target.closest("[data-plprimer]")){ player.prDone=!player.prDone; plRender(); return; }
      if(e.target.closest("[data-plshare]")){ plShare(); return; }
      var stp=e.target.closest("[data-plstep]");
      if(stp){
        var st=player.stations[player.st]; if(st.type!=="lift") return;
        var x=player.sess.ex[st.xi], si=+stp.getAttribute("data-si"), f=stp.getAttribute("data-plstep"), dir=+stp.getAttribute("data-dir");
        var s2=x.sets[si]; if(!s2) return;
        var cur=parseFloat(s2[f]);
        if(isNaN(cur)){
          // Seed from the prescription / last time so the first tap lands on a real number.
          var carry=null;
          for(var ci=si-1;ci>=0;ci--){ if(x.sets[ci]&&x.sets[ci][f]){ carry=parseFloat(x.sets[ci][f]); break; } }
          if(carry!=null && !isNaN(carry)){ cur=carry; if(dir<0) cur+=(f==="w"?incNum(x.name):1); }
          else if(f==="w"){ var lx=plLastFor(x.name), top=0; if(lx) lx.sets.forEach(function(ls){ var w=parseFloat(ls.w); if(w>top) top=w; });
            var presc=prescribeW(top||null, x.name, progressReady(lx, x.target), waveFor(player.week));
            cur=(presc!=null?presc:(top||45));
            if(dir<0) cur+= (f==="w"? incNum(x.name):1);   // first minus lands on the seed itself
          } else { var m=String(x.target).match(/[×x]\s*(\d+)/); cur=m?parseInt(m[1],10):8; if(dir<0) cur+=1; }
        }
        var step=(f==="w")?incNum(x.name):1;
        var nv=Math.max(0, Math.round((cur+dir*step)*100)/100);
        s2[f]=String(nv);
        plSave(); plRender(); return;
      }
      if(e.target.closest("[data-pladdlift]")){ addFromPlayer=true; openAddLift(); return; }
      if(e.target.closest("[data-plsetadd]")){
        var stA=player.stations[player.st]; if(stA.type!=="lift") return;
        player.sess.ex[stA.xi].sets.push({w:"",r:"",done:false});
        plSave(); plRender(); return;
      }
      if(e.target.closest("[data-plsetrem]")){
        var stR=player.stations[player.st]; if(stR.type!=="lift") return;
        var xR=player.sess.ex[stR.xi];
        if(xR.sets.length>1){ xR.sets.pop(); plSave(); plRender(); ffTick(10); }
        else ffToast("Last set — swap or remove the lift instead");
        return;
      }
      var pw=e.target.closest("[data-plwhy]");
      if(pw){ var wxi=+pw.getAttribute("data-plwhy");
        player.whyOpen=player.whyOpen||{};
        player.whyOpen[wxi]=!player.whyOpen[wxi];
        plRender(); return; }
      var ph=e.target.closest("[data-plhowto]");
      if(ph){ openExDemo(ph.getAttribute("data-plhowto")); return; }
      var psw=e.target.closest("[data-plswap]");
      if(psw){ var sxi=+psw.getAttribute("data-plswap"), sx=player.sess.ex[sxi];
        if(sx){ swapFromPlayer=true; openSwap(sxi, sx.orig||sx.name, sx.name); }
        return; }
      var ck=e.target.closest("[data-plcheck]");
      if(ck){
        var st2=player.stations[player.st]; if(st2.type!=="lift") return;
        var x2=player.sess.ex[st2.xi], si2=+ck.getAttribute("data-plcheck"), s3=x2.sets[si2]; if(!s3) return;
        s3.done=!s3.done;
        if(s3.done){
          // Empty fields inherit the nearest earlier set — one tap repeats the work.
          if(!s3.w){ for(var cw2=si2-1;cw2>=0;cw2--){ if(x2.sets[cw2]&&x2.sets[cw2].w){ s3.w=x2.sets[cw2].w; break; } } }
          if(!s3.r){ for(var cr2=si2-1;cr2>=0;cr2--){ if(x2.sets[cr2]&&x2.sets[cr2].r){ s3.r=x2.sets[cr2].r; break; } } }
          // Live PR moment: this set beats your all-time e1RM for the lift —
          // celebrate NOW, not at the recap.
          try{
            var w3=parseFloat(s3.w), r3=parseFloat(s3.r);
            if(w3>0 && r3>0){
              var e13=e1RM(w3,r3), pb3=player.prevBest[x2.name];
              player.prHit=player.prHit||{};
              if(pb3!=null && e13>pb3+0.5 && e13>(player.prHit[x2.name]||0)){
                player.prHit[x2.name]=e13;
                ffCelebrate(); ffTick([25,45,25]);
                ffToast("🚀 e1RM PR — "+x2.name+" "+Math.round(e13)+" lb. New ceiling.");
              }
            }
          }catch(e3){}
        }
        plSave();
        if(s3.done){
          ffTick(12);
          var lastSet = si2>=x2.sets.length-1;
          plStartRest(lastSet?REST_BETWEEN_LIFTS:REST_BETWEEN_SETS, lastSet?"Next lift":"Between sets");
        }
        plRender(); return;
      }
    });
    // Long-press: hold a set row to remove that set; hold the exercise name to reorder.
    var lpTimer=null, lpStart=null;
    r.addEventListener("pointerdown", function(e){
      if(!player) return;
      if(e.target.closest("button, input, textarea, select, a")) return;
      var setRow=e.target.closest("[data-plsetrow]");
      var onLift=e.target.closest(".pl-exname, .pl-skick, .pl-target");
      if(!setRow && !onLift) return;
      var st0=player.stations[player.st]; if(!st0 || st0.type!=="lift") return;
      lpStart={x:e.clientX, y:e.clientY};
      clearTimeout(lpTimer);
      lpTimer=setTimeout(function(){
        lpTimer=null;
        try{ ffTick(15); }catch(_){}
        lsSet("ff_hint_press", true);   // gesture learned — the hint retires itself
        if(setRow){
          var xi0=st0.xi, si0=+setRow.getAttribute("data-plsetrow");
          var xL=player.sess.ex[xi0];
          if(xL.sets.length>1){ xL.sets.splice(si0,1); plSave(); plRender(); ffToast("Set "+(si0+1)+" removed"); }
          else ffToast("Last set — swap or remove the lift instead");
        } else {
          openReorder();
        }
      }, 550);
    }, true);
    r.addEventListener("pointermove", function(e){
      if(lpTimer && lpStart && (Math.abs(e.clientX-lpStart.x)>9 || Math.abs(e.clientY-lpStart.y)>9)){ clearTimeout(lpTimer); lpTimer=null; }
    }, true);
    ["pointerup","pointercancel"].forEach(function(ev){
      r.addEventListener(ev, function(){ clearTimeout(lpTimer); lpTimer=null; }, true);
    });
    r.addEventListener("input", function(e){
      if(player && e.target.id==="plNote"){ player.sess.note=e.target.value; plSave(); return; }
      if(!player || !e.target.classList.contains("pl-in")) return;
      var st=player.stations[player.st]; if(st.type!=="lift") return;
      var x=player.sess.ex[st.xi], si=+e.target.getAttribute("data-si");
      if(x && x.sets[si]){ x.sets[si][e.target.getAttribute("data-plf")]=e.target.value; plSave(); }
    });
  }
  // Milestones: crossing a session-count or lifetime-volume threshold gets a
  // celebration. Celebrated levels stored so each fires once per device.
  var FF_MS_SESS=[5,10,25,50,75,100,150,200,300];
  var FF_MS_VOL=[50000,100000,250000,500000,750000,1000000,2000000];
  function ffMilestones(){
    var hist=lsGet("ff_history",[])||[];
    var n=hist.length, vol=0;
    hist.forEach(function(h){ vol+=(h.volume||0); });
    var seen={}; try{ seen=JSON.parse(localStorage.getItem("ff_milestones"))||{}; }catch(e){}
    var msg=null;
    FF_MS_SESS.forEach(function(t){ if(n>=t && (seen.s||0)<t){ seen.s=t; msg="🏆 "+t+" sessions banked — that's a habit, not a phase."; } });
    FF_MS_VOL.forEach(function(t){ if(vol>=t && (seen.v||0)<t){ seen.v=t; msg="🏋️ "+t.toLocaleString()+" lb moved lifetime — you've lifted a house."; } });
    if(msg){
      try{ localStorage.setItem("ff_milestones", JSON.stringify(seen)); }catch(e){}
      setTimeout(function(){ try{ ffCelebrate(); ffTick([30,50,30]); }catch(e){} ffToast(msg); }, 600);
    }
  }

  // The PR Wall: every best the app knows about, in one trophy case. Returns
  // inner content only — it renders as a section of Stats' "Gym & body" card.
  function prWallInner(){
    var rows=[];
    var bests={};
    sessionsByWeek().forEach(function(se){
      (se.s.ex||[]).forEach(function(x){
        if(!/Squat|Deadlift|Bench|Press|Row|Romanian|Hinge|Hip Thrust|Pull-?up|Chin/i.test(x.name)) return;
        (x.sets||[]).forEach(function(st){
          var e1=e1RM(st.w,st.r);
          if(e1>0 && (!bests[x.name] || e1>bests[x.name].v)) bests[x.name]={v:e1, d:se.s.date||""};
        });
      });
    });
    Object.keys(bests).sort(function(a,b){ return bests[b].v-bests[a].v; }).slice(0,3).forEach(function(nm){
      rows.push({ ic:"🏋️", lb:nm+" e1RM", v:Math.round(bests[nm].v), u:"lb", d:bests[nm].d });
    });
    var sBest=null, dBest=null;
    (lsGet("ff_body",[])||[]).forEach(function(e){
      var sv=parseFloat(e.s); if(!isNaN(sv) && (!sBest || sv>sBest.v)) sBest={v:sv, d:e.date||""};
      var dv=parseFloat(e.d); if(!isNaN(dv) && (!dBest || dv>dBest.v)) dBest={v:dv, d:e.date||""};
    });
    if(sBest) rows.push({ ic:"⚡", lb:"7-iron speed", v:Math.round(sBest.v), u:"mph", d:sBest.d });
    if(dBest) rows.push({ ic:"⛳", lb:"Longest drive", v:Math.round(dBest.v), u:"yds", d:dBest.d });
    var big=null, hist=lsGet("ff_history",[])||[], vol=0;
    hist.forEach(function(h){ vol+=(h.volume||0); if(h.volume && (!big || h.volume>big.v)) big={v:h.volume, d:h.date||""}; });
    if(big) rows.push({ ic:"🔥", lb:"Biggest session", v:big.v, u:"lb", d:big.d, loc:true });
    if(!rows.length) return '';   // the Stats "unlocks" strip advertises the wall instead
    var inner='<div class="prw">'+rows.map(function(r){
        return '<div class="prw-r"><span class="prw-ic">'+r.ic+'</span><span class="prw-lb">'+lbEsc(r.lb)+'</span>'+
          '<span class="prw-v"><b>'+(r.loc?r.v.toLocaleString():r.v)+'</b> '+r.u+'</span>'+
          '<span class="prw-d">'+lbEsc(String(r.d||"").replace(/, \d{4}$/,''))+'</span></div>';
      }).join("")+'</div>';
    if(hist.length) inner+='<div class="prw-tot">Lifetime: <b>'+vol.toLocaleString()+'</b> lb moved · <b>'+hist.length+'</b> session'+(hist.length===1?'':'s')+' banked</div>';
    return inner;
  }

  // Reorder the session: a sheet listing today's lifts — drag a row (or use the
  // arrows) and the session order, stations and inline logger all follow.
  function plRebuildStations(keepObj){
    var base=plLiftBase(player.day);
    var stations=[{type:"warmup"}];
    if(player.day.type!=="speed") stations.push({type:"primer"});
    player.sess.ex.forEach(function(x,xi){ stations.push({type:"lift", xi:xi}); });
    stations.push({type:"recap"});
    player.stations=stations;
    if(keepObj){ var ni=player.sess.ex.indexOf(keepObj); if(ni>=0) player.st=base+ni; }
  }
  function plOrdRows(){
    return player.sess.ex.map(function(x,i){
      var done=x.sets.length && x.sets.every(function(s2){ return s2.done; });
      return '<div class="ord-row'+(done?' done':'')+'" data-oi="'+i+'">'+
        '<span class="ord-grab">⠿</span>'+
        '<span class="ord-n">'+ffPurposeIc(x.name,14)+' '+lbEsc(x.name)+(done?' <em>done</em>':'')+'</span>'+
        '<span class="ord-btns"><button type="button" data-ordmv="-1" aria-label="Move up">↑</button>'+
        '<button type="button" data-ordmv="1" aria-label="Move down">↓</button></span></div>';
    }).join("");
  }
  function openReorder(){
    if(!player) return;
    var m=$("plOrdModal");
    if(!m){
      m=document.createElement("div"); m.id="plOrdModal"; m.className="swap-modal"; m.hidden=true;
      m.innerHTML='<div class="swap-card"><div class="swap-head"><span>⇅ Reorder today’s lifts</span>'+
        '<button class="swap-x" id="plOrdX" type="button" aria-label="Close">×</button></div>'+
        '<div class="swap-body"><div class="swap-sub">Drag a row — or use the arrows. The player follows the lift you were on.</div>'+
        '<div id="plOrdList"></div></div></div>';
      document.body.appendChild(m);
      m.addEventListener("click", function(e){
        if(e.target===m || e.target.closest("#plOrdX")){ m.hidden=true; return; }
        var mv=e.target.closest("[data-ordmv]");
        if(mv && player){
          var row=mv.closest(".ord-row"), i=+row.getAttribute("data-oi"), d=+mv.getAttribute("data-ordmv"), j=i+d;
          if(j<0 || j>=player.sess.ex.length) return;
          var cur=player.stations[player.st], keep=(cur&&cur.type==="lift")?player.sess.ex[cur.xi]:null;
          var t=player.sess.ex[i]; player.sess.ex[i]=player.sess.ex[j]; player.sess.ex[j]=t;
          plRebuildStations(keep); plSave(); plRender();
          $("plOrdList").innerHTML=plOrdRows();
        }
      });
      // Row drag: grab anywhere on a row (not the arrows), rows swap live as you cross.
      var drag=null;
      m.addEventListener("pointerdown", function(e){
        if(e.target.closest("button")) return;
        var row=e.target.closest(".ord-row"); if(!row || !player) return;
        drag={ row:row, y0:e.clientY, h:row.getBoundingClientRect().height+6 };
        row.classList.add("dragging");
        try{ row.setPointerCapture(e.pointerId); }catch(_){}
        e.preventDefault();
      });
      m.addEventListener("pointermove", function(e){
        if(!drag) return;
        var dy=e.clientY-drag.y0;
        while(dy>drag.h*0.6 && drag.row.nextElementSibling){
          drag.row.parentNode.insertBefore(drag.row.nextElementSibling, drag.row);
          drag.y0+=drag.h; dy-=drag.h;
        }
        while(dy<-drag.h*0.6 && drag.row.previousElementSibling){
          drag.row.parentNode.insertBefore(drag.row, drag.row.previousElementSibling);
          drag.y0-=drag.h; dy+=drag.h;
        }
        drag.row.style.transform="translateY("+dy+"px)";
      });
      function ordDrop(){
        if(!drag) return;
        var row=drag.row; drag=null;
        row.style.transform=""; row.classList.remove("dragging");
        if(!player) return;
        var order=[].map.call($("plOrdList").querySelectorAll(".ord-row"), function(rw){ return +rw.getAttribute("data-oi"); });
        var cur=player.stations[player.st], keep=(cur&&cur.type==="lift")?player.sess.ex[cur.xi]:null;
        player.sess.ex=order.map(function(oi){ return player.sess.ex[oi]; });
        plRebuildStations(keep); plSave(); plRender();
        $("plOrdList").innerHTML=plOrdRows();
      }
      m.addEventListener("pointerup", ordDrop);
      m.addEventListener("pointercancel", ordDrop);
    }
    $("plOrdList").innerHTML=plOrdRows();
    m.hidden=false;
  }

  // Paused-session bar: when a session with logged work is exited un-finished,
  // a slim resume bar sits above the tab bar on every view until you're back.
  function plPauseSync(){
    var bar=$("plPauseBar");
    if(!bar){
      bar=document.createElement("button");
      bar.id="plPauseBar"; bar.type="button"; bar.className="pl-pausebar"; bar.hidden=true;
      bar.addEventListener("click", function(){
        var st=null; try{ st=JSON.parse(localStorage.getItem("ff_pl_paused")); }catch(e){}
        if(st && st.day) startPlayer(st.day);
      });
      document.body.appendChild(bar);
    }
    var st=null; try{ st=JSON.parse(localStorage.getItem("ff_pl_paused")); }catch(e){}
    var show=false, doneSets=0;
    if(st && st.day && (!player)){
      var sess=getSession(st.week||curWeek(), st.day);
      if(sess && !sess.finishedAt && sess.ex){
        sess.ex.forEach(function(x){ (x.sets||[]).forEach(function(s2){ if(s2.done) doneSets++; }); });
        var allDone=sess.ex.length && sess.ex.every(function(x){ return (x.sets||[]).length && x.sets.every(function(s2){ return s2.done; }); });
        show=!allDone;
      }
      if(!show){ try{ localStorage.removeItem("ff_pl_paused"); }catch(e){} }
    }
    if(show){
      bar.innerHTML='<span class="pl-pb-ic">⏸</span><span class="pl-pb-tx"><b>Workout paused</b> — '+
        lbEsc(st.day.replace(/^Day \d+ — /,""))+' · '+doneSets+' set'+(doneSets===1?'':'s')+' done</span>'+
        '<span class="pl-pb-go">'+ffIcon("play",12)+' Resume</span>';
      bar.hidden=false;
      document.body.classList.add("ff-plpaused");
    } else {
      bar.hidden=true;
      document.body.classList.remove("ff-plpaused");
    }
  }
  window.addEventListener("ff-data-changed", function(){ try{ plPauseSync(); }catch(e){} });
  setTimeout(function(){ try{ plPauseSync(); }catch(e){} }, 400);

  // Every "start workout" entry point (featured day card, speed day, Today spine).
  document.addEventListener("click", function(e){
    var sp=e.target.closest("[data-startplayer]");
    if(sp) startPlayer(sp.getAttribute("data-startplayer"));
  });

  /* ----- Octane score — one number for build-to-speed progress -----
     A composite of the data the app already records: showing up (consistency),
     getting faster (7-iron speed), getting stronger (logged e1RM), and turning
     mass into speed (power-to-weight). It scores YOUR trajectory + consistency —
     not a leaderboard — and only counts pillars you've given data for. */
  function e1RM(w, r){ w=parseFloat(w); r=parseInt(r,10);
    if(!w||!r||r<1) return 0; return w*(1+r/30); }            // Epley estimate
  function sessionsByWeek(){
    var L=getLog(), out=[];
    Object.keys(L).forEach(function(k){ var i=k.indexOf("|");
      out.push({ w:parseInt(k.slice(0,i),10), day:k.slice(i+1), s:L[k] }); });
    out.sort(function(a,b){ return a.w-b.w; });
    return out;
  }
  function strengthGain(){
    // First vs best-recent estimated 1RM on the main compound lifts.
    var sess=sessionsByWeek(), first={}, best={}, KEY=/Squat|Deadlift|Bench|Press|Row|Romanian|Hinge|Hip Thrust|Pull-?up|Chin/i;
    sess.forEach(function(se){ (se.s.ex||[]).forEach(function(x){
      if(!KEY.test(x.name)) return;
      var top=0; (x.sets||[]).forEach(function(st){ top=Math.max(top, e1RM(st.w, st.r)); });
      if(top<=0) return;
      if(first[x.name]==null) first[x.name]=top;
      best[x.name]=Math.max(best[x.name]||0, top);
    }); });
    var gains=[]; Object.keys(first).forEach(function(n){
      if(best[n]>0 && first[n]>0) gains.push((best[n]-first[n])/first[n]); });
    if(!gains.length) return null;
    return gains.reduce(function(a,b){return a+b;},0)/gains.length;       // avg fractional gain
  }
  function clamp(n,lo,hi){ return Math.max(lo, Math.min(hi, n)); }
  function ffScore(){
    var freq = (typeof planState!=="undefined" && planState.freq) ? planState.freq : 4;
    var week = curWeek();
    var sess = sessionsByWeek();
    var loggedWeeks = {}; sess.forEach(function(s){ loggedWeeks[s.w]=(loggedWeeks[s.w]||0)+1; });
    var body = lsGet("ff_body", []);
    var speeds = body.map(function(e){ return parseFloat(e.s); }).filter(function(v){ return !isNaN(v); });
    var weights = body.map(function(e){ return parseFloat(e.w); }).filter(function(v){ return !isNaN(v); });

    var parts = [];

    // 1) Consistency (35) — sessions logged vs. expected over the weeks you've been at it.
    var weeksIn = Math.max(1, Math.min(week, 8));
    var expected = freq * weeksIn;
    var done = sess.length;
    if(done > 0){
      var cons = clamp(done/expected, 0, 1);
      parts.push({ key:"consistency", label:"Consistency", have:true, max:35,
        pts: Math.round(35*cons), detail: done+" session"+(done===1?"":"s")+" logged" });
    } else {
      parts.push({ key:"consistency", label:"Consistency", have:false, max:35, pts:0,
        detail:"Log a workout to start" });
    }

    // 2) Speed (30) — 7-iron clubhead speed gain from your first entry.
    if(speeds.length >= 2){
      var sg = (speeds[speeds.length-1]-speeds[0])/speeds[0];
      parts.push({ key:"speed", label:"Clubhead speed", have:true, max:30,
        pts: Math.round(clamp(15 + sg*220, 0, 30)),
        detail: (sg>=0?"+":"")+(sg*100).toFixed(1)+"% 7-iron" });
    } else {
      parts.push({ key:"speed", label:"Clubhead speed", have:false, max:30, pts:0,
        detail: speeds.length===1 ? "Log again to trend" : "Add a 7-iron speed" });
    }

    // 3) Strength (25) — estimated 1RM progress on the big lifts.
    var stg = strengthGain();
    if(stg!=null){
      parts.push({ key:"strength", label:"Strength (e1RM)", have:true, max:25,
        pts: Math.round(clamp(10 + stg*150, 0, 25)),
        detail: (stg>=0?"+":"")+(stg*100).toFixed(1)+"% on big lifts" });
    } else {
      parts.push({ key:"strength", label:"Strength (e1RM)", have:false, max:25, pts:0,
        detail:"Log weights across weeks" });
    }

    // 4) Power-to-weight (10) — are you getting faster per pound? (speed up vs weight up)
    if(speeds.length>=2 && weights.length>=2){
      var sgn=(speeds[speeds.length-1]-speeds[0])/speeds[0];
      var wgn=(weights[weights.length-1]-weights[0])/weights[0];
      var edge = sgn - wgn;                       // speed outpacing weight = leaner, faster
      parts.push({ key:"p2w", label:"Power-to-weight", have:true, max:10,
        pts: Math.round(clamp(5 + edge*250, 0, 10)),
        detail: edge>=0 ? "Speed outpacing weight" : "Weight rising faster" });
    } else {
      parts.push({ key:"p2w", label:"Power-to-weight", have:false, max:10, pts:0,
        detail:"Track weight + speed" });
    }

    // 5) Mobility (10) — the durability check: prove the new mass is staying mobile.
    var lm = (typeof lastMob==="function") ? lastMob() : null;
    if(lm){
      var mobStale = (Date.now()-lm.ts) > 35*864e5;
      parts.push({ key:"mobility", label:"Mobility", have:true, max:10,
        pts: Math.round((lm.score||0)/100*10),
        detail: mobStale ? "Re-screen due (4-week check)" : (lm.score>=84 ? "Moving well" : "Tight spots — warm-ups tuned") });
    } else {
      parts.push({ key:"mobility", label:"Mobility", have:false, max:10, pts:0,
        detail:"Take the 3-move screen" });
    }

    // 6) Fuel (10) — adherence to the plan the app wrote (last 7 logged days, 14-day window).
    var fsArr=[], fdD=new Date();
    for(var fi=0; fi<14 && fsArr.length<7; fi++){
      var fsc=(typeof fuelScoreFor==="function")?fuelScoreFor(ffISO(fdD)):null;
      if(fsc!=null) fsArr.push(fsc);
      fdD.setDate(fdD.getDate()-1);
    }
    if(fsArr.length){
      var fAvg=fsArr.reduce(function(a,b){ return a+b; },0)/fsArr.length;
      parts.push({ key:"fuel", label:"Fuel", have:true, max:10,
        pts: Math.round(fAvg*10),
        detail: fAvg>=0.85 ? "Eating the plan" : "On the board — tighten it up" });
    } else {
      parts.push({ key:"fuel", label:"Fuel", have:false, max:10, pts:0,
        detail:"Check off today’s meals" });
    }

    var have = parts.filter(function(p){ return p.have; });
    var gotPts = have.reduce(function(a,p){ return a+p.pts; }, 0);
    var gotMax = have.reduce(function(a,p){ return a+p.max; }, 0);
    var score = gotMax>0 ? Math.round(gotPts/gotMax*100) : null;   // rescale to pillars with data
    return { score:score, parts:parts, pillars:have.length };
  }
  var FF_LEVER = {
    consistency: "log your sessions — showing up is worth the most points",
    speed: "test your 7-iron speed every 2 weeks so the trend can climb",
    strength: "push the big lifts with double progression and log the weights",
    p2w: "keep the surplus lean so speed outpaces bodyweight",
    mobility: "run the 3-move mobility screen and hit the warm-up moves it adds",
    fuel: "check off your meals on the Fuel tab — ten seconds a day closes the loop"
  };
  function ffScoreSummary(r){
    if(r.score==null) return "Log a workout and add your bodyweight + 7-iron speed to fill the tank — one number for showing up, getting faster &amp; stronger.";
    if(r.pillars<2) return "Add data across a few weeks so the gauge can read your <b>trend</b>, not just a snapshot.";
    var have=r.parts.filter(function(p){ return p.have; });
    var weak=have.slice().sort(function(a,b){ return (a.pts/a.max)-(b.pts/b.max); })[0];
    var locked=r.parts.filter(function(p){ return !p.have; }).sort(function(a,b){ return b.max-a.max; })[0];
    var pick = (locked && (!weak || (weak.pts/weak.max)>0.6)) ? locked : weak;
    var tone = r.score>=80 ? "Dialed in. " : (r.score>=55 ? "Solid trajectory. " : "Early days. ");
    return tone + "Biggest lever now: <b>" + (FF_LEVER[pick.key]||"keep stacking sessions") + "</b>.";
  }
  // The Octane engine gauge — semicircular fuel-style arc (E→F) that fills with the score.
  function octaneGaugeHtml(score){
    var pct = score==null ? 0 : score, ARC=Math.PI*48, off=ARC*(1-pct/100);
    return '<div class="ffscore-gauge"><svg width="120" height="86" viewBox="0 0 126 90">'+
      '<defs><linearGradient id="ffArc" x1="0" y1="0" x2="1" y2="0">'+
        '<stop offset="0" stop-color="#2f9e5d"/><stop offset="1" stop-color="#8be9ac"/></linearGradient></defs>'+
      '<path d="M15 66 A48 48 0 0 1 111 66" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="12" stroke-linecap="round"/>'+
      '<path d="M15 66 A48 48 0 0 1 111 66" fill="none" stroke="url(#ffArc)" stroke-width="12" stroke-linecap="round" '+
        'stroke-dasharray="'+ARC.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"/>'+
      '<text x="11" y="86" fill="#9ccfb0" font-size="12" font-weight="800">E</text>'+
      '<text x="107" y="86" fill="#9ccfb0" font-size="12" font-weight="800">F</text></svg>'+
      '<div class="num"'+(score==null?'':' data-countup="'+score+'"')+'>'+(score==null?"–":score)+'</div></div>';
  }
  // Driver-carry distance (yards) — the hero outcome. Stored on ff_body entries as `d` so it
  // rides the same sync/merge: works for a launch-monitor carry OR an eyeballed "how far I hit it".
  function driveList(){
    return lsGet("ff_body",[]).filter(function(e){ return e && e.d!=null && e.d!=="" && !isNaN(parseFloat(e.d)); })
      .map(function(e){ return { date:e.date, y:parseFloat(e.d) }; });
  }
  function driveStats(){
    var l=driveList(); if(!l.length) return null;
    var last=l[l.length-1], first=l[0];
    return { latest:Math.round(last.y), baseline:Math.round(first.y), gain:Math.round(last.y-first.y), n:l.length };
  }
  // Single writer for the weight / 7-iron / driver log — merges into one entry per day so the
  // three log spots (dashboard, Stats, Train progress) all behave the same and never dupe a date.
  function logBodyEntry(wv, sv, dv){
    wv=(wv||"").trim(); sv=(sv||"").trim(); dv=(dv||"").trim();
    if(!wv && !sv && !dv) return false;
    var body=lsGet("ff_body",[]), today=todayStr(), row=null;
    for(var bi=body.length-1;bi>=0;bi--){ if(body[bi] && body[bi].date===today){ row=body[bi]; break; } }
    if(!row){ row={ date:today }; body.push(row); }
    if(wv!=="") row.w=wv; if(sv!=="") row.s=sv; if(dv!=="") row.d=dv;
    lsSet("ff_body", body);
    return true;
  }
  function saveScoreSnapshot(r){
    // Stash the Octane score + pillars so the AI coach can explain & coach toward it.
    try { localStorage.setItem("ff_score", JSON.stringify({ score:r.score,
      pillars:r.parts.map(function(p){ return { name:p.label, pts:p.pts, max:p.max, have:p.have, detail:p.detail }; }) })); } catch(e){}
  }
  // Dashboard hero: driver carry + gain up top, the Octane engine gauge underneath.
  function goalYds(){ var g=parseInt(lsGet("ff_goalyds",0),10); return (g>0)?g:null; }
  // Reference numbers calibrated to the user's group (sex + 50+), from public
  // launch-monitor / amateur norms. Used for input placeholders and soft context
  // lines only — scoring stays trend-vs-your-own-baseline everywhere.
  function ffBench(sx, age){
    sx = sx || (typeof state!=="undefined" && state.sex) || "male";
    age = parseInt(age!=null?age:($("age")&&$("age").value), 10) || 0;
    var senior = age >= 50;
    if(sx === "female"){
      return senior
        ? { seven:60, drive:160, weight:145, label:"typical 50+ female amateur", range:"~55–65 mph 7-iron" }
        : { seven:65, drive:175, weight:145, label:"typical female amateur",     range:"~60–68 mph 7-iron" };
    }
    return senior
      ? { seven:75, drive:210, weight:185, label:"typical 50+ male amateur", range:"~70–78 mph 7-iron" }
      : { seven:85, drive:245, weight:180, label:"typical male amateur",     range:"~75–80 mph 7-iron" };
  }
  function renderHeroCard(muted){
    var r=ffScore(); saveScoreSnapshot(r);
    var d=driveStats(), top, gy=goalYds();
    if(d){
      var gain = d.n>=2 ? d.gain : null;
      var missionHtml='';
      if(gain!=null && gy){
        var hit = gain>=gy, pctG = clamp(Math.round(gain/gy*100), 0, 100);
        missionHtml = '<div class="hero-mission'+(hit?' hit':'')+'">'+
          '<span class="hm-lbl">'+(hit?'🏁 Mission complete — +'+gy+' yds':'Mission: +'+gy+' yds')+'</span>'+
          '<span class="hm-track"><span class="hm-fill" style="width:'+Math.max(4,pctG)+'%"></span></span></div>';
      }
      top = '<div class="hero-kick">⛳ Driver carry</div>'+
        '<div class="hero-dist"><b>'+d.latest+'</b><span class="u">yds</span></div>'+
        (gain!=null
          ? '<div class="hero-gainrow"><span class="hero-gain'+(gain>=0?'':' neg')+'">'+(gain>=0?'▲ +':'▼ ')+Math.abs(gain)+' yds</span>'+
            '<span class="hero-since">vs your start · was '+d.baseline+'</span></div>'+missionHtml
          : '<div class="hero-since solo">Baseline banked — your next logged drive starts the climb.</div>');
    } else {
      top = '<div class="hero-kick">⛳ Driver carry</div>'+
        '<div class="hero-empty"><b>Add your driver distance</b><span>From a launch monitor, or just how far you hit it — hit <b>＋ Log</b> and watch it climb.</span></div>';
    }
    // The Octane subline is the SAME dynamic "biggest lever" read the Stats hub
    // uses — a coach line that changes with the data beats a slogan that never
    // does. `muted` = an advice card is already on screen (one coaching voice
    // at a time), so step down to a quiet tag.
    var engine = '<div class="hero-engine">'+octaneGaugeHtml(r.score)+
      '<div class="hero-etx"><div class="hero-ename">'+ffTerm('octane','Octane')+'</div>'+
      '<div class="hero-esub">'+(muted ? 'Your engine — <b>tap for the full breakdown</b>.' : ffScoreSummary(r))+'</div></div></div>';
    return '<button class="ffscore hero-card" data-goview="progress">'+top+engine+heroWeekStrip()+'</button>';
  }
  // Hevy-style week strip: Mon–Sun dots, filled when a session was finished that
  // day, ringed on today — the week's consistency in one glance, on the card you
  // look at every open. Replaces the old "Week so far" row.
  function heroWeekStrip(){
    if(!planStart()) return '';
    var ws=weekStartDateCal(), freq=(typeof planState!=="undefined"&&planState.freq)||4;
    var byDay={};
    lsGet("ff_history",[]).forEach(function(h){
      if(!h || !h.ts) return;
      var d=new Date(h.ts); d.setHours(0,0,0,0); byDay[d.getTime()]=true;
    });
    var today=new Date(); today.setHours(0,0,0,0);
    var n=0, dots='';
    for(var i=0;i<7;i++){
      var d=new Date(ws); d.setDate(ws.getDate()+i);
      var done=!!byDay[d.getTime()];
      if(done) n++;
      dots+='<span class="hw-d'+(done?' on':'')+(d.getTime()===today.getTime()?' today':'')+'">'+
        ["M","T","W","T","F","S","S"][i]+'</span>';
    }
    return '<div class="hero-week"><span class="hw-dots">'+dots+'</span>'+
      '<span class="hw-n"><b>'+n+'</b>/'+freq+' this week</span></div>';
  }
  // The Octane hub: each pillar opens a drill-in — its trend, what it means, and
  // the one action that moves it. The gauge stops being a number and becomes a map.
  var openPillar=null;
  function pillarDetailHtml(p){
    if(p.key==="consistency"){
      return '<div class="fd-tx"><b>'+p.detail+'</b> — sessions logged vs your '+((typeof planState!=="undefined"&&planState.freq)||4)+'/week plan. Showing up is the heaviest pillar.</div>'+
        '<div class="wkbars">'+weekBars()+'</div>'+
        '<button type="button" class="fd-act" data-goview="plan">Open this week ›</button>';
    }
    if(p.key==="speed"){
      var sp=stSpeedHistory();
      return '<div class="fd-tx"><b>'+p.detail+'</b> — 7-iron trend vs your first entry. Every <b>+1 mph ≈ +2 yards</b> of carry.</div>'+
        (sp.length>=2?('<div class="fd-sparkrow">'+pcMiniSpark(sp,"#8be9ac")+'<span class="n">baseline '+sp[0]+' → now '+sp[sp.length-1]+' mph</span></div>'):'')+
        '<button type="button" class="fd-act" data-speedtest="1">🎯 '+(speedTestDue()?'Test due — run it now':'Run a test early')+'</button>';
    }
    if(p.key==="strength"){
      var lifts=bigLiftStats().slice(0,3);
      return '<div class="fd-tx"><b>'+p.detail+'</b> — estimated 1RM on the big lifts, first session vs best. Force is the raw material for speed.</div>'+
        lifts.map(function(L){ return '<div class="fd-sparkrow">'+(L.n>=2?pcMiniSpark(L.series,"#8be9ac"):'')+'<span class="n">'+L.name+' · '+Math.round(L.last)+' lb</span></div>'; }).join("")+
        '<button type="button" class="fd-act" data-goview="plan">Go lift ›</button>';
    }
    if(p.key==="p2w"){
      var body=lsGet("ff_body",[]);
      var sp2=body.map(function(e){ return parseFloat(e.s); }).filter(function(v){ return !isNaN(v); });
      var wt=body.map(function(e){ return parseFloat(e.w); }).filter(function(v){ return !isNaN(v); });
      var sg=sp2.length>=2?((sp2[sp2.length-1]-sp2[0])/sp2[0]*100).toFixed(1):null;
      var wg=wt.length>=2?((wt[wt.length-1]-wt[0])/wt[0]*100).toFixed(1):null;
      return '<div class="fd-tx"><b>'+p.detail+'</b>'+((sg!=null&&wg!=null)?(' — speed '+(sg>=0?'+':'')+sg+'% vs bodyweight '+(wg>=0?'+':'')+wg+'%. Faster per pound = a leaner, harder engine.'):' — track weight AND 7-iron speed to unlock this pillar.')+'</div>'+
        '<button type="button" class="fd-act" data-qopen="1">＋ Log today ›</button>';
    }
    if(p.key==="fuel"){
      var fstk=fuelStreak();
      return '<div class="fd-tx"><b>'+p.detail+'</b> — adherence to the meals the app wrote for you, over your last logged week.'+(fstk>0?(' Current streak: <b>🔥 '+fstk+' days</b>.'):'')+' The scale (metabolism check-in) audits the honesty.</div>'+
        '<button type="button" class="fd-act" data-goview="calc">🍽️ Open today’s meals ›</button>';
    }
    var lm=(typeof lastMob==="function")?lastMob():null;
    return '<div class="fd-tx"><b>'+p.detail+'</b>'+(lm?(' — last screen <b>'+lm.score+'/100</b> on '+lm.date+'. Mass should never cost you turn.'):' — 3 moves, ~3 minutes, no gear.')+'</div>'+
      '<button type="button" class="fd-act" data-mobscreen="1">🧭 '+(mobDue()?'Screen due — run it':'Re-run the screen')+'</button>';
  }
  // Progress tab: the full Octane card with its four component pillars.
  function renderScoreCard(compact){
    var r = ffScore(); saveScoreSnapshot(r);
    var top = '<div class="ffscore-top">'+octaneGaugeHtml(r.score)+
      '<div class="ffscore-head"><h3>'+ffIcon("gauge",15)+' '+ffTerm('octane','OCTANE')+'</h3>'+
      '<p class="ff-sum">'+ffScoreSummary(r)+'</p></div></div>';
    if(compact){
      return '<button class="ffscore ffscore-compact" data-goview="progress">'+top+
        '<span class="ffscore-more">See the full breakdown ›</span></button>';
    }
    // Consolidation pass: the gauge + lever line ARE the daily answer; the six
    // pillar bars are the breakdown, so they fold (ff_statsfold key 'pillars',
    // same toggle plumbing as every other Stats fold). Closed by default.
    if(!pfIsOpen('pillars')){
      return '<div class="ffscore">'+top+
        '<button type="button" class="ffscore-drives" data-pftoggle="pillars">What drives it — the six pillars <span class="pf-arr">›</span></button></div>';
    }
    var bars = r.parts.map(function(p){
      var w = p.max>0 ? Math.round(p.pts/p.max*100) : 0;
      var row='<button type="button" class="ffp'+(p.have?"":" locked")+'" data-pillar="'+p.key+'" aria-expanded="'+(openPillar===p.key?'true':'false')+'">'+
        '<span class="ffp-label">'+p.label.replace(" (e1RM)","")+'</span>'+
        '<span class="ffp-track"><span class="ffp-fill" style="width:'+(p.have?Math.max(7,w):100)+'%"></span></span>'+
        '<span class="ffp-val">'+(p.have? p.pts : "+")+'</span></button>';
      if(openPillar===p.key) row+='<div class="ffp-detail">'+pillarDetailHtml(p)+'</div>';
      return row;
    }).join("");
    return '<div class="ffscore">'+top+'<div class="ffscore-bars">'+bars+'</div>'+
      '<div style="margin-top:8px;font-size:12px;color:#9fc4ac;">Tap a pillar to see what drives it — and the fastest way to move it.</div>'+
      '<button type="button" class="ffscore-drives" data-pftoggle="pillars">Hide the breakdown <span class="pf-arr">⌄</span></button></div>';
  }

  /* ----- Dashboard (home overview) ----- */
  function nextWorkout(){
    var wk=curWeek(), days=activeDays(), L=getLog();
    for(var i=0;i<days.length;i++){ if(days[i].type==="rest") continue; if(!L[wk+"|"+days[i].name]) return days[i].name; }
    for(var j=0;j<days.length;j++){ if(days[j].type!=="rest") return days[j].name; }   // all logged → first workout
    return null;
  }
  // How many of this week's scheduled sessions (lifts + speed day) are logged — for the hero nudge.
  // Counts training sessions only (lifts + speed) — the week's actual work. Rest
  // days are check-off-able for satisfaction (the ✓ chip), but they don't gate
  // "week complete", so nailing every workout always reads as a complete week.
  function weekDoneCount(){
    var wk=curWeek(), total=0, done=0;
    activeDays().forEach(function(d){ if(d.type==="rest") return; total++; if(getSession(wk,d.name)) done++; });
    return { done:done, total:total };
  }
  // One shared "Log today" block — identical fields, styling and behavior on
  // Home and Stats (the third copy in the old Train fold was dead code, removed).
  function quickLogHtml(prefix, hint){
    return '<div class="qlog"><div class="qlog-h">📈 Log today</div>'+
      '<div class="qlog-row">'+
        '<input id="'+prefix+'Body" type="number" inputmode="decimal" placeholder="Weight (lb)" />'+
        '<input id="'+prefix+'Speed" type="number" inputmode="decimal" placeholder="7-iron mph" />'+
        '<input id="'+prefix+'Drive" type="number" inputmode="decimal" placeholder="Driver yds" />'+
      '</div>'+
      '<button id="'+prefix+'Add" class="qlog-add" type="button">Add</button>'+
      (hint?'<div class="qlog-hint">'+hint+'</div>':'')+
      '</div>';
  }
  function dTile(icon, label, big, sub, goview){
    return '<button class="dtile" data-goview="'+goview+'"><span class="dt-ic">'+icon+'</span>'+
      '<span class="dt-label">'+label+'</span><span class="dt-big">'+big+'</span>'+
      '<span class="dt-sub">'+sub+'</span></button>';
  }

  /* ----- Adaptive nutrition: tune calories to the real weight trend -----
     MacroFactor-style: the calculator is a starting guess; the scale is the
     true metabolism meter. Every ~10 days we compare the measured weekly weight
     change to the goal's intended rate and suggest a calorie nudge (into carbs). */
  function weightTrend(){
    var now=Date.now();
    var pts=lsGet("ff_body",[]).map(function(e){ return { t:new Date(e.date).getTime(), w:parseFloat(e.w) }; })
      .filter(function(p){ return !isNaN(p.w) && !isNaN(p.t) && (now-p.t)<=32*864e5; })
      .sort(function(a,b){ return a.t-b.t; });
    if(pts.length<2) return null;
    var spanDays=(pts[pts.length-1].t - pts[0].t)/864e5;
    if(spanDays<10) return null;                       // need a real 10+ day window
    var n=pts.length, t0=pts[0].t, sx=0,sy=0,sxy=0,sxx=0;
    pts.forEach(function(p){ var x=(p.t-t0)/864e5; sx+=x; sy+=p.w; sxy+=x*p.w; sxx+=x*x; });
    var denom=(n*sxx - sx*sx); if(denom===0) return null;
    var slope=(n*sxy - sx*sy)/denom;                    // lb/day (least-squares)
    return { ratePerWeek:slope*7, days:Math.round(spanDays), lastW:pts[pts.length-1].w };
  }
  function adaptiveCheck(){
    var g=GOALS[state.goal]; if(!g) return null;
    var tr=weightTrend(); if(!tr) return null;
    var weightLb=num("weight")||tr.lastW;
    var desired = g.weekly ? ((g.weekly[0]+g.weekly[1])/2)*weightLb : 0;   // signed lb/wk
    var error = tr.ratePerWeek - desired;                                  // + = heavier than intended
    var tol = Math.max(0.25, Math.abs(desired)*0.6);
    var onTrack = Math.abs(error) <= tol;
    var delta = 0;
    if(!onTrack){ delta = -Math.round(error*500/50)*50; delta = Math.max(-250, Math.min(250, delta)); }
    return { rate:tr.ratePerWeek, desired:desired, onTrack:onTrack, deltaKcal:delta, deltaCarb:Math.round(delta/4), goalLabel:g.label };
  }
  function adaptiveDue(){ return !!weightTrend() && (Date.now() - lsGet("ff_lastcheckin",0)) >= 10*864e5; }
  function renderAdaptiveCard(){
    if(!adaptiveDue()) return '';
    var a=adaptiveCheck(); if(!a) return '';
    var rateStr=(a.rate>=0?'+':'')+(Math.round(a.rate*10)/10)+' lb/wk';
    var tgtStr=(a.desired>=0?'+':'')+(Math.round(a.desired*10)/10)+' lb/wk';
    if(a.onTrack){
      return '<div class="adapt ok"><div class="adapt-h">📊 Metabolism check-in</div>'+
        '<p>Your ~3-week trend is <b>'+rateStr+'</b> — right on target for <b>'+a.goalLabel+'</b>. No change needed. '+
        'The scale is the real metabolism meter, and yours says keep going.</p>'+
        '<div class="adapt-btns"><button class="adapt-btn ghost" data-adapt="snooze">Got it 👍</button></div></div>';
    }
    var verb = a.deltaKcal<0 ? 'trim' : 'add';
    var absK=Math.abs(a.deltaKcal), absC=Math.abs(a.deltaCarb);
    return '<div class="adapt"><div class="adapt-h">📊 Metabolism check-in</div>'+
      '<p>Your ~3-week trend is <b>'+rateStr+'</b> (target ~<b>'+tgtStr+'</b> for '+a.goalLabel+') — trending '+(a.deltaKcal<0?'a bit fast':'a bit slow')+'. '+
      'The calculator was a starting guess; your scale is the real metabolism meter, so let’s tune it.</p>'+
      '<div class="adapt-sugg">'+(a.deltaKcal<0?'▼':'▲')+' '+verb+' <b>'+absK+' kcal/day</b> ('+(a.deltaKcal<0?'−':'+')+absC+'g carbs)</div>'+
      '<div class="adapt-btns"><button class="adapt-btn" data-adapt="apply">Apply '+(a.deltaKcal<0?'−':'+')+absK+' kcal</button>'+
      '<button class="adapt-btn ghost" data-adapt="snooze">Not now</button></div></div>';
  }
