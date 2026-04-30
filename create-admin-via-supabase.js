// Create Admin User via Supabase Auth System
// This uses Supabase's built-in admin functions

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key from environment
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function createAdminUser() {
  try {
    console.log('Creating admin user via Supabase auth system...')
    
    // Step 1: Create user in auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { 
        role: process.env.ADMIN_ROLE || 'admin',
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
        email: process.env.ADMIN_EMAIL,
        role: process.env.ADMIN_ROLE || 'admin',
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
      .eq('email', process.env.ADMIN_EMAIL)
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
      console.log(`🎉 Admin user ${process.env.ADMIN_EMAIL} created successfully!`)
      console.log(`🔑 Login with: ${process.env.ADMIN_PASSWORD}`)
    } else {
      console.log('❌ Failed to create admin user')
    }
  })
  .catch(error => {
    console.error('Script execution failed:', error.message)
  })
