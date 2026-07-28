-- Fix RLS policies to allow signup and login
DROP POLICY IF EXISTS "Allow admin full access via Supabase Auth" ON public.users;
DROP POLICY IF EXISTS "Allow users to read own data" ON public.users;
DROP POLICY IF EXISTS "Allow users to update own data" ON public.users;

-- Keep authenticated users and the backend service role able to reach the table.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;

-- Policy: Allow public insert for signup (new user creation)
CREATE POLICY "Allow public insert for signup" 
ON public.users FOR INSERT 
WITH CHECK (true);

-- Policy: Allow authenticated users to read their own data
CREATE POLICY "Allow authenticated users to read own data" 
ON public.users FOR SELECT 
TO authenticated
USING (auth.uid()::text = id::text);

-- Policy: Allow authenticated users to update their own data
CREATE POLICY "Allow authenticated users to update own data" 
ON public.users FOR UPDATE 
TO authenticated
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- Policy: Allow admin full access via Supabase Auth
CREATE POLICY "Allow admin full access via Supabase Auth" 
ON public.users FOR ALL 
TO authenticated
USING (
  auth.jwt() ->> 'email' IN ('sgahimbare@vialifecoach.org', 'academy@vialifecoach.org')
)
WITH CHECK (
  auth.jwt() ->> 'email' IN ('sgahimbare@vialifecoach.org', 'academy@vialifecoach.org')
);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'users' 
AND schemaname = 'public';
