#!/usr/bin/env bash
# Yardsmith environment sanity check — read-only, safe to run anytime.
# Prints tool versions, esbuild resolvability, git clone state.
# Usage: bash .claude/skills/yardsmith-build-and-env/scripts/check-env.sh
set -u
REPO="$(cd "$(dirname "$0")/../../../.." && pwd)"
echo "repo: $REPO"

echo "--- tool versions ---"
echo "node:    $(node --version 2>/dev/null || echo MISSING)"
echo "npm:     $(npm --version 2>/dev/null || echo MISSING)"
echo "python3: $(python3 --version 2>/dev/null || echo MISSING)"

echo "--- esbuild (required by scripts/build.mjs) ---"
if (cd "$REPO" && node -e "require.resolve('esbuild')" 2>/dev/null); then
  V=$(cd "$REPO" && node -e "console.log(require('esbuild/package.json').version)")
  echo "esbuild: resolvable from repo root (v$V) — node scripts/build.mjs will work"
else
  echo "esbuild: NOT resolvable — 'node scripts/build.mjs' will fail with"
  echo "         Cannot find module 'esbuild'. Fix: (cd $REPO && npm ci)"
fi

echo "--- playwright / chromium (for the test harness) ---"
if [ -f /opt/node22/lib/node_modules/playwright/package.json ]; then
  node -e "console.log('global playwright: v' + require('/opt/node22/lib/node_modules/playwright/package.json').version)"
else
  echo "global playwright: not at /opt/node22/lib/node_modules/playwright (path drifted?)"
fi
if [ -x /opt/pw-browsers/chromium-1194/chrome-linux/chrome ]; then
  echo "chromium: $(/opt/pw-browsers/chromium-1194/chrome-linux/chrome --version 2>/dev/null)"
  echo "          at /opt/pw-browsers/chromium-1194/chrome-linux/chrome"
else
  echo "chromium: /opt/pw-browsers/chromium-1194/... missing — run: ls /opt/pw-browsers/"
fi

echo "--- git clone state ---"
if [ -f "$REPO/.git/shallow" ]; then
  echo "SHALLOW CLONE ($(git -C "$REPO" rev-list --count HEAD) commits visible)."
  echo "History work will silently miss most of the repo's past."
  echo "Fix: git -C $REPO fetch --unshallow origin"
else
  echo "full clone: $(git -C "$REPO" rev-list --count HEAD) commits reachable from HEAD"
fi
git -C "$REPO" fetch --quiet origin main 2>/dev/null || true
LOCAL_MAIN=$(git -C "$REPO" rev-parse main 2>/dev/null || echo none)
REMOTE_MAIN=$(git -C "$REPO" rev-parse origin/main 2>/dev/null || echo none)
if [ "$LOCAL_MAIN" != "$REMOTE_MAIN" ]; then
  echo "NOTE: local 'main' ($LOCAL_MAIN) != origin/main ($REMOTE_MAIN)."
  echo "      Local main is often stale in session clones — use origin/main for history queries."
else
  echo "local main == origin/main"
fi
