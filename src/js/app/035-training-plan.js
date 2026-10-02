  /* ===================== TRAINING PLAN ===================== */
  // Each phase: a 4-day and 5-day weekly schedule. Days have a type + exercise list.
  // One consistent, concurrent week — run for the full 20 weeks (see reference doc for the evidence).
  var PHASES = [
    {
      id: "main", title: "Your Weekly Program", goal: "build mass and clubhead speed together",
      blurb: "One smart concurrent week, run in waves for all 20 — the essentials:",
      chips: ["💪 Size + strength + speed every week", "🌊 Build → heavy → deload waves", "📈 Overload applied for you", "🏁 2-week peak to finish"],
      speed: {
        title: "Speed & Power",
        note: "Jumps and throws are the strongest predictors of clubhead speed, so they lead. Overspeed swings are a lighter add-on. Your own speed trend is the real proof.",
        field: {
          intro: "Jumps and throws turn muscle into clubhead speed. Do them first, fresh \u2014 max intent, full rest, low reps. Stop the moment a rep slows.",
          ex: [
            ["Countermovement jump", "4 \u00d7 3", "Dip and explode straight up \u2014 max height, land soft, full recovery between reps. (The #1 physical predictor of clubhead speed.)"],
            ["Rotational med-ball throw", "4 \u00d7 4 / side", "Rotate and release at max speed; reset every rep. Both sides."],
            ["Seated chest throw", "3 \u00d7 4", "Sit on the floor, explosive chest pass \u2014 pure upper-body pop, no legs."],
            ["Overhead med-ball slam", "3 \u00d7 4", "Full overhead reach, slam hard \u2014 total-body vertical power."],
            ["Lateral bound", "3 \u00d7 4 / side", "Explosive side-to-side \u2014 the downswing weight shift."],
            ["Ground-force footwork", "3 \u00d7 5 / side", "Lead-foot push \u2014 drive into the ground from the top of the swing."],
            ["Overspeed swings", "3 \u00d7 5", "Light stick (or your driver flipped) at MAX intent, both sides, full rest. Structured ramp: 2\u00d75 your first two weeks \u2192 3\u00d75 \u2192 4\u00d75 as you adapt; deload weeks drop back to 2\u00d75. Modest evidence \u2014 the add-on, not the main event."]
          ]
        },
        gym: {
          intro: "Same power, loaded \u2014 light weight moved at max speed, full rest, low reps. Explosive work first, while fresh. If a rep slows, the set's done.",
          ex: [
            ["Trap-bar jump", "4 \u00d7 3", "Light load \u2014 explode straight off the ground, land soft, full recovery. (No trap bar? Dumbbell jump squat.)"],
            ["Landmine rotational throw", "4 \u00d7 4 / side", "Drive from the hips and rotate the bar across at max speed. (No landmine? Fast cable or band chop.)"],
            ["Speed bench press", "4 \u00d7 4", "Light bar (~half your usual) \u2014 push every rep up as fast as you can. Upper-body speed; not a true throw, since the bar slows at the top. (Or an explosive DB push press.)"],
            ["Kettlebell swing", "3 \u00d7 6", "Explosive hip snap \u2014 the ground force that starts the downswing. Hips, not arms."],
            ["Cable lateral chop", "3 \u00d7 4 / side", "Explosive rotation across the body \u2014 the weight shift. (A band works too.)"],
            ["Overspeed swings", "3 \u00d7 5", "Light stick (or your driver flipped) at MAX intent, both sides, full rest. Structured ramp: 2\u00d75 your first two weeks \u2192 3\u00d75 \u2192 4\u00d75 as you adapt; deload weeks drop back to 2\u00d75. Modest evidence \u2014 the add-on, not the main event."]
          ]
        }
      },
      days5: [
        { name:"Day 1 \u2014 Lower (Quads)", tag:"Lift", ex:[
          ["Leg Press","4 \u00d7 6 (heavy \u00b7 fast up)"],["Romanian Deadlift","3 \u00d7 8"],["Walking Lunge","3 \u00d7 10 / leg"],
          ["Leg Extension","3 \u00d7 12"],["Standing Calf Raise","4 \u00d7 12"],["Hanging Leg Raise","3 \u00d7 12"]
        ]},
        { name:"Day 2 \u2014 Upper (Push)", tag:"Lift", ex:[
          ["Barbell Bench Press","4 \u00d7 5 (heavy \u00b7 fast up)"],["Incline DB Press","3 \u00d7 10"],["Standing Overhead Press","4 \u00d7 6"],
          ["Single-Arm DB Bench Press","3 \u00d7 8 / side"],["Lateral Raise","3 \u00d7 15"],["Cable Overhead Triceps Extension","3 \u00d7 12"],["Cable Wood-chop","3 \u00d7 10 / side"]
        ]},
        { name:"Rest / Play 18", tag:"rest", type:"rest" },
        { name:"Day 3 \u2014 Speed & Power", tag:"speed", type:"speed" },
        { name:"Day 4 \u2014 Lower (Hinge + Power)", tag:"Lift", ex:[
          ["Seated Leg Curl","3 \u00d7 12"],["Deadlift","4 \u00d7 4 (heavy \u00b7 fast up)"],["Hip Thrust","4 \u00d7 8"],
          ["Bulgarian Split Squat","3 \u00d7 8 / leg"],["Pallof Press","3 \u00d7 12 / side"],["Farmer Carry","3 \u00d7 40 yd"]
        ]},
        { name:"Day 5 \u2014 Upper (Pull + Rotate)", tag:"Lift", ex:[
          ["Weighted Pull-up","4 \u00d7 6 (fast up)"],["Chest-Supported Row","4 \u00d7 8"],["Lat Pulldown","3 \u00d7 12"],["Single-Arm DB Row","3 \u00d7 8 / side"],
          ["Face Pull","3 \u00d7 15"],["DB Curl","3 \u00d7 12"],["Wrist Curl + Reverse","2 \u00d7 15"]
        ]},
        { name:"Rest / Play 18", tag:"rest", type:"rest" }
      ],
      days4: [
        { name:"Day 1 \u2014 Lower (Quads & Hinge)", tag:"Lift", ex:[
          ["Romanian Deadlift","4 \u00d7 6 (heavy \u00b7 fast up)"],["Leg Press","4 \u00d7 6"],["Hip Thrust","3 \u00d7 8"],["Walking Lunge","3 \u00d7 10 / leg"],
          ["Leg Extension","3 \u00d7 12"],["Seated Leg Curl","3 \u00d7 12"],["Standing Calf Raise","3 \u00d7 12"],["Pallof Press","3 \u00d7 12 / side"]
        ]},
        { name:"Day 2 \u2014 Upper (Push)", tag:"Lift", ex:[
          ["Barbell Bench Press","4 \u00d7 5 (heavy \u00b7 fast up)"],["Incline DB Press","3 \u00d7 10"],["Standing Overhead Press","4 \u00d7 6"],
          ["Single-Arm DB Bench Press","3 \u00d7 8 / side"],["Lateral Raise","3 \u00d7 15"],["Cable Overhead Triceps Extension","3 \u00d7 12"],["Cable Wood-chop","3 \u00d7 10 / side"]
        ]},
        { name:"Rest / Play 18", tag:"rest", type:"rest" },
        { name:"Day 3 \u2014 Speed & Power", tag:"speed", type:"speed" },
        { name:"Rest / Play 18", tag:"rest", type:"rest" },
        { name:"Day 4 \u2014 Upper (Pull + Rotate)", tag:"Lift", ex:[
          ["Weighted Pull-up","4 \u00d7 6 (fast up)"],["Chest-Supported Row","4 \u00d7 8"],["Lat Pulldown","3 \u00d7 12"],["Single-Arm DB Row","3 \u00d7 8 / side"],
          ["Face Pull","3 \u00d7 15"],["DB Curl","3 \u00d7 12"],["Wrist Curl + Reverse","2 \u00d7 15"]
        ]},
        { name:"Rest / Play 18", tag:"rest", type:"rest" }
      ]
    }
  ];

  /* ---- Equipment & exercise substitution ---- */
  var EQUIPMENT = [
    { key:"bodyweight", label:"Bodyweight only", locked:true },
    { key:"dumbbells",  label:"Dumbbells" },
    { key:"barbell",    label:"Barbell & plates" },
    { key:"bench",      label:"Adjustable bench" },
    { key:"pullupbar",  label:"Pull-up bar" },
    { key:"kettlebell", label:"Kettlebell" },
    { key:"bands",      label:"Resistance bands" },
    { key:"medball",    label:"Medicine ball" },
    { key:"box",        label:"Plyo box / step" }
  ];
  // Gym machines/cables — grouped under one master chip, individually selectable.
  var MACHINES = [
    { key:"legpress",     label:"Leg press" },
    { key:"hacksquat",    label:"Hack squat" },
    { key:"legext",       label:"Leg extension" },
    { key:"legcurl",      label:"Leg / ham curl" },
    { key:"hipthrustm",   label:"Hip thrust machine" },
    { key:"abductor",     label:"Hip ab / adductor" },
    { key:"calfmachine",  label:"Calf machine" },
    { key:"smith",        label:"Smith machine" },
    { key:"latpulldown",  label:"Lat pulldown" },
    { key:"seatedrow",    label:"Seated cable row" },
    { key:"tbarrow",      label:"T-bar row" },
    { key:"chestpress",   label:"Chest press" },
    { key:"pecdeck",      label:"Pec deck / fly" },
    { key:"shoulderpress",label:"Shoulder press" },
    { key:"assisted",     label:"Assisted pull-up / dip" },
    { key:"preacher",     label:"Preacher / arm curl" },
    { key:"cable",        label:"Cable column" }
  ];
  var MACHINE_KEYS = MACHINES.map(function(m){ return m.key; });
  var EQ_PRESETS = {
    full:      EQUIPMENT.map(function(e){return e.key;}).concat(MACHINE_KEYS),   // everything
    home:      ["bodyweight","dumbbells","bench","pullupbar","kettlebell","bands","box"], // typical home setup
    minimal:   ["bodyweight","bands"],                                           // bodyweight + a band
    bodyweight:["bodyweight"]                                                    // nothing but you
  };
  function applyEquipPreset(name){
    var keys=EQ_PRESETS[name]; if(!keys) return;
    EQUIPMENT.forEach(function(eq){ planState.equip[eq.key] = keys.indexOf(eq.key)!==-1; });
    MACHINE_KEYS.forEach(function(mk){ planState.equip[mk] = keys.indexOf(mk)!==-1; });
    planState.equip.bodyweight=true;
  }
  function eqLabel(k){
    var i; for(i=0;i<EQUIPMENT.length;i++){ if(EQUIPMENT[i].key===k) return EQUIPMENT[i].label; }
    for(i=0;i<MACHINES.length;i++){ if(MACHINES[i].key===k) return MACHINES[i].label; }
    return k;
  }

  // Exercise -> required equipment + ordered fallbacks. Keyed by base name (parentheticals stripped).
  var EX = {
    "Back Squat":{needs:["barbell"],subs:[{needs:["dumbbells"],name:"Goblet Squat"},{needs:["bodyweight"],name:"Tempo Bodyweight Squat (3-1-1, +1.5 reps)",sr:"3 \u00d7 12"}]},
    "Front Squat":{needs:["barbell"],subs:[{needs:["dumbbells"],name:"Goblet Squat"},{needs:["bodyweight"],name:"Tempo Bodyweight Squat",sr:"3 \u00d7 12"}]},
    "Romanian Deadlift":{needs:["barbell"],subs:[{needs:["dumbbells"],name:"DB Romanian Deadlift"},{needs:["kettlebell"],name:"Kettlebell RDL"},{needs:["bodyweight"],name:"Single-leg RDL",sr:"3 \u00d7 10 / leg"}]},
    "Leg Press":{needs:["legpress"],subs:[{needs:["dumbbells"],name:"Goblet Squat"},{needs:["bodyweight"],name:"Walking Lunge",sr:"3 \u00d7 10 / leg"},{needs:["bodyweight"],name:"Tempo Bodyweight Squat (3-1-1, +1.5 reps)",sr:"3 \u00d7 12"}]},
    "Hanging Leg Raise":{needs:["pullupbar"],subs:[{needs:["bodyweight"],name:"Lying Leg Raise"}]},
    "Incline DB Press":{needs:["dumbbells"],subs:[{needs:["bodyweight"],name:"Decline / Feet-elevated Push-up",sr:"3 \u00d7 10 (too hard? feet on the floor)"}]},
    "Flat Barbell Bench":{needs:["barbell","bench"],subs:[{needs:["dumbbells","bench"],name:"Flat DB Bench Press"},{needs:["dumbbells"],name:"Floor DB Press"},{needs:["bodyweight"],name:"Push-up (weighted / feet-elevated)",sr:"3 \u00d7 10 (too hard? hands on a bench)"}]},
    "Barbell Bench Press":{needs:["barbell","bench"],subs:[{needs:["dumbbells","bench"],name:"Flat DB Bench Press"},{needs:["dumbbells"],name:"Floor DB Press"},{needs:["bodyweight"],name:"Push-up (weighted / feet-elevated)",sr:"3 \u00d7 10 (too hard? hands on a bench)"}]},
    "Single-Arm DB Bench Press":{needs:["dumbbells"],subs:[{needs:["bands"],name:"Single-Arm Band Press"},{needs:["bodyweight"],name:"Archer Push-up",sr:"3 \u00d7 6 / side (too hard? plain push-ups)"}]},
    "Seated DB Shoulder Press":{needs:["dumbbells"],subs:[{needs:["bands"],name:"Band Overhead Press"},{needs:["bodyweight"],name:"Pike Push-up",sr:"3 \u00d7 8 (too hard? hands on a bench)"}]},
    "Standing Overhead Press":{needs:["barbell"],subs:[{needs:["dumbbells"],name:"Standing DB Press"},{needs:["bands"],name:"Band Overhead Press"},{needs:["bodyweight"],name:"Pike Push-up",sr:"3 \u00d7 8 (too hard? hands on a bench)"}]},
    "Lateral Raise":{needs:["dumbbells"],subs:[{needs:["bands"],name:"Band Lateral Raise"}]},
    // Overhead (long-head stretch) beat pushdowns for triceps growth, 19.9% vs
    // 13.5% (Maeo 2023) — the plan's default since the Sep 2026 evidence update.
    "Cable Overhead Triceps Extension":{needs:["cable"],subs:[{needs:["dumbbells"],name:"Overhead Triceps Extension"},{needs:["bands"],name:"Band Overhead Triceps Extension"},{needs:["bodyweight"],name:"Diamond Push-up",sr:"3 \u00d7 10 (too hard? knees down)"}]},
    "Cable Triceps Pushdown":{needs:["cable"],subs:[{needs:["bands"],name:"Band Triceps Pushdown"},{needs:["bodyweight"],name:"Diamond Push-up",sr:"3 \u00d7 10 (too hard? knees down)"}]},
    "Cable Wood-chop":{needs:["cable"],subs:[{needs:["bands"],name:"Band Wood-chop"},{needs:["medball"],name:"Med-Ball Rotational Throw"},{needs:["bodyweight"],name:"Speed Russian Twist"}]},
    "Deadlift":{needs:["barbell"],subs:[{needs:["dumbbells"],name:"DB Romanian Deadlift"},{needs:["kettlebell"],name:"Kettlebell Deadlift"},{needs:["bodyweight"],name:"Single-leg RDL",sr:"3 \u00d7 10 / leg"}]},
    "Hip Thrust":{needs:["barbell","bench"],subs:[{needs:["dumbbells","bench"],name:"DB Hip Thrust"},{needs:["bodyweight"],name:"Single-leg Glute Bridge",sr:"3 \u00d7 12 / leg"}]},
    "Leg Extension":{needs:["legext"],subs:[{needs:["bodyweight"],name:"Sissy Squat",sr:"3 \u00d7 8 (hold a support, part range OK)"}]},
    "Leg Curl":{needs:["legcurl"],subs:[{needs:["bands"],name:"Band Leg Curl"},{needs:["bodyweight"],name:"Nordic / Slider Leg Curl",sr:"2 \u00d7 5 (slow lowering only, sliders OK)"}]},
    "Seated Leg Curl":{needs:["legcurl"],subs:[{needs:["bands"],name:"Band Leg Curl"},{needs:["bodyweight"],name:"Nordic / Slider Leg Curl",sr:"2 \u00d7 5 (slow lowering only, sliders OK)"}]},
    "Lying Leg Curl":{needs:["legcurl"],subs:[{needs:["bands"],name:"Band Leg Curl"},{needs:["bodyweight"],name:"Nordic / Slider Leg Curl",sr:"2 \u00d7 5 (slow lowering only, sliders OK)"}]},
    "Pallof Press":{needs:["cable"],subs:[{needs:["bands"],name:"Band Pallof Press"},{needs:["bodyweight"],name:"Side Plank",sr:"3 \u00d7 30 s / side"}]},
    "Farmer Carry":{needs:["dumbbells"],subs:[{needs:["kettlebell"],name:"Kettlebell Carry"},{needs:["bodyweight"],name:"Loaded Carry (backpack / any heavy object)"}]},
    "Weighted Pull-up":{needs:["pullupbar"],subs:[{needs:["latpulldown"],name:"Lat Pulldown"},{needs:["bands"],name:"Band Lat Pulldown"},{needs:["dumbbells"],name:"DB Row"},{needs:["bodyweight"],name:"Inverted Row (under a sturdy table)"}]},
    "Pull-up":{needs:["pullupbar"],subs:[{needs:["latpulldown"],name:"Lat Pulldown"},{needs:["bands"],name:"Band Lat Pulldown"},{needs:["dumbbells"],name:"DB Row"},{needs:["bodyweight"],name:"Inverted Row"}]},
    "Chest-Supported Row":{needs:["dumbbells"],subs:[{needs:["bands"],name:"Band Row"},{needs:["bodyweight"],name:"Inverted Row"},{needs:["bodyweight"],name:"Doorframe Row"}]},
    "Single-Arm DB Row":{needs:["dumbbells"],subs:[{needs:["kettlebell"],name:"Single-Arm Kettlebell Row"},{needs:["bands"],name:"Single-Arm Band Row"},{needs:["bodyweight"],name:"Inverted Row"},{needs:["bodyweight"],name:"Single-Arm Doorframe Row"}]},
    "Wrist Curl + Reverse":{needs:["dumbbells"],subs:[{needs:["barbell"],name:"Barbell Wrist Curl + Reverse"},{needs:["bands"],name:"Band Wrist Curl"},{needs:["bodyweight"],name:"Towel / Plate Pinch Hold",sr:"3 \u00d7 30 s"}]},
    "Lat Pulldown":{needs:["latpulldown"],subs:[{needs:["pullupbar"],name:"Pull-up / Band-assisted Pull-up"},{needs:["bands"],name:"Band Lat Pulldown"},{needs:["bodyweight"],name:"Inverted Row"},{needs:["bodyweight"],name:"Sliding Floor Lat Pull"}]},
    "Face Pull":{needs:["cable"],subs:[{needs:["bands"],name:"Band Face Pull"},{needs:["dumbbells"],name:"Rear-Delt Raise"},{needs:["bodyweight"],name:"Prone Y-T-W Raises"}]},
    "DB Curl":{needs:["dumbbells"],subs:[{needs:["bands"],name:"Band Curl"}]},
    "Hammer Curl":{needs:["dumbbells"],subs:[{needs:["bands"],name:"Band Hammer Curl"}]},
    "Weighted Dip":{needs:["bench"],subs:[{needs:["bodyweight"],name:"Push-up / Bench Dip"}]},
    "Pendlay Row":{needs:["barbell"],subs:[{needs:["dumbbells"],name:"DB Row"},{needs:["bands"],name:"Band Row"},{needs:["bodyweight"],name:"Inverted Row"}]},
    "Box Jump":{needs:["box"],subs:[{needs:["bodyweight"],name:"Squat Jump / Tuck Jump"}]},
    "Anti-rotation Cable Hold":{needs:["cable"],subs:[{needs:["bands"],name:"Band Anti-rotation Hold"},{needs:["bodyweight"],name:"Plank Hold",sr:"3 \u00d7 30 s"}]},
    "Speed Bench":{needs:["barbell","bench"],subs:[{needs:["dumbbells"],name:"Explosive DB Floor Press"},{needs:["bodyweight"],name:"Explosive / Clap Push-up"}]},
    "Med-Ball Chest Pass":{needs:["medball"],subs:[{needs:["bands"],name:"Band Explosive Press"},{needs:["bodyweight"],name:"Clap Push-up"}]},
    "Cable Rotational Punch":{needs:["cable"],subs:[{needs:["bands"],name:"Band Rotational Punch"},{needs:["medball"],name:"Med-Ball Side Throw"},{needs:["bodyweight"],name:"Speed Russian Twist"}]},
    "Landmine Rotation":{needs:["barbell"],subs:[{needs:["medball"],name:"Med-Ball Rotational Throw"},{needs:["bands"],name:"Band Rotation"},{needs:["bodyweight"],name:"Speed Russian Twist"}]},
    "Hang Power Clean / KB Swing":{needs:["barbell"],subs:[{needs:["kettlebell"],name:"Kettlebell Swing"},{needs:["dumbbells"],name:"DB Swing / High Pull"},{needs:["bodyweight"],name:"Broad Jump"}]},
    "Rotational Med-Ball Throw":{needs:["medball"],subs:[{needs:["bands"],name:"Band Rotational Throw"},{needs:["cable"],name:"Cable Rotation"},{needs:["bodyweight"],name:"Speed Russian Twist"}]}
  };
  function normName(n){ return n.replace(/\([^)]*\)/g,"").replace(/\s+/g," ").trim(); }
  function have(k){ return !!planState.equip[k]; }
  /* Infer what gear a lift needs from its name — the EX map is authoritative for
     the ~40 programmed lifts; everything else in the 250-lift library is classified
     by pattern. "machine-any" = any selected machine counts. Imperfect inference is
     fine: unmet needs only BADGE and SORT options in the pickers, never hide them. */
  function equipNeedsFor(name){
    var e=EX[normName(name)]; if(e) return e.needs;
    var n=name||""; function m(re){ return re.test(n); }
    if(m(/Smith/i)) return ["smith"];
    if(m(/Leg Press/i)) return ["legpress"];
    if(m(/Hack Squat|Pendulum Squat/i)) return ["hacksquat"];
    if(m(/Leg Extension/i)) return ["legext"];
    if(m(/Leg Curl|Glute-?Ham Raise/i)) return ["legcurl"];
    if(m(/Pec Deck/i)) return ["pecdeck"];
    if(m(/(Machine|Plate-?Loaded).*Shoulder Press/i)) return ["shoulderpress"];
    if(m(/(Machine|Plate-?Loaded).*(Chest|Incline) Press/i)) return ["chestpress"];
    if(m(/Pulldown|Cable Pullover/i)) return ["latpulldown"];
    if(m(/Seated Cable Row/i)) return ["seatedrow"];
    if(m(/T-?Bar Row/i)) return ["tbarrow"];
    if(m(/Assisted (Pull|Dip)/i)) return ["assisted"];
    if(m(/Preacher/i)) return ["preacher"];
    if(m(/Cable|Face Pull|Rope /i)) return ["cable"];
    if(m(/Machine|Belt Squat|Reverse Hyper|Hyperextension|Back Extension/i)) return ["machine-any"];
    if(m(/Kettlebell|\bKB\b/i)) return ["kettlebell"];
    if(m(/Med-?Ball|Medicine Ball|Shotput|Scoop Toss/i)) return ["medball"];
    if(m(/\bBand(ed)?\b/i)) return ["bands"];
    if(m(/Box Jump|Depth Jump|Step-?up/i)) return ["box"];
    if(m(/Pull-?up|Chin-?up|Dead Hang|Towel Pull|Hanging (Leg|Knee)/i)) return ["pullupbar"];
    if(m(/\bDB\b|Dumbbell|Goblet|Arnold|Kroc|Meadows|Concentration|Zottman|Tate|Kickback|Farmer|Suitcase/i))
      return m(/Incline|Decline|Flat .*Press|Seal Row|Chest-Supported/i) ? ["dumbbells","bench"] : ["dumbbells"];
    if(m(/Lateral Raise|Rear-?Delt|Front Raise|Shrug|Upright Row|Curl|Skull|Fly\b/i) && !m(/Nordic|Leg Curl/i)) return ["dumbbells"];
    if(m(/Barbell|Bench Press|Deadlift|Back Squat|Front Squat|Safety-Bar|Zercher|Box Squat|Overhead Press|Push Press|Z-?Press|Military|Pendlay|Landmine|EZ-?Bar|Close-?Grip|Good ?Morning|Rack Pull|Snatch|Clean|High Pull|Hip Thrust|Trap-?Bar|Seal Row|JM Press|Floor Press|Wrist Roller|Plate /i))
      return m(/Bench|Incline|Decline|Seal Row|Hip Thrust/i) ? ["barbell","bench"] : ["barbell"];
    if(m(/Weighted Dip|Bench Dip/i)) return ["bench"];
    return [];   // bodyweight / no special gear
  }
  function equipOk(name){
    return equipNeedsFor(name).every(function(k){
      if(k==="machine-any") return MACHINE_KEYS.some(have);
      return have(k);
    });
  }
  function equipNeedsLabel(name){
    return equipNeedsFor(name).map(function(k){ return k==="machine-any"?"a machine":eqLabel(k); }).join(" + ");
  }
  // Speed & Power day: functional "Field" version vs loaded "Gym" version. Remembered once set;
  // otherwise defaulted from equipment (a barbell → you're probably in a gym).
  function speedMode(){
    var m=lsGet("ff_speedmode", null);
    if(m==="field" || m==="gym") return m;
    return have("barbell") ? "gym" : "field";
  }
  // used (optional): normName(lowercased) → true for lifts already on the day. The
  // first valid sub NOT already used wins; if every valid sub is taken, the first
  // valid one is kept (a repeat beats dropping the slot).
  function resolveEx(rawName, sr, used){
    var e = EX[normName(rawName)];
    if(!e) return { name:rawName, sr:sr, status:"ok" };
    if(e.needs.every(have)) return { name:rawName, sr:sr, status:"ok" };
    var first=null;
    for(var i=0;i<e.subs.length;i++){
      if(!e.subs[i].needs.every(have)) continue;
      var hit={ name:e.subs[i].name, sr:e.subs[i].sr||sr, status:"swap" };
      if(!used || !used[normName(hit.name).toLowerCase()]) return hit;
      if(!first) first=hit;
    }
    return first || { name:rawName, sr:sr, status:"skip", need:e.needs };
  }
  // Resolve a whole day's rows at once (user swap first, then gear subs) so the
  // Minimal/Bodyweight presets can't put the same lift in a day twice — e.g. Leg
  // Press → Walking Lunge on a day that already programs Walking Lunge. Lifts that
  // run as written claim their names first; each sub then takes the next valid
  // option nobody on the day has used. buildSession (040) and dayCardHtml both read
  // THIS, so the card and the logged session always agree. Aligned with rows.
  function resolveDay(rows){
    var bases=(rows||[]).map(function(row){ return applySwapName(row[0]); });
    var res=bases.map(function(b, i){ return resolveEx(b, rows[i][1]); });
    var used={};
    res.forEach(function(r){ if(r.status==="ok") used[normName(r.name).toLowerCase()]=true; });
    return res.map(function(r, i){
      if(r.status!=="swap") return r;
      var alt=resolveEx(bases[i], rows[i][1], used);
      used[normName(alt.name).toLowerCase()]=true;
      return alt;
    });
  }

  var planState = { phase: 0, freq: 4, equip: {}, machOpen: false, settingsOpen: false };
  EQUIPMENT.forEach(function(e){ planState.equip[e.key] = true; });
  MACHINE_KEYS.forEach(function(k){ planState.equip[k] = true; });   // default: full gym

  // Equipment editor — lives inside the Plan & settings fold. Set once in
  // onboarding; this is the rare-edit surface. No-ops if the host isn't present.
  function renderEquip(){
    var bar=$("equipBar"); if(!bar) return;
    var chips = EQUIPMENT.map(function(e){
      var on = planState.equip[e.key];
      return '<span class="eq-chip'+(on?" on":"")+(e.locked?" locked":"")+'" data-eq="'+e.key+'">'+e.label+'</span>';
    }).join("");
    var machOn = MACHINE_KEYS.filter(have).length, machAll = machOn===MACHINE_KEYS.length;
    chips += '<span class="eq-chip'+(machOn>0?" on":"")+'" data-eq="machines-master">Machines &amp; cables'+
      (machOn>0 && !machAll ? ' <span class="mach-count">'+machOn+'/'+MACHINE_KEYS.length+'</span>' : '')+'</span>';
    var sub = '';
    if(planState.machOpen){
      sub = '<div class="mach-sub">'+MACHINES.map(function(m){
        return '<span class="eq-chip sm'+(have(m.key)?" on":"")+'" data-eq="'+m.key+'">'+m.label+'</span>';
      }).join("")+'</div>';
    }
    bar.innerHTML='<div class="seteq-label">🏋️ Equipment <small>the plan swaps lifts to match</small></div>'+
       '<div class="equip-presets">'+
       '<button type="button" data-preset="full">Full gym</button>'+
       '<button type="button" data-preset="home">Home gym</button>'+
       '<button type="button" data-preset="minimal">Minimal</button>'+
       '<button type="button" data-preset="bodyweight">Bodyweight</button>'+
       '</div>'+
       '<div class="equip-chips">'+chips+'</div>'+
       '<button type="button" class="mach-expand" data-machexpand="1">'+(planState.machOpen?"▴ hide specific machines":"▾ pick specific machines")+'</button>'+sub+
       '<div class="equip-note">Bodyweight is always on — deselect anything you don\'t own. The <b>Machines &amp; cables</b> chip toggles all of them; tap “pick specific machines” to fine-tune.</div>';
  }
  // Equipment edits are handled by the #phaseDetail delegated listener (the
  // editor now lives inside that subtree). Helper applied there:
  function handleEquipClick(e){
    if(e.target.closest("[data-machexpand]")){ planState.machOpen=!planState.machOpen; renderEquip(); return true; }
    var preset=e.target.closest("[data-preset]");
    if(preset){ applyEquipPreset(preset.getAttribute("data-preset")); renderPhase(); persist(); return true; }
    var chip=e.target.closest("[data-eq]");
    if(chip){
      var k=chip.getAttribute("data-eq");
      if(k==="bodyweight") return true;
      if(k==="machines-master"){
        var allOn = MACHINE_KEYS.every(have);
        MACHINE_KEYS.forEach(function(mk){ planState.equip[mk] = !allOn; });
        renderPhase(); persist(); return true;
      }
      planState.equip[k] = !planState.equip[k];
      renderPhase(); persist(); return true;
    }
    return false;
  }


  function activeDays(){ var p=PHASES[planState.phase]; return planState.freq===4 ? p.days4 : p.days5; }
  // ctx (all optional — the Train card and the player pass what they know):
  //   wave        this week's wave (waveFor)        band   the readiness band
  //   beforeHeavy a 🏋️ lift still comes later today first   no logged weight for this lift yet
  //   onRamp      weeks 1–2 with no lifting logged before this plan (ffOnRamp)
  //   easeIn      first session back after 4+ weeks off this lift (ffDose .back)
  function effortNote(t, name, ctx){
    t=String(t); ctx=ctx||{};
    if(/yd/.test(t)) return "heavy · rest ~90s";
    if(/explosive|jump/i.test(t)) return "max intent · full rest";
    if(/\d\s*s\b/.test(t)) return "steady hold · rest ~90s";   // timed holds ("3 × 30 s / side")
    var m=t.match(/[×x]\s*(\d+)/), reps=m?parseInt(m[1],10):10, heavy=/heavy/i.test(t)||reps<=6;
    // Easy days stay easy: a deload week or a recovery dose leaves 3+ reps in the
    // tank on every lift (Bell 2023 Delphi: a deload lowers proximity to failure).
    if(ctx.wave==="deload" || ctx.band==="recharge") return heavy ? "easy · RIR 3+ · rest 2–3 min" : "easy · RIR 3+ · rest ~90s";
    if(/heavy/i.test(t)) return "RIR 2 · rest 2–3 min";   // heavy compounds keep RIR in any goal
    if(reps<=6) return "RIR 2–3 · rest 2–3 min";
    // On a bulk / lean bulk the HYPERTROPHY ACCESSORY work (💪 only) cashes in the
    // surplus — train it close to failure, last set all the way. Heavy compounds
    // (above) hold RIR 2; power/speed never go to failure (the caller shows
    // "max intent · full rest" for ballistic drills). Cut/maintain keep a rep back.
    // Never to failure: a lift with no weight found yet, the first session back,
    // a beginner's first 2 weeks (beginners grow from sets short of failure), an
    // accessory that comes before a big lift today, peak weeks (shed fatigue),
    // and balance-heavy lunges / split squats / Nordics / sissy squats.
    var bulk=(typeof state!=="undefined" && (state.goal==="bulk" || state.goal==="leanbulk"));
    if(bulk && name && typeof purposeFor==="function" && purposeFor(name)==="💪"){
      if(ctx.first) return "RIR 2 · find your working weight · rest ~90s";
      if(ctx.easeIn) return "RIR 2 · easing back in · rest ~90s";
      if(ctx.onRamp) return "RIR 2 · first 2 weeks: no all-out sets · rest ~90s";
      if(ctx.beforeHeavy) return "RIR 2 · save it for the big lift · rest ~90s";
      if(ctx.wave!=="peak" && !/Lunge|Split Squat|Step-?up|Nordic|Sissy/i.test(name))
        return "RIR 0–1 · last set to failure · rest ~90s";
    }
    if(reps>=13) return "RIR 1 · rest ~90s";   // >60–90 s beats shorter for growth (Singer 2024)
    return "RIR 1–2 · rest ~90s";
  }
  // The on-ramp: no workout logged before this plan started (a brand-new lifter)
  // → weeks 1–2 keep a couple of reps in reserve on every set.
  function ffOnRamp(week){
    if(!(week<=2)) return false;
    var st=Date.parse(planStart()||"")||(Date.now()+864e5), h=lsGet("ff_history",[]);
    return !(Array.isArray(h) && h.some(function(e){ return e && (e.doneTs||e.ts||0) < st; }));
  }
  // Is a 🏋️ lift still to come after position i in today's list of names?
  function heavyAfter(names, i){
    for(var j=i+1;j<names.length;j++) if(purposeFor(names[j]||"")==="🏋️") return true;
    return false;
  }
  // Warm-up & power primer as scannable, tappable checklists (gym-readable).
  function warmupBase(name){
    // Speed day: mobility, then a short ramp of easy jumps and throws before the
    // first max-intent drill (the lift days get "Light ramp-up sets" the same way).
    if(name==="speed") return [["90/90 hip switches","×6/side"],["Open-book T-spine","×8/side"],["Leg swings","×10/side"],["Build-up swings","10–15 · 50→90%"],["Ramp-up jumps and throws","2–3 easy reps each"]];
    if(/Pull|Rotate/.test(name)) return [["Cat–cow","×8"],["Open-book T-spine","×8/side"],["Band pull-aparts","×20"],["Dead hang","20s"]];
    if(/Push|Upper/.test(name)) return [["Open-book rotation","×8/side"],["Band pull-aparts","×20"],["Shoulder CARs","×5/side"],["Light ramp-up sets","×2"]];
    if(/Lower|Squat|Hinge/.test(name)) return [["Leg swings","×10/side"],["90/90 hip switches","×8/side"],["World's greatest stretch","×5/side"],["Light ramp-up sets","×2"]];
    return [["Dynamic flow","5 min"],["Mobilize hips & T-spine","—"],["Ramp to working weight","×2 sets"]];
  }
  // Mobility-screen routing: anything the 3-move screen flagged adds a targeted move
  // to the relevant warm-ups (marked so the user knows why it's there). If the day's
  // list already has the primary fix, the alternate goes in instead — never a dupe.
  function warmupList(name){
    var list=warmupBase(name), lim=(typeof mobLimits==="function")?mobLimits():{};
    var lower=(name==="speed") || /Lower|Squat|Hinge/.test(name);
    var upper=(name==="speed") || /Pull|Rotate|Push|Upper/.test(name);
    var prep=(typeof state!=="undefined"&&Array.isArray(state.prep))?state.prep:[];
    function addFix(primary, alt, alreadyRe, source){
      var has=list.some(function(m){ return alreadyRe.test(m[0]); });
      var pick = has ? alt : primary;
      if(pick && !list.some(function(m){ return m[0]===pick[0]; })) list.push([pick[0], pick[1], source||"screen"]);
    }
    if(lim.trunk) addFix(["Open-book T-spine","×8/side"], ["Thread-the-needle","×6/side"], /open.?book/i);
    if(lim.hip && lower) addFix(["90/90 hip switches","×8/side"], ["Adductor rock-back","×8/side"], /90\/90/);
    if(lim.squat && lower){ addFix(["Deep squat hold (hold a support)","3 × 20s"], null, /deep squat/i); addFix(["Ankle rockers","×10/side"], null, /ankle/i); }
    // Setup can add conservative preparation—not diagnose or replace the
    // mobility screen. The screen remains the higher-confidence adjustment.
    if(prep.indexOf("back")!==-1) addFix(["Bird dog","×6/side"], ["Cat–cow","×8"], /bird dog|cat.?cow/i, "profile");
    if(prep.indexOf("hips")!==-1 && lower) addFix(["90/90 hip switches","×8/side"], ["Adductor rock-back","×8/side"], /90\/90/i, "profile");
    if(prep.indexOf("shoulders")!==-1 && upper) addFix(["Shoulder CARs","×5/side"], ["Band pull-aparts","×20"], /shoulder cars|pull-apart/i, "profile");
    if(prep.indexOf("knees")!==-1 && lower) addFix(["Supported split-squat hold","2 × 20s/side"], ["Reverse lunge (bodyweight)","×6/side"], /split.?squat hold|reverse lunge/i, "profile");
    return list;
  }
  function primerFor(name){
    if(/Pull|Rotate/.test(name)) return {move:"Rotational med-ball throw", dose:"4 × 4 / side", note:"No ball? Band or cable rotation."};
    if(/Push/.test(name)) return {move:"Explosive med-ball chest pass", dose:"4 × 4", note:"No ball? Clap or explosive push-up."};
    // "Quads" too: the 4-day "Lower (Quads & Hinge)" day lost its jump when the
    // day was renamed from "Squat" — jumps are the top speed predictor (Brennan 2024).
    if(/Squat|Quads/.test(name)) return {move:"Box or squat jump", dose:"4 × 3", note:"Land soft, reset every rep."};
    if(/Hinge/.test(name)) return {move:"Russian kettlebell swing", dose:"5 × 5", note:"No kettlebell? Swing a dumbbell."};
    if(/Lower/.test(name)) return {move:"Box or squat jump", dose:"4 × 3", note:"Land soft, reset every rep."};
    return {move:"Box or squat jump", dose:"4 × 3", note:""};
  }
  var PRIMER_NOTE = "New to jumps &amp; throws? Start with 2 sets and build up. Stop the moment reps slow — power only counts when crisp.";
  function warmupHtml(name, withPrimer, showNote){
    var h='<div class="wu"><div class="wu-h">🔥 Warm-up <span>· 5 min · tap to check off</span></div>';
    warmupList(name).forEach(function(m){
      h+='<button type="button" class="wu-row'+(m[2]==="screen"?' from-screen':(m[2]==="profile"?' from-profile':''))+'" data-wu="1"><span class="wu-move">'+m[0]+'</span><span class="wu-dose">'+m[1]+'</span></button>';
    });
    if(withPrimer){
      var p=primerFor(name);
      h+='<div class="wu-h">⚡ Power primer <span>· do this first, fresh · max intent</span></div>'+
        '<button type="button" class="wu-row primer" data-wu="1"><span class="wu-move">'+p.move+'</span><span class="wu-dose">'+p.dose+'</span></button>';
      if(p.note) h+='<div class="wu-note">'+p.note+'</div>';
      if(showNote) h+='<div class="wu-note caution">⚠️ '+PRIMER_NOTE+'</div>';
    } else if(showNote) h+='<div class="wu-note caution">⚠️ '+PRIMER_NOTE+'</div>';   // speed day: same beginner caution
    return h+'</div>';
  }
  // One-glance purpose tag per exercise: 🏋️ strength · 💪 mass · ⚡ power/speed · 🌀 golf rotation
  function purposeFor(n){
    if(/Single-Arm/i.test(n)) return "🌀";
    // Rotation before power, so rotational throws/chops stay 🌀. "Landmine Press" is a
    // chest press and "Landmine Squat" a squat, not rotation — excluded so the wave
    // doesn't shield them from intensify.
    if(/Wood-?chop|\bChop\b|Rotation|Rotational|Pallof|Landmine(?! Press| Squat)|Punch|Russian Twist/i.test(n)) return "🌀";
    // Ballistic/velocity work: throws, tosses, cleans and "Speed X" lifts are ⚡ — the wave
    // must never hand them the 🏋️ "drop reps, go heavier" prescription or trim them like
    // 💪 accessories. They hold full doses and only ease at deload/peak.
    if(/Jump|Bound|Slam|Chest Pass|Throw|Toss|\bClean\b|Overspeed|Footwork|Swing|Broad|Plyo|^Speed\s/i.test(n)) return "⚡";
    if(/Back Squat|Front Squat|Leg Press|Hack Squat|Bench Press|Deadlift|Overhead Press|Pull-up|Romanian/i.test(n)) return "🏋️";
    return "💪";
  }
  // Max-intent ballistic work: every ⚡ power drill, PLUS the rotational THROWS/CHOPS/
  // PUNCHES/SLAMS that classify 🌀 (rotation is tagged before power in purposeFor, so a
  // "Rotational med-ball throw" reads 🌀 not ⚡). These want a "max intent · full rest"
  // cue. It deliberately excludes the OTHER 🌀 names — anti-rotation/iso core (Pallof,
  // Russian Twist, bare Rotation) and Single-Arm accessories (rows, curls, flys) — which
  // are RIR-graded strength/hypertrophy work and keep their effortNote.
  // Chops: only the speed day's "Cable lateral chop" is a max-intent drill — the
  // push day's Cable Wood-chop (3 × 10/side) and the High/Low cable chops are
  // graded rotational core work.
  function isBallistic(n){
    return purposeFor(n)==="⚡" || /Throw|Toss|Slam|Chest Pass|Lateral Chop|Punch/i.test(n);
  }
  // THE "big lift" test — heavy loaded lifts whose e1RM means strength. Shared by
  // the Octane strength pillar, bigLiftStats (Stats, PR/stall cards, the player's
  // PR check), the PR wall and the recap. Speed/ballistic work, throws and
  // anti-rotation core (Pallof) are light by design: a 2.5 lb stack jump there
  // isn't strength. wide = also lunges/split squats (the Stats e1RM list).
  function isBigLift(n, wide){
    n=String(n||"");
    if(isBallistic(n) || /Pallof|Anti-?rotation|Explosive|^Speed\s/i.test(n)) return false;
    return (wide ? /Squat|Deadlift|Bench|Press|\bRow\b|Romanian|Hinge|Hip Thrust|Pull-?up|Chin|Lunge|Split Squat/i
                 : /Squat|Deadlift|Bench|Press|\bRow\b|Romanian|Hinge|Hip Thrust|Pull-?up|Chin/i).test(n);
  }
  // A drill with NO load to log — box/broad/squat/tuck jumps, bounds, depth/drop
  // jumps, plyo push-ups, pogos, skaters, ground-force footwork, and overspeed
  // swings (a light stick at max speed — the "weight" is fixed by the implement).
  // Logged by reps (height/speed × intent), never a weight, so the loggers drop
  // the load field and the prescription copy. Anything explicitly loaded is
  // excluded (trap-bar, dumbbell/DB, barbell/bar, kettlebell/KB, weighted,
  // med-ball, sled, band) — so a Trap-bar jump or KB swing keeps its weight field.
  function isBodyweightEx(n){
    n=n||"";
    if(/Trap-?bar|Dumbbell|\bDB\b|Barbell|\bBar\b|Kettlebell|\bKB\b|Weighted|Med-?ball|Medicine|Landmine|Cable|Band|Sled/i.test(n)) return false;
    return /\bJump\b|\bBound\b|Plyo|Pogo|\bHop\b|Skater|Broad|Overspeed|Footwork/i.test(n);
  }
  // Build vs Retain: derived from the macro goal. Build = full volume (gaining).
  // Retain = trim ONE set off hypertrophy accessories (💪 only) to fit lower recovery
  // in maintenance / a deficit, while heavy strength, power, rotation and ALL speed work
  // stay at full intensity — that's what protects muscle and clubhead speed.
  function trainRetain(){ return state.goal==="maintain" || state.goal==="cut"; }
  function adjSets(sr, name){
    if(!trainRetain() || purposeFor(name)!=="💪") return sr;
    return String(sr).replace(/^(\s*)(\d+)/, function(_, sp, n){ return sp + Math.max(2, parseInt(n,10)-1); });
  }
  /* ---- Periodization wave: the 20 weeks run in 6-week cycles so the plan itself
     changes — Accumulate (volume) → Intensify (heavy) → Deload (recover) — closing
     with a 2-week Peak (volume cut, intensity held). Targets below shift per phase
     and the logger prescribes matching loads, so overload and deloads are applied
     FOR the user instead of living only in the playbook copy.
     Weeks 1-3 · 7-9 · 13-15 accumulate — targets as authored; build reps to the target,
       then the logger adds weight (double progression against ONE target number).
     Weeks 4-5 · 10-11 · 16-17 intensify — big lifts drop ~2 reps (go heavier),
       accessories drop a set so recovery follows the loads up.
     Weeks 6 · 12 · 18 deload — one set less (never below 2 sets), ~60% loads prescribed.
     Weeks 19-20 peak — 🏋️ and 💪 lose 2 sets, ⚡/🌀 1 (floor 2), reps and loads held:
       ~35% fewer weekly sets in Build mode, ~25% in Retain (whose 💪 already sit at 2). ---- */
  var WAVES = {
    // Display labels are plain words ("Heavy week"); the keys stay the
    // periodization terms the engine, tests and wave-cases fixtures use.
    accumulate: { label:"Build", ic:"🏗️", strap:"Same weight until every set hits its target reps — then the app adds weight." },
    intensify:  { label:"Heavy", ic:"🔥", strap:"Fewer reps, heavier weights. Keep every rep fast." },
    deload:     { label:"Easy",  ic:"🪫", strap:"Planned easy week — a set less on most lifts, lighter weights. This is when the gains land." },
    peak:       { label:"Peak",  ic:"🏁", strap:"Less volume, still heavy. Shed the fatigue and take your yards." }
  };
  /* A "big event" date (club champs, member-guest, buddies trip) re-anchors the
     taper: the event week and the week before become Peak (fewer sets, reps and
     loads held — the 7-13 days before the event), and the week after is a
     deload to absorb it. Everything else keeps the base cadence. */
  // Manual-logging preference (device-local): the Today card's spreadsheet is
  // opt-in — the guided player is the default way to train.
  document.addEventListener("click", function(e){
    var b=e.target.closest("[data-manuallog]"); if(!b) return;
    lsSet("ff_manual_log", b.getAttribute("data-manuallog")==="1");
    try{ renderPhase(); }catch(_){}
  });

  function eventInfo(){
    var ev=lsGet("ff_event", null); if(!ev || !ev.date) return null;
    var t=new Date(ev.date+"T12:00:00").getTime(); if(isNaN(t)) return null;
    var out={ ts:t, date:ev.date, name:(ev.name||"").slice(0,40), week:null, past:t < (Date.now()-864e5), taper:false };
    var st=planStart();
    if(st){
      var start=new Date(st); start.setHours(0,0,0,0);
      var days=Math.floor((t-start.getTime())/864e5);
      if(days>=0 && days<140) out.week=Math.floor(days/7)+1;
      // The event re-anchors the wave until the END of the recovery week after it
      // (week ev.week+1) — gating on `past` alone switched the override off the
      // day after the event, so the promised post-event deload never happened.
      if(out.week) out.taper = !out.past || Math.floor((Date.now()-start.getTime())/864e5) < (out.week+1)*7;
    }
    return out;
  }
  function waveFor(week){
    var ev=eventInfo();
    if(ev && ev.week && ev.taper){
      if(week===ev.week || week===ev.week-1) return "peak";
      if(week===ev.week+1) return "deload";
    }
    if(week>=19) return "peak";
    var pos=((week-1)%6)+1;
    // Never two easy weeks in a row: the event's recovery deload (ev.week+1)
    // stands in for a base deload that would land right after it. Keyed on
    // ev.week, not ev.taper — taper has switched off by then.
    if(pos===6 && ev && ev.week && week===ev.week+2) return "accumulate";
    if(pos===6) return "deload";
    if(pos>=4) return "intensify";
    return "accumulate";
  }
  function bumpReps(sr, delta, minReps){
    return String(sr).replace(/([×x]\s*)(\d+)/, function(_, x, n){ return x + Math.max(minReps, parseInt(n,10)+delta); });
  }
  function trimSets(sr, delta){
    return String(sr).replace(/^(\s*)(\d+)/, function(_, sp, n){ return sp + Math.max(2, parseInt(n,10)-delta); });
  }
  // Only shift rep counts on plain rep targets — never distance/time work ("3 × 40 yd").
  function plainReps(sr){ return /[×x]\s*\d+\s*($|\/|\()/.test(String(sr)); }
  function waveAdjust(sr, name, week){
    var w=waveFor(week), p=purposeFor(name);
    if(w==="intensify"){
      if(p==="🏋️" && plainReps(sr)) return bumpReps(sr, -2, 3);
      if(p==="💪") return trimSets(sr, 1);
      return sr;
    }
    if(w==="deload") return trimSets(sr, 1);
    if(w==="peak")   return trimSets(sr, (p==="⚡"||p==="🌀")?1:2);
    return sr;
  }
  // The one target pipeline: retain-mode trim (goal) + wave shift (week).
  function effTarget(sr, name, week){ return waveAdjust(adjSets(sr, name), name, week); }
  // Overspeed swings follow their own structured ramp (a skill/neural dose, not a
  // hypertrophy target): ease in over weeks 1-2, build to 4×5, back off on deload/peak.
  function overspeedDose(week){
    var wv=waveFor(week);
    if(wv==="deload" || wv==="peak" || week<=2) return "2 × 5";
    if(week<=8) return "3 × 5";
    return "4 × 5";
  }
  function speedDrillTarget(name, sr, week){
    if(/Overspeed/i.test(name)) return overspeedDose(week);
    return effTarget(sr, name, week);
  }
  // Prescribed load for a set, from last logged weight: deload → ~60% (ffReduceLoad),
  // progression-ready → last + one small jump (none for a med ball). null = no
  // prescription (show last as-is).
  function prescribeW(lastW, name, ready, wave){
    var w=parseFloat(lastW); if(!(w>0)) return null;
    if(wave==="deload") return ffReduceLoad(w, 0.6);
    var inc=incNum(name);
    if(ready && inc>0) return w + inc;
    return null;
  }
  // THE load reduction — deload (~60%), recovery dose (~75%), easing back in after
  // weeks off (~90%). Fine steps for light loads (1 lb under 10, 2.5 under 25,
  // else 5) and a reduction always reduces: the old Math.max(5, round-to-5)
  // turned a 10 lb recovery dose into 10 lb and a 3 lb deload into 5 lb.
  // null = nothing lighter to suggest.
  function ffReduceLoad(lastW, f){
    var w=parseFloat(lastW); if(!(w>0)) return null;
    var step=w<10 ? 1 : (w<25 ? 2.5 : 5), r=Math.round(w*f/step)*step;
    if(r>=w) r=w-step;
    return r>0 ? r : null;
  }
  // Wave-aware load. A Heavy week drops the rep target (6 → 4) and the week
  // after a Heavy block raises it again, so last time's weight no longer matches
  // today's reps. Same effort at the new rep count (Epley, ~2 in reserve):
  //   lastW × (1 + (rThen+2)/30) / (1 + (rNow+2)/30)
  // from the reps actually done (the weakest working set), capped −15…+10% and
  // rounded to the lift's step. ≈ +5–6% for −2 reps, matching rep-max data
  // (~2.5% a rep near 80–90% 1RM, Nuzzo 2024). null = no rep change (or not a
  // loaded, rep-counted lift).
  function repShiftLoad(lastW, x, lx){
    var w=parseFloat(lastW); if(!(w>0) || !x || !lx || lx._reduced) return null;
    if(isBallistic(x.name) || isBodyweightEx(x.name) || isDistEx(x.target)) return null;
    var rNow=topReps(x.target), rThen=topReps(lx.target);
    if(!rNow || !rThen || rNow===rThen) return null;
    var got=(lx.sets||[]).map(function(st){ return parseInt(st && st.r, 10); }).filter(function(r){ return r>0; });
    var rRef=got.length ? Math.min.apply(null, got) : rThen;
    if(rRef===rNow) return w;
    var f=Math.max(0.85, Math.min(1.10, (1+(rRef+2)/30)/(1+(rNow+2)/30)));
    var step=incNum(x.name)||5, out=Math.round(w*f/step)*step;
    return out>0 ? out : null;
  }
  // One day's full card (rest / speed / lift) — used by both Today and Full-week views.
  // interactive=true → the featured "today" lift day renders the inline logger.
  function dayCardHtml(d, showPrimerNote, interactive){
    var p = PHASES[planState.phase];
    if(d.type==="rest"){
      var rdone=restDone(curWeek(), dayKey(d));
      return '<div class="day'+(rdone?" rest-done":"")+'"><div class="day-head">'+d.name+' <span class="tag rest">Recover</span></div>'+
        '<div class="restday">Walk a casual 9, stretch, foam roll. Recovery is when the gains land.</div>'+
        '<button class="rest-check'+(rdone?" done":"")+'" type="button" data-restday="'+escAttr(dayKey(d))+'">'+
          (rdone?"✓ Recovery logged — tap to undo":"Mark recovery done")+'</button></div>';
    }
    if(d.type==="speed"){
      var smode=speedMode(), s=p.speed[smode];
      var srows = s.ex.map(function(e){
        var id="why"+(whyId++);
        var base=applySwapName(e[0]), swapped=base!==e[0];
        var note=swapped ? ('⚡ '+liftWhy(base).cue) : e[2];
        return '<tr'+(swapped?' class="swap"':'')+'><td><button class="exwhy-btn" type="button" data-whyrow="'+id+'" aria-expanded="false"><span class="exname-main">'+ffPurposeIc(base)+' '+ffEsc(base)+'</span>'+
               (swapped?' <span class="swap-badge">⇄ your swap</span>':'')+' <span class="exwhy-i">ⓘ</span></button>'+
               '<div class="exnote">'+note+'</div></td>'+
               '<td class="sets">'+speedDrillTarget(base, e[1], curWeek())+'</td></tr>'+
               '<tr class="exwhy-row" id="'+id+'" hidden><td colspan="2"><div class="exwhy-panel">'+whyHtml(base,false)+'</div></td></tr>';
      }).join("");
      var noGear = smode==="gym"
        ? "No cable? A band anchored at chest/hip height covers the chops. No landmine? Wedge a barbell into a corner."
        : "No gear for overspeed? A light stick or your driver. No med ball? A heavy backpack, band, or dumbbell works.";
      var toggle = '<div class="speed-toggle"><span class="st-lbl">Training at a…</span>'+
        '<span class="seg sm speed-seg">'+
          '<button type="button" data-speedmode="field"'+(smode==="field"?' class="active"':'')+'>⛳ Field</button>'+
          '<button type="button" data-speedmode="gym"'+(smode==="gym"?' class="active"':'')+'>🏋️ Gym</button>'+
        '</span></div>';
      // The featured (interactive) speed day is COMPACT like a lift day: player
      // CTA up top, warm-up + the "why" prose folded, and the drills as a
      // tap-for-more list instead of an inline wall of descriptions — that full
      // table + prose stays the browsable Full-week reference below. Keeps the
      // Today view short (this day used to dwarf every lift day).
      if(interactive){
        ilog = { week: curWeek(), day: d.name, sess: buildSession(d, curWeek()) };
        var spWork = ilog.sess.ex.some(function(x){ return (x.sets||[]).some(function(st){ return st.w||st.r||st.done; }); });
        var spSession = getSession(curWeek(), d.name);
        var spDone = sessionFinished(spSession);
        var spList = '<div class="sess-list">'+ilog.sess.ex.map(function(x){
            return '<button type="button" class="sl-row" data-exhist="'+escAttr(x.name)+'">'+
              '<span class="sl-ic">'+ffPurposeIc(x.name)+'</span>'+
              '<span class="sl-tx"><b>'+ffEsc(x.name)+'</b><span>'+ffEsc(x.target)+'</span></span>'+
              '<span class="sl-go">›</span></button>';
          }).join("")+
          '<div class="sl-note">Tap a drill for its history. Cues &amp; logging live in the <b>player</b>.</div></div>';
        return '<div class="day-focus speedday">'+
          speedTestCardHtml()+
          '<button class="pl-start" data-startplayer="'+escAttr(d.name)+'" type="button"><span class="pls-go">›</span>'+
            '<b>'+(spDone?'✓ Speed session done — replay it':(((spWork||spSession)?ffIcon("play",13)+' Resume':ffIcon("play",13)+' Start')+' speed session'))+'</b>'+
            '<span class="pls-sub">Guided player — warm-up, max-intent drills, full rest</span></button>'+
          '<details class="prelift"><summary>🔥 Warm-up &amp; the why — do these first</summary><div class="prelift-body">'+
            toggle+warmupHtml("speed", false, showPrimerNote)+
            '<div class="speed-intro">'+s.intro+'</div>'+
            '<div class="speed101-wrap">'+speed101Html()+'</div>'+
            '<div class="speed-why">'+p.speed.note+'</div>'+
            '<div class="equip-note" style="padding:10px 15px 8px;">'+noGear+'</div>'+
          '</div></details>'+
          spList+'</div>';
      }
      return '<div class="day speedday"><div class="day-head">'+d.name+' <span class="tag '+(d.tag)+'">'+labelFor(d.tag)+'</span></div>'+
        speedTestCardHtml()+
        toggle+
        '<details class="prelift"><summary>🔥 Warm-up — do these first</summary><div class="prelift-body">'+warmupHtml("speed", false, showPrimerNote)+'</div></details>'+
        '<div class="speed-intro">'+s.intro+'</div>'+
        '<div class="speed101-wrap">'+speed101Html()+'</div>'+
        '<table class="ex"><tr><th>Drill</th><th style="text-align:right">Sets × Reps</th></tr>'+srows+'</table>'+
        '<div class="speed-why">'+p.speed.note+'</div>'+
        '<div class="equip-note" style="padding:10px 15px 8px;">'+noGear+'</div>'+
        '<div style="padding:0 15px 4px;"><button class="pl-start" data-startplayer="'+escAttr(d.name)+'" type="button"><span class="pls-go">›</span>'+
          '<b>'+ffIcon("play",13)+' Start speed session</b><span class="pls-sub">Guided player — warm-up, max-intent drills, full rest</span></button></div>'+
        logFoot(d.name)+'</div>';
    }
    var resolved = resolveDay(d.ex);   // the SAME dedupe buildSession logs with
    // Effort in context — the same rules the player applies: this week's wave,
    // a beginner's on-ramp, a big lift still to come, a lift with no weight yet
    // or not done in 4+ weeks.
    var cwk=curWeek(), cwave=waveFor(cwk), onRamp=ffOnRamp(cwk), prevLx=lastSessionFor(d.name, cwk);
    var dayNames=resolved.map(function(r, ri){ return r.status==="swap" ? r.name : applySwapName(d.ex[ri][0]); });
    function lxFor(n){ var f=null; if(prevLx) prevLx.ex.forEach(function(e){ if(e.name===n) f=e; }); return f; }
    var rows = d.ex.map(function(row, ri){
      var base = applySwapName(row[0]);
      var r = resolved[ri], lxr=lxFor(dayNames[ri]);
      var hasW=!!(lxr && (lxr.sets||[]).some(function(st){ return st && (parseFloat(st.w)>0 || parseInt(st.r,10)>0); }));
      var eff = '<div class="effort">'+effortNote(r.status==="swap" ? (r.sr||row[1]) : row[1], dayNames[ri],
        { wave:cwave, onRamp:onRamp, first:!hasW, easeIn:ffBackFor(lxr), beforeHeavy:heavyAfter(dayNames, ri) })+'</div>';
      var pe = ffPurposeIc(base)+' ';
      var us = base!==row[0] ? ' <span class="swap-badge">⇄ your swap</span>' : '';
      if(r.status==="ok"){ var c=exNameCell(pe, base, us); return '<tr>'+c.cell+'<td class="sets">'+effTarget(row[1],base,curWeek())+eff+'</td></tr>'+c.row; }
      if(r.status==="swap"){ var cs=exNameCell(pe, r.name, ' <span class="swap-badge">⇄ subbed for '+escAttr(base)+' (your gear)</span>'); return '<tr class="swap">'+cs.cell+'<td class="sets">'+effTarget(r.sr,r.name,curWeek())+eff+'</td></tr>'+cs.row; }
      return '<tr class="skip"><td class="exname"><span class="nm">'+pe+ffEsc(base)+'</span><span class="need">needs '+r.need.map(eqLabel).join(" + ")+'</span></td><td class="sets">'+row[1]+'</td></tr>';
    }).join("");
    var warmPrimer = warmupHtml(d.name, true, showPrimerNote);
    if(interactive){
      // Featured card: warm-up + primer expanded by default — it's "do these first," easy
      // to miss if hidden. Once the session has any logged work, collapse it so a
      // mid-workout reopen lands straight on the lifts (it stays one tap away).
      ilog = { week: curWeek(), day: d.name, sess: buildSession(d, curWeek()) }; openWhy={};
      var hasWork = ilog.sess.ex.some(function(x){ return (x.sets||[]).some(function(st){ return st.w||st.r||st.done; }); });
      var plDone = sessionFinished(getSession(curWeek(), d.name));
      // The guided player is the way to train; the inline spreadsheet is the
      // fallback. By default Today shows the session as a compact lift list
      // (Hevy-style) — the full set tables render only once the user opts into
      // manual logging (device pref) or already has typed work here.
      var manual = hasWork || lsGet("ff_manual_log", false);
      var body;
      if(manual){
        body='<div class="ilogwrap" id="ilogBox">'+ilogBodyHtml()+'</div>';
      } else {
        body='<div class="sess-list">'+ilog.sess.ex.map(function(x){
            return '<button type="button" class="sl-row" data-exhist="'+escAttr(x.name)+'">'+
              '<span class="sl-ic">'+ffPurposeIc(x.name)+'</span>'+
              '<span class="sl-tx"><b>'+ffEsc(x.name)+'</b><span>'+ffEsc(x.target)+'</span></span>'+
              '<span class="sl-go">›</span></button>';
          }).join("")+
          '<div class="sl-note">Tap a lift for its history. Swaps, cues &amp; logging live in the <b>player</b>.</div></div>';
      }
      return '<div class="day-focus">'+
        '<button class="pl-start" data-startplayer="'+escAttr(d.name)+'" type="button"><span class="pls-go">›</span>'+
          '<b>'+(plDone?'✓ Session finished — replay it':((hasWork?ffIcon("play",13)+' Resume':ffIcon("play",13)+' Start')+' workout'))+'</b>'+
          '<span class="pls-sub">Guided player — warm-up, prescribed loads, rest timer, recap</span></button>'+
        // Warm-up/primer starts COLLAPSED — it's prep, not the workout, and the
        // guided player runs it for you anyway. One tap opens it; the exercise
        // list stays the visible focus. (Was open-by-default; user wanted the
        // whole Today card tighter.)
        '<details class="prelift"><summary>🔥 Warm-up &amp; power primer — do these first</summary><div class="prelift-body">'+warmPrimer+'</div></details>'+
        body+'</div>';
    }
    // Full-week (non-interactive) day: fold the warm-up too — otherwise every
    // day in the week prints its whole checklist and the page runs for screens.
    var head = '<div class="day"><div class="day-head">'+d.name+' <span class="tag '+(d.tag==="Lift"?"":d.tag)+'">'+labelFor(d.tag)+'</span></div>'+
      '<details class="prelift"><summary>🔥 Warm-up &amp; power primer — do these first</summary><div class="prelift-body">'+warmPrimer+'</div></details>';
    return head +
      '<table class="ex"><tr><th>Exercise</th><th style="text-align:right">Sets × Reps</th></tr>'+rows+'</table>'+
      '<div class="romcue">Full range, every rep — <b>control the lowering (1–2 sec)</b>, then drive up fast. Full-range lifting builds muscle and keeps your turn.</div>'+
      logFoot(d.name)+'</div>';
  }
  // Short chip label for the week strip: "Squat", "Push", "Speed", "Hinge", "Pull", "Rest".
  function wsShort(d){
    var m=d.name.match(/\(([^)]+)\)/);
    if(m) return m[1].split(/[ +]/)[0];
    var after=(d.name.split("—")[1]||d.name).trim();
    return after.split(/[ &/]/)[0];
  }
  // THE per-day target list — { name, orig, target } per exercise: user swaps +
  // gear subs (deduped across the day, same as the card), retain trim and the
  // wave (effTarget / speedDrillTarget). buildSession (040) logs exactly this
  // and sessionMinutes estimates from it, so the "About N min" counts the real dose.
  function dayTargets(d, week){
    if(!d || d.type==="rest") return [];
    if(d.type==="speed") return PHASES[0].speed[speedMode()].ex.map(function(e){
      var base=applySwapName(e[0]); return { name:base, orig:e[0], target:speedDrillTarget(base, e[1], week) }; });
    var rs=resolveDay(d.ex);
    return d.ex.map(function(row, ri){
      var base=applySwapName(row[0]), r=rs[ri], nm=(r.status==="swap")?r.name:base;   // user swap first
      return { name:nm, orig:row[0], target:effTarget(r.sr||row[1], nm, week) }; });
  }
  // A rounded planning estimate from this week's real dose: 5 min warm-up, the
  // power primer (lift days), ~3 s a rep (per-side / per-leg work twice, holds
  // by the second, carries ~40 s), and the player's own rest timers between
  // sets and between lifts.
  function sessionMinutes(d){
    if(!d || d.type==="rest") return 10;
    var wk=planStart()?curWeek():1;
    var setRest=(typeof REST_BETWEEN_SETS==="number")?REST_BETWEEN_SETS:120,
        liftRest=(typeof REST_BETWEEN_LIFTS==="number")?REST_BETWEEN_LIFTS:180;
    function work(target, rest){
      var t=String(target||""), n=parseSets(t), r=topReps(t)||8, sides=/\/\s*(side|leg)/i.test(t)?2:1;
      var per=isDistEx(t) ? 40 : (/\d\s*s\b/.test(t) ? r*sides : r*3*sides);
      return n*per + Math.max(0,n-1)*rest;
    }
    var secs=5*60;
    if(d.type!=="speed") secs+=work(primerFor(d.name).dose, 60)+liftRest;   // primer: short rests, then on
    dayTargets(d, wk).forEach(function(x, i){ secs+=work(x.target, setRest)+(i?liftRest:0); });
    return Math.max(20, Math.min(120, Math.round(secs/60/5)*5));
  }
  var focusDay=null;   // which day the Today view is showing (null = auto = next un-logged)
  function planViewMode(){
    if(!planStart()) return "week";
    return ffAccess()==="full" ? lsGet("ff_planview","today") : "today";   // free week: one day at a time (036)
  }

  function renderPhase(){
    ilog=null;                       // reset; the interactive day re-sets it
    var p = PHASES[planState.phase];
    var shown = activeDays();

    var html="";
    var wk=curWeek(), started=!!planStart();
    var vp=document.getElementById("view-plan"); if(vp) vp.classList.toggle("started", started);

    if(!started){
      // Before the plan starts: the brochure (static) shows, plus this start card.
      html+='<div class="startbar"><div class="sb-eyebrow">YOUR NEXT MOVE</div><div class="sb-top"><b>'+ffIcon("play",13)+' Your first workout is ready</b>'+
        '<span>Start on any day. Yardsmith maps the week, guides every set and remembers exactly where you stop.</span></div>'+
        '<button class="sb-go" data-startweek="1">Start my plan</button>'+
        (ffAccess()!=="full" ? '' :                   // picking a later week is Pro once billing is on (036)
        '<div class="sb-alt">Already mid-plan? <button class="sb-link" data-jump="1">Pick your current week ▾</button></div>'+
        '<div class="sb-jump" id="sbJump" hidden><select id="weekSel" aria-label="Current week">'+
          (function(){ var o=""; for(var wi=1;wi<=20;wi++) o+='<option value="'+wi+'">Week '+wi+'</option>'; return o; })()+
          '</select><button class="sb-go2" data-startweek="sel">Set</button></div>')+'</div>';
      $("phaseDetail").innerHTML=html;
      return;
    }

    if(seasonComplete()){
      // Day 140+: the 20 weeks are done. No week strip / day cards / Start buttons
      // — those would hand out week-20 keys and reopen finished sessions. One card,
      // one move: start season 2 (history, PRs and trends all carry over).
      html+=seasonCompleteHtml();
    } else {
      html+=trainWeekHtml(p, shown, wk);
    }
    html+=trainFootHtml(wk);
    $("phaseDetail").innerHTML=html;
    trainWireSettings();
  }
  // How many workouts the finished season banked (from the week|day log — the
  // plan's own record; ff_history keeps every season beyond this one).
  function seasonCompleteHtml(){
    var n=0; try{ n=sessionsByWeek().length; }catch(e){}
    var st=planStart(), since="";
    try{ since=new Date(st).toLocaleDateString(undefined,{month:"short",day:"numeric"}); }catch(e){}
    return '<div class="lift-hero season-done"><div class="lh-l">'+
        '<div class="lh-week">WEEK 20 OF 20 · 🏁 SEASON COMPLETE</div>'+
        '<h2 class="lh-name">Season complete</h2>'+
        '<div class="lh-sub">20 weeks'+(since?' since '+ffEsc(since):'')+' <span class="lh-dot">·</span> <b class="lh-done">'+n+' workout'+(n===1?'':'s')+' done</b></div>'+
        '<div class="lh-prog"><span style="width:100%"></span></div></div></div>'+
      '<div class="upcoming-banner">🏁 <b>You finished the 20-week plan.</b> Run your 7-iron speed test to close the book on this season, then start season 2 — a fresh week 1 built on the strength you have now. Your workout history, PRs, bodyweight and speed trends all stay.</div>'+
      '<button type="button" class="train-today-cta" data-newseason="1">'+
        '<span><small>WHAT’S NEXT</small><b>Start season 2</b></span><i>›</i></button>';
  }
  // Refuse new work after day 140 (every Start/Log entry point funnels here).
  function ffSeasonOverNudge(){
    try{ if(typeof setView==="function") setView("plan"); }catch(e){}
    try{ renderPhase(); }catch(e){}
    try{ ffToast("🏁 Season complete — start season 2 on the Train tab."); }catch(e){}
  }
  document.addEventListener("click", function(e){
    if(!e.target.closest("[data-newseason]")) return;
    if(!confirm("Start season 2? Week 1 starts today. Your workout history, PRs, bodyweight and 7-iron trends all stay — only this season’s week-by-week plan log resets.")) return;
    resetPlanFull();
    startPlanAtWeek(1);
  });
  // The normal in-season Train body: hero, Today CTA, week strip + featured day
  // (or the full week). Split out of renderPhase so the season-complete state can
  // swap it wholesale.
  function trainWeekHtml(p, shown, wk){
    var html="";
    var mode=planViewMode(), wd=weekDoneCount();
    // Focus is tracked by dayKey (not name) so the two identically-named rest days
    // don't both resolve/highlight as the focused day.
    // On a rest day with no explicit focus, feature TODAY (the recovery card) so
    // the Train tab agrees with Home about "what is today" — the next workout is
    // still one strip-tap away. Any workout day (or an explicit focusDay) unchanged.
    var _dop=dayOfPlan(), _todayD=_dop?stripDays()[_dop-1]:null;
    var featName=(focusDay && shown.some(function(d){return dayKey(d)===focusDay;}))
      ? focusDay
      : ((_todayD && _todayD.type==="rest") ? dayKey(_todayD) : nextWorkout());
    var featured=null; shown.forEach(function(d){ if(dayKey(d)===featName) featured=d; });
    if(!featured) featured=shown[0];
    var featKey=dayKey(featured);
    var heroName=(mode==="today")?((featured.name.split("—")[1]||featured.name).trim()):"Your training week";

    // ---- clean hero: the workout, front and centre ----
    html+='<div class="lift-hero"><div class="lh-l">'+
      '<div class="lh-week">WEEK '+wk+' OF 20 · '+WAVES[waveFor(wk)].ic+' '+WAVES[waveFor(wk)].label.toUpperCase()+' WEEK</div>'+
      '<h2 class="lh-name">'+heroName+'</h2>'+
      '<div class="lh-sub">'+(mode==="today"?('About '+sessionMinutes(featured)+' min <span class="lh-dot">·</span> Day '+dayOfPlan()+' of your week'):'Browsing the full week')+
        (wd.total?(' <span class="lh-dot">·</span> '+(wd.done>=wd.total?'<b class="lh-done">week complete ✓</b>':'<b class="lh-done">'+wd.done+' of '+wd.total+' done</b>')):'')+'</div>'+
      '<div class="lh-prog"><span style="width:'+Math.max(5,Math.round(wk/20*100))+'%"></span></div></div></div>';

    // After the free week without Pro: the plan's week, one card, nothing to browse.
    var access=ffAccess();
    if(access==="locked") return html+ffLockedWithResumeHtml("train");   // + "Resume workout" for one already under way
    // Free week: a day that hasn't arrived is a teaser, not a readable preview.
    var featLocked=access==="preview" && featured.type!=="rest" && isFutureDay(featured.name);

    if(mode==="today" && !featLocked){
      if(typeof ffReadinessInlineHtml==="function") html+=ffReadinessInlineHtml(featured);
      if(featured.type==="rest"){
        var heroRestDone=restDone(wk,featKey);
        html+='<button type="button" class="train-today-cta recovery'+(heroRestDone?' done':'')+'" data-restday="'+escAttr(featKey)+'">'+
          '<span><small>TODAY’S ACTION · 10 MIN</small><b>'+(heroRestDone?'Recovery done ✓':'Start recovery')+'</b></span><i>›</i></button>';
      } else if(!isFutureDay(featured.name)){
        var heroSession=getSession(wk,featured.name), heroFinished=!!(heroSession&&heroSession.finishedAt);
        html+='<button type="button" class="train-today-cta" data-startplayer="'+escAttr(featured.name)+'">'+
          '<span><small>TODAY’S WORKOUT · ~'+sessionMinutes(featured)+' MIN</small><b>'+(heroFinished?'Replay finished session':(heroSession?'Resume workout':'Start workout'))+'</b></span><i>›</i></button>';
      }
    }

    if(access==="full")
      html+='<div class="planview-seg"><button data-planview="today"'+(mode==="today"?' class="active"':'')+'>Today</button>'+
        '<button data-planview="week"'+(mode==="week"?' class="active"':'')+'>Full week</button></div>';

    var wvKey=waveFor(wk), wave=WAVES[wvKey];
    if(wvKey!=="accumulate") html+='<div class="deload-banner">'+wave.ic+' <b>'+wave.label+' week.</b> '+wave.strap+' '+ffTerm('wave','How the weeks work ›')+'</div>';

    if(mode==="today"){
      var todayDate = new Date();
      var strip = stripDays().map(function(d, i){
        var done = d.type==="rest" ? restDone(wk, dayKey(d)) : sessionFinished(getSession(wk, d.name));
        var cd = chipDate(i), isToday = sameDay(cd, todayDate);
        var dateLbl = isToday ? "Today" : (cd ? fmtChipDate(cd) : ("Day "+(i+1)));
        var lockd = access==="preview" && d.type!=="rest" && isFutureDay(d.name);
        return '<button class="ws-chip'+(dayKey(d)===featKey?" cur":"")+(done?" done":"")+(isToday?" today":"")+(lockd?" locked":"")+'" data-focusday="'+escAttr(dayKey(d))+'">'+
          '<span class="ws-date">'+dateLbl+'</span>'+
          '<span class="ws-name">'+(done?"✓ ":"")+(lockd?"🔒 ":"")+wsShort(d)+'</span></button>';
      }).join("");
      html+='<div class="weekstrip">'+strip+'</div>';
      // A future day is a PREVIEW, never an active session: rendering it
      // interactive is what used to auto-open the inline logger the moment you
      // tapped a day that hadn't arrived yet ("it starts to log it"). Show the
      // plan read-only instead, with a note that it opens on the day — and an
      // explicit "log it early" path still available from the card's log button.
      var featFuture = featured.type!=="rest" && isFutureDay(featured.name);
      if(featLocked){
        html+=ffLockedDayHtml(featured);
      } else if(featFuture){
        var fdt=dayCalDate(featured.name);
        var fwhen=fdt?fdt.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"}):"soon";
        html+='<div class="upcoming-banner">📅 <b>Coming up '+fwhen+'.</b> Here’s the plan to preview — opening it won’t start logging. It unlocks on the day; to train it early, use <b>Log workout</b> at the bottom of the card.</div>';
        html+=dayCardHtml(featured, true, false);   // static preview — opening never logs
      } else {
        html+=dayCardHtml(featured, true, true);   // interactive: player CTA + list (or opted-in inline logger)
        // Finish + Clear/reset. Show whenever there's anything to save OR clear —
        // a finished session (logged via the player or manually) always gets its
        // reset control here, not only while manual mode is on.
        var hasSession = !!getSession(curWeek(), featured.name);
        var workNow = !!(ilog && ilog.sess.ex.some(function(x){ return (x.sets||[]).some(function(st){ return st.w||st.r||st.done; }); }));
        if(workNow || hasSession || lsGet("ff_manual_log", false)){
          html+='<div id="finishBar">'+finishBtnHtml()+'</div>';
          // Offer the way back only while nothing's logged — never hide entered work.
          if(!workNow && !hasSession) html+='<button type="button" class="sl-manual off" data-manuallog="0">Hide manual logging — back to the simple list</button>';
        }
      }
    } else {
      var primerNoteShown=false;
      shown.forEach(function(d){
        // The beginner caution shows once: on the first lift or speed day.
        var note = d.type!=="rest" && !primerNoteShown;
        html+=dayCardHtml(d, note);
        if(note) primerNoteShown=true;
      });
    }

    return html;
  }
  // Below the week (every Train state): coach, history, playbook, settings.
  function trainFootHtml(wk){
    var html="", retain=trainRetain();
    // Everything under the day's workout is secondary: one "More" group of
    // matching rows (Sep 2026 Train pass) instead of five different styles.
    html+='<div class="train-more-h" role="heading" aria-level="2">More</div><div class="home-rows train-more">';
    // Manual logging is opt-in (the player is the default); the row only offers
    // it on a workout day that can be logged, and never while it's already on.
    var dop=dayOfPlan(), today=dop?stripDays()[dop-1]:null;
    if(planViewMode()==="today" && ffAccess()!=="locked" && !lsGet("ff_manual_log", false) && !seasonComplete() && today && today.type!=="rest")
      html+=homeRow("⌨️","Log by typing instead","Enter sets yourself — no player",' data-manuallog="1"');
    html+=homeRow("💬","Adjust this week","Ask the coach to rework it",' data-ask="train"');
    html+=homeRow("📖","Workout history","Every session, all time",' data-gohistory="1"');
    html+='</div>';

    // Learn: the three reference reads grouped under ONE playbook fold.
    html+='<details class="fold playbook"><summary>📚 How the plan works</summary><div class="fold-body">'+
      '<div class="pb-sec"><h4>🌀 Why this builds clubhead speed</h4>'+phaseWhy()+'</div>'+
      '<div class="pb-sec"><h4>📈 How the plan progresses for you</h4>'+
        '<p><b>The weeks.</b> Every 6 weeks the plan itself shifts: <b>Build</b> (wks 1–3) — targets as written; keep the weight until every set hits its target reps · <b>Heavy</b> (wks 4–5) — big-lift rep targets drop ~2 so the loads climb'+(retain?', accessories stay at about 2 sets':', accessories drop a set')+' · <b>Easy</b> (wks 6, 12, 18) — a set less on most lifts (nothing drops below 2) and the logger pre-suggests ~60% loads · <b>Peak</b> (wks 19–20) — the big lifts lose about half their sets, accessories drop to 2, speed work drops a set; same reps, loads stay heavy. You don’t manage any of it — the day cards and logger update themselves.</p>'+
        '<p><b>Double progression.</b> Keep the same weight until <b>every set hits its target reps</b> (e.g. all four sets reach 5 on a 4×5). The logger spots it, pre-fills the jump (<b>+2.5–5 lb</b> upper body / <b>+5 lb</b> lower body) into the weight placeholders, and gives you a one-tap fill. On the big lifts every rep should still move fast — if reps grind, hold the weight.</p>'+
        '<p><b>RIR</b> = reps in reserve — how many clean reps you stop short of failure. “RIR 2” means leave about 2 in the tank. The note by each lift gives a target RIR and rest time.</p>'+
        '<p><b>Speed &amp; power quality.</b> Jumps, throws and overspeed only build speed when every rep is <i>fast</i> — <b>stop a set the instant reps visibly slow</b>, keep the implement light, and rest fully between efforts. Never grind power work.</p></div>'+
      '<div class="pb-sec"><h4>🏆 In-season &amp; peaking</h4>'+
        '<p><b>In-season (tournament stretches).</b> Switch macros to <b>In-Season Maintain</b> and the plan moves to <b>Retain mode</b> on its own: a set comes off the accessories, while the heavy lifts and all speed work stay at full — heavy loads are what hold your strength. Keep your 4–5 days if you can; the app still counts them. If a tournament week squeezes you to two sessions, make both heavy and keep the speed primers. Lifters over ~60 hold muscle best on at least 2 sessions and 2–3 sets per lift.</p>'+
        '<p><b>Peak for an event.</b> Set your event date and the plan makes the <b>event week and the week before</b> Peak weeks: <b>about a quarter to a third fewer sets</b>, same reps, loads stay heavy, speed work crisp and light. Then an easy week to absorb it. Tapers like this shed fatigue in other sports; no golf study has measured the gain, so let your 7-iron speed test be the proof.</p>'+
        '<p><b>Sleep is training.</b> Aim <b>7–9 h</b>. Sleep loss degrades <i>skill control</i> — tempo and strike — more than strength, so a bad week of sleep shows in your scores before your lifts.</p></div>'+
      '</div></details>';

    // Configure: settings + equipment (open state preserved across re-renders).
    html+='<details class="fold" id="setFold"'+(planState.settingsOpen?' open':'')+'><summary>⚙️ Plan settings</summary><div class="fold-body settings-body">'+
      '<div class="set-row"><span class="set-lbl">Training days / week</span><div class="seg sm" id="freqSeg">'+
        '<button type="button" data-freq="4" '+(planState.freq===4?'class="active"':'')+'>4</button>'+
        '<button type="button" data-freq="5" '+(planState.freq===5?'class="active"':'')+'>5</button></div></div>'+
      '<div class="mode-banner '+(retain?"retain":"build")+'">'+
        (retain?'🔻 <b>Retain mode</b> (auto, from your goal) — accessory volume trimmed; heavy lifts &amp; all speed work stay at full to protect muscle and clubhead speed.'
               :'🏗️ <b>Build mode</b> (auto, from your goal) — full accessory volume to add muscle, with heavy strength and speed work every week.')+'</div>'+
      '<div class="exlegend"><b>What each move builds:</b> 🏋️ strength · 💪 mass · ⚡ power/speed · 🌀 golf rotation</div>'+
      (ffAccess()!=="full" ? '' :                     // jumping weeks is Pro once billing is on (036)
      '<div class="set-jump"><select id="weekSel" aria-label="Jump to week">'+
        (function(){ var o=""; for(var wi=1;wi<=20;wi++) o+='<option value="'+wi+'"'+(wi===wk?' selected':'')+'>Week '+wi+'</option>'; return o; })()+
        '</select><button class="sb-go2" data-startweek="sel">Jump to week</button></div>')+
      '<button class="sb-link" data-reset="1">↺ Restart from week 1</button>'+
      '<div id="equipBar" class="settings-equip"></div>'+
      '</div></details>';
    return html;
  }
  // Re-attached after every render (the sanctioned exception — these nodes are
  // rebuilt by each innerHTML swap).
  function trainWireSettings(){
    if($("equipBar")) renderEquip();   // equipment lives inside Plan & settings now
    var setFold=$("setFold");
    if(setFold) setFold.addEventListener("toggle", function(){ planState.settingsOpen=setFold.open; });

    var freqSeg=$("freqSeg");
    if(freqSeg){
      freqSeg.addEventListener("click", function(e){
        var btn=e.target.closest("button"); if(!btn) return;
        planState.freq=parseInt(btn.getAttribute("data-freq"),10);
        renderPhase(); persist();
      });
    }
  }

  function labelFor(tag){
    if(tag==="rest") return "Recover";
    if(tag==="speed") return "Speed";
    if(tag==="power") return "Power";
    return "Lift";
  }
  function phaseWhy(){
    return "Each week you build force capacity (size + strength) <b>and</b> train it to fire fast (rate of force development), then transfer it with ground-force work and overspeed swings. Research shows training these qualities together builds just as much muscle as separate blocks — while keeping your speed sharp the whole time. The engine and the gas pedal, every week.";
  }
