// backend/test-email.js
require('dotenv').config();
const { sequelize, User } = require('./models');
const emailService = require('./services/emailService');

async function testAbsenceEmail() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    console.log('👤 Creating test user...');
    const testUser = await User.create({
      fullName: 'John Student',
      email: 'jt9734853@gmail.com',
      password: 'password123',
      role: 'student',
      uid: 'STU001',
      dept: 'Computer Science'
    });

    console.log('✅ Test user created:', testUser.fullName);
    console.log('📧 Sending absence alert email...');
    
    // Send absence alert
    await emailService.sendAttendanceAlert(
      testUser,
      'absent',
      new Date().toLocaleDateString()
    );

    console.log('✅ Email sent successfully!');
    console.log('📨 Check your inbox (jt9734853@gmail.com)');
    
    // Clean up
    await testUser.destroy();
    console.log('🧹 Test user cleaned up');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

testAbsenceEmail();