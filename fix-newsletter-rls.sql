-- Fix Newsletter RLS Policies
-- Run this in Supabase SQL Editor to fix RLS policy violations

-- 1. Disable RLS temporarily to allow operations
ALTER TABLE public.newsletter DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies
DROP POLICY IF EXISTS "Users can view all newsletter subscriptions" ON public.newsletter;
DROP POLICY IF EXISTS "Admins can manage newsletter subscriptions" ON public.newsletter;

-- 3. Create new, more permissive policies
-- Allow anyone to insert (for newsletter signup)
CREATE POLICY "Allow newsletter signup" ON public.newsletter
    FOR INSERT WITH CHECK (true);

-- Allow anyone to view (public newsletter list)
CREATE POLICY "Allow public newsletter viewing" ON public.newsletter
    FOR SELECT USING (true);

-- Allow authenticated users to update their own subscription
CREATE POLICY "Allow users to update own subscription" ON public.newsletter
    FOR UPDATE USING (auth.email() = email);

-- Allow admin to manage all subscriptions
CREATE POLICY "Allow admin full access" ON public.newsletter
    FOR ALL USING (
        auth.jwt() ->> 'email' = 'sgahimbare@vialifecoach.org' OR
        auth.role() = 'service_role'
    );

-- 4. Re-enable RLS
ALTER TABLE public.newsletter ENABLE ROW LEVEL SECURITY;

-- 5. Grant permissions
GRANT ALL ON public.newsletter TO authenticated;
GRANT SELECT ON public.newsletter TO anon;
GRANT ALL ON public.newsletter TO service_role;

-- 6. Alternative: If RLS still causes issues, disable it completely
-- Uncomment the following lines if needed:
-- ALTER TABLE public.newsletter DISABLE ROW LEVEL SECURITY;
-- GRANT ALL ON public.newsletter TO authenticated;
-- GRANT SELECT ON public.newsletter TO anon;

-- 7. Test the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'newsletter';
