-- Backend-only lock down for public.users
-- Paste this into the Supabase SQL Editor.
-- This keeps the table usable from the server with the service-role key
-- while preventing browser-facing RLS recursion and direct client access.

begin;

-- Keep RLS enabled for defense in depth.
alter table public.users enable row level security;

-- Drop every existing policy on public.users to remove recursion and any client access.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
  loop
    execute format('drop policy if exists %I on public.users', policy_record.policyname);
  end loop;
end $$;

-- Revoke access from browser-facing roles.
revoke all on table public.users from anon;
revoke all on table public.users from authenticated;
revoke all on table public.users from public;

-- Keep full table access for the backend service role.
grant select, insert, update, delete on table public.users to service_role;

-- If public.users uses a serial/identity id, let the service role use the sequence.
do $$
declare
  seq_record record;
begin
  for seq_record in
    select c.relname as sequence_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_depend d on d.objid = c.oid
    join pg_class t on t.oid = d.refobjid
    join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
    where n.nspname = 'public'
      and c.relkind = 'S'
      and t.relname = 'users'
      and a.attname = 'id'
  loop
    execute format('grant usage, select on sequence public.%I to service_role', seq_record.sequence_name);
  end loop;
end $$;

commit;

-- Reload PostgREST schema cache so the API sees the new permissions immediately.
notify pgrst, 'reload schema';
