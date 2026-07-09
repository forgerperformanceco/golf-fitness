# Yardsmith skill library — index and authoring contract

Written 2026-07-09 (library authored 2026-07-08 at HEAD `f21930a`). This file
is the entry point for the 16 skills in this directory and the durable copy of
the ownership map they were authored against. Audience: a zero-context
mid-level engineer, or a Sonnet-class AI session, and the owner driving them.

Safe to keep in the repo: `*.md` under `.claude/` is excluded from the GitHub
Pages publish by deploy.yml's rsync deny-list (publication semantics →
`yardsmith-change-control` §1).

## Start here — the four routes

- **Something is broken / a device or user reports a symptom** →
  `yardsmith-debugging-playbook` first (it routes onward per symptom).
- **About to change code** → `yardsmith-architecture-contract` (where things
  live, invariants), then `yardsmith-change-control` before any
  commit/push/merge. Data or `ff_*` keys involved → `yardsmith-data-and-sync`.
  Build/env questions → `yardsmith-build-and-env`; serving/deploying →
  `yardsmith-run-and-deploy`.
- **About to claim something is "verified" / "tested" / "done"** →
  `yardsmith-validation-and-qa` (what to assert) +
  `yardsmith-playwright-harness` (how to drive the app).
- **Research, evidence, or public claims** → `golf-fitness-domain-reference`
  (the science) · `yardsmith-external-positioning` (what may be published) ·
  `yardsmith-research-methodology` (the evidence bar) ·
  `yardsmith-research-frontier` (open problems) ·
  `yardsmith-proof-and-analysis-toolkit` (proof recipes) ·
  `yardsmith-speed-day-campaign` (the executable speed-day campaign).

## Ownership map — ONE HOME PER FACT

Cross-reference a sibling skill by exact directory name when you need a fact
that lives elsewhere; never restate its details. This table is the contract —
future edits that duplicate a fact across skills are how the library rots.

| Skill dir | Owns |
|---|---|
| `yardsmith-change-control` | Change classification; release-discipline checklist; every non-negotiable rule WITH rationale and its historical incident; parallel-session/git protocol; merge evidence bar; doc-of-record duty; what a diff triggers in CI incl. publication semantics of the Pages deny-list (§1) |
| `yardsmith-debugging-playbook` | Symptom→triage table; discriminating experiments; the time-burning traps; first-question discipline (FF_BUILD before assuming a code bug) |
| `yardsmith-failure-archaeology` | The incident chronicle (symptom→root cause→evidence→status); settled battles + don't-revive list; branch graveyard; shallow-clone caveat for archaeology |
| `yardsmith-architecture-contract` | IIFE concatenation contract; module map + cross-module symbols; render model; **service-worker strategy (the canonical mechanism description, §5)**; Octane engine location; load-bearing invariants; known weak points |
| `yardsmith-data-and-sync` | localStorage key catalog; lsGet/lsSet contract + events; tombstones; migrations; add-a-new-ff_*-key checklist; Supabase schema/RLS/CAS; push_subs/leaderboard |
| `golf-fitness-domain-reference` | Domain theory as applied here: thesis, Brennan 2024 effect sizes, scientific status of contested claims (§2 — publication rulings live in external-positioning), wave-periodization params, e1RM/Epley, macro math, speed-test rationale, Octane pillar formulas, glossary |
| `yardsmith-build-and-env` | Fresh clone → working env; shallow-clone trap; tool-version facts; build.mjs mechanics; {{V}} hashing; manual ?v= pin mechanics (§4: which lines, current values, the cf590f5 story's mechanics); dark-theme pipeline; build-www/Capacitor |
| `yardsmith-run-and-deploy` | Serving locally; deploy.yml/deploy-functions.yml anatomy; what publishes where; post-deploy verification; operator playbook for stale devices; native ship paths; secrets inventory; Supabase ops runbooks |
| `yardsmith-playwright-harness` | The verified harness recipe; all harness gotchas; ships `scripts/serve.mjs`, `scripts/smoke.mjs`, `scripts/seeds.mjs`. HOW to test — WHAT to assert is validation-and-qa |
| `yardsmith-validation-and-qa` | What counts as evidence; acceptance thresholds; the "Verified" paragraph convention; golden checks; ships the audit pack (`audit-train/scroll/type/contrast.mjs`) |
| `yardsmith-docs-and-writing` | Docs of record + precedence; DESIGN-CHANGES template; BRAIN discipline; staleness map; house copy style |
| `yardsmith-external-positioning` | Competitive rules; **the allowed/banned public-claims rulings and framing (§3 — the one home)**; citation standards; sources/ pipeline; rebrand/trademark; store compliance |
| `yardsmith-speed-day-campaign` | The executable Speed & Power pressure-test campaign: phases, gates, solution menu, fenced wrong paths, promotion protocol |
| `yardsmith-proof-and-analysis-toolkit` | First-principles proof recipes with worked repo examples; ships `wave-cases.mjs`, `sync-proof.mjs`, `profile-ui.mjs` |
| `yardsmith-research-frontier` | Open problems vs SOTA; per-problem assets, first steps, falsifiable milestones; ships `frontier-extract.mjs` and `claims-lint.mjs` (the mechanical banned-claims check) |
| `yardsmith-research-methodology` | The evidence bar; pre-registration discipline; the idea lifecycle (open thread → experiment → Verified → adopted/retired); historical idea wells |

## Authoring rules (every future edit, non-negotiable)

1. **One home per fact.** Before adding a fact, find its owner in the table
   above; if it lives elsewhere, cross-reference by exact directory name.
2. **Ground truth only.** Verify every command, path, line reference, and
   claim against the repo before stating it. Run every read-only command you
   tell the reader to run.
3. **Date-stamp volatile facts** ("as of YYYY-MM-DD") and end every SKILL.md
   with a "Provenance and maintenance" section carrying one-line
   re-verification commands for anything that may drift.
4. **No oversell.** Unproven things stay labeled open/candidate. Nothing may
   contradict CLAUDE.md, YARDSMITH-BRAIN.md §11, or the decisions log; no
   skill may route around `yardsmith-change-control`.
5. **Shipped scripts must have been RUN GREEN before shipping**, and re-run
   green after any edit to them.
6. Frontmatter: `name:` (the dir name) and a trigger-rich `description:`
   stating exactly when to load the skill; each skill also states when NOT
   to use it and which sibling to use instead.
