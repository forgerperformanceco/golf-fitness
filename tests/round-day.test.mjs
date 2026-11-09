import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// Played 18 on a rest day (Nov 2026): a round logged TODAY counts as today's
// activity on Train — only for today's slot, never for other rest days.
const src = (f) => readFileSync(new URL(`../src/js/app/${f}`, import.meta.url), "utf8");
const PLAN = src("035-training-plan.js");
const ROUND = src("082-round-debrief.js");
const HOME = src("075-proactive-coaching-your-focus-insights.js");
function fn(source, name) {
  const i = source.indexOf("function " + name + "(");
  assert.ok(i >= 0, name);
  let d = 0;
  for (let k = source.indexOf("{", i); k < source.length; k++) {
    if (source[k] === "{") d++;
    else if (source[k] === "}" && --d === 0) return source.slice(i, k + 1);
  }
}
function ctx({ dop = 3, round = { date: "today", score: 82 } } = {}) {
  const week = [{ name: "Push", type: "lift" }, { name: "Rest", type: "rest", k: "rest@1" }, { name: "Rest", type: "rest", k: "rest@2" }, { name: "Pull", type: "lift" }];
  const c = { dayOfPlan: () => dop, stripDays: () => week, dayKey: (d) => d.k || d.name, roundToday: () => round, week };
  vm.runInNewContext(fn(PLAN, "ffTodayRound"), c);
  return c;
}

test("a round logged today covers today's rest slot only", () => {
  const c = ctx();                                   // today = slot 3 = rest@2
  assert.equal(c.ffTodayRound(c.week[2]).score, 82, "today's rest day");
  assert.equal(c.ffTodayRound(c.week[1]), null, "another rest day keeps its cardio");
  assert.equal(ctx({ round: null }).ffTodayRound(c.week[2]), null, "no round, nothing changes");
  assert.equal(ctx({ dop: null }).ffTodayRound(c.week[2]), null, "no plan yet");
  assert.equal(c.ffTodayRound(null), null);
});

test("the rest card swaps the cardio for the round, and saving a round refreshes Train", () => {
  assert.match(PLAN, /rnd\s*\n?\s*\/\/ Played today: the round IS the cardio/);
  assert.match(PLAN, /Played a round today\? Log it — it counts as your cardio/);
  assert.match(PLAN, /restDone\(wk, dayKey\(d\)\) \|\| !!ffTodayRound\(d\)/, "today's chip ticks");
  assert.match(PLAN, /ffTodayRound\(featured\)/, "the hero says Round logged");
  assert.match(ROUND, /try\{ renderPhase\(\); \}catch\(e\)\{\}/);
  // Home doesn't push a missed workout on a rest day you played 18.
  assert.match(HOME, /if\(missed && d && d\.type==="rest" && typeof roundToday==="function" && roundToday\(\)\) missed=null;/);
});
