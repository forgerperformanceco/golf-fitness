import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// Fuel's protein choice (Nov 2026, owner: "I've always at least done 1g per 1lb … add the 1g per lb
// option"). The plan's per-goal g/lb (0.85 maintain, 0.9 build, 1.0 lean out) is already past where
// muscle gains level off (Morton 2018: ~1.6 g/kg ≈ 0.73 g/lb, CI to ~2.2 g/kg ≈ 1 g/lb), and 1 g/lb is
// a safe, common choice. Picking it raises protein to 1 g per lb of reference weight; the calories
// come out of carbs, so the day's total and fat stay put.
const src = (f) => readFileSync(new URL(`../src/js/app/${f}`, import.meta.url), "utf8");
const MODEL = src("024-macro-model.js"), CALC = src("025-macro-calculator.js"), PERSIST = src("020-persistence-remember-everything-per-devi.js");
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
function model() {
  const ctx = {};
  vm.runInNewContext(["ffRound5", "ffClamp", "ffBmi", "ffReferenceLb", "ffAdjRange", "ffMacroTargets", "ffProteinPerLb", "ffDayTargets"]
    .map((n) => fn(MODEL, n)).join("\n"), ctx);
  return ctx;
}
const GOALS = { maintain: { pct: 0, proteinPerLb: 0.85, fatPerLb: 0.35 }, leanbulk: { pct: 0.1, proteinPerLb: 0.9, fatPerLb: 0.35 },
  cut: { pct: -0.2, proteinPerLb: 1.0, fatPerLb: 0.3 } };
const ME = { sex: "male", age: 34, weightLb: 159, heightCm: 178, activity: 1.55, kcalAdj: 0, fatMinPct: 0.2 };

test("the choice: plan = the goal's g/lb; 1 g/lb lifts it to at least 1, never lowers a goal already there", () => {
  const { ffProteinPerLb } = model();
  assert.equal(ffProteinPerLb(GOALS.maintain, "plan"), 0.85);
  assert.equal(ffProteinPerLb(GOALS.maintain, undefined), 0.85, "no choice saved → the plan");
  assert.equal(ffProteinPerLb(GOALS.maintain, "1lb"), 1);
  assert.equal(ffProteinPerLb(GOALS.leanbulk, "1lb"), 1);
  assert.equal(ffProteinPerLb(GOALS.cut, "1lb"), 1, "Lean Out is already 1 g/lb");
  assert.equal(ffProteinPerLb({ proteinPerLb: 1.1 }, "1lb"), 1.1, "never lowers a higher goal value");
  assert.equal(ffProteinPerLb(GOALS.maintain, "junk"), 0.85, "an unknown value reads as the plan");
});

test("1 g/lb: protein up, carbs pay for it, total calories and fat unchanged", () => {
  const { ffDayTargets } = model();
  for (const goal of [GOALS.maintain, GOALS.leanbulk]) {
    const plan = ffDayTargets({ ...ME, goal }).macro, one = ffDayTargets({ ...ME, goal, protein: "1lb" }).macro;
    assert.equal(one.proteinG, 160, "1 g × 159 lb, rounded to 5");
    assert.ok(plan.proteinG < one.proteinG);
    assert.equal(one.fatG, plan.fatG, "fat unchanged");
    assert.equal(one.target, plan.target, "calories unchanged");
    const extra = (one.proteinG - plan.proteinG) * 4;
    assert.ok(Math.abs((plan.carbG - one.carbG) * 4 - extra) <= 20, `carbs pay for the extra protein (${plan.carbG} → ${one.carbG} g)`);
  }
  const cutPlan = ffDayTargets({ ...ME, goal: GOALS.cut }).macro, cutOne = ffDayTargets({ ...ME, goal: GOALS.cut, protein: "1lb" }).macro;
  assert.deepEqual([cutOne.proteinG, cutOne.carbG], [cutPlan.proteinG, cutPlan.carbG], "Lean Out: no change");
  // BMI 30+: protein still scales from the BMI-30 reference weight (never from fat mass).
  const big = ffDayTargets({ ...ME, weightLb: 300, heightCm: 175, goal: GOALS.maintain, protein: "1lb" });
  assert.equal(big.macro.proteinG, Math.round(big.macro.referenceLb / 5) * 5);
  assert.ok(big.macro.referenceLb < 300);
  // The check-in's carb preview reuses macroIn, so it sees the same protein.
  assert.equal(ffDayTargets({ ...ME, goal: GOALS.maintain, protein: "1lb" }).macroIn.proteinPerLb, 1);
});

test("Fuel: the choice sits under Meals per day, saves with the profile, and roams", () => {
  assert.match(fn(CALC, "calc"), /protein:state\.protein/, "calc passes the choice in");
  assert.match(CALC, /data-protein="1lb"/);
  assert.match(CALC, /var b2=e\.target\.closest\("\[data-protein\]"\);\s*if\(b2\)\{ state\.protein=b2\.getAttribute\("data-protein"\)==="1lb" \? "1lb" : "plan"; calc\(\); return; \}/);
  assert.match(fn(PERSIST, "persist"), /protein:\(state\.protein==="1lb"\?"1lb":"plan"\)/, "saved in the fairwayfuel profile (already roams)");
  assert.match(fn(PERSIST, "restore"), /if\(data\.protein==="1lb" \|\| data\.protein==="plan"\) state\.protein=data\.protein;/);
  assert.match(CALC, /The extra comes out of carbs/);
});

// ---- Codex #132: reset and share links know about the choice ----
function shareCtx({ protein = "plan", search = "", saved = null } = {}) {
  const fields = { age: "34", weight: "186", heightFt: "5", heightIn: "11", activity: "1.55" };
  const ctx = {
    URLSearchParams, state: { sex: "male", goal: "maintain", workout: "morning", meals: 4, protein },
    location: { origin: "https://x", pathname: "/", search, hash: "" }, history: { state: null, replaceState() {} },
    $: (id) => (id in fields ? { value: fields[id], options: [{ value: "1.55" }] } : null),
    lsGet: () => saved, setTimeout() {}, ffToast() {}, ffSyncSegs() {},
    GOALS: { maintain: {}, leanbulk: {}, cut: {}, bulk: {} }, WORKOUT_SLOTS: { morning: {} },
  };
  const vars = [CALC.match(/var SHARE_KEYS = \{[\s\S]*?\};/)[0], CALC.match(/var SHARE_RANGE = \{[^}]*\};/)[0]].join("\n");
  vm.runInNewContext(vars + "\n" + ["ffHas", "ffActivityOk", "buildShareURL", "applyShareParams", "ffSanitizeState"].map((n) => fn(CALC, n)).join("\n"), ctx);
  return ctx;
}
test("Codex #132: the plan link carries 1 g/lb, and a new visitor opening it gets it", () => {
  const url = shareCtx({ protein: "1lb" }).buildShareURL();
  assert.match(url, /[?&]pr=1lb(&|$)/);
  assert.doesNotMatch(shareCtx({ protein: "plan" }).buildShareURL(), /pr=/, "the default adds nothing");
  const fresh = shareCtx({ search: "?" + url.split("?")[1] });
  fresh.state.protein = "plan";
  assert.equal(fresh.applyShareParams(), true);
  assert.equal(fresh.state.protein, "1lb", "the visitor sees the same protein and carbs");
  const odd = shareCtx({ search: "?g=maintain&pr=lots" }); odd.state.protein = "plan"; odd.applyShareParams();
  assert.equal(odd.state.protein, "plan", "an unknown value is ignored");
  const mine = shareCtx({ search: "?g=cut&pr=1lb", saved: { goal: "leanbulk" } }); mine.state.protein = "plan";
  assert.equal(mine.applyShareParams(), false); assert.equal(mine.state.protein, "plan", "never overwrites a saved profile");
  const bad = shareCtx({ protein: "weird" }); bad.ffSanitizeState();
  assert.equal(bad.state.protein, "plan", "sanitize: anything else reads as the plan");
});

test("Codex #132: resetting the calculator clears the protein choice with the rest", () => {
  const reset = CALC.slice(CALC.indexOf('$("resetBtn").addEventListener'), CALC.indexOf("// ---- Shareable plan link"));
  const list = JSON.parse(reset.match(/\[("[a-zA-Z]+",?)+\]/)[0]);
  assert.ok(list.includes("protein") && list.includes("meals"), JSON.stringify(list));
});
