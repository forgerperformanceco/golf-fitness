import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const onboarding = readFileSync(
  new URL("../src/js/app/090-first-run-onboarding.js", import.meta.url),
  "utf8"
);
const persistence = readFileSync(
  new URL("../src/js/app/020-persistence-remember-everything-per-devi.js", import.meta.url),
  "utf8"
);
const training = readFileSync(
  new URL("../src/js/app/035-training-plan.js", import.meta.url),
  "utf8"
);
const account = readFileSync(
  new URL("../src/js/app/080-game-day-round-day-fueling-warm-up-plan.js", import.meta.url),
  "utf8"
);

test("onboarding is four focused decisions followed by a personalized reveal", () => {
  assert.match(onboarding, /total:6/);
  assert.match(onboarding, /Step 1 of 4 · Outcome/);
  assert.match(onboarding, /Step 4 of 4 · Starting line/);
  assert.match(onboarding, /YOUR FIRST WEEK/);
  assert.match(onboarding, /Why this fits:/);
  assert.doesNotMatch(onboarding, /Step 6 of 7 · Your foods/);
  assert.doesNotMatch(onboarding, /ffPickerHtml\(ob\.prefs\)/);
});

test("the reveal makes mission, baseline, fuel, schedule, and equipment tangible", () => {
  assert.match(onboarding, /MISSION/);
  assert.match(onboarding, /BASELINE/);
  assert.match(onboarding, /kcal \/ day/);
  assert.match(onboarding, /sessionMinutes\(d\)/);
  assert.match(onboarding, /equipLabel/);
  assert.match(onboarding, /guided test waiting/);
});

test("re-personalizing never restarts an active plan", () => {
  assert.match(onboarding, /hadPlan:!!planStart\(\)/);
  assert.match(onboarding, /if\(!ob\.hadPlan\)\{ try\{ startPlanAtWeek\(1\)/);
  assert.match(onboarding, /completed sessions and current week stay exactly where they are/);
  assert.match(account, /Re-personalize my plan/);
  assert.match(account, /without resetting your current week or completed sessions/);
});

test("optional extra-prep choices persist and adapt relevant warm-ups", () => {
  assert.match(onboarding, /data-prep=/);
  assert.match(onboarding, /not a diagnosis/);
  assert.match(persistence, /prep:\(state\.prep\|\|\[\]\)\.slice\(\)/);
  assert.match(persistence, /state\.prep=Array\.isArray\(data\.prep\)/);
  assert.match(training, /prep\.indexOf\("back"\)/);
  assert.match(training, /prep\.indexOf\("hips"\)/);
  assert.match(training, /prep\.indexOf\("shoulders"\)/);
  assert.match(training, /prep\.indexOf\("knees"\)/);
  assert.match(training, /from-profile/);
});

test("baseline logging uses the shared daily deduping writer", () => {
  assert.match(onboarding, /logBodyEntry\(ob\.weight\|\|""/);
  assert.doesNotMatch(onboarding, /body\.push\(\{ date:todayStr\(\)/);
});
