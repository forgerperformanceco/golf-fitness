  /* ===================== MOTION — the app's physics layer ===================== */
  // Count-up numbers, gauge sweeps, PR celebration, haptic ticks. Everything in
  // this module is decorative: every entry point is try/guarded so a motion
  // failure can never break behavior, and prefers-reduced-motion turns it all off.

  function ffReduced(){
    try{ return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }catch(e){ return false; }
  }

  // Haptic tick. Android Chrome vibrates; iOS Safari ignores navigator.vibrate
  // silently, so this is a free upgrade where supported and a no-op elsewhere.
  function ffTick(pattern){
    try{ if(!ffReduced() && navigator.vibrate) navigator.vibrate(pattern||10); }catch(e){}
  }

  // Count-up: any element rendered as
  //   <span data-countup="31740" data-cu-fmt="locale" data-cu-suffix=" lb">31,740 lb</span>
  // gets its number animated 0 → value with an ease-out curve. The FINAL value is
  // already in the markup, so if motion is off (or JS dies) the number is simply there.
  function ffCountUps(root){
    if(ffReduced()) return;
    try{
      var els=(root||document).querySelectorAll("[data-countup]");
      Array.prototype.forEach.call(els, function(el){
        if(el.__ffCU) return; el.__ffCU=true;
        var target=parseFloat(el.getAttribute("data-countup"));
        if(isNaN(target) || target===0) return;
        var suffix=el.getAttribute("data-cu-suffix")||"";
        var locale=el.getAttribute("data-cu-fmt")==="locale";
        var dur=Math.min(900, 450+Math.abs(target));   // small numbers settle fast
        var t0=null;
        function frame(t){
          if(!el.isConnected) return;                   // view re-rendered mid-flight
          if(t0===null) t0=t;
          var p=Math.min(1,(t-t0)/dur); p=1-Math.pow(1-p,3);
          var v=Math.round(target*p);
          el.textContent=(locale?v.toLocaleString():String(v))+suffix;
          if(p<1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
    }catch(e){}
  }

  // Gauge sweep: the Octane arc is rendered at its final stroke-dashoffset. Pull
  // it back to empty, force a reflow, then release — the CSS transition on
  // .ffsweep does the E→score sweep.
  function ffSweepGauges(root){
    if(ffReduced()) return;
    try{
      var arcs=(root||document).querySelectorAll(".ffscore-gauge svg path[stroke-dasharray]");
      Array.prototype.forEach.call(arcs, function(p){
        if(p.__ffSwept) return; p.__ffSwept=true;
        var final=p.getAttribute("stroke-dashoffset"), full=p.getAttribute("stroke-dasharray");
        if(final==null || full==null || final===full) return;
        p.style.transition="none"; p.style.strokeDashoffset=full;
        void p.getBoundingClientRect();
        p.style.transition="stroke-dashoffset .9s cubic-bezier(.25,.9,.35,1)";
        p.style.strokeDashoffset=final;
      });
    }catch(e){}
  }

  // One observer animates everything: renders in this app are innerHTML swaps,
  // so instead of threading "now animate" calls through every render site, watch
  // the document and sweep any new [data-countup] / gauge on the next frame.
  (function(){
    var queued=false;
    function run(){ queued=false; ffCountUps(document); ffSweepGauges(document); }
    try{
      new MutationObserver(function(){
        if(queued) return; queued=true; requestAnimationFrame(run);
      }).observe(document.documentElement, { childList:true, subtree:true });
    }catch(e){}
    document.addEventListener("DOMContentLoaded", run);
  })();

  // PR celebration: a short confetti burst in brand greens + gold. Canvas overlay,
  // self-removing, capped at ~1.4s — a moment, not a light show.
  function ffCelebrate(){
    if(ffReduced()) return;
    try{
      if(document.getElementById("ffConfetti")) return;
      var c=document.createElement("canvas"); c.id="ffConfetti";
      c.style.cssText="position:fixed;inset:0;z-index:400;pointer-events:none;";
      var dpr=Math.min(2, window.devicePixelRatio||1);
      c.width=innerWidth*dpr; c.height=innerHeight*dpr;
      document.body.appendChild(c);
      var ctx=c.getContext("2d"); ctx.scale(dpr,dpr);
      var colors=["#2f9e5d","#8be9ac","#f7c948","#ffffff","#14532d"];
      var parts=[], N=90;
      for(var i=0;i<N;i++){
        parts.push({ x:innerWidth/2, y:innerHeight*0.42,
          vx:(Math.random()-0.5)*11, vy:-(4+Math.random()*9),
          s:4+Math.random()*5, r:Math.random()*Math.PI, vr:(Math.random()-0.5)*0.3,
          col:colors[i%colors.length] });
      }
      var t0=performance.now();
      (function frame(t){
        var dt=(t-t0)/1000;
        ctx.clearRect(0,0,innerWidth,innerHeight);
        parts.forEach(function(p){
          p.x+=p.vx; p.y+=p.vy; p.vy+=0.35; p.r+=p.vr;
          ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r);
          ctx.globalAlpha=Math.max(0,1-dt/1.4);
          ctx.fillStyle=p.col; ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*0.6);
          ctx.restore();
        });
        if(dt<1.4) requestAnimationFrame(frame); else c.remove();
      })(t0);
    }catch(e){}
  }

  // iOS leaves position:fixed bottom bars stranded mid-screen after the
  // on-screen keyboard closes (the visual viewport shrinks and fixed elements
  // aren't re-anchored). Track the visual viewport: while the keyboard is up,
  // hide the pinned bars (body.ff-kb); when it closes, force the compositor to
  // re-anchor them with a one-frame transform nudge.
  (function(){
    var vv=window.visualViewport; if(!vv) return;
    var t=null;
    function editing(){
      var a=document.activeElement;
      return !!(a && (a.tagName==="INPUT"||a.tagName==="TEXTAREA"||a.tagName==="SELECT"||a.isContentEditable));
    }
    function sync(){
      // Keyboard = a field is focused AND the visual viewport lost real height.
      // vv.height is in visual CSS px — multiply by scale so pinch-zoom (which
      // shrinks vv.height without any keyboard) can never read as a keyboard.
      var gap=window.innerHeight - vv.height*vv.scale;
      var kb=editing() && vv.scale<1.15 && gap>150;
      document.body.classList.toggle("ff-kb", kb);
      if(!kb){
        ["mobileTabs","ffFab","plPauseBar"].forEach(function(id){
          var el=document.getElementById(id); if(!el) return;
          el.style.transform="translateZ(0)";
          requestAnimationFrame(function(){ el.style.transform=""; });
        });
      }
    }
    ["resize","scroll"].forEach(function(ev){
      vv.addEventListener(ev, function(){ clearTimeout(t); t=setTimeout(sync, 90); });
    });
    document.addEventListener("focusout", function(){ setTimeout(sync, 250); }, true);
    // Failsafe: the hide class can never outlive its cause — any tap with no
    // field focused re-syncs immediately.
    document.addEventListener("pointerdown", function(){
      if(document.body.classList.contains("ff-kb") && !editing()) sync();
    }, true);
  })();
