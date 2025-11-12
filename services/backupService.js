
// backend/services/backupService.js
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDirectory();
  }

  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error('Error creating backup directory:', error);
    }
  }

  async createBackup(userId) {
    try {
      await this.ensureBackupDirectory();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup_${timestamp}.sql`;
      const filePath = path.join(this.backupDir, filename);

      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || 3306;
      const dbName = process.env.DB_NAME || 'attendance_db';
      const dbUser = process.env.DB_USER || 'root';
      const dbPass = process.env.DB_PASS || '';

      // MySQL dump command
      const dumpCommand = `mysqldump -h ${dbHost} -P ${dbPort} -u ${dbUser} ${dbPass ? `-p${dbPass}` : ''} ${dbName} > "${filePath}"`;

      await execPromise(dumpCommand);

      console.log(`✅ Backup created: ${filename}`);

      // Create metadata file
      const metadataPath = path.join(this.backupDir, `${filename}.meta.json`);
      await fs.writeFile(metadataPath, JSON.stringify({
        filename,
        created: new Date(),
        createdBy: userId,
        size: (await fs.stat(filePath)).size,
        database: dbName
      }, null, 2));

      return filename;
    } catch (error) {
      console.error('Backup creation error:', error);
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  async getAvailableBackups() {
    try {
      await this.ensureBackupDirectory();
      const files = await fs.readdir(this.backupDir);

      const backupFiles = files.filter(f => f.endsWith('.sql'));

      const backups = await Promise.all(
        backupFiles.map(async (filename) => {
          const filePath = path.join(this.backupDir, filename);
          const metadataPath = path.join(this.backupDir, `${filename}.meta.json`);

          let metadata = {};
          try {
            const metaContent = await fs.readFile(metadataPath, 'utf-8');
            metadata = JSON.parse(metaContent);
          } catch (err) {
            // If metadata doesn't exist, get basic file info
            const stats = await fs.stat(filePath);
            metadata = {
              filename,
              created: stats.birthtime,
              size: stats.size
            };
          }

          return metadata;
        })
      );

      // Sort by date (newest first)
      backups.sort((a, b) => new Date(b.created) - new Date(a.created));

      return backups;
    } catch (error) {
      console.error('Error fetching backups:', error);
      throw new Error(`Failed to fetch backups: ${error.message}`);
    }
  }

  async restoreBackup(filename) {
    try {
      const filePath = path.join(this.backupDir, filename);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (err) {
        throw new Error('Backup file not found');
      }

      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || 3306;
      const dbName = process.env.DB_NAME || 'attendance_db';
      const dbUser = process.env.DB_USER || 'root';
      const dbPass = process.env.DB_PASS || '';

      // MySQL restore command
      const restoreCommand = `mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} ${dbPass ? `-p${dbPass}` : ''} ${dbName} < "${filePath}"`;

      await execPromise(restoreCommand);

      console.log(`✅ Database restored from: ${filename}`);
      return true;
    } catch (error) {
      console.error('Restore error:', error);
      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }

  async getBackupPath(filename) {
    const filePath = path.join(this.backupDir, filename);

    try {
      await fs.access(filePath);
      return filePath;
    } catch (err) {
      throw new Error('Backup file not found');
    }
  }

  async cleanupOldBackups(retentionDays = 30) {
    try {
      await this.ensureBackupDirectory();
      const files = await fs.readdir(this.backupDir);

      const now = Date.now();
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

      let deletedCount = 0;

      for (const file of files) {
        if (file.endsWith('.sql') || file.endsWith('.meta.json')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);

          if (now - stats.birthtimeMs > retentionMs) {
            await fs.unlink(filePath);
            deletedCount++;
            console.log(`🗑️ Deleted old backup: ${file}`);
          }
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up backups:', error);
      throw new Error(`Failed to cleanup backups: ${error.message}`);
    }
  }

  async scheduleAutomaticBackup(settings) {
    // This will be called by the cron job
    try {
      if (!settings.automaticBackups) {
        return null;
      }

      const backup = await this.createBackup(0); // System user

      // Cleanup old backups
      await this.cleanupOldBackups(settings.backupRetentionDays);

      return backup;
    } catch (error) {
      console.error('Scheduled backup error:', error);
      throw error;
    }
  }
}

module.exports = new BackupService();
