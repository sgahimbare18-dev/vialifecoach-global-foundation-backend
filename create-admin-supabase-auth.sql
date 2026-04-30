-- Create Admin User Using Supabase Auth System
-- This creates user in auth.users and adds profile to public.users

-- Step 1: Create user in Supabase auth system
-- This uses the internal auth.users table
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    is_super_admin,
    role
) VALUES (
    gen_random_uuid(),
    'sgahimbare@vialifecoach.org',
    crypt('Si82monG@', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"role": "admin", "name": "Super Admin"}',
    false,
    'authenticated'
) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt('Si82monG@', gen_salt('bf')),
    updated_at = now(),
    raw_user_meta_data = '{"role": "admin", "name": "Super Admin"}'
WHERE email = 'sgahimbare@vialifecoach.org';

-- Step 2: Get the user ID from auth.users
DO $$
DECLARE
    user_id UUID;
BEGIN
    SELECT id INTO user_id FROM auth.users WHERE email = 'sgahimbare@vialifecoach.org';
    
    -- Step 3: Insert profile into public.users
    INSERT INTO public.users (
        id,
        email,
        name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        'sgahimbare@vialifecoach.org',
        'Super Admin',
        'admin',
        true,
        now(),
        now()
    ) ON CONFLICT (id) DO UPDATE SET
        role = 'admin',
        is_active = true,
        updated_at = now()
    WHERE id = user_id;
END $$;

-- Step 4: Verify user creation
SELECT 
    au.id,
    au.email,
    au.email_confirmed_at,
    pu.role,
    pu.is_active,
    pu.created_at
FROM auth.users au
JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'sgahimbare@vialifecoach.org';

-- Step 5: Grant necessary permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT SELECT ON public.users TO anon;
