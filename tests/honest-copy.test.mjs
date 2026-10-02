import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// Honest copy (Oct 2026 audit, cluster E): what the app SAYS about peaking,
// progression, in-season, bulking, round "receipts", the Game Day warm-up and
// fueling, and the onboarding benchmarks must match what the engine DOES and
// what the evidence supports. Real source, extracted by name.
const src = (f) => readFileSync(new URL(`../src/js/app/${f}`, import.meta.url), "utf8");
const GLOSS = src("009-glossary.js");
const MACRO = src("025-macro-calculator.js");
const PLAN = src("035-training-plan.js");
const LOGGER = src("040-workout-logger.js");
const INLINE = src("045-inline-logger-log-as-you-train-in-the-ca.js");
const PLAYER = src("070-workout-player-full-screen-guided-sessio.js");
const HOME = src("075-proactive-coaching-your-focus-insights.js");
const GAMEDAY = src("080-game-day-round-day-fueling-warm-up-plan.js");
const ROUNDS = src("082-round-debrief.js");
const ONBOARD = src("090-first-run-onboarding.js");
const TEMPLATE = readFileSync(new URL("../src/index.template.html", import.meta.url), "utf8");

function balanced(source, from, open) {
  let i = source.indexOf(open, from), depth = 0;
  const close = { "{": "}", "[": "]" }[open];
  for (let j = i; j < source.length; j++) {
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
function decl(source, name, open) {
  const start = source.indexOf(`var ${name} = `) >= 0 ? source.indexOf(`var ${name} = `) : source.indexOf(`var ${name}=`);
  assert.ok(start >= 0, `var ${name} should exist`);
  return source.slice(start, balanced(source, start, open)) + ";";
}
const DAY = 864e5;

// ------------------------------------------------------------ peak / taper
// Weekly prescribed sets (full gym, gym speed day) for a goal, from the real
// wave pipeline: retain trim (adjSets) + waveAdjust + the speed-drill doses.
function weeklySets(goal, freq, week) {
  const ctx = {};
  vm.runInNewContext(`
    var state={goal:${JSON.stringify(goal)}};
    function lsGet(k,d){ return d; } function planStart(){ return null; }
    ${decl(PLAN, "PHASES", "[")}
    ${["purposeFor", "trainRetain", "adjSets", "eventInfo", "waveFor", "bumpReps", "trimSets", "plainReps", "waveAdjust",
      "effTarget", "overspeedDose", "speedDrillTarget"].map((n) => fn(PLAN, n)).join("\n")}
    this.api={PHASES, effTarget, speedDrillTarget, waveFor};`, ctx);
  const { PHASES, effTarget, speedDrillTarget, waveFor } = ctx.api;
  const P = PHASES[0];
  let n = 0;
  for (const d of P[freq === 4 ? "days4" : "days5"]) {
    if (d.type === "rest") continue;
    if (d.type === "speed") for (const e of P.speed.gym.ex) n += parseInt(speedDrillTarget(e[0], e[1], week), 10);
    else for (const e of d.ex) n += parseInt(effTarget(e[1], e[0], week), 10);
  }
  return { n, wave: waveFor(week) };
}

test("the peak copy's 'about a quarter to a third fewer sets' is what the engine prescribes", () => {
  for (const goal of ["leanbulk", "bulk", "maintain", "cut"]) for (const freq of [4, 5]) {
    const build = weeklySets(goal, freq, 2), peak = weeklySets(goal, freq, 19);
    assert.equal(build.wave, "accumulate"); assert.equal(peak.wave, "peak");
    const cut = 1 - peak.n / build.n;
    assert.ok(cut >= 0.2 && cut <= 0.4, `${goal} ${freq}-day: ${build.n} → ${peak.n} sets (${Math.round(cut * 100)}% fewer)`);
  }
  assert.match(PLAN, /about a quarter to a third fewer sets/);
  // No unverified % promise, no "nearly half", no heavy singles the engine never prescribes.
  for (const banned of [/3–6%/, /power bump/, /nearly in half/, /singles\/doubles/, /40–50%/])
    assert.doesNotMatch(PLAN, banned, String(banned));
});

test("progression copy states the real rule: same weight until every set hits the target", () => {
  assert.match(PLAN, /strap:"Same weight until every set hits its target reps — then the app adds weight\."/);
  assert.doesNotMatch(PLAN, /More reps each week/);
  assert.doesNotMatch(PLAN, /top of each range|top of the rep range on every set/);
  assert.doesNotMatch(TEMPLATE, /strength first, reps second/);
  assert.match(TEMPLATE, /keep the weight until every set hits its target reps/);
  // The increments the copy quotes are the ones incNum adds (+5 lb lower, never +10).
  assert.doesNotMatch(PLAN, /\+5–10 lb/);
  assert.match(LOGGER, /return 5;\s*\n\s*if\(isBarbell\(n\)\) return 2\.5;/);
});

test("in-season copy describes Retain mode, not a 1–2 sets / 1–2× a week mode the app doesn't run", () => {
  assert.doesNotMatch(PLAN, /1–2 hard sets per muscle/);
  assert.match(PLAN, /In-Season Maintain<\/b> and the plan moves to <b>Retain mode<\/b>/);
  assert.match(PLAN, /over ~60/);
  assert.doesNotMatch(MACRO, /the in-season week: heavy enough to keep strength, lighter on volume/);
  assert.match(MACRO, /Retain mode/);
});

test("Bulk is sold honestly: faster gain, more fat — not more speed", () => {
  for (const [file, s] of [["025", MACRO], ["090", ONBOARD], ["template", TEMPLATE]]) {
    assert.doesNotMatch(s, /max strength &amp; speed|max out speed|Maximize speed potential/, file);
    assert.match(s, /more of it is fat/, file);
  }
  // Lean-bulk numbers agree with the calculator's band (GOALS.leanbulk.weekly 0.25–0.5%/wk).
  assert.match(MACRO, /leanbulk: \{ label: "Lean Bulk", pct: 0\.10, proteinPerLb: 0\.9, fatPerLb: 0\.35, weekly:\[0\.0025,0\.005\]/);
  for (const s of [MACRO, TEMPLATE]) {
    assert.match(s, /0\.25–0\.5% of bodyweight a week/);
    assert.doesNotMatch(s, /~0\.5–0\.75 lb\/week/);
  }
  assert.doesNotMatch(TEMPLATE, /0\.25–0\.5 lb\/month|mostly muscle with minimal fat/);
});

test("the gym speed day never calls the speed bench ballistic or a throw", () => {
  const row = PLAN.match(/\["Speed bench press", [^\]]*\]/)[0];
  assert.doesNotMatch(row, /ballistic/i);
  assert.match(row, /not a true throw/);
  assert.doesNotMatch(INLINE, /ballistic moves \(trap-bar jump, speed bench\)/);
});

// ------------------------------------------------------------ overspeed
test("Home insights no longer carry bodies that name overspeed as the fix", () => {
  assert.doesNotMatch(HOME, /not enough true <b>overspeed<\/b>/);
  assert.doesNotMatch(HOME, /Bias toward overspeed/);
  assert.doesNotMatch(HOME, /keep the overspeed work crisp/);
});

// ------------------------------------------------------------ Game Day
function renderGameDay(store = {}) {
  const el = { innerHTML: "" };
  const ctx = { __store: store, __el: el };
  vm.runInNewContext(`
    function $(id){ return id==="gamedayBody" ? __el : null; }
    function lsGet(k,d){ var v=__store[k]; return v==null?d:v; } function lsSet(){}
    function escAttr(s){ return String(s); } function roundToday(){ return null; }
    ${["gdState", "gdSave", "parseHM", "fmtMin", "gdCard", "renderGameDay"].map((n) => fn(GAMEDAY, n)).join("\n")}
    renderGameDay();`, ctx);
  return el.innerHTML;
}

test("Game Day: the warm-up ends with real-club speed swings; overspeed is optional and light", () => {
  const html = renderGameDay({ ff_gameday: { teeTime: "09:00", holes: 18, transport: "walk" } });
  const moves = [...html.matchAll(/<span class="wu-move">([^<]*)<\/span><span class="wu-dose">([^<]*)<\/span>/g)].map((m) => [m[1], m[2]]);
  assert.ok(moves.length >= 6, String(moves.length));
  const last = moves[moves.length - 1];
  assert.match(last[0], /Full-speed swings/);
  assert.match(last[1], /club you’ll hit first/);
  for (const [m, d] of moves) assert.doesNotMatch(m + " " + d, /MAX|Overspeed primer/i, m);
  const stick = moves.find(([m]) => /speed stick/i.test(m));
  assert.ok(stick && /^Optional/.test(stick[0]) && /light/.test(stick[1]), JSON.stringify(stick));
  assert.ok(moves.indexOf(stick) < moves.length - 2, "the speed stick comes before the real-club swings");
});

test("Game Day: fueling is evidence-based (carb dose, no 'most golfers fade') and recovery mentions alcohol once", () => {
  for (const holes of [9, 18]) {
    const html = renderGameDay({ ff_gameday: { teeTime: "09:00", holes, transport: "ride" } });
    assert.doesNotMatch(html, /Most golfers fade|not lack of skill|endurance event/);
    assert.match(html, /30–60 g an hour/);
    assert.match(html, /late-round fatigue/);
    assert.equal((html.match(/Having a drink|alcohol|beer/gi) || []).length, 1, "one short alcohol line");
    assert.match(html, /Eat that meal first and keep it to one or two — heavy drinking blunts recovery/);
    if (holes === 9) assert.doesNotMatch(html, /4–5 hours/);
  }
});

// ------------------------------------------------------------ receipts
function receipts({ rounds, history, start = null, now = Date.now() }) {
  const ctx = { __store: { ff_history: history, ff_start: start } };
  vm.runInNewContext(`
    function lsGet(k,d){ var v=__store[k]; return v==null?d:v; }
    function planStart(){ return __store.ff_start; }
    function waveFor(){ return "accumulate"; }
    ${ROUNDS.match(/var RD_MIN_N=\d+;/)[0]}
    ${["rdDayTs", "rdPlanWeek", "rdAvg", "rdGap", "rdInsights"].map((n) => fn(ROUNDS, n)).join("\n")}
    this.api={rdInsights};`, ctx);
  return ctx.api.rdInsights(rounds);
}
function dayAt(t) { const d = new Date(t); d.setHours(10, 0, 0, 0); return d.getTime(); }
const BASE = dayAt(Date.now() - 200 * DAY);
function round(dayOffset, drive) {
  const ts = BASE + dayOffset * DAY, d = new Date(ts);
  return { ts, date: d.toISOString().slice(0, 10), drive };
}

test("receipts: a 2-vs-2 gap stays silent, however big", () => {
  // Lifts on days 0, 10, 20, 30; rounds 1 day after two lifts and 6 days after two.
  const history = [0, 10, 20, 30].map((o) => ({ ts: BASE + o * DAY, doneTs: BASE + o * DAY }));
  const rounds = [round(1, 260), round(11, 262), round(16, 230), round(26, 228)];
  assert.equal(receipts({ rounds, history }).length, 0);
});

test("receipts: 4+ a side with a clear gap shows an n-labelled, hedged pattern — never a scheduling order", () => {
  const history = [0, 10, 20, 30, 40, 50, 60, 70].map((o) => ({ ts: BASE + o * DAY, doneTs: BASE + o * DAY }));
  const near = [1, 11, 21, 31].map((o, i) => round(o, 250 + i));          // 250–253
  const far = [46, 56, 66, 76].map((o, i) => round(o, 230 + i));          // 230–233
  const out = receipts({ rounds: [...near, ...far], history });
  assert.equal(out.length, 1, JSON.stringify(out));
  assert.match(out[0], /^🏋️ So far:/);
  assert.match(out[0], /\(n=4 vs 4\)/);
  assert.match(out[0], /an early pattern, not proof/);
  assert.doesNotMatch(out[0], /keep rounds close to gym days/);
  // Noisy samples whose gap sits inside 2 standard errors stay silent.
  const noisyNear = [1, 11, 21, 31].map((o, i) => round(o, [200, 290, 210, 280][i]));
  const noisyFar = [46, 56, 66, 76].map((o, i) => round(o, [205, 270, 215, 260][i]));
  assert.equal(receipts({ rounds: [...noisyNear, ...noisyFar], history }).length, 0);
});

test("receipts: lifts are dated by doneTs, and a same-day lift drops the round", () => {
  // ts was moved forward by a re-save; doneTs is the real finish (2 days before each round).
  const history = [0, 10, 20, 30].map((o) => ({ ts: BASE + (o + 5) * DAY, doneTs: BASE + o * DAY }));
  const extra = [40, 50, 60, 70].map((o) => ({ ts: BASE + o * DAY, doneTs: BASE + o * DAY }));
  const near = [2, 12, 22, 32].map((o, i) => round(o, 250 + i));
  const far = [45, 55, 65, 75].map((o, i) => round(o, 230 + i));
  const out = receipts({ rounds: [...near, ...far], history: [...history, ...extra] });
  assert.equal(out.length, 1, JSON.stringify(out));
  assert.match(out[0], /n=4 vs 4/);
  // A lift on the round's own day: order unknown → that round is left out (n drops to 3 → silent).
  const sameDay = [...history, ...extra, { ts: BASE + 45 * DAY, doneTs: BASE + 45 * DAY }];
  assert.equal(receipts({ rounds: [...near, ...far], history: sameDay }).length, 0);
});

test("the glossary calls receipts patterns, not proof", () => {
  assert.doesNotMatch(GLOSS, /Proof from your own data/);
  assert.match(GLOSS, /Signals, not proof/);
});

// ------------------------------------------------------------ benchmarks
test("ffBench: every 'typical' 7-iron sits inside its own range; male under 50 is 78 mph / 215 yd", () => {
  const ctx = { state: { sex: "male" } };
  vm.runInNewContext(`function $(){ return null; }\n${fn(PLAYER, "ffBench")}\nthis.api={ffBench};`, ctx);
  const { ffBench } = ctx.api;
  const m40 = ffBench("male", 40);
  assert.equal(m40.seven, 78); assert.equal(m40.drive, 215);
  for (const [sx, age] of [["male", 30], ["male", 49], ["male", 50], ["male", 72], ["female", 30], ["female", 60]]) {
    const b = ffBench(sx, age), r = b.range.match(/(\d+)–(\d+)/);
    assert.ok(b.seven >= +r[1] && b.seven <= +r[2], `${sx} ${age}: ${b.seven} vs ${b.range}`);
    assert.match(b.label, /typical/);
  }
});

// ------------------------------------------------------------ health line
test("onboarding's body step carries one short health line and stores nothing new", () => {
  // The body step is Step 1 since the goal step moved after it (it preselects
  // a goal from height + weight) — find it by its kicker, not its number.
  const bodyAt = ONBOARD.indexOf("Body & fuel");
  const step2 = ONBOARD.slice(ONBOARD.lastIndexOf("} else if(s===", bodyAt), ONBOARD.indexOf("} else if(s===", bodyAt));
  assert.match(step2, /Heart condition, chest pain, recent surgery or a joint injury — or new to exercise and over ~45\? Check with a doctor before you start\./);
  // Only what weeks 1–2 really change for every goal — not "deliberately easier".
  assert.match(step2, /Your first two weeks skip all-out sets and start the speed swings light\./);
  assert.doesNotMatch(step2, /deliberately easier/);
  assert.equal((step2.match(/class="ob-p ob-quiet ob-health"/g) || []).length, 1);
  assert.doesNotMatch(step2, /lsSet\(/);
});
