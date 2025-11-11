
// backend/server.js

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Initialize sequelize and models
const { sequelize } = require('./models');

// Initialize cron service
const cronService = require('./services/cronService');

const app = express();

// Basic middleware
app.use(helmet());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});

app.use(limiter);

// Serve static files from backups directory (for downloads)
app.use('/backups', express.static(path.join(__dirname, 'backups')));

// ============================================
// Register routes
// ============================================

// Authentication & Users
app.use('/api/auth', require('./controllers/authController'));
app.use('/api/users', require('./controllers/userController'));

// Core Features
app.use('/api/attendance', require('./controllers/attendanceController'));
app.use('/api/settings', require('./controllers/settingsController'));
app.use('/api/reports', require('./controllers/reportsController'));

// NEW ROUTES: 2FA and Cloud Backups (PRODUCTION READY)
// ====================================================
app.use('/api/2fa', require('./controllers/twoFactorAuthController'));
app.use('/api/backup', require('./controllers/cloudBackupController'));

// ============================================
// Health check endpoint
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
    features: {
      authentication: true,
      attendance: true,
      twoFactorAuth: true,
      cloudBackup: true,
      reports: true
    }
  });
});

// ============================================
// Error handling middleware
// ============================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// 404 handler
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ============================================
// Sync DB models then start server
// ============================================
const start = async () => {
  try {
    // In production, replace sync({ alter: true }) with migrations
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized');

    // Initialize cron jobs
    await cronService.initializeJobs();
    console.log('✅ Cron jobs initialized');

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'not set'}`);
      console.log(`🔐 2FA: Enabled`);
      console.log(`💾 Cloud Backup: Enabled`);
      console.log(`📧 Email Service: Ready`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// ============================================
// Graceful shutdown
// ============================================
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  cronService.stopAll();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  cronService.stopAll();
  process.exit(0);
});

start();

module.exports = app;