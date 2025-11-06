const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true, 
    lowercase: true, 
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: { 
    type: String, 
    enum: {
      values: ['admin', 'teacher', 'student'],
      message: '{VALUE} is not a valid role'
    },
    default: 'student'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true // adds createdAt and updatedAt
});

// Index for faster queries
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
