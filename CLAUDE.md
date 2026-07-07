# Yardsmith — repo guide

Vanilla-JS PWA (no framework, no npm build for the site itself), served as-is
from the repo root by GitHub Pages at fairwayfuel.app.

## Where to edit (the one rule that matters)

**Edit `src/` — never the generated files at the repo root.**

`index.html`, `app.js`, `styles.css`, and `sw.js` in the repo root are BUILD
OUTPUTS (each carries a `GENERATED` header). They are committed so Pages and
Capacitor can serve them with zero build infrastructure, but any hand edit to
them is overwritten by the next build.

| You want to change… | Edit… |
|---|---|
| App behavior / a feature | `src/js/app/*.js` (numbered modules, one per feature area) |
| Code that must run outside the IIFE (SW registration) | `src/js/global/*.js` |
| Styles | `src/css/styles.css` (above the GENERATED-DARK markers) |
| Page markup, meta tags, script tags | `src/index.template.html` |
| Service-worker logic | `src/sw.template.js` |

Then rebuild:

```
node scripts/build.mjs            # once
node scripts/build.mjs --watch    # rebuild on every src/ change
```

The build concatenates `src/js/app/*.js` (sorted by filename) into a single
IIFE — the modules share one scope, exactly like the old monolith, so
function declarations in any module are visible to all others. `src/js/global/*.js`
is appended after the IIFE. `{{V}}` placeholders in the templates become a
10-char content hash, so **cache busting is automatic**: no manual
`yardsmith-vNNN` service-worker bumps, no `?v=` pin edits for app.js/styles.css.
(cloud-sync.js and coach.js keep their manual `?v=` pins in
`src/index.template.html` + `src/sw.template.js` — bump those when editing them.)

## Dark theme

The dark theme is GENERATED into `src/css/styles.css` between the
`GENERATED-DARK` markers. After any CSS change:

```
python3 scripts/gen-dark-theme.py && node scripts/build.mjs
```

Hand-pinned dark overrides live in the `CORE` list inside
`scripts/gen-dark-theme.py` — edit there, not in the CSS block.

## Deploy

Merging to `main` triggers `.github/workflows/deploy.yml`, which rsync-stages
the repo root (minus src/, scripts/, docs, native projects) and publishes to
GitHub Pages. There is no build step in CI — **the committed build outputs are
what ships**, so always rebuild and commit them together with your src/ change.

Native shells: `node scripts/build-www.mjs` gathers the served files into
`www/` for Capacitor (`npx cap sync`).

## Testing

Playwright harness lives in the session scratchpad (see DESIGN-CHANGES.md for
patterns). Tests spin up a local `http.Server` over the repo root and drive the
BUILT output — rebuild before testing. `playwright-core` is a devDependency;
Chromium is pre-installed at `/opt/pw-browsers/`.

## Data

All state is localStorage `ff_*` keys; `lsGet`/`lsSet` (in
`src/js/app/020-persistence…`) dispatch `ff-data-changed`, which
`cloud-sync.js` listens to for Supabase blob sync. Adding a new `ff_*` key that
should roam? Add it to `KEYS` in `cloud-sync.js` and bump its `?v=` pin.
