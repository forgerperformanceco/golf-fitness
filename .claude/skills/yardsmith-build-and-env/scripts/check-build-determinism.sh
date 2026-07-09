#!/usr/bin/env bash
# Yardsmith build-determinism check — verifies committed root outputs
# (index.html, app.js, styles.css, sw.js) are exactly what scripts/build.mjs
# produces from src/, WITHOUT touching the real tree: the build runs in a
# throwaway copy under $TMPDIR.
#
# Usage: bash .claude/skills/yardsmith-build-and-env/scripts/check-build-determinism.sh
# Exit 0 = deterministic (committed outputs == build(src)); exit 1 = mismatch.
#
# Also checks gen-dark-theme.py idempotence: running it in the copy must not
# change src/css/styles.css.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../../../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cp -r "$REPO/src" "$REPO/scripts" "$REPO/package.json" "$REPO/package-lock.json" "$TMP/"

# esbuild: reuse the repo's node_modules if installed, else npm ci in the copy.
if (cd "$REPO" && node -e "require.resolve('esbuild')" 2>/dev/null); then
  ln -s "$REPO/node_modules" "$TMP/node_modules"
else
  echo "esbuild not installed in repo — running npm ci in the throwaway copy (needs network)…"
  (cd "$TMP" && npm ci --no-audit --no-fund >/dev/null)
fi

echo "--- dark-theme idempotence ---"
BEFORE=$(sha256sum "$TMP/src/css/styles.css" | cut -d' ' -f1)
(cd "$TMP" && python3 scripts/gen-dark-theme.py)
AFTER=$(sha256sum "$TMP/src/css/styles.css" | cut -d' ' -f1)
if [ "$BEFORE" = "$AFTER" ]; then
  echo "PASS: gen-dark-theme.py is idempotent on current src/css/styles.css"
else
  echo "FAIL: gen-dark-theme.py changed src/css/styles.css — the committed CSS"
  echo "      was edited after its last dark-theme regen. Regen + rebuild + commit needed."
fi

echo "--- build determinism ---"
(cd "$TMP" && node scripts/build.mjs)

FAIL=0
for f in index.html app.js styles.css sw.js; do
  A=$(sha256sum "$REPO/$f"  | cut -d' ' -f1)
  B=$(sha256sum "$TMP/$f"   | cut -d' ' -f1)
  if [ "$A" = "$B" ]; then
    echo "PASS: $f  ($A)"
  else
    echo "FAIL: $f  committed=$A rebuilt=$B"
    FAIL=1
  fi
done

if [ "$FAIL" = 0 ]; then
  echo "DETERMINISM OK: committed outputs are exactly build(src)."
else
  echo "DETERMINISM BROKEN: someone edited generated outputs by hand, or src/"
  echo "changed without a rebuild. Fix: node scripts/build.mjs in the repo,"
  echo "then commit src + outputs together (see yardsmith-change-control)."
  exit 1
fi
