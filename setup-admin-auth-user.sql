-- Create admin user in Supabase Auth for RLS policy authentication
-- This will allow the admin dashboard to authenticate via Supabase Auth
-- so the RLS policies will work correctly

-- First, check if admin user exists in auth.users
SELECT id, email FROM auth.users WHERE email = 'sgahimbare@vialifecoach.org';

-- If admin user doesn't exist in auth.users, you need to create it via Supabase Auth
-- This can be done through the Supabase Dashboard under Authentication > Users
-- Or via the Supabase Auth API

-- Alternative: Use service role key for admin operations (not recommended for frontend)
-- Instead, the admin dashboard should authenticate via Supabase Auth

-- For now, let's create a more permissive policy that allows authenticated users
-- This is temporary until proper Supabase Auth is set up

DROP POLICY IF EXISTS "Allow admin full access to users" ON public.users;
DROP POLICY IF EXISTS "Allow users to read own data" ON public.users;
DROP POLICY IF EXISTS "Allow admin to read all users" ON public.users;

-- Temporary policy: Allow any authenticated user to read users
-- This should be replaced with proper admin authentication
CREATE POLICY "Allow authenticated users to read users" 
ON public.users FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow users to update their own data
CREATE POLICY "Allow users to update own data" 
ON public.users FOR UPDATE 
USING (auth.uid()::text = id::text);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'users' 
AND schemaname = 'public';
