import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

// Played 18 on a rest day and haven't stretched (Nov 2026): today's ONE reminder
// becomes the keep-your-turn routine at 8 PM. Every sender honours the day's own
// hour inside the 7 AM–8 PM promise, and a quiet day no longer uses up the day.
const app = readFileSync(new URL("../src/js/app/080-game-day-round-day-fueling-warm-up-plan.js", import.meta.url), "utf8");
const sender = readFileSync(new URL("../supabase/functions/push-daily/index.ts", import.meta.url), "utf8");

function fn(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
  let depth = 0;
  for (let i = source.indexOf("{", start); i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

function reminder({ day = { type: "rest", name: "Rest / Play 18" }, round = { score: 84 }, stretched = false,
  missed = null, mode = "essential" } = {}) {
  const store = { ff_reminder_mode: mode, ff_body: [], ff_weekly_reviews: {} };
  const ctx = {
    Date, dayOfPlan: () => 1, stripDays: () => [day, { type: "lift", name: "Day 2 — Upper (Push)" }],
    curWeek: () => 3, missedWorkout: () => missed, getSession: () => null,
    sessionFinished: (s) => !!(s && s.finishedAt), speedTestDue: () => false, ffAccessAt: () => "full",
    lsGet: (k, d) => store[k] ?? d, roundToday: () => round, restDone: () => stretched,
    dayKey: (d) => (d.type === "rest" ? "rest@0" : d.name),
  };
  vm.runInNewContext(`var FF_EVENING_HOUR=20;\n` +
    ["ffLocalISO", "ffWeekKeyFor", "ffReminderMode", "ffReminderMessage"].map((n) => fn(app, n)).join("\n"), ctx);
  return ctx.ffReminderMessage;
}

test("a played rest day: today's one reminder is the 8 PM turn routine — or nothing once stretched", () => {
  const m = reminder()(0);
  assert.equal(m.kind, "turn");
  assert.equal(m.h, 20);
  assert.match(m.title, /Played today\? Keep your turn/);
  assert.match(m.url, /^\.\/\?go=plan&src=push&kind=turn$/);
  assert.equal(reminder({ stretched: true })(0).skip, true, "stretched: quiet");
  // The round outranks a missed-workout catch-up (Home does the same, #120).
  assert.equal(reminder({ missed: { name: "Day 1 — Lower (Quads)" } })(0).kind, "turn");
  assert.equal(reminder({ missed: { name: "Day 1 — Lower (Quads)" }, stretched: true })(0).skip, true);
  // Daily mode too (it would otherwise send the recovery note at the usual hour).
  assert.equal(reminder({ mode: "daily" })(0).kind, "turn");
});

test("everything else is unchanged: no round, lift days, and future days", () => {
  assert.equal(reminder({ round: null })(0).skip, true, "a quiet rest day stays quiet (essential)");
  const lift = reminder({ day: { type: "lift", name: "Day 1 — Lower (Quads)" } })(0);
  assert.equal(lift.kind, "train", "a lift day with a round still offers the lift");
  assert.equal(lift.h, undefined);
  assert.equal(reminder({ missed: { name: "Day 1 — Lower (Quads)" }, round: null })(0).kind, "catchup");
  assert.notEqual(reminder()(1).kind, "turn", "only today");
});

test("the day's own hour: 7–20 only, else the usual hour (client and server agree)", () => {
  const c = {};
  vm.runInNewContext(fn(app, "ffMsgHour"), c);
  const ts = transformSync(fn(sender, "sendHour"), { loader: "ts" }).code;
  vm.runInNewContext(ts, c);
  for (const [h, want] of [[20, 20], [7, 7], [6, 17], [21, 17], [19.5, 17], ["20", 17], [undefined, 17], [null, 17]]) {
    assert.equal(c.ffMsgHour(h === undefined ? {} : { h }, 17), want, `client h=${h}`);
    assert.equal(c.sendHour(h === undefined ? {} : { h }, 17), want, `server h=${h}`);
  }
  assert.equal(c.ffMsgHour(null, 17), 17);
  assert.equal(c.sendHour(undefined, 17), 17);
});

test("server: one per local day, matched on the day's hour, and a quiet day doesn't use the day up", () => {
  assert.match(sender, /if \(!now \|\| s\.last_sent === now\.date\) \{ skipped\+\+; return; \}/);
  assert.match(sender, /if \(now\.hour !== sendHour\(today, s\.hour\)\) \{ skipped\+\+; return; \}/);
  assert.match(sender, /if \(today\?\.skip\) \{ skipped\+\+; return; \}/);
  // last_sent is written only after a real send.
  const writes = sender.match(/update\(\{ last_sent: now\.date \}\)/g) || [];
  assert.equal(writes.length, 1);
  assert.ok(sender.indexOf("update({ last_sent: now.date })") > sender.indexOf("webpush.sendNotification("));
});

test("native app: schedules each day at its own hour", async () => {
  const scheduled = [];
  const at = (h) => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(h, 0, 0, 0); return d.getTime(); };
  const msgs = [{ kind: "train", title: "t", body: "b", url: "u" }, { kind: "turn", h: 20, title: "t", body: "b", url: "u" }];
  const ctx = {
    Date, Promise,
    ffNotifPlugin: () => ({ getPending: async () => ({ notifications: [] }), cancel: async () => {},
      schedule: async (o) => { scheduled.push(...o.notifications); } }),
    ffNotifOn: () => true, ffReminderHour: () => 7, dayOfPlan: () => 1,
    ffReminderMessage: (o) => (o === 1 ? msgs[1] : o === 2 ? msgs[0] : { skip: true }),
  };
  vm.runInNewContext(`${fn(app, "ffMsgHour")}\nasync ${fn(app, "ffNotifReschedule")}\nthis.run=ffNotifReschedule;`, ctx);
  await ctx.run();
  const turn = scheduled.find((n) => n.extra.kind === "turn"), train = scheduled.find((n) => n.extra.kind === "train");
  assert.equal(turn.schedule.at.getTime(), at(20), "tomorrow's turn nudge at 20:00");
  assert.equal(new Date(train.schedule.at).getHours(), 7, "others at the usual hour");
});

test("open-tab fallback: waits for the day's own hour, still one a day", () => {
  function run(hourNow, msg, lastday = "") {
    const shown = [], store = { ff_notif_lastday: lastday };
    const RealDate = Date;
    const ctx = {
      lsGet: (k, d) => (k === "ff_push_on" ? false : (store[k] ?? d)), lsSet: (k, v) => { store[k] = v; },
      ffWebNotifSupported: () => true, ffNotifOn: () => true, Notification: { permission: "granted" },
      planStart: () => "2026-11-01", ffReminderHour: () => 7, todayStr: () => "Nov 9, 2026",
      ffReminderMessage: () => msg,
      navigator: { serviceWorker: { getRegistration: () => ({ then: (f) => f({ showNotification: (t) => shown.push(t) }) }) } },
      Date: class extends RealDate { getHours() { return hourNow; } },
    };
    vm.runInNewContext(`${fn(app, "ffMsgHour")}\n${fn(app, "ffWebNotifCheck")}\nthis.check=ffWebNotifCheck;`, ctx);
    ctx.check();
    return { shown, store };
  }
  const turn = { kind: "turn", h: 20, title: "Played today? Keep your turn 🌀", body: "b", url: "u" };
  assert.deepEqual(run(15, turn).shown, [], "3 PM: not yet");
  const eve = run(20, turn);
  assert.deepEqual(eve.shown, [turn.title], "8 PM: shown");
  assert.equal(eve.store.ff_notif_lastday, "Nov 9, 2026");
  assert.deepEqual(run(21, turn, "Nov 9, 2026").shown, [], "already nudged today");
  assert.deepEqual(run(9, { kind: "train", title: "T", body: "b", url: "u" }).shown, ["T"], "usual message at the usual hour");
});
