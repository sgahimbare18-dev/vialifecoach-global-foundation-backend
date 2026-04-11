# Vialifecoach Global Foundation Backend API

A comprehensive Node.js backend API for the Vialifecoach Global Foundation NGO management system.

## 🚀 Features

- **User Management**: Registration, authentication, role-based access control
- **Form Processing**: Contact, partnership, booking, and volunteer applications
- **Admin Dashboard**: Complete management interface with analytics
- **Email Integration**: Automated email notifications and campaigns
- **File Upload**: Secure file handling for resumes and documents
- **Security**: Advanced security features including XSS protection, rate limiting, and input validation

## 📋 Prerequisites

- Node.js 16.0 or higher
- MongoDB 4.4 or higher
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vialifecoach-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/vialifecoach

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d

   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 📁 Project Structure

```
vialifecoach-backend/
├── models/                 # Database models
│   ├── User.js
│   ├── Booking.js
│   ├── Application.js
│   └── Newsletter.js
├── routes/                 # API routes
│   ├── auth.js
│   ├── forms.js
│   ├── admin.js
│   └── upload.js
├── utils/                  # Utility functions
│   ├── auth.js
│   ├── emailService.js
│   └── errorHandler.js
├── middleware/             # Custom middleware
│   └── security.js
├── uploads/               # File upload directory
├── .env.example           # Environment variables template
├── .gitignore            # Git ignore file
├── package.json          # Dependencies and scripts
├── server.js             # Main server file
└── README.md             # This file
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Forgot password
- `PATCH /api/auth/reset-password/:token` - Reset password
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Public Forms
- `POST /api/contact` - Submit contact form
- `POST /api/partnership` - Submit partnership inquiry
- `POST /api/bookings` - Book coaching session
- `POST /api/volunteer` - Submit volunteer application
- `POST /api/newsletter/subscribe` - Subscribe to newsletter

### Admin Management (Protected)
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/applications` - Get all applications
- `PUT /api/admin/applications/:id` - Update application status
- `GET /api/admin/bookings` - Get all bookings
- `PUT /api/admin/bookings/:id` - Update booking status
- `GET /api/admin/users` - Get all users
- `GET /api/admin/newsletter` - Get newsletter subscribers
- `POST /api/admin/newsletter/send` - Send newsletter campaign
- `GET /api/admin/stats/export` - Export data as CSV

### File Upload
- `POST /api/upload/single` - Upload single file (protected)
- `POST /api/upload/multiple` - Upload multiple files (protected)
- `POST /api/upload/resume` - Upload resume (public)
- `DELETE /api/upload/:filename` - Delete file (admin only)
- `GET /api/upload/files` - Get all uploaded files (admin only)

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Rate Limiting**: Prevent brute force attacks
- **XSS Protection**: Cross-site scripting prevention
- **Input Validation**: Comprehensive input sanitization
- **CORS Configuration**: Proper cross-origin resource sharing
- **File Upload Security**: File type and size validation
- **SQL Injection Prevention**: MongoDB query sanitization

## 📊 Database Schema

### Users Collection
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (admin|mentor|user),
  avatar: String,
  phone: String,
  bio: String,
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Bookings Collection
```javascript
{
  program: String,
  name: String,
  email: String,
  phone: String,
  preferredDate: Date,
  preferredTime: String,
  message: String,
  status: String (pending|confirmed|completed|cancelled),
  assignedMentor: ObjectId,
  sessionNotes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Applications Collection
```javascript
{
  name: String,
  email: String,
  phone: String,
  age: Number,
  location: String,
  motivation: String,
  experience: String,
  availability: String,
  skills: String,
  type: String (volunteer|mentor|partner|intern),
  status: String (pending|under_review|approved|rejected|interview_scheduled),
  resume: String,
  interviewDate: Date,
  interviewNotes: String,
  reviewedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### Newsletter Collection
```javascript
{
  email: String (unique),
  name: String,
  isActive: Boolean,
  subscribedAt: Date,
  unsubscribeToken: String,
  preferences: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 📧 Email Templates

The system includes automated email templates for:
- Welcome emails
- Booking confirmations
- Application status updates
- Password reset
- Newsletter campaigns
- Contact form notifications

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production database URL
3. Set up production email service
4. Configure CORS for production domain
5. Set up SSL/TLS certificates

### Using PM2
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name "vialifecoach-backend"

# Monitor
pm2 monit

# Restart
pm2 restart vialifecoach-backend
```

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📝 API Documentation

### Authentication Flow
1. User registers with email and password
2. Server creates user account and returns JWT token
3. Client includes token in Authorization header for protected routes
4. Token expires after configured time (default: 7 days)

### Error Handling
All errors follow this format:
```javascript
{
  "status": "error",
  "message": "Error description",
  "error": {} // Only in development
}
```

### Rate Limiting
- General API: 100 requests per 15 minutes per IP
- Sensitive endpoints: 5 requests per 15 minutes per IP

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Email: support@vialifecoach.org
- GitHub Issues: Create an issue in the repository

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Added file upload and enhanced security
- **v1.2.0** - Improved admin dashboard and analytics

---

**Vialifecoach Global Foundation** - Transforming lives through coaching and mentorship.
