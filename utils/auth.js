const jwt = require('jsonwebtoken');
const User = require('../models/UserSupabase');
const { catchAsync, AppError } = require('../utils');

const signToken = (id) => {
  const secret = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;
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

  const secret = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;
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
  logout,
  forgotPassword,
  resetPassword
};