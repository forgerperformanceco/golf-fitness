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
const DRAG = src("042-week-drag-hold-a-day-to-move-it.js");
const REST = src("043-rest-today.js");

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
// wsBase: [y, m, d] the week-start search begins from (default early Oct 2026).
function engine({ inseason = false, freq = 4, store = {}, startWd = 1, week = 3, health = null, profile = {}, dop = 1, wsBase = [2026, 9, 4] } = {}) {
  const ctx = { __store: { fairwayfuel: profile, ...store } };
  vm.runInNewContext(`
    var state={goal:"leanbulk", inseason:${JSON.stringify(inseason)}, health:${JSON.stringify(health)}};
    var planState={phase:0, freq:${freq}, equip:{}};
    function lsGet(k,d){ var v=__store[k]; return v==null?d:v; }
    function lsSet(k,v){ __store[k]=v; }
    function curWeek(){ return ${week}; }
    function dayOfPlan(){ return ${dop}; }
    function planStart(){ return lsGet("ff_start", null); }
    function weekStartDate(){ var d=new Date(${wsBase.join(",")}); while(d.getDay()!==${startWd}) d.setDate(d.getDate()+1); return d; }
    ${decl(PLAN, "PHASES", "[")}
    ${decl(PLAN, "FF_HEALTH_QS", "[")}
    ${["ffInSeasonMode", "ffInSeason", "ffInSeasonPlan", "activeDays", "ffSessionsPerWeek", "ffHealthQs", "ffHealth",
       "ffHealthCaution", "ffHealthRedFlag", "ffHealthAdvice", "ffOnRamp", "ffLowImpact", "purposeFor", "trimSets",
       "capSets", "plainSetCount", "adjSets", "trainRetain", "eventInfo", "waveFor", "bumpReps", "plainReps", "waveAdjust",
       "effTarget"].map((n) => fn(PLAN, n)).join("\n")}
    ${["stripDays", "ffBaseWeek", "ffLayoutActive", "ffHeavyLegs", "ffBackRotate", "ffArrangeWeek", "ffPlayDaysNow", "ffOffDays", "ffOffDaysNow", "ffLayoutNow", "ffApplyLayout",
       "dayKey", "getLog", "getSession", "getRest", "restDone", "cardioDone",
       "getSkippedSessions", "sessionSkipped", "skipSession", "unskipSession", "ffRestInstead", "sessionFinished"].map((n) => fn(LOGGER, n)).join("\n")}
    var __toasts=[], window={ dispatchEvent:function(){} }, Event=function(){};
    function ffToast(m){ __toasts.push(m); } function renderPhase(){} function renderDash(){} function ffAccess(){ return "full"; }
    ${fn(GAME, "gdState")} ${fn(GAME, "gdSave")} ${fn(PLAN, "wsShort")}
    ${decl(DRAG, "FF_WD", "[")} ${fn(DRAG, "ffDayLogged")} ${fn(DRAG, "ffMoveDay")}
    ${["ffIsTodaySlot", "ffRestableToday", "ffRestToday", "ffRestUndo"].map((n) => fn(REST, n)).join("\n")}
    ${["toggleRestDone", "toggleCardioDone"].map((n) => fn(LOGGER, n)).join("\n")}
    ${fn(LOGGER, "ffSaveSchedule")}
    ${fn(GAME, "ffPlayDays")}
    ${fn(MODEL, "ffBmi")}
    ${(LOGGER.match(/var FF_BACK_RULE_FROM=[^;]+;/) || ["var FF_BACK_RULE_FROM=0;"])[0]}
    this.api={ ffMoveDay, ffBackRotate, ffRestableToday, ffRestToday, ffRestUndo, ffRestInstead, ffDayLogged, ffSaveSchedule, sessionSkipped, skipSession,
      ffLayoutActive, store:__store, toasts:__toasts, activeDays, ffSessionsPerWeek, ffInSeasonMode, stripDays, ffOnRamp, ffLowImpact, ffHealthCaution,
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
  // Play days and days off share one save that snapshots both before the change.
  assert.match(LOGGER, /if\(busy\)\{ if\(!\(g\.arrangeWeek>wk\)\)\{ g\.prevDays=ffPlayDaysNow\(\)\.slice\(\); g\.prevOff=ffOffDaysNow\(\)\.slice\(\); g\.prevLayout=ffLayoutNow\(\); \} g\.arrangeWeek=wk\+1; \}/);
  assert.match(LOGGER, /apply\(g\); gdSave\(g\);/);
  // A cardio check-off counts as logged work too (Codex, #117): rest marks are slot-keyed.
  assert.match(LOGGER, /restDone\(wk, dayKey\(x\)\) \|\| cardioDone\(wk, dayKey\(x\)\)/);
  // …and a play-day / day-off change resets a hand-made week order (same queued rule).
  assert.match(PLAN, /ffSaveSchedule\(function\(g\)\{ g\.days=days\.sort\(\); delete g\.layout; \}\)/);
  assert.match(PLAN, /ffSaveSchedule\(function\(g\)\{ g\.off=days\.sort\(\); delete g\.layout; \}\)/);
});

test("days off: workouts move to the other days, same order, leg days apart", () => {
  const wdOf = (startWd) => (i) => (startWd + i) % 7;
  for (const startWd of [0, 1, 3, 6]) for (const [freq, inseason] of [[4, false], [5, false], [4, 2], [4, 3]]) {
    const E = engine({ freq, inseason, startWd, store: { ff_gameday: { off: [0, 1] } } });
    const week = E.stripDays(), wd = wdOf(startWd), tag = `start ${startWd}, ${freq}/${inseason}`;
    assert.equal(week.length, 7);
    week.forEach((d, i) => { if ([0, 1].includes(wd(i))) assert.equal(d.type, "rest", `${tag}: trains on day off ${wd(i)} → ${names(week)}`); });
    const trainOrder = E.activeDays().filter((d) => d.type !== "rest").map((d) => d.name);
    const placed = week.filter((d) => d.type !== "rest").map((d) => d.name);
    assert.equal(placed.length, trainOrder.length, `${tag}: every workout kept`);
    const rot = trainOrder.indexOf(placed[0]);
    assert.deepEqual(placed, trainOrder.slice(rot).concat(trainOrder.slice(0, rot)), `${tag}: same order`);
    for (let i = 0; i < 7; i++) {
      const a = week[i], b = week[(i + 1) % 7];
      assert.ok(!(/Lower|Squat|Hinge/.test(a.name) && a.type !== "rest" && /Lower|Squat|Hinge/.test(b.name) && b.type !== "rest"),
        `${tag}: two leg days in a row → ${names(week)}`);
    }
  }
  // Days off and rounds together: Sunday off, plays Saturday → both rest, no heavy legs Friday.
  const both = engine({ freq: 4, startWd: 1, store: { ff_gameday: { off: [0], days: [6] } } }).stripDays();
  assert.equal(both[5].type, "rest"); assert.equal(both[6].type, "rest");
  assert.ok(both[4].type === "rest" || !/Lower|Squat|Hinge/.test(both[4].name), `Friday before a round: ${both[4].name}`);
  // Overbooked (Codex, #116): Sun + Mon off and Tuesday play on 5 days leaves 4 open days. The
  // extra workout goes on the round day, never on a day the golfer marked off.
  const over = engine({ freq: 5, startWd: 1, store: { ff_gameday: { off: [0, 1], days: [2] } } }).stripDays();
  assert.equal(over[0].type, "rest", `Monday off stays off → ${names(over)}`);
  assert.equal(over[6].type, "rest", `Sunday off stays off → ${names(over)}`);
  assert.equal(over.filter((d) => d.type !== "rest").length, 5, "all five workouts kept");
  // Junk in storage is ignored.
  assert.deepEqual([...engine({ store: { ff_gameday: { off: [9, -1, "x", 2.5] } } }).stripDays()].map((d) => d.name),
    [...engine().activeDays()].map((d) => d.name));
});

test("a day-off change made mid-week waits for next week; old pending changes had no days off", () => {
  const store = { ff_gameday: { off: [0, 1], prevOff: [], prevDays: [], arrangeWeek: 4 } };
  assert.deepEqual(names(engine({ week: 3, store }).stripDays()), names(engine({ week: 3 }).activeDays()), "this week: old layout");
  const next = engine({ week: 4, store, startWd: 1 }).stripDays();
  assert.equal(next[0].type, "rest", "next week: Monday off"); assert.equal(next[6].type, "rest", "next week: Sunday off");
  // A play-day change queued before days off existed (no prevOff) keeps this week free of days off.
  const legacy = { ff_gameday: { days: [6], off: [0, 1], prevDays: [], arrangeWeek: 4 } };
  assert.deepEqual(names(engine({ week: 3, store: legacy }).stripDays()), names(engine({ week: 3 }).activeDays()));
});

test("your own week order: follows the saved layout by weekday; stale or queued layouts are handled", () => {
  // 4-day keys: Quads&Hinge, Push, rest@2, Speed, rest@4, Pull, rest@6. Layout is by weekday, Sun..Sat.
  const D = (n) => n, q = "Day 1 — Lower (Quads & Hinge)", pu = "Day 2 — Upper (Push)", sp = "Day 3 — Speed & Power", pl = "Day 4 — Upper (Pull + Rotate)";
  const layout = ["rest@6", pu, q, "rest@2", sp, pl, "rest@4"];
  for (const startWd of [1, 4, 0]) {
    const week = engine({ startWd, store: { ff_gameday: { layout } } }).stripDays();
    week.forEach((d, i) => {
      const want = layout[(startWd + i) % 7];
      assert.equal(d.type === "rest" ? "rest" : d.name, want.startsWith("rest@") ? "rest" : D(want), `start ${startWd}, slot ${i}`);
    });
  }
  // Stale (5-day keys on the 4-day plan) → ignored: the automatic week.
  const five = ["rest@6", "Day 1 — Lower (Quads)", "Day 2 — Upper (Push)", "rest@2", "Day 3 — Speed & Power", "Day 4 — Lower (Hinge + Power)", "Day 5 — Upper (Pull + Rotate)"];
  assert.deepEqual(names(engine({ store: { ff_gameday: { layout: five } } }).stripDays()), names(engine().activeDays()));
  assert.deepEqual(names(engine({ store: { ff_gameday: { layout: ["x"] } } }).stripDays()), names(engine().activeDays()), "junk ignored");
  // "Your order" only when the saved order actually shapes this week (Codex, #118).
  assert.equal(engine({ store: { ff_gameday: { layout } } }).ffLayoutActive(), true);
  assert.equal(engine({ store: { ff_gameday: { layout: five } } }).ffLayoutActive(), false, "stale: kept, not active");
  assert.equal(engine({ freq: 5, store: { ff_gameday: { layout: five } } }).ffLayoutActive(), true, "switch back: active again");
  // Queued for next week: this week keeps prevLayout (here: none → automatic).
  const queued = { ff_gameday: { layout, prevLayout: null, prevDays: [], prevOff: [], arrangeWeek: 4 } };
  assert.deepEqual(names(engine({ week: 3, store: queued }).stripDays()), names(engine().activeDays()));
  assert.equal(engine({ week: 4, store: queued, startWd: 1 }).stripDays()[0].name, pu, "next week: the new order");
});

test("hold-and-drag moves: swaps save your week; logged days, days off and queued changes are respected", () => {
  // Week starts Monday (startWd 1), 4-day authored week: Mon Quads, Tue Push, Wed rest, Thu Speed, Fri rest, Sat Pull, Sun rest.
  let E = engine({ startWd: 1, store: { ff_gameday: {} } });
  let msg = E.ffMoveDay(1, 2);                                    // Push (Tue) → Wed (rest)
  assert.match(msg, /^Moved Push to Wednesday\. Your week keeps this order\.$/);
  let w = E.stripDays();
  assert.equal(w[1].type, "rest"); assert.equal(w[2].name, "Day 2 — Upper (Push)");
  const lay = E.store.ff_gameday.layout;
  assert.equal(lay.length, 7); assert.equal(lay[3], "Day 2 — Upper (Push)", "saved by weekday (Wed = 3)");
  // Two workouts swap.
  msg = E.ffMoveDay(0, 5);
  assert.match(msg, /^Swapped Quads \(Saturday\) and Pull \(Monday\)/);
  // Rest ↔ rest is a no-op.
  assert.equal(E.ffMoveDay(1, 4), "");
  // Allowed but flagged: heavy legs the day before a round (plays Sunday; Quads → Saturday)…
  E = engine({ startWd: 1, store: { ff_gameday: { days: [0] } } });
  const quadsAt = E.stripDays().findIndex((d) => /Quads/.test(d.name)), satAt = 5;
  assert.match(E.ffMoveDay(quadsAt, satAt), /Heads up: heavy legs the day before a round\./);
  // …and legs on back-to-back days (5-day plan: Quads next to Hinge).
  E = engine({ freq: 5, startWd: 1, store: { ff_gameday: {} } });
  const w5 = E.stripDays(), hinge = w5.findIndex((d) => /Hinge/.test(d.name)), quads = w5.findIndex((d) => /Quads/.test(d.name));
  assert.match(E.ffMoveDay(quads, hinge - 1 === quads ? hinge + 1 : hinge - 1), /Heads up: that puts legs on back-to-back days\./);
  // A logged day stays put.
  E = engine({ startWd: 1, week: 3, store: { ff_gameday: {}, ff_log: { "3|Day 2 — Upper (Push)": { ex: [] } } } });
  assert.equal(E.ffMoveDay(1, 2), "Days you've already logged stay put.");
  assert.equal(E.store.ff_gameday.layout, undefined, "nothing saved");
  E = engine({ startWd: 1, week: 3, store: { ff_gameday: {}, ff_rest: { "3|rest@2|cardio": 5 } } });
  assert.equal(E.ffMoveDay(1, 2), "Days you've already logged stay put.", "a cardio check counts");
  // No workout onto a day off (Wednesday off → Wed is index 2 from Monday).
  E = engine({ startWd: 1, store: { ff_gameday: { off: [3] } } });
  const wOff = E.stripDays();
  assert.equal(wOff[2].type, "rest", "Wednesday is a rest day");
  assert.match(E.ffMoveDay(wOff.findIndex((d) => d.type !== "rest"), 2), /^Wednesday is a day off\. Turn it back on in Plan settings first\.$/);
  assert.equal(E.store.ff_gameday.layout, undefined, "nothing saved");
  // A queued schedule change blocks moves until it lands.
  E = engine({ startWd: 1, week: 3, store: { ff_gameday: { arrangeWeek: 4, prevDays: [], prevOff: [] } } });
  assert.match(E.ffMoveDay(1, 2), /^Your new days start next week/);
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

// "Rest today" (Nov 2026: "my back hurts — make today a rest day"). 4-day week from
// Monday: Mon Quads, Tue Push, Wed rest, Thu Speed, Fri rest, Sat Pull, Sun rest.
const TUE_PUSH = "Day 2 — Upper (Push)";
const restEngine = (o = {}) => engine({ startWd: 1, dop: 2, ...o, store: { ff_gameday: {}, ff_start: 1, ...(o.store || {}) } });

test("rest today: skips today's workout, which then plays as a rest day; undo brings it back", () => {
  const E = restEngine();
  assert.equal(E.ffRestToday("Day 1 — Lower (Quads)"), false, "only today's workout");
  assert.equal(E.ffRestToday(TUE_PUSH), true);
  assert.ok(E.sessionSkipped(3, TUE_PUSH));
  assert.ok(E.ffRestInstead(3, E.stripDays()[1]));
  assert.match(E.toasts.at(-1), /^Today’s a rest day\. Upper \(Push\) is skipped; undo it on Train\.$/);
  assert.equal(E.ffRestUndo(TUE_PUSH), true);
  assert.ok(!E.sessionSkipped(3, TUE_PUSH));
  assert.ok(E.store.ff_skipped_sessions["3|" + TUE_PUSH] < 0, "undo is a negative stamp (syncs; never a delete)");
  assert.match(E.toasts.at(-1), /^It’s back on: Upper \(Push\) is today’s workout\.$/);
  // A finished workout can't be rested; a finished one also never reads as rested.
  const F = restEngine({ store: { ff_log: { ["3|" + TUE_PUSH]: { ex: [], finishedAt: "x" } } } });
  assert.equal(F.ffRestToday(TUE_PUSH), false);
  F.skipSession(3, TUE_PUSH);
  assert.ok(!F.ffRestInstead(3, F.stripDays()[1]));
});

test("rest today is today's only: an earlier skip keeps its workout card; dragging a rested workout un-skips it", () => {
  let E = restEngine({ dop: 3 });                     // Wednesday (rest) is today; Tuesday's Push was skipped
  E.skipSession(3, TUE_PUSH);
  assert.ok(!E.ffRestInstead(3, E.stripDays()[1]), "a past skip isn't 'rested' (it can still be logged late)");
  assert.equal(E.ffRestToday(TUE_PUSH), false, "only today's workout can be rested");
  E = restEngine();
  assert.equal(E.ffRestableToday().name, TUE_PUSH);
  E.ffRestToday(TUE_PUSH);
  assert.equal(E.ffRestableToday(), null, "already rested");
  E.ffMoveDay(1, 2);                                  // a deliberate drag: you'll do it Wednesday
  assert.ok(!E.sessionSkipped(3, TUE_PUSH));
  assert.equal(E.stripDays()[2].name, TUE_PUSH);
});

test("a past rested day with recovery logged stays a rest day and stays put (Codex, #123)", () => {
  const E = restEngine({ dop: 3, store: { ff_rest: { ["3|" + TUE_PUSH]: 5 } } });   // rested Tuesday, logged recovery; today is Wednesday
  E.skipSession(3, TUE_PUSH);
  const tue = E.stripDays()[1];
  assert.ok(E.ffRestInstead(3, tue), "still a rest day, with its ✓");
  assert.equal(E.ffDayLogged(3, tue), true);
  assert.equal(E.ffMoveDay(1, 4), "Days you've already logged stay put.");
  assert.ok(E.sessionSkipped(3, TUE_PUSH), "not un-skipped by a refused drag");
  E.store.ff_rest = { ["3|" + TUE_PUSH + "|cardio"]: 7 };
  assert.ok(E.ffRestInstead(3, tue), "cardio counts too");
});

test("rest today → undo clears the rest-day check-offs made under the workout's name", () => {
  const E = restEngine(); E.ffRestToday(TUE_PUSH);
  E.store.ff_rest = { ["3|" + TUE_PUSH]: 5, ["3|" + TUE_PUSH + "|cardio"]: 6 };
  E.ffRestUndo(TUE_PUSH);
  assert.ok(E.store.ff_rest["3|" + TUE_PUSH] < 0 && E.store.ff_rest["3|" + TUE_PUSH + "|cardio"] < 0);
  E.ffRestToday(TUE_PUSH);
  assert.equal(E.ffDayLogged(3, E.stripDays()[1]), false, "a second rest the same week starts clean");
});

test("rest today: a rested-instead day with a check-off stays put; a skip freezes this week's arrangement", () => {
  const E = restEngine(); E.ffRestToday(TUE_PUSH);
  assert.equal(E.ffDayLogged(3, E.stripDays()[1]), false, "no check-off yet: it can still move");
  E.store.ff_rest = { ["3|" + TUE_PUSH]: 5 };
  assert.equal(E.ffDayLogged(3, E.stripDays()[1]), true);
  assert.equal(E.ffMoveDay(1, 2), "Days you've already logged stay put.");
  // Changing days off mid-week after a skip queues for next week (the skip is pinned to today).
  E.ffSaveSchedule(function (g) { g.off = [5]; });
  assert.equal(E.store.ff_gameday.arrangeWeek, 4);
});


// Nov 2026, owner: "I don't like back day on Friday because I want to golf on Saturday and Sunday
// and that gets me in trouble." The pull + rotation day (lats, mid-back, trunk rotators: weighted
// pull-ups, rows, cable rotations) leaves the back and the turn stiff for a day or two, so like heavy
// legs it never sits the day before a round. Legs stay the stronger rule when a week is overbooked.
test("the back + rotation day never lands the day before a round (any start day, any play days)", () => {
  for (const freq of [4, 5]) for (let startWd = 0; startWd < 7; startWd++) for (const days of [[6, 0], [6], [0], [3], [2, 5]]) {
    const E = engine({ freq, startWd, wsBase: [2026, 10, 15], store: { ff_gameday: { days } } });
    const week = E.stripDays(), wd = (i) => (startWd + i) % 7;
    week.forEach((d, i) => {
      if (!days.includes(wd((i + 1) % 7))) return;
      const tag = `${freq}-day, week starts ${startWd}, plays ${days}: ${week.map((x) => x.name.replace(/^Day \d+ — /, "")).join(" | ")}`;
      assert.ok(!/Lower|Squat|Hinge|Quads/.test(d.name) || d.type === "rest", "no heavy legs before a round — " + tag);
      // Two rounds three days apart on a 5-day plan (Tue + Fri) can't keep both "day befores" clear
      // while the plan's order holds: legs win, so a back day may take one of them. Everywhere else, never.
      const tight = freq === 5 && days.length === 2 && days.join() === "2,5";
      if (!tight) assert.ok(!/Pull/.test(d.name) || d.type === "rest", "no back day before a round — " + tag);
    });
  }
  // The owner's week: 5 days, the plan's week starts Sunday, golf Saturday + Sunday.
  const E = engine({ freq: 5, startWd: 0, wsBase: [2026, 10, 15], store: { ff_gameday: { days: [6, 0] } } });
  const w = E.stripDays(), fri = w[5], sat = w[6], sun = w[0];
  assert.equal(sat.type, "rest"); assert.equal(sun.type, "rest");
  assert.match(fri.name, /Push|Speed/, `Friday is a push or speed day, not ${fri.name}`);
  assert.equal(E.ffBackRotate({ name: "Day 5 — Upper (Pull + Rotate)", type: "lift" }), true);
  assert.equal(E.ffBackRotate({ name: "Day 2 — Upper (Push)", type: "lift" }), false);
  assert.equal(E.ffBackRotate({ name: "Rest / Play 18", type: "rest" }), false);
});

test("dragging the back day onto the day before a round is allowed but flagged", () => {
  const E = engine({ freq: 5, startWd: 1, wsBase: [2026, 10, 15], store: { ff_gameday: { days: [6] } } });
  const w = E.stripDays(), pull = w.findIndex((d) => /Pull/.test(d.name)), fri = 4;
  assert.notEqual(pull, fri, "the automatic week keeps it off Friday");
  assert.match(E.ffMoveDay(pull, fri), /Heads up: back and rotation work the day before a round\./);
});

test("the back-day rule starts with weeks beginning Nov 15, 2026: a week already under way never reshuffles (Codex, #134)", () => {
  // Decided from the plan's own dates, not stored state, so every device agrees whatever order
  // cloud sync lands in. (A boot-time cutover marker could be set before a cloud merge brought in
  // this week's logged work — Codex P1, #134.)
  assert.match(LOGGER, /var FF_BACK_RULE_FROM=new Date\(2026,10,15\)\.getTime\(\);/);
  assert.doesNotMatch(LOGGER + ONBOARD, /ffArrangeCutover|arrangeV/, "no stored marker, no boot hook");
  // The workout on Friday (the day before Saturday's round), whatever weekday the plan's week starts on.
  const at = (wsBase, startWd) => engine({ freq: 5, startWd, wsBase, store: { ff_gameday: { days: [6, 0] } } }).stripDays()[(5 - startWd + 7) % 7].name;
  assert.match(at([2026, 10, 8], 0), /Pull/, "the week that started Sun Nov 8 keeps the old layout");
  assert.match(at([2026, 10, 15], 0), /Push|Speed/, "from the week starting Sun Nov 15: the new rule");
  assert.match(at([2026, 10, 22], 0), /Push|Speed/, "and every week after");
});
