import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// Training-engine correctness (Oct 2026 audit, cluster D): ballistic loads,
// wave-aware (rep-shift) loads, the shared reduction, equipment steps, effort
// notes in context, the stall insight, event re-anchoring, smart trim, primers,
// session minutes, no-load swaps, the big-lift predicate, the speed-day ramp,
// the trap-bar swap and returning after a break. Real source, extracted by name.
const src = (f) => readFileSync(new URL(`../src/js/app/${f}`, import.meta.url), "utf8");
const PLAN = src("035-training-plan.js");
const LOGGER = src("040-workout-logger.js");
const INLINE = src("045-inline-logger-log-as-you-train-in-the-ca.js");
const HISTORY = src("050-exercise-history-every-lift-s-full-story.js");
const PLAYER = src("070-workout-player-full-screen-guided-sessio.js");
const HOME = src("075-proactive-coaching-your-focus-insights.js");
const READY = src("077-daily-readiness-adaptive-session.js");
const STATS = src("085-progress-stats-view.js");

// Balanced extraction that skips strings and comments (apostrophes in comments
// and braces inside strings would otherwise break a naive counter).
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
  const start = source.indexOf(`var ${name} = `) >= 0 ? source.indexOf(`var ${name} = `) : source.indexOf(`var ${name}=`);
  assert.ok(start >= 0, `var ${name} should exist`);
  return source.slice(start, balanced(source, start, open)) + ";";
}

const PLAN_FNS = ["effortNote", "ffOnRamp", "heavyAfter", "warmupBase", "primerFor", "purposeFor", "isBallistic",
  "isBigLift", "isBodyweightEx", "trainRetain", "adjSets", "eventInfo", "waveFor", "bumpReps", "trimSets", "plainReps",
  "waveAdjust", "effTarget", "overspeedDose", "speedDrillTarget", "prescribeW", "ffReduceLoad", "repShiftLoad",
  "normName", "have", "equipNeedsFor", "equipOk", "speedMode", "resolveEx", "resolveDay", "activeDays", "dayTargets", "sessionMinutes"];
const LOGGER_FNS = ["lastSessionFor", "sessFullDose", "repsShifted", "topReps", "isDistEx", "repSeed", "incNum",
  "progressReady", "parseSets", "getLog", "sessionFinished", "swapOptionsFor", "exGroupFor"];

function engine({ goal = "leanbulk", equip = null, store = {}, week = 2, now = Date.now(), freq = 4 } = {}) {
  const code = [
    decl(PLAN, "PHASES", "["), decl(PLAN, "EQUIPMENT", "["), decl(PLAN, "MACHINES", "["), decl(PLAN, "EX", "{"),
    decl(LOGGER, "EXERCISE_DB", "{"),
    ...PLAN_FNS.map((n) => fn(PLAN, n)), ...LOGGER_FNS.map((n) => fn(LOGGER, n)),
    fn(INLINE, "isBarbell"),
    ...["ffSessBand", "ffReadinessLoad", "ffDose", "ffBackFor", "ffReadinessRetarget", "ffReadinessAdaptSession"].map((n) => fn(READY, n)),
    fn(STATS, "bigLiftStats"), fn(PLAYER, "e1RM"), fn(PLAYER, "sessionsByWeek"), fn(PLAYER, "strengthGain"),
    fn(PLAYER, "plLifetimeBests"), fn(HOME, "ffInsights"),
  ].join("\n");
  const ctx = {
    Date: class extends Date { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } },
    __store: store,
  };
  vm.runInNewContext(`
    var state={goal:${JSON.stringify(goal)}}, __week=${week};
    var planState={phase:0,freq:${freq},equip:{}};
    function lsGet(k,d){ var v=__store[k]; return v==null?d:v; }
    function planStart(){ return lsGet("ff_start", null); }
    function curWeek(){ return __week; }
    function applySwapName(n){ var s=lsGet("ff_swaps",{}); return s[n]||n; }
    function ffEsc(s){ return String(s); }
    function lastMob(){ return null; } function speedTestDue(){ return false; } function daysSinceTest(){ return null; }
    function weightTrend(){ return null; } function ffReadinessToday(){ return lsGet("__readiness", null); }
    ${code}
    EQUIPMENT.forEach(function(e){ planState.equip[e.key]=true; });
    MACHINES.forEach(function(m){ planState.equip[m.key]=true; });
    var __eq=${JSON.stringify(equip)};
    if(__eq){ Object.keys(planState.equip).forEach(function(k){ planState.equip[k]=__eq.indexOf(k)!==-1; }); }
    this.api={ effortNote, ffOnRamp, heavyAfter, warmupBase, primerFor, purposeFor, isBallistic, isBigLift, waveFor,
      prescribeW, ffReduceLoad, repShiftLoad, incNum, ffDose, lastSessionFor, resolveDay, dayTargets, sessionMinutes,
      effTarget, swapOptionsFor, ffReadinessAdaptSession, bigLiftStats, strengthGain, plLifetimeBests, ffInsights,
      PHASES, EXERCISE_DB, setWeek:function(w){ __week=w; } };
  `, ctx);
  return ctx.api;
}

const DAY = 864e5;
function iso(t) { const d = new Date(t); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function startFor(week, now) { const d = new Date(now - (week - 1) * 7 * DAY - 2 * DAY); d.setHours(0, 0, 0, 0); return d.toISOString(); }
function logged(name, target, w, reps) { return { name, target, sets: reps.map((r) => ({ w: String(w), r: String(r), done: true })) }; }

// ---------------------------------------------------------------- 1 ballistic
test("ballistic: only the speed day's lateral chop is ballistic among chops", () => {
  const E = engine();
  assert.equal(E.isBallistic("Cable lateral chop"), true);
  assert.equal(E.isBallistic("Cable Wood-chop"), false);
  assert.equal(E.isBallistic("Band Wood-chop"), false);
  assert.equal(E.isBallistic("High-to-Low Cable Chop"), false);
  for (const n of ["Landmine rotational throw", "Rotational med-ball throw", "Seated chest throw", "Kettlebell swing", "Trap-bar jump", "Speed bench press"])
    assert.equal(E.isBallistic(n), true, n);
  // The wood-chop keeps its 🌀 dose in the wave (purposeFor unchanged).
  assert.equal(E.purposeFor("Cable Wood-chop"), "🌀");
});

test("ballistic drills never get a load bump — only the deload / recovery reductions", () => {
  const now = Date.now(), store = { ff_start: startFor(2, now) };
  const E = engine({ store, now });
  const swing = { name: "Kettlebell swing", target: "3 × 6" };
  const lx = { ...logged("Kettlebell swing", "3 × 6", 35, [6, 6, 6]), _ts: now - 7 * DAY };
  assert.deepEqual([E.ffDose("35", swing, lx, 2, {}).w, E.ffDose("35", swing, lx, 2, {}).bump], [null, false]);
  assert.equal(E.ffDose("35", swing, lx, 6, {}).w, 20);               // deload ~60%
  assert.equal(E.ffDose("35", swing, lx, 2, { readiness: { band: "recharge" } }).w, 25);   // recovery ~75%
  const bench = { name: "Barbell Bench Press", target: "4 × 5 (heavy · fast up)" };
  const blx = { ...logged("Barbell Bench Press", "4 × 5 (heavy · fast up)", 185, [5, 5, 5, 5]), _ts: now - 7 * DAY };
  const d = E.ffDose("185", bench, blx, 2, {});
  assert.equal(d.bump, true); assert.equal(d.w, 187.5);
});

// ------------------------------------------------------------ 2 rep-shift load
test("a Heavy week's lower rep target gets an Epley-matched heavier load", () => {
  const now = Date.now(), E = engine({ store: { ff_start: startFor(4, now) }, now });
  const benchLx = { ...logged("Barbell Bench Press", "4 × 5 (heavy · fast up)", 190, [5, 5, 5, 5]), _ts: now - 7 * DAY };
  const wk4 = E.ffDose("190", { name: "Barbell Bench Press", target: "4 × 3 (heavy · fast up)" }, benchLx, 4, {});
  assert.equal(wk4.w, 200); assert.equal(wk4.shift, "up");           // not 192.5 (+1 step)
  const lpLx = { ...logged("Leg Press", "4 × 6", 300, [6, 6, 6, 6]), _ts: now - 7 * DAY };
  assert.equal(E.ffDose("300", { name: "Leg Press", target: "4 × 4" }, lpLx, 4, {}).w, 315);
  // Deadlift's floor-3 drop is one rep → a ~3% match.
  const dlLx = { ...logged("Deadlift", "4 × 4 (heavy · fast up)", 315, [4, 4, 4, 4]), _ts: now - 7 * DAY };
  assert.equal(E.ffDose("315", { name: "Deadlift", target: "4 × 3 (heavy · fast up)" }, dlLx, 4, {}).w, 325);
});

test("readiness is judged against the target prescribed THEN — a missed set earns no bump", () => {
  const now = Date.now(), E = engine({ store: { ff_start: startFor(4, now) }, now });
  const missed = { ...logged("Barbell Bench Press", "4 × 5 (heavy · fast up)", 190, [5, 4, 4, 4]), _ts: now - 7 * DAY };
  const d = E.ffDose("190", { name: "Barbell Bench Press", target: "4 × 3 (heavy · fast up)" }, missed, 4, {});
  assert.equal(d.bump, false);
  assert.equal(d.w, 195);        // matched from the 4 reps actually done, no "earned" jump
});

test("back to Build reps after a Heavy block: a little lighter, never the heavy load for more reps", () => {
  const now = Date.now(), E = engine({ store: { ff_start: startFor(7, now) }, now });
  const heavy = { ...logged("Barbell Bench Press", "4 × 3 (heavy · fast up)", 200, [3, 3, 3, 3]), _ts: now - 14 * DAY + DAY };
  const d = E.ffDose("200", { name: "Barbell Bench Press", target: "4 × 5 (heavy · fast up)" }, heavy, 7, {});
  assert.equal(d.shift, "down"); assert.ok(d.w < 200 && d.w >= 190, String(d.w));
  // Peak: the load is held (no bump) and converted to the peak's rep target.
  const pk = E.ffDose("220", { name: "Barbell Bench Press", target: "2 × 5 (heavy · fast up)" },
    { ...logged("Barbell Bench Press", "4 × 3 (heavy · fast up)", 220, [3, 3, 3, 3]), _ts: now - 13 * DAY }, 19, {});
  assert.equal(pk.bump, false); assert.equal(pk.w, 207.5);
});

test("the rep ghost and placeholders follow today's target after a rep shift", () => {
  assert.match(PLAYER, /repsShifted\(lx, x\)\?repSeed\(x\.target\)/);
  assert.match(LOGGER, /repsShifted\(lx, x\)\) \? repSeed\(x\.target\)/);
  assert.match(INLINE, /shifted\)\?repSeed\(x\.target\)/);
});

// --------------------------------------------------------- shared reduction
test("every load reduction goes through ffReduceLoad and always reduces", () => {
  const E = engine();
  for (const w of [1, 2, 3, 4, 5, 7.5, 10, 12, 12.5, 20, 25, 35, 93, 135, 185, 200])
    for (const f of [0.6, 0.75, 0.9]) {
      const r = E.ffReduceLoad(w, f);
      assert.ok(r === null || (r > 0 && r < w), `${w}×${f} → ${r}`);
    }
  assert.equal(E.ffReduceLoad(200, 0.6), 120);
  assert.equal(E.ffReduceLoad(93, 0.6), 55);
  assert.equal(E.ffReduceLoad(10, 0.75), 7.5);     // was 10 (100%)
  assert.equal(E.ffReduceLoad(3, 0.6), 2);          // was 5 (167%)
  assert.equal(E.prescribeW(200, "Barbell Bench Press", false, "deload"), 120);
  assert.match(READY, /return ffReduceLoad\(last,0\.75\)/);
  assert.match(STATS, /var dw=ilTopDose\(dfe\)/);
  assert.doesNotMatch(STATS, /Math\.round\(dtop\*0\.6\/5\)/);
});

test("the modal logger's fill uses the dosed load on easy, recovery and ease-in days", () => {
  const fill = LOGGER.slice(LOGGER.indexOf('closest("[data-fill]")'));
  assert.match(fill.slice(0, 900), /red=waveFor\(wk\)==="deload" \|\| ffSessBand\(ss\)==="recharge" \|\| ffBackFor\(lx\)/);
  assert.match(fill.slice(0, 900), /ffDose\(lw, x, lx, wk, ss\)\.w/);
  assert.match(LOGGER, /Fill easy-week loads \(~60%\)/);
  assert.doesNotMatch(LOGGER, /Fill last week’s weights/);
});

// ---------------------------------------------------------------- 3 increments
test("increments follow the equipment: med ball 0, dumbbells / cables 5, barbell lower 5, upper 2.5", () => {
  const E = engine();
  const cases = { "Rotational med-ball throw": 0, "Seated chest throw": 0, "Overhead med-ball slam": 0,
    "Incline DB Press": 5, "Single-Arm DB Row": 5, "Lateral Raise": 5, "Lat Pulldown": 5, "Face Pull": 5,
    "Cable Overhead Triceps Extension": 5, "Seated Leg Curl": 5, "Leg Extension": 5,
    "Leg Press": 5, "Deadlift": 5, "Romanian Deadlift": 5, "Hip Thrust": 5, "Walking Lunge": 5,
    "Barbell Bench Press": 2.5, "Standing Overhead Press": 2.5, "Weighted Pull-up": 2.5 };
  for (const [n, v] of Object.entries(cases)) assert.equal(E.incNum(n), v, n);
  assert.equal(E.prescribeW(8, "Rotational med-ball throw", true, "accumulate"), null);
  assert.equal(E.prescribeW(50, "Incline DB Press", true, "accumulate"), 55);
  assert.match(PLAYER, /function plStepW\(name\)\{ return incNum\(name\)\|\|2; \}/);
});

// ------------------------------------------------------------ 4 effort notes
test("effort notes: failure only on a loading week, on a known lift, never with '2 in reserve'", () => {
  const E = engine({ goal: "leanbulk" });
  const ext = (ctx) => E.effortNote("3 × 12", "Leg Extension", ctx);
  assert.match(ext({}), /failure/);
  assert.match(ext({ wave: "accumulate" }), /failure/);
  assert.match(ext({ wave: "intensify" }), /failure/);
  for (const ctx of [{ wave: "deload" }, { wave: "peak" }, { band: "recharge" }, { first: true }, { onRamp: true }, { easeIn: true }, { beforeHeavy: true }])
    assert.doesNotMatch(ext(ctx), /failure/, JSON.stringify(ctx));
  assert.match(ext({ first: true }), /RIR 2/);   // agrees with "find a weight … 2 reps in reserve"
  assert.match(ext({ wave: "deload" }), /^easy · RIR 3\+/);
  assert.match(E.effortNote("4 × 6 (heavy · fast up)", "Leg Press", { wave: "deload" }), /^easy · RIR 3\+ · rest 2–3 min/);
  for (const n of ["Walking Lunge", "Bulgarian Split Squat", "Nordic / Slider Leg Curl", "Sissy Squat"])
    assert.doesNotMatch(E.effortNote("3 × 10 / leg", n, {}), /failure/, n);
  // Unchanged early returns.
  assert.equal(E.effortNote("3 × 40 yd", "Farmer Carry", { wave: "deload" }), "heavy · rest ~90s");
  assert.equal(E.effortNote("4 × 3 (explosive)", "Box Jump", {}), "max intent · full rest");
  assert.equal(E.effortNote("3 × 30 s / side", "Side Plank", {}), "steady hold · rest ~90s");
  // Cut keeps a rep back as before.
  assert.equal(engine({ goal: "cut" }).effortNote("3 × 12", "Leg Extension", {}), "RIR 1–2 · rest ~90s");
});

test("effort notes over the authored plan: no failure before a big lift or in easy weeks", () => {
  const E = engine({ goal: "bulk" });
  for (const split of ["days4", "days5"]) for (const d of E.PHASES[0][split]) {
    if (!d.ex) continue;
    const names = d.ex.map((r) => r[0]);
    d.ex.forEach((row, i) => {
      for (const wave of ["deload", "peak"]) assert.doesNotMatch(E.effortNote(row[1], row[0], { wave }), /failure/, `${row[0]} ${wave}`);
      if (E.heavyAfter(names, i)) assert.doesNotMatch(E.effortNote(row[1], row[0], { beforeHeavy: true }), /failure/, row[0]);
    });
  }
  const hinge = E.PHASES[0].days5.find((d) => /Hinge/.test(d.name)).ex.map((r) => r[0]);
  assert.equal(hinge[0], "Seated Leg Curl");               // the owner's curl-first order stays
  assert.equal(E.heavyAfter(hinge, 0), true);              // …but it's held back from failure
  assert.match(E.effortNote("3 × 12", "Seated Leg Curl", { beforeHeavy: E.heavyAfter(hinge, 0) }), /save it for the big lift/);
  // The player and the Train card both pass the context.
  assert.match(PLAYER, /effortNote\(x\.target, x\.name, effCtx\)/);
  assert.match(PLAN, /beforeHeavy:heavyAfter\(dayNames, ri\)/);
});

test("the on-ramp: weeks 1–2 only, and only with no lifting logged before the plan", () => {
  const now = Date.now(), start = startFor(1, now);
  const fresh = engine({ store: { ff_start: start }, now });
  assert.equal(fresh.ffOnRamp(1), true); assert.equal(fresh.ffOnRamp(2), true); assert.equal(fresh.ffOnRamp(3), false);
  const inSeason = engine({ store: { ff_start: start, ff_history: [{ doneTs: Date.parse(start) + DAY, ex: [] }] }, now });
  assert.equal(inSeason.ffOnRamp(2), true);
  const veteran = engine({ store: { ff_start: start, ff_history: [{ doneTs: Date.parse(start) - 30 * DAY, ex: [] }] }, now });
  assert.equal(veteran.ffOnRamp(1), false);
});

// -------------------------------------------------------------- 5 stall card
test("the stall card never fires in planned Heavy / easy weeks, only on two flat Build weeks", () => {
  const now = Date.now();
  const sess = (w, wave, wt, reps) => ({ date: "", finishedAt: "x", wave, ex: [logged("Barbell Bench Press", "4 × 5", wt, reps)] });
  const log = {
    "1|Push": sess(1, "accumulate", 180, [5, 5, 5, 5]), "2|Push": sess(2, "accumulate", 185, [5, 5, 5, 5]),
    "3|Push": sess(3, "accumulate", 190, [5, 5, 5, 5]), "4|Push": sess(4, "intensify", 192.5, [3, 3, 3, 3]),
    "5|Push": sess(5, "intensify", 195, [3, 3, 3, 3]), "6|Push": sess(6, "deload", 115, [5, 5, 5]),
  };
  for (const wk of [4, 5, 6]) {
    const L = {}; for (const k of Object.keys(log)) if (parseInt(k, 10) <= wk) L[k] = log[k];
    const E = engine({ store: { ff_start: startFor(wk, now), ff_log: L, ff_body: [] }, now, week: wk });
    assert.ok(!E.ffInsights().some((i) => /^sstall:/.test(i.sig)), `week ${wk}`);
  }
  // Two flat Build weeks below the earlier Build best → a real stall.
  const flat = { ...log, "7|Push": sess(7, "accumulate", 185, [5, 5, 5, 5]), "8|Push": sess(8, "accumulate", 185, [5, 5, 5, 5]) };
  const E = engine({ store: { ff_start: startFor(9, now), ff_log: flat, ff_body: [] }, now, week: 9 });
  assert.ok(E.ffInsights().some((i) => /^sstall:Barbell Bench Press/.test(i.sig)));
  const L = E.bigLiftStats()[0];
  assert.deepEqual(L.acc.length, 5); assert.equal(L.lastAcc, true);
  assert.doesNotMatch(HOME, /or take a deload week/);
});

// ------------------------------------------------------------ 6 event weeks
test("an event never creates back-to-back deload weeks", () => {
  const now = Date.now();
  for (const E of [4, 10, 16]) {
    const start = startFor(1, now), st = new Date(start);
    const ev = new Date(st.getTime() + ((E - 1) * 7 + 3) * DAY + 12 * 3600e3);
    const eng = engine({ store: { ff_start: start, ff_event: { date: iso(ev.getTime()), name: "Champs" } }, now });
    const waves = Array.from({ length: 20 }, (_, i) => eng.waveFor(i + 1)[0].toUpperCase()).join("");
    assert.doesNotMatch(waves, /DD/, `event week ${E}: ${waves}`);
    assert.equal(waves[E - 1], "P"); assert.equal(waves[E], "D");
    assert.ok(waves.endsWith("PP"));
  }
  assert.equal(engine().waveFor(6), "deload");   // no event: base cadence untouched
});

// -------------------------------------------------------------- 7 smart trim
test("smart trim never trims a 🏋️ strength lift", () => {
  const E = engine();
  const s = { ex: ["Barbell Bench Press", "Incline DB Press", "Standing Overhead Press", "Lateral Raise"].map((n) => ({
    name: n, target: "4 × 6", sets: Array.from({ length: 4 }, () => ({ w: "", r: "", done: false })) })) };
  const out = E.ffReadinessAdaptSession(s, { date: "d", ts: 1, score: 4, band: "steady", original: false });
  assert.deepEqual(out.ex.map((x) => x.sets.length), [4, 4, 4, 3]);
});

// ------------------------------------------------------------------ 9 primer
test("every lift day's primer is pinned (4-day lower day jumps again)", () => {
  const E = engine();
  const P = (n) => E.primerFor(n).move;
  assert.equal(P("Day 1 — Lower (Quads & Hinge)"), "Box or squat jump");
  assert.equal(P("Day 1 — Lower (Quads)"), "Box or squat jump");
  assert.equal(P("Day 4 — Lower (Hinge + Power)"), "Russian kettlebell swing");
  assert.equal(P("Day 2 — Upper (Push)"), "Explosive med-ball chest pass");
  assert.equal(P("Day 4 — Upper (Pull + Rotate)"), "Rotational med-ball throw");
});

// --------------------------------------------------------- 10 session minutes
test("'About N min' counts the real dose and moves with the wave and the goal", () => {
  const now = Date.now();
  const mins = (wk, goal = "leanbulk", split = "days4", idx = 0, freq = 4) => {
    const E = engine({ goal, store: { ff_start: startFor(wk, now) }, now, week: wk, freq });
    return E.sessionMinutes(E.PHASES[0][split].filter((d) => d.ex)[idx]);
  };
  const build = mins(2);
  assert.ok(build >= 75 && build <= 95, `4-day Day 1 build week: ${build}`);   // was a flat 65
  assert.ok(mins(6) < build, "deload is shorter"); assert.ok(mins(19) < mins(6), "peak is shorter still");
  assert.ok(mins(2, "cut") < build, "retain trims accessory sets");
  const E = engine({ store: { ff_start: startFor(2, now) }, now });
  const speed = E.sessionMinutes(E.PHASES[0].days4.find((d) => d.type === "speed"));
  assert.ok(speed % 5 === 0 && speed >= 40 && speed <= 90, String(speed));
  assert.equal(E.sessionMinutes({ type: "rest" }), 10);
  // One pipeline: the logger builds sessions from the same dayTargets.
  assert.match(LOGGER, /var ex = dayTargets\(day, week\)\.map/);
});

// ------------------------------------------------------- 11 no-load swaps
test("bodyweight subs get their own regression targets, Nordics low-rep eccentric", () => {
  for (const preset of [["bodyweight"], ["bodyweight", "bands"]]) {
    const E = engine({ equip: preset, goal: "leanbulk" });
    for (const split of ["days4", "days5"]) for (const d of E.PHASES[0][split]) {
      if (!d.ex) continue;
      E.resolveDay(d.ex).forEach((r) => {
        if (r.status !== "swap") return;
        assert.doesNotMatch(String(r.sr), /heavy/, `${r.name}: ${r.sr}`);
        if (/Nordic/.test(r.name)) { assert.match(r.sr, /^2 × 5 \(slow lowering only/); }
        if (/Plank|Hold/.test(r.name)) assert.match(r.sr, /\d+ s\b/);
        if (/Nordic|Sissy/.test(r.name)) assert.doesNotMatch(E.effortNote(r.sr, r.name, {}), /failure/);
      });
    }
  }
  // Sub names never change (history keys off them).
  assert.match(PLAN, /name:"Nordic \/ Slider Leg Curl",sr:/);
  assert.match(PLAN, /name:"Push-up \(weighted \/ feet-elevated\)",sr:/);
});

// ------------------------------------------------------------ 12 big lifts
test("one isBigLift: no throws, speed work or Pallof in strength / PRs", () => {
  const E = engine();
  for (const n of ["Rotational med-ball throw", "Seated chest throw", "Landmine rotational throw", "Speed bench press",
    "Pallof Press", "Band Pallof Press", "Explosive DB Floor Press", "Trap-bar jump", "Kettlebell swing"])
    assert.equal(E.isBigLift(n, true), false, n);
  for (const n of E.EXERCISE_DB["Power / speed (golf)"]) assert.equal(E.isBigLift(n, true), false, n);
  for (const n of ["Barbell Bench Press", "Romanian Deadlift", "Leg Press", "Hip Thrust", "Weighted Pull-up",
    "Chest-Supported Row", "Single-Arm DB Row", "Standing Overhead Press", "Landmine Press", "Deadlift"])
    assert.equal(E.isBigLift(n), true, n);
  assert.equal(E.isBigLift("Walking Lunge"), false); assert.equal(E.isBigLift("Walking Lunge", true), true);
  // A Pallof stack jump no longer moves the strength pillar.
  const sess = (w, wt) => ({ finishedAt: "x", ex: [logged("Pallof Press", "3 × 12 / side", wt, [12, 12, 12])] });
  const P = engine({ store: { ff_log: { "1|A": sess(1, 20), "2|A": sess(2, 30) } } });
  assert.equal(P.strengthGain(), null);
  for (const re of [/KEY=\/Squat\|Deadlift/, /\/Squat\|Deadlift\|Bench\|Press\|Row\|Romanian/]) {
    assert.doesNotMatch(PLAYER, re); assert.doesNotMatch(STATS, re);
  }
});

// ------------------------------------------------------- 13 speed-day ramp
test("the speed day warms up with easy jumps and throws before max intent", () => {
  const list = engine().warmupBase("speed");
  assert.ok(list.some((m) => /Ramp-up jumps and throws/.test(m[0])));
  assert.ok(list.findIndex((m) => /Ramp-up/.test(m[0])) === list.length - 1);
});

// ------------------------------------------------------------- 14 trap bar
test("the deadlift keeps its name; the trap bar is the first one-tap swap", () => {
  const E = engine();
  assert.equal(E.swapOptionsFor("Deadlift")[0], "Trap-Bar Deadlift");
  assert.equal(E.swapOptionsFor("Romanian Deadlift")[0], "Conventional Deadlift");
  assert.match(PLAN, /\["Deadlift","4 \\u00d7 4 \(heavy \\u00b7 fast up\)"\]/);
});

// ------------------------------------------------ 8 return after a break
test("a restart keeps the loads: lastSessionFor falls back to earlier seasons' history", () => {
  const now = Date.now(), start = startFor(1, now);
  const hist = [
    { id: "a", week: 3, day: "Day 1 — Lower (Quads & Hinge)", doneTs: now - 40 * DAY, ex: [logged("Leg Press", "4 × 6", 300, [6, 6, 6, 6])] },
    { id: "b", week: 6, day: "Day 1 — Lower (Quads & Hinge)", wave: "deload", doneTs: now - 36 * DAY, ex: [logged("Leg Press", "3 × 6", 180, [6, 6, 6])] },
  ];
  const E = engine({ store: { ff_start: start, ff_history: hist, ff_log: {} }, now, week: 1 });
  const last = E.lastSessionFor("Day 1 — Lower (Quads & Hinge)", 1);
  const lx = last.ex.find((x) => x.name === "Leg Press");
  assert.equal(lx.sets[0].w, "300");                      // the full dose, not the deload
  assert.equal(lx._prior, true); assert.equal(lx._ts, now - 40 * DAY);
  const d = E.ffDose("300", { name: "Leg Press", target: "4 × 6" }, lx, 1, {});
  assert.equal(d.bump, false); assert.equal(d.back, true); assert.equal(d.w, 270);   // ~90%: ease in
});

test("time decay: 14+ days → no bump, 28+ → ~90%, a normal week → progression as before", () => {
  const now = Date.now(), E = engine({ store: { ff_start: startFor(8, now) }, now, week: 8 });
  const x = { name: "Leg Press", target: "4 × 6" };
  const lx = (days) => ({ ...logged("Leg Press", "4 × 6", 300, [6, 6, 6, 6]), _ts: now - days * DAY });
  assert.deepEqual([E.ffDose("300", x, lx(5), 8, {}).w, E.ffDose("300", x, lx(5), 8, {}).bump], [305, true]);
  assert.deepEqual([E.ffDose("300", x, lx(18), 8, {}).w, E.ffDose("300", x, lx(18), 8, {}).bump], [null, false]);
  const back = E.ffDose("300", x, lx(30), 8, {});
  assert.deepEqual([back.w, back.bump, back.back], [270, false, true]);
  assert.equal(E.ffDose("300", x, lx(30), 6, {}).w, 180);  // a deload is still lower than the ease-in
  assert.equal(E.ffDose("300", x, { ...lx(30), _reduced: true }, 8, {}).w, null);
});

test("in-season sessions take their finish time from ff_history, not the edit stamp", () => {
  const now = Date.now(), start = startFor(8, now);
  const s = { date: "", wave: "accumulate", _ts: now, ex: [logged("Leg Press", "4 × 6", 300, [6, 6, 6, 6])] };   // a restore re-stamped _ts
  const hist = [{ id: "x", week: 3, day: "Day 1", doneTs: now - 35 * DAY, ex: s.ex }];
  const E = engine({ store: { ff_start: start, ff_log: { "3|Day 1": s }, ff_history: hist }, now, week: 8 });
  const lx = E.lastSessionFor("Day 1", 8).ex[0];
  assert.equal(lx._ts, now - 35 * DAY);
  assert.match(HISTORY, /wave:sess\.wave\|\|undefined, rb:rb/);
});

test("the player's PR check uses lifetime bests — no false 'New ceiling' after a restart", () => {
  const now = Date.now();
  const hist = [{ id: "old", week: 9, day: "Push", doneTs: now - 80 * DAY, ex: [logged("Barbell Bench Press", "4 × 5", 185, [6, 6, 6, 6])] }];
  const log = { "1|Push": { finishedAt: "x", ex: [logged("Barbell Bench Press", "4 × 5", 135, [8, 8, 8, 8])] } };
  const E = engine({ store: { ff_start: startFor(2, now), ff_history: hist, ff_log: log }, now });
  const best = E.plLifetimeBests();
  assert.ok(best["Barbell Bench Press"] > 220, String(best["Barbell Bench Press"]));   // 185×6 e1RM ≈ 222
  assert.match(PLAYER, /var prevBest=plLifetimeBests\(\);/);
});
