-- ============================================================================
-- FairwayFuel — database schema (Supabase / Postgres)
--
-- Apply in Supabase → SQL Editor, or via the Supabase CLI:
--   supabase db push
--
-- This is idempotent-ish: it uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so
-- it can be re-run as the schema evolves. It supersedes the inline `profiles`
-- snippet from LAUNCH-GUIDE.md by adding the subscription columns Phase 1 needs.
-- ============================================================================

-- ── profiles: one row per authenticated user ────────────────────────────────
-- `data` is the synced localStorage blob (fairwayfuel / ff_week / ff_log / ff_body).
-- The subscription columns are written ONLY by the Paddle webhook (service role).
create table if not exists public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  data                  jsonb       not null default '{}'::jsonb,
  updated_at            timestamptz not null default now(),

  -- Billing / entitlement (Phase 1). Client may READ these; only the
  -- service-role webhook may WRITE them (enforced by RLS below).
  -- Provider-neutral so the payment processor (Paddle today) can change without a migration.
  billing_provider      text,                                   -- e.g. 'paddle'
  billing_customer_id   text,                                   -- the provider's customer id
  billing_subscription_id text,                                 -- the provider's subscription id
  subscription_status   text        not null default 'free',   -- free | trialing | active | past_due | canceled
  plan                  text,                                   -- the provider's price id
  current_period_end    timestamptz,
  trial_ends_at         timestamptz,

  created_at            timestamptz not null default now()
);

comment on table  public.profiles is 'Per-user sync blob + subscription/entitlement state.';
comment on column public.profiles.data is 'Synced app state: fairwayfuel, ff_week, ff_log, ff_body.';
comment on column public.profiles.subscription_status is 'free|trialing|active|past_due|canceled — webhook-written only.';

-- ── Row-level security ───────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- A user can SELECT their own row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- A user can INSERT their own row (first sync) — but NOT pre-set a paid status.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and subscription_status = 'free'      -- can't self-grant a subscription
    and billing_customer_id is null
  );

-- A user can UPDATE their own row, but the billing columns must stay unchanged.
-- (Only the service-role key, which bypasses RLS, may change them — that's the webhook.)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and subscription_status = (select p.subscription_status from public.profiles p where p.id = auth.uid())
    and plan                 is not distinct from (select p.plan                 from public.profiles p where p.id = auth.uid())
    and billing_customer_id  is not distinct from (select p.billing_customer_id  from public.profiles p where p.id = auth.uid())
    and current_period_end   is not distinct from (select p.current_period_end   from public.profiles p where p.id = auth.uid())
  );

-- Note: the service-role key (used by the paddle-webhook Edge Function) bypasses
-- RLS entirely, so it can write the billing columns. The browser cannot.

-- ── Keep updated_at fresh on write ───────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ── Auto-create a profile row when a user signs up ───────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper the client/Edge Function can call to check entitlement.
create or replace function public.is_subscribed(uid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and (
        subscription_status in ('active', 'trialing')
        or (trial_ends_at is not null and trial_ends_at > now())
      )
  );
$$;

-- ============================================================================
-- Leaderboard — opt-in, public, normalized golf-relevant boards.
--
-- One row per user who chooses to compete. Stores a self-chosen HANDLE (never
-- the email) plus the metrics the app already computes: FairwayFuel Score,
-- 7-iron clubhead speed, weekly streak, total sessions, and goal/division.
-- Anyone (even signed-out) may READ opted-in rows; a user may only write their
-- own row. No private data is exposed.
-- ============================================================================
create table if not exists public.leaderboard (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  handle      text not null,
  opted_in    boolean not null default true,
  score       int,                 -- FairwayFuel Score (0–100)
  speed       numeric,             -- latest 7-iron clubhead speed (mph)
  speed_gain  numeric,             -- % gain since baseline
  streak      int,                 -- consecutive active weeks
  sessions    int,                 -- total workouts logged
  goal        text,                -- division: leanbulk | bulk | maintain | cut
  updated_at  timestamptz not null default now()
);

-- Weekly board: sessions completed in the current calendar week (client-computed,
-- stamped with that week's Monday so stale rows rank as zero the following week).
alter table public.leaderboard add column if not exists week_sessions int;
alter table public.leaderboard add column if not exists week_start date;

alter table public.leaderboard enable row level security;

-- Public read — but only of rows the user has opted into showing.
drop policy if exists "leaderboard_read_optedin" on public.leaderboard;
create policy "leaderboard_read_optedin"
  on public.leaderboard for select
  using (opted_in = true);

-- A user may insert/update/delete only their own row.
drop policy if exists "leaderboard_insert_own" on public.leaderboard;
create policy "leaderboard_insert_own"
  on public.leaderboard for insert
  with check (auth.uid() = user_id);

drop policy if exists "leaderboard_update_own" on public.leaderboard;
create policy "leaderboard_update_own"
  on public.leaderboard for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "leaderboard_delete_own" on public.leaderboard;
create policy "leaderboard_delete_own"
  on public.leaderboard for delete
  using (auth.uid() = user_id);

create index if not exists leaderboard_score_idx  on public.leaderboard (score  desc) where opted_in;
create index if not exists leaderboard_speed_idx  on public.leaderboard (speed  desc) where opted_in;
create index if not exists leaderboard_streak_idx on public.leaderboard (streak desc) where opted_in;
create index if not exists leaderboard_week_idx   on public.leaderboard (week_sessions desc) where opted_in;

-- Table-level privileges (RLS still governs which rows each role can touch).
-- Explicit so reads/writes work regardless of project default-privilege config.
grant select on public.leaderboard to anon, authenticated;
grant insert, update, delete on public.leaderboard to authenticated;

-- ============================================================================
-- Phase 3 (deep repositories) — normalized tables, scaffolded for later.
-- Left commented until we migrate off the single `data` blob.
-- ============================================================================
-- create table if not exists public.workout_logs (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid not null references auth.users(id) on delete cascade,
--   logged_at timestamptz not null default now(),
--   week int, day text, exercise text, set_no int, reps int, weight numeric
-- );
-- create table if not exists public.speed_tests (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid not null references auth.users(id) on delete cascade,
--   tested_at timestamptz not null default now(), club text, mph numeric
-- );
-- create table if not exists public.body_metrics (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid not null references auth.users(id) on delete cascade,
--   measured_at timestamptz not null default now(), weight_lb numeric
-- );
-- (RLS "own row" policies would mirror profiles.)

-- ============================================================================
-- push_subs: one row per browser push subscription (web push reminders).
-- The client (cloud-sync.js FF.pushSave) upserts its own subscription plus a
-- 7-day, day-aware message schedule; the push-daily Edge Function (service
-- role, hourly via pg_cron) sends whatever `week` says for today at `hour`
-- local time in `tz`, falling back to a re-engagement nudge when the schedule
-- has gone stale (user hasn't opened the app in over a week).
-- ============================================================================
create table if not exists public.push_subs (
  endpoint    text primary key,                                        -- push-service URL, unique per browser
  user_id     uuid not null references auth.users (id) on delete cascade,
  p256dh      text not null,                                           -- client public key (RFC 8291)
  auth        text not null,                                           -- client auth secret
  tz          text not null default 'UTC',                             -- IANA zone, e.g. America/Chicago
  hour        int  not null default 17 check (hour between 0 and 23),  -- local send hour = training slot
  week        jsonb not null default '[]'::jsonb,                      -- [{d:'YYYY-MM-DD', title, body}, ...]
  last_sent   date,                                                    -- dedupe: one nudge per local day
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.push_subs is 'Web-push subscriptions + 7-day message schedule, refreshed on every app open.';

alter table public.push_subs enable row level security;

drop policy if exists "push_subs_select_own" on public.push_subs;
create policy "push_subs_select_own"
  on public.push_subs for select
  using (auth.uid() = user_id);

drop policy if exists "push_subs_insert_own" on public.push_subs;
create policy "push_subs_insert_own"
  on public.push_subs for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_subs_update_own" on public.push_subs;
create policy "push_subs_update_own"
  on public.push_subs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_subs_delete_own" on public.push_subs;
create policy "push_subs_delete_own"
  on public.push_subs for delete
  using (auth.uid() = user_id);

drop trigger if exists push_subs_touch on public.push_subs;
create trigger push_subs_touch
  before update on public.push_subs
  for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.push_subs to authenticated;

-- Hourly trigger for the sender. Requires the pg_cron + pg_net extensions
-- (Dashboard → Database → Extensions → enable both), then run — with the two
-- placeholders filled in (the anon key is the same public one in cloud-sync.js;
-- the cron secret is whatever you set as the PUSH_CRON_SECRET function secret):
--
--   select cron.schedule('ff-push-hourly', '5 * * * *', $cron$
--     select net.http_post(
--       url     := 'https://tbwmckmyzoxzhpqlomsp.supabase.co/functions/v1/push-daily',
--       headers := jsonb_build_object(
--         'Content-Type',  'application/json',
--         'Authorization', 'Bearer <ANON_KEY>',
--         'x-cron-secret', '<PUSH_CRON_SECRET>'),
--       body := '{}'::jsonb);
--   $cron$);
--
-- (kept commented so `supabase db push` never fails on projects without pg_cron)
