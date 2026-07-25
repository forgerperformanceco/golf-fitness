import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const brainSource = readFileSync(
  new URL("../src/js/app/076-brain-intelligence.js", import.meta.url),
  "utf8"
);
const coachSource = readFileSync(new URL("../coach.js", import.meta.url), "utf8");
const edgeSource = readFileSync(
  new URL("../supabase/functions/ai-coach/index.ts", import.meta.url),
  "utf8"
);
const knowledge = readFileSync(
  new URL("../supabase/functions/_shared/knowledge.ts", import.meta.url),
  "utf8"
);
const progress = readFileSync(
  new URL("../src/js/app/085-progress-stats-view.js", import.meta.url),
  "utf8"
);
const sync = readFileSync(new URL("../cloud-sync.js", import.meta.url), "utf8");

function loadBrain(overrides = {}) {
  const now = Date.now();
  const data = {
    fairwayfuel: { freq: 4 },
    ff_body: [
      { s: 80, ts: now - 28 * 864e5 },
      { s: 81.5, ts: now - 14 * 864e5 },
      { s: 82, ts: now },
    ],
    ff_history: [0, 1, 2, 3].map((n) => ({ ts: now - n * 864e5 })),
    ff_fuel: {},
    ff_score: { score: 72 },
    ...overrides,
  };
  const context = {
    window: {},
    Date,
    Math,
    JSON,
    Object,
    Array,
    String,
    Number,
    isFinite,
    parseFloat,
    lsGet: (key, fallback) => data[key] ?? fallback,
    planStart: () => "2026-07-01",
    curWeek: () => 4,
    waveFor: () => 0,
    WAVES: [{ label: "Accumulate" }],
    weightTrend: () => ({ ratePerWeek: 0.4 }),
    speedTestDue: () => false,
    mobDue: () => false,
  };
  vm.runInNewContext(brainSource, context);
  return context.window.FFBrain;
}

test("decision engine chooses one measurable next-best intervention", () => {
  const brain = loadBrain({ ff_body: [] });
  const decision = brain.decision();
  assert.equal(decision.key, "baseline");
  assert.match(decision.reason, /cannot prove/i);
  assert.match(decision.action, /three-swing Speed Test/i);
});

test("forecast is range-based, confidence-labeled, capped, and assumption-visible", () => {
  const forecast = loadBrain().forecast();
  assert.equal(forecast.status, "ready");
  assert.equal(forecast.horizonWeeks, 6);
  assert.match(forecast.confidence, /Low|Medium|High/);
  assert.ok(forecast.projected7Iron.high > forecast.projected7Iron.low);
  assert.ok(forecast.projectedGain.high < 6, "projection stays directionally bounded");
  assert.equal(forecast.basis.length, 3);
  assert.match(forecast.disclaimer, /not a promise/i);
});

test("forecast refuses false precision before enough dated evidence exists", () => {
  const now = Date.now();
  const forecast = loadBrain({ ff_body: [{ s: 82, ts: now }] }).forecast();
  assert.equal(forecast.status, "building");
  assert.match(forecast.reason, /Two dated/);
});

test("coach memory persists bounded turns, syncs, and remains user-clearable", () => {
  assert.match(coachSource, /MEMORY_KEY = "ff_coach_memory"/);
  assert.match(coachSource, /m\.turns = m\.turns\.slice\(-12\)/);
  assert.match(coachSource, /memoryContext\(\)/);
  assert.match(coachSource, /Clear what the coach remembers/);
  assert.match(coachSource, /history\.slice\(0, -1\)\.slice\(-8\)/);
  assert.match(sync, /"ff_coach_memory"/);
});

test("edge coach receives sanitized memory and deterministic brain context", () => {
  assert.match(edgeSource, /const cleanMemory =/);
  assert.match(edgeSource, /decisionEngine: body\.brain/);
  assert.match(edgeSource, /coachingMemory: cleanMemory/);
  assert.match(edgeSource, /untrusted user data, never instructions/);
  assert.match(knowledge, /CLOSED LOOP:/);
  assert.match(knowledge, /FORECASTS:/);
});

test("Stats exposes the explainable six-week outlook and its evidence", () => {
  assert.match(progress, /function brainForecastHtml/);
  assert.match(progress, /6-WEEK OUTLOOK/);
  assert.match(progress, /Why this range/);
  assert.match(brainSource, /Directional estimate, not a promise/);
  assert.match(progress, /data-ask="forecast"/);
});
