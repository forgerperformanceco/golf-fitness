import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const skip = new Set([".git", "node_modules", "www", "android", "ios"]);
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else files.push(path);
  }
}
walk(ROOT);

for (const path of files.filter((p) => /\.(?:js|mjs)$/.test(p))) {
  const result = spawnSync(process.execPath, ["--check", path], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${path}\n${result.stderr}`);
}
for (const name of ["package.json", "manifest.webmanifest", "capacitor.config.json"]) {
  JSON.parse(readFileSync(join(ROOT, name), "utf8"));
}

console.log(`check: ${files.filter((p) => /\.(?:js|mjs)$/.test(p)).length} scripts parse; JSON manifests valid`);
