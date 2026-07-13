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
            ["Speed bench press", "4 \u00d7 4", "Light bar (~half your usual) \u2014 every rep max velocity up. Upper-body ballistic power. (Or an explosive DB push press.)"],
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
          ["Single-Arm DB Bench Press","3 \u00d7 8 / side"],["Lateral Raise","3 \u00d7 15"],["Cable Triceps Pushdown","3 \u00d7 12"],["Cable Wood-chop","3 \u00d7 10 / side"]
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
          ["Leg Extension","3 \u00d7 12"],["Standing Calf Raise","3 \u00d7 12"],["Pallof Press","3 \u00d7 12 / side"]
        ]},
        { name:"Day 2 \u2014 Upper (Push)", tag:"Lift", ex:[
          ["Barbell Bench Press","4 \u00d7 5 (heavy \u00b7 fast up)"],["Incline DB Press","3 \u00d7 10"],["Standing Overhead Press","4 \u00d7 6"],
          ["Single-Arm DB Bench Press","3 \u00d7 8 / side"],["Lateral Raise","3 \u00d7 15"],["Cable Triceps Pushdown","3 \u00d7 12"],["Cable Wood-chop","3 \u00d7 10 / side"]
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
    "Back Squat":{needs:["barbell"],subs:[{needs:["dumbbells"],name:"Goblet Squat"},{needs:["bodyweight"],name:"Tempo Bodyweight Squat (3-1-1, +1.5 reps)"}]},
    "Front Squat":{needs:["barbell"],subs:[{needs:["dumbbells"],name:"Goblet Squat"},{needs:["bodyweight"],name:"Tempo Bodyweight Squat"}]},
    "Romanian Deadlift":{needs:["barbell"],subs:[{needs:["dumbbells"],name:"DB Romanian Deadlift"},{needs:["kettlebell"],name:"Kettlebell RDL"},{needs:["bodyweight"],name:"Single-leg RDL"}]},
    "Leg Press":{needs:["legpress"],subs:[{needs:["dumbbells"],name:"Goblet Squat"},{needs:["bodyweight"],name:"Walking Lunge"}]},
    "Hanging Leg Raise":{needs:["pullupbar"],subs:[{needs:["bodyweight"],name:"Lying Leg Raise"}]},
    "Incline DB Press":{needs:["dumbbells"],subs:[{needs:["bodyweight"],name:"Decline / Feet-elevated Push-up"}]},
    "Flat Barbell Bench":{needs:["barbell","bench"],subs:[{needs:["dumbbells","bench"],name:"Flat DB Bench Press"},{needs:["dumbbells"],name:"Floor DB Press"},{needs:["bodyweight"],name:"Push-up (weighted / feet-elevated)"}]},
    "Barbell Bench Press":{needs:["barbell","bench"],subs:[{needs:["dumbbells","bench"],name:"Flat DB Bench Press"},{needs:["dumbbells"],name:"Floor DB Press"},{needs:["bodyweight"],name:"Push-up (weighted / feet-elevated)"}]},
    "Single-Arm DB Bench Press":{needs:["dumbbells"],subs:[{needs:["bands"],name:"Single-Arm Band Press"},{needs:["bodyweight"],name:"Archer Push-up"}]},
    "Seated DB Shoulder Press":{needs:["dumbbells"],subs:[{needs:["bands"],name:"Band Overhead Press"},{needs:["bodyweight"],name:"Pike Push-up"}]},
    "Standing Overhead Press":{needs:["barbell"],subs:[{needs:["dumbbells"],name:"Standing DB Press"},{needs:["bands"],name:"Band Overhead Press"},{needs:["bodyweight"],name:"Pike Push-up"}]},
    "Lateral Raise":{needs:["dumbbells"],subs:[{needs:["bands"],name:"Band Lateral Raise"}]},
    "Cable Triceps Pushdown":{needs:["cable"],subs:[{needs:["bands"],name:"Band Triceps Pushdown"},{needs:["bodyweight"],name:"Diamond Push-up"}]},
    "Cable Wood-chop":{needs:["cable"],subs:[{needs:["bands"],name:"Band Wood-chop"},{needs:["medball"],name:"Med-Ball Rotational Throw"},{needs:["bodyweight"],name:"Speed Russian Twist"}]},
    "Deadlift":{needs:["barbell"],subs:[{needs:["dumbbells"],name:"DB Romanian Deadlift"},{needs:["kettlebell"],name:"Kettlebell Deadlift"},{needs:["bodyweight"],name:"Single-leg RDL"}]},
    "Hip Thrust":{needs:["barbell","bench"],subs:[{needs:["dumbbells","bench"],name:"DB Hip Thrust"},{needs:["bodyweight"],name:"Single-leg Glute Bridge"}]},
    "Leg Extension":{needs:["legext"],subs:[{needs:["bodyweight"],name:"Sissy Squat"}]},
    "Leg Curl":{needs:["legcurl"],subs:[{needs:["bands"],name:"Band Leg Curl"},{needs:["bodyweight"],name:"Nordic / Slider Leg Curl"}]},
    "Seated Leg Curl":{needs:["legcurl"],subs:[{needs:["bands"],name:"Band Leg Curl"},{needs:["bodyweight"],name:"Nordic / Slider Leg Curl"}]},
    "Lying Leg Curl":{needs:["legcurl"],subs:[{needs:["bands"],name:"Band Leg Curl"},{needs:["bodyweight"],name:"Nordic / Slider Leg Curl"}]},
    "Pallof Press":{needs:["cable"],subs:[{needs:["bands"],name:"Band Pallof Press"},{needs:["bodyweight"],name:"Side Plank"}]},
    "Farmer Carry":{needs:["dumbbells"],subs:[{needs:["kettlebell"],name:"Kettlebell Carry"},{needs:["bodyweight"],name:"Loaded Carry (backpack / any heavy object)"}]},
    "Weighted Pull-up":{needs:["pullupbar"],subs:[{needs:["latpulldown"],name:"Lat Pulldown"},{needs:["bands"],name:"Band Lat Pulldown"},{needs:["dumbbells"],name:"DB Row"},{needs:["bodyweight"],name:"Inverted Row (under a sturdy table)"}]},
    "Pull-up":{needs:["pullupbar"],subs:[{needs:["latpulldown"],name:"Lat Pulldown"},{needs:["bands"],name:"Band Lat Pulldown"},{needs:["dumbbells"],name:"DB Row"},{needs:["bodyweight"],name:"Inverted Row"}]},
    "Chest-Supported Row":{needs:["dumbbells"],subs:[{needs:["bands"],name:"Band Row"},{needs:["bodyweight"],name:"Inverted Row"}]},
    "Single-Arm DB Row":{needs:["dumbbells"],subs:[{needs:["kettlebell"],name:"Single-Arm Kettlebell Row"},{needs:["bands"],name:"Single-Arm Band Row"},{needs:["bodyweight"],name:"Inverted Row"}]},
    "Wrist Curl + Reverse":{needs:["dumbbells"],subs:[{needs:["barbell"],name:"Barbell Wrist Curl + Reverse"},{needs:["bands"],name:"Band Wrist Curl"},{needs:["bodyweight"],name:"Towel / Plate Pinch Hold"}]},
    "Lat Pulldown":{needs:["latpulldown"],subs:[{needs:["pullupbar"],name:"Pull-up / Band-assisted Pull-up"},{needs:["bands"],name:"Band Lat Pulldown"},{needs:["bodyweight"],name:"Inverted Row"}]},
    "Face Pull":{needs:["cable"],subs:[{needs:["bands"],name:"Band Face Pull"},{needs:["dumbbells"],name:"Rear-Delt Raise"},{needs:["bodyweight"],name:"Prone Y-T-W Raises"}]},
    "DB Curl":{needs:["dumbbells"],subs:[{needs:["bands"],name:"Band Curl"}]},
    "Hammer Curl":{needs:["dumbbells"],subs:[{needs:["bands"],name:"Band Hammer Curl"}]},
    "Weighted Dip":{needs:["bench"],subs:[{needs:["bodyweight"],name:"Push-up / Bench Dip"}]},
    "Pendlay Row":{needs:["barbell"],subs:[{needs:["dumbbells"],name:"DB Row"},{needs:["bands"],name:"Band Row"},{needs:["bodyweight"],name:"Inverted Row"}]},
    "Box Jump":{needs:["box"],subs:[{needs:["bodyweight"],name:"Squat Jump / Tuck Jump"}]},
    "Anti-rotation Cable Hold":{needs:["cable"],subs:[{needs:["bands"],name:"Band Anti-rotation Hold"},{needs:["bodyweight"],name:"Plank Hold"}]},
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
  function resolveEx(rawName, sr){
    var e = EX[normName(rawName)];
    if(!e) return { name:rawName, sr:sr, status:"ok" };
    if(e.needs.every(have)) return { name:rawName, sr:sr, status:"ok" };
    for(var i=0;i<e.subs.length;i++){
      if(e.subs[i].needs.every(have)) return { name:e.subs[i].name, sr:e.subs[i].sr||sr, status:"swap" };
    }
    return { name:rawName, sr:sr, status:"skip", need:e.needs };
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
  function effortNote(t){
    t=String(t);
    if(/yd/.test(t)) return "heavy · rest ~90s";
    if(/explosive|jump/i.test(t)) return "max intent · full rest";
    if(/heavy/i.test(t)) return "RIR 2 · rest 2–3 min";
    var m=t.match(/[×x]\s*(\d+)/), reps=m?parseInt(m[1],10):10;
    if(reps<=6) return "RIR 2–3 · rest 2–3 min";
    if(reps>=13) return "RIR 1 · rest ~75s";
    return "RIR 1–2 · rest ~90s";
  }
  // Warm-up & power primer as scannable, tappable checklists (gym-readable).
  function warmupBase(name){
    if(name==="speed") return [["90/90 hip switches","×6/side"],["Open-book T-spine","×8/side"],["Leg swings","×10/side"],["Build-up swings","10–15 · 50→90%"]];
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
    function addFix(primary, alt, alreadyRe){
      var has=list.some(function(m){ return alreadyRe.test(m[0]); });
      var pick = has ? alt : primary;
      if(pick && !list.some(function(m){ return m[0]===pick[0]; })) list.push([pick[0], pick[1], true]);
    }
    if(lim.trunk) addFix(["Open-book T-spine","×8/side"], ["Thread-the-needle","×6/side"], /open.?book/i);
    if(lim.hip && lower) addFix(["90/90 hip switches","×8/side"], ["Adductor rock-back","×8/side"], /90\/90/);
    if(lim.squat && lower){ addFix(["Deep squat hold (hold a support)","3 × 20s"], null, /deep squat/i); addFix(["Ankle rockers","×10/side"], null, /ankle/i); }
    return list;
  }
  function primerFor(name){
    if(/Pull|Rotate/.test(name)) return {move:"Rotational med-ball throw", dose:"4 × 4 / side", note:"No ball? Band or cable rotation."};
    if(/Push/.test(name)) return {move:"Explosive med-ball chest pass", dose:"4 × 4", note:"No ball? Clap or explosive push-up."};
    if(/Squat/.test(name)) return {move:"Box or squat jump", dose:"4 × 3", note:"Land soft, reset every rep."};
    if(/Hinge/.test(name)) return {move:"Russian kettlebell swing", dose:"5 × 5", note:"No kettlebell? Swing a dumbbell."};
    if(/Lower/.test(name)) return {move:"Box or squat jump", dose:"4 × 3", note:"Land soft, reset every rep."};
    return {move:"Box or squat jump", dose:"4 × 3", note:""};
  }
  var PRIMER_NOTE = "New to jumps &amp; throws? Start with 2 sets and build up. Stop the moment reps slow — power only counts when crisp.";
  function warmupHtml(name, withPrimer, showNote){
    var h='<div class="wu"><div class="wu-h">🔥 Warm-up <span>· 5 min · tap to check off</span></div>';
    warmupList(name).forEach(function(m){
      h+='<button type="button" class="wu-row'+(m[2]?' from-screen':'')+'" data-wu="1"><span class="wu-move">'+m[0]+'</span><span class="wu-dose">'+m[1]+'</span></button>';
    });
    if(withPrimer){
      var p=primerFor(name);
      h+='<div class="wu-h">⚡ Power primer <span>· do this first, fresh · max intent</span></div>'+
        '<button type="button" class="wu-row primer" data-wu="1"><span class="wu-move">'+p.move+'</span><span class="wu-dose">'+p.dose+'</span></button>';
      if(p.note) h+='<div class="wu-note">'+p.note+'</div>';
      if(showNote) h+='<div class="wu-note caution">⚠️ '+PRIMER_NOTE+'</div>';
    }
    return h+'</div>';
  }
  // One-glance purpose tag per exercise: 🏋️ strength · 💪 mass · ⚡ power/speed · 🌀 golf rotation
  function purposeFor(n){
    if(/Single-Arm/i.test(n)) return "🌀";
    // Rotation before power, so rotational throws/chops stay 🌀. "Landmine Press" is a
    // chest press, not rotation — excluded so the wave doesn't shield it from intensify.
    if(/Wood-?chop|\bChop\b|Rotation|Rotational|Pallof|Landmine(?! Press)|Punch|Russian Twist/i.test(n)) return "🌀";
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
  function isBallistic(n){
    return purposeFor(n)==="⚡" || /Throw|Toss|Slam|Chest Pass|\bChop\b|Punch/i.test(n);
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
     Weeks 1-3 · 7-9 · 13-15 accumulate — targets as authored, add reps to the top.
     Weeks 4-5 · 10-11 · 16-17 intensify — big lifts drop ~2 reps (go heavier),
       accessories drop a set so recovery follows the loads up.
     Weeks 6 · 12 · 18 deload — one set less everywhere, ~60% loads prescribed.
     Weeks 19-20 peak — volume cut ~40-50%, loads stay heavy, speed work crisp. ---- */
  var WAVES = {
    accumulate: { label:"Accumulate", ic:"🏗️", strap:"Build phase — push reps to the top of each range; the logger tees up your next jump." },
    intensify:  { label:"Intensify",  ic:"🔥", strap:"Heavy phase — reps drop, loads climb. Add weight, keep every rep fast." },
    deload:     { label:"Deload",     ic:"🪫", strap:"Planned easy week — one set less, ~60% loads. Recovery is when the gains land." },
    peak:       { label:"Peak",       ic:"🏁", strap:"Final stretch — volume halved, intensity heavy. Shed fatigue, take your yards." }
  };
  /* A "big event" date (club champs, member-guest, buddies trip) re-anchors the
     taper: the event week and the week before become Peak (volume cut, intensity
     held — exactly the playbook's 7-10 day taper), and the week after is a
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
    var out={ ts:t, date:ev.date, name:(ev.name||"").slice(0,40), week:null, past:t < (Date.now()-864e5) };
    var st=planStart();
    if(st){
      var start=new Date(st); start.setHours(0,0,0,0);
      var days=Math.floor((t-start.getTime())/864e5);
      if(days>=0 && days<140) out.week=Math.floor(days/7)+1;
    }
    return out;
  }
  function waveFor(week){
    var ev=eventInfo();
    if(ev && ev.week && !ev.past){
      if(week===ev.week || week===ev.week-1) return "peak";
      if(week===ev.week+1) return "deload";
    }
    if(week>=19) return "peak";
    var pos=((week-1)%6)+1;
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
  // Prescribed load for a set, from last logged weight: deload → ~60% (rounded to 5),
  // progression-ready → last + one small jump. null = no prescription (show last as-is).
  function prescribeW(lastW, name, ready, wave){
    var w=parseFloat(lastW); if(!(w>0)) return null;
    if(wave==="deload") return Math.max(5, Math.round(w*0.6/5)*5);
    if(ready) return w + incNum(name);
    return null;
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
        return '<tr'+(swapped?' class="swap"':'')+'><td><button class="exwhy-btn" type="button" data-whyrow="'+id+'" aria-expanded="false"><span class="exname-main">'+ffPurposeIc(base)+' '+base+'</span>'+
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
        var spDone = !!getSession(curWeek(), d.name);
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
            '<b>'+(spDone?'✓ Speed session done — replay it':((spWork?ffIcon("play",13)+' Resume':ffIcon("play",13)+' Start')+' speed session'))+'</b>'+
            '<span class="pls-sub">Guided player — warm-up, max-intent drills, full rest</span></button>'+
          '<details class="prelift"><summary>🔥 Warm-up &amp; the why — do these first</summary><div class="prelift-body">'+
            toggle+warmupHtml("speed", false)+
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
        '<details class="prelift"><summary>🔥 Warm-up — do these first</summary><div class="prelift-body">'+warmupHtml("speed", false)+'</div></details>'+
        '<div class="speed-intro">'+s.intro+'</div>'+
        '<div class="speed101-wrap">'+speed101Html()+'</div>'+
        '<table class="ex"><tr><th>Drill</th><th style="text-align:right">Sets × Reps</th></tr>'+srows+'</table>'+
        '<div class="speed-why">'+p.speed.note+'</div>'+
        '<div class="equip-note" style="padding:10px 15px 8px;">'+noGear+'</div>'+
        '<div style="padding:0 15px 4px;"><button class="pl-start" data-startplayer="'+escAttr(d.name)+'" type="button"><span class="pls-go">›</span>'+
          '<b>'+ffIcon("play",13)+' Start speed session</b><span class="pls-sub">Guided player — warm-up, max-intent drills, full rest</span></button></div>'+
        logFoot(d.name)+'</div>';
    }
    var rows = d.ex.map(function(row){
      var base = applySwapName(row[0]);
      var r = resolveEx(base, row[1]);
      var eff = '<div class="effort">'+effortNote(row[1])+'</div>';
      var pe = ffPurposeIc(base)+' ';
      var us = base!==row[0] ? ' <span class="swap-badge">⇄ your swap</span>' : '';
      if(r.status==="ok"){ var c=exNameCell(pe, base, us); return '<tr>'+c.cell+'<td class="sets">'+effTarget(row[1],base,curWeek())+eff+'</td></tr>'+c.row; }
      if(r.status==="swap"){ var cs=exNameCell(pe, r.name, ' <span class="swap-badge">⇄ subbed for '+escAttr(base)+' (your gear)</span>'); return '<tr class="swap">'+cs.cell+'<td class="sets">'+effTarget(r.sr,r.name,curWeek())+eff+'</td></tr>'+cs.row; }
      return '<tr class="skip"><td class="exname"><span class="nm">'+pe+base+'</span><span class="need">needs '+r.need.map(eqLabel).join(" + ")+'</span></td><td class="sets">'+row[1]+'</td></tr>';
    }).join("");
    var warmPrimer = warmupHtml(d.name, true, showPrimerNote);
    if(interactive){
      // Featured card: warm-up + primer expanded by default — it's "do these first," easy
      // to miss if hidden. Once the session has any logged work, collapse it so a
      // mid-workout reopen lands straight on the lifts (it stays one tap away).
      ilog = { week: curWeek(), day: d.name, sess: buildSession(d, curWeek()) }; openWhy={};
      var hasWork = ilog.sess.ex.some(function(x){ return (x.sets||[]).some(function(st){ return st.w||st.r||st.done; }); });
      var plDone = !!getSession(curWeek(), d.name) && !!(getSession(curWeek(), d.name)||{}).finishedAt;
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
          '<div class="sl-note">Tap a lift for its history. Swaps, cues &amp; logging live in the <b>player</b>.</div>'+
          '<button type="button" class="sl-manual" data-manuallog="1">⌨️ Prefer typing? Log manually here</button></div>';
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
      '<div class="romcue">Full range, every rep — <b>control the lowering (~3 sec)</b>. It builds muscle and protects your swing.</div>'+
      logFoot(d.name)+'</div>';
  }
  // Short chip label for the week strip: "Squat", "Push", "Speed", "Hinge", "Pull", "Rest".
  function wsShort(d){
    var m=d.name.match(/\(([^)]+)\)/);
    if(m) return m[1].split(/[ +]/)[0];
    var after=(d.name.split("—")[1]||d.name).trim();
    return after.split(/[ &/]/)[0];
  }
  var focusDay=null;   // which day the Today view is showing (null = auto = next un-logged)
  function planViewMode(){ return planStart() ? lsGet("ff_planview","today") : "week"; }

  function renderPhase(){
    ilog=null;                       // reset; the interactive day re-sets it
    var p = PHASES[planState.phase];
    var shown = activeDays();

    var html="";
    var wk=curWeek(), started=!!planStart();
    var vp=document.getElementById("view-plan"); if(vp) vp.classList.toggle("started", started);

    if(!started){
      // Before the plan starts: the brochure (static) shows, plus this start card.
      html+='<div class="startbar"><div class="sb-top"><b>'+ffIcon("play",13)+' Start your 20-week plan</b>'+
        '<span>Most people start on a Monday — but jump in any day. It tracks your week from here, no fiddling.</span></div>'+
        '<button class="sb-go" data-startweek="1">Start the plan today</button>'+
        '<div class="sb-alt">Already mid-plan? <button class="sb-link" data-jump="1">Pick your current week ▾</button></div>'+
        '<div class="sb-jump" id="sbJump" hidden><select id="weekSel" aria-label="Current week">'+
          (function(){ var o=""; for(var wi=1;wi<=20;wi++) o+='<option value="'+wi+'">Week '+wi+'</option>'; return o; })()+
          '</select><button class="sb-go2" data-startweek="sel">Set</button></div></div>';
      $("phaseDetail").innerHTML=html;
      return;
    }

    var retain=trainRetain(), mode=planViewMode(), wd=weekDoneCount();
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
      '<div class="lh-week">WEEK '+wk+' / 20 · '+WAVES[waveFor(wk)].ic+' '+WAVES[waveFor(wk)].label.toUpperCase()+(goalYds()?' · MISSION +'+goalYds()+' YDS':'')+'</div>'+
      '<h2 class="lh-name">'+heroName+'</h2>'+
      '<div class="lh-sub">'+(mode==="today"?('Day '+dayOfPlan()+' of your week'):'Browsing the full week')+
        (wd.total?(' <span class="lh-dot">·</span> '+(wd.done>=wd.total?'<b class="lh-done">week complete ✓</b>':'<b class="lh-done">'+wd.done+' of '+wd.total+' done</b>')):'')+'</div>'+
      '<div class="lh-prog"><span style="width:'+Math.max(5,Math.round(wk/20*100))+'%"></span></div></div>'+
      '<span class="lh-mode '+(retain?"retain":"build")+'">'+(retain?"Retain":"Build")+'</span></div>';

    html+='<div class="planview-seg"><button data-planview="today"'+(mode==="today"?' class="active"':'')+'>Today</button>'+
      '<button data-planview="week"'+(mode==="week"?' class="active"':'')+'>Full week</button></div>';

    var wvKey=waveFor(wk), wave=WAVES[wvKey];
    if(wvKey!=="accumulate") html+='<div class="deload-banner">'+wave.ic+' <b>'+wave.label+' week.</b> '+wave.strap+' '+ffTerm('wave','How waves work ›')+'</div>';

    if(mode==="today"){
      var todayDate = new Date();
      var strip = stripDays().map(function(d, i){
        var done = d.type==="rest" ? restDone(wk, dayKey(d)) : !!getSession(wk, d.name);
        var cd = chipDate(i), isToday = sameDay(cd, todayDate);
        var dateLbl = isToday ? "Today" : (cd ? fmtChipDate(cd) : ("Day "+(i+1)));
        return '<button class="ws-chip'+(dayKey(d)===featKey?" cur":"")+(done?" done":"")+(isToday?" today":"")+'" data-focusday="'+escAttr(dayKey(d))+'">'+
          '<span class="ws-date">'+dateLbl+'</span>'+
          '<span class="ws-name">'+(done?"✓ ":"")+wsShort(d)+'</span></button>';
      }).join("");
      html+='<div class="weekstrip">'+strip+'</div>';
      // A future day is a PREVIEW, never an active session: rendering it
      // interactive is what used to auto-open the inline logger the moment you
      // tapped a day that hadn't arrived yet ("it starts to log it"). Show the
      // plan read-only instead, with a note that it opens on the day — and an
      // explicit "log it early" path still available from the card's log button.
      var featFuture = featured.type!=="rest" && isFutureDay(featured.name);
      if(featFuture){
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
        var lift = d.type!=="rest" && d.type!=="speed";
        html+=dayCardHtml(d, lift && !primerNoteShown);
        if(lift) primerNoteShown=true;
      });
    }

    html+='<button class="train-ai" data-ask="train"><span>💬 <b>Coach this week</b></span><span class="tai-go">Adjust ›</span></button>';

    // Workout history stays; the Stats-tab shortcut is gone — the Stats tab and
    // the hero's week progress bar already cover "see your progress."
    html+='<button class="train-link" data-gohistory="1"><span>📖 Workout history</span><span class="tl-go">All time ›</span></button>';

    // Learn: the three reference reads grouped under ONE playbook fold.
    html+='<details class="fold playbook"><summary>📚 Coaching playbook</summary><div class="fold-body">'+
      '<div class="pb-sec"><h4>🌀 Why this builds clubhead speed</h4>'+phaseWhy()+'</div>'+
      '<div class="pb-sec"><h4>📈 How the plan progresses for you</h4>'+
        '<p><b>The wave.</b> Every 6 weeks the plan itself shifts: <b>Accumulate</b> (wks 1–3) — targets as written, build reps to the top of each range · <b>Intensify</b> (wks 4–5) — big-lift rep targets drop ~2 so the loads climb, accessories drop a set · <b>Deload</b> (wks 6, 12, 18) — one set less everywhere and the logger pre-suggests ~60% loads · <b>Peak</b> (wks 19–20) — volume cut nearly in half, intensity stays heavy. You don’t manage any of it — the day cards and logger update themselves.</p>'+
        '<p><b>Double progression.</b> Hold the same weight until you hit the <b>top of the rep range on every set</b> (e.g. all sets reach 5 on a 4×5). The logger spots it, pre-fills the suggested jump (<b>+2.5–5 lb</b> upper / <b>+5–10 lb</b> lower) into the weight placeholders, and gives you a one-tap fill.</p>'+
        '<p><b>RIR</b> = reps in reserve — how many clean reps you stop short of failure. “RIR 2” means leave about 2 in the tank. The note by each lift gives a target RIR and rest time.</p>'+
        '<p><b>Speed &amp; power quality.</b> Jumps, throws and overspeed only build speed when every rep is <i>fast</i> — <b>stop a set the instant reps visibly slow</b>, keep the implement light, and rest fully between efforts. Never grind power work.</p></div>'+
      '<div class="pb-sec"><h4>🏆 In-season &amp; peaking</h4>'+
        '<p><b>In-season (tournament stretches).</b> Hold size and strength on a fraction of the work — drop to <b>~1–2 hard sets per muscle, 1–2× a week</b>, but <b>keep the loads heavy</b>; intensity preserves strength. Keep the speed primers, cut accessory volume, switch macros to <b>In-Season Maintain</b>.</p>'+
        '<p><b>Peak for an event.</b> In the <b>7–10 days</b> before a big round or speed test, <b>cut volume ~40–50% but keep the intensity</b> (heavy singles/doubles, crisp light overspeed). You shed fatigue while holding fitness — expect a <b>~3–6%</b> power bump on the day.</p>'+
        '<p><b>Sleep is training.</b> Aim <b>7–9 h</b>. Sleep loss degrades <i>skill control</i> — tempo and strike — more than strength, so a bad week of sleep shows in your scores before your lifts.</p></div>'+
      '</div></details>';

    // Configure: settings + equipment (open state preserved across re-renders).
    html+='<details class="fold" id="setFold"'+(planState.settingsOpen?' open':'')+'><summary>⚙️ Plan &amp; settings</summary><div class="fold-body settings-body">'+
      '<div class="set-row"><span class="set-lbl">Training days / week</span><div class="seg sm" id="freqSeg">'+
        '<button type="button" data-freq="4" '+(planState.freq===4?'class="active"':'')+'>4</button>'+
        '<button type="button" data-freq="5" '+(planState.freq===5?'class="active"':'')+'>5</button></div></div>'+
      '<div class="mode-banner '+(retain?"retain":"build")+'">'+
        (retain?'🔻 <b>Retain mode</b> (auto, from your goal) — accessory volume trimmed; heavy lifts &amp; all speed work stay at full to protect muscle and clubhead speed.'
               :'🏗️ <b>Build mode</b> (auto, from your goal) — full accessory volume to add muscle, with heavy strength and speed work every week.')+'</div>'+
      '<div class="exlegend"><b>What each move builds:</b> 🏋️ strength · 💪 mass · ⚡ power/speed · 🌀 golf rotation</div>'+
      '<div class="set-jump"><select id="weekSel" aria-label="Jump to week">'+
        (function(){ var o=""; for(var wi=1;wi<=20;wi++) o+='<option value="'+wi+'"'+(wi===wk?' selected':'')+'>Week '+wi+'</option>'; return o; })()+
        '</select><button class="sb-go2" data-startweek="sel">Jump to week</button></div>'+
      '<button class="sb-link" data-reset="1">↺ Restart from week 1</button>'+
      '<div id="equipBar" class="settings-equip"></div>'+
      '</div></details>';

    $("phaseDetail").innerHTML=html;
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
