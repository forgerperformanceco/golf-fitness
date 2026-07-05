  /* ===================== PERSISTENCE (remember everything, per device) ===================== */
  function persist(){
    if (typeof planState === "undefined") return;     // not ready during first init render
    try {
      localStorage.setItem("fairwayfuel", JSON.stringify({
        sex:state.sex, goal:state.goal, workout:state.workout, meals:state.meals,
        age:$("age").value, weight:$("weight").value,
        heightFt:$("heightFt").value, heightIn:$("heightIn").value,
        activity:$("activity").value,
        freq:planState.freq, equip:planState.equip,
        view:(document.querySelector("#tabs button.active")||{getAttribute:function(){return "calc";}}).getAttribute("data-view")
      }));
      window.dispatchEvent(new Event("ff-data-changed"));   // nudge cloud-sync to push promptly
    } catch(e){}
  }
  function restore(){
    var data; try { data=JSON.parse(localStorage.getItem("fairwayfuel")||"null"); } catch(e){ data=null; }
    if(!data) return;
    ["age","weight","heightFt","heightIn","activity"].forEach(function(id){
      if(data[id]!=null && data[id]!=="" && $(id)) $(id).value=data[id];
    });
    function act(segId, attr, val){
      var seg=$(segId); if(!seg||val==null) return;
      Array.prototype.forEach.call(seg.querySelectorAll("button"), function(b){
        b.classList.toggle("active", b.getAttribute(attr)===String(val));
      });
    }
    if(data.sex){ state.sex=data.sex; act("sexSeg","data-sex",data.sex); }
    if(data.workout){ state.workout=data.workout; act("workoutSeg","data-workout",data.workout); }
    if(data.goal){ state.goal=data.goal;
      Array.prototype.forEach.call($("goals").querySelectorAll(".goal"), function(b){
        b.classList.toggle("active", b.getAttribute("data-goal")===data.goal);
      });
    }
    if(typeof data.meals!=="undefined") state.meals=data.meals;
    if(data.freq) planState.freq=data.freq;
    if(data.equip && typeof data.equip==="object"){
      Object.keys(data.equip).forEach(function(k){ planState.equip[k]=!!data.equip[k]; });
      planState.equip.bodyweight=true;
    }
    if(data.view) setView(data.view, false);
  }
