# Source transcripts — drop zone (INPUT ONLY)

This folder is where raw ebook / course / podcast transcripts go so Claude can
read them and synthesize **original** educational content into the app's
knowledge files.

## ⚠️ Important: nothing in here is committed except this README

Everything in `sources/` is git-ignored. Raw copyrighted text **never** enters
the repo or the AI coach. Only original, paraphrased synthesis — with the source
credited in a "further reading" list — lands in the tracked files:

- `NUTRITION-AND-TRAINING-REFERENCE.md`
- `CLUBHEAD-SPEED-REFERENCE.md`
- `supabase/functions/_shared/knowledge.ts`  ← what the coach actually reads

Facts, principles, protocols and numbers aren't copyrightable; their specific
wording is. So we extract the *what* and rewrite it in Yardsmith's own voice.

## How to drop a source

One file per book/course. Plain `.txt` or `.md`. Name it clearly, e.g.
`speed-training-joe-author.txt`. Put a short header at the top:

```
TITLE: <book/course title>
AUTHOR: <author>
TOPIC: <nutrition | clubhead-speed | strength | recovery | mobility | mindset>
NOTES: <anything you want emphasized, or chapters to skip>
---
<paste the transcript below>
```

The header lets me route the content to the right knowledge section and cite it
correctly. Topic tags don't have to be exact — a rough label is plenty.

## Then tell me

Just say "new sources are in `sources/`" (or list the filenames). I'll:
1. Read each one and pull out the principles, protocols, and numbers.
2. Cross-check against what's already in the knowledge files (no duplication,
   flag any contradictions for you to settle).
3. Write original synthesis into the right `.md` file **and** `knowledge.ts`.
4. Add the source to a "Further reading / sources" list for attribution.
5. Flag anything that's a *branded/proprietary method* so we attribute it
   explicitly or leave it out — we don't pass off someone's named system as ours.

## Other ways to hand me material (if the folder is inconvenient)

- **Paste in chat** — fine for short excerpts (a few paragraphs).
- **Scratchpad** — drop files in the session scratchpad and point me at them.
- **A throwaway branch** — push transcripts to a branch you don't merge; I read,
  synthesize to `main`, and the branch with raw text is never merged.

The `sources/` folder is the cleanest because it keeps raw text reliably out of
every commit while staying easy to point me at.
