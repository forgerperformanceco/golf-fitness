import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// The coach's context (Oct 2026 audit, cluster G): the real plan week (not the
// dead ff_week key that sent "1" to everyone), the wave in the app's plain
// words + the engine's key, this week's prescribed days and logged top sets,
// and the big lifts' trend — so "Adjust this week" has something to adjust.
const BRAIN = readFileSync(new URL("../src/js/app/076-brain-intelligence.js", import.meta.url), "utf8");
const PLAN = readFileSync(new URL("../src/js/app/035-training-plan.js", import.meta.url), "utf8");
const PLAYER = readFileSync(new URL("../src/js/app/070-workout-player-full-screen-guided-sessio.js", import.meta.url), "utf8");
const coach = readFileSync(new URL("../coach.js", import.meta.url), "utf8");
const edge = readFileSync(new URL("../supabase/functions/ai-coach/index.ts", import.meta.url), "utf8");

function block(source, start, open) {
  let depth = 0;
  for (let j = source.indexOf(open, start); j < source.length; j++) {
    if (source[j] === open) depth++;
    else if (source[j] === (open === "{" ? "}" : "]") && --depth === 0) return source.slice(start, j + 1);
  }
  throw new Error("unbalanced");
}
const WAVES = block(PLAN, PLAN.indexOf("var WAVES = {"), "{") + ";";
const E1RM = block(PLAYER, PLAYER.indexOf("function e1RM("), "{");

const DAYS = [
  { name: "Day 1 — Lower Strength", type: "strength" }, { name: "Rest", type: "rest" },
  { name: "Day 2 — Speed & Power", type: "speed" }, { name: "Day 3 — Upper Strength", type: "strength" },
  { name: "Rest", type: "rest" }, { name: "Day 4 — Full Body", type: "strength" }, { name: "Rest", type: "rest" },
];
const TARGETS = {
  "Day 1 — Lower Strength": [["Back Squat", "4 × 4 (heavy · fast up)"], ["Romanian Deadlift", "3 × 6"], ["Walking Lunge", "3 × 8/side"], ["Leg Curl", "2 × 10"]],
  "Day 2 — Speed & Power": [["Countermovement Jump", "4 × 3"], ["Rotational med-ball throw", "4 × 4/side"], ["Overspeed swings", "3 × 5"]],
  "Day 3 — Upper Strength": [["Barbell Bench Press", "4 × 3 (heavy · fast up)"], ["Chest-supported Row", "3 × 6"], ["Pull-up", "3 × 6"]],
  "Day 4 — Full Body": [["Trap-bar Deadlift", "4 × 3"], ["Incline DB Press", "2 × 8"], ["Pallof press", "2 × 10/side"]],
};

function brain({ access = "full", dop = 3, week = 10, wave = "intensify", started = true } = {}) {
  const log = {
    [`${week}|Day 1 — Lower Strength`]: { finishedAt: 1, ex: [{ name: "Back Squat", sets: [{ w: "225", r: "4", done: true }, { w: "235", r: "4", done: true }] }] },
    [`${week}|Day 2 — Speed & Power`]: { ex: [{ name: "Countermovement Jump", sets: [{ w: "", r: "3", done: true }] }] },
  };
  const ctx = {
    __log: log, __days: DAYS, __targets: TARGETS,
    __store: { fairwayfuel: { freq: 4 }, ff_body: [], ff_history: [], ff_fuel: {}, ff_score: { score: 70 } },
  };
  vm.runInNewContext(`
    var window={};
    ${WAVES}
    ${E1RM}
    function lsGet(k,d){ var v=__store[k]; return v==null?d:v; }
    function planStart(){ return ${started ? '"2026-07-01"' : "null"}; }
    function curWeek(){ return ${week}; } function dayOfPlan(){ return ${dop}; }
    function waveFor(){ return ${JSON.stringify(wave)}; }
    function ffAccess(){ return ${JSON.stringify(access)}; }
    function stripDays(){ return __days; }
    function dayTargets(d){ return (__targets[d.name]||[]).map(function(t){ return { name:t[0], target:t[1] }; }); }
    function getLog(){ return __log; }
    function sessionFinished(s){ return !!(s && s.finishedAt); }
    function sessionSkipped(){ return false; }
    function bigLiftStats(){ return [{ name:"Back Squat", first:250.2, last:266.6, best:266.6, n:6 }, { name:"Barbell Bench Press", first:190, last:201, best:203, n:5 }]; }
    function weightTrend(){ return null; } function speedTestDue(){ return false; } function mobDue(){ return false; }
    ${BRAIN}
  `, ctx);
  return ctx.window.FFBrain;
}

test("coach.js sends the real plan week — never the dead ff_week key", () => {
  assert.doesNotMatch(coach, /lsGet\("ff_week"\)/);
  assert.match(coach, /week: \(brain && brain\.signals && brain\.signals\.planWeek\) \|\| null/);
  assert.match(coach, /brain: ctx\.brain/);
  assert.match(edge, /decisionEngine: body\.brain/);
});

test("the brain snapshot carries this week: week, wave (plain name + key), days, targets, logged top sets, lifts", () => {
  const snap = JSON.parse(JSON.stringify(brain().snapshot()));   // plain objects (vm realm → this one)
  const t = snap.training;
  assert.equal(snap.signals.planWeek, 10);
  assert.equal(t.week, 10); assert.equal(t.wave, "Heavy"); assert.equal(t.waveKey, "intensify");
  assert.deepEqual(t.days.map((d) => d.day), ["Day 1 — Lower Strength", "Day 2 — Speed & Power", "Day 3 — Upper Strength", "Day 4 — Full Body"]);
  assert.deepEqual(t.days.map((d) => d.when), ["past", "today", "ahead", "ahead"]);
  assert.deepEqual(t.days.map((d) => d.status), ["done", "started", "not started", "not started"]);
  const squat = t.days[0].ex[0];
  assert.deepEqual(squat, { name: "Back Squat", target: "4 × 4 (heavy · fast up)", top: "235×4" });
  assert.equal(t.days[1].ex[0].top, "3 reps");
  assert.deepEqual(t.lifts[0], { name: "Back Squat", firstE1rm: 250, lastE1rm: 267, bestE1rm: 267, sessions: 6 });
  // Small: the ai-coach request is capped at 32 KB.
  assert.ok(JSON.stringify(snap).length < 6000, `snapshot ${JSON.stringify(snap).length} bytes`);
});

test("free-week preview never sends days ahead; locked or not started sends no plan", () => {
  const preview = JSON.parse(JSON.stringify(brain({ access: "preview" }).training()));
  assert.deepEqual(preview.days.map((d) => d.when), ["past", "today"]);
  assert.equal(brain({ access: "locked" }).training(), null);
  assert.equal(brain({ started: false }).training(), null);
  for (const [key, label] of [["accumulate", "Build"], ["deload", "Easy"], ["peak", "Peak"]])
    assert.equal(brain({ wave: key }).training().wave, label);
});
