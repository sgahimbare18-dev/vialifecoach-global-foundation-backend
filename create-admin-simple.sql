-- Simple Admin User Creation
-- Use this if the complex auth system doesn't work

-- Step 1: Disable RLS temporarily
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 2: Insert admin user profile directly
-- Note: This creates the profile but not the auth credentials
INSERT INTO public.users (
    id,
    email,
    name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'sgahimbare@vialifecoach.org',
    'Super Admin',
    'admin',
    true,
    now(),
    now()
) ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    is_active = true,
    updated_at = now()
WHERE email = 'sgahimbare@vialifecoach.org';

-- Step 3: Verify user creation
SELECT 
    id,
    email,
    name,
    role,
    is_active,
    created_at
FROM public.users 
WHERE email = 'sgahimbare@vialifecoach.org';

-- Step 4: Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT SELECT ON public.users TO anon;
