// Nutrition engine (Oct 2026 audit, cluster F): goal suggestion, the 20% fat
// floor, post-workout protein, the calorie floor vs the check-in, the check-in's
// noise tolerance, and slot-weighted fuel adherence. Pure functions only: 024
// runs whole in a vm; 025's GOALS table and 030's scorer are extracted.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const read = (f) => readFileSync(new URL(`../src/js/app/${f}`, import.meta.url), "utf8");
const model = read("024-macro-model.js");
const calc = read("025-macro-calculator.js");
const fuel = read("030-fuel-check-off-adherence-not-accounting.js");
const checkinUi = read("070-workout-player-full-screen-guided-sessio.js");
const stats = read("085-progress-stats-view.js");
const onboarding = read("090-first-run-onboarding.js");

function balanced(source, startToken) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `${startToken} should exist`);
  const brace = source.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${startToken}`);
}

const ctx = vm.createContext({});
vm.runInContext(model, ctx);
vm.runInContext(balanced(calc, "var GOALS = {") + ";", ctx);
vm.runInContext(balanced(calc, "var MEALS_REC = {") + ";", ctx);
vm.runInContext(balanced(calc, "var WORKOUT_SLOTS = {") + ";", ctx);
const FAT_MIN_PCT = Number(calc.match(/var FAT_MIN_PCT = ([\d.]+);/)[1]);
const { GOALS, MEALS_REC, WORKOUT_SLOTS } = ctx;
const GOAL_KEYS = ["leanbulk", "bulk", "maintain", "cut"];
const ACTIVITY = [1.2, 1.375, 1.55, 1.725, 1.9];
const inch = (ft, inc) => (ft * 12 + inc) * 2.54;

// The four representative users the audit ruling names.
const USERS = {
  m30: { sex: "male", age: 30, weightLb: 150, heightCm: inch(5, 8) },
  m45: { sex: "male", age: 45, weightLb: 200, heightCm: inch(6, 0) },
  m55: { sex: "male", age: 55, weightLb: 260, heightCm: inch(5, 10) },
  f40: { sex: "female", age: 40, weightLb: 135, heightCm: inch(5, 5) },
};
const day = (u, goal, activity = 1.55, kcalAdj = 0) =>
  ctx.ffDayTargets({ ...u, activity, goal: GOALS[goal], kcalAdj, fatMinPct: FAT_MIN_PCT });

test("goal suggestion follows BMI: 30+ Lean Out, 27–30 hold weight, else Lean Bulk", () => {
  assert.equal(ctx.ffSuggestGoal(USERS.m30.weightLb, USERS.m30.heightCm), "leanbulk"); // BMI 22.8
  assert.equal(ctx.ffSuggestGoal(USERS.m45.weightLb, USERS.m45.heightCm), "maintain"); // BMI 27.1
  assert.equal(ctx.ffSuggestGoal(USERS.m55.weightLb, USERS.m55.heightCm), "cut");      // BMI 37.3
  assert.equal(ctx.ffSuggestGoal(USERS.f40.weightLb, USERS.f40.heightCm), "leanbulk"); // BMI 22.5
  assert.equal(ctx.ffSuggestGoal(0, 0), "leanbulk", "no body stats yet → the general default");
  // Boundaries: 27 and 30 belong to the higher band.
  const h = 180, lbAt = (bmi) => (bmi * (h / 100) ** 2) * 2.20462;
  assert.equal(ctx.ffSuggestGoal(lbAt(26.99), h), "leanbulk");
  assert.equal(ctx.ffSuggestGoal(lbAt(27.0) + 0.01, h), "maintain");
  assert.equal(ctx.ffSuggestGoal(lbAt(30.0) + 0.01, h), "cut");
  for (const key of new Set(Object.values(USERS).map((u) => ctx.ffSuggestGoal(u.weightLb, u.heightCm))))
    assert.ok(GOAL_KEYS.includes(key), "only stored goal keys are ever suggested");
});

test("a 260 lb, 5'10\" golfer is never steered into a surplus by default", () => {
  const g = ctx.ffSuggestGoal(USERS.m55.weightLb, USERS.m55.heightCm);
  assert.ok(GOALS[g].pct <= 0, `suggested ${g} must not be a surplus`);
  // Gain rates scale from the BMI-30 reference weight, not total weight.
  const ref = ctx.ffReferenceLb(USERS.m55.weightLb, USERS.m55.heightCm);
  assert.ok(ref < 215 && ref > 205);
  const hi = ctx.ffWeeklyLb(GOALS.leanbulk.weekly[1], USERS.m55.weightLb, USERS.m55.heightCm);
  assert.ok(hi < 1.1, `lean-bulk top rate ${hi} must come from the reference weight (was 1.3 lb/wk)`);
  // Losses keep the standard %-of-total-bodyweight band.
  assert.equal(ctx.ffWeeklyLb(GOALS.cut.weekly[0], 260, USERS.m55.heightCm), -2.6);
});

test("onboarding asks body first, preselects the suggestion, and never overrides a pick", () => {
  assert.match(onboarding, /Step 1 of 4 · Body & fuel/);
  assert.match(onboarding, /Step 2 of 4 · Outcome/);
  assert.ok(onboarding.indexOf("Step 1 of 4 · Body & fuel") < onboarding.indexOf("Step 2 of 4 · Outcome"));
  assert.match(onboarding, /goalPicked:!!seed/, "a re-run keeps the saved goal");
  assert.match(onboarding, /if\(!ob\.goalPicked\) ob\.goal=obSuggested\(\);/);
  assert.match(onboarding, /ob\.goal=b\.getAttribute\("data-goal"\); ob\.goalPicked=true;/);
  assert.match(onboarding, /return ffSuggestGoal\(\+ob\.weight\|\|0, hcm\);/);
  // "Best default" is no longer hard-wired to Lean Bulk — it follows the suggestion.
  assert.doesNotMatch(onboarding, /keep your swing mobile\. Best default\."/);
  assert.match(onboarding, /var best=\(g\.v===sug\);/);
  assert.match(onboarding, /Very muscular\? Lean Bulk is fine\./);
});

test("fat never drops under ~20% of calories, and the gram floors still hold", () => {
  for (const u of Object.values(USERS)) for (const goal of GOAL_KEYS) for (const act of ACTIVITY) {
    const d = day(u, goal, act), m = d.macro;
    const label = `${u.sex}${u.age} ${u.weightLb}lb ${goal} ×${act}`;
    assert.ok(m.fatKcal / m.target >= 0.199, `${label}: fat ${m.fatG} g is ${(m.fatKcal / m.target * 100).toFixed(1)}%`);
    const gramFloor = ctx.ffRound5(ctx.ffClamp(m.referenceLb * GOALS[goal].fatPerLb, 45, 100));
    assert.ok(m.fatG >= gramFloor, `${label}: below the g/lb fat floor`);
    assert.ok(m.carbG >= 0);
    assert.ok(Math.abs(m.proteinKcal + m.fatKcal + m.carbKcal - m.target) <= 10, `${label}: macros sum to the target (±5 g carb rounding)`);
  }
  // The worst case the audit found: 150 lb Bulk at Athlete (was 55 g = 13%).
  const worst = day(USERS.m30, "bulk", 1.9).macro;
  assert.ok(worst.fatG >= 80 && worst.fatKcal / worst.target >= 0.2);
});

test("the fat floor comes out of carbs and may pass the 100 g clamp", () => {
  const base = { weightLb: 180, heightCm: 177.8, targetKcal: 3175, proteinPerLb: 0.9, fatPerLb: 0.35 };
  const old = ctx.ffMacroTargets(base), now = ctx.ffMacroTargets({ ...base, fatMinPct: 0.2 });
  assert.equal(old.fatG, 65, "without fatMinPct the model is unchanged");
  assert.equal(now.fatG, 75, "ceil(3175 × 20% / 9) to the next 5 g");
  assert.equal(now.proteinG, old.proteinG, "protein never moves");
  assert.ok(now.carbG < old.carbG);
  assert.ok(Math.abs(now.target - old.target) <= 10, "the calorie target itself is unchanged");
  const big = ctx.ffMacroTargets({ weightLb: 500, heightCm: 240, targetKcal: 5500, proteinPerLb: 0.9, fatPerLb: 0.35, fatMinPct: 0.2 });
  assert.ok(big.fatG > 100 && big.fatKcal / big.target >= 0.2);
});

test("the post-workout meal gets at least main-meal protein at every slot", () => {
  for (const u of Object.values(USERS)) for (const goal of GOAL_KEYS) for (const slot of Object.keys(WORKOUT_SLOTS))
    for (const mealN of [MEALS_REC[goal], 3, 4, 5]) {
      const m = day(u, goal).macro;
      const p = ctx.ffMealPlan({ proteinG: m.proteinG, fatG: m.fatG, carbG: m.carbG, mealN, anchor: WORKOUT_SLOTS[slot].anchor, rest: false });
      const label = `${u.sex}${u.age} ${goal} ${slot} ${mealN} meals`;
      const post = p.meals.filter((x) => x.isPost);
      assert.equal(post.length, 1, label);
      const snacks = p.meals.filter((x) => !x.isPost && x.label === "Snack").map((x) => x.p);
      assert.ok(post[0].p >= Math.max(0, ...snacks), `${label}: post ${post[0].p} g < a plain snack`);
      const gPerKg = post[0].p / (m.referenceLb / 2.20462);
      assert.ok(gPerKg >= 0.35, `${label}: post-workout ${post[0].p} g = ${gPerKg.toFixed(2)} g/kg`);
      // Splits still sum exactly.
      const sum = (k) => p.meals.reduce((a, x) => a + x[k], 0) + (p.preMerged ? 0 : p.pre[k] || 0);
      assert.equal(sum("p"), m.proteinG, label);
      assert.equal(sum("f"), m.fatG, label);
      assert.equal(sum("c"), m.carbG, label);
    }
  // The audit's case: a 200 lb afternoon lifter's 5:30 PM "Snack" was 30 g.
  const m = day(USERS.m45, "leanbulk").macro;
  const p = ctx.ffMealPlan({ proteinG: m.proteinG, fatG: m.fatG, carbG: m.carbG, mealN: 4, anchor: 16, rest: false });
  const post = p.meals.find((x) => x.isPost);
  assert.equal(post.label, "Snack", "the clock label is unchanged");
  assert.ok(post.p >= 45, `afternoon post-workout protein ${post.p} g`);
  // A rest day keeps every meal plain.
  const rest = ctx.ffMealPlan({ proteinG: m.proteinG, fatG: m.fatG, carbG: m.carbG, mealN: 4, anchor: 16, rest: true });
  assert.ok(rest.preMerged && !rest.meals.some((x) => x.isPost || x.isPreMeal));
});

test("the calorie floor is truthful and a check-in trim it would swallow is never offered", () => {
  // 120 lb, 5'2", 60, sedentary Lean Out: the floor sets the number.
  const f60 = { sex: "female", age: 60, weightLb: 120, heightCm: inch(5, 2) };
  const d = ctx.ffDayTargets({ ...f60, activity: 1.2, goal: GOALS.cut, kcalAdj: 0, fatMinPct: FAT_MIN_PCT });
  assert.equal(d.macro.floored, true, "floored even though protein+fat lift it to 1205");
  assert.ok(d.macro.target >= 1200 && d.macro.target <= 1205);
  assert.equal(d.lo, 0, "no room to trim below the floor");
  // A −500 phantom left from earlier check-ins changes nothing and is ignored.
  const ph = ctx.ffDayTargets({ ...f60, activity: 1.2, goal: GOALS.cut, kcalAdj: -500, fatMinPct: FAT_MIN_PCT });
  assert.equal(ph.effAdj, 0);
  assert.equal(ph.macro.target, d.macro.target);
  // Losing slower than planned → the check-in wants a trim but has no room.
  const tr = { ratePerWeek: -0.15, se: 0.1, n: 14, days: 13 };
  const room = { down: d.effAdj - d.lo, up: d.hi - d.effAdj };
  const a = ctx.ffCheckin(tr, ctx.ffWeeklyLb(-0.0075, 120, f60.heightCm), room);
  assert.equal(a.onTrack, false);
  assert.equal(a.atLimit, true);
  assert.equal(a.deltaKcal, 0, "no −250 that would do nothing");
  // Partial room: only what can still come off is offered.
  const part = ctx.ffCheckin(tr, -0.9, { down: 120, up: 600 });
  assert.equal(part.deltaKcal, -100);
  // Up is capped at +600 total.
  const up = ctx.ffCheckin({ ratePerWeek: -2.5, se: 0.1, n: 14, days: 13 }, -0.9, { down: 600, up: 0 });
  assert.equal(up.atLimit, true);
  assert.equal(up.deltaKcal, 0);
});

test("Apply clamps to the usable range, so ff_kcal_adj never piles up", () => {
  assert.match(stats, /var nx=Math\.round\(ffClamp\(cur\+a\.deltaKcal, cb\?cb\.lo:-600, cb\?cb\.hi:600\)\);/);
  assert.match(stats, /var cur=cb\?cb\.effAdj:/);
  // Simulated: ten trims at the floor leave the stored value at the range bottom.
  const f60 = { sex: "female", age: 60, weightLb: 120, heightCm: inch(5, 2), activity: 1.2, goal: GOALS.cut, fatMinPct: FAT_MIN_PCT };
  let stored = 0;
  for (let i = 0; i < 10; i++) {
    const d = ctx.ffDayTargets({ ...f60, kcalAdj: stored });
    stored = ctx.ffClamp(d.effAdj - 250, d.lo, d.hi);
  }
  assert.equal(stored, 0);
});

test("a goal switch keeps the tuning but restarts the check-in window", () => {
  assert.match(calc, /function ffGoalSwitched\(prev\)\{\s*if\(prev && prev!==state\.goal\)\{ try\{ lsSet\("ff_lastcheckin", Date\.now\(\)\); \}/);
  assert.match(calc, /state\.goal=btn\.getAttribute\("data-goal"\); ffGoalSwitched\(prevGoal\);/);
  assert.match(onboarding, /if\(ob\.revisit\) ffGoalSwitched\(prevGoal\);/);
  assert.doesNotMatch(calc, /state\.goal=btn\.getAttribute\("data-goal"\);[^\n]*ff_kcal_adj", 0/);
  // A −600 carried from a cut onto Maintain: the label reads against tuned maintenance.
  const f60 = { sex: "female", age: 60, weightLb: 120, heightCm: inch(5, 2) };
  const d = ctx.ffDayTargets({ ...f60, activity: 1.375, goal: GOALS.maintain, kcalAdj: -600, fatMinPct: FAT_MIN_PCT });
  assert.ok(d.effAdj > -600 && d.effAdj < 0, `clamped to the floor room (${d.effAdj})`);
  const realPct = Math.round((d.macro.target / (d.tdee + d.effAdj) - 1) * 100);
  assert.equal(realPct, 0, "maintenance against the tuned figure, not −18%");
  // The hero labels from the real numbers.
  assert.match(calc, /var realPct=maint>0 \? Math\.round\(\(r\.target\/maint-1\)\*100\) : 0;/);
  assert.match(calc, /r\.floored \? r\.floorKcal\.toLocaleString\(\)\+" kcal minimum"/);
});

// --- Check-in noise --------------------------------------------------------
let seed = 20261001;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
function gauss() { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const DAY = 864e5;
function flagRate({ w0, trueRate, desired, days, every = 1, sigma = 1, runs = 2000 }) {
  let flags = 0;
  for (let r = 0; r < runs; r++) {
    const pts = [];
    for (let d = 0; d <= days; d += every) pts.push({ t: d * DAY, w: w0 + (trueRate * d) / 7 + sigma * gauss() });
    const tr = ctx.ffTrendFit(pts);
    assert.ok(tr, "a full window always fits");
    if (!ctx.ffCheckin(tr, desired, null).onTrack) flags++;
  }
  return flags / runs;
}

test("a trend needs 6+ weigh-ins over 12+ days — two points never move calories", () => {
  const two = [{ t: 0, w: 200 }, { t: 10 * DAY, w: 201 }];
  assert.equal(ctx.ffTrendFit(two), null);
  const five = [0, 3, 6, 9, 12].map((d) => ({ t: d * DAY, w: 150 }));
  assert.equal(ctx.ffTrendFit(five), null, "5 weigh-ins is not enough");
  const short = [0, 2, 4, 6, 8, 10].map((d) => ({ t: d * DAY, w: 150 }));
  assert.equal(ctx.ffTrendFit(short), null, "10 days is not enough");
  const ok = [0, 2, 5, 7, 10, 12].map((d) => ({ t: d * DAY, w: 150 + d / 7 }));
  const tr = ctx.ffTrendFit(ok);
  assert.ok(Math.abs(tr.ratePerWeek - 1) < 1e-9 && tr.se < 1e-6 && tr.n === 6 && tr.days === 12);
  // The UI reads the real window, never a fixed "~3-week trend".
  assert.doesNotMatch(checkinUi, /~3-week trend/);
  assert.match(checkinUi, /'Your '\+a\.days\+'-day trend \('\+a\.n\+' weigh-ins\)'/);
  assert.match(checkinUi, /return ffTrendFit\(pts\);/);
});

test("on-target weigh-ins with normal scale noise rarely trigger a change", () => {
  const maintain = flagRate({ w0: 200, trueRate: 0, desired: 0, days: 12 });
  const leanbulk = flagRate({ w0: 150, trueRate: 0.5625, desired: 0.5625, days: 12 });
  const twice = flagRate({ w0: 200, trueRate: 0, desired: 0, days: 14, every: 2 });
  assert.ok(maintain < 0.15, `maintain false flags ${maintain}`);   // was ~0.75–0.83
  assert.ok(leanbulk < 0.15, `lean bulk false flags ${leanbulk}`);  // was ~0.67
  assert.ok(twice < 0.15, `every-other-day weigh-ins ${twice}`);
});

test("a real drift is still caught", () => {
  const drift = flagRate({ w0: 200, trueRate: 1, desired: 0, days: 14 });
  const fast = flagRate({ w0: 200, trueRate: 1.5, desired: 0, days: 12 });
  assert.ok(drift > 0.5, `+1 lb/wk over 2 weeks flagged only ${drift}`);
  assert.ok(fast > 0.7, `+1.5 lb/wk flagged only ${fast}`);
});

test("the check-in corrects half the gap, in 50s, capped at ±250", () => {
  const at = (rate, desired, se = 0.05) => ctx.ffCheckin({ ratePerWeek: rate, se, n: 15, days: 14 }, desired, null);
  assert.equal(at(0.6, 0).deltaKcal, -150);   // 0.6 lb/wk ≈ 300 kcal/day → half
  assert.equal(at(-0.8, 0).deltaKcal, 200);
  assert.equal(at(2, 0).deltaKcal, -250);
  assert.equal(at(0.45, 0).onTrack, true, "under ½ lb/wk is noise on maintain");
  assert.equal(at(0.9, 0, 0.5).onTrack, true, "inside 2 standard errors");
  assert.equal(at(-0.2, -1.5).pace, "losing slower than planned");
  assert.equal(at(1, 0.5).pace, "gaining faster than planned");
});

test("the scale band copy has units and matches the check-in", () => {
  const band = balanced(calc, "function targetBand(");
  assert.doesNotMatch(band, /~100–150 carbs/, "no unitless carb advice");
  // The check-in corrects half the gap, capped at ±250 kcal (ffCheckin) — a
  // stalled Bulk / Cut gets 200–250, so the copy names the cap, not 100–150.
  assert.doesNotMatch(band, /100–150 kcal|25–40 g carbs/);
  assert.equal((band.match(/up to ~250 kcal \(about 60 g carbs\) a day, sized to how far off you are/g) || []).length, 2);
  assert.equal(ctx.ffCheckin({ ratePerWeek: 0, se: 0.05, n: 15, days: 14 }, -1.35, null).deltaKcal, -250);   // the cap the copy names
  assert.match(band, /more than ~½ lb\/week/);
  assert.doesNotMatch(band, /~1 lb\/week either way/);
  assert.match(band, /never below your daily minimum/);
});

// --- Fuel adherence --------------------------------------------------------
function fuelCtx(schedule) {
  const c = { Math, Array, Number, Object, ffSchedule: schedule };
  vm.runInNewContext(balanced(fuel, "function fuelSlotW("), c);
  vm.runInNewContext(balanced(fuel, "function ffFuelDayScore("), c);
  return c;
}
function scheduleFor(u, goal, anchor) {
  const m = day(u, goal).macro;
  const p = ctx.ffMealPlan({ proteinG: m.proteinG, fatG: m.fatG, carbG: m.carbG, mealN: MEALS_REC[goal], anchor, rest: false });
  return (p.preMerged ? p.meals.slice() : p.meals.concat([p.pre])).sort((a, b) => a.time - b.time)
    .map((f) => ({ kind: f.kind || "meal", label: f.label, p: f.p || 0, c: f.c || 0, f: f.f || 0 }));
}
const state = (sc) => (sc >= 0.85 ? "on" : sc >= 0.5 ? "close" : "off");

test("skipping only the carb-only pre-workout snack still scores 'on plan'", () => {
  for (const u of Object.values(USERS)) for (const goal of ["cut", "leanbulk"]) for (const anchor of [7, 12, 19]) {
    const sched = scheduleFor(u, goal, anchor);
    const preIdx = sched.findIndex((s) => s.kind === "pre");
    if (preIdx < 0) continue;
    const c = fuelCtx(sched);
    const w = c.fuelSlotW(), m = {};
    sched.forEach((_, i) => { if (i !== preIdx) m[i] = "a"; });
    const skipPre = c.ffFuelDayScore({ m, n: sched.length, w });
    assert.equal(state(skipPre), "on", `${goal} @${anchor}: every meal, no snack = ${skipPre.toFixed(2)}`);
    // Skipping dinner instead is a real miss.
    const dinner = sched.findIndex((s) => s.label === "Dinner");
    const m2 = {}; sched.forEach((_, i) => { if (i !== dinner) m2[i] = "a"; });
    const skipDinner = c.ffFuelDayScore({ m: m2, n: sched.length, w });
    assert.equal(state(skipDinner), "close", `${goal} @${anchor}: no dinner = ${skipDinner.toFixed(2)}`);
  }
});

test("older fuel days without slot weights keep the plain count", () => {
  const c = fuelCtx(null);
  assert.equal(c.fuelSlotW(), null);
  assert.equal(c.ffFuelDayScore({ m: { 0: "a", 1: "a", 2: "a" }, n: 4 }), 0.75);
  assert.equal(c.ffFuelDayScore({ m: { 0: "a", 1: "c" }, n: 2 }), 0.875);
  assert.equal(c.ffFuelDayScore({ m: { 0: "a" }, n: 2, w: [100] }), 0.5, "mismatched weights fall back");
  assert.equal(c.ffFuelDayScore({ rating: "close", m: {} }), 0.6);
  assert.equal(c.ffFuelDayScore({ m: {}, n: 4 }), null);
  assert.match(fuel, /d\.w=fuelSlotW\(\);/);
  assert.match(fuel, /function fuelScoreFor\(iso\)\{ return ffFuelDayScore\(fuelDay\(iso\)\); \}/);
});

// --- Review round 2 ----------------------------------------------------------
test("the tuning is whole kcal: no 'Tuned −81.07… kcal', and Apply stores integers", () => {
  const f60 = { sex: "female", age: 60, weightLb: 120, heightCm: inch(5, 2), fatMinPct: FAT_MIN_PCT };
  for (const goal of ["maintain", "cut", "leanbulk"]) for (const activity of ACTIVITY) for (const kcalAdj of [-600, -100, -31.07, 0, 250]) {
    const d = ctx.ffDayTargets({ ...f60, activity, goal: GOALS[goal], kcalAdj });
    assert.ok(Number.isInteger(d.lo) && Number.isInteger(d.effAdj), `${goal} ${activity} ${kcalAdj}: lo ${d.lo}, effAdj ${d.effAdj}`);
    assert.ok(d.baseTarget + d.lo >= d.floorKcal - 1e-9, "the range never reaches under the floor");
    for (const delta of [-250, -50, 50, 250]) {
      const nx = Math.round(ctx.ffClamp(d.effAdj + delta, d.lo, d.hi));
      assert.ok(Number.isInteger(nx) && nx >= d.lo && nx <= d.hi);
    }
  }
  // The reviewer's case: Maintain, sedentary, ff_kcal_adj −100 → a whole number.
  const m = ctx.ffDayTargets({ ...f60, activity: 1.2, goal: GOALS.maintain, kcalAdj: -100 });
  assert.equal(m.effAdj, Math.round(m.effAdj)); assert.ok(m.effAdj < 0 && m.effAdj > -100);
  assert.match(calc, /var adjNow=Math\.round\(r\.effAdj\|\|0\)/);
});

function checkinWorld(store, now) {
  if (store.__all) store.ff_body = store.__all.filter((e) => e.ts <= now);   // only weigh-ins made by `now`
  const c = { __store: store, Date: class extends Date { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } } };
  vm.runInNewContext(`function lsGet(k,d){ var v=__store[k]; return v==null?d:v; }
    function lsSet(k,v){ __store[k]=v; }`, c);
  vm.runInNewContext(model, c);
  for (const f of ["function weightTrend(", "function ffCheckinOkDay(", "function ffCheckinAck(", "function adaptiveDue("])
    vm.runInNewContext(balanced(checkinUi, f), c);
  return c;
}
test("'Got it' on an on-track check-in hides it 10 days but keeps the weigh-ins (windows merge)", () => {
  const DAY = 864e5, t0 = Date.UTC(2026, 8, 1, 12);
  const body = []; for (let d = 0; d <= 26; d += 2) body.push({ ts: t0 + d * DAY, w: String(150 + d * 0.01) });
  const store = { __all: body, ff_lastcheckin: 0, ff_insights_seen: ["spr:x"] };
  // Day 13: first look covers days 0–12.
  let w = checkinWorld(store, t0 + 13 * DAY);
  assert.equal(w.adaptiveDue(), true);
  assert.equal(w.weightTrend().n, 7);
  w.ffCheckinAck();
  assert.equal(store.ff_lastcheckin, 0, "an acknowledgment never restarts the window");
  assert.deepEqual(store.ff_insights_seen.filter((s) => !/^checkin-ok:/.test(s)), ["spr:x"]);
  assert.equal(checkinWorld(store, t0 + 20 * DAY).adaptiveDue(), false, "hidden for 10 days");
  // Day 27: due again, and the trend now spans BOTH windows.
  w = checkinWorld(store, t0 + 27 * DAY);
  assert.equal(w.adaptiveDue(), true);
  assert.equal(w.weightTrend().n, 14); assert.ok(w.weightTrend().days >= 26);
  w.ffCheckinAck();
  assert.equal(store.ff_insights_seen.filter((s) => /^checkin-ok:/.test(s)).length, 1, "one mark, replaced");
  // A calorie change still starts a fresh window.
  assert.match(stats, /if\(act==="ok"\) ffCheckinAck\(\);\s*else lsSet\("ff_lastcheckin", Date\.now\(\)\);/);
  assert.equal((checkinUi.match(/data-adapt="ok"/g) || []).length, 2, "on-track and at-limit cards");
  assert.match(checkinUi, /data-adapt="snooze">Not now/);
});

test("at the floor on Maintain, the card never suggests 'weeks at maintenance'", () => {
  const card = balanced(checkinUi, "function renderAdaptiveCard(");
  const html = (a) => {
    const c = { adaptiveDue: () => true, adaptiveCheck: () => a };
    vm.runInNewContext(card, c);
    return c.renderAdaptiveCard();
  };
  const base = { rate: 1, days: 14, n: 15, onTrack: false, atLimit: true, wantDown: true, pace: "drifting up", goalLabel: "In-Season Maintain", minKcal: 1200 };
  const maint = html({ ...base, desired: 0 });
  assert.doesNotMatch(maint, /at maintenance/); assert.match(maint, /Add a daily walk or more daily steps\./);
  const cut = html({ ...base, desired: -1, pace: "losing slower than planned", goalLabel: "Lean Out" });
  assert.match(cut, /take 2–4 weeks at maintenance before the next push/);
});

test("Lean Bulk copy names no fixed lb/week, and the goal help stays short", () => {
  const template = readFileSync(new URL("../src/index.template.html", import.meta.url), "utf8");
  assert.doesNotMatch(calc, /about 0\.5–1 lb for most/);
  assert.doesNotMatch(template, /about 0\.5–1 lb for most/);
  const help = template.slice(template.indexOf('<details class="goalhelp">'), template.indexOf("</details>", template.indexOf('<details class="goalhelp">')));
  const lean = help.slice(help.indexOf("<b>Lean Bulk"), help.indexOf("<br>"));
  assert.ok((lean.match(/[.?]/g) || []).length <= 4, lean);
  assert.match(lean, /Lean Out/);
});
