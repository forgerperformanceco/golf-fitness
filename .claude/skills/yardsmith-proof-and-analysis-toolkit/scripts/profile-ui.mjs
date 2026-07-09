/* ============================================================================
   profile-ui.mjs — performance profile of the BUILT app on a seeded heavy
   account (the DESIGN-CHANGES.md §64 pattern that measured 826ms → 97ms).

   What it does:
     1. Serves the repo root (committed build output — rebuild first if you
        changed src/) and launches the preinstalled Chromium, reusing the
        harness library in yardsmith-playwright-harness/scripts/serve.mjs.
     2. Seeds a HEAVY account before load: 19 weeks in, ~72 logged sessions
        (ff_log + ff_history), ~130 body rows, 90 fuel days, 10 speed tests.
     3. Instruments JSON.parse (count + bytes) from time zero, snapshots the
        counters at DOMContentLoaded, then measures a Home → Stats tab switch.

   Output: measurements + boot-health assertions (zero page errors, FF_BUILD
   present, no unreplaced {{V}}). It does NOT hard-fail on absolute ms numbers
   — machine speed varies; compare BEFORE vs AFTER on the same box when you
   optimize, and treat a big JSON.parse count as the real regression signal
   (parse work, unlike wall-clock, is deterministic per code path).
   Soft guards: boot JSON.parse count and tab-switch parse count must stay
   within generous bounds so a storage-cache regression (§64's bug class:
   every render re-parsing multi-hundred-KB blobs) still turns the run red.

   Run:  node .claude/skills/yardsmith-proof-and-analysis-toolkit/scripts/profile-ui.mjs
   Exit 0 = healthy boot + parse counts within bounds.
   ============================================================================ */
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
let harness;
try {
  harness = await import(path.join(HERE, "../../yardsmith-playwright-harness/scripts/serve.mjs"));
} catch (e) {
  console.error("Could not load the harness library (yardsmith-playwright-harness/scripts/serve.mjs).\n" +
    "That skill owns the serve/launch recipe — restore it or inline startServer/resolvePlaywright.\n" + e);
  process.exit(2);
}
const { startServer, resolvePlaywright, resolveChromiumExe } = harness;

/* ---- Heavy-account seed. SELF-CONTAINED (addInitScript serializes only this
   function — see the seed laws in yardsmith-playwright-harness). Shapes mirror
   seeds.mjs / the key catalog in yardsmith-data-and-sync. ---- */
function seedHeavy() {
  var DAY = 86400000;
  function locale(d) {
    try { return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
    catch (e) { return d.toDateString(); }
  }
  function iso(d) {
    var m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (dd < 10 ? "0" : "") + dd;
  }
  var start = new Date(Date.now() - 132 * DAY); start.setHours(0, 0, 0, 0);  // week 19 of 20
  var DAYS = ["Day 1 — Lower (Quads)", "Day 2 — Upper Push", "Day 4 — Lower (Posterior)", "Day 5 — Upper Pull"];
  var LIFTS = [["Leg Press", "4 × 6 (heavy · fast up)", 250], ["Barbell Bench Press", "4 × 5 (heavy · fast up)", 165],
               ["Romanian Deadlift", "3 × 8", 185], ["Pull-up", "4 × 6", 0]];
  var log = {}, history = [];
  for (var w = 1; w <= 18; w++) {
    for (var di = 0; di < 4; di++) {
      var date = new Date(start.getTime() + ((w - 1) * 7 + di) * DAY);
      var L = LIFTS[di], w0 = L[2] + w * 2.5;
      var sets = [], sn = parseInt(L[1], 10) || 3;
      for (var s = 0; s < sn; s++) sets.push({ w: String(w0), r: "6", done: true });
      var sess = { date: locale(date), finishedAt: locale(date), _ts: date.getTime(),
        ex: [{ name: L[0], orig: L[0], target: L[1], sets: sets },
             { name: "Leg Extension", orig: "Leg Extension", target: "3 × 12",
               sets: [{ w: "90", r: "12", done: true }, { w: "90", r: "12", done: true }, { w: "90", r: "12", done: true }] }] };
      log[w + "|" + DAYS[di]] = sess;
      history.push({ id: sess.date + " · " + DAYS[di], ts: sess._ts, date: sess.date,
        day: DAYS[di], week: w, sets: sn + 3, volume: Math.round(w0 * 6 * sn + 90 * 36),
        note: "", ex: sess.ex.map(function (x) { return { name: x.name, target: x.target,
          sets: x.sets.map(function (st) { return { w: st.w, r: st.r }; }) }; }) });
    }
  }
  var body = [];
  for (var d = 0; d < 130; d++) {
    var bd = new Date(start.getTime() + d * DAY);
    var row = { date: locale(bd), iso: iso(bd), ts: bd.getTime(), w: String(183 + d * 0.05) };
    if (d % 14 === 0) { row.s = String(78 + d * 0.03); row.d = String(238 + d * 0.15); }
    body.push(row);
  }
  var fuel = {};
  for (var f = 0; f < 90; f++) {
    var fd = new Date(start.getTime() + f * DAY);
    fuel[iso(fd)] = { m: { 0: "a", 1: "a", 2: "c", 3: "a" }, n: 4, ts: fd.getTime() };
  }
  var speedtest = [];
  for (var t = 0; t < 10; t++) {
    var td = new Date(start.getTime() + t * 13 * DAY);
    var b = 78 + t * 0.4;
    speedtest.push({ ts: td.getTime(), date: locale(td), week: t * 2 + 1, swings: [b - 1, b, b - 0.5], best: b });
  }
  try {
    localStorage.setItem("fairwayfuel", JSON.stringify({
      sex: "male", goal: "leanbulk", workout: "morning", meals: null,
      age: "34", weight: "189", heightFt: "5", heightIn: "11", activity: "1.55", freq: 5,
      equip: { bodyweight: true, dumbbell: true, barbell: true, rack: true,
               bench: true, cable: true, machines: true, band: true },
      view: "dash"
    }));
    localStorage.setItem("ff_onboarded", "true");
    localStorage.setItem("ff_goalyds", "15");
    localStorage.setItem("ff_start", JSON.stringify(start.toISOString()));
    localStorage.setItem("ff_log", JSON.stringify(log));
    localStorage.setItem("ff_history", JSON.stringify(history));
    localStorage.setItem("ff_body", JSON.stringify(body));
    localStorage.setItem("ff_fuel", JSON.stringify(fuel));
    localStorage.setItem("ff_speedtest", JSON.stringify(speedtest));
    localStorage.setItem("ff_mobility", JSON.stringify([{ ts: Date.now() - 20 * DAY, date: "recent", score: 70, tests: { trunk: 1, hip: 2, squat: 1 } }]));
  } catch (e) {}
}

/* ---- JSON.parse instrumentation, injected before any app code runs ---- */
function instrument() {
  var orig = JSON.parse;
  window.__pf = { count: 0, bytes: 0, atDCL: null };
  JSON.parse = function (s) {
    window.__pf.count++;
    if (typeof s === "string") window.__pf.bytes += s.length;
    return orig.apply(JSON, arguments);
  };
  document.addEventListener("DOMContentLoaded", function () {
    window.__pf.atDCL = { count: window.__pf.count, bytes: window.__pf.bytes };
  });
}

const srv = await startServer();
const { chromium } = resolvePlaywright();
const browser = await chromium.launch({ executablePath: resolveChromiumExe(), args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.addInitScript(instrument);
await page.addInitScript(seedHeavy);
await page.goto(srv.url, { waitUntil: "networkidle" });

const boot = await page.evaluate(() => {
  const nav = performance.getEntriesByType("navigation")[0] || {};
  return {
    dcl: Math.round(nav.domContentLoadedEventEnd || 0),
    load: Math.round(nav.loadEventEnd || 0),
    atDCL: window.__pf.atDCL,
    now: { count: window.__pf.count, bytes: window.__pf.bytes },
    build: window.FF_BUILD || null,
    leakedV: document.body.innerHTML.indexOf("{{V}}") !== -1
  };
});

// Tab switch Home → Stats: reset counters, click, wait for the view to render.
await page.evaluate(() => { window.__pf.count = 0; window.__pf.bytes = 0; });
const t0 = Date.now();
await page.click('#mobileTabs button[data-view="progress"]');
await page.waitForSelector("#view-progress.active", { timeout: 5000 });
const tabMs = Date.now() - t0;
const tab = await page.evaluate(() => ({ count: window.__pf.count, bytes: window.__pf.bytes }));

console.log("── profile-ui — seeded heavy account (19 weeks, 72 sessions, 130 body rows, 90 fuel days)");
console.log(`boot: DOMContentLoaded ${boot.dcl}ms · load ${boot.load}ms`);
console.log(`JSON.parse at DCL: ${boot.atDCL ? boot.atDCL.count : "?"} calls / ${boot.atDCL ? (boot.atDCL.bytes / 1024).toFixed(0) : "?"}KB` +
  ` · by networkidle: ${boot.now.count} calls / ${(boot.now.bytes / 1024).toFixed(0)}KB`);
console.log(`tab → Stats: ${tabMs}ms · ${tab.count} parses / ${(tab.bytes / 1024).toFixed(0)}KB re-parsed`);
console.log(`FF_BUILD: ${boot.build}`);

let fails = 0;
function assert(label, ok, detail) { if (!ok) { fails++; console.log(`FAIL ${label}${detail ? " — " + detail : ""}`); } }
assert("zero page errors", errors.length === 0, errors.join(" | "));
assert("FF_BUILD is a 10-char hash", /^[0-9a-f]{10}$/.test(boot.build || ""));
assert("no unreplaced {{V}}", !boot.leakedV);
// §64 regression guards (memoized lsGet): pre-fix boot was 266 parses / ~0.4MB
// re-parsed and Stats re-parsed 90 blobs per visit; post-fix 23 and 2. Bounds
// are ~3× the healthy numbers — loose enough for drift, tight enough that a
// return of parse-per-render turns red.
assert("boot parse count sane (<75)", boot.atDCL && boot.atDCL.count < 75,
  "got " + (boot.atDCL && boot.atDCL.count));
assert("tab-switch parse count sane (<30)", tab.count < 30, "got " + tab.count);

await browser.close(); await srv.close();
console.log(fails ? `\n${fails} FAILED` : "\nall assertions green");
process.exit(fails ? 1 : 0);
