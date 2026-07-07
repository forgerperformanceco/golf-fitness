  /* ===================== GLOSSARY — the app speaks FairwayFuel, on demand =====================
     Every invented term (Octane, banked, iron moved, receipts…) can render as a
     tappable span with a dotted underline; tapping opens a one-sentence bottom
     sheet. One shared vocabulary, one place to learn it — the charm stays, the
     riddle goes. The full glossary is reachable from any term sheet and from
     the You tab. ffLoopHtml() (the app's mental model, drawn) also lives here
     so onboarding and the You tab share it. */
  var FF_TERMS={
    octane:   { ic:"⛽", t:"Octane", d:"Your engine score, 0–100. Six pillars — showing up, clubhead speed, strength, power-to-weight, mobility and fuel — blended into one number. E is empty, F is full. Tap any pillar on Stats to see exactly what moves it." },
    banked:   { ic:"✅", t:"Banked", d:"Done and saved. A banked meal, session or round is in your history and already counting toward your trends — nothing else to do." },
    iron:     { ic:"🏋️", t:"Iron moved", d:"Total weight lifted: every set’s weight × reps, added up. The simplest honest measure of how much work you actually did this week." },
    e1rm:     { ic:"📈", t:"e1RM — estimated 1-rep max", d:"The heaviest single rep you could likely lift, estimated from a lighter set (Epley formula). It lets the app compare your strength across different set-and-rep days." },
    season:   { ic:"🗺️", t:"20-week season", d:"Your training campaign, tee to pin: build waves, heavy waves, planned deloads, and a 2-week peak — all aimed at your yardage mission (and your event, if you set one)." },
    wave:     { ic:"🌊", t:"Waves — Build · Heavy · Deload · Peak", d:"Training runs in phases: ~3 weeks building volume, 2 going heavy, then a deload where the gains land. Weeks 19–20 peak you — volume drops, speed stays." },
    deload:   { ic:"🪫", t:"Deload week", d:"A planned easy week — one set less, ~60% loads. It isn’t lost time: recovery is when adaptation lands. Great week to schedule a big round." },
    scorecard:{ ic:"🗒️", t:"Sunday Scorecard", d:"Your week as a golf card — six holes: sessions, iron moved, speed test, weigh-ins, mobility and fuel days. Close it out on Sundays; share it when it’s good." },
    receipts: { ic:"🧾", t:"Receipts", d:"Proof from your own data that the training moves the ball — scoring trend, drives near vs far from gym days, deload-week distance. They appear once ~5 rounds are banked." },
    carry:    { ic:"⛳", t:"Driver carry", d:"How far your drive flies in the air, roll not included — the app’s headline distance. Log it from real rounds or a launch monitor." },
    speedtest:{ ic:"🎯", t:"Speed Test Day", d:"Every 2 weeks: warm up, take 3 max-intent 7-iron swings, keep the best. Same club, same rule every time, so the trend is honest. Roughly +1 mph ≈ +2 yards of carry." },
    p2w:      { ic:"⚖️", t:"Power-to-weight", d:"Clubhead speed relative to bodyweight. Mass only helps when it swings faster — this pillar keeps a bulk honest." },
    tdee:     { ic:"🔥", t:"TDEE — maintenance calories", d:"Total Daily Energy Expenditure: the calories your body burns in a normal day (BMR × activity). Eat above it and you gain, below it and you lose — your goal target is TDEE plus or minus the right margin." }
  };
  function ffTerm(key, label){
    var T=FF_TERMS[key]; if(!T) return (label||key);
    return '<span class="ff-term" data-term="'+key+'" role="button" tabindex="0">'+(label||T.t)+'</span>';
  }
  function ffTermSheet(){
    var m=$("termSheet");
    if(!m){
      m=document.createElement("div"); m.id="termSheet"; m.className="qsheet"; m.hidden=true;
      document.body.appendChild(m);
      m.addEventListener("click", function(e){
        if(e.target===m){ m.hidden=true; document.body.style.overflow=""; }
      });
    }
    return m;
  }
  function openTerm(key){
    var T=FF_TERMS[key]; if(!T) return;
    var m=ffTermSheet();
    m.innerHTML='<div class="qsheet-card"><div class="qsheet-grab"></div>'+
      '<div class="term-one"><span class="term-ic">'+T.ic+'</span><div class="term-tx">'+
      '<div class="term-t">'+T.t+'</div><div class="term-d">'+T.d+'</div></div></div>'+
      '<button type="button" class="term-all" data-termall="1">📖 See all FairwayFuel terms</button></div>';
    m.hidden=false; document.body.style.overflow="hidden";
  }
  function openGlossary(){
    var m=ffTermSheet();
    m.innerHTML='<div class="qsheet-card"><div class="qsheet-grab"></div>'+
      '<div class="qsheet-h">📖 The FairwayFuel dictionary</div>'+
      Object.keys(FF_TERMS).map(function(k){
        var T=FF_TERMS[k];
        return '<div class="term-one sm"><span class="term-ic">'+T.ic+'</span><div class="term-tx">'+
          '<div class="term-t">'+T.t+'</div><div class="term-d">'+T.d+'</div></div></div>';
      }).join("")+'</div>';
    m.hidden=false; document.body.style.overflow="hidden";
  }
  // Registered in module 009 → runs before every later document listener, so
  // stopImmediatePropagation keeps a term tap from also toggling whatever
  // interactive parent (Stats fold header, scorecard row) it happens to sit in.
  document.addEventListener("click", function(e){
    var t=e.target.closest("[data-term]");
    if(t){ e.preventDefault(); e.stopImmediatePropagation(); openTerm(t.getAttribute("data-term")); return; }
    if(e.target.closest("[data-termall]")){ e.stopImmediatePropagation(); openGlossary(); return; }
    if(e.target.closest("[data-ffloop]")){ e.stopImmediatePropagation(); openLoop(); return; }
  });

  /* ----- The loop: the app's whole mental model on one screen ----- */
  function ffLoopHtml(){
    var steps=[
      ["⚖️","Weigh in","30 seconds, every morning"],
      ["🏋️","Train","the guided session, 4–5× a week"],
      ["🍽️","Eat to your targets","tap meals off as you go"],
      ["⛳","Play & log rounds","where the proof shows up"],
      ["📈","Octane climbs","and the yards follow"]
    ];
    return '<div class="ff-loop">'+steps.map(function(s,i){
      return '<div class="ffl-step"><span class="ffl-ic">'+s[0]+'</span>'+
        '<span class="ffl-tx"><b>'+s[1]+'</b><span>'+s[2]+'</span></span></div>'+
        (i<steps.length-1?'<div class="ffl-arr">↓</div>':'');
    }).join("")+'<div class="ffl-back">↻ repeat — that’s the whole system</div></div>';
  }
  function openLoop(){
    var m=ffTermSheet();
    m.innerHTML='<div class="qsheet-card"><div class="qsheet-grab"></div>'+
      '<div class="qsheet-h">🔁 How FairwayFuel works</div>'+
      '<p class="term-lead">One loop, repeated. Everything in the app either feeds it or proves it’s working.</p>'+
      ffLoopHtml()+
      '<button type="button" class="term-all" data-termall="1">📖 See what the terms mean</button></div>';
    m.hidden=false; document.body.style.overflow="hidden";
  }
