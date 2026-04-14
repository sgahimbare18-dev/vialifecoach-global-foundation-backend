-- Fix Row Level Security Policy for Users Table
-- Run this in your Supabase SQL Editor

-- Drop existing policies that might be blocking user creation
DROP POLICY IF EXISTS "Users can view own profile";
DROP POLICY IF EXISTS "Users can insert own data";
DROP POLICY IF EXISTS "Users can update own data";

-- Create new policies that allow user operations
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON users TO authenticated;
GRANT SELECT ON users TO anon;

-- Add comment explaining the fix
COMMENT ON POLICY "Users can insert own data" IS 'Allow users to create their own profile during signup/registration';
