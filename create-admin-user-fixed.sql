-- Create Admin User with Correct Column Names
-- First check table structure, then create admin user

-- Step 1: Check table structure (run this first)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 3: Insert admin user (adjust column names based on actual structure)
-- Try different column names that might exist:

-- Option 1: If table has 'password' column
INSERT INTO users (
    id,
    email,
    password,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'sgahimbare@vialifecoach.org',
    'Si82monG@',
    'admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    password = 'Si82monG@',
    role = 'admin',
    is_active = true,
    updated_at = NOW()
WHERE email = 'sgahimbare@vialifecoach.org';

-- Option 2: If table has 'password_hash' column (uncomment if needed)
/*
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
    'Si82monG@',
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
*/

-- Step 4: Verify user creation
SELECT 
    id,
    email,
    role,
    is_active,
    created_at
FROM users 
WHERE email = 'sgahimbare@vialifecoach.org';

-- Step 5: Grant permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;
GRANT SELECT ON users TO anon;
