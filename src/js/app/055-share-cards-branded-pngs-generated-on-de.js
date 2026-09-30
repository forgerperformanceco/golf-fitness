  /* ===================== SHARE CARDS — branded PNGs, generated on-device =====================
     One canvas engine for every share moment (session recap, Sunday Scorecard,
     speed test, the Yardsmith card). navigator.share with the image file where
     supported; falls back to downloading the PNG; last resort copies the text
     version. No servers, no external assets — the brand is drawn, not loaded. */
  function ffRoundRect(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
  // The canvas every card starts from: backdrop, rings, and the Yard|smith wordmark.
  function ffCardCanvas(){
    var W=1080, H=1350, c=document.createElement("canvas"); c.width=W; c.height=H;
    var g=c.getContext("2d");
    var rg=g.createRadialGradient(W*0.82,-H*0.08,80, W*0.82,-H*0.08,H*1.25);
    rg.addColorStop(0,"#15582f"); rg.addColorStop(0.5,"#0a2317"); rg.addColorStop(1,"#06140d");
    g.fillStyle=rg; g.fillRect(0,0,W,H);
    g.strokeStyle="rgba(139,233,172,.07)"; g.lineWidth=110;
    g.beginPath(); g.arc(W*0.88,H*0.16,340,0,6.3); g.stroke();
    g.beginPath(); g.arc(W*0.05,H*0.92,260,0,6.3); g.stroke();
    // brand
    g.textBaseline="alphabetic";
    g.font="900 66px system-ui, -apple-system, sans-serif";
    g.fillStyle="#ffffff"; g.fillText("Yard",72,132);
    var bw=g.measureText("Yard").width;
    g.fillStyle="#7ef0a8"; g.fillText("smith",72+bw,132);
    return { c:c, g:g, W:W, H:H };
  }
  function ffCardBlob(c, cb){ try{ c.toBlob(function(b){ cb(b); },"image/png"); }catch(e){ cb(null); } }
  function ffMakeCard(o, cb){
    var k=ffCardCanvas(), c=k.c, g=k.g, W=k.W, H=k.H;
    // kicker
    g.font="800 38px system-ui, sans-serif"; g.fillStyle="#8fd6a8";
    g.fillText((o.kick||"").toUpperCase(),72,262);
    // hero number + unit
    g.font="900 190px system-ui, sans-serif"; g.fillStyle="#ffffff";
    var big=String(o.big||""); g.fillText(big,66,478);
    if(o.unit){ var bw2=g.measureText(big).width; g.font="700 54px system-ui, sans-serif"; g.fillStyle="#9fc4ac"; g.fillText(o.unit, 78+bw2, 478); }
    var y=560;
    if(o.badge){
      g.font="900 46px system-ui, sans-serif";
      var tw=g.measureText(o.badge).width;
      var lg=g.createLinearGradient(72,0,72+tw+76,0); lg.addColorStop(0,"#f59e0b"); lg.addColorStop(1,"#ef4444");
      g.fillStyle=lg; ffRoundRect(g,72,y-58,tw+76,88,44); g.fill();
      g.fillStyle="#ffffff"; g.fillText(o.badge,110,y+4);
      y+=136;
    } else y+=24;
    g.font="600 40px system-ui, sans-serif"; g.fillStyle="#cfe3d6";
    (o.lines||[]).forEach(function(ln){
      if(!ln) return;
      while(g.measureText(ln).width > W-144 && ln.length>4) ln=ln.slice(0,-2);
      g.fillText(ln,72,y); y+=76;
    });
    // footer — one line, left-aligned, no collisions
    g.fillStyle="rgba(255,255,255,.08)"; g.fillRect(0,H-150,W,150);
    g.font="800 42px system-ui, sans-serif"; g.fillStyle="#8be9ac";
    g.fillText("Yardsmith",72,H-58);
    var fw=g.measureText("Yardsmith").width;
    g.font="600 36px system-ui, sans-serif"; g.fillStyle="#9fc4ac";
    g.fillText("· Turn muscle into distance ⛳", 72+fw+18, H-58);
    ffCardBlob(c, cb);
  }
  // Delivery for any card maker: native share sheet → PNG download → copied text.
  // Each rung falls through to the next on failure — a rejected share (other
  // than the user cancelling the sheet) or a blocked download must never end
  // silently with nothing shared and no word why.
  function ffShareCopy(textFallback){
    try{
      navigator.clipboard.writeText(textFallback)
        .then(function(){ ffToast("Copied — paste it anywhere 📋"); })
        .catch(function(){ ffToast("Couldn’t share on this device."); });
    }catch(e){ ffToast("Couldn’t share on this device."); }
  }
  function ffShareDownload(blob){
    try{
      var url=URL.createObjectURL(blob), a=document.createElement("a");
      a.href=url; a.download="yardsmith-card.png";
      document.body.appendChild(a); a.click();
      setTimeout(function(){ try{ URL.revokeObjectURL(url); a.remove(); }catch(e2){} },1500);
      ffToast("Card saved as an image — post it anywhere 📤");
      return true;
    }catch(e){ return false; }
  }
  function ffShareBlob(make, textFallback){
    make(function(blob){
      if(blob){
        try{
          var file=new File([blob],"yardsmith-card.png",{type:"image/png"});
          if(navigator.canShare && navigator.canShare({files:[file]}) && navigator.share){
            navigator.share({ files:[file], text:textFallback }).catch(function(err){
              if(err && err.name==="AbortError") return;          // user closed the sheet — not a failure
              if(!ffShareDownload(blob)) ffShareCopy(textFallback);
            });
            return;
          }
        }catch(e){}
        if(ffShareDownload(blob)) return;
      }
      ffShareCopy(textFallback);
    });
  }
  function ffShareImage(o, textFallback){ ffShareBlob(function(cb){ ffMakeCard(o, cb); }, textFallback); }

  /* ----- The Yardsmith card — a player card built from YOUR numbers -----
     The card a golfer posts to say "this is what the work bought me." Only this
     golfer's own data: the hero is the best positive change since their first
     entry (driver carry, else 7-iron speed); failing that, today's number;
     failing that, Octane. Progress against your own start, never a rank against
     other golfers — no tiers, no estimates dressed up as measurements, and a
     drop is never printed as a gain (that tile just shows today's value). */
  var YC_MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function ycSince(iso){
    var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso||""); if(!m) return "my start";
    var s=YC_MON[parseInt(m[2],10)-1]+" "+parseInt(m[3],10);
    return parseInt(m[1],10)===new Date().getFullYear() ? s : s+", "+m[1];
  }
  function ycNum(v){ return String(Math.round(v*10)/10); }
  // ff_body values in stored order (the same order Octane and the hero read).
  function ycSeries(key){
    var out=[];
    lsGet("ff_body",[]).forEach(function(e){
      var v=e ? parseFloat(e[key]) : NaN;
      if(v>0) out.push({ v:v, iso:(e.iso||"") });
    });
    return out;
  }
  // Consecutive plan weeks with a finished session, counted back from this week
  // (or from last week while this week's first session is still ahead) — a live
  // streak, never a stale one.
  function ycStreak(){
    var per={}; sessionsByWeek().forEach(function(s){ per[s.w]=true; });
    var w=curWeek(); if(!per[w]) w--;
    var n=0; while(w>0 && per[w]){ n++; w--; }
    return n;
  }
  function ycData(){
    var r=ffScore(), d=driveStats(), sp=ycSeries("s"), dr=ycSeries("d"), sess=sessionsByWeek().length;
    var sNow=sp.length ? sp[sp.length-1].v : null;
    var sGain=sp.length>=2 ? Math.round((sNow-sp[0].v)*10)/10 : null;
    var dGain=(d && d.n>=2) ? d.gain : null, hero=null;
    if(dGain!=null && dGain>0)
      hero={ kind:"drive", big:"+"+dGain, unit:"yds", kick:"Driver carry since "+ycSince(dr[0].iso),
        proof:d.baseline+" → "+d.latest+" yds", share:"+"+dGain+" yds of driver carry since "+ycSince(dr[0].iso) };
    else if(sGain!=null && sGain>0)
      hero={ kind:"speed", big:"+"+ycNum(sGain), unit:"mph", kick:"7-iron speed since "+ycSince(sp[0].iso),
        proof:ycNum(sp[0].v)+" → "+ycNum(sNow)+" mph", share:"+"+ycNum(sGain)+" mph of 7-iron speed since "+ycSince(sp[0].iso) };
    else if(d)
      hero={ kind:"drive", big:String(d.latest), unit:"yds", kick:"Driver carry", share:"driver carry "+d.latest+" yds" };
    else if(sNow!=null)
      hero={ kind:"speed", big:ycNum(sNow), unit:"mph", kick:"7-iron speed", share:"7-iron "+ycNum(sNow)+" mph" };
    else if(sess)       // early days: the work done says more than a young Octane
      hero={ kind:"sessions", big:String(sess), unit:(sess===1?"workout":"workouts"), kick:"Done so far",
        share:sess+" workout"+(sess===1?"":"s")+" done" };
    else if(r.score!=null)
      hero={ kind:"octane", big:String(r.score), unit:"Octane", kick:"My engine score", share:"Octane "+r.score };
    if(!hero) return null;

    var tiles=[], hist=lsGet("ff_score_hist",[]);
    if(r.score!=null && hero.kind!=="octane")
      tiles.push({ label:"OCTANE", value:String(r.score), unit:"/100", sub:"engine score",
        spark:(Array.isArray(hist) ? hist.map(function(h){ return h && h.s; }).filter(function(v){ return typeof v==="number"; }) : []),
        share:"Octane "+r.score });
    if(d && hero.kind!=="drive"){
      var dUp=(dGain!=null && dGain>0);
      tiles.push({ label:"DRIVER CARRY", value:String(d.latest), unit:"yds", up:dUp,
        sub:dUp ? "▲ +"+dGain+" since start" : "latest carry",
        spark:dr.map(function(x){ return x.v; }), share:"driver "+d.latest+" yds" });
    }
    if(sNow!=null && hero.kind!=="speed"){
      var sUp=(sGain!=null && sGain>0);
      tiles.push({ label:"7-IRON SPEED", value:ycNum(sNow), unit:"mph", up:sUp,
        sub:sUp ? "▲ +"+ycNum(sGain)+" since start" : "clubhead speed",
        spark:sp.map(function(x){ return x.v; }), share:"7-iron "+ycNum(sNow)+" mph" });
    }
    var stg=strengthGain(), stPct=(stg!=null) ? Math.round(stg*100) : 0;
    if(stPct>0)
      tiles.push({ label:"STRENGTH", value:"+"+stPct+"%", unit:"", up:true, sub:"on the big lifts",
        share:"big lifts +"+stPct+"%" });
    if(sess && hero.kind!=="sessions"){
      var streak=ycStreak(), banked=sess+" workout"+(sess===1?"":"s")+" done";
      if(streak>=2) tiles.push({ label:"STREAK", value:String(streak), unit:"wk", sub:banked, share:streak+"-week streak" });
      else tiles.push({ label:"WORKOUTS", value:String(sess), unit:"", sub:"done", share:banked });
    }

    var gy=goalYds(), mission=null;
    // The bar appears once there's real progress to fill it; before that the
    // mission is just the goal — a share card never prints "0%".
    if(gy) mission={ goal:gy, hit:(dGain!=null && dGain>=gy),
      pct:(dGain!=null && dGain>0 ? Math.min(1, dGain/gy) : null) };
    return { hero:hero, tiles:tiles.slice(0,4), mission:mission,
      week:(planStart() ? curWeek() : null),
      handle:String(lsGet("ff_handle","")||"").trim().slice(0,20) };
  }
  function ycFit(g, txt, maxW){
    if(g.measureText(txt).width<=maxW) return txt;
    while(txt.length>2 && g.measureText(txt+"…").width>maxW) txt=txt.slice(0,-1);
    return txt+"…";
  }
  function ycSpark(g, vals, x, y, w, h){
    if(!vals || vals.length<3) return;
    vals=vals.slice(-24);
    var mn=Math.min.apply(null,vals), mx=Math.max.apply(null,vals), rng=mx-mn;
    function Y(v){ return rng ? y+h-(v-mn)/rng*h : y+h/2; }
    g.save();
    g.lineWidth=5; g.lineJoin="round"; g.lineCap="round"; g.strokeStyle="#8be9ac";
    g.beginPath();
    vals.forEach(function(v,i){ var px=x+w*i/(vals.length-1); if(i) g.lineTo(px,Y(v)); else g.moveTo(px,Y(v)); });
    g.stroke();
    g.fillStyle="#8be9ac"; g.beginPath(); g.arc(x+w, Y(vals[vals.length-1]), 8, 0, 6.3); g.fill();
    g.restore();
  }
  function ffMakeYardsmithCard(o, cb){
    var k=ffCardCanvas(), c=k.c, g=k.g, W=k.W, H=k.H, M=72;
    // The app's numeral face when this page already has it; the system face otherwise
    // (never wait on a font load — the share sheet needs the tap's user activation).
    var num=false; try{ num=!!(document.fonts && document.fonts.check("600 100px 'FF Numeral'")); }catch(e){}
    function numFont(px){ return num ? "600 "+px+"px 'FF Numeral', system-ui, sans-serif" : "900 "+Math.round(px*0.9)+"px system-ui, sans-serif"; }
    // header: where you are in the build + your handle (only if you chose one)
    if(o.week){
      g.font="800 30px system-ui, sans-serif"; g.fillStyle="#8fd6a8"; g.textAlign="right";
      g.fillText("WEEK "+o.week+" OF 20", W-M, 128); g.textAlign="left";
    }
    if(o.handle){ g.font="700 34px system-ui, sans-serif"; g.fillStyle="#9fc4ac"; g.fillText(ycFit(g,"@"+o.handle,W-2*M), M, 190); }
    // hero: the change since your start, told in your own numbers
    var h=o.hero, y;
    g.font="800 36px system-ui, sans-serif"; g.fillStyle="#8fd6a8";
    g.fillText(ycFit(g,h.kick.toUpperCase(),W-2*M), M, 292);
    g.font=numFont(210); g.fillStyle="#ffffff"; g.fillText(h.big, M-6, 500);
    var bw=g.measureText(h.big).width;
    g.font="700 56px system-ui, sans-serif"; g.fillStyle="#9fc4ac"; g.fillText(h.unit, M+bw+14, 500);
    y=500;
    if(h.proof){ g.font="600 40px system-ui, sans-serif"; g.fillStyle="#cfe3d6"; g.fillText(h.proof, M, 572); y=572; }
    y+=82;
    // the distance mission — your goal, your progress
    if(o.mission){
      var m=o.mission;
      g.font="800 30px system-ui, sans-serif"; g.fillStyle="#8fd6a8";
      g.fillText("DISTANCE MISSION · +"+m.goal+" YDS", M, y);
      if(m.pct!=null){
        g.textAlign="right"; g.fillStyle="#ffffff";
        g.fillText(m.hit ? "🏁 COMPLETE" : Math.round(m.pct*100)+"%", W-M, y); g.textAlign="left";
        g.fillStyle="rgba(255,255,255,.1)"; ffRoundRect(g,M,y+22,W-2*M,22,11); g.fill();
        var fw=Math.max(22,(W-2*M)*m.pct), lg=g.createLinearGradient(M,0,M+fw,0);
        lg.addColorStop(0,"#2f9e5d"); lg.addColorStop(1,"#8be9ac");
        g.fillStyle=lg; ffRoundRect(g,M,y+22,fw,22,11); g.fill();
        y+=44;
      }
      y+=62;
    }
    // stat tiles — two across; an odd last tile spans the row
    var n=o.tiles.length;
    if(n){
      var gap=24, rows=Math.ceil(n/2), bottom=H-150-56;
      var th=Math.min(192,(bottom-y-gap*(rows-1))/rows), tw=(W-2*M-gap)/2;   // content height; sparse cards just breathe
      o.tiles.forEach(function(t,i){
        var full=(i===n-1 && n%2===1), col=i%2, row=Math.floor(i/2);
        var x=M+(full?0:col*(tw+gap)), ty=y+row*(th+gap), w=full?(W-2*M):tw;
        g.fillStyle="rgba(255,255,255,.055)"; ffRoundRect(g,x,ty,w,th,28); g.fill();
        g.strokeStyle="rgba(255,255,255,.1)"; g.lineWidth=2; ffRoundRect(g,x,ty,w,th,28); g.stroke();
        g.font="800 26px system-ui, sans-serif"; g.fillStyle="#8fd6a8"; g.fillText(t.label, x+30, ty+52);
        g.font=numFont(76); g.fillStyle="#ffffff"; g.fillText(t.value, x+28, ty+124);
        if(t.unit){
          var vw=g.measureText(t.value).width;
          g.font="700 30px system-ui, sans-serif"; g.fillStyle="#9fc4ac"; g.fillText(t.unit, x+28+vw+10, ty+124);
        }
        g.font="600 28px system-ui, sans-serif"; g.fillStyle=t.up ? "#8be9ac" : "#cfe3d6";
        g.fillText(ycFit(g,t.sub,w-60), x+30, ty+th-22);
        ycSpark(g, t.spark, x+w-180, ty+44, 150, 60);
      });
    }
    // footer: where to find it
    g.fillStyle="rgba(255,255,255,.08)"; g.fillRect(0,H-150,W,150);
    g.font="800 42px system-ui, sans-serif"; g.fillStyle="#8be9ac"; g.fillText("yardsmith.golf", M, H-58);
    var uw=g.measureText("yardsmith.golf").width, tag="Turn muscle into distance ⛳";
    g.font="600 32px system-ui, sans-serif"; g.fillStyle="#9fc4ac";
    if(M+uw+40+g.measureText(tag).width <= W-M){ g.textAlign="right"; g.fillText(tag, W-M, H-58); g.textAlign="left"; }
    ffCardBlob(c, cb);
  }
  function shareYardsmithCard(){
    var o=ycData();
    if(!o){ ffToast("Log a workout or a speed test first — then your card has a story to tell."); return; }
    var txt="My Yardsmith card: "+[o.hero.share].concat(o.tiles.map(function(t){ return t.share; })).join(" · ")+
      " — building my engine at yardsmith.golf ⛳";
    ffShareBlob(function(cb){ ffMakeYardsmithCard(o, cb); }, txt);
  }
  document.addEventListener("click", function(e){
    if(e.target.closest("[data-yscard]")) shareYardsmithCard();
  });
