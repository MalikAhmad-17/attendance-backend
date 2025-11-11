
// backend/services/cloudBackupService.js

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');
const { CloudBackup } = require('../models');

const execPromise = util.promisify(exec);

class CloudBackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.tempDir = path.join(__dirname, '../backups/temp');
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
      throw error;
    }
  }

  // Create a new backup
  async createBackup(userId, description = '', backupType = 'manual') {
    try {
      await this.ensureDirectories();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup_${userId}_${timestamp}.sql`;
      const filePath = path.join(this.backupDir, filename);

      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || 3306;
      const dbName = process.env.DB_NAME || 'attendance_db';
      const dbUser = process.env.DB_USER || 'root';
      const dbPass = process.env.DB_PASS || '';

      // Create MySQL dump
      const dumpCommand = `mysqldump -h ${dbHost} -P ${dbPort} -u ${dbUser} ${dbPass ? `-p${dbPass}` : ''} ${dbName} > "${filePath}"`;
      await execPromise(dumpCommand);

      // Get file stats
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Calculate checksum
      const fileBuffer = await fs.readFile(filePath);
      const checksum = crypto
        .createHash('sha256')
        .update(fileBuffer)
        .digest('hex');

      // Create backup record in database
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // 30 days default retention

      const backup = await CloudBackup.create({
        userId,
        backupName: filename,
        description,
        backupType,
        status: 'completed',
        fileSize,
        storageKey: filename,
        storageProvider: 'local',
        checksum,
        isEncrypted: false,
        metadata: {
          database: dbName,
          host: dbHost,
          port: dbPort,
          timestamp: new Date(),
          version: '1.0'
        },
        retentionDays: 30,
        expiryDate,
        completedAt: new Date()
      });

      console.log(`✅ Backup created: ${filename} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
      return backup;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  // Get backups for a user
  async getUserBackups(userId) {
    try {
      const backups = await CloudBackup.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        attributes: {
          exclude: ['checksum', 'storageKey', 'metadata']
        }
      });

      return backups.map(backup => ({
        id: backup.id,
        backupName: backup.backupName,
        description: backup.description,
        backupType: backup.backupType,
        status: backup.status,
        fileSize: backup.fileSize,
        isEncrypted: backup.isEncrypted,
        createdAt: backup.createdAt,
        completedAt: backup.completedAt,
        expiryDate: backup.expiryDate,
        formattedSize: this.formatFileSize(backup.fileSize)
      }));
    } catch (error) {
      console.error('Error fetching user backups:', error);
      throw new Error('Failed to fetch backups');
    }
  }

  // Get all backups (admin only)
  async getAllBackups() {
    try {
      const backups = await CloudBackup.findAll({
        include: {
          model: require('../models').User,
          as: 'user',
          attributes: ['id', 'email', 'fullName']
        },
        order: [['createdAt', 'DESC']],
        attributes: {
          exclude: ['checksum', 'storageKey']
        }
      });

      return backups;
    } catch (error) {
      console.error('Error fetching all backups:', error);
      throw new Error('Failed to fetch backups');
    }
  }

  // Restore from backup
  async restoreBackup(backupId, userId) {
    try {
      const backup = await CloudBackup.findOne({
        where: { id: backupId, userId }
      });

      if (!backup) {
        throw new Error('Backup not found');
      }

      if (backup.status !== 'completed') {
        throw new Error('Backup is not ready for restoration');
      }

      const filePath = path.join(this.backupDir, backup.storageKey);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        throw new Error('Backup file not found on storage');
      }

      // Update backup status
      await backup.update({ status: 'restoring' });

      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || 3306;
      const dbName = process.env.DB_NAME || 'attendance_db';
      const dbUser = process.env.DB_USER || 'root';
      const dbPass = process.env.DB_PASS || '';

      // Restore database
      const restoreCommand = `mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} ${dbPass ? `-p${dbPass}` : ''} ${dbName} < "${filePath}"`;
      await execPromise(restoreCommand);

      // Update backup record
      await backup.update({
        status: 'completed',
        restoredAt: new Date()
      });

      console.log(`✅ Database restored from: ${backup.backupName}`);
      return { success: true, message: 'Backup restored successfully' };
    } catch (error) {
      // Update status to failed
      const backup = await CloudBackup.findOne({
        where: { id: backupId }
      });

      if (backup) {
        await backup.update({
          status: 'failed',
          errorMessage: error.message
        });
      }

      console.error('Error restoring backup:', error);
      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }

  // Download backup
  async getBackupPath(backupId, userId) {
    try {
      const backup = await CloudBackup.findOne({
        where: { id: backupId, userId }
      });

      if (!backup) {
        throw new Error('Backup not found');
      }

      const filePath = path.join(this.backupDir, backup.storageKey);

      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        throw new Error('Backup file not found');
      }
    } catch (error) {
      console.error('Error getting backup path:', error);
      throw error;
    }
  }

  // Delete backup
  async deleteBackup(backupId, userId) {
    try {
      const backup = await CloudBackup.findOne({
        where: { id: backupId, userId }
      });

      if (!backup) {
        throw new Error('Backup not found');
      }

      const filePath = path.join(this.backupDir, backup.storageKey);

      try {
        await fs.unlink(filePath);
      } catch {
        console.warn('Backup file not found for deletion');
      }

      await backup.destroy();

      console.log(`✅ Backup deleted: ${backup.backupName}`);
      return { success: true, message: 'Backup deleted successfully' };
    } catch (error) {
      console.error('Error deleting backup:', error);
      throw new Error(`Failed to delete backup: ${error.message}`);
    }
  }

  // Cleanup expired backups
  async cleanupExpiredBackups() {
    try {
      const expiredBackups = await CloudBackup.findAll({
        where: {
          expiryDate: {
            [require('sequelize').Op.lt]: new Date()
          }
        }
      });

      let deletedCount = 0;
      for (const backup of expiredBackups) {
        try {
          const filePath = path.join(this.backupDir, backup.storageKey);
          try {
            await fs.unlink(filePath);
          } catch {
            console.warn(`File not found for deletion: ${backup.storageKey}`);
          }

          await backup.destroy();
          deletedCount++;
          console.log(`🗑️ Deleted expired backup: ${backup.backupName}`);
        } catch (error) {
          console.error(`Error deleting expired backup ${backup.backupName}:`, error);
        }
      }

      console.log(`✅ Cleanup completed: ${deletedCount} expired backups deleted`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up backups:', error);
      throw new Error('Failed to cleanup backups');
    }
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // Get backup statistics
  async getBackupStats(userId) {
    try {
      const backups = await CloudBackup.findAll({
        where: { userId },
        attributes: [
          'id',
          'fileSize',
          'status',
          'createdAt'
        ]
      });

      const stats = {
        totalBackups: backups.length,
        totalSize: backups.reduce((sum, b) => sum + (b.fileSize || 0), 0),
        completedBackups: backups.filter(b => b.status === 'completed').length,
        lastBackup: backups.length > 0 ? backups[0].createdAt : null,
        formattedTotalSize: this.formatFileSize(
          backups.reduce((sum, b) => sum + (b.fileSize || 0), 0)
        )
      };

      return stats;
    } catch (error) {
      console.error('Error getting backup stats:', error);
      throw new Error('Failed to get backup statistics');
    }
  }
}

module.exports = new CloudBackupService();