-- Ensure admin user exists in users table
INSERT INTO public.users (email, name, role, is_active, password, password_hash)
VALUES (
  'sgahimbare@vialifecoach.org',
  'Admin User',
  'admin',
  true,
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7bTqYqFqWm',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7bTqYqFqWm'
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  is_active = true,
  updated_at = NOW();

-- Verify admin user exists
SELECT id, email, name, role, is_active 
FROM public.users 
WHERE email = 'sgahimbare@vialifecoach.org';
