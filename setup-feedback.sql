-- Create feedback table for admin dashboard
CREATE TABLE feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('feedback', 'query')),
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'responded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policy for feedback access (admin only)
CREATE POLICY "Admins can manage feedback" ON feedback
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.uid()::text = users.email 
            AND users.role = 'admin'
        )
    );

-- Create policy for feedback submission (all users)
CREATE POLICY "Users can create feedback" ON feedback
    FOR INSERT WITH CHECK (true);

-- Create policy for feedback viewing (users can see their own)
CREATE POLICY "Users can view own feedback" ON feedback
    FOR SELECT USING (
        auth.uid()::text = user_email
    );
