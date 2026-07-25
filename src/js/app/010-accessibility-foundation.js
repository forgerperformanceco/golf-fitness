  /* ===================== ACCESSIBILITY FOUNDATION =====================
     One native-feeling contract for every sheet and dialog: hidden overlays stay
     out of the accessibility tree, open overlays receive focus, Tab stays inside,
     Escape closes, and focus returns to the control that launched the overlay. */
  (function(){
    var activeOverlay=null, returnFocus=null;

    function isOpen(el){
      if(!el || el.hidden) return false;
      return !el.classList.contains("modal-back") || el.classList.contains("open");
    }
    function focusable(root){
      return Array.prototype.filter.call(
        root.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'),
        function(el){ return el.offsetParent!==null && el.getAttribute("aria-hidden")!=="true"; }
      );
    }
    function syncOverlays(){
      var overlays=Array.prototype.slice.call(document.querySelectorAll(".modal-back,.swap-modal,.qsheet"));
      var open=null;
      overlays.forEach(function(el){
        var shown=isOpen(el);
        el.setAttribute("aria-hidden", shown ? "false" : "true");
        if(shown) open=el;
        var card=el.querySelector(".modal,.swap-card,.qsheet-card");
        if(card){
          card.setAttribute("role","dialog");
          card.setAttribute("aria-modal","true");
          if(!card.hasAttribute("tabindex")) card.setAttribute("tabindex","-1");
        }
      });
      if(open && open!==activeOverlay){
        returnFocus=document.activeElement && document.activeElement!==document.body ? document.activeElement : null;
        activeOverlay=open;
        requestAnimationFrame(function(){
          if(!activeOverlay || !isOpen(activeOverlay)) return;
          var close=activeOverlay.querySelector('[aria-label="Close"],.modal-close,.swap-x');
          var choices=focusable(activeOverlay);
          var target=close || choices[0] || activeOverlay.querySelector('[role="dialog"]');
          if(target && !activeOverlay.contains(document.activeElement)) target.focus();
        });
      }else if(!open && activeOverlay){
        activeOverlay=null;
        if(returnFocus && returnFocus.isConnected) try{ returnFocus.focus(); }catch(e){}
        returnFocus=null;
      }else if(open){
        activeOverlay=open;
      }
    }

    document.addEventListener("keydown", function(e){
      if(!activeOverlay || !isOpen(activeOverlay)) return;
      if(e.key==="Escape"){
        e.preventDefault();
        var close=activeOverlay.querySelector('[aria-label="Close"],.modal-close,.swap-x');
        if(close) close.click(); else activeOverlay.click();
        return;
      }
      if(e.key!=="Tab") return;
      var choices=focusable(activeOverlay); if(!choices.length){ e.preventDefault(); return; }
      var first=choices[0], last=choices[choices.length-1];
      if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
    }, true);

    try{
      new MutationObserver(syncOverlays).observe(document.body, {
        subtree:true, childList:true, attributes:true, attributeFilter:["class","hidden"]
      });
    }catch(e){}
    syncOverlays();
  })();
