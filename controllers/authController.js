// backend/controllers/authController.js
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

// Helper: set HTTP-only cookie
const setTokenCookie = (res, payload) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

  const cookieName = process.env.COOKIE_NAME || 'att_token';
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: (parseInt(process.env.JWT_EXPIRES_MS, 10) || 7 * 24 * 3600 * 1000)
  };

  res.cookie(cookieName, token, cookieOptions);
  return token;
};

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, role, uid, dept } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Email, password and role required' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email' });
    }
    if (!['admin', 'teacher', 'student'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Check existing
    const existing = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    // Create user (password hook will hash)
    const created = await User.create({
      fullName, email: email.toLowerCase().trim(), password, role, uid, dept
    });

    setTokenCookie(res, { id: created.id, email: created.email, role: created.role });
    const userObj = created.toJSON();
    delete userObj.password;

    res.status(201).json({ success: true, user: userObj });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
      attributes: { include: ['password', 'failedLoginAttempts', 'accountLockedUntil'] }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check account lock
    if (user.accountLockedUntil && new Date() < new Date(user.accountLockedUntil)) {
      return res.status(403).json({ success: false, message: 'Account temporarily locked. Try again later.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      // increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      // lock account if too many attempts (example: 5)
      if (user.failedLoginAttempts >= 5) {
        user.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // lock 30 minutes
      }
      await user.save();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // success: reset failed attempts and set lastLogin
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastLogin = new Date();
    await user.save();

    setTokenCookie(res, { id: user.id, email: user.email, role: user.role });
    const u = user.toJSON();
    delete u.password;

    res.json({ success: true, user: u });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// LOGOUT
router.post('/logout', (req, res) => {
  const cookieName = process.env.COOKIE_NAME || 'att_token';
  res.clearCookie(cookieName, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ success: true });
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Valid email required' });
    }
    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(200).json({ success: true, message: 'If email exists, reset link will be sent' });
    }

    const resetToken = await user.generatePasswordResetToken();
    // TODO: send resetToken to user via email using your email provider
    // Save was done inside method
    res.json({ success: true, message: 'Password reset token generated', resetToken }); // in prod don't return token
  } catch (err) {
    console.error('forgot-password', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reset password endpoint
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ success: false, message: 'Token and newPassword required' });

    // hash received token to compare with stored hash
    const crypto = require('crypto');
    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        resetPasswordToken: hashed,
        resetPasswordExpires: { [require('sequelize').Op.gt]: new Date() }
      },
      attributes: { include: ['password', 'resetPasswordToken', 'resetPasswordExpires'] }
    });

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });

    user.password = newPassword; // hook will hash on save
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error('reset-password', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
