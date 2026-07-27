import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const readiness = readFileSync(new URL("../src/js/app/077-daily-readiness-adaptive-session.js", import.meta.url), "utf8");
const logger = readFileSync(new URL("../src/js/app/040-workout-logger.js", import.meta.url), "utf8");
const player = readFileSync(new URL("../src/js/app/070-workout-player-full-screen-guided-sessio.js", import.meta.url), "utf8");
const home = readFileSync(new URL("../src/js/app/075-proactive-coaching-your-focus-insights.js", import.meta.url), "utf8");
const brain = readFileSync(new URL("../src/js/app/076-brain-intelligence.js", import.meta.url), "utf8");
const sync = readFileSync(new URL("../cloud-sync.js", import.meta.url), "utf8");
const health = readFileSync(new URL("../product-health.js", import.meta.url), "utf8");
const healthFn = readFileSync(new URL("../supabase/functions/product-health/index.ts", import.meta.url), "utf8");
const coachFn = readFileSync(new URL("../supabase/functions/ai-coach/index.ts", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/css/styles.css", import.meta.url), "utf8");
const privacy = readFileSync(new URL("../privacy.html", import.meta.url), "utf8");

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

function session() {
  return {
    ex: Array.from({ length: 4 }, (_, i) => ({
      name: `Lift ${i + 1}`,
      target: "4 × 8",
      sets: Array.from({ length: 4 }, () => ({ w: "", r: "", done: false })),
    })),
  };
}

function engine() {
  const context = {};
  vm.runInNewContext(functionSource(readiness, "ffReadinessRetarget"), context);
  vm.runInNewContext(functionSource(readiness, "ffReadinessAdaptSession"), context);
  return context;
}

test("smart trim protects primary work and removes only later fatigue", () => {
  const adapted = engine().ffReadinessAdaptSession(session(), {
    date: "2026-07-27", ts: 1, score: 4, band: "steady", original: false,
  });
  assert.deepEqual(adapted.ex.map((x) => x.sets.length), [4, 4, 3, 3]);
  assert.deepEqual(adapted.ex.map((x) => x.target), ["4 × 8", "4 × 8", "3 × 8", "3 × 8"]);
  assert.equal(adapted.readiness.band, "steady");
});

test("recovery dose trims every lift while an explicit override preserves the plan", () => {
  const context = engine();
  const recovery = context.ffReadinessAdaptSession(session(), {
    date: "2026-07-27", ts: 1, score: 1, band: "recharge", original: false,
  });
  assert.deepEqual(recovery.ex.map((x) => x.sets.length), [2, 2, 2, 2]);
  assert.ok(recovery.ex.every((x) => x.target === "2 × 8"));

  const original = context.ffReadinessAdaptSession(session(), {
    date: "2026-07-27", ts: 1, score: 1, band: "recharge", original: true,
  });
  assert.ok(original.ex.every((x) => x.sets.length === 4));
});

test("readiness gates only new sessions and remains visible across the product", () => {
  assert.match(player, /ffReadinessNeedsCheck/);
  assert.match(player, /ffReadinessOpen\(dayName\)/);
  assert.match(logger, /ffReadinessOpen\(dayName,"manual"\)/);
  assert.match(logger, /ffApplyReadiness\(built,day,week\)/);
  assert.match(home, /ffReadinessHomeHtml/);
  assert.match(brain, /readiness:readiness\?/);
  assert.match(coachFn, /recentReadiness:\s*body\.readiness/);
  assert.match(player, /ffReadinessLoad/);
  assert.match(css, /\.ready-modal/);
  assert.match(css, /\.pl-ready/);
});

test("readiness syncs as bounded history without leaking health values to telemetry", () => {
  assert.match(sync, /"ff_readiness"/);
  assert.match(sync, /ff_readiness:\s*function/);
  assert.match(sync, /function \(e\) \{ return e\.date; \}, 60/);
  for (const event of ["readiness_completed", "adaptive_session_started"]) {
    assert.match(health, new RegExp(`${event}:1`));
    assert.match(healthFn, new RegExp(`"${event}"`));
  }
  assert.doesNotMatch(health, /sleep|soreness|energy|score/);
  assert.match(privacy, /daily readiness/i);
});

test("the check-in is fast, user-controlled, and contains a safety boundary", () => {
  assert.match(readiness, /20-SECOND CHECK-IN/);
  assert.match(readiness, /changes today’s dose—not your plan/);
  assert.match(readiness, /Keep the original session/);
  assert.match(readiness, /Sharp pain, a new injury, dizziness, or illness/);
});
