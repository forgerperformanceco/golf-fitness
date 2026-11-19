import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// Owner, Nov 2026: "Need to make sure when I check a set without changing it from last time that it
// logs. The text is never lit and still low lit." An empty set shows a dim suggestion (today's
// prescribed load / last time's reps). Ticking it untouched must SAVE those numbers — on all three
// logging surfaces — so the set logs and the text lights up. One "ghost" read per surface feeds both
// the placeholder and the ✓, so what's saved is exactly what was on screen.
const src = (f) => readFileSync(new URL(`../src/js/app/${f}`, import.meta.url), "utf8");
const PLAYER = src("070-workout-player-full-screen-guided-sessio.js");
const LOGGER = src("040-workout-logger.js");
const INLINE = src("045-inline-logger-log-as-you-train-in-the-ca.js");
const STATS = src("085-progress-stats-view.js");
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
const helpers = ["repsShifted", "topReps", "repSeed", "isDistEx"].map((n) => fn(LOGGER, n)).join("\n");
const base = (extra = {}) => ({ isBodyweightEx: (n) => /Box Jump|Push-up/.test(n), ...extra });
const empty = (n) => Array.from({ length: n }, () => ({ w: "", r: "", done: false }));
const LAST = { target: "4 × 6", sets: [{ w: "185", r: "6" }, { w: "185", r: "6" }, { w: "185", r: "5" }] };

test("player: an untouched set ghosts today's load + last reps, and that's what ✓ saves", () => {
  const ctx = base(); vm.runInNewContext(helpers + "\n" + fn(PLAYER, "plGhost"), ctx);
  const x = { name: "Deadlift", target: "4 × 6", sets: empty(3) };
  assert.deepEqual({ ...ctx.plGhost(x, 0, LAST, 190) }, { w: "190", r: "6" }, "prescribed load leads, last reps");
  assert.deepEqual({ ...ctx.plGhost(x, 2, LAST, null) }, { w: "185", r: "5" }, "no prescription → last time's set");
  x.sets[0].w = "195"; x.sets[0].r = "5";
  assert.deepEqual({ ...ctx.plGhost(x, 1, LAST, 190) }, { w: "195", r: "5" }, "an earlier set this session carries forward");
  assert.deepEqual({ ...ctx.plGhost({ name: "Deadlift", target: "4 × 8", sets: empty(3) }, 0, LAST, 175) }, { w: "175", r: "8" },
    "a changed rep target ghosts today's reps");
  assert.deepEqual({ ...ctx.plGhost({ name: "Box Jump", target: "4 × 3", sets: empty(2) }, 0, { target: "4 × 3", sets: [{ w: "", r: "3" }] }, null) },
    { w: "", r: "3" }, "bodyweight: never a weight");
  assert.deepEqual({ ...ctx.plGhost({ name: "Deadlift", target: "4 × 6", sets: empty(2) }, 0, null, null) }, { w: "", r: "" },
    "nothing known → nothing invented (the placeholder shows a word)");
  const render = PLAYER.slice(PLAYER.indexOf("var setsHtml=x.sets.map("), PLAYER.indexOf("setsHtml+='<div class=\"pl-setops\">'"));
  assert.match(render, /var g=plGhost\(x, si, lx, presc\)/, "the placeholder reads the ghost");
  const check = PLAYER.slice(PLAYER.indexOf('var ck=e.target.closest("[data-plcheck]");'), PLAYER.indexOf("// Live PR moment"));
  assert.match(check, /plGhost\(x2, si2,/, "✓ saves the ghost");
  assert.match(check, /if\(!s3\.w && g3\.w\) s3\.w=g3\.w;\s*if\(!s3\.r && g3\.r\) s3\.r=g3\.r;/);
});

test("logger window: ✓ on an untouched set saves the load and reps it shows", () => {
  const ctx = base({ ffDose: (w) => ({ w: w ? +w + 5 : null }) });
  vm.runInNewContext(helpers + "\n" + fn(LOGGER, "logGhost"), ctx);
  const x = { name: "Deadlift", target: "4 × 6", sets: empty(3) };
  assert.deepEqual({ ...ctx.logGhost(x, LAST, 0, 3, {}) }, { w: "190", r: "6" }, "the dosed load (last + a jump) and last reps");
  assert.deepEqual({ ...ctx.logGhost(x, null, 0, 3, {}) }, { w: "", r: "" });
  assert.match(fn(LOGGER, "renderLogBody"), /var g=logGhost\(x, lx, si, week, s\)/);
  const h = LOGGER.slice(LOGGER.indexOf('var dn=e.target.closest("[data-done]");'), LOGGER.indexOf('var ad=e.target.closest("[data-add]");'));
  assert.match(h, /logGhost\(/); assert.match(h, /if\(!st\.w && g\.w\) st\.w=g\.w;\s*if\(!st\.r && g\.r\) st\.r=g\.r;/);
});

test("inline Train logger: ✓ on an untouched set saves the load and reps it shows", () => {
  const ctx = base({ ffDose: (w) => ({ w: w ? +w + 5 : null }) });
  vm.runInNewContext(helpers + "\n" + fn(INLINE, "ilGhost"), ctx);
  const x = { name: "Deadlift", target: "4 × 6", sets: empty(3) };
  assert.deepEqual({ ...ctx.ilGhost(x, LAST, 1, 3, {}) }, { w: "190", r: "6" });
  assert.deepEqual({ ...ctx.ilGhost({ name: "Box Jump", target: "4 × 3", sets: empty(1) }, { target: "4 × 3", sets: [{ r: "3" }] }, 0, 3, {}) }, { w: "", r: "3" });
  assert.match(fn(INLINE, "ilogBodyHtml"), /var g=ilGhost\(x, lx, si, week, s\)/);
  const h = STATS.slice(STATS.indexOf('var idn=e.target.closest("[data-idone]");'), STATS.indexOf('var iad=e.target.closest("[data-iadd]");'));
  assert.match(h, /ilGhost\(/); assert.match(h, /if\(!st\.w && g\.w\) st\.w=g\.w;\s*if\(!st\.r && g\.r\) st\.r=g\.r;/);
});
