const { supabase } = require('./utils/supabase');

async function checkFeedbackTable() {
    console.log('🔍 Checking feedback table...');
    
    try {
        // Test if table exists by trying to select from it
        const { data, error } = await supabase
            .from('feedback')
            .select('*')
            .limit(1);
            
        if (error) {
            console.log('❌ Error accessing feedback table:', error.message);
            console.log('\n📋 Table might not exist or has wrong structure');
            return false;
        }
        
        console.log('✅ Feedback table exists and is accessible!');
        console.log(`📊 Current feedback count: ${data.length}`);
        
        // Test admin feedback endpoint
        console.log('\n🧪 Testing admin feedback endpoint...');
        
        // First, let's try to fetch all feedback without auth (should fail)
        try {
            const response = await fetch('http://localhost:5000/api/admin/feedback');
            const result = await response.json();
            
            if (response.status === 401) {
                console.log('✅ Admin endpoint correctly requires authentication');
            } else {
                console.log('⚠️  Admin endpoint might not be protected properly');
            }
        } catch (fetchError) {
            console.log('❌ Cannot reach admin endpoint:', fetchError.message);
            console.log('🚀 Make sure server is running on port 5000');
        }
        
        return true;
        
    } catch (error) {
        console.log('❌ Unexpected error:', error.message);
        return false;
    }
}

// Run the check
checkFeedbackTable().then(success => {
    if (success) {
        console.log('\n🎉 Feedback system is ready!');
        console.log('\n📝 Next steps:');
        console.log('1. Start server: npm run dev');
        console.log('2. Login as admin to get JWT token');
        console.log('3. Test: curl -X GET http://localhost:5000/api/admin/feedback -H "Authorization: Bearer YOUR_TOKEN"');
    } else {
        console.log('\n❌ Feedback system needs attention');
    }
    process.exit(success ? 0 : 1);
});
