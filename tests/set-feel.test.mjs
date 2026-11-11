import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// "How did the last set feel?" — where the player asks it. The rule it feeds
// (a Grind holds the weight) is in training-engine.test.mjs.
const src = (f) => readFileSync(new URL(`../src/js/app/${f}`, import.meta.url), "utf8");
const PLAN = src("035-training-plan.js"), PLAYER = src("070-workout-player-full-screen-guided-sessio.js");
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
const ctx = { incNum: (n) => (/Med Ball/.test(n) ? 0 : 5) };
vm.runInNewContext(PLAYER.match(/var PL_FEEL=[^\n]*\n/)[0] +
  ["isBodyweightEx", "purposeFor", "isBallistic"].map((n) => fn(PLAN, n)).join("\n") + "\n" + fn(PLAYER, "plFeelHtml"), ctx);
const lift = (name, sets) => ({ name, sets });
const done = (w) => ({ w: String(w), r: "4", done: true });

test("asked once every set of a loaded lift is ticked — not before", () => {
  assert.equal(ctx.plFeelHtml(lift("Deadlift", [done(225), { w: "", r: "", done: false }])), "");
  const h = ctx.plFeelHtml(lift("Deadlift", [done(225), done(225)]));
  assert.match(h, /How did the last set feel\?/);
  for (const k of ["easy", "solid", "grind"]) assert.match(h, new RegExp(`data-plfeel="${k}"`));
  assert.match(h, /Easy<\/b><span>3\+ reps left/); assert.match(h, /Grind<\/b><span>nothing left/);
});

test("never for throws, jumps, bodyweight drills or a set with no weight", () => {
  for (const n of ["Med Ball Rotational Throw", "Box Jump", "Lateral Bound"]) assert.equal(ctx.plFeelHtml(lift(n, [done(10)])), "", n);
  assert.equal(ctx.plFeelHtml(lift("Deadlift", [{ w: "", r: "8", done: true }])), "", "no weight logged");
});

test("the pick shows, and says what it means", () => {
  const g = ctx.plFeelHtml({ ...lift("Deadlift", [done(225)]), feel: "grind" });
  assert.match(g, /class="pl-feel-b on" data-plfeel="grind" aria-pressed="true"/);
  assert.match(g, /Next time holds this weight so you can own every rep/);
  assert.match(PLAYER, /if\(xf\.feel===v\) delete xf\.feel; else xf\.feel=v;/, "tap again to clear");
  assert.match(PLAYER, /dose\.grind \? '💪 Last time was a grind at <b>'\+topLast\+' lb<\/b>\. Hold it and own every rep\.'/);
});
