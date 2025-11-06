const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');


// Create JWT and set httpOnly cookie
const setTokenCookie = (res, payload) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { 
    expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
  });
  
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  };
  
  res.cookie(process.env.COOKIE_NAME || 'att_token', token, cookieOptions);
};


// REGISTER
exports.register = async (req, res) => {
  const { email, password, role } = req.body;
  
  try {
    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required.' });
    }
    
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    
    // Check if user already exists
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered.' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    
    // Create user - default role is 'student' for new registrations
    const user = await User.create({ 
      email: email.toLowerCase().trim(), 
      password: hash, 
      role: role && ['admin', 'teacher', 'student'].includes(role) ? role : 'student'
    });
    
    // Create JWT payload with user data from database
    const payload = { 
      id: user._id, 
      email: user.email, 
      role: user.role // Role from database, not request
    };
    
    setTokenCookie(res, payload);
    
    res.status(201).json({ 
      success: true,
      user: payload 
    });
    
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};


// LOGIN - ✅ WITH ROLE VALIDATION
exports.login = async (req, res) => {
  const { email, password, selectedRole } = req.body;
  
  try {
    // ✅ Validate all three fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required.' });
    }

    if (!selectedRole) {
      return res.status(400).json({ message: 'Please select a role.' });
    }

    // ✅ Validate selectedRole is valid
    const validRoles = ['admin', 'teacher', 'student'];
    if (!validRoles.includes(selectedRole)) {
      return res.status(400).json({ message: 'Invalid role selected.' });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    
    // Verify password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // ✅ CRITICAL VALIDATION: Check if selected role matches database role
    if (user.role !== selectedRole) {
      // ❌ Role mismatch - Security violation!
      console.log(`⚠️ SECURITY: Role mismatch attempt`);
      console.log(`   Email: ${email}`);
      console.log(`   Expected role (from DB): ${user.role}`);
      console.log(`   Selected role (from form): ${selectedRole}`);
      console.log(`   Timestamp: ${new Date().toISOString()}`);
      
      return res.status(403).json({ 
        success: false,
        message: `❌ Role Mismatch! Your account role is "${user.role}", but you selected "${selectedRole}". Please select the correct role.`,
        actualRole: user.role,
        selectedRole: selectedRole
      });
    }

    // ✅ All validations passed - Create JWT with database role
    const payload = { 
      id: user._id, 
      email: user.email, 
      role: user.role  // Use database role, never use frontend role
    };
    
    setTokenCookie(res, payload);

    console.log(`✅ SUCCESS: User logged in`);
    console.log(`   Email: ${email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);

    res.json({ 
      success: true,
      user: payload 
    });
    
  } catch (err) {
    console.error('❌ LOGIN ERROR:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login.' 
    });
  }
};


// LOGOUT
exports.logout = async (req, res) => {
  try {
    res.clearCookie(process.env.COOKIE_NAME || 'att_token', { 
      httpOnly: true, 
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    console.log(`✅ User logged out at ${new Date().toISOString()}`);
    
    res.json({ 
      success: true,
      message: 'Logged out successfully' 
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during logout.' 
    });
  }
};


// GET CURRENT USER
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    res.json({ 
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};