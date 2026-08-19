const jwt = require('jsonwebtoken');
const User = require('../models/UserSupabase');
const { supabase } = require('./supabase');
const { catchAsync, AppError } = require('../utils');

const getJwtSecret = () => (
  process.env.JWT_SECRET ||
  process.env.ACCESS_TOKEN_SECRET ||
  'vialifecoach_default_jwt_secret_change_in_production'
);

const DEFAULT_FRONTEND_URL = 'https://vialifecoach.org';

const getFrontendBaseUrl = () => {
  const frontendUrl = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;
  return String(frontendUrl).trim().replace(/\/+$/, '');
};

const buildResetPasswordLink = (req, token) => {
  const frontendBaseUrl = getFrontendBaseUrl();
  return `${frontendBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
};

const buildLoginLink = (req) => {
  const frontendBaseUrl = getFrontendBaseUrl();
  return `${frontendBaseUrl}/login`;
};

const signToken = (id, role) => {
  const secret = getJwtSecret();
  if (!secret) throw new AppError('JWT secret missing', 500);

  return jwt.sign({ id, role }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const safeUser = (user) => {
  if (!user) return user;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    verified: user.verified,
    is_active: user.is_active,
    photo: user.photo_url || user.photo || null
  };
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id, user.role);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user: safeUser(user) }
  });
};

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const legacyAdminEmail = 'academy@vialifecoach.org';
  const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
  const normalizedAdminEmail = adminEmail ? String(adminEmail).trim().toLowerCase() : '';
  const adminEmailAliases = new Set([normalizedAdminEmail, legacyAdminEmail].filter(Boolean));
  const isAdminEmail = adminEmailAliases.has(normalizedEmail);

  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Email and password required'
    });
  }

  const lookupEmails = isAdminEmail
    ? Array.from(new Set([normalizedAdminEmail, normalizedEmail].filter(Boolean)))
    : [email];

  let user = null;
  for (const lookupEmail of lookupEmails) {
    user = await User.findOne({ email: lookupEmail });
    if (user) break;
  }

  let match = false;
  if (user) {
    match = await User.comparePassword(password, user.password);
  }

  if (user && isAdminEmail && adminPassword && password === adminPassword) {
    const needsAdminRepair =
      user.role !== 'admin' ||
      !user.password ||
      !(await User.comparePassword(adminPassword, user.password));

    if (needsAdminRepair) {
      user = await User.updateById(user.id, {
        password: adminPassword,
        role: 'admin',
        is_active: true
      });
    }

    match = true;
  }

  if (!user && isAdminEmail && adminPassword && password === adminPassword) {
    user = await User.create({
      name: 'Admin',
      email: normalizedAdminEmail || normalizedEmail,
      password: adminPassword,
      role: 'admin'
    });
    match = true;
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
  const adminEmail = process.env.ADMIN_EMAIL ? String(process.env.ADMIN_EMAIL).trim().toLowerCase() : '';
  const legacyAdminEmail = 'academy@vialifecoach.org';
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

  const secret = getJwtSecret();
  if (!secret) throw new AppError('JWT secret missing', 500);

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch (error) {
    console.warn('Rejected malformed or expired access token:', error.message);
    return res.status(401).json({
      status: 'error',
      message: 'Not logged in'
    });
  }
  const isLegacyAdminToken =
    decoded.id === 0 ||
    decoded.id === '0' ||
    decoded.id === null ||
    decoded.id === undefined;

  let currentUser = null;

  if (!isLegacyAdminToken) {
    try {
      currentUser = await User.findById(decoded.id);
    } catch (error) {
      // If the token came from an older admin flow, fall back to the current admin account.
      if (error?.code !== 'PGRST116') {
        throw error;
      }
    }
  }

  if (!currentUser && isLegacyAdminToken && (adminEmail || legacyAdminEmail)) {
    const adminLookupEmail = adminEmail || legacyAdminEmail;
    currentUser = await User.findOne({ email: adminLookupEmail });
  }

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

  req.user = safeUser(currentUser);
  next();
});

const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not logged in' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, getJwtSecret());

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const currentUser = await User.findById(decoded.id);
    if (!currentUser || currentUser.is_active === false) {
      return res.status(401).json({ message: 'Not logged in' });
    }

    req.user = safeUser(currentUser);
    return next();
  } catch (error) {
    console.error('Admin auth middleware error:', error.message);
    return res.status(401).json({ message: 'Not logged in' });
  }
};

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
    const { sendEmail } = require('./mailer');

    const resetUrl = buildResetPasswordLink(req, resetToken);

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

    const info = await sendEmail({
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
      emailSent: true,
      emailConfigured: true,
      messageId: info && info.messageId ? info.messageId : null,
      resetUrl: resetUrl
    });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    res.status(502).json({
      status: 'error',
      message: 'Password reset email could not be delivered. Please verify SMTP settings and sender account.',
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

  let user = null;
  let decoded = null;

  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'vialifecoach_default_jwt_secret_change_in_production'
    );

    user = await User.findById(decoded.id);
  } catch (error) {
    if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
      throw error;
    }

    user = await User.findOne({ password_reset_token: token });
  }

  if (!user || !user.password_reset_expires) {
    return res.status(400).json({
      status: 'error',
      message: 'Token is invalid or has expired'
    });
  }

  if (decoded && user.password_reset_token !== token) {
    return res.status(400).json({
      status: 'error',
      message: 'Token is invalid or has expired'
    });
  }

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
    
    const loginUrl = buildLoginLink(req);

    await sendEmail({
      to: user.email,
      subject: 'Password Successfully Reset - Vialifecoach',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #27ae60;">Password Successfully Reset</h2>
          <p>Hello ${user.name || 'User'},</p>
          <p>Your password has been successfully reset.</p>
          <p>You can now log in with your new password:</p>
          <a href="${loginUrl}" style="background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
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
  requireAdmin,
  restrictTo,
  login,
  signup,
  googleLogin,
  googleCallback,
  facebookLogin,
  facebookCallback,
  logout,
  forgotPassword,
  resetPassword,
  getFrontendBaseUrl,
  buildResetPasswordLink,
  buildLoginLink
};
