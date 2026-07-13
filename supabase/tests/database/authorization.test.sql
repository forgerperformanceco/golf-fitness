begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

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

select * from finish();
rollback;
