require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Debug - Show actual URL (first few characters for safety)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.SUPABASE_KEY;

console.log('✓ Loading Supabase configuration...');
console.log('  SUPABASE_URL exists:', !!url);
console.log('  SUPABASE_URL value:', url);
console.log('  SUPABASE_URL type:', typeof url);
console.log('  SUPABASE_URL length:', url ? url.length : 0);
console.log('  First 20 chars:', url ? url.substring(0, 20) : 'N/A');
console.log('  SUPABASE_KEY exists:', !!key);

// Validate
if (!url) {
  console.error('❌ SUPABASE_URL is not defined in .env file');
  console.error('Please add NEXT_PUBLIC_SUPABASE_URL to your .env file');
  throw new Error('SUPABASE_URL is not defined in .env file');
}

if (!key) {
  console.error('❌ SUPABASE_KEY is not defined in .env file');
  console.error('Please add NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env file');
  throw new Error('SUPABASE_KEY is not defined in .env file');
}

if (!url.match(/^https?:\/\//i)) {
  console.error('❌ Invalid URL format. URL must start with http:// or https://');
  console.error('Current URL:', url);
  throw new Error('SUPABASE_URL must start with http:// or https://');
}

// Create Supabase client
const supabase = createClient(
  url,
  key,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

console.log('✓ Supabase client initialized successfully');

// Test connection with a simple query
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection test failed:', error.message);
      return false;
    }
    
    console.log('✓ Supabase connection test successful');
    return true;
  } catch (err) {
    console.error('❌ Supabase connection test error:', err.message);
    return false;
  }
};

// Export both client and test function
module.exports = { supabase, testConnection };