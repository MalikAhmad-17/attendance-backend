
// backend/models/TwoFactorAuth.js

module.exports = (sequelize, DataTypes) => {
  const TwoFactorAuth = sequelize.define('TwoFactorAuth', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      unique: true
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    secret: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    backupCodes: {
      type: DataTypes.JSON,
      allowNull: true
    },
    qrCode: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'two_factor_auth',
    timestamps: true
  });

  TwoFactorAuth.associate = (models) => {
    if (models.User) {
      TwoFactorAuth.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  };

  return TwoFactorAuth;
};
