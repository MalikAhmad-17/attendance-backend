require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const users = [
  { email: 'admin@example.com', password: 'admin123', role: 'admin' },
  { email: 'teacher@example.com', password: 'teacher123', role: 'teacher' },
  { email: 'student@example.com', password: 'student123', role: 'student' }
];

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB for seeding');
  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(u.password, salt);
      await User.create({ email: u.email, password: hash, role: u.role });
      console.log('Created', u.email);
    } else {
      console.log('Already exists', u.email);
    }
  }
  mongoose.disconnect();
};
seed().catch(err => { console.error(err); mongoose.disconnect(); });
