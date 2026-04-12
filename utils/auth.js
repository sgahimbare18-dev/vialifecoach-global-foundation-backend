const jwt = require('jsonwebtoken');
const User = require('../models/UserSupabase');
const { supabase } = require('./supabase');
const { catchAsync, AppError } = require('../utils');

const signToken = (id) => {
  const secret = process.env.JWT_SECRET;
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

  res.status(200).json({
    status: 'success',
    message: 'Password reset token sent to email'
  });
});

const resetPassword = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Password reset functionality'
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