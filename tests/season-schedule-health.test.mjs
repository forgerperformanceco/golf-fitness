import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// Oct 2026: the optional in-season 2-/3-day plans, the week arranged around
// play days, and the setup health check. Real source, extracted by name.
const src = (f) => readFileSync(new URL(`../src/js/app/${f}`, import.meta.url), "utf8");
const PLAN = src("035-training-plan.js");
const LOGGER = src("040-workout-logger.js");
const GAME = src("080-game-day-round-day-fueling-warm-up-plan.js");
const ONBOARD = src("090-first-run-onboarding.js");
const PERSIST = src("020-persistence-remember-everything-per-devi.js");
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
  const start = source.indexOf(`var ${name}=`) >= 0 ? source.indexOf(`var ${name}=`) : source.indexOf(`var ${name} = `);
  assert.ok(start >= 0, `var ${name} should exist`);
  return source.slice(start, balanced(source, start, open)) + ";";
}

// startWd: weekday the plan's week starts on (0 = Sunday); store = localStorage.
function engine({ inseason = false, freq = 4, store = {}, startWd = 1, week = 3, health = null, profile = {} } = {}) {
  const ctx = { __store: { fairwayfuel: profile, ...store } };
  vm.runInNewContext(`
    var state={goal:"leanbulk", inseason:${JSON.stringify(inseason)}, health:${JSON.stringify(health)}};
    var planState={phase:0, freq:${freq}, equip:{}};
    function lsGet(k,d){ var v=__store[k]; return v==null?d:v; }
    function lsSet(k,v){ __store[k]=v; }
    function curWeek(){ return ${week}; }
    function planStart(){ return lsGet("ff_start", null); }
    function weekStartDate(){ var d=new Date(2026,9,4); while(d.getDay()!==${startWd}) d.setDate(d.getDate()+1); return d; }
    ${decl(PLAN, "PHASES", "[")}
    ${decl(PLAN, "FF_HEALTH_QS", "[")}
    ${["ffInSeasonMode", "ffInSeason", "ffInSeasonPlan", "activeDays", "ffSessionsPerWeek", "ffHealthQs", "ffHealth",
       "ffHealthCaution", "ffHealthRedFlag", "ffHealthAdvice", "ffOnRamp", "ffLowImpact", "purposeFor", "trimSets",
       "capSets", "plainSetCount", "adjSets", "trainRetain", "eventInfo", "waveFor", "bumpReps", "plainReps", "waveAdjust",
       "effTarget"].map((n) => fn(PLAN, n)).join("\n")}
    ${["stripDays", "ffHeavyLegs", "ffArrangeWeek", "ffPlayDaysNow"].map((n) => fn(LOGGER, n)).join("\n")}
    ${fn(GAME, "ffPlayDays")}
    ${fn(MODEL, "ffBmi")}
    this.api={ activeDays, ffSessionsPerWeek, ffInSeasonMode, stripDays, ffOnRamp, ffLowImpact, ffHealthCaution,
      ffHealthAdvice, ffHealthQs, effTarget, PHASES, state:state };
  `, ctx);
  return ctx.api;
}
const names = (days) => [...days].map((d) => (d.type === "rest" ? "rest" : d.name.replace(/^Day \d+ — /, "")));

test("in-season is optional: Off keeps the 4/5-day week; 2 and 3 days swap in their own plans", () => {
  assert.equal(engine().ffSessionsPerWeek(), 4);
  assert.equal(engine({ freq: 5 }).ffSessionsPerWeek(), 5);
  assert.equal(engine({ inseason: "lite" }).ffSessionsPerWeek(), 4, "fewer-sets mode keeps the week");
  assert.equal(engine({ inseason: true }).ffInSeasonMode(), "lite", "old saves (true) read as fewer sets");
  const two = engine({ inseason: 2 }), three = engine({ inseason: 3 });
  assert.equal(two.ffSessionsPerWeek(), 2); assert.equal(three.ffSessionsPerWeek(), 3);
  assert.equal(two.activeDays().length, 7); assert.equal(three.activeDays().length, 7);
  assert.ok(three.activeDays().some((d) => d.type === "speed"), "3-day keeps the Speed & Power day");
  assert.ok(!two.activeDays().some((d) => d.type === "speed"));
  // Persisted inside the profile, with old booleans upgraded.
  assert.match(PERSIST, /inseason:\(state\.inseason===true\?"lite":\(state\.inseason\|\|false\)\)/);
  assert.match(PLAN, /\["0","Off"\],\["lite","Fewer sets"\],\["2","2 days"\],\["3","3 days"\]/);
});

test("in-season days are full-body maintenance doses with the regular lift names (loads carry over)", () => {
  const E = engine({ inseason: 2 });
  const regular = new Set([...E.PHASES[0].days4, ...E.PHASES[0].days5].flatMap((d) => (d.ex || []).map((r) => r[0])));
  for (const d of E.activeDays().filter((x) => x.ex)) {
    assert.match(d.name, /Full Body/);
    let sets = 0;
    for (const [name, sr] of d.ex) {
      assert.ok(regular.has(name), `${name} is a regular-plan lift`);
      const n = parseInt(E.effTarget(sr, name, 3), 10); sets += n;
      if (/heavy|fast up/.test(sr)) assert.equal(n, 3, `${name}: main lift at 3 sets`);
      else assert.ok(n <= 2, `${name}: accessory at ≤2 sets`);
    }
    assert.ok(sets >= 12 && sets <= 16, `${d.name}: ${sets} hard sets`);
    // Both days carry legs, a push and a pull.
    const all = d.ex.map((r) => r[0]).join(" ");
    assert.match(all, /Leg Press|Deadlift/); assert.match(all, /Press/); assert.match(all, /Row|Pull-up/);
  }
  // The fewer-sets cap does not stack on the plans' authored doses.
  assert.equal(E.effTarget("3 × 5 (heavy · fast up)", "Leg Press", 3), "3 × 5 (heavy · fast up)");
  assert.equal(engine({ inseason: "lite" }).effTarget("4 × 6 (heavy · fast up)", "Leg Press", 3), "2 × 6 (heavy · fast up)");
});

test("the week is arranged so rounds land on rest days and legs aren't heavy the day before", () => {
  // Week starts Monday; plays Saturday (6) and Sunday (0).
  for (const [freq, inseason] of [[4, false], [5, false], [4, 2], [4, 3]]) {
    const E = engine({ freq, inseason, startWd: 1, store: { ff_gameday: { days: [6, 0] } } });
    const week = E.stripDays(), wd = (i) => (1 + i) % 7;
    week.forEach((d, i) => {
      if ([6, 0].includes(wd(i))) assert.equal(d.type, "rest", `${freq}/${inseason}: no training on ${wd(i)} → ${names(week)}`);
    });
    // Friday (index 4) is the day before Saturday: never heavy legs.
    assert.ok(!/Lower|Squat|Hinge|Full Body/.test(week[4].name) || week[4].type === "rest", `Friday: ${week[4].name}`);
    // Same sessions, same order — only placement changes.
    const trainOrder = E.activeDays().filter((d) => d.type !== "rest").map((d) => d.name);
    const placed = week.filter((d) => d.type !== "rest").map((d) => d.name);
    assert.equal(placed.length, trainOrder.length);
    const rot = trainOrder.indexOf(placed[0]);
    assert.deepEqual(placed, trainOrder.slice(rot).concat(trainOrder.slice(0, rot)));
  }
  // No play days → the authored week, untouched.
  const E = engine();
  assert.deepEqual(names(E.stripDays()), names(E.activeDays()));
});

test("a play-day change made mid-week waits for next week", () => {
  const store = { ff_gameday: { days: [6], prevDays: [], arrangeWeek: 4 } };
  assert.deepEqual(names(engine({ week: 3, store }).stripDays()), names(engine({ week: 3 }).activeDays()), "this week: old layout");
  const next = engine({ week: 4, store, startWd: 1 }).stripDays();
  assert.equal(next[5].type, "rest", "next week: Saturday is a rest day");
  assert.match(PLAN, /if\(busy\)\{ if\(!\(g\.arrangeWeek>wk\)\) g\.prevDays=ffPlayDaysNow\(\)\.slice\(\); g\.arrangeWeek=wk\+1; \}/);
});

test("health check: any yes → a gentler start (4-week on-ramp, softer landings) until cleared", () => {
  const vet = { ff_history: [{ doneTs: 1 }], ff_start: new Date(2026, 9, 1).toISOString() };
  const clean = engine({ store: vet });
  assert.equal(clean.ffOnRamp(3), false); assert.equal(clean.ffLowImpact(), false);
  const flagged = engine({ store: vet, health: { q: ["joint"], ts: 1, cleared: false } });
  assert.equal(flagged.ffHealthCaution(), true);
  assert.equal(flagged.ffOnRamp(4), true); assert.equal(flagged.ffOnRamp(5), false);
  assert.equal(flagged.ffLowImpact(), true);
  assert.equal(flagged.effTarget("3 × 12", "Leg Extension", 3), "2 × 12", "accessories eased in weeks 1–4");
  const cleared = engine({ store: vet, health: { q: ["joint"], ts: 1, cleared: true } });
  assert.equal(cleared.ffHealthCaution(), false); assert.equal(cleared.ffOnRamp(3), false);
  // Red flags ask for a doctor's OK first; others suggest a word with one.
  assert.match(flagged.ffHealthAdvice(["chest"], false), /get your doctor’s OK before you train/);
  assert.match(flagged.ffHealthAdvice(["joint"], false), /Worth a quick word with your doctor/);
  assert.match(flagged.ffHealthAdvice(["joint"], true), /Cleared by your doctor/);
  // Pregnancy only asked of women; 7 questions for men.
  assert.equal(flagged.ffHealthQs("male").length, 7);
  assert.ok(flagged.ffHealthQs("female").some((q) => q[0] === "pregnant"));
});

test("health answers live in the profile (no new key); changing them resets a clearance", () => {
  assert.match(PERSIST, /health:state\.health\|\|null/);
  assert.match(ONBOARD, /cleared:!!\(same && ph\.cleared\)/);
  assert.match(GAME, /h\.cleared=false; h\.ts=Date\.now\(\);/);
  assert.match(GAME, /data-hcleared/);
});
