const { supabase } = require('./utils/supabase');

async function testFeedbackSystem() {
    console.log('🔍 Testing Feedback System End-to-End');
    
    try {
        // Test 1: Check feedback table exists and has data
        console.log('\n1️⃣ Testing feedback table access...');
        const { data: feedbackData, error: feedbackError } = await supabase
            .from('feedback')
            .select('*')
            .limit(5);
            
        if (feedbackError) {
            console.log('❌ Feedback table error:', feedbackError.message);
            return;
        }
        
        console.log(`✅ Feedback table accessible. Found ${feedbackData.length} records`);
        
        // Test 2: Test feedback creation
        console.log('\n2️⃣ Testing feedback creation...');
        const testFeedback = {
            type: 'query',
            subject: 'Test Query',
            message: 'This is a test query from the system',
            user_name: 'Test User',
            user_email: 'test@example.com',
            status: 'pending'
        };
        
        const { data: createdFeedback, error: createError } = await supabase
            .from('feedback')
            .insert([testFeedback])
            .select()
            .single();
            
        if (createError) {
            console.log('❌ Feedback creation error:', createError.message);
        } else {
            console.log('✅ Feedback created successfully:', createdFeedback.id);
        }
        
        // Test 3: Test admin feedback endpoint
        console.log('\n3️⃣ Testing admin feedback endpoint...');
        try {
            const response = await fetch('https://vialifecoach-global-foundation-backend.onrender.com/api/admin/feedback', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test_token'
                }
            });
            
            if (response.ok) {
                const adminData = await response.json();
                console.log('✅ Admin feedback endpoint working:', adminData);
            } else {
                console.log('❌ Admin feedback endpoint failed:', response.status);
            }
        } catch (error) {
            console.log('❌ Admin endpoint error:', error.message);
        }
        
        // Test 4: Test feedback submission
        console.log('\n4️⃣ Testing feedback submission...');
        try {
            const submitResponse = await fetch('https://vialifecoach-global-foundation-backend.onrender.com/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'compliment',
                    subject: 'Great System!',
                    message: 'The feedback system is working perfectly',
                    user_name: 'Happy User',
                    user_email: 'happy@example.com'
                })
            });
            
            if (submitResponse.ok) {
                const submitData = await submitResponse.json();
                console.log('✅ Feedback submission working:', submitData);
            } else {
                console.log('❌ Feedback submission failed:', submitResponse.status);
            }
        } catch (error) {
            console.log('❌ Feedback submission error:', error.message);
        }
        
        console.log('\n✅ Feedback system test completed!');
        console.log('📊 Test Summary:');
        console.log(`   - Feedback table: ${feedbackData.length} records`);
        console.log(`   - Creation test: ${createError ? 'FAILED' : 'PASSED'}`);
        console.log(`   - Admin endpoint: ${response.ok ? 'WORKING' : 'FAILED'}`);
        console.log(`   - Submission test: ${submitResponse.ok ? 'WORKING' : 'FAILED'}`);
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testFeedbackSystem();
