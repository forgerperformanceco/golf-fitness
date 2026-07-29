import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const home = readFileSync(new URL("../src/js/app/075-proactive-coaching-your-focus-insights.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/css/styles.css", import.meta.url), "utf8");
const health = readFileSync(new URL("../product-health.js", import.meta.url), "utf8");
const healthFn = readFileSync(new URL("../supabase/functions/product-health/index.ts", import.meta.url), "utf8");
const logger = readFileSync(new URL("../src/js/app/040-workout-logger.js", import.meta.url), "utf8");
const sync = readFileSync(new URL("../cloud-sync.js", import.meta.url), "utf8");

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

test("catch-up chooses the oldest due unfinished workout without moving the plan", () => {
  const days = [
    { name: "Day 1", type: "lift" },
    { name: "Day 2", type: "lift" },
    { name: "Rest", type: "rest" },
  ];
  const log = {
    "2|Day 1": { finishedAt: "done" },
    "2|Day 2": { ex: [] },
  };
  const context = {
    planStart: () => "2026-07-12",
    stripDays: () => days,
    dayOfPlan: () => 3,
    curWeek: () => 2,
    getSession: (week, day) => log[`${week}|${day}`] || null,
    sessionFinished: (session) => !!(session && session.finishedAt),
    sessionSkipped: () => false,
  };
  vm.runInNewContext(functionSource(home, "missedWorkout"), context);
  assert.equal(context.missedWorkout().name, "Day 2");
  log["2|Day 2"].finishedAt = "done";
  assert.equal(context.missedWorkout(), null);
  assert.doesNotMatch(functionSource(home, "missedWorkout"), /lsSet\("ff_start"/);
});

test("catch-up can be intentionally skipped without moving or deleting the plan", () => {
  const days = [
    { name: "Day 1", type: "lift" },
    { name: "Day 2", type: "lift" },
    { name: "Rest", type: "rest" },
  ];
  const skipped = new Set();
  const context = {
    planStart: () => "2026-07-12",
    stripDays: () => days,
    dayOfPlan: () => 3,
    curWeek: () => 2,
    getSession: () => null,
    sessionFinished: () => false,
    sessionSkipped: (week, day) => skipped.has(`${week}|${day}`),
  };
  vm.runInNewContext(functionSource(home, "missedWorkout"), context);
  assert.equal(context.missedWorkout().name, "Day 1");
  skipped.add("2|Day 1");
  assert.equal(context.missedWorkout().name, "Day 2");
  skipped.add("2|Day 2");
  assert.equal(context.missedWorkout(), null);
  assert.match(home, /data-skipsession=/);
  assert.match(home, /Skip this session/);
  assert.match(logger, /function skipSession\(/);
  assert.match(logger, /if\(sessionFinished\(s\)\)/);
  assert.match(sync, /"ff_skipped_sessions"/);
});

test("Opening Round is based on three real activation signals", () => {
  const context = {
    sessionsByWeek: () => [{ w: 1 }],
    fuelLog: () => ({ "2026-07-25": {} }),
    fuelStateFor: () => "close",
    lsGet: (key) => key === "ff_body" ? [{ s: 82 }] : [],
    speedTests: () => [],
  };
  vm.runInNewContext(functionSource(home, "openingRoundState"), context);
  assert.deepEqual({ ...context.openingRoundState() }, {
    trained: true, fueled: true, baseline: true, done: 3,
  });
  assert.match(home, /Opening Round complete/);
  assert.match(home, /Date\.now\(\)-completedAt>2\*864e5/);
});

test("Home stays simple while exposing dynamic weekly momentum", () => {
  assert.match(home, /openingRoundHtml\(\)/);
  assert.match(home, /weekMomentumText\(\)/);
  assert.match(home, /Pick up the thread · No reset/);
  assert.match(home, /Life happened\. Your progress is safe/);
  assert.match(home, /var started=sessionInProgress\(sess\)/);
  assert.match(css, /\.opening-round\{/);
  assert.match(css, /\.nu-card\.catchup\{/);
});

test("activation analytics remain anonymous and allow-listed", () => {
  for (const event of ["activation_step", "activation_completed", "catchup_started"]) {
    assert.match(health, new RegExp(`${event}:1`));
    assert.match(healthFn, new RegExp(`"${event}"`));
  }
  assert.doesNotMatch(health, /user_id|email:/);
});
