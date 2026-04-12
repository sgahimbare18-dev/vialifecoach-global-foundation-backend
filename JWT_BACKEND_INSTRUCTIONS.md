# JWT Backend Configuration Instructions

## 1. Install dotenv
Install dotenv if it is not already present:
```bash
npm install dotenv
```

## 2. Load environment variables at server startup
In the main server file (`server.js`), load environment variables from `.env.development` during development and fallback to `.env` if needed:
```javascript
const dotenv = require('dotenv');
const envPath = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: envPath });
if (!process.env.JWT_SECRET && envPath === '.env.development') {
  dotenv.config({ path: '.env' });
}

console.log('Environment Variables:', {
  JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Missing',
  NODE_ENV: process.env.NODE_ENV || 'undefined',
  ENV_FILE: envPath
});

if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET is missing. Set JWT_SECRET in .env or .env.development.');
}
```

## 3. Use JWT_SECRET in JWT configuration
Update JWT signing and verification to use `process.env.JWT_SECRET`.

Example in `utils/auth.js`:
```javascript
const secret = process.env.JWT_SECRET;
if (!secret) throw new AppError('JWT secret missing', 500);

return jwt.sign({ id }, secret, {
  expiresIn: process.env.JWT_EXPIRE || '7d'
});
```

Example verification in `utils/auth.js`:
```javascript
const secret = process.env.JWT_SECRET;
if (!secret) throw new AppError('JWT secret missing', 500);
const decoded = jwt.verify(token, secret);
```

## 4. Set JWT_SECRET in development and production
Add or update your environment file with:
```env
JWT_SECRET=vialifecoach_jwt_secret_key_2024_secure_token_generation
```

If your development environment uses `.env.development`, add the same key there.

## 5. Render production setup
In Render dashboard, add the environment variable:
- Key: `JWT_SECRET`
- Value: `vialifecoach_jwt_secret_key_2024_secure_token_generation`

## 6. Verify the fix
Confirm the backend can read the secret by checking the startup log messages:
```javascript
console.log('Environment Variables:', {
  JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Missing',
  NODE_ENV: process.env.NODE_ENV
});
```

## Expected result
- No more `JWT secret missing` errors
- Login tokens sign correctly
- Authentication works in development and production
- Backend reads environment variables properly
