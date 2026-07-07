  /* ===================== SHARE CARDS — branded PNGs, generated on-device =====================
     One canvas engine for every share moment (session recap, Sunday Scorecard,
     speed test). navigator.share with the image file where supported; falls back
     to downloading the PNG; last resort copies the text version. No servers,
     no external assets — the brand is drawn, not loaded. */
  function ffRoundRect(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
  function ffMakeCard(o, cb){
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
    g.fillStyle="#ffffff"; g.fillText("Fairway",72,132);
    var bw=g.measureText("Fairway").width;
    g.fillStyle="#7ef0a8"; g.fillText("Fuel",72+bw,132);
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
    try{ c.toBlob(function(b){ cb(b); },"image/png"); }catch(e){ cb(null); }
  }
  function ffShareImage(o, textFallback){
    ffMakeCard(o, function(blob){
      if(blob){
        try{
          var file=new File([blob],"yardsmith-card.png",{type:"image/png"});
          if(navigator.canShare && navigator.canShare({files:[file]}) && navigator.share){
            navigator.share({ files:[file], text:textFallback }).catch(function(){});
            return;
          }
        }catch(e){}
        try{
          var url=URL.createObjectURL(blob), a=document.createElement("a");
          a.href=url; a.download="yardsmith-card.png";
          document.body.appendChild(a); a.click();
          setTimeout(function(){ try{ URL.revokeObjectURL(url); a.remove(); }catch(e2){} },1500);
          ffToast("Card saved as an image — post it anywhere 📤");
          return;
        }catch(e){}
      }
      try{ navigator.clipboard.writeText(textFallback).then(function(){ ffToast("Copied — paste it anywhere 📋"); }); }
      catch(e){ ffToast("Couldn’t share on this device."); }
    });
  }
