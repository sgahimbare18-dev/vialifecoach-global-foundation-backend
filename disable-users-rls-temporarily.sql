-- Temporarily disable RLS on users table to fix permission issues
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';
