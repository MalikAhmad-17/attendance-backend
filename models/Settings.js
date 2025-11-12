
// backend/models/Settings.js

module.exports = (sequelize, DataTypes) => {
  const Settings = sequelize.define('Settings', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // ============================================
    // NOTIFICATION SETTINGS
    // ============================================
    emailNotifications: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    smsNotifications: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    pushNotifications: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    dailyReports: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    dailyReportTime: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: '18:00'
    },

    // ============================================
    // WORKING HOURS CONFIGURATION
    // ============================================
    standardCheckIn: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: '09:00'
    },
    standardCheckOut: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: '17:00'
    },
    lateArrivalThreshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15
    },
    minimumWorkingHours: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 4.5
    },

    // ============================================
    // EMAIL SERVICE CONFIGURATION
    // ============================================
    smtpHost: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: 'smtp.gmail.com'
    },
    smtpPort: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 587
    },
    smtpSecure: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    smtpUsername: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    smtpPassword: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    fromEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: 'noreply@attendance.com'
    },

    // ============================================
    // SECURITY SETTINGS
    // ============================================
    sessionTimeout: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60
    },
    
    // ✅ 2FA FIELD (FIXED - was: twoFactorAuth)
    require2FA: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    
    maxLoginAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5
    },
    lockoutDuration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30
    },
    passwordMinLength: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 8
    },

    // ============================================
    // BACKUP SETTINGS
    // ============================================
    automaticBackups: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    backupFrequency: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      allowNull: false,
      defaultValue: 'daily'
    },
    backupTime: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: '02:00'
    },
    backupRetentionDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30
    },
    lastBackupDate: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // ============================================
    // SMS CONFIGURATION (TWILIO)
    // ============================================
    smsProvider: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'twilio'
    },
    twilioAccountSid: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    twilioAuthToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    twilioPhoneNumber: {
      type: DataTypes.STRING(50),
      allowNull: true
    },

    // ============================================
    // PUSH NOTIFICATION CONFIGURATION (FIREBASE)
    // ============================================
    fcmServerKey: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fcmProjectId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },

    // ============================================
    // SYSTEM SETTINGS
    // ============================================
    systemName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'Attendance Management System'
    },
    systemEmail: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    systemPhone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    timezone: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Asia/Kolkata'
    },
    dateFormat: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'DD/MM/YYYY'
    },
    timeFormat: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '24h'
    },

    // ============================================
    // AUDIT TRAIL
    // ============================================
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'settings',
    timestamps: true
  });

  // ============================================
  // ASSOCIATIONS
  // ============================================
  Settings.associate = (models) => {
    if (models.User) {
      Settings.belongsTo(models.User, {
        as: 'updater',
        foreignKey: 'updatedBy',
        constraints: false
      });
    }
  };

  return Settings;
};