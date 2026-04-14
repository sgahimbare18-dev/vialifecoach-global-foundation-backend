-- Complete RLS Policy Fix for Users Table
-- Run this in your Supabase SQL Editor

-- Step 1: Disable RLS temporarily to allow admin user creation
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 2: Remove all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can delete own data" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON users;

-- Step 3: Grant permissions directly (bypass RLS for now)
GRANT ALL ON users TO authenticated;
GRANT SELECT ON users TO anon;
GRANT ALL ON users TO service_role;

-- Step 4: Create a simple policy that allows all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON users
  FOR ALL USING (auth.role() = 'authenticated');

-- Step 5: Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 6: Add a bypass for service role (for admin operations)
CREATE POLICY "Allow service role full access" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- Step 7: Test the setup by checking current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';
