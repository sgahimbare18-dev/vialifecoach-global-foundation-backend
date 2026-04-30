-- Fix Newsletter Schema - Corrected PostgreSQL Syntax
-- Run this in your Supabase SQL Editor

-- 1. Create newsletter table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.newsletter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    status TEXT DEFAULT 'active',
    unsubscribe_token TEXT UNIQUE,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add unsubscribe_token column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'newsletter' 
        AND column_name = 'unsubscribe_token'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.newsletter ADD COLUMN unsubscribe_token TEXT UNIQUE;
        
        -- Generate unsubscribe tokens for existing records using correct PostgreSQL syntax
        UPDATE public.newsletter 
        SET unsubscribe_token = md5(email || extract(epoch from now())::text)
        WHERE unsubscribe_token IS NULL;
    END IF;
END $$;

-- 3. Add other missing columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'newsletter' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.newsletter ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'newsletter' 
        AND column_name = 'subscribed_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.newsletter ADD COLUMN subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'newsletter' 
        AND column_name = 'unsubscribed_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.newsletter ADD COLUMN unsubscribed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 4. Enable RLS on newsletter table
ALTER TABLE public.newsletter ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for newsletter table
DROP POLICY IF EXISTS "Users can view all newsletter subscriptions" ON public.newsletter;
DROP POLICY IF EXISTS "Admins can manage newsletter subscriptions" ON public.newsletter;

CREATE POLICY "Users can view all newsletter subscriptions" ON public.newsletter
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage newsletter subscriptions" ON public.newsletter
    FOR ALL USING (
        auth.jwt() ->> 'email' = 'sgahimbare@vialifecoach.org'
    );

-- 6. Grant permissions
GRANT ALL ON public.newsletter TO authenticated;
GRANT SELECT ON public.newsletter TO anon;

-- 7. Create trigger to update updated_at timestamp
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

-- 8. Verify the schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'newsletter' 
AND table_schema = 'public'
ORDER BY ordinal_position;

COMMIT;
