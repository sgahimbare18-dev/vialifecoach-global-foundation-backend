-- Create Admin User SQL Script
-- Email: sgahimbare@vialifecoach.org
-- Password: Admin@2026Secure!

-- Disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Insert admin user
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
    'Admin@2026Secure!',
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

-- Verify user creation
SELECT id, email, role, is_active FROM users 
WHERE email = 'sgahimbare@vialifecoach.org';
