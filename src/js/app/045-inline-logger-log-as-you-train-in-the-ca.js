  /* ===================== INLINE LOGGER (log as you train, in the card) ===================== */
  var ilog=null, restEnd=0, restTimer=null, openWhy={};
  function isBarbell(n){ return /Back Squat|Front Squat|Barbell|Bench Press|Deadlift|Overhead Press|Romanian|Hip Thrust|Pendlay|Bent.?Over Row|Hang Power Clean/i.test(n) && !/\bDB\b|Dumbbell|Cable|Machine|Smith|Band/i.test(n); }
  function platesFor(total){
    var per=(parseFloat(total)-45)/2; if(!(per>0)) return parseFloat(total)===45?"just the bar":"";
    var plates=[45,35,25,10,5,2.5], out=[], rem=per;
    plates.forEach(function(pl){ while(rem>=pl-0.01){ out.push(pl); rem-=pl; } });
    return rem>0.1 ? "" : out.join(" + ")+" /side";
  }
  // Rest defaults: 2 min between sets of the same lift, 3 min before a different lift.
  var REST_BETWEEN_SETS = 120, REST_BETWEEN_LIFTS = 180;
  function ilogBodyHtml(){
    var s=ilog.sess, week=ilog.week, day=ilog.day, last=lastSessionFor(day, week), html="", tot=0, done=0;
    var wv=waveFor(week);
    s.ex.forEach(function(x, xi){
      var lx=null; if(last) last.ex.forEach(function(e){ if(e.name===x.name) lx=e; });
      var ready=progressReady(lx, x.target);
      var hasLastW=!!(lx && lx.sets.some(function(st){ return st.w; }));
      var setsHtml="";
      x.sets.forEach(function(st, si){
        tot++; if(st.done) done++;
        var pw=(lx&&lx.sets[si]&&lx.sets[si].w)?lx.sets[si].w:null, pr=(lx&&lx.sets[si]&&lx.sets[si].r)?lx.sets[si].r:null;
        var prev = pw ? (pw+' × '+(pr||'–')) : '–';
        // Prescribed load leads: the weight placeholder shows what to lift TODAY
        // (deload ~60%, progression-ready last + one jump); PREVIOUS keeps the raw history.
        var sug=prescribeW(pw, x.name, ready, wv);
        var pm=(isBarbell(x.name)&&st.w)?platesFor(st.w):"";
        setsHtml+='<div class="il-set'+(st.done?" done":"")+'">'+
          '<span class="il-sn">'+(si+1)+'</span>'+
          '<button class="il-prev" data-x="'+xi+'" data-s="'+si+'" data-prevfill="1"'+(pw?'':' disabled')+'>'+prev+'</button>'+
          '<input class="il-in" type="number" inputmode="decimal" placeholder="'+escAttr(sug!=null?sug:(pw||""))+'" value="'+(st.w||"")+'" data-x="'+xi+'" data-s="'+si+'" data-f="w"/>'+
          '<input class="il-in" type="number" inputmode="numeric" placeholder="'+escAttr(pr||"")+'" value="'+(st.r||"")+'" data-x="'+xi+'" data-s="'+si+'" data-f="r"/>'+
          '<button class="il-check'+(st.done?" on":"")+'" data-x="'+xi+'" data-s="'+si+'" data-idone="1" aria-label="set done">✓</button></div>'+
          (pm?'<div class="il-plates">🏋️ '+pm+'</div>':'');
      });
      var rx = (wv==="deload" && hasLastW)
        ? ' · <button class="il-up" data-deloadfill="'+xi+'" title="Fill every set with ~60% of last time’s top weight">🪫 fill deload loads — tap</button>'
        : (ready ? ' · <button class="il-up" data-bumpfill="'+xi+'" title="Fill last time’s weight + '+incNum(x.name)+' lb">↑ add '+incNum(x.name)+' lb — tap to fill</button>' : '');
      html+='<div class="il-ex">'+
        '<div class="il-exhead"><span class="il-name">'+purposeFor(x.name)+' '+x.name+'</span>'+
          '<div class="il-acts">'+
            '<button class="il-why'+(openWhy[xi]?" on":"")+'" data-why="'+xi+'" aria-label="Why this lift builds speed">🛈 Why</button>'+
            '<button class="il-why" data-exhist="'+escAttr(x.name)+'" aria-label="Lift history">📊</button>'+
            '<button class="il-swap" data-swapx="'+escAttr(x.orig||x.name)+'" data-swapcur="'+escAttr(x.name)+'" data-swapix="'+xi+'" title="Swap this lift">⇄ Swap</button>'+
          '</div></div>'+
        '<div class="il-sub">'+x.target+rx+'</div>'+
        '<div class="il-why-box"'+(openWhy[xi]?"":" hidden")+'>'+whyHtml(x.name)+'</div>'+
        '<div class="il-cols"><span>SET</span><span>PREVIOUS</span><span>LBS</span><span>REPS</span><span></span></div>'+
        setsHtml+
        '<button class="il-add" data-x="'+xi+'" data-iadd="1">＋ Add set</button></div>';
    });
    html += '<button class="il-addlift" data-addlift="1">＋ Add a lift to today</button>';
    var pct = tot? Math.round(done/tot*100):0;
    return '<div class="il-prog"><div class="il-progbar" style="width:'+pct+'%"></div></div>'+html;
  }
  // Grounded "why this lift" micro-coaching — ties each movement pattern to
  // clubhead speed using the same framework as the reference docs (ground force,
  // hip drive, rotation/anti-rotation, lead-leg brace, deceleration). Curated &
  // offline — no AI, so it's instant and can't hallucinate.
  function liftWhy(name){
    var n=name||""; function m(re){ return re.test(n); }
    // Speed-day drills first (most direct clubhead-speed transfer).
    if(m(/Overspeed|Speed Stick|SuperSpeed|Swing Trainer|Whoosh/i))
      return { why:"Overspeed swinging nudges your nervous system to allow a bit more speed than your normal swing. A light stick lets you move faster than usual — the evidence is modest, so treat it as a cheap add-on, not the main event.", cue:"Swing as fast as you physically can — speed is the only goal, both sides." };
    if(m(/Footwork|Ground.?force/i))
      return { why:"Clubhead speed starts from the ground up. Drilling the lead-foot push grooves the pressure shift that fires your hips — the move that turns leg drive into speed.", cue:"Drive hard into the ground from the top, like pushing the floor away." };
    if(m(/Med.?ball|Throw|Slam|Chest Pass|Punch|Scoop/i))
      return { why:"Explosive throws are rotational power with no brakes — you accelerate all the way through the release, exactly like a fast swing. The most transferable power work there is.", cue:"Throw violently and follow all the way through — hold nothing back." };
    if(m(/Jump|Bound|Broad|Hop|Plyo|Pogo/i))
      return { why:"Jumps train rate of force development — how fast you produce force. Quicker force into the ground means faster hips and a faster club. Power is strength expressed fast.", cue:"Minimum ground contact, maximum effort — explode, don't grind." };
    if(m(/Clean|Snatch|High Pull/i))
      return { why:"Olympic-style pulls train full-body triple extension — ankles, knees and hips firing together, fast. That's the same explosive sequence that powers the downswing.", cue:"Be aggressive and snappy — bar speed is the point." };
    if(m(/Pallof|Chop|Russian|Wood ?chop|Rotation|Rotational|Twist|Landmine/i))
      return { why:"Your core is the transmission between the ground and the club. Rotational and anti-rotation work teaches the trunk to transfer leg drive into the clubhead instead of leaking it — that's where X-factor separation becomes speed.", cue:"Brace first, then turn hard from the hips — keep the spine stacked." };
    if(m(/Leg Extension|Sissy Squat|Knee Extension/i))
      return { why:"Direct quad work builds the knee-extension strength that stabilizes your lead leg at impact — a firmer post lets the hips fire the club through faster. Placed after the big lifts, it isolates the quads for extra growth without pre-fatiguing your heavy compounds.", cue:"Squeeze the quads hard at the top, lower slow — strict isolation, leave the ego off." };
    if(m(/Squat|Leg Press|Hack/i))
      return { why:"Vertical ground force is the #1 driver of clubhead speed — the best players push the ground hardest. Heavy squatting builds the leg drive that fires your hips through impact.", cue:"Drive the floor away explosively out of the hole — push the ground, don't just stand up." };
    if(m(/Leg Curl|Nordic|Glute-?Ham|Ham(string)? Curl/i))
      return { why:"Curls train the hamstring's other job — bending the knee — which balances all your hip-hinge work and armors the muscle against the strains that fast, rotational movement like the swing can cause.", cue:"Keep the hips flat on the pad, curl hard, then fight the weight down slowly." };
    if(m(/Deadlift|Romanian|RDL|Hinge|Good ?Morning|Hip Thrust|Kettlebell Swing|Swing/i))
      return { why:"The downswing is a violent hip extension — the snap of the glutes and hamstrings. Hinge work builds that posterior-chain pop that whips the club through the ball.", cue:"Snap the hips forward and squeeze the glutes hard at lockout — that's impact." };
    if(m(/Lunge|Split Squat|Step.?up|Bulgarian|Single.?Leg/i))
      return { why:"At impact nearly all your weight braces on the lead leg. Single-leg strength builds the lead-side post you slam into — a firm post snaps the club through faster.", cue:"Plant and brace the front leg like a wall — drive down through the heel." };
    if(m(/Overhead Press|Shoulder Press|Military|OHP/i))
      return { why:"Overhead pressing builds shoulder strength and stability so you can deliver force through a long, repeatable swing arc without breaking down.", cue:"Stack the bar over mid-foot, ribs down — no leaning back." };
    if(m(/Bench|Push.?up|Chest|Incline|Dip|Fly|Crossover|Pec Deck/i))
      return { why:"Pressing strength feeds the trail-arm extension that adds speed late in the downswing, and armors the shoulders for high swing volume.", cue:"Press explosively, control the lowering." };
    if(m(/Row|Pull.?up|Chin|Lat|Pulldown|Face ?Pull|Rear Delt|Pull/i))
      return { why:"The lead arm pulls the club through impact, and a strong back decelerates the swing safely. Pulling adds whip on the way down and protects the shoulder on the way through.", cue:"Pull with the back, not the arms — squeeze the shoulder blade, control the return." };
    if(m(/Carry|Farmer|Suitcase|Grip/i))
      return { why:"A stable trunk and strong grip hold the clubface steady against the forces a fast swing generates — speed you can't control isn't speed you can use.", cue:"Stand tall, brace the core, crush the handle." };
    if(m(/Plank|Anti.?Rotation|Dead ?Bug|Hollow|Bird ?Dog|Core| Ab|Abs/i))
      return { why:"Trunk stiffness is what lets fast hips actually move the club instead of bending your spine. A rigid core is a faster core.", cue:"Lock ribs to hips, breathe behind the brace." };
    if(m(/Calf|Tibialis|Ankle/i))
      return { why:"Your ankles are the first link to the ground. Strong, springy lower legs help you load and explode off the turf.", cue:"Full range, pause at the top — build springy, durable ankles." };
    if(m(/Curl|Tricep|Bicep|Wrist|Forearm/i))
      return { why:"Arms guide the club; the body powers it. This is support work — healthy, strong elbows and wrists handle the speed your big lifts build.", cue:"Strict and controlled — armor, not ego." };
    return { why:"Every lift here feeds the chain that turns ground force into clubhead speed — build the muscle, then the speed work converts it.", cue:"Full range, max intent up, controlled down." };
  }
  // How-to form library — muscles worked, setup/execution cues, common mistakes.
  // Curated and movement-pattern matched (IP-clean, offline). Pairs with liftWhy().
  function exerciseForm(name){
    var n=name||""; function m(re){ return re.test(n); }
    if(m(/Overspeed|Speed Stick|Whoosh/i)) return { mu:"Full body · CNS / fast-twitch", cues:["Use a light stick — it lets you swing faster than normal.","Make smooth, balanced full swings at MAX effort.","Swing both directions (dominant + non-dominant) each set.","Full rest between reps — every swing is all-out."], miss:["Swinging too hard and losing balance.","Grinding it as strength work — this is pure speed, ramp the volume in."] };
    if(m(/Footwork|Ground.?force/i)) return { mu:"Glutes · quads · calves · feet", cues:["Set up athletic, weight balanced.","Drive the lead foot hard into the ground from the top.","Feel the pressure shift toward the lead side.","Stay tall — push the floor, don't sway."], miss:["Swaying instead of pressing into the ground.","Standing too upright with no leg drive."] };
    if(m(/Med.?ball|Throw|Slam|Chest Pass|Punch|Scoop/i)) return { mu:"Core · hips · chest/shoulders", cues:["Load the back hip, then explode through.","Accelerate all the way through the release.","Throw violently — full follow-through.","Reset and rest fully between reps."], miss:["Holding back at release — defeats the purpose.","Using only the arms instead of the hips/core."] };
    if(m(/Jump|Bound|Broad|Hop|Plyo|Pogo/i)) return { mu:"Glutes · quads · hamstrings · calves", cues:["Load with a quick dip, arms back.","Explode up/out as fast as possible.","Land soft and balanced — absorb quietly.","Full reset every rep; quality over quantity."], miss:["Landing stiff or off-balance.","Grinding reps when they slow down — stop the set."] };
    if(m(/Clean|Snatch|High Pull/i)) return { mu:"Glutes · hamstrings · traps · whole posterior chain", cues:["Start with a flat back, bar/weight close.","Explode through the hips — triple extension.","Be aggressive and snappy; speed is the point.","Catch or finish tall and stable."], miss:["Rounding the back.","Pulling slow — this is a power move, move fast."] };
    if(m(/Pallof|Chop|Russian|Wood ?chop|Rotation|Rotational|Twist|Landmine/i)) return { mu:"Obliques · deep core · hips", cues:["Brace the core hard before you move.","Rotate from the hips, keep the spine stacked.","Control the return — don't let it snap you back.","Breathe behind the brace."], miss:["Bending the spine instead of turning the hips.","Going so heavy you lose the brace."] };
    if(m(/Leg Extension|Sissy Squat|Knee Extension/i)) return { mu:"Quads (isolation)", cues:["Sit back in the seat, pad on the lower shin.","Extend to full lockout and squeeze the quads.","Lower slowly — resist all the way down.","Strict reps — no swinging or thrusting the weight up."], miss:["Using momentum to kick the weight up.","Cutting the range short at the top."] };
    if(m(/Squat|Leg Press|Hack/i)) return { mu:"Quads · glutes · core", cues:["Brace, big breath, chest tall.","Sit between your hips to at least parallel.","Drive the floor away — push through mid-foot.","Knees track over toes, don't cave in."], miss:["Knees caving inward.","Heels rising / rounding the lower back.","Cutting depth short."] };
    if(m(/Leg Curl|Nordic|Glute-?Ham/i)) return { mu:"Hamstrings (knee flexion)", cues:["Hips flat on the pad — don't let them pop up.","Curl the heels all the way toward you.","Squeeze the hamstrings hard at the peak.","Lower slowly — resist the weight down."], miss:["Jerking / using the hips to move the weight.","Cutting the range short at the top or bottom."] };
    if(m(/Deadlift|Romanian|RDL|Hinge|Good ?Morning/i)) return { mu:"Hamstrings · glutes · lower back", cues:["Soft knees, hinge from the hips — push hips back.","Keep the bar/weight close, back flat.","Feel a hamstring stretch, then snap the hips forward.","Squeeze the glutes hard at the top — don't lean back."], miss:["Rounding the back.","Squatting it instead of hinging.","Hyperextending / leaning back at the top."] };
    if(m(/Hip Thrust|Kettlebell Swing|KB Swing|Swing/i)) return { mu:"Glutes · hamstrings · core", cues:["Drive through the heels, ribs down.","Snap the hips to full extension, squeeze the glutes.","Chin tucked, don't arch the lower back.","Control the lowering."], miss:["Arching the lower back instead of using glutes.","Pushing through the toes."] };
    if(m(/Lunge|Split Squat|Step.?up|Bulgarian|Single.?Leg/i)) return { mu:"Quads · glutes · balance/stability", cues:["Most weight on the front leg.","Drop straight down, back knee toward the floor.","Drive through the front heel to stand.","Stay tall — brace the front leg like a post."], miss:["Pushing off the back foot too much.","Front knee collapsing inward.","Leaning the torso forward."] };
    if(m(/Overhead Press|Shoulder Press|Military|OHP/i)) return { mu:"Shoulders · triceps · upper chest · core", cues:["Stack the bar over mid-foot, ribs down.","Brace the core — no leaning back.","Press up and slightly back, finish overhead.","Lower under control to the collarbone."], miss:["Leaning back / arching the low back.","Flaring elbows too wide."] };
    if(m(/Bench|Push.?up|Chest|Incline|Dip|Fly|Crossover|Pec Deck/i)) return { mu:"Chest · shoulders · triceps", cues:["Shoulder blades pinned, slight arch.","Lower under control to mid-chest.","Elbows ~45°, not flared to 90°.","Press explosively, drive the floor with your feet."], miss:["Flaring elbows straight out.","Bouncing the bar off the chest.","Hips lifting off the bench."] };
    if(m(/Row|Pull.?up|Chin|Lat|Pulldown|Face ?Pull|Rear Delt|Pull/i)) return { mu:"Lats · upper back · biceps · rear delts", cues:["Start by setting the shoulder blade (don't just yank with arms).","Pull the elbow toward the hip/ribs.","Squeeze the back at the top.","Control the return — full stretch."], miss:["Using only the arms / shrugging.","Heaving with momentum.","Half range — not controlling the lowering."] };
    if(m(/Carry|Farmer|Suitcase|Grip/i)) return { mu:"Grip · traps · core · whole body", cues:["Stand tall, shoulders back, ribs down.","Brace the core, walk with control.","Crush the handles — strong grip.","Don't lean; resist any tilt."], miss:["Leaning or rounding under the load.","Rushing / losing posture."] };
    if(m(/Plank|Anti.?Rotation|Dead ?Bug|Hollow|Bird ?Dog|Core| Ab|Abs/i)) return { mu:"Deep core · abs · obliques", cues:["Ribs down, squeeze glutes, flat line head-to-heels.","Brace like you're about to be punched.","Breathe behind the brace.","Quality over time — stop when form breaks."], miss:["Hips sagging or piking up.","Holding your breath."] };
    if(m(/Calf|Tibialis|Ankle/i)) return { mu:"Calves · ankle", cues:["Full range — deep stretch at the bottom.","Press all the way up onto the toes, pause.","Control the lowering (~2–3 sec).","Keep it strict — no bouncing."], miss:["Bouncing / short range.","Rushing the reps."] };
    if(m(/Leg Curl|Ham Curl/i)) return { mu:"Hamstrings", cues:["Hips pinned to the pad.","Curl with control, squeeze at the top.","Lower slowly — resist the weight.","No jerking with the lower back."], miss:["Hips lifting off the pad.","Using momentum."] };
    if(m(/Leg Ext/i)) return { mu:"Quads", cues:["Pin the hips, toes up.","Extend smoothly, pause at the top.","Lower under control.","Don't slam the weight stack."], miss:["Swinging the weight up.","Half reps."] };
    if(m(/Curl|Tricep|Bicep|Wrist|Forearm|Preacher|Arm/i)) return { mu:"Arms (biceps / triceps / forearms)", cues:["Pin the elbows, strict tempo.","Full range — stretch and squeeze.","Control the lowering.","No swinging or body english."], miss:["Swinging the weight up with momentum.","Cutting the range short."] };
    return { mu:"Multiple muscle groups", cues:["Set up braced and balanced.","Full range, controlled tempo.","Drive with intent on the way up.","Control the lowering."], miss:["Using momentum instead of the muscle.","Rushing through partial reps."] };
  }
  // YouTube form-video search (opens externally) — no media bundled, IP-clean.
  function formVideoUrl(name){ return "https://www.youtube.com/results?search_query=" + encodeURIComponent("how to "+name+" proper form technique"); }
  // Speed 101 — teaches a strong-but-new-to-speed lifter WHY this day works and HOW to progress it
  // (speed work progresses differently from hypertrophy). Collapsible, premium, on the speed card.
  function speed101Html(){
    return '<details class="fold speed101"><summary>🧠 New to speed work? How it works &amp; how to progress</summary><div class="fold-body">'+
      '<div class="pb-sec"><h4>⚙️ Why this makes you longer</h4>'+
        '<p>Lifting builds the <b>engine</b> — how much force your muscles can make (plus the mass behind the ball). But clubhead speed is about how <i>fast</i> you deliver that force, not just how much. This day is the <b>transmission</b>: it teaches your nervous system to fire your strength <b>fast</b>, in the swing’s pattern.</p>'+
        '<p>That’s why in the research, <b>jump power and throw speed predict clubhead speed better than max strength</b> — and flexibility doesn’t predict it at all. <b>Strong-but-slow</b> is exactly the gap this day closes.</p></div>'+
      '<div class="pb-sec"><h4>⚡ How to do it right</h4>'+
        '<p><b>Every rep max-velocity.</b> The opposite of a set to failure — move as fast as you physically can on every single rep.</p>'+
        '<p><b>Low reps, full rest.</b> 3–5 reps, then rest fully. The instant a rep visibly slows down, the set is over — a slow rep trains the engine, not the speed.</p>'+
        '<p><b>Fresh, not fried.</b> Do this rested (not straight after a leg-crushing session), and warm up first — max-intent rotation needs a ready body.</p></div>'+
      '<div class="pb-sec"><h4>📈 How speed work progresses (not like your lifts)</h4>'+
        '<p><b>Gym version:</b> add a little <b>load</b> to the ballistic moves (trap-bar jump, speed bench) — <i>but only while every rep still flies.</i> If the bar slows, drop back. Keep the speed; nudge the load.</p>'+
        '<p><b>Field version:</b> progress by <b>output</b> — jump a little higher, throw a little farther — and slowly ramp your overspeed swings.</p>'+
        '<p><b>The real scoreboard:</b> retest your <b>7-iron and driver every couple of weeks</b>. That number climbing is the progression that actually matters — everything above is just the input.</p></div>'+
      '</div></details>';
  }
  function whyHtml(name, withCoach){
    var w=liftWhy(name);
    return '<div class="why-why">'+w.why+'</div>'+
      '<div class="why-cue">⚡ <b>Power cue:</b> '+w.cue+'</div>'+
      '<button class="why-howto" data-howto="'+escAttr(name)+'">▶ How to do it · muscles &amp; form</button>'+
      (withCoach!==false ? '<button class="why-coach" data-whycoach="'+escAttr(name)+'">💬 Go deeper with the coach</button>' : '');
  }
  // ---- exercise demo sheet (how-to) ----
  function openExDemo(name){
    var f=exerciseForm(name), w=liftWhy(name);
    var html='<div class="ed-mu">💪 <b>Works:</b> '+f.mu+'</div>'+
      '<div class="ed-sec"><h4>How to do it</h4><ol class="ed-cues">'+f.cues.map(function(c){return '<li>'+c+'</li>';}).join("")+'</ol></div>'+
      '<div class="ed-sec"><h4>Common mistakes</h4><ul class="ed-miss">'+f.miss.map(function(c){return '<li>'+c+'</li>';}).join("")+'</ul></div>'+
      '<div class="ed-why">⚡ <b>For your swing:</b> '+w.why+'</div>'+
      '<a class="ed-video" href="'+formVideoUrl(name)+'" target="_blank" rel="noopener">▶ Watch a form video</a>';
    var b=$("exDemoBody"); if(b) b.innerHTML=html;
    var t=$("exDemoTitle"); if(t) t.textContent=name;
    var mo=$("exDemoModal"); if(mo){ mo.hidden=false; document.body.style.overflow="hidden"; }
  }
  function closeExDemo(){ var mo=$("exDemoModal"); if(mo) mo.hidden=true;
    document.body.style.overflow=(typeof player!=="undefined" && player)?"hidden":""; }
