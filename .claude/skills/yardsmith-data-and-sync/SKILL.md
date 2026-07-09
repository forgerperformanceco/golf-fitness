---
name: yardsmith-data-and-sync
description: >
  The Yardsmith data-model and cloud-sync contract. Load this BEFORE touching
  anything that reads or writes localStorage (any ff_* key or the "fairwayfuel"
  profile), before adding a NEW persisted key, when working on cloud-sync.js,
  supabase/schema.sql, merge/tombstone/migration logic, login sync, account
  deletion, backup export/import, or the leaderboard/push_subs tables. Also
  load it to debug: data vanishing across devices, deleted workouts coming
  back, duplicate days after sign-in, "sync error" in the Account tab, reload
  loops on login, or a key that "doesn't roam". Keywords: localStorage, lsGet,
  lsSet, KEYS, MERGE, tombstone, ff_deleted, ff_schema, migration, CAS, rev,
  compare-and-swap, profiles, RLS, Supabase, syncOnLogin, ff-data-changed,
  ff-external-write.
---

# Yardsmith — data model & cloud sync

All facts verified against the repo at HEAD `f21930a`, build `04f691fff1`,
2026-07-08. Line numbers cite that state — re-verify with the commands in
"Provenance and maintenance" if the files have moved on.

**When NOT to use this skill.** Module load order / IIFE scope / render model →
`yardsmith-architecture-contract`. Build mechanics, `{{V}}` hashing, why the
manual `?v=` pins exist → `yardsmith-build-and-env`. The history of the sync
data-loss saga as incidents → `yardsmith-failure-archaeology`. How to write a
vm-sandbox proof that a merge change is safe → `yardsmith-proof-and-analysis-toolkit`.
Seeding localStorage in Playwright tests → `yardsmith-playwright-harness`.
What evidence gates a merge → `yardsmith-change-control`.

## 0. The two rules that must never break

1. **Never rename the `"fairwayfuel"` master profile key or any stored `ff_*`
   key.** The app was renamed FairwayFuel → Yardsmith (Jul 2026) and the keys
   deliberately were NOT — renaming a stored key orphans every existing user's
   data on-device and in every cloud blob. (CLAUDE.md invariant.)
2. **All storage access goes through `lsGet`/`lsSet`/`lsRemove`**
   (`src/js/app/040-workout-logger.js:10-26`). A raw `localStorage.setItem`
   from app code bypasses the memo cache (readers see stale data) and skips
   the `ff-data-changed` event (the write never syncs). The only sanctioned
   raw-write path is bulk external restore, which must then dispatch BOTH
   events — see §4 and the backup-import example (080:300-323).

## 1. The storage layer: lsGet / lsSet / lsRemove

Defined at `src/js/app/040-workout-logger.js:2-32` (shared IIFE scope — every
module can call them; see `yardsmith-architecture-contract` for why).

- `lsGet(k, def)` — returns the **memoized parsed value** (cache `__ls`).
  Added because one Stats render used to `JSON.parse` ff_log/ff_body/ff_history
  ~90 times. Returns `def` when the stored value is null/absent/unparseable.
- `lsSet(k, v)` — `JSON.stringify` + store, updates the cache entry, then
  dispatches `ff-data-changed` (which is what makes the write sync — §4).
- `lsRemove(k)` — removes, drops the cache entry, dispatches `ff-data-changed`.

**The mutation contract** (comment at 040:6-8): callers may mutate an object
returned by `lsGet` **only if they `lsSet` it back in the same tick**. A
mutation left unsaved is a bug twice over: it never persists/syncs, *and* the
cache now disagrees with localStorage. Every existing call site follows this
(e.g. `saveSession` 040:145, `ffTomb` 050:197).

**Cache invalidation** (040:28-32): the whole cache is nuked on
`ff-external-write` (cloud-sync merged/restored keys underneath the app);
single keys are evicted on the cross-tab `storage` event.

`coach.js` has its own tiny read-only `lsGet` (coach.js:26) with no cache —
that's fine because it only reads (`fairwayfuel`, `ff_targets`, `ff_score`,
`ff_body`, `ff_log`, `ff_week`) to build the AI-coach context.

## 2. The complete localStorage catalog

Master key is literally `"fairwayfuel"`; everything else is `ff_*`. The synced
set is `KEYS` in `cloud-sync.js:20` — **26 keys**. Any key not in `KEYS` never
leaves the device. Any synced key without a `MERGE` entry (cloud-sync.js:431)
is a *setting*: on conflict the **cloud value wins wholesale**.

### 2a. Synced keys (in `KEYS`)

| Key | Shape (verified writer) | Merge strategy | Cap / notes |
|---|---|---|---|
| `fairwayfuel` | `{sex, goal, workout, meals, age, weight, heightFt, heightIn, activity, freq, equip{}, view}` (020:5-12) | setting — cloud wins | goal is a `GOALS` key: `leanbulk\|bulk\|maintain\|cut` |
| `ff_start` | ISO datetime string — the plan anchor (040:128 `d.toISOString()`) | setting | the plan runs off this date; `curWeek()` derives from it |
| `ff_week` | int 1–20 | setting | **legacy**: read-only fallback (040:73) when `ff_start` unset; nothing writes it anymore; kept in KEYS so old blobs roam |
| `ff_log` | `{"week\|dayName": {date, _ts, finishedAt?, activeMs?, note?, ex:[{name, orig, target, sets:[{w,r,done}]}]}}` (040:234-250, `_ts` stamped by saveSession 040:145) | `unionLog` — per session key; newer `_ts` wins; tie → fuller session by `loggedSetCount` | tombstoned on delete (§5) |
| `ff_history` | `[{id:"date · day", ts, date, day, week, sets, volume, note, ex:[{name,target,sets:[{w,r}]}]}]` (050:225-238, upsert by id) | `unionHistory` — by `id`, newer `ts` wins (local wins ties), sorted newest-first | permanent (no cap); tombstoned on delete |
| `ff_deleted` | `{"L:week\|day": ts, "H:histId": ts}` tombstones (050:197) | `unionDeleted` — latest ts per key; applied *after* all other merges; self-pruning | §5 |
| `ff_rest` | `{"week\|dayKey": ts}` rest-day check-offs (040:148-154; rest days key as `rest@<slot>`) | `unionDeleted` semantics (latest ts per key) | deliberately NOT `ff_log` — Octane/streak/leaderboard count `ff_log` only |
| `ff_body` | `[{date(locale, display-only), iso("YYYY-MM-DD", THE identity), ts, w?, s?, d?}]` — weight lb / 7-iron mph / driver-carry yds, one row per ISO day; single writer `logBodyEntry` (070:759-773) | `unionBody` — keyed by `iso` (locale-date parsed as fallback), field-level `Object.assign` with local fields winning, chronological sort, `iso` backfilled | no cap |
| `ff_speedtest` | `[{ts, date, week, swings[3], best}]` (060:113-116) | `unionSeries` key=`ts`, newer ts wins, oldest-first | cap **60** (both sides — §6 rule) |
| `ff_mobility` | `[{ts, date, score 0-100, tests:{trunk,hip,squat} each 0-2}]` (065:85-91) | `unionSeries` key=`ts` | cap **40** |
| `ff_rounds` | `[{id:"r"+Date.now(), ts, date, score?, drive?, driving?, energy?}]` one per day, upsert by date (082:63-75) | `unionSeries` key=`id \|\| ts` | cap **60** |
| `ff_fuel` | `{"YYYY-MM-DD": {m:{idx:"a"\|"c"}, rating("on"\|"close"\|"off"\|null), n, ts}}` (030:17-31) | `unionFuel` — **whole day-record**, newer `ts` wins; never field-merged (meal detail vs day rating are exclusive modes — field-merge could resurrect deliberately cleared meals) | **95 days** (fuelPrune 030:12 AND unionFuel cloud-sync.js:423) |
| `ff_swaps` | `{origName: newName}` (040:186-188) | setting | |
| `ff_planview` | `"today"\|"week"` (085:520) | setting | |
| `ff_onboarded` | bool (090:18,83,226) | setting | |
| `ff_handle` | string, leaderboard handle (085:467) | setting | DB enforces 2-20 chars, unique lower(handle) |
| `ff_kcal_adj` | int, clamped ±600 (085:678) | setting | metabolism check-in nudge; flows into carbs (025:206) |
| `ff_lastcheckin` | ts (085:679) | setting | |
| `ff_gameday` | `{teeTime, holes, transport}` (080:6-7) | setting | |
| `ff_foodprefs` | `{liked[], avoid[], restrict[]}` (025:577-578) | setting | |
| `ff_insights_seen` | `[sig]`, cap 40 (075:7-8) | setting | dismissed coaching cards |
| `ff_region` | region override string | setting | current code only **reads** it (025:731) and clears it when a ZIP is typed (raw `removeItem`, 025:1077) — region now derives from `ff_zip` |
| `ff_zip` | 5-digit string (025:1077, 090:243) | setting | |
| `ff_tips_seen` | `[key]` (015:89) | setting | |
| `ff_goalyds` | int (090:84, 080:515; default 15) | setting | Distance Mission |
| `ff_event` | `{date:"YYYY-MM-DD", name}` (080:550-551) | setting | re-anchors the wave taper |

### 2b. Device-local keys (deliberately NOT in `KEYS`)

| Key | Shape / writer | Why device-local |
|---|---|---|
| `ff_schema` | int, currently `1` (005-migrations.js:9) | **each device migrates its own copy** — syncing it would let device A mark device B's data migrated (005:2-3) |
| `ff_targets` | `{goal(label), kcal, proteinG, carbG, fatG, mealN, tdee}` (025:294) | derived — recomputed by `calc()`; read by coach.js |
| `ff_score` | `{score, pillars:[{name,pts,max,have,detail}]}` (070:776) | derived — Octane snapshot for coach.js |
| `ff_theme` | `"auto"\|"light"\|"dark"` (080:226-229) | device preference (080:223 comment) |
| `ff_statsfold` | `{cardKey: bool}` (085:212,244) | device preference (085:205 comment) |
| `ff_manual_log`, `ff_speedmode` | bool / `"field"\|"gym"` (035:394, 085:522) | device preferences |
| `ff_pl_paused` | `{day, week}` (070:47) | a paused player session is physically on this device |
| `ff_notif`, `ff_notif_lastday` | bool / date-string (080) | this device's notification tier |
| `ff_push_on`, `ff_push_sig` | bool / payload hash (080:157-169) | this browser's push subscription; sig dedupes the on-open `push_subs` re-upsert |
| `ff_milestones`, `ff_hint_press` | `{sig:1}` / bool (070:416-421, 383) | one-time UI states |
| `ff_sync_status` | `{state:"ok"\|"error", ts, okTs, err}` — written by cloud-sync `noteSync` (cloud-sync.js:205-218, raw setItem by design) | "each device reports the health of its own link to the cloud" (comment :204); read by the Account tab (080:260) + `ff-sync-status` event |

### 2c. sessionStorage (not localStorage)

| Key | Purpose |
|---|---|
| `ff_synced_once` | once-per-browser-session reload guard for the login merge (§8); cleared on account deletion |
| `ff_lb_pub` | leaderboard-publish signature — skips re-upserting an unchanged row (085:447-450); removed to force republish after a speed test (060:117) or handle change (085:478) |

## 3. Adding a new `ff_*` key — THE CHECKLIST

**Why this is a checklist and not advice:** before PR #60 (`5473249`,
2026-07-07), `mergeBlob` was a hand-maintained if/else, and **four keys that
held user history — `ff_rounds`, `ff_speedtest`, `ff_mobility`, `ff_fuel` —
had silently drifted into cloud-wins**. A round, meal check-off, or test
logged on one device vanished at the next merge. The MERGE registry
(cloud-sync.js:426-430) exists so that failure is now a one-line omission you
can grep for; this checklist is how you don't commit that omission. The
registry's own comment: *"Adding a new ff_* history key? Add its merge here in
the same PR — a missed entry means cross-device data loss for that key."*

1. **Read/write only via `lsGet`/`lsSet`** in the owning module.
2. **Decide: roaming or device-local?** Device-local is a legitimate,
   deliberate choice (see §2b for the precedents: derived data, device
   preferences, per-device health/transients). If device-local: do NOT touch
   `KEYS`; leave a comment at the writer saying why, and add the key (with the
   reason) to `DEVICE_LOCAL` in this skill's
   `scripts/check-data-contract.mjs` so the drift check stays green.
3. **If roaming: add to `KEYS`** (cloud-sync.js:20) — same PR.
4. **If it accumulates history: add a `MERGE` entry** (cloud-sync.js:431) —
   same PR. Pick the union:
   - Array of timestamped entries → `unionSeries(l, c, keyFn, cap)`. Give
     every entry a stable `ts` (and an `id` if entries can be edited — key on
     `e.id || e.ts` like `ff_rounds`). Set `cap` to the SAME retention number
     the module enforces (§6).
   - `{key: ts}` map (check-offs, tombstones) → `unionDeleted` semantics
     (latest ts per key), like `ff_rest`.
   - Per-day records where partial merging is wrong → whole-record-newer-wins,
     like `unionFuel`.
   - Keyed sessions with a "fuller wins" tiebreak → the `unionLog` pattern.
   - A pure setting needs NO entry — cloud-wins is correct for settings.
5. **Locale-proof identity.** Never key entries on `toLocaleDateString()`
   strings or display labels — that's the `ff_body` duplicate-day bug and the
   day-rename bug (§7). Use ISO `YYYY-MM-DD` (`ffISO`, 030:8) + epoch `ts`.
   If you must reshape an existing key, add an `ff_schema` rung (§7), don't
   scatter defensive parsing.
6. **Bump the `cloud-sync.js` `?v=` pin in BOTH templates** —
   `src/index.template.html:369` and `src/sw.template.js:12` must carry the
   same number (currently `v=112`) — then `node scripts/build.mjs` and commit
   outputs with the source. (Why pins are manual for this file:
   `yardsmith-build-and-env`.)
7. **Run** `node .claude/skills/yardsmith-data-and-sync/scripts/check-data-contract.mjs`
   — it fails on: MERGE key missing from KEYS, cap disagreement, pin mismatch
   between the two templates, or a written key in neither KEYS nor the
   device-local allowlist.
8. **Test evidence** (what past PRs shipped, per DESIGN-CHANGES): a vm-sandbox
   run of the REAL `cloud-sync.js` against a mock Supabase proving (a) login
   merge keeps both sides' entries, (b) a CAS conflict pull/merge/retry keeps
   both sides, (c) tombstones hold, (d) the no-rev legacy fallback still works.
   Recipe: `yardsmith-proof-and-analysis-toolkit`. Record the result as a
   "Verified" paragraph per `yardsmith-docs-and-writing`.

## 4. Event inventory (the sync nervous system)

| Event | Dispatched by | Consumed by |
|---|---|---|
| `ff-data-changed` | `lsSet`/`lsRemove` (040:23,26); a few belt-and-suspenders manual dispatches (040:137, 080:320,515, 085:527,682) | cloud-sync `pushSoon` (cloud-sync.js:674) |
| `ff-external-write` | cloud-sync `writeBlob` after a merge (:237); account deletion (:113); backup import (080:319) | 040:28 — nukes the entire `lsGet` memo cache. **Any code (or test harness) that writes localStorage directly MUST dispatch this** or readers serve stale data |
| `ff-auth` | cloud-sync `onAuth` (:651), `detail:{user}` | push resync (080:242), re-render of active view + dashboard (085:775), coach.js re-render (coach.js:232) |
| `ff-sync-status` | `noteSync` (:216), `detail:{state,ts,okTs,err}` | Account-tab sync-health line (080:267) |
| `storage` (native) | other tabs | 040:29 — per-key cache eviction |

**Push cadence** (cloud-sync.js:667-682): `pushSoon` debounces ≥1.2 s and
coalesces so automatic pushes land at most every **12 s** (`PUSH_MIN_MS`) —
every push writes the ENTIRE blob, the backend's main per-user cost (PR #62
cut write volume ~8×). Safety nets: a 30 s `setInterval`, plus **immediate**
`push()` on `pagehide` and `visibilitychange:hidden` so backgrounding the app
never loses the tail. `push()` itself no-ops when `snapshot()` equals
`lastSnapshot`.

## 5. Tombstones (`ff_deleted`)

Union merges can't represent deletion — without tombstones, deleting a workout
on one device just re-imports it from the other. The house pattern
(050:197-224, applied in mergeBlob at cloud-sync.js:450-466):

- `ffTomb(key)` writes `ff_deleted[key] = Date.now()`. Key formats:
  **`"L:week|day"`** (an `ff_log` session) and **`"H:histId"`** (an
  `ff_history` entry).
- Deleting = tombstone **plus** local removal: `clearWorkoutFor` (050:200)
  tombstones the log key and every matching history id; `deleteHistory`
  (050:216) tombstones the history id; `resetPlanFull` (040:134) tombstones
  **every** session *before* removing `ff_start`/`ff_log`/`ff_week`/`ff_planview`
  — "without them the next cloud-sync merge would resurrect the old season's
  log from the server."
- In `mergeBlob`, tombstones from both sides are unioned (latest ts) and
  applied **last**: an `ff_log` entry dies if the tombstone is newer than its
  `_ts`; an `ff_history` entry dies if newer than its `ts`. **Re-creation with
  a newer timestamp beats the tombstone** — re-logging a day after clearing it
  works because `saveSession` stamps a fresh `_ts`.
- **Self-pruning** (cloud-sync.js:461-465): a tombstone whose entry has been
  re-created with `ts >= tombstone` is deleted, so `ff_deleted` can't grow
  forever.

**Known limitation — key-level removals do NOT propagate.** `writeBlob`
(:229-239) only sets keys, never removes; settings merge gives a key present
on either side to the output (:446-447). So `resetPlanFull`'s removal of
`ff_start` roams only until another signed-in device (which still has its
`ff_start`) pushes — then a later merge resurrects the start date everywhere.
The *log* stays dead (tombstoned); the plan anchor can come back. Only
entry-level deletions inside `ff_log`/`ff_history` have tombstone coverage.
Also: keys present in an old cloud blob but no longer in `KEYS` are dropped at
the next merge (mergeBlob iterates `KEYS` + local extras only).

## 6. Retention caps — kept in TWO places on purpose

Caps exist because every push uploads the whole blob and the server rejects
blobs >1 MB (§9). Each capped key enforces its cap at the app writer **and**
in its MERGE union (a union of two capped devices can exceed the cap):

| Key | Cap | App side | Sync side |
|---|---|---|---|
| `ff_speedtest` | 60 | 060:115 | cloud-sync.js:437 |
| `ff_mobility` | 40 | 065:90 | :438 |
| `ff_rounds` | 60 | 082:74 | :436 |
| `ff_fuel` | 95 days | 030:12-16 | :422-424 |
| `ff_insights_seen` | 40 | 075:8 | (setting — no union) |

**Change a cap → change both sides in the same commit.** The drift script (§3
step 7) fails if they disagree.

## 7. Migrations — two mechanisms, different jobs

**1. The `ff_schema` ladder** (`src/js/app/005-migrations.js`, runs in module
005 before anything reads state; function declarations hoist, so it can call
`lsGet`/`ffISO` from later files). One device-local version int
(`FF_SCHEMA = 1`) and run-once rungs. **Deliberately unsynced**: each device
upgrades its own copy of the data; the migrated *data* then roams normally.
Rung v1 backfills locale-proof `iso` + `ts` onto `ff_body` rows that were
keyed by `toLocaleDateString()` strings (which differ per device language →
duplicate days after merges, and sort alphabetically, not chronologically).
Every future shape change to a persisted key gets a new rung here — bump
`FF_SCHEMA`, add `if (v < N) {...}` — instead of defensive parsing scattered
through readers. Rungs must tolerate any historical shape (a user can return
after months).

**2. `migrateDayNames()`** (040:38-55, called every load from
090-first-run-onboarding.js:250). The day *name* is part of the `ff_log` key,
so renaming a training day orphans logged workouts. This re-keys entries
logged under old labels (currently the "(Squat)" → "(Quads)" renames), keeps
the fuller log on collision, and only writes when something changed. It is
**idempotent and self-healing by design**: it runs on every load so that if a
cloud merge re-introduces an old-keyed entry from a stale device, the next
load folds it back in. Rename a day again → add the mapping to its `rename`
table; never edit old entries by hand.

Rule of thumb: shape change → schema rung (runs once per device); identity/
rename healing that sync can keep re-breaking → idempotent every-load migrate.

## 8. The push protocol — rev-guarded compare-and-swap

`push()` (cloud-sync.js:248-299). State: `lastSnapshot` (JSON last known to
match the cloud), `lastRev` (last seen `profiles.rev`, null = not read yet),
`revMode` (false = deployed schema predates the `rev` column), `pushing`
(re-entrancy guard).

1. Bail if signed out, already pushing, or `snapshot() === lastSnapshot`.
   `snapshot()` (:220) serializes only the `KEYS` blob.
2. Up to **3 attempts**; each attempt re-reads `snapshot()` because a conflict
   merge rewrites local state.
3. `revMode === false` → legacy blind upsert of the whole blob, note status,
   stop. (Fallback for a live DB that hasn't had schema.sql re-applied;
   `isMissingRev` (:196) detects the PostgREST missing-column error and flips
   the mode mid-flight.)
4. `lastRev == null` → read the row's `rev` first; if there is **no row**
   (trigger raced / pre-trigger account), insert `{id, data, rev:1}` and stop
   on success.
5. The CAS itself: `UPDATE profiles SET data=…, rev=base+1, updated_at=now
   WHERE id=uid AND rev=base RETURNING rev`.
   - Rows returned → success: adopt `rev`, `lastSnapshot = snap`, `noteSync(true)`.
   - **Zero rows → another device moved the cloud first**: `SELECT data,rev`,
     `mergeBlob(local, cloud)` (same unions as login), `writeBlob` the merged
     result locally (fires `ff-external-write`), adopt the cloud rev, retry
     with the merged state. Third failed attempt → `noteSync(false,
     "sync conflict persisted — will retry")` (the 30 s poll will).
6. Every outcome — success or any error — lands in device-local
   `ff_sync_status` via `noteSync` and the `ff-sync-status` event, so a
   persistently failing sync is visible in the Account tab instead of
   silently eating months of data.

Comparisons use `stable()` (:302) — key-sorted JSON — so cosmetic key order
never looks like a change.

## 9. syncOnLogin and the reload guard

`syncOnLogin` (cloud-sync.js:471-507) runs when `onAuthStateChange` fires
`SIGNED_IN` (:652):

1. `SELECT data, rev` (falling back to no-rev select via `isMissingRev`).
2. No row / null data → **seed the cloud from this device** (`lastSnapshot =
   null; push()`).
3. Cloud stable-equals local → adopt (`lastSnapshot = cloud`), done.
4. Else `mergeBlob(local, cloud)` → `writeBlob` locally → force-push the
   merged blob → **reload once, only if the merge actually changed local
   state**, guarded by sessionStorage `ff_synced_once`. The guard exists
   because the app's own startup rewrites localStorage, so "cloud ≠ local"
   used to be perpetually true → infinite reload loop (the Jun-27 incident).

Boot (:657): the Supabase SDK is lazy — it loads only when a stored `sb-*`
auth token or magic-link tokens in the URL exist; a signed-out visitor
downloads nothing. Note the code pulls cloud→local **only** in `syncOnLogin`
and in CAS-conflict merges during this device's own pushes; whether a plain
app reopen re-triggers `SIGNED_IN` (vs `INITIAL_SESSION`) is SDK behavior, not
guaranteed by this codebase — a device that never writes may not see another
device's changes until it next writes or re-signs-in.

## 10. The Supabase side (`supabase/schema.sql` — idempotent, re-run whole)

- **`profiles`** (:15-32): `id` FK → auth.users ON DELETE CASCADE, `data`
  jsonb (the whole KEYS blob), `updated_at`, provider-neutral billing columns
  (`billing_provider`, `billing_customer_id`, `billing_subscription_id`,
  `subscription_status` default `'free'`, `plan`, `current_period_end`,
  `trial_ends_at`), plus `rev bigint not null default 0` (:45) — the CAS
  counter.
- **RLS billing pins** (:49-82): users select/insert/update only their own
  row; INSERT `with check` forbids self-granting a subscription
  (`subscription_status = 'free'`, null `billing_customer_id`); UPDATE
  `with check` pins `subscription_status`/`plan`/`billing_customer_id`/
  `current_period_end` to their current values. Only the service-role key
  (the paddle-webhook Edge Function) bypasses RLS to write billing columns.
  **Never "fix" a client sync bug by loosening these policies.**
- **`profiles_history`** (:104-143): the rollback. A `before update` trigger
  snapshots the PREVIOUS blob whenever `data` changed, **throttled to one
  snapshot per 10 minutes per user** (an active workout pushes every ~12 s;
  per-push snapshots would be worthless "restore from 12 seconds ago"),
  pruned to the **last 10 revisions**. Users can SELECT their own history;
  only the trigger writes. Restore = SQL-editor copy of a history row's
  `data` back into `profiles.data`.
- **1 MB guard** (:149-161): `pg_column_size(new.data) > 1048576` → loud
  exception on insert/update. A normal blob is tens of KB; 1 MB means a
  client bug. The error surfaces in the Account tab via `ff_sync_status`.
- **`handle_new_user`** (:164-176): after-insert trigger on auth.users
  auto-creates the profiles row; `is_subscribed(uid)` helper (:179-189).
- **`leaderboard`** (:200-265): opt-in, one row per user, self-chosen
  `handle` (never email). Constraints: handle length 2-20 (:222-224), unique
  `lower(handle)` (:225-230, wrapped so pre-existing dupes don't abort the
  script). RLS: public read of `opted_in = true` rows only; insert/update/
  delete own row only. Weekly board columns `week_sessions` + `week_start`
  (:215-216). Client surface: `window.FF.leaderboard`
  (cloud-sync.js:125-163); a duplicate-handle error is translated to "that
  handle is taken".
- **`push_subs`** (:297-340): `endpoint` PK, per-user RLS all four verbs,
  `tz`/`hour` (0-23) + 7-day jsonb `week` schedule, `last_sent` dedupe.
  The client upsert is deduped by the `ff_push_sig` payload hash (080:157).
  pg_cron snippets for the hourly sender + 90-day prune are **deliberately
  commented out** (:342-364) so `supabase db push` never fails on projects
  without pg_cron — they are applied by hand (see `yardsmith-run-and-deploy`).
- Phase-3 normalized tables (`workout_logs`, `speed_tests`, `body_metrics`)
  are scaffolded but commented out (:267-287) — do not uncomment casually;
  moving off the blob is a roadmap phase, not a cleanup.

Schema deploys: pushing changes under `supabase/**` triggers
`.github/workflows/deploy-functions.yml`, which re-applies the whole
schema.sql — details in `yardsmith-run-and-deploy`. The client's `revMode`
fallback (§8) exists precisely so a client shipped before a schema apply
degrades to blind-upsert instead of breaking.

## 11. Account deletion (App Store requirement)

`window.FF.deleteAccount` (cloud-sync.js:89-120) → POST
`/functions/v1/delete-account` with the user's JWT. Server side
(`supabase/functions/delete-account/index.ts`): verify JWT → service-role
client explicitly deletes the user's `leaderboard` + `profiles` rows
(belt-and-suspenders; FKs cascade anyway) → `admin.auth.admin.deleteUser` —
which cascades `profiles_history` and `push_subs` via their FKs. Client side,
on `{ok:true}`: **`lastSnapshot = null` FIRST** (so a pending debounced push
can't re-create the profile row), remove every `fairwayfuel`/`ff_*`
localStorage key, dispatch `ff-external-write`, clear `ff_synced_once`, sign
out. If you ever add app data under a new key *prefix*, this wipe loop (and
the backup exporter, §12) won't see it — another reason everything stays
`ff_*`.

## 12. Backup export / import (the user-facing escape hatch)

- Export (080:276-299): every `fairwayfuel`/`ff_*` key into
  `{app:"Yardsmith", kind:"backup", version:1, exported, data}` — shared as a
  file on iOS, downloaded elsewhere.
- Import (080:300-323): validates the shape, confirms, then **raw
  `localStorage.setItem` per key + `ff-external-write` + `ff-data-changed` +
  `location.reload()`** — the canonical example of the sanctioned raw-write
  pattern (§0 rule 2). After reload, a signed-in device merges (not
  overwrites) the restored history into the cloud via the normal login/push
  paths.

## 13. Quick debugging pointers (triage lives elsewhere)

- "Sync error" in Account tab → read `ff_sync_status.err` (truncated to 200
  chars). `okTs` survives failures — it's the last GOOD sync.
- Data differs across devices → check the key's MERGE entry first; a setting
  (no entry) is *supposed* to be cloud-wins.
- Deleted thing came back → was a tombstone written before removal? Is the
  resurrected entry's `ts`/`_ts` newer than the tombstone (legitimate
  re-creation)?
- Duplicate days in `ff_body` → an entry without `iso` slipped in; the v1
  schema rung + `bodyKey` fallback should heal parseable dates on next load.
- Full symptom→triage table: `yardsmith-debugging-playbook`.

## Provenance and maintenance

Volatile facts, each with a one-line re-verification (all read-only):

- KEYS (26) / MERGE (8) / caps / pins / device-local allowlist — run the
  shipped check: `node .claude/skills/yardsmith-data-and-sync/scripts/check-data-contract.mjs`
  (run green at HEAD `f21930a`).
- Manual pins (`cloud-sync.js?v=112`, `coach.js?v=88` as of 2026-07-08):
  `grep -n '?v=' src/index.template.html src/sw.template.js`
- `FF_SCHEMA` current value (1): `grep -n 'FF_SCHEMA =' src/js/app/005-migrations.js`
- Cited line numbers drift with edits — re-anchor with
  `grep -n 'var KEYS\|var MERGE\|function push\|function syncOnLogin\|PUSH_MIN_MS' cloud-sync.js`
  and `grep -n 'function lsGet\|function lsSet\|migrateDayNames\|resetPlanFull' src/js/app/040-workout-logger.js`
- Push cadence (12 s coalesce / 30 s poll / 10-min snapshot throttle / 1 MB
  guard): `grep -n 'PUSH_MIN_MS\|30000' cloud-sync.js`;
  `grep -n "10 minutes\|1048576\|limit 10" supabase/schema.sql`
- Supabase project ref `tbwmckmyzoxzhpqlomsp` and anon key are hardcoded at
  cloud-sync.js:15-16.
- **Live-DB state is NOT verifiable from this repo**: whether the deployed
  schema actually has the `rev` column (i.e. whether any client is still on
  the `revMode=false` blind-upsert fallback), whether pg_cron jobs are
  scheduled, and whether `profiles_history` has ever been used for a restore
  are open questions as of 2026-07-08.
- The four-keys-drifted incident: `git log --format='%B' -1 5473249`
  (fetch `--unshallow` first if `.git/shallow` exists — see
  `yardsmith-build-and-env`).
