// Assemble the web build that Capacitor bundles into the native apps.
//
// FairwayFuel is a zero-build static site served from the repo root by GitHub
// Pages. Capacitor wants a single `webDir` to copy into the iOS/Android shells,
// so this script gathers ONLY the files the app actually serves into `www/` —
// no markdown docs, no supabase/, no node_modules. Run it before `cap sync`.
//
//   node scripts/build-www.mjs        (or: npm run build:www)

import { mkdirSync, rmSync, copyFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "www");

// Explicit allow-list of served files (everything index.html / the manifest reference).
const FILES = [
  "index.html",
  "privacy.html",
  "sw.js",
  "cloud-sync.js",
  "coach.js",
  "manifest.webmanifest",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
  "logo-dark-mark.png",
  "og-image.png",
  "shot-home.png",
  "shot-train.png",
];
// Whole directories to copy verbatim (iOS launch splash images).
const DIRS = ["splash"];

function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const name of readdirSync(src)) {
    const s = join(src, name), d = join(dst, name);
    if (statSync(s).isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}

// Fresh each run so a removed asset never lingers in the bundle.
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let n = 0;
for (const f of FILES) { copyFileSync(join(ROOT, f), join(OUT, f)); n++; }
for (const d of DIRS) { copyDir(join(ROOT, d), join(OUT, d)); }

console.log(`build-www: copied ${n} files + ${DIRS.join(", ")} → www/`);
