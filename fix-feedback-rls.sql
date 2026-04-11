-- Drop existing restrictive RLS policies
DROP POLICY IF EXISTS "Admins can manage feedback" ON feedback;
DROP POLICY IF EXISTS "Users can create feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;

-- Create new, less restrictive policies
-- Allow anyone to insert feedback (for public forms)
CREATE POLICY "Allow feedback submission" ON feedback
    FOR INSERT WITH CHECK (true);

-- Allow admins to do everything
CREATE POLICY "Admins can manage feedback" ON feedback
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.uid()::text = users.email 
            AND users.role = 'admin'
        )
    );

-- Allow users to view their own feedback
CREATE POLICY "Users can view own feedback" ON feedback
    FOR SELECT USING (
        auth.uid()::text = user_email
    );

-- Allow users to update their own feedback
CREATE POLICY "Users can update own feedback" ON feedback
    FOR UPDATE USING (
        auth.uid()::text = user_email
    );

-- Allow admins to update any feedback
CREATE POLICY "Admins can update any feedback" ON feedback
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.uid()::text = users.email 
            AND users.role = 'admin'
        )
    );
