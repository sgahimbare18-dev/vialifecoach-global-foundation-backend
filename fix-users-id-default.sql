-- Add default UUID value to id column
ALTER TABLE public.users 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify the default was set
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name = 'id';
