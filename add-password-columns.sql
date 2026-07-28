-- Add password and password_hash columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_password ON public.users(password);
CREATE INDEX IF NOT EXISTS idx_users_password_hash ON public.users(password_hash);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name IN ('password', 'password_hash');
