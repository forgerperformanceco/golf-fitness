#!/usr/bin/env node
// triage-wave.mjs — "wrong sets/reps prescribed" triage tool for Yardsmith.
//
// Extracts the REAL wave-engine functions (purposeFor / waveFor / waveAdjust /
// adjSets / effTarget / overspeedDose / speedDrillTarget and their helpers)
// straight out of src/js/app/035-training-plan.js, so what you test here is
// byte-identical to what ships. No build required.
//
// Usage:
//   node triage-wave.mjs "<Exercise name>" ["<base target>"] [goal]
//     e.g. node triage-wave.mjs "Speed bench press" "4 × 4" leanbulk
//     Prints the purpose classification and the effective target for all 20 weeks.
//   node triage-wave.mjs --selftest
//     Re-runs the 6932f28 regression cases (ballistic drills must classify ⚡/🌀,
//     never 🏋️/💪) plus wave-transform spot checks. Exits non-zero on failure.
//
// Caveat: stubs eventInfo() → null, so an ff_event re-anchor (event week ⇒ Peak)
// is NOT simulated here; test that path in the browser/harness.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
// script lives at <repo>/.claude/skills/yardsmith-debugging-playbook/scripts/
const REPO = process.env.YARDSMITH_REPO || join(HERE, "..", "..", "..", "..");
const SRC = join(REPO, "src", "js", "app", "035-training-plan.js");
const src = readFileSync(SRC, "utf8");

// -- pull one `function name(...){...}` out of the source by brace-matching --
function extractFn(name) {
  const m = src.match(new RegExp("function\\s+" + name + "\\s*\\("));
  if (!m) throw new Error("extractFn: `function " + name + "(` not found in " + SRC +
    " — 035-training-plan.js has been refactored; update this script.");
  let i = src.indexOf("{", m.index);
  let depth = 0, j = i;
  for (; j < src.length; j++) {
    const c = src[j];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) break; }
    // NOTE: naive matcher — fine for these functions (no unbalanced braces in strings/regex).
  }
  return src.slice(m.index, j + 1);
}

const FNS = ["purposeFor", "trainRetain", "adjSets", "waveFor", "bumpReps",
  "trimSets", "plainReps", "waveAdjust", "effTarget", "overspeedDose", "speedDrillTarget"];
const goal = (process.argv[4] || "leanbulk");
const code =
  'var state = { goal: ' + JSON.stringify(goal) + ' };\n' +
  'function eventInfo(){ return null; }\n' +          // no Big Event re-anchor in this tool
  FNS.map(extractFn).join("\n") +
  '\nreturn { purposeFor, waveFor, effTarget, speedDrillTarget, overspeedDose };';
const eng = new Function(code)();

// ------------------------------------------------------------------ selftest
if (process.argv[2] === "--selftest") {
  let fail = 0;
  const ck = (label, got, want) => {
    const ok = got === want;
    if (!ok) fail++;
    console.log((ok ? "  ok  " : " FAIL ") + label + " → " + got + (ok ? "" : "  (expected " + want + ")"));
  };
  console.log("purposeFor — the 6932f28 regression cases:");
  ck("Seated chest throw   (⚡ ballistic, was 💪)", eng.purposeFor("Seated chest throw"), "⚡");
  ck("Cable lateral chop   (🌀 rotation, was 💪)", eng.purposeFor("Cable lateral chop"), "🌀");
  ck("Speed bench press    (⚡ velocity, was 🏋️)", eng.purposeFor("Speed bench press"), "⚡");
  ck("Landmine rotational throw (🌀 before ⚡)", eng.purposeFor("Landmine rotational throw"), "🌀");
  ck("Landmine Press       (💪 — excluded from 🌀)", eng.purposeFor("Landmine Press"), "💪");
  ck("Bench Press          (🏋️ big lift)", eng.purposeFor("Bench Press"), "🏋️");
  ck("Countermovement jump (⚡)", eng.purposeFor("Countermovement jump"), "⚡");
  ck("Kettlebell swing     (⚡ via Swing)", eng.purposeFor("Kettlebell swing"), "⚡");
  ck("Lateral Raise        (💪 accessory)", eng.purposeFor("Lateral Raise"), "💪");
  console.log("waveFor — 6-week cadence + peak:");
  ck("week 1 accumulate", eng.waveFor(1), "accumulate");
  ck("week 4 intensify", eng.waveFor(4), "intensify");
  ck("week 6 deload", eng.waveFor(6), "deload");
  ck("week 19 peak", eng.waveFor(19), "peak");
  console.log("effTarget — wave transforms (goal=" + goal + "):");
  ck("Bench Press 4 × 8 @wk4  (big lift: −2 reps)", eng.effTarget("4 × 8", "Bench Press", 4), "4 × 6");
  ck("Lateral Raise 3 × 12 @wk4 (💪: −1 set)", eng.effTarget("3 × 12", "Lateral Raise", 4), "2 × 12");
  ck("Seated chest throw 3 × 4 @wk4 (⚡ untouched)", eng.effTarget("3 × 4", "Seated chest throw", 4), "3 × 4");
  ck("Seated chest throw 3 × 4 @wk19 (⚡ peak: −1 set)", eng.effTarget("3 × 4", "Seated chest throw", 19), "2 × 4");
  ck("Bench Press 4 × 8 @wk19 (peak: −2 sets)", eng.effTarget("4 × 8", "Bench Press", 19), "2 × 8");
  ck("Lateral Raise 3 × 12 @wk6 (deload: −1 set)", eng.effTarget("3 × 12", "Lateral Raise", 6), "2 × 12");
  ck("Speed bench press 4 × 4 @wk4 (⚡: NOT −2 reps)", eng.effTarget("4 × 4", "Speed bench press", 4), "4 × 4");
  ck("Ground-force footwork 3 × 5 / side @wk4 (⚡)", eng.effTarget("3 × 5 / side", "Ground-force footwork", 4), "3 × 5 / side");
  console.log("overspeedDose ramp:");
  ck("week 1 → 2 × 5", eng.overspeedDose(1), "2 × 5");
  ck("week 5 → 3 × 5", eng.overspeedDose(5), "3 × 5");
  ck("week 9 → 4 × 5", eng.overspeedDose(9), "4 × 5");
  ck("week 6 (deload) → 2 × 5", eng.overspeedDose(6), "2 × 5");
  console.log(fail ? "\nSELFTEST FAILED: " + fail + " case(s)" : "\nselftest: all green");
  process.exit(fail ? 1 : 0);
}

// ---------------------------------------------------------------- lookup mode
const name = process.argv[2];
if (!name) {
  console.log("usage: node triage-wave.mjs \"<Exercise name>\" [\"<base target>\"] [goal]");
  console.log("       node triage-wave.mjs --selftest");
  process.exit(2);
}
const base = process.argv[3] || "3 × 10";
const p = eng.purposeFor(name);
const LEGEND = { "🏋️": "heavy strength", "💪": "hypertrophy accessory", "⚡": "power/speed (ballistic)", "🌀": "golf rotation" };
console.log("exercise : " + name);
console.log("purpose  : " + p + "  (" + (LEGEND[p] || "?") + ")");
console.log("goal     : " + goal + (goal === "maintain" || goal === "cut" ? "  → Retain mode: 💪 accessories lose 1 set every week" : "  → Build mode: full volume"));
console.log("base     : " + base + "\n");
console.log("wk  wave        target");
for (let w = 1; w <= 20; w++) {
  const t = /Overspeed/i.test(name) ? eng.speedDrillTarget(name, base, w) : eng.effTarget(base, name, w);
  console.log(String(w).padStart(2) + "  " + eng.waveFor(w).padEnd(10) + "  " + t + (t !== base ? "   (base " + base + ")" : ""));
}
console.log("\nNote: ff_event (Big Event date) re-anchoring is NOT simulated (eventInfo stubbed to null).");
