const { supabase } = require('./utils/supabase');

async function testRLSAfterFix() {
    console.log('🔍 Testing RLS after fix...');
    
    try {
        // Test 1: Check if we can see feedback count
        console.log('\n📊 Testing feedback count access...');
        const { data: countData, error: countError } = await supabase
            .from('feedback')
            .select('count(*)', { count: 'exact', head: true });
            
        if (countError) {
            console.log('❌ Count access error:', countError.message);
        } else {
            console.log('✅ Feedback count accessible:', countData[0]?.count || 0);
        }
        
        // Test 2: Try to insert feedback (should work now)
        console.log('\n➕ Testing feedback insert...');
        const { data: insertData, error: insertError } = await supabase
            .from('feedback')
            .insert([{
                type: 'feedback',
                user_name: 'RLS Test User',
                user_email: 'rls@test.com',
                subject: 'RLS Test Feedback',
                message: 'Testing if RLS policies are fixed',
                status: 'pending'
            }])
            .select();
            
        if (insertError) {
            console.log('❌ Insert still blocked:', insertError.message);
            console.log('📋 RLS policies still too restrictive');
            
            // Try without any auth context (test if policies allow anonymous)
            console.log('\n🔓 Testing anonymous insert...');
            const { data: anonData, error: anonError } = await supabase
                .from('feedback')
                .insert([{
                    type: 'feedback',
                    user_name: 'Anonymous Test',
                    user_email: 'anon@test.com',
                    subject: 'Anonymous Test',
                    message: 'Testing anonymous access',
                    status: 'pending'
                }])
                .select();
                
            if (anonError) {
                console.log('❌ Anonymous insert also blocked:', anonError.message);
            } else {
                console.log('✅ Anonymous insert worked!');
                console.log('📄 Anonymous feedback ID:', anonData[0].id);
                
                // Clean up
                await supabase
                    .from('feedback')
                    .delete()
                    .eq('id', anonData[0].id);
                console.log('🧹 Anonymous test cleaned up');
            }
        } else {
            console.log('✅ Insert worked!');
            console.log('📄 Feedback ID:', insertData[0].id);
            
            // Clean up
            await supabase
                .from('feedback')
                .delete()
                .eq('id', insertData[0].id);
            console.log('🧹 Test data cleaned up');
        }
        
        // Test 3: Check if we can read feedback
        console.log('\n👁️ Testing feedback read access...');
        const { data: readData, error: readError } = await supabase
            .from('feedback')
            .select('*')
            .limit(5);
            
        if (readError) {
            console.log('❌ Read access error:', readError.message);
        } else {
            console.log('✅ Read access works!');
            console.log(`📝 Found ${readData.length} feedback entries`);
            if (readData.length > 0) {
                console.log('📋 Latest feedback:', readData[0].subject);
            }
        }
        
        return !insertError && !countError && !readError;
        
    } catch (error) {
        console.log('❌ Test error:', error.message);
        return false;
    }
}

// Run the test
testRLSAfterFix().then(success => {
    if (success) {
        console.log('\n🎉 RLS policies are working correctly!');
        console.log('\n🌐 Test feedback submission:');
        console.log('curl -X POST http://localhost:5000/api/feedback -H "Content-Type: application/json" -d \'{"type":"feedback","user_name":"Test User","user_email":"test@example.com","subject":"Test Feedback","message":"This is a test feedback message"}\'');
        console.log('\n📊 Test admin feedback:');
        console.log('curl -X GET http://localhost:5000/api/admin/feedback -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"');
    } else {
        console.log('\n❌ RLS policies still need fixing');
        console.log('\n📋 The issue might be:');
        console.log('1. RLS policies not applied correctly');
        console.log('2. Auth context not being passed properly');
        console.log('3. Supabase configuration issue');
    }
    process.exit(success ? 0 : 1);
});
