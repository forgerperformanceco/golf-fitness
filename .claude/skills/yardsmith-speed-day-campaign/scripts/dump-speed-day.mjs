#!/usr/bin/env node
/* dump-speed-day.mjs — Phase-0 baseline extractor for the Speed & Power day campaign.
 *
 * Loads the REAL src/js/app/035-training-plan.js in a vm sandbox (no browser,
 * no build) and tabulates, for BOTH speed modes (field / gym) and a set of
 * representative weeks, every drill's:
 *   - purposeFor() class (⚡ power · 🌀 rotation · 🏋️ strength · 💪 hypertrophy)
 *   - effective sets×reps from speedDrillTarget() (= effTarget() for drills,
 *     overspeedDose() for Overspeed swings)
 * plus the wave label per week — exactly what the app prescribes today.
 *
 * It then ASSERTS the 6932f28-class invariants (see SKILL.md Phase 1) and
 * exits non-zero on any violation, so it doubles as a regression gate:
 *   A. no speed-day drill classifies 💪 (hypertrophy)
 *   B. ⚡/🌀 drills are untouched at accumulate AND intensify (never wave-trimmed
 *      like accessories, never handed the 🏋️ drop-reps prescription)
 *   C. ⚡/🌀 drills lose exactly ONE set at deload and at peak (floor 2)
 *   D. overspeed ramp: 2×5 (wk≤2 / deload / peak) → 3×5 (wk≤8) → 4×5 (wk≥9)
 *   E. Retain mode (goal=cut) changes NOTHING on the speed day
 *
 * Usage:  node .claude/skills/yardsmith-speed-day-campaign/scripts/dump-speed-day.mjs [repo-root]
 * Output: markdown-ish table on stdout + "ALL INVARIANTS PASS" / failures.
 */
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv[2] || path.resolve(HERE, "../../../..");
const SRC = path.join(ROOT, "src/js/app/035-training-plan.js");
if (!fs.existsSync(SRC)) {
  console.error("Cannot find " + SRC + " — pass the repo root as argv[2].");
  process.exit(2);
}

// Minimal sandbox: 035 only touches `document.addEventListener` at load time;
// at call time our target functions need lsGet (ff_event/ff_speedmode → fallback),
// planStart (no plan started → null) and `state` (macro goal, for adjSets/trainRetain).
function makeCtx(goal) {
  const ctx = {
    document: { addEventListener() {}, getElementById() { return null; } },
    lsGet: (_k, fb) => fb,   // no ff_event, no ff_speedmode override
    lsSet() {},
    planStart: () => null,   // waveFor(week) takes the base cadence path
    state: { goal },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SRC, "utf8"), ctx, { filename: "035-training-plan.js" });
  return ctx;
}

const WEEKS = [1, 4, 6, 9, 12, 19];
const build = makeCtx("leanbulk"); // Build mode (the default lens)
const cut = makeCtx("cut");        // Retain mode (invariant E)

const fails = [];
function assert(ok, msg) { if (!ok) fails.push(msg); }
function sets(sr) { const m = String(sr).match(/^\s*(\d+)/); return m ? +m[1] : NaN; }
const reps = (sr) => { const m = String(sr).match(/[×x]\s*(\d+)/); return m ? +m[1] : NaN; };

console.log("# Speed & Power day — current prescription baseline");
console.log("# source: src/js/app/035-training-plan.js · goal=leanbulk (Build) · no ff_event · no swaps");
console.log("# wave per week: " + WEEKS.map((w) => `wk${w}=${build.waveFor(w)}`).join(" · "));
console.log("");

for (const mode of ["field", "gym"]) {
  const day = build.PHASES[0].speed[mode];
  console.log(`## ${mode.toUpperCase()} mode (${day.ex.length} drills)`);
  const head = ["drill", "class", "authored", ...WEEKS.map((w) => "wk" + w)];
  const rows = [head];
  for (const e of day.ex) {
    const [name, authored] = e;
    const isOS = /Overspeed/i.test(name);
    const cls = isOS ? "⚡ramp" : build.purposeFor(name);
    const row = [name, cls, authored];
    for (const w of WEEKS) {
      const t = build.speedDrillTarget(name, authored, w);
      row.push(t);
      // invariant E — Retain mode identical
      assert(cut.speedDrillTarget(name, authored, w) === t,
        `E: retain-mode differs for "${name}" wk${w}`);
      if (isOS) {
        // invariant D — the structured ramp
        const wv = build.waveFor(w);
        const want = (wv === "deload" || wv === "peak" || w <= 2) ? "2 × 5" : (w <= 8 ? "3 × 5" : "4 × 5");
        assert(t === want, `D: overspeed wk${w} = "${t}", expected "${want}"`);
      } else {
        // invariants A/B/C — ballistic work is never accessory-trimmed
        assert(cls === "⚡" || cls === "🌀", `A: "${name}" classifies ${cls} (must be ⚡ or 🌀)`);
        const wv = build.waveFor(w);
        if (wv === "accumulate" || wv === "intensify") {
          assert(t === authored, `B: "${name}" changed at ${wv} wk${w}: "${authored}" → "${t}"`);
        } else { // deload or peak: exactly one set off, floor 2, reps untouched
          assert(sets(t) === Math.max(2, sets(authored) - 1) && reps(t) === reps(authored),
            `C: "${name}" at ${wv} wk${w}: "${authored}" → "${t}" (expected exactly -1 set, same reps)`);
        }
      }
    }
    rows.push(row);
  }
  const widths = head.map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)));
  for (const r of rows) console.log("| " + r.map((c, i) => String(c).padEnd(widths[i])).join(" | ") + " |");
  console.log("");
}

if (fails.length) {
  console.error("INVARIANT FAILURES (" + fails.length + "):");
  for (const f of fails) console.error("  ✗ " + f);
  process.exit(1);
}
console.log("ALL INVARIANTS PASS (A no-💪 · B hold at accumulate/intensify · C -1 set at deload/peak · D overspeed ramp · E retain no-op)");
