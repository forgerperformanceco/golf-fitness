import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const home = readFileSync(new URL("../src/js/app/075-proactive-coaching-your-focus-insights.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/css/styles.css", import.meta.url), "utf8");
const health = readFileSync(new URL("../product-health.js", import.meta.url), "utf8");
const healthFn = readFileSync(new URL("../supabase/functions/product-health/index.ts", import.meta.url), "utf8");
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

test("Weekly Flight Plan reads real calendar-week signals", () => {
  const monday = new Date("2026-07-20T12:00:00.000Z");
  const fixedNow = new Date("2026-07-26T12:00:00.000Z").getTime();
  class FixedDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [fixedNow]));
    }
  }
  const context = {
    Date: FixedDate,
    planState: { freq: 4 },
    weekStartDateCal: () => new Date(monday),
    ffISO: (d) => d.toISOString().slice(0, 10),
    fuelStateFor: () => "close",
    mobTests: () => [],
    curWeek: () => 3,
    lsGet: (key, fallback) => ({
      ff_history: [{ ts: monday.getTime() + 1000 }, { ts: monday.getTime() + 2000 }],
      ff_body: [{ ts: monday.getTime() + 3000, w: "182" }],
      ff_weekly_reviews: {},
    }[key] ?? fallback),
  };
  vm.runInNewContext(functionSource(home, "weeklyKey"), context);
  vm.runInNewContext(functionSource(home, "weeklyLoopState"), context);
  const state = context.weeklyLoopState();
  assert.equal(state.sessions, 2);
  assert.equal(state.freq, 4);
  assert.equal(state.checkin, true);
  assert.ok(state.fuelDays >= 1);
  assert.equal(state.done, 2);
});

test("the weekly loop unlocks after activation and forgives imperfect weeks", () => {
  assert.match(home, /Date\.now\(\)-complete<=2\*864e5/);
  assert.match(home, /the work still counts/i);
  assert.match(home, /clean card/);
  assert.match(home, /data-weekbank/);
  assert.match(home, /ff_weekly_reviews/);
  assert.match(home, /shareWeeklyFlight/);
  assert.match(sync, /"ff_weekly_reviews"/);
  assert.match(sync, /ff_weekly_reviews:\s*unionWeeklyReviews/);
  assert.match(css, /\.weekly-flight\{/);
  assert.match(css, /\.wf-review\{/);
});

test("banked week reviews merge across devices without losing either week", () => {
  const context = {};
  vm.runInNewContext(functionSource(sync, "unionWeeklyReviews"), context);
  const merged = context.unionWeeklyReviews(
    { "2026-07-20": { ts: 20, sessions: 4 } },
    { "2026-07-13": { ts: 10, sessions: 3 }, "2026-07-20": { ts: 15, sessions: 2 } },
  );
  assert.equal(merged["2026-07-13"].sessions, 3);
  assert.equal(merged["2026-07-20"].sessions, 4);
});

test("weekly retention telemetry is anonymous and server allow-listed", () => {
  for (const event of ["weekly_action_started", "weekly_review_completed", "weekly_review_shared"]) {
    assert.match(health, new RegExp(`${event}:1`));
    assert.match(healthFn, new RegExp(`"${event}"`));
  }
  assert.doesNotMatch(health, /user_id|email:/);
});
