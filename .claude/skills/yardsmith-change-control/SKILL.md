---
name: yardsmith-change-control
description: >
  THE MERGE GATE for the Yardsmith repo — load this before committing, pushing,
  or merging ANY change, before classifying what a diff will trigger in CI,
  when a git push is rejected, when you hit a merge conflict (especially in
  index.html/app.js/styles.css/sw.js), when adding/renaming/deleting anything
  stored in localStorage, when editing cloud-sync.js or coach.js, or when
  deciding which docs must be updated with a change. Owns: change
  classification, the release-discipline checklist, every non-negotiable rule
  with its rationale and historical incident, the parallel-sessions git
  protocol, the evidence bar for merging, and the docs-of-record duty.
  Keywords: commit, push, merge, PR, release, deploy trigger, force-push,
  rebase, conflict, generated files, ?v= pin, cache bust, MERGE registry,
  tombstone, ff_ keys, DESIGN-CHANGES, YARDSMITH-BRAIN.
---

# Yardsmith change control — the gate every change goes through

**This skill is the gate every other skill routes through.** Whatever you are
doing — a feature (yardsmith-architecture-contract), a bug fix
(yardsmith-debugging-playbook), a data/sync change (yardsmith-data-and-sync),
a campaign (yardsmith-speed-day-campaign), an experiment
(yardsmith-research-methodology) — the moment the work becomes a commit, it
passes through the checklist and non-negotiables below. No sibling skill may
route around this one. If you learn only one thing: **merging to `main`
deploys the live app at yardsmith.golf with no CI build and no CI tests** —
the discipline in this file is the only quality gate that exists.

**When NOT to use this skill:** build/toolchain mechanics and environment
setup (→ `yardsmith-build-and-env`); writing the Playwright evidence itself
(→ `yardsmith-playwright-harness`); what thresholds count as passing
(→ `yardsmith-validation-and-qa`); deploy-workflow internals and post-deploy
verification (→ `yardsmith-run-and-deploy`); doc templates and house style
(→ `yardsmith-docs-and-writing`); localStorage key shapes and merge mechanics
(→ `yardsmith-data-and-sync`); the story of past incidents in full
(→ `yardsmith-failure-archaeology` — this file keeps only the lesson each
incident bought).

Repo facts as of 2026-07-08 (re-verify: see Provenance): HEAD `f21930a`,
281 commits, remote `forgerperformanceco/golf-fitness`, default branch `main`,
build hash `04f691fff1`, manual pins `cloud-sync.js?v=112` / `coach.js?v=88`.

---

## 1. Change classification — know what your diff triggers

There are exactly two workflows in `.github/workflows/`: `deploy.yml`
(GitHub Pages) and `deploy-functions.yml` (Supabase). **Neither builds
anything and neither runs tests** (verified 2026-07-08 by reading both files).
Classify every change before you commit:

| Class | Paths touched | CI triggered on push to `main` | What actually ships |
|---|---|---|---|
| **Served-files change** | `src/**` **plus** the regenerated root outputs (`index.html`, `app.js`, `styles.css`, `sw.js`), and/or other served root files (`manifest.webmanifest`, `privacy.html`, icons, `fonts/`, `splash/`, `cloud-sync.js`, `coach.js`, `CNAME`) | `deploy.yml` → full Pages deploy of the repo root minus a deny-list | The **committed** root files, byte-for-byte. CI does not rebuild. |
| **Docs-only** | any `**.md` | **Nothing.** Both workflows skip (`deploy.yml` has `paths-ignore: '**.md'`; `deploy-functions.yml` only watches `supabase/**`) | Nothing changes on the live site. Safe to push freely. |
| **Backend** | `supabase/**` (or `.github/workflows/deploy-functions.yml` itself) | `deploy-functions.yml`: applies `supabase/schema.sql` idempotently via the Supabase Management API to project `tbwmckmyzoxzhpqlomsp`, deploys `delete-account` always, deploys `ai-coach` only if the `ANTHROPIC_API_KEY` repo secret exists. **`paddle-webhook` and `push-daily` are NOT auto-deployed** (deliberate — billing off, push is a manual runbook; → `yardsmith-run-and-deploy`) | Live database schema + two edge functions |
| **Native** | `android/**`, `ios/**`, `codemagic.yaml`, `capacitor.config.json`, `package.json` | **Nothing** in this repo (all in `deploy.yml` `paths-ignore`). Native builds run externally on Codemagic (→ `yardsmith-run-and-deploy`) | Nothing, until a Codemagic build is triggered |
| **`.claude/**` (skills)** | `.claude/skills/**` | `*.md` files: nothing. **Any non-`.md` file (e.g. a skill's `scripts/*.mjs`) triggers a full Pages redeploy** — `.claude` is not in `paths-ignore` | Redeploy of unchanged content (harmless). Publication nuance below. |

Three verified subtleties that bite:

1. **`src/**` and `scripts/**` are in `deploy.yml`'s `paths-ignore`**
   (deploy.yml:18-19). A commit that touches only `src/` — i.e. you forgot to
   rebuild — triggers **no deploy at all**, and even when a deploy does fire,
   it publishes the committed outputs unchanged. Both halves of the mistake
   are silent. This is why non-negotiable N2 exists.
2. **The Pages stage is a deny-list rsync** (deploy.yml:63-74): everything in
   the repo root ships to yardsmith.golf EXCEPT `.git .github _site
   node_modules www supabase android ios assets scripts src social`, all
   `*.md`, `.env*`, `.gitignore`, `package*.json`, `capacitor.config.json`,
   `codemagic.yaml`, `logo-source*.png`. Deny-list was chosen deliberately
   after incident `fcbbc35` "so a new served asset is never dropped by
   accident" — the flip side: **any new root file you commit is public at
   yardsmith.golf unless it matches an exclude**. rsync excludes match path
   *basenames* at any depth, so `.claude/skills/*/SKILL.md` (`*.md`) and
   `.claude/skills/*/scripts/` (dir named `scripts`) do NOT publish, but any
   other non-md file placed under `.claude/` **would** be served publicly.
   (The repo is public anyway, but don't put anything on the app domain by
   accident.)
3. **`deploy.yml` also fires on the legacy branch
   `claude/golf-macro-calculator-j2e9vk`** (deploy.yml:11) — never push to
   that branch.

CI/deploy incident record: Pages deploys used to time out because every push
(even markdown-only) queued a full deploy with no cancellation — fixed
`be6772c` (2026-07-02, `cancel-in-progress: true` + `paths-ignore`); and Pages
originally served the *entire repo* — strategy docs, marketing assets — at the
app domain, fixed `fcbbc35` (same day) with the rsync deny-list.

---

## 2. The release-discipline checklist (every served-file change)

This is YARDSMITH-BRAIN.md "Release discipline" (line 375) + CLAUDE.md,
expanded and verified. Run it top to bottom; skipping steps is how every
incident in §3 happened.

1. **Edit `src/`, never the repo-root outputs.** Routing table (from
   CLAUDE.md, the authority): app behavior → `src/js/app/*.js`; code outside
   the IIFE → `src/js/global/*.js`; styles → `src/css/styles.css` (above the
   `GENERATED-DARK` markers, lines 1937/2504); markup/meta/script tags →
   `src/index.template.html`; service worker → `src/sw.template.js`.
   Module/IIFE rules → `yardsmith-architecture-contract`.

2. **Rebuild.**
   ```
   node scripts/build.mjs
   ```
   If you touched **any CSS**, regenerate the dark theme first:
   ```
   python3 scripts/gen-dark-theme.py && node scripts/build.mjs
   ```
   Hand-pinned dark overrides go in the `CORE` list inside
   `scripts/gen-dark-theme.py` (line 129), never in the generated CSS block.
   Prerequisite: esbuild must be installed (`npm install` in the repo — as of
   2026-07-08 a fresh checkout has no `node_modules` and the build fails with
   `Cannot find module 'esbuild'`; details → `yardsmith-build-and-env`).

3. **Never bump the service-worker cache manually.** The 10-char content hash
   (`{{V}}`) does it. The ONLY manual versioning left in the system: if you
   edited `cloud-sync.js` or `coach.js` (hand-maintained files at the repo
   root, outside the build), bump their `?v=` pin in **both**
   `src/index.template.html` (lines 369/371) and `src/sw.template.js`
   (lines 12-13), then rebuild. Current pins as of 2026-07-08: v=112 / v=88.
   Why this exists: incident N6 below.

4. **Data changes get the data checklist.** Adding a roaming `ff_*` key,
   deleting stored entries, or renaming anything user-visible that doubles as
   a storage key → run the checklist in `yardsmith-data-and-sync` **in the
   same PR** (non-negotiables N5, N7, N8 below are the change-control face of
   those rules).

5. **Verify against the BUILT output with headless Playwright** (rebuild
   first — tests drive the repo-root files, not `src/`). Harness recipe and
   its gotchas → `yardsmith-playwright-harness`. What counts as passing
   (zero pageerrors, no leaked `undefined`/`NaN`/`{{V}}`, ≥44px targets,
   audit batteries, the "Verified" paragraph) → `yardsmith-validation-and-qa`.

6. **Run the machine gate** shipped with this skill:
   ```
   node .claude/skills/yardsmith-change-control/scripts/check-release.mjs
   ```
   It rebuilds `src/` in a throwaway temp dir (never writes to the repo) and
   fails if: committed outputs ≠ build(src); dark-theme regen would change
   the outputs; any `{{V}}` leaked; the `?v=` pins disagree between the two
   templates; or `cloud-sync.js`/`coach.js` changed vs `origin/main` without
   a pin bump. Exit 0 = clean, 1 = do not merge, 2 = environment can't run it
   (it prints the fix). Run green 2026-07-08 against HEAD `f21930a`.

7. **Commit `src/` and the regenerated outputs together, in one commit.**
   Push early, push small (long-lived local work is what makes the §4 rebases
   hurt). Commit messages in this repo carry the "why" — reversals are always
   forward-fixes with rationale (verified: zero `git revert` commits in 281).

8. **Update the docs of record in the same push** (see §6): DESIGN-CHANGES.md
   for design/UX work (with its "Verified" paragraph), YARDSMITH-BRAIN.md for
   product/strategy/number changes. Doc commits are free — they trigger no
   redeploy.

9. **After merge, confirm the deploy**: green run in the Actions tab, then the
   You-tab "App version" card on a device must show the new `FF_BUILD` hash.
   Post-deploy verification and the force-refresh escape hatch →
   `yardsmith-run-and-deploy`.

For native shells, additionally `node scripts/build-www.mjs` + `npx cap sync`
(→ `yardsmith-build-and-env` / `yardsmith-run-and-deploy`).

---

## 3. The non-negotiables — rule, rationale, and the incident that bought it

Each of these was paid for. Do not relitigate them; if you think one is wrong,
that argument goes to the owner via YARDSMITH-BRAIN.md, not into a commit.

### N1 — Never hand-edit the generated outputs
`index.html`, `app.js`, `styles.css`, `sw.js` at the repo root are build
products; any hand edit is silently overwritten by the next
`node scripts/build.mjs` from anyone's session. `app.js`, `styles.css`,
`sw.js` carry a first-line `GENERATED (minified)` header. **Quirk (verified
2026-07-08): `index.html` carries NO generated marker** — `build.mjs:71`
inserts the comment by replacing lowercase `<!doctype html>`, but the template
starts with uppercase `<!DOCTYPE html>`, so the replace never matches. Don't
let the missing header fool you: index.html is just as generated as the rest.
*History:* until modularization (`dce7a6f`, PR #13, 2026-07-05) the app WAS a
single hand-edited `index.html`; the split into `src/` + build outputs is what
ended the staleness treadmill (N6) — editing outputs directly reopens it.

### N2 — Commit the rebuilt outputs together with the `src/` change
**CI has no build step** — `deploy.yml` rsyncs the repo root as-is. And
because `src/**` is in `paths-ignore`, a src-only commit doesn't even trigger
a deploy: the live site silently keeps serving the old build while `main`
looks updated. Failure is doubly silent; the §2.6 gate script is the
detector. One commit = src + outputs, always.

### N3 — Never force-push. Ever.
Not `--force`, not `--force-with-lease`, not to "clean up". The owner runs
**multiple Claude sessions against `main` at once**; the non-fast-forward
rejection is the only thing preventing one session from erasing another's
work. *History:* this is not hypothetical — on the evening of 2026-07-07 two
sessions interleaved commits on `main` within minutes: session `…012PnZ…`
landed sync-integrity PRs #60 (`5473249`, 22:01) and #61 (`02b1f6d`, 22:09)
while session `…01H8Ck…` landed the rebrand follow-ups (`2948b61`, 22:28;
`8467e6d`, 23:15). A force-push from either would have destroyed the other's
merged work. The protocol was codified the next day in `1282f87`
("CLAUDE.md: parallel-session protocol"). On rejection, follow §4.

### N4 — Conflicts in generated files: take either side, then rebuild
Never hand-merge `index.html`, `app.js`, `styles.css`, `sw.js` (or `www/` —
untracked anyway). They are minified single-line build products; a hand merge
is both impossible and pointless because `node scripts/build.mjs` regenerates
truth from the already-merged `src/`. Resolve the `src/` conflict properly,
`git checkout --ours` (or `--theirs`) the generated files just to unblock the
merge, rebuild, and commit the rebuild.

### N5 — New additive `ff_*` key ⇒ `KEYS` + `MERGE` registry entry in the SAME PR
`cloud-sync.js` line 20 (`KEYS`, 26 entries) decides what roams;
the `MERGE` registry (line 431) decides how conflicts merge. **Any key not in
`MERGE` is treated as a setting and takes the cloud value on conflict** — for
a key that accumulates history, that is cross-device data loss. The registry
comment (cloud-sync.js:427-430) is explicit: "Adding a new ff_* history key?
Add its merge here in the same PR — a missed entry means cross-device data
loss for that key." And bump the `cloud-sync.js` `?v=` pin (N6) since you
edited the file. Key shapes and union functions → `yardsmith-data-and-sync`.
*History:* PR #60 (`5473249`, 2026-07-07) found that **four keys had silently
drifted into cloud-wins despite holding history** — `ff_rounds`,
`ff_speedtest`, `ff_mobility`, `ff_fuel` — because the old `mergeBlob` was an
if/else chain new keys simply fell through. "A round/meal/test logged on one
device no longer vanishes at the next merge" (commit message). The registry
turned the omission from silent loss into a reviewable one-liner.

### N6 — Manual `?v=` pins for `cloud-sync.js`/`coach.js` only; bump on every edit, in BOTH templates
Everything built gets automatic hash busting; these two hand-maintained files
do not, so their pin IS their cache buster — in `src/index.template.html`
(script tags) **and** `src/sw.template.js` (precache list); exact lines and
current pin values → `yardsmith-build-and-env` §4. Forgetting either half
means some users run old code indefinitely. *History — the CDN incident, `cf590f5` (2026-06-30):* user
report "still says 6 digits even in incognito." The two files were loaded
with **no version in the URL**, so GitHub Pages' shared CDN edge kept serving
stale copies — incognito skips *local* cache but still hits that edge. "The
code on main was correct — the bytes users got were stale." Also the reason
manual busting is otherwise banned: before content hashing (#13, `dce7a6f`)
the team hand-bumped the SW cache ~120 times in 9 days (v5 `ba95d0a` →
v122 `1163506`, including v14 twice in one hour, `b18bf8e`/`cfcffaa`) and
still shipped stale bytes repeatedly. Pin mechanics → `yardsmith-build-and-env` §4;
the rest of the staleness war (no-store HTML, resume-time update checks,
force refresh — `27e5655` #56) → `yardsmith-run-and-deploy` /
`yardsmith-failure-archaeology`.

### N7 — Never rename the `"fairwayfuel"` profile key or any stored `ff_*` key
Renaming a localStorage key orphans every existing user's data on-device AND
in their synced cloud blob (and a union merge can resurrect the old key from
the cloud after you "migrated" it). *History:* the July 2026 rebrand
(`89bab89`) renamed the company, the domain, the bundle id, the SW cache
prefix, the docs — and the commit lists localStorage keys under "Deliberately
UNCHANGED (data + live-site compatibility)". If a key's *meaning* must change,
that is a migration, not a rename: `ff_schema` ladder or an idempotent
per-load healer — patterns and rules → `yardsmith-data-and-sync`.

### N8 — Tombstone before you delete
Any code path that removes a synced entry (a logged workout, a history row)
must write a tombstone first (`ffTomb(key)` →
`src/js/app/050-exercise-history-every-lift-s-full-story.js:197`, keys like
`"L:week|day"` / `"H:histId"`), or the sync union merge will resurrect the
deletion from another device's copy. *History:* discovered when clear/delete
first shipped — `9b5a3dc` (2026-07-01) "Add clear-workout and
delete-from-history, with sync-safe tombstones"; the pattern was reused for
the full Train reset in #61 (`02b1f6d`). Tombstone semantics (newer-ts
re-creation wins, self-pruning) → `yardsmith-data-and-sync`.

### N9 — Evidence before merge (no "it looks right")
A change is mergeable when the evidence in §5 exists — not when the code
compiles, not when one happy path clicked. *History — the bug that survived
its own fix:* the Train reset button was "fixed" in #52 (`3b0dd98`), again in
#53, was STILL missing on speed day at #58, and only died in #59 (`ada5c0b`),
whose commit message is a written post-mortem: "the speed-day reset bug
survived because tests exercised the Today path while the button lived in
logFoot (Full-week/non-featured)" — **green tests, real bug**. The user's
verbatim reaction is preserved as the DESIGN-CHANGES §60 header: "you had me
feeling crazy. Make sure you are checking for bugs along the build." The fix
institutionalized state-matrix audits (9 states × light/dark = 18/18).
Test the surface the change actually lives on, in every view mode.

### N10 — Record the decision, or it didn't happen
"The repo docs are the only memory shared between sessions. A decision that
lives only in one chat doesn't exist for the other" (CLAUDE.md). See §6.

---

## 4. Parallel-sessions git protocol (exact moves)

Assume another session may be pushing to `main` right now (§N3 history).

**On `git push` rejection (non-fast-forward):**
```
git fetch origin main
git rebase origin/main
# resolve src/, docs, cloud-sync.js/coach.js conflicts properly;
# for each CONFLICTED generated output, just take either side to unblock
# (the rebuild below regenerates truth, so the side chosen is irrelevant):
git checkout --ours index.html   # repeat per conflicted output; --theirs works equally
git add -A && git rebase --continue
node scripts/build.mjs        # + gen-dark-theme.py first if CSS was involved
node .claude/skills/yardsmith-change-control/scripts/check-release.mjs
git add index.html app.js styles.css sw.js && git commit --amend --no-edit   # fold the rebuild into the rebased commit
git push
```
Rules: **never** `--force`/`--force-with-lease` around a rejection; always
rebuild after a rebase that touched `src/` on either side (the other session's
src changes must land in the outputs your commit ships); re-run the gate; if
the other session's changes might interact with yours, re-run your Playwright
evidence too. Docs conflicts (DESIGN-CHANGES.md/YARDSMITH-BRAIN.md) are merged
by hand like any prose — keep both sessions' entries.

If two sessions must work simultaneously on adjacent code, prefer small
sequential pushes over long-lived divergence — the Jul 5-8 PR era (#13-#66)
ran from one long-lived branch (`claude/golf-app-evaluation-tyv6ri`, still on
the remote) while the rebrand session committed directly to `main`, and
non-fast-forward + rebase-rebuild was sufficient coordination.

---

## 5. What evidence must exist before merging

The full definitions live in `yardsmith-validation-and-qa` (thresholds,
audit batteries, the "Verified" paragraph convention) and
`yardsmith-playwright-harness` (how to produce it). The gate summary:

- **Machine checks**: §2.6 gate script exit 0.
- **Behavioral evidence**: a headless-Playwright run against the freshly BUILT
  output demonstrating the change works and nothing regressed — zero page
  errors, seeded realistic state, both themes where visuals changed, every
  view mode the changed surface renders in (N9's lesson).
- **Standing audits** when in scope: state-matrix (Train), scroll
  preservation, type scale, contrast — re-run the relevant battery for
  structural/UI changes ("full battery" for anything cross-cutting).
- **A written "Verified" paragraph** in the DESIGN-CHANGES.md entry stating
  exactly what was asserted and the result (e.g. "18/18 clean") — this prose
  is the durable artifact; the test scripts themselves are session-ephemeral
  (no test has ever been committed to this repo, verified 2026-07-08).

There is no reviewer and no CI test job to catch you. The evidence paragraph
is the review.

---

## 6. The docs-of-record duty (part of every change)

Two documents are the shared memory between sessions; updating them is a
release step, not housekeeping (CLAUDE.md rule; YARDSMITH-BRAIN.md line 486:
"Keep this brain current"). Which doc, and the entry formats/precedence →
`yardsmith-docs-and-writing`. The change-control duty:

| Change type | Update |
|---|---|
| Design/UX/feature work, bug fixes with lessons | **DESIGN-CHANGES.md** — numbered section, verbatim user feedback if any, findings → fixes, ending in the "Verified" paragraph |
| Product/strategy decision, rejected direction, business/number change | **YARDSMITH-BRAIN.md** — decisions log §6 (chosen AND rejected, with "don't revive" markers), status snapshot, open threads §10 |
| A gotcha/incident future sessions must not re-hit | The relevant DESIGN-CHANGES section (that file doubles as the incident log) |

Doc-only commits trigger no deploy — there is zero cost to recording, and
(N10) an unrecorded decision does not exist for the next session.

---

## 7. Quick self-check before you push (60 seconds)

- [ ] Did I edit only `src/` (+ hand-maintained root files where intended)?
- [ ] CSS touched → `python3 scripts/gen-dark-theme.py` ran before the build?
- [ ] `node scripts/build.mjs` ran, and outputs are staged WITH the src change?
- [ ] `cloud-sync.js`/`coach.js` touched → pin bumped in BOTH templates?
- [ ] New/changed stored data → `yardsmith-data-and-sync` checklist done (KEYS/MERGE/tombstones/migrations)?
- [ ] Gate script exit 0?
- [ ] Playwright evidence produced against the built output, recorded as a "Verified" paragraph?
- [ ] DESIGN-CHANGES.md / YARDSMITH-BRAIN.md updated?
- [ ] Pushing to `main` (never the legacy deploy branch), no force flags anywhere?

---

## Provenance and maintenance

All facts above were re-verified against the repo on **2026-07-08** at HEAD
`f21930a` (build `04f691fff1`). One-line re-verification commands for
anything that can drift:

```bash
git -C /home/user/golf-fitness log --oneline -1                     # HEAD
grep -o 'FF_BUILD="[^"]*"' index.html                               # current build hash
grep -n 'cloud-sync.js?v=\|coach.js?v=' src/index.template.html src/sw.template.js   # pins (112/88 as of 2026-07-08)
ls .github/workflows/                                               # still exactly deploy.yml + deploy-functions.yml?
grep -n 'paths-ignore' -A 12 .github/workflows/deploy.yml           # ignore list (src/**, scripts/**, *.md …)
grep -n 'exclude' .github/workflows/deploy.yml                      # rsync deny-list
grep -n 'var KEYS' cloud-sync.js                                    # synced-key list (26 keys at line 20)
grep -n 'Merge registry' -A 5 cloud-sync.js                         # MERGE same-PR comment (~line 427)
grep -n 'GENERATED-DARK' src/css/styles.css                         # dark block markers (1937/2504)
grep -n 'Release discipline' YARDSMITH-BRAIN.md                     # BRAIN checklist (line 375)
node .claude/skills/yardsmith-change-control/scripts/check-release.mjs   # the machine gate itself
```

Incident commits cited (verify with `git show <hash> --no-patch --format='%B'`;
note: **run `git fetch --unshallow origin` first if `.git/shallow` exists** —
session clones are often shallow and early hashes won't resolve):
`dce7a6f` (#13 modularization), `cf590f5` (CDN incident), `ba95d0a`/`b18bf8e`/
`cfcffaa`/`1163506` (manual-bump treadmill), `5473249` (#60 merge registry,
four drifted keys), `02b1f6d` (#61), `9b5a3dc` (tombstones), `ada5c0b` (#59
post-mortem), `3b0dd98` (#52), `89bab89` (rebrand, keys unchanged),
`be6772c`/`fcbbc35` (CI deploy fixes), `1282f87` (parallel-session protocol),
`2948b61`/`8467e6d` (dual-session interleave evidence).

Known-open items relevant to this skill (as of 2026-07-08): a fresh checkout
cannot build until `npm install` provides esbuild (gate script exits 2 with
instructions); whether the owner wants any of these machine checks promoted
into CI is an open question — DESIGN-CHANGES §4 already noted the contrast
audit "is worth keeping in CI", but no CI test job has ever existed.
