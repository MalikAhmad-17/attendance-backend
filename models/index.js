
// backend/models/index.js - UPDATED WITH NEW MODELS

const Sequelize = require('sequelize');
const path = require('path');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'attendance_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'admin123',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: false
    }
  }
);

const db = {};

// Import all models
db.User = require('./User')(sequelize, Sequelize.DataTypes);
db.Attendance = require('./Attendance')(sequelize, Sequelize.DataTypes);
db.Settings = require('./Settings')(sequelize, Sequelize.DataTypes);

// NEW MODELS FOR 2FA AND CLOUD BACKUPS
db.TwoFactorAuth = require('./TwoFactorAuth')(sequelize, Sequelize.DataTypes);
db.CloudBackup = require('./CloudBackup')(sequelize, Sequelize.DataTypes);

// Setup associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;