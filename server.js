const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const xss = require('xss');
const path = require('path');
require('dotenv').config();

// Import Supabase client
const { supabase, testConnection } = require('./utils/supabase');
const User = require('./models/UserSupabase');

// Import routes
const authRoutes = require('./routes/auth');
const formRoutes = require('./routes/forms');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const healingProgramRoutes = require('./routes/healingProgram');
const donationRoutes = require('./routes/donations');
const feedbackRoutes = require('./routes/feedback');

// Initialize Express app
const app = express();

// Security middleware (helmet with adjusted settings for CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));

// CORS configuration - Allow all origins for testing with HTML file
app.use(cors({
  origin: '*',  // Allow any origin (including file:// and localhost)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'X-User-Id', 'Origin', 'Accept']
}));

// Handle preflight requests
app.options('*', cors());

// Rate limiting (exclude healing program from strict limits)
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Webhook routes need raw body
app.use('/api/donations/webhook/stripe', express.raw({ type: 'application/json' }));
app.use('/api/donations/webhook/flutterwave', express.raw({ type: 'application/json' }));

// Body parsing middleware (skip raw webhook routes)
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/donations/webhook')) {
    return next();
  }
  return express.json({ limit: '10kb' })(req, res, next);
});

app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/donations/webhook')) {
    return next();
  }
  return express.urlencoded({ extended: true, limit: '10kb' })(req, res, next);
});

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Compression middleware
app.use(compression());

// Static files (for serving HTML directly)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection check
const testSupabaseConnection = async () => {
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      console.log('⚠️  Supabase connection warning - some tables may not exist yet');
    }
  } catch (error) {
    console.error('Error testing Supabase connection:', error.message);
  }
};

const ensureAdminUser = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) return;

  try {
    const normalizedEmail = String(adminEmail).trim().toLowerCase();
    let existing = await User.findOne({ email: normalizedEmail });

    if (!existing) {
      await User.create({
        name: 'Admin',
        email: normalizedEmail,
        password: adminPassword,
        role: 'admin'
      });
      console.log('✅ Admin user created from env credentials');
      return;
    }

    const updates = {};
    if (existing.role !== 'admin') {
      updates.role = 'admin';
    }

    const matches = await User.comparePassword(adminPassword, existing.password);
    if (!matches && existing.password === adminPassword) {
      updates.password = adminPassword;
    }

    if (Object.keys(updates).length > 0) {
      existing = await User.updateById(existing.id, updates);
      console.log('✅ Admin user updated from env credentials');
    }
  } catch (error) {
    console.error('Failed to ensure admin user:', error.message);
  }
};

testSupabaseConnection();
ensureAdminUser();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', formRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/healing', healingProgramRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/feedback', feedbackRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Vialifecoach Backend API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      healing_programs: '/api/healing/programs',
      auth: '/api/auth',
      admin: '/api/admin',
      feedback: '/api/feedback'
    }
  });
});

// Test feedback endpoint
app.get('/api/test-feedback', async (req, res) => {
  try {
    const { data, error } = await supabase.from('feedback').select('count(*)');
    res.json({
      success: true,
      message: 'Feedback table test',
      data: data,
      error: error
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Serve the main frontend page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the healing program HTML page
app.get('/healing', (req, res) => {
  res.sendFile(path.join(__dirname, 'healing-home.html'));
});

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Open in browser: http://localhost:${PORT}`);
  console.log(`🌐 Accessible from: http://10.0.72.247:${PORT}`);
  console.log(`🎵 Healing Program API: http://localhost:${PORT}/api/healing/programs`);
  console.log(`📄 Healing Program Page: http://localhost:${PORT}`);
});

module.exports = app;
