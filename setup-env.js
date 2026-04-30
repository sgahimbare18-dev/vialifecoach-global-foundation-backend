// Quick environment setup script
// Run this to create your .env file with required variables

const fs = require('fs');
const path = require('path');

const envContent = `# Environment Variables for Vialifecoach Backend
# Created automatically - DO NOT COMMIT TO GIT

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://cgxjqfjupscdrynazloy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxZmp1cHNjZHJ5bmF6bG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzA3NjEsImV4cCI6MjA5MDgwNjc2MX0.ccu92rWi1YDraYmrO3jFfgxxBw1Bs0XtgzIf5Pko7iA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxZmp1cHNjZHJ5bmF6bG95Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMDc2MSwiZXhwIjoyMDkwODA2NzYxfQ.Xat_F4eCY5h2mJP-1HbfMQ5DiUhHuYomARK9dirsmbE

# Admin Credentials
ADMIN_EMAIL=sgahimbare@vialifecoach.org
ADMIN_PASSWORD=Si82monG@
ADMIN_ROLE=admin

# JWT Configuration
JWT_SECRET=vialifecoach_default_jwt_secret_change_in_production
JWT_EXPIRE=7d
ACCESS_TOKEN_SECRET=vialifecoach_access_token_secret_change_in_production

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
