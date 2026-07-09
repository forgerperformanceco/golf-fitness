---
name: yardsmith-build-and-env
description: >
  Yardsmith build system and dev environment. Load when: setting up a fresh
  clone; "node scripts/build.mjs" fails (Cannot find module 'esbuild'); you
  need to know what is preinstalled vs what needs npm ci; git history looks
  truncated (~50 commits) or local main seems stale (shallow-clone trap);
  you're changing CSS and need the dark-theme regen pipeline
  (gen-dark-theme.py, GENERATED-DARK markers, CORE pins); you need to
  understand {{V}} content-hash cache busting vs the manual ?v= pins on
  cloud-sync.js/coach.js; you want to verify build determinism (rebuild ==
  committed outputs); you're preparing a Capacitor native sync
  (build-www.mjs, cap sync); or you need .env.example / tool-version facts
  for this environment (node, python3, esbuild, playwright, chromium).
---

# Yardsmith — build system & environment

Yardsmith is a vanilla-JS PWA served **as-is from the repo root** by GitHub
Pages (yardsmith.golf). There is no bundler config, no framework, and no
build step in CI: `scripts/build.mjs` runs on the dev machine and the four
outputs it writes (`index.html`, `app.js`, `styles.css`, `sw.js`) are
**committed**. That makes the build both trivially simple and load-bearing:
if you edit `src/` and forget to rebuild-and-commit, the site ships stale.

The one rule that matters (from CLAUDE.md): **edit `src/`, never the four
generated root files** — each carries a `GENERATED` header and any hand edit
is overwritten by the next build.

**When NOT to use this skill:**
- Serving the app locally, deploy workflows, post-deploy verification,
  secrets inventory → `yardsmith-run-and-deploy`.
- Writing Playwright tests (harness recipe, seeds, gotchas) →
  `yardsmith-playwright-harness`. This skill only records the environment
  facts (playwright/chromium versions and paths).
- What evidence gates a merge, commit/push protocol, parallel sessions →
  `yardsmith-change-control`.
- IIFE module semantics, load order, cross-module symbols →
  `yardsmith-architecture-contract`.
- The full staleness/CDN incident chronicle → `yardsmith-failure-archaeology`
  (this skill states only the pin rationale).

## 1. Fresh clone → working environment

### What is already installed (this environment, as of 2026-07-08)

| Tool | Version | Where | Re-verify with |
|---|---|---|---|
| Node | v22.22.2 | on PATH | `node --version` |
| npm | 10.9.7 | on PATH | `npm --version` |
| Python | 3.11.15 | on PATH (`python3`) | `python3 --version` |
| Playwright (global) | 1.56.1 | `/opt/node22/lib/node_modules/playwright` | `node -e "console.log(require('/opt/node22/lib/node_modules/playwright/package.json').version)"` |
| Chromium | 141.0.7390.37 (build 1194) | `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (symlink `/opt/pw-browsers/chromium` → same binary) | `/opt/pw-browsers/chromium-1194/chrome-linux/chrome --version` |
| esbuild | **NOT preinstalled** | — | `node -e "console.log(require.resolve('esbuild'))"` (from repo root) |

Or run the whole check at once:

```
bash .claude/skills/yardsmith-build-and-env/scripts/check-env.sh
```

### Does the build work out of the box? NO — verified 2026-07-08

`scripts/build.mjs` does `import { transformSync } from "esbuild"`. In this
checkout `node_modules/` is not installed, there is no global esbuild, and
`NODE_PATH` is empty, so from the repo root:

```
node -e "console.log(require.resolve('esbuild'))"
# → Error: Cannot find module 'esbuild'
```

Therefore `node scripts/build.mjs` fails immediately with
`ERR_MODULE_NOT_FOUND` (the import is resolved before any code runs, so
nothing is written — a failed build never corrupts the outputs).

**The fix — the npm-ci path (verified, ~2 s, network via the session proxy):**

```
cd /home/user/golf-fitness
npm ci --no-audit --no-fund     # 102 packages; node_modules/ is gitignored
node scripts/build.mjs          # → build: v=04f691fff1 · app.js 312k min (463k src, 24 parts) · …
```

`npm ci` installs exactly what `package-lock.json` pins: **esbuild 0.28.1**
(the devDependency spec is `^0.28.1`), plus `playwright-core 1.61.1` and
`@capacitor/cli` + the Capacitor plugins. All of it lands in the gitignored
`node_modules/`; nothing else in the tree changes.

Alternative (what a read-only investigation should do): copy
`src/ scripts/ package.json package-lock.json` into a scratch directory,
`npm ci` **there**, and build in the copy — see §6.

⚠️ Version-skew note for the test harness: the repo's `playwright-core`
devDependency is **1.61.1**, which expects Chromium build **1228**; the
box's preinstalled browser is build **1194** (paired with global Playwright
1.56.1). Either library works, but only if you pass
`executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`
explicitly — never rely on Playwright auto-locating a browser here. Details
in `yardsmith-playwright-harness`.

### What needs no install at all

- **Serving the committed build**: any static server over the repo root
  (global `http-server` and `serve` exist under
  `/opt/node22/lib/node_modules/`). See `yardsmith-run-and-deploy`.
- **Dark-theme generation**: `scripts/gen-dark-theme.py` imports only the
  Python stdlib (`re, colorsys, sys, os`) — no pip, no venv.

## 2. The shallow-clone trap

Session clones of this repo have arrived **shallow** (a `.git/shallow` file,
only ~50 commits visible, history starting mid-project) and with a **stale
local `main`** ref. Both will silently corrupt any history-based reasoning
("when was X introduced", "did we ever try Y").

Check and fix:

```
test -f .git/shallow && echo "SHALLOW — fix before any history work"
git fetch --unshallow origin        # errors harmlessly if already complete
git rev-list --count origin/main    # full history: 281 commits as of 2026-07-08 (HEAD f21930a)
```

Even after unshallowing, **use `origin/main` for history queries, not
`main`**: as of 2026-07-08 this checkout's local `main` points at `8ab7510`
(95 commits behind `f21930a`). `check-env.sh` (§1) reports both conditions.

Full archaeology methodology lives in `yardsmith-failure-archaeology`.

## 3. build.mjs mechanics (scripts/build.mjs, 95 lines)

What one run does, in order (all verified against the source and by running
it in a scratch copy):

1. **Concatenate** `src/js/app/*.js` — read, **sorted by filename** (the
   numeric prefixes ARE the load order), each part prefixed with a
   `/* ────────── js/app/NNN-name.js ────────── */` banner — into a single
   `(function () { "use strict"; … })()` IIFE. Currently 24 parts.
2. **Append** `src/js/global/*.js` (only `900-sw-register.js`) *after* the
   IIFE — this code must run outside it (build.mjs:47-51).
3. **Minify** the JS with esbuild `transformSync({ minify: true, target:
   "es2017" })` (build.mjs:37-39) — es2017 is a deliberate syntax ceiling;
   don't introduce newer syntax than the codebase's async/await baseline.
   Minify `src/css/styles.css` with the esbuild CSS loader.
4. **Hash**: `V = sha256(minified js + minified css + raw index template +
   raw sw template).slice(0, 10)` (build.mjs:67-68). The hash covers the
   **minified shipped bytes** on purpose: an esbuild upgrade that changes
   emitted bytes must also change the hash or installed PWAs would
   cache-match stale copies (comment at build.mjs:63-66). Corollary,
   verified: a whitespace/comment-only `src/` change that minifies to
   identical bytes produces the **same** hash — no spurious cache bust.
5. **Stamp** `V` into every `{{V}}` and write four files to the repo root,
   each with a `GENERATED` header:
   - `app.js` — minified IIFE + globals.
   - `styles.css` — minified CSS (includes the GENERATED-DARK block, §5).
   - `index.html` — from `src/index.template.html`; a GENERATED comment is
     injected after `<!doctype html>`.
   - `sw.js` — from `src/sw.template.js`, `{{V}}` replaced **then** minified.
6. Print one line you should always read:
   `build: v=04f691fff1 · app.js 312k min (463k src, 24 parts) · styles.css 158k min · index.html 24k`
   (current values as of HEAD `f21930a`; a changed part count means a module
   was added/removed).

There is deliberately **no npm script for it** — always invoke directly:
`node scripts/build.mjs`.

### Watch mode

```
node scripts/build.mjs --watch
```

Initial build, then `fs.watch` on exactly four directories — `src/`,
`src/css/`, `src/js/app/`, `src/js/global/` (non-recursive; that set covers
every source file) — with a 120 ms debounce; build errors are printed and
watching continues (build.mjs:86-95). Verified: touching a file under
`src/js/app/` triggers a rebuild within ~1 s.

## 4. {{V}} vs the manual ?v= pins

### What {{V}} buys

Every `{{V}}` site becomes the 10-char content hash, so **cache busting is
fully automatic** for everything the build produces — no manual
service-worker `yardsmith-vNNN` bumps ever (the pre-build era burned ~120
manual bumps in 9 days; see `yardsmith-failure-archaeology`). The exact
`{{V}}` sites (verified):

| File | Line | Becomes |
|---|---|---|
| `src/index.template.html` | 47 | `styles.css?v=<hash>` |
| `src/index.template.html` | 362 | `window.FF_BUILD="<hash>"` (the in-app version card / deploy canary) |
| `src/index.template.html` | 363 | `app.js?v=<hash>` |
| `src/sw.template.js` | 4 | `CACHE = 'yardsmith-<hash>'` (new build ⇒ old caches purged on activate) |
| `src/sw.template.js` | 8, 10 | precache URLs for styles.css / app.js |

### The two files that still need manual pins — and why

`cloud-sync.js` and `coach.js` live at the **repo root**, are hand-edited
directly (they are NOT build outputs — no GENERATED header), and are loaded
by URL. They therefore sit outside the hash. Each carries a manual `?v=`
pin in **four places** (verified current values as of 2026-07-08):

| Pin | Locations |
|---|---|
| `cloud-sync.js?v=112` | `src/index.template.html:369`, `src/sw.template.js:12` |
| `coach.js?v=88` | `src/index.template.html:371`, `src/sw.template.js:13` |

**Rule: any edit to `cloud-sync.js` or `coach.js` must bump that file's pin
in BOTH templates, then rebuild.** (Bumping a pin changes the templates,
which changes the content hash too — so the SW cache rolls automatically.)

**Why pins exist (the CDN incident, commit `cf590f5`, 2026-06-30):** these
scripts were once loaded with no version in the URL. GitHub Pages' shared
CDN edge kept serving stale cached copies — *even in incognito*, which skips
local cache but still hits the edge. "The code on main was correct — the
bytes users got were stale." A versioned URL is a brand-new URL the CDN has
never cached, so every release is guaranteed fresh. Re-verify current pin
values anytime with:

```
grep -n "cloud-sync.js?v=\|coach.js?v=" src/index.template.html src/sw.template.js
```

## 5. Dark-theme pipeline

The dark theme is **generated CSS inside a source file**:
`scripts/gen-dark-theme.py` parses the light-mode rules of
`src/css/styles.css`, classifies each rule's hex colors by lightness
(light backgrounds L > 0.65 get darkened with hue kept / saturation capped;
dark text gets lightened; dark/mid surfaces are left untouched so the
dark-green hero cards survive as-is), and rewrites everything between the
markers:

```
src/css/styles.css:1937   /* ===== GENERATED-DARK: auto dark theme — edit scripts/gen-dark-theme.py, not this block ===== */
src/css/styles.css:2504   /* ===== /GENERATED-DARK ===== */
```

(Line numbers drift with every CSS edit — re-find with
`grep -n "GENERATED-DARK" src/css/styles.css`.)

Each rule is emitted **twice**: once under
`@media (prefers-color-scheme: dark)` scoped to
`html:not([data-theme="light"])` (system dark unless user forced light), and
once under `html[data-theme="dark"]` (user forced dark).

**The workflow after ANY CSS change:**

```
python3 scripts/gen-dark-theme.py && node scripts/build.mjs
# expected first line: dark theme: 279 rules x2 variants, 1 media-scoped   (counts as of 2026-07-08)
```

Rules:
- Write light-mode styles **above** the GENERATED-DARK markers only. Never
  hand-edit inside the block.
- Hand-pinned dark overrides the mechanical transform can't derive (token
  overrides like `--paper`/`--card`, rgba()/var()-backed surfaces such as
  the mobile tab bar, input/select backgrounds, the two buttons that keep
  light-mode green) live in the **`CORE` list at
  `scripts/gen-dark-theme.py:129-138`** — edit there, then regen + rebuild.
- The script is **idempotent** (verified 2026-07-08: running it on current
  `src/css/styles.css` leaves the file byte-identical, and a rebuild keeps
  hash `04f691fff1`). It never re-processes its own block — it splits the
  file at the first marker before parsing. If a regen on an *unchanged*
  stylesheet produces a diff, something upstream changed (Python version or
  a hand edit inside the block) — investigate before committing.
- No dependencies: Python 3 stdlib only.

## 6. Build determinism — a certifiable invariant

As of 2026-07-08 (HEAD `f21930a`), the four committed outputs are
**byte-for-byte** what `build(src)` produces — verified: sha256 of a
scratch-copy rebuild matches the committed
`index.html 7888f5ac…, app.js a51da8f7…, styles.css 5eb7dd43…, sw.js f53e63b9…`,
build hash `04f691fff1` (= `window.FF_BUILD` in `index.html`). This is the
repo's strongest integrity check: it proves nobody hand-edited a generated
file and no `src/` change shipped without its rebuild.

**How to check it — use the copy-based recipe, not the real tree:**

```
bash .claude/skills/yardsmith-build-and-env/scripts/check-build-determinism.sh
```

The script copies `src/ scripts/ package*.json` to a throwaway `$TMPDIR`
dir, reuses the repo's `node_modules` if present (else `npm ci` in the
copy), checks gen-dark-theme idempotence, builds, and compares sha256
against the committed outputs. Exit 0 = deterministic. It never writes to
the repo. (Run green 2026-07-08: idempotence PASS + 4/4 hash PASS.)

⚠️ **If you instead rebuild in the real repo** (which the normal
edit→rebuild→commit workflow does anyway): only run a "rebuild → `git diff`
empty" check when the tree is already clean, and never leave the tree dirty
afterwards. If the diff is NOT empty you've just overwritten committed
outputs — restore them (`git checkout -- index.html app.js styles.css sw.js`
… but see `yardsmith-change-control` before running any mutating git
command) and figure out *why* first: either someone hand-edited an output
(their edit is now lost from the working tree — recover it from git and
port it into `src/`), or a `src/` change was committed without its rebuild
(in which case the fresh outputs are correct and should be committed).

Determinism can legitimately break on an **esbuild version change**
(different emitted bytes ⇒ different hash — by design, §3 step 4). The
lockfile pins 0.28.1; if `npm ci` ever installs something else, expect a
full-output diff that is *correct* and must be committed as such.

## 7. Native shells: build-www.mjs + Capacitor sync

`scripts/build-www.mjs` (56 lines) gathers **only the served files** into
`www/` for Capacitor — an explicit allow-list of 16 root files
(index/app/styles/sw + `cloud-sync.js`, `coach.js`, `privacy.html`,
manifest, icons, og/social shots) plus the `splash/` and `fonts/` dirs,
wiping `www/` first so removed assets never linger. No hashing, no
minifying — it copies the already-built outputs, so **always run
`node scripts/build.mjs` first** (a stale root = a stale native bundle).

```
node scripts/build-www.mjs        # or: npm run build:www
npx cap sync                      # or: npm run sync (= build:www + cap sync)
```

Facts (verified):
- `capacitor.config.json`: `appId app.yardsmith`, `webDir "www"`.
- `www/` is **gitignored** (generated); the `android/` project **is
  committed**; `ios/` is not present in the repo (generated in CI — see
  `yardsmith-run-and-deploy` for Codemagic).
- `cap sync` copies `www/` into `android/app/src/main/assets/public/`
  (gitignored) — it mutates the working tree only in ignored paths.
- `@capacitor/cli` is a devDependency, so `npx cap` works after `npm ci`.
  Note: `cap sync` was **not** executed during authoring of this skill
  (it writes into `android/`-ignored paths and needs the CLI installed);
  the command and paths above are verified from `package.json`,
  `.gitignore`, and `capacitor.config.json` only.

## 8. .env.example anatomy

`.env.example` (34 lines, tracked; real `.env` is gitignored) is a
placeholder-only template with four sections:

1. **Supabase, client-safe** — `SUPABASE_URL`, `SUPABASE_ANON_KEY`: the only
   two values allowed in the browser (they're wired into `cloud-sync.js`).
2. **Supabase service role, SERVER ONLY** — `SUPABASE_SERVICE_ROLE_KEY`
   (bypasses RLS; set via `supabase secrets set`, used by paddle-webhook).
3. **Anthropic, SERVER ONLY** — `ANTHROPIC_API_KEY`, `AI_COACH_MODEL`
   (default `claude-opus-4-8`; cheaper options noted in-file).
4. **Paddle** — `PADDLE_WEBHOOK_SECRET` (server only), `PADDLE_CLIENT_TOKEN`
   (browser-safe), `PADDLE_ENV` (sandbox/production), monthly/annual price
   IDs.

Notably **absent**: VAPID push keys — the public key is hardcoded in
`cloud-sync.js` (`FF_PUSH_PUB`) and the private half exists only as an Edge
Function secret (`scripts/gen-vapid.mjs` mints a pair and prints without
writing; rotation invalidates every subscription). The full
browser-safe-vs-server-only secrets inventory and where each secret actually
lives is owned by `yardsmith-run-and-deploy`.

## 9. Quick reference — the three build commands

| Situation | Run |
|---|---|
| Changed anything under `src/js/` or a template | `node scripts/build.mjs` |
| Changed `src/css/styles.css` | `python3 scripts/gen-dark-theme.py && node scripts/build.mjs` |
| Edited `cloud-sync.js` or `coach.js` | bump its `?v=` pin in `src/index.template.html` AND `src/sw.template.js`, then `node scripts/build.mjs` |
| Iterating | `node scripts/build.mjs --watch` |
| Preparing a native build | `node scripts/build.mjs` then `npm run sync` |

Always commit `src/` changes **together with** the rebuilt outputs — CI has
no build step; the committed outputs are what ships (merge-gating and commit
protocol: `yardsmith-change-control`).

## Provenance and maintenance

Everything above was verified against HEAD `f21930a` on **2026-07-08** by
reading the scripts and running the build + dark-theme regen in a scratchpad
copy (real tree untouched). One-liners to re-verify anything that may drift:

| Fact | Re-verify |
|---|---|
| Tool versions, esbuild resolvability, clone state | `bash .claude/skills/yardsmith-build-and-env/scripts/check-env.sh` |
| Build determinism + dark-theme idempotence | `bash .claude/skills/yardsmith-build-and-env/scripts/check-build-determinism.sh` |
| Current build hash | `grep -o 'FF_BUILD="[a-f0-9]*"' index.html` (04f691fff1 as of 2026-07-08) |
| Manual pin values (112 / 88) | `grep -n "cloud-sync.js?v=\|coach.js?v=" src/index.template.html src/sw.template.js` |
| esbuild pinned version (0.28.1) | `grep -A1 '"node_modules/esbuild"' package-lock.json \| head -2` |
| GENERATED-DARK marker lines (1937/2504) | `grep -n "GENERATED-DARK" src/css/styles.css` |
| CORE hand-pin list location | `grep -n "^CORE" scripts/gen-dark-theme.py` (line 129 as of 2026-07-08) |
| App module count (24) | `ls src/js/app/*.js \| wc -l` |
| Dark-theme rule count (279 ×2, 1 media-scoped) | printed by `python3 scripts/gen-dark-theme.py` (run in a copy) |
| Chromium build dir (chromium-1194) | `ls /opt/pw-browsers/` |
| build-www allow-list (16 files + splash, fonts) | read `scripts/build-www.mjs:18-37` |
| Shallow/stale-main state | `test -f .git/shallow; git branch -vv \| head` |

Known-drifting facts: pin numbers bump with every cloud-sync/coach edit; the
build hash changes with every source change; styles.css marker line numbers
move with every CSS edit; `/opt/*` paths are properties of the session
environment, not the repo — re-check them in any new environment.
