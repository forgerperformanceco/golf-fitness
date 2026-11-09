import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync, readdirSync } from "node:fs";

// Closed-app reminders never reached the server from Jul to Nov 2026: the client
// saves with an upsert (ON CONFLICT (endpoint) DO UPDATE SET endpoint = ..., ...)
// and the column grants left `endpoint` out of UPDATE, so Postgres refused every
// save with 42501 and the app quietly fell back to open-tab reminders. These cases
// pin the grant to what the client sends, and the self-heal that reconnects a
// browser whose reminders are on but whose subscription never landed.
const app = readFileSync(new URL("../src/js/app/080-game-day-round-day-fueling-warm-up-plan.js", import.meta.url), "utf8");
const sync = readFileSync(new URL("../cloud-sync.js", import.meta.url), "utf8");
const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
const migDir = new URL("../supabase/migrations/", import.meta.url);
const migrations = readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort()
  .map((f) => readFileSync(new URL(f, migDir), "utf8"));

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

// Columns `authenticated` may UPDATE on push_subs, replaying grants/revokes in order.
function updateCols(sqlTexts) {
  let cols = new Set();
  for (const sql of sqlTexts) {
    const re = /(revoke all on table public\.push_subs from[^;]*authenticated[^;]*;)|grant update \(([^)]*)\) on table public\.push_subs to authenticated;/gi;
    for (let m; (m = re.exec(sql));) {
      if (m[1]) cols = new Set();
      else m[2].split(",").map((c) => c.trim()).forEach((c) => cols.add(c));
    }
  }
  return cols;
}

// The columns the client actually upserts: user_id (cloud-sync) + the row literal.
function upsertCols() {
  const rowSrc = fn(app, "ffPushSubscribe").match(/var row=\{([\s\S]*?)\};/)[1];
  const keys = [...rowSrc.matchAll(/(\w+):/g)].map((m) => m[1]);
  assert.match(sync, /Object\.assign\(\{ user_id: user\.id \}, row\)/);
  assert.match(sync, /upsert\(rec, \{ onConflict: "endpoint" \}\)/);
  return ["user_id", ...keys];
}

test("the upsert's every column is UPDATE-granted (the Jul–Nov 2026 42501), in the live migrations and the schema of record", () => {
  const sent = upsertCols();
  assert.deepEqual(sent.slice().sort(), ["auth", "endpoint", "hour", "p256dh", "tz", "user_id", "week"]);
  for (const [label, cols] of [["migrations", updateCols(migrations)], ["schema.sql", updateCols([schema])]]) {
    for (const c of sent) assert.ok(cols.has(c), `${label}: authenticated must be able to UPDATE ${c}`);
    assert.ok(!cols.has("last_sent"), `${label}: last_sent stays server-only`);
    assert.ok(!cols.has("created_at"), `${label}: created_at stays server-only`);
  }
  // The broken state really was broken: without the Nov migration, endpoint is missing.
  const before = updateCols(migrations.filter((m) => !/grant update \(endpoint\) on table public\.push_subs/.test(m)));
  assert.ok(!before.has("endpoint"));
});

function resync({ capable = true, perm = "granted", pushOn = false, notifOn = true } = {}) {
  const calls = [];
  const store = { ff_push_on: pushOn };
  const ctx = {
    Notification: { permission: perm },
    lsGet: (k, d) => (k in store ? store[k] : d),
    ffPushCapable: () => ctx.__capable,
    ffNotifOn: () => notifOn,
    ffPushSubscribe: (force) => { calls.push(!!force); return Promise.resolve(true); },
    Promise, __capable: capable,
  };
  vm.runInNewContext("var ffPushHealTried=false;\n" + fn(app, "ffPushResync"), ctx);
  return { run: () => ctx.ffPushResync(), calls, ctx, store };
}

test("reminders on but never registered: one forced save per app load, then quiet", async () => {
  const r = resync();
  await r.run(); await r.run(); await r.run();
  assert.deepEqual(r.calls, [true]);
});

test("already registered: the routine resync keeps refreshing the schedule (unforced)", async () => {
  const r = resync({ pushOn: true });
  await r.run(); await r.run();
  assert.deepEqual(r.calls, [false, false]);
});

test("no heal attempt when reminders are off, permission isn't granted, or push isn't possible yet", async () => {
  for (const o of [{ notifOn: false }, { perm: "default" }, { perm: "denied" }, { capable: false }]) {
    const r = resync(o);
    await r.run();
    assert.deepEqual(r.calls, [], JSON.stringify(o));
  }
});

test("signed in later in the same load: the heal isn't spent while push was impossible", async () => {
  const r = resync({ capable: false });
  await r.run();                       // boot, before auth: FF.user not set yet
  r.ctx.__capable = true;              // ff-auth fires
  await r.run();
  assert.deepEqual(r.calls, [true]);
});

test("handover: if this browser already showed today's nudge, the server copy of today is a skip", () => {
  const ctx = {
    lsGet: (k, d) => (k === "ff_notif_lastday" ? ctx.__last : d), todayStr: () => "Nov 9, 2026", __last: "",
    ffReminderMessage: (o) => ({ d: "2026-11-" + String(9 + o).padStart(2, "0"), kind: "lift", title: "Day " + o, h: 7 }),
  };
  vm.runInNewContext(fn(app, "ffPushWeek"), ctx);
  assert.equal(ctx.ffPushWeek()[0].skip, undefined);
  ctx.__last = "Nov 9, 2026";
  const w = ctx.ffPushWeek();
  assert.deepEqual(JSON.parse(JSON.stringify(w[0])), { d: "2026-11-09", skip: true, kind: "none" });
  assert.equal(w[1].title, "Day 1");     // tomorrow onward untouched
  assert.equal(w.length, 7);
});

test("the reminders card is honest when reminders are on but closed-app delivery isn't connected", () => {
  assert.match(app, /nonW \? 'Closed-app delivery isn’t connected yet\. Yardsmith retries each time you open it/);
});
