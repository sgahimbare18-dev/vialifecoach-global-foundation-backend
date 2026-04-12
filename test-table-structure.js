const { supabase } = require('./utils/supabase');

async function testTableStructure() {
    console.log('Testing table structure...');
    
    try {
        // Try to select password reset fields to see if they exist
        const { data, error } = await supabase
            .from('users')
            .select('id, email, password_reset_token, password_reset_expires, password_changed_at')
            .limit(1);
            
        if (error) {
            console.log('Error selecting password reset fields:', error.message);
            
            // Check if it's a "column does not exist" error
            if (error.message.includes('column') && error.message.includes('does not exist')) {
                console.log('Password reset fields are missing. Need to run SQL migration.');
                return false;
            } else {
                console.log('Other error:', error.message);
                return false;
            }
        }
        
        console.log('Password reset fields exist and are accessible!');
        return true;
        
    } catch (error) {
        console.error('Test failed:', error.message);
        return false;
    }
}

testTableStructure();
