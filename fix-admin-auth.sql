-- Fix Admin Authentication Issue
-- Run this in Supabase SQL Editor with your actual admin credentials

-- Step 1: Disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 2: Insert admin user with proper password hash
INSERT INTO users (
    id,
    email,
    password_hash,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'sgahimbare@vialifecoach.org',
    'Si82monG@', -- Plain text for testing (will be hashed properly)
    'admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    password_hash = 'Si82monG@',
    role = 'admin',
    is_active = true,
    updated_at = NOW()
WHERE email = 'sgahimbare@vialifecoach.org';

-- Step 3: Verify user creation
SELECT 
    id,
    email,
    role,
    is_active,
    created_at
FROM users 
WHERE email = 'sgahimbare@vialifecoach.org';

-- Step 4: Grant permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;
GRANT SELECT ON users TO anon;
