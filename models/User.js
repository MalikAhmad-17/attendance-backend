// backend/models/User.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    // auto-generated id (INTEGER, PRIMARY KEY, autoIncrement) will be created by Sequelize
    fullName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'teacher', 'student'),
      allowNull: false
    },
    uid: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true
    },
    dept: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    photo: {
      type: DataTypes.STRING(1024),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    resetPasswordToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    accountLockedUntil: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'users'
  });

  // Instance method: generate password reset token
  User.prototype.generatePasswordResetToken = async function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(resetToken).digest('hex');

    this.resetPasswordToken = hashed;
    // expire in 1 hour
    this.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await this.save();
    return resetToken;
  };

  // Instance method: reset failed login attempts
  User.prototype.resetFailedAttempts = async function() {
    this.failedLoginAttempts = 0;
    this.accountLockedUntil = null;
    await this.save();
  };

  // Hook: hash password before create or update if changed
  User.beforeCreate(async (user, options) => {
    if (user.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  });

  User.beforeUpdate(async (user, options) => {
    // only hash if password changed
    if (user.changed('password')) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  });

  // Optionally: associate createdBy to another user (self reference)
  User.associate = (models) => {
    if (models.User) {
      User.belongsTo(models.User, {
        as: 'creator',
        foreignKey: 'createdBy',
        constraints: false
      });
    }
  };

  return User;
};
