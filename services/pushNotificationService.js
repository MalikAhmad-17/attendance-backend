
// backend/services/pushNotificationService.js
const admin = require('firebase-admin');
const { Settings } = require('../models');

class PushNotificationService {
  constructor() {
    this.initialized = false;
    this.admin = null;
  }

  async initialize() {
    try {
      const settings = await Settings.findOne({
        order: [['id', 'DESC']]
      });

      if (!settings || !settings.fcmServerKey || !settings.fcmProjectId) {
        console.log('⚠️ Push notification settings not configured');
        return false;
      }

      if (!this.initialized) {
        // Parse the service account key
        let serviceAccount;
        try {
          serviceAccount = JSON.parse(settings.fcmServerKey);
        } catch (err) {
          console.error('Invalid FCM server key format');
          return false;
        }

        // Initialize Firebase Admin
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: settings.fcmProjectId
        });

        this.admin = admin;
        this.initialized = true;
        console.log('✅ Firebase Cloud Messaging initialized');
      }

      return true;
    } catch (error) {
      console.error('Error initializing FCM:', error);
      return false;
    }
  }

  async sendNotification(token, title, body, data = {}) {
    try {
      const settings = await Settings.findOne({
        order: [['id', 'DESC']]
      });

      if (!settings || !settings.pushNotifications) {
        console.log('Push notifications are disabled');
        return null;
      }

      if (!this.initialized) {
        const success = await this.initialize();
        if (!success) {
          throw new Error('Push notification service not initialized');
        }
      }

      const message = {
        notification: {
          title,
          body
        },
        data,
        token
      };

      const response = await this.admin.messaging().send(message);
      console.log('✅ Push notification sent:', response);

      return response;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  async sendToMultiple(tokens, title, body, data = {}) {
    try {
      const settings = await Settings.findOne({
        order: [['id', 'DESC']]
      });

      if (!settings || !settings.pushNotifications) {
        console.log('Push notifications are disabled');
        return null;
      }

      if (!this.initialized) {
        const success = await this.initialize();
        if (!success) {
          throw new Error('Push notification service not initialized');
        }
      }

      const message = {
        notification: {
          title,
          body
        },
        data,
        tokens
      };

      const response = await this.admin.messaging().sendMulticast(message);
      console.log(`✅ Push notifications sent: ${response.successCount}/${tokens.length}`);

      return response;
    } catch (error) {
      console.error('Error sending push notifications:', error);
      throw error;
    }
  }

  async sendAttendanceNotification(userToken, type, message) {
    try {
      let title = 'Attendance Alert';

      switch (type) {
        case 'absent':
          title = '🔴 Absence Alert';
          break;
        case 'late':
          title = '⚠️ Late Arrival';
          break;
        case 'checked_in':
          title = '✅ Check-in Confirmed';
          break;
        case 'checked_out':
          title = '👋 Check-out Confirmed';
          break;
        default:
          title = '📋 Attendance Notification';
      }

      return await this.sendNotification(
        userToken,
        title,
        message,
        { type, timestamp: new Date().toISOString() }
      );
    } catch (error) {
      console.error('Error sending attendance notification:', error);
      throw error;
    }
  }

  async sendToTopic(topic, title, body, data = {}) {
    try {
      const settings = await Settings.findOne({
        order: [['id', 'DESC']]
      });

      if (!settings || !settings.pushNotifications) {
        console.log('Push notifications are disabled');
        return null;
      }

      if (!this.initialized) {
        const success = await this.initialize();
        if (!success) {
          throw new Error('Push notification service not initialized');
        }
      }

      const message = {
        notification: {
          title,
          body
        },
        data,
        topic
      };

      const response = await this.admin.messaging().send(message);
      console.log(`✅ Notification sent to topic '${topic}':`, response);

      return response;
    } catch (error) {
      console.error('Error sending topic notification:', error);
      throw error;
    }
  }
}

module.exports = new PushNotificationService();
