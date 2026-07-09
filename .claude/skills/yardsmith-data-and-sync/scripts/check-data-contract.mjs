#!/usr/bin/env node
// ============================================================================
// Yardsmith data-contract drift detector (read-only).
//
// Asserts the invariants that the yardsmith-data-and-sync skill documents:
//   1. Every key in cloud-sync.js MERGE is also in KEYS (a MERGE-only key
//      would never be pushed at all).
//   2. The retention caps hard-coded in the MERGE registry match the caps the
//      owning app modules enforce (they are deliberately duplicated — if one
//      side changes without the other, merges resurrect pruned entries or
//      trim live ones).
//   3. The manual ?v= pins for cloud-sync.js and coach.js are identical in
//      src/index.template.html and src/sw.template.js (a mismatched pair
//      means the SW precaches a different byte-version than the page loads).
//   4. Every key the app writes via lsSet() is either in KEYS (synced) or in
//      the DEVICE_LOCAL allowlist below (device-local BY DECISION). A key in
//      neither set means someone added storage without deciding whether it
//      roams — the exact drift that lost data for 4 keys before PR #60.
//
// Run from anywhere:  node .claude/skills/yardsmith-data-and-sync/scripts/check-data-contract.mjs
// Exit 0 = contract holds; exit 1 = drift found (printed).
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Repo root = 4 dirs up from this file (.claude/skills/<name>/scripts/).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

// Keys that are device-local BY DESIGN. Adding a new ff_* key? Either add it
// to KEYS+MERGE in cloud-sync.js (roaming) or add it here WITH a reason —
// never leave a key in limbo.
const DEVICE_LOCAL = {
  ff_schema:        "migration ladder version — each device migrates its own copy (005-migrations.js)",
  ff_targets:       "derived — recomputed by calc(); read by the AI coach",
  ff_score:         "derived — Octane snapshot for the AI coach",
  ff_theme:         "device preference (080)",
  ff_statsfold:     "device preference — Stats card fold state (085)",
  ff_manual_log:    "device preference — manual-log mode (035)",
  ff_speedmode:     "device preference — field/gym speed-day variant (035/085)",
  ff_pl_paused:     "transient — paused player session on THIS device (070)",
  ff_notif:         "device notification toggle (080)",
  ff_notif_lastday: "transient — web-notification once-per-day dedupe (080)",
  ff_push_on:       "device push-subscription state (080)",
  ff_push_sig:      "transient — push schedule payload-hash dedupe (080)",
  ff_milestones:    "device-local milestone toasts (070)",
  ff_hint_press:    "device-local one-time gesture hint (070)",
  // ff_sync_status is also device-local but written by cloud-sync.js with raw
  // localStorage.setItem (not lsSet), so it never appears in the lsSet scan.
};

let fails = 0;
const fail = (msg) => { fails++; console.error("FAIL  " + msg); };
const ok = (msg) => console.log("ok    " + msg);

const cs = read("cloud-sync.js");

// ── 1. Parse KEYS and MERGE ─────────────────────────────────────────────────
const keysMatch = cs.match(/var KEYS = \[([^\]]+)\]/);
if (!keysMatch) { fail("could not find `var KEYS = [...]` in cloud-sync.js"); process.exit(1); }
const KEYS = [...keysMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

const mergeMatch = cs.match(/var MERGE = \{([\s\S]*?)\n  \};/);
if (!mergeMatch) { fail("could not find `var MERGE = {...}` in cloud-sync.js"); process.exit(1); }
const MERGE_KEYS = [...mergeMatch[1].matchAll(/^\s*(ff_\w+):/gm)].map((m) => m[1]);

console.log(`KEYS: ${KEYS.length} keys · MERGE: ${MERGE_KEYS.length} additive keys`);

for (const k of MERGE_KEYS) {
  if (!KEYS.includes(k)) fail(`MERGE key ${k} is not in KEYS — it would never sync at all`);
}
if (MERGE_KEYS.every((k) => KEYS.includes(k))) ok("every MERGE key is in KEYS");

// ── 2. Retention caps: MERGE registry vs owning module ─────────────────────
// [key, cap, module file, regex that proves the module enforces the same cap]
const CAPS = [
  ["ff_rounds", 60, "src/js/app/082-round-debrief.js", /rounds\.length>60/],
  ["ff_speedtest", 60, "src/js/app/060-speed-test-day-the-biweekly-testing-ritu.js", /t\.length>60/],
  ["ff_mobility", 40, "src/js/app/065-mobility-screen-the-3-move-durability-ch.js", /t\.length>40/],
];
for (const [key, cap, file, moduleRe] of CAPS) {
  const line = mergeMatch[1].split("\n").find((l) => l.includes(key + ":"));
  if (!line || !line.includes(String(cap)))
    fail(`${key}: MERGE entry does not carry cap ${cap} (line: ${(line || "missing").trim()})`);
  else if (!moduleRe.test(read(file)))
    fail(`${key}: module ${file} no longer enforces cap ${cap} — caps must match on both sides`);
  else ok(`${key}: cap ${cap} agrees between MERGE and ${path.basename(file)}`);
}
// ff_fuel: 95-day retention lives in unionFuel (cloud-sync) and fuelPrune (030).
if (!/keys\.length > 95/.test(cs)) fail("unionFuel in cloud-sync.js no longer enforces 95-day retention");
else if (!/keys\.length<=95/.test(read("src/js/app/030-fuel-check-off-adherence-not-accounting.js")))
  fail("fuelPrune in 030 no longer enforces 95-day retention — must match unionFuel");
else ok("ff_fuel: 95-day retention agrees between unionFuel and fuelPrune");

// ── 3. Manual ?v= pins identical in both templates ──────────────────────────
const idx = read("src/index.template.html");
const sw = read("src/sw.template.js");
for (const name of ["cloud-sync.js", "coach.js"]) {
  const re = new RegExp(name.replace(".", "\\.") + "\\?v=(\\d+)");
  const a = idx.match(re), b = sw.match(re);
  if (!a || !b) fail(`${name}: ?v= pin missing from ${!a ? "index template" : "sw template"}`);
  else if (a[1] !== b[1]) fail(`${name}: pin mismatch — index.template v=${a[1]} vs sw.template v=${b[1]}`);
  else ok(`${name}?v=${a[1]} pinned identically in both templates`);
}

// ── 4. Every lsSet key is either synced or deliberately device-local ────────
const appDir = path.join(ROOT, "src/js/app");
const written = new Set();
for (const f of fs.readdirSync(appDir)) {
  if (!f.endsWith(".js")) continue;
  const src = fs.readFileSync(path.join(appDir, f), "utf8");
  for (const m of src.matchAll(/ls(?:Set|Remove)\(\s*"([^"]+)"/g)) written.add(m[1]);
}
const limbo = [...written].filter((k) => !KEYS.includes(k) && !(k in DEVICE_LOCAL));
if (limbo.length)
  fail(`keys written via lsSet but neither in KEYS nor in the device-local allowlist: ${limbo.join(", ")}\n      → decide: add to KEYS + MERGE (roaming) or to DEVICE_LOCAL in this script (with a reason)`);
else ok(`all ${written.size} lsSet-written keys are accounted for (synced or deliberately device-local)`);

console.log(fails ? `\n${fails} contract violation(s).` : "\ndata contract holds.");
process.exit(fails ? 1 : 0);
