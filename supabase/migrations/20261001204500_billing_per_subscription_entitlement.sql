-- ============================================================================
-- Billing: one row per subscription, and Pro by status alone (2026-10-01)
--
-- 1. private.billing_subscriptions keeps ONE ROW PER PROVIDER SUBSCRIPTION,
--    each with its own out-of-order guard. The billing columns on
--    public.profiles become a summary of the user's best subscription, so a
--    late event from an old subscription (a dunning cancel, say) can never
--    overwrite a newer, paid one.
-- 2. Pro is the provider's status alone: active, trialing, or past_due (the
--    provider is still retrying the card; it ends that window itself by
--    canceling or pausing). A leftover trial end date no longer keeps a
--    canceled subscription Pro.
-- 3. An event for an account that was deleted is recorded and answered
--    'orphaned' instead of raising, so Paddle stops retrying it.
--
-- is_subscribed() and the ai-coach gate keep reading public.profiles.
-- Mirrored in supabase/schema.sql.
-- ============================================================================

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

  -- One user's billing events apply one at a time (row lock), so the summary
  -- below always sees every committed subscription of theirs.
  perform 1 from public.profiles p where p.id = v_user for update;

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

-- Pro = the provider's status. trial_ends_at no longer grants access on its
-- own: Paddle owns the trialing -> active / past_due / canceled transitions.
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

comment on column public.profiles.subscription_status is
  'free|trialing|active|past_due|paused|canceled — written only by billing webhooks (summary of private.billing_subscriptions). Pro = active|trialing|past_due.';
