#!/usr/bin/env node
/* ============================================================================
   wave-cases.mjs — enumerated unit-case verification of the wave-engine
   classification + dose pipeline (the 6932f28 pattern).

   Extracts the REAL function declarations from src/js/app/035-training-plan.js
   (and incNum from 040-workout-logger.js) by name, evaluates them with minimal
   stubs for the three cross-module symbols they touch (`state`, `lsGet`,
   `planStart`), and runs enumerated cases:

     A. purposeFor() classification (🏋️ / 💪 / ⚡ / 🌀) — incl. the three
        6932f28 regression drills and the Landmine Press exclusion.
     B. effTarget() wave-adjustment cases at weeks 1 / 4 / 6 / 19.
     C. overspeedDose() ramp + speedDrillTarget() routing.
     D. waveFor() cadence + ff_event re-anchoring.
     E. prescribeW() load prescriptions (deload 60%, progression jumps).
     F. Freshness guards: the authored doses this file hardcodes still exist
        verbatim in 035 (so the expected numbers can't silently drift).

   No dependencies beyond Node ≥ 18 and the repo itself. Exit 0 = all green.
   Run:  node .claude/skills/yardsmith-proof-and-analysis-toolkit/scripts/wave-cases.mjs
   ============================================================================ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const SRC_035 = fs.readFileSync(path.join(ROOT, "src/js/app/035-training-plan.js"), "utf8");
const SRC_040 = fs.readFileSync(path.join(ROOT, "src/js/app/040-workout-logger.js"), "utf8");

/* ---- extract a `function NAME(…){…}` declaration by brace balancing.
   Skips string literals, // and both comment styles (apostrophes in comments
   would otherwise start a fake string). Naive about braces inside regex
   literals — none exist in these functions as of f21930a; if a target
   function grows one, extend this. A missing function throws — that's the
   "module changed" signal. */
function extractFn(src, name) {
  const m = new RegExp("(^|\\n)([ \\t]*)function " + name + "\\s*\\(").exec(src);
  if (!m) throw new Error("function " + name + " not found — module changed; update this script");
  const start = m.index + (m[1] ? 1 : 0);
  let i = src.indexOf("{", start);
  let depth = 0, j = i;
  for (; j < src.length; j++) {
    const c = src[j];
    if (c === "/" && src[j + 1] === "/") { j = src.indexOf("\n", j); if (j < 0) j = src.length; continue; }
    if (c === "/" && src[j + 1] === "*") { j = src.indexOf("*/", j + 2) + 1; continue; }
    if (c === '"' || c === "'") {
      const q = c; j++;
      while (j < src.length && src[j] !== q) { if (src[j] === "\\") j++; j++; }
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) break; }
  }
  return src.slice(start, j + 1);
}

const NAMES_035 = ["purposeFor", "trainRetain", "adjSets", "eventInfo", "waveFor",
  "bumpReps", "trimSets", "plainReps", "waveAdjust", "effTarget",
  "overspeedDose", "speedDrillTarget", "prescribeW"];
const code = NAMES_035.map((n) => extractFn(SRC_035, n)).join("\n")
  + "\n" + extractFn(SRC_040, "incNum");

/* Stubs for the cross-module symbols the extracted functions reference.
   `state.goal` drives trainRetain(); lsGet("ff_event")/planStart() drive the
   event re-anchor; everything else is self-contained. */
const W = new Function(`
  var state = { goal: "leanbulk" };
  var __event = null, __planStart = null;
  function lsGet(k, d) { return (k === "ff_event" && __event) ? __event : d; }
  function planStart() { return __planStart; }
  ${code}
  return {
    purposeFor, adjSets, waveFor, waveAdjust, effTarget, plainReps,
    overspeedDose, speedDrillTarget, prescribeW,
    setGoal: function (g) { state.goal = g; },
    setEvent: function (ev, start) { __event = ev; __planStart = start; }
  };
`)();

let pass = 0, fail = 0;
function check(label, got, want) {
  const ok = got === want;
  ok ? pass++ : fail++;
  if (!ok) console.log(`  FAIL ${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

/* ---- A. Classification cases ------------------------------------------- */
const CLS = [
  // The three 6932f28 regressions + the deliberate exclusion:
  ["Seated chest throw", "⚡"],        // was 💪 pre-fix — Peak gutted it 3×4→1×4
  ["Cable lateral chop", "🌀"],        // was 💪 pre-fix — \bChop\b now catches it
  ["Speed bench press", "⚡"],         // was 🏋️ via /Bench Press/ — ^Speed\s wins now
  ["Landmine Press", "💪"],            // chest press — (?! Press) excludes it from 🌀
  // Ordering proof: rotation checked BEFORE power, so a rotational throw is 🌀:
  ["Landmine rotational throw", "🌀"],
  ["Rotational med-ball throw", "🌀"],
  // Authored speed-day drills (field + gym):
  ["Countermovement jump", "⚡"], ["Lateral bound", "⚡"],
  ["Overhead med-ball slam", "⚡"], ["Ground-force footwork", "⚡"],
  ["Overspeed swings", "⚡"], ["Trap-bar jump", "⚡"], ["Kettlebell swing", "⚡"],
  // Ballistic catalog names:
  ["Power Clean", "⚡"], ["Hang Clean", "⚡"], ["Broad jump", "⚡"],
  ["Plyo push-up", "⚡"], ["Box or squat jump", "⚡"], ["Med-ball chest pass", "⚡"],
  // Rotation family:
  ["Cable Wood-chop", "🌀"], ["Pallof Press", "🌀"], ["Russian Twist", "🌀"],
  ["Single-Arm DB Bench Press", "🌀"], ["Single-Arm Band Press", "🌀"],
  // Heavy strength (🏋️ = "drop reps, go heavier" at intensify):
  ["Barbell Bench Press", "🏋️"], ["Back Squat", "🏋️"], ["Front Squat", "🏋️"],
  ["Leg Press", "🏋️"], ["Hack Squat", "🏋️"], ["Deadlift", "🏋️"],
  ["Romanian Deadlift", "🏋️"], ["Standing Overhead Press", "🏋️"], ["Pull-up", "🏋️"],
  // Hypertrophy accessories (💪 = trimmed at intensify/retain):
  ["Incline DB Press", "💪"], ["Lateral Raise", "💪"], ["Cable Triceps Pushdown", "💪"],
  ["Leg Extension", "💪"], ["Standing Calf Raise", "💪"], ["Hanging Leg Raise", "💪"],
  ["Walking Lunge", "💪"], ["Seated Leg Curl", "💪"]
];
console.log(`A. purposeFor classification (${CLS.length} cases)`);
CLS.forEach(([name, want]) => check(`purposeFor(${name})`, W.purposeFor(name), want));

/* ---- B. Wave-adjustment cases (authored doses, weeks 1/4/6/19) ---------- */
console.log("B. effTarget wave adjustments");
// ⚡ holds full dose through Accumulate AND Intensify; exactly −1 set at Peak:
check("Speed bench wk1",  W.effTarget("4 × 4", "Speed bench press", 1),  "4 × 4");
check("Speed bench wk4",  W.effTarget("4 × 4", "Speed bench press", 4),  "4 × 4");
check("Speed bench wk19", W.effTarget("4 × 4", "Speed bench press", 19), "3 × 4");
check("Chest throw wk4",  W.effTarget("3 × 4", "Seated chest throw", 4),  "3 × 4");
check("Chest throw wk19", W.effTarget("3 × 4", "Seated chest throw", 19), "2 × 4");
// 🌀 untouched at intensify, −1 set at deload/peak:
check("Lateral chop wk4",  W.effTarget("3 × 4 / side", "Cable lateral chop", 4),  "3 × 4 / side");
check("Lateral chop wk19", W.effTarget("3 × 4 / side", "Cable lateral chop", 19), "2 × 4 / side");
// 🏋️: intensify = −2 reps floor 3 (loads climb); deload −1 set; peak −2 sets:
check("Bench wk4",  W.effTarget("4 × 5 (heavy · fast up)", "Barbell Bench Press", 4),  "4 × 3 (heavy · fast up)");
check("Bench wk6",  W.effTarget("4 × 5 (heavy · fast up)", "Barbell Bench Press", 6),  "3 × 5 (heavy · fast up)");
check("Bench wk19", W.effTarget("4 × 5 (heavy · fast up)", "Barbell Bench Press", 19), "2 × 5 (heavy · fast up)");
// 💪 accessory: −1 set at intensify:
check("Leg Ext wk4", W.effTarget("3 × 12", "Leg Extension", 4), "2 × 12");
// plainReps guard: distance targets never get the rep shift:
check("plainReps('3 × 40 yd')", W.plainReps("3 × 40 yd"), false);
check("distance target wk4", W.effTarget("3 × 40 yd", "Deadlift", 4), "3 × 40 yd");
// Retain mode (goal maintain/cut): −1 set on 💪 only, floor 2, never stacks below 2:
W.setGoal("cut");
check("cut: Leg Ext wk1", W.effTarget("3 × 12", "Leg Extension", 1), "2 × 12");
check("cut: Leg Ext wk4 (floor 2)", W.effTarget("3 × 12", "Leg Extension", 4), "2 × 12");
check("cut: Speed bench wk1 untouched", W.effTarget("4 × 4", "Speed bench press", 1), "4 × 4");
W.setGoal("leanbulk");

/* ---- C. Overspeed ramp + routing ---------------------------------------- */
console.log("C. overspeedDose ramp");
check("wk1", W.overspeedDose(1), "2 × 5");
check("wk3", W.overspeedDose(3), "3 × 5");
check("wk6 (deload)", W.overspeedDose(6), "2 × 5");
check("wk9", W.overspeedDose(9), "4 × 5");
check("wk19 (peak)", W.overspeedDose(19), "2 × 5");
check("speedDrillTarget routes overspeed", W.speedDrillTarget("Overspeed swings", "3 × 5", 9), "4 × 5");
check("speedDrillTarget routes others", W.speedDrillTarget("Seated chest throw", "3 × 4", 19), "2 × 4");

/* ---- D. waveFor cadence + event re-anchor ------------------------------- */
console.log("D. waveFor cadence");
[[1, "accumulate"], [3, "accumulate"], [4, "intensify"], [5, "intensify"],
 [6, "deload"], [7, "accumulate"], [12, "deload"], [17, "intensify"],
 [18, "deload"], [19, "peak"], [20, "peak"]].forEach(([wk, want]) =>
  check(`waveFor(${wk})`, W.waveFor(wk), want));
// Event re-anchor: event week & week-before → peak, week-after → deload.
// Compute the event week exactly the way eventInfo() does (local midnight anchor).
{
  const now = Date.now();
  const evDate = new Date(now + 1 * 864e5);
  const evIso = evDate.getFullYear() + "-" + String(evDate.getMonth() + 1).padStart(2, "0")
    + "-" + String(evDate.getDate()).padStart(2, "0");
  const start = new Date(now - 64 * 864e5); start.setHours(0, 0, 0, 0);
  const evNoon = new Date(evIso + "T12:00:00").getTime();
  const evWeek = Math.floor((evNoon - start.getTime()) / 864e5 / 7) + 1;  // ≈ week 10
  W.setEvent({ date: evIso, name: "Club champs" }, start.toISOString());
  check(`event wk${evWeek} → peak`, W.waveFor(evWeek), "peak");
  check(`event wk${evWeek - 1} → peak`, W.waveFor(evWeek - 1), "peak");
  check(`event wk${evWeek + 1} → deload`, W.waveFor(evWeek + 1), "deload");
  check("far week keeps cadence", W.waveFor(2), "accumulate");
  W.setEvent(null, null);
}

/* ---- E. prescribeW load prescriptions ----------------------------------- */
console.log("E. prescribeW");
check("deload 200 → 120", W.prescribeW(200, "Barbell Bench Press", false, "deload"), 120);
check("deload 93 → 55",   W.prescribeW(93, "Back Squat", false, "deload"), 55);
check("ready lower-body +5",  W.prescribeW(205, "Leg Press", true, "accumulate"), 210);
check("ready upper-body +2.5", W.prescribeW(105, "Incline DB Press", true, "accumulate"), 107.5);
check("not ready → null", W.prescribeW(105, "Incline DB Press", false, "accumulate"), null);
check("no last weight → null", W.prescribeW("", "Back Squat", true, "accumulate"), null);

/* ---- F. Freshness guards: authored doses still verbatim in 035 ---------- */
console.log("F. authored-dose freshness guards");
[['["Speed bench press", "4 \\u00d7 4"', "Speed bench 4×4"],
 ['["Seated chest throw", "3 \\u00d7 4"', "Chest throw 3×4"],
 ['["Cable lateral chop", "3 \\u00d7 4 / side"', "Lateral chop 3×4/side"],
 ['["Barbell Bench Press","4 \\u00d7 5 (heavy \\u00b7 fast up)"]', "Bench 4×5 heavy"]
].forEach(([needle, label]) => check(`authored: ${label}`, SRC_035.includes(needle), true));

console.log(`\n${pass}/${pass + fail} cases green` + (fail ? ` — ${fail} FAILED` : ""));
process.exit(fail ? 1 : 0);
