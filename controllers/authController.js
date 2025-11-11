
// backend/controllers/authController.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const { User, Settings, TwoFactorAuth } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const crypto = require('crypto');
const { Op } = require('sequelize');
const twoFactorAuthService = require('../services/twoFactorAuthService');

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

// -----------------------------
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
      fullName, 
      email: email.toLowerCase().trim(), 
      password, 
      role, 
      uid, 
      dept
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
// -----------------------------

// LOGIN - with 2FA negotiation
router.post('/login', async (req, res) => {
  try {
    const { email, password, selectedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check account lock
    if (user.accountLockedUntil && new Date() < new Date(user.accountLockedUntil)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account temporarily locked. Try again later.' 
      });
    }

    // Verify password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= (parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5)) {
        user.accountLockedUntil = new Date(Date.now() + ((parseInt(process.env.LOCKOUT_DURATION, 10) || 30) * 60 * 1000));
        console.log('🔒 Account locked for user:', user.email);
      }
      await user.save();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Success: reset failed attempts but DO NOT set cookie yet if 2FA required
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastLogin = new Date();
    await user.save();

    // Optional role guard from frontend (if provided)
    if (selectedRole && user.role !== selectedRole) {
      // keep generic response
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check system settings to see if 2FA is required for admin accounts
    const settings = await Settings.findOne({ order: [['id', 'DESC']] });
    const require2FA = !!(settings && settings.require2FA);

    // If 2FA is NOT required globally, proceed to set cookie and login
    if (!require2FA || user.role !== 'admin') {
      // No 2FA required => set cookie and return user
      setTokenCookie(res, { id: user.id, email: user.email, role: user.role });
      const u = user.toJSON();
      delete u.password;
      return res.json({ success: true, user: u });
    }

    // From here: require2FA is true and user.role === 'admin' => handle 2FA negotiation
    const existing2FA = await TwoFactorAuth.findOne({ where: { userId: user.id } });

    // Create a short-lived temporary token to link the credential check to the 2FA verification step
    const tempToken = jwt.sign({ id: user.id, email: user.email, twoFAPending: true }, process.env.JWT_SECRET, { expiresIn: '5m' });

    if (existing2FA && existing2FA.enabled && existing2FA.secret) {
      // 2FA is enabled for the user -> ask frontend to prompt for 2FA
      return res.json({
        success: true,
        twoFARequired: true,
        tempToken,
        message: 'Two-factor authentication required'
      });
    }

    // 2FA required but user hasn't set it up yet -> generate secret and QR and save (enabled: false)
    // Generate secret + QR + backup codes but do NOT enable the auth until they verify the first code
    const setupData = await twoFactorAuthService.generateSecret(user); // returns {secret, qrCode, backupCodes, otpauth_url}
    // Save secret & hashed backup codes into DB (enabled: false)
    await twoFactorAuthService.enable2FA(user.id, setupData.secret, setupData.backupCodes);

    return res.json({
      success: true,
      twoFASetupRequired: true,
      tempToken,
      setup: {
        secret: setupData.secret,
        qrCode: setupData.qrCode,
        backupCodes: setupData.backupCodes,
        message: 'Scan the QR code and enter the verification code to enable 2FA'
      }
    });

  } catch (err) {
    console.error('❌ Login error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// New endpoint: verify 2FA using tempToken + token or backupCode
// POST /api/auth/verify-2fa
router.post('/verify-2fa', async (req, res) => {
  try {
    const { tempToken, token, backupCode } = req.body;
    if (!tempToken) {
      return res.status(400).json({ success: false, message: 'tempToken is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired temp token' });
    }

    if (!decoded || !decoded.twoFAPending || !decoded.id) {
      return res.status(401).json({ success: false, message: 'Invalid temp token payload' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get 2FA record
    const twoFA = await TwoFactorAuth.findOne({ where: { userId: user.id } });
    if (!twoFA || !twoFA.secret) {
      return res.status(400).json({ success: false, message: '2FA not setup for this account' });
    }

    // If 2FA is not yet enabled (setup flow), verifying the token should enable it
    const isEnabled = !!twoFA.enabled;

    // Verify TOTP token
    if (token) {
      // If already enabled -> use verify2FAToken; if not enabled -> confirm2FA (which verifies & enables)
      if (isEnabled) {
        const ok = await twoFactorAuthService.verify2FAToken(user.id, token);
        if (!ok) {
          return res.status(401).json({ success: false, message: 'Invalid 2FA code' });
        }
      } else {
        // Confirm (this verifies the token against the secret and enables 2FA)
        try {
          await twoFactorAuthService.confirm2FA(user.id, token);
        } catch (err) {
          // confirm2FA throws on invalid code
          return res.status(401).json({ success: false, message: err.message || 'Invalid 2FA code' });
        }
      }

      // All good — set the session cookie and return the user
      setTokenCookie(res, { id: user.id, email: user.email, role: user.role });
      const u = user.toJSON();
      delete u.password;
      return res.json({ success: true, user: u });
    }

    // Verify backup code path
    if (backupCode) {
      const result = await twoFactorAuthService.verifyBackupCode(user.id, backupCode);
      if (!result || !result.valid) {
        return res.status(401).json({ success: false, message: result.message || 'Invalid backup code' });
      }

      // If 2FA was not enabled but user used a backup code, it's safer to force proper setup rather than enabling automatically.
      if (!isEnabled) {
        return res.status(400).json({ success: false, message: 'Account requires authenticator app setup. Please enable 2FA using scanner.' });
      }

      // Success with backup code, set cookie
      setTokenCookie(res, { id: user.id, email: user.email, role: user.role });
      const u2 = user.toJSON();
      delete u2.password;
      return res.json({ success: true, user: u2 });
    }

    return res.status(400).json({ success: false, message: 'token or backupCode required' });

  } catch (err) {
    console.error('❌ verify-2fa error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// LOGOUT
router.post('/logout', (req, res) => {
  const cookieName = process.env.COOKIE_NAME || 'att_token';
  res.clearCookie(cookieName, { 
    httpOnly: true, 
    sameSite: 'lax', 
    secure: process.env.NODE_ENV === 'production' 
  });
  res.json({ success: true });
});

// Forgot/reset password (kept from previous implementation)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Valid email required' });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(200).json({ 
        success: true, 
        message: 'If email exists, reset link will be sent' 
      });
    }

    const resetToken = await user.generatePasswordResetToken();
    // TODO: send resetToken to user via email using your email provider
    res.json({ 
      success: true, 
      message: 'Password reset token generated', 
      resetToken 
    }); // in prod don't return token
  } catch (err) {
    console.error('❌ forgot-password error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and newPassword required' });
    }

    // Hash received token to compare with stored hash
    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        resetPasswordToken: hashed,
        resetPasswordExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    user.password = newPassword; // hook will hash on save
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error('❌ reset-password error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
