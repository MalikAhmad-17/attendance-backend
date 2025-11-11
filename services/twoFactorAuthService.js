
// backend/services/twoFactorAuthService.js

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { TwoFactorAuth } = require('../models');

class TwoFactorAuthService {
  // Generate 2FA secret and QR code
  async generateSecret(user) {
    try {
      const secret = speakeasy.generateSecret({
        name: `Attendance App (${user.email})`,
        issuer: 'Attendance Management System',
        length: 32
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes(10);
      const hashedCodes = backupCodes.map(code => 
        bcrypt.hashSync(code, 10)
      );

      return {
        secret: secret.base32,
        qrCode,
        backupCodes,
        otpauth_url: secret.otpauth_url
      };
    } catch (error) {
      console.error('Error generating 2FA secret:', error);
      throw new Error('Failed to generate 2FA secret');
    }
  }

  // Generate backup codes
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.substring(0, 4)}-${code.substring(4, 8)}`);
    }
    return codes;
  }

  // Enable 2FA for user
  async enable2FA(userId, secret, backupCodes) {
    try {
      const hashedCodes = backupCodes.map(code => 
        bcrypt.hashSync(code, 10)
      );

      const twoFA = await TwoFactorAuth.findOrCreate({
        where: { userId },
        defaults: {
          userId,
          enabled: false,
          secret,
          backupCodes: hashedCodes
        }
      });

      if (!twoFA[1]) {
        // Update existing record
        await twoFA[0].update({
          secret,
          backupCodes: hashedCodes,
          enabled: false
        });
      }

      return twoFA[0];
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      throw new Error('Failed to enable 2FA');
    }
  }

  // Verify 2FA token
  async verify2FAToken(userId, token) {
    try {
      const twoFA = await TwoFactorAuth.findOne({
        where: { userId, enabled: true }
      });

      if (!twoFA || !twoFA.secret) {
        throw new Error('2FA not enabled for this user');
      }

      const isValid = speakeasy.totp.verify({
        secret: twoFA.secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!isValid) {
        return false;
      }

      // Update lastUsedAt
      await twoFA.update({ lastUsedAt: new Date() });
      return true;
    } catch (error) {
      console.error('Error verifying 2FA token:', error);
      return false;
    }
  }

  // Verify backup code
  async verifyBackupCode(userId, backupCode) {
    try {
      const twoFA = await TwoFactorAuth.findOne({
        where: { userId, enabled: true }
      });

      if (!twoFA || !twoFA.backupCodes || twoFA.backupCodes.length === 0) {
        return { valid: false, message: 'No backup codes available' };
      }

      // Check if code matches any backup code
      let codeIndex = -1;
      for (let i = 0; i < twoFA.backupCodes.length; i++) {
        if (await bcrypt.compare(backupCode, twoFA.backupCodes[i])) {
          codeIndex = i;
          break;
        }
      }

      if (codeIndex === -1) {
        return { valid: false, message: 'Invalid backup code' };
      }

      // Remove used backup code
      const codes = [...twoFA.backupCodes];
      codes.splice(codeIndex, 1);
      await twoFA.update({ 
        backupCodes: codes,
        lastUsedAt: new Date()
      });

      return { 
        valid: true, 
        message: 'Backup code verified successfully',
        codesRemaining: codes.length
      };
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return { valid: false, message: 'Error verifying backup code' };
    }
  }

  // Confirm 2FA setup (after verifying first token)
  async confirm2FA(userId, token) {
    try {
      const twoFA = await TwoFactorAuth.findOne({
        where: { userId }
      });

      if (!twoFA) {
        throw new Error('2FA setup not found');
      }

      // Verify the token first
      const isValid = speakeasy.totp.verify({
        secret: twoFA.secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!isValid) {
        throw new Error('Invalid verification token');
      }

      // Enable 2FA
      await twoFA.update({
        enabled: true,
        verifiedAt: new Date(),
        lastUsedAt: new Date()
      });

      return { success: true, message: '2FA enabled successfully' };
    } catch (error) {
      console.error('Error confirming 2FA:', error);
      throw new Error('Failed to confirm 2FA setup');
    }
  }

  // Disable 2FA
  async disable2FA(userId) {
    try {
      const twoFA = await TwoFactorAuth.findOne({
        where: { userId }
      });

      if (!twoFA) {
        throw new Error('2FA not found');
      }

      await twoFA.update({
        enabled: false,
        secret: null,
        backupCodes: null,
        verifiedAt: null
      });

      return { success: true, message: '2FA disabled successfully' };
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw new Error('Failed to disable 2FA');
    }
  }

  // Get 2FA status
  async get2FAStatus(userId) {
    try {
      const twoFA = await TwoFactorAuth.findOne({
        where: { userId },
        attributes: ['enabled', 'verifiedAt', 'lastUsedAt']
      });

      return twoFA || { 
        enabled: false,
        verifiedAt: null,
        lastUsedAt: null
      };
    } catch (error) {
      console.error('Error getting 2FA status:', error);
      throw new Error('Failed to get 2FA status');
    }
  }

  // Regenerate backup codes
  async regenerateBackupCodes(userId) {
    try {
      const twoFA = await TwoFactorAuth.findOne({
        where: { userId }
      });

      if (!twoFA) {
        throw new Error('2FA not found');
      }

      const backupCodes = this.generateBackupCodes(10);
      const hashedCodes = backupCodes.map(code => 
        bcrypt.hashSync(code, 10)
      );

      await twoFA.update({ backupCodes: hashedCodes });

      return {
        success: true,
        backupCodes,
        message: 'Backup codes regenerated successfully'
      };
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      throw new Error('Failed to regenerate backup codes');
    }
  }
}

module.exports = new TwoFactorAuthService();