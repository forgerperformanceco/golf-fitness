  /* ===================== DAILY READINESS → ADAPTIVE SESSION =====================
     A 20-second, three-signal check-in that changes today's dose—not the plan.
     This is deterministic coaching, not diagnosis: the authored exercise order
     stays intact, the calendar never moves, and the user can keep the full dose. */
  var ffReadyDraft=null, ffReadyDay="", ffReadyMode="player", ffReadyReturn=null;
  function ffReadinessDate(){
    var d=new Date();
    return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);
  }
  function ffReadinessRows(){
    var rows=lsGet("ff_readiness",[]);
    return Array.isArray(rows)?rows:[];
  }
  function ffReadinessToday(){
    var key=ffReadinessDate(), rows=ffReadinessRows();
    for(var i=rows.length-1;i>=0;i--) if(rows[i]&&rows[i].date===key) return rows[i];
    return null;
  }
  function ffReadinessBand(score){
    return score>=5?"ready":(score>=3?"steady":"recharge");
  }
  function ffReadinessMeta(band){
    return band==="ready"
      ? {label:"Full send",title:"Run the full plan",copy:"Your signals support the authored dose. Train hard and own the reps."}
      : (band==="steady"
        ? {label:"Smart trim",title:"Keep quality, trim fatigue",copy:"Main work stays. Later accessories lose one set so quality wins today."}
        : {label:"Recovery dose",title:"Protect tomorrow's speed",copy:"Two crisp sets per lift at about 70–80% of normal. No PR chasing today."});
  }
  function ffReadinessRetarget(target,count){
    return String(target||"").replace(/^(\s*)\d+/,function(_,sp){ return sp+count; });
  }
  function ffReadinessAdaptSession(sess,record){
    if(!sess||!record) return sess;
    sess.readiness={date:record.date,ts:record.ts,band:record.band,score:record.score,original:!!record.original};
    if(record.original||record.band==="ready") return sess;
    (sess.ex||[]).forEach(function(x,i){
      var count=(x.sets||[]).length;
      var keep=record.band==="recharge"?Math.min(2,count):(i>=2?Math.max(2,count-1):count);
      if(keep<count){
        x.baseTarget=x.target;
        x.sets=x.sets.slice(0,keep);
        x.target=ffReadinessRetarget(x.target,keep);
      }
    });
    return sess;
  }
  function ffApplyReadiness(sess){
    return ffReadinessAdaptSession(sess,ffReadinessToday());
  }
  function ffReadinessLoad(last,band){
    var n=parseFloat(last);
    if(!(n>0)||band!=="recharge") return null;
    return Math.max(5,Math.round((n*.75)/5)*5);
  }
  function ffReadinessSave(original){
    if(!ffReadyDraft) return null;
    var score=ffReadyDraft.sleep+ffReadyDraft.body+ffReadyDraft.energy;
    var rec={date:ffReadinessDate(),ts:Date.now(),sleep:ffReadyDraft.sleep,body:ffReadyDraft.body,
      energy:ffReadyDraft.energy,score:score,band:ffReadinessBand(score),original:!!original};
    var rows=ffReadinessRows().filter(function(r){ return r&&r.date!==rec.date; });
    rows.push(rec); if(rows.length>60) rows=rows.slice(-60);
    lsSet("ff_readiness",rows);
    try{ if(window.FFHealth) window.FFHealth.track("readiness_completed",{band:rec.band}); }catch(_){}
    try{ renderPhase(); renderDash(); }catch(_){}
    return rec;
  }
  function ffReadinessNeedsCheck(day){
    return !!(day&&day.type!=="rest"&&!ffReadinessToday()&&!getSession(curWeek(),day.name));
  }
  function ffReadinessClose(){
    var m=$("readinessModal"); if(m){ m.hidden=true; m.setAttribute("aria-hidden","true"); }
    ffReadyDraft=null; ffReadyDay=""; ffReadyMode="player";
    if(ffReadyReturn&&ffReadyReturn.focus) try{ ffReadyReturn.focus(); }catch(_){}
    ffReadyReturn=null;
  }
  function ffReadinessResult(rec){
    var m=ffReadinessMeta(rec.band), root=$("readyBody"); if(!root) return;
    root.innerHTML='<div class="ready-result '+rec.band+'"><div class="ready-orb">'+
      (rec.band==="ready"?"⚡":(rec.band==="steady"?"🎯":"🌱"))+'</div>'+
      '<small>'+m.label.toUpperCase()+'</small><h3>'+m.title+'</h3><p>'+m.copy+'</p>'+
      '<div class="ready-safety">Sharp pain, a new injury, dizziness, or illness? Skip training and get appropriate medical care.</div>'+
      '<button type="button" class="ready-primary" data-readystart="adapt">Start today’s dose</button>'+
      (rec.band!=="ready"?'<button type="button" class="ready-link" data-readystart="original">Keep the original session</button>':'')+
      '</div>';
  }
  function ffReadinessLaunch(day,mode){
    if(mode==="manual") openLogger(day,true); else startPlayer(day,true);
  }
  function ffReadinessOpen(dayName,mode){
    ffReadyReturn=document.activeElement;
    ffReadyDay=dayName||""; ffReadyMode=mode==="manual"?"manual":"player";
    ffReadyDraft={sleep:null,body:null,energy:null};
    var m=$("readinessModal");
    if(!m){
      m=document.createElement("div"); m.id="readinessModal"; m.className="ready-modal"; m.hidden=true;
      m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","readyTitle");
      m.innerHTML='<div class="ready-sheet"><button type="button" class="ready-x" data-readyclose="1" aria-label="Close">×</button>'+
        '<div id="readyBody"></div></div>';
      document.body.appendChild(m);
      m.addEventListener("click",function(e){
        if(e.target===m||e.target.closest("[data-readyclose]")){ ffReadinessClose(); return; }
        var pick=e.target.closest("[data-readykey]");
        if(pick){
          var key=pick.getAttribute("data-readykey"), val=+pick.getAttribute("data-readyval");
          ffReadyDraft[key]=val;
          [].forEach.call(m.querySelectorAll('[data-readykey="'+key+'"]'),function(b){ b.classList.toggle("active",b===pick); });
          var go=$("readyScore"); if(go) go.disabled=ffReadyDraft.sleep==null||ffReadyDraft.body==null||ffReadyDraft.energy==null;
          return;
        }
        if(e.target.closest("#readyScore")){ ffReadinessResult(ffReadinessSave(false)); return; }
        var start=e.target.closest("[data-readystart]");
        if(start){
          var original=start.getAttribute("data-readystart")==="original";
          if(original){
            var rows=ffReadinessRows(), today=ffReadinessToday();
            if(today){ today.original=true; today.ts=Date.now(); lsSet("ff_readiness",rows); }
          }
          var day=ffReadyDay, mode=ffReadyMode; ffReadinessClose();
          try{ if(window.FFHealth) window.FFHealth.track("adaptive_session_started",
            {band:(ffReadinessToday()||{}).band||"skip",override:original}); }catch(_){}
          ffReadinessLaunch(day,mode); return;
        }
        if(e.target.closest("[data-readyskip]")){
          var skipDay=ffReadyDay, skipMode=ffReadyMode; ffReadinessClose(); ffReadinessLaunch(skipDay,skipMode);
        }
      });
    }
    $("readyBody").innerHTML='<div class="ready-intro"><small>20-SECOND CHECK-IN</small>'+
      '<h2 id="readyTitle">How are you showing up?</h2><p>Three honest taps. Yardsmith changes today’s dose—not your plan.</p></div>'+
      '<div class="ready-q"><b>Sleep</b><div class="ready-seg">'+
        '<button data-readykey="sleep" data-readyval="0">Rough</button><button data-readykey="sleep" data-readyval="1">Okay</button><button data-readykey="sleep" data-readyval="2">7–9 h</button></div></div>'+
      '<div class="ready-q"><b>Body</b><div class="ready-seg">'+
        '<button data-readykey="body" data-readyval="0">Sore</button><button data-readykey="body" data-readyval="1">Normal</button><button data-readykey="body" data-readyval="2">Loose</button></div></div>'+
      '<div class="ready-q"><b>Energy</b><div class="ready-seg">'+
        '<button data-readykey="energy" data-readyval="0">Low</button><button data-readykey="energy" data-readyval="1">Steady</button><button data-readykey="energy" data-readyval="2">High</button></div></div>'+
      '<button type="button" class="ready-primary" id="readyScore" disabled>Build today’s dose</button>'+
      '<button type="button" class="ready-link" data-readyskip="1">Skip and use the original session</button>';
    m.hidden=false; m.setAttribute("aria-hidden","false");
    setTimeout(function(){ var b=m.querySelector("[data-readykey]"); if(b) b.focus(); },30);
  }
  function ffReadinessInlineHtml(day){
    if(!day||day.type==="rest"||isFutureDay(day.name)) return "";
    var sess=getSession(curWeek(),day.name);
    if(sessionFinished(sess)||(sess&&!sess.readiness)) return "";
    var r=(sess&&sess.readiness)||ffReadinessToday();
    if(!r) return '<button type="button" class="ready-inline" data-readyopen="'+escAttr(day.name)+'">'+
      '<span><small>DAILY READINESS</small><b>Check in before you train</b><em>Sleep · body · energy · 20 sec</em></span><i>›</i></button>';
    var m=ffReadinessMeta(r.band);
    if(sess) return '<div class="ready-inline scored '+r.band+'">'+
      '<span><small>SESSION DOSE · '+m.label.toUpperCase()+'</small><b>'+m.title+'</b><em>Dose locked once logging starts</em></span><i>✓</i></div>';
    return '<button type="button" class="ready-inline scored '+r.band+'" data-readyopen="'+escAttr(day.name)+'">'+
      '<span><small>TODAY’S DOSE · '+m.label.toUpperCase()+'</small><b>'+m.title+'</b><em>Tap to reassess before starting</em></span><i>›</i></button>';
  }
  function ffReadinessHomeHtml(){
    var dop=dayOfPlan(), day=dop&&stripDays()[dop-1];
    return ffReadinessInlineHtml(day);
  }
  document.addEventListener("click",function(e){
    var b=e.target.closest("[data-readyopen]");
    if(b){ ffReadinessOpen(b.getAttribute("data-readyopen")); }
  });
  document.addEventListener("keydown",function(e){
    var m=$("readinessModal");
    if(e.key==="Escape"&&m&&!m.hidden){ e.preventDefault(); ffReadinessClose(); }
  });
