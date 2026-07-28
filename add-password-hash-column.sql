-- Add password_hash column to users table for compatibility
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Sync password_hash with password for existing users
UPDATE public.users 
SET password_hash = password 
WHERE password_hash IS NULL AND password IS NOT NULL;

-- Add index on password_hash column
CREATE INDEX IF NOT EXISTS idx_users_password_hash ON public.users(password_hash);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name IN ('password', 'password_hash');
