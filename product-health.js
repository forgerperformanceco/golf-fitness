/* Anonymous, first-party product health. Never sends account, health or free-text data. */
(function () {
  "use strict";
  var ENDPOINT = "https://tbwmckmyzoxzhpqlomsp.supabase.co/functions/v1/product-health";
  var ALLOWED = {
    app_open:1, view_changed:1, onboarding_completed:1, onboarding_skipped:1,
    workout_started:1, workout_resumed:1, workout_paused:1,
    workout_completed:1, sign_in_completed:1, app_error:1,
    activation_step:1, activation_completed:1, catchup_started:1
  };
  var PROPS = {
    view_changed:["view"], onboarding_completed:["started_plan","revisit"],
    workout_started:["kind","week"], workout_resumed:["kind","week"],
    workout_paused:["kind","week","station"],
    workout_completed:["kind","week","minutes"],
    app_error:["type","source","line_bucket"],
    activation_step:["step"], catchup_started:["week"]
  };
  var sessionId="";
  try{ sessionId=crypto.randomUUID(); }
  catch(_){ sessionId=String(Date.now())+"-"+Math.random().toString(36).slice(2); }
  function enabled(){
    try{ return localStorage.getItem("ff_product_health")!=="false" && navigator.doNotTrack!=="1"; }
    catch(_){ return false; }
  }
  function clean(name,raw){
    var out={}; (PROPS[name]||[]).forEach(function(key){
      var value=raw&&raw[key];
      if(typeof value==="boolean") out[key]=value;
      else if(typeof value==="number"&&isFinite(value)) out[key]=Math.max(0,Math.min(999,Math.round(value)));
      else if(typeof value==="string"&&/^[a-z0-9_-]{1,24}$/i.test(value)) out[key]=value;
    }); return out;
  }
  function track(name,props){
    if(!enabled()||!ALLOWED[name]) return;
    try{
      fetch(ENDPOINT,{method:"POST",mode:"cors",keepalive:true,
        headers:{"Content-Type":"application/json"},body:JSON.stringify({
          event:name,session:sessionId,build:String(window.FF_BUILD||"unknown").slice(0,16),
          platform:window.Capacitor?"native":"web",properties:clean(name,props)
        })}).catch(function(){});
    }catch(_){}
  }
  function sourceName(value){
    var p=String(value||"").split(/[?#]/)[0];
    return(p.split("/").pop()||"app").replace(/[^a-z0-9_.-]/gi,"").slice(0,24);
  }
  window.FFHealth={track:track,enabled:enabled,setEnabled:function(on){
    try{localStorage.setItem("ff_product_health",on?"true":"false");}catch(_){}
    if(on) track("app_open");
  }};
  window.addEventListener("error",function(e){track("app_error",{
    type:(e.error&&e.error.name)||"Error",source:sourceName(e.filename),
    line_bucket:Math.floor((Number(e.lineno)||0)/25)*25
  });});
  window.addEventListener("unhandledrejection",function(e){track("app_error",{
    type:(e.reason&&e.reason.name)||"Promise",source:"promise",line_bucket:0
  });});
  window.addEventListener("ff-auth",function(e){if(e.detail&&e.detail.user)track("sign_in_completed");});
  track("app_open");
})();
