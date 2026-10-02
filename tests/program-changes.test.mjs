import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// The Oct 2026 program changes (owner-approved follow-ups from the deep audit):
// upper body twice a week, more hamstring/side-delt/calf work, the new-lifter
// volume on-ramp, in-season mode, trap-bar default for flagged backs, the gym
// chest throw, lighter landings for heavier/older golfers, the pull-up check and
// the round-aware note. Real source, extracted by name.
const src = (f) => readFileSync(new URL(`../src/js/app/${f}`, import.meta.url), "utf8");
const PLAN = src("035-training-plan.js");
const LOGGER = src("040-workout-logger.js");
const HOME = src("075-proactive-coaching-your-focus-insights.js");
const GAME = src("080-game-day-round-day-fueling-warm-up-plan.js");
const MODEL = src("024-macro-model.js");

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

function engine({ goal = "leanbulk", store = {}, prep = [], inseason = false, equip = null, profile = {} } = {}) {
  const ctx = { __store: { fairwayfuel: profile, ...store } };
  vm.runInNewContext(`
    var state={goal:${JSON.stringify(goal)}, prep:${JSON.stringify(prep)}, inseason:${inseason}};
    var planState={phase:0,freq:4,equip:{}};
    function lsGet(k,d){ var v=__store[k]; return v==null?d:v; }
    function lsSet(k,v){ __store[k]=v; }
    function planStart(){ return lsGet("ff_start", null); }
    function getSwaps(){ return lsGet("ff_swaps", {}); }
    var FF_PLAN_RENAMED={};
    ${decl(PLAN, "PHASES", "[")} ${decl(PLAN, "EQUIPMENT", "[")} ${decl(PLAN, "MACHINES", "[")}
    ${["purposeFor", "isBallistic", "trainRetain", "adjSets", "eventInfo", "waveFor", "bumpReps", "trimSets", "plainReps",
       "waveAdjust", "capSets", "plainSetCount", "ffInSeason", "ffInSeasonMode", "ffInSeasonPlan", "ffOnRamp", "ffHealth", "ffHealthCaution", "effTarget", "overspeedDose", "speedDrillTarget",
       "speedMode", "have", "ffLowImpact", "speedRows"].map((n) => fn(PLAN, n)).join("\n")}
    ${["ffProfileDefault", "applySwapName", "setSwap", "ffPullCapNeeded", "ffPullAssist"].map((n) => fn(LOGGER, n)).join("\n")}
    ${fn(MODEL, "ffBmi")}
    EQUIPMENT.forEach(function(e){ planState.equip[e.key]=true; });
    MACHINES.forEach(function(m){ planState.equip[m.key]=true; });
    var __eq=${JSON.stringify(equip)};
    if(__eq){ Object.keys(planState.equip).forEach(function(k){ planState.equip[k]=__eq.indexOf(k)!==-1; }); }
    this.api={ PHASES, effTarget, speedRows, applySwapName, setSwap, ffPullCapNeeded, ffPullAssist, ffLowImpact,
      purposeFor, state:state, store:__store };
  `, ctx);
  return ctx.api;
}
const vet = [{ doneTs: Date.now() - 400 * 864e5, ex: [] }];   // lifted before this plan
const START = new Date(Date.now() - 3 * 864e5).toISOString();

// Fractional weekly sets per muscle from the authored plan (build week, no on-ramp).
const MAP = {
  "Barbell Bench Press": { chest: 1, tri: .5, fdelt: .5 }, "Incline DB Press": { chest: 1, fdelt: .5, tri: .5 },
  "Standing Overhead Press": { fdelt: 1, sdelt: .5, tri: .5 }, "Single-Arm DB Bench Press": { chest: 1, tri: .5 },
  "Single-Arm DB Row": { back: 1, bi: .5, rdelt: .5 }, "Chest-Supported Row": { back: 1, bi: .5, rdelt: .5 },
  "Weighted Pull-up": { back: 1, bi: .5 }, "Lat Pulldown": { back: 1, bi: .5 },
  "Lateral Raise": { sdelt: 1 }, "Face Pull": { rdelt: 1 },
  "Seated Leg Curl": { ham: 1 }, "Romanian Deadlift": { ham: 1, glute: .5 }, "Deadlift": { ham: .5, glute: .5 },
  "Standing Calf Raise": { calf: 1 },
};
function weekly(E, split) {
  const out = {}, days = {};
  for (const d of E.PHASES[0][split]) {
    if (!d.ex) continue;
    for (const [name, sr] of d.ex) {
      const m = MAP[name]; if (!m) continue;
      const n = parseInt(E.effTarget(sr, name, 2), 10);
      for (const [mu, f] of Object.entries(m)) {
        out[mu] = (out[mu] || 0) + n * f;
        if (f === 1) (days[mu] = days[mu] || new Set()).add(d.name);
      }
    }
  }
  return { sets: out, freq: Object.fromEntries(Object.entries(days).map(([k, v]) => [k, v.size])) };
}

test("upper body is trained twice a week in both splits (row/press swap)", () => {
  const E = engine({ store: { ff_start: START, ff_history: vet } });
  for (const split of ["days4", "days5"]) {
    const { freq } = weekly(E, split);
    for (const mu of ["chest", "back"]) assert.equal(freq[mu], 2, `${split} ${mu} on 2 days`);
    const push = E.PHASES[0][split].find((d) => /Push/.test(d.name)).ex.map((r) => r[0]);
    const pull = E.PHASES[0][split].find((d) => /Pull/.test(d.name)).ex.map((r) => r[0]);
    assert.ok(push.includes("Single-Arm DB Row") && pull.includes("Single-Arm DB Bench Press"));
  }
});

test("hamstrings, side delts and calves get more work; 5-day knee flexion twice a week", () => {
  const E = engine({ store: { ff_start: START, ff_history: vet } });
  const five = weekly(E, "days5"), four = weekly(E, "days4");
  assert.equal(five.freq.ham, 2, "5-day: leg curl/RDL on both lower days");
  assert.ok(five.sets.ham >= 10, `5-day hamstrings ${five.sets.ham}`);
  assert.ok(four.sets.ham >= 8, `4-day hamstrings ${four.sets.ham}`);
  for (const s of [five, four]) assert.ok(s.sets.sdelt >= 6, `side delts ${s.sets.sdelt}`);
  assert.ok(five.sets.calf >= 7, `5-day calves ${five.sets.calf}`);
  assert.ok(four.sets.calf >= 4, `4-day calves ${four.sets.calf}`);
  // Per-session ceiling (~11 fractional sets/muscle, Remmert/Pelland) respected.
  for (const split of ["days4", "days5"]) for (const d of E.PHASES[0][split]) {
    if (!d.ex) continue;
    const per = {};
    for (const [name, sr] of d.ex) for (const [mu, f] of Object.entries(MAP[name] || {}))
      per[mu] = (per[mu] || 0) + parseInt(E.effTarget(sr, name, 2), 10) * f;
    for (const [mu, v] of Object.entries(per)) assert.ok(v <= 12, `${split} ${d.name} ${mu} ${v}`);
  }
  // 4-day: Pallof moved to the pull day, so Day 1 is shorter.
  const d1 = E.PHASES[0].days4[0].ex.map((r) => r[0]);
  assert.ok(!d1.includes("Pallof Press") && E.PHASES[0].days4.find((d) => /Pull/.test(d.name)).ex.some((r) => r[0] === "Pallof Press"));
});

test("new-lifter on-ramp: one set off 💪 accessories in weeks 1–2 only, never off big lifts", () => {
  const fresh = engine({ store: { ff_start: START, ff_history: [] } });
  const veteran = engine({ store: { ff_start: START, ff_history: vet } });
  assert.equal(fresh.effTarget("3 × 12", "Leg Extension", 1), "2 × 12");
  assert.equal(veteran.effTarget("3 × 12", "Leg Extension", 1), "3 × 12");
  assert.equal(fresh.effTarget("4 × 6 (heavy · fast up)", "Leg Press", 1), "4 × 6 (heavy · fast up)");
  assert.equal(fresh.effTarget("3 × 12", "Leg Extension", 3), "3 × 12", "week 3: full dose");
  assert.equal(fresh.effTarget("2 × 15", "Wrist Curl + Reverse", 1), "2 × 15", "floor of 2 sets");
});

test("in-season: every lift capped at 2 hard sets, power at 3, reps and loads kept", () => {
  const E = engine({ inseason: true, store: { ff_start: START, ff_history: vet } });
  assert.equal(E.effTarget("4 × 5 (heavy · fast up)", "Barbell Bench Press", 3), "2 × 5 (heavy · fast up)");
  assert.equal(E.effTarget("4 × 15", "Lateral Raise", 3), "2 × 15");
  assert.equal(E.effTarget("4 × 3", "Countermovement jump", 3), "3 × 3");
  assert.equal(E.effTarget("3 × 40 yd", "Farmer Carry", 3), "2 × 40 yd");
  // Off by default.
  assert.equal(engine({ store: { ff_history: vet } }).effTarget("4 × 15", "Lateral Raise", 3), "4 × 15");
  assert.match(src("020-persistence-remember-everything-per-devi.js"), /inseason:\(state\.inseason===true\?"lite":\(state\.inseason\|\|false\)\)/);
});

test("flagged back + a barbell → trap-bar deadlift by default; an explicit choice wins", () => {
  const E = engine({ prep: ["back"] });
  assert.equal(E.applySwapName("Deadlift"), "Trap-Bar Deadlift");
  assert.equal(E.purposeFor("Trap-Bar Deadlift"), "🏋️");
  E.setSwap("Deadlift", "Deadlift");                       // "I want the conventional bar"
  assert.equal(E.applySwapName("Deadlift"), "Deadlift");
  assert.equal(engine({}).applySwapName("Deadlift"), "Deadlift", "no back flag: conventional");
  assert.equal(engine({ prep: ["back"], equip: ["bodyweight", "dumbbells"] }).applySwapName("Deadlift"), "Deadlift",
    "no barbell: the gear subs handle it");
});

test("gym speed day: a med ball turns the speed bench into the seated chest throw", () => {
  const withBall = engine({}).speedRows("gym").map((r) => r[0]);
  assert.ok(withBall.includes("Seated chest throw") && !withBall.includes("Speed bench press"));
  const noBall = engine({ equip: ["bodyweight", "barbell", "bench", "dumbbells", "kettlebell", "cable"] }).speedRows("gym").map((r) => r[0]);
  assert.ok(noBall.includes("Speed bench press"));
  const E = engine({ store: { ff_swaps: { "Speed bench press": "Explosive DB Push Press" } } });
  assert.ok(E.speedRows("gym").some((r) => r[0] === "Explosive DB Push Press" && r[4] === true), "a user swap wins");
});

test("lighter landing dose for BMI 30+ or age 60+, nothing else changes", () => {
  const big = engine({ profile: { age: "45", weight: "265", heightFt: "5", heightIn: "10" } });
  const older = engine({ profile: { age: "64", weight: "175", heightFt: "5", heightIn: "10" } });
  const typical = engine({ profile: { age: "38", weight: "185", heightFt: "5", heightIn: "11" } });
  assert.equal(big.ffLowImpact(), true); assert.equal(older.ffLowImpact(), true); assert.equal(typical.ffLowImpact(), false);
  const cmj = (E) => E.speedRows("field").find((r) => r[0] === "Countermovement jump");
  assert.equal(cmj(big)[1], "3 × 3"); assert.equal(cmj(typical)[1], "4 × 3");
  assert.match(cmj(big)[2], /small, quiet landings/);
  const throwRow = big.speedRows("field").find((r) => r[0] === "Rotational med-ball throw");
  assert.equal(throwRow[1], "4 × 4 / side", "throws keep their dose");
});

test("pull-up check: asked once before the first pull session; 'not yet' swaps to an assisted version", () => {
  const pull = { ex: [["Weighted Pull-up", "4 × 6 (fast up)"]] };
  const E = engine({});
  assert.equal(E.ffPullCapNeeded(pull), true);
  assert.equal(E.ffPullCapNeeded({ ex: [["Lat Pulldown", "3 × 12"]] }), false);
  assert.equal(E.ffPullAssist(), "Assisted Pull-up");
  assert.equal(engine({ equip: ["bodyweight", "pullupbar", "bands"] }).ffPullAssist(), "Band-assisted Pull-up");
  assert.equal(engine({ equip: ["bodyweight", "pullupbar"] }).ffPullAssist(), "Negative Pull-up (5 s lowering)");
  assert.equal(engine({ store: { ff_insights_seen: ["pullup-cap"] } }).ffPullCapNeeded(pull), false, "answered");
  assert.equal(engine({ store: { ff_swaps: { "Weighted Pull-up": "Lat Pulldown" } } }).ffPullCapNeeded(pull), false, "already swapped");
  const done = [{ doneTs: 1, ex: [{ name: "Weighted Pull-up", sets: [{ w: "0", r: "5" }] }] }];
  assert.equal(engine({ store: { ff_history: done } }).ffPullCapNeeded(pull), false, "has pull-up history");
  assert.equal(engine({ equip: ["bodyweight", "dumbbells"] }).ffPullCapNeeded(pull), false, "no bar → gear subs");
  assert.match(LOGGER, /setSwap\("Weighted Pull-up", alt\)/);
});

test("round-aware note: leg day before or on a play day suggests the open upper day", () => {
  assert.match(fn(GAME, "ffPlayDays"), /g\.days/);
  const note = fn(HOME, "ffRoundNote");
  assert.match(note, /\/Lower\/\.test\(d\.name\)/);
  assert.match(note, /ffPlaysOn\(tmr\)/);
  assert.match(note, /data-startplayer=/);
  assert.match(note, /ffAccess\(\)==="full"/, "never offers a future day in the free week");
  assert.match(fn(HOME, "nextUpCard"), /ffPullCapHtml\(d\)\+ffRoundNote\(d, wk\)/);
});
