-- Find the exact Supabase object that still references users.password.
-- Run this in the Supabase SQL Editor.

-- 1) RLS policies on users that mention password.
select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname not in ('pg_catalog', 'information_schema')
  and tablename = 'users'
  and (
    coalesce(qual, '') ilike '%password%'
    or coalesce(with_check, '') ilike '%password%'
  )
order by schemaname, tablename, policyname;

-- 2) Triggers attached to any users table outside system schemas.
select
  n.nspname as schema_name,
  c.relname as table_name,
  t.tgname as trigger_name,
  p.proname as function_name,
  pg_get_triggerdef(t.oid) as trigger_def,
  pg_get_functiondef(p.oid) as function_def
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal
  and n.nspname not in ('pg_catalog', 'information_schema')
  and c.relname = 'users'
order by n.nspname, c.relname, t.tgname;

-- 3) Functions in non-system schemas that mention password anywhere in the body.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as security_definer,
  left(pg_get_functiondef(p.oid), 4000) as definition_preview
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname not in ('pg_catalog', 'information_schema')
  and lower(pg_get_functiondef(p.oid)) like '%password%'
order by n.nspname, p.proname;

-- 4) Optional: generate drop statements for anything you find above.
-- Copy the matching row names from the result grids and then use the corresponding DROP statement.
