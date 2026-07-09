#!/usr/bin/env node
// check-release.mjs — Yardsmith pre-merge gate (yardsmith-change-control skill)
//
// Verifies, WITHOUT touching the repo, that the working tree obeys the
// release-discipline non-negotiables that a machine can check:
//
//   1. DETERMINISM — the committed root outputs (index.html, app.js,
//      styles.css, sw.js) are byte-for-byte what `node scripts/build.mjs`
//      produces from src/. Catches BOTH hand-edited outputs AND "edited src/
//      but forgot to rebuild".
//   2. DARK-THEME FRESHNESS — regenerating the dark theme
//      (scripts/gen-dark-theme.py) and rebuilding still matches the committed
//      outputs. Catches "edited CSS but skipped the dark-theme regen".
//   3. NO LEAKED {{V}} — no unreplaced hash placeholder in any root output.
//   4. PIN CONSISTENCY — the manual cloud-sync.js / coach.js ?v= pins agree
//      between src/index.template.html and src/sw.template.js, and if either
//      hand-maintained file differs from origin/main, its pin was bumped.
//
// The build runs in a throwaway temp dir (src/ + scripts/ copied there), so
// this script NEVER writes into the repo. Requires esbuild to be resolvable
// from the repo root or the current working directory (`npm install` in the
// repo if missing — see the yardsmith-build-and-env skill).
//
// Usage:  node .claude/skills/yardsmith-change-control/scripts/check-release.mjs
// Exit:   0 = all checks pass · 1 = at least one check failed · 2 = can't run

import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..", "..", "..", ".."); // .claude/skills/yardsmith-change-control/scripts -> repo root
const OUTPUTS = ["index.html", "app.js", "styles.css", "sw.js"];
const require = createRequire(import.meta.url);

let failures = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => { failures++; console.log(`  FAIL  ${m}`); };
const skip = (m) => console.log(`  SKIP  ${m}`);
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 12);

// ── locate esbuild (needed by scripts/build.mjs) ────────────────────────────
let esbuildDir = null;
try {
  esbuildDir = dirname(require.resolve("esbuild/package.json", { paths: [REPO, process.cwd()] }));
} catch {
  console.error(
    "ERROR: esbuild is not resolvable from the repo root or the current directory.\n" +
    "       scripts/build.mjs needs it. Fix: run `npm install` in the repo\n" +
    "       (esbuild is a devDependency), then re-run this gate.\n" +
    "       Environment details: see the yardsmith-build-and-env skill.");
  process.exit(2);
}

// ── stage a throwaway build dir ─────────────────────────────────────────────
const tmp = mkdtempSync(join(tmpdir(), "ys-gate-"));
try {
  cpSync(join(REPO, "src"), join(tmp, "src"), { recursive: true });
  cpSync(join(REPO, "scripts"), join(tmp, "scripts"), { recursive: true });
  mkdirSync(join(tmp, "node_modules"));
  symlinkSync(esbuildDir, join(tmp, "node_modules", "esbuild")); // realpath resolution pulls the platform binary too

  const build = () => execFileSync(process.execPath, [join(tmp, "scripts", "build.mjs")], { cwd: tmp, stdio: "pipe" });

  // 1 ── determinism: committed outputs == build(src)
  console.log("[1/4] Determinism — committed outputs vs fresh build of src/");
  build();
  let mismatch = [];
  for (const f of OUTPUTS) {
    const a = sha(join(tmp, f)), b = sha(join(REPO, f));
    if (a === b) ok(`${f} ${a}`);
    else { mismatch.push(f); bad(`${f} rebuild=${a} committed=${b}`); }
  }
  if (mismatch.length) {
    console.log("        → Either a generated output was hand-edited, or src/ changed without a rebuild.");
    console.log("        → Fix: `node scripts/build.mjs` in the repo, then commit src/ + outputs together.");
  }

  // 2 ── dark-theme freshness: regen + rebuild must still match
  console.log("[2/4] Dark-theme freshness — gen-dark-theme.py is a no-op on current src/");
  let darkRan = false;
  try {
    execFileSync("python3", [join(tmp, "scripts", "gen-dark-theme.py")], { cwd: tmp, stdio: "pipe" });
    darkRan = true;
  } catch {
    skip("python3 unavailable or gen-dark-theme.py failed — verify manually: python3 scripts/gen-dark-theme.py && node scripts/build.mjs");
  }
  if (darkRan) {
    build();
    let stale = false;
    for (const f of OUTPUTS) if (sha(join(tmp, f)) !== sha(join(REPO, f))) stale = true;
    if (stale && !mismatch.length) {
      bad("dark-theme regen changes the outputs — CSS was edited without `python3 scripts/gen-dark-theme.py && node scripts/build.mjs`");
    } else if (stale) {
      skip("dark check inconclusive while check 1 already fails — fix determinism first, then re-run");
    } else {
      ok("regen + rebuild reproduces the committed outputs exactly");
    }
  }

  // 3 ── no unreplaced {{V}} in served outputs
  console.log("[3/4] No leaked {{V}} placeholders in root outputs");
  let leaked = OUTPUTS.filter((f) => readFileSync(join(REPO, f), "utf8").includes("{{V}}"));
  if (leaked.length) bad(`unreplaced {{V}} in: ${leaked.join(", ")}`);
  else ok("index.html, app.js, styles.css, sw.js are placeholder-free");

  // 4 ── manual ?v= pin consistency (cloud-sync.js / coach.js)
  console.log("[4/4] Manual ?v= pins (cloud-sync.js / coach.js)");
  const pinsOf = (text) => ({
    cloud: (text.match(/cloud-sync\.js\?v=(\d+)/) || [])[1],
    coach: (text.match(/coach\.js\?v=(\d+)/) || [])[1],
  });
  const idx = pinsOf(readFileSync(join(REPO, "src", "index.template.html"), "utf8"));
  const sw = pinsOf(readFileSync(join(REPO, "src", "sw.template.js"), "utf8"));
  if (!idx.cloud || !idx.coach || !sw.cloud || !sw.coach) {
    bad("could not find both pins in both template files (src/index.template.html + src/sw.template.js)");
  } else if (idx.cloud !== sw.cloud || idx.coach !== sw.coach) {
    bad(`pins disagree between templates: index.html says cloud-sync v${idx.cloud}/coach v${idx.coach}, sw says v${sw.cloud}/v${sw.coach}`);
  } else {
    ok(`pins agree across both templates: cloud-sync.js?v=${idx.cloud} · coach.js?v=${idx.coach}`);
    // If cloud-sync.js / coach.js changed vs origin/main, the pin must have moved too.
    try {
      const baseTpl = execFileSync("git", ["-C", REPO, "show", "origin/main:src/index.template.html"], { stdio: "pipe" }).toString();
      const base = pinsOf(baseTpl);
      for (const [file, key] of [["cloud-sync.js", "cloud"], ["coach.js", "coach"]]) {
        const diff = execFileSync("git", ["-C", REPO, "diff", "--name-only", "origin/main", "--", file], { stdio: "pipe" }).toString().trim();
        if (diff && base[key] === idx[key]) bad(`${file} differs from origin/main but its ?v= pin is still ${idx[key]} — bump it in BOTH templates and rebuild`);
        else if (diff) ok(`${file} edited and pin bumped (${base[key]} → ${idx[key]})`);
        else ok(`${file} unchanged vs origin/main (pin v${idx[key]} may stay)`);
      }
    } catch {
      skip("origin/main not resolvable (offline/shallow clone) — manually confirm pins were bumped if cloud-sync.js/coach.js changed");
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(failures ? `\nGATE FAILED — ${failures} check(s) above. Do not merge.` : "\nGATE PASSED — release-discipline machine checks are clean.");
process.exit(failures ? 1 : 0);
