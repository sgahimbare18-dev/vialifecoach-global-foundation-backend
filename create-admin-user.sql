-- Create Admin User for Vialifecoach
-- Email: sgahimbare@vialifecoach
-- Password: Si82monG@

-- Step 1: Disable RLS temporarily to allow user creation
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 2: Insert or update admin user
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
    crypt('Si82monG@', gen_salt('bcrypt')),
    'admin',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    password_hash = crypt('Si82monG@', gen_salt('bcrypt')),
    updated_at = NOW()
WHERE email = 'sgahimbare@vialifecoach';

-- Step 3: Re-enable RLS (optional - you can keep disabled for admin operations)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify user was created
SELECT 
    id,
    email,
    role,
    created_at,
    updated_at
FROM users 
WHERE email = 'sgahimbare@vialifecoach';
