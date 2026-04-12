# Register Endpoint Fix

## Problem
The frontend is calling the register endpoint at `/api/auth/register`, but the backend only exposes `/api/auth/signup`.

## Recommended Backend Fix
Add a register route that reuses the same signup handler.

### Update `routes/auth.js`
Add this route:
```javascript
router.post('/register', signup);
```

### Resulting routes
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `PATCH /api/auth/reset-password`

## Alternative Frontend Quick Fix
If you want a faster temporary fix, change the frontend to call `/auth/signup` instead of `/auth/register`.

Example in the registration client logic:
```javascript
const response = await window.VialifeApi.apiRequest('/auth/signup', {
  method: 'POST',
  body: { name, email, password }
});
```

## Test the fix
```bash
curl -X POST https://vialifecoach-global-foundation-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456","name":"Test User"}'
```

## Notes
- Backend fix is recommended for compatibility with the existing frontend.
- No additional controller logic is required because `signup` already handles registration.
