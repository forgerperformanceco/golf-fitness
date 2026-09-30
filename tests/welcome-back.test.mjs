import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const wb = readFileSync(new URL("../src/js/app/087-welcome-back-return-after-a-break.js", import.meta.url), "utf8");
const boot = readFileSync(new URL("../src/js/app/090-first-run-onboarding.js", import.meta.url), "utf8");
const sync = readFileSync(new URL("../cloud-sync.js", import.meta.url), "utf8");
const health = readFileSync(new URL("../product-health.js", import.meta.url), "utf8");
const healthFn = readFileSync(new URL("../supabase/functions/product-health/index.ts", import.meta.url), "utf8");

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

const DAY = 864e5;
function context(store, { later = false } = {}) {
  const ctx = {
    Date, Math, Object, Array,
    WB_GAP_DAYS: 14,
    planStart: () => store.ff_start ?? null,
    lsGet: (k, f) => (k in store ? store[k] : f),
    sessionStorage: { getItem: (k) => (later && k === "ff_wb_later" ? "1" : null) },
  };
  for (const name of ["ffLastActiveTs", "ffLastWorkoutTs", "ffWelcomeBackDue"])
    vm.runInNewContext(functionSource(wb, name), ctx);
  return ctx;
}

test("a 14+ day gap in every kind of activity triggers the welcome back", () => {
  const now = Date.now();
  const store = {
    ff_onboarded: true,
    ff_start: new Date(now - 75 * DAY).toISOString(),
    ff_history: [{ ts: now - 60 * DAY, doneTs: now - 61 * DAY }],
    ff_body: [{ ts: now - 59 * DAY, w: "190" }],
  };
  const due = context(store).ffWelcomeBackDue();
  assert.ok(due, "two months away should be due");
  assert.equal(due.days, 59);
  // doneTs (the real finish) wins over ts, which moves on re-save/restore.
  assert.equal(due.lastWorkout, now - 61 * DAY);
});

test("any recent activity — a meal, a weigh-in, a rest day, a fresh plan — means not away", () => {
  const now = Date.now();
  const base = {
    ff_onboarded: true,
    ff_start: new Date(now - 75 * DAY).toISOString(),
    ff_history: [{ ts: now - 60 * DAY }],
  };
  for (const [key, value] of [
    ["ff_fuel", { "2026-09-29": { m: { 0: "a" }, ts: now - 2 * DAY } }],
    ["ff_body", [{ ts: now - 3 * DAY, w: "190" }]],
    ["ff_rest", { "11|rest@2": -(now - 5 * DAY) }],          // an undo stamp is activity too
    ["ff_log", { "11|Day 1": { _ts: now - 1 * DAY } }],       // started, not finished
    ["ff_welcome_back", now - 10 * DAY],                      // answered recently
    ["ff_start", new Date(now - 4 * DAY).toISOString()],     // restarted recently
  ]) {
    const store = { ...base, [key]: value };
    assert.equal(context(store).ffWelcomeBackDue(), null, `${key} should count as activity`);
  }
});

test("never shown before setup, without a plan, or after 'decide later' this session", () => {
  const now = Date.now();
  const away = { ff_start: new Date(now - 40 * DAY).toISOString() };
  assert.equal(context({ ...away }).ffWelcomeBackDue(), null, "not onboarded");
  assert.equal(context({ ff_onboarded: true }).ffWelcomeBackDue(), null, "no plan");
  assert.equal(context({ ...away, ff_onboarded: true }, { later: true }).ffWelcomeBackDue(), null, "decide later");
  assert.ok(context({ ...away, ff_onboarded: true }).ffWelcomeBackDue(), "away with a plan");
});

test("the three answers: restart keeps history, pick up keeps the week, later is session-only", () => {
  const choose = functionSource(wb, "ffWelcomeBackChoose");
  assert.match(choose, /if\(choice==="restart"\)\{ resetPlanFull\(\); startPlanAtWeek\(1\); \}/);
  assert.match(choose, /lsSet\("ff_welcome_back", Date\.now\(\)\)/);
  assert.match(choose, /sessionStorage\.setItem\("ff_wb_later","1"\)/);
  // Pick up = from today: this week's passed sessions get skip marks.
  assert.match(choose, /while\(\(m=missedWorkout\(\)\) && n\+\+<7\) skipSession\(curWeek\(\), m\.name\)/);
  const html = functionSource(wb, "ffWelcomeBackHtml");
  assert.match(html, /Every workout, lift and trend you logged stays/);
  assert.match(html, /Pick up at week '\+wk/);
  assert.match(html, /HOW YARDSMITH WORKS/);
  assert.match(html, /No calorie counting/);
});

test("the greeting waits for cloud data, stays out of the way of jobs, and roams", () => {
  const bootFn = functionSource(wb, "ffWelcomeBackBoot");
  assert.match(bootFn, /src=push\|go=/);
  assert.match(bootFn, /ff-sync-status/);
  assert.match(bootFn, /auth-token/);
  assert.match(wb, /addEventListener\("ff-external-write"/);
  assert.match(boot, /ffWelcomeBackBoot\(sharedLink\)/);
  assert.match(boot, /ffMaybeWelcomeBack\(\)/);
  assert.match(sync, /"ff_welcome_back"/);
  for (const event of ["welcome_back_shown", "welcome_back_choice"]) {
    assert.match(health, new RegExp(`${event}:1`));
    assert.match(healthFn, new RegExp(`"${event}"`));
  }
});

test("returning golfers don't get the new-user checklist after a restart", () => {
  const home = readFileSync(new URL("../src/js/app/075-proactive-coaching-your-focus-insights.js", import.meta.url), "utf8");
  const now = Date.now();
  const ctx = {
    Date, Array, isNaN,
    planStart: () => new Date(now - 2 * DAY).toISOString(),
    lsGet: (k, f) => (k === "ff_history" ? [{ doneTs: now - 70 * DAY }] : f),
  };
  vm.runInNewContext(functionSource(home, "ffVeteran"), ctx);
  assert.equal(ctx.ffVeteran(), true, "history from before the plan start = veteran");
  ctx.lsGet = (k, f) => (k === "ff_history" ? [{ doneTs: now - 1 * DAY }] : f);
  assert.equal(ctx.ffVeteran(), false, "workouts only inside this plan = still new");
  assert.match(functionSource(home, "openingRoundHtml"), /if\(!completedAt && ffVeteran\(\)\) return "";/);
});
