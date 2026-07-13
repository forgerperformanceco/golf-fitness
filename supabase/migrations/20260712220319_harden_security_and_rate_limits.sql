-- Yardsmith security hardening: least privilege, entitlement integrity,
-- operational quotas, webhook idempotency, and RLS performance.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  billing_provider text,
  billing_customer_id text,
  billing_subscription_id text,
  subscription_status text not null default 'free',
  plan text,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  rev bigint not null default 0,
  billing_event_at timestamptz
);
alter table public.profiles add column if not exists rev bigint not null default 0;
alter table public.profiles add column if not exists billing_event_at timestamptz;
alter table public.profiles enable row level security;

create table if not exists public.profiles_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  rev bigint,
  data jsonb not null,
  saved_at timestamptz not null default now()
);
alter table public.profiles_history enable row level security;
create index if not exists profiles_history_user_idx on public.profiles_history (user_id, id desc);

create table if not exists public.leaderboard (
  user_id uuid primary key references auth.users (id) on delete cascade,
  handle text not null,
  opted_in boolean not null default true,
  score int,
  speed numeric,
  speed_gain numeric,
  streak int,
  sessions int,
  goal text,
  updated_at timestamptz not null default now(),
  week_sessions int,
  week_start date
);
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
alter table public.leaderboard enable row level security;
alter table public.leaderboard drop constraint if exists leaderboard_handle_len;
alter table public.leaderboard add constraint leaderboard_handle_len check (char_length(handle) between 2 and 20);
create unique index if not exists leaderboard_handle_unique on public.leaderboard (lower(handle));
create index if not exists leaderboard_score_idx on public.leaderboard (score desc) where opted_in;
create index if not exists leaderboard_speed_idx on public.leaderboard (speed desc) where opted_in;
create index if not exists leaderboard_streak_idx on public.leaderboard (streak desc) where opted_in;
create index if not exists leaderboard_week_idx on public.leaderboard (week_sessions desc) where opted_in;

create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  tz text not null default 'UTC',
  hour int not null default 17 check (hour between 0 and 23),
  week jsonb not null default '[]'::jsonb,
  last_sent date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (
    (select auth.uid()) = id
    and subscription_status = 'free'
    and billing_provider is null
    and billing_customer_id is null
    and billing_subscription_id is null
    and plan is null
    and current_period_end is null
    and trial_ends_at is null
    and billing_event_at is null
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant insert (id, data, updated_at, rev) on table public.profiles to authenticated;
grant update (data, updated_at, rev) on table public.profiles to authenticated;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.guard_profile_size()
returns trigger language plpgsql set search_path = '' as $$
begin
  if pg_column_size(new.data) > 1048576 then
    raise exception 'sync blob exceeds 1MB - refusing to store';
  end if;
  return new;
end;
$$;

create or replace function public.snapshot_profile_data()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.data is distinct from old.data
     and not exists (select 1 from public.profiles_history
                     where user_id = old.id and saved_at > now() - interval '10 minutes') then
    insert into public.profiles_history (user_id, rev, data) values (old.id, old.rev, old.data);
    delete from public.profiles_history
      where user_id = old.id
        and id not in (select id from public.profiles_history
                       where user_id = old.id order by id desc limit 10);
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists profiles_snapshot on public.profiles;
create trigger profiles_snapshot before update on public.profiles
  for each row execute function public.snapshot_profile_data();
drop trigger if exists profiles_size_guard on public.profiles;
create trigger profiles_size_guard before insert or update on public.profiles
  for each row execute function public.guard_profile_size();
drop trigger if exists push_subs_touch on public.push_subs;
create trigger push_subs_touch before update on public.push_subs
  for each row execute function public.touch_updated_at();
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

drop function if exists public.is_subscribed(uuid);
create or replace function public.is_subscribed()
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and (subscription_status in ('active', 'trialing')
           or (trial_ends_at is not null and trial_ends_at > now()))
  );
$$;

revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.guard_profile_size() from public, anon, authenticated;
revoke execute on function public.snapshot_profile_data() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_subscribed() from public, anon;
grant execute on function public.is_subscribed() to authenticated;

drop policy if exists "profiles_history_select_own" on public.profiles_history;
create policy "profiles_history_select_own" on public.profiles_history for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on table public.profiles_history from anon, authenticated;
grant select on table public.profiles_history to authenticated;

drop policy if exists "leaderboard_read_optedin" on public.leaderboard;
create policy "leaderboard_read_optedin" on public.leaderboard for select to anon, authenticated
  using (opted_in = true);
drop policy if exists "leaderboard_insert_own" on public.leaderboard;
create policy "leaderboard_insert_own" on public.leaderboard for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "leaderboard_update_own" on public.leaderboard;
create policy "leaderboard_update_own" on public.leaderboard for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "leaderboard_delete_own" on public.leaderboard;
create policy "leaderboard_delete_own" on public.leaderboard for delete to authenticated
  using ((select auth.uid()) = user_id);

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
revoke all on table public.leaderboard from anon, authenticated;
grant select on table public.leaderboard to anon, authenticated;
grant insert, update, delete on table public.leaderboard to authenticated;

drop policy if exists "push_subs_select_own" on public.push_subs;
create policy "push_subs_select_own" on public.push_subs for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "push_subs_insert_own" on public.push_subs;
create policy "push_subs_insert_own" on public.push_subs for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "push_subs_update_own" on public.push_subs;
create policy "push_subs_update_own" on public.push_subs for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "push_subs_delete_own" on public.push_subs;
create policy "push_subs_delete_own" on public.push_subs for delete to authenticated
  using ((select auth.uid()) = user_id);
create index if not exists push_subs_user_id_idx on public.push_subs (user_id);
revoke all on table public.push_subs from anon, authenticated;
grant select, delete on table public.push_subs to authenticated;
grant insert (endpoint, user_id, p256dh, auth, tz, hour, week) on table public.push_subs to authenticated;
grant update (user_id, p256dh, auth, tz, hour, week, updated_at) on table public.push_subs to authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.ai_coach_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  minute_window_start timestamptz not null default date_trunc('minute', now()),
  minute_count int not null default 0 check (minute_count >= 0),
  usage_day date not null default (now() at time zone 'utc')::date,
  day_count int not null default 0 check (day_count >= 0),
  updated_at timestamptz not null default now()
);

create or replace function public.consume_ai_coach_quota(p_user_id uuid)
returns table (allowed boolean, retry_after_seconds int, daily_remaining int)
language plpgsql security definer set search_path = '' as $$
declare v_now timestamptz := now(); v_row private.ai_coach_usage%rowtype;
begin
  insert into private.ai_coach_usage (user_id, minute_count, day_count)
  values (p_user_id, 0, 0) on conflict (user_id) do nothing;
  select * into v_row from private.ai_coach_usage where user_id = p_user_id for update;
  if v_row.usage_day <> (v_now at time zone 'utc')::date then
    v_row.usage_day := (v_now at time zone 'utc')::date; v_row.day_count := 0;
  end if;
  if v_row.minute_window_start <= v_now - interval '1 minute' then
    v_row.minute_window_start := v_now; v_row.minute_count := 0;
  end if;
  v_row.minute_count := v_row.minute_count + 1; v_row.day_count := v_row.day_count + 1;
  update private.ai_coach_usage set minute_window_start=v_row.minute_window_start,
    minute_count=v_row.minute_count, usage_day=v_row.usage_day, day_count=v_row.day_count,
    updated_at=v_now where user_id=p_user_id;
  return query select (v_row.minute_count <= 5 and v_row.day_count <= 50),
    case when v_row.minute_count > 5 then greatest(1, ceil(extract(epoch from
      (v_row.minute_window_start + interval '1 minute' - v_now)))::int) else 0 end,
    greatest(0, 50 - v_row.day_count);
end;
$$;
revoke execute on function public.consume_ai_coach_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_ai_coach_quota(uuid) to service_role;

create table if not exists private.paddle_events (
  event_id text primary key,
  occurred_at timestamptz not null,
  processed_at timestamptz not null default now()
);

create or replace function public.apply_paddle_subscription(
  p_event_id text, p_occurred_at timestamptz, p_user_id uuid, p_customer_id text,
  p_subscription_id text, p_status text, p_plan text, p_period_end timestamptz,
  p_trial_end timestamptz
) returns text language plpgsql security definer set search_path = '' as $$
declare v_inserted int; v_updated int;
begin
  insert into private.paddle_events (event_id, occurred_at) values (p_event_id, p_occurred_at)
    on conflict (event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return 'duplicate'; end if;
  update public.profiles set billing_provider='paddle', billing_customer_id=p_customer_id,
    billing_subscription_id=p_subscription_id, subscription_status=p_status, plan=p_plan,
    current_period_end=p_period_end, trial_ends_at=p_trial_end, billing_event_at=p_occurred_at
  where (id=p_user_id or (p_user_id is null and billing_customer_id=p_customer_id))
    and (billing_event_at is null or billing_event_at <= p_occurred_at);
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    if exists (select 1 from public.profiles
               where id=p_user_id or (p_user_id is null and billing_customer_id=p_customer_id)) then
      return 'stale';
    end if;
    raise exception 'paddle profile not found';
  end if;
  return 'applied';
end;
$$;
revoke execute on function public.apply_paddle_subscription(text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.apply_paddle_subscription(text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz)
  to service_role;
