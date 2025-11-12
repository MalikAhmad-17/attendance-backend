
// backend/models/CloudBackup.js

module.exports = (sequelize, DataTypes) => {
  const CloudBackup = sequelize.define('CloudBackup', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    backupName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    backupType: {
      type: DataTypes.ENUM('manual', 'automatic', 'scheduled'),
      allowNull: false,
      defaultValue: 'manual'
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'restoring'),
      allowNull: false,
      defaultValue: 'pending'
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    storageKey: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    storageProvider: {
      type: DataTypes.ENUM('local', 's3', 'gcs', 'azure'),
      allowNull: false,
      defaultValue: 'local'
    },
    checksum: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    retentionDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isEncrypted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    encryptionKey: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    restoredAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'cloud_backups',
    timestamps: true,
    indexes: [
      { fields: ['userId', 'createdAt'] },
      { fields: ['status'] },
      { fields: ['expiryDate'] }
    ]
  });

  CloudBackup.associate = (models) => {
    if (models.User) {
      CloudBackup.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  };

  return CloudBackup;
};
