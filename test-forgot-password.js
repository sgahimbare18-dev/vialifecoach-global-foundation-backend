const { supabase } = require('./utils/supabase');

async function testForgotPassword() {
    console.log('Testing forgot password functionality...');
    
    try {
        // Check if users table has password reset fields
        console.log('1. Checking users table structure...');
        const { data: tableInfo, error: tableError } = await supabase
            .from('users')
            .select('*')
            .limit(1);
            
        if (tableError) {
            console.log('Error accessing users table:', tableError.message);
            return;
        }
        
        if (tableInfo.length > 0) {
            console.log('Users table fields:', Object.keys(tableInfo[0]));
            
            const user = tableInfo[0];
            const hasResetFields = user.password_reset_token !== undefined || 
                                 user.password_reset_expires !== undefined;
            
            console.log('Has password reset fields:', hasResetFields);
            
            if (!hasResetFields) {
                console.log('Adding password reset fields to users table...');
                // This would require a SQL migration
                console.log('SQL needed: ALTER TABLE users ADD COLUMN password_reset_token TEXT;');
                console.log('SQL needed: ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP;');
            }
        } else {
            console.log('No users found in table');
        }
        
        // Test forgot password API endpoint
        console.log('\n2. Testing forgot password API...');
        const testEmail = 'test@example.com';
        
        const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: testEmail })
        });
        
        const result = await response.json();
        console.log('API Response:', result);
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testForgotPassword();
