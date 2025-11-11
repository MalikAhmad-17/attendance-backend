// backend/controllers/cloudBackupController.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const cloudBackupService = require('../services/cloudBackupService');
const { CloudBackup } = require('../models');

// All routes require authentication
router.use(authMiddleware);

// Create backup
router.post('/create', async (req, res) => {
  try {
    const userId = req.user.id;
    const { description } = req.body;

    const backup = await cloudBackupService.createBackup(userId, description, 'manual');

    res.json({
      success: true,
      message: 'Backup created successfully',
      data: {
        id: backup.id,
        backupName: backup.backupName,
        fileSize: backup.fileSize,
        createdAt: backup.createdAt,
        completedAt: backup.completedAt
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

// Get user's backups
router.get('/list', async (req, res) => {
  try {
    const userId = req.user.id;
    const backups = await cloudBackupService.getUserBackups(userId);

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

// Get backup statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await cloudBackupService.getBackupStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting backup stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get backup statistics',
      error: error.message
    });
  }
});

// Restore backup
router.post('/restore/:backupId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { backupId } = req.params;

    // Check if user owns this backup
    const backup = await CloudBackup.findOne({
      where: { id: backupId, userId }
    });

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    const result = await cloudBackupService.restoreBackup(backupId, userId);

    res.json({
      success: true,
      message: result.message,
      data: {
        backupId,
        restoredAt: new Date()
      }
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

// Download backup
router.get('/download/:backupId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { backupId } = req.params;

    const filePath = await cloudBackupService.getBackupPath(backupId, userId);

    // Get backup info
    const backup = await CloudBackup.findOne({
      where: { id: backupId, userId }
    });

    res.download(filePath, backup.backupName, (err) => {
      if (err) {
        console.error('Error downloading backup:', err);
      }
    });
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(404).json({
      success: false,
      message: 'Backup file not found',
      error: error.message
    });
  }
});

// Delete backup
router.delete('/delete/:backupId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { backupId } = req.params;

    const result = await cloudBackupService.deleteBackup(backupId, userId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete backup',
      error: error.message
    });
  }
});

// Admin: Get all backups
router.get('/admin/all', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view all backups'
      });
    }

    const backups = await cloudBackupService.getAllBackups();

    res.json({
      success: true,
      data: backups
    });
  } catch (error) {
    console.error('Error fetching all backups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch backups',
      error: error.message
    });
  }
});

// Admin: Cleanup expired backups
router.post('/admin/cleanup', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can cleanup backups'
      });
    }

    const deletedCount = await cloudBackupService.cleanupExpiredBackups();

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired backup(s)`,
      data: { deletedCount }
    });
  } catch (error) {
    console.error('Error cleaning up backups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup backups',
      error: error.message
    });
  }
});

module.exports = router;