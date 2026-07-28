-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Grant the roles that legitimately need access.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow admin full access to users" ON public.users;
DROP POLICY IF EXISTS "Allow users to read own data" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON public.users;

-- Create RLS policies for users table

-- Policy: Allow admin full access to users table
CREATE POLICY "Allow admin full access to users" 
ON public.users FOR ALL 
TO authenticated
USING (
  auth.jwt() ->> 'email' IN ('sgahimbare@vialifecoach.org', 'academy@vialifecoach.org')
)
WITH CHECK (
  auth.jwt() ->> 'email' IN ('sgahimbare@vialifecoach.org', 'academy@vialifecoach.org')
);

-- Policy: Allow authenticated users to read their own data
CREATE POLICY "Allow users to read own data" 
ON public.users FOR SELECT 
TO authenticated
USING (auth.uid()::text = id::text);

-- Policy: Allow admin to read all users (for admin dashboard)
CREATE POLICY "Allow admin to read all users" 
ON public.users FOR SELECT 
TO authenticated
USING (
  auth.jwt() ->> 'email' IN ('sgahimbare@vialifecoach.org', 'academy@vialifecoach.org')
);

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND schemaname = 'public';
