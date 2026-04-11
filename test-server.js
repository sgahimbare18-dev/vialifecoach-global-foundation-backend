const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Vialifecoach Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test email endpoint
app.post('/api/test-email', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || 'smtp.zoho.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: req.body.to || 'test@example.com',
      subject: 'Test Email from Vialifecoach Backend',
      text: 'This is a test email to verify the email service is working.',
      html: '<h2>Test Email</h2><p>This is a test email to verify the email service is working.</p>',
    });

    res.status(200).json({
      status: 'success',
      message: 'Test email sent successfully'
    });
  } catch (error) {
    console.error('Email test failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Email test failed',
      error: error.message
    });
  }
});

// Test Supabase endpoint
app.post('/api/test-supabase', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test connection
    const { data, error } = await supabase.from('users').select('count').single();
    
    if (error) {
      throw error;
    }

    res.status(200).json({
      status: 'success',
      message: 'Supabase connection successful',
      data: { userCount: data.count }
    });
  } catch (error) {
    console.error('Supabase test failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Supabase connection failed',
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📧 Email test: POST http://localhost:${PORT}/api/test-email`);
  console.log(`🗄️  Supabase test: POST http://localhost:${PORT}/api/test-supabase`);
  console.log('\n⚠️  Remember to update your .env file with:');
  console.log('- SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  console.log('- EMAIL_USER');
  console.log('- EMAIL_PASS');
});

module.exports = app;
