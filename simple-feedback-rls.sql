-- Simple RLS policies for feedback table
-- Remove all existing policies first
DROP POLICY IF EXISTS "Admins can manage feedback" ON feedback;
DROP POLICY IF EXISTS "Users can create feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
DROP POLICY IF EXISTS "Allow feedback submission" ON feedback;
DROP POLICY IF EXISTS "Users can update own feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can update any feedback" ON feedback;

-- Simple policy: Allow anyone to insert feedback (for forms)
CREATE POLICY "Enable feedback insertion" ON feedback
    FOR INSERT WITH CHECK (true);

-- Simple policy: Allow anyone to select feedback (for admin dashboard)
CREATE POLICY "Enable feedback selection" ON feedback
    FOR SELECT USING (true);

-- Simple policy: Allow anyone to update feedback (for marking as read)
CREATE POLICY "Enable feedback update" ON feedback
    FOR UPDATE USING (true);
