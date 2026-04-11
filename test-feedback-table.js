const { supabase } = require('./utils/supabase');

async function testFeedbackTable() {
    console.log('🔍 Testing feedback table existence...');
    
    try {
        // Test if table exists
        const { data: tableInfo, error: tableError } = await supabase
            .from('feedback')
            .select('count(*)')
            .limit(1);
            
        if (tableError) {
            console.log('❌ Feedback table NOT found:', tableError.message);
            console.log('\n📋 SOLUTION: Run this SQL in Supabase:');
            console.log('----------------------------------------');
            console.log(`
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
            `);
            console.log('----------------------------------------');
            return false;
        }
        
        console.log('✅ Feedback table exists!');
        
        // Test inserting a sample feedback
        console.log('\n🧪 Testing feedback insertion...');
        const { data: insertData, error: insertError } = await supabase
            .from('feedback')
            .insert([{
                type: 'feedback',
                user_name: 'Test User',
                user_email: 'test@example.com',
                subject: 'Test Feedback',
                message: 'This is a test feedback message',
                status: 'pending'
            }])
            .select();
            
        if (insertError) {
            console.log('❌ Failed to insert test feedback:', insertError.message);
        } else {
            console.log('✅ Test feedback inserted successfully!');
            console.log('📄 Test feedback ID:', insertData[0].id);
            
            // Clean up test data
            await supabase
                .from('feedback')
                .delete()
                .eq('id', insertData[0].id);
            console.log('🧹 Test data cleaned up');
        }
        
        // Test fetching feedback
        console.log('\n📥 Testing feedback retrieval...');
        const { data: fetchData, error: fetchError } = await supabase
            .from('feedback')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (fetchError) {
            console.log('❌ Failed to fetch feedback:', fetchError.message);
        } else {
            console.log('✅ Feedback retrieved successfully!');
            console.log(`📊 Found ${fetchData.length} feedback entries`);
            if (fetchData.length > 0) {
                console.log('📝 Latest feedback:', fetchData[0].subject);
            }
        }
        
        return true;
        
    } catch (error) {
        console.log('❌ Unexpected error:', error.message);
        return false;
    }
}

// Run the test
testFeedbackTable().then(success => {
    if (success) {
        console.log('\n🎉 Feedback table is ready for use!');
        console.log('\n🌐 Test admin feedback endpoint:');
        console.log('curl -X GET http://localhost:5000/api/admin/feedback -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"');
    } else {
        console.log('\n❌ Feedback table setup failed. Please run the SQL script first.');
    }
    process.exit(success ? 0 : 1);
});
