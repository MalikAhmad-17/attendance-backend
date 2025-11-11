require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('./models');

const seedUsers = [
  {
    fullName: 'Admin User',
    email: 'admin@example.com',
    plainPassword: 'admin123',
    role: 'admin',
    uid: 'ADM-001'
  },
  {
    fullName: 'Teacher User',
    email: 'teacher@example.com',
    plainPassword: 'teacher123',
    role: 'teacher',
    uid: 'TCH-001'
  },
  {
    fullName: 'Student User',
    email: 'student@example.com',
    plainPassword: 'student123',
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
        // Hash the password
        console.log(`🔐 Hashing password for ${u.email}...`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(u.plainPassword, salt);
        console.log(`✅ Password hashed: ${hashedPassword.substring(0, 20)}...`);
        
        // Create user with hashed password
        await User.create({
          fullName: u.fullName,
          email: u.email,
          password: hashedPassword,  // ✅ USE HASHED PASSWORD
          role: u.role,
          uid: u.uid,
          isActive: true,
          isVerified: true
        });
        
        console.log(`✅ Created user: ${u.email}`);
      } else {
        console.log(`ℹ️ User already exists: ${u.email}`);
      }
    }

    console.log('\n🎉 Seeding complete!');
    console.log('📝 Login with:');
    console.log('   admin@example.com / admin123');
    console.log('   teacher@example.com / teacher123');
    console.log('   student@example.com / student123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
    process.exit(1);
  }
};

run();
