// Quick environment setup script
// Run this to create your .env file with required variables

const fs = require('fs');
const path = require('path');

const envContent = `# Environment Variables for Vialifecoach Backend
# Created automatically - DO NOT COMMIT TO GIT

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Frontend Configuration
# Used for password-reset and login links in email messages
FRONTEND_URL=https://your-frontend-domain.com

# Admin Credentials
ADMIN_EMAIL=your-admin-email@domain.com
ADMIN_PASSWORD=your-secure-password-here
ADMIN_ROLE=admin

# JWT Configuration
JWT_SECRET=your-secure-jwt-secret-change-in-production
JWT_EXPIRE=7d
ACCESS_TOKEN_SECRET=your-secure-access-token-secret-change-in-production

# Server Configuration
NODE_ENV=development
PORT=5000
`;

const envPath = path.join(__dirname, '.env');

try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully!');
  console.log('📁 Location:', envPath);
  console.log('🔐 Credentials configured securely');
  console.log('⚠️  Remember: .env file should NOT be committed to Git');
  console.log('🚀 You can now run: npm run dev');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  process.exit(1);
}
