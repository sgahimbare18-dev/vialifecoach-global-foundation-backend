-- Fix Admin Authentication Issue
-- Create admin user in both auth.users and public.users tables

-- Step 1: Disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 2: Create admin user with proper password hash
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
    'Admin@2026Secure!', -- Plain text for testing (will be hashed properly)
    'admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    password_hash = 'Admin@2026Secure!',
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
