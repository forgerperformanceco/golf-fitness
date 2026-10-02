begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'one@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'two@example.test');

select has_column('public', 'profiles', 'billing_event_at', 'billing event ordering is stored');
select ok(
  not has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE'),
  'anonymous callers cannot execute signup trigger function'
);
select ok(
  not has_function_privilege('authenticated', 'public.snapshot_profile_data()', 'EXECUTE'),
  'signed-in callers cannot execute snapshot trigger function'
);
select ok(
  not has_schema_privilege('authenticated', 'private', 'USAGE'),
  'browser roles cannot access the private operational schema'
);
select ok(
  not has_table_privilege('authenticated', 'private.billing_subscriptions', 'SELECT'),
  'browser roles cannot read per-subscription billing rows'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  $$select count(*) from public.profiles$$,
  array[1::bigint],
  'a user sees only their own profile'
);
select lives_ok(
  $$update public.profiles set data='{"safe":true}'::jsonb, rev=rev+1 where id='11111111-1111-4111-8111-111111111111'$$,
  'a user may update sync data'
);
select throws_ok(
  $$update public.profiles set trial_ends_at=now()+interval '1 year' where id='11111111-1111-4111-8111-111111111111'$$,
  '42501',
  'permission denied for table profiles',
  'a user cannot self-grant a trial'
);
select throws_ok(
  $$select * from public.consume_ai_coach_quota('11111111-1111-4111-8111-111111111111')$$,
  '42501',
  'permission denied for function consume_ai_coach_quota',
  'a user cannot call the server-only quota function'
);

-- ── Pro is server truth: the browser can't grant it or restart the free week ──
select throws_ok(
  $$update public.profiles set subscription_status='active' where id='11111111-1111-4111-8111-111111111111'$$,
  '42501',
  'permission denied for table profiles',
  'a user cannot self-grant Pro'
);
select throws_ok(
  $$update public.profiles set created_at=now() where id='11111111-1111-4111-8111-111111111111'$$,
  '42501',
  'permission denied for table profiles',
  'a user cannot move created_at (the server free-week clock)'
);
select throws_ok(
  $$delete from public.profiles where id='11111111-1111-4111-8111-111111111111'$$,
  '42501',
  'permission denied for table profiles',
  'a user cannot delete their profile row to get a new created_at'
);
select results_eq(
  $$select public.is_subscribed()$$,
  array[false],
  'a free user is not Pro'
);
select throws_ok(
  $$select public.apply_paddle_subscription('evt_x', now(), '11111111-1111-4111-8111-111111111111', 'ctm_x', 'sub_x', 'active', null, null, null)$$,
  '42501',
  'permission denied for function apply_paddle_subscription',
  'a user cannot call the billing webhook function'
);
select throws_ok(
  $$select * from public.billing_subscriptions_to_cancel('11111111-1111-4111-8111-111111111111')$$,
  '42501',
  'permission denied for function billing_subscriptions_to_cancel',
  'a user cannot call the server-only billing lookup'
);

-- First insert (a client sync before the signup trigger's row exists) can't
-- carry a paid status or a back-dated created_at.
reset role;
delete from public.profiles where id = '22222222-2222-4222-8222-222222222222';
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select throws_ok(
  $$insert into public.profiles (id, data, subscription_status) values ('22222222-2222-4222-8222-222222222222', '{}', 'active')$$,
  '42501',
  'permission denied for table profiles',
  'a first insert cannot set a paid status'
);
select throws_ok(
  $$insert into public.profiles (id, data, created_at) values ('22222222-2222-4222-8222-222222222222', '{}', now() - interval '1 year')$$,
  '42501',
  'permission denied for table profiles',
  'a first insert cannot back-date created_at'
);
select lives_ok(
  $$insert into public.profiles (id, data) values ('22222222-2222-4222-8222-222222222222', '{}')$$,
  'a first insert with only sync data works'
);
select results_eq(
  $$select created_at > now() - interval '1 minute' from public.profiles$$,
  array[true],
  'created_at comes from the server clock'
);

reset role;
set local role anon;
select throws_ok(
  $$select public.is_subscribed()$$,
  '42501',
  'permission denied for function is_subscribed',
  'anonymous callers cannot ask is_subscribed'
);

-- ── Billing webhook RPC: idempotent, ordered per subscription ────────────────
reset role;
set local role service_role;
select is(
  public.apply_paddle_subscription('evt_a1', '2027-01-01', '11111111-1111-4111-8111-111111111111', 'ctm_1', 'sub_A', 'active', 'pri_month', '2027-02-01', null),
  'applied',
  'a first event is applied'
);
select is(
  public.apply_paddle_subscription('evt_a1', '2027-01-01', '11111111-1111-4111-8111-111111111111', 'ctm_1', 'sub_A', 'active', 'pri_month', '2027-02-01', null),
  'duplicate',
  'a replayed event id is a no-op'
);
select is(
  public.apply_paddle_subscription('evt_a0', '2026-12-31', '11111111-1111-4111-8111-111111111111', 'ctm_1', 'sub_A', 'canceled', 'pri_month', null, null),
  'stale',
  'an older event for the same subscription is ignored'
);
-- Card fails on A (past_due), the user buys annual B, then dunning cancels A.
select is(
  public.apply_paddle_subscription('evt_a2', '2027-02-01', '11111111-1111-4111-8111-111111111111', 'ctm_1', 'sub_A', 'past_due', 'pri_month', '2027-03-01', null),
  'applied',
  'a past_due renewal is applied'
);
select is(
  public.apply_paddle_subscription('evt_b1', '2027-02-03', '11111111-1111-4111-8111-111111111111', 'ctm_1', 'sub_B', 'active', 'pri_year', '2028-02-03', null),
  'applied',
  'a second subscription for the same user is applied'
);
select is(
  public.apply_paddle_subscription('evt_a3', '2027-03-01', '11111111-1111-4111-8111-111111111111', 'ctm_1', 'sub_A', 'canceled', 'pri_month', '2027-03-01', null),
  'applied',
  'the old subscription''s later cancel is applied to that subscription'
);
select results_eq(
  $$select billing_subscription_id || ':' || subscription_status from public.profiles where id = '11111111-1111-4111-8111-111111111111'$$,
  array['sub_B:active'],
  'the profile summary keeps the paid subscription'
);
select results_eq(
  $$select subscription_id from public.billing_subscriptions_to_cancel('11111111-1111-4111-8111-111111111111')$$,
  array['sub_B'],
  'only subscriptions that can still bill are listed for cancellation'
);
-- Two live subscriptions at once: C renews after D starts, then C is canceled.
select is(
  public.apply_paddle_subscription('evt_c1', '2027-01-01', '22222222-2222-4222-8222-222222222222', 'ctm_2', 'sub_C', 'active', 'pri_month', '2027-02-01', null)
  || public.apply_paddle_subscription('evt_d1', '2027-01-05', '22222222-2222-4222-8222-222222222222', 'ctm_2', 'sub_D', 'active', 'pri_year', '2028-01-05', null)
  || public.apply_paddle_subscription('evt_c2', '2027-02-01', '22222222-2222-4222-8222-222222222222', 'ctm_2', 'sub_C', 'active', 'pri_month', '2027-03-01', null)
  || public.apply_paddle_subscription('evt_c3', '2027-02-02', '22222222-2222-4222-8222-222222222222', 'ctm_2', 'sub_C', 'canceled', 'pri_month', '2027-03-01', null),
  'appliedappliedappliedapplied',
  'overlapping subscriptions are each applied'
);
select is(
  public.apply_paddle_subscription('evt_gone', '2027-01-01', '99999999-9999-4999-8999-999999999999', 'ctm_9', 'sub_9', 'active', 'pri_year', null, null),
  'orphaned',
  'an event for a deleted account is acknowledged, not retried'
);
select is(
  public.apply_paddle_subscription('evt_gone', '2027-01-01', '99999999-9999-4999-8999-999999999999', 'ctm_9', 'sub_9', 'active', 'pri_year', null, null),
  'duplicate',
  'the orphaned event stays recorded'
);
select throws_ok(
  $$select public.apply_paddle_subscription('evt_nobody', '2027-01-01', null, 'ctm_unknown', 'sub_unknown', 'active', null, null, null)$$,
  'P0001',
  'paddle profile not found',
  'an unbound customer raises so the provider retries'
);

-- ── is_subscribed: the provider's status alone ───────────────────────────────
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select results_eq(
  $$select public.is_subscribed()$$,
  array[true],
  'a late cancel of an old subscription does not lock out a paying user'
);
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select results_eq(
  $$select public.is_subscribed()$$,
  array[true],
  'canceling one of two live subscriptions keeps Pro'
);
reset role;
update public.profiles
  set subscription_status = 'canceled', trial_ends_at = now() + interval '3 days'
  where id = '11111111-1111-4111-8111-111111111111';
update public.profiles
  set subscription_status = 'past_due'
  where id = '22222222-2222-4222-8222-222222222222';
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select results_eq(
  $$select public.is_subscribed()$$,
  array[false],
  'a leftover trial end date does not keep a canceled subscription Pro'
);
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select results_eq(
  $$select public.is_subscribed()$$,
  array[true],
  'past_due keeps Pro while the provider retries the card'
);

select * from finish();
rollback;
