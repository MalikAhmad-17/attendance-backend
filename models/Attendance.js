
// backend/models/Attendance.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Attendance = sequelize.define('Attendance', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('present', 'late', 'absent'),
      allowNull: false,
      defaultValue: 'present'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    checkIn: {
      type: DataTypes.TIME,
      allowNull: true
    },
    checkOut: {
      type: DataTypes.TIME,
      allowNull: true
    },
    hours: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    meta: {
      type: DataTypes.JSON,
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
    tableName: 'attendances',
    timestamps: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['date']
      },
      {
        fields: ['status']
      },
      {
        fields: ['user_id', 'date'],
        unique: true
      }
    ]
  });

  Attendance.associate = (models) => {
    if (models.User) {
      Attendance.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  };

  return Attendance;
};
