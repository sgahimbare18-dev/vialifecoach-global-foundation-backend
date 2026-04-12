const express = require('express');
const {
  login,
  signup,
  logout,
  forgotPassword,
  resetPassword
} = require('../utils/auth');

const router = express.Router();

// Auth routes
router.post('/login', login);
router.post('/signup', signup);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password', resetPassword);

module.exports = router;
