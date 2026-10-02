import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const access = read("../src/js/app/036-access-free-week-and-pro.js");
const train = read("../src/js/app/035-training-plan.js");
const logger = read("../src/js/app/040-workout-logger.js");
const player = read("../src/js/app/070-workout-player-full-screen-guided-sessio.js");
const speed = read("../src/js/app/060-speed-test-day-the-biweekly-testing-ritu.js");
const home = read("../src/js/app/075-proactive-coaching-your-focus-insights.js");
const reminders = read("../src/js/app/080-game-day-round-day-fueling-warm-up-plan.js");
const stats = read("../src/js/app/085-progress-stats-view.js");
const coach = read("../coach.js");
const template = read("../src/index.template.html");
const swTemplate = read("../src/sw.template.js");
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
function load(ctx, source, names) {
  for (const name of names) vm.runInNewContext(functionSource(source, name), ctx);
  return ctx;
}

const DAY = 864e5;
const APPLE_EULA = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
// A minimal Storage: the Supabase session lives under "sb-<ref>-auth-token".
function makeStorage(items = {}) {
  const keys = () => Object.keys(items);
  return {
    get length() { return keys().length; },
    key: (i) => keys()[i] ?? null,
    getItem: (k) => (k in items ? items[k] : null),
    setItem: (k, v) => { items[k] = String(v); },
    removeItem: (k) => { delete items[k]; },
  };
}
const sessionFor = (id) => ({ "sb-ref-auth-token": JSON.stringify({ access_token: "x", user: { id } }) });
const lsGetFrom = (store) => (k, f) => (store[k] == null ? f : store[k]);

const ACCESS = ["ffPaywallOn", "ffStampVal", "ffFreeWeekStart", "ffStampFreeWeek", "ffFreeDayIdx",
  "ffFreeDaysLeft", "ffStoredSessionUid", "ffIsPro", "ffAccessAt", "ffAccess"];
function context(store, { on = true, pro = false, bridge, storage = {}, planStart = null } = {}) {
  const win = {};
  if (pro) win.FFBilling = { isPro: () => true };
  if (bridge) win.FFBilling = bridge;
  const ctx = {
    Date, Math, Array, JSON, String, isFinite,
    FF_PAYWALL: on, FF_FREE_DAYS: 7,
    window: win,
    localStorage: makeStorage(storage),
    sessionStorage: { getItem: () => null },
    planStart: () => planStart,
    lsGet: lsGetFrom(store),
    lsSet: (k, v) => { store[k] = v; },
  };
  return load(ctx, access, ACCESS);
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
  assert.equal(context({ ff_free_week: now - 30 * DAY, ff_pro: { pro: true, uid: "u1" } }, { storage: sessionFor("u1") }).ffAccess(), "full");
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

test("the stamp is checked: garbage re-stamps, a clock that ran ahead counts from now, never more than 7 days left", () => {
  const now = Date.now();
  // A stamp from a device clock 30 days ahead.
  const ahead = { ff_onboarded: true, ff_free_week: now + 30 * DAY };
  const c1 = context(ahead);
  assert.equal(c1.ffFreeDaysLeft(), 7, "days left never exceed the free week");
  assert.equal(c1.ffAccess(), "preview");
  c1.ffStampFreeWeek();
  assert.ok(Math.abs(ahead.ff_free_week - now) < 5000, "re-stamped to now");
  // A couple of hours of skew between devices is not "the future": kept.
  const skew = { ff_onboarded: true, ff_free_week: now + 2 * 3600e3 };
  const c2 = context(skew); c2.ffStampFreeWeek();
  assert.equal(skew.ff_free_week, now + 2 * 3600e3);
  assert.equal(c2.ffFreeDaysLeft(), 7);
  // A numeric string (hand-edited backup) reads as its number.
  const str = { ff_onboarded: true, ff_free_week: String(now - 3 * DAY) };
  const c3 = context(str);
  assert.equal(c3.ffFreeDaysLeft(), 4);
  c3.ffStampFreeWeek();
  assert.equal(str.ff_free_week, now - 3 * DAY);
  // Anything else is no stamp: it never locks a new user, and boot re-stamps it.
  for (const bad of [true, -5, {}, "abc", NaN, Infinity]) {
    const s = { ff_onboarded: true, ff_free_week: bad };
    const c = context(s);
    assert.equal(c.ffAccess(), "preview", `${String(bad)} must not lock`);
    c.ffStampFreeWeek();
    assert.ok(typeof s.ff_free_week === "number" && Math.abs(s.ff_free_week - now) < 5000, `${String(bad)} re-stamped`);
  }
  // A history entry dated in the future doesn't count either.
  assert.equal(context({ ff_free_week: now, ff_history: [{ doneTs: now + 20 * DAY }] }).ffFreeDaysLeft(), 7);
});

test("starting a plan starts the free week — a shared ?link= visitor skips setup", () => {
  const store = {};
  context(store, { planStart: new Date().toISOString() }).ffStampFreeWeek();
  assert.ok(store.ff_free_week > 0, "a started plan counts as set up");
  const start = functionSource(logger, "startPlanAtWeek");
  assert.ok(start.indexOf("ffStampFreeWeek();") > start.indexOf('lsSet("ff_start"'), "stamps right after the plan starts");
});

test("no week jump outside Pro: every plan start is week 1, and the start screen has no week picker", () => {
  function run(acc, n) {
    const store = {}; let stamped = 0;
    const ctx = { Date, Math, ffAccess: () => acc, lsSet: (k, v) => { store[k] = v; },
      ffStampFreeWeek: () => { stamped++; }, renderPhase() {}, renderDash() {} };
    load(ctx, logger, ["startPlanAtWeek"]).startPlanAtWeek(n);
    return { back: Math.round((Date.now() - Date.parse(store.ff_start)) / DAY), stamped };
  }
  assert.equal(run("preview", 12).back, 0, "free week: week 12 → week 1");
  assert.equal(run("locked", 19).back, 0, "locked: week 19 → week 1");
  assert.equal(run("full", 5).back, 28, "Pro / billing off: jump to week 5");
  assert.equal(run("full", 5).stamped, 1);
  const startbar = functionSource(train, "renderPhase");
  const gate = startbar.indexOf(`(ffAccess()!=="full" ? '' :`);
  assert.ok(gate > 0 && gate < startbar.indexOf("Pick your current week"), "the start-screen picker is Pro-only");
});

test("Pro from the store bridge is strict: only isPro() === true counts", () => {
  const old = { ff_free_week: Date.now() - 30 * DAY };
  const bridged = (isPro) => context({ ...old }, { bridge: { isPro } }).ffAccess();
  assert.equal(bridged(() => true), "full");
  assert.equal(bridged(() => Promise.resolve(false)), "locked", "a Promise is not Pro");
  assert.equal(bridged(async () => true), "locked", "even a Promise of true is not a synchronous yes");
  assert.equal(bridged(() => ({})), "locked");
  assert.equal(bridged(() => "yes"), "locked");
  assert.equal(bridged(() => { throw new Error("x"); }), "locked");
});

test("the server's Pro answer counts only for the signed-in account that fetched it", () => {
  const old = Date.now() - 30 * DAY;
  const acc = (ff_pro, storage) => context({ ff_free_week: old, ff_pro }, { storage }).ffAccess();
  assert.equal(acc({ pro: true, uid: "u1" }, {}), "locked", "signed out: a cache (or a forged file) counts for nothing");
  assert.equal(acc({ pro: true }, {}), "locked");
  assert.equal(acc({ pro: true, uid: "u1" }, sessionFor("u1")), "full");
  assert.equal(acc({ pro: true, uid: "u1" }, sessionFor("u2")), "locked", "another account's answer");
  assert.equal(acc({ pro: true }, sessionFor("u1")), "locked", "an answer with no account");
  assert.equal(acc({ pro: false, uid: "u1" }, sessionFor("u1")), "locked");
  assert.equal(acc({ pro: true, uid: "u1" }, { "sb-ref-auth-token": "not json" }), "full", "a session whose id can't be read still counts");
  assert.match(functionSource(access, "ffRefreshPro"), /lsSet\("ff_pro", \{ pro:pro, ts:Date\.now\(\), uid:uid \}\)/);
});

test("sign-out drops the Pro cache; an expired token opened offline keeps it; another account drops it", () => {
  function auth(user, storage) {
    const store = { ff_pro: { pro: true, uid: "u1" } }; let refreshed = 0, rerendered = 0;
    const ctx = { JSON, String, localStorage: makeStorage(storage), lsGet: lsGetFrom(store),
      lsSet: (k, v) => { store[k] = v; }, ffRefreshPro: () => { refreshed++; }, ffAccessRerender: () => { rerendered++; } };
    load(ctx, access, ["ffStoredSessionUid", "ffOnAuth"]).ffOnAuth({ detail: { user } });
    return { pro: store.ff_pro, refreshed, rerendered };
  }
  const offline = auth(null, sessionFor("u1"));
  assert.deepEqual(offline.pro, { pro: true, uid: "u1" }, "INITIAL_SESSION(null) with the session still stored");
  const signedOut = auth(null, {});
  assert.equal(signedOut.pro, null); assert.equal(signedOut.rerendered, 1);
  const other = auth({ id: "u2" }, sessionFor("u2"));
  assert.equal(other.pro, null); assert.equal(other.refreshed, 1);
  const same = auth({ id: "u1" }, sessionFor("u1"));
  assert.deepEqual(same.pro, { pro: true, uid: "u1" }); assert.equal(same.refreshed, 1);
  assert.match(access, /window\.addEventListener\("ff-auth", ffOnAuth\)/);
});

test("signed in, the free week starts no later than the account (the coach's server clock)", async () => {
  async function align(store, createdAt) {
    let url = "", rerendered = 0;
    const ctx = { Date, Math, Array, String, JSON, isFinite, encodeURIComponent, Promise,
      FF_PAYWALL: true, FF_FREE_DAYS: 7, window: {}, localStorage: makeStorage(),
      sessionStorage: { getItem: () => null }, planStart: () => null,
      lsGet: lsGetFrom(store), lsSet: (k, v) => { store[k] = v; },
      ffAccessRerender: () => { rerendered++; },
      fetch: (u) => { url = u; return Promise.resolve({ ok: true, json: () => Promise.resolve([{ created_at: createdAt }]) }); } };
    load(ctx, access, [...ACCESS, "ffAlignFreeWeek"]);
    await ctx.ffAlignFreeWeek({ supabaseUrl: "https://x.supabase.co" }, "u1", {});
    return { url, rerendered, access: ctx.ffAccess() };
  }
  const now = Date.now();
  const dormant = { ff_onboarded: true, ff_free_week: now };            // stamped at launch, account months old
  const created = new Date(now - 60 * DAY).toISOString().replace("Z", "123+00:00");   // Postgres microseconds
  const r = await align(dormant, created);
  assert.match(r.url, /\/rest\/v1\/profiles\?select=created_at&id=eq\.u1$/);
  assert.ok(Math.abs(dormant.ff_free_week - (now - 60 * DAY)) < 1000, "takes the earlier account date");
  assert.equal(r.access, "locked"); assert.equal(r.rerendered, 1);
  const fresh = { ff_free_week: now - 2 * DAY };
  await align(fresh, new Date(now).toISOString());
  assert.equal(fresh.ff_free_week, now - 2 * DAY, "a later account date never extends the week");
  const fn = functionSource(access, "ffRefreshPro");
  assert.match(fn, /if\(uid\) ffAlignFreeWeek\(F, uid, H\);/);
  assert.doesNotMatch(coachFn, /ff_free_week/, "the server never trusts the client's clock");
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
  assert.match(functionSource(player, "startPlayer"), /if\(!ffCanStartWorkout\(day\.name, resume \|\| sessionInProgress\(getSession\(week, day\.name\)\)\)\) return;/);
  assert.match(functionSource(speed, "openSpeedTest"), /if\(!ffCanUse\("speedtest"\)\) return;/);
  assert.match(functionSource(access, "ffGateCoach"), /c\.ask=function\(\)\{ if\(!ffCanUse\("coach"\)\) return;/);
  assert.match(functionSource(home, "nextUpCard"), /if\(ffAccess\(\)==="locked"\) return ffLockedWithResumeHtml\("home"\);/);
  assert.match(functionSource(train, "trainWeekHtml"), /if\(access==="locked"\) return html\+ffLockedWithResumeHtml\("train"\);/);
  // Finishing an already-started session is never blocked.
  assert.match(functionSource(access, "ffCanStartWorkout"), /if\(a==="full" \|\| resuming\) return true;/);
});

test("locked: a workout already under way this week can still be finished — Home and Train offer Resume", () => {
  const wk = 2, log = {};
  const days = [{ name: "Day 1 — Lower (Quads)", type: "lift" }, { name: "Rest", type: "rest" },
    { name: "Day 2 — Upper (Push)", type: "lift" }];
  const skipped = {};
  const ctx = { planStart: () => "2026-09-20", curWeek: () => wk, stripDays: () => days,
    getSession: (w, d) => log[w + "|" + d] || null, sessionInProgress: (s) => !!(s && !s.finishedAt),
    sessionSkipped: (w, d) => !!skipped[w + "|" + d],
    ffEsc: (s) => String(s), ffAttr: (s) => String(s), nuCta: (l) => `<span class="nu-cta">${l}</span>`,
    ffLockedCardHtml: (where) => `<LOCK ${where}>` };
  load(ctx, access, ["ffResumeDay", "ffResumeCardHtml", "ffLockedWithResumeHtml"]);
  assert.equal(ctx.ffResumeDay(), null);
  assert.equal(ctx.ffLockedWithResumeHtml("home"), "<LOCK home>", "nothing under way: just the lock card");
  log["2|Day 2 — Upper (Push)"] = { ex: [{ sets: [{ w: "100", r: "8", done: true }] }] };
  assert.equal(ctx.ffResumeDay().name, "Day 2 — Upper (Push)");
  const homeHtml = ctx.ffLockedWithResumeHtml("home");
  assert.match(homeHtml, /data-startplayer="Day 2 — Upper \(Push\)"/);
  assert.ok(homeHtml.indexOf("Resume workout") < homeHtml.indexOf("<LOCK home>"), "Resume sits above the lock card");
  const trainHtml = ctx.ffLockedWithResumeHtml("train");
  assert.ok(trainHtml.indexOf("Resume workout") >= 0 && trainHtml.indexOf("Resume workout") < trainHtml.indexOf("<LOCK train>"));
  skipped["2|Day 2 — Upper (Push)"] = 1;
  assert.equal(ctx.ffResumeDay(), null, "a skipped session isn't offered");
  delete skipped["2|Day 2 — Upper (Push)"];
  log["2|Day 2 — Upper (Push)"].finishedAt = "2026-09-29";
  assert.equal(ctx.ffResumeDay(), null, "a finished session isn't offered");
  // The gate lets the started session through while locked; a new one opens the Pro sheet.
  let opened = 0;
  const gate = load({ ffAccess: () => "locked", ffPaywallOpen: () => { opened++; }, isFutureDay: () => false, ffToast() {} },
    access, ["ffCanStartWorkout"]);
  assert.equal(gate.ffCanStartWorkout("Day 2 — Upper (Push)", true), true);
  assert.equal(opened, 0);
  assert.equal(gate.ffCanStartWorkout("Day 3 — Lower (Hinge)", false), false);
  assert.equal(opened, 1);
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

test("backups never carry the Pro cache or device bookkeeping, and can only shorten the free week", () => {
  const skip = load({}, reminders, ["ffBackupSkip"]).ffBackupSkip;
  for (const k of ["ff_pro", "ff_sync_owner", "ff_sync_base", "ff_sync_status", "ff_push_on", "ff_push_sig"]) assert.equal(skip(k), true, k);
  for (const k of ["fairwayfuel", "ff_log", "ff_history", "ff_free_week", "ff_targets", "ff_theme"]) assert.equal(skip(k), false, k);
  assert.match(functionSource(reminders, "ffExportData"), /if\(ffBackupSkip\(k\)\) continue;/);
  const imp = functionSource(reminders, "ffImportData");
  assert.match(imp, /if\(ffBackupSkip\(k\)\) return;/);
  assert.ok(imp.indexOf("ffImportFreeWeek(data, now);") < imp.indexOf("localStorage.setItem(k"), "merged before anything is written");
  const now = Date.now();
  function restore(local, file) {
    const store = { ff_free_week: local }, data = { ff_free_week: file };
    const ctx = { isFinite, lsGet: lsGetFrom(store) };
    load(ctx, access, ["ffStampVal"]); load(ctx, reminders, ["ffImportFreeWeek"]);
    ctx.ffImportFreeWeek(data, now);
    return "ff_free_week" in data ? data.ff_free_week : "keep local";
  }
  assert.equal(restore(now - 10 * DAY, now - 20 * DAY), now - 20 * DAY, "an earlier date in the file wins");
  assert.equal(restore(now - 10 * DAY, now - 5 * DAY), "keep local", "a later date never extends the week");
  assert.equal(restore(now - 10 * DAY, now + 9 * DAY), "keep local", "a future date is ignored");
  assert.equal(restore(now - 10 * DAY, "garbage"), "keep local");
  assert.equal(restore(undefined, now - 3 * DAY), now - 3 * DAY);
  assert.equal(restore(undefined, undefined), "keep local");
});

test("a locked tap on a coaching insight keeps the insight for after they subscribe", () => {
  const at = stats.indexOf('var iask=e.target.closest("[data-insask]");');
  const block = stats.slice(at, stats.indexOf("renderDash(); return; }", at));
  const gate = block.indexOf('if(!ffCanUse("coach")) return;');
  assert.ok(gate > 0 && gate < block.indexOf("ffDismissInsight(isig)"), "access is checked before the insight is marked seen");
});

test("the coach is wrapped the moment coach.js assigns it — and still works", () => {
  let asked = 0, opened = 0, checks = 0, acc = "locked";
  const win = {};
  const ctx = { window: win, document: { addEventListener() {} },
    ffCanUse: (what) => { checks++; assert.equal(what, "coach"); return acc !== "locked"; } };
  load(ctx, access, ["ffGateCoach", "ffWatchCoach"]).ffWatchCoach();
  assert.match(access, /\n  ffWatchCoach\(\);\n  window\.addEventListener\("load", ffGateCoach\);/, "installed at module evaluation, load stays as a fallback");
  win.FFCoach = { ready: () => true, open() { opened++; }, ask() { asked++; } };   // what coach.js does
  assert.equal(win.FFCoach.__ffGated, true);
  assert.equal(win.FFCoach.ready(), true);
  win.FFCoach.ask("hi", "x"); win.FFCoach.open("x");
  assert.equal(asked + opened, 0, "locked: neither entry point reaches the coach");
  acc = "full";
  win.FFCoach.ask("hi", "x"); win.FFCoach.open("x");
  assert.equal(asked, 1); assert.equal(opened, 1); assert.equal(checks, 4);
});

test("a server 'subscription required' opens the Pro sheet (coach.js → ff-paywall → 036)", () => {
  assert.match(coach, /if \(j\.error === "subscription_required"\) \{\s*try \{ window\.dispatchEvent\(new CustomEvent\("ff-paywall", \{ detail: \{ reason: "coach" \} \}\)\); \} catch \(e\) \{\}/);
  assert.match(coach, /typing\.textContent = j\.message \|\|/, "the server's message still shows");
  const v1 = /coach\.js\?v=(\d+)/.exec(template)[1], v2 = /coach\.js\?v=(\d+)/.exec(swTemplate)[1];
  assert.equal(v1, v2, "page and service worker pin the same coach.js");
  assert.ok(+v1 >= 92, "coach.js pin bumped for the 402 hook");
  let opened = null;
  const run = (on, detail) => { opened = null;
    load({ FF_PAYWALL: on, sessionStorage: { getItem: () => null }, ffPaywallOpen: (r) => { opened = r; } }, access,
      ["ffPaywallOn", "ffOnPaywallEvent"]).ffOnPaywallEvent({ detail }); return opened; };
  assert.equal(run(true, { reason: "coach" }), "coach");
  assert.equal(run(true, { reason: "<img>" }), "coach");
  assert.equal(run(false, { reason: "coach" }), null, "billing off in this build: the note alone");
  assert.match(access, /window\.addEventListener\("ff-paywall", ffOnPaywallEvent\)/);
});

test("reminders never promise a workout or speed test on a locked day — judged on each reminder's own day", () => {
  const now = Date.now();
  // The date math: free week stamped 4 days ago → today and +2 are free, +3 is day 8.
  const c = context({ ff_free_week: now - 4 * DAY });
  const at = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return c.ffAccessAt(d); };
  assert.equal(at(0), "preview"); assert.equal(at(2), "preview"); assert.equal(at(3), "locked");
  assert.equal(context({ ff_free_week: now - 40 * DAY }, { on: false }).ffAccessAt(new Date()), "full");
  function msgs(lockedFrom, { daily = false, missed = null, speedDue = false } = {}) {
    const store = { ff_reminder_mode: daily ? "daily" : "essential", ff_body: [{ s: 80 }], ff_weekly_reviews: {} };
    const ctx = { Date, dayOfPlan: () => 1, stripDays: () => [{ type: "lift", name: "Day 1 — Lower" }],
      curWeek: () => 3, missedWorkout: () => missed, getSession: () => null,
      sessionFinished: (s) => !!(s && s.finishedAt), speedTestDue: () => speedDue,
      lsGet: (k, f) => store[k] ?? f,
      ffAccessAt: (date) => { const t = new Date(); t.setHours(0, 0, 0, 0); const d = new Date(date); d.setHours(0, 0, 0, 0);
        return Math.round((d - t) / DAY) >= lockedFrom ? "locked" : "preview"; } };
    load(ctx, reminders, ["ffLocalISO", "ffWeekKeyFor", "ffReminderMode", "ffReminderMessage"]);
    return [0, 1, 2, 3, 4, 5, 6].map((o) => ctx.ffReminderMessage(o).kind);
  }
  assert.deepEqual(msgs(99), ["train", "train", "train", "train", "train", "train", "train"], "free days: unchanged");
  assert.deepEqual(msgs(3).slice(3).filter((k) => k === "train"), [], "a free-week schedule stops at day 8");
  assert.deepEqual(msgs(3).slice(0, 3), ["train", "train", "train"]);
  const locked = msgs(0, { missed: { name: "Day 1 — Lower" }, speedDue: true });
  assert.ok(!locked.some((k) => k === "train" || k === "catchup" || k === "speed"), JSON.stringify(locked));
  assert.ok(msgs(0, { daily: true }).every((k) => k === "recovery" || k === "week"), "recovery notes may continue");
});

test("non-Pro users see their free-week status right under the sign-in card; Pro keeps it in Your plan", () => {
  const acct = functionSource(reminders, "renderAccount");
  assert.match(acct, /if\(!ffPaywallOn\(\)\) G\.help\+=ffAccessCardHtml\(\);\s*else if\(ffAccess\(\)==="full"\) G\.plan=ffAccessCardHtml\(\)\+G\.plan;\s*else html\+=ffAccessCardHtml\(\);/);
  assert.ok(acct.indexOf("else html+=ffAccessCardHtml();") < acct.indexOf('html+=acctGroup("plan"'), "placed before the folded groups");
});

/* ---- The Pro sheet and the store bridge ---- */
const SHEET = ["ffPwPlatform", "ffPwUrl", "ffPwTermsUrl", "ffPwTrial", "ffPwLoadPrices", "ffPwPrices", "ffPaywallHtml", "ffPwRerender"];
function sheet(bridge, { plan = "annual", open = false } = {}) {
  const body = { innerHTML: "" }, modal = { hidden: !open, getAttribute: () => "workout" };
  const ctx = { Math, String, isFinite, Promise,
    window: bridge ? { FFBilling: bridge } : {},
    FF_PRICES: { annual: { price: "$79.99", per: "/ year", note: "$6.67 a month", tag: "Best value" },
      monthly: { price: "$14.99", per: "/ month", note: "Cancel any time" } },
    FF_TERMS_URL: APPLE_EULA, ffPwPlan: plan, ffPwLivePrices: null, ffPwBusy: false,
    curWeek: () => 3, ffEsc: (s) => String(s), ffAttr: (s) => String(s),
    $: (id) => (id === "pwModal" ? modal : id === "pwBody" ? body : null) };
  load(ctx, access, SHEET);
  ctx.body = body; ctx.modal = modal;
  return ctx;
}
const GBP = (trialDays) => ({ annual: { price: "£79.99", per: "/ year", note: "£6.67 a month", trialDays },
  monthly: { price: "£14.99", per: "/ month", note: "Cancel any time" } });

test("the Pro sheet carries what the stores require", () => {
  const html = sheet(null).ffPaywallHtml("workout");
  assert.match(html, /Renews automatically until you cancel/);
  assert.match(html, /data-pwrestore/);
  assert.match(html, /privacy\.html/);
  assert.match(access, /FF_TERMS_URL="https:\/\/www\.apple\.com\/legal\/internet-services\/itunes\/dev\/stdeula\/"/);
  assert.match(access, /annual:\s*\{ price:"\$79\.99"/);
  assert.match(access, /monthly: \{ price:"\$14\.99"/);
  for (const event of ["paywall_shown", "paywall_buy_tap"]) {
    assert.match(health, new RegExp(`${event}:1`));
    assert.match(healthFn, new RegExp(`"${event}"`));
  }
});

test("a free trial is promised only when the store says this user gets one", () => {
  const web = sheet(null).ffPaywallHtml("workout");
  assert.doesNotMatch(web, /free trial|Free for/i, "the defaults carry no trial claim");
  assert.match(web, /data-pwbuy="1">Continue</);
  assert.match(web, /\$79\.99 a year\. Renews/);
  assert.doesNotMatch(access, /7-day free trial/, "no hard-coded trial anywhere in the module");
  const ios = sheet({ platform: "ios", isPro: () => false, purchase() {}, prices: () => GBP(7) });
  ios.ffPwLoadPrices();
  const t = ios.ffPaywallHtml("workout");
  assert.match(t, /Start 7-day free trial/);
  assert.match(t, /Free for 7 days, then £79\.99 a year\./);
  assert.match(t, /£6\.67 a month · 7-day free trial/);
  for (const td of [null, 0, undefined, "7", -3]) {
    const s = sheet({ platform: "ios", purchase() {}, prices: () => GBP(td) }); s.ffPwLoadPrices();
    const h = s.ffPaywallHtml("workout");
    assert.doesNotMatch(h, /free trial|Free for/i, `trialDays ${String(td)}`);
    assert.match(h, /data-pwbuy="1">Continue</);
    assert.match(h, /£79\.99 a year\./);
  }
  const monthly = sheet(null, { plan: "monthly" }).ffPaywallHtml("workout");
  assert.match(monthly, /\$14\.99 a month\./);
});

test("prices load from the store, async — never a USD stand-in once a store exists", async () => {
  let resolve; const pending = new Promise((r) => { resolve = r; });
  const s = sheet({ platform: "android", purchase() {}, prices: () => pending }, { open: true });
  s.ffPwLoadPrices();
  const before = s.ffPaywallHtml("workout");
  assert.match(before, /Loading prices…/);
  assert.match(before, /data-pwbuy="1" disabled aria-disabled="true"/);
  assert.doesNotMatch(before, /\$|£|€/);
  resolve({ annual: { price: "79,99 €", per: "/ Jahr", note: "6,67 € im Monat" }, monthly: { price: "14,99 €", per: "/ Monat", note: "" } });
  await pending; await new Promise((r) => setImmediate(r));
  assert.match(s.body.innerHTML, /79,99 € a year\./, "the open sheet re-renders with the store's prices");
  assert.doesNotMatch(s.body.innerHTML, /disabled/);
  const broken = sheet({ purchase() {}, prices: () => Promise.reject(new Error("offline")) });
  await broken.ffPwLoadPrices();
  assert.equal(broken.ffPwPrices(), null, "a failed load keeps waiting, not $");
  assert.equal(sheet(null).ffPwPrices().annual.price, "$79.99", "no store at all: the display defaults");
});

test("cancellation steps and the Terms link follow the platform", () => {
  const html = (bridge) => { const s = sheet(bridge); s.ffPwLoadPrices(); return s.ffPaywallHtml("workout"); };
  const ios = html({ platform: "ios", purchase() {}, prices: () => GBP(0) });
  assert.match(ios, /cancel any time in your App Store subscriptions, at least 24 hours before it renews\./);
  assert.ok(ios.includes(`<a href="${APPLE_EULA}"`), "Apple's EULA on iOS");
  const android = html({ platform: "android", purchase() {}, prices: () => GBP(0) });
  assert.match(android, /cancel any time in your Google Play subscriptions\./);
  assert.doesNotMatch(android, /24 hours|stdeula|>Terms</);
  const withTerms = html({ platform: "android", termsUrl: "https://yardsmith.golf/terms.html", purchase() {}, prices: () => GBP(0) });
  assert.match(withTerms, /<a href="https:\/\/yardsmith\.golf\/terms\.html"[^>]*>Terms<\/a>/);
  const web = html(null);
  assert.match(web, /cancel any time from the You tab\./);
  assert.doesNotMatch(web, /stdeula|>Terms</, "no Apple EULA on the web");
  assert.doesNotMatch(html({ platform: "web", termsUrl: "javascript:alert(1)", purchase() {}, prices: () => GBP(0) }), /javascript:/);
  const card = functionSource(access, "ffAccessCardHtml");
  assert.match(card, /data-pwmanage="1">Manage subscription/);
  assert.doesNotMatch(card, /store account/);
});

const CHECKOUT = ["ffStartCheckout", "ffPwConfirm", "ffPwPrices"];
function checkout(bridge, { proAfter = Infinity } = {}) {
  const toasts = [], calls = { close: 0, rerender: 0, refresh: 0, purchase: 0 };
  const ctx = { Promise, String, setTimeout: (f) => f(),
    window: { FFBilling: bridge }, FF_PRICES: { annual: {}, monthly: {} }, FF_PW_WAITS: [0, 2000, 4000, 8000],
    ffPwLivePrices: { annual: { price: "$79.99" }, monthly: { price: "$14.99" } }, ffPwBusy: false,
    ffToast: (m) => toasts.push(m), ffPaywallClose: () => { calls.close++; }, ffAccessRerender: () => { calls.rerender++; },
    ffPwRerender() {}, ffRefreshPro: () => { calls.refresh++; return Promise.resolve(); },
    ffIsPro: () => calls.refresh >= proAfter };
  if (bridge && bridge.purchase) { const p = bridge.purchase; bridge.purchase = (...a) => { calls.purchase++; return p(...a); }; }
  load(ctx, access, CHECKOUT);
  return { ctx, toasts, calls };
}
const flush = () => new Promise((r) => setImmediate(r));

test("checkout: success means Pro actually showed up; every other outcome says only what the store reported", async () => {
  const buy = async (purchase, opts) => { const r = checkout({ purchase }, opts); await r.ctx.ffStartCheckout("annual"); await flush(); return r; };
  let r = await buy(() => Promise.resolve({ status: "purchased" }), { proAfter: 1 });
  assert.deepEqual(r.toasts, ["Welcome to Yardsmith Pro — the whole plan is open."]); assert.equal(r.calls.close, 1);
  r = await buy(() => Promise.resolve({ status: "purchased" }), { proAfter: 3 });
  assert.equal(r.toasts.length, 1); assert.match(r.toasts[0], /^Welcome/); assert.equal(r.calls.refresh, 3, "kept checking until the webhook landed");
  r = await buy(() => Promise.resolve({ status: "purchased" }));
  assert.equal(r.calls.refresh, 4);
  assert.ok(!r.toasts.some((t) => /Welcome/.test(t)), "never 'welcome' without Pro");
  assert.match(r.toasts[0], /Payment received.*Restore purchases/);
  r = await buy(() => Promise.resolve(true));
  assert.ok(!r.toasts.some((t) => /Welcome/.test(t)), "a bare true is not proof either");
  r = await buy(() => Promise.resolve({ status: "pending" }));
  assert.deepEqual(r.toasts, ["Waiting for approval — Pro opens as soon as the payment goes through."]);
  r = await buy(() => Promise.resolve({ status: "cancelled" }));
  assert.deepEqual(r.toasts, [], "cancelled: silent");
  r = await buy(() => Promise.resolve({ status: "failed", charged: false }));
  assert.match(r.toasts[0], /Nothing was charged/);
  for (const outcome of [() => Promise.resolve({ status: "failed" }), () => Promise.reject(new Error("receipt post failed")),
    () => { throw new Error("sync"); }, () => Promise.resolve(undefined)]) {
    r = await buy(outcome);
    assert.equal(r.toasts.length, 1);
    assert.doesNotMatch(r.toasts[0], /Nothing was charged|haven.t been charged/i, "never claim no charge without the store saying so");
    assert.match(r.toasts[0], /Restore purchases/);
  }
});

test("checkout: one purchase at a time, no buying before prices load, honest 'open soon' with no store", async () => {
  let never = checkout({ purchase: () => new Promise(() => {}) });
  never.ctx.ffStartCheckout("annual"); never.ctx.ffStartCheckout("annual");
  assert.equal(never.calls.purchase, 1, "a second tap while the store is up does nothing");
  const loading = checkout({ purchase: () => Promise.resolve({ status: "purchased" }) });
  loading.ctx.ffPwLivePrices = null;
  loading.ctx.ffStartCheckout("annual");
  assert.equal(loading.calls.purchase, 0);
  const none = checkout(undefined);
  none.ctx.ffStartCheckout("annual");
  assert.deepEqual(none.toasts, ["Subscriptions open soon — thanks for your patience."]);
});

test("restore on the web while signed out asks the user to sign in", async () => {
  async function restore({ bridge, storage = {}, pro = false } = {}) {
    const toasts = []; let signIn = 0, closed = 0;
    const ctx = { Promise, JSON, String, window: bridge ? { FFBilling: bridge } : {},
      localStorage: makeStorage(storage), ffRefreshPro: () => Promise.resolve(), ffIsPro: () => pro,
      ffPaywallClose: () => { closed++; }, ffAccessRerender() {}, ffToast: (m) => toasts.push(m) };
    ctx.window.FF = { signIn: () => { signIn++; } };
    ctx.FF = ctx.window.FF;
    load(ctx, access, ["ffPwPlatform", "ffStoredSessionUid", "ffRestorePurchases"]);
    await ctx.ffRestorePurchases();
    return { toasts, signIn, closed };
  }
  const out = await restore();
  assert.equal(out.signIn, 1); assert.equal(out.closed, 1, "the sign-in window would sit under the Pro sheet");
  assert.match(out.toasts[0], /Sign in with the email you subscribed with/);
  const signedIn = await restore({ storage: sessionFor("u1") });
  assert.deepEqual(signedIn.toasts, ["No subscription found for this account."]); assert.equal(signedIn.signIn, 0);
  const ios = await restore({ bridge: { platform: "ios", restore: () => Promise.resolve() } });
  assert.equal(ios.signIn, 0, "store purchases restore without an account");
  assert.deepEqual((await restore({ pro: true })).toasts, ["Yardsmith Pro restored."]);
});

test("the bridge's 'ff-billing-changed' refreshes access and the open sheet", async () => {
  const toasts = []; let rerendered = 0, closed = 0, pro = true;
  const ctx = { FF_PAYWALL: true, sessionStorage: { getItem: () => null }, ffPwBusy: false,
    ffPwLoadPrices() {}, ffRefreshPro: () => Promise.resolve(), ffAccessRerender: () => { rerendered++; },
    $: () => ({ hidden: false }), ffIsPro: () => pro, ffPaywallClose: () => { closed++; },
    ffToast: (m) => toasts.push(m), ffPwRerender() {} };
  load(ctx, access, ["ffPaywallOn", "ffOnBillingChanged"]).ffOnBillingChanged();
  await flush();
  assert.equal(rerendered, 1); assert.equal(closed, 1); assert.match(toasts[0], /Yardsmith Pro is on/);
  assert.match(access, /window\.addEventListener\("ff-billing-changed", ffOnBillingChanged\)/);
  // A stale "See Yardsmith Pro" card never sells Pro to someone who has it.
  assert.match(access, /if\(ffAccess\(\)==="full"\)\{ ffAccessRerender\(\); return; \}/);
});

test("the server checks Pro before spending quota", () => {
  const gate = coachFn.indexOf("if (REQUIRE_SUBSCRIPTION)");
  const quota = coachFn.indexOf('admin.rpc("consume_ai_coach_quota"');
  assert.ok(gate > 0 && quota > gate, "subscription check precedes the quota RPC");
  assert.match(coachFn, /error: "subscription_required"/);
});

test("closing the Pro sheet hands back the scroll lock it found (coach sheet stays locked)", () => {
  const modal = { hidden: true, setAttribute() {}, querySelector: () => null };
  const body = { style: { overflow: "hidden" } };            // coach.js open() locked the page
  const ctx = { document: { body }, window: {}, ffPwPrevOverflow: "", setTimeout() {},
    ffPaywallEnsure() {}, ffPwLoadPrices() {}, ffPaywallHtml: () => "", $: (id) => (id === "pwModal" ? modal : {}) };
  load(ctx, access, ["ffPaywallOpen", "ffPaywallClose"]);
  ctx.ffPaywallOpen("coach");
  assert.equal(body.style.overflow, "hidden");
  ctx.ffPaywallOpen("coach");                                 // a second open doesn't lose the saved value
  ctx.ffPaywallClose();
  assert.equal(modal.hidden, true);
  assert.equal(body.style.overflow, "hidden", "the coach sheet underneath keeps the page locked");
  body.style.overflow = "";                                   // nothing else open
  ctx.ffPaywallOpen("train"); ctx.ffPaywallClose();
  assert.equal(body.style.overflow, "");
});
