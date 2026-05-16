-- Add missing password column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Add index on password column for performance
CREATE INDEX IF NOT EXISTS idx_users_password ON public.users(password);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name = 'password';
