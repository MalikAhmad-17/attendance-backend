
// backend/services/emailService.js

const nodemailer = require('nodemailer');
const { Settings } = require('../models');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  async getTransporter() {
    try {
      const settings = await Settings.findOne({
        order: [['id', 'DESC']]
      });

      if (!settings || !settings.smtpHost) {
        throw new Error('Email settings not configured');
      }

      this.transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpSecure,
        auth: {
          user: settings.smtpUsername || settings.fromEmail,
          pass: settings.smtpPassword
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      return this.transporter;
    } catch (error) {
      console.error('Error creating email transporter:', error);
      throw error;
    }
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      const settings = await Settings.findOne({
        order: [['id', 'DESC']]
      });

      if (!settings || !settings.emailNotifications) {
        console.log('Email notifications are disabled');
        return null;
      }

      const transporter = await this.getTransporter();

      const mailOptions = {
        from: "\"" + (settings.systemName || 'Attendance System') + "\" <" + settings.fromEmail + ">",
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendTestEmail(testEmail) {
    try {
      const settings = await Settings.findOne({
        order: [['id', 'DESC']]
      });

      const html = this.createHtml(
        'Test Email - SMTP Configuration',
        'This is a test email from your Attendance Management System.<br>If you received this, your SMTP is working!'
      );

      return await this.sendEmail(testEmail, 'Test Email from Attendance System', html);
    } catch (error) {
      console.error('Error sending test email:', error);
      throw error;
    }
  }

  async sendAccountCreatedEmail(user, tempPassword) {
    try {
      const settings = await Settings.findOne({
        order: [['id', 'DESC']]
      });

      const html = this.createHtml(
        'Account Created',
        'Dear ' + user.fullName + ',<br><br>' +
        'Your account has been created successfully!<br><br>' +
        'Email: ' + user.email + '<br>' +
        'Role: ' + user.role + '<br>' +
        'Temporary Password: ' + tempPassword + '<br><br>' +
        'Please change your password after first login.'
      );

      return await this.sendEmail(
        user.email,
        'Your Account Created',
        html
      );
    } catch (error) {
      console.error('Error sending account created email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(user, resetUrl) {
    try {
      const html = this.createHtml(
        'Password Reset Request',
        'Dear ' + user.fullName + ',<br><br>' +
        'We received a request to reset your password.<br><br>' +
        'Click link: <a href="' + resetUrl + '">Reset Password</a><br><br>' +
        'This link expires in 1 hour.<br>' +
        'If you did not request this, ignore this email.'
      );

      return await this.sendEmail(
        user.email,
        'Password Reset Request',
        html
      );
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  async sendDailyReportEmail(adminEmail, reportData) {
    try {
      const settings = await Settings.findOne({
        order: [['id', 'DESC']]
      });

      if (!settings.dailyReports) {
        return null;
      }

      const { totalUsers, present, absent, late, onLeave } = reportData;

      const html = this.createHtml(
        'Daily Attendance Report',
        '<table border="1"><tr><th>Metric</th><th>Count</th></tr>' +
        '<tr><td>Total Users</td><td>' + totalUsers + '</td></tr>' +
        '<tr><td>Present</td><td>' + present + '</td></tr>' +
        '<tr><td>Absent</td><td>' + absent + '</td></tr>' +
        '<tr><td>Late</td><td>' + late + '</td></tr>' +
        '<tr><td>On Leave</td><td>' + onLeave + '</td></tr>' +
        '</table>'
      );

      return await this.sendEmail(
        adminEmail,
        'Daily Attendance Report - ' + new Date().toLocaleDateString(),
        html
      );
    } catch (error) {
      console.error('Error sending daily report:', error);
      throw error;
    }
  }

  // Helper method to create HTML emails
  createHtml(title, content) {
    return '<html><head><style>body{font-family:Arial,sans-serif;}</style></head>' +
      '<body><h2>' + title + '</h2>' +
      '<p>' + content + '</p>' +
      '<hr>' +
      '<p><small>This is an automated email. Please do not reply.</small></p>' +
      '</body></html>';
  }

  // Helper method to strip HTML
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
  }
}

module.exports = new EmailService();
