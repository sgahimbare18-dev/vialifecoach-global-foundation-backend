const { supabase } = require('./utils/supabase');

async function checkUsersTable() {
    console.log('Checking users table structure...');
    
    try {
        // Check if table exists and get structure
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .limit(1);
            
        if (error) {
            console.log('Error accessing users table:', error.message);
            return;
        }
        
        if (users.length === 0) {
            console.log('No users found, but table exists');
            
            // Try to insert a test user to check the structure
            const { data: testUser, error: insertError } = await supabase
                .from('users')
                .select('*')
                .limit(1);
                
            if (insertError) {
                console.log('Error checking table structure:', insertError.message);
            } else {
                console.log('Table structure check passed');
            }
        } else {
            console.log('Users table fields:', Object.keys(users[0]));
            
            // Check for password reset fields
            const user = users[0];
            const hasResetToken = user.password_reset_token !== undefined;
            const hasResetExpires = user.password_reset_expires !== undefined;
            const hasPasswordChanged = user.password_changed_at !== undefined;
            
            console.log('Has password_reset_token:', hasResetToken);
            console.log('Has password_reset_expires:', hasResetExpires);
            console.log('Has password_changed_at:', hasPasswordChanged);
            
            if (!hasResetToken || !hasResetExpires || !hasPasswordChanged) {
                console.log('Missing password reset fields. Run the SQL migration script.');
            } else {
                console.log('Password reset fields exist!');
            }
        }
        
    } catch (error) {
        console.error('Check failed:', error.message);
    }
}

checkUsersTable();
