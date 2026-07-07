# 🚀 Yardsmith Launch Guide

Everything you need to get Yardsmith in front of your friends — from "it's already
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
- ✅ **Magic-link login + cloud sync is built in** — a "☁ Sign in to save" button is already
  in the app. It's **dormant until you paste two Supabase keys** (5-min setup, §3). Once on,
  friends log in with just their email and their calculator + full 20-week workout log sync
  across all their devices.
- ⬜ **Custom domain** — ~$12/yr. Steps in §2. (You said yes — go for it.)

**The two things left for you** are both quick: buy a domain (§2) and create a free Supabase
project to flip on logins (§3). Everything else is done and tested.

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
   latest "Deploy Yardsmith to GitHub Pages" workflow under the **Actions** tab).

**To check a deploy:** repo → **Actions** tab → newest run should have a green ✔. The run's
summary shows the published URL.

> Want it served from `main` instead of the feature branch for the "official" launch? Merge
> the branch into `main`, then edit `.github/workflows/deploy.yml` and change the branch
> under `on: push: branches:` to `main`. Everything else stays the same.

---

## 2. Custom domain (optional, ~$12/year)

A domain like **yardsmith.golf** or **fairwayfuel.golf** makes it feel real. ~20 minutes,
mostly waiting on DNS.

### Step 1 — Buy the domain
Use any registrar — **Cloudflare** (cheapest, at-cost), **Namecheap**, or **Porkbun** are
all good. Search for the name you want and check out. `.app` and `.com` are safe bets;
`.app` forces HTTPS (fine — GitHub Pages does HTTPS anyway).

### Step 2 — Point DNS at GitHub Pages
In your registrar's **DNS settings**, add these records.

**For an apex domain (`yardsmith.golf`):** add four `A` records, all host `@`:
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
1. Repo → **Settings** → **Pages** → **Custom domain** → type `yardsmith.golf` → **Save**.
   (GitHub adds a `CNAME` file to your repo automatically — leave it there.)
2. Wait for the green **"DNS check successful"** (minutes to a few hours).
3. Tick **Enforce HTTPS** once it's available.

That's it — `https://yardsmith.golf` now serves the app. The `start_url`/`scope` in
`manifest.webmanifest` are relative, so the installable app and share links keep working on
the new domain with no changes.

---

## 3. Logins & cloud sync — already built, just add your keys

Magic-link login and cloud progress sync are **fully built into the app and tested**. There's
a **"☁ Sign in to save"** button in the top-right corner. It stays dormant until you add two
Supabase keys — so the live site looks and works exactly as now until you flip it on.

**What it does once enabled:** a friend taps the button, types their email, and gets a one-tap
login link (no password). After they log in, their calculator settings **and** their entire
20-week workout log sync to the cloud and follow them to any device. First login on a device
seeds the cloud from whatever's already saved there, so nobody loses progress.

### Turn it on (≈5 minutes)

1. **Create a free project** at [supabase.com](https://supabase.com) → **New project** → pick a
   name + strong DB password → wait ~2 min.
2. **Enable email login** — **Authentication → Providers → Email** → make sure it's on. (Magic
   links work out of the box; no extra config.)
3. **Create the table** — **SQL Editor → New query** → paste and **Run**:
   ```sql
   create table profiles (
     id uuid references auth.users on delete cascade primary key,
     data jsonb,
     updated_at timestamptz default now()
   );
   alter table profiles enable row level security;
   create policy "own row" on profiles
     for all using (auth.uid() = id) with check (auth.uid() = id);
   ```
   (That row-level-security policy means each person can only ever touch **their own** data.)
4. **Paste your keys** — **Settings → API**, copy the **Project URL** and **anon public** key,
   then open **`cloud-sync.js`** in this repo and fill in the top two lines:
   ```js
   var SUPABASE_URL  = "https://YOUR-PROJECT.supabase.co";
   var SUPABASE_ANON = "YOUR-ANON-PUBLIC-KEY";
   ```
   (The anon key is designed to be public/shipped in the browser — that's safe.)
5. **Allow your domain to receive logins** — **Authentication → URL Configuration** → set
   **Site URL** to your live URL (e.g. `https://yardsmith.golf` or the GitHub Pages URL) and
   add it under **Redirect URLs**. This is what makes the magic link return to your site.
6. **Commit & push** `cloud-sync.js` — the button goes live on the next deploy. Test it:
   sign in with your own email, click the link, log a workout, then open the site on your
   phone and sign in — your log is there.

That's the whole thing. If you'd rather not run Supabase at all, there's a no-account
alternative: I can add an **Export / Import** button (downloads a JSON backup you can re-import
on another device). Just ask.

> **Where the code lives:** all the login UI + sync logic is in **`cloud-sync.js`** (loaded at
> the bottom of `index.html`). It's self-contained and a guaranteed no-op until the two keys
> are set, so it can't break the live site before you're ready.

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
