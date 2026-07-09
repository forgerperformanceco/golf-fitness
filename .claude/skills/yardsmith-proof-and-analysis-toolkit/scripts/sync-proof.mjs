#!/usr/bin/env node
/* ============================================================================
   sync-proof.mjs — vm-sandbox proof of Yardsmith's sync semantics
   (the test-sync.mjs pattern, DESIGN-CHANGES.md §61).

   Runs the REAL repo-root cloud-sync.js inside a node:vm context whose
   globals are mocks — a Map-backed localStorage, an EventTarget `window`,
   a stub `document`, and a scripted `window.supabase.createClient` mock
   with a real in-memory `profiles` row + rev counter. No browser, no
   network, no Supabase project. Proves the four behaviors that gate any
   cloud-sync.js merge (evidence bar → yardsmith-validation-and-qa §7):

     S1  Login merge: additive keys union (both devices' entries survive),
         settings take the cloud value, merged blob is pushed, exactly one
         guarded reload.
     S2  Concurrent push: CAS conflict → pull, merge, retry — the final
         cloud blob holds BOTH devices' new entries + the other device's
         settings change; rev advances by exactly 2; zero blind upserts.
     S3  Tombstones: a deleted session/history entry stays deleted through
         the merge; a re-log with a NEWER timestamp beats the tombstone and
         the outlived tombstone is pruned.
     S4  No-rev schema: PostgREST "column rev does not exist" → legacy
         upsert fallback, and the union merge still runs.

   No dependencies beyond Node ≥ 18 (EventTarget/CustomEvent globals) and
   the repo. Exit 0 = all green.
   Run:  node .claude/skills/yardsmith-proof-and-analysis-toolkit/scripts/sync-proof.mjs
   ============================================================================ */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const SYNC_SRC = fs.readFileSync(path.join(ROOT, "cloud-sync.js"), "utf8");

let pass = 0, fail = 0;
function check(label, ok, detail) {
  ok ? pass++ : fail++;
  if (!ok) console.log(`  FAIL ${label}${detail ? " — " + detail : ""}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 2000) {          // poll an async condition
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(20); }
  return fn();
}

/* ---- Web-storage stub (getItem/setItem/removeItem/key/length) ---------- */
function makeStorage(seed) {
  const m = new Map(Object.entries(seed || {}));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    _dump: () => Object.fromEntries(m)
  };
}

/* ---- Mock Supabase: an in-memory profiles row + PostgREST-ish builder --- */
function makeCloud(opts = {}) {
  const cloud = {
    row: opts.row || null,            // { data: {...}, rev: n } or null
    upserts: 0,                       // blind (non-CAS) profile writes
    casMisses: 0,                     // guarded updates that matched zero rows
    noRev: !!opts.noRev,              // simulate a schema without the rev column
    authCb: null
  };
  function exec(q) {
    if (q.table !== "profiles") return { data: null, error: null };
    if (q.op === "select") {
      if (cloud.noRev && /(^|,|\s)rev(,|\s|$)/.test(q.cols || ""))
        return { data: null, error: { message: "column profiles.rev does not exist" } };
      if (!cloud.row) return { data: q.single ? null : [], error: null };
      const out = {};
      (q.cols || "").split(",").forEach((c) => { c = c.trim(); if (c) out[c] = cloud.row[c]; });
      return { data: q.single ? out : [out], error: null };
    }
    if (q.op === "update") {
      if (cloud.noRev) return { data: null, error: { message: "column profiles.rev does not exist" } };
      const revOk = !("rev" in q.filters) || (cloud.row && cloud.row.rev === q.filters.rev);
      if (cloud.row && revOk) {
        Object.assign(cloud.row, q.vals);
        return { data: [{ rev: cloud.row.rev }], error: null };
      }
      cloud.casMisses++;
      return { data: [], error: null };          // CAS miss: zero rows
    }
    if (q.op === "insert") {
      if (cloud.noRev && q.vals && "rev" in q.vals)
        return { data: null, error: { message: "column profiles.rev does not exist" } };
      if (cloud.row) return { data: null, error: { message: "duplicate key value" } };
      cloud.row = Object.assign({}, q.vals);
      return { data: [{ rev: cloud.row.rev }], error: null };
    }
    if (q.op === "upsert") {
      cloud.upserts++;
      cloud.row = Object.assign(cloud.row || {}, q.vals);
      return { data: null, error: null };
    }
    return { data: null, error: null };
  }
  function from(table) {
    const q = { table, op: null, vals: null, cols: null, filters: {}, single: false };
    const api = {
      select(cols) { if (!q.op) { q.op = "select"; q.cols = cols; } return api; },
      update(vals) { q.op = "update"; q.vals = vals; return api; },
      insert(vals) { q.op = "insert"; q.vals = vals; return api; },
      upsert(vals) { q.op = "upsert"; q.vals = vals; return api; },
      delete() { q.op = "delete"; return api; },
      eq(col, val) { q.filters[col] = val; return api; },
      not() { return api; }, order() { return api; }, limit() { return api; },
      maybeSingle() { q.single = true; return Promise.resolve(exec(q)); },
      then(res, rej) { return Promise.resolve(exec(q)).then(res, rej); }
    };
    return api;
  }
  cloud.client = {
    from,
    auth: {
      onAuthStateChange(cb) { cloud.authCb = cb; return { data: { subscription: { unsubscribe() {} } } }; },
      getSession: async () => ({ data: { session: { access_token: "test-token" } } }),
      signOut: async () => {},
      signInWithOtp: async () => ({ error: null }),
      verifyOtp: async () => ({ error: null })
    }
  };
  return cloud;
}

/* ---- Boot the real cloud-sync.js in a vm with the mocks ----------------- */
async function bootClient(localSeed, cloud) {
  const ls = makeStorage(Object.assign(
    { "sb-test-auth-token": "x" },     // hasSession() → ensureSb() runs at boot
    localSeed
  ));
  const ss = makeStorage();
  const reloads = { count: 0 };
  const noopEl = () => ({
    setAttribute() {}, addEventListener() {}, appendChild() {}, remove() {},
    querySelector: () => noopEl(), style: {}, focus() {},
    set innerHTML(v) {}, get innerHTML() { return ""; }
  });
  const win = new EventTarget();
  win.FF_ACCOUNT_TAB = true;           // skip the floating sign-in pill
  win.supabase = { createClient: () => cloud.client };  // loadSdk() short-circuits
  const sandbox = {
    window: win,
    document: {
      readyState: "complete", visibilityState: "visible",
      addEventListener() {}, head: { appendChild() {} }, body: { appendChild() {} },
      createElement: noopEl
    },
    localStorage: ls, sessionStorage: ss,
    location: { hash: "", search: "", href: "http://localhost/",
      reload() { reloads.count++; } },
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
    Event, CustomEvent, console,
    confirm: () => true, alert() {}, fetch: async () => ({ ok: false, json: async () => ({}) })
  };
  vm.createContext(sandbox);
  vm.runInContext(SYNC_SRC, sandbox, { filename: "cloud-sync.js" });
  await until(() => cloud.authCb, 1000);
  if (!cloud.authCb) throw new Error("onAuthStateChange never registered — mock wiring broke");
  const handle = {
    ls, ss, win, reloads,
    signIn: async () => {
      cloud.authCb("SIGNED_IN", { user: { id: "user-1" } });
      // syncOnLogin is fire-and-forget; wait for a sync outcome to land
      await until(() => ls.getItem("ff_sync_status"), 3000);
      await sleep(50);
    },
    setLocal: (k, v) => { ls.setItem(k, JSON.stringify(v)); },
    getLocal: (k) => JSON.parse(ls.getItem(k) || "null"),
    flush: async () => {                // pagehide → immediate push() (no debounce)
      win.dispatchEvent(new Event("pagehide"));
      await sleep(50);
    }
  };
  return handle;
}

/* ========================= S1 — login union merge ========================= */
async function s1() {
  console.log("S1. login merge: additive union + settings cloud-wins + one guarded reload");
  const cloud = makeCloud({ row: { rev: 1, data: {
    fairwayfuel: { goal: "cut", freq: 4 },
    ff_rounds: [{ ts: 100, date: "2026-07-01", score: 88 }],
    ff_speedtest: [{ ts: 200, best: 78 }]
  } } });
  const c = await bootClient({
    fairwayfuel: JSON.stringify({ goal: "bulk", freq: 5 }),
    ff_rounds: JSON.stringify([{ ts: 300, date: "2026-07-05", score: 84 }]),
    ff_mobility: JSON.stringify([{ ts: 400, score: 70 }])
  }, cloud);
  await c.signIn();
  await until(() => cloud.row && cloud.row.rev >= 2, 2000);

  const rounds = c.getLocal("ff_rounds") || [];
  check("both devices' rounds survive locally", rounds.length === 2,
    JSON.stringify(rounds));
  check("settings take the cloud value", (c.getLocal("fairwayfuel") || {}).goal === "cut");
  check("cloud-only series pulled down", (c.getLocal("ff_speedtest") || []).length === 1);
  const cRounds = (cloud.row.data.ff_rounds || []).length;
  check("merged blob pushed to cloud (rounds=2)", cRounds === 2, "cloud rounds=" + cRounds);
  check("local-only series pushed up", (cloud.row.data.ff_mobility || []).length === 1);
  check("rev advanced via CAS (1→2)", cloud.row.rev === 2, "rev=" + cloud.row.rev);
  check("zero blind upserts", cloud.upserts === 0, "upserts=" + cloud.upserts);
  check("exactly one reload", c.reloads.count === 1, "reloads=" + c.reloads.count);
  check("reload guard set", c.ss.getItem("ff_synced_once") === "1");
}

/* ================== S2 — concurrent push: CAS pull/merge/retry =========== */
async function s2() {
  console.log("S2. concurrent push: CAS conflict → pull, merge, retry");
  const cloud = makeCloud({ row: { rev: 1, data: {
    fairwayfuel: { goal: "cut" },
    ff_rounds: [{ ts: 100, note: "B" }]
  } } });
  const c = await bootClient({
    fairwayfuel: JSON.stringify({ goal: "cut" }),
    ff_rounds: JSON.stringify([{ ts: 200, note: "A" }])
  }, cloud);
  await c.signIn();                                    // merge lands A+B, rev 1→2
  await until(() => cloud.row.rev === 2, 2000);
  const revAfterLogin = cloud.row.rev;

  // "Device 2" moves the cloud first: new round C + a settings change, rev → 3.
  const other = JSON.parse(JSON.stringify(cloud.row.data));
  other.ff_rounds = (other.ff_rounds || []).concat([{ ts: 500, note: "C" }]);
  other.fairwayfuel = { goal: "maintain" };
  cloud.row = { rev: 3, data: other };

  // This device logs round D and flushes: UPDATE…WHERE rev=2 hits zero rows →
  // pull rev 3, mergeBlob, retry → lands at rev 4.
  const mine = c.getLocal("ff_rounds") || [];
  c.setLocal("ff_rounds", mine.concat([{ ts: 600, note: "D" }]));
  await c.flush();
  await until(() => cloud.row.rev === 4, 3000);

  const notes = (cloud.row.data.ff_rounds || []).map((r) => r.note).sort().join("");
  check("final cloud holds A+B+C+D", notes === "ABCD", "got " + notes);
  check("other device's settings change kept",
    (cloud.row.data.fairwayfuel || {}).goal === "maintain");
  check("rev advanced by exactly 2 (login→conflict retry)",
    revAfterLogin === 2 && cloud.row.rev === 4, "rev=" + cloud.row.rev);
  check("the CAS guard actually fired", cloud.casMisses >= 1, "casMisses=" + cloud.casMisses);
  check("zero blind upserts", cloud.upserts === 0, "upserts=" + cloud.upserts);
  check("local adopted the merge", (c.getLocal("ff_rounds") || []).length === 4);
}

/* ===================== S3 — tombstones hold; newer re-log wins ============ */
async function s3() {
  console.log("S3. tombstones: deletions hold; a newer re-log beats the tombstone");
  const SK = "3|Day 1 — Lower (Quads)", RK = "5|Day 2 — Upper Push";
  const cloud = makeCloud({ row: { rev: 1, data: {
    ff_log: {
      [SK]: { _ts: 1000, date: "Jul 1", ex: [{ name: "Leg Press", sets: [{ w: 200, r: 6, done: true }] }] },
      [RK]: { _ts: 5000, date: "Jul 3", ex: [{ name: "Bench", sets: [{ w: 150, r: 5, done: true }] }] }
    },
    ff_history: [{ id: "Jul 1 · Day 1", ts: 1000, sets: 3 }]
  } } });
  // This device deleted SK at ts 2000 (after cloud's 1000 → holds) and RK at
  // ts 4000 (before cloud's 5000 re-log → re-log wins, tombstone pruned).
  const c = await bootClient({
    ff_deleted: JSON.stringify({ ["L:" + SK]: 2000, ["L:" + RK]: 4000, "H:Jul 1 · Day 1": 2000 })
  }, cloud);
  await c.signIn();
  await until(() => cloud.row.rev >= 2, 2000);

  const log = c.getLocal("ff_log") || {};
  check("deleted session stays deleted locally", !(SK in log), Object.keys(log).join(","));
  check("deleted session stays deleted in cloud", !((cloud.row.data.ff_log || {})[SK]));
  check("newer re-log beats older tombstone", RK in log);
  check("history tombstone applied", (c.getLocal("ff_history") || []).length === 0);
  const del = c.getLocal("ff_deleted") || {};
  check("held tombstone kept", del["L:" + SK] === 2000);
  check("outlived tombstone pruned", !("L:" + RK in del), JSON.stringify(del));
}

/* ================= S4 — no-rev schema: legacy upsert still unions ========= */
async function s4() {
  console.log("S4. no-rev schema: falls back to legacy upsert, union still runs");
  const cloud = makeCloud({ noRev: true, row: { rev: undefined, data: {
    ff_rounds: [{ ts: 100, note: "B" }]
  } } });
  const c = await bootClient({
    ff_rounds: JSON.stringify([{ ts: 200, note: "A" }])
  }, cloud);
  await c.signIn();
  await until(() => cloud.upserts > 0, 2000);

  check("fell back to blind upsert", cloud.upserts >= 1, "upserts=" + cloud.upserts);
  const notes = (cloud.row.data.ff_rounds || []).map((r) => r.note).sort().join("");
  check("union still merged both sides", notes === "AB", "got " + notes);
  check("local merged too", (c.getLocal("ff_rounds") || []).length === 2);
}

await s1(); await s2(); await s3(); await s4();
console.log(`\n${pass}/${pass + fail} checks green` + (fail ? ` — ${fail} FAILED` : ""));
process.exit(fail ? 1 : 0);
