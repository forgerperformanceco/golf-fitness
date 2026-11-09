import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// Haptics (Nov 2026): ffTick uses the native Haptics plugin inside the Capacitor
// shell (real Taptic taps on iPhone), navigator.vibrate in a browser, nothing
// under reduced motion. The week drag buzzes on lift, ticks per day, taps on land.
const src = (f) => readFileSync(new URL(`../src/js/app/${f}`, import.meta.url), "utf8");
const MOTION = src("007-motion.js");
const DRAG = src("042-week-drag-hold-a-day-to-move-it.js");
function fn(source, name) {
  const i = source.indexOf("function " + name + "(");
  assert.ok(i >= 0, name);
  let d = 0;
  for (let k = source.indexOf("{", i); k < source.length; k++) {
    if (source[k] === "{") d++;
    else if (source[k] === "}" && --d === 0) return source.slice(i, k + 1);
  }
}
function tick({ native = false, reduced = false, reject = false } = {}) {
  const calls = [];
  const window = { matchMedia: () => ({ matches: reduced }) };
  if (native) window.Capacitor = { Plugins: { Haptics: {
    impact: (o) => { calls.push(["impact", o.style]); return reject ? Promise.reject(new Error("no taptic")) : Promise.resolve(); },
    notification: (o) => { calls.push(["notification", o.type]); return Promise.resolve(); },
  } } };
  const ctx = { window, navigator: { vibrate: (p) => calls.push(["vibrate", p]) } };
  vm.runInNewContext(`${fn(MOTION, "ffReduced")}\n${fn(MOTION, "ffTick")}\nthis.ffTick = ffTick;`, ctx);
  return { ffTick: ctx.ffTick, calls };
}

test("native shell: Taptic taps by strength, success buzz for celebrations, never navigator.vibrate", async () => {
  const t = tick({ native: true });
  t.ffTick(8); t.ffTick(10); t.ffTick(12); t.ffTick(18); t.ffTick(20); t.ffTick(); t.ffTick([25, 45, 25]);
  assert.deepEqual(t.calls, [["impact", "LIGHT"], ["impact", "LIGHT"], ["impact", "MEDIUM"], ["impact", "MEDIUM"],
    ["impact", "HEAVY"], ["impact", "LIGHT"], ["notification", "SUCCESS"]]);
  // A plugin that rejects never surfaces an error.
  const r = tick({ native: true, reject: true });
  assert.doesNotThrow(() => r.ffTick(18));
  await new Promise((res) => setTimeout(res, 10));
});

test("browser: navigator.vibrate with the given pattern; reduced motion mutes the browser, not the native shell", () => {
  const t = tick();
  t.ffTick(18); t.ffTick([25, 45, 25]); t.ffTick();
  assert.deepEqual(t.calls, [["vibrate", 18], ["vibrate", [25, 45, 25]], ["vibrate", 10]]);
  const q = tick({ reduced: true });
  q.ffTick(18); q.ffTick([25, 45, 25]);
  assert.deepEqual(q.calls, [], "browser + reduced motion: no vibration");
  // Natively the OS haptics switch decides; Reduce Motion (an animation setting) doesn't mute taps.
  const n = tick({ native: true, reduced: true });
  n.ffTick(18);
  assert.deepEqual(n.calls, [["impact", "MEDIUM"]]);
});

test("the week drag buzzes on lift (medium), ticks per day passed over (light), taps when it lands", () => {
  assert.match(DRAG, /ffTick\(18\); \}catch\(_\)\{\}\s+\/\/ the "picked up" buzz/);
  assert.match(DRAG, /if\(c\) try\{ if\(typeof ffTick==="function"\) ffTick\(8\); \}/);
  assert.match(DRAG, /g\.layout=lay; gdSave\(g\);\s+try\{ if\(typeof ffTick==="function"\) ffTick\(10\); \}/);
});
