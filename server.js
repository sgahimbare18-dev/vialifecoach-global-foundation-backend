const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Supabase
const { supabase, testConnection } = require('./utils/supabase');
const User = require('./models/UserSupabase');

// Routes
const authRoutes = require('./routes/auth');
const formRoutes = require('./routes/forms');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const healingProgramRoutes = require('./routes/healingProgram');
const donationRoutes = require('./routes/donations');
const feedbackRoutes = require('./routes/feedback');

const app = express();

/* =========================
   SECURITY
========================= */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));

app.options('*', cors());

/* =========================
   RATE LIMIT
========================= */
app.use('/api/', rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100
}));

/* =========================
   BODY PARSING
========================= */
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/donations/webhook')) return next();
  express.json({ limit: '10kb' })(req, res, next);
});

app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/donations/webhook')) return next();
  express.urlencoded({ extended: true, limit: '10kb' })(req, res, next);
});

/* =========================
   LOGGING
========================= */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(compression());

/* =========================
   STATIC FILES (FIXED)
========================= */
// FIX: serve from root (NOT /public)
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* =========================
   SUPABASE CHECK
========================= */
const testSupabaseConnection = async () => {
  try {
    const ok = await testConnection();
    if (!ok) console.log('⚠️ Supabase connection issue');
  } catch (err) {
    console.error('Supabase error:', err.message);
  }
};

testSupabaseConnection();

/* =========================
   ROUTES
========================= */
app.use('/api/auth', authRoutes);
app.use('/api', formRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/healing', healingProgramRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/feedback', feedbackRoutes);

/* =========================
   HEALTH CHECK
========================= */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Vialifecoach API running',
    time: new Date().toISOString()
  });
});

/* =========================
   FRONTEND ROUTES (FIXED)
========================= */

// Home → your ONLY HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'healing-home.html'));
});

// optional alias
app.get('/healing', (req, res) => {
  res.sendFile(path.join(__dirname, 'healing-home.html'));
});

/* =========================
   HANDLE OTHER HTML FILES SAFELY
========================= */
app.get('/:page.html', (req, res, next) => {
  const filePath = path.join(__dirname, req.params.page + '.html');
  res.sendFile(filePath, err => {
    if (err) next();
  });
});

/* =========================
   404
========================= */
app.all('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.originalUrl}`
  });
});

/* =========================
   ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    status: 'error',
    message: err.message
  });
});

/* =========================
   START SERVER (RENDER SAFE)
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Health: /api/health`);
});

module.exports = app;