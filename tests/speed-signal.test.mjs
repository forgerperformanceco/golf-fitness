import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// Progress signals (Oct 2026 audit, cluster G): one 7-iron series for every
// trend (060 ffSpeedRows — a rough guess never anchors, the first guided test
// does, dates from iso, one 30–130 mph range), one noise rule (ffSpeedSignal),
// a goal-aware power-to-weight pillar, Octane scoped to this season, an honest
// six-week forecast, and insights that read iso dates. Real source, extracted
// by name and run in node:vm.
const src = (f) => readFileSync(new URL(`../src/js/app/${f}`, import.meta.url), "utf8");
const SPEED = src("060-speed-test-day-the-biweekly-testing-ritu.js");
const PLAYER = src("070-workout-player-full-screen-guided-sessio.js");
const HOME = src("075-proactive-coaching-your-focus-insights.js");
const BRAIN = src("076-brain-intelligence.js");
const MACRO = src("024-macro-model.js");
const CALC = src("025-macro-calculator.js");
const STATS = src("085-progress-stats-view.js");
const ONBOARD = src("090-first-run-onboarding.js");

function balanced(source, from, open) {
  let depth = 0;
  const close = { "{": "}", "[": "]" }[open];
  for (let j = source.indexOf(open, from); j < source.length; j++) {
    const c = source[j];
    if (c === "/" && source[j + 1] === "/") { j = source.indexOf("\n", j); if (j < 0) break; continue; }
    if (c === "/" && source[j + 1] === "*") { j = source.indexOf("*/", j + 2) + 1; continue; }
    if (c === '"' || c === "'") { const q = c; j++; while (j < source.length && source[j] !== q) { if (source[j] === "\\") j++; j++; } continue; }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return j + 1;
  }
  throw new Error("unbalanced from " + from);
}
function fn(source, name) {
  const m = new RegExp("(^|\\n)[ \\t]*function " + name + "\\s*\\(").exec(source);
  assert.ok(m, `${name} should exist`);
  const start = m.index + (m[1] ? 1 : 0);
  return source.slice(start, balanced(source, start, "{"));
}
function decl(source, name) {
  let start = source.indexOf(`var ${name} = `);
  if (start < 0) start = source.indexOf(`var ${name}=`);
  assert.ok(start >= 0, `var ${name} should exist`);
  return source.slice(start, balanced(source, start, "{")) + ";";
}
function line(source, re) { const m = re.exec(source); assert.ok(m, String(re)); return m[0]; }

const SPEED_FNS = ["speedTests", "lastSpeedTest", "stDayStart", "daysSinceTest", "speedInRange", "ffFirstTestDay", "ffSpeedRows",
  "ffSeasonFrom", "ffSeasonSpeedRows", "ffSpeedNoise", "ffSpeedSignal", "ffSpeedJump"];
const VARS = () => [line(SPEED, /var SPEED_MIN=\d+, SPEED_MAX=\d+;/), line(SPEED, /var SPEED_NOISE=[\d.]+, SPEED_MDC=[\d.]+;/)];

// A world: 060's series + 070's Octane / p2w / logBodyEntry + 075's insights,
// over a plain-object store. todayStr() is French on purpose (locale text).
function world({ store = {}, goal = "leanbulk", heightIn = 70, extra = "" } = {}) {
  const code = [
    ...VARS(), line(MACRO, /var FF_TREND_MIN_N=\d+, FF_TREND_MIN_DAYS=\d+;/),
    ...SPEED_FNS.map((n) => fn(SPEED, n)), fn(SPEED, "saveSpeedTest"),
    decl(CALC, "GOALS"),
    ...["ffReferenceLb", "ffWeeklyLb", "ffTrendFit", "ffCheckin"].map((n) => fn(MACRO, n)),
    ...["clamp", "ffP2wRead", "ffScore", "ffScoreSummary", "logBodyEntry"].map((n) => fn(PLAYER, n)),
    decl(PLAYER, "FF_LEVER"), fn(HOME, "ffInsights"),
  ].join("\n");
  const ctx = { __store: store };
  vm.runInNewContext(`
    var state={goal:${JSON.stringify(goal)}}, planState={freq:4}, stState=null;
    function lsGet(k,d){ var v=__store[k]; return v==null?d:JSON.parse(JSON.stringify(v)); }
    function lsSet(k,v){ __store[k]=JSON.parse(JSON.stringify(v)); }
    function planStart(){ return lsGet("ff_start", null); }
    function curWeek(){ return 1; }
    function num(id){ return id==="heightFt"?Math.floor(${heightIn}/12):(id==="heightIn"?${heightIn}%12:0); }
    function ffISO(d){ d=d||new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
    function todayStr(){ return new Date().toLocaleDateString("fr-FR",{month:"short",day:"numeric",year:"numeric"}); }
    function sessionsByWeek(){ return []; } function strengthGain(){ return null; }
    function speedTestDue(){ return false; } function weightTrend(){ return null; } function bigLiftStats(){ return []; }
    function waveFor(){ return "accumulate"; } function ffEsc(s){ return String(s); }
    var sessionStorage={ removeItem:function(){} };
    function $(){ return null; } function stBest(){ return stState && stState.__best; } function stBestHtml(){ return ""; }
    function renderSpeedTest(){}
    ${extra}
    ${code}
  `, ctx);
  return ctx;
}

const DAY = 864e5, NOW = Date.now();
function dayStart(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
function iso(t) { const d = new Date(t); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
// ff_body rows: [daysAgo, {fields}] → stored shape (locale `date` text included).
function body(rows, locale = "fr-FR") {
  return rows.map(([ago, f]) => {
    const t = dayStart(NOW - ago * DAY) + 9 * 3600e3;
    return { date: new Date(t).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" }), iso: iso(t), ts: t, ...f };
  });
}
// Biweekly series ending today, as ffSpeedSignal rows.
function series(vals, gap = 14) { const n = vals.length; return vals.map((s, i) => ({ t: dayStart(NOW - (n - 1 - i) * gap * DAY), s })); }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const r1 = (v) => Math.round(v * 10) / 10;

// ------------------------------------------------------------- range (120)
test("one plausible 7-iron range — 30–130 mph — for the test, the quick log and onboarding", () => {
  const W = world();
  assert.equal(W.SPEED_MIN, 30); assert.equal(W.SPEED_MAX, 130);
  assert.equal(W.speedInRange(29.9), false); assert.equal(W.speedInRange(131), false); assert.equal(W.speedInRange(80), true);
  assert.match(ONBOARD, /!speedInRange\(\+ob\.speed\)/);
  assert.match(ONBOARD, /SPEED_MIN\+" and "\+SPEED_MAX\+" mph/);
  assert.doesNotMatch(ONBOARD, /\+ob\.speed<30/);
  assert.match(STATS, /qlBad\(sv, SPEED_MIN, SPEED_MAX/);
});

test("an in-range number far from the last real one asks once before it is logged", () => {
  const store = { ff_body: body([[14, { s: "80", ss: "t" }]]), ff_speedtest: [{ ts: NOW - 14 * DAY, best: 80 }] };
  const W = world({ store });
  assert.deepEqual({ ...W.ffSpeedJump(95) }, { last: 80, pct: 19 });
  assert.equal(W.ffSpeedJump(84), null);
  W.stState = { __best: 95, swings: ["95", "", ""] };
  W.saveSpeedTest();
  assert.equal(store.ff_body.length, 1, "first tap only warns");
  assert.equal(W.stState.okJump, 95);
  W.saveSpeedTest();
  assert.equal(store.ff_body.length, 2, "second tap saves");
  assert.equal(store.ff_body[1].ss, "t");
  assert.match(STATS, /ffSpeedJump\(sv\)/, "the quick log asks too");
});

// ---------------------------------------------------- baseline anchor (112)
test("a rough onboarding guess never anchors a trend, and a guess alone makes the first test due now", () => {
  const W = world({ store: { ff_body: body([[3, { s: "85", ss: "g", w: "180" }]]) } });
  assert.deepEqual([...W.ffSpeedRows()], []);
  assert.equal(W.daysSinceTest(), null, "a guess is not a test — the first real test is due");
  const M = world({ store: { ff_body: body([[3, { s: "82", ss: "m" }]]) } });
  assert.equal(M.ffSpeedRows().length, 1, "a measured onboarding number counts");
  assert.equal(M.daysSinceTest(), 3);
});

test("once a guided test exists it is the baseline: older untagged numbers stop anchoring, tagged measurements stay", () => {
  // Legacy (pre-tag) onboarding guess 85, then the first guided test 80 and real gains.
  const legacy = body([[70, { s: "85" }], [56, { s: "80" }], [42, { s: "80.6" }], [28, { s: "81.4" }], [14, { s: "82" }], [0, { s: "82.9" }]]);
  const W = world({ store: { ff_body: legacy, ff_speedtest: [{ ts: NOW - 56 * DAY, best: 80 }] } });
  assert.deepEqual([...W.ffSpeedRows().map((r) => r.s)], [80, 80.6, 81.4, 82, 82.9]);
  // Before any guided test, the legacy number is still the (provisional) baseline.
  const before = world({ store: { ff_body: body([[70, { s: "85" }]]) } });
  assert.deepEqual([...before.ffSpeedRows().map((r) => r.s)], [85]);
  // A tagged measurement before the first test stays; a typo outside 30–130 never counts.
  const tagged = world({ store: { ff_body: body([[70, { s: "79", ss: "m" }], [60, { s: "180", ss: "m" }], [56, { s: "80", ss: "t" }]]) } });
  assert.deepEqual([...tagged.ffSpeedRows().map((r) => r.s)], [79, 80]);
});

test("the first guided test after a guess says 'tested baseline' — never a decline or a PR against the guess", () => {
  const store = { ff_body: body([[20, { s: "85", w: "180" }]]) };   // legacy untagged onboarding guess
  const W = world({ store });
  W.stState = { __best: 80, swings: ["78", "80", "79"] };
  W.saveSpeedTest();
  const s = W.stState.saved;
  assert.equal(s.first, true); assert.equal(s.pr, false); assert.equal(s.prevBest, null);
  assert.equal(store.ff_body.at(-1).ss, "t");
  assert.equal(store.ff_speedtest.length, 1);
});

// ------------------------------------------------------------ dates (118)
test("insights read iso dates: a French or Japanese device sees a real PR, not a plateau", () => {
  for (const locale of ["fr-FR", "ja-JP", "de-DE"]) {
    const rows = body([[70, { s: "80", ss: "t" }], [56, { s: "80.6", ss: "t" }], [42, { s: "81.3", ss: "t" }],
      [28, { s: "82", ss: "t" }], [14, { s: "82.6", ss: "t" }], [0, { s: "83.5", ss: "t" }]], locale);
    const W = world({ store: { ff_body: rows, ff_start: new Date(NOW - 75 * DAY).toISOString() } });
    const top = W.ffInsights().filter((i) => i.ask)[0];
    assert.ok(top && /^pr:83\.5$/.test(top.sig), `${locale}: ${top && top.sig}`);
  }
  assert.doesNotMatch(HOME, /new Date\(e\.date\)/);
  assert.doesNotMatch(HOME, /new Date\(se\.s&&se\.s\.date\)/);
});

// ------------------------------------------------------------- noise (114/115)
test("noise: a no-change season rarely produces a verdict or a PR (it used to be a coin flip and 88%)", () => {
  const W = world();
  for (const [sigma, maxEnd, maxPR] of [[1.0, 0.07, 0.12], [1.5, 0.12, 0.3]]) {
    const r = rng(42); let endV = 0, anyPR = 0; const N = 1500;
    for (let k = 0; k < N; k++) {
      const vals = []; let pr = false;
      for (let i = 0; i < 10; i++) {
        vals.push(r1(80 + sigma * gauss(r)));
        if (i && vals[i] > Math.max(...vals.slice(0, -1)) && W.ffSpeedSignal(series(vals)).verdict === "up") pr = true;
      }
      if (W.ffSpeedSignal(series(vals)).verdict !== "steady") endV++;
      if (pr) anyPR++;
    }
    assert.ok(endV / N < maxEnd, `σ=${sigma}: end verdict ${endV / N}`);
    assert.ok(anyPR / N < maxPR, `σ=${sigma}: a PR at some point ${anyPR / N}`);
  }
});

test("noise: a real +4% season is still detected, and a single 2-test change must beat ~2 SE", () => {
  const W = world(), r = rng(7); let up = 0; const N = 1000;
  for (let k = 0; k < N; k++) {
    const vals = []; for (let i = 0; i < 10; i++) vals.push(r1(80 + 3.28 * i / 9 + gauss(r)));
    if (W.ffSpeedSignal(series(vals)).verdict === "up") up++;
  }
  assert.ok(up / N > 0.75, `σ=1, +4.1% over 18 weeks: detected ${up / N}`);
  const clean = W.ffSpeedSignal(series([80, 80.4, 80.7, 81.1, 81.5, 81.8, 82.2, 82.5, 82.9, 83.3]));
  assert.equal(clean.verdict, "up");
  const two = W.ffSpeedSignal(series([80, 82]));
  assert.equal(two.verdict, "steady", "+2 mph between two single tests is inside the noise");
  assert.ok(two.thr >= 3, `thr ${two.thr}`);
});

test("Octane speed pillar: noise barely moves it; a clean +4.1% season still scores ≥19/30", () => {
  const W = world(), r = rng(5), pts = [];
  for (let k = 0; k < 800; k++) {
    const vals = []; for (let i = 0; i < 10; i++) vals.push(r1(80 + 1.5 * gauss(r)));
    const sg = W.ffSpeedSignal(series(vals));
    pts.push(Math.round(W.clamp(15 + sg.eff / sg.base * 220, 0, 30)));
  }
  const m = pts.reduce((a, b) => a + b) / pts.length, sd = Math.sqrt(pts.reduce((a, b) => a + (b - m) ** 2, 0) / pts.length);
  assert.ok(sd <= 2.5, `null SD ${sd} (was ~5.8)`);
  // Through ffScore itself.
  const rows = [80, 80.4, 80.7, 81.1, 81.5, 81.8, 82.2, 82.5, 82.9, 83.3].map((s, i) => [(9 - i) * 14, { s: String(s), ss: "t" }]);
  const S = world({ store: { ff_body: body(rows), ff_start: new Date(NOW - 130 * DAY).toISOString() } });
  const sp = S.ffScore().parts.find((p) => p.key === "speed");
  assert.ok(sp.pts >= 19, `clean +4.1%: ${sp.pts}/30`);
  assert.match(sp.detail, /this season/);
  const flat = world({ store: { ff_body: body([[28, { s: "80", ss: "t" }], [14, { s: "80.9", ss: "t" }], [0, { s: "79.6", ss: "t" }]]) } });
  const fp = flat.ffScore().parts.find((p) => p.key === "speed");
  assert.equal(fp.pts, 15); assert.match(fp.detail, /within test noise/);
});

// -------------------------------------------------------- power-to-weight (111/113)
// 10 weeks into the plan: weekly weigh-ins at `pct` %/wk, biweekly tests.
function p2wWorld({ goal, pct, speeds, weeks = 10, w0 = 180 }) {
  const rows = [];
  for (let d = weeks * 7; d >= 0; d -= 7) rows.push([d, { w: String(r1(w0 * Math.pow(1 + pct / 100, (weeks * 7 - d) / 7))) }]);
  speeds.forEach((s, i) => rows.push([(speeds.length - 1 - i) * 14, { s: String(s), ss: "t" }]));
  rows.sort((a, b) => b[0] - a[0]);
  const merged = {};
  for (const [d, f] of rows) merged[d] = { ...(merged[d] || {}), ...f };
  const store = { ff_body: body(Object.entries(merged).map(([d, f]) => [+d, f]).sort((a, b) => b[0] - a[0])), ff_start: new Date(NOW - weeks * 7 * DAY).toISOString() };
  const W = world({ store, goal });
  const sig = W.ffSpeedSignal(W.ffSeasonSpeedRows());
  return { W, store, p: W.ffP2wRead(sig), part: W.ffScore().parts.find((x) => x.key === "p2w") };
}

test("p2w: a Lean Bulk gaining at the plan's pace with steady speed is on track (5/10, not 0) and never told to cut", () => {
  const { p, part, W } = p2wWorld({ goal: "leanbulk", pct: 0.375, speeds: [80, 80.3, 79.8, 80.4, 80.1, 80.2] });
  assert.equal(p.pts, 5); assert.match(p.detail, /On plan/);
  assert.equal(part.pts, 5);
  const summary = W.ffScoreSummary({ score: 60, pillars: 2, parts: [part, { key: "speed", have: true, pts: 30, max: 30 }] });
  assert.doesNotMatch(summary, /surplus/);
  assert.doesNotMatch(PLAYER + STATS, /keep the surplus lean/);
  // And real speed gain fills it.
  const up = p2wWorld({ goal: "leanbulk", pct: 0.375, speeds: [80, 80.8, 81.6, 82.4, 83.2, 84] });
  assert.ok(up.p.pts >= 8, `bulk + real speed gain: ${up.p.pts}`);
});

test("p2w: gaining faster than plan costs points with the Fuel check-in's own verdict, and the lever points to Fuel", () => {
  const { p, store, W } = p2wWorld({ goal: "leanbulk", pct: 0.8, speeds: [80, 80.3, 79.8, 80.4, 80.1, 80.2] });
  assert.ok(p.pts <= 3, `fast gain: ${p.pts}`);
  assert.match(p.detail, /faster than plan/);
  assert.match(p.lever, /Fuel check-in/);
  // Same weigh-ins through the check-in math (024): off track, heavier than planned.
  const pts = store.ff_body.filter((e) => e.w).map((e) => ({ t: e.ts, w: parseFloat(e.w) }));
  const tr = W.ffTrendFit(pts.slice(-9));
  const ci = W.ffCheckin(tr, W.ffWeeklyLb(0.00375, 185, 177.8));
  assert.equal(ci.onTrack, false); assert.ok(ci.error > 0);
});

test("p2w: a cut never maxes it from the scale alone — speed down drains it, speed held is neutral", () => {
  const down = p2wWorld({ goal: "cut", pct: -0.75, speeds: [80, 79.4, 78.8, 78.2, 77.6, 77.1] });
  assert.ok(down.p.pts <= 2, `cut, speed −3.6%: ${down.p.pts}`);
  assert.match(down.p.detail, /Speed down/);
  assert.doesNotMatch(down.p.detail, /Weight rising/);
  assert.match(down.p.lever, /costs fat, not speed/);
  const held = p2wWorld({ goal: "cut", pct: -0.75, speeds: [80, 80.3, 79.8, 80.4, 80.1, 80.2] });
  assert.equal(held.p.pts, 5); assert.match(held.p.detail, /Lighter, speed holding/);
  const maint = p2wWorld({ goal: "maintain", pct: 0, speeds: [80, 80.3, 79.8, 80.4, 80.1, 80.2] });
  assert.equal(maint.p.pts, 5);
});

test("p2w: 'weight on plan' only inside the check-in's band — off-plan weight in the other direction is named", () => {
  const steady = [80, 80.3, 79.8, 80.4, 80.1, 80.2], up = [80, 80.8, 81.6, 82.4, 83.2, 84];
  const cases = [
    ["cut", 0.25, up], ["cut", 0.25, steady],               // gaining ~0.45 lb/wk on a cut
    ["leanbulk", -0.55, up], ["leanbulk", -0.55, steady],    // losing ~1 lb/wk on a Lean Bulk
    ["maintain", -0.85, steady],                             // losing ~1.5 lb/wk on Maintain
  ];
  for (const [goal, pct, speeds] of cases) {
    const { p, store, W } = p2wWorld({ goal, pct, speeds });
    const label = `${goal} ${pct}%/wk ${speeds === up ? "faster" : "steady"}: ${p.pts} ${p.detail}`;
    assert.doesNotMatch(p.detail, /on plan/i, label);
    assert.match(p.detail, /weight off your goal’s pace/, label);
    assert.match(p.lever, /Fuel check-in/, label);
    // Same weigh-ins through the Fuel check-in: off track there too.
    const pts = store.ff_body.filter((e) => e.w).map((e) => ({ t: e.ts, w: parseFloat(e.w) }));
    const g = { cut: -0.0075, leanbulk: 0.00375, maintain: 0 }[goal];
    const ci = W.ffCheckin(W.ffTrendFit(pts.slice(-9)), W.ffWeeklyLb(g, 180, 177.8));
    assert.equal(ci.onTrack, false, label);
    if (goal === "cut") assert.ok(p.pts <= 5, label);      // gaining on a cut never reads 10/10
  }
  // The on-plan cases keep their wording.
  assert.match(p2wWorld({ goal: "leanbulk", pct: 0.375, speeds: up }).p.detail, /Faster, weight on plan/);
  assert.match(p2wWorld({ goal: "cut", pct: -0.75, speeds: steady }).p.detail, /Lighter, speed holding/);
});

// ---------------------------------------------------------- season window (121)
test("after a plan restart Octane's speed and p2w pillars measure this season, like strength and consistency", () => {
  const rows = [];
  for (let i = 0; i <= 10; i++) rows.push([160 - i * 14, { s: String(r1(80 + i * 0.4)), ss: "t", w: String(r1(180 + i * 1.3)) }]);
  rows.push([0, { s: "84.2", ss: "t", w: "193.5" }]);
  const store = { ff_body: body(rows), ff_start: new Date(NOW - 10 * DAY).toISOString() };
  const W = world({ store });
  assert.equal(W.ffSeasonSpeedRows().length, 2, "the last test before the restart + today's");
  const sp = W.ffScore().parts.find((p) => p.key === "speed");
  assert.equal(sp.pts, 15, "season 2 starts neutral, not on season 1's +5%");
  assert.ok(W.ffSpeedRows().length === 12, "the Story and charts keep the lifetime trend");
});

// ------------------------------------------------------------ insights (115)
test("insights: no PR card from noise, and 'no clear gain' needs 4+ tests across 8+ weeks this season", () => {
  const start = new Date(NOW - 120 * DAY).toISOString();
  const noisy = world({ store: { ff_start: start, ff_body: body([[56, { s: "80", ss: "t" }], [42, { s: "79.4", ss: "t" }], [28, { s: "80.2", ss: "t" }], [14, { s: "79.9", ss: "t" }], [0, { s: "81.4", ss: "t" }]]) } });
  const sigs = noisy.ffInsights().map((i) => i.sig);
  assert.ok(!sigs.some((s) => /^pr:/.test(s)), "81.4 after 79.4–80.2 is a good day, not a PR");
  assert.ok(sigs.some((s) => /^stall:/.test(s)), "5 flat tests over 8 weeks: no clear gain");
  assert.match(noisy.ffInsights().find((i) => /^stall:/.test(i.sig)).title, /No clear speed gain in ~8 weeks/);
  const young = world({ store: { ff_start: start, ff_body: body([[28, { s: "80", ss: "t" }], [14, { s: "80.3", ss: "t" }], [0, { s: "80.3", ss: "t" }]]) } });
  assert.ok(!young.ffInsights().some((i) => /^stall:/.test(i.sig)), "3 tests over 4 weeks can't call a plateau");
});

// ------------------------------------------------------------ forecast (116)
function brainWith(store) {
  const ctx = { __store: store };
  vm.runInNewContext(`
    var window={};
    function lsGet(k,d){ var v=__store[k]; return v==null?d:v; }
    function planStart(){ return null; } function weightTrend(){ return null; } function speedTestDue(){ return false; } function mobDue(){ return false; }
    ${VARS().join("\n")}
    ${SPEED_FNS.map((n) => fn(SPEED, n)).join("\n")}
    ${BRAIN}
  `, ctx);
  return ctx.window.FFBrain;
}
test("forecast: the confidence label matches real coverage on no-change data", () => {
  const r = rng(11), stat = { High: [0, 0], Medium: [0, 0], Low: [0, 0] };
  let highOff = 0;
  for (let k = 0; k < 1600; k++) {
    const n = 3 + (k % 8);
    const rows = []; for (let i = 0; i < n; i++) rows.push([(n - 1 - i) * 14, { s: String(r1(80 + gauss(r))), ss: "t" }]);
    const f = brainWith({ ff_body: body(rows), ff_history: [0, 1, 2, 3].map((x) => ({ ts: NOW - x * DAY })), fairwayfuel: { freq: 4 } }).forecast();
    if (f.status !== "ready") continue;
    const s = stat[f.confidence]; s[0]++;
    const hit = f.projected7Iron.low <= 80 && f.projected7Iron.high >= 80; if (hit) s[1]++;
    if (f.confidence === "High" && !hit) highOff++;
  }
  const hm = [stat.High[0] + stat.Medium[0], stat.High[1] + stat.Medium[1]];
  assert.ok(hm[0] > 300, "most series get a Medium/High read");
  assert.ok(hm[1] / hm[0] >= 0.85, `High+Medium coverage ${hm[1] / hm[0]} (was 0.23–0.34)`);
  assert.ok(highOff / Math.max(1, stat.High[0]) <= 0.15, `High that misses the truth: ${highOff}/${stat.High[0]}`);
  assert.match(STATS, /f\.confidence==="Low"\) return ""/, "a Low range never headlines the Story");
});

test("forecast: a range is never wider than the slope cap allows, and never a big gain promise", () => {
  const f = brainWith({ ff_body: body([[28, { s: "80", ss: "t" }], [14, { s: "83", ss: "t" }], [0, { s: "86", ss: "t" }]]),
    ff_history: [0, 1, 2, 3].map((x) => ({ ts: NOW - x * DAY })), fairwayfuel: { freq: 4 } }).forecast();
  assert.equal(f.status, "ready");
  assert.ok(f.projectedGain.high <= 6, `high ${f.projectedGain.high}`);
  assert.equal(f.basis.length, 3); assert.match(f.disclaimer, /not a promise/);
});

// ------------------------------------------------------------- review round 2
test("onboarding re-run: a guided test stays 'Measured', and a guess never replaces today's test", () => {
  const today = dayStart(NOW);
  const W = world({ store: { ff_body: [{ iso: iso(today), ts: today + 3600e3, date: "x", s: "82.4", ss: "t" }] } });
  W.logBodyEntry("", "80", "", "g");                 // a rough-guess edit on the same day
  let row = W.__store.ff_body[0];
  assert.equal(row.s, "82.4"); assert.equal(row.ss, "t");
  assert.equal(W.ffSpeedRows().length, 1, "the real test still counts");
  W.logBodyEntry("", "81", "", "m");                 // a measured correction still lands
  row = W.__store.ff_body[0];
  assert.equal(row.s, "81"); assert.equal(row.ss, "m");
  // The toggle starts from the prefilled row's tag.
  assert.match(ONBOARD, /if\(ob\.speed\) ob\.speedSrc=\(oldBody\[obi\]\.ss==="g"\?"g":"m"\);/);
});

test("no dead speed helpers: the drill-in sparkline reads ffSeasonSpeedRows", () => {
  assert.doesNotMatch(SPEED, /function stSpeedHistory\(/);
  assert.match(PLAYER, /ffSeasonSpeedRows\(\)/);
});
