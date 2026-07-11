  /* ===================== PROGRESS / STATS VIEW =====================
     A dedicated analytics screen: the Octane score up top, then the
     trends that prove the system works — clubhead speed (the north star),
     bodyweight, estimated 1RM on the big lifts, and training consistency.
     All from data the app already records (ff_body + the workout log). */
  // The trend chart: smooth gradient-filled curve, and — when labels are passed —
  // a scrubbable one: touch it and a crosshair + readout follow your finger
  // (see the pcwrap pointer controller below).
  function pcLine(vals, color, gid, labels, unit){
    var pts=[], labs=[];
    vals.forEach(function(v,i){ var n=parseFloat(v); if(!isNaN(n)){ pts.push(n); labs.push(labels?String(labels[i]||""):""); } });
    if(pts.length<2) return '';
    var W=320,H=104,pad=8, mn=Math.min.apply(null,pts), mx=Math.max.apply(null,pts), rng=(mx-mn)||1;
    var stepX=(W-pad*2)/(pts.length-1);
    function X(i){ return pad+i*stepX; }
    function Y(v){ return pad+(H-pad*2)*(1-(v-mn)/rng); }
    var xs=pts.map(function(v,i){ return X(i); }), ys=pts.map(Y);
    // Catmull-Rom → cubic beziers: the polyline becomes a natural curve.
    var line="M"+xs[0].toFixed(1)+","+ys[0].toFixed(1);
    for(var i=0;i<pts.length-1;i++){
      var p0=Math.max(0,i-1), p3=Math.min(pts.length-1,i+2);
      var c1y=Math.min(H-2,Math.max(2, ys[i]+(ys[i+1]-ys[p0])/6));
      var c2y=Math.min(H-2,Math.max(2, ys[i+1]-(ys[p3]-ys[i])/6));
      line+="C"+(xs[i]+(xs[i+1]-xs[p0])/6).toFixed(1)+","+c1y.toFixed(1)+" "+
             (xs[i+1]-(xs[p3]-xs[i])/6).toFixed(1)+","+c2y.toFixed(1)+" "+
             xs[i+1].toFixed(1)+","+ys[i+1].toFixed(1);
    }
    var lastX=xs[pts.length-1], lastY=ys[pts.length-1];
    var area=line+" L"+lastX.toFixed(1)+","+(H-pad)+" L"+xs[0].toFixed(1)+","+(H-pad)+" Z";
    var svg='<svg class="pc-svg" viewBox="0 0 '+W+' '+H+'" width="100%" preserveAspectRatio="xMidYMid meet">'+
      '<defs><linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1">'+
        '<stop offset="0" stop-color="'+color+'" stop-opacity=".26"/>'+
        '<stop offset="1" stop-color="'+color+'" stop-opacity="0"/></linearGradient></defs>'+
      '<path d="'+area+'" fill="url(#'+gid+')" stroke="none"/>'+
      '<path d="'+line+'" fill="none" stroke="'+color+'" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'+
      '<circle cx="'+lastX.toFixed(1)+'" cy="'+lastY.toFixed(1)+'" r="4" fill="'+color+'"/>'+
      '<circle cx="'+lastX.toFixed(1)+'" cy="'+lastY.toFixed(1)+'" r="8" fill="'+color+'" opacity=".18"/></svg>';
    return '<div class="pcwrap" data-pcv="'+pts.join("|")+'" data-pcl="'+escAttr(labs.join("|"))+'"'+
      ' data-pcu="'+escAttr(unit||"")+'" data-pcc="'+color+'">'+svg+
      '<div class="pc-cross" hidden></div><div class="pc-sdot" hidden></div><div class="pc-tip" hidden></div></div>';
  }
  // Scrub controller: one delegated pointer handler drives every pcwrap chart.
  (function(){
    var active=null;
    function showAt(wrap, clientX){
      var vals=wrap.getAttribute("data-pcv").split("|").map(Number);
      var labs=(wrap.getAttribute("data-pcl")||"").split("|");
      var unit=wrap.getAttribute("data-pcu")||"", color=wrap.getAttribute("data-pcc")||"#16a34a";
      var svg=wrap.querySelector("svg"); if(!svg || vals.length<2) return;
      var r=svg.getBoundingClientRect(), W=320,H=104,pad=8;
      var stepX=(W-pad*2)/(vals.length-1);
      var vx=(clientX-r.left)/r.width*W;
      var i=Math.min(vals.length-1, Math.max(0, Math.round((vx-pad)/stepX)));
      var mn=Math.min.apply(null,vals), mx=Math.max.apply(null,vals), rng=(mx-mn)||1;
      var px=(pad+i*stepX)/W*r.width, py=(pad+(H-pad*2)*(1-(vals[i]-mn)/rng))/H*r.height;
      var cross=wrap.querySelector(".pc-cross"), dot=wrap.querySelector(".pc-sdot"), tip=wrap.querySelector(".pc-tip");
      cross.hidden=dot.hidden=tip.hidden=false;
      cross.style.left=px+"px"; cross.style.background=color;
      dot.style.left=px+"px"; dot.style.top=py+"px"; dot.style.background=color;
      tip.innerHTML='<b>'+vals[i]+lbEsc(unit)+'</b>'+(labs[i]?' <span>'+lbEsc(labs[i])+'</span>':'');
      var tw=tip.offsetWidth;
      tip.style.left=Math.min(Math.max(px, tw/2+2), r.width-tw/2-2)+"px";
    }
    function hide(){
      if(!active) return;
      ["pc-cross","pc-sdot","pc-tip"].forEach(function(c){ var el=active.querySelector("."+c); if(el) el.hidden=true; });
      active=null;
    }
    document.addEventListener("pointerdown", function(e){
      var w=e.target.closest(".pcwrap"); if(!w) return;
      active=w; showAt(w, e.clientX);
    }, true);
    document.addEventListener("pointermove", function(e){ if(active) showAt(active, e.clientX); }, true);
    document.addEventListener("pointerup", hide, true);
    document.addEventListener("pointercancel", hide, true);
  })();
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
  /* ----- The Season card: the 20-week campaign as a course, tee to pin.
     Wave phases are the terrain, speed tests fly flags where they happened,
     deloads are marked, and YOU is pinned to the current week. The Sunday
     Scorecard lives INSIDE it (consolidation pass): map = where you are in
     the plan, scorecard = how this week of it is going — one "your plan"
     story, one row when closed. ----- */
  function seasonCardHtml(){
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
    var c=weekCard();
    var scRows=[
      { h:1, n:"Sessions", v:c.sessions+' / '+c.freq, chip: c.sessions>=c.freq?scChip("good","ON PLAN"):(c.sessions>0?scChip("mid",(c.freq-c.sessions)+" TO GO"):scChip("miss","0 YET")) },
      { h:2, n:ffTerm('iron','Iron moved'), v:(c.vol>0?c.vol.toLocaleString()+' lb':'—'), chip: c.vol>0?scChip("good","BANKED"):scChip("miss","—") },
      { h:3, n:ffTerm('speedtest','Speed test'), v:(c.bestT!=null?c.bestT+' mph':'—'), chip: c.bestT!=null?scChip("good","TESTED"):(speedTestDue()?scChip("mid","DUE"):scChip("miss","NEXT WK")) },
      { h:4, n:"Weigh-ins", v:String(c.weighs), chip: c.weighs>=3?scChip("good","TRENDING"):(c.weighs>0?scChip("mid","MORE"):scChip("miss","0 YET")) },
      { h:5, n:"Mobility", v:(c.mob?'screened':'—'), chip: c.mob?scChip("good","DONE"):(mobDue()?scChip("mid","DUE"):scChip("good","CURRENT")) },
      { h:6, n:"Fuel days", v:c.fuelOn+' / 7', chip: c.fuelOn>=5?scChip("good","ON PLAN"):(c.fuelLogged>0?scChip("mid","BUILDING"):scChip("miss","LOG FUEL")) }
    ];
    return pfCard('season','🗺️ Your season <small>'+(gy?('mission +'+gy+' yds'):'20 weeks')+'</small>',
      '<span class="pf-num">Wk '+wk+'/20</span><span class="pf-sub">'+c.sessions+'/'+c.freq+' this wk</span>',
      '<div class="season-scroll"><svg width="'+width+'" height="'+H+'" viewBox="0 0 '+width+' '+H+'">'+svg+'</svg></div>'+
      '<div class="season-leg"><span><i style="background:#2f9e5d"></i>Build</span><span><i style="background:#e0a33a"></i>Heavy</span>'+
      '<span><i style="background:#4d685a"></i>Deload</span><span><i style="background:#f4c542"></i>Peak</span><span>⛳ speed test (mph)</span>'+(ev&&ev.week?'<span>🏆 your event</span>':'')+'</div>'+
      '<div class="season-foot"><b>Week '+wk+' · '+wave2.label+'.</b> '+wave2.strap+
        (ev ? (ev.week && !ev.past
                ? ' <br><b>🏆 '+(ev.name||"Your event")+' — week '+ev.week+'.</b> The taper re-anchors to it: weeks '+(ev.week-1)+'–'+ev.week+' peak (volume down, intensity heavy), week '+(ev.week+1)+' recovers.'
                : (ev.past ? '' : ' <br>🏆 '+(ev.name||"Your event")+' falls outside this 20-week block.'))
             : ' <br>🏆 Peaking for something? <button type="button" class="stest-link" data-goview="account" style="color:#8be9ac">Set your event date</button> and the taper re-anchors to it.')+
      '</div>'+
      '<div class="pc-sec">'+ffTerm('scorecard','🗒️ Sunday Scorecard')+' <small>Wk '+wk+'</small></div>'+
      '<div class="sc-grid">'+scRows.map(function(r){
        return '<div class="sc-row"><span class="sc-hole">'+r.h+'</span><span class="sc-name">'+r.n+'</span><span class="sc-val">'+r.v+'</span>'+r.chip+'</div>'; }).join("")+'</div>'+
      '<button type="button" class="sc-share" data-scshare="1">'+ffIcon("share",14)+' Share this week’s card</button>',
      'pcard season');
  }
  /* ----- Sunday Scorecard: the week as a golf card — one ritual close per week ----- */
  function weekCard(){
    var ws=weekStartDateCal().getTime(), freq=(typeof planState!=="undefined"&&planState.freq)||4;
    var hist=lsGet("ff_history",[]).filter(function(h){ return h && (h.ts||0)>=ws; });
    var vol=hist.reduce(function(a,h){ return a+(h.volume||0); },0);
    var weighs=lsGet("ff_body",[]).filter(function(e){ if(!e || !e.w) return false;
      var t=e.ts || new Date(e.date).getTime(); return !isNaN(t) && t>=ws; }).length;
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
  function shareScorecard(){
    var c=weekCard();
    var txt="My Yardsmith week "+curWeek()+" scorecard: "+c.sessions+"/"+c.freq+" sessions"+
      (c.vol>0?(" · "+c.vol.toLocaleString()+" lb moved"):"")+
      (c.bestT!=null?(" · 7-iron "+c.bestT+" mph"):"")+" — Yardsmith ⛳";
    ffShareImage({
      kick:"Sunday Scorecard · Week "+curWeek(),
      big:c.sessions+"/"+c.freq, unit:"sessions",
      badge:(c.sessions>=c.freq?"✅ ON PLAN":null),
      lines:[ (c.vol>0?("🏋️ "+c.vol.toLocaleString()+" lb of iron moved"):null),
              (c.bestT!=null?("🎯 7-iron "+c.bestT+" mph tested"):null),
              ("⚖️ "+c.weighs+" weigh-in"+(c.weighs===1?"":"s")+(c.mob?" · 🧭 mobility screened":"")) ]
    }, txt);
  }
  /* ----- Calm pass: every Stats card folds to a headline row -----
     One compact line — title, headline stat, chevron — expanding on tap.
     Per-card state lives in ff_statsfold (device-local, NOT synced: how much
     you like expanded is a device preference, like theme). Defaults: the
     Octane hub and quick-log never fold; Speed opens; everything else starts
     as a headline. The stat only renders on the CLOSED row — the open card
     already says it bigger. */
  var PF_DEFAULTS={ speed:true };
  function pfIsOpen(key){
    var st=lsGet("ff_statsfold",null)||{};
    return (key in st) ? !!st[key] : !!PF_DEFAULTS[key];
  }
  function pfHead(key, title, stat, open){
    return '<button type="button" class="pc-head pf-head" data-pftoggle="'+key+'">'+
      '<span class="pc-t">'+title+'</span><span class="pf-side">'+(open?'':(stat||''))+
      '<span class="pf-arr">'+(open?'⌄':'›')+'</span></span></button>';
  }
  // openCls swaps the container class when expanded (e.g. the season map's
  // dark card, the scorecard's dashed card) — closed rows are always plain.
  function pfCard(key, title, stat, inner, openCls){
    var open=pfIsOpen(key);
    if(!open) return '<div class="pcard pf-closed">'+pfHead(key,title,stat,false)+'</div>';
    return '<div class="'+(openCls||'pcard')+' pf-open">'+pfHead(key,title,'',true)+inner+'</div>';
  }
  // The "unlocks as you log" strip: one quiet dashed card listing what appears
  // with data, each row deep-linking to the action that earns it. Replaces the
  // stack of empty placeholder cards a new user used to scroll past.
  function lockedStrip(items){
    if(!items.length) return '';
    return '<div class="pcard unlk"><div class="pc-head"><span class="pc-t">🔓 Unlocks as you log</span></div>'+
      items.map(function(i){
        return '<button type="button" class="unlk-r"'+(i.attr||' disabled')+'>'+
          '<span class="unlk-ic">'+i.ic+'</span><span class="unlk-tx"><b>'+i.t+'</b><span>'+i.s+'</span></span>'+
          (i.attr?'<span class="tl-go">›</span>':'')+'</button>';
      }).join("")+'</div>';
  }
  document.addEventListener("click", function(e){
    var b=e.target.closest("[data-pftoggle]"); if(!b) return;
    var k=b.getAttribute("data-pftoggle");
    var st=lsGet("ff_statsfold",null)||{};
    st[k]=!pfIsOpen(k);
    lsSet("ff_statsfold", st);
    renderProgress();
  });

  function renderProgress(){
    var el=$("progressBody"); if(!el) return;
    var body=lsGet("ff_body",[]);
    var spF=[], spD=[], wtF=[], wtD=[];
    body.forEach(function(e){
      var s=parseFloat(e.s); if(!isNaN(s)){ spF.push(s); spD.push(e.date||""); }
      var w=parseFloat(e.w); if(!isNaN(w)){ wtF.push(w); wtD.push(e.date||""); }
    });
    var sess=Object.keys(getLog()).length, lifts=bigLiftStats();
    var hasAny = sess>0 || spF.length>0 || wtF.length>0;

    var html='<div class="prog-hd"><div class="prog-kick">⛳ The proof it’s working</div><h2>Your Progress</h2></div>';
    html += renderScoreCard();

    // Consolidation pass (Stats 3.0): the page tells THREE stories below the
    // Octane hub — ⚡ speed (the north star, open), ⛳ the course (proof), and
    // 🏋️ the gym (PRs + strength + bodyweight + consistency, merged into one
    // card), with 🗺️ the season (map + Sunday Scorecard) as plan reference.
    // Anything with no data collects into ONE "unlocks as you log" strip.
    var locked=[];
    if(!hasAny){
      locked.push(
        { ic:'⚡', t:'Speed trend', s:'run the guided 7-iron test — your north star number', attr:' data-speedtest="1"' },
        { ic:'🏋️', t:'Gym & body', s:'log your first workout — PRs, strength and consistency build here', attr:' data-goview="plan"' },
        { ic:'⛳', t:'On the course', s:'bank rounds — the gym-to-course proof builds here', attr:' data-roundlog="1"' },
        { ic:'⚖️', t:'Bodyweight trend', s:'five seconds with ＋ Log', attr:' data-qopen="1"' });
    } else {
      // ---- Clubhead speed (north star) ----
      // The payoff of speed is DISTANCE. A 7-iron carries ~2 yards farther per +1 mph of
      // clubhead speed (public TrackMan/FlightScope data; smash ~1.33). We show the GAIN,
      // not an absolute carry claim — the trend is the honest, motivating signal.
      // (Population benchmarks live in the speed-test glossary term; the test
      // schedule only surfaces here on the day it's actually due.)
      var spNow=spF.length?spF[spF.length-1]:null, spBase=spF.length?spF[0]:null, spBest=spF.length?Math.max.apply(null,spF):null;
      var YDS_PER_MPH=2, spGain=(spNow!=null&&spBase!=null)?(spNow-spBase):0;
      if(!spF.length) locked.push({ ic:'⚡', t:'Speed trend', s:'run the guided 7-iron test — your north star number', attr:' data-speedtest="1"' });
      else html += pfCard('speed','⚡ Clubhead speed <small>7-iron</small>',
        (spNow!=null?'<span class="pf-num">'+spNow+' mph</span>':'')+(spF.length>=2?pcDelta(spNow-spBase," mph"):""),
        (spNow!=null?'<div class="pc-now">'+spNow+'<span>mph</span></div>':'<div class="pc-now muted">—</div>')+
        (spF.length>=2 ? pcLine(spF,"#16a34a","pcSpeed", spD, " mph")
          : '<div class="pc-need">'+(spF.length===1?"One more entry and your speed trend appears.":"Add a 7-iron speed with <b>＋ Log</b> to start the trend.")+'</div>')+
        (spF.length>=2&&spGain>0
          ? '<div class="pc-payoff">🎯 That’s roughly <b>+'+Math.round(spGain*YDS_PER_MPH)+' yards</b> of 7-iron carry since your baseline. <span>Speed is distance — ~2 yds per mph.</span></div>'
          : (spF.length>=2 ? '<div class="pc-payoff muted">Every <b>+1 mph</b> here is about <b>+2 yards</b> of carry. Keep the trend climbing.</div>' : ""))+
        '<div class="pc-foot"><span>'+ffTerm('speedtest','the test & benchmarks')+'</span>'+
          (spF.length>=2?'<span>baseline <b>'+spBase+'</b> · best <b>'+spBest+'</b> mph</span>':'')+'</div>'+
        (speedTestDue()?'<div class="pc-test"><button class="stest-go sm" data-speedtest="1">🎯 Speed test due — run it now</button></div>':""));

      // ---- On the course: the gym-to-course proof ----
      var cc=''; try{ cc=courseCardHtml(); }catch(e){}
      if(cc) html+=cc;
      else locked.push({ ic:'⛳', t:'On the course', s:'log a round — score, longest drive, how the body held up', attr:' data-roundlog="1"' });

      // ---- Gym & body: ONE card for the bodybuilder side — PR wall, e1RM
      // trends, bodyweight and consistency. They were four separate folds;
      // they answer one question ("is the gym work working?") so they share
      // one door. Missing pieces nudge inline instead of spawning cards. ----
      var prw=''; try{ prw=prWallInner(); }catch(e){}
      var wtNow=wtF.length?wtF[wtF.length-1]:null, wtBase=wtF.length?wtF[0]:null;
      if(!prw && !lifts.length && wtNow==null && !sess){
        locked.push({ ic:'🏋️', t:'Gym & body', s:'log your first workout — PRs, strength and consistency build here', attr:' data-goview="plan"' });
      } else {
        var g='';
        if(prw) g+='<div class="pc-sec first">🏆 PR Wall</div>'+prw;
        if(lifts.length) g+='<div class="pc-sec'+(g?'':' first')+'">🏋️ Strength <small>'+ffTerm('e1rm','est. 1RM')+'</small></div>'+
          lifts.slice(0,5).map(function(L){
            var d = L.first>0 ? (L.last-L.first)/L.first*100 : null;
            return '<button type="button" class="lr" data-exhist="'+escAttr(L.name)+'"><div class="lr-name">'+L.name+'</div>'+
              '<div class="lr-spark">'+(L.n>=2?pcMiniSpark(L.series,"#16a34a"):'<span class="lr-one">'+L.n+' set'+(L.n===1?"":"s")+'</span>')+'</div>'+
              '<div class="lr-val">'+Math.round(L.last)+'<small>lb</small>'+(L.n>=2&&d!=null?pcDelta(d,"%"):"")+'</div></button>';
          }).join("")+
          '<div class="pc-foot"><span>tap a lift for its full story</span></div>';
        else g+='<div class="pc-need">🏋️ Log weights on the big lifts — squat, bench, hinge, press, row — and your strength trends land here.</div>';
        if(wtNow!=null) g+='<div class="pc-sec">⚖️ Bodyweight</div>'+
          (wtF.length>=2 ? pcLine(wtF,"#0e7490","pcWt", wtD, " lb")+
            '<div class="pc-foot"><span>start <b>'+wtBase+'</b></span><span>now <b>'+wtNow+'</b> lb '+pcDelta(wtNow-wtBase," lb",true)+'</span></div>'
          : '<div class="pc-need">Logged <b>'+wtNow+' lb</b> — one more weigh-in and the trend line appears.</div>');
        else g+='<div class="pc-need">⚖️ A five-second weigh-in with <b>＋ Log</b> starts your bodyweight trend.</div>';
        if(sess) g+='<div class="pc-sec">📅 Consistency</div>'+
          '<div class="wkbars">'+weekBars()+'</div>'+
          '<div class="pc-foot"><span>'+sess+' total · sessions per week (last 8)</span><span>goal <b>'+((typeof planState!=="undefined"&&planState.freq)||4)+'</b>/wk</span></div>';
        var gymStat = lifts.length ? '<span class="pf-num">'+Math.round(lifts[0].best)+' lb</span><span class="pf-sub">best e1RM</span>'
          : (wtNow!=null ? '<span class="pf-num">'+wtNow+' lb</span><span class="pf-sub">bodyweight</span>'
          : '<span class="pc-delta neu">'+sess+' session'+(sess===1?'':'s')+'</span>');
        html += pfCard('gym','🏋️ Gym & body', gymStat, g);
      }
    }

    // ---- The season: where you are in the plan + this week's scorecard ----
    html += seasonCardHtml();

    html += lockedStrip(locked);

    // ---- Leaderboard (opt-in, competitive) ----
    html += renderLeaderboardCard();

    // ---- Coach read ----
    html += '<button class="dash-ai" data-ask="progress"><span class="dai-ic">💬</span>'+
      '<span class="dai-tx"><b>Coach my progress</b><span>An AI read on your trends &amp; what to push next</span></span>'+
      '<span class="dai-go">›</span></button>';

    el.innerHTML=html;
    var ss=el.querySelector(".season-scroll");
    if(ss) ss.scrollLeft=Math.max(0, (curWeek()-3)*46);
    if(pfIsOpen('lb')) loadLeaderboard();   // async fill only when the fold is open
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
      // iso (YYYY-MM-DD, from the schema-v1 migration) compares correctly
      // against the ISO week start; the old locale `date` string never did —
      // "Jul 8, 2026" >= "2026-07-06" is alphabetically ALWAYS true, so
      // every entry counted as this week and the deltas never showed.
      var inWk = (e.iso || "") >= wsStr;
      var s=parseFloat(e.s), w=parseFloat(e.w);
      if(!isNaN(s)){ if(inWk) spdIn.push(s); else spdPrev=s; }
      if(!isNaN(w)){ if(inWk) wtIn.push(w); else wtPrev=w; }
    });
    return { sessions:n,
      spd:(spdIn.length && spdPrev!=null) ? Math.round((spdIn[spdIn.length-1]-spdPrev)*10)/10 : null,
      wt:(wtIn.length && wtPrev!=null) ? Math.round((wtIn[wtIn.length-1]-wtPrev)*10)/10 : null };
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
    return pfCard('lb','🏆 Leaderboard','',
      '<div class="lb-seg lb-seg-top" id="lbSeg">'+seg+'</div>'+
      '<div id="lbBody"><div class="pc-need">Loading the board…</div></div>', 'pcard lb');
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
      setTimeout(function(){ if(cw&&cw.isConnected){ cw.removeAttribute("data-armed"); cw.textContent="↺ Clear / reset this workout"; cw.classList.remove("arm"); } }, 3500);
      return;
    }
    var cd=e.target.closest("[data-clearday]");                        // reset a specific logged day (Full-week / non-featured)
    if(cd){
      var cdn=cd.getAttribute("data-clearday");
      if(cd.getAttribute("data-armed")==="1"){ clearWorkoutFor(curWeek(), cdn); return; }
      cd.setAttribute("data-armed","1"); cd.textContent="Tap again to clear ✕"; cd.classList.add("arm");
      setTimeout(function(){ if(cd&&cd.isConnected){ cd.removeAttribute("data-armed"); cd.textContent="↺ Clear / reset this workout"; cd.classList.remove("arm"); } }, 3500);
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
    if(e.target.closest("[data-reset]")){
      // Full reset, same as the You tab — clearing only the start date left the
      // old season's ff_log keyed at weeks 1-20, so a "restarted" plan showed
      // every day already logged. History/bodyweight/7-iron trends survive.
      if(confirm("Restart from week 1? This clears the plan start date and this season's logged workouts — your history, bodyweight and 7-iron trends stay.")) resetPlanFull();
      return; }
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
    // [data-goview] is handled by the global delegated navigator (015-coach-tips).
  });
  /* ---- Global quick-log: the floating ＋ and its bottom sheet. One entry point
     for the daily inputs (weight / 7-iron / driver) plus jump-offs to the player,
     speed test and mobility screen — replaces the form that lived on Home. ---- */
  (function(){
    var fab=document.createElement("button");
    fab.className="ff-fab"; fab.id="ffFab"; fab.type="button"; fab.setAttribute("aria-label","Log anything");
    // Labeled, not a mystery circle: the one rule a user has to learn is
    // "anything that happened, hit ＋ Log."
    fab.innerHTML='＋<span class="ff-fab-lbl">Log</span>';
    document.body.appendChild(fab);
    var sheet=document.createElement("div");
    sheet.className="qsheet"; sheet.id="qSheet"; sheet.hidden=true;
    document.body.appendChild(sheet);
    function openSheet(weighOnly){
      // Weigh-in mode: the "Morning weigh-in" row wants JUST the scale — no
      // swing-stat fields, no action rows. The FAB (full "Log anything") keeps
      // everything.
      if(weighOnly){
        sheet.innerHTML='<div class="qsheet-card"><div class="qsheet-grab"></div>'+
          quickLogHtml("q","Same scale, same time — feeds your weight trend & Octane.", true)+
          '</div>';
        sheet.hidden=false; document.body.style.overflow="hidden"; return;
      }
      var d=(typeof todaySlot==="function")?todaySlot():null;
      var train=d && d.type!=="rest" && planStart();
      // The one missing log verb was meals — surface the NEXT unchecked one so
      // the sheet covers everything: workout, meal, weight/speed/drive, test, round.
      var mealRow='';
      try{
        if(ffSchedule && ffSchedule.length){
          var fdQ=fuelDay(ffISO())||{ m:{} }, ni=-1;
          for(var qi=0; qi<ffSchedule.length; qi++){ if(!(fdQ.m && fdQ.m[qi])){ ni=qi; break; } }
          if(ni>=0) mealRow='<button type="button" class="qsheet-act" data-fuelmeal="'+ni+'" data-fuelval="a">🍽️'+
            '<span>Check off a meal<span class="qa-sub">next up: '+ffSchedule[ni].label+' — tap when eaten</span></span><span class="qa-go">✓</span></button>';
        }
      }catch(e){}
      sheet.innerHTML='<div class="qsheet-card"><div class="qsheet-grab"></div>'+
        '<div class="qsheet-h">＋ Log anything</div>'+
        quickLogHtml("q","Weight, 7-iron &amp; driver feed your trends, Octane and the board.")+
        '<div class="qsheet-acts">'+
        (train?('<button type="button" class="qsheet-act" data-startplayer="'+escAttr(d.name)+'">'+ffIcon("barbell",18)+'<span>Start today’s workout<span class="qa-sub">'+d.name.replace(/^Day \d+ — /,"")+' · guided player</span></span><span class="qa-go">›</span></button>'):'')+
        mealRow+
        '<button type="button" class="qsheet-act" data-roundlog="1">⛳<span>Log a round<span class="qa-sub">score, longest drive, how the body held up</span></span><span class="qa-go">›</span></button>'+
        '<button type="button" class="qsheet-act" data-speedtest="1">'+ffIcon("target",18)+'<span>Speed test<span class="qa-sub">3 max swings — best one counts</span></span><span class="qa-go">›</span></button>'+
        '<button type="button" class="qsheet-act" data-mobscreen="1">'+ffIcon("compass",18)+'<span>Mobility screen<span class="qa-sub">3 moves · ~3 minutes</span></span><span class="qa-go">›</span></button>'+
        '</div></div>';
      sheet.hidden=false; document.body.style.overflow="hidden";
    }
    function closeSheet(){ sheet.hidden=true; document.body.style.overflow=""; }
    fab.addEventListener("click", function(){ openSheet(false); });
    // The Home "Morning weigh-in" row opens the scale-only variant.
    document.addEventListener("click", function(e){
      if(e.target.closest("[data-weighin]")) openSheet(true);
    });
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
      // Action rows open their overlays via the document-level listeners — just get
      // out of the way. (This element listener fires FIRST; the meal check-off then
      // runs in 030's document handler, which re-renders the dash itself.)
      if(e.target.closest("[data-fuelmeal]")){ closeSheet(); ffToast("Meal banked ✓"); return; }
      if(e.target.closest("[data-startplayer],[data-speedtest],[data-mobscreen],[data-roundlog]")) closeSheet();
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
