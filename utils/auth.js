const jwt = require('jsonwebtoken');
const User = require('../models/UserSupabase');
const { supabase } = require('./supabase');
const { catchAsync, AppError } = require('../utils');

const signToken = (id) => {
  const secret = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'vialifecoach_default_jwt_secret_change_in_production';
  if (!secret) throw new AppError('JWT secret missing', 500);

  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user }
  });
};

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Email and password required'
    });
  }

  const user = await User.findOne({ email });

  let match = false;
  if (user) {
    match = await User.comparePassword(password, user.password);
  }

  if (!user || !match) {
    return res.status(401).json({
      status: 'error',
      message: 'Incorrect email or password'
    });
  }

  await User.updateById(user.id, {
    last_login: new Date().toISOString()
  });

  createSendToken(user, 200, res);
});

const signup = catchAsync(async (req, res) => {
  const { name, email, password, role = 'user' } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({
      status: 'error',
      message: 'User already exists'
    });
  }

  const user = await User.create({
    name,
    email,
    password,
    role
  });

  createSendToken(user, 201, res);
});

const googleLogin = catchAsync(async (req, res) => {
  const defaultOrigin = `${req.protocol}://${req.get('host')}`;
  const redirectTo = process.env.SUPABASE_OAUTH_REDIRECT_URL || `${process.env.FRONTEND_URL || defaultOrigin}/google-callback.html`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo
    }
  });

  if (error || !data?.url) {
    throw new AppError('Unable to start Google login flow', 500);
  }

  return res.redirect(data.url);
});

const googleCallback = catchAsync(async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(400).json({
      status: 'error',
      message: 'Google access token is required'
    });
  }

  const { data: userResponse, error } = await supabase.auth.getUser(accessToken);
  if (error || !userResponse?.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Unable to verify Google user'
    });
  }

  const googleUser = userResponse.user;
  const email = googleUser.email?.toLowerCase();
  const name = googleUser.user_metadata?.full_name || googleUser.user_metadata?.name || email?.split('@')[0] || 'Google User';

  if (!email) {
    return res.status(400).json({
      status: 'error',
      message: 'Google account did not provide an email address'
    });
  }

  let user = await User.findOne({ email });

  if (user && user.is_active === false) {
    return res.status(403).json({
      status: 'error',
      message: 'Account is deactivated'
    });
  }

  if (user) {
    user = await User.updateById(user.id, {
      last_login: new Date().toISOString()
    });
  } else {
    user = await User.create({
      name,
      email,
      password: null,
      role: 'user'
    });
  }

  createSendToken(user, 200, res);
});

const facebookLogin = catchAsync(async (req, res) => {
  const defaultOrigin = `${req.protocol}://${req.get('host')}`;
  const redirectTo = process.env.SUPABASE_OAUTH_REDIRECT_URL || `${process.env.FRONTEND_URL || defaultOrigin}/facebook-callback.html`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo
    }
  });

  if (error || !data?.url) {
    throw new AppError('Unable to start Facebook login flow', 500);
  }

  return res.redirect(data.url);
});

const facebookCallback = catchAsync(async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(400).json({
      status: 'error',
      message: 'Facebook access token is required'
    });
  }

  const { data: userResponse, error } = await supabase.auth.getUser(accessToken);
  if (error || !userResponse?.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Unable to verify Facebook user'
    });
  }

  const facebookUser = userResponse.user;
  const email = facebookUser.email?.toLowerCase();
  const name = facebookUser.user_metadata?.full_name || facebookUser.user_metadata?.name || email?.split('@')[0] || 'Facebook User';

  if (!email) {
    return res.status(400).json({
      status: 'error',
      message: 'Facebook account did not provide an email address'
    });
  }

  let user = await User.findOne({ email });

  if (user && user.is_active === false) {
    return res.status(403).json({
      status: 'error',
      message: 'Account is deactivated'
    });
  }

  if (user) {
    user = await User.updateById(user.id, {
      last_login: new Date().toISOString()
    });
  } else {
    user = await User.create({
      name,
      email,
      password: null,
      role: 'user'
    });
  }

  createSendToken(user, 200, res);
});

const logout = (req, res) => {
  res.json({ status: 'success', message: 'Logged out' });
};

const protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Not logged in'
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AppError('JWT secret missing', 500);
  const decoded = jwt.verify(token, secret);

  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return res.status(401).json({
      status: 'error',
      message: 'User no longer exists'
    });
  }

  if (currentUser.is_active === false) {
    return res.status(401).json({
      status: 'error',
      message: 'Account deactivated'
    });
  }

  req.user = currentUser;
  next();
});

const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      status: 'error',
      message: 'No permission'
    });
  }
  next();
};

const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      status: 'error',
      message: 'Email required'
    });
  }

  const user = await User.findOne({ email });
  
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'No user with that email'
    });
  }

  // Generate reset token
  const resetToken = jwt.sign(
    { id: user.id, type: 'passwordReset' }, 
    process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'vialifecoach_default_jwt_secret_change_in_production',
    { expiresIn: '10m' }
  );

  // Update user with reset token
  await User.updateById(user.id, {
    password_reset_token: resetToken,
    password_reset_expires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  });

  // Send reset email
  try {
    const { sendEmail, emailTemplates } = require('./mailer');
    
    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
    
    // Check if email is configured
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_HOST_USER || !process.env.EMAIL_HOST_PASSWORD) {
      console.warn('Email not configured. Returning reset link directly.');
      res.status(200).json({
        status: 'success',
        message: 'Password reset link generated (email not configured)',
        resetToken: resetToken,
        resetUrl: resetUrl,
        emailSent: false,
        emailConfigured: false
      });
      return;
    }
    
    // In development, return the reset link directly instead of emailing
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 Development Mode - Password Reset Link:', resetUrl);
      res.status(200).json({
        status: 'success',
        message: 'Password reset link generated (development mode)',
        resetToken: resetToken,
        resetUrl: resetUrl,
        emailSent: false,
        emailConfigured: true
      });
      return;
    }
    
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request - Vialifecoach',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #2c3e50;">Password Reset Request</h2>
          <p>Hello ${user.name || 'User'},</p>
          <p>You requested to reset your password. Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
            Reset Password
          </a>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #7f8c8d;">${resetUrl}</p>
          <p><strong>This link will expire in 10 minutes.</strong></p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 14px;">
            Best regards,<br>
            Vialifecoach Team
          </p>
        </div>
      `
    });

    res.status(200).json({
      status: 'success',
      message: 'Password reset link sent to email',
      resetUrl: resetUrl,
      emailSent: true,
      emailConfigured: true
    });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    // If email fails, return success since token is generated, but include diagnostics
    res.status(200).json({
      status: 'success',
      message: 'Password reset token generated (email sending failed)',
      resetToken: resetToken,
      resetUrl: `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`,
      emailSent: false,
      emailConfigured: true,
      emailError: error.message
    });
  }
});

const resetPassword = catchAsync(async (req, res) => {
  const token = req.body.token || req.params.token || req.query.token;
  const { password } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Token and password are required'
    });
  }

  // Verify the reset token
  const decoded = jwt.verify(
    token, 
    process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'vialifecoach_default_jwt_secret_change_in_production'
  );

  // Find user by ID and check if token is valid
  const user = await User.findById(decoded.id);
  
  if (!user || user.password_reset_token !== token || !user.password_reset_expires) {
    return res.status(400).json({
      status: 'error',
      message: 'Token is invalid or has expired'
    });
  }

  // Check if token has expired
  if (new Date(user.password_reset_expires) < new Date()) {
    return res.status(400).json({
      status: 'error',
      message: 'Token has expired'
    });
  }

  // Update password and clear reset token
  await User.updateById(user.id, {
    password: password, // Will be hashed by the User model
    password_reset_token: null,
    password_reset_expires: null,
    password_changed_at: new Date().toISOString()
  });

  // Send confirmation email
  try {
    const { sendEmail } = require('./mailer');
    
    await sendEmail({
      to: user.email,
      subject: 'Password Successfully Reset - Vialifecoach',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #27ae60;">Password Successfully Reset</h2>
          <p>Hello ${user.name || 'User'},</p>
          <p>Your password has been successfully reset.</p>
          <p>You can now log in with your new password:</p>
          <a href="${req.protocol}://${req.get('host')}/login" style="background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
            Log In
          </a>
          <p>If you didn't request this change, please contact us immediately.</p>
          <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 14px;">
            Best regards,<br>
            Vialifecoach Team
          </p>
        </div>
      `
    });
  } catch (error) {
    console.error('Error sending password reset confirmation email:', error);
    // Don't fail the request if email fails
  }

  res.status(200).json({
    status: 'success',
    message: 'Password has been reset successfully'
  });
});

module.exports = {
  signToken,
  createSendToken,
  protect,
  restrictTo,
  login,
  signup,
  googleLogin,
  googleCallback,
  facebookLogin,
  facebookCallback,
  logout,
  forgotPassword,
  resetPassword
};