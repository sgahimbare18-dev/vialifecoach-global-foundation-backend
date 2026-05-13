-- Check if applications table exists and has data
SELECT * FROM information_schema.tables 
WHERE table_name = 'applications' AND table_schema = 'public';

-- Check applications table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'applications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any volunteer applications
SELECT COUNT(*) as total_applications,
       COUNT(CASE WHEN type = 'volunteer' THEN 1 END) as volunteer_applications,
       COUNT(CASE WHEN type = 'mentor' THEN 1 END) as mentor_applications,
       COUNT(CASE WHEN type = 'partner' THEN 1 END) as partner_applications,
       COUNT(CASE WHEN type = 'intern' THEN 1 END) as intern_applications
FROM public.applications;

-- Show all applications with details
SELECT id, name, email, type, status, created_at
FROM public.applications 
ORDER BY created_at DESC
LIMIT 10;
