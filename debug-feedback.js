const { supabase } = require('./utils/supabase');

async function debugFeedbackSubmission() {
    console.log('🔍 Debugging feedback submission...');
    
    try {
        // Test 1: Direct database insert
        console.log('\n📝 Testing direct database insert...');
        const { data: directInsert, error: directError } = await supabase
            .from('feedback')
            .insert([{
                type: 'feedback',
                user_name: 'Debug User',
                user_email: 'debug@example.com',
                subject: 'Debug Feedback',
                message: 'This is a debug test message',
                status: 'pending'
            }])
            .select();
            
        if (directError) {
            console.log('❌ Direct insert failed:', directError.message);
            console.log('Details:', directError);
        } else {
            console.log('✅ Direct insert successful!');
            console.log('📄 Inserted data:', directInsert[0]);
            
            // Clean up
            await supabase
                .from('feedback')
                .delete()
                .eq('id', directInsert[0].id);
            console.log('🧹 Test data cleaned up');
        }
        
        // Test 2: API route insert
        console.log('\n🌐 Testing API route insert...');
        const response = await fetch('http://localhost:5000/api/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'feedback',
                user_name: 'API Test User',
                user_email: 'apitest@example.com',
                subject: 'API Test Feedback',
                message: 'This is an API test message'
            })
        });
        
        const result = await response.json();
        console.log('📊 API Response:', result);
        
        if (result.success) {
            console.log('✅ API insert successful!');
            console.log('📄 Feedback ID:', result.data.id);
            
            // Verify it was actually stored
            const { data: verifyData, error: verifyError } = await supabase
                .from('feedback')
                .select('*')
                .eq('id', result.data.id);
                
            if (verifyError) {
                console.log('❌ Verification failed:', verifyError.message);
            } else if (verifyData.length === 0) {
                console.log('❌ Data not found in database!');
            } else {
                console.log('✅ Data verified in database!');
                console.log('📝 Stored data:', verifyData[0]);
                
                // Clean up test data
                await supabase
                    .from('feedback')
                    .delete()
                    .eq('id', result.data.id);
                console.log('🧹 Test data cleaned up');
            }
        } else {
            console.log('❌ API insert failed:', result);
        }
        
        // Test 3: Check table structure
        console.log('\n🏗️ Checking table structure...');
        const { data: tableData, error: tableError } = await supabase
            .from('feedback')
            .select('*')
            .limit(1);
            
        if (tableError) {
            console.log('❌ Table structure error:', tableError.message);
        } else {
            console.log('✅ Table structure OK');
            console.log('📊 Columns:', Object.keys(tableData[0] || {}));
        }
        
        // Test 4: Check RLS policies
        console.log('\n🔒 Checking RLS policies...');
        const { data: rlsData, error: rlsError } = await supabase
            .from('feedback')
            .select('count(*)', { count: 'exact', head: true });
            
        if (rlsError) {
            console.log('❌ RLS policy error:', rlsError.message);
            console.log('📋 This might be why data isn\'t stored - RLS is blocking inserts');
        } else {
            console.log('✅ RLS policies OK');
            console.log(`📊 Total feedback count: ${rlsData[0]?.count || 0}`);
        }
        
    } catch (error) {
        console.log('❌ Debug error:', error.message);
    }
}

// Run the debug
debugFeedbackSubmission().then(() => {
    console.log('\n🎯 Debug complete!');
    process.exit(0);
});
