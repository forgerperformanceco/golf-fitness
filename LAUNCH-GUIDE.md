# 🚀 FairwayFuel Launch Guide

Everything you need to get FairwayFuel in front of your friends — from "it's already
live" to a custom domain and optional logins. Work top to bottom; each section is
self-contained and tells you exactly what to click.

---

## 0. TL;DR — what's already done for you

- ✅ **The app is live right now** on GitHub Pages (see §1 for the URL).
- ✅ **Auto-deploy** — every push to the working branch rebuilds the site in ~1 minute.
- ✅ **Installable app** — friends can "Add to Home Screen" and it opens full-screen,
  works offline, and has a real app icon (PWA — already wired up).
- ✅ **Shareable links** — the "🔗 Copy my plan link" button sends a friend the calculator
  pre-filled with someone's exact numbers.
- ⬜ **Custom domain** — optional, ~$12/yr. Steps in §2.
- ⬜ **Logins / cloud sync** — optional. Today every device remembers its own data
  (localStorage). To sync across devices or add real accounts, see §3.

**Honest recommendation for a friends launch:** you do **not** need logins. The app already
saves everything per-device and tracks all 20 weeks of workouts locally. Ship it as-is, add
a custom domain if you want it to look polished, and only add accounts later if people
actually ask to sync between their phone and laptop.

---

## 1. Your live URL (already working)

The site deploys automatically from the `claude/golf-macro-calculator-j2e9vk` branch via
GitHub Actions. Your URL is:

```
https://pharmerbobby.github.io/Golf-Fitness/
```

**To confirm / find the exact link:**
1. Go to your repo on GitHub → **Settings** → **Pages**.
2. Under "GitHub Pages" it says **"Your site is live at …"** — that's the real URL.
3. If it's not on yet: set **Source = GitHub Actions**, then push any commit (or re-run the
   latest "Deploy FairwayFuel to GitHub Pages" workflow under the **Actions** tab).

**To check a deploy:** repo → **Actions** tab → newest run should have a green ✔. The run's
summary shows the published URL.

> Want it served from `main` instead of the feature branch for the "official" launch? Merge
> the branch into `main`, then edit `.github/workflows/deploy.yml` and change the branch
> under `on: push: branches:` to `main`. Everything else stays the same.

---

## 2. Custom domain (optional, ~$12/year)

A domain like **fairwayfuel.app** or **fairwayfuel.golf** makes it feel real. ~20 minutes,
mostly waiting on DNS.

### Step 1 — Buy the domain
Use any registrar — **Cloudflare** (cheapest, at-cost), **Namecheap**, or **Porkbun** are
all good. Search for the name you want and check out. `.app` and `.com` are safe bets;
`.app` forces HTTPS (fine — GitHub Pages does HTTPS anyway).

### Step 2 — Point DNS at GitHub Pages
In your registrar's **DNS settings**, add these records.

**For an apex domain (`fairwayfuel.app`):** add four `A` records, all host `@`:
```
A   @   185.199.108.153
A   @   185.199.109.153
A   @   185.199.110.153
A   @   185.199.111.153
```
(Optional but recommended — IPv6, four `AAAA` records, host `@`:)
```
AAAA  @  2606:50c0:8000::153
AAAA  @  2606:50c0:8001::153
AAAA  @  2606:50c0:8002::153
AAAA  @  2606:50c0:8003::153
```

**For the `www` subdomain**, add one `CNAME`:
```
CNAME   www   pharmerbobby.github.io.
```

> Using **Cloudflare** for DNS? Set those records to **"DNS only"** (grey cloud), not
> proxied (orange), or GitHub's HTTPS cert won't issue.

### Step 3 — Tell GitHub about the domain
1. Repo → **Settings** → **Pages** → **Custom domain** → type `fairwayfuel.app` → **Save**.
   (GitHub adds a `CNAME` file to your repo automatically — leave it there.)
2. Wait for the green **"DNS check successful"** (minutes to a few hours).
3. Tick **Enforce HTTPS** once it's available.

That's it — `https://fairwayfuel.app` now serves the app. The `start_url`/`scope` in
`manifest.webmanifest` are relative, so the installable app and share links keep working on
the new domain with no changes.

---

## 3. Logins & cloud sync (optional)

### What you have today
All data — calculator inputs, equipment, current week, and every logged set/rep/weight — is
saved in the browser's **localStorage**. It survives refreshes and closing the app, but it's
**per-device**: your phone and your laptop each keep their own copy, and clearing browser
data wipes it. For a personal training app used by a friend group, this is genuinely fine.

### When to add real accounts
Add auth + cloud sync only if friends want to:
- See the **same workout history** on phone *and* laptop, or
- Compare numbers with each other, or
- Never lose data if they clear their browser.

### The recommended path: Supabase (free tier is plenty)
[Supabase](https://supabase.com) gives you hosted Postgres + email/Google logins + a tiny JS
client you drop into the page. No backend server to run. Free tier easily covers a friend
group.

**Exact steps to enable it:**

1. **Create the project** — sign in at supabase.com → **New project** → pick a name and a
   strong DB password → wait ~2 min for it to spin up.
2. **Grab your keys** — Project → **Settings → API**. Copy the **Project URL** and the
   **anon public** key (the anon key is safe to ship in client-side code).
3. **Turn on logins** — **Authentication → Providers** → enable **Email** (magic links are
   easiest — no passwords). Optionally enable **Google** for one-tap sign-in.
4. **Make a table** — **SQL Editor** → run:
   ```sql
   create table profiles (
     id uuid references auth.users on delete cascade primary key,
     data jsonb,                       -- the whole app state blob
     updated_at timestamptz default now()
   );
   alter table profiles enable row level security;
   create policy "own row" on profiles
     for all using (auth.uid() = id) with check (auth.uid() = id);
   ```
   That row-level-security policy means each person can only ever read/write their **own**
   data.
5. **Wire it into the app** — a drop-in scaffold is provided below as
   [`cloud-sync.js`](#dropin-cloud-syncjs). Add your URL + anon key at the top, include it
   from `index.html`, and it will mirror localStorage up to Supabase on save and pull it back
   down on login. (It's written to be optional — if you never add the keys, the app behaves
   exactly as it does now.)

> **Simpler alternative — no logins at all:** keep localStorage and just add an **Export /
> Import** button (downloads a JSON backup, re-imports on another device). It's a fraction of
> the work and covers "I don't want to lose my log." Say the word and I'll add it.

### <a name="dropin-cloud-syncjs"></a>Drop-in scaffold: `cloud-sync.js`
This file is **not active yet** — it's here so the wiring is ready when you want it. To turn
it on: fill in the two constants, save it as `cloud-sync.js` in the repo root, and add
`<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>` then
`<script src="cloud-sync.js"></script>` right before `</body>` in `index.html`.

```js
// cloud-sync.js — optional Supabase sync for FairwayFuel.
// Leave SUPABASE_URL empty to disable (app falls back to local-only, no errors).
const SUPABASE_URL = "";            // e.g. https://abcd.supabase.co
const SUPABASE_ANON = "";           // your anon public key
const KEYS = ["fairwayfuel", "ff_week", "ff_log", "ff_body"];  // everything the app stores

if (SUPABASE_URL && window.supabase) {
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  // Pull cloud data down after login, then keep local in sync on every change.
  async function pull(user) {
    const { data } = await sb.from("profiles").select("data").eq("id", user.id).single();
    if (data && data.data) {
      Object.entries(data.data).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
      location.reload();   // re-render with the synced data
    }
  }
  async function push(user) {
    const blob = {};
    KEYS.forEach(k => { try { blob[k] = JSON.parse(localStorage.getItem(k)); } catch (e) {} });
    await sb.from("profiles").upsert({ id: user.id, data: blob, updated_at: new Date().toISOString() });
  }

  // Mirror localStorage writes up to the cloud (debounced).
  let t, currentUser = null;
  const _set = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (k, v) {
    _set(k, v);
    if (currentUser && KEYS.includes(k)) { clearTimeout(t); t = setTimeout(() => push(currentUser), 800); }
  };

  sb.auth.onAuthStateChange((_e, session) => {
    currentUser = session && session.user;
    if (currentUser) pull(currentUser);
  });

  // Minimal sign-in UI: a magic-link prompt. Replace with a nicer button when ready.
  window.ffSignIn = async () => {
    const email = prompt("Email for your FairwayFuel login (magic link):");
    if (email) { await sb.auth.signInWithOtp({ email }); alert("Check your email for the login link."); }
  };
  window.ffSignOut = () => sb.auth.signOut().then(() => location.reload());
}
```

When you're ready to actually flip this on, tell me and I'll add the sign-in/out button to
the header and test the full round-trip.

---

## 4. Shipping updates after launch

1. Make changes (or ask me to).
2. Commit and push to the working branch.
3. GitHub Actions redeploys in ~1 minute — refresh the site.

**Note on the installable app + caching:** the service worker (`sw.js`) caches files so the
app works offline. When you ship a meaningful change, bump the `CACHE` version string at the
top of `sw.js` (e.g. `fairwayfuel-v3` → `v4`). That guarantees installed users pull the new
version instead of a stale cached one. (I'll do this automatically whenever I ship changes.)

---

## 5. Pre-launch checklist

- [ ] Confirm the live URL loads (§1) on your phone and a friend's.
- [ ] On iPhone Safari: **Share → Add to Home Screen** → it opens full-screen with the icon.
- [ ] On Android Chrome: the **Install app** prompt appears.
- [ ] Fill the calculator, hit **🔗 Copy my plan link**, open it in a private tab → numbers
      pre-fill.
- [ ] Log a workout, refresh → it's still there.
- [ ] (If buying a domain) DNS check is green and **Enforce HTTPS** is ticked (§2).
- [ ] Send the link to the group. 🏌️

---

*Questions while you set this up — the domain DNS, the Supabase project, an Export/Import
button instead of logins — just ask and I'll walk you through or do it.*
