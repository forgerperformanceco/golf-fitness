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
