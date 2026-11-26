import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// Owner, Nov 2026: "dead hangs should be in seconds." A hang or a hold is measured by TIME.
// Swapped into a rep or yard slot (Dead Hang for the Farmer Carry's "3 × 40 yd"), it kept the
// slot's target, so it showed "yards"/"reps" and a weight box. Now a hold keeps the slot's set
// count and takes a seconds target, every logger labels and seeds seconds, and the bodyweight
// holds get the BW chip.
const src = (f) => readFileSync(new URL(`../src/js/app/${f}`, import.meta.url), "utf8");
const PLAN = src("035-training-plan.js"), LOGGER = src("040-workout-logger.js"), INLINE = src("045-inline-logger-log-as-you-train-in-the-ca.js");
const PLAYER = src("070-workout-player-full-screen-guided-sessio.js"), HIST = src("050-exercise-history-every-lift-s-full-story.js");
function fn(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
  let depth = 0;
  for (let i = source.indexOf("{", start); i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}
const UNITS = [[PLAN, ["isBodyweightEx", "isTimeEx", "isHoldEx", "isTimedEx", "holdPerSide", "holdTarget", "plainReps", "slDoneText"]],
  [LOGGER, ["isDistEx", "repWord", "repsText", "repsShifted", "topReps", "repSeed"]]];
function load(extra = {}, more = []) {
  const ctx = { ...extra };
  vm.runInNewContext(UNITS.flatMap(([s, ns]) => ns.map((n) => fn(s, n))).concat(more).join("\n"), ctx);
  return ctx;
}
const HOLDS = ["Dead Hang", "Plank", "Side Plank", "Copenhagen Plank", "Weighted Plank", "Hollow Hold", "Plank Hold",
  "Cable Pallof Iso Hold", "Band Anti-rotation Hold", "Towel / Plate Pinch Hold", "Plate Pinch"];
const NOT = ["Farmer Carry", "Hanging Leg Raise", "Hanging Knee Raise", "Deadlift", "Dead Bug", "Pallof Press", "Wrist Roller", "Hang Power Clean"];

test("which lifts are holds, and the seconds target a hold takes in a rep or yard slot", () => {
  const E = load();
  for (const n of HOLDS) assert.equal(E.isHoldEx(n), true, n);
  for (const n of NOT) assert.equal(E.isHoldEx(n), false, n);
  assert.equal(E.isTimeEx("3 × 30 s"), true); assert.equal(E.isTimeEx("2 × 20s/side"), true);
  for (const t of ["3 × 40 yd", "3 × 12 / side", "4 × 6", "3 × 8 / leg", "2 × 10 / leg (pause at the top · hips level)"])
    assert.equal(E.isTimeEx(t), false, t);
  assert.equal(E.holdTarget("3 × 40 yd", "Dead Hang"), "3 × 30 s", "the Farmer Carry slot: 3 sets kept, seconds");
  assert.equal(E.holdTarget("2 × 15", "Plank"), "2 × 30 s");
  assert.equal(E.holdTarget("3 × 12 / side", "Side Plank"), "3 × 30 s / side", "one side at a time");
  assert.equal(E.plainReps("3 × 30 s"), false, "the wave never bumps a hold's seconds like reps");
  // Bodyweight holds: the BW chip, no weight box, no load progression. Loaded holds keep their weight.
  for (const n of ["Dead Hang", "Plank", "Side Plank", "Hollow Hold", "Plank Hold", "Copenhagen Plank"]) assert.equal(E.isBodyweightEx(n), true, n);
  for (const n of ["Weighted Plank", "Plate Pinch", "Cable Pallof Iso Hold", "Farmer Carry", "Hanging Leg Raise"]) assert.equal(E.isBodyweightEx(n), false, n);
  assert.equal(E.isBodyweightEx("Box Jump"), true, "jumps unchanged");
});

test("the plan target: a hold in a rep or yard slot reads seconds, through the same effTarget everything uses", () => {
  const ctx = load({ adjSets: (t) => t, purposeFor: () => "💪", ffOnRamp: () => false, waveAdjust: (t) => t, ffInSeasonMode: () => false,
    capSets: (t) => t, plainSetCount: () => true, trimSets: (t) => t }, [fn(PLAN, "effTarget")]);
  assert.equal(ctx.effTarget("3 × 40 yd", "Dead Hang", 3), "3 × 30 s");
  assert.equal(ctx.effTarget("3 × 40 yd", "Farmer Carry", 3), "3 × 40 yd", "the carry keeps its yards");
  assert.equal(ctx.effTarget("3 × 30 s", "Plank Hold", 3), "3 × 30 s", "a gear sub's seconds pass through");
  assert.match(fn(PLAN, "dayTargets"), /target:effTarget\(r\.sr\|\|row\[1\], nm, week\)/, "the session and the card both read effTarget");
});

test("units: every logger says seconds for a hold, even one saved under the old yard target", () => {
  const E = load();
  assert.equal(E.repWord("3 × 30 s"), "sec");
  assert.equal(E.repWord("3 × 40 yd", "Dead Hang"), "sec", "the name wins over a stale target");
  assert.equal(E.repWord("3 × 40 yd", "Farmer Carry"), "yards");
  assert.equal(E.repWord("4 × 6", "Deadlift"), "reps");
  assert.equal(E.repsText("30", { name: "Dead Hang", target: "3 × 40 yd" }), "30 s");
  assert.equal(E.repsText("40", { name: "Farmer Carry", target: "3 × 40 yd" }), "40 yd");
  assert.equal(E.repsText("8", { name: "Push-up", target: "3 × 8" }), "8 reps");
  assert.equal(E.slDoneText({ name: "Dead Hang", target: "3 × 30 s", sets: [{ r: "30", done: true }, { r: "35", done: true }] }), "✓ 2 sets · best 35 s");
  assert.equal(E.slDoneText({ name: "Plate Pinch", target: "3 × 30 s", sets: [{ w: "25", r: "30", done: true }] }), "✓ 1 set · best 25 × 30 s");
  assert.equal(E.slDoneText({ name: "Deadlift", target: "4 × 4", sets: [{ w: "225", r: "4", done: true }] }), "✓ 1 set · best 225 × 4", "lifts unchanged");
  // Where each surface reads it.
  assert.match(PLAYER, /rPh=g\.r\|\|repWord\(x\.target, x\.name\)/);
  assert.match(INLINE, /repWord\(x\.target, x\.name\)\.toUpperCase\(\)/);
  assert.match(fn(LOGGER, "renderLogBody"), /\{sec:"Sec",yards:"Yards"\}\[repWord\(x\.target, x\.name\)\]\|\|"Reps"/);
  assert.match(PLAYER, /last: '\+\(bw\?\(pr\?repsText\(pr, x\)/);
  assert.match(fn(HIST, "historyRowsHtml"), /repsText\(s\.r, x\)/);
});

test("ghosts: an untouched hold set shows and saves its seconds on all three surfaces", () => {
  const E = load({ ffDose: () => ({ w: null }) }, [fn(PLAYER, "plGhost"), fn(LOGGER, "logGhost"), fn(INLINE, "ilGhost")]);
  const hang = () => ({ name: "Dead Hang", target: "3 × 30 s", sets: [{ w: "", r: "" }, { w: "", r: "" }, { w: "", r: "" }] });
  assert.deepEqual({ ...E.plGhost(hang(), 0, null, null) }, { w: "", r: "30" }, "player, first time: the prescribed 30 s");
  assert.deepEqual({ ...E.logGhost(hang(), null, 0, 3, {}) }, { w: "", r: "30" }, "logger window");
  assert.deepEqual({ ...E.ilGhost(hang(), null, 0, 3, {}) }, { w: "", r: "30" }, "inline logger");
  const last = { target: "3 × 30 s", sets: [{ r: "40" }, { r: "35" }] };
  assert.deepEqual({ ...E.plGhost(hang(), 1, last, null) }, { w: "", r: "35" }, "last time's seconds lead");
  assert.deepEqual({ ...E.ilGhost(hang(), last, 0, 3, {}) }, { w: "", r: "40" });
  // A hang last logged under the carry's yards (before this fix) seeds today's seconds, not "40 yd".
  assert.deepEqual({ ...E.logGhost(hang(), { target: "3 × 40 yd", sets: [{ r: "40" }] }, 0, 3, {}) }, { w: "", r: "30" });
  // Rep lifts unchanged: no history → nothing invented.
  assert.deepEqual({ ...E.plGhost({ name: "Deadlift", target: "4 × 6", sets: [{ w: "", r: "" }] }, 0, null, null) }, { w: "", r: "" });
});

test("a session saved before this fix, and a mid-session swap, read seconds too", () => {
  const saved = { ex: [{ name: "Dead Hang", orig: "Farmer Carry", target: "3 × 40 yd", sets: [] }, { name: "Farmer Carry", target: "3 × 40 yd", sets: [] }] };
  const E = load({ getSession: () => saved }, [fn(LOGGER, "buildSession")]);
  const s = E.buildSession({ name: "Day 4" }, 3);
  assert.equal(s.ex[0].target, "3 × 30 s"); assert.equal(s.ex[1].target, "3 × 40 yd");
  assert.equal(saved.ex[0].target, "3 × 40 yd", "a copy — the stored session changes only when you log");
  const day = { ex: [["Farmer Carry", "3 × 40 yd"], ["Pallof Press", "3 × 12 / side"], ["Deadlift", "4 × 4"]] };
  const W = load({ findDay: () => day, effTarget: (t) => t }, [fn(HIST, "ffLegTarget"), fn(HIST, "ffSwapTarget")]);
  assert.equal(W.ffSwapTarget("3 × 40 yd", "Farmer Carry", "Dead Hang", "Day 4", 3), "3 × 30 s", "into the carry slot → seconds");
  assert.equal(W.ffSwapTarget("2 × 30 s", "Farmer Carry", "Farmer Carry", "Day 4", 3), "2 × 40 yd", "back out → the slot's yards, set count kept");
  assert.equal(W.ffSwapTarget("3 × 30 s / side", "Pallof Press", "Pallof Press", "Day 4", 3), "3 × 12 / side", "a Side Plank gear sub → back to Pallof reps");
  assert.equal(W.ffSwapTarget("4 × 4", "Deadlift", "Trap-Bar Deadlift", "Day 4", 3), "4 × 4", "lift to lift: unchanged");
  assert.match(HIST, /px\.target=ffSwapTarget\(px\.target, swapCtx\.orig, chosen, player\.dayName, player\.week\);/);
  assert.match(HIST, /ex\.target=ffSwapTarget\(ex\.target, swapCtx\.orig, chosen, ilog\.day, ilog\.week\);/);
});

test("the player: seconds step by 5, hold copy (not jump copy), and Dead Hang's own cues", () => {
  const step = PLAYER.slice(PLAYER.indexOf('var stp=e.target.closest("[data-plstep]");'), PLAYER.indexOf('if(e.target.closest("[data-pladdlift]"))'));
  assert.match(step, /var rStep=isTimedEx\(x\)\?5:1;/);
  assert.match(step, /var step=\(f==="w"\)\?plStepW\(x\.name\):rStep;/);
  assert.match(PLAYER, /isTimedEx\(x\) \? '⏱️ <b>Bodyweight<\/b> — hold steady and breathe;[^']*Log the seconds\.'/);
  const ctx = {};
  vm.runInNewContext(`${fn(INLINE, "exerciseForm")}\n${fn(INLINE, "liftWhy")}\nthis.form = exerciseForm; this.why = liftWhy;`, ctx);
  const f = ctx.form("Dead Hang"), w = ctx.why("Dead Hang");
  assert.match(f.mu, /Grip/); assert.ok(f.cues.some((c) => /toes on a box/.test(c)), "the sore-back option");
  assert.ok(!f.cues.some((c) => /walk|handles/i.test(c)), "no carry cues on a hang");
  assert.doesNotMatch(w.cue, /handle/); assert.match(w.cue, /Step down a second before the grip goes/);
  assert.match(ctx.form("Farmer Carry").cues.join(" "), /walk with control/, "the carry keeps its cues");
});

// ---- Codex #136 ----
const E1RM = fn(PLAYER, "e1RM");
test("Codex #136: a timed hold's seconds never count as reps in lb moved or an e1RM", () => {
  const sess = { date: "2026-11-19", ex: [
    { name: "Plate Pinch", target: "3 × 30 s", sets: [{ w: "25", r: "30", done: true }, { w: "25", r: "30", done: true }] },
    { name: "Deadlift", target: "4 × 4", sets: [{ w: "200", r: "4", done: true }] }] };
  let saved = null;
  const H = load({ lsGet: () => [], lsSet: (k, v) => { saved = v; }, todayStr: () => "2026-11-19" }, [fn(HIST, "pushHistory")]);
  H.pushHistory(3, "Day 4", sess);
  assert.equal(saved[0].volume, 800, "only the deadlift's 200 × 4 — not 25 lb × 30 s");
  assert.equal(saved[0].sets, 3, "the hold's sets still count as sets");
  const X = load({ lsGet: (k) => (k === "ff_history" ? [{ week: 3, day: "Day 4", date: "2026-11-19", ex: sess.ex }] : []), getLog: () => ({}) },
    [E1RM, fn(HIST, "exHistData")]);
  const pinch = X.exHistData("Plate Pinch")[0], dl = X.exHistData("Deadlift")[0];
  assert.equal(pinch.e1, 0, "no e1RM for a hold"); assert.equal(pinch.vol, 0); assert.equal(pinch.topW, 25, "its heaviest weight still shows");
  assert.ok(dl.e1 > 200 && dl.vol === 800, "lifts unchanged");
  // The player's recap + share card and the coach snapshot read the same rule.
  const recap = PLAYER.slice(PLAYER.indexOf("// recap"), PLAYER.indexOf("if(top>0){", PLAYER.indexOf("// recap")));
  assert.match(recap, /tm=isTimedEx\(x\)/); assert.match(recap, /if\(!tm && w>0&&r>0\)\{ vol\+=w\*r;/);
  assert.match(fn(PLAYER, "plShare"), /tm=isTimedEx\(x\)[\s\S]*if\(!tm && w>0&&r>0\)\{ vol\+=w\*r;/);
  assert.match(src("076-brain-intelligence.js"), /var e=tm \? w\+r\/1000 : \(w\?e1RM\(w,r\):r\/100\);/);
});

test("Codex #136: a hold added mid-workout gets its seconds target", () => {
  const E = load({}, [fn(HIST, "ffAddTarget")]);
  assert.equal(E.ffAddTarget("Plank"), "3 × 30 s");
  assert.equal(E.ffAddTarget("Side Plank"), "3 × 30 s / side");
  assert.equal(E.ffAddTarget("Dead Hang"), "3 × 30 s");
  assert.equal(E.ffAddTarget("DB Curl"), "3 × 10", "lifts keep the add-a-lift default");
  const add = fn(HIST, "addLiftChoice");
  assert.equal((add.match(/target:ffAddTarget\(name\)/g) || []).length, 2, "player and inline logger both");
  assert.doesNotMatch(add, /target:"3 × 10"/);
});

test("Codex #136: swapping one hold for another fixes the per-side dose", () => {
  const W = load({ findDay: () => null, effTarget: (t) => t }, [fn(HIST, "ffLegTarget"), fn(HIST, "ffSwapTarget")]);
  assert.equal(W.ffSwapTarget("3 × 30 s / side", "Pallof Press", "Hollow Hold", "Day 4", 3), "3 × 30 s", "Side Plank → Hollow Hold drops / side");
  assert.equal(W.ffSwapTarget("2 × 30 s", "Pallof Press", "Side Plank", "Day 4", 3), "2 × 30 s / side", "Hollow Hold → Side Plank adds it, set count kept");
  assert.equal(W.ffSwapTarget("3 × 30 s", "Anti-rotation Cable Hold", "Dead Hang", "Day 4", 3), "3 × 30 s");
  assert.equal(W.ffSwapTarget("3 × 30 s / side", "Pallof Press", "Copenhagen Plank", "Day 4", 3), "3 × 30 s / side");
});

// Pre-PR review (Back-friendly leg days): "Reset to original" from the Back default's Single-Leg RDL
// kept "3 × 8 / leg" on the RDL. "/ leg" now follows the lift in a two-leg slot, as on the card.
test("a swap in a two-leg slot: '/ leg' comes with a single-leg lift and goes with it", () => {
  const day = { name: "Day 1", ex: [["Romanian Deadlift", "3 × 8"], ["Walking Lunge", "3 × 10 / leg"]] };
  const W = load({ findDay: () => day, effTarget: (t) => t }, [fn(HIST, "ffLegTarget"), fn(HIST, "ffSwapTarget")]);
  assert.equal(W.ffSwapTarget("3 × 8 / leg", "Romanian Deadlift", "Romanian Deadlift", "Day 1", 3), "3 × 8");
  assert.equal(W.ffSwapTarget("2 × 8 / leg", "Romanian Deadlift", "Trap-Bar Deadlift", "Day 1", 3), "2 × 8", "set count kept");
  assert.equal(W.ffSwapTarget("3 × 8", "Romanian Deadlift", "Single-Leg RDL", "Day 1", 3), "3 × 8 / leg");
  assert.equal(W.ffSwapTarget("3 × 10 / leg", "Walking Lunge", "Leg Press", "Day 1", 3), "3 × 10 / leg", "a per-leg slot is left alone");
});
