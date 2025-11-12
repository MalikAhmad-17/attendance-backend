
// backend/services/cronService.js
const cron = require('node-cron');
const { Settings, User } = require('../models');
const backupService = require('./backupService');
const emailService = require('./emailService');
const { Op } = require('sequelize');

class CronService {
  constructor() {
    this.jobs = {};
  }

  async initializeJobs() {
    console.log('🕐 Initializing cron jobs...');

    // Daily backup job - runs at configured time
    this.jobs.backup = cron.schedule('0 2 * * *', async () => {
      try {
        console.log('⏰ Running scheduled backup...');
        const settings = await Settings.findOne({
          order: [['id', 'DESC']]
        });

        if (settings && settings.automaticBackups) {
          await backupService.scheduleAutomaticBackup(settings);
          console.log('✅ Scheduled backup completed');
        }
      } catch (error) {
        console.error('❌ Scheduled backup failed:', error);
      }
    });

    // Daily report job - runs at configured time (default 6 PM)
    this.jobs.dailyReport = cron.schedule('0 18 * * *', async () => {
      try {
        console.log('⏰ Generating daily attendance report...');
        const settings = await Settings.findOne({
          order: [['id', 'DESC']]
        });

        if (settings && settings.dailyReports) {
          await this.generateAndSendDailyReport();
          console.log('✅ Daily report sent');
        }
      } catch (error) {
        console.error('❌ Daily report failed:', error);
      }
    });

    // Cleanup old backups - runs daily at 3 AM
    this.jobs.cleanup = cron.schedule('0 3 * * *', async () => {
      try {
        console.log('⏰ Cleaning up old backups...');
        const settings = await Settings.findOne({
          order: [['id', 'DESC']]
        });

        if (settings) {
          const deletedCount = await backupService.cleanupOldBackups(settings.backupRetentionDays);
          console.log(`✅ Cleaned up ${deletedCount} old backup(s)`);
        }
      } catch (error) {
        console.error('❌ Backup cleanup failed:', error);
      }
    });

    // Reset failed login attempts - runs every hour
    this.jobs.resetLoginAttempts = cron.schedule('0 * * * *', async () => {
      try {
        const now = new Date();
        const usersToReset = await User.findAll({
          where: {
            accountLockedUntil: {
              [Op.lt]: now
            },
            failedLoginAttempts: {
              [Op.gt]: 0
            }
          }
        });

        for (const user of usersToReset) {
          await user.resetFailedAttempts();
        }

        if (usersToReset.length > 0) {
          console.log(`✅ Reset login attempts for ${usersToReset.length} user(s)`);
        }
      } catch (error) {
        console.error('❌ Failed to reset login attempts:', error);
      }
    });

    console.log('✅ Cron jobs initialized');
  }

  async generateAndSendDailyReport() {
    try {
      const settings = await Settings.findOne({
        order: [['id', 'DESC']]
      });

      // Get admin users
      const admins = await User.findAll({
        where: { role: 'admin', isActive: true },
        attributes: ['email', 'fullName']
      });

      if (admins.length === 0) {
        console.log('No active admin users found');
        return;
      }

      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Get all active users
      const totalUsers = await User.count({
        where: { isActive: true, role: { [Op.ne]: 'admin' } }
      });

      // This is a simplified report - you would get actual attendance data
      // from your attendance table
      const reportData = {
        date: today,
        totalUsers,
        present: 0,  // Replace with actual query
        absent: 0,   // Replace with actual query
        late: 0,     // Replace with actual query
        onLeave: 0   // Replace with actual query
      };

      // Send email to all admins
      for (const admin of admins) {
        if (admin.email) {
          await emailService.sendDailyReport(admin.email, reportData);
        }
      }

      console.log(`Daily report sent to ${admins.length} admin(s)`);
    } catch (error) {
      console.error('Error generating daily report:', error);
      throw error;
    }
  }

  async updateBackupSchedule(settings) {
    // Stop existing backup job
    if (this.jobs.backup) {
      this.jobs.backup.stop();
    }

    if (!settings.automaticBackups) {
      console.log('Automatic backups disabled');
      return;
    }

    // Parse backup time (format: "HH:MM")
    const [hour, minute] = settings.backupTime.split(':');

    // Create new cron schedule based on frequency
    let schedule;
    switch (settings.backupFrequency) {
      case 'daily':
        schedule = `${minute} ${hour} * * *`;
        break;
      case 'weekly':
        schedule = `${minute} ${hour} * * 0`; // Sunday
        break;
      case 'monthly':
        schedule = `${minute} ${hour} 1 * *`; // 1st of month
        break;
      default:
        schedule = `${minute} ${hour} * * *`;
    }

    // Create new backup job
    this.jobs.backup = cron.schedule(schedule, async () => {
      try {
        console.log('⏰ Running scheduled backup...');
        await backupService.scheduleAutomaticBackup(settings);
        console.log('✅ Scheduled backup completed');
      } catch (error) {
        console.error('❌ Scheduled backup failed:', error);
      }
    });

    console.log(`✅ Backup schedule updated: ${settings.backupFrequency} at ${settings.backupTime}`);
  }

  async updateDailyReportSchedule(settings) {
    // Stop existing report job
    if (this.jobs.dailyReport) {
      this.jobs.dailyReport.stop();
    }

    if (!settings.dailyReports) {
      console.log('Daily reports disabled');
      return;
    }

    // Parse report time (format: "HH:MM")
    const [hour, minute] = settings.dailyReportTime.split(':');
    const schedule = `${minute} ${hour} * * *`;

    // Create new report job
    this.jobs.dailyReport = cron.schedule(schedule, async () => {
      try {
        console.log('⏰ Generating daily attendance report...');
        await this.generateAndSendDailyReport();
        console.log('✅ Daily report sent');
      } catch (error) {
        console.error('❌ Daily report failed:', error);
      }
    });

    console.log(`✅ Daily report schedule updated: ${settings.dailyReportTime}`);
  }

  stopAll() {
    console.log('🛑 Stopping all cron jobs...');
    Object.values(this.jobs).forEach(job => {
      if (job && job.stop) {
        job.stop();
      }
    });
    console.log('✅ All cron jobs stopped');
  }
}

module.exports = new CronService();
