const jwt = require('jsonwebtoken');
const { catchAsync, AppError } = require('./errorHandler');
const User = require('../models/UserSupabase');

// Sign JWT token
const signToken = (id) => {
  const secret = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new AppError('JWT secret not configured. Set JWT_SECRET or ACCESS_TOKEN_SECRET.', 500);
  }
  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Create and send token response
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);
  
  // Remove password from output
  user.password = undefined;
  
  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

// Protect routes - verify JWT token with better error handling
exports.protect = catchAsync(async (req, res, next) => {
  console.log('Auth Debug - Headers:', req.headers); // Debug line
  console.log('Auth Debug - Cookies:', req.cookies); // Debug line
  
  // 1) Getting token and check if it's there
  let token;
  
  // Try multiple sources for token
  if (req.headers && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    console.log('Auth Debug - Authorization header found:', authHeader); // Debug
    
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('Auth Debug - Token extracted from Bearer header:', token ? 'YES' : 'NO'); // Debug
    } else {
      console.log('Auth Debug - Authorization header not in Bearer format'); // Debug
    }
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
    console.log('Auth Debug - Token extracted from cookies:', token ? 'YES' : 'NO'); // Debug
  } else {
    console.log('Auth Debug - No token found in headers or cookies'); // Debug
  }

  if (!token) {
    console.log('Auth Debug - No token available, returning 401'); // Debug
    return res.status(401).json({
      status: 'error',
      message: 'You are not logged in! Please log in to get access.'
    });
  }

  // 2) Verification token
  const secret = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    console.log('Auth Debug - JWT secret not configured'); // Debug
    return res.status(500).json({
      status: 'error',
      message: 'JWT secret not configured on server.'
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
    console.log('Auth Debug - Token verified successfully:', decoded); // Debug
  } catch (error) {
    console.log('Auth Debug - Token verification failed:', error.message); // Debug
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token. Please log in again.'
    });
  }

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    console.log('Auth Debug - User not found for ID:', decoded.id); // Debug
    return res.status(401).json({
      status: 'error',
      message: 'The user belonging to this token no longer exists.'
    });
  }

  // 4) Check if user is active
  if (!currentUser.is_active) {
    console.log('Auth Debug - User is not active:', currentUser.email); // Debug
    return res.status(401).json({
      status: 'error',
      message: 'Your account has been deactivated. Please contact support.'
    });
  }

  // Grant access to protected route
  console.log('Auth Debug - Access granted to user:', currentUser.email, 'Role:', currentUser.role); // Debug
  req.user = currentUser;
  next();
});

// Restrict access to certain roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log('Role Debug - Required roles:', roles, 'User role:', req.user?.role); // Debug
    
    if (!req.user || !roles.includes(req.user.role)) {
      console.log('Role Debug - Access denied'); // Debug
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Login user
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const normalizedEmail = email ? String(email).trim().toLowerCase() : '';

  console.log('Login Debug - Email:', normalizedEmail); // Debug

  // 1) Check if email and password exist
  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide email and password!'
    });
  }

  // 2) Check if user exists && password is correct
  let user = await User.findOne({ email });
  let passwordMatch = user ? await User.comparePassword(password, user.password) : false;

  // Handle legacy plain-text passwords (rehash on first login)
  if (user && !passwordMatch && user.password && user.password === password) {
    user = await User.updateById(user.id, { password });
    passwordMatch = true;
  }

  // Auto-provision admin from env if not found
  if (!user && adminEmail && adminPassword) {
    const normalizedAdmin = String(adminEmail).trim().toLowerCase();
    if (normalizedEmail && normalizedEmail === normalizedAdmin && password === adminPassword) {
      user = await User.create({
        name: 'Admin',
        email: normalizedAdmin,
        password,
        role: 'admin'
      });
      passwordMatch = true;
    }
  }

  if (!user || !passwordMatch) {
    console.log('Login Debug - Authentication failed'); // Debug
    return res.status(401).json({
      status: 'error',
      message: 'Incorrect email or password'
    });
  }

  console.log('Login Debug - Authentication successful for:', user.email); // Debug

  // 3) Update last login
  await User.updateById(user.id, { last_login: new Date().toISOString() });

  // 4) If everything ok, send token to client
  createSendToken(user, 200, res);
});

// Export all functions
module.exports = {
  signToken,
  createSendToken,
  protect: exports.protect,
  restrictTo: exports.restrictTo,
  login: exports.login,
  signup: exports.signup,
  logout: exports.logout,
  forgotPassword: exports.forgotPassword,
  resetPassword: exports.resetPassword
};
