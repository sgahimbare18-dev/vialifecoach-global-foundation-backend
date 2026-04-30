-- Complete Admin User Fix
-- This fixes everything needed for admin login to work

-- Step 1: Add password column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN password text;
        RAISE NOTICE 'Added password column to users table';
    ELSE
        RAISE NOTICE 'Password column already exists';
    END IF;
END $$;

-- Step 2: Disable RLS temporarily
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 3: Create/update admin user with proper password
INSERT INTO public.users (
    id,
    email,
    name,
    password,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'sgahimbare@vialifecoach.org',
    'Super Admin',
    crypt('Si82monG@', gen_salt('bf')),
    'admin',
    true,
    now(),
    now()
) ON CONFLICT (email) DO UPDATE SET
    password = crypt('Si82monG@', gen_salt('bf')),
    name = 'Super Admin',
    role = 'admin',
    is_active = true,
    updated_at = now()
WHERE email = 'sgahimbare@vialifecoach.org';

-- Step 4: Verify admin user exists with password
SELECT 
    id,
    email,
    name,
    role,
    is_active,
    CASE 
        WHEN password IS NOT NULL THEN 'HAS_PASSWORD'
        ELSE 'NO_PASSWORD'
    END as password_status,
    created_at
FROM public.users 
WHERE email = 'sgahimbare@vialifecoach.org';

-- Step 5: Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT SELECT ON public.users TO anon;

-- Step 6: Test password verification (should return true)
SELECT 
    email,
    crypt('Si82monG@', password) = password as password_verification
FROM public.users 
WHERE email = 'sgahimbare@vialifecoach.org';
