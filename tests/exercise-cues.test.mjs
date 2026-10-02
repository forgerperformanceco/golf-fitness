import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// Exercise cues (Oct 2026 audit, cluster E): every prescribed lift — the plan
// days, every equipment swap and both speed days — gets the "why" + cue
// (liftWhy) and the how-to sheet (exerciseForm) of ITS OWN movement. Both are
// first-match regex chains, so order bugs are silent: /Hop/ matched "cHOP",
// "Lat" matched "Lateral Raise", "Chest" caught "Chest-Supported Row", the
// squat entry caught split squats and the Pallof press was told to rotate.
const src = (f) => readFileSync(new URL(`../src/js/app/${f}`, import.meta.url), "utf8");
const PLAN = src("035-training-plan.js");
const INLINE = src("045-inline-logger-log-as-you-train-in-the-ca.js");

function balanced(source, from, open) {
  let i = source.indexOf(open, from), depth = 0;
  const close = { "{": "}", "[": "]" }[open];
  for (let j = i; j < source.length; j++) {
    const c = source[j];
    if (c === "/" && source[j + 1] === "/") { j = source.indexOf("\n", j); if (j < 0) break; continue; }
    if (c === "/" && source[j + 1] === "*") { j = source.indexOf("*/", j + 2) + 1; continue; }
    if (c === '"' || c === "'") { const q = c; j++; while (j < source.length && source[j] !== q) { if (source[j] === "\\") j++; j++; } continue; }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return j + 1;
  }
  throw new Error("unbalanced from " + from);
}
function fn(source, name) {
  const m = new RegExp("(^|\\n)[ \\t]*function " + name + "\\s*\\(").exec(source);
  assert.ok(m, `${name} should exist`);
  const start = m.index + (m[1] ? 1 : 0);
  return source.slice(start, balanced(source, start, "{"));
}
function decl(source, name, open) {
  const start = source.indexOf(`var ${name} = `);
  assert.ok(start >= 0, `var ${name} should exist`);
  return source.slice(start, balanced(source, start, open)) + ";";
}

const ctx = {};
vm.runInNewContext([fn(INLINE, "liftWhy"), fn(INLINE, "exerciseForm"), decl(PLAN, "PHASES", "["), decl(PLAN, "EX", "{"),
  fn(PLAN, "primerFor"), fn(PLAN, "isBallistic"), fn(PLAN, "purposeFor")].join("\n") +
  "\nthis.api={liftWhy,exerciseForm,PHASES,EX,primerFor,isBallistic};", ctx);
const { liftWhy, exerciseForm, PHASES, EX, primerFor, isBallistic } = ctx.api;

// Each family is identified by its how-to "Works:" line (exerciseForm.mu)
// AND its "why" opening (liftWhy.why) — both must agree.
const FAMILY = {
  overspeed:   [/^Full body · CNS/, /^Overspeed swinging/],
  footwork:    [/^Glutes · quads · calves · feet/, /^Clubhead speed starts from the ground/],
  antirot:     [/anti-rotation/, /brake as well as its engine/],
  landmine:    [/^Obliques · deep core · hips/, /^Your core passes power .* loaded bar/],
  chestthrow:  [/upper-body power/, /^Upper-body explosive strength/],
  slam:        [/^Lats · abs · shoulders · hips/, /^Slams train/],
  throw:       [/^Core · hips · chest\/shoulders/, /^Explosive throws/],
  rotation:    [/^Obliques · deep core · hips/, /^Your core passes power .* Rotational work/],
  reactive:    [/quick contacts/, /^Quick-contact jumps/],
  jump:        [/^Glutes · quads · hamstrings · calves/, /^Jumps train/],
  clean:       [/^Glutes · hamstrings · traps/, /^Olympic-style/],
  calf:        [/^Calves · ankle/, /^Your ankles/],
  legext:      [/^Quads \(isolation\)/, /^Direct quad work/],
  legpress:    [/^Quads · glutes$/, /^The leg press/],
  squat:       [/^Quads · glutes · core/, /^Strong legs are where/],
  legcurl:     [/^Hamstrings \(knee flexion\)/, /^Curls train the hamstring/],
  hinge:       [/^Hamstrings · glutes · lower back/, /^The downswing is a violent hip/],
  swing:       [/^Glutes · hamstrings · core/, /^The downswing is a violent hip/],
  thrust:      [/^Glutes · hamstrings · core/, /^The downswing is a violent hip/],
  lunge:       [/^Quads · glutes · balance/, /^At impact nearly all/],
  reardelt:    [/^Rear delts/, /^Your rear shoulders/],
  raise:       [/^Side delts/, /^Strong, healthy delts/],
  ohp:         [/^Shoulders · triceps · upper chest/, /^Overhead pressing/],
  speedbench:  [/\(speed\)$/, /^A light bar pressed/],
  bench:       [/^Chest · shoulders · triceps$/, /^Pressing strength/],
  pull:        [/^Lats · upper back/, /^The lead arm pulls/],
  carry:       [/^Grip · traps · core/, /^A stable trunk and strong grip/],
  abs:         [/^Abs · hip flexors/, /^Your abs link/],
  plank:       [/^Deep core · abs · obliques/, /^Trunk stiffness/],
  triceps:     [/^Triceps \(long head\)/, /^Arms guide the club/],
  arms:        [/^Arms \(biceps/, /^Arms guide the club/],
};
function familyOf(name) {
  const mu = exerciseForm(name).mu, why = liftWhy(name).why;
  const hits = Object.keys(FAMILY).filter((k) => FAMILY[k][0].test(mu) && FAMILY[k][1].test(why));
  return hits.length ? hits : ["generic"];
}
function is(name, fam) {
  const got = familyOf(name);
  assert.ok(got.includes(fam), `${name} → ${got.join("/")} (mu "${exerciseForm(name).mu}"), expected ${fam}`);
}

// Every name the app can PRESCRIBE: the plan days, each day's power primer,
// both speed-day lists, and every equipment substitute.
function prescribedNames() {
  const out = new Set(), P = PHASES[0];
  for (const k of ["field", "gym"]) for (const e of P.speed[k].ex) out.add(e[0]);
  for (const k of ["days5", "days4"]) for (const d of P[k]) {
    for (const e of d.ex || []) out.add(e[0]);
    if (d.type !== "rest" && d.type !== "speed") out.add(primerFor(d.name).move);
  }
  for (const [k, v] of Object.entries(EX)) { out.add(k); for (const s of v.subs) out.add(s.name); }
  return [...out];
}

test("every prescribed name reaches a real movement entry, never the generic fallback", () => {
  const names = prescribedNames();
  assert.ok(names.length > 100, String(names.length));
  for (const n of names) assert.notDeepEqual(familyOf(n), ["generic"], `${n} fell through to the generic cue`);
});

test("chops are rotation work, never jump coaching (/Hop/ used to match 'cHOP')", () => {
  for (const n of ["Cable Wood-chop", "Band Wood-chop", "Cable lateral chop"]) {
    is(n, "rotation");
    const all = liftWhy(n).cue + " " + exerciseForm(n).cues.join(" ");
    assert.doesNotMatch(all, /ground contact|Land soft|quick dip/i, n);
  }
  // The push day's chop is graded core work; only the speed day's chop is max intent.
  assert.equal(isBallistic("Cable Wood-chop"), false);
  assert.equal(isBallistic("Cable lateral chop"), true);
});

test("Pallof / anti-rotation work is cued to RESIST the turn", () => {
  for (const n of ["Pallof Press", "Band Pallof Press", "Single-Arm Pallof Press", "Cable Pallof Iso Hold",
    "Anti-rotation Cable Hold", "Band Anti-rotation Hold"]) {
    is(n, "antirot");
    const all = liftWhy(n).cue + " " + exerciseForm(n).cues.join(" ");
    assert.doesNotMatch(all, /turn hard|rotate from|turning the hips|turn from the hips/i, n);
    assert.match(all, /don't let it turn you|never turns you/i, n);
  }
  // Real rotation still gets the rotation cue.
  for (const n of ["Cable Rotation", "Band Rotation", "Speed Russian Twist", "Cable Rotational Punch"]) is(n, "rotation");
  is("Landmine Rotation", "landmine");
  is("Landmine rotational throw", "landmine");
});

test("raises, face pulls, rows and presses each get their own cues", () => {
  for (const n of ["Lateral Raise", "Band Lateral Raise"]) {
    is(n, "raise");
    assert.doesNotMatch(liftWhy(n).cue + exerciseForm(n).mu, /Pull with the back|Lats/, n);
  }
  for (const n of ["Face Pull", "Band Face Pull", "Rear-Delt Raise", "Prone Y-T-W Raises"]) is(n, "reardelt");
  for (const n of ["Chest-Supported Row", "Weighted Pull-up", "Lat Pulldown", "Single-Arm DB Row", "Inverted Row", "Band Row", "Pendlay Row"]) {
    is(n, "pull");
    assert.doesNotMatch(exerciseForm(n).cues.join(" "), /slight arch|mid-chest/, n);
  }
  for (const n of ["Standing Overhead Press", "Seated DB Shoulder Press", "Band Overhead Press", "Standing DB Press"]) is(n, "ohp");
  for (const n of ["Barbell Bench Press", "Incline DB Press", "Single-Arm DB Bench Press", "Floor DB Press", "Single-Arm Band Press"]) is(n, "bench");
  is("Hanging Leg Raise", "abs");
  is("Lying Leg Raise", "abs");
  is("Towel / Plate Pinch Hold", "carry");   // "Plate" used to read as "Lat"
});

test("split squats use the lunge entry; the leg press keeps the pelvis on the pad", () => {
  for (const n of ["Bulgarian Split Squat", "Split Squat", "Rear-Foot-Elevated Split Squat", "Walking Lunge"]) {
    is(n, "lunge");
    assert.doesNotMatch(exerciseForm(n).cues.join(" "), /parallel/, n);
  }
  is("Leg Press", "legpress");
  const lp = exerciseForm("Leg Press").cues.join(" ");
  assert.match(lp, /hips stay on the pad/);
  assert.doesNotMatch(lp, /at least parallel/);
  for (const n of ["Back Squat", "Front Squat", "Goblet Squat", "Tempo Bodyweight Squat (3-1-1, +1.5 reps)"]) is(n, "squat");
  // No "#1 driver" ranking for vertical force anywhere in the copy.
  for (const n of ["Leg Press", "Back Squat", "Goblet Squat"]) assert.doesNotMatch(liftWhy(n).why, /#1|push the ground hardest/, n);
  is("Single-leg Glute Bridge", "thrust");
  is("Single-leg RDL", "hinge");
});

test("jumps teach soft, quiet, stuck landings — never a stiff, minimum-contact cue", () => {
  for (const n of ["Countermovement jump", "Lateral bound", "Trap-bar jump", "Box Jump", "Squat Jump / Tuck Jump",
    "Broad Jump", "Box or squat jump"]) {
    is(n, "jump");
    const cue = liftWhy(n).cue, form = exerciseForm(n);
    assert.match(cue, /land soft and quiet/i, n);
    assert.doesNotMatch(cue, /ground contact/i, n);
    assert.match(form.cues.join(" "), /Land soft and quiet/, n);
    assert.match(form.miss.join(" "), /stiff/i, n);   // stiff landing is named as the mistake
  }
  // Quick-contact work is its own (opt-in, advanced) entry and still lands quietly.
  for (const n of ["Depth Jump", "Pogo Hops"]) {
    is(n, "reactive");
    assert.match(liftWhy(n).cue, /quiet/i, n);
  }
});

test("throws: the chest throw is upper-body (no legs), the slam is vertical, rotational throws release", () => {
  for (const n of ["Seated chest throw", "Med-Ball Chest Pass", "Explosive med-ball chest pass"]) {
    is(n, "chestthrow");
    assert.doesNotMatch(exerciseForm(n).cues.join(" "), /back hip/i, n);
  }
  is("Overhead med-ball slam", "slam");
  for (const n of ["Rotational med-ball throw", "Med-Ball Rotational Throw", "Med-Ball Side Throw"]) is(n, "throw");
  // A band can't be let go of — it gets the rotation cue, not "through the release".
  is("Band Rotational Throw", "rotation");
});

test("speed-day and primer names: swings hinge, speed bench is a fast press (not a throw)", () => {
  is("Kettlebell swing", "swing");
  is("Russian kettlebell swing", "swing");   // "Russian" used to read as a Russian twist
  is("Speed bench press", "speedbench");
  assert.doesNotMatch(liftWhy("Speed bench press").why + exerciseForm("Speed bench press").mu, /ballistic|throw violently/i);
  assert.match(liftWhy("Speed bench press").why, /isn't a true throw/);
  is("Overspeed swings", "overspeed");
  is("Ground-force footwork", "footwork");
});

test("bodyweight and band swaps never get barbell, pad, seat or bench coaching", () => {
  const BW = ["Push-up (weighted / feet-elevated)", "Decline / Feet-elevated Push-up", "Archer Push-up", "Clap Push-up",
    "Explosive / Clap Push-up", "Diamond Push-up", "Push-up / Bench Dip", "Pike Push-up", "Nordic / Slider Leg Curl",
    "Band Leg Curl", "Sissy Squat"];
  for (const n of BW) {
    const f = exerciseForm(n), all = [liftWhy(n).cue, ...f.cues, ...f.miss].join(" ");
    assert.doesNotMatch(all, /\bbar\b|\bpad\b|\bseat\b|\bbench\b|thigh pad|slight arch/i, n);
  }
  // A push-up is a rigid plank; sagging hips is the named mistake (an arch is the fault, not the cue).
  for (const n of ["Archer Push-up", "Diamond Push-up", "Clap Push-up"]) {
    is(n, "bench");
    assert.match(exerciseForm(n).cues.join(" "), /Rigid plank head to heels/, n);
    assert.match(exerciseForm(n).miss.join(" "), /Hips sagging/, n);
  }
  is("Pike Push-up", "ohp");
  assert.match(liftWhy("Pike Push-up").cue + exerciseForm("Pike Push-up").cues.join(" "), /head toward the floor/);
  is("Nordic / Slider Leg Curl", "legcurl");
  assert.match(exerciseForm("Nordic / Slider Leg Curl").cues.join(" "), /ankles anchored[\s\S]*as slowly as you can[\s\S]*catch yourself with your hands/);
  is("Band Leg Curl", "legcurl");
  is("Sissy Squat", "legext");
  assert.match(exerciseForm("Sissy Squat").cues.join(" "), /support|post/i);
  assert.match(exerciseForm("Sissy Squat").cues.join(" "), /knees forward/);
  is("Weighted Dip", "bench");
  assert.doesNotMatch(exerciseForm("Weighted Dip").cues.join(" ") + exerciseForm("Weighted Dip").miss.join(" "), /mid-chest|off the bench|slight arch/);
  // Machine curls keep their pad / seat set-up.
  assert.match(exerciseForm("Seated Leg Curl").cues.join(" "), /thigh pad/);
});

test("the speed day's chop and punch are coached for speed; the push day's wood-chop stays controlled", () => {
  for (const n of ["Cable lateral chop", "Cable Rotational Punch", "Band Rotational Punch", "Cable/Band Rotational Punch"]) {
    is(n, "rotation");
    assert.equal(isBallistic(n), true, n);
    const all = liftWhy(n).cue + " " + exerciseForm(n).cues.join(" ");
    assert.match(all, /as fast as you can/, n);
    assert.doesNotMatch(all, /control the (way back|return)/i, n);
  }
  for (const n of ["Cable Wood-chop", "Band Wood-chop"]) {
    assert.equal(isBallistic(n), false, n);
    assert.match(liftWhy(n).cue, /control the way back/, n);
  }
});
