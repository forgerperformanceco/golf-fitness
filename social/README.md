# Yardsmith — Social kit

Brand assets for Instagram / TikTok / X, plus the generator that renders them.

## Brand lines
- **Hook:** Turn muscle into distance.
- **Subtitle:** The Golfer's Mass & Speed System
- **Punchy:** Eat. Lift. Bomb.

## Profile setup
- **Handle (grab first available):** @fairwayfuel → @fairwayfuelapp → @fairwayfuel.app → @getfairwayfuel → @eatliftbomb
- **Name field:** Yardsmith · Golf Strength & Distance
- **Bio:** Turn muscle into distance ⛳💪 / Macro engine + 20-wk speed plan + AI coach for golfers who lift. / Eat. Lift. Bomb. 👇
- **Link:** fairwayfuel.app
- **Account type:** Business/Creator · Category: App Page or Health/Wellness
- **Profile picture:** `profile.png`

## Assets (1080×1080)
- `profile.png` — logo mark, circle-crop safe
- `post-hero.png` — "Turn muscle into distance" (pin this)
- `post-bomb.png` — "Eat. Lift. Bomb."
- `post-thesis.png` — "Flexibility won't add 20 yards. Power will." (most shareable)
- `post-stat.png` — "+1 mph ≈ +2 yards of carry"

These are also served at `https://fairwayfuel.app/social/<file>.png` (public URLs — handy for the Graph API publisher below).

## Regenerate / add posts
```sh
npm i --no-save playwright-core
node social/generate-posts.js social   # writes the PNGs into ./social
```
Edit the `cards` object in `generate-posts.js` to add/tweak posts. Same dark-green + mint system, logo inlined as a data URI.

## Auto-poster roadmap (when ready)
The generator above is the content half of a posting bot. To publish automatically, the legit path is the **Instagram Graph API – Content Publishing** (requires a Business/Creator account linked to a Facebook Page, a Meta app, and app review for `instagram_content_publish`). Flow per post:
1. Host the image at a public URL (e.g. `fairwayfuel.app/social/...`).
2. `POST /{ig-user-id}/media` with `image_url` + `caption` → returns a creation id.
3. `POST /{ig-user-id}/media_publish` with the creation id.
Rate limit ~25 posts/24h. A scheduler (Buffer/Later/Metricool) is the no-code alternative.
