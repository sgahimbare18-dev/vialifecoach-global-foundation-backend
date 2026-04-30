-- Fix Admin User by Adding Password Field
-- This adds the missing password column and updates the admin user

-- Step 1: Add password column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password text;

-- Step 2: Disable RLS temporarily
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 3: Update admin user with hashed password
UPDATE public.users 
SET password = crypt('Si82monG@', gen_salt('bf'))
WHERE email = 'sgahimbare@vialifecoach.org';

-- Step 4: Verify user has password
SELECT 
    id,
    email,
    name,
    role,
    is_active,
    CASE WHEN password IS NOT NULL THEN 'HAS_PASSWORD' ELSE 'NO_PASSWORD' END as password_status
FROM public.users 
WHERE email = 'sgahimbare@vialifecoach.org';

-- Step 5: Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT SELECT ON public.users TO anon;
