import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// Sep 2026 evidence update (NUTRITION-AND-TRAINING-REFERENCE.md §9a).
const plan = readFileSync(new URL("../src/js/app/035-training-plan.js", import.meta.url), "utf8");
const logger = readFileSync(new URL("../src/js/app/040-workout-logger.js", import.meta.url), "utf8");
const cues = readFileSync(new URL("../src/js/app/045-inline-logger-log-as-you-train-in-the-ca.js", import.meta.url), "utf8");
const knowledge = readFileSync(new URL("../supabase/functions/_shared/knowledge.ts", import.meta.url), "utf8");

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

test("stretch-biased lifts: overhead triceps in both splits, seated curl on the 4-day plan", () => {
  assert.equal((plan.match(/\["Cable Overhead Triceps Extension","3 \\u00d7 12"\]/g) || []).length, 2);
  assert.doesNotMatch(plan, /\["Cable Triceps Pushdown",/);
  const days4 = plan.slice(plan.indexOf("days4:"));
  assert.match(days4.slice(0, days4.indexOf("Day 2")), /"Seated Leg Curl"/);
  assert.match(plan, /"Cable Overhead Triceps Extension":\{needs:\["cable"\]/);
});

test("tempo, rest and cues follow the evidence", () => {
  assert.doesNotMatch(plan, /~3 sec/);
  assert.match(plan, /control the lowering \(1–2 sec\)/);
  assert.match(plan, /RIR 1 · rest ~90s/);
  assert.match(cues, /Lean back — recline the seat/);
  assert.match(cues, /Pause 1–2 sec in the deep stretch at the bottom/);
  assert.match(cues, /mu:"Triceps \(long head\)"/);
  assert.doesNotMatch(knowledge, /~3-second lowering/);
  assert.doesNotMatch(knowledge, /steep diminishing returns past ~10–12/);
});

test("a swap chosen for the renamed pushdown carries over, and a reset clears it", () => {
  const store = { ff_swaps: { "Cable Triceps Pushdown": "Skull Crusher" } };
  const ctx = { lsGet: (k, f) => store[k] ?? f, lsSet: (k, v) => { store[k] = v; } };
  const renamed = logger.match(/var FF_PLAN_RENAMED=\{[^}]*\};/)[0];
  vm.runInNewContext(renamed + functionSource(logger, "getSwaps") + functionSource(logger, "ffProfileDefault") + functionSource(logger, "applySwapName") + functionSource(logger, "setSwap"), ctx);
  assert.equal(ctx.applySwapName("Cable Overhead Triceps Extension"), "Skull Crusher");
  ctx.setSwap("Cable Overhead Triceps Extension", "Cable Overhead Triceps Extension");
  assert.equal(ctx.applySwapName("Cable Overhead Triceps Extension"), "Cable Overhead Triceps Extension");
  assert.deepEqual(store.ff_swaps, {});
});
