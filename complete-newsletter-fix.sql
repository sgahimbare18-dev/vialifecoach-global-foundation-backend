-- Complete Newsletter Fix - Disable RLS Completely
-- Run this in Supabase SQL Editor to fix all newsletter issues

-- 1. Disable RLS completely for newsletter table
ALTER TABLE public.newsletter DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies
DROP POLICY IF EXISTS "Users can view all newsletter subscriptions" ON public.newsletter;
DROP POLICY IF EXISTS "Admins can manage newsletter subscriptions" ON public.newsletter;
DROP POLICY IF EXISTS "Allow newsletter signup" ON public.newsletter;
DROP POLICY IF EXISTS "Allow public newsletter viewing" ON public.newsletter;
DROP POLICY IF EXISTS "Allow users to update own subscription" ON public.newsletter;
DROP POLICY IF EXISTS "Allow admin full access" ON public.newsletter;

-- 3. Ensure table has all required columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'newsletter' 
        AND column_name = 'unsubscribe_token'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.newsletter ADD COLUMN unsubscribe_token TEXT UNIQUE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'newsletter' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.newsletter ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- 4. Generate unsubscribe tokens for existing records
UPDATE public.newsletter 
SET unsubscribe_token = md5(email || extract(epoch from now())::text)
WHERE unsubscribe_token IS NULL;

-- 5. Grant full permissions without RLS restrictions
GRANT ALL ON public.newsletter TO authenticated;
GRANT ALL ON public.newsletter TO service_role;
GRANT SELECT, INSERT ON public.newsletter TO anon;

-- 6. Create a simple trigger for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_newsletter_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_newsletter_updated_at_trigger ON public.newsletter;
CREATE TRIGGER update_newsletter_updated_at_trigger
    BEFORE UPDATE ON public.newsletter
    FOR EACH ROW
    EXECUTE FUNCTION public.update_newsletter_updated_at();

-- 7. Verify table structure and permissions
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'newsletter' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. Test insert permission (this should work now)
-- You can run this to test:
-- INSERT INTO public.newsletter (email, name) VALUES ('test@example.com', 'Test User');

COMMIT;
