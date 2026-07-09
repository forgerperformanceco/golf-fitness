#!/usr/bin/env node
/* claims-lint.mjs — machine-check the honesty rules on Yardsmith's COACHING
 * SURFACES (what users/the AI coach actually see). Frontier problem 5, step 1:
 * turn "no banned claims" from manual discipline into a runnable check.
 *
 * Usage: node claims-lint.mjs [repoRoot]     (default: 4 dirs above this file)
 * Exit 0 = clean, 1 = violation, 2 = usage/setup error.
 *
 * What it checks (sources: CLUBHEAD-SPEED-REFERENCE.md §9.2/§9.6; banned-claims
 * registry owned by the yardsmith-external-positioning skill):
 *   BANNED on coaching surfaces (src/js/app, src/index.template.html,
 *   supabase/functions/_shared/knowledge.ts, coach.js):
 *     - the refuted "+8.2 mph" figure in any form
 *     - vendor-style promises: "+X mph in N weeks", "gain X mph", "guaranteed"
 *       next to mph/yards
 *   REQUIRED still present:
 *     - knowledge.ts grounding rules ("NEVER INVENT DATA", "NO BROWSING")
 *     - the overspeed honesty framing on the speed day ("Modest evidence")
 * The reference docs themselves are deliberately NOT scanned — they cite the
 * banned figure in order to refute it (CLUBHEAD…md:271-273).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] || path.join(here, "..", "..", "..", ".."));
if (!fs.existsSync(path.join(root, "src", "index.template.html"))) {
  console.error("claims-lint: " + root + " doesn't look like the Yardsmith repo root");
  process.exit(2);
}

const surfaces = [];
for (const f of fs.readdirSync(path.join(root, "src", "js", "app")))
  if (f.endsWith(".js")) surfaces.push(path.join(root, "src", "js", "app", f));
surfaces.push(
  path.join(root, "src", "index.template.html"),
  path.join(root, "coach.js"),
  path.join(root, "supabase", "functions", "_shared", "knowledge.ts"),
);

const BANNED = [
  { re: /\+?\s*8\.2\s*mph/i, why: 'refuted "+8.2 mph" figure (CLUBHEAD ref §9.2: "do not cite it")' },
  { re: /\+\s*\d+(\.\d+)?\s*mph\s+in\s+\d+\s*weeks?/i, why: 'vendor-style "+X mph in N weeks" promise (banned, §9.6)' },
  { re: /guarantee\w*[^.\n]{0,40}(mph|yard)/i, why: 'guarantee language next to a speed/distance number' },
  { re: /(mph|yard)s?[^.\n]{0,40}guarantee\w*/i, why: 'guarantee language next to a speed/distance number' },
];

let bad = 0;
for (const file of surfaces) {
  if (!fs.existsSync(file)) { console.error("claims-lint: missing surface " + file); bad++; continue; }
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const b of BANNED) {
      if (b.re.test(line)) {
        console.error("BANNED  " + path.relative(root, file) + ":" + (i + 1) + "  " + b.why);
        console.error("        " + line.trim().slice(0, 160));
        bad++;
      }
    }
  });
}

const REQUIRED = [
  { file: "supabase/functions/_shared/knowledge.ts", re: /NEVER INVENT DATA/, why: "coach grounding rule 3 missing" },
  { file: "supabase/functions/_shared/knowledge.ts", re: /NO BROWSING/, why: "coach grounding rule 2 missing" },
  { file: "src/js/app/035-training-plan.js", re: /Modest evidence/, why: "overspeed honesty framing missing from the speed day" },
];
for (const r of REQUIRED) {
  const p = path.join(root, r.file);
  if (!fs.existsSync(p) || !r.re.test(fs.readFileSync(p, "utf8"))) {
    console.error("MISSING " + r.file + "  " + r.why);
    bad++;
  }
}

if (bad) { console.error("\nclaims-lint: " + bad + " violation(s)"); process.exit(1); }
console.log("claims-lint: clean (" + surfaces.length + " surfaces scanned)");
