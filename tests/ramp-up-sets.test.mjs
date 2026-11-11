import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// Nov 2026, owner (screenshot of the player's Station 1): "Can't have warmup reps here
// cause we haven't started yet." The opening warm-up said "Light ramp-up sets — about half
// your working weight for 10…" before any lift or weight was on screen. Ramp-up sets now
// sit on the first loaded lift, with today's numbers.
const src = (f) => readFileSync(new URL(`../src/js/app/${f}`, import.meta.url), "utf8");
const PLAN = src("035-training-plan.js"), PLAYER = src("070-workout-player-full-screen-guided-sessio.js");
const INLINE = src("045-inline-logger-log-as-you-train-in-the-ca.js");
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
const ctx = {};
vm.runInNewContext(["isBarbell", "isBodyweightEx", "purposeFor", "ffRampSets", "ffRampIndex", "warmupBase"]
  .map((n) => fn(n === "isBarbell" ? INLINE : (n.startsWith("ffRamp") ? PLAYER : PLAN), n)).join("\n"), ctx);

test("no lift day's opening warm-up asks for ramp-up sets (there's no weight yet)", () => {
  for (const d of ["Day 1 — Lower (Quads)", "Day 2 — Upper (Push)", "Day 4 — Lower (Hinge + Power)",
    "Day 5 — Upper (Pull + Rotate)", "Day 1 — Full Body A (Squat + Press)", "anything else"]) {
    assert.ok(!ctx.warmupBase(d).some((m) => /ramp/i.test(m[0])), d);
  }
  assert.ok(ctx.warmupBase("speed").some((m) => /Ramp-up jumps and throws/.test(m[0])), "the speed day's easy jumps stay");
});

test("ramp-up sets: ~50% × 10 then ~75% × 5 of today's weight, nearest 5 lb, never under the empty bar", () => {
  const j = (x) => JSON.parse(JSON.stringify(x));
  assert.deepEqual(j(ctx.ffRampSets("Barbell Bench Press", 135)), [{ r: 10, w: 70 }, { r: 5, w: 100 }]);
  assert.deepEqual(j(ctx.ffRampSets("Deadlift", 225)), [{ r: 10, w: 115 }, { r: 5, w: 170 }]);
  assert.deepEqual(j(ctx.ffRampSets("Barbell Bench Press", 65)), [{ r: 10, w: 45 }, { r: 5, w: 50 }], "empty bar floor");
  assert.deepEqual(j(ctx.ffRampSets("Dumbbell Bench Press", 50)), [{ r: 10, w: 25 }, { r: 5, w: 40 }]);
  assert.equal(ctx.ffRampSets("Barbell Bench Press", 45), null, "the bar alone: nothing to ramp");
  assert.equal(ctx.ffRampSets("Dumbbell Curl", 10), null, "too light to ramp");
  assert.equal(ctx.ffRampSets("Deadlift", null), null, "no weight yet");
});

test("the ramp goes on the first main lift: past the opening accessory, throws and jumps; never a pull-up", () => {
  const ex = (...n) => n.map((name) => ({ name }));
  assert.equal(ctx.ffRampIndex(ex("Seated Leg Curl", "Deadlift", "Hip Thrust")), 1, "the Hinge day: the Deadlift");
  assert.equal(ctx.ffRampIndex(ex("Med Ball Chest Pass", "Box Jump", "Barbell Bench Press", "Overhead Press")), 2);
  assert.equal(ctx.ffRampIndex(ex("Pull-up", "Lat Pulldown", "Dumbbell Curl")), -1, "no main loaded lift: no ramp");
  assert.equal(ctx.ffRampIndex(ex("Box Jump")), -1);
  assert.match(fn(PLAYER, "plRampHtml"), /xi!==ffRampIndex\(player\.sess\.ex\) \|\| x\.sets\.some\(function\(s\)\{ return s\.done; \}\)/,
    "only that lift, and only until its first set is ticked");
});
