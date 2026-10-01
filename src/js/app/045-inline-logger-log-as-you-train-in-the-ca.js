  /* ===================== INLINE LOGGER (log as you train, in the card) ===================== */
  var ilog=null, restEnd=0, restTimer=null, openWhy={};
  // Plate math only for real barbell lifts: a "Kettlebell Deadlift" is not one. "A / B"
  // names are primary / fallback, so only the primary part is classified.
  function isBarbell(n){ n=String(n||"").split(" / ")[0];
    return /Back Squat|Front Squat|Barbell|Bench Press|Deadlift|Overhead Press|Romanian|Hip Thrust|Pendlay|Bent.?Over Row|Hang Power Clean/i.test(n) && !/\bDB\b|Dumbbell|Cable|Machine|Smith|Band|Kettlebell|\bKB\b/i.test(n); }
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
      // Same load read as the player + modal logger (077 ffDose): on a recovery-dose
      // day the placeholders drop to ~75% and the "add weight" nudge stays hidden.
      var hasLastW=!!(lx && lx.sets.some(function(st){ return st.w; }));
      var top=0; if(lx) lx.sets.forEach(function(st){ var tw=parseFloat(st.w); if(tw>top) top=tw; });
      var td=ffDose(top||null, x, lx, week, s);   // today's load from last time's top
      var shifted=repsShifted(lx, x);
      var bw=isBodyweightEx(x.name);   // box/broad/squat jumps etc. — no weight field
      var setsHtml="";
      x.sets.forEach(function(st, si){
        tot++; if(st.done) done++;
        var pw=(lx&&lx.sets[si]&&lx.sets[si].w)?lx.sets[si].w:null, pr=(lx&&lx.sets[si]&&lx.sets[si].r)?lx.sets[si].r:null;
        var prev = ffEsc(bw ? (pr?(pr+' reps'):'–') : (pw ? (pw+' × '+(pr||'–')) : '–'));
        // Prescribed load leads: the weight placeholder shows what to lift TODAY
        // (deload ~60%, progression-ready last + one jump); PREVIOUS keeps the raw history.
        var sug=ffDose(pw, x, lx, week, s).w;
        var pm=(!bw&&isBarbell(x.name)&&st.w)?platesFor(st.w):"";
        setsHtml+='<div class="il-set'+(st.done?" done":"")+'">'+
          '<span class="il-sn">'+(si+1)+'</span>'+
          '<button class="il-prev" data-x="'+xi+'" data-s="'+si+'" data-prevfill="1"'+((pw||(bw&&pr))?'':' disabled')+'>'+prev+'</button>'+
          (bw ? '<span class="il-in il-bw" aria-label="bodyweight">BW</span>'
              : '<input class="il-in" type="number" inputmode="decimal" placeholder="'+escAttr(sug!=null?sug:(pw||""))+'" value="'+escAttr(st.w||"")+'" data-x="'+xi+'" data-s="'+si+'" data-f="w"/>')+
          '<input class="il-in" type="number" inputmode="numeric" placeholder="'+escAttr((pr!=null&&!shifted)?pr:((isDistEx(x.target)||shifted)?repSeed(x.target):""))+'" value="'+escAttr(st.r||"")+'" data-x="'+xi+'" data-s="'+si+'" data-f="r"/>'+
          '<button class="il-check'+(st.done?" on":"")+'" data-x="'+xi+'" data-s="'+si+'" data-idone="1" aria-label="set done">✓</button></div>'+
          (pm?'<div class="il-plates">🏋️ '+pm+'</div>':'');
      });
      // One-tap fill for today's load: the easy-week load, an earned jump, a Heavy
      // week's matched load, or an ease-in after a break (none on a recovery dose).
      var rx = (wv==="deload" && hasLastW && !lx._reduced && td.w!=null)
        ? ' · <button class="il-up" data-deloadfill="'+xi+'" title="Fill every set with ~60% of last time’s top weight">🪫 fill deload loads — tap</button>'
        : ((td.w!=null && td.band!=="recharge" && wv!=="deload" && (td.bump||td.shift||td.back))
          ? ' · <button class="il-up" data-bumpfill="'+xi+'" title="Fill every set with today’s load">'+(td.w>top?'↑':'↓')+' '+td.w+' lb today — tap to fill</button>' : '');
      html+='<div class="il-ex">'+
        '<div class="il-exhead"><span class="il-name">'+ffPurposeIc(x.name)+' '+ffEsc(x.name)+'</span>'+
          '<div class="il-acts">'+
            '<button class="il-why'+(openWhy[xi]?" on":"")+'" data-why="'+xi+'" aria-label="Why this lift builds speed">🛈 Why</button>'+
            '<button class="il-why" data-exhist="'+escAttr(x.name)+'" aria-label="Lift history">📊</button>'+
            '<button class="il-swap" data-swapx="'+escAttr(x.orig||x.name)+'" data-swapcur="'+escAttr(x.name)+'" data-swapix="'+xi+'" title="Swap this lift">⇄ Swap</button>'+
          '</div></div>'+
        '<div class="il-sub">'+ffEsc(x.target)+rx+'</div>'+
        '<div class="il-why-box"'+(openWhy[xi]?"":" hidden")+'>'+whyHtml(x.name)+'</div>'+
        '<div class="il-cols"><span>SET</span><span>PREVIOUS</span><span>'+(bw?'LOAD':'LBS')+'</span><span>'+repWord(x.target).toUpperCase()+'</span><span></span></div>'+
        setsHtml+
        '<button class="il-add" data-x="'+xi+'" data-iadd="1">＋ Add set</button></div>';
    });
    html += '<button class="il-addlift" data-addlift="1">＋ Add a lift to today</button>';
    var pct = tot? Math.round(done/tot*100):0;
    return '<div class="il-prog"><div class="il-progbar" style="width:'+pct+'%"></div></div>'+html;
  }
  // Today's dosed load for one inline-logger lift, from last time's top weight
  // (the one-tap fill buttons — same ffDose read as the placeholders).
  function ilTopDose(x){
    if(!ilog || !x) return null;
    var last=lastSessionFor(ilog.day, ilog.week), lx=null;
    if(last) last.ex.forEach(function(e){ if(e.name===x.name) lx=e; });
    var top=0; if(lx) lx.sets.forEach(function(st){ var w=parseFloat(st.w); if(w>top) top=w; });
    return top>0 ? ffDose(top, x, lx, ilog.week, ilog.sess).w : null;
  }
  // Grounded "why this lift" micro-coaching — ties each movement pattern to
  // clubhead speed using the same framework as the reference docs (ground force,
  // hip drive, rotation/anti-rotation, lead-leg brace, deceleration). Curated &
  // offline — no AI, so it's instant and can't hallucinate.
  // First match wins, so the SPECIFIC patterns come before the generic ones
  // (Oct 2026 cue audit): anti-rotation before rotation (a Pallof press resists
  // the turn), chops/rotation before jumps (/Hop/ used to match "cHOP"), Leg
  // Press and split squats before the squat entry, raises/face pulls before the
  // row entry ("Lat" matched "Lateral"), "Chest-Supported Row" never on bench.
  // tests/exercise-cues.test.mjs runs every plan, swap and speed-day name.
  function liftWhy(name){
    var n=name||""; function m(re){ return re.test(n); }
    // Speed-day drills first (most direct clubhead-speed transfer).
    if(m(/Overspeed|Speed Stick|SuperSpeed|Swing Trainer|Whoosh/i))
      return { why:"Overspeed swinging nudges your nervous system to allow a bit more speed than your normal swing. A light stick lets you move faster than usual — the evidence is modest, so treat it as a cheap add-on, not the main event.", cue:"Swing as fast as you physically can — speed is the only goal, both sides." };
    if(m(/Footwork|Ground.?force/i))
      return { why:"Clubhead speed starts from the ground up. Drilling the lead-foot push grooves the pressure shift that fires your hips — the move that turns leg drive into speed.", cue:"Drive hard into the ground from the top, like pushing the floor away." };
    if(m(/Pallof|Anti.?rotation/i))
      return { why:"Your core is the swing's brake as well as its engine. Resisting the turn builds the trunk stiffness that lets fast hips move the club instead of twisting your spine.", cue:"Stand square, press straight out and hold 1–2 s — don't let it turn you." };
    if(m(/Landmine(?! Press| Squat)/i))
      return { why:"Your core passes power from the ground to the club. Turning a loaded bar from the hips teaches your trunk to pass that power on, and to brake it safely at the end of the turn.", cue:"Brace, turn from the hips at speed, then stop the bar under control — arms just follow." };
    if(m(/Chest Pass|Chest Throw/i))
      return { why:"Upper-body explosive strength is one of the strongest links to clubhead speed. A chest throw trains it with no brakes — you speed up all the way to the release.", cue:"Ball at the chest, punch it out as hard as you can and let it go." };
    if(m(/Slam/i))
      return { why:"Slams train total-body power — reach tall, then fire the trunk and arms down as fast as you can, with no braking at the end.", cue:"Reach tall, then slam it down hard with your whole body." };
    if(m(/Med.?ball|Throw|Toss|Scoop/i) && !m(/\bBand\b/i))
      return { why:"Explosive throws are rotational power with no brakes — you accelerate all the way through the release, exactly like a fast swing. The most transferable power work there is.", cue:"Throw violently and follow all the way through — hold nothing back." };
    if(m(/Chop|Russian Twist|Rotation|Rotational|Twist|Punch/i))
      return { why:"Your core passes power from the ground to the club. Rotational work teaches your trunk to turn from the hips and pass that power on instead of leaking it.", cue:"Brace first, then turn from the hips — arms just follow; control the way back." };
    if(m(/Pogo|Depth Jump|Drop Jump|\bHops?\b/i))
      return { why:"Quick-contact jumps train your legs to store and return energy fast. Advanced work — it only pays off once your normal jump landings are solid.", cue:"Quick, quiet contacts off the balls of the feet — stop when they get loud or slow." };
    if(m(/Jump|Bound|Broad|Plyo|Skater(?! Squat)/i))
      return { why:"Jumps train rate of force development — how fast you produce force. Quicker force into the ground means faster hips and a faster club. Power is strength expressed fast.", cue:"Load fast, jump as high or far as you can, then land soft and quiet — stick it and reset." };
    if(m(/Clean|Snatch(?!-?Grip)|High Pull/i))
      return { why:"Olympic-style pulls train full-body triple extension — ankles, knees and hips firing together, fast. That's the same explosive sequence that powers the downswing.", cue:"Be aggressive and snappy — bar speed is the point." };
    if(m(/Calf|Tibialis|Ankle/i))
      return { why:"Your ankles are the first link to the ground. Strong, springy lower legs help you load and explode off the turf.", cue:"Pause in the deep stretch at the bottom, then drive up — springy, durable ankles." };
    if(m(/Leg Extension|Sissy Squat|Knee Extension/i))
      return { why:"Direct quad work builds the knee-extension strength that stabilizes your lead leg at impact — a firmer post lets the hips fire the club through faster. Placed after the big lifts, it isolates the quads for extra growth without pre-fatiguing your heavy compounds.", cue:"Squeeze the quads hard at the top, lower slow — strict isolation, leave the ego off." };
    if(m(/Leg Press/i) && !m(/Calf/i))
      return { why:"The leg press loads your quads and glutes heavy with little load on your spine — leg strength behind a strong push off the ground. In the swing that push also works through the turn and the lead-leg brace, which the jumps, hinges and lunges train.", cue:"Hips and low back stay on the pad — drive the platform away fast, don't slam the knees straight." };
    if(m(/Squat|Hack/i) && !m(/Split Squat|Bulgarian/i))
      return { why:"Strong legs are where your ground force starts. In the swing you push the ground down, sideways and around, and leg strength raises how hard you can push. The Speed day turns that strength into speed with jumps and throws.", cue:"Drive the floor away explosively out of the hole — push the ground, don't just stand up." };
    if(m(/Leg Curl|Nordic|Glute-?Ham|Ham(string)? Curl/i))
      return { why:"Curls train the hamstring's other job — bending the knee — which balances all your hip-hinge work and armors the muscle against the strains that fast, rotational movement like the swing can cause.", cue:"Keep the hips flat on the pad, curl hard, then fight the weight down slowly." };
    if(m(/Deadlift|Romanian|RDL|Hinge|Good ?Morning|Hip Thrust|Glute Bridge|Kettlebell Swing|Swing|Back Extension|Hyperext|Reverse Hyper|Rack Pull|Pull-?Through/i))
      return { why:"The downswing is a violent hip extension — the snap of the glutes and hamstrings. Hinge work builds that posterior-chain pop that whips the club through the ball.", cue:"Snap the hips forward and squeeze the glutes hard at lockout — that's impact." };
    if(m(/Lunge|Split Squat|Step.?up|Bulgarian|Single.?Leg/i))
      return { why:"At impact nearly all your weight braces on the lead leg. Single-leg strength builds the lead-side post you slam into — a firm post snaps the club through faster.", cue:"Plant and brace the front leg like a wall — drive down through the heel." };
    if(m(/Face ?Pull|Rear.?Delt|Y-T-W|Reverse (Pec Deck|Fly)/i))
      return { why:"Your rear shoulders and rotator cuff slow the arms down after impact. Strong ones protect the shoulder through thousands of fast swings.", cue:"Lead with the elbows and squeeze the shoulder blades together — no shrug, control the return." };
    if(m(/Lateral Raise|Front Raise|Y-?Raise/i))
      return { why:"Strong, healthy delts hold your arms in a wide, repeatable swing arc and handle high swing volume. Support work for the shoulder, not a speed lift.", cue:"Lead with the elbows out to shoulder height — no shrug, no swing." };
    if(m(/Overhead Press|Shoulder Press|Military|OHP|Push Press|Arnold|Z-?Press|Standing .*Press/i))
      return { why:"Overhead pressing builds shoulder strength and stability so you can deliver force through a long, repeatable swing arc without breaking down.", cue:"Stack the weight over mid-foot, ribs down — no leaning back." };
    if(m(/Speed Bench|Explosive DB Floor Press/i))
      return { why:"A light bar pressed as fast as you can trains upper-body speed. It isn't a true throw — the bar has to slow down at the top — so keep it light and push hard all the way.", cue:"Light bar — push every rep as fast as you can; stop when the bar slows." };
    if(m(/Bench|Push.?up|Chest(?!-?Supported)|Incline(?!.*Curl)|\bDip\b|Fly|Crossover|Pec Deck|Floor .*Press|Flat .*Press|Svend|Landmine Press|Band (Explosive )?Press/i))
      return { why:"Pressing strength feeds the trail-arm extension that adds speed late in the downswing, and armors the shoulders for high swing volume.", cue:"Press explosively, control the lowering." };
    if(m(/Row|Pull.?up|\bChin|\bLat\b|Pulldown|Pull/i))
      return { why:"The lead arm pulls the club through impact, and a strong back decelerates the swing safely. Pulling adds whip on the way down and protects the shoulder on the way through.", cue:"Pull with the back, not the arms — squeeze the shoulder blade, control the return." };
    if(m(/Carry|Farmer|Suitcase|Grip|Pinch|Dead Hang/i))
      return { why:"A stable trunk and strong grip hold the clubface steady against the forces a fast swing generates — speed you can't control isn't speed you can use.", cue:"Stand tall, brace the core, crush the handle." };
    if(m(/Leg Raise|Knee Raise|Crunch|Sit.?up|Ab Wheel|Rollout/i))
      return { why:"Your abs link the hips to the ribcage. Strong abs keep the pelvis under control, so a fast turn doesn't become a low-back arch.", cue:"Curl the pelvis up with the abs, don't swing the legs — slow on the way down." };
    if(m(/Plank|Dead ?Bug|Hollow|Bird ?Dog|Core| Ab|Abs/i))
      return { why:"Trunk stiffness is what lets fast hips actually move the club instead of bending your spine. A rigid core is a faster core.", cue:"Lock ribs to hips, breathe behind the brace." };
    if(m(/Curl|Tricep|Bicep|Wrist|Forearm|Pushdown|Skull|Kickback|JM Press|Tate Press/i))
      return { why:"Arms guide the club; the body powers it. This is support work — healthy, strong elbows and wrists handle the speed your big lifts build.", cue:"Strict and controlled — armor, not ego." };
    return { why:"Every lift here feeds the chain that turns ground force into clubhead speed — build the muscle, then the speed work converts it.", cue:"Full range, max intent up, controlled down." };
  }
  // How-to form library — muscles worked, setup/execution cues, common mistakes.
  // Curated and movement-pattern matched (IP-clean, offline). Pairs with liftWhy()
  // and uses the SAME ordering (see the note above liftWhy).
  function exerciseForm(name){
    var n=name||""; function m(re){ return re.test(n); }
    if(m(/Overspeed|Speed Stick|Whoosh/i)) return { mu:"Full body · CNS / fast-twitch", cues:["Use a light stick — it lets you swing faster than normal.","Make smooth, balanced full swings at MAX effort.","Swing both directions (dominant + non-dominant) each set.","Full rest between reps — every swing is all-out."], miss:["Swinging too hard and losing balance.","Grinding it as strength work — this is pure speed, ramp the volume in."] };
    if(m(/Footwork|Ground.?force/i)) return { mu:"Glutes · quads · calves · feet", cues:["Set up athletic, weight balanced.","Drive the lead foot hard into the ground from the top.","Feel the pressure shift toward the lead side.","Stay tall — push the floor, don't sway."], miss:["Swaying instead of pressing into the ground.","Standing too upright with no leg drive."] };
    if(m(/Pallof|Anti.?rotation/i)) return { mu:"Obliques · deep core · glutes (anti-rotation)", cues:["Stand side-on to the anchor, feet hip-width, handle at the chest.","Brace, then press the handle straight out to arm's length.","Hold 1–2 s (the full time on a hold) — hips and chest stay square to the front.","Bring it back slowly; the cable or band never turns you."], miss:["Torso rotating toward the anchor.","Going so heavy you twist or lean to hold it.","Holding your breath."] };
    if(m(/Landmine(?! Press| Squat)/i)) return { mu:"Obliques · deep core · hips", cues:["Hold the bar end at chest height, arms long, feet wide.","Brace, then turn from the hips to swing the bar across your body.","Stop the bar under control at the side — don't let it pull you round.","Pivot the back foot; keep the spine stacked."], miss:["Turning the spine instead of the hips.","Letting the bar yank you past your range at the end.","Going so heavy the turn slows down."] };
    if(m(/Chest Pass|Chest Throw/i)) return { mu:"Chest · shoulders · triceps (upper-body power)", cues:["Sit (or stand) tall, ball at the chest, elbows under it.","Punch it out as hard as you can — full arm extension.","Let it go: the release is the point.","Reset and rest fully between reps."], miss:["Pushing it slowly — this is a throw, not a press.","Leaning back to throw with the trunk."] };
    if(m(/Slam/i)) return { mu:"Lats · abs · shoulders · hips", cues:["Reach the ball high overhead, up on the toes.","Slam it down hard just in front of your feet — whole body.","Hinge to pick it up with a flat back.","Full reset every rep."], miss:["Arms-only slam with no body behind it.","Rounding the back to pick it up."] };
    if(m(/Med.?ball|Throw|Toss|Scoop/i) && !m(/\bBand\b/i)) return { mu:"Core · hips · chest/shoulders", cues:["Load the back hip, then explode through.","Accelerate all the way through the release.","Throw violently — full follow-through.","Reset and rest fully between reps."], miss:["Holding back at release — defeats the purpose.","Using only the arms instead of the hips/core."] };
    if(m(/Chop|Russian Twist|Rotation|Rotational|Twist|Punch/i)) return { mu:"Obliques · deep core · hips", cues:["Brace the core hard before you move.","Rotate from the hips, keep the spine stacked.","Control the return — don't let it snap you back.","Breathe behind the brace."], miss:["Bending the spine instead of turning the hips.","Going so heavy you lose the brace."] };
    if(m(/Pogo|Depth Jump|Drop Jump|\bHops?\b/i)) return { mu:"Calves · ankles · quads (quick contacts)", cues:["Advanced work — only once your jump landings are solid.","Depth jump: step (don't jump) off a LOW box.","Land quietly on the balls of the feet and rebound straight up fast.","Stop the set when contacts get loud or slow."], miss:["Box too high — heels crash down.","Knees caving in on landing.","Grinding on when contacts slow."] };
    if(m(/Jump|Bound|Broad|Plyo|Skater(?! Squat)/i)) return { mu:"Glutes · quads · hamstrings · calves", cues:["Load with a quick dip (arms back if they're free).","Explode up/out as fast as possible.","Land soft and quiet — hips back, knees over toes — and stick it.","Full reset every rep; quality over quantity."], miss:["Landing stiff-legged, loud or off-balance.","Knees caving in on landing.","Grinding reps when they slow down — stop the set."] };
    if(m(/Clean|Snatch(?!-?Grip)|High Pull/i)) return { mu:"Glutes · hamstrings · traps · whole posterior chain", cues:["Start with a flat back, bar/weight close.","Explode through the hips — triple extension.","Be aggressive and snappy; speed is the point.","Catch or finish tall and stable."], miss:["Rounding the back.","Pulling slow — this is a power move, move fast."] };
    if(m(/Calf|Tibialis|Ankle/i)) return { mu:"Calves · ankle", cues:["Pause 1–2 sec in the deep stretch at the bottom — that's where calves grow.","Press all the way up onto the toes.","Lower under control (1–2 sec).","Keep it strict — no bouncing."], miss:["Bouncing / short range.","Rushing the reps."] };
    if(m(/Leg Extension|Sissy Squat|Knee Extension/i)) return { mu:"Quads (isolation)", cues:["Lean back — recline the seat if it adjusts. It stretches the upper quad for more growth.","Pad on the lower shin; extend to full lockout and squeeze.","Lower under control (1–2 sec).","Strict reps — no swinging or thrusting the weight up."], miss:["Using momentum to kick the weight up.","Cutting the range short at the top."] };
    if(m(/Leg Press/i) && !m(/Calf/i)) return { mu:"Quads · glutes", cues:["Back and hips flat on the pad; feet shoulder-width, mid-platform.","Lower only as deep as your hips stay on the pad — no tailbone curl.","Drive the platform away fast through the whole foot.","Stop just short of locking the knees hard at the top."], miss:["Hips peeling off the pad / low back rounding at the bottom.","Knees caving in.","Slamming into lockout."] };
    if(m(/Squat|Hack/i) && !m(/Split Squat|Bulgarian/i)) return { mu:"Quads · glutes · core", cues:["Brace, big breath, chest tall.","Sit between your hips — to about parallel, or as deep as your back stays neutral.","Drive the floor away — push through mid-foot.","Knees track over toes, don't cave in."], miss:["Knees caving inward.","Heels rising / rounding the lower back.","Cutting depth short."] };
    if(m(/Leg Curl|Nordic|Glute-?Ham/i)) return { mu:"Hamstrings (knee flexion)", cues:["Seated beats lying for growth — sit tall, thigh pad snug (lying: hips flat on the pad).","Curl the heels all the way toward you.","Squeeze the hamstrings hard at the peak.","Lower slowly — resist the weight down."], miss:["Jerking / using the hips to move the weight.","Cutting the range short at the top or bottom."] };
    if(m(/Deadlift|Romanian|RDL|Hinge|Good ?Morning|Back Extension|Hyperext|Reverse Hyper|Rack Pull|Pull-?Through/i)) return { mu:"Hamstrings · glutes · lower back", cues:["Soft knees, hinge from the hips — push hips back.","Keep the bar/weight close, back flat.","Feel a hamstring stretch, then snap the hips forward.","Squeeze the glutes hard at the top — don't lean back."], miss:["Rounding the back.","Squatting it instead of hinging.","Hyperextending / leaning back at the top."] };
    if(m(/Swing/i)) return { mu:"Glutes · hamstrings · core", cues:["Hike the bell back between the thighs — hinge, don't squat.","Snap the hips forward hard; the arms just guide it.","Stand tall at the top — glutes tight, no leaning back.","Let it fall back into the next hinge."], miss:["Squatting the swing instead of hinging.","Lifting it with the arms.","Leaning back at the top."] };
    if(m(/Hip Thrust|Glute Bridge/i)) return { mu:"Glutes · hamstrings · core", cues:["Drive through the heels, ribs down.","Snap the hips to full extension, squeeze the glutes.","Chin tucked, don't arch the lower back.","Control the lowering."], miss:["Arching the lower back instead of using glutes.","Pushing through the toes."] };
    if(m(/Lunge|Split Squat|Step.?up|Bulgarian|Single.?Leg/i)) return { mu:"Quads · glutes · balance/stability", cues:["Most weight on the front leg.","Drop straight down, back knee toward the floor.","Drive through the front heel to stand.","Stay tall — brace the front leg like a post."], miss:["Pushing off the back foot too much.","Front knee collapsing inward.","Leaning the torso forward."] };
    if(m(/Face ?Pull|Rear.?Delt|Y-T-W|Reverse (Pec Deck|Fly)/i)) return { mu:"Rear delts · upper back · rotator cuff", cues:["Face pull: cable or band at face height — pull toward your forehead, hands apart, elbows high.","Fly or raise: hinge forward or face the pad, arms long, lift out to the sides.","Squeeze the shoulder blades together for a beat.","Control the return."], miss:["Shrugging the shoulders up.","Leaning back to heave the weight.","Going so heavy the elbows drop."] };
    if(m(/Lateral Raise|Front Raise|Y-?Raise/i)) return { mu:"Side delts (front delts on a front raise)", cues:["Slight bend in the elbows; stand tall.","Lead with the elbows up to shoulder height.","Pause briefly at the top.","Lower slowly — 2 sec down."], miss:["Shrugging the weight up with the traps.","Swinging the body for momentum.","Going above shoulder height with a heavy weight."] };
    if(m(/Overhead Press|Shoulder Press|Military|OHP|Push Press|Arnold|Z-?Press|Standing .*Press/i)) return { mu:"Shoulders · triceps · upper chest · core", cues:["Stack the weight over mid-foot, ribs down.","Brace the core — no leaning back.","Press up and slightly back, finish overhead.","Lower under control to shoulder height."], miss:["Leaning back / arching the low back.","Flaring elbows too wide."] };
    if(m(/Speed Bench|Explosive DB Floor Press/i)) return { mu:"Chest · shoulders · triceps (speed)", cues:["Light load — about half your usual working weight.","Lower under control to the chest.","Push up as fast as you can, every rep.","End the set the moment a rep slows."], miss:["Going heavy — then it's just a bench press.","Bouncing the weight off the chest."] };
    if(m(/Bench|Push.?up|Chest(?!-?Supported)|Incline(?!.*Curl)|\bDip\b|Fly|Crossover|Pec Deck|Floor .*Press|Flat .*Press|Svend|Landmine Press|Band (Explosive )?Press/i)) return { mu:"Chest · shoulders · triceps", cues:["Shoulder blades pinned, slight arch.","Lower under control to mid-chest.","Elbows ~45°, not flared to 90°.","Press explosively, drive the floor with your feet."], miss:["Flaring elbows straight out.","Bouncing the bar off the chest.","Hips lifting off the bench."] };
    if(m(/Row|Pull.?up|\bChin|\bLat\b|Pulldown|Pull/i)) return { mu:"Lats · upper back · biceps · rear delts", cues:["Start by setting the shoulder blade (don't just yank with arms).","Pull the elbow toward the hip/ribs.","Squeeze the back at the top.","Control the return — full stretch."], miss:["Using only the arms / shrugging.","Heaving with momentum.","Half range — not controlling the lowering."] };
    if(m(/Carry|Farmer|Suitcase|Grip|Pinch|Dead Hang/i)) return { mu:"Grip · traps · core · whole body", cues:["Stand tall, shoulders back, ribs down.","Brace the core, walk with control.","Crush the handles — strong grip.","Don't lean; resist any tilt."], miss:["Leaning or rounding under the load.","Rushing / losing posture."] };
    if(m(/Leg Raise|Knee Raise|Crunch|Sit.?up|Ab Wheel|Rollout/i)) return { mu:"Abs · hip flexors", cues:["Hang (or lie) still, ribs down.","Curl the pelvis up — lift with the abs, not a swing.","Raise the knees or legs as high as you can control.","Lower slowly, no swinging."], miss:["Swinging for momentum.","Arching the low back on the way down."] };
    if(m(/Plank|Dead ?Bug|Hollow|Bird ?Dog|Core| Ab|Abs/i)) return { mu:"Deep core · abs · obliques", cues:["Ribs down, squeeze glutes, flat line head-to-heels.","Brace like you're about to be punched.","Breathe behind the brace.","Quality over time — stop when form breaks."], miss:["Hips sagging or piking up.","Holding your breath."] };
    if(m(/Overhead.*Triceps|Triceps.*Extension/i)) return { mu:"Triceps (long head)", cues:["Face away from the cable (or hold the dumbbell overhead).","Lower the hands behind your head — get the deep stretch.","Extend to lockout, elbows pointing forward.","Ribs down — don't arch the lower back."], miss:["Elbows flaring wide.","Cutting the stretch short."] };
    if(m(/Curl|Tricep|Bicep|Wrist|Forearm|Preacher|Pushdown|Skull|Kickback|JM Press|Tate Press|\bArms?\b/i)) return { mu:"Arms (biceps / triceps / forearms)", cues:["Pin the elbows, strict tempo.","Full range — stretch and squeeze.","Control the lowering.","No swinging or body english."], miss:["Swinging the weight up with momentum.","Cutting the range short."] };
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
        '<p><b>Gym version:</b> add a little <b>load</b> to the loaded speed moves (trap-bar jump, speed bench) — <i>but only while every rep still flies.</i> If the bar slows, drop back. Keep the speed; nudge the load.</p>'+
        '<p><b>Field version:</b> progress by <b>output</b> — jump a little higher, throw a little farther — and slowly ramp your overspeed swings.</p>'+
        '<p><b>The real scoreboard:</b> retest your <b>7-iron and driver every couple of weeks</b>. That number climbing is the progression that actually matters — everything above is just the input.</p></div>'+
      '</div></details>';
  }
  function whyHtml(name, withCoach){
    var w=liftWhy(name);
    return '<div class="why-why">'+w.why+'</div>'+
      '<div class="why-cue">⚡ <b>Power cue:</b> '+w.cue+'</div>'+
      '<button class="why-howto" data-howto="'+escAttr(name)+'">'+ffIcon("play",12)+' How to do it · muscles &amp; form</button>'+
      (withCoach!==false ? '<button class="why-coach" data-whycoach="'+escAttr(name)+'">💬 Go deeper with the coach</button>' : '');
  }
  // ---- exercise demo sheet (how-to) ----
  function openExDemo(name){
    var f=exerciseForm(name), w=liftWhy(name);
    var html='<div class="ed-mu">💪 <b>Works:</b> '+f.mu+'</div>'+
      '<div class="ed-sec"><h4>How to do it</h4><ol class="ed-cues">'+f.cues.map(function(c){return '<li>'+c+'</li>';}).join("")+'</ol></div>'+
      '<div class="ed-sec"><h4>Common mistakes</h4><ul class="ed-miss">'+f.miss.map(function(c){return '<li>'+c+'</li>';}).join("")+'</ul></div>'+
      '<div class="ed-why">⚡ <b>For your swing:</b> '+w.why+'</div>'+
      '<a class="ed-video" href="'+formVideoUrl(name)+'" target="_blank" rel="noopener">'+ffIcon("play",12)+' Watch a form video</a>';
    var b=$("exDemoBody"); if(b) b.innerHTML=html;
    var t=$("exDemoTitle"); if(t) t.textContent=name;
    var mo=$("exDemoModal"); if(mo){ mo.hidden=false; document.body.style.overflow="hidden"; }
  }
  function closeExDemo(){ var mo=$("exDemoModal"); if(mo) mo.hidden=true;
    document.body.style.overflow=(typeof player!=="undefined" && player)?"hidden":""; }
