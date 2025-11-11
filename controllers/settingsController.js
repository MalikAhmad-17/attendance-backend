// backend/controllers/settingsController.js
const express = require('express');
const router = express.Router();
const { Settings } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = authMiddleware;
const backupService = require('../services/backupService');
const emailService = require('../services/emailService');

// All routes require admin authentication
router.use(authMiddleware);
router.use(authorizeRoles('admin'));

// Get current settings
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne({
      order: [['id', 'DESC']]
    });

    // If no settings exist, create default settings
    if (!settings) {
      settings = await Settings.create({
        updatedBy: req.user.id
      });
    }

    // Don't send sensitive data to frontend
    const settingsData = settings.toJSON();

    // Mask sensitive fields
    if (settingsData.smtpPassword) {
      settingsData.smtpPassword = '********';
    }
    if (settingsData.twilioAuthToken) {
      settingsData.twilioAuthToken = '********';
    }
    if (settingsData.fcmServerKey) {
      settingsData.fcmServerKey = '********';
    }

    res.json({
      success: true,
      data: settingsData
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
});

// Update settings
router.put('/', async (req, res) => {
  try {
    let settings = await Settings.findOne({
      order: [['id', 'DESC']]
    });

    if (!settings) {
      settings = await Settings.create({
        ...req.body,
        updatedBy: req.user.id
      });
    } else {
      // Remove masked passwords if they weren't changed
      const updateData = { ...req.body };

      if (updateData.smtpPassword === '********') {
        delete updateData.smtpPassword;
      }
      if (updateData.twilioAuthToken === '********') {
        delete updateData.twilioAuthToken;
      }
      if (updateData.fcmServerKey === '********') {
        delete updateData.fcmServerKey;
      }

      updateData.updatedBy = req.user.id;

      await settings.update(updateData);
    }

    await settings.reload();

    const settingsData = settings.toJSON();

    // Mask sensitive fields
    if (settingsData.smtpPassword) {
      settingsData.smtpPassword = '********';
    }
    if (settingsData.twilioAuthToken) {
      settingsData.twilioAuthToken = '********';
    }
    if (settingsData.fcmServerKey) {
      settingsData.fcmServerKey = '********';
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settingsData
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
});

// Test email configuration
router.post('/test-email', async (req, res) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: 'Test email address is required'
      });
    }

    await emailService.sendTestEmail(testEmail);

    res.json({
      success: true,
      message: `Test email sent successfully to ${testEmail}`
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

// Create backup
router.post('/backup', async (req, res) => {
  try {
    const backupPath = await backupService.createBackup(req.user.id);

    // Update last backup date
    const settings = await Settings.findOne({
      order: [['id', 'DESC']]
    });

    if (settings) {
      await settings.update({
        lastBackupDate: new Date(),
        updatedBy: req.user.id
      });
    }

    res.json({
      success: true,
      message: 'Backup created successfully',
      data: {
        backupPath,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: error.message
    });
  }
});

// Get available backups
router.get('/backups', async (req, res) => {
  try {
    const backups = await backupService.getAvailableBackups();

    res.json({
      success: true,
      data: backups
    });
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch backups',
      error: error.message
    });
  }
});

// Restore from backup
router.post('/restore', async (req, res) => {
  try {
    const { backupFile } = req.body;

    if (!backupFile) {
      return res.status(400).json({
        success: false,
        message: 'Backup file name is required'
      });
    }

    await backupService.restoreBackup(backupFile);

    res.json({
      success: true,
      message: 'Database restored successfully from backup'
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore backup',
      error: error.message
    });
  }
});

// Download backup file
router.get('/backup/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = await backupService.getBackupPath(filename);

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Error downloading backup:', err);
        res.status(500).json({
          success: false,
          message: 'Failed to download backup file'
        });
      }
    });
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(404).json({
      success: false,
      message: 'Backup file not found'
    });
  }
});

// Delete old backups
router.delete('/backups/cleanup', async (req, res) => {
  try {
    const settings = await Settings.findOne({
      order: [['id', 'DESC']]
    });

    const retentionDays = settings?.backupRetentionDays || 30;
    const deletedCount = await backupService.cleanupOldBackups(retentionDays);

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old backup(s)`,
      data: { deletedCount }
    });
  } catch (error) {
    console.error('Error cleaning up backups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup old backups',
      error: error.message
    });
  }
});

module.exports = router;
