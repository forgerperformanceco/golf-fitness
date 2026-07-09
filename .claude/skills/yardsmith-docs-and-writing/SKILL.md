---
name: yardsmith-docs-and-writing
description: >
  Yardsmith's documentation system and writing standards. Load this BEFORE
  writing or updating any repo doc (YARDSMITH-BRAIN.md, DESIGN-CHANGES.md,
  CLAUDE.md, feature specs), before trusting ANY doc as a source of truth
  (staleness map + precedence order live here), when finishing a change and
  deciding which doc records it, when writing user-facing copy (labels,
  coaching text, glossary terms, marketing lines), or when confused because
  two docs contradict each other. Keywords: docs of record, DESIGN-CHANGES
  section, brain update, decision log, don't-revive, staleness, stale doc,
  precedence, copy style, coach voice, glossary, sources/, model identity.
---

# Yardsmith — docs of record & writing duties

Everything in this file was verified against the repo at HEAD `f21930a`
(2026-07-08). Line numbers refer to that state; re-verify with the commands in
"Provenance and maintenance" if the file has grown.

**When NOT to use this skill:**

| You actually want… | Use instead |
|---|---|
| The release checklist, merge gates, parallel-session git protocol | `yardsmith-change-control` |
| The full localStorage key catalog / add-a-key checklist | `yardsmith-data-and-sync` |
| What counts as test evidence, the audit thresholds behind "Verified" lines | `yardsmith-validation-and-qa` |
| Public-claim rules, banned marketing numbers, citation/confidence standards, the full sources/ synthesis workflow | `yardsmith-external-positioning` |
| Definitions of domain jargon (e1RM, wave, Octane pillars…) | `golf-fitness-domain-reference` |
| The history behind a decision (incidents, U-turns, commits) | `yardsmith-failure-archaeology` |

---

## 1. The docs of record and their roles

Three documents are **living** (actively maintained, safe to trust with the
caveats in §3); everything else is a point-in-time satellite.

### 1.1 `CLAUDE.md` (93 lines) — repo mechanics

The rulebook for *how to work in this repo*: the edit-`src/`-never-outputs rule,
build/dark-theme commands, deploy model, testing pointers, data-layer duties,
and the parallel-session git protocol. Loaded automatically by every Claude
session, so it is the highest-authority doc by construction. It contains the
sentence this whole library orbits (CLAUDE.md:87-90):

> **Record decisions in `YARDSMITH-BRAIN.md`** (product/strategy) or
> `DESIGN-CHANGES.md` (design/UX) — the repo docs are the only memory shared
> between sessions. **A decision that lives only in one chat doesn't exist for
> the other.**

That is not a nicety. The owner runs multiple parallel Claude sessions against
`main`; a decision you record only in conversation is invisible to the sibling
session that edits the same file tomorrow.

### 1.2 `YARDSMITH-BRAIN.md` (487 lines) — the company brain

"Start here" doc: thesis, product, architecture summary, evidence base,
competitive position, decisions, ops, roadmap, open threads, house rules.
Anatomy worth knowing cold:

| Part | Lines (at f21930a) | What it is |
|---|---|---|
| **Status snapshot** blockquote | 8-26 | Launch/entity/build state, marked "**keep current**" — update it whenever launch state changes |
| §6 Decisions log | 285-323 | Chosen AND **rejected** decisions; rejected ones carry rationale and (for the hard kills) an explicit "*Don't revive.*" marker |
| §10 Open threads / next actions | 415-444 | Numbered, status-annotated (DONE / RESOLVED / parked-with-trigger) |
| §11 Conventions & house rules | 447-460 | The house-rule bullets, incl. copy honesty, foods, model identity |
| §12 Doc index | 464-484 | Table mapping every doc to its role — the canonical doc map |
| Keep-current footer | 486-487 | "when a major decision, feature, or number changes, update the relevant section here **and the deeper doc it points to**" |

The footer is a standing duty, not a suggestion: touching a feature whose
satellite spec exists means the spec update is part of your change.

### 1.3 `DESIGN-CHANGES.md` (1,638 lines) — the design/UX changelog

67 numbered sections plus a "Cross-cutting notes / recorded follow-ups" tail.
One section per shipped design/feature pass. Three properties make it the most
valuable doc in the repo:

1. **Section headers quote the owner verbatim** —
   `## 60 · Train-page bug sweep + tap targets (user: "you had me feeling
   crazy. Make sure you are checking for bugs along the build")`. The doc
   doubles as the record of user feedback; preserve quotes exactly, typos and
   all.
2. **Nearly every section ends with a `**Verified**` paragraph** (21 sections
   open a paragraph with `**Verified`) naming the exact test script and
   assertions that proved the change ("audit-train 18/18", "16/16 keep the
   exact scroll position; zero page errors"). The scripts themselves are
   session-ephemeral; this prose is what survives, so write it precisely
   enough that a future session can recreate the test. (What counts as
   adequate evidence: `yardsmith-validation-and-qa`.)
3. **It records incidents as reusable lessons** — harness gotchas, post-mortems
   (§60's "green tests, real bug"), tech-debt flags in the tail.

### 1.4 The satellites (point-in-time; check §3 before trusting)

From BRAIN §12, with roles: `CLUBHEAD-SPEED-REFERENCE.md` and
`NUTRITION-AND-TRAINING-REFERENCE.md` (the evidence base),
`COMPETITIVE-LANDSCAPE.md` (market + borrow-vs-avoid rules), `ROADMAP.md`
(self-described "plan of record" for monetization phases), `OCTANE-SCORE.md`
(score spec), `COACH-PERSONA.md` (AI voice spec, mirrored into
`supabase/functions/_shared/knowledge.ts` — see §5.3), `BUILD-NATIVE-APP.md` /
`ANDROID-LAUNCH-STEP-BY-STEP.md` / `ANDROID-WINDOWS-QUICKSTART.md` /
`CODEMAGIC-SETUP.md` (native ship guides), `PUSH-SETUP.md` and
`GO-LIVE-CHECKLIST.md` (ops runbooks), `LAUNCH-GUIDE.md` (historical, §3),
`sources/README.md` (raw-source drop-zone rules, §7).

---

## 2. Precedence when docs disagree

Observed order (this is practice reconstructed from the repo, not a rule
written anywhere — treat it as reliable but say so if you cite it):

**Code/config → CLAUDE.md → YARDSMITH-BRAIN.md → newest DESIGN-CHANGES
section → feature specs → launch-era guides.**

- **Code beats every doc for mechanical facts.** The canonical synced-key list
  is `KEYS` at cloud-sync.js:20 (26 keys), not any doc's list. The canonical
  manual pins are in `src/index.template.html:369,371` and
  `src/sw.template.js:12-13` (`cloud-sync.js?v=112`, `coach.js?v=88` as of
  2026-07-08).
- **CLAUDE.md beats BRAIN for repo mechanics** (it is shorter, loaded every
  session, and updated when the protocol changes — e.g. the parallel-session
  section landed `1282f87`, Jul 8).
- **BRAIN beats older DESIGN-CHANGES sections for current state**, but the
  *newest* DESIGN-CHANGES section often beats BRAIN on fine detail because
  section-writing is bundled with the PR while BRAIN edits lag (see the pin
  demo below).
- **Within BRAIN, the later/more-specific section wins.** Verified internal
  contradiction: §7 (line 348-354) still says the Play Console account type is
  "OPEN … (Undecided.)" while §10.2 (line 423-426) and the status snapshot say
  "RESOLVED — Organization" (commit `f21930a`). §10.2 is correct; §7 was not
  updated.

**Worked demo — the cloud-sync pin.** BRAIN §3 (line 161-163) says the manual
pins are "currently `?v=108` and `?v=88`". DESIGN-CHANGES traces the real
history: v=103 (tail) → 107 (§39) → 108 (§40) → 109 (§61) → 110 (§62) → 111
(§63) → 112 (§64). The template says 112. So: template (code) > newest §64 >
BRAIN. BRAIN's pin number lags four bumps — never copy volatile numbers out of
BRAIN without checking the source file.

---

## 3. Staleness map (each claim re-verified 2026-07-08)

| Doc | Stale claim (evidence) | The truth |
|---|---|---|
| **`LAUNCH-GUIDE.md`** — treat the whole file as a June-26 launch-weekend artifact | Deploys from feature branch `claude/golf-macro-calculator-j2e9vk` (line 30); site URL `pharmerbobby.github.io/Golf-Fitness` (line 34); "bump the `CACHE` version string at the top of `sw.js` (e.g. `fairwayfuel-v3` → `v4`)" (lines 159-162); hand-edit `cloud-sync.js` top lines (line 130) | Deploys from `main` to yardsmith.golf; SW cache is content-hash stamped (no manual bumps); root files are build outputs — never hand-edited. Only touched since Jun 26 by rebrand/domain find-replace (`89bab89`, `8467e6d`) |
| **`BUILD-NATIVE-APP.md`** §2 "Every release", step 1 | "**Bump the service-worker cache** in `sw.js` (`yardsmith-vNN`)" (line 64) | Wrong since modularization (`dce7a6f` #13, Jul 5): the hash is automatic; there is nothing to bump. The rest of the doc (Capacitor steps) is fine |
| **`OCTANE-SCORE.md`** | Five pillars only (table, lines 26-33 — no fuel pillar); "rendered at the top of the Train view as `.ffscore`" and "Lives in `index.html`" (lines 13-14); "four pillar bars beneath" (line 40) | Six pillars — fuel adherence (weight 10, avg of last ≤7 logged days in a 14-day window) shipped in DESIGN-CHANGES §10; the gauge lives on the **Dashboard hero card** (070-workout-player…js:823-826) and the **Stats Octane hub** with six pillar folds (§52; 070:893). Doc's last substantive edit was the 5th-pillar spec (`1163506`, Jul 5); only name-swapped since (`89bab89`) |
| **`ROADMAP.md`** "Where we are today" | "single `index.html` + `sw.js`" (line 21); data-model table lists **4** synced keys — `fairwayfuel, ff_week, ff_log, ff_body` (lines 24, 33-36) | Modular `src/` build; **26** synced keys in `KEYS` (cloud-sync.js:20). Also: Phase-3 "push notifications" is DONE (BRAIN §9 correctly marks Phase 3 "largely shipped") |
| **`YARDSMITH-BRAIN.md`** (mostly current, but…) | §3 pins "?v=108" (line 162); §3 key list names `ff_notes`, `ff_push`, `ff_mob`, `ff_round` (lines 200-201) — none of these keys exist (real names: per-session `note` fields, `ff_push_on`, `ff_mobility`, `ff_rounds`); §7 Play Console "Undecided" (line 354) | Pins per template (v=112/v=88); keys per `KEYS`; Play Console RESOLVED = Organization (§10.2) |
| **`DESIGN-CHANGES.md` cross-cutting tail** (lines 1621-1638) | "SW cache bumped to `fairwayfuel-v122`; pin `?v=103`"; "5.8k-line single-file app"; "cloud-sync.js swallows every error silently"; ff_speedtest/ff_mobility "cloud-wins … acceptable" | The tail predates §§11/39/61 and was never pruned: modularization (§11), visible sync health (§39), and the additive-merge registry (§61) fixed those items. Still-open items in the tail: dual loggers duplicating progression logic; `weekStartDate` vs `weekStartDateCal` confusion |

**Is fixing stale docs wanted?** No recorded decision says "keep them as
historical artifacts", and the BRAIN footer (line 486-487) affirmatively
requires updating "the deeper doc it points to" when its feature changes. So:
if your change touches Octane, fixing OCTANE-SCORE.md is in scope for your PR;
gratuitously rewriting LAUNCH-GUIDE.md with no triggering change is nobody's
recorded priority. Doc-only commits are cheap — they trigger **no** Pages
deploy (`**.md` in `deploy.yml` paths-ignore, lines 12-14) and `.md` files are
never published to yardsmith.golf (rsync `--exclude '*.md'` in the same
workflow).

---

## 4. DESIGN-CHANGES numbering — the quirk you must know before adding a section

### 4.1 File layout is ascending-then-descending

Sections **1→51 run in ascending order** (lines 11-1120). From §52 on, new
sections were **inserted newest-first immediately after §51**, so the file then
reads **67, 66, 65 … 52** (lines 1121-1620), followed by the cross-cutting tail
(line 1621). Consequences:

- **The newest entry is NOT at the end of the file.** It sits right below §51
  (currently §67 at line 1121). The end of the file is §52 + the (stale) tail.
- **To add section N (currently N=68):** insert it *between the end of §51's
  body and the current-newest header* (before `## 67 ·` at line 1121),
  following the established newest-first convention. Do not append after the
  tail.
- To find "the latest word" on a topic, scan down from line ~1121, not up from
  the bottom.

### 4.2 `(#NN)` commit suffixes are GitHub PR numbers, and they drift off doc § numbers

Verified mapping anchors (`git log --format='%h %s' | grep '(#'`):

| Commit | PR | Documents doc § | Offset |
|---|---|---|---|
| `f55bfcd` | #1 | §§1-3 (one PR, three sections) | — |
| `dce7a6f` Modularize | #13 | §11 | PR = §+2 |
| `9fc7fa4` Round Debrief | #28 | §27 | PR = §+1 |
| `588c7c3` Calm pass A | #41 | §42 | PR = §−1 |
| `5473249` Sync integrity | #60 | §61 | PR = §−1 |
| `cdebf0a` Type pass | #66 | §67 | PR = §−1 |

The offset wanders (±2) because some PRs produced multiple sections and some
sections documented multiple PRs; across the §61-§67 run it is uniformly
PR = § − 1. **Never resolve `(#NN)` to `## NN` by number — match by title
text.** PRs #1-#12 are true two-parent merge commits; #13 onward are
squash-merged (relevant when doing archaeology — see
`yardsmith-failure-archaeology`).

---

## 5. Writing duties bundled with every change

The doc write is part of the change, in the same PR/commit series — not a
follow-up you might get to. Routing table:

| You just… | You must write… |
|---|---|
| Made a product/strategy decision (or killed an idea) | BRAIN §6 entry (see template §6.2); if it changes launch state, also the status snapshot; if it opens/closes a thread, §10 |
| Shipped a design/UX/feature change | New DESIGN-CHANGES numbered section (template §6.1), inserted per §4.1, with a real **Verified** paragraph |
| Changed repo mechanics (build, pins, protocol, testing) | CLAUDE.md — keep it short; it's loaded into every session's context |
| Changed a feature that has a satellite spec | Update the spec too (BRAIN footer duty) — e.g. Octane changes must land in OCTANE-SCORE.md |
| Changed training/nutrition facts or the coach's voice | The reference docs / COACH-PERSONA.md **and** `supabase/functions/_shared/knowledge.ts` (see §5.3) |
| Added a synced `ff_*` key | Code duties owned by `yardsmith-data-and-sync`; the *doc* duty is a DESIGN-CHANGES note of the key + merge choice (house pattern: see the tail's ff_speedtest note and §61) |
| Hit a testing gotcha that cost time | Record it in the DESIGN-CHANGES section — the gotcha lists in §§12/41/42/45/48 are why the harness is recreatable at all |

### 5.1 The rule, restated as behavior

Before ending any session in which something was *decided* — even a decision
NOT to do something — grep BRAIN and DESIGN-CHANGES for it. If it isn't there,
it doesn't exist. Rejected-and-shouldn't-return ideas specifically need the
"*Don't revive.*" marker (BRAIN §6 uses it for the Dyno Day battery), because a
future zero-context session will otherwise reinvent them in good faith.

### 5.2 BRAIN update discipline

- Update the **status snapshot** (lines 8-26) whenever entity/launch/deploy
  state changes — it's the first thing every new session reads.
- BRAIN is a *summary that points down*: numbers that live in code (pins,
  key counts) go stale there fast (§2's demo). Prefer "see X" over copying
  volatile values into BRAIN.
- When resolving an open thread, update **every** BRAIN section that mentions
  it — the §7-vs-§10.2 Play Console contradiction (§2 above) is what happens
  when you don't.

### 5.3 The knowledge.ts mirror

COACH-PERSONA.md:6 declares it "mirrored into the live system prompt
(`supabase/functions/_shared/knowledge.ts`)" — verified: knowledge.ts:40 holds
the persona block. There is no tooling enforcing the mirror; it is manual
discipline. Any edit to COACH-PERSONA.md or coaching-relevant facts in the two
reference docs must be reflected in knowledge.ts in the same change (pushes
touching `supabase/**` auto-deploy the function via deploy-functions.yml — see
`yardsmith-run-and-deploy`).

---

## 6. Templates (copy-paste and fill)

### 6.1 DESIGN-CHANGES section skeleton

Insert per §4.1 (immediately after §51's body, before the current-newest
section). Header quote is the owner's words verbatim when the change was
user-prompted; otherwise a plain parenthetical like `(user request)`,
`(user-reported)`, or none.

```markdown
## NN · Short title, benefit-first (user: "exact verbatim quote that prompted it")

One-to-three sentence narrative: the problem in plain words, and the root
cause if this was a bug.

**What changed**
- Change one — with the mechanism (function/module names in backticks).
- Change two.

**Design decisions**
- Decision — and the *why*, including the alternative you rejected and what
  would make you revisit (this is the part future sessions actually need).

**Verified**: name the script (e.g. scratchpad/test-xyz.mjs) and the exact
assertions — counts ("18/18 clean"), zero page errors, what was seeded, which
viewports/themes. If prior suites were re-run, say which ("full battery
green — …"). Screenshots eyeballed? Say so.
```

Notes: later sections legitimately vary the middle (numbered bold paragraphs,
`**Findings → fixes**`, `**What./Why./Method.**` — see §61 and §67 for
exemplars); the header format and the closing **Verified** paragraph do not
vary. If the change bumped a manual pin, record the bump in the section body
("pin bumped v=112 → v=113") — that running trail is how §2's pin history was
reconstructable. If the user must do something (e.g. re-run schema.sql), add a
`**User action**:` paragraph after Verified (§61 pattern).

### 6.2 BRAIN decision-log entry skeletons

Chosen (append to the "Chosen / built" list in §6):

```markdown
- **Name of the thing** — one line of what it is; the key design choice in
  parentheses if non-obvious.
```

Rejected (append to the "Rejected (deliberately)" list; the *Don't revive.*
marker is reserved for ideas a future session might plausibly resurrect):

```markdown
- **The idea, named concretely** — why it was killed, in one clause that a
  stranger can evaluate ("drags us into their lane when our scoreboard is the
  real outcome (yards)"). *Don't revive.*
```

If the decision resolves/updates an open thread, edit BRAIN §10's numbered
item in place with a status prefix (`DONE (Jul 2026).` / `RESOLVED — X.` /
trigger conditions for parked items), and sweep the rest of BRAIN for
now-contradicted statements.

---

## 7. House copy style — user-facing text

These are declared rules (BRAIN §11, lines 449-460) plus observed idiom. They
apply to app copy, store listings, share cards, and coach output alike.

1. **Goals, not guarantees.** "+15 yds is your mission we track," never "you
   will gain 15 yds." No vendor-style "+X mph" promises anywhere (BRAIN §11,
   lines 454-455). The one defensible speed number is the ~4%
   combined-training figure, always framed "typical, not promised"
   (CLUBHEAD-SPEED-REFERENCE:326); the widely-shared "+8.2 mph" tester figure
   is fact-checked, refuted, and **banned from citation**
   (CLUBHEAD-SPEED-REFERENCE:272-273). Full banned-claims list:
   `yardsmith-external-positioning`.
2. **Honest labels.** Counts and names must match reality — a documented pass
   exists purely because "the pre-workout snack is not a 'meal'"
   (DESIGN-CHANGES §26). Don't let UI copy promise mechanics the code doesn't
   have (§1 closed exactly such a gap: the "Deload every 6th week" chip
   predated the logic).
3. **Male-appropriate, real, purchasable foods** in the meal engine (BRAIN
   §11:456, §2:88-89) — the target user is an adult male golfer; food
   suggestions are grocery-store staples, not diet-culture items.
4. **Jargon must be tap-to-explain.** Every invented or technical term
   (Octane, banked, e1RM, wave, receipts…) gets a `FF_TERMS` glossary entry in
   `src/js/app/009-glossary.js` and renders via `ffTerm(key,label)` as a
   tappable span — "the charm stays, the riddle goes" (009-glossary.js:1-7).
   Introducing a new term in copy without a glossary entry breaks house style.
   Glossary sentences are one-liners: concrete, second-person, benefit-first.
5. **Coach voice** (COACH-PERSONA.md): PG-13 hype-man gym partner — cheerful,
   blunt, "hype PLUS substance", opens with energy then gets specific with
   *the user's* numbers. **"Tone changes; facts never do"**
   (COACH-PERSONA.md:4-5): grounding rules always beat personality — no
   invented numbers, no fake results, medical questions referred out, don't
   force slang "to the point of cringe". Before/after voice examples live at
   COACH-PERSONA.md:39-48; the persona ships to production via knowledge.ts
   (§5.3).
6. **Mobility is framed as durability, never as a speed hack** (BRAIN §4) —
   copy that sells mobility as distance is factually off-thesis.
7. App/doc prose idiom (observed): sentence-case headers, em-dash asides,
   bolded lead-ins, benefit-first titles ("Real periodization + auto-
   progression", not "Refactor waveAdjust").

---

## 8. The model-identity rule

BRAIN §11:460: "**Model identity** and internal identifiers never go into
committed artifacts." In force since the brain's first commit (`8b84528`,
Jul 3). What this means in practice (interpretation from observed repo state,
2026-07-08):

- No "built by Claude/Opus/…" in app copy, code comments, docs content, share
  cards, or marketing files. Verified: model names appear in tracked files
  *only* as the AI-coach product configuration (`claude-opus-4-8` etc. in
  ROADMAP.md, `.env.example`, `supabase/functions/ai-coach/`) — that is the
  product's model choice, not authoring identity, and is fine.
- Git *commit trailers* (`Co-Authored-By: Claude …`, `Claude-Session: …`) are
  harness-standard metadata and do appear throughout history; the rule has
  never been applied to them.
- Internal identifiers (session IDs, scratchpad paths) likewise stay out of
  committed file content — cite repo paths in docs, never
  `/tmp/claude-…/scratchpad/…` (DESIGN-CHANGES names scripts as
  "scratchpad/test-x.mjs" generically, which is the accepted form).

---

## 9. The sources/ pipeline — one rule for writers

`sources/` is a git-ignored drop zone for raw ebook/course/podcast transcripts
(`.gitignore:28-31` — only `sources/README.md` is tracked). The rule
(sources/README.md): **raw copyrighted text never enters the repo or the AI
coach**; only original, paraphrased synthesis lands in the tracked knowledge
files (`NUTRITION-AND-TRAINING-REFERENCE.md`, `CLUBHEAD-SPEED-REFERENCE.md`,
`knowledge.ts`), with the source credited in a further-reading list and
branded/proprietary methods explicitly flagged or omitted. If you are writing
into those files from a dropped source, the full workflow (header format,
routing, attribution, contradiction-flagging) is in `sources/README.md`;
citation and confidence-level standards are owned by
`yardsmith-external-positioning`.

---

## Provenance and maintenance

All facts verified read-only against `/home/user/golf-fitness` at HEAD
`f21930a`, 2026-07-08. Line numbers drift as docs grow — re-verify before
citing:

- Doc inventory + line counts: `wc -l *.md`
- DESIGN-CHANGES layout / newest section / tail:
  `grep -n '^## ' DESIGN-CHANGES.md` (expect 1→51 ascending, then descending
  from the current max, tail last; newest = first header after §51)
- `**Verified` paragraph count: `grep -c '^\*\*Verified' DESIGN-CHANGES.md`
  (21 at f21930a)
- PR↔§ drift anchors: `git log --format='%h %s' | grep -E '\(#[0-9]+\)'`,
  match titles against `grep -n '^## ' DESIGN-CHANGES.md`
- Current manual pins (truth source):
  `grep -n '?v=' src/index.template.html src/sw.template.js`
  (v=112 / v=88 at f21930a)
- Synced-key truth source: `sed -n '20p' cloud-sync.js` (26 keys at f21930a)
- Staleness spot-checks: `sed -n '60,68p' BUILD-NATIVE-APP.md` (manual SW bump
  line); `sed -n '13,14p;26,41p' OCTANE-SCORE.md` (5 pillars, Train-view
  claim); `sed -n '19,40p' ROADMAP.md` (4-key table);
  `grep -n 'v=108\|Undecided\|ff_notes' YARDSMITH-BRAIN.md` (BRAIN lag
  markers — if these return nothing, BRAIN has been fixed and §3's BRAIN row
  here is obsolete)
- Docs-don't-deploy: `sed -n '12,24p' .github/workflows/deploy.yml`
  (`'**.md'` in paths-ignore) and the rsync `--exclude '*.md'` in the same file
- Persona mirror: `grep -n 'PERSONA' supabase/functions/_shared/knowledge.ts`
- sources/ ignore rule: `sed -n '28,31p' .gitignore`; `git ls-files sources/`
  must return only `sources/README.md`

Open/uncertain, stated honestly: the precedence order (§2) and the
model-identity boundary around commit trailers (§8) are reconstructions from
observed practice, not written rules; whether stale satellites should be
proactively corrected absent a triggering change has no recorded decision
(§3). If you settle any of these, record the decision in BRAIN §6/§11 — and
then update this skill.
