  /* ===================== EXERCISE HISTORY — every lift's full story =====================
     Tap a lift name anywhere (player, inline logger, Stats) and get the Hevy-grade
     view: PR badges (best e1RM, heaviest set, best session volume), the e1RM trend,
     and every past session's sets. Sourced from permanent ff_history plus any
     in-progress ff_log sessions not yet finished into history. */
  function exHistData(name){
    var out=[], seen={};
    (lsGet("ff_history",[])||[]).forEach(function(h){
      if(!h || !h.ex) return;
      var hit=null;
      h.ex.forEach(function(x){ if(x.name===name && x.sets && x.sets.length) hit=x; });
      if(!hit) return;
      seen[(h.week||"")+"|"+(h.day||"")]=true;
      out.push({ ts:h.ts||0, date:h.date||"", week:h.week, sets:hit.sets, note:h.note||"" });
    });
    var L=getLog();
    Object.keys(L).forEach(function(k){
      var i=k.indexOf("|"), w=parseInt(k.slice(0,i),10), dn=k.slice(i+1), sess=L[k];
      if(seen[w+"|"+dn] || !sess || !sess.ex) return;
      sess.ex.forEach(function(x){
        if(x.name!==name) return;
        var sets=(x.sets||[]).filter(function(st){ return st.w||st.r; });
        if(!sets.length) return;
        out.push({ ts:new Date(sess.date||0).getTime()||0, date:sess.date||("Week "+w), week:w,
          sets:sets, note:sess.note||"", live:!sess.finishedAt });
      });
    });
    out.forEach(function(en){
      var top=0, topW=0, vol=0;
      en.sets.forEach(function(st){ var wv=parseFloat(st.w), r=parseFloat(st.r);
        if(wv>0 && r>0){ vol+=wv*r; var e=e1RM(wv,r); if(e>top) top=e; }
        if(wv>topW) topW=wv; });
      en.e1=top; en.topW=topW; en.vol=vol;
    });
    out.sort(function(a,b){ return (b.ts||0)-(a.ts||0); });
    return out;
  }
  function xhEnsure(){
    if($("xhModal")) return;
    var m=document.createElement("div"); m.id="xhModal"; m.className="swap-modal"; m.hidden=true;
    m.innerHTML='<div class="swap-card"><div class="swap-head"><span id="xhTitle">History</span>'+
      '<button class="swap-x" id="xhX" type="button" aria-label="Close">×</button></div><div class="swap-body" id="xhBody"></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", function(e){
      if(e.target===m || e.target.closest("#xhX")){
        m.hidden=true;
        document.body.style.overflow=(typeof player!=="undefined" && player)?"hidden":"";
      }
    });
  }
  function openExHist(name){
    xhEnsure();
    var data=exHistData(name);
    var bestE=0,bestEd="",bestW=0,bestWd="",bestV=0,bestVd="";
    data.forEach(function(en){
      if(en.e1>bestE){ bestE=en.e1; bestEd=en.date; }
      if(en.topW>bestW){ bestW=en.topW; bestWd=en.date; }
      if(en.vol>bestV){ bestV=en.vol; bestVd=en.date; }
    });
    var seriesPts=data.slice().reverse().filter(function(en){ return en.e1>0; });
    var series=seriesPts.map(function(en){ return Math.round(en.e1); });
    var seriesD=seriesPts.map(function(en){ return en.date; });
    var html='';
    if(!data.length){
      html='<div class="swap-sub">No logged sets for <b>'+lbEsc(name)+'</b> yet — log a session and its story starts here.</div>';
    } else {
      html+='<div class="xh-prs">'+
        (bestE>0?'<div class="xh-pr"><div class="v">'+Math.round(bestE)+'<small>lb</small></div><div class="k">best e1RM<br>'+lbEsc(bestEd)+'</div></div>':'')+
        (bestW>0?'<div class="xh-pr"><div class="v">'+bestW+'<small>lb</small></div><div class="k">heaviest set<br>'+lbEsc(bestWd)+'</div></div>':'')+
        (bestV>0?'<div class="xh-pr"><div class="v">'+Math.round(bestV).toLocaleString()+'<small>lb</small></div><div class="k">best volume<br>'+lbEsc(bestVd)+'</div></div>':'')+
        '</div>';
      if(series.length>=2) html+='<div class="xh-chart-h">Estimated 1RM trend</div>'+pcLine(series,"#16a34a","xhE1", seriesD, " lb");
      html+='<div class="xh-list">'+data.map(function(en){
        var setsStr=en.sets.map(function(st){ return (st.w||"–")+"×"+(st.r||"–"); }).join("  ·  ");
        return '<div class="xh-row'+(en.live?" live":"")+'">'+
          '<div class="xh-top"><span class="xh-date">'+lbEsc(en.date)+(en.live?' <em>in progress</em>':'')+(en.week?' <small>· wk '+en.week+'</small>':'')+'</span>'+
          '<span class="xh-e1">'+(en.e1>0?('e1RM <b>'+Math.round(en.e1)+'</b>'):'')+'</span></div>'+
          '<div class="xh-sets">'+lbEsc(setsStr)+'</div>'+
          (en.note?'<div class="xh-note">📝 '+lbEsc(en.note)+'</div>':'')+
          '</div>';
      }).join("")+'</div>';
    }
    $("xhTitle").textContent="📊 "+name;
    $("xhBody").innerHTML=html;
    $("xhModal").hidden=false;
    document.body.style.overflow="hidden";
  }
  // One listener for every history entry point (player, inline logger, Stats).
  document.addEventListener("click", function(e){
    var xh=e.target.closest("[data-exhist]");
    if(xh) openExHist(xh.getAttribute("data-exhist"));
  });
  // Stable-enough unique ids for read-only "why" rows (DOM is replaced each render).
  var whyId=0;
  function exNameCell(pe, name, extra){
    var id="why"+(whyId++);
    return { cell:'<td><button class="exwhy-btn" type="button" data-whyrow="'+id+'" aria-expanded="false">'+pe+name+(extra||"")+' <span class="exwhy-i">ⓘ</span></button></td>',
             row:'<tr class="exwhy-row" id="'+id+'" hidden><td colspan="2"><div class="exwhy-panel">'+whyHtml(name,false)+'</div></td></tr>' };
  }
  function renderILog(){ var el=$("ilogBox"); if(el && ilog) el.innerHTML=ilogBodyHtml(); renderFinishBar(); }
  // Refresh just the finish/clear bar (sibling of the inputs → safe to update mid-typing, no focus steal).
  function renderFinishBar(){ var el=$("finishBar"); if(el) el.innerHTML=finishBtnHtml(); }
  // Sync the barbell plate-math hint under one set's weight input, in place (no re-render → keeps focus).
  function ilPlateSync(inp){
    if(!ilog || !inp) return;
    var xi=+inp.getAttribute("data-x"), row=inp.closest(".il-set"); if(!row) return;
    var pm = isBarbell(ilog.sess.ex[xi].name) ? platesFor(inp.value) : "";
    var next=row.nextElementSibling, hasP=next && next.classList && next.classList.contains("il-plates");
    if(pm){ if(hasP) next.textContent="🏋️ "+pm; else { var d=document.createElement("div"); d.className="il-plates"; d.textContent="🏋️ "+pm; row.parentNode.insertBefore(d, row.nextSibling); } }
    else if(hasP) next.remove();
  }
  function saveILog(){ if(!ilog) return; if(!ilog.sess.date) ilog.sess.date=todayStr(); saveSession(ilog.week, ilog.day, ilog.sess); }
  // ---- swap picker ----
  var swapCtx=null;
  function openSwap(xi, orig, cur){
    swapCtx={ xi:xi, orig:orig };
    var opts=swapOptionsFor(orig);
    var owned=[], missing=[];
    opts.forEach(function(o){ (equipOk(o)?owned:missing).push(o); });
    function opt(o, flagged){
      var active=(o===cur);
      return '<button class="swap-opt'+(active?" cur":"")+(flagged?" nogear":"")+'" data-swapchoose="'+escAttr(o)+'">'+ffPurposeIc(o)+' '+o+
        (active?' <span class="swap-now">current</span>':'')+
        (flagged?' <span class="swap-need">needs '+equipNeedsLabel(o)+'</span>':'')+'</button>';
    }
    var html='<div class="swap-sub">Pick a valid replacement — same muscles, equally hard. It sticks in your plan.</div>';
    html+=owned.map(function(o){ return opt(o,false); }).join("");
    if(missing.length){
      html+='<div class="swap-divide">Needs gear you haven’t added — still selectable</div>'+
        missing.map(function(o){ return opt(o,true); }).join("");
    }
    if(cur!==orig) html+='<button class="swap-opt reset" data-swapchoose="'+escAttr(orig)+'">↩ Reset to original ('+orig+')</button>';
    html+='<button class="swap-coach" data-swapcoach="1">💬 Ask the coach for another idea</button>';
    $("swapBody").innerHTML=html; $("swapTitle").textContent="Swap "+cur;
    var m=$("swapModal"); m.hidden=false; document.body.style.overflow="hidden";
  }
  function closeSwap(){ var m=$("swapModal"); if(m) m.hidden=true;
    // Keep the page locked if the player (or another sheet) is still underneath.
    document.body.style.overflow=(typeof player!=="undefined" && player)?"hidden":"";
    swapCtx=null; swapFromPlayer=false; addFromPlayer=false; }
  // Add a whole new lift to today's session — browse the full database, searchable.
  function addLiftGroupsHtml(filter){
    var raw=(filter||"").trim(), f=raw.toLowerCase();
    var html="";
    // Offer the typed name as a custom lift when it isn't already an exact library match.
    if(raw){
      var exact=false;
      EX_GROUP_ORDER.forEach(function(g){ EXERCISE_DB[g].forEach(function(o){ if(o.toLowerCase()===f) exact=true; }); });
      if(!exact){
        var disp=raw.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
        html+='<button class="swap-opt add-custom" data-addcustom="'+escAttr(raw)+'">➕ Add “'+disp+'” as a custom lift</button>';
      }
    }
    EX_GROUP_ORDER.forEach(function(g){
      var items=EXERCISE_DB[g].filter(function(o){ return !f || o.toLowerCase().indexOf(f)>=0; });
      if(!items.length) return;
      html+='<div class="add-group">'+g+'</div>';
      items.forEach(function(o){ var ok=equipOk(o);
        html+='<button class="swap-opt'+(ok?"":" nogear")+'" data-addchoose="'+escAttr(o)+'">'+ffPurposeIc(o)+' '+o+
          (ok?'':' <span class="swap-need">needs '+equipNeedsLabel(o)+'</span>')+'</button>'; });
    });
    return html || '<div class="swap-sub">Type a name above, then tap “Add as a custom lift”.</div>';
  }
  function openAddLift(){
    swapCtx=null;
    $("swapTitle").textContent="Add a lift";
    $("swapBody").innerHTML='<input class="add-search" id="addSearch" type="text" placeholder="Search 200+ lifts — or type your own…" autocomplete="off" />'+
      '<div id="addList">'+addLiftGroupsHtml("")+'</div>';
    var m=$("swapModal"); m.hidden=false; document.body.style.overflow="hidden";
  }
  var addFromPlayer=false;
  function addLiftChoice(name){
    if(addFromPlayer && player){
      player.sess.ex.push({ name:name, orig:name, target:"3 × 10", sets:[{w:"",r:"",done:false},{w:"",r:"",done:false},{w:"",r:"",done:false}] });
      var nxi=player.sess.ex.length-1;
      player.stations.splice(player.stations.length-1, 0, { type:"lift", xi:nxi });
      player.st=player.stations.length-2;   // land on the new lift, recap stays last
      plSave(); plRender();
    } else if(ilog){
      ilog.sess.ex.push({ name:name, orig:name, target:"3 × 10", sets:[{w:"",r:"",done:false},{w:"",r:"",done:false},{w:"",r:"",done:false}] });
      saveILog(); renderILog();
    }
    closeSwap();
  }
  // ---- Finish workout + permanent history ----
  // ff_history is an append-only, calendar-dated log (independent of the week|day plan
  // keys, so it survives the 20-week loop and plan resets) — kept indefinitely, synced.
  function finishBtnHtml(){
    if(typeof ilog==="undefined" || !ilog) return "";
    var logged=!!getSession(ilog.week, ilog.day);
    var btn = ilog.sess.finishedAt
      ? '<button class="finish-btn done" data-finish="1"><span>✓ Workout saved to history</span><span class="fb-sub">'+escAttr(ilog.sess.finishedAt)+' · tap to re-save</span></button>'
      : '<button class="finish-btn" data-finish="1">✓ Finish workout</button>';
    // Only offer a clear once there's actually something logged for this day.
    return btn + (logged ? '<button class="clear-workout" data-clearworkout="1">Clear this workout</button>' : '');
  }
  function ffTomb(key){ var d=lsGet("ff_deleted",{}); if(!d||typeof d!=="object") d={}; d[key]=Date.now(); lsSet("ff_deleted",d); }
  // Clear the active day: wipe its week log + any matching history entry, and drop a tombstone
  // so the deletion holds through cloud sync (re-logging later re-creates it with a newer stamp).
  function clearWorkout(){
    if(!ilog) return;
    var wk=ilog.week, day=ilog.day, L=getLog();
    if(L[wk+"|"+day]!==undefined){ delete L[wk+"|"+day]; lsSet("ff_log",L); }
    ffTomb("L:"+wk+"|"+day);
    var hist=lsGet("ff_history",[]);
    if(Array.isArray(hist)){
      var kept=[]; hist.forEach(function(h){ if(h&&h.day===day&&h.week===wk){ ffTomb("H:"+h.id); } else kept.push(h); });
      if(kept.length!==hist.length) lsSet("ff_history",kept);
    }
    focusDay=day;
    try{ renderPhase(); }catch(e){}
    try{ if(typeof renderDash==="function") renderDash(); }catch(e){}
    ffToast("Workout cleared.");
  }
  function deleteHistory(id){
    var hist=lsGet("ff_history",[]); if(!Array.isArray(hist)) return;
    var kept=hist.filter(function(h){ return !(h&&h.id===id); });
    if(kept.length===hist.length) return;
    lsSet("ff_history",kept); ffTomb("H:"+id);
    var body=$("swapBody"); if(body) body.innerHTML='<div class="swap-sub">Every finished workout, kept for good — backed up when you’re signed in.</div>'+historyRowsHtml();
    try{ if(typeof renderDash==="function") renderDash(); }catch(e){}
    ffToast("Removed from history.");
  }
  function pushHistory(week, day, sess){
    var hist=lsGet("ff_history", []); if(!Array.isArray(hist)) hist=[];
    var date=sess.date||todayStr(), id=date+" · "+day, vol=0, setCount=0;
    (sess.ex||[]).forEach(function(x){ (x.sets||[]).forEach(function(s){
      if(s.w||s.r||s.done) setCount++;
      var w=parseFloat(s.w), r=parseFloat(s.r); if(w>0&&r>0) vol+=w*r; }); });
    var entry={ id:id, ts:Date.now(), date:date, day:day, week:week, sets:setCount, volume:Math.round(vol),
      note:(sess.note||"").slice(0,240),
      ex:(sess.ex||[]).map(function(x){ return { name:x.name, target:x.target,
        sets:(x.sets||[]).filter(function(s){ return s.w||s.r||s.done; }).map(function(s){ return {w:s.w,r:s.r}; }) }; }) };
    var idx=-1; for(var k=0;k<hist.length;k++){ if(hist[k].id===id){ idx=k; break; } }
    if(idx>=0) hist[idx]=entry; else hist.push(entry);
    lsSet("ff_history", hist);
  }
  function finishWorkout(){
    if(!ilog) return;
    if(!ilog.sess.date) ilog.sess.date=todayStr();
    ilog.sess.finishedAt=todayStr();
    saveILog();
    pushHistory(ilog.week, ilog.day, ilog.sess);
    focusDay = ilog.day;   // stay on the workout you just finished (show the saved state)
    try{ renderPhase(); }catch(e){}
    try{ if(typeof renderDash==="function") renderDash(); }catch(e){}
    ffToast("Workout saved to history 💪 Nice work.");
  }
  function ffToast(msg){
    var t=document.createElement("div"); t.className="ff-toast"; t.textContent=msg;
    document.body.appendChild(t);
    setTimeout(function(){ t.classList.add("show"); }, 15);
    setTimeout(function(){ t.classList.remove("show"); setTimeout(function(){ t.remove(); }, 320); }, 2400);
  }
  function historyRowsHtml(){
    var hist=(lsGet("ff_history", [])||[]).slice().sort(function(a,b){ return (b.ts||0)-(a.ts||0); });
    if(!hist.length) return '<div class="swap-sub">No finished workouts yet. Tap <b>✓ Finish workout</b> at the bottom of a session to lock it into your history — kept for good.</div>';
    return hist.map(function(h){
      var nm=String(h.day||"").replace(/Days? [\d–-]+ — /,"").replace(/Day \d+ — /,"");
      var detail=(h.ex||[]).filter(function(x){ return x.sets && x.sets.length; }).map(function(x){
        var sets=x.sets.map(function(s){ return (s.w&&s.r)?(s.w+'×'+s.r):(s.w?s.w+' lb':(s.r?s.r+' reps':'✓')); }).join('  ·  ');
        return '<div class="hist-ex"><span class="hex-name">'+escAttr(x.name)+'</span><span class="hex-sets">'+sets+'</span></div>';
      }).join("") || '<div class="hist-ex"><span class="hex-name" style="color:var(--muted)">No set details saved for this one.</span></div>';
      return '<div class="hist-row" data-histtoggle="'+escAttr(h.id)+'">'+
        '<div class="hist-top"><span class="hist-day"><span class="hist-chev">›</span> '+escAttr(nm)+'</span>'+
          '<span class="hist-right"><span class="hist-date">'+escAttr(h.date||"")+'</span>'+
          '<button class="hist-del" data-histdel="'+escAttr(h.id)+'" aria-label="Delete this workout" title="Delete">🗑</button></span></div>'+
        '<div class="hist-meta">'+(h.sets||0)+' set'+((h.sets===1)?'':'s')+(h.volume?' · '+h.volume.toLocaleString()+' lb total':'')+(h.week?' · Week '+h.week:'')+'</div>'+
        (h.note?'<div class="hist-meta">📝 '+lbEsc(h.note)+'</div>':'')+
        '<div class="hist-detail" hidden>'+detail+'</div></div>';
    }).join("");
  }
  function openHistory(){
    swapCtx=null; $("swapTitle").textContent="Workout history";
    $("swapBody").innerHTML='<div class="swap-sub">Every finished workout, kept for good — backed up when you’re signed in.</div>'+historyRowsHtml();
    var m=$("swapModal"); m.hidden=false; document.body.style.overflow="hidden";
  }
  var swapFromPlayer=false;
  function applySwapChoice(chosen){
    if(!swapCtx) return;
    setSwap(swapCtx.orig, chosen);
    if(swapFromPlayer && player && player.sess.ex[swapCtx.xi]){
      // Swapping mid-player: same-muscle replacement takes over this station,
      // sets reset (different lift, different loads), and it sticks in the plan.
      var px=player.sess.ex[swapCtx.xi]; px.name=chosen; px.orig=swapCtx.orig;
      px.sets=px.sets.map(function(){ return {w:"",r:"",done:false}; });
      if(player.whyOpen) player.whyOpen[swapCtx.xi]=false;
      plSave(); plRender();
    } else if(ilog && ilog.sess.ex[swapCtx.xi]){
      var ex=ilog.sess.ex[swapCtx.xi]; ex.name=chosen; ex.orig=swapCtx.orig;
      ex.sets=ex.sets.map(function(){ return {w:"",r:"",done:false}; });
      saveILog(); renderILog();
    } else { renderPhase(); }
    closeSwap();
  }
  // ---- rest timer (floating pill) ----
  function startRest(secs, label){ restEnd=Date.now()+secs*1000; if(!restTimer) restTimer=setInterval(tickRest,250);
    var pill=$("restPill"); if(pill){ pill.hidden=false; var lb=pill.querySelector(".rp-label"); if(lb) lb.textContent="⏱ "+(label||"Rest"); }
    tickRest(); }
  function stopRest(){ if(restTimer){ clearInterval(restTimer); restTimer=null; } var pill=$("restPill"); if(pill) pill.hidden=true; }
  function tickRest(){
    var pill=$("restPill"); if(!pill) return;
    var left=Math.ceil((restEnd-Date.now())/1000), t=pill.querySelector(".rp-time");
    if(left<=0){ clearInterval(restTimer); restTimer=null; if(t) t.textContent="GO 💥"; try{ navigator.vibrate&&navigator.vibrate(180);}catch(e){} setTimeout(stopRest,1600); return; }
    if(t){ var m=Math.floor(left/60), sc=left%60; t.textContent=(m>0?m+":":"")+(m>0&&sc<10?"0":"")+sc; }
  }
