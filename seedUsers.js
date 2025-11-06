// backend/seedUsers.js
require('dotenv').config();
const { sequelize, User } = require('./models');

const seedUsers = [
  {
    fullName: 'Admin User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    uid: 'ADM-001'
  },
  {
    fullName: 'Teacher User',
    email: 'teacher@example.com',
    password: 'teacher123',
    role: 'teacher',
    uid: 'TCH-001'
  },
  {
    fullName: 'Student User',
    email: 'student@example.com',
    password: 'student123',
    role: 'student',
    uid: 'STU-001'
  }
];

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Sequelize authenticated for seeding.');

    for (const u of seedUsers) {
      const existing = await User.findOne({ where: { email: u.email } });

      if (!existing) {
        await User.create(u);
        console.log(`✅ Created user: ${u.email}`);
      } else {
        console.log(`ℹ️ User already exists: ${u.email}`);
      }
    }

    console.log('🎉 Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
};

run();
