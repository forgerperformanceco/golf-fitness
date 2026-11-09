import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

// Played 18 on a rest day and haven't stretched (Nov 2026): today's ONE reminder
// becomes the keep-your-turn routine at 7 PM. Every sender honours the day's own
// hour inside the 7 AM–8 PM promise, a quiet day no longer uses up the day, and no
// path can send two in a day (independent pre-PR review findings covered below).
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
  missed = null, mode = "essential", speedDue = false } = {}) {
  const store = { ff_reminder_mode: mode, ff_body: speedDue ? [{ s: 80 }] : [], ff_weekly_reviews: {} };
  const ctx = {
    Date, dayOfPlan: () => 1, stripDays: () => [day, { type: "lift", name: "Day 2 — Upper (Push)" }],
    curWeek: () => 3, missedWorkout: () => missed, getSession: () => null,
    sessionFinished: (s) => !!(s && s.finishedAt), speedTestDue: () => speedDue, ffAccessAt: () => "full",
    lsGet: (k, d) => store[k] ?? d, roundToday: () => round, restDone: () => stretched,
    dayKey: (d) => (d.type === "rest" ? "rest@0" : d.name),
  };
  vm.runInNewContext(`var FF_EVENING_HOUR=19;\n` +
    ["ffLocalISO", "ffWeekKeyFor", "ffReminderMode", "ffReminderMessage"].map((n) => fn(app, n)).join("\n"), ctx);
  return ctx.ffReminderMessage;
}

test("a played rest day: today's one reminder is the 7 PM turn routine — or the normal day once stretched", () => {
  const m = reminder()(0);
  assert.equal(m.kind, "turn");
  assert.equal(m.h, 19);
  assert.match(m.title, /Played today\? Keep your turn/);
  assert.match(m.url, /^\.\/\?go=plan&src=push&kind=turn$/);
  assert.equal(reminder({ stretched: true })(0).skip, true, "stretched: quiet");
  // The round outranks a missed-workout catch-up (Home does the same, #120).
  assert.equal(reminder({ missed: { name: "Day 1 — Lower (Quads)" } })(0).kind, "turn");
  assert.equal(reminder({ missed: { name: "Day 1 — Lower (Quads)" }, stretched: true })(0).skip, true, "stretched: still no catch-up today");
  // Daily mode too (it would otherwise send the recovery note at the usual hour).
  assert.equal(reminder({ mode: "daily" })(0).kind, "turn");
  // Stretched: the normal rest-day path runs again, so a due speed test still goes out (review #4).
  assert.equal(reminder({ stretched: true, speedDue: true })(0).kind, "speed");
  assert.equal(reminder({ stretched: true, mode: "daily" })(0).kind, "recovery");
});

test("everything else is unchanged: no round, lift days, and future days", () => {
  assert.equal(reminder({ round: null })(0).skip, true, "a quiet rest day stays quiet (essential)");
  const lift = reminder({ day: { type: "lift", name: "Day 1 — Lower (Quads)" } })(0);
  assert.equal(lift.kind, "train", "a lift day with a round still offers the lift");
  assert.equal(lift.h, undefined);
  assert.equal(reminder({ missed: { name: "Day 1 — Lower (Quads)" }, round: null })(0).kind, "catchup");
  assert.notEqual(reminder()(1).kind, "turn", "only today");
});

test("the day's own hour: 7–19 only, else the usual hour (client and server agree)", () => {
  const c = {};
  vm.runInNewContext(fn(app, "ffMsgHour"), c);
  const ts = transformSync(fn(sender, "sendHour"), { loader: "ts" }).code;
  vm.runInNewContext(ts, c);
  for (const [h, want] of [[19, 19], [7, 7], [20, 17], [6, 17], [21, 17], [18.5, 17], ["19", 17], [undefined, 17], [null, 17]]) {
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

function nativeRun({ nowHour, msgs, rec = null, rejects = false, on = true }) {
  const scheduled = [], store = { ff_notif_today: rec };
  const RealDate = Date;
  const fixed = new RealDate(); fixed.setHours(nowHour, 30, 0, 0);
  class FixedDate extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed.getTime()])); } static now() { return fixed.getTime(); } }
  const ctx = {
    Date: FixedDate, Promise, JSON,
    ffNotifPlugin: () => ({ getPending: async () => ({ notifications: [] }), cancel: async () => {},
      schedule: async (o) => { if (rejects) throw new Error("denied"); scheduled.push(...o.notifications); } }),
    ffNotifOn: () => on, ffReminderHour: () => 7, dayOfPlan: () => 1,
    ffReminderMessage: (o) => msgs[o] || { skip: true },
    lsGet: (k, d) => (store[k] ?? d), lsSet: (k, v) => { store[k] = v; }, lsRemove: (k) => { delete store[k]; },
  };
  vm.runInNewContext(`${fn(app, "ffLocalISO")}\n${fn(app, "ffMsgHour")}\nasync ${fn(app, "ffNotifReschedule")}\nthis.run=ffNotifReschedule;`, ctx);
  return { ctx, scheduled, store, fixed };
}
const TURN = { kind: "turn", h: 19, title: "Played today? Keep your turn 🌀", body: "b", url: "u" };
const TRAIN = { kind: "train", title: "t", body: "b", url: "u" };

test("native app: each day at its own hour, and never a second notification on a day already delivered", async () => {
  // 2 PM, nothing delivered yet today: tonight's turn nudge at 19:00, tomorrow's lift at 07:00.
  let r = nativeRun({ nowHour: 14, msgs: { 0: TURN, 1: TRAIN } });
  await r.ctx.run();
  const turn = r.scheduled.find((n) => n.extra.kind === "turn"), train = r.scheduled.find((n) => n.extra.kind === "train");
  assert.equal(new Date(turn.schedule.at).getHours(), 19);
  assert.equal(new Date(train.schedule.at).getHours(), 7);
  assert.equal(r.store.ff_notif_today.at, turn.schedule.at.getTime(), "today's due time remembered");
  // Review #1: today's 07:00 catch-up already went out; a round logged at 6:30 PM must NOT add a 7 PM one.
  const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const morning = new Date(); morning.setHours(7, 0, 0, 0);
  r = nativeRun({ nowHour: 18, msgs: { 0: TURN, 1: TRAIN }, rec: { d: iso(morning), at: morning.getTime() } });
  await r.ctx.run();
  assert.equal(r.scheduled.filter((n) => n.extra.kind === "turn").length, 0, "today already had its one");
  assert.equal(r.scheduled.filter((n) => n.extra.kind === "train").length, 1, "tomorrow still scheduled");
  assert.equal(r.store.ff_notif_today.at, morning.getTime(), "record kept");
  // A pending one that gets cancelled (stretched before it fired) clears the record — the day isn't spent.
  const tonight = new Date(); tonight.setHours(19, 0, 0, 0);
  r = nativeRun({ nowHour: 15, msgs: { 1: TRAIN }, rec: { d: iso(tonight), at: tonight.getTime() } });
  await r.ctx.run();
  assert.equal(r.store.ff_notif_today, undefined);
  // A record from yesterday doesn't block today.
  const yest = new Date(); yest.setDate(yest.getDate() - 1); yest.setHours(7, 0, 0, 0);
  r = nativeRun({ nowHour: 14, msgs: { 0: TURN }, rec: { d: iso(yest), at: yest.getTime() } });
  await r.ctx.run();
  assert.equal(r.scheduled.filter((n) => n.extra.kind === "turn").length, 1);
});

test("native record: written only after a successful schedule; disabling clears a pending one (Codex #121)", async () => {
  const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  // schedule() rejects → nothing was scheduled, so today must not be recorded as due.
  let r = nativeRun({ nowHour: 14, msgs: { 0: TURN }, rejects: true });
  await r.ctx.run();
  assert.ok(r.store.ff_notif_today == null, "failed schedule: no record");
  // Reminders turned off before tonight's pending one → the record goes, so re-enabling later today still works.
  const tonight = new Date(); tonight.setHours(19, 0, 0, 0);
  r = nativeRun({ nowHour: 15, msgs: { 0: TURN }, rec: { d: iso(tonight), at: tonight.getTime() }, on: false });
  await r.ctx.run();
  assert.equal(r.store.ff_notif_today, undefined, "disabled: pending record cleared");
  // …but one that already went out today stays spent through an off/on.
  const morning = new Date(); morning.setHours(7, 0, 0, 0);
  r = nativeRun({ nowHour: 15, msgs: { 0: TURN }, rec: { d: iso(morning), at: morning.getTime() }, on: false });
  await r.ctx.run();
  assert.equal(r.store.ff_notif_today.at, morning.getTime(), "disabled: a delivered one stays recorded");
});

test("device-only reminder bookkeeping never travels in a backup (Codex #121)", () => {
  const c = {};
  vm.runInNewContext(fn(app, "ffBackupSkip"), c);
  for (const k of ["ff_notif_today", "ff_notif_lastday", "ff_push_on", "ff_push_sig", "ff_pro"]) assert.equal(c.ffBackupSkip(k), true, k);
  for (const k of ["ff_log", "ff_rest", "ff_rounds", "ff_gameday"]) assert.equal(c.ffBackupSkip(k), false, k);
});

test("server: the last_sent marker is retried before giving up (Codex #121)", () => {
  assert.match(sender, /for \(let attempt = 0; attempt < 3; attempt\+\+\)/);
  assert.match(sender, /push_mark_failed/);
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
  assert.deepEqual(run(15, TURN).shown, [], "3 PM: not yet");
  const eve = run(19, TURN);
  assert.deepEqual(eve.shown, [TURN.title], "7 PM: shown");
  assert.equal(eve.store.ff_notif_lastday, "Nov 9, 2026");
  assert.deepEqual(run(19, TURN, "Nov 9, 2026").shown, [], "already nudged today");
  // Review #2: past 8 PM nothing fires, even with no send yet today (any kind).
  assert.deepEqual(run(21, TURN).shown, [], "9 PM: never a late-night ping");
  assert.deepEqual(run(20, TURN).shown, [], "8 PM hour: past the promise");
  assert.deepEqual(run(22, TRAIN).shown, [], "applies to the usual message too");
  assert.deepEqual(run(9, { kind: "train", title: "T", body: "b", url: "u" }).shown, ["T"], "usual message at the usual hour");
});

test("settings 'Next reminder' shows the day's own hour and a clean title (review #3)", () => {
  const RealDate = Date, fixed = new RealDate(); fixed.setHours(15, 0, 0, 0);
  class FixedDate extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed.getTime()])); } static now() { return fixed.getTime(); } }
  const ctx = { Date: FixedDate, ffReminderHour: () => 7, ffReminderMessage: (o) => (o === 0 ? TURN : { skip: true }) };
  vm.runInNewContext(`${fn(app, "ffMsgHour")}\n${fn(app, "fmtMin")}\n${fn(app, "ffNextReminderText")}\nthis.next=ffNextReminderText;`, ctx);
  const t = ctx.next();
  assert.match(t, /^Today · 7:00 PM · Played today\? Keep your turn$/);
  assert.ok(!/[\uD800-\uDFFF]/.test(t), "no broken half-emoji");
});
