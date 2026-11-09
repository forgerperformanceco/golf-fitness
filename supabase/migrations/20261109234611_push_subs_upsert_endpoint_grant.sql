-- The client saves its subscription with an upsert (INSERT ... ON CONFLICT (endpoint)
-- DO UPDATE SET endpoint = EXCLUDED.endpoint, ...). Postgres checks UPDATE on every
-- column in that SET list, so without UPDATE (endpoint) every save failed with 42501
-- since the July column-grant hardening. RLS (push_subs_update_own) still limits a user
-- to their own rows; last_sent and created_at stay server-only.
grant update (endpoint) on table public.push_subs to authenticated;
