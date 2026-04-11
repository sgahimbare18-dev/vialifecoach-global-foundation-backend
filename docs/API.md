# Vialifecoach Backend API Documentation

## Base URL
```
Development: http://localhost:5000
Production: https://your-domain.com
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Response Format
All API responses follow this structure:

### Success Response
```json
{
  "status": "success",
  "data": {
    // Response data
  },
  "message": "Success message"
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error description",
  "error": {} // Only in development mode
}
```

## Authentication Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123",
  "role": "user" // optional: user, mentor, admin
}
```

### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "Password123"
}
```

### Get User Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

### Update User Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Updated",
  "email": "johnupdated@example.com",
  "phone": "+1234567890",
  "bio": "Updated bio"
}
```

### Change Password
```http
PUT /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

### Reset Password
```http
PATCH /api/auth/reset-password/<token>
Content-Type: application/json

{
  "password": "NewPassword123"
}
```

## Form Processing Endpoints

### Contact Form
```http
POST /api/contact
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "subject": "General Inquiry",
  "message": "I would like to know more about your programs..."
}
```

### Partnership Form
```http
POST /api/partnership
Content-Type: application/json

{
  "organizationName": "Example Corp",
  "contactPerson": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "partnershipType": "collaboration",
  "description": "We would like to partner with your organization...",
  "website": "https://example.com"
}
```

### Booking Form
```http
POST /api/bookings
Content-Type: application/json

{
  "program": "Life Coaching",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "preferredDate": "2024-01-15",
  "preferredTime": "Morning (9AM-12PM)",
  "message": "Looking forward to the session"
}
```

### Volunteer Application
```http
POST /api/volunteer
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "age": 25,
  "location": "New York, USA",
  "motivation": "I want to help others...",
  "experience": "Previous volunteer experience...",
  "availability": "Weekends only",
  "skills": "Teaching, mentoring"
}
```

### Newsletter Subscription
```http
POST /api/newsletter/subscribe
Content-Type: application/json

{
  "email": "john@example.com",
  "name": "John Doe",
  "preferences": "all" // optional: all, events, newsletter, updates
}
```

## Donation Endpoints

### Create Donation Checkout
```http
POST /api/donations/checkout
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phone": "+254712345678",
  "amount": 50,
  "currency": "USD",
  "frequency": "once", // once, weekly, monthly, quarterly, yearly
  "paymentMethod": "card", // card (Flutterwave Standard), mpesa, bank
  "anonymous": false,
  "updates": true
}
```

Card payments return a `checkout_url` you should redirect the donor to. M-Pesa returns a prompt message instead.

### Check Donation Status
```http
GET /api/donations/status/<reference>
```

### Stripe Webhook (Optional)
```http
POST /api/donations/webhook/stripe
```

### Flutterwave Webhook
```http
POST /api/donations/webhook/flutterwave
```

## Admin Endpoints (Protected)

### Dashboard Statistics
```http
GET /api/admin/dashboard
Authorization: Bearer <admin-token>
```

### Get Applications
```http
GET /api/admin/applications?status=pending&type=volunteer&page=1&limit=10
Authorization: Bearer <admin-token>
```

### Update Application Status
```http
PUT /api/admin/applications/<application-id>
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "approved",
  "interviewDate": "2024-01-20T10:00:00Z",
  "interviewNotes": "Strong candidate"
}
```

### Get Bookings
```http
GET /api/admin/bookings?status=pending&program=Life%20Coaching&page=1&limit=10
Authorization: Bearer <admin-token>
```

### Update Booking Status
```http
PUT /api/admin/bookings/<booking-id>
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "confirmed",
  "assignedMentor": "mentor-id",
  "sessionNotes": "Initial consultation completed"
}
```

### Get Users
```http
GET /api/admin/users?role=user&isActive=true&page=1&limit=10
Authorization: Bearer <admin-token>
```

### Get Newsletter Subscribers
```http
GET /api/admin/newsletter?isActive=true&page=1&limit=10
Authorization: Bearer <admin-token>
```

### Get Donations
```http
GET /api/admin/donations?status=succeeded&payment_method=card&page=1&limit=20
Authorization: Bearer <admin-token>
```

### Send Newsletter Campaign
```http
POST /api/admin/newsletter/send
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "subject": "Monthly Newsletter",
  "content": "<h1>Newsletter Content</h1><p>...</p>",
  "preferences": "all"
}
```

### Export Statistics
```http
GET /api/admin/stats/export?type=bookings
Authorization: Bearer <admin-token>
```

## File Upload Endpoints

### Upload Single File
```http
POST /api/upload/single
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
```

### Upload Multiple Files
```http
POST /api/upload/multiple
Authorization: Bearer <token>
Content-Type: multipart/form-data

files: <file1>
files: <file2>
files: <file3>
```

### Upload Resume
```http
POST /api/upload/resume
Content-Type: multipart/form-data

resume: <file>
```

### Delete File
```http
DELETE /api/upload/<filename>
Authorization: Bearer <admin-token>
```

### Get All Files
```http
GET /api/upload/files
Authorization: Bearer <admin-token>
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 409 | Conflict - Duplicate resource |
| 413 | Payload Too Large |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP
- **File Upload**: 10 requests per hour per IP

## File Upload Limits

- **Maximum file size**: 5MB
- **Allowed image types**: JPEG, JPG, PNG, GIF
- **Allowed document types**: PDF, DOC, DOCX, TXT
- **Maximum files per request**: 5

## Security Headers

All responses include the following security headers:
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'self'...`

## Data Validation

All input data is validated and sanitized:
- Email format validation
- Phone number validation
- String length limits
- XSS protection
- SQL injection prevention
- File type validation

## Pagination

List endpoints support pagination:
```http
GET /endpoint?page=2&limit=20
```

Response includes pagination metadata:
```json
{
  "status": "success",
  "results": 20,
  "total": 100,
  "pages": 5,
  "currentPage": 2,
  "data": {
    "items": []
  }
}
```

## Filtering

Many endpoints support filtering:
```http
GET /api/admin/bookings?status=pending&program=Life%20Coaching
GET /api/admin/applications?type=volunteer&status=approved
GET /api/admin/users?role=mentor&isActive=true
```

## Sorting

List endpoints support sorting (where applicable):
```http
GET /endpoint?sort=createdAt&order=desc
GET /endpoint?sort=name&order=asc
```

## Search

Some endpoints support search functionality:
```http
GET /api/admin/users?search=john
GET /api/admin/applications?search=teaching
```

## Webhooks

The system can be configured to send webhook notifications for specific events:
- New booking created
- Application status changed
- User registered
- Newsletter subscribed

Configure webhooks in the environment variables:
```env
WEBHOOK_URL=https://your-webhook-endpoint.com
WEBHOOK_SECRET=your-webhook-secret
```
