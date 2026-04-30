const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dotenv = require('dotenv');
const { initRealtime } = require('./utils/realtime');

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
const server = http.createServer(app);

// Trust proxy for production deployments behind reverse proxy
app.set('trust proxy', 1);

// Security middleware (helmet with adjusted settings for CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));

const normalizeOrigin = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return value.trim();
  }
};

const defaultAllowedOrigins = [
  'https://www.vialifecoach.org',
  'https://vialifecoach.org',
  'https://academy.vialifecoach.org'
];

const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : defaultAllowedOrigins)
    .map((value) => normalizeOrigin(value))
);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true);
    
    if (allowedOrigins.has(origin)) return callback(null, true);
    
    // Reject other origins
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));

app.options('*', cors());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));

    const secret = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'vialifecoach_default_jwt_secret_change_in_production';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id);

    if (!user) return next(new Error('User not found'));
    if (user.role !== 'admin') return next(new Error('Admin access required'));

    socket.user = user;
    return next();
  } catch (error) {
    return next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.join('admin');
});

initRealtime(io);

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100
}));

// Body parsing
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/donations/webhook')) return next();
  express.json({ limit: '10kb' })(req, res, next);
});

app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/donations/webhook')) return next();
  express.urlencoded({ extended: true, limit: '10kb' })(req, res, next);
});

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(compression());

// Static files (uploads only)
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

// Root route - API status and information
app.get('/', (req, res) => {
  res.json({ 
    message: 'Vialifecoach API is running',
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      feedback: '/api/feedback',
      admin: '/api/admin',
      healingPrograms: '/api/healing/programs',
      donations: '/api/donations',
      bookings: '/api/bookings',
      newsletters: '/api/newsletters',
      uploads: '/api/upload',
      health: '/api/health'
    },
    documentation: 'API endpoints available for frontend connections'
  });
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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\u2705 Server running on port ${PORT}`);
  console.log(`\ud83c\udf0e Open in browser: http://localhost:${PORT}`);
  console.log(`\ud83c\udf0e Accessible from: http://10.0.72.247:${PORT}`);
  console.log(`\ud83c\udfb5 Healing Program API: http://localhost:${PORT}/api/healing/programs`);
  console.log(`\ud83d\udce1 API Base URL: http://localhost:${PORT}/api`);
});

module.exports = app;
