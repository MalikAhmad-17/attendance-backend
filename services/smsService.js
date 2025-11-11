
// backend/services/smsService.js
const twilio = require('twilio');
const { Settings } = require('../models');

class SMSService {
  constructor() {
    this.client = null;
  }

  async getClient() {
    try {
      const settings = await Settings.findOne({
        order: [['id', 'DESC']]
      });

      if (!settings || !settings.twilioAccountSid || !settings.twilioAuthToken) {
        throw new Error('SMS settings not configured');
      }

      if (!this.client) {
        this.client = twilio(settings.twilioAccountSid, settings.twilioAuthToken);
      }

      return {
        client: this.client,
        fromNumber: settings.twilioPhoneNumber
      };
    } catch (error) {
      console.error('Error creating SMS client:', error);
      throw error;
    }
  }

  async sendSMS(to, message) {
    try {
      const settings = await Settings.findOne({
        order: [['id', 'DESC']]
      });

      if (!settings || !settings.smsNotifications) {
        console.log('SMS notifications are disabled');
        return null;
      }

      const { client, fromNumber } = await this.getClient();

      if (!fromNumber) {
        throw new Error('Twilio phone number not configured');
      }

      const result = await client.messages.create({
        body: message,
        from: fromNumber,
        to
      });

      console.log(`✅ SMS sent: ${result.sid}`);
      return result;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  async sendBulkSMS(recipients, message) {
    try {
      const settings = await Settings.findOne({
        order: [['id', 'DESC']]
      });

      if (!settings || !settings.smsNotifications) {
        console.log('SMS notifications are disabled');
        return null;
      }

      const results = [];

      for (const recipient of recipients) {
        try {
          const result = await this.sendSMS(recipient, message);
          results.push({ phone: recipient, success: true, sid: result?.sid });
        } catch (error) {
          results.push({ phone: recipient, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Bulk SMS sent: ${successCount}/${recipients.length} successful`);

      return results;
    } catch (error) {
      console.error('Error sending bulk SMS:', error);
      throw error;
    }
  }

  async sendAttendanceAlert(phone, userName, type, date) {
    try {
      if (!phone) {
        console.log('No phone number provided');
        return null;
      }

      let message = '';

      switch (type) {
        case 'absent':
          message = `Attendance Alert: ${userName} was absent on ${date}. Please contact the institution for details.`;
          break;
        case 'late':
          message = `Attendance Alert: ${userName} arrived late on ${date}. Late arrival recorded.`;
          break;
        case 'early_leave':
          message = `Attendance Alert: ${userName} left early on ${date}. Please ensure full attendance.`;
          break;
        default:
          message = `Attendance notification for ${userName} on ${date}.`;
      }

      return await this.sendSMS(phone, message);
    } catch (error) {
      console.error('Error sending attendance alert SMS:', error);
      throw error;
    }
  }

  async sendTestSMS(phoneNumber) {
    const message = `This is a test message from Attendance Management System. SMS configuration is working correctly! Sent at ${new Date().toLocaleString()}`;

    return await this.sendSMS(phoneNumber, message);
  }
}

module.exports = new SMSService();
