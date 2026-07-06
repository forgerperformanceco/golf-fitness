  /* ===================== SHEETS — one drag physics for every overlay ===================== */
  // Every bottom sheet in the app (.swap-card shells, the workout-logger .modal,
  // the quick-log .qsheet-card) gets the same gesture: grab the header, the card
  // follows your finger, flick or drag past ~30% to dismiss, release early and it
  // springs back. Dismissal re-uses each sheet's OWN close path by clicking its
  // scrim — every overlay already closes on e.target===root — so per-feature
  // cleanup (body scroll locks, state resets, re-renders) keeps working untouched.
  (function(){
    var SHEET = ".swap-card, .qsheet-card, .modal";
    var GRAB  = ".swap-head, .modal-head, .qsheet-grab, .qsheet-h";
    var drag = null;

    document.addEventListener("pointerdown", function(e){
      var grab = e.target.closest(GRAB);
      if(!grab) return;
      if(e.target.closest("button, input, select, textarea, a")) return;  // × etc. still just tap
      var card = grab.closest(SHEET); if(!card) return;
      var root = card.parentElement; if(!root) return;
      drag = { card:card, root:root, y0:e.clientY, dy:0, t0:performance.now(),
               h:Math.max(120, card.getBoundingClientRect().height) };
      card.style.transition = "none"; root.style.transition = "none";
      try{ grab.setPointerCapture(e.pointerId); }catch(_){}
    }, true);

    document.addEventListener("pointermove", function(e){
      if(!drag) return;
      var dy = Math.max(0, e.clientY - drag.y0);
      drag.dy = dy;
      drag.card.style.transform = "translateY(" + dy + "px)";
      drag.root.style.opacity = String(1 - 0.65 * Math.min(1, dy / drag.h));
    }, true);

    function endDrag(){
      if(!drag) return;
      var d = drag; drag = null;
      var v = d.dy / Math.max(1, performance.now() - d.t0);       // px per ms
      var dismiss = d.dy > d.h * 0.3 || (v > 0.6 && d.dy > 40);
      d.card.style.transition = "transform .22s ease-in";
      d.root.style.transition = "opacity .22s ease-in";
      if(dismiss){
        d.card.style.transform = "translateY(105%)";
        d.root.style.opacity = "0";
        setTimeout(function(){
          d.card.style.cssText = ""; d.root.style.opacity = ""; d.root.style.transition = "";
          d.root.click();                       // the sheet's own scrim-tap close path
        }, 210);
      } else {
        d.card.style.transition = "transform .28s cubic-bezier(.3,1.3,.5,1)";
        d.card.style.transform = ""; d.root.style.opacity = "";
        setTimeout(function(){
          if(drag && drag.card === d.card) return;
          d.card.style.transition = ""; d.root.style.transition = "";
        }, 300);
      }
    }
    document.addEventListener("pointerup", endDrag, true);
    document.addEventListener("pointercancel", endDrag, true);
  })();
