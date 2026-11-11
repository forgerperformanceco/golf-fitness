import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// The power check (Nov 2026, from the TPI research: power, not flexibility, is
// what tracks clubhead speed). A jump-and-reach and an optional seated med-ball
// chest throw, offered about monthly after the speed test's three swings, saved
// to the roaming ff_power series and compared only against the user's own checks.
const ST = readFileSync(new URL("../src/js/app/060-speed-test-day-the-biweekly-testing-ritu.js", import.meta.url), "utf8");
const CS = readFileSync(new URL("../cloud-sync.js", import.meta.url), "utf8");
const STATS = readFileSync(new URL("../src/js/app/085-progress-stats-view.js", import.meta.url), "utf8");

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
const vars = ST.slice(ST.indexOf("var POWER_DUE_AT"), ST.indexOf("function chestMdc("));
const FNS = ["stDayStart", "chestMdc", "powerChecks", "lastPower", "daysSincePower", "powerDue", "pwNum", "jumpOk", "chestOk",
  "pwFmt", "pwFresh", "pwCheck", "pwCompare", "pwDeltaText", "pwSync", "savePowerCheck", "powerSummaryHtml"];
const DAY = 864e5;
function sandbox(store = {}) {
  const ctx = {
    Date, Math, JSON, store, rendered: 0,
    lsGet: (k, d) => (k in store ? JSON.parse(JSON.stringify(store[k])) : d),
    lsSet: (k, v) => { store[k] = JSON.parse(JSON.stringify(v)); },
    todayStr: () => "Nov 11", curWeek: () => 6, $: () => null, ffIcon: () => "", escAttr: (s) => String(s),
    renderSpeedTest() { ctx.rendered++; },
  };
  vm.runInNewContext(vars + "\n" + FNS.map((n) => fn(ST, n)).join("\n") + "\nvar stState=null;", ctx);
  return ctx;
}
const ago = (days) => Date.now() - days * DAY;

test("due: first ever, then every other speed test (21+ days), never the very next one", () => {
  assert.equal(sandbox().powerDue(), true, "never checked → due (sets the baseline)");
  assert.equal(sandbox({ ff_power: [{ ts: ago(14), jump: 18 }] }).powerDue(), false, "the next speed test (14 days) → not due");
  assert.equal(sandbox({ ff_power: [{ ts: ago(20), jump: 18 }] }).powerDue(), false);
  assert.equal(sandbox({ ff_power: [{ ts: ago(21), jump: 18 }] }).powerDue(), true, "21 days → due");
  assert.equal(sandbox({ ff_power: [{ ts: ago(28), jump: 18 }] }).powerDue(), true, "the second speed test (~28 days) → due");
  assert.equal(sandbox({ ff_power: [{ ts: ago(40), jump: 18 }, { ts: ago(3), jump: 19 }] }).powerDue(), false, "the newest check counts");
  assert.equal(sandbox({ ff_power: [{ ts: ago(3), jump: 19 }, { ts: ago(40), jump: 18 }] }).powerDue(), false, "sorted by ts — a merged, out-of-order list still reads the newest");
  assert.equal(sandbox({ ff_power: "junk" }).powerDue(), true, "a corrupt value reads as no checks, not a crash");
});

test("the form: range checks, the ball weight, and at least one number", () => {
  const { pwCheck } = sandbox();
  assert.equal(pwCheck({ jump: "", chest: "" }).ready, false, "nothing entered → can't save");
  assert.equal(pwCheck({ jump: "", chest: "" }).err, null, "…but no error either");
  assert.deepEqual(JSON.parse(JSON.stringify(pwCheck({ jump: "18", chest: "" }))), { err: null, ready: true }, "the jump alone is enough");
  assert.match(pwCheck({ jump: "180", chest: "" }).err, /2–48 inches/, "a typo (180 for 18) is caught");
  assert.match(pwCheck({ jump: "1", chest: "" }).err, /2–48 inches/);
  assert.match(pwCheck({ jump: "", chest: "22", ball: null }).err, /ball’s weight/, "a throw needs its ball weight");
  assert.equal(pwCheck({ jump: "", chest: "22", ball: 8 }).ready, true, "a throw with a ball is enough (no jump — e.g. a sore back)");
  assert.match(pwCheck({ jump: "18", chest: "220", ball: 8 }).err, /3–60 feet/);
});

test("the ball weight defaults to the last one used, so the comparison stays like-for-like", () => {
  const s = sandbox({ ff_power: [{ ts: ago(60), chest: 20, ball: 8 }, { ts: ago(30), jump: 18, chest: null, ball: null }] });
  assert.equal(s.pwFresh().ball, 8, "a jump-only check in between doesn't forget the ball");
  assert.equal(sandbox().pwFresh().ball, null, "first time: no guess");
});

test("comparisons: the throw is only compared with the same ball; the first check is the baseline", () => {
  const { pwCompare } = sandbox();
  const prior = [{ ts: 1, jump: 17, chest: 20, ball: 8 }, { ts: 2, jump: 18, chest: 24, ball: 6 }, { ts: 3, jump: 18.5, chest: 21, ball: 8 }];
  assert.equal(pwCompare([], "jump", 18), null, "first ever → null (baseline)");
  const j = pwCompare(prior, "jump", 20);
  assert.deepEqual([j.n, j.last, j.dLast, j.first, j.dFirst, j.mdc], [3, 18.5, 1.5, 17, 3, 1]);
  const c = pwCompare(prior, "chest", 22, 8);
  assert.deepEqual([c.n, c.last, c.first, c.dLast, c.dFirst], [2, 21, 20, 1, 2], "the 6 lb throw (24 ft) is ignored");
  assert.equal(pwCompare(prior, "chest", 22, 10), null, "a new ball weight starts its own baseline");
});

test("the words: a change inside the noise reads as the same, never a gain", () => {
  const { pwDeltaText, chestMdc } = sandbox();
  assert.match(pwDeltaText(null, "in"), /baseline/);
  assert.match(pwDeltaText({ n: 1, dLast: 0.5, dFirst: 0.5, mdc: 1 }, "in"), /^About the same as last check \(±1 in is normal wobble\)\.$/,
    "half an inch is the tape measure");
  assert.match(pwDeltaText({ n: 1, dLast: 1.5, dFirst: 1.5, mdc: 1 }, "in"), /▲ <b>\+1\.5 in<\/b> since last check\.$/, "one prior check: no separate 'since your first'");
  const two = pwDeltaText({ n: 3, dLast: -0.5, dFirst: 2, mdc: 1 }, "in");
  assert.match(two, /About the same as last check/);
  assert.match(two, /▲ <b>\+2 in<\/b> since your first/);
  assert.match(pwDeltaText({ n: 2, dLast: -2, dFirst: 0.5, mdc: 1 }, "in"), /▼ <b>2 in<\/b> since last check · level with your first/);
  assert.equal(chestMdc(10), 1, "the throw's noise line never drops under a foot");
  assert.equal(chestMdc(30), 1.5, "…and is 5% of a longer throw");
});

test("saving: one entry in ff_power, compared against the checks BEFORE it, capped at 40", () => {
  const old = Array.from({ length: 40 }, (_, i) => ({ ts: ago(400 - i), jump: 17, chest: 20, ball: 8 }));
  const s = sandbox({ ff_power: old });
  s.stState = { power: { jump: "19", chest: "", ball: 8, saved: null } };
  vm.runInContext("stState=this.stState;", s);
  s.savePowerCheck();
  const pw = s.store.ff_power;
  assert.equal(pw.length, 40, "capped at 40 (matches the MERGE cap)");
  const e = pw[pw.length - 1];
  assert.deepEqual([e.jump, e.chest, e.ball, e.week, e.date, typeof e.ts], [19, null, null, 6, "Nov 11", "number"],
    "no throw → no ball recorded (a ball without a throw would mislead the next default)");
  const saved = vm.runInContext("stState.power.saved", s);
  assert.equal(saved.cj.dFirst, 2, "compared with the old checks, not with itself");
  assert.equal(saved.cc, null);
  assert.equal(s.rendered, 1);
  s.savePowerCheck();
  assert.equal(s.store.ff_power.length, 40, "a second tap on a saved check writes nothing");
  assert.equal(s.store.ff_power[39].ts, e.ts);
});

test("a bad form never saves", () => {
  const s = sandbox();
  s.stState = { power: { jump: "", chest: "22", ball: null, saved: null } };
  vm.runInContext("stState=this.stState;", s);
  s.savePowerCheck();
  assert.equal(s.store.ff_power, undefined);
});

test("Stats: the latest of each, the change since the first only past the noise", () => {
  const s = sandbox({ ff_power: [{ ts: ago(60), jump: 17, chest: 20, ball: 8 }, { ts: ago(2), jump: 19.5, chest: 20.5, ball: 8 }] });
  const h = s.powerSummaryHtml();
  assert.match(h, /Jump <b>19\.5 in<\/b> <small>\(\+2\.5 since first\)<\/small>/);
  assert.match(h, /Chest throw <b>20\.5 ft<\/b> <small>8 lb<\/small>/, "half a foot isn't shown as progress");
  assert.doesNotMatch(h, /data-powercheck/, "not due → no button");
  assert.equal(sandbox().powerSummaryHtml(), "", "no checks → nothing");
  assert.match(sandbox({ ff_power: [{ ts: ago(30), jump: 18 }] }).powerSummaryHtml(), /data-powercheck="1">check due/);
  assert.match(STATS, /powerSummaryHtml\(\)\+/, "the Stats speed card shows it");
  assert.match(STATS, /data-powercheck="1">'\+ffIcon\("bolt",18\)\+'<span>Power check/, "the Log sheet can start one");
  assert.match(STATS, /\[data-speedtest\],\[data-powercheck\],\[data-mobscreen\]/, "…and closes itself when it does");
});

test("the speed test offers it after the swings — only when due — and the swing protocol is untouched", () => {
  const r = fn(ST, "renderSpeedTest");
  assert.match(r, /\(powerDue\(\) \? powerOfferHtml\(\) : ''\)\+\s*'<button class="st-save" data-stdone="1">/, "on the result, before Done");
  assert.match(r, /if\(stState\.power\)\{ body\.innerHTML=powerCheckHtml\(\); return; \}/);
  assert.match(r, /\["Leg swings","×10\/side"\],\["90\/90 hip switches","×6\/side"\],\["Open-book T-spine","×8\/side"\],\["Build-up swings","10 · ramp 50→90%"\]/,
    "the warm-up and three swings are as before");
  assert.match(fn(ST, "powerCheckHtml"), /Stop if anything hurts — skip it today/, "a pain stop up front");
  assert.doesNotMatch(ST.slice(ST.indexOf("function powerOfferHtml("), ST.indexOf("function savePowerCheck(")), /TPI|Titleist|handicap|PGA/i, "own words, no outside names or norms");
});

test("sync: ff_power roams — two devices' checks union by ts, capped at 40", () => {
  assert.match(CS, /var KEYS = \[[^\]]*"ff_power"/, "in KEYS");
  const line = CS.split("\n").find((l) => /^\s*ff_power:/.test(l));
  assert.ok(line, "a MERGE entry");
  const ctx = {};
  vm.runInNewContext(fn(CS, "unionSeries") + "\nvar m=" + line.trim().replace(/^ff_power:\s*/, "").replace(/,\s*\/\/.*$/, "").replace(/,$/, "") + ";", ctx);
  const phone = [{ ts: 100, jump: 17 }, { ts: 300, jump: 18 }], laptop = [{ ts: 200, jump: 17.5, chest: 20, ball: 8 }];
  assert.deepEqual([...ctx.m(phone, laptop).map((e) => e.ts)], [100, 200, 300], "neither device's check is lost");
  assert.deepEqual([...ctx.m(laptop, phone).map((e) => e.ts)], [100, 200, 300]);
  const many = Array.from({ length: 45 }, (_, i) => ({ ts: i + 1, jump: 18 }));
  const out = ctx.m(many, []);
  assert.equal(out.length, 40);
  assert.equal(out[0].ts, 6, "the oldest fall off");
});
