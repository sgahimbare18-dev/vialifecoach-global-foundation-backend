-- Fix Admin Login Issue
-- Simple approach: Create admin user with plain text password for testing

-- Step 1: Completely remove any existing admin user
DELETE FROM users WHERE email = 'sgahimbare@vialifecoach';

-- Step 2: Disable RLS completely
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 3: Insert admin user with simple password hash
INSERT INTO users (
    id,
    email,
    password_hash,
    role,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'sgahimbare@vialifecoach',
    'Si82monG@', -- Plain text for now, will fix later
    'admin',
    NOW(),
    NOW()
);

-- Step 4: Verify user was created
SELECT 
    id,
    email,
    role,
    created_at
FROM users 
WHERE email = 'sgahimbare@vialifecoach';

-- Step 5: Grant permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;
GRANT SELECT ON users TO anon;
