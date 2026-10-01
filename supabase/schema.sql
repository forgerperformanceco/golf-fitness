-- ============================================================================
-- Yardsmith — database schema (Supabase / Postgres)
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
-- The subscription columns are written ONLY by billing webhooks (service role):
-- a summary of the user's best row in private.billing_subscriptions.
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
  subscription_status   text        not null default 'free',   -- free | trialing | active | past_due | paused | canceled
  plan                  text,                                   -- the provider's price id
  current_period_end    timestamptz,
  trial_ends_at         timestamptz,

  created_at            timestamptz not null default now()
);

comment on table  public.profiles is 'Per-user sync blob + subscription/entitlement state.';
comment on column public.profiles.data is 'Synced app state: fairwayfuel, ff_week, ff_log, ff_body.';
comment on column public.profiles.subscription_status is
  'free|trialing|active|past_due|paused|canceled — written only by billing webhooks (summary of private.billing_subscriptions). Pro = active|trialing|past_due.';

-- ── Sync integrity: optimistic-concurrency revision counter ──────────────────
-- Every client push is a compare-and-swap: UPDATE ... SET rev = :seen + 1
-- WHERE id = :uid AND rev = :seen. Zero rows updated = another device moved the
-- cloud first → the client pulls, merges, and retries. This is what stops two
-- open devices from silently overwriting each other's blobs between logins.
-- (Clients built before this column fall back to the old blind upsert until
-- this schema is applied — the app keeps working either way.)
alter table public.profiles add column if not exists rev bigint not null default 0;
alter table public.profiles add column if not exists billing_event_at timestamptz;
comment on column public.profiles.rev is 'Blob revision — compare-and-swap guard for client pushes.';

-- ── Row-level security ───────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- A user can SELECT their own row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- A user can INSERT their own row (first sync) — but NOT pre-set a paid status.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (
    (select auth.uid()) = id
    and subscription_status = 'free'      -- can't self-grant a subscription
    and billing_provider is null
    and billing_customer_id is null
    and billing_subscription_id is null
    and plan is null
    and current_period_end is null
    and trial_ends_at is null
    and billing_event_at is null
  );

-- A user can UPDATE their own row. Column-level grants below limit browser updates
-- to data, rev, and updated_at; billing columns remain service-role-only.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- RLS decides which row; column privileges decide which fields. The browser may
-- sync app state, but every entitlement field is server-only even if a policy is
-- accidentally loosened later.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant insert (id, data, updated_at, rev) on table public.profiles to authenticated;
grant update (data, updated_at, rev) on table public.profiles to authenticated;

-- Note: the service-role key (used by the paddle-webhook Edge Function) bypasses
-- RLS entirely, so it can write the billing columns. The browser cannot.

-- ── Keep updated_at fresh on write ───────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ── Recovery: keep the last 10 blob revisions per user ───────────────────────
-- If a bad merge or client bug ever writes a corrupted blob, it propagates to
-- every device — this table is the undo. The trigger snapshots the PREVIOUS
-- blob on every data change and prunes beyond 10. Restore = copy a row's data
-- back into profiles.data (SQL editor). Clients can read their own history;
-- only the trigger (owner, bypasses RLS) writes it.
create table if not exists public.profiles_history (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references auth.users (id) on delete cascade,
  rev      bigint,
  data     jsonb not null,
  saved_at timestamptz not null default now()
);
create index if not exists profiles_history_user_idx on public.profiles_history (user_id, id desc);
alter table public.profiles_history enable row level security;
drop policy if exists "profiles_history_select_own" on public.profiles_history;
create policy "profiles_history_select_own"
  on public.profiles_history for select
  to authenticated
  using ((select auth.uid()) = user_id);
revoke all on table public.profiles_history from anon, authenticated;
grant select on table public.profiles_history to authenticated;

create or replace function public.snapshot_profile_data()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Throttled to one snapshot per 10 minutes per user: an active workout pushes
  -- a changed blob every ~12s, and snapshotting each one would 10x the write
  -- volume for zero recovery value ("restore from 12 seconds ago" is useless,
  -- "restore from 10 minutes ago" is the point). The 10 kept snapshots then
  -- span hours of active use instead of two minutes.
  if new.data is distinct from old.data
     and not exists (select 1 from public.profiles_history
                     where user_id = old.id
                       and saved_at > now() - interval '10 minutes') then
    insert into public.profiles_history (user_id, rev, data) values (old.id, old.rev, old.data);
    delete from public.profiles_history
      where user_id = old.id
        and id not in (select id from public.profiles_history
                       where user_id = old.id order by id desc limit 10);
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_snapshot on public.profiles;
create trigger profiles_snapshot
  before update on public.profiles
  for each row execute function public.snapshot_profile_data();

-- ── Size guard: a runaway blob can't wedge sync ──────────────────────────────
-- The blob should live in the tens of KB; 1MB means a client bug (or abuse).
-- Reject it loudly instead of storing it — the client surfaces the error in
-- the Account tab's sync-health line.
create or replace function public.guard_profile_size()
returns trigger language plpgsql set search_path = '' as $$
begin
  if pg_column_size(new.data) > 1048576 then
    raise exception 'sync blob exceeds 1MB — refusing to store';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_size_guard on public.profiles;
create trigger profiles_size_guard
  before insert or update on public.profiles
  for each row execute function public.guard_profile_size();

-- ── Auto-create a profile row when a user signs up ───────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
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

-- Helper the signed-in client can call only for itself. Server code that already
-- has a verified user id should query profiles with its service-role client.
-- Pro = the provider's status: active, trialing, or past_due (the provider is
-- still retrying the card and ends that window itself by canceling/pausing).
-- trial_ends_at never grants access on its own — the provider owns the
-- trialing -> active / past_due / canceled transitions. ai-coach uses the same rule.
drop function if exists public.is_subscribed(uuid);
create or replace function public.is_subscribed()
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and subscription_status in ('active', 'trialing', 'past_due')
  );
$$;
revoke execute on function public.is_subscribed() from public, anon;
grant execute on function public.is_subscribed() to authenticated;

-- Trigger functions are internal implementation details, not public RPCs.
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.guard_profile_size() from public, anon, authenticated;
revoke execute on function public.snapshot_profile_data() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Private operational state. Browser roles have no access to this schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Atomic AI-coach quota: five requests per minute and fifty per UTC day.
create table if not exists private.ai_coach_usage (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  minute_window_start  timestamptz not null default date_trunc('minute', now()),
  minute_count         int not null default 0 check (minute_count >= 0),
  usage_day            date not null default (now() at time zone 'utc')::date,
  day_count            int not null default 0 check (day_count >= 0),
  updated_at           timestamptz not null default now()
);

create or replace function public.consume_ai_coach_quota(p_user_id uuid)
returns table (allowed boolean, retry_after_seconds int, daily_remaining int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_row private.ai_coach_usage%rowtype;
begin
  insert into private.ai_coach_usage (user_id, minute_count, day_count)
  values (p_user_id, 0, 0)
  on conflict (user_id) do nothing;
  select * into v_row from private.ai_coach_usage where user_id = p_user_id for update;

  if v_row.usage_day <> (v_now at time zone 'utc')::date then
    v_row.usage_day := (v_now at time zone 'utc')::date;
    v_row.day_count := 0;
  end if;
  if v_row.minute_window_start <= v_now - interval '1 minute' then
    v_row.minute_window_start := v_now;
    v_row.minute_count := 0;
  end if;

  v_row.minute_count := v_row.minute_count + 1;
  v_row.day_count := v_row.day_count + 1;
  update private.ai_coach_usage
  set minute_window_start = v_row.minute_window_start,
      minute_count = v_row.minute_count,
      usage_day = v_row.usage_day,
      day_count = v_row.day_count,
      updated_at = v_now
  where user_id = p_user_id;

  return query select
    (v_row.minute_count <= 5 and v_row.day_count <= 50),
    case when v_row.minute_count > 5
      then greatest(1, ceil(extract(epoch from (v_row.minute_window_start + interval '1 minute' - v_now)))::int)
      else 0 end,
    greatest(0, 50 - v_row.day_count);
end;
$$;
revoke execute on function public.consume_ai_coach_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_ai_coach_quota(uuid) to service_role;

-- Paddle event ledger and atomic subscription application. Event ids make
-- retries idempotent. Billing state is kept PER SUBSCRIPTION (one row each,
-- each with its own out-of-order guard), and profiles' billing columns are a
-- summary of the user's best subscription — so a late event from an old
-- subscription can never overwrite a newer, paid one.
create table if not exists private.paddle_events (
  event_id     text primary key,
  occurred_at  timestamptz not null,
  processed_at timestamptz not null default now()
);

create table if not exists private.billing_subscriptions (
  provider            text        not null,                 -- 'paddle' (store providers later)
  subscription_id     text        not null,                 -- the provider's subscription id
  user_id             uuid        not null references public.profiles (id) on delete cascade,
  customer_id         text,                                 -- the provider's customer id
  status              text        not null,                 -- trialing | active | past_due | paused | canceled
  plan                text,                                 -- the provider's price id
  current_period_end  timestamptz,
  trial_ends_at       timestamptz,
  event_at            timestamptz not null,                 -- occurred_at of the last applied event
  updated_at          timestamptz not null default now(),
  primary key (provider, subscription_id)
);
create index if not exists billing_subscriptions_user_idx
  on private.billing_subscriptions (user_id);
create index if not exists billing_subscriptions_customer_idx
  on private.billing_subscriptions (provider, customer_id);
alter table private.billing_subscriptions enable row level security;
revoke all on table private.billing_subscriptions from public, anon, authenticated;

-- Seed from rows the old single-subscription function wrote.
insert into private.billing_subscriptions
  (provider, subscription_id, user_id, customer_id, status, plan,
   current_period_end, trial_ends_at, event_at)
select billing_provider, billing_subscription_id, id, billing_customer_id, subscription_status, plan,
       current_period_end, trial_ends_at, coalesce(billing_event_at, updated_at)
from public.profiles
where billing_provider is not null and billing_subscription_id is not null
on conflict (provider, subscription_id) do nothing;

-- Rewrite one user's profiles summary from their best subscription:
-- active, then trialing, then past_due, then the rest; the latest-paid first.
create or replace function private.sync_billing_summary(p_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  b private.billing_subscriptions%rowtype;
begin
  select * into b
  from private.billing_subscriptions s
  where s.user_id = p_user_id
  order by case s.status when 'active' then 0 when 'trialing' then 1 when 'past_due' then 2 else 3 end,
           s.current_period_end desc nulls last,
           s.event_at desc
  limit 1;

  if not found then
    -- Their last subscription moved to another account: back to free. A
    -- hand-set row (billing_provider null) is left alone.
    update public.profiles
    set billing_provider = null, billing_customer_id = null, billing_subscription_id = null,
        subscription_status = 'free', plan = null, current_period_end = null, trial_ends_at = null
    where id = p_user_id and billing_provider is not null;
    return;
  end if;

  update public.profiles
  set billing_provider = b.provider,
      billing_customer_id = b.customer_id,
      billing_subscription_id = b.subscription_id,
      subscription_status = b.status,
      plan = b.plan,
      current_period_end = b.current_period_end,
      trial_ends_at = b.trial_ends_at,
      billing_event_at = (select max(s.event_at) from private.billing_subscriptions s
                          where s.user_id = p_user_id)
  where id = p_user_id;
end;
$$;
revoke execute on function private.sync_billing_summary(uuid) from public, anon, authenticated;

-- Same signature and grants as before, so paddle-webhook needs no change to
-- keep working. Returns 'applied' | 'duplicate' | 'stale' | 'orphaned'.
create or replace function public.apply_paddle_subscription(
  p_event_id text,
  p_occurred_at timestamptz,
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_plan text,
  p_period_end timestamptz,
  p_trial_end timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted int;
  v_written int;
  v_user uuid;
  v_prev uuid;
begin
  if p_subscription_id is null then
    raise exception 'paddle subscription id missing';
  end if;

  insert into private.paddle_events (event_id, occurred_at)
  values (p_event_id, p_occurred_at)
  on conflict (event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return 'duplicate'; end if;

  select s.user_id into v_prev
  from private.billing_subscriptions s
  where s.provider = 'paddle' and s.subscription_id = p_subscription_id;

  if p_user_id is not null then
    select p.id into v_user from public.profiles p where p.id = p_user_id;
    if v_user is null then
      -- The account was deleted: keep the ledger row (a retry reads
      -- 'duplicate') and acknowledge, so Paddle stops retrying.
      if not exists (select 1 from auth.users u where u.id = p_user_id) then
        return 'orphaned';
      end if;
      raise exception 'paddle profile not found';
    end if;
  else
    -- No custom_data: find the user through this subscription or customer.
    -- Raising lets Paddle retry until subscription.created has bound them.
    v_user := v_prev;
    if v_user is null then
      select s.user_id into v_user
      from private.billing_subscriptions s
      where s.provider = 'paddle' and s.customer_id = p_customer_id
      order by s.event_at desc
      limit 1;
    end if;
    if v_user is null then
      select p.id into v_user from public.profiles p
      where p.billing_customer_id = p_customer_id
      limit 1;
    end if;
    if v_user is null then
      raise exception 'paddle profile not found';
    end if;
  end if;

  -- The out-of-order guard is per subscription, not per profile.
  insert into private.billing_subscriptions as s
    (provider, subscription_id, user_id, customer_id, status, plan,
     current_period_end, trial_ends_at, event_at)
  values
    ('paddle', p_subscription_id, v_user, p_customer_id, p_status, p_plan,
     p_period_end, case when p_status in ('canceled', 'paused') then null else p_trial_end end,
     p_occurred_at)
  on conflict (provider, subscription_id) do update
  set user_id = excluded.user_id,
      customer_id = coalesce(excluded.customer_id, s.customer_id),
      status = excluded.status,
      plan = excluded.plan,
      current_period_end = excluded.current_period_end,
      trial_ends_at = excluded.trial_ends_at,
      event_at = excluded.event_at,
      updated_at = now()
  where s.event_at <= excluded.event_at;
  get diagnostics v_written = row_count;
  if v_written = 0 then return 'stale'; end if;

  perform private.sync_billing_summary(v_user);
  if v_prev is not null and v_prev <> v_user then
    perform private.sync_billing_summary(v_prev);   -- the subscription moved accounts
  end if;
  return 'applied';
end;
$$;
revoke execute on function public.apply_paddle_subscription(text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.apply_paddle_subscription(text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz)
  to service_role;

-- Subscriptions that can still bill: what delete-account cancels before it
-- deletes the account. Server-only.
create or replace function public.billing_subscriptions_to_cancel(p_user_id uuid)
returns table (provider text, subscription_id text, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.provider, s.subscription_id, s.status
  from private.billing_subscriptions s
  where s.user_id = p_user_id
    and s.status in ('active', 'trialing', 'past_due', 'paused');
$$;
revoke execute on function public.billing_subscriptions_to_cancel(uuid) from public, anon, authenticated;
grant execute on function public.billing_subscriptions_to_cancel(uuid) to service_role;

-- ============================================================================
-- Leaderboard — opt-in, public, normalized golf-relevant boards.
--
-- One row per user who chooses to compete. Stores a self-chosen HANDLE (never
-- the email) plus the metrics the app already computes: Yardsmith Score,
-- 7-iron clubhead speed, weekly streak, total sessions, and goal/division.
-- Anyone (even signed-out) may READ opted-in rows; a user may only write their
-- own row. No private data is exposed.
-- ============================================================================
create table if not exists public.leaderboard (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  handle      text not null,
  opted_in    boolean not null default true,
  score       int,                 -- Yardsmith Score (0–100)
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
update public.leaderboard set goal = case lower(goal)
  when 'lean bulk' then 'leanbulk'
  when 'bulk' then 'bulk'
  when 'in-season maintain' then 'maintain'
  when 'maintain' then 'maintain'
  when 'lean out' then 'cut'
  when 'cut' then 'cut'
  else goal end
where goal is not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'leaderboard_metrics_valid' and conrelid = 'public.leaderboard'::regclass) then
    alter table public.leaderboard add constraint leaderboard_metrics_valid check (
      (score is null or score between 0 and 100)
      and (speed is null or speed between 20 and 200)
      and (speed_gain is null or speed_gain between -100 and 500)
      and (streak is null or streak >= 0)
      and (sessions is null or sessions >= 0)
      and (week_sessions is null or week_sessions between 0 and 14)
      and (goal is null or goal in ('leanbulk', 'bulk', 'maintain', 'cut'))
    );
  end if;
end $$;

-- Handle hygiene: sane length at the DB level, and no duplicate handles —
-- two users showing as the same name on a public board is an impersonation
-- vector. Wrapped so pre-existing duplicates (if any) don't abort the script;
-- resolve them manually, then re-run.
alter table public.leaderboard drop constraint if exists leaderboard_handle_len;
alter table public.leaderboard add constraint leaderboard_handle_len
  check (char_length(handle) between 2 and 20);
do $$ begin
  create unique index if not exists leaderboard_handle_unique
    on public.leaderboard (lower(handle));
exception when others then
  raise notice 'leaderboard_handle_unique not created (existing duplicates?): %', sqlerrm;
end $$;

alter table public.leaderboard enable row level security;

-- Public read — but only of rows the user has opted into showing.
drop policy if exists "leaderboard_read_optedin" on public.leaderboard;
create policy "leaderboard_read_optedin"
  on public.leaderboard for select
  to anon, authenticated
  using (opted_in = true);

-- A user may insert/update/delete only their own row.
drop policy if exists "leaderboard_insert_own" on public.leaderboard;
create policy "leaderboard_insert_own"
  on public.leaderboard for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "leaderboard_update_own" on public.leaderboard;
create policy "leaderboard_update_own"
  on public.leaderboard for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "leaderboard_delete_own" on public.leaderboard;
create policy "leaderboard_delete_own"
  on public.leaderboard for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists leaderboard_score_idx  on public.leaderboard (score  desc) where opted_in;
create index if not exists leaderboard_speed_idx  on public.leaderboard (speed  desc) where opted_in;
create index if not exists leaderboard_streak_idx on public.leaderboard (streak desc) where opted_in;
create index if not exists leaderboard_week_idx   on public.leaderboard (week_sessions desc) where opted_in;

-- Table-level privileges (RLS still governs which rows each role can touch).
-- Explicit so reads/writes work regardless of project default-privilege config.
revoke all on table public.leaderboard from anon, authenticated;
grant select on table public.leaderboard to anon, authenticated;
grant insert, update, delete on table public.leaderboard to authenticated;

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
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "push_subs_insert_own" on public.push_subs;
create policy "push_subs_insert_own"
  on public.push_subs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "push_subs_update_own" on public.push_subs;
create policy "push_subs_update_own"
  on public.push_subs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "push_subs_delete_own" on public.push_subs;
create policy "push_subs_delete_own"
  on public.push_subs for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists push_subs_touch on public.push_subs;
create trigger push_subs_touch
  before update on public.push_subs
  for each row execute function public.touch_updated_at();

create index if not exists push_subs_user_id_idx on public.push_subs (user_id);
revoke all on table public.push_subs from anon, authenticated;
grant select, delete on table public.push_subs to authenticated;
grant insert (endpoint, user_id, p256dh, auth, tz, hour, week) on table public.push_subs to authenticated;
grant update (user_id, p256dh, auth, tz, hour, week, updated_at) on table public.push_subs to authenticated;

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
--   -- Housekeeping: drop subscriptions whose device hasn't opened the app in
--   -- 90+ days (the schedule is refreshed on every open, so a stale updated_at
--   -- means the browser/subscription is gone; the sender also prunes 404/410s).
--   select cron.schedule('ff-push-prune', '15 3 * * 0', $cron$
--     delete from public.push_subs where updated_at < now() - interval '90 days';
--   $cron$);
--
-- (kept commented so `supabase db push` never fails on projects without pg_cron)

-- ============================================================================
-- Pre-launch review hardening (2026-09-30)
-- ============================================================================

-- push_subs: a signed-in user writes their own rows, so bound what they can
-- write. The sender also allow-lists push-service hosts and times out sends.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'push_subs_endpoint_https' and conrelid = 'public.push_subs'::regclass) then
    alter table public.push_subs add constraint push_subs_endpoint_https
      check (endpoint like 'https://%' and char_length(endpoint) <= 1024) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'push_subs_week_small' and conrelid = 'public.push_subs'::regclass) then
    alter table public.push_subs add constraint push_subs_week_small
      check (pg_column_size(week) <= 16384) not valid;
  end if;
end $$;

-- At most 10 subscriptions (browsers) per user.
create or replace function public.push_subs_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.push_subs where user_id = new.user_id) >= 10 then
    raise exception 'too many push subscriptions for this account';
  end if;
  return new;
end;
$$;
revoke execute on function public.push_subs_cap() from public, anon, authenticated;
drop trigger if exists push_subs_cap on public.push_subs;
create trigger push_subs_cap
  before insert on public.push_subs
  for each row execute function public.push_subs_cap();

-- Leaderboard: anonymous visitors read only the public columns (never user_id).
revoke select on table public.leaderboard from anon;
grant select (handle, opted_in, score, speed, speed_gain, streak, sessions, goal, week_sessions, week_start)
  on table public.leaderboard to anon;

-- AI coach: a global daily ceiling on top of the per-user limits, so scripted
-- throwaway accounts can't run up unbounded model cost. Tune the 1000/day cap
-- below as real usage grows.
create table if not exists private.ai_coach_global (
  usage_day date primary key,
  day_count int not null default 0 check (day_count >= 0)
);
create or replace function public.consume_ai_coach_quota(p_user_id uuid)
returns table (allowed boolean, retry_after_seconds int, daily_remaining int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_day date := (now() at time zone 'utc')::date;
  v_row private.ai_coach_usage%rowtype;
  v_global int;
begin
  insert into private.ai_coach_global (usage_day, day_count) values (v_day, 1)
  on conflict (usage_day) do update set day_count = private.ai_coach_global.day_count + 1
  returning day_count into v_global;

  insert into private.ai_coach_usage (user_id, minute_count, day_count)
  values (p_user_id, 0, 0)
  on conflict (user_id) do nothing;
  select * into v_row from private.ai_coach_usage where user_id = p_user_id for update;

  if v_row.usage_day <> v_day then
    v_row.usage_day := v_day;
    v_row.day_count := 0;
  end if;
  if v_row.minute_window_start <= v_now - interval '1 minute' then
    v_row.minute_window_start := v_now;
    v_row.minute_count := 0;
  end if;

  v_row.minute_count := v_row.minute_count + 1;
  v_row.day_count := v_row.day_count + 1;
  update private.ai_coach_usage
  set minute_window_start = v_row.minute_window_start,
      minute_count = v_row.minute_count,
      usage_day = v_row.usage_day,
      day_count = v_row.day_count,
      updated_at = v_now
  where user_id = p_user_id;

  return query select
    (v_row.minute_count <= 5 and v_row.day_count <= 50 and v_global <= 1000),
    case when v_row.minute_count > 5
      then greatest(1, ceil(extract(epoch from (v_row.minute_window_start + interval '1 minute' - v_now)))::int)
      when v_global > 1000 then 3600
      else 0 end,
    greatest(0, 50 - v_row.day_count);
end;
$$;
revoke execute on function public.consume_ai_coach_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_ai_coach_quota(uuid) to service_role;
