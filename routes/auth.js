const express = require('express');
const { body, validationResult } = require('express-validator');
const { catchAsync, AppError } = require('../utils/errorHandler');
const User = require('../models/UserSupabase');
const { protect, restrictTo, signup, login, logout, forgotPassword, resetPassword } = require('../utils/auth');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(new AppError(`Invalid input data. ${errorMessages.join('. ')}`, 400));
  }
  next();
};

// POST /api/auth/register - Register new user
router.post('/register', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .optional()
    .isIn(['user', 'mentor', 'admin'])
    .withMessage('Role must be user, mentor, or admin')
], handleValidationErrors, signup);

// POST /api/auth/login - Login user
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], handleValidationErrors, login);

// POST /api/auth/logout - Logout user
router.post('/logout', logout);

// POST /api/auth/forgot-password - Forgot password
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
], handleValidationErrors, forgotPassword);

// PATCH /api/auth/reset-password/:token - Reset password
router.patch('/reset-password/:token', [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
], handleValidationErrors, resetPassword);

// GET /api/auth/profile - Get current user profile (protected)
router.get('/profile', protect, catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
}));

// PUT /api/auth/profile - Update current user profile (protected)
router.put('/profile', protect, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters')
], handleValidationErrors, catchAsync(async (req, res, next) => {
  const { name, email, phone, bio } = req.body;
  
  // Check if email is being changed and if it's already in use
  if (email && email !== req.user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email is already in use', 400));
    }
  }
  
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { name, email, phone, bio },
    { new: true, runValidators: true }
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
}));

// PUT /api/auth/change-password - Change password (protected)
router.put('/change-password', protect, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
], handleValidationErrors, catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  
  // Get user with password
  const user = await User.findById(req.user.id).select('+password');
  
  // Check if current password is correct
  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 400));
  }
  
  // Update password
  user.password = newPassword;
  await user.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully'
  });
}));

// GET /api/auth/users - Get all users (admin only)
router.get('/users', protect, restrictTo('admin'), catchAsync(async (req, res, next) => {
  const users = await User.find({ isActive: true }).select('-password');
  
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
}));

// PUT /api/auth/users/:id/deactivate - Deactivate user (admin only)
router.put('/users/:id/deactivate', protect, restrictTo('admin'), catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    message: 'User deactivated successfully'
  });
}));

module.exports = router;
