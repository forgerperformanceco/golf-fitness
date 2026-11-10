import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// "Rest today" (Nov 2026: "I need to skip my workout today — my back hurts. Make it a
// rest day with our normal off-day stretches"). The schedule rules (skip, undo, move,
// what stays put) are in season-schedule-health; here: what every other surface says
// once today's workout is rested — reminders, the week count, Home, the check-in.
const src = (f) => readFileSync(new URL(`../src/js/app/${f}`, import.meta.url), "utf8");
const GAME = src("080-game-day-round-day-fueling-warm-up-plan.js");
const PLAYER = src("070-workout-player-full-screen-guided-sessio.js");
const HOME = src("075-proactive-coaching-your-focus-insights.js");
const READY = src("077-daily-readiness-adaptive-session.js");
const PLAN = src("035-training-plan.js");

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

function reminder({ rested = true, mode = "essential", speedDue = false } = {}) {
  const store = { ff_reminder_mode: mode, ff_body: speedDue ? [{ s: 80 }] : [], ff_weekly_reviews: {} };
  const push = { type: "lift", name: "Day 2 — Upper (Push)" };
  const ctx = {
    Date, dayOfPlan: () => 1, stripDays: () => [push, { type: "lift", name: "Day 3 — Speed & Power" }],
    curWeek: () => 3, missedWorkout: () => null, getSession: () => null,
    sessionFinished: (s) => !!(s && s.finishedAt), speedTestDue: () => speedDue, ffAccessAt: () => "full",
    lsGet: (k, d) => store[k] ?? d, roundToday: () => null, restDone: () => false,
    dayKey: (d) => d.name, ffRestInstead: (w, d) => rested && w === 3 && d === push,
  };
  vm.runInNewContext(`var FF_EVENING_HOUR=19;\n` +
    ["ffLocalISO", "ffWeekKeyFor", "ffReminderMode", "ffReminderMessage"].map((n) => fn(GAME, n)).join("\n"), ctx);
  return ctx.ffReminderMessage;
}

test("reminders: a rested day gets no workout nudge, and no speed test on a sore day", () => {
  assert.equal(reminder({ rested: false })(0).kind, "train", "control: the workout nudge");
  const m = reminder()(0);
  assert.notEqual(m.kind, "train");
  assert.equal(m.skip, true, "essential mode: a rest day is quiet");
  assert.notEqual(reminder({ speedDue: true })(0).kind, "speed");
  assert.equal(reminder({ rested: false, speedDue: true })(0).kind, "train");
  assert.equal(reminder({ mode: "daily" })(0).kind, "recovery", "daily mode: the recovery note");
  assert.equal(reminder()(1).kind, "train", "tomorrow is untouched");
});

test("the week count leaves a rested workout out (3 of 3, not 3 of 4 forever)", () => {
  const days = [{ name: "A", type: "lift" }, { name: "B", type: "lift" }, { name: "rest", type: "rest" }];
  const ctx = {
    curWeek: () => 1, activeDays: () => days, getSession: (w, d) => (d === "A" ? { finishedAt: "x" } : null),
    sessionFinished: (s) => !!(s && s.finishedAt), ffRestInstead: (w, d) => d.name === "B",
  };
  vm.runInNewContext(fn(PLAYER, "weekDoneCount"), ctx);
  assert.deepEqual({ ...ctx.weekDoneCount() }, { done: 1, total: 1 });
});

test("Home: a rested today leads as a rest day, ahead of a speed test or mobility check", () => {
  const lead = fn(HOME, "nextUpCard");
  const ri = lead.indexOf("ffRestInstead(wk, d)"), speed = lead.indexOf("speedTestDue()"), mob = lead.indexOf("mobDue()");
  assert.ok(ri > 0 && ri < speed && ri < mob, "the rest-instead card comes before the speed test and mobility check");
  assert.match(lead, /Today · Rest day/);
  assert.match(lead, /ffRestTodayBtnHtml\(d\.name, "nu-skip"\)/, "today's workout card offers it");
});

test("the readiness check-in offers rest today — only for today's own workout", () => {
  assert.match(fn(READY, "ffReadinessResult"), /ffIsTodaySlot\(ffReadyDay\)\) \? ffRestTodayBtnHtml\(ffReadyDay, "ready-link"\)/);
});

test("Train offers it on today's unfinished lift and speed cards, never once it's done", () => {
  const card = fn(PLAN, "dayCardHtml");
  assert.match(card, /\(!plDone && ffIsTodaySlot\(d\.name\)\) \? ffRestTodayBtnHtml\(d\.name\)/);
  assert.match(card, /\(!spDone && ffIsTodaySlot\(d\.name\)\) \? ffRestTodayBtnHtml\(d\.name\)/);
  assert.match(card, /if\(ffRestInstead\(curWeek\(\), d\)\) return restInsteadCardHtml\(d, interactive\);/);
});
