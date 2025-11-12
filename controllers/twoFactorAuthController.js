
// backend/controllers/twoFactorAuthController.js

const express = require('express');
const router = express.Router();
const { User, TwoFactorAuth } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const twoFactorAuthService = require('../services/twoFactorAuthService');

// All routes require authentication
router.use(authMiddleware);

// Get 2FA setup page (generate secret and QR code)
router.post('/setup', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate new secret and QR code
    const setupData = await twoFactorAuthService.generateSecret(user);

    // Store the secret temporarily (not enabled yet)
    await twoFactorAuthService.enable2FA(userId, setupData.secret, setupData.backupCodes);

    res.json({
      success: true,
      data: {
        secret: setupData.secret,
        qrCode: setupData.qrCode,
        backupCodes: setupData.backupCodes,
        message: 'Scan the QR code with your authenticator app and enter the code to verify'
      }
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup 2FA',
      error: error.message
    });
  }
});

// Verify 2FA setup (confirm with token)
router.post('/verify-setup', async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token required' });
    }

    // Verify the token to confirm setup
    const result = await twoFactorAuthService.confirm2FA(userId, token);

    res.json({
      success: true,
      message: result.message,
      data: {
        enabled: true,
        message: 'Two-factor authentication has been enabled successfully'
      }
    });
  } catch (error) {
    console.error('Error verifying 2FA setup:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get 2FA status
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await twoFactorAuthService.get2FAStatus(userId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting 2FA status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get 2FA status',
      error: error.message
    });
  }
});

// Disable 2FA
router.post('/disable', async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password required to disable 2FA' });
    }

    const user = await User.findByPk(userId);
    const bcrypt = require('bcryptjs');
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    const result = await twoFactorAuthService.disable2FA(userId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable 2FA',
      error: error.message
    });
  }
});

// Regenerate backup codes
router.post('/regenerate-backup-codes', async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password required' });
    }

    const user = await User.findByPk(userId);
    const bcrypt = require('bcryptjs');
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    const result = await twoFactorAuthService.regenerateBackupCodes(userId);

    res.json({
      success: true,
      data: {
        backupCodes: result.backupCodes,
        message: result.message
      }
    });
  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate backup codes',
      error: error.message
    });
  }
});

module.exports = router;