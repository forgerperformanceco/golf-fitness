---
name: yardsmith-external-positioning
description: >
  Yardsmith's outward-facing strategy rules: competitive positioning (DRVN and
  the three market lanes), the borrow-vs-never-copy rule for competitor content,
  what may and may NOT be claimed publicly (banned numbers like "+8.2 mph";
  the science BEHIND a claim → golf-fitness-domain-reference, whether it may
  be PUBLISHED → this skill),
  citation/confidence standards, the sources/ ingestion pipeline,
  rebrand/trademark context (FairwayFuel -> Yardsmith), and store compliance
  (Play Billing caveat, account deletion). Load this
  BEFORE: writing any marketing/landing/store-listing/social copy; making any
  public performance claim ("+X mph", "+Y yards", "%"); adding competitor-derived
  features or content; ingesting external books/courses/transcripts; touching
  brand names, trademarks, or domains; answering "can we say/copy/use X?";
  preparing a Play Store or App Store submission. Keywords: DRVN, competitor,
  marketing, claim, trademark, rebrand, store listing, Play Billing, citation,
  overspeed claims, moat, positioning.
---

# Yardsmith — external positioning, claims discipline, and store compliance

Everything in this skill is about how Yardsmith faces the OUTSIDE world:
competitors, public claims, citations, trademarks, and app-store compliance.
Nothing here is about code mechanics.

**When NOT to use this skill:**
- In-app copy STYLE (tone, honesty framing inside the product, coach voice,
  glossary wording) → `yardsmith-docs-and-writing` (and `COACH-PERSONA.md` for
  the AI coach voice).
- The underlying training/nutrition science itself (effect sizes, formulas,
  jargon) → `golf-fitness-domain-reference`.
- The evidence bar for whether a claim is TRUE (adversarial refutation,
  hypothesis discipline) → `yardsmith-research-methodology`. This skill governs
  whether a true claim may be said PUBLICLY and how it must be framed.
- Shipping mechanics for the native apps (build commands, Codemagic, keystores)
  → `yardsmith-run-and-deploy`.
- The full incident chronicle behind rejected directions → `yardsmith-failure-archaeology`.

Docs of record for this territory: `COMPETITIVE-LANDSCAPE.md` (market analysis),
`YARDSMITH-BRAIN.md` §5 (current positioning), §7 (store path), §10 (open
threads), §11 (house rules), `CLUBHEAD-SPEED-REFERENCE.md` §9 + §13 (claims and
citations), `sources/README.md` (ingestion pipeline),
`ANDROID-LAUNCH-STEP-BY-STEP.md` (store listing copy). When they disagree,
BRAIN §10 is newest; see the staleness notes scattered below.

---

## 1. The competitive frame (as of 2026-07-08)

The market splits into **three lanes**, and Yardsmith deliberately sits in none
of them alone (`COMPETITIVE-LANDSCAPE.md:14-26`, `YARDSMITH-BRAIN.md:255-258`):

| Lane | Who | What they do | What they all lack |
|---|---|---|---|
| Swing **coaching** | lesson apps/instructors | teach the swing | fitness + nutrition |
| Swing **measurement** | Sportsbox AI, HackMotion, 18Birdies, launch monitors | 3D/sensor capture — "measure, don't coach" | interpretation, fitness, nutrition |
| **Training** | DRVN, GolfForever, Fitforgolf, JoeyD, TheStack/SuperSpeed | golf fitness programming | nutrition, conversational coaching |

Two field-wide facts worth repeating in any positioning copy
(`COMPETITIVE-LANDSCAPE.md:28-34`): almost nobody does nutrition (the leading
reviews don't even score it as a criterion), and "AI" in this market means
computer-vision swing analysis, not a coach.

### DRVN — the stated primary competitor

Per `YARDSMITH-BRAIN.md:260-265`: DRVN **relaunched Feb 2026** around the
**"Golf Fitness Handicap™"** — a 10-test battery (5 mobility + 5 fitness),
scored to 50, re-tested every 6 weeks — with a program library fronted by
celebrity coaches, weekly leaderboards, a pro shop, and presence in both app
stores. What DRVN still doesn't do: **nutrition, or a conversational coach that
reads the user's own numbers.**

Caution when reading market reviews: the most-cited "best golf fitness apps"
rankings are often published *by* the app that ranks #1 (DRVN's blog). Treat
their five-criteria rubric as a fair scorecard, but it's written to reward its
author and omits nutrition entirely (`COMPETITIVE-LANDSCAPE.md:7-10`).

### The moat (four planks, `YARDSMITH-BRAIN.md:267-271`)

1. **Nutrition + fueling** — a whole pillar the competition skips.
2. **AI coach that reads THIS user's numbers** (macros, log, speed trend) —
   measurement apps admit they output numbers and leave interpretation to the golfer.
3. **Yards-first framing** — Yardsmith leads with driver carry; DRVN leads with
   a fitness score.
4. **Free, offline, no hardware.**

### The two strategic sentences to never lose

Both verbatim-close from `YARDSMITH-BRAIN.md:279-281`:

- **"We don't beat DRVN by copying DRVN's knowledge base."** Win on what they
  don't do. (House rule form at `YARDSMITH-BRAIN.md:459`: "Don't clone DRVN;
  win on nutrition + AI + yards + distribution.")
- **Distribution is the current real gap**: "they're in the stores; we're a
  URL. Shipping the app matters more than more docs." Any time spent on more
  competitive analysis instead of shipping the store builds is time spent on
  the wrong side of this sentence.

### The periodisation criticism — own it, don't cave

Competitor rubrics weight block periodisation heavily. Yardsmith's stance is an
evidence-based divergence: **concurrent training beats block-switching when
volume is equated** (`COMPETITIVE-LANDSCAPE.md:45,97-108`). The response is to
keep the concurrent engine, surface the season phases already prescribed, and
defend in plain language ("we don't make you cycle through blocks because the
research says you don't need to"). Do not "fix" this by adopting block
periodisation to please a reviewer rubric.

### Positioning consequences already decided (don't re-fight)

From the decisions log (`YARDSMITH-BRAIN.md:315-322`; full chronicle in
`yardsmith-failure-archaeology`):
- **"Dyno Day" / a DRVN-style synthetic test battery — REJECTED, don't revive.**
  It drags Yardsmith into DRVN's lane when the real scoreboard is yards. The
  measurability gap was closed instead with **Octane**, built entirely from the
  user's own data. (Note: `COMPETITIVE-LANDSCAPE.md:112-129` still calls this
  the "Yardsmith Score" and marks it "target Phase 2/3" — **stale**; it shipped
  as Octane with six pillars, see BRAIN §2.)
- **Ingesting DRVN's marketing/curriculum PDFs — REJECTED** (see §2 below for why).
- **Macro tracking (barcode/calorie logging) — REJECTED** as commodity; the app
  builds toward distance instead.

Swing-measurement apps are framed as **future partners, not just rivals** —
they generate swing data they can't coach on; Yardsmith is the coaching layer
(`COMPETITIVE-LANDSCAPE.md:80-82`).

---

## 2. The borrow-vs-never-copy rule (with teeth)

The clean line, verbatim from `COMPETITIVE-LANDSCAPE.md:91-92`: **"borrow the
science and the proven UX patterns; never copy a competitor's data, branded
protocol, or written content."** Expanded (`COMPETITIVE-LANDSCAPE.md:68-92`,
`YARDSMITH-BRAIN.md:273-277`):

**BORROW freely (not anyone's IP):**
- Published sports science: overspeed training as a concept, rotational power,
  ground-force, periodisation vocabulary, season phases — principles aren't
  copyrightable, and Yardsmith cites them from primary sources.
- Proven UX patterns: a single composite baseline score (the *idea*),
  baseline-test-then-personalise, weekly speed tracking as the progress signal.
- Competitor evaluation rubrics themselves — usable on Yardsmith's own landing
  page to reframe the comparison onto nutrition + AI.

**NEVER copy or imitate:**
- **Trademarked names**: "Golf Fitness Handicap™", "The DRVN Method™",
  "SuperSpeed" stick weights/rep schemes, or any branded protocol name.
- **Proprietary data/models**: Sportsbox's 3D skeleton, HackMotion's
  wrist-angle datasets — never replicate branded numbers or scrape their data.
- **Competitor copy, exercise libraries, or program text** verbatim — re-derive
  from primary sources.
- **Competitor marketing/curriculum documents as inputs** (the rejected
  DRVN-PDF ingestion).

**The held-facts rationale** (why the rule has teeth, `YARDSMITH-BRAIN.md:275-277`):
Yardsmith **already holds the underlying facts from primary sources** — the
science in a competitor's PDF is the same science already synthesized in
`CLUBHEAD-SPEED-REFERENCE.md` and `NUTRITION-AND-TRAINING-REFERENCE.md`. So
copying offers **nothing to gain and real risk** (IP exposure, and positioning
drift into their lane). When tempted to mirror competitor material, the correct
move is always: find the primary source they built from, cite it directly.

---

## 3. What may be claimed publicly — and the banned claims

This is the single most enforcement-worthy section — and the ONE HOME of the
publication rulings. It applies to store listings, the landing page, social
copy, share cards, README-style public text, and anything the AI coach could
say (the coach's grounding rules mirror this — "no invented numbers",
`COACH-PERSONA.md` hard lines). The underlying scientific status of each claim
(refuted / acute-only / not significant) lives in `golf-fitness-domain-reference`
§2. The banned patterns below are also mechanically enforced by
`.claude/skills/yardsmith-research-frontier/scripts/claims-lint.mjs` — when you
add or change a banned pattern here, update that linter's pattern list in the
same change.

### Allowed, with mandatory framing

| Claim | Framing requirement | Source |
|---|---|---|
| **~4% clubhead speed from combined (resistance + golf-specific) training** (~4.1%; for a ~93 mph amateur ≈ +3–4 mph ≈ +8–12 yards) | Always "**typical, not promised**" — it's the honest ceiling of a well-built multi-week program | Uthoff, Sommerfield & Pichardo 2021, *J Strength Cond Res*, 20-study systematic review; `CLUBHEAD-SPEED-REFERENCE.md:275-287,325-326` |
| ~1.6% CHS from general strength training alone | Same independent-source framing | same review, `CLUBHEAD-SPEED-REFERENCE.md:281` |
| Strength & power are the top physical drivers of CHS; flexibility is not | Cite the meta-analyses (Brennan 2024, Ehlert 2021); details live in `golf-fitness-domain-reference` | `CLUBHEAD-SPEED-REFERENCE.md:440-455` |
| User distance goals | Framed as **missions the app tracks**, never outcomes: "+15 yds is your mission we track", NOT "you will gain 15 yds" | `YARDSMITH-BRAIN.md:454-455` |
| Per-user results | "Prove it per-user, not by claim" — the user's own before/after driver-carry and 7-iron trend is the marketing stat | `CLUBHEAD-SPEED-REFERENCE.md:327-328` |
| Overspeed swings | Only as an honestly-framed **adjunct/primer**: "trains the nervous system to fire faster… results vary" — never a headline or a number | `CLUBHEAD-SPEED-REFERENCE.md:322-324` |

The shipped store-listing copy is the house model of this discipline — note its
"THE HONEST PART" section and "We don't promise a magic number"
(`ANDROID-LAUNCH-STEP-BY-STEP.md:133-141`).

### BANNED — never print, cite, or imply

1. **The "+8.2 mph average" figure (MyGolfSpy tester number).** It was
   specifically fact-checked and **refuted** in the independent review — "do
   not cite it" is written into `CLUBHEAD-SPEED-REFERENCE.md:272-273`.
2. **Any vendor-style "+X mph" promise** ("+5 mph in 6 weeks", "+8 mph"). These
   figures come from vendor/affiliated sources, not independent science
   (`CLUBHEAD-SPEED-REFERENCE.md:268-271,325-326`; house rule
   `YARDSMITH-BRAIN.md:455`).
3. **Any multi-week overspeed-club effect claim.** No independent,
   peer-reviewed, multi-week RCT exists for SuperSpeed **or** The Stack System
   (`CLUBHEAD-SPEED-REFERENCE.md:268-271`; still open per §9.7). The only
   independent golf-specific findings are **acute warm-up** results: +2.6 mph
   in the first set only, with **no ball-speed transfer** (smash factor
   *dropped*, d = −0.82).
4. **Any effect figure without an independent citation.** Every public number
   needs a named independent source and confidence level (§4 below).
5. **Demo/anecdote numbers presented as effects.** On-camera coach demo speeds,
   long-drive figures, single-tester anecdotes are **illustrative, never
   measured effects** (`YARDSMITH-BRAIN.md:243-244`,
   `CLUBHEAD-SPEED-REFERENCE.md:694-697`).

If a proposed public claim doesn't fit the Allowed table, the default is: don't
make it — point at the user's own numbers instead.

---

## 4. Citation standards (how CLUBHEAD-SPEED-REFERENCE does it — copy the pattern)

Any new evidence-bearing public or reference-doc content must match the
standard demonstrated in `CLUBHEAD-SPEED-REFERENCE.md` §9 and §13:

1. **Independent, public, peer-reviewed first.** Never a vendor's compilation
   or a competitor's branded assessment (§13 tail, lines 699-701: "This
   document deliberately uses independent, public references and our own
   framing").
2. **Every quantitative figure carries its source AND a confidence level**
   (stated policy at `CLUBHEAD-SPEED-REFERENCE.md:238-239`). The house scale is
   prose-graded: **HIGH / MEDIUM (often "indirect") / thin-acute / refuted**,
   written into section headers (e.g. "§9.1 HIGH confidence", "§9.4 MEDIUM
   confidence, indirect").
3. **Primary sources with locators**: journal, year, and a PMID/DOI/PMC id
   where one exists (see the §13 list for the format).
4. **Caveats travel with the citation**: sample size, population, and transfer
   limits are stated inline (e.g. "n=16, lower-limb, so whole-body rotational
   transfer is inferred, not measured"; "Small exploratory sample — treat as
   supporting, not definitive").
5. **Numbers that matter get multi-source checks** ("Where a specific number
   mattered… it was checked against multiple public sources").
6. **Superseded work is flagged, not deleted** (e.g. Evans & Tuttle 2015 kept
   only for one point, marked "largely superseded by the 2024 meta-analyses").
7. **Vendor claims may be REPORTED only to debunk or bound them**, clearly
   labeled as vendor/affiliated (that's how §9.2 handles SuperSpeed marketing).
8. **Open questions get their own section** (§9.7) — what the evidence cannot
   yet answer bounds what the app may ever claim.

### The bar a claim must clear before going public

A public claim requires, in order:
1. It survives the evidence bar (one mechanism explaining all observations,
   incl. negatives; adversarial refutation attempted) —
   **`yardsmith-research-methodology` owns this process; run it first.**
2. An independent primary source exists and is cited per the standards above.
3. It is framed per §3 (typical-not-promised; goals as missions; adjuncts as
   adjuncts).
4. It lands in the doc of record (`CLUBHEAD-SPEED-REFERENCE.md` or
   `NUTRITION-AND-TRAINING-REFERENCE.md`) **and**, if the coach should know it,
   `supabase/functions/_shared/knowledge.ts` — routed through
   `yardsmith-change-control` like any other change (knowledge.ts is served
   code; editing it means redeploying the ai-coach function).

---

## 5. The sources/ ingestion pipeline

`sources/` is the drop zone for raw ebook/course/podcast transcripts
(`sources/README.md`). The rules:

- **Everything in `sources/` is git-ignored except the README**
  (`.gitignore:30-31`: `sources/*` + `!sources/README.md`). Raw copyrighted
  text **never** enters the repo or the AI coach.
- Only **original, paraphrased synthesis** — with the source credited in a
  "further reading" list — lands in the tracked files:
  `NUTRITION-AND-TRAINING-REFERENCE.md`, `CLUBHEAD-SPEED-REFERENCE.md`, and
  `supabase/functions/_shared/knowledge.ts` (what the coach actually reads).
- Legal theory stated in the README: facts, principles, protocols and numbers
  aren't copyrightable; **their specific wording is** — extract the *what*,
  rewrite in Yardsmith's voice.
- Drop format: one file per source, plain `.txt`/`.md`, with a
  `TITLE / AUTHOR / TOPIC / NOTES` header block.
- Processing duty: cross-check against existing knowledge files (no
  duplication; flag contradictions for the owner to settle), and **flag
  anything that is a branded/proprietary method** so it's attributed explicitly
  or left out — never pass off someone's named system as Yardsmith's.
- Anything ingested this way still faces §3/§4 before any number from it is
  claimed publicly.

As of 2026-07-08 the folder contains only the README — whether it has ever held
transcripts cannot be shown from the repo (git-ignored by design).

---

## 6. Trademark and rebrand context

Facts (all from `YARDSMITH-BRAIN.md:19-26` header block + §10.1, recorded at
the rebrand commits of Jul 7-8 2026):

- The app launched as **FairwayFuel** (Jun 2026). A live federal trademark
  application for **FAIRWAY FUEL — Ser. No. 99663152, filed 2026-02-20, Class
  32** (golf energy/sports drinks) — plus two other "Fairway Fuel"
  golf-nutrition brands made the name legally risky and SEO-crowded in
  Yardsmith's own concept space.
- **Renamed to Yardsmith BEFORE any app-store presence existed** — explicitly
  chosen as "the cheapest possible moment" to rebrand. Domain cutover to
  **yardsmith.golf** is DONE; fairwayfuel.app 301-redirects (wildcard, at
  Porkbun). Bundle id is **`app.yardsmith`**.
- **OPEN as of 2026-07-08: the YARDSMITH trademark filing in Classes 9/41/42**
  (software / education-training / SaaS). BRAIN §10.1 carries it as the
  "remaining one-liner" of the cutover; nothing in the repo shows it has been
  filed. If asked to do trademark-adjacent work, check this thread first.
- Engineering invariant that falls out of the rebrand (owned by
  `yardsmith-data-and-sync`, restated here only because brand work keeps
  tripping on it): the localStorage profile key stays `"fairwayfuel"` and
  `ff_*` keys keep their names — **a rebrand never renames stored keys**.
- **Known rebrand straggler (open, user-visible):** the on-device share-card
  canvas still draws the split wordmark "Fairway"+"Fuel" in its header
  (`src/js/app/055-share-cards-branded-pngs-generated-on-de.js:19-21`) while
  the footer draws "Yardsmith" (line ~47). Share cards are outward-facing brand
  surface; fixing this is a normal src/ change through
  `yardsmith-change-control`.
- Naming note: "Long Game Labs/Yardsmith" appears once (`YARDSMITH-BRAIN.md:435`)
  as the possible operating-company name under a parked Wyoming holdco plan —
  it is not a product name; don't use it in copy.

---

## 7. Store-facing compliance

### Play Billing caveat (the one that can get the app pulled)

Google requires **Google Play Billing** for in-app digital purchases. Yardsmith
is free at launch, so this is currently moot — but when monetization turns on,
the Android app must either use Play Billing or keep payment **entirely on the
website, outside the app**. **Never sell subscriptions inside the Android app
via Paddle** (`YARDSMITH-BRAIN.md:343-346`,
`ANDROID-LAUNCH-STEP-BY-STEP.md:163-168`). Related detail: when creating the
Paddle account, the category is "Digital products or SaaS" (web checkout), NOT
"Mobile apps" (`GO-LIVE-CHECKLIST.md:48-51`). Monetization prerequisites
(Cloudflare Pages move etc.) live in BRAIN §10.5 / `yardsmith-run-and-deploy`.

### Account deletion (store requirement — BUILT)

Google's Data-safety form asks about in-app deletion; it exists end to end:
Account tab "Delete my account" button
(`src/js/app/080-game-day-round-day-fueling-warm-up-plan.js:477-479`) →
`window.FF.deleteAccount` (`cloud-sync.js:89`) → `delete-account` Edge Function
(service-role deletion + cascade, `supabase/functions/delete-account/`), then a
full local wipe. Declare it truthfully in the Data-safety form
(`ANDROID-LAUNCH-STEP-BY-STEP.md:149-153,169`).

### Store account type: Organization, via the Texas LLC

Current state (as of 2026-07-08, HEAD `f21930a` "Brain: Texas LLC filed; Play
Console account question resolved"):

- **RESOLVED — enroll BOTH stores as an Organization** under the Texas LLC
  (`YARDSMITH-BRAIN.md:423-426`). Benefits: branded seller name, and no
  20-tester/14-day closed-testing gate on Play. **"You can't switch type later"**
  — do not create a Personal account in the meantime.
- Sequence blocked on: Texas SOS confirmation (~2 weeks from Jul 2026 filing
  via Northwest Registered Agent) → EIN → business bank → Form 503 assumed name
  "Yardsmith" ($25) → D-U-N-S → store enrollments (BRAIN status snapshot,
  lines 12-14).
- ⚠️ **Staleness trap:** `YARDSMITH-BRAIN.md:348-354` (§7) still says the
  account-type question is "OPEN … Undecided" and leans Personal. That
  paragraph is superseded by §10.2 and the `f21930a` commit. §10 wins.
- The GitHub org `forgerperformanceco` is the owner's **peptide** company
  (Forger Performance Co), **not** Yardsmith's publisher — never present it as
  the app's brand or seller.

### The app-store listing copy source

**`ANDROID-LAUNCH-STEP-BY-STEP.md` Phase 5 (lines 88-159) is the canonical,
copy-paste store listing**: app name "Yardsmith: Golf Distance" (≤30 chars),
short description (≤80), full description (≤4000, including the "THE HONEST
PART" claims-discipline block and the not-medical-advice disclaimer), graphics
map (`assets/play/play-icon-512.png`, `assets/play/feature-graphic.png`,
`shot-home.png`/`shot-train.png` at repo root), category Health & Fitness,
privacy policy `https://yardsmith.golf/privacy.html`, and the App-content
declarations (data safety: email + bodyweight/workout data, encrypted in
transit, in-app deletion, no third-party sharing/ads; content rating
Everyone/PEGI 3; target audience 18+ to avoid Families-policy requirements).
Any edit to listing copy must re-pass §3 of this skill.

⚠️ One stale line in that doc: Phase 6 step 1 (line 174) says "bump the
service-worker cache in `sw.js`" — superseded by automatic content-hash
busting; ignore it (staleness map lives in `yardsmith-docs-and-writing`).

---

## 8. Quick decision table

| You are about to… | Rule |
|---|---|
| Quote a speed-gain number publicly | Only ~4% combined-training (Uthoff 2021), "typical, not promised". Never +8.2 mph, never any vendor "+X mph". |
| Promise multi-week overspeed results | Don't — no independent RCT exists. Frame overspeed as an adjunct, results vary. |
| Use a competitor's test battery / branded name / program text | Never. Borrow only public science + generic UX patterns; cite primary sources. |
| Build a DRVN-style synthetic assessment | Settled REJECTED ("Dyno Day") — don't revive; Octane from own data is the answer. |
| Write landing/store copy comparing to competitors | Use their rubric to reframe onto nutrition + AI + yards; own the periodisation divergence; never quote their data. |
| Ingest a book/course/podcast | Through `sources/` (git-ignored), original synthesis only, attribution in further-reading, flag branded methods. |
| Add a paid tier to the Android app | Play Billing or web-only payment — never in-app Paddle. |
| Create the Play/App Store account | Organization under the Texas LLC, after SOS + D-U-N-S. Never Personal (irreversible). |
| Rename anything brand-visible | Brand strings yes; stored `ff_*`/`"fairwayfuel"` keys never. Check the share-card wordmark straggler. |

---

## Provenance and maintenance

All facts verified against the repo on **2026-07-08** at HEAD `f21930a`.
Re-verification commands (run from the repo root):

- Competitive frame / borrow-vs-copy: `sed -n '14,92p' COMPETITIVE-LANDSCAPE.md`
  and `sed -n '251,281p' YARDSMITH-BRAIN.md`. DRVN's Feb-2026 relaunch details
  are recorded ONLY in BRAIN §5 (`grep -n 'Relaunched Feb 2026' YARDSMITH-BRAIN.md`)
  — DRVN's live product may have moved since; re-check externally before any
  head-to-head comparison copy.
- Banned/allowed claims: `grep -n '8.2\|do not cite\|typical, not promised' CLUBHEAD-SPEED-REFERENCE.md`
  (expect the refuted figure at ~line 272 and framing at ~line 326).
- Citation standard + confidence levels: `sed -n '231,340p' CLUBHEAD-SPEED-REFERENCE.md`
  and the §13 source list (`sed -n '626,701p'`).
- sources/ pipeline: `cat sources/README.md; grep -n 'sources' .gitignore`.
- Trademark/rebrand: `grep -n '99663152\|Classes 9/41/42' YARDSMITH-BRAIN.md`.
  Whether the YARDSMITH filing has since been submitted, and the FAIRWAY FUEL
  application's status, are **not knowable from the repo** — ask the owner /
  check USPTO TSDR before relying on either.
- Store path status: `git log --oneline -5 -- YARDSMITH-BRAIN.md` and the BRAIN
  status snapshot (lines 8-27). LLC/SOS/D-U-N-S/store-enrollment progress lives
  outside the repo — the snapshot is only as fresh as its last edit.
- Play Billing + listing copy: `sed -n '88,176p' ANDROID-LAUNCH-STEP-BY-STEP.md`;
  Google's policy itself can change — re-check Play policy before monetizing.
- Account deletion wiring: `grep -n 'deleteAccount' cloud-sync.js` (expect ~line 89),
  `grep -n 'Delete my account' src/js/app/080-*.js`, `ls supabase/functions/`.
- Share-card wordmark straggler: `grep -n '"Fairway"' src/js/app/055-*.js` —
  if this returns nothing, the straggler has been fixed; delete that bullet.
- Line numbers cited throughout drift as docs are edited; prefer the grep
  patterns above over absolute line refs when re-verifying.
