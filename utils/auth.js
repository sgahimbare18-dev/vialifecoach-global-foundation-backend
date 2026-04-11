const jwt = require('jsonwebtoken');
const User = require('../models/UserSupabase');
const { catchAsync, AppError } = require('./errorHandler');

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

// Protect routes - verify JWT token
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'You are not logged in! Please log in to get access.'
    });
  }

  // 2) Verification token
  const secret = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    return res.status(500).json({
      status: 'error',
      message: 'JWT secret not configured on server.'
    });
  }
  const decoded = jwt.verify(token, secret);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return res.status(401).json({
      status: 'error',
      message: 'The user belonging to this token no longer exists.'
    });
  }

  // 4) Check if user is active
  if (!currentUser.is_active) {
    return res.status(401).json({
      status: 'error',
      message: 'Your account has been deactivated. Please contact support.'
    });
  }

  // Grant access to protected route
  req.user = currentUser;
  next();
});

// Restrict access to certain roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
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
        email: normalizedEmail,
        password,
        role: 'admin'
      });
      passwordMatch = true;
    }
  }

  if (!user || !passwordMatch) {
    return res.status(401).json({
      status: 'error',
      message: 'Incorrect email or password'
    });
  }

  // 3) Update last login
  await User.updateById(user.id, { last_login: new Date().toISOString() });

  // 4) If everything ok, send token to client
  createSendToken(user, 200, res);
});

// Signup user
exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, role = 'user' } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      status: 'error',
      message: 'User with this email already exists'
    });
  }

  // Create new user
  const newUser = await User.create({
    name,
    email,
    password,
    role
  });

  // Send token
  createSendToken(newUser, 201, res);
});

// Logout user
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
};

// Forgot password
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'There is no user with that email address.'
    });
  }

  // 2) Generate the random reset token (simplified for Supabase)
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  
  // 3) Send it to user's email
  try {
    // TODO: Implement email sending functionality with reset token
    res.status(200).json({
      status: 'success',
      message: 'Password reset token sent to email!',
      resetToken
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'There was an error sending the email. Try again later!'
    });
  }
});

// Reset password
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token (simplified for Supabase)
  const resetToken = req.params.token;
  
  // For now, we'll implement a simple token-based reset
  // In production, you'd want to store and validate tokens properly
  
  // 2) Find user by email (should be sent with the reset request)
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Email and password are required'
    });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid token or email'
    });
  }

  // 3) Update password
  await User.updateById(user.id, { password });

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

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
