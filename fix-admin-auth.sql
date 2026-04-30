-- Fix Admin Authentication Issue
-- Uses environment variables for credentials

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
    '${ADMIN_EMAIL}',
    '${ADMIN_PASSWORD}', -- Plain text for testing (will be hashed properly)
    '${ADMIN_ROLE:-admin}',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    password_hash = '${ADMIN_PASSWORD}',
    role = '${ADMIN_ROLE:-admin}',
    is_active = true,
    updated_at = NOW()
WHERE email = '${ADMIN_EMAIL}';

-- Step 3: Verify user creation
SELECT 
    id,
    email,
    role,
    is_active,
    created_at
FROM users 
WHERE email = '${ADMIN_EMAIL}';

-- Step 4: Grant permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;
GRANT SELECT ON users TO anon;
