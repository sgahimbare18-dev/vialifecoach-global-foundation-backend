const express = require('express');
const {
  login,
  signup,
  googleLogin,
  googleCallback,
  facebookLogin,
  facebookCallback,
  logout,
  forgotPassword,
  resetPassword
} = require('../utils/auth');

const router = express.Router();

// Auth routes
router.get('/google', googleLogin);
router.post('/google/callback', googleCallback);
router.get('/facebook', facebookLogin);
router.post('/facebook/callback', facebookCallback);
router.post('/login', login);
router.post('/signup', signup);
router.post('/register', signup);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password', resetPassword);

module.exports = router;
