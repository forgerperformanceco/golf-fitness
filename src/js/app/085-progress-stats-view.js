  /* ===================== PROGRESS / STATS VIEW =====================
     A dedicated analytics screen: the Octane score up top, then the
     trends that prove the system works — clubhead speed (the north star),
     bodyweight, estimated 1RM on the big lifts, and training consistency.
     All from data the app already records (ff_body + the workout log). */
  function pcLine(vals, color, gid){
    var pts=vals.map(function(v){ return parseFloat(v); }).filter(function(v){ return !isNaN(v); });
    if(pts.length<2) return '';
    var W=320,H=104,pad=8, mn=Math.min.apply(null,pts), mx=Math.max.apply(null,pts), rng=(mx-mn)||1;
    var stepX=(W-pad*2)/(pts.length-1);
    function X(i){ return pad+i*stepX; }
    function Y(v){ return pad+(H-pad*2)*(1-(v-mn)/rng); }
    var line=pts.map(function(v,i){ return (i?"L":"M")+X(i).toFixed(1)+","+Y(v).toFixed(1); }).join(" ");
    var lastX=X(pts.length-1), lastY=Y(pts[pts.length-1]);
    var area=line+" L"+lastX.toFixed(1)+","+(H-pad)+" L"+X(0).toFixed(1)+","+(H-pad)+" Z";
    return '<svg class="pc-svg" viewBox="0 0 '+W+' '+H+'" width="100%" preserveAspectRatio="xMidYMid meet">'+
      '<defs><linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1">'+
        '<stop offset="0" stop-color="'+color+'" stop-opacity=".26"/>'+
        '<stop offset="1" stop-color="'+color+'" stop-opacity="0"/></linearGradient></defs>'+
      '<path d="'+area+'" fill="url(#'+gid+')" stroke="none"/>'+
      '<path d="'+line+'" fill="none" stroke="'+color+'" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'+
      '<circle cx="'+lastX.toFixed(1)+'" cy="'+lastY.toFixed(1)+'" r="4" fill="'+color+'"/>'+
      '<circle cx="'+lastX.toFixed(1)+'" cy="'+lastY.toFixed(1)+'" r="8" fill="'+color+'" opacity=".18"/></svg>';
  }
  function pcMiniSpark(vals, color){
    var pts=vals.filter(function(v){ return v!=null && !isNaN(v); });
    if(pts.length<2) return '';
    var W=72,H=26,mn=Math.min.apply(null,pts),mx=Math.max.apply(null,pts),rng=(mx-mn)||1,step=W/(pts.length-1);
    var d=pts.map(function(v,i){ return (i?"L":"M")+(i*step).toFixed(1)+","+(H-2-((v-mn)/rng)*(H-4)).toFixed(1); }).join(" ");
    return '<svg width="72" height="26" viewBox="0 0 '+W+' '+H+'"><path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function pcDelta(d, unit, neutral){
    if(d==null || isNaN(d)) return '';
    var cls = neutral ? "neu" : (d>0.05?"up":(d<-0.05?"down":"flat"));
    var arrow = neutral ? "" : (d>0.05?"▲ ":(d<-0.05?"▼ ":"— "));
    var val=(d>=0?"+":"")+(Math.round(d*10)/10)+(unit||"");
    return '<span class="pc-delta '+cls+'">'+arrow+val+'</span>';
  }
  // Per-lift estimated-1RM history on the big compound movements.
  function bigLiftStats(){
    var sess=sessionsByWeek(), KEY=/Squat|Deadlift|Bench|Press|Row|Romanian|Hinge|Hip Thrust|Pull-?up|Chin|Lunge|Split Squat/i;
    var hist={};
    sess.forEach(function(se){ (se.s.ex||[]).forEach(function(x){
      if(!KEY.test(x.name)) return;
      var top=0; (x.sets||[]).forEach(function(st){ top=Math.max(top, e1RM(st.w, st.r)); });
      if(top<=0) return;
      (hist[x.name]=hist[x.name]||[]).push(top);
    }); });
    return Object.keys(hist).map(function(n){
      var a=hist[n];
      return { name:n, series:a, first:a[0], last:a[a.length-1], best:Math.max.apply(null,a), n:a.length };
    }).sort(function(a,b){ return b.best-a.best; });
  }
  function weekBars(){
    var sess=sessionsByWeek(), per={}; sess.forEach(function(s){ per[s.w]=(per[s.w]||0)+1; });
    var freq=(typeof planState!=="undefined" && planState.freq) ? planState.freq : 4;
    var cur=Math.max(curWeek(), 1), start=Math.max(1, cur-7), bars="";
    for(var w=start; w<=cur; w++){
      var c=per[w]||0, h=Math.round(clamp(c/freq,0,1)*100);
      bars+='<div class="wkbar" title="Week '+w+': '+c+' sessions"><span class="wkbar-fill'+(c>=freq?" full":"")+'" style="height:'+Math.max(c?14:3,h)+'%"></span><span class="wkbar-n">'+w+'</span></div>';
    }
    return bars;
  }
  /* ----- The Season map: the 20-week campaign as a course, tee to pin.
     Wave phases are the terrain, speed tests fly flags where they happened,
     deloads are marked, and YOU is pinned to the current week. ----- */
  function seasonMapHtml(){
    if(!planStart()) return '';
    var wk=curWeek(), gy=goalYds();
    var tests={}; speedTests().forEach(function(t){ if(t.week && (tests[t.week]==null || t.best>tests[t.week])) tests[t.week]=t.best; });
    var ev=eventInfo();
    var segW=46, pad=26, NW=20, width=pad*2+NW*segW, H=118;
    var colors={ accumulate:"#2f9e5d", intensify:"#e0a33a", deload:"#4d685a", peak:"#f4c542" };
    var svg='';
    for(var w=1; w<=NW; w++){
      var x=pad+(w-1)*segW, wave=waveFor(w), cx=x+segW/2-3;
      svg+='<rect x="'+(x+2)+'" y="64" width="'+(segW-7)+'" height="16" rx="8" fill="'+colors[wave]+'" opacity="'+(w<wk?'0.95':(w===wk?'1':'0.35'))+'"/>';
      svg+='<text x="'+cx+'" y="98" text-anchor="middle" font-size="10" fill="#9fc4ac" font-weight="700">'+w+'</text>';
      if(wave==="deload") svg+='<text x="'+cx+'" y="60" text-anchor="middle" font-size="10">🪫</text>';
      if(tests[w]!=null) svg+='<text x="'+cx+'" y="36" text-anchor="middle" font-size="13">⛳</text><text x="'+cx+'" y="50" text-anchor="middle" font-size="10" fill="#8be9ac" font-weight="800">'+tests[w]+'</text>';
      if(ev && ev.week===w) svg+='<text x="'+cx+'" y="'+(tests[w]!=null?22:36)+'" text-anchor="middle" font-size="14">🏆</text>';
      if(w===wk) svg+='<text x="'+cx+'" y="18" text-anchor="middle" font-size="11" font-weight="900" fill="#ffffff">▼ YOU</text>';
    }
    svg+='<text x="6" y="80" font-size="13">🏌️</text>';
    svg+='<text x="'+(pad+NW*segW+2)+'" y="80" font-size="14">🚩</text>';
    var wave2=WAVES[waveFor(wk)];
    return '<div class="pcard season"><div class="pc-head"><span class="pc-t">🗺️ Your 20-week season'+(gy?(' · mission +'+gy+' yds'):'')+'</span></div>'+
      '<div class="season-scroll"><svg width="'+width+'" height="'+H+'" viewBox="0 0 '+width+' '+H+'">'+svg+'</svg></div>'+
      '<div class="season-leg"><span><i style="background:#2f9e5d"></i>Build</span><span><i style="background:#e0a33a"></i>Heavy</span>'+
      '<span><i style="background:#4d685a"></i>Deload</span><span><i style="background:#f4c542"></i>Peak</span><span>⛳ speed test (mph)</span>'+(ev&&ev.week?'<span>🏆 your event</span>':'')+'</div>'+
      '<div class="season-foot"><b>Week '+wk+' · '+wave2.label+'.</b> '+wave2.strap+
        (ev ? (ev.week && !ev.past
                ? ' <br><b>🏆 '+(ev.name||"Your event")+' — week '+ev.week+'.</b> The taper re-anchors to it: weeks '+(ev.week-1)+'–'+ev.week+' peak (volume down, intensity heavy), week '+(ev.week+1)+' recovers.'
                : (ev.past ? '' : ' <br>🏆 '+(ev.name||"Your event")+' falls outside this 20-week block.'))
             : ' <br>🏆 Peaking for something? <button type="button" class="stest-link" data-goview="account" style="color:#8be9ac">Set your event date</button> and the taper re-anchors to it.')+
      '</div></div>';
  }
  /* ----- Sunday Scorecard: the week as a golf card — one ritual close per week ----- */
  function weekCard(){
    var ws=weekStartDateCal().getTime(), freq=(typeof planState!=="undefined"&&planState.freq)||4;
    var hist=lsGet("ff_history",[]).filter(function(h){ return h && (h.ts||0)>=ws; });
    var vol=hist.reduce(function(a,h){ return a+(h.volume||0); },0);
    var weighs=lsGet("ff_body",[]).filter(function(e){ if(!e || !e.w) return false;
      var t=new Date(e.date).getTime(); return !isNaN(t) && t>=ws; }).length;
    var stw=speedTests().filter(function(t){ return (t.ts||0)>=ws; });
    var fOn=0, fLog=0, dws=weekStartDateCal(), today=new Date();
    for(var i=0;i<7;i++){
      var dd2=new Date(dws); dd2.setDate(dws.getDate()+i);
      if(dd2>today) break;
      var st2=fuelStateFor(ffISO(dd2));
      if(st2){ fLog++; if(st2!=="off") fOn++; }
    }
    return { sessions:hist.length, freq:freq, vol:vol, weighs:weighs,
      bestT:(stw.length?Math.max.apply(null, stw.map(function(t){ return t.best; })):null),
      mob:mobTests().some(function(t){ return (t.ts||0)>=ws; }),
      fuelOn:fOn, fuelLogged:fLog };
  }
  function scChip(kind, label){ return '<span class="sc-chip '+kind+'">'+label+'</span>'; }
  function scorecardHtml(){
    if(!planStart()) return '';
    var c=weekCard();
    var rows=[
      { h:1, n:"Sessions", v:c.sessions+' / '+c.freq, chip: c.sessions>=c.freq?scChip("good","ON PLAN"):(c.sessions>0?scChip("mid",(c.freq-c.sessions)+" TO GO"):scChip("miss","0 YET")) },
      { h:2, n:"Iron moved", v:(c.vol>0?c.vol.toLocaleString()+' lb':'—'), chip: c.vol>0?scChip("good","BANKED"):scChip("miss","—") },
      { h:3, n:"Speed test", v:(c.bestT!=null?c.bestT+' mph':'—'), chip: c.bestT!=null?scChip("good","TESTED"):(speedTestDue()?scChip("mid","DUE"):scChip("miss","NEXT WK")) },
      { h:4, n:"Weigh-ins", v:String(c.weighs), chip: c.weighs>=3?scChip("good","TRENDING"):(c.weighs>0?scChip("mid","MORE"):scChip("miss","0 YET")) },
      { h:5, n:"Mobility", v:(c.mob?'screened':'—'), chip: c.mob?scChip("good","DONE"):(mobDue()?scChip("mid","DUE"):scChip("good","CURRENT")) },
      { h:6, n:"Fuel days", v:c.fuelOn+' / 7', chip: c.fuelOn>=5?scChip("good","ON PLAN"):(c.fuelLogged>0?scChip("mid","BUILDING"):scChip("miss","LOG FUEL")) }
    ];
    return '<div class="scorecard"><div class="sc-head"><span class="sc-t">🗒️ Sunday Scorecard</span><span class="sc-sub">Week '+curWeek()+' · Mon–Sun</span></div>'+
      '<div class="sc-grid">'+rows.map(function(r){
        return '<div class="sc-row"><span class="sc-hole">'+r.h+'</span><span class="sc-name">'+r.n+'</span><span class="sc-val">'+r.v+'</span>'+r.chip+'</div>'; }).join("")+'</div>'+
      '<button type="button" class="sc-share" data-scshare="1">📤 Share this week’s card</button></div>';
  }
  function shareScorecard(){
    var c=weekCard();
    var txt="My FairwayFuel week "+curWeek()+" scorecard: "+c.sessions+"/"+c.freq+" sessions"+
      (c.vol>0?(" · "+c.vol.toLocaleString()+" lb moved"):"")+
      (c.bestT!=null?(" · 7-iron "+c.bestT+" mph"):"")+" ⛳ https://fairwayfuel.app";
    ffShareImage({
      kick:"Sunday Scorecard · Week "+curWeek(),
      big:c.sessions+"/"+c.freq, unit:"sessions",
      badge:(c.sessions>=c.freq?"✅ ON PLAN":null),
      lines:[ (c.vol>0?("🏋️ "+c.vol.toLocaleString()+" lb of iron moved"):null),
              (c.bestT!=null?("🎯 7-iron "+c.bestT+" mph tested"):null),
              ("⚖️ "+c.weighs+" weigh-in"+(c.weighs===1?"":"s")+(c.mob?" · 🧭 mobility screened":"")) ]
    }, txt);
  }
  function renderProgress(){
    var el=$("progressBody"); if(!el) return;
    var body=lsGet("ff_body",[]);
    var speeds=body.map(function(e){ return e.s; }), weights=body.map(function(e){ return e.w; });
    var spF=speeds.map(parseFloat).filter(function(v){ return !isNaN(v); });
    var wtF=weights.map(parseFloat).filter(function(v){ return !isNaN(v); });
    var sess=Object.keys(getLog()).length, lifts=bigLiftStats();
    var hasAny = sess>0 || spF.length>0 || wtF.length>0;

    var html='<div class="prog-hd"><div class="prog-kick">⛳ The proof it’s working</div><h2>Your Progress</h2>'+
      '<p>Speed, strength and consistency — tracked over time.</p></div>';
    html += renderScoreCard();
    html += seasonMapHtml();
    html += scorecardHtml();

    if(!hasAny){
      html += '<div class="pcard pc-empty-card"><div class="pc-emoji">📈</div>'+
        '<h3>No trends yet</h3><p>Log a workout on the Train tab, and add today’s bodyweight + 7-iron speed below. '+
        'Two data points and your lines start climbing.</p></div>';
    } else {
      // ---- Clubhead speed (north star) ----
      // The payoff of speed is DISTANCE. A 7-iron carries ~2 yards farther per +1 mph of
      // clubhead speed (public TrackMan/FlightScope data; smash ~1.33). We show the GAIN,
      // not an absolute carry claim — the trend is the honest, motivating signal.
      var spNow=spF.length?spF[spF.length-1]:null, spBase=spF.length?spF[0]:null, spBest=spF.length?Math.max.apply(null,spF):null;
      var YDS_PER_MPH=2, spGain=(spNow!=null&&spBase!=null)?(spNow-spBase):0;
      html += '<div class="pcard"><div class="pc-head"><span class="pc-t">⚡ Clubhead speed <small>7-iron</small></span>'+
          (spF.length>=2?pcDelta(spNow-spBase," mph"):"")+'</div>'+
        (spNow!=null?'<div class="pc-now">'+spNow+'<span>mph</span></div>':'<div class="pc-now muted">—</div>')+
        (spF.length>=2 ? pcLine(spF,"#16a34a","pcSpeed")
          : '<div class="pc-need">'+(spF.length===1?"One more entry and your speed trend appears.":"Add your 7-iron speed below to start the trend.")+'</div>')+
        (spF.length>=2&&spGain>0
          ? '<div class="pc-payoff">🎯 That’s roughly <b>+'+Math.round(spGain*YDS_PER_MPH)+' yards</b> of 7-iron carry since your baseline. <span>Speed is distance — ~2 yds per mph.</span></div>'
          : (spF.length>=2 ? '<div class="pc-payoff muted">Every <b>+1 mph</b> here is about <b>+2 yards</b> of carry. Keep the trend climbing.</div>' : ""))+
        (spF.length>=2?'<div class="pc-foot"><span>baseline <b>'+spBase+'</b></span><span>best <b>'+spBest+'</b> mph</span></div>':"")+
        (spNow!=null?'<div class="pc-bench">Context: '+ffBench().label+' is '+ffBench().range+' — but your trend vs your own baseline is the number that matters.</div>':"")+
        '<div class="pc-test">'+(speedTestDue()
          ? '<button class="stest-go sm" data-speedtest="1">🎯 Speed test due — run it now</button>'
          : '<span class="st-note">🎯 Next speed test in <b>'+Math.max(1, SPEEDTEST_EVERY-daysSinceTest())+'</b> days — <button class="stest-link" data-speedtest="1">test early</button></span>')+'</div>'+
        '</div>';

      // ---- Strength: estimated 1RM on the big lifts ----
      html += '<div class="pcard"><div class="pc-head"><span class="pc-t">🏋️ Strength <small>est. 1RM</small></span></div>';
      if(lifts.length){
        html += lifts.slice(0,6).map(function(L){
          var d = L.first>0 ? (L.last-L.first)/L.first*100 : null;
          return '<button type="button" class="lr" data-exhist="'+escAttr(L.name)+'"><div class="lr-name">'+L.name+'</div>'+
            '<div class="lr-spark">'+(L.n>=2?pcMiniSpark(L.series,"#16a34a"):'<span class="lr-one">'+L.n+' set'+(L.n===1?"":"s")+'</span>')+'</div>'+
            '<div class="lr-val">'+Math.round(L.last)+'<small>lb</small>'+(L.n>=2&&d!=null?pcDelta(d,"%"):"")+'</div></button>';
        }).join("");
      } else {
        html += '<div class="pc-need">Log weights on the big lifts (squat, bench, hinge, press, row) and your estimated 1RM trend builds here.</div>';
      }
      html += '</div>';

      // ---- Bodyweight ----
      var wtNow=wtF.length?wtF[wtF.length-1]:null, wtBase=wtF.length?wtF[0]:null;
      html += '<div class="pcard"><div class="pc-head"><span class="pc-t">⚖️ Bodyweight</span>'+
          (wtF.length>=2?pcDelta(wtNow-wtBase," lb",true):"")+'</div>'+
        (wtNow!=null?'<div class="pc-now">'+wtNow+'<span>lb</span></div>':'<div class="pc-now muted">—</div>')+
        (wtF.length>=2 ? pcLine(wtF,"#0e7490","pcWt")
          : '<div class="pc-need">Add your bodyweight below to track the trend against your speed.</div>')+
        (wtF.length>=2?'<div class="pc-foot"><span>start <b>'+wtBase+'</b></span><span>now <b>'+wtNow+'</b> lb</span></div>':"")+
        '</div>';

      // ---- Consistency ----
      html += '<div class="pcard"><div class="pc-head"><span class="pc-t">📅 Consistency</span>'+
          '<span class="pc-delta neu">'+sess+' total</span></div>'+
        '<div class="wkbars">'+weekBars()+'</div>'+
        '<div class="pc-foot"><span>sessions per week (last 8)</span><span>goal <b>'+((typeof planState!=="undefined"&&planState.freq)||4)+'</b>/wk</span></div>'+
        '</div>';
    }

    // ---- Quick add (always available) ----
    html += quickLogHtml('pr', 'Driver carry is your headline number; weight &amp; 7-iron speed feed your trends and <b>Octane</b>.');

    // ---- Leaderboard (opt-in, competitive) ----
    html += renderLeaderboardCard();

    // ---- Coach read ----
    html += '<button class="dash-ai" data-ask="progress"><span class="dai-ic">💬</span>'+
      '<span class="dai-tx"><b>Coach my progress</b><span>An AI read on your trends &amp; what to push next</span></span>'+
      '<span class="dai-go">›</span></button>';

    el.innerHTML=html;
    var ss=el.querySelector(".season-scroll");
    if(ss) ss.scrollLeft=Math.max(0, (curWeek()-3)*46);
    loadLeaderboard();   // async fill once the card shell is in the DOM
  }

  /* ----- Leaderboard: opt-in, golf-relevant boards (Score / Speed / Streak) ----- */
  // ---- Calendar week (Mon 00:00 local) — the shared clock for weekly boards/recap ----
  function weekStartDateCal(){ var d=new Date(); var dow=(d.getDay()+6)%7; d.setHours(0,0,0,0); d.setDate(d.getDate()-dow); return d; }
  function weekStartStr(){ var d=weekStartDateCal(); var m=d.getMonth()+1, dd=d.getDate();
    return d.getFullYear()+"-"+(m<10?"0":"")+m+"-"+(dd<10?"0":"")+dd; }
  function thisWeekStats(){
    var ws=weekStartDateCal().getTime(), wsStr=weekStartStr();
    var n=lsGet("ff_history",[]).filter(function(h){ return h && (h.ts||0)>=ws; }).length;
    var body=lsGet("ff_body",[]), spdIn=[], wtIn=[], spdPrev=null, wtPrev=null;
    body.forEach(function(e){
      if(!e || !e.date) return;
      var inWk = e.date>=wsStr;
      var s=parseFloat(e.s), w=parseFloat(e.w);
      if(!isNaN(s)){ if(inWk) spdIn.push(s); else spdPrev=s; }
      if(!isNaN(w)){ if(inWk) wtIn.push(w); else wtPrev=w; }
    });
    return { sessions:n,
      spd:(spdIn.length && spdPrev!=null) ? Math.round((spdIn[spdIn.length-1]-spdPrev)*10)/10 : null,
      wt:(wtIn.length && wtPrev!=null) ? Math.round((wtIn[wtIn.length-1]-wtPrev)*10)/10 : null };
  }
  function renderWeekRecap(){
    var s=thisWeekStats(), freq=(typeof planState!=="undefined" && planState.freq)||4;
    var bits=['<b>'+s.sessions+'</b> of '+freq+' workouts'];
    if(s.spd!=null) bits.push('7-iron <b>'+(s.spd>=0?'+':'')+s.spd+' mph</b>');
    if(s.wt!=null) bits.push('weight <b>'+(s.wt>=0?'+':'')+s.wt+' lb</b>');
    return '<button class="pcard wk-recap" data-goview="progress">'+
      '<span class="wr-t">📊 Week so far</span>'+
      '<span class="wr-b">'+bits.join(' · ')+'</span>'+
      '<span class="wr-cta">Leaderboard ›</span></button>';
  }

  var lbBoard = "score";
  function lbReady(){ return !!(window.FF && window.FF.leaderboard); }
  function lbSignedIn(){ return !!(window.FF && window.FF.user); }
  function lbEsc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function lbStreak(){
    var per={}; sessionsByWeek().forEach(function(s){ per[s.w]=true; });
    var weeks=Object.keys(per).map(Number); if(!weeks.length) return 0;
    var w=Math.max.apply(null,weeks), streak=0;
    while(per[w]){ streak++; w--; }
    return streak;
  }
  function myLBStats(){
    var r=ffScore(), body=lsGet("ff_body",[]);
    var sp=body.map(function(e){ return parseFloat(e.s); }).filter(function(v){ return !isNaN(v); });
    var speed = sp.length ? sp[sp.length-1] : null;
    var gain = sp.length>=2 ? Math.round((sp[sp.length-1]-sp[0])/sp[0]*1000)/10 : null;
    return { score:r.score, speed:speed, speed_gain:gain,
      sessions:Object.keys(getLog()).length, streak:lbStreak(),
      week_sessions:thisWeekStats().sessions, week_start:weekStartStr(),
      goal:(lsGet("ff_targets",null)||{}).goal || state.goal };
  }
  function lbGoalTag(g){ return (GOALS[g] && GOALS[g].label) || ""; }
  function lbWeekSessions(r){ return (r.week_start===weekStartStr()) ? (r.week_sessions||0) : 0; }
  function lbVal(r){
    if(lbBoard==="speed")  return r.speed!=null  ? r.speed+" mph" : "—";
    if(lbBoard==="streak") return (r.streak||0)+" wk";
    if(lbBoard==="week")   return lbWeekSessions(r)+" this wk";
    return r.score!=null ? r.score : "—";
  }
  function renderLeaderboardCard(){
    var seg=["week","score","speed","streak"].map(function(b){
      return '<button data-lb="'+b+'" class="'+(lbBoard===b?"on":"")+'">'+
        ({week:"This week",score:"Score",speed:"Speed",streak:"Streak"}[b])+'</button>'; }).join("");
    return '<div class="pcard lb"><div class="pc-head"><span class="pc-t">🏆 Leaderboard</span>'+
      '<div class="lb-seg" id="lbSeg">'+seg+'</div></div>'+
      '<div id="lbBody"><div class="pc-need">Loading the board…</div></div></div>';
  }
  function lbMedal(i){ return i===0?"🥇":(i===1?"🥈":(i===2?"🥉":(i+1))); }
  function lbListHtml(rows, mine){
    if(!rows.length) return '<div class="pc-need">No one’s on this board yet — be the first to claim a spot.</div>';
    var myHandle = mine && mine.handle;
    return '<div class="lb-list">'+rows.map(function(r,i){
      var me = myHandle && r.handle===myHandle;
      return '<div class="lb-row'+(me?" me":"")+'"><span class="lb-rank">'+lbMedal(i)+'</span>'+
        '<span class="lb-name">'+lbEsc(r.handle)+(me?' <span class="lb-you">you</span>':'')+
        '<span class="lb-div">'+lbEsc(lbGoalTag(r.goal))+'</span></span>'+
        '<span class="lb-num">'+lbVal(r)+'</span></div>';
    }).join("")+'</div>';
  }
  function lbJoinHtml(mine){
    if(!lbSignedIn())
      return '<div class="lb-join">Sign in on the <b>You</b> tab to claim your spot — it’s free.</div>';
    if(mine)
      return '<div class="lb-mine">On the board as <b>@'+lbEsc(mine.handle)+'</b>'+
        '<button id="lbLeave" class="lb-leave">Leave</button></div>';
    return '<div class="lb-join">'+
      '<input id="lbHandle" maxlength="20" placeholder="Pick a handle (e.g. BombsAway)" value="'+lbEsc(lsGet("ff_handle",""))+'" />'+
      '<button id="lbJoin">Join</button>'+
      '<div class="lb-hint">Public to other golfers — use a nickname, not your real name.</div></div>';
  }
  async function loadLeaderboard(){
    var el=$("lbBody"); if(!el) return;
    if(!lbReady()){ el.innerHTML='<div class="pc-need">The leaderboard needs an internet connection — reconnect and reopen this tab.</div>'; return; }
    var mine=null;
    if(lbSignedIn()){
      mine = await window.FF.leaderboard.getMine();
      if(mine){                                   // already in → refresh my stats if they changed
        var stats=myLBStats(), sig=JSON.stringify(stats);
        if(sessionStorage.getItem("ff_lb_pub")!==sig){
          stats.handle=mine.handle;
          await window.FF.leaderboard.publish(stats);
          try{ sessionStorage.setItem("ff_lb_pub", sig); }catch(e){}
        }
      }
    }
    if(!$("lbBody")) return;                        // user navigated away mid-fetch
    var rows = await window.FF.leaderboard.list(lbBoard, 50);
    if(lbBoard==="week"){
      // Rows published in an earlier calendar week count as 0 — zero them and re-rank.
      rows = rows.map(function(r){ return r; }).sort(function(a,b){ return lbWeekSessions(b)-lbWeekSessions(a); })
        .filter(function(r){ return lbWeekSessions(r)>0; });
    }
    var box=$("lbBody"); if(box) box.innerHTML = lbJoinHtml(mine) + lbListHtml(rows, mine);
  }
  async function lbJoin(){
    var inp=$("lbHandle"); if(!inp) return;
    var h=(inp.value||"").trim().replace(/\s+/g," ");
    if(h.length<2){ inp.focus(); return; }
    lsSet("ff_handle", h);
    var stats=myLBStats(); stats.handle=h;
    var btn=$("lbJoin"); if(btn){ btn.disabled=true; btn.textContent="Joining…"; }
    var res = await window.FF.leaderboard.publish(stats);
    try{ sessionStorage.setItem("ff_lb_pub", JSON.stringify(myLBStats())); }catch(e){}
    if(res && res.error){ if(btn){ btn.disabled=false; btn.textContent="Join"; } alert("Couldn’t join: "+res.error); return; }
    loadLeaderboard();
  }
  async function lbLeave(){
    if(!confirm("Leave the leaderboard? Your spot is removed.")) return;
    await window.FF.leaderboard.leave();
    try{ sessionStorage.removeItem("ff_lb_pub"); }catch(e){}
    loadLeaderboard();
  }

  /* ----- Delegated plan events (calendar start, log buttons, progress add) ----- */
  $("phaseDetail").addEventListener("click", function(e){
    if(e.target.closest("[data-gostats]")){ setView("progress"); return; }
    if(e.target.closest("[data-gohistory]")){ openHistory(); return; }
    if(e.target.closest("[data-finish]")){ finishWorkout(); return; }
    var cw=e.target.closest("[data-clearworkout]");
    if(cw){
      if(cw.getAttribute("data-armed")==="1"){ clearWorkout(); return; }   // second tap confirms
      cw.setAttribute("data-armed","1"); cw.textContent="Tap again to clear ✕"; cw.classList.add("arm");
      setTimeout(function(){ if(cw&&cw.isConnected){ cw.removeAttribute("data-armed"); cw.textContent="Clear this workout"; cw.classList.remove("arm"); } }, 3500);
      return;
    }
    var wu=e.target.closest("[data-wu]");                              // tap a warm-up move to check it off
    if(wu){ wu.classList.toggle("done"); return; }
    if(e.target.closest("#equipBar") && handleEquipClick(e)) return;   // equipment editor (in settings)
    var lb=e.target.closest("[data-logday]");
    if(lb){ openLogger(lb.getAttribute("data-logday")); return; }
    var sw=e.target.closest("[data-startweek]");
    if(sw){ var v=sw.getAttribute("data-startweek");
      var n = v==="sel" ? parseInt(($("weekSel")||{}).value||"1",10) : parseInt(v,10);
      startPlanAtWeek(n||1); return; }
    if(e.target.closest("[data-jump]")){ var j=$("sbJump"); if(j) j.hidden=!j.hidden; return; }
    if(e.target.closest("[data-wkadjust]")){ var a=$("wkAdjRow"); if(a) a.hidden=!a.hidden; return; }
    if(e.target.closest("[data-reset]")){ if(confirm("Restart the plan from week 1?")) resetPlan(); return; }
    var pv=e.target.closest("[data-planview]");
    if(pv && !pv.disabled){ lsSet("ff_planview", pv.getAttribute("data-planview")); focusDay=null; renderPhase(); return; }
    var spm=e.target.closest("[data-speedmode]");
    if(spm){ lsSet("ff_speedmode", spm.getAttribute("data-speedmode")); renderPhase(); return; }
    var fdc=e.target.closest("[data-focusday]");
    if(fdc){ focusDay=fdc.getAttribute("data-focusday"); renderPhase(); return; }
    var rdc=e.target.closest("[data-restday]");
    if(rdc){ toggleRestDone(curWeek(), rdc.getAttribute("data-restday"));
      try{ window.dispatchEvent(new Event("ff-data-changed")); }catch(_){}   // nudge cloud-sync
      renderPhase(); return; }
    // ---- inline logger ----
    var idn=e.target.closest("[data-idone]");
    if(idn && ilog){ var dxi=+idn.getAttribute("data-x"), dsi=+idn.getAttribute("data-s");
      var dex=ilog.sess.ex[dxi], st=dex.sets[dsi];
      st.done=!st.done; saveILog();
      if(st.done){
        var lastSet = dsi >= dex.sets.length-1;   // finishing a lift → longer rest before the next one
        startRest(lastSet ? REST_BETWEEN_LIFTS : REST_BETWEEN_SETS, lastSet ? "Next lift" : "Between sets");
      }
      renderILog(); return; }
    var iad=e.target.closest("[data-iadd]");
    if(iad && ilog){ ilog.sess.ex[+iad.getAttribute("data-x")].sets.push({w:"",r:"",done:false}); saveILog(); renderILog(); return; }
    if(e.target.closest("[data-addlift]")){ openAddLift(); return; }
    var ifl=e.target.closest("[data-ifill]");
    if(ifl && ilog){ var xi=+ifl.getAttribute("data-x"), x=ilog.sess.ex[xi], ls=lastSessionFor(ilog.day, ilog.week), lx=null;
      if(ls) ls.ex.forEach(function(e2){ if(e2.name===x.name) lx=e2; });
      if(lx){ x.sets.forEach(function(s2, si){ if(lx.sets[si]&&lx.sets[si].w) s2.w=lx.sets[si].w; }); saveILog(); renderILog(); } return; }
    var pfl=e.target.closest("[data-prevfill]");
    if(pfl && ilog){ var px=+pfl.getAttribute("data-x"), ps=+pfl.getAttribute("data-s"), pex=ilog.sess.ex[px];
      var pls=lastSessionFor(ilog.day, ilog.week), plx=null;
      if(pls) pls.ex.forEach(function(e2){ if(e2.name===pex.name) plx=e2; });
      if(plx && plx.sets[ps]){ if(plx.sets[ps].w) pex.sets[ps].w=plx.sets[ps].w; if(plx.sets[ps].r) pex.sets[ps].r=plx.sets[ps].r; saveILog(); renderILog(); } return; }
    // One-tap load nudge: fill every set to last time's top weight + one small jump.
    // Reps stay blank (you log what you hit) so progression is by WEIGHT, not reps/volume.
    var bmp=e.target.closest("[data-bumpfill]");
    if(bmp && ilog){ var bx=+bmp.getAttribute("data-bumpfill"), bex=ilog.sess.ex[bx];
      var bls=lastSessionFor(ilog.day, ilog.week), blx=null;
      if(bls) bls.ex.forEach(function(e2){ if(e2.name===bex.name) blx=e2; });
      if(blx){ var top=0; blx.sets.forEach(function(st){ var w=parseFloat(st.w); if(w>top) top=w; });
        if(top>0){ var nw=String(top+incNum(bex.name)); bex.sets.forEach(function(s2){ s2.w=nw; }); saveILog(); renderILog(); } }
      return; }
    // Deload one-tap: fill every not-done set with ~60% of last time's top weight.
    var dlf=e.target.closest("[data-deloadfill]");
    if(dlf && ilog){ var dfx=+dlf.getAttribute("data-deloadfill"), dfe=ilog.sess.ex[dfx];
      var dfs=lastSessionFor(ilog.day, ilog.week), dflx=null;
      if(dfs) dfs.ex.forEach(function(e2){ if(e2.name===dfe.name) dflx=e2; });
      if(dflx){ var dtop=0; dflx.sets.forEach(function(st){ var w=parseFloat(st.w); if(w>dtop) dtop=w; });
        if(dtop>0){ var dw=String(Math.max(5, Math.round(dtop*0.6/5)*5));
          dfe.sets.forEach(function(s2){ if(!s2.done) s2.w=dw; }); saveILog(); renderILog(); } }
      return; }
    var isw=e.target.closest("[data-swapx]");
    if(isw){ openSwap(parseInt(isw.getAttribute("data-swapix"),10), isw.getAttribute("data-swapx"), isw.getAttribute("data-swapcur")); return; }
    var why=e.target.closest("[data-why]");
    if(why){ var wk=why.getAttribute("data-why"); openWhy[wk]=!openWhy[wk]; renderILog(); return; }
    var wrow=e.target.closest("[data-whyrow]");
    if(wrow){ var row=document.getElementById(wrow.getAttribute("data-whyrow"));
      if(row){ row.hidden=!row.hidden; wrow.setAttribute("aria-expanded", row.hidden?"false":"true"); } return; }
    var how=e.target.closest("[data-howto]");
    if(how){ openExDemo(how.getAttribute("data-howto")); return; }
    var wco=e.target.closest("[data-whycoach]");
    if(wco){ var ln=wco.getAttribute("data-whycoach");
      if(window.FFCoach && window.FFCoach.ready()) window.FFCoach.ask("Why does "+ln+" build my clubhead speed, and how do I execute it for maximum power transfer into the swing? Keep it specific and practical.", "Why this lift");
      return; }
  });
  // Inline logger inputs: save on every keystroke and update plate math IN PLACE
  // (never re-render while typing — that would steal focus when moving weight → reps).
  $("phaseDetail").addEventListener("input", function(e){
    var t=e.target; if(!ilog || !t.classList.contains("il-in")) return;
    var xi=+t.getAttribute("data-x");
    ilog.sess.ex[xi].sets[+t.getAttribute("data-s")][t.getAttribute("data-f")]=t.value;
    saveILog();
    if(t.getAttribute("data-f")==="w") ilPlateSync(t);
  });
  // Carry a set's entered weight/reps forward as the pre-filled default for the LATER sets of the
  // same lift (only ones still blank & not marked done) — so set 1 seeds sets 2, 3, 4 in a session.
  // Fires on commit (blur/Enter), not per keystroke, and fills in place so focus isn't stolen.
  $("phaseDetail").addEventListener("change", function(e){
    var t=e.target; if(!ilog || !t.classList.contains("il-in")) return;
    var xi=+t.getAttribute("data-x"), si=+t.getAttribute("data-s"), f=t.getAttribute("data-f"), val=t.value;
    if(val==="") return;
    var ex=ilog.sess.ex[xi]; if(!ex) return;
    var changed=false;
    for(var k=si+1;k<ex.sets.length;k++){
      var s2=ex.sets[k];
      if(s2.done || (s2[f]!=null && s2[f]!=="")) continue;   // don't clobber a set you've already filled or completed
      s2[f]=val; changed=true;
      var inp=document.querySelector('#phaseDetail .il-in[data-x="'+xi+'"][data-s="'+k+'"][data-f="'+f+'"]');
      if(inp){ inp.value=val; if(f==="w") ilPlateSync(inp); }
    }
    if(changed) saveILog();
    renderFinishBar();   // a session now exists → surface the Clear option
  });

  // "Another option" re-rolls the example portions from a different lead food.
  var fd=$("foodDynamic");
  if(fd) fd.addEventListener("click", function(e){
    if(e.target.closest("#foodSwap") && lastFood){ foodRoll++; updateFoodTargets(lastFood.p, lastFood.c, lastFood.m); }
  });

  // Floating rest-timer pill for the inline logger.
  (function(){
    var pill=document.createElement("div");
    pill.id="restPill"; pill.className="rest-pill"; pill.hidden=true;
    pill.innerHTML='<span class="rp-label">⏱ Rest</span><span class="rp-time">0:00</span>'+
      '<button class="rp-btn" id="rpAdd" type="button">+15s</button><button class="rp-btn" id="rpSkip" type="button">Skip</button>';
    document.body.appendChild(pill);
    pill.addEventListener("click", function(e){
      if(e.target.id==="rpAdd"){ restEnd+=15000; tickRest(); }
      else if(e.target.id==="rpSkip"){ stopRest(); }
    });
  })();

  // Swap-picker modal
  (function(){
    var m=document.createElement("div"); m.id="swapModal"; m.className="swap-modal"; m.hidden=true;
    m.innerHTML='<div class="swap-card"><div class="swap-head"><span id="swapTitle">Swap lift</span>'+
      '<button class="swap-x" id="swapX" type="button" aria-label="Close">×</button></div><div class="swap-body" id="swapBody"></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", function(e){
      if(e.target===m || e.target.closest("#swapX")){ closeSwap(); return; }
      var hd=e.target.closest("[data-histdel]");
      if(hd){   // two-tap delete, checked before the row toggle so it doesn't expand
        if(hd.getAttribute("data-armed")==="1"){ deleteHistory(hd.getAttribute("data-histdel")); return; }
        hd.setAttribute("data-armed","1"); hd.textContent="delete?"; hd.classList.add("arm");
        setTimeout(function(){ if(hd&&hd.isConnected){ hd.removeAttribute("data-armed"); hd.textContent="🗑"; hd.classList.remove("arm"); } }, 3000);
        return;
      }
      var ht=e.target.closest("[data-histtoggle]");
      if(ht){ var d=ht.querySelector(".hist-detail"); if(d){ d.hidden=!d.hidden; ht.classList.toggle("open"); } return; }
      var add=e.target.closest("[data-addchoose]"); if(add){ addLiftChoice(add.getAttribute("data-addchoose")); return; }
      var addc=e.target.closest("[data-addcustom]"); if(addc){ addLiftChoice(addc.getAttribute("data-addcustom")); return; }
      var ch=e.target.closest("[data-swapchoose]"); if(ch){ applySwapChoice(ch.getAttribute("data-swapchoose")); return; }
      if(e.target.closest("[data-swapcoach]")){ var c=swapCtx; closeSwap();
        if(window.FFCoach && window.FFCoach.ready()) window.FFCoach.ask("Suggest a hard, same-muscle replacement for "+(c?c.orig:"this lift")+" using my equipment — no weakling subs, with sets×reps.", "Swap idea"); }
    });
    m.addEventListener("input", function(e){
      if(e.target.id==="addSearch"){ var list=$("addList"); if(list) list.innerHTML=addLiftGroupsHtml(e.target.value); }
    });
  })();

  // Exercise demo / how-to sheet
  (function(){
    var m=document.createElement("div"); m.id="exDemoModal"; m.className="swap-modal"; m.hidden=true;
    m.innerHTML='<div class="swap-card"><div class="swap-head"><span id="exDemoTitle">Exercise</span>'+
      '<button class="swap-x" id="exDemoX" type="button" aria-label="Close">×</button></div><div class="swap-body" id="exDemoBody"></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", function(e){ if(e.target===m || e.target.closest("#exDemoX")) closeExDemo(); });
  })();

  // Dashboard tiles jump to the relevant tab; quick-add logs weight + speed from home.
  var db=$("dashBody");
  if(db) db.addEventListener("click", function(e){
    var idis=e.target.closest("[data-insdismiss]");
    if(idis){ ffDismissInsight(idis.getAttribute("data-insdismiss")); renderDash(); return; }
    var iask=e.target.closest("[data-insask]");
    if(iask){ if(window.FFCoach && window.FFCoach.ready()) window.FFCoach.ask(iask.getAttribute("data-insask"), "Your focus"); return; }
    var ad=e.target.closest("[data-adapt]");
    if(ad){ var act=ad.getAttribute("data-adapt");
      if(act==="apply"){ var a=adaptiveCheck();
        if(a){ var nx=Math.max(-600, Math.min(600, lsGet("ff_kcal_adj",0)+a.deltaKcal)); lsSet("ff_kcal_adj", nx); } }
      lsSet("ff_lastcheckin", Date.now()); try{ calc(); }catch(e2){} renderDash(); return; }
    var nr=e.target.closest("[data-nurest]");
    if(nr){ toggleRestDone(curWeek(), nr.getAttribute("data-nurest"));
      try{ window.dispatchEvent(new Event("ff-data-changed")); }catch(_){}
      renderDash(); return; }
    if(e.target.closest("[data-qopen]")){ var fb=$("ffFab"); if(fb) fb.click(); return; }
    var t=e.target.closest("[data-goview]"); if(t) setView(t.getAttribute("data-goview"));
  });
  /* ---- Global quick-log: the floating ＋ and its bottom sheet. One entry point
     for the daily inputs (weight / 7-iron / driver) plus jump-offs to the player,
     speed test and mobility screen — replaces the form that lived on Home. ---- */
  (function(){
    var fab=document.createElement("button");
    fab.className="ff-fab"; fab.id="ffFab"; fab.type="button"; fab.setAttribute("aria-label","Quick log");
    fab.textContent="＋";
    document.body.appendChild(fab);
    var sheet=document.createElement("div");
    sheet.className="qsheet"; sheet.id="qSheet"; sheet.hidden=true;
    document.body.appendChild(sheet);
    function openSheet(){
      var d=(typeof todaySlot==="function")?todaySlot():null;
      var train=d && d.type!=="rest" && planStart();
      sheet.innerHTML='<div class="qsheet-card"><div class="qsheet-grab"></div>'+
        '<div class="qsheet-h">Quick log</div>'+
        quickLogHtml("q","Weight, 7-iron &amp; driver feed your trends, Octane and the board.")+
        '<div class="qsheet-acts">'+
        (train?('<button type="button" class="qsheet-act" data-startplayer="'+escAttr(d.name)+'">🏋️ <span>Start today’s workout<span class="qa-sub">'+d.name.replace(/^Day \d+ — /,"")+' · guided player</span></span><span class="qa-go">›</span></button>'):'')+
        '<button type="button" class="qsheet-act" data-speedtest="1">🎯 <span>Speed test<span class="qa-sub">3 max swings — best one counts</span></span><span class="qa-go">›</span></button>'+
        '<button type="button" class="qsheet-act" data-mobscreen="1">🧭 <span>Mobility screen<span class="qa-sub">3 moves · ~3 minutes</span></span><span class="qa-go">›</span></button>'+
        '</div></div>';
      sheet.hidden=false; document.body.style.overflow="hidden";
    }
    function closeSheet(){ sheet.hidden=true; document.body.style.overflow=""; }
    fab.addEventListener("click", openSheet);
    sheet.addEventListener("click", function(e){
      if(e.target===sheet){ closeSheet(); return; }
      if(e.target.id==="qAdd"){
        if(!logBodyEntry($("qBody")&&$("qBody").value, $("qSpeed")&&$("qSpeed").value, $("qDrive")&&$("qDrive").value)) return;
        try{ sessionStorage.removeItem("ff_lb_pub"); }catch(e2){}
        closeSheet(); ffToast("Logged 📈");
        try{ renderDash(); }catch(e2){}
        try{ if($("view-progress") && $("view-progress").classList.contains("active")) renderProgress(); }catch(e2){}
        return;
      }
      // Action rows open their overlays via the document-level listeners — just get out of the way.
      if(e.target.closest("[data-startplayer],[data-speedtest],[data-mobscreen]")) closeSheet();
    });
  })();

  // Game Day controls (tee time / holes / transport), warm-up check-off, back.
  var gdb=$("gamedayBody");
  if(gdb){
    gdb.addEventListener("click", function(e){
      if(e.target.closest("[data-gdback]")){ setView("dash"); return; }
      var wu=e.target.closest("[data-wu]"); if(wu){ wu.classList.toggle("done"); return; }
      var h=e.target.closest("[data-gdholes]"); if(h){ var g=gdState(); g.holes=parseInt(h.getAttribute("data-gdholes"),10); gdSave(g); renderGameDay(); return; }
      var tr=e.target.closest("[data-gdtransport]"); if(tr){ var g2=gdState(); g2.transport=tr.getAttribute("data-gdtransport"); gdSave(g2); renderGameDay(); return; }
    });
    gdb.addEventListener("change", function(e){
      if(e.target.id==="gdTee"){ var g=gdState(); g.teeTime=e.target.value; gdSave(g); renderGameDay(); }
    });
  }
  // Progress tab quick-add: log weight + speed straight from the Stats screen.
  var pb=$("progressBody");
  if(pb) pb.addEventListener("click", function(e){
    if(e.target.id==="prAdd"){
      if(!logBodyEntry($("prBody")&&$("prBody").value, $("prSpeed")&&$("prSpeed").value, $("prDrive")&&$("prDrive").value)) return;
      try{ sessionStorage.removeItem("ff_lb_pub"); }catch(e2){}   // new data → republish to board
      renderProgress();
      return;
    }
    var pil=e.target.closest("[data-pillar]");
    if(pil){ var pk=pil.getAttribute("data-pillar"); openPillar=(openPillar===pk)?null:pk; renderProgress(); return; }
    if(e.target.closest("[data-scshare]")){ shareScorecard(); return; }
    if(e.target.closest("[data-qopen]")){ var fb2=$("ffFab"); if(fb2) fb2.click(); return; }
    var lbb=e.target.closest("[data-lb]");
    if(lbb){ lbBoard=lbb.getAttribute("data-lb");
      Array.prototype.forEach.call(document.querySelectorAll("#lbSeg [data-lb]"), function(b){
        b.classList.toggle("on", b.getAttribute("data-lb")===lbBoard); });
      loadLeaderboard(); return; }
    if(e.target.id==="lbJoin"){ lbJoin(); return; }
    if(e.target.id==="lbLeave"){ lbLeave(); return; }
  });
  // Re-render account + dashboard when cloud login state changes.
  window.addEventListener("ff-auth", function(){
    if($("view-account") && $("view-account").classList.contains("active")) renderAccount();
    if($("view-progress") && $("view-progress").classList.contains("active")) renderProgress();
    renderDash();
    // Signing in flips the Home sign-in nudge → the normal home tip; refresh whatever's open.
    var act=document.querySelector(".view.active"); if(act){ try{ showTipFor(act.id.replace("view-","")); }catch(e){} }
  });

  // AI woven through the app: contextual "ask" buttons summon the coach with a
  // screen-specific prompt (seeded with the user's own numbers in coach.js).
  var ASK_PROMPTS = {
    read:  "Give me a quick read on where I'm at from my numbers — what's working and the single most important thing to focus on this week.",
    meals: "Build me a full day of meals that hits my macro targets — realistic foods with cooked weights and named cuts, plus some variety. Breakfast should be breakfast food, and put faster carbs around training.",
    train: "Look at my current week and training log — am I progressing on the big lifts and my 7-iron speed, and what should I focus on or adjust next?",
    progress: "Read my progress trends — my 7-iron speed, estimated 1RM on the big lifts, bodyweight and consistency. What's trending well, what's stalling, and the one thing I should push next to turn mass into clubhead speed?"
  };
  var ASK_LABELS = { read:"Your dashboard", meals:"Your macro targets", train:"This week's training", progress:"Your progress trends" };
  document.addEventListener("click", function(e){
    var a=e.target.closest("[data-ask]"); if(!a) return;
    var k=a.getAttribute("data-ask");
    if(window.FFCoach && window.FFCoach.ready()) window.FFCoach.ask(ASK_PROMPTS[k]||"", ASK_LABELS[k]||"");
  });
