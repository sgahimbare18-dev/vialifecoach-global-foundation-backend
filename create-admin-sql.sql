-- Create Admin User SQL Script
-- Uses environment variables for credentials
-- Email: ${ADMIN_EMAIL}
-- Password: ${ADMIN_PASSWORD}

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
    '${ADMIN_EMAIL}',
    '${ADMIN_PASSWORD}',
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

-- Verify user creation
SELECT id, email, role, is_active FROM users 
WHERE email = '${ADMIN_EMAIL}';
