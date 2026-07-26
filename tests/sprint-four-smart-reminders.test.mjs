import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/js/app/080-game-day-round-day-fueling-warm-up-plan.js", import.meta.url), "utf8");
const boot = readFileSync(new URL("../src/js/app/090-first-run-onboarding.js", import.meta.url), "utf8");
const sw = readFileSync(new URL("../src/sw.template.js", import.meta.url), "utf8");
const sender = readFileSync(new URL("../supabase/functions/push-daily/index.ts", import.meta.url), "utf8");
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

function reminderContext(day) {
  const store = { ff_reminder_mode: "essential", ff_body: [], ff_weekly_reviews: {} };
  return {
    Date,
    dayOfPlan: () => 1,
    stripDays: () => [day],
    curWeek: () => 3,
    missedWorkout: () => null,
    getSession: () => null,
    sessionFinished: (s) => !!(s && s.finishedAt),
    speedTestDue: () => false,
    lsGet: (key, fallback) => store[key] ?? fallback,
  };
}

test("smart reminders route an unfinished workout and keep essential rest days quiet", () => {
  const train = reminderContext({ type: "lift", name: "Day 1 — Lower" });
  for (const name of ["ffLocalISO", "ffWeekKeyFor", "ffReminderMode", "ffReminderMessage"])
    vm.runInNewContext(functionSource(app, name), train);
  const message = train.ffReminderMessage(0);
  assert.equal(message.kind, "train");
  assert.match(message.url, /go=plan&src=push&kind=train/);

  const rest = reminderContext({ type: "rest", name: "Rest" });
  for (const name of ["ffLocalISO", "ffWeekKeyFor", "ffReminderMode", "ffReminderMessage"])
    vm.runInNewContext(functionSource(app, name), rest);
  assert.equal(rest.ffReminderMessage(0).skip, true);
});

test("notification clicks deep-link safely to the exact job", () => {
  assert.match(sw, /e\.notification\.data\.url/);
  assert.match(sw, /list\[i\]\.navigate\(target\)/);
  assert.match(sw, /\^\\\.\\\/\\\?/);
  assert.match(boot, /launchQ\.get\("src"\)==="push"/);
  assert.match(app, /kind==="speed"/);
  assert.match(app, /kind==="week"/);
});

test("sender suppresses completed jobs and constrains user-supplied payloads", () => {
  assert.match(sender, /today\?\.skip/);
  assert.match(sender, /safeText/);
  assert.match(sender, /safeKind/);
  assert.match(sender, /safeUrl/);
  assert.match(sender, /TTL:\s*3600/);
});

test("reminder controls and analytics stay explicit and anonymous", () => {
  assert.match(app, /Smart reminders/);
  assert.match(app, /one notification maximum per day/);
  assert.match(app, /never before 7 AM or after 8 PM/);
  for (const event of ["reminder_enabled", "reminder_disabled", "reminder_settings_changed", "notification_opened"]) {
    assert.match(health, new RegExp(`${event}:1`));
    assert.match(healthFn, new RegExp(`"${event}"`));
  }
  assert.doesNotMatch(health, /endpoint|p256dh|auth:/);
});
