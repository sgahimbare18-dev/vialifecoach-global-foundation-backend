// Frontend Supabase Client Configuration
// Add this to your frontend JavaScript before using Supabase

// Option 1: Using CDN (add to your HTML head)
/*
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const { createClient } = supabase;
  
  const supabase = createClient(
    'https://cgxjqfjupscdrynazloy.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxZmp1cHNjZHJ5bmF6bG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzA3NjEsImV4cCI6MjA5MDgwNjc2MX0.ccu92rWi1YDraYmrO3jFfgxxBw1Bs0XtgzIf5Pko7iA'
  );
</script>
*/

// Option 2: Using npm (if you have package.json)
/*
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cgxjqfjupscdrynazloy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxZmp1cHNjZHJ5bmF6bG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzA3NjEsImV4cCI6MjA5MDgwNjc2MX0.ccu92rWi1YDraYmrO3jFfgxxBw1Bs0XtgzIf5Pko7iA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
*/

// Option 3: Simple global variable (add to your admin-login.html head)
/*
<script>
  window.supabaseUrl = 'https://cgxjqfjupscdrynazloy.supabase.co';
  window.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxZmp1cHNjZHJ5bmF6bG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzA3NjEsImV4cCI6MjA5MDgwNjc2MX0.ccu92rWi1YDraYmrO3jFfgxxBw1Bs0XtgzIf5Pko7iA';
</script>
*/

// Test function to verify Supabase client is working
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    console.log('✅ Supabase client connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Supabase client error:', error.message);
    return false;
  }
}

// Admin login function using Supabase Auth
async function adminLogin(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (error) throw error;
    
    console.log('✅ Admin login successful:', data.user.email);
    return data;
  } catch (error) {
    console.error('❌ Admin login failed:', error.message);
    throw error;
  }
}

// Alternative: Use your backend API instead of direct Supabase
async function adminLoginViaBackend(email, password) {
  try {
    const response = await fetch('https://vialifecoach-global-foundation-backend.onrender.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    console.log('✅ Backend login successful');
    return data;
  } catch (error) {
    console.error('❌ Backend login failed:', error.message);
    throw error;
  }
}
