// backend/models/index.js
const initSequelize = require('../config/db');
const { DataTypes } = require('sequelize');

const sequelize = initSequelize();

// define User model here (or import from separate file)
const User = require('./User')(sequelize, DataTypes);

// If you have relations to setup, do them here:
// Example self reference for createdBy:
if (User && User.associate) {
  User.associate({ User });
}

module.exports = {
  sequelize,
  User
};
