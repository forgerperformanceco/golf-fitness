import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const logger = readFileSync(new URL("../src/js/app/040-workout-logger.js", import.meta.url), "utf8");
const player = readFileSync(new URL("../src/js/app/070-workout-player-full-screen-guided-sessio.js", import.meta.url), "utf8");
const train = readFileSync(new URL("../src/js/app/035-training-plan.js", import.meta.url), "utf8");
const stats = readFileSync(new URL("../src/js/app/085-progress-stats-view.js", import.meta.url), "utf8");

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
  const brace = source.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("only an explicitly finished workout is banked", () => {
  const context = {};
  vm.runInNewContext([
    functionSource(logger, "sessionFinished"),
    functionSource(logger, "sessionInProgress"),
  ].join("\n"), context);
  assert.equal(context.sessionFinished(null), false);
  assert.equal(context.sessionFinished({ ex: [] }), false);
  assert.equal(context.sessionInProgress({ ex: [] }), true);
  assert.equal(context.sessionFinished({ finishedAt: "Jul 25, 2026" }), true);
  assert.equal(context.sessionInProgress({ finishedAt: "Jul 25, 2026" }), false);
});

test("the journey resumes a partial workout and does not advance or count it", () => {
  const partial = { ex: [{ sets: [{ done: true }] }] };
  const days = [{ name: "Day 1", type: "lift" }, { name: "Day 2", type: "lift" }];
  const log = { "1|Day 1": partial };
  const context = {
    curWeek: () => 1,
    activeDays: () => days,
    getLog: () => log,
    getSession: (week, day) => log[`${week}|${day}`] || null,
    sessionFinished: (s) => !!(s && s.finishedAt),
    sessionInProgress: (s) => !!(s && !s.finishedAt),
  };
  vm.runInNewContext([
    functionSource(player, "nextWorkout"),
    functionSource(player, "weekDoneCount"),
  ].join("\n"), context);
  assert.equal(context.nextWorkout(), "Day 1");
  assert.deepEqual({ ...context.weekDoneCount() }, { done: 0, total: 2 });

  partial.finishedAt = "Jul 25, 2026";
  assert.equal(context.nextWorkout(), "Day 2");
  assert.deepEqual({ ...context.weekDoneCount() }, { done: 1, total: 2 });
});

test("all completion surfaces use the finished-session truth", () => {
  assert.match(train, /sessionFinished\(getSession\(wk, d\.name\)\)/);
  assert.match(player, /if\(sessionFinished\(L\[k\]\)\)/);
  assert.match(stats, /var sess=sessionsByWeek\(\)\.length/);
  assert.match(stats, /sessions:sessionsByWeek\(\)\.length/);
});
