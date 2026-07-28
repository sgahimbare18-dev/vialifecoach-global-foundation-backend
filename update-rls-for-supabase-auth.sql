-- Update RLS policies to work with Supabase Auth authentication
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON public.users;
DROP POLICY IF EXISTS "Allow users to read own data" ON public.users;
DROP POLICY IF EXISTS "Allow users to update own data" ON public.users;
DROP POLICY IF EXISTS "Allow admin full access via Supabase Auth" ON public.users;

-- Make sure the table is reachable by the roles that should use it.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;

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

-- Policy: Allow users to read their own data
CREATE POLICY "Allow users to read own data" 
ON public.users FOR SELECT 
TO authenticated
USING (auth.uid()::text = id::text);

-- Policy: Allow users to update their own data
CREATE POLICY "Allow users to update own data" 
ON public.users FOR UPDATE 
TO authenticated
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'users' 
AND schemaname = 'public';
