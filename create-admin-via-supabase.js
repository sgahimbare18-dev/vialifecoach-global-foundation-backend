// Create Admin User via Supabase Auth System
// This uses Supabase's built-in admin functions

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key
const supabase = createClient(
  'https://cgxjqfjupscdrynazloy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxZmp1cHNjZHJ5bmF6bG95Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMDc2MSwiZXhwIjoyMDkwODA2NzYxfQ.Xat_F4eCY5h2mJP-1HbfMQ5DiUhHuYomARK9dirsmbE',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function createAdminUser() {
  try {
    console.log('Creating admin user via Supabase auth system...')
    
    // Step 1: Create user in auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'sgahimbare@vialifecoach.org',
      password: 'Admin@2026Secure!',
      email_confirm: true,
      user_metadata: { 
        role: 'admin',
        name: 'Super Admin',
        department: 'IT Administration'
      }
    })
    
    if (authError) {
      console.error('Auth creation error:', authError.message)
      return false
    }
    
    console.log('✅ User created in auth.users:', authData.user.id)
    
    // Step 2: Add to public.users with admin role
    const { data: publicData, error: publicError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: 'sgahimbare@vialifecoach.org',
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (publicError) {
      console.error('Public users insert error:', publicError.message)
      return false
    }
    
    console.log('✅ User added to public.users:', publicData.id)
    
    // Step 3: Grant admin privileges
    const { error: grantError } = await supabase.rpc('grant_admin_privileges', {
      user_id: authData.user.id
    })
    
    if (grantError) {
      console.error('Grant error:', grantError.message)
      return false
    }
    
    console.log('✅ Admin privileges granted')
    
    // Step 4: Verify user creation
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'sgahimbare@vialifecoach.org')
      .single()
    
    if (verifyError) {
      console.error('Verification error:', verifyError.message)
      return false
    }
    
    console.log('✅ Admin user verification successful!')
    console.log('📋 User Details:', {
      id: verifyData.id,
      email: verifyData.email,
      role: verifyData.role,
      is_active: verifyData.is_active
    })
    
    return true
    
  } catch (error) {
    console.error('Unexpected error:', error.message)
    return false
  }
}

// Run the admin creation
createAdminUser()
  .then(success => {
    if (success) {
      console.log('🎉 Admin user sgahimbare@vialifecoach.org created successfully!')
      console.log('🔑 Login with: Admin@2026Secure!')
    } else {
      console.log('❌ Failed to create admin user')
    }
  })
  .catch(error => {
    console.error('Script execution failed:', error.message)
  })
