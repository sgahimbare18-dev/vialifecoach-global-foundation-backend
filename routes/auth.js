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
  resetPassword,
  protect
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
router.get('/me', protect, (req, res) => {
  return res.status(200).json(req.user);
});
router.get('/reset-password/:token', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Password reset token received. Use PATCH /api/auth/reset-password/:token with { password } to reset your password.',
    token: req.params.token
  });
});
router.patch('/reset-password/:token?', resetPassword);

module.exports = router;
