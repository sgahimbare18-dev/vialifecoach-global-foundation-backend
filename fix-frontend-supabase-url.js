// Frontend Supabase URL Fix
// Copy this code to your frontend configuration files

// WRONG URL (currently being used):
// const SUPABASE_URL = 'https://fvpucylojwgdhwwjkvzg.supabase.co';

// CORRECT URL (should be):
const SUPABASE_URL = 'https://cgxjqfjupscdrynazloy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxZmp1cHNjZHJ5bmF6bG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzA3NjEsImV4cCI6MjA5MDgwNjc2MX0.ccu92rWi1YDraYmrO3jFfgxxBw1Bs0XtgzIf5Pko7iA';

// Initialize Supabase with correct URL
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in frontend
window.supabaseClient = supabaseClient;

console.log('✅ Supabase client initialized with correct URL:', SUPABASE_URL);

// Test connection
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabaseClient.from('newsletter').select('count');
    if (error) throw error;
    console.log('✅ Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);
    return false;
  }
}

// Auto-test connection
testSupabaseConnection();
