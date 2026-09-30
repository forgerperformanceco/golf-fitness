import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL("../src/js/app/024-macro-model.js", import.meta.url), "utf8"), context);
const targets = context.ffMacroTargets;

test("lean-bulk protein scales from body weight, not calorie percentage", () => {
  const out = targets({ weightLb: 180, heightCm: 177.8, targetKcal: 3175,
    proteinPerLb: 0.9, fatPerLb: 0.35 });
  assert.equal(out.proteinG, 160);
  assert.equal(out.fatG, 65);
  assert.equal(out.carbG, 490);
});

test("reference weight caps extreme total body weight", () => {
  const out = targets({ weightLb: 500, heightCm: 177.8, targetKcal: 3500,
    proteinPerLb: 0.9, fatPerLb: 0.35 });
  assert.ok(out.referenceLb < 210);
  assert.ok(out.proteinG <= 190);
});

test("fat target respects practical clamps", () => {
  assert.equal(targets({ weightLb: 60, heightCm: 150, targetKcal: 1800,
    proteinPerLb: 0.9, fatPerLb: 0.3 }).fatG, 45);
  assert.equal(targets({ weightLb: 500, heightCm: 240, targetKcal: 5000,
    proteinPerLb: 0.9, fatPerLb: 0.35 }).fatG, 100);
});

test("calorie target never drops below the safety floor or protein+fat", () => {
  const small = targets({ weightLb: 115, heightCm: 157, targetKcal: 1150, kcalAdj: -600,
    proteinPerLb: 1.0, fatPerLb: 0.3, floorKcal: 1200 });
  assert.ok(small.target >= 1200 && small.target <= 1205);
  assert.equal(small.target >= small.proteinKcal + small.fatKcal, true);
  const noFloor = targets({ weightLb: 115, heightCm: 157, targetKcal: 700, proteinPerLb: 1.0, fatPerLb: 0.3 });
  assert.ok(noFloor.target >= noFloor.proteinKcal + noFloor.fatKcal);
});
