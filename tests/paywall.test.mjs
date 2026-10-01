import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const access = read("../src/js/app/036-access-free-week-and-pro.js");
const train = read("../src/js/app/035-training-plan.js");
const player = read("../src/js/app/070-workout-player-full-screen-guided-sessio.js");
const speed = read("../src/js/app/060-speed-test-day-the-biweekly-testing-ritu.js");
const home = read("../src/js/app/075-proactive-coaching-your-focus-insights.js");
const sync = read("../cloud-sync.js");
const coachFn = read("../supabase/functions/ai-coach/index.ts");
const health = read("../product-health.js");
const healthFn = read("../supabase/functions/product-health/index.ts");

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
function context(store, { on = true, pro = false } = {}) {
  const ctx = {
    Date, Math, Array,
    FF_PAYWALL: on, FF_FREE_DAYS: 7,
    window: pro ? { FFBilling: { isPro: () => true } } : {},
    sessionStorage: { getItem: () => null },
    lsGet: (k, f) => (k in store ? store[k] : f),
    lsSet: (k, v) => { store[k] = v; },
  };
  for (const name of ["ffPaywallOn", "ffFreeWeekStart", "ffStampFreeWeek", "ffFreeDaysLeft", "ffIsPro", "ffAccess"])
    vm.runInNewContext(functionSource(access, name), ctx);
  return ctx;
}

test("the paywall ships OFF — flipping it is a launch-day decision, not a side effect", () => {
  assert.match(access, /var FF_PAYWALL=false;/);
  assert.equal(context({}, { on: false }).ffAccess(), "full");
  assert.match(coachFn, /REQUIRE_SUBSCRIPTION = Deno\.env\.get\("REQUIRE_SUBSCRIPTION"\) === "1"/);
});

test("free week: days 1–7 preview, day 8 locked, Pro always full", () => {
  const now = Date.now();
  assert.equal(context({ ff_free_week: now }).ffAccess(), "preview");
  assert.equal(context({ ff_free_week: now }).ffFreeDaysLeft(), 7);
  assert.equal(context({ ff_free_week: now - 6 * DAY }).ffAccess(), "preview");
  assert.equal(context({ ff_free_week: now - 6 * DAY }).ffFreeDaysLeft(), 1);
  assert.equal(context({ ff_free_week: now - 7 * DAY }).ffAccess(), "locked");
  assert.equal(context({ ff_free_week: now - 30 * DAY }, { pro: true }).ffAccess(), "full");
  assert.equal(context({ ff_free_week: now - 30 * DAY, ff_pro: { pro: true } }).ffAccess(), "full");
});

test("older workouts start the clock — restarting or reinstalling never buys a second free week", () => {
  const now = Date.now();
  const ctx = context({ ff_free_week: now, ff_history: [{ doneTs: now - 40 * DAY }] });
  assert.equal(ctx.ffAccess(), "locked");
  // Stamped once, never moved forward.
  const store = { ff_onboarded: true };
  const c2 = context(store);
  c2.ffStampFreeWeek();
  const first = store.ff_free_week;
  assert.ok(first > 0);
  store.ff_free_week = first - 3 * DAY;
  c2.ffStampFreeWeek();
  assert.equal(store.ff_free_week, first - 3 * DAY);
  // Not stamped before setup.
  const s3 = {}; context(s3).ffStampFreeWeek(); assert.equal(s3.ff_free_week, undefined);
});

test("the free-week clock roams and the earliest device wins", () => {
  assert.match(sync, /"ff_free_week"\]/);
  const ctx = {};
  const m = /ff_free_week: (function \(l, c\) \{[\s\S]*?\n    \})/.exec(sync);
  assert.ok(m, "MERGE entry exists");
  vm.runInNewContext(`merge = ${m[1]}`, ctx);
  assert.equal(ctx.merge(500, 300), 300);
  assert.equal(ctx.merge(undefined, 300), 300);
  assert.equal(ctx.merge(500, null), 500);
  assert.equal(ctx.merge(undefined, undefined), undefined);
});

test("every way into a workout, speed test or the coach goes through the gate", () => {
  assert.match(functionSource(player, "startPlayer"), /if\(!ffCanStartWorkout\(day\.name, resume\)\) return;/);
  assert.match(functionSource(speed, "openSpeedTest"), /if\(!ffCanUse\("speedtest"\)\) return;/);
  assert.match(functionSource(access, "ffGateCoach"), /c\.ask=function\(\)\{ if\(!ffCanUse\("coach"\)\) return;/);
  assert.match(functionSource(home, "nextUpCard"), /if\(ffAccess\(\)==="locked"\) return ffLockedCardHtml\("home"\);/);
  // Finishing an already-started session is never blocked.
  assert.match(functionSource(access, "ffCanStartWorkout"), /if\(a==="full" \|\| resuming\) return true;/);
});

test("free week hides the rest of the week: no Full week, no week jump, future days are teasers", () => {
  const week = functionSource(train, "trainWeekHtml");
  assert.match(functionSource(train, "planViewMode"), /ffAccess\(\)==="full" \? lsGet\("ff_planview","today"\) : "today"/);
  assert.match(week, /if\(access==="full"\)\s*html\+='<div class="planview-seg">/);
  assert.match(week, /if\(featLocked\)\{\s*html\+=ffLockedDayHtml\(featured\);/);
  assert.match(functionSource(train, "trainFootHtml"), /ffAccess\(\)!=="full" \? '' :/);
  const teaser = functionSource(access, "ffLockedDayHtml");
  assert.doesNotMatch(teaser, /\.ex\.map|exname|sl-row/, "the teaser never lists exercises");
});

test("the Pro sheet carries what the stores require", () => {
  const sheet = functionSource(access, "ffPaywallHtml");
  assert.match(sheet, /Renews automatically until you cancel/);
  assert.match(sheet, /data-pwrestore/);
  assert.match(sheet, /privacy\.html/);
  assert.match(access, /FF_TERMS_URL="https:\/\/www\.apple\.com\/legal\/internet-services\/itunes\/dev\/stdeula\/"/);
  assert.match(access, /annual:\s*\{ price:"\$79\.99"/);
  assert.match(access, /monthly: \{ price:"\$14\.99"/);
  for (const event of ["paywall_shown", "paywall_buy_tap"]) {
    assert.match(health, new RegExp(`${event}:1`));
    assert.match(healthFn, new RegExp(`"${event}"`));
  }
});

test("the server checks Pro before spending quota", () => {
  const gate = coachFn.indexOf("if (REQUIRE_SUBSCRIPTION)");
  const quota = coachFn.indexOf('admin.rpc("consume_ai_coach_quota"');
  assert.ok(gate > 0 && quota > gate, "subscription check precedes the quota RPC");
  assert.match(coachFn, /error: "subscription_required"/);
});
