// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// initialize sequelize and models
const { sequelize } = require('./models');

const app = express();

// Basic middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});
app.use(limiter);

// register routes (assuming your existing routers are the same)
app.use('/api/auth', require('./controllers/authController'));
app.use('/api/users', require('./controllers/userController'));
app.use('/api/attendance', require('./controllers/attendanceController'));

// Sync DB models then start server
const start = async () => {
  try {
    // In production, replace sync({ alter: true }) with migrations
    await sequelize.sync({ alter: true }); // safe for development; adjust for prod
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'not set'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();

module.exports = app;
