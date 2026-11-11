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
const vars = ST.slice(ST.indexOf("var POWER_DUE_AT"), ST.indexOf("function chestMdc(")) + "\n" + (ST.match(/var PW_FAR=\d+;/) || [""])[0];
const FNS = ["stDayStart", "chestMdc", "powerChecks", "lastPower", "daysSincePower", "powerDue", "pwNum", "jumpOk", "chestOk",
  "pwFmt", "pwFresh", "pwCheck", "pwCompare", "pwDeltaText", "pwKey", "pwMsg", "pwSync", "pwBigJump", "pwCap", "powerCheckHtml", "savePowerCheck", "powerSummaryHtml"];
const DAY = 864e5;
function sandbox(store = {}) {
  const ctx = {
    Date, Math, JSON, store, rendered: 0,
    lsGet: (k, d) => (k in store ? JSON.parse(JSON.stringify(store[k])) : d),
    lsSet: (k, v) => { store[k] = JSON.parse(JSON.stringify(v)); },
    todayStr: () => "Nov 11", curWeek: () => 6, $: () => null, ffIcon: () => "", escAttr: (s) => String(s),
    renderSpeedTest() { ctx.rendered++; },
    ffLowImpact: () => !!store.__low, have: (k) => !!(store.__equip || {})[k], ffSpeedRows: () => store.__speedRows || [],
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
  assert.match(fn(ST, "powerCheckHtml"), /'<div class="pwr-safe">Stop if anything hurts — '\+/, "a pain stop up front (wording per mode: see the review test)");
  assert.doesNotMatch(ST.slice(ST.indexOf("function powerOfferHtml("), ST.indexOf("function savePowerCheck(")), /TPI|Titleist|handicap|PGA/i, "own words, no outside names or norms");
});

test("sync: ff_power roams — two devices' checks union by ts, capped at 40", () => {
  assert.match(CS, /var KEYS = \[[^\]]*"ff_power"/, "in KEYS");
  const line = CS.split("\n").find((l) => /^\s*ff_power:/.test(l));
  assert.ok(line, "a MERGE entry");
  const ctx = {};
  vm.runInNewContext(fn(CS, "unionSeries") + "\n" + fn(CS, "powerCap") + "\nvar m=" + line.trim().replace(/^ff_power:\s*/, "").replace(/,\s*\/\/.*$/, "").replace(/,$/, "") + ";", ctx);
  const phone = [{ ts: 100, jump: 17 }, { ts: 300, jump: 18 }], laptop = [{ ts: 200, jump: 17.5, chest: 20, ball: 8 }];
  assert.deepEqual([...ctx.m(phone, laptop).map((e) => e.ts)], [100, 200, 300], "neither device's check is lost");
  assert.deepEqual([...ctx.m(laptop, phone).map((e) => e.ts)], [100, 200, 300]);
  const many = Array.from({ length: 45 }, (_, i) => ({ ts: i + 1, jump: 18 }));
  const out = ctx.m(many, []);
  assert.equal(out.length, 40);
  assert.equal(out[0].ts, 1, "the first check is kept — it's the baseline (Codex, #129)");
  assert.equal(out[1].ts, 7, "then the newest 39");
});

// ---- Pre-PR review fixes ----
const form = (s, power, saved = null) => {
  s.stState = { saved, power: { jump: "", chest: "", ball: null, saved: null, ...power } };
  vm.runInContext("stState=this.stState;", s);
  return s.powerCheckHtml();
};

test("review: the pain line is true either way — opened on its own there's no speed test that 'already counts'", () => {
  const s = sandbox();
  assert.match(form(s, {}, { best: 81 }), /skip it today; the speed test already counts/, "after a speed test");
  const alone = form(sandbox(), {});
  assert.match(alone, /Stop if anything hurts/);
  assert.doesNotMatch(alone, /speed test already counts/, "from the Log sheet or Stats");
});

test("review: jumps land soft; a low-impact profile gets the gentler line", () => {
  assert.match(form(sandbox(), {}), /Land soft and quiet/);
  assert.doesNotMatch(form(sandbox(), {}), /small dip/);
  assert.match(form(sandbox({ __low: true }), {}), /small dip, a quiet landing/, "60+, BMI 30+ or a flagged health question (ffLowImpact)");
});

test("review: the result only points at the Stats speed card when that card exists", () => {
  const done = (store) => { const s = sandbox(store); return form(s, { saved: { jump: 18, chest: null, ball: null, cj: null, cc: null } }); };
  assert.match(done({ __speedRows: [{ s: 80 }] }), /on your Stats speed card/);
  assert.doesNotMatch(done({}), /Stats speed card/, "no counted speed number yet → no promise");
});

test("review: a big jump from the last check asks once before it becomes history (a typo like 28 for 18)", () => {
  const s = sandbox({ ff_power: [{ ts: ago(30), jump: 18, chest: 20, ball: 8 }] });
  s.stState = { power: { jump: "28", chest: "", ball: 8, saved: null } };
  vm.runInContext("stState=this.stState;", s);
  s.savePowerCheck();
  assert.equal(s.store.ff_power.length, 1, "first tap: not saved");
  assert.match(vm.runInContext("stState.power.warn", s), /56% above your last jump \(18 in\)/);
  s.savePowerCheck();
  assert.equal(s.store.ff_power.length, 2, "second tap with the same numbers: saved");
  // A changed number asks again; within 25% never asks; the throw is checked against the same ball only.
  const t = sandbox({ ff_power: [{ ts: ago(30), jump: 18, chest: 20, ball: 8 }] });
  assert.equal(t.pwBigJump({ jump: "21", chest: "", ball: 8 }), null, "+17% is a real month");
  assert.match(t.pwBigJump({ jump: "", chest: "30", ball: 8 }).msg, /50% above your last 8 lb throw \(20 ft\)/);
  assert.equal(t.pwBigJump({ jump: "", chest: "30", ball: 6 }), null, "a new ball has no last throw to compare");
  assert.equal(sandbox().pwBigJump({ jump: "28", chest: "", ball: null }), null, "first ever: nothing to compare");
});

test("review: no range error flashes while a number is still being typed (\"1\" on the way to 18)", () => {
  const { pwCheck } = sandbox();
  const live = pwCheck({ jump: "1", chest: "" }, true);
  assert.equal(live.err, null, "typing: no error yet");
  assert.equal(live.ready, false, "…and it can't save");
  assert.match(pwCheck({ jump: "1", chest: "" }).err, /2–48 inches/, "on leaving the field / saving: the error");
  assert.match(pwCheck({ jump: "180", chest: "" }, true).err, /2–48 inches/, "too high can't become valid by typing more — say so now");
  assert.equal(pwCheck({ jump: "", chest: "2", ball: 8 }, true).err, null, "a throw on its way to 25 ft");
  assert.match(pwCheck({ jump: "", chest: "2", ball: null }, true).err, /ball’s weight/, "the ball prompt is guidance, shown as soon as a throw is typed");
  assert.match(fn(ST, "stEnsureModal"), /addEventListener\("change"/, "the full check runs when the field is left");
});

test("review: the paywall names the power check (and analytics can tell it apart)", () => {
  assert.match(fn(ST, "openPowerCheck"), /ffCanUse\("powercheck"\)/);
  const PRO = readFileSync(new URL("../src/js/app/036-access-free-week-and-pro.js", import.meta.url), "utf8");
  assert.match(fn(PRO, "ffPaywallHtml"), /powercheck:\["Power checks are part of Pro"/);
});

test("review: a hand-edited entry with a throw but no ball never prints 'undefined lb'", () => {
  const h = sandbox({ ff_power: [{ ts: ago(5), jump: null, chest: 20 }] }).powerSummaryHtml();
  assert.doesNotMatch(h, /undefined/);
  assert.match(h, /Chest throw <b>20 ft<\/b>/);
});

// ---- Codex #129: the cap must never move the baseline ----
const DEVICE = () => { const c = {}; vm.runInNewContext(fn(CS, "unionSeries") + "\n" + fn(CS, "powerCap") + "\nvar m=" +
  CS.split("\n").find((l) => /^\s*ff_power:/.test(l)).trim().replace(/^ff_power:\s*/, "").replace(/,\s*\/\/.*$/, "").replace(/,$/, "") + ";", c); return c; };

test("Codex #129: past 40 checks the first jump and the first throw with each ball stay — 'since your first' keeps its meaning", () => {
  const { pwCap } = sandbox();
  const list = [{ ts: 1, jump: null, chest: 20, ball: 8 }, { ts: 2, jump: 16, chest: null, ball: null }]
    .concat(Array.from({ length: 50 }, (_, i) => ({ ts: 10 + i, jump: 18, chest: i === 2 ? 24 : 21, ball: i === 2 ? 6 : 8 })));
  const out = pwCap(list, 40);
  assert.equal(out.length, 40);
  assert.deepEqual([...out.slice(0, 3).map((e) => e.ts)], [1, 2, 12], "first 8 lb throw, first jump, first 6 lb throw — all older than the newest window");
  assert.deepEqual([...out.slice(3).map((e) => e.ts)], Array.from({ length: 37 }, (_, i) => 23 + i), "then the newest 37");
  assert.equal(pwCap(list.slice(0, 40), 40).length, 40, "at or under the cap: untouched");
  assert.equal(pwCap(list.slice(0, 40), 40)[39].ts, list[39].ts);
});

test("Codex #129: saving the 41st check keeps the true first as the baseline", () => {
  const old = [{ ts: ago(1300), jump: 15, chest: null, ball: null }].concat(Array.from({ length: 39 }, (_, i) => ({ ts: ago(1200 - i * 30), jump: 18 })));
  const s = sandbox({ ff_power: old });
  s.stState = { power: { jump: "19", chest: "", ball: null, saved: null } };
  vm.runInContext("stState=this.stState;", s);
  s.savePowerCheck();
  assert.equal(s.store.ff_power.length, 40);
  assert.equal(s.store.ff_power[0].jump, 15, "the first check survives the cap");
  const again = sandbox({ ff_power: s.store.ff_power });
  assert.equal(again.pwCompare(again.powerChecks(), "jump", 20).first, 15, "'since your first' still means the first");
});

test("Codex #129: the app's cap and the sync merge's cap keep exactly the same entries", () => {
  const { pwCap } = sandbox(), dev = DEVICE();
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let n = 0; n < 200; n++) {
    const len = 30 + Math.floor(rnd() * 40), list = [];
    for (let i = 0; i < len; i++) {
      const hasJ = rnd() < 0.8, hasC = rnd() < 0.6;
      list.push({ ts: i + 1, jump: hasJ ? 15 + Math.round(rnd() * 10) : null, chest: hasC ? 18 + Math.round(rnd() * 8) : null,
        ball: hasC ? [4, 6, 8, 10][Math.floor(rnd() * 4)] : null });
    }
    const a = pwCap(list, 40).map((e) => e.ts).join(","), b = [...dev.m(list.slice(0, len >> 1), list.slice(len >> 1))].map((e) => e.ts).join(",");
    assert.equal(b, a, `case ${n}`);
  }
});
