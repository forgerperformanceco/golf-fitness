---
name: yardsmith-failure-archaeology
description: >
  The Yardsmith incident chronicle: every major bug saga, production incident,
  and deliberate product U-turn recorded as symptom → root cause → evidence
  (commit hashes, doc sections) → status. Load this BEFORE proposing a fix,
  feature, or "improvement" that might re-fight a settled battle — e.g. anything
  touching cloud sync/merge semantics, service-worker caching or staleness, iOS
  viewport/fixed-position bars, the Train reset/logging surfaces, wave-engine
  prescriptions, date/week rollover, the rebrand, monetization, warm-up
  defaults, internationalization, or test batteries ("Dyno Day"). Also load it
  before doing ANY git archaeology in this repo (shallow-clone and stale-main
  traps documented here). Keywords: incident history, post-mortem, regression,
  "why is it like this", "has this happened before", don't-revive, U-turn,
  git log, blame, when was X introduced.
---

# Yardsmith failure archaeology

**Purpose: no one re-fights a settled battle.** This project is ~12 days old
(first commit `ce196ef`, 2026-06-26; 281 commits on `origin/main` as of
2026-07-08, HEAD `f21930a`) and has already burned real time on recurring
failure classes and reversed directions. Every incident below is verified
against the repo (`git cat-file -e <hash>` passes for every hash cited;
subjects/bodies quoted from `git log`). Before you touch an area, read its
entry. Before you propose an idea, check the settled-battles list.

**When NOT to use this skill:**
- You need the *rules* that came out of these incidents (merge-registry duty,
  never-force-push, pin bumps, release checklist) → `yardsmith-change-control`.
- You're triaging a live bug right now → `yardsmith-debugging-playbook`.
- You need current sync/data-model mechanics → `yardsmith-data-and-sync`.
- You need to recreate the audit/test scripts named here →
  `yardsmith-playwright-harness` and `yardsmith-validation-and-qa`.
- You want the domain science behind a decision → `golf-fitness-domain-reference`.

---

## 0. Read this before digging in git (archaeology meta-caveats)

1. **Session clones may be SHALLOW.** The Phase-1 investigation of this repo
   found `.git/shallow` present and only 50 commits visible — 2 days of a
   12-day history, silently. Always check first:
   ```
   [ -f .git/shallow ] && git fetch --unshallow origin
   git rev-list --count origin/main    # expect ~281 (as of 2026-07-08)
   ```
   (This session's clone had already been unshallowed; yours may not be.)
2. **Local `main` can be stale.** As of 2026-07-08 the local `main` ref points
   at `8ab7510` (2026-07-05) while `origin/main` is `f21930a` (2026-07-08).
   **Run history queries against `origin/main`**, never bare `main`.
3. **Zero `git revert` commits exist** (`git log --oneline origin/main |
   grep -ci revert` → 0). Every reversal in this repo is a *forward fix* whose
   commit body explains the rationale (e.g. `a37cf44` "Replace intl
   localization…"). If you're looking for "the revert", look for the forward
   commit instead.
4. **Verify a hash before citing it:** `git cat-file -e <hash>^{commit}`.
   Beware transcription: one prior report cited `94a0a8`, which does not
   exist — the real commit is `94a0da8`.
5. **Commit `(#NN)` suffixes are GitHub PR numbers, and DESIGN-CHANGES.md
   section numbers drift off them.** Verified mapping: doc §§33–36 match PRs
   #33–#36; PR #37 (`c9c0d38`) produced TWO doc sections (§37 hype pack + §38
   floating-bars round 3); **from doc §38 onward, doc § = PR# + 1** (checked
   through §67 ↔ PR #66 `cdebf0a`). So "the #60 sync PR" is documented in
   DESIGN-CHANGES **§61**.
6. **DESIGN-CHANGES.md ordering quirk:** sections 1–51 run in ascending order;
   after §51 the file appends **newest-first** (§67, §66 … §52). Don't binary-
   search it by number.
7. **Merge topology switch:** PRs #1–#12 are true two-parent merge commits
   (e.g. `f011a52` #12 merges `096b9be`); **#13 onward are squash/linear**.
   `git log --merges` therefore only sees the first twelve.
8. **Timezones mix.** Claude-session commits are UTC; owner-side commits are
   -0500 — same-work pairs can look ~5h apart.
9. **Two parallel sessions ran simultaneously** on Jul 7–8: one landed PRs
   #52–#66 on a branch, the other committed the rebrand/domain cutover directly
   to `main` (verify via the `Claude-Session:` trailers — `5473249` vs
   `8467e6d` carry different session IDs, interleaved within the same hour).
   That collision is why the parallel-session protocol commit `1282f87`
   (2026-07-08) exists.

Era map (commit dates, `origin/main`): **Era 1** monolith sprint Jun 26–28
(single-file app, Pages, PWA, dormant Supabase sync); **Era 2** sync +
staleness firefighting and launch prep Jun 29–Jul 3; **Era 3** the PR era
Jul 5–8 (PRs #1–#66 from branch `claude/golf-app-evaluation-tyv6ri`);
**Era 4** rebrand + domain cutover Jul 7–8, interleaved with Era 3. Jul 4 has
zero commits.

---

## 1. The cloud-sync data-loss saga — 7 stages (status: RESOLVED structurally)

The longest-running incident chain. Each stage is one commit; read the bodies
(`git show <hash> -s`) — they are miniature post-mortems.

| # | Commit | Date | Symptom | Root cause | Fix |
|---|---|---|---|---|---|
| 1 | `1794eac` | Jun 27 | Infinite reload loop on login | `syncOnLogin` reloaded whenever cloud ≠ local byte-for-byte, but startup rewrites localStorage so it never matched | Key-sorted stable-JSON compare + once-per-session reload guard (sessionStorage) |
| 2 | `747eb6d` | Jun 29 | User: *"the app keeps misremembering my completed workouts"* | Whole-blob last-write-wins with cloud-wins-on-login; logs pushed only every ~8s/page-hide, so a just-finished session was erased on reopen | Union-merge for additive keys `ff_log`/`ff_body`; on collision the more-complete log wins. Follow-up `f145f9f` (same night): push completed workouts instantly, debounced |
| 3 | `9b5a3dc` | Jul 1 | Naive delete would resurrect on next login-merge (union merges re-add) | Deletion had no cross-device representation | Timestamped **tombstones** (`ff_deleted`, synced), applied after union; superseded tombstones self-prune. Tombstones became the house pattern (reused in #61's Train reset) |
| 4 | `3b49713` (#38, doc §39) | Jul 6 | Sync failures invisible; "cloud-sync.js swallows every error silently" (flagged in the DESIGN-CHANGES cross-cutting tail) | No health surface, no escape hatch | Visible sync-health line in Account (`ff_sync_status` + `ff-sync-status` event) + one-tap backup export/restore |
| 5 | `5473249` (#60, doc §61) | Jul 7 | Two open devices silently overwrote each other; four history keys lost data cross-device | (a) Merge only happened at login — pushes were blind whole-blob upserts. (b) `mergeBlob`'s if/else let `ff_rounds`, `ff_speedtest`, `ff_mobility`, `ff_fuel` **silently drift into cloud-wins despite holding history** | (a) Every push is a compare-and-swap on `profiles.rev` (UPDATE…WHERE rev=seen; zero rows → pull, union-merge, retry ≤3; legacy no-rev fallback). (b) Declarative **MERGE registry** — any key not registered is a setting (cloud wins) |
| 6 | `02b1f6d` (#61, doc §62) | Jul 7 | Duplicate days after merges; weight deltas never displayed | `ff_body` rows keyed by `toLocaleDateString()` — differs per device language, sorts alphabetically; a latent reader compared locale dates to an ISO week-start ("alphabetically always true — deltas never showed") | ISO `YYYY-MM-DD` + `ts` identity; device-local `ff_schema` migration ladder (`src/js/app/005-migrations.js`); `profiles_history` trigger keeping 10 blob revisions; 1MB blob guard |
| 7 | `7a4361a` (#62, doc §63) | Jul 7 | Full-blob write every few seconds while logging; snapshot per push; push_subs re-upserted every open | Write amplification inherent to blob sync at a 1.2s debounce/8s poll | 12s coalesce + 30s poll (~8× fewer writes), 10-min snapshot throttle, payload-hash skip for push_subs (`ff_push_sig`) |

**The sharpest lesson in the repo** (stage 5): the DESIGN-CHANGES cross-cutting
tail had earlier recorded that `ff_speedtest`/`ff_mobility` using cloud-wins was
*"acceptable for low-frequency rituals; move to additive merge if it ever
matters"* (DESIGN-CHANGES.md, "Cross-cutting notes" tail). Days later that
exact class of drift was found on **four** keys and called out in `5473249` as
silent cross-device data loss. "Acceptable for now" merge semantics on history
keys do not stay acceptable. The resulting rule (new roaming `ff_*` key ⇒
same-PR MERGE + KEYS entry) is owned by `yardsmith-change-control` /
`yardsmith-data-and-sync`.

**Residual caveat (OPEN):** the client carries a legacy no-rev fallback
(`revMode=false` → blind upsert) for schemas predating the `rev` column. The
repo cannot prove the live Supabase DB has the #60 schema applied; if sync
behaves like pre-#60, check that first.

## 2. The staleness saga — ~120 manual SW bumps, the CDN incident, and the kill shots (status: RESOLVED)

The single most recurring theme in the history. Chronology, all verified in
commit messages:

- **The manual-bump treadmill (Jun 27 → Jul 5).** The service-worker cache
  name had to be hand-bumped for every release. `ba95d0a` bumps to v5 on Jun
  27; `b18bf8e`/`cfcffaa` bump to v14 *twice, one minute apart* (Jun 27 03:00/03:01 UTC);
  `1794eac` v20, `747eb6d` v75, `851485c` v78, `5d8261d` v82, `cf590f5` v83,
  `7ada915` v117… reaching **`fairwayfuel-v122`** by `1163506` (Jul 5 —
  verify: `git show 1163506:sw.js | head -3`). ~120 manual versions in 9 days;
  100+ commit messages mention a bump.
- **The CDN incident — `cf590f5` (Jun 30).** Symptom (user): *"still says 6
  digits even in incognito."* Root cause: `cloud-sync.js`/`coach.js` were
  loaded with **no version in the URL**, so GitHub Pages' shared CDN edge
  served stale copies — incognito skips local cache but still hits the edge.
  Commit body: *"The code on main was correct — the bytes users got were
  stale."* Fix: `?v=` query pins. **This is why those two files still carry
  manual `?v=` pins today** (currently `cloud-sync.js?v=112`, `coach.js?v=88`
  in `src/index.template.html` + `src/sw.template.js`) while everything else is
  hash-busted automatically.
- **Installed PWAs never checked for updates — `5d8261d` (Jun 30).**
  `reg.update()` never ran on installed apps; added update-on-launch +
  reload-on-controllerchange.
- **Modularization killed the treadmill — `dce7a6f` (#13, Jul 5).** `src/`
  tree + `scripts/build.mjs`; `{{V}}` placeholders become a sha256 content
  hash: *"automatic cache busting replaces manual SW vNNN bumps and ?v= pin
  edits."* Served document dropped ~560KB → 23KB.
- **The final failure mode — `27e5655` (#56, doc §57, Jul 7).** User: *"I'm
  refreshing the save-to-home version and it's not working."* GitHub Pages
  serves HTML with `max-age=600`, so even a network-first SW fetch could
  return 10-min-stale `index.html` pointing at old hashes. Three fixes:
  `{cache:'no-store'}` on document fetches; `reg.update()` on
  visibilitychange/focus/pageshow (standalone PWAs *resume*, they don't fire
  `load`); a "Force refresh" escape hatch (unregister SWs, clear Cache
  Storage, hard reload, 2.5s watchdog) plus the You-tab App-version card
  showing `window.FF_BUILD`.
- **Postscript (doc §58):** a subsequently reported "bug" ("speed section
  never updated") was confirmed to be this stale-PWA cache, not code — the
  origin of the FF_BUILD-first triage discipline (`yardsmith-debugging-playbook`).

## 3. iOS floating bottom bars — a four-round fix-the-fix chain (status: RESOLVED)

Four commits, each fixing the previous fix, over ~30 minutes plus a later
round. Instructive as the canonical "heuristic patch vs root cause" chain:

1. `6d12a02` (#33, doc §33, Jul 6 06:38): bottom bars (tab bar, FAB, pause
   bar) stranded mid-screen on iOS after keyboard close → added a
   visualViewport keyboard detector (`body.ff-kb`).
2. `90f7a15` (#34, doc §34, 06:43 — **HOTFIX 5 minutes later**): the
   heuristic (`innerHeight - vv.height > 60`) misread pinch-zoom/URL-bar
   shifts as "keyboard open", hiding all bars *with no way back*. New
   detection requires a focused editable + `vv.scale < 1.15` with
   zoom-cancelling math + 150px gap, plus a tap failsafe.
3. `0e4cb75` (#35, doc §35, 06:48): actual root cause found — once iOS zooms
   even slightly, `position:fixed` stops tracking the visual viewport, and
   **rapid +/- stepper taps in the player registered as double-tap-zoom**.
   Fix: `touch-action: pan-x pan-y` on html, `manipulation` on controls,
   `maximum-scale=1`.
4. `c9c0d38` (#37, doc §38, 07:06): blocking zoom can't un-zoom an
   already-zoomed session, so bars now **translate to the visible bottom on
   every `visualViewport` change** (rAF-throttled), phones only.

Do not "simplify" the touch-action rules, the viewport meta, or the bar-pinner
without re-reading this chain — each layer exists because the previous layer
alone failed.

## 4. The Train reset button that survived its own fix (status: RESOLVED — with a written post-mortem and a standing audit)

User-quoted chain, preserved verbatim in DESIGN-CHANGES §§53–60:

- `3b0dd98` (#52, doc §53, Jul 7): reliable clear/reset + future days render
  as previews (user: *"reset a workout… a future day starts to log it"*).
- `ff74f0c` (#53, doc §54): speed day was still missing it (user: *"Speed day
  is missing reset and the box is half sized"*).
- `0bdc2dd` (#58, doc §59): **still** broken (user: *"speed day still doesn't
  have the reset button and the logged button is still half size"*).
- `ada5c0b` (#59, doc §60): the post-mortem commit. Body: *"the speed-day
  reset bug survived because tests exercised the Today path while the button
  lived in logFoot (Full-week/non-featured)"* — doc §60 phrases it **"green
  tests, real bug"** and preserves the user's words: *"you had me feeling
  crazy. Make sure you are checking for bugs along the build."*

The fix was process, not just symptom: birth of the **state-matrix audit**
(`audit-train.mjs`: 9 Train states × light/dark = 18, asserting zero errors,
no leaked `undefined`/`NaN`/`[object Object]`/`{{V}}`, every logged day
exposes a reset, no half-width log buttons, warm-up folds never open, tap
targets ≥ 44px; standard is "18/18 clean"). The script lives in session
scratchpads, not the repo — recreate it via `yardsmith-validation-and-qa`.
Encoded theme: **test every render surface a control lives on, not just the
featured path** (same class as `ed6268f` #22, where fuel check-off was missing
only for the foods-you-love user cohort).

## 5. Wave-engine mis-prescription — `6932f28` (Jul 7; status: RESOLVED)

Symptom: periodization gave ballistic speed drills the wrong dose. Root cause:
`purposeFor()` classification-by-regex misfired — "Seated chest throw" and
"Cable lateral chop" read as 💪 hypertrophy (Peak cut them 3×4 → 1×4, commit:
*"power drills gutted in the weeks meant to keep speed work crisp"*); "Speed
bench press" matched `/Bench Press/` and got the strength prescription
(*"exactly wrong for a velocity lift"*). Fix: rotation checked before power;
rotation regex catches any "Chop" but excludes "Landmine Press"; power regex
adds Throw/Toss/Clean/"Speed X". Verified then with 37 classification + 10
wave-adjustment unit cases and rendered-plan checks at weeks 1/4/19 (this
unit-case pattern is worked through in `yardsmith-proof-and-analysis-toolkit`).
**Standing hazard:** string-matching exercise names drives training logic —
any new catalog entry must be checked against `purposeFor()`
(`src/js/app/035-training-plan.js`).

## 6. Date/calendar rollover — `7ada915` (Jul 5; status: RESOLVED)

Symptom: workouts *"stuck on the prior week."* Two independent causes: (1)
nothing re-rendered on reopen — an installed PWA backgrounded across midnight
never recomputed `curWeek()`; (2) rollover was anchored to time-of-day, not
midnight — `ff_start` held a full timestamp, week math used raw ms and could
drift a day around DST. Fix: visibilitychange/focus/pageshow re-render on a
new calendar day + midnight-anchored `daysSinceStart()`.

Related identity incident, earlier: `851485c` (Jun 29) — day labels are
`ff_log` storage keys, so renaming "(Squat)" → "(Quads)" required
`migrateDayNames()`: idempotent, runs every load, *"folds back in if cloud
sync reintroduces an old key."* Same theme: `8ffb487`/`e614a46` (Jul 2) fixed
the week strip and rest days keyed by display name instead of a stable
`dayKey` (rest days toggled together). Rule that fell out (owned by
`yardsmith-data-and-sync`): stable, locale-proof keys; idempotent,
merge-safe migrations.

## 7. CI / GitHub Pages deploy fixes — `be6772c`, `fcbbc35` (Jul 2; status: RESOLVED)

- `be6772c`: Pages deploys failed with "Timeout reached, aborting!" — every
  push (even markdown-only) queued a full deploy with
  `cancel-in-progress:false`, stacking into Pages' single-file queue. Fix:
  `cancel-in-progress: true` (safe: Pages publishes atomically) +
  `paths-ignore` for non-served files.
- `fcbbc35`: Pages was serving the **whole repo** — strategy docs, marketing
  assets, build tooling all public at `fairwayfuel.app/<file>`. Fix: rsync
  **deny-list** staging (deny-list deliberately chosen *"so a new served asset
  is never dropped by accident"*).

## 8. Rebrand FairwayFuel → Yardsmith + domain cutover (Jul 7–8; status: COMPLETE, one straggler OPEN)

Trigger (verified in `89bab89` body): a live federal trademark application
"FAIRWAY FUEL" (Ser. 99663152, filed 2026-02-20, Class 32) plus two same-name
golf-nutrition brands made the name *"legally risky and SEO-crowded"*; renamed
*before any app-store presence exists* (the cheapest possible moment).

Sequence: `6932f28` wave fix + `faf0950` App-Store screenshots (pre-work,
Jul 7 18:13/18:21 UTC) → `89bab89` **the rebrand** (brand strings, bundle id
`app.fairwayfuel`→`app.yardsmith`, SW cache prefix with old-cache purge, doc
renames, 19:32) → `2948b61` onboarding fix (22:21) → `a8afd25` rebrand assets
(22:21) → `8467e6d` **domain migration with the CNAME deliberately NOT
flipped** (*"flipping it before the new domain's DNS exists would take the
live site down"*, 23:15) → `23e4315` cutover once DNS confirmed (23:26) →
`f2fadc9` straggler: split-tag wordmark `Fairway|Fuel` → `Yard|smith` in the
magic-link email (23:54) → `044797c` brain update: cutover complete, 301
redirect live (Jul 8).

**Load-bearing invariant that survived the rebrand:** the localStorage profile
key stays `"fairwayfuel"` and all `ff_*` keys keep their names — renaming them
wipes user data (CLAUDE.md; mechanics in `yardsmith-data-and-sync`).

**OPEN straggler (verified in source as of 2026-07-08):**
`src/js/app/055-share-cards-branded-pngs-generated-on-de.js` still canvas-draws
the header wordmark as `"Fairway"+"Fuel"` (~lines 19–21) while the footer draws
`"Yardsmith"` (~line 47). Nobody has decided/fixed it yet. Also OPEN per the
brain: YARDSMITH trademark filing (Classes 9/41/42).

## 9. The repo-rename wobble (Jul 3–5; status: RESOLVED, motive unrecorded)

`94a0da8` + `cfe57d5` (Jul 3): docs re-pointed at a renamed repo
`forgerperformanceco/fairwayfuel`. `e07a395` (Jul 5): *"point repo references
back at golf-fitness"* — the rename was reversed. Earlier, `d2675f5` (Jun 27)
records a repo move to a new account. Net: the repo path has moved/renamed at
least twice; the remote today is `forgerperformanceco/golf-fitness` (verify:
`git remote -v`). **Why** it was renamed and reverted is not recorded anywhere
in the repo — treat any doc/URL mentioning `forgerperformanceco/fairwayfuel`
or `pharmerbobby` as stale.

---

## 10. Deliberate U-turns — settled battles, do not re-fight

Zero of these were `git revert`s; each is a forward-fix with rationale in the
message. Statuses are SETTLED unless marked otherwise.

| Battle | Evidence | Settled state |
|---|---|---|
| **Dyno Day / Octane Assessment** (DRVN-style synthetic test battery) | Spec added `9870e81` (Jul 2, 11:45 UTC), **deleted 9 minutes later** `5a669ed` (11:54) — *"drags the app into DRVN's lane… when our scoreboard is the actual outcome — driver carry"*. YARDSMITH-BRAIN §6 marks it **"Don't revive."** One of only two tracked non-image file deletions in the whole history (`git log origin/main --diff-filter=D`) | **SETTLED-DO-NOT-REVIVE.** Yards are the scoreboard; no synthetic fitness-test battery |
| **Stripe → Paddle → free** | `49a7a68` (Jun 27) swapped Stripe for Paddle as Merchant of Record (stripe-webhook deleted — the other tracked non-image deletion); `311d9c4` (same day) removed cost gating entirely (*"early access — friends get everything"*) | Monetization parked; Paddle spine exists dormant. Preconditions before monetizing (Play Billing, hosting) are recorded in YARDSMITH-BRAIN §9–10 |
| **Warm-up default** | Originally collapsed ("so lifts lead") → expanded by default `8aeee7d` (Jun 28, "people missed it entirely") → collapsed on every Today card `7d3e246` (#55, doc §56, Jul 7) → folds extended to Full-week view `e9646b3` (#57, doc §58) | **Collapsed everywhere**, enforced as an audit-train invariant ("warm-up folds never `[open]` by default") |
| **Internationalization** | `f629728` full intl localization (UK/AU names, metric) Jun 28 18:00 → **replaced 21 minutes later** `a37cf44` (18:21) with US-only regional-by-ZIP food tailoring | **US-only** (imperial, US brands, ZIP → region). Don't re-propose i18n without new evidence of demand |
| **Leg-day order churn** | Same afternoon, Jul 5: `813a0f7` "open with Leg Extension, then RDL" (12:11) → `e137df3` "compound first, Leg Extension as finisher" (13:04) → `8ab7510` restore Seated Leg Curl (14:43) | **Compound first, Leg Extension as finisher, leg curl kept** — recorded in BRAIN §6 |
| **"FairwayFuel Score" → Octane / distance-first Home** | `fbfad8b` (Jul 1) reframed the home screen around driver-carry DISTANCE and renamed the score to Octane | Yards-first framing is doctrine; the score is a trajectory gauge, not a leaderboard rating |
| **Macro tracking, DRVN PDFs, Cloudways/VPS** | Rejected in YARDSMITH-BRAIN §6 (never built): barcode calorie logging is "commodity"; DRVN's PDFs are branded content; VPS is the wrong tool for a static PWA | SETTLED. See BRAIN §6 before proposing anything adjacent |

Also settled by repeated user feedback rather than a single U-turn: the **calm
doctrine** ("a lot of info all at once" → calm passes A/B/C `588c7c3`/
`0c2c578`/`9acb9c3` #41–#43; "still doing too much… can we consolidate?" →
Stats 3.0 `4e0cd73` #51). One log door, one advice slot, fold by default is
settled UX law — don't add a second entry point for logging or a second
coaching voice.

## 11. Recurring failure themes, ranked by recurrence

1. **Stale delivery** (SW cache, CDN edge, Pages max-age=600, resumed PWAs):
   ≥6 incidents (§2). Killed by content-hash builds (#13) + no-store +
   resume-time checks (#56). Residual: manual `?v=` pins for
   cloud-sync.js/coach.js only.
2. **Sync merge semantics** (last-write-wins vs additive history): ≥5
   incidents (§1). Killed by union merges → tombstones → CAS + MERGE registry
   (#60). Residual rule: every roaming key needs an explicit merge strategy.
3. **Locale/identity keys** (`toLocaleDateString()` as identity, day-label as
   storage key, name vs dayKey): 3+ incidents (`02b1f6d`, `851485c`,
   `8ffb487`/`e614a46`). Rule: ISO dates, stable keys, idempotent merge-safe
   migrations.
4. **Testing the wrong render path** ("green tests, real bug"): `ada5c0b`
   post-mortem; `ed6268f` #22 cohort miss. Rule: state-matrix audits across
   ALL view modes and user cohorts.
5. **iOS visual-viewport physics** (keyboard heuristics, zoom,
   position:fixed): 4 rounds (§3). Now baked into CSS/JS — don't unwind it.
6. **Re-render state loss** (scroll, `[hidden]`): `1e30ffa` #64 (doc §65,
   player scroll reset on every stepper tap — fix: preserve scroll across
   innerHTML swaps of the same station), `879862b` #65 (doc §66) then audited
   *every other section* for the same class — "all clean"; earlier `2c8bff2`
   (Jun 27, rest timer floated because `[hidden]` wasn't authoritative).
7. **Attention overload** → the calm passes (§10, last row).

When you introduce a change, ask which of these seven classes it could
re-open; the audit pack in `yardsmith-validation-and-qa` covers 4 and 6
mechanically.

## 12. Branch graveyard

As of 2026-07-08 (`git branch -a` / `git rev-list`):

- `origin/claude/golf-app-evaluation-tyv6ri` — 92 commits from `8ab7510`,
  tip `964517a` (Jul 8). The working branch for the entire PR era (#13–#66,
  squash-merged, so its commits are NOT ancestors of main). Its tip is
  content-identical to main's `cdebf0a` #66 (`git diff 964517a cdebf0a` is
  empty). **Fully superseded; never deleted.** Do not build on it.
- `origin/claude/push-updates-ewmair` — tip `94a0da8`, 0 commits ahead of
  `origin/main`. Dead since Jul 3.

No other stale branches. Nothing valuable lives only on a branch.

## 13. Where the memory lives (and what this skill is for)

Decisions live in `YARDSMITH-BRAIN.md` (§6 decisions log with don't-revive
markers) and `DESIGN-CHANGES.md` (67 numbered sections, verbatim user quotes,
"Verified" paragraphs) — conventions and precedence are owned by
`yardsmith-docs-and-writing`. This skill exists because the raw docs are long
and the git history has traps (§0): it is the pre-chewed chronicle. If you
uncover a NEW incident or reversal, record it in the doc of record per
`yardsmith-change-control`, and update this file's chronicle in the same
change.

**Known gaps (honest):** the repo cannot show whether any real user beyond the
owner lost data in the Jun 27–Jul 7 sync window, whether the
`profiles_history` rollback was ever used in anger, whether the force-refresh
hatch has been needed since #56, why the repo was renamed and renamed back, or
what happened before 2026-06-26. Treat those as unknowns, not assumptions.

---

## Provenance and maintenance

All facts verified 2026-07-08 against `origin/main` = `f21930a` (281 commits).
Re-verification one-liners for anything that may drift:

```bash
# History completeness + tip (run before ANY archaeology)
[ -f .git/shallow ] && git fetch --unshallow origin
git rev-list --count origin/main && git rev-parse origin/main

# Any hash cited here
git cat-file -e <hash>^{commit} && git log -1 --format='%h %ad %s' <hash>

# Zero-reverts claim
git log --oneline origin/main | grep -ci revert          # expect 0

# Tracked non-image deletions — expect exactly two FILE lines:
# OCTANE-ASSESSMENT-SPEC.md (under 5a669ed) and
# supabase/functions/stripe-webhook/index.ts (under 49a7a68).
# (Image-only deletion commits print a bare COMMIT header with no file line.)
git log origin/main --diff-filter=D --name-only --format='COMMIT %h %s' \
  | grep -v -E '\.(png|jpg|jpeg|svg|ico|webp)$' | grep .

# Merge-topology switch (#1–#12 merges, #13+ squash)
git log --merges --oneline origin/main | tail -3

# SW cache reached v122 pre-modularization
git show 1163506:sw.js | head -3

# Current manual pins (were v=112 / v=88)
grep -o 'cloud-sync.js?v=[0-9]*\|coach.js?v=[0-9]*' src/index.template.html

# Rebrand straggler still open? (header should say Yardsmith when fixed)
grep -n '"Fairway"' src/js/app/055-share-cards-branded-pngs-generated-on-de.js

# Branch graveyard still as described
git branch -a && git rev-list --count origin/main..origin/claude/golf-app-evaluation-tyv6ri

# Doc §↔PR# drift spot-check (doc §61 should describe PR #60)
grep -n '^## 61' DESIGN-CHANGES.md && git log -1 --format='%s' 5473249
```

If `origin/main` has moved past `f21930a`, re-check the OPEN items (§1
residual rev-column caveat, §8 share-card wordmark, YARDSMITH trademark) and
append any new incidents before trusting this chronicle blindly.
