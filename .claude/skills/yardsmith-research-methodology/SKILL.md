---
name: yardsmith-research-methodology
description: >
  HOW a hunch becomes an accepted result in the Yardsmith repo — the evidence
  bar, the pre-registration discipline, the idea lifecycle, and the
  adversarial-refutation practice.
  For live-symptom triage load yardsmith-debugging-playbook FIRST;
  this skill is the evidence bar for declaring the cause found. Load this
  when: you are forming or testing a
  hypothesis (bug root cause, training-science mechanism, user-behavior
  effect, proposed feature); you are about to declare a root cause "found" or
  a mechanism "proven"; you are deciding whether an idea should be pursued,
  parked, or killed; you need to record an open question, result, or
  rejection; you are asked "is this claim solid?", "how do we know?", "should
  we build X?", "has this been tried?"; or you are labeling anything
  open/candidate/adopted/retired. Keywords: hypothesis, root cause,
  evidence bar, pre-register, predicted numbers, adversarial review, refute,
  falsify, post-mortem, don't revive, open thread, candidate, adopted, retired.
---

# Yardsmith research methodology — from hunch to accepted result

Everything below was verified against the repo at HEAD `f21930a` (2026-07-08).
Commit hashes and doc sections are the evidence trail; re-verify with the
commands in "Provenance and maintenance".

## When NOT to use this skill

- You need the **instruments** (unit-case harnesses, vm-sandbox sync proofs,
  perf profiling, determinism checks, effect-size→decision recipes) →
  `yardsmith-proof-and-analysis-toolkit`. This skill says what the bar IS;
  that one says how to run the experiments that clear it.
- You want **what to research** (the open-problems map, SOTA gaps, milestones)
  → `yardsmith-research-frontier`.
- You are **shipping** a result (commit/push/merge/doc duties) →
  `yardsmith-change-control`. No result routes around it.
- You need the **thresholds** that define a green run (18/18, 44px, zero
  pageerrors…) or the Verified-paragraph format →
  `yardsmith-validation-and-qa` and `yardsmith-docs-and-writing`.
- You are triaging a live symptom right now → `yardsmith-debugging-playbook`
  (it applies this methodology pre-packaged per symptom).
- You want the incident narratives in full → `yardsmith-failure-archaeology`.

---

## 1. The evidence bar

A mechanism (root cause, training-science claim, product effect) is
**ACCEPTED** here only when all four hold:

1. **It explains every observation — including the negatives.** Not just the
   symptom you started from: also what did NOT happen, what stayed green, and
   why earlier fixes looked right but weren't sufficient.
2. **It predicted at least one observation before that observation was
   collected** (§2 below — numbers stated first, experiment second).
3. **It survived an assigned adversarial refutation** (§5 below) — someone
   whose only job was to break it, tried, and failed in writing.
4. **It is recorded** — a `**Verified**` paragraph in `DESIGN-CHANGES.md`
   and/or a `YARDSMITH-BRAIN.md` §6 entry. Unrecorded results do not exist
   for the next session (CLAUDE.md: "a decision that lives only in one chat
   doesn't exist").

Anything short of that carries a lower label (open / candidate — §6) and may
not drive app defaults, coach copy, or public claims.

Three case studies from this repo's own history define the bar. Learn all
three — each encodes a different failure of a *plausible-but-wrong* mechanism.

### Case A — the discrimination: stale cache, not a code bug (DESIGN-CHANGES §57–58)

Owner report, verbatim: *"I'm refreshing the save-to-home version and it's
not working"*, followed later by a report that the compacted speed day
"never updated." Two competing mechanisms:

- **H1 (code bug):** the speed-day compaction (§55) shipped broken.
- **H2 (delivery bug):** the device is running an old build.

H1 fails the all-observations test: fresh browser loads showed the compact
day, and the code on `main` was demonstrably correct. H2 explains everything,
including the negative (why nobody could reproduce it in a fresh session):
GitHub Pages serves HTML with `max-age=600`, and an installed PWA *resumes*
rather than reloading, so `reg.update()` never ran (commit `27e5655`, three
compounding causes, three fixes). §58 records the closure explicitly:
*"the earlier 'speed section never updated' was the stale-PWA cache from §57,
not a code issue — the compact speed day was live all along."*

The residue of this case is the house discriminator: **before accepting "code
bug", establish which `FF_BUILD` the reporting device runs** (the You-tab App
version card exists for exactly this). The discriminating experiment lives in
`yardsmith-proof-and-analysis-toolkit`; the triage flow in
`yardsmith-debugging-playbook`.

### Case B — the sync saga: partial mechanisms fail until one explains every loss mode

Five fixes, Jun 27 → Jul 7, each correct about its own incident and each
insufficient — because each explained only the loss mode in front of it:

| Commit | Mechanism claimed | What it missed |
|---|---|---|
| `1794eac` (Jun 27) | login reload-looped because cloud≠local byte compare never matched | said nothing about data loss |
| `747eb6d` (Jun 29) | "misremembering workouts" = whole-blob last-write-wins + cloud-wins-on-login; fix: union-merge `ff_log`/`ff_body` | only two keys; merge only at login |
| `f145f9f` (Jun 29) | just-finished sessions lost in the ~8s push window; fix: instant debounced push | narrowed the window, didn't close it |
| `9b5a3dc` (Jul 1) | union merges resurrect deletions; fix: tombstones | still nothing between logins |
| `5473249` #60 (Jul 7) | **the accepted mechanism** | — |

The #60 mechanism finally explained *all* loss modes, including two that no
prior fix predicted: (i) two open devices blind-upserted whole blobs over each
other continuously, because merging only ever happened at login; (ii) any
additive key **not explicitly given a union function silently defaults to
cloud-wins** — and #60/#61 found **four keys** (`ff_rounds`, `ff_speedtest`,
`ff_mobility`, `ff_fuel`) that had already drifted that way, a failure the
DESIGN-CHANGES cross-cutting tail had earlier recorded as "acceptable". The
fix encoded the mechanism structurally: compare-and-swap on `profiles.rev` +
a declarative `MERGE` registry (details owned by `yardsmith-data-and-sync`).

The test of acceptance: the mechanism **predicted where else the system was
broken** (the four drifted keys), and the proof (`test-sync.mjs`, vm sandbox —
recipe in `yardsmith-proof-and-analysis-toolkit`) drove each historical loss
mode as a designed refutation: concurrent CAS conflict → pull/merge/retry,
tombstone survival through the registry merge, no-`rev` legacy fallback.

**Rule:** a fix that addresses only the observed instance is a symptom patch.
The mechanism you accept must tell you which *other* keys/paths/devices are
also affected — then you go check them.

### Case C — the reset-button post-mortem: green tests coexisted with a real bug (DESIGN-CHANGES §59–60)

Three consecutive user reports (§53 → §54 → §59: *"speed day still doesn't
have the reset button and the logged button is still half size"*) survived
three rounds of fixes-with-passing-tests. The written post-mortem in §60
(commit `ada5c0b`) names the epistemic failure precisely: *"my tests
exercised the **Today** interactive path while the actual button lived in
`logFoot` (Full-week / non-featured days) — green tests, real bug."*

The hypothesis "the tests cover this behavior" was itself a claim — and it
was never adversarially checked. One question would have falsified it:
*"list every surface that renders this button; which of them does the test
actually drive?"* The institutional fix was not another patch but a
refutation machine: the `audit-train.mjs` state matrix (9 states × light/dark
= 18) that tries the claim in every state the behavior can live in
(thresholds and script in `yardsmith-validation-and-qa`). Owner's words,
preserved in the §60 header: *"you had me feeling crazy. Make sure you are
checking for bugs along the build."*

**Rule:** "the tests pass" is evidence about the paths the tests drive,
nothing more. Enumerate the surfaces first; then ask what the green actually
covers.

### Negatives are first-class evidence — in the science too

The domain evidence base applies the same bar. `CLUBHEAD-SPEED-REFERENCE.md`
§10.1/§11.2 (Brennan 2024 meta-analysis) is used as much for what it rules
OUT as in: flexibility zr = −0.04 and balance zr = −0.06 are **not
significant** — which is why mobility is framed as durability, never speed.
§9.2 records the overspeed negatives (acute +2.6 mph in the *first set only*,
smash factor *dropped* d = −0.82, no ball-speed transfer, no independent
multi-week RCT) and explicitly bans the refuted "+8.2 mph" figure ("do not
cite it"). A theory of "speed training works" that ignored those negatives
would have shipped banned claims. Domain numbers live in
`golf-fitness-domain-reference`; what may be said publicly lives in
`yardsmith-external-positioning`.

---

## 2. Hypothesis predicts numbers — before you run

Write the expected observation down, **numerically, before the experiment**.
If you can't state what you expect to see, you don't have a hypothesis yet —
you have a vibe. A surprise in either direction is information; a match found
after the fact is not evidence of anything.

The pre-registration template (put it in your working notes, and the surviving
parts into the Verified paragraph):

```
CLAIM:      <one sentence>
MECHANISM:  <why it should be true>
PREDICTED:  <exact numbers/strings you expect to observe>
REFUTED IF: <the observation that would kill it>
RESULT:     <filled in after> → label: open|candidate|adopted|retired
```

Real repo instances of predicted-then-observed numbers:

- **Wave-engine fix `6932f28`** (the canonical example): the commit states
  the predicted rendered plan *at weeks 1/4/19* before showing results —
  "Speed bench holds 4x4 through Intensify, chest throw holds 3x4, both trim
  exactly one set at Peak, and Barbell Bench still intensifies to 4x3 as
  designed" — then verifies with **37 classification cases + 10
  wave-adjustment cases**. The unit-case harness pattern is shipped in
  `yardsmith-proof-and-analysis-toolkit` (`scripts/wave-cases.mjs`).
- **Build/delivery:** after `node scripts/build.mjs`, the predicted
  observation is `window.FF_BUILD` === the new 10-char hash, both in
  `index.html` and in a booted browser (`04f691fff1` at HEAD `f21930a`).
  Mismatch ⇒ delivery problem, not code problem (Case A).
- **Audit counts stated up front:** audit-train **18/18**, audit-scroll
  **16/16**, test-stats3 **21 checks**, test-sync **25 checks**, test-migrate
  **16** — every Verified paragraph names its expected count
  (`yardsmith-validation-and-qa` owns the thresholds).
- **Performance (§64):** prediction "if the memoized storage layer works,
  interactions re-parse 0 bytes" → measured: JSON.parse calls at
  DOMContentLoaded 266 → 23, boot 826ms → 97ms, tab→Stats 90 parses → 2
  (profiling recipe: `yardsmith-proof-and-analysis-toolkit`
  `scripts/profile-ui.mjs`).

For frontier work the same rule is stated as "pre-registered hypothesis with
predicted numbers" in `yardsmith-research-frontier` ("How a frontier result
gets adopted", step 1) — that skill routes the bar here.

---

## 3. The idea lifecycle as practiced here

```
idea
 └→ CAPTURE: YARDSMITH-BRAIN.md §10 open thread (product/strategy)
             or DESIGN-CHANGES.md cross-cutting tail (design/tech-debt)
     └→ EXPERIMENT / BUILD: against the §1 bar, with §2 predictions
         └→ RECORD: DESIGN-CHANGES.md numbered section + **Verified** paragraph
             └→ SETTLE: YARDSMITH-BRAIN.md §6 decisions log
                 ├─ "Chosen / built"          → label ADOPTED
                 └─ "Rejected (deliberately)" → label RETIRED,
                    with a don't-revive marker and the rationale
```

Facts about how this actually runs, verified in history:

- **Capture is mandatory and cheap.** BRAIN §10 currently holds 8 threads,
  each with status and next action (e.g. §10.7 "Pressure-test the Speed &
  Power day" — an open thread with an executable campaign,
  `yardsmith-speed-day-campaign`). The DESIGN-CHANGES tail is a working
  backlog, not a graveyard: its flagged tech debt became PRs #60–#63, and its
  "ideas queued" list produced real web push (§40) and the event-anchored
  Peak (`ff_event`).
- **Retirement is a documented act, not silence.** Two exemplars:
  - **Dyno Day** (the retirement exemplar): spec committed `9870e81`
    (2026-07-02 11:45), **deleted 9 minutes later** in `5a669ed` (11:54,
    "Remove the assessment spec — direction rejected"). The commit message
    carries the full rationale ("drags the app into DRVN's lane… when our
    scoreboard is the actual outcome — driver carry") and adds: *"Keeping the
    doc would misrepresent the plan."* BRAIN §6 hardens it with an explicit
    ***Don't revive.*** marker. Note both moves: the artifact was **deleted**
    so it can't be mistaken for the plan, and the rejection was **recorded**
    so it can't be silently re-invented.
  - **Macro tracking** (the never-built exemplar): rejected in BRAIN §6
    before any code existed ("commodity; we build *toward distance*
    instead"); the shipped alternative — fuel check-off, "adherence, not
    accounting" — is DESIGN-CHANGES §10, which names the "anti-MFP stance"
    it enforces. A retirement can be of a *category* of feature, and the
    record should point at what was built instead.
- **Reversals are forward-fixes.** There are **zero `git revert` commits in
  all 281** — every U-turn (warm-up default, intl→US-only, leg-day order)
  landed as a new commit whose message argues the reversal. If you change
  direction, write the argument down where the next session will find it
  (full U-turn catalog: `yardsmith-failure-archaeology`).
- **Reviving a retired idea requires new data** plus a written case against
  the original rationale, recorded in BRAIN §6. Without both, a don't-revive
  marker is binding.

---

## 4. Where good ideas historically came from — the four wells

Every substantial improvement in this repo traces to one of four sources.
Before inventing a feature from scratch, mine these, in this order.

**Well 1 — verbatim owner friction.** DESIGN-CHANGES section headers preserve
the owner's exact words — 36 headers carry a `(user: "…")` quote. The quotes
ARE the requirements: *"you had me feeling crazy"* (§60) bought the audit
pack; *"Adding a rep during a workout makes the screen go back to the top of
the page annoyingly"* (§65) bought scroll preservation; *"still doing too
much… can we consolidate?"* (§52) bought Stats 3.0; a friend's *"a lot of
info all at once"* (§42) bought the three calm passes. **Practice: when the
owner reports friction, quote them verbatim into the section header** —
paraphrase loses the signal the next session needs.

**Well 2 — benchmark passes against named best-in-class apps.** The method
(§46, repeated in §48–§50): full-page captures of Yardsmith in
fresh/active/dark states, evaluated against a named benchmark per concept —
Hevy (action-first ordering, week dots, per-exercise history: §9, §46, §49),
Whoop (dynamic status line, §46), Apple Fitness (glanceable rings, §46),
MyFitnessPal/MacroFactor (Fuel 2.0, §48) — findings → one rebuild. Boundary:
borrow the science and proven UX *patterns*, never a competitor's data,
protocols, or copy (`yardsmith-external-positioning` owns that line).

**Well 3 — the evidence docs themselves.** Reading
`CLUBHEAD-SPEED-REFERENCE.md` §10.1 (the Brennan 2024 zr table) with app
decisions in mind *generated* the speed-day design (jump work first, both
throw planes, full rest); the negatives in the same table generated the
mobility=durability framing. The effect-size→app-decision recipe is in
`yardsmith-proof-and-analysis-toolkit`; what to aim it at next is
`yardsmith-research-frontier`.

**Well 4 — calm-pass and structural-review loops.** Periodic deliberate
passes over what already exists: the calm trio (§42–§44, triggered by outside
feedback), the benchmark passes above, and the code-health/DB reviews
(PRs A–D, §61–§64) that turned the cross-cutting tail's recorded debt into
the sync-integrity and performance wins. **Practice: the DESIGN-CHANGES
cross-cutting tail is the standing idea backlog — read it before proposing
new work, and append to it when you spot debt you can't fix now.**

---

## 5. Assigning an adversarial refutation

The §1 bar requires that a claim survive someone *trying* to kill it. "Review
this" produces agreement; **"break this" produces evidence.**

**Who:** a spawned subagent, a second session, or yourself in a separate,
later pass with the brief below. The refuter must not be invested in the
claim being true.

Provenance note: this brief *formalizes* the refutation practice evidenced in
the repo's history (§§60/61/66 — self-run, designed failure modes); no repo
doc mandates an *assigned* second-party refuter. This skill codifies it as
the standard going forward — don't cite it as a pre-existing documented
process.

**The brief (give the refuter exactly this):**

```
CLAIM: <the mechanism/fix, one sentence>
PREDICTS: <the §2 numbers>
YOUR ONLY JOB: falsify it. A response of "looks correct" is a failed review.
DELIVERABLE: either (a) a reproduction that breaks the claim, or
(b) an enumerated list of attack vectors you tried, each with the
observed result. Attack at minimum:
1. SURFACES — enumerate EVERY render path / view / mode where the behavior
   lives (Today vs logFoot vs Full-week vs player — the §60 failure) and
   state which the existing evidence actually exercises.
2. STATES — fresh / logged / manual / deload week / future day / …,
   both themes (the audit-train 9×2 matrix pattern).
3. CONCURRENCY — the second-device / mid-flight-push case
   (the test-sync CAS-conflict pattern).
4. NEGATIVES — deletions, empty states, the thing that must NOT happen
   (tombstone-resurrection pattern).
5. DEGRADED ENVIRONMENT — stale-cache delivery, offline, legacy schema
   (the no-rev fallback), wrong FF_BUILD.
6. SAME-CLASS SWEEP — does this bug class exist anywhere else in the app?
   (§66: after ONE scroll-reset fix, every other re-render surface was
   audited — 16/16 — and "all clean" was recorded as a result, not assumed.)
```

**What surviving looks like:** the refuter's report lists concrete attacks
with observed results, all consistent with the mechanism — and the claim's
Verified paragraph then *names those attacks*. §61's Verified paragraph is
the model: it doesn't say "sync works"; it says the CAS conflict was forced
and resolved with both devices' data intact, tombstoned sessions stayed
deleted through the registry merge, and the no-rev schema fell back and still
unioned. Each clause is a refutation attempt that failed.

**What a vacuous refutation looks like:** "LGTM"; attacking only the path the
author already tested; asserting coverage without enumerating surfaces
(the exact hypothesis Case C never checked).

---

## 6. The labeling scheme — no oversell

Every claim in docs, skills, commit messages, and analyses carries exactly
one of four labels. Never upgrade a label silently.

| Label | Meaning | Lives in | Permits |
|---|---|---|---|
| **open** | a question; no experiment run | BRAIN §10 / `yardsmith-research-frontier` | investigation only |
| **candidate** | specific mechanism/numbers proposed; evidence incomplete or not yet adversarially checked | working notes; frontier skill (write the word CANDIDATE next to every such number) | building an experiment; never app defaults or copy |
| **adopted** | met the full §1 bar | BRAIN §6 "Chosen" + a DESIGN-CHANGES Verified entry | app behavior, coach knowledge, internal docs. Public claims are a FURTHER gate — `yardsmith-external-positioning` (banned numbers, confidence levels) |
| **retired** | deliberately rejected, rationale recorded | BRAIN §6 "Rejected (deliberately)", don't-revive marker; misleading artifacts deleted (Dyno Day precedent) | nothing, until new data + a written case reopens it |

Two standing consequences:

- The AI coach's knowledge base and the in-app copy carry **adopted material
  only** — that is why the overspeed protocol ships as an "honestly-framed
  adjunct" and why "+X mph" promises are banned (`golf-fitness-domain-reference`
  for the numbers, `yardsmith-external-positioning` for the wording).
- A green experiment does not auto-adopt. Adoption happens when the result is
  *recorded* (§3) and the change, if any, has passed
  `yardsmith-change-control`.

---

## 7. Cross-reference map

| Need | Skill |
|---|---|
| Run the experiment (unit cases, vm sandbox, profiling, determinism, FF_BUILD discriminator) | `yardsmith-proof-and-analysis-toolkit` |
| Pick the problem (SOTA gaps, milestones, extraction scripts) | `yardsmith-research-frontier` |
| Land the result (merge gate, doc duties, pins, generated files) | `yardsmith-change-control` |
| Thresholds + Verified format | `yardsmith-validation-and-qa`, `yardsmith-docs-and-writing` |
| Drive the app headlessly | `yardsmith-playwright-harness` |
| Symptom triage now | `yardsmith-debugging-playbook` |
| Full incident narratives / settled battles | `yardsmith-failure-archaeology` |
| Domain math + glossary | `golf-fitness-domain-reference` |
| Public wording rules | `yardsmith-external-positioning` |

---

## Provenance and maintenance (as of 2026-07-08, HEAD `f21930a`)

All of the following were run and matched at authoring time. Re-verify before
relying on a count or hash:

- History depth (archaeology needs full history):
  `ls .git/shallow` → absent here (full clone, 281 commits:
  `git log --oneline origin/main | wc -l`). If `shallow` exists, run
  `git fetch --unshallow origin` first (see `yardsmith-failure-archaeology`).
- Zero reverts: `git log origin/main --oneline | grep -ci revert` → `0`.
- Dyno Day retirement: `git log --format='%h %ad %s' --date=iso -1 9870e81`
  (2026-07-02 11:45) and `… 5a669ed` (11:54); rationale:
  `git log -1 --format=%B 5a669ed`.
- Wave-engine pre-registration exemplar: `git log -1 --format=%B 6932f28`
  (37 + 10 cases, weeks 1/4/19 predictions).
- Sync-saga commits: `git log -1 --format=%s 1794eac 747eb6d f145f9f 9b5a3dc
  5473249 02b1f6d 7a4361a` (run one at a time).
- Post-mortem text: `sed -n '1389,1410p' DESIGN-CHANGES.md` (§60); stale-cache
  closure note: `sed -n '1452,1455p' DESIGN-CHANGES.md` (§58, may drift —
  search `grep -n "stale-PWA cache" DESIGN-CHANGES.md`).
- Counts: `grep -c '^\*\*Verified' DESIGN-CHANGES.md` → 21;
  `grep -c '(user' DESIGN-CHANGES.md` → 36 (both grow as sections are added).
- Current build hash: `grep -o 'FF_BUILD="[^"]*"' index.html` → `04f691fff1`;
  manual pins `grep -o 'cloud-sync.js?v=[0-9]*\|coach.js?v=[0-9]*'
  src/index.template.html` → v=112 / v=88.
- BRAIN section anchors: `grep -n '^## ' YARDSMITH-BRAIN.md` (§6 at line ~285,
  §10 at ~415 today; use the headers, not the line numbers).
- Banned-claim + negatives text: `grep -n '8.2\|do not cite\|d = -0.82'
  CLUBHEAD-SPEED-REFERENCE.md` (§9.2, lines ~260–273 today).
