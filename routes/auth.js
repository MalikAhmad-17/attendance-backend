// routes/auth.js - Updated Authentication Routes
const express = require('express');
const router = express.Router();
const { 
  login, 
  logout, 
  getCurrentUser, 
  forgotPassword, 
  resetPassword 
} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected route - get current user
router.get('/me', authMiddleware, getCurrentUser);

module.exports = router;
