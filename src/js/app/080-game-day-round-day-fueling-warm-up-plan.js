  /* ===================== GAME DAY — round-day fueling + warm-up plan =====================
     Golf is a 4–5 hr endurance event. Given a tee time, build a timed plan: pre-round
     meal, top-off, a golf-specific first-tee warm-up (mobility + speed primer), on-course
     fueling cadence, the turn snack, and post-round refuel. This is where the training
     and the nutrition moat meet the actual round. */
  function gdState(){ var g=lsGet("ff_gameday", null); return g || { teeTime:"09:00", holes:18, transport:"walk" }; }
  function gdSave(g){ lsSet("ff_gameday", g); }
  function parseHM(s){ var m=/^(\d{1,2}):(\d{2})$/.exec(s||""); return m ? (+m[1])*60+(+m[2]) : null; }
  function fmtMin(mins){ mins=((Math.round(mins)%1440)+1440)%1440; var h=Math.floor(mins/60), m=mins%60, ap=h>=12?"PM":"AM", h12=h%12||12; return h12+":"+(m<10?"0":"")+m+" "+ap; }
  function gdCard(time, ic, title, detail, extra){
    return '<div class="gd-card"><div class="gd-time">'+time+'</div><div class="gd-cbody">'+
      '<div class="gd-ctitle">'+ic+' '+title+'</div><div class="gd-cdetail">'+detail+'</div>'+(extra||"")+'</div></div>';
  }
  function renderGameDay(){
    var el=$("gamedayBody"); if(!el) return;
    var g=gdState(), T=parseHM(g.teeTime);
    var dur = g.holes===9 ? (g.transport==="walk"?135:120) : (g.transport==="walk"?270:240);
    function seg(cur,val,lbl,attr){ return '<button class="gd-seg-btn'+(String(cur)===String(val)?" on":"")+'" data-'+attr+'="'+val+'">'+lbl+'</button>'; }
    var html=''+
      '<div class="gd-top"><button class="gd-back" data-gdback="1">‹ Home</button></div>'+
      '<div class="gd-hero"><div class="gd-hero-t">⛳ Game Day</div>'+
        '<div class="gd-hero-sub">Golf is a <b>4–5 hour endurance event.</b> Most golfers fade on the back nine from low fuel and dehydration — not lack of skill. Plan the round and finish as strong as you start.</div></div>'+
      '<div class="gd-controls">'+
        '<label class="gd-field"><span>Tee time</span><input type="time" id="gdTee" value="'+escAttr(g.teeTime||"")+'" /></label>'+
        '<div class="gd-field"><span>Holes</span><div class="gd-seg">'+seg(g.holes,9,"9","gdholes")+seg(g.holes,18,"18","gdholes")+'</div></div>'+
        '<div class="gd-field"><span>Getting around</span><div class="gd-seg">'+seg(g.transport,"walk","🚶 Walk","gdtransport")+seg(g.transport,"ride","🛺 Ride","gdtransport")+'</div></div>'+
      '</div>';
    if(T==null){ el.innerHTML=html+'<div class="gd-empty">Set your tee time above to build your timed plan.</div>'; return; }
    html+='<div class="gd-timeline">';
    html+=gdCard(fmtMin(T-150),"🍳","Pre-round meal","A real meal — carbs + lean protein, light on fat. Top off glycogen: oats + eggs + fruit, or rice + chicken. Drink <b>16–20 oz water</b>.");
    html+=gdCard(fmtMin(T-40),"🍌","Top-off snack","Fast carbs + water — a banana, a few dates, or a Rice Krispies treat (~30g carbs). Sip <b>8–12 oz</b>.");
    var wu=["Leg swings|×10/side","Open-book T-spine|×8/side","Trunk rotations|×10/side","Hip 90/90 switches|×6/side","Band or club rotations|×10/side","Build-up swings|15 · ramp 50→100%","Overspeed primer swings|5–8 at MAX"];
    var wuHtml='<div class="gd-warm">'+wu.map(function(x){ var p=x.split("|"); return '<button class="wu-row" type="button" data-wu="1"><span class="wu-move">'+p[0]+'</span><span class="wu-dose">'+p[1]+'</span></button>'; }).join("")+'</div>';
    html+=gdCard(fmtMin(T-20),"🔥","First-tee warm-up","~15 min — mobilize, then prime your speed so the opening drive isn’t cold. Tap to check off:", wuHtml);
    html+=gdCard(fmtMin(T),"⛳","Tee off — hole 1","You’re fueled and warm. Game on.");
    html+=gdCard("During","🥤","On the course","<b>Every ~3 holes:</b> a few sips of water + a bite of fast carb (dates, fruit, chews) — don’t wait until you’re hungry or thirsty.<br><b>Hydration:</b> ~1 bottle (16–20 oz) every 6 holes; more when it’s hot — add electrolytes.");
    html+=gdCard(fmtMin(T+dur/2),"🥪","At the turn (hole "+Math.round(g.holes/2)+")","A real snack — ½ turkey sandwich, jerky + fruit, or a protein bar (~20–30g carbs + protein). This is what keeps your "+(g.holes===9?"finish":"back nine")+" strong.");
    html+=gdCard(fmtMin(T+dur),"🏁","Finish","Strong all "+g.holes+". Nice.");
    html+=gdCard(fmtMin(T+dur+30),"💪","Refuel + log","Within ~45 min: protein + carbs (your post-workout meal works great). Then log your round — and a 7-iron speed test if you hit a launch monitor.");
    html+='</div>';
    html+='<div class="gd-pack"><div class="gd-pack-h">🎒 Pack list</div><ul>'+
      '<li>'+(g.holes===18?"2–3":"1–2")+' bottles of water (+ electrolytes if hot)</li>'+
      '<li>Fast carbs: banana, dates, fruit chews/gels, a Rice Krispies treat</li>'+
      '<li>Turn snack: ½ sandwich, jerky, or a protein bar</li></ul></div>';
    el.innerHTML=html;
  }

  /* ----- Account ----- */
  /* ----- Workout reminders (native app only — Capacitor local notifications) -----
     No backend: on every app open (and on toggle) we cancel + reschedule the next
     7 days at the user's training-slot hour, with day-aware copy (train vs recover). */
  function ffNotifPlugin(){
    try{ return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) || null; }
    catch(e){ return null; }
  }
  function ffNotifOn(){ return !!lsGet("ff_notif", false); }
  var FF_SLOT_HOUR = { morning:7, midday:12, afternoon:16, evening:19 };
  async function ffNotifReschedule(){
    var LN=ffNotifPlugin(); if(!LN) return;
    try{
      var pend=await LN.getPending();
      if(pend && pend.notifications && pend.notifications.length) await LN.cancel({ notifications: pend.notifications.map(function(n){ return { id:n.id }; }) });
    }catch(e){}
    if(!ffNotifOn()) return;
    var hour = FF_SLOT_HOUR[state.workout] || 17;
    var dop = dayOfPlan(), wk = curWeek(), slots = stripDays();
    if(dop==null) return;                               // plan not started yet
    var list=[], now=Date.now();
    for(var o=0;o<7;o++){
      var d=new Date(); d.setDate(d.getDate()+o); d.setHours(hour,0,0,0);
      if(d.getTime()<=now) continue;                    // today's slot already passed
      var day=slots[(dop-1+o)%7]||{};
      var rest = day.type==="rest";
      list.push({ id:100+o,
        title: rest ? "Recovery day 🌱" : "Time to train ⛳",
        body: rest ? "Walk, mobility, foam roll — growth happens today."
                   : ((day.name||"Your session").replace(/^Day \d+ — /,"")+" · Week "+wk+" — your yards are waiting."),
        schedule:{ at:d, allowWhileIdle:true } });
    }
    if(list.length){ try{ await LN.schedule({ notifications:list }); }catch(e){} }
  }
  async function ffNotifToggle(){
    var LN=ffNotifPlugin(); if(!LN) return false;
    if(ffNotifOn()){ lsSet("ff_notif", false); await ffNotifReschedule(); return false; }
    try{
      var p=await LN.requestPermissions();
      if(!p || p.display!=="granted"){ alert("Notifications are blocked — allow them in your phone's settings for FairwayFuel."); return false; }
    }catch(e){ return false; }
    lsSet("ff_notif", true); await ffNotifReschedule(); return true;
  }
  // Keep the 7-day window fresh on every launch of the installed app.
  if(ffNotifPlugin()){ setTimeout(function(){ try{ ffNotifReschedule(); }catch(e){} }, 2500); }

  /* ----- Web reminders (browser / installed PWA) -----
     The web can't schedule notifications while fully closed without a push server,
     so this is best-effort local: whenever the app is open (foreground OR a
     background tab / installed window), fire today's training-slot reminder once
     the hour passes — checked on load, on show, and on a 15-min tick. True server
     push (VAPID + a scheduled Edge Function) is the Phase-3 upgrade; the sw.js
     push handler is already in place for it. */
  function ffWebNotifSupported(){ return !ffNotifPlugin() && !window.Capacitor && ("Notification" in window) && ("serviceWorker" in navigator); }
  function ffWebNotifToggle(){
    if(!ffWebNotifSupported()) return Promise.resolve(false);
    if(ffNotifOn()){ lsSet("ff_notif", false); return Promise.resolve(false); }
    return Promise.resolve().then(function(){ return Notification.requestPermission(); }).then(function(p){
      if(p!=="granted"){ alert("Notifications are blocked — allow them for this site in your browser settings."); return false; }
      lsSet("ff_notif", true); ffWebNotifCheck(); return true;
    }).catch(function(){ return false; });
  }
  function ffWebNotifCheck(){
    try{
      if(!ffWebNotifSupported() || !ffNotifOn() || Notification.permission!=="granted") return;
      if(planStart()==null) return;
      var hour=FF_SLOT_HOUR[state.workout]||17;
      if(new Date().getHours()<hour) return;                 // slot not reached yet today
      if(lsGet("ff_notif_lastday","")===todayStr()) return;  // already nudged today
      lsSet("ff_notif_lastday", todayStr());
      var dop=dayOfPlan(), day=(stripDays()[(dop||1)-1])||{}, rest=day.type==="rest";
      var title = rest ? "Recovery day 🌱" : "Time to train ⛳";
      var bodyTxt = rest ? "Walk, mobility, foam roll — growth happens today."
        : ((day.name||"Your session").replace(/^Day \d+ — /,"")+" · Week "+curWeek()+" — your yards are waiting.");
      navigator.serviceWorker.getRegistration().then(function(reg){
        if(reg && reg.showNotification) reg.showNotification(title, { body:bodyTxt, icon:"icon-192.png", badge:"icon-192.png", tag:"ff-daily" });
        else new Notification(title, { body:bodyTxt, icon:"icon-192.png" });
      });
    }catch(e){}
  }
  /* ----- Appearance: auto (follows the phone) / light / dark -----
     Stored per-device in ff_theme (NOT synced — theme is a device preference).
     The forced value sets data-theme on <html>, which the generated dark block
     targets; a tiny head script applies it pre-paint to avoid a flash. */
  function ffTheme(){ var t=lsGet("ff_theme","auto"); return (t==="light"||t==="dark")?t:"auto"; }
  function ffApplyTheme(v){
    if(v!=="light" && v!=="dark") v="auto";
    lsSet("ff_theme", v);
    try{
      if(v==="auto") document.documentElement.removeAttribute("data-theme");
      else document.documentElement.setAttribute("data-theme", v);
    }catch(e){}
  }

  if(ffWebNotifSupported()){
    setTimeout(function(){ try{ ffWebNotifCheck(); }catch(e){} }, 4000);
    setInterval(function(){ try{ ffWebNotifCheck(); }catch(e){} }, 15*60*1000);
    document.addEventListener("visibilitychange", function(){ if(!document.hidden){ try{ ffWebNotifCheck(); }catch(e){} } });
  }

  function acctRow(k,v){ return '<div class="acct-li"><span>'+k+'</span><b>'+v+'</b></div>'; }
  // Reflect an Account-tab change onto the matching segmented control elsewhere
  // (the calculator / Train fold) so the two stay in sync without a reload.
  function ffSyncSeg(id, attr, val){ var s=$(id); if(!s) return;
    Array.prototype.forEach.call(s.querySelectorAll("button"), function(b){ b.classList.toggle("active", b.getAttribute(attr)===val); }); }
  // The Fuel tab shows training time read-only (it's edited in Account) — keep that
  // reference in sync with the single source of truth, state.workout.
  var FF_WK_LABEL = { morning:"Morning", midday:"Midday", afternoon:"Afternoon", evening:"Evening" };
  function ffRefreshCalcTrainTime(){ var el=$("calcTrainTime");
    if(el) el.textContent = FF_WK_LABEL[(typeof state!=="undefined" && state.workout) || "morning"] || "—"; }
  function renderAccount(){
    var el=$("accountBody"); if(!el) return;
    var user = window.FF && window.FF.user;
    var html='';
    if(user){
      var email=user.email||'your account', initial=(email[0]||'⛳').toUpperCase();
      html+='<div class="acct-card hero"><div class="acct-id"><div class="acct-ava">'+initial+'</div>'+
        '<div class="acct-idtext"><div class="acct-email">'+email+'</div>'+
        '<div class="acct-synced">☁ Synced across your devices</div></div></div>'+
        '<button class="acct-btn ghost" id="acctSignOut">Sign out</button></div>';
    } else {
      html+='<div class="acct-card hero center"><div class="acct-bigico">☁</div>'+
        '<h3>Save &amp; sync your progress</h3>'+
        '<p>One-tap email login — no password. Your calculator, workout log and Octane follow you across devices.</p>'+
        '<button class="acct-btn" id="acctSignIn">Sign in / Create account</button></div>';
    }
    html+='<div class="acct-card"><div class="acct-head">⛳ Full access — unlocked</div>'+
      '<p class="acct-p">You’ve got everything: AI coaching, the full training plan, macro tuning, progress tracking and the leaderboard. No paywall.</p>'+
      '<div class="acct-plan">Plan: <b>Full access</b> · free</div></div>';
    // Install-to-home-screen — only when not already running as an installed app.
    if(!ffStandalone()){
      if(ffIsIOS()){
        html+='<div class="acct-card"><div class="acct-head">📲 Install the app</div>'+
          '<p class="acct-p">Get the full-screen app: tap the <b>Share</b> icon (□ with ↑) in Safari, then <b>“Add to Home Screen.”</b> It opens like a native app and works offline.</p></div>';
      } else if(ffDeferredPrompt){
        html+='<div class="acct-card"><div class="acct-head">📲 Install the app</div>'+
          '<p class="acct-p">Add FairwayFuel to your home screen — full-screen, offline, one tap away.</p>'+
          '<button class="acct-btn" id="acctInstall">Install app</button></div>';
      } else {
        html+='<div class="acct-card"><div class="acct-head">📲 Install the app</div>'+
          '<p class="acct-p">In your browser menu, tap <b>“Install app”</b> / <b>“Add to Home Screen”</b> to run FairwayFuel full-screen and offline.</p></div>';
      }
    }
    if(ffNotifPlugin()){
      var non=ffNotifOn();
      html+='<div class="acct-card"><div class="acct-head">🔔 Workout reminders</div>'+
        '<p class="acct-p">A daily nudge at your training time — the session on training days, recovery on rest days. No account needed; it all happens on your phone.</p>'+
        '<button class="acct-btn'+(non?' ghost':'')+'" id="acctNotif">'+(non?"Reminders on — tap to turn off":"Turn on reminders")+'</button></div>';
    } else if(ffWebNotifSupported()){
      var nonW=ffNotifOn() && Notification.permission==="granted";
      html+='<div class="acct-card"><div class="acct-head">🔔 Workout reminders</div>'+
        '<p class="acct-p">A daily nudge at your training time — the session on training days, recovery on rest days. On the web it fires while FairwayFuel is open in a tab or installed; for bulletproof daily reminders, install the app.</p>'+
        '<button class="acct-btn'+(nonW?' ghost':'')+'" id="acctNotifWeb">'+(nonW?"Reminders on — tap to turn off":"Turn on reminders")+'</button></div>';
    }
    var curTheme=ffTheme();
    html+='<div class="acct-card"><div class="acct-head">🌗 Appearance</div>'+
      '<p class="acct-p">Auto follows your phone’s light/dark setting.</p>'+
      '<div class="seg" id="acctTheme">'+[["auto","Auto"],["light","Light"],["dark","Dark"]].map(function(o){
        return '<button type="button" data-th="'+o[0]+'" class="'+(curTheme===o[0]?'active':'')+'">'+o[1]+'</button>'; }).join("")+'</div></div>';
    var t=lsGet("ff_targets",null), prof=lsGet("fairwayfuel",null);
    if(prof || t){
      html+='<div class="acct-card"><div class="acct-head">Your numbers</div><div class="acct-list">'+
        acctRow('Goal', t?t.goal:((prof&&prof.goal)||'—'))+
        acctRow('Bodyweight', (prof&&prof.weight)?prof.weight+' lb':'—')+
        acctRow('Daily target', t?t.kcal+' kcal':'—')+
        '</div><button class="acct-btn ghost" id="acctEdit">Edit my numbers</button>'+
        '<button class="acct-btn ghost" id="acctSetup">↻ Re-run guided setup</button></div>';
    }
    // Training setup — the three golf-plan levers, all tap-to-change, in one place
    // (previously scattered: mission here, days in the Train fold, time in the calculator).
    var gy=goalYds();
    var curFreq=(typeof planState!=="undefined" && planState.freq)||((prof&&prof.freq)||4);
    var curWk=(typeof state!=="undefined" && state.workout)||((prof&&prof.workout)||"morning");
    html+='<div class="acct-card"><div class="acct-head">🎯 Your training setup</div>'+
      '<div class="acct-set"><div class="acct-set-lbl">Distance mission <small>yards to add in 20 weeks</small></div>'+
        '<div class="goal-chips" id="acctGoalChips">'+[5,10,15,20,25,30].map(function(y){
          return '<button type="button" data-gy="'+y+'" class="'+(gy===y?'on':'')+'">+'+y+'</button>'; }).join("")+'</div></div>'+
      '<div class="acct-set"><div class="acct-set-lbl">Training days / week <small>re-plans your week</small></div>'+
        '<div class="seg" id="acctFreq">'+[4,5].map(function(f){
          return '<button type="button" data-af="'+f+'" class="'+(curFreq===f?'active':'')+'">'+f+' days</button>'; }).join("")+'</div></div>'+
      '<div class="acct-set"><div class="acct-set-lbl">Training time <small>sets meal timing + reminders</small></div>'+
        '<div class="seg" id="acctWk">'+[["morning","Morning"],["midday","Midday"],["afternoon","Afternoon"],["evening","Evening"]].map(function(o){
          return '<button type="button" data-aw="'+o[0]+'" class="'+(curWk===o[0]?'active':'')+'">'+o[1]+'</button>'; }).join("")+'</div></div>'+
      (function(){
        var ev=eventInfo();
        return '<div class="acct-set"><div class="acct-set-lbl">🏆 Big event <small>the taper re-anchors to peak for it</small></div>'+
          '<div class="ev-grid">'+
            '<label class="ev-f"><span>Date</span><input type="date" id="acctEvDate" value="'+escAttr(ev?ev.date:"")+'" /></label>'+
            '<label class="ev-f"><span>Name <em>(optional)</em></span><input type="text" id="acctEvName" placeholder="Club champs, member-guest…" maxlength="40" value="'+escAttr(ev?ev.name:"")+'" /></label>'+
          '</div>'+
          (ev && ev.week && !ev.past ? '<div class="ev-note">🏆 Lands in <b>week '+ev.week+'</b> — weeks <b>'+(ev.week-1)+'–'+ev.week+'</b> become your peak, week '+(ev.week+1)+' recovers.</div>'
           : (ev && ev.past ? '<div class="ev-note">That date has passed — set your next one, or clear it.</div>'
           : (ev ? '<div class="ev-note">Outside the current 20-week block — the base plan cadence applies.</div>'
                 : '<div class="ev-note">Set a date and the plan tapers you into it — volume drops, intensity holds, you arrive fresh and fast.</div>')))+
          (ev?'<button type="button" class="ev-clear" id="acctEvClear">✕ Clear event</button>':'')+
          '</div>';
      })()+
      '</div>';
    var lmA=(typeof lastMob==="function")?lastMob():null;
    html+='<div class="acct-card"><div class="acct-head">🧭 Mobility screen</div>'+
      '<p class="acct-p">'+(lmA
        ? ('Last screen: <b>'+lmA.score+'/100</b> · '+lmA.date+'. Re-screen every 4 weeks — it keeps the muscle you’re adding from costing you rotation.')
        : 'A 3-move self-check (~3 min, no gear): trunk rotation, hips, deep squat. It becomes the 5th pillar of your Octane and tunes your warm-ups to what’s tight.')+'</p>'+
      '<button class="acct-btn ghost" data-mobscreen="1">'+(lmA?'↻ Re-run the screen':'Take the screen')+'</button></div>';
    html+='<div class="acct-card"><div class="acct-head">🍽️ Your favorite foods</div>'+
      '<p class="acct-p">Tell us what you actually eat and your meal ideas + day plans get built around it. Set it once, tweak anytime.</p>'+
      '<button class="acct-btn ghost" id="acctFoods">Edit my foods</button></div>';
    html+='<div class="acct-card"><div class="acct-head">Your training plan</div>'+
      '<p class="acct-p">Start over — clears your plan start date and logged workouts so the plan resets to week 1. Your bodyweight &amp; 7-iron history and your calculator stay put.</p>'+
      '<button class="acct-btn danger" id="acctResetPlan">↺ Reset plan</button></div>';
    html+='<div class="acct-card"><div class="acct-head">Show me around</div>'+
      '<p class="acct-p">New to the app or want a refresher? Replay the one-tap tips that explain what each tab does.</p>'+
      '<button class="acct-btn ghost" id="acctReplayTips">↻ Replay the tips</button></div>';
    if(user){
      html+='<div class="acct-card"><div class="acct-head">⚠️ Delete account</div>'+
        '<p class="acct-p">Permanently delete your account and <b>all</b> synced data — workouts, bodyweight &amp; 7-iron history, Octane and any leaderboard entry. This can’t be undone.</p>'+
        '<button class="acct-btn danger" id="acctDelete">Delete my account</button></div>';
    }
    html+='<div class="acct-links">'+
      '<a href="mailto:bobbydenisclay@gmail.com?subject=FairwayFuel%20feedback">✉ Send feedback</a>'+
      '<span>·</span>'+
      '<a href="privacy.html">Privacy</a></div>';
    html+='<div class="acct-foot">FairwayFuel · installs &amp; works offline<br>Evidence-based starting points — not medical advice.</div>';
    el.innerHTML=html;
    var rt=$("acctReplayTips"); if(rt) rt.onclick=function(){
      lsSet("ff_tips_seen", []); try{ persist(); }catch(e){}
      setView("dash");
    };
    var rp=$("acctResetPlan"); if(rp) rp.onclick=function(){
      if(confirm("Reset your training plan? This clears your start date and logged workouts so you can start fresh. (Your bodyweight & 7-iron history and your calculator stay.)")) resetPlanFull();
    };
    var si=$("acctSignIn"); if(si) si.onclick=function(){ if(window.FF&&window.FF.signIn) window.FF.signIn(); else alert("Sign-in needs an internet connection."); };
    var so=$("acctSignOut"); if(so) so.onclick=function(){ if(window.FF&&window.FF.signOut) window.FF.signOut(); };
    var da=$("acctDelete"); if(da) da.onclick=function(){
      if(!(window.FF&&window.FF.deleteAccount)){ alert("Deleting your account needs an internet connection. Reconnect and try again."); return; }
      if(!confirm("Permanently delete your FairwayFuel account and ALL your data — workouts, bodyweight & 7-iron history, Octane and any leaderboard entry?\n\nThis cannot be undone.")) return;
      if(!confirm("Are you absolutely sure? There is no way to recover this account or its data.")) return;
      da.disabled=true; da.textContent="Deleting…";
      window.FF.deleteAccount().then(function(r){
        if(r&&r.ok){ alert("Your account and all your data have been permanently deleted."); location.reload(); }
        else { da.disabled=false; da.textContent="Delete my account";
          alert("Couldn’t delete your account ("+((r&&r.error)||"unknown error")+"). Please try again, or email us and we’ll remove it for you."); }
      });
    };
    var ed=$("acctEdit"); if(ed) ed.onclick=function(){ setView("calc"); };
    var gc=$("acctGoalChips"); if(gc) gc.onclick=function(ev){
      var b=ev.target.closest("[data-gy]"); if(!b) return;
      var v=parseInt(b.getAttribute("data-gy"),10)||15;
      lsSet("ff_goalyds", v); try{ window.dispatchEvent(new Event("ff-data-changed")); }catch(_){}
      renderAccount(); try{ renderDash(); }catch(_){}
    };
    var afq=$("acctFreq"); if(afq) afq.onclick=function(ev){
      var b=ev.target.closest("[data-af]"); if(!b) return;
      var v=parseInt(b.getAttribute("data-af"),10)||4;
      if(typeof planState!=="undefined") planState.freq=v;
      ffSyncSeg("freqSeg","data-freq",String(v));      // keep the Train-tab fold in sync
      try{ persist(); }catch(_){}
      try{ renderPhase(); }catch(_){}
      try{ ffNotifReschedule(); }catch(_){}             // reminders follow the new plan now
      renderAccount();
    };
    var awk=$("acctWk"); if(awk) awk.onclick=function(ev){
      var b=ev.target.closest("[data-aw]"); if(!b) return;
      var v=b.getAttribute("data-aw");
      if(typeof state!=="undefined") state.workout=v;
      ffSyncSeg("workoutSeg","data-workout",v);          // keep any legacy control in sync
      try{ ffRefreshCalcTrainTime(); }catch(_){}          // update the Fuel-tab reference
      try{ persist(); }catch(_){}
      try{ ffNotifReschedule(); }catch(_){}              // reminder hour follows training time
      renderAccount();
    };
    var su=$("acctSetup"); if(su) su.onclick=function(){ startOnboarding(true); };
    var af=$("acctFoods"); if(af) af.onclick=function(){ openFoodPrefs(); };
    var ai=$("acctInstall"); if(ai) ai.onclick=function(){ if(!ffPromptInstall()) alert("Use your browser menu → “Install app” / “Add to Home Screen.”"); };
    var nb=$("acctNotif"); if(nb) nb.onclick=function(){ nb.disabled=true; ffNotifToggle().then(function(){ renderAccount(); }); };
    var nbw=$("acctNotifWeb"); if(nbw) nbw.onclick=function(){ nbw.disabled=true; ffWebNotifToggle().then(function(){ renderAccount(); }); };
    function evSave(){
      var d=($("acctEvDate")||{}).value||"", n=($("acctEvName")||{}).value||"";
      if(!d){ try{ localStorage.removeItem("ff_event"); }catch(_){} }
      else lsSet("ff_event", { date:d, name:n.trim() });
      try{ window.dispatchEvent(new Event("ff-data-changed")); }catch(_){}
      renderAccount(); try{ renderPhase(); }catch(_){} try{ renderDash(); }catch(_){}
    }
    var evd=$("acctEvDate"); if(evd) evd.onchange=evSave;
    var evn=$("acctEvName"); if(evn) evn.onchange=evSave;
    var evc=$("acctEvClear"); if(evc) evc.onclick=function(){ try{ localStorage.removeItem("ff_event"); }catch(_){}
      try{ window.dispatchEvent(new Event("ff-data-changed")); }catch(_){}
      renderAccount(); try{ renderPhase(); }catch(_){} try{ renderDash(); }catch(_){} };
    var th=$("acctTheme"); if(th) th.onclick=function(ev){
      var b=ev.target.closest("[data-th]"); if(!b) return;
      ffApplyTheme(b.getAttribute("data-th"));
      renderAccount();
    };
  }

  /* ----- Progress (bodyweight + clubhead speed) ----- */
  function sparkline(vals){
    var pts=vals.filter(function(v){ return v!=null && !isNaN(v); });
    if(pts.length<2) return "";
    var w=240,h=42,mn=Math.min.apply(null,pts),mx=Math.max.apply(null,pts),rng=(mx-mn)||1,step=w/(pts.length-1);
    var d=pts.map(function(v,i){ return (i?"L":"M")+(i*step).toFixed(1)+","+(h-3-((v-mn)/rng)*(h-9)).toFixed(1); }).join(" ");
    return '<svg class="spark" width="100%" height="42" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none">'+
      '<path d="'+d+'" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
