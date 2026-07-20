import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../src/index.template.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/css/styles.css", import.meta.url), "utf8");
const fuel = readFileSync(new URL("../src/js/app/030-fuel-check-off-adherence-not-accounting.js", import.meta.url), "utf8");
const calculator = readFileSync(new URL("../src/js/app/025-macro-calculator.js", import.meta.url), "utf8");
const train = readFileSync(new URL("../src/js/app/035-training-plan.js", import.meta.url), "utf8");

test("Fuel leads with daily execution and keeps target math collapsed", () => {
  assert.ok(html.indexOf('id="fuelToday"') < html.indexOf('id="fuelTargetsFold"'));
  assert.match(html, /<details class="card fuel-targets" id="fuelTargetsFold">/);
  assert.doesNotMatch(html, /id="fuelTargetsFold"[^>]*\sopen(?:\s|>)/);
  assert.match(css, /\.fuel-meals-card\{ order:1;/);
  assert.match(css, /\.fuel-targets\{ order:2;/);
  assert.match(calculator, /var calcCollapsed = true;/);
});

test("Fuel command card includes the whole remaining-day picture", () => {
  assert.match(fuel, /remP=0, remC=0, remF=0, remK=0/);
  assert.match(fuel, /kcal left/);
  assert.match(fuel, /protein/);
  assert.match(fuel, /carbs/);
  assert.match(fuel, /fat/);
  assert.match(fuel, /data-fueljump/);
});

test("Train puts the next action ahead of methodology", () => {
  assert.match(html, /<details class="plan-intro train-method">/);
  assert.match(css, /#view-plan:not\(\.started\) #phaseDetail \{ order:0;/);
  assert.match(train, /class="train-today-cta" data-startplayer/);
  assert.match(train, /TODAY’S WORKOUT · ~/);
  assert.match(train, /function sessionMinutes\(d\)/);
});
