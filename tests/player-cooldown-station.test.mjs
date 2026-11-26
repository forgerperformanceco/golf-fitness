import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// Owner, Nov 2026: "Can you show me the cooldown after the workout when I'm still in it?"
// The cool-down sat on the recap under "Session complete", where it read as already over.
// It is now its own station after the last lift: warm-up → primer → lifts → cool-down → recap.
const src = (f) => readFileSync(new URL(`../src/js/app/${f}`, import.meta.url), "utf8");
const PLAYER = src("070-workout-player-full-screen-guided-sessio.js"), HIST = src("050-exercise-history-every-lift-s-full-story.js");
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
vm.runInNewContext(fn(PLAYER, "plStations") + "\n" + fn(PLAYER, "plLiftBase"), ctx);
const sess = { ex: [{ name: "Deadlift" }, { name: "Hip Thrust" }, { name: "Dead Hang" }] };

test("the cool-down is its own station, after the last lift and before the recap", () => {
  const types = (d) => Array.from(ctx.plStations(d, sess), (s) => s.type + (s.xi != null ? s.xi : ""));
  assert.deepEqual(types({ type: "lift" }), ["warmup", "primer", "lift0", "lift1", "lift2", "cooldown", "recap"]);
  assert.deepEqual(types({ type: "speed" }), ["warmup", "lift0", "lift1", "lift2", "cooldown", "recap"], "speed day too (its own cool-down)");
  assert.equal(ctx.plLiftBase({ type: "lift" }), 2, "lifts still start at the same index");
});

test("start, reorder and add-a-lift all build the stations in one place", () => {
  assert.match(fn(PLAYER, "startPlayer"), /var stations=plStations\(day, sess\);/);
  assert.match(fn(PLAYER, "plRebuildStations"), /player\.stations=plStations\(player\.day, player\.sess\);/);
  assert.doesNotMatch(PLAYER, /stations\.push\(\{type:"recap"\}\)/, "no second hand-built list");
  const add = fn(HIST, "addLiftChoice");
  assert.match(add, /plRebuildStations\(player\.sess\.ex\[player\.sess\.ex\.length-1\]\);/, "an added lift goes before the cool-down");
  assert.doesNotMatch(add, /stations\.splice/);
  // Every set done but not finished → you're cooling down: land there, Finish is one more tap.
  assert.match(fn(PLAYER, "startPlayer"), /player\.st=stations\.length-2;/);
});

test("the cool-down station: checklist with how-to cues; the recap keeps a one-tap link back", () => {
  const html = fn(PLAYER, "plStationHtml");
  const cd = html.slice(html.indexOf('if(st.type==="cooldown")'), html.indexOf('if(st.type==="primer")'));
  assert.match(cd, /Last station · Cool-down — keep your turn/);
  assert.match(cd, /data-plcd="'\+i\+'"/); assert.match(cd, /plCueHtml\(m\[0\]\)/);
  assert.match(fn(PLAYER, "plStationDone"), /if\(st\.type==="cooldown"\) return Object\.keys\(player\.cdDone\|\|\{\}\)\.length>=plCdList\(\)\.length;/);
  const recap = html.slice(html.indexOf("// recap"));
  assert.match(recap, /plCdRecapHtml\(\)/); assert.doesNotMatch(recap, /data-plcd=/, "the list lives on its station, not the recap");
  assert.match(fn(PLAYER, "plCdRecapHtml"), /data-plgocd="1"/);
  assert.match(PLAYER, /if\(e\.target\.closest\("\[data-plgocd\]"\)\)\{[\s\S]{0,160}type==="cooldown"\)\{ player\.st=gi;/);
});

// Owner, Nov 2026 ("I don't love the flow of the day"): the order you run a day in carries to
// next week (040 ffDayRows); the reorder sheet says so and can put the plan's order back.
test("reorder sheet: the order sticks, and one tap restores the plan's order", () => {
  const sheet = fn(PLAYER, "openReorder");
  assert.match(sheet, /Next time this day starts in your order too\./);
  // Review: the speed day keeps its own order (freshest moves first), so there it's "just for today",
  // and the reset sorts by the speed day's drill list (it was a no-op: speed days have no ex rows).
  assert.match(sheet, /player\.day\.type==="speed"\s*\?\s*"Just for today: the speed day keeps its order, freshest and fastest moves first\."/);
  assert.match(fn(PLAYER, "plOrdPlan"), /type==="speed"\) return speedRows\(\)\.map\(function\(e\)\{ return e\[3\]\|\|e\[0\]; \}\)/);
  assert.match(sheet, /id="plOrdReset">↺ Back to the plan’s order</);
  const reset = sheet.slice(sheet.indexOf('closest("#plOrdReset")'), sheet.indexOf('var mv=e.target.closest("[data-ordmv]")'));
  assert.match(reset, /var plan=plOrdPlan\(\);/, "the plan's rows (or the speed list), by slot");
  assert.match(reset, /x\.orig\|\|x\.name/);
  assert.match(reset, /\(slot\(a\.x\)-slot\(b\.x\)\) \|\| \(a\.i-b\.i\)/, "added lifts keep their order after the plan's");
  assert.match(reset, /plRebuildStations\(keep0\); plSave\(\); plRender\(\);/, "the player follows the lift you were on, and it saves");
});
