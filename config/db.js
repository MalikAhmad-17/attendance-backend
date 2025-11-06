const { Sequelize } = require('sequelize');

let sequelize;

const initSequelize = () => {
  if (sequelize) return sequelize;

  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = process.env.DB_PORT || 3306;
  const DB_NAME = process.env.DB_NAME || 'attendance_db';
  const DB_USER = process.env.DB_USER || 'root';
  const DB_PASS = process.env.DB_PASS || '';

  // For production you may want to set dialectOptions.ssl = { /*...*/ }
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mysql',
    logging: false, // set true for debugging
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false
    }
  });

  // Test connection and sync models
  const testConnection = async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ MySQL (Sequelize) connected successfully');

      // 🔹 Sync models to create missing tables automatically
      await sequelize.sync({ alter: true });
      console.log('✅ All MySQL tables synchronized successfully');
    } catch (err) {
      console.error('❌ Unable to connect or sync to MySQL:', err);
      process.exit(1);
    }
  };

  testConnection();

  // graceful shutdown
  const gracefulShutdown = async () => {
    try {
      await sequelize.close();
      console.log('Sequelize connection closed gracefully');
      process.exit(0);
    } catch (err) {
      console.error('Error closing Sequelize connection', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

  return sequelize;
};

module.exports = initSequelize;
