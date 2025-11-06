// backend/controllers/userController.js
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { Op } = require('sequelize');

// Helper: append _id alias for Mongo-compatibility (so frontend code that uses _id keeps working)
function withIdAlias(userInstance) {
  if (!userInstance) return null;
  const obj = userInstance.toJSON ? userInstance.toJSON() : { ...userInstance };
  // alias id -> _id for older frontend code
  obj._id = obj.id;
  return obj;
}

// ---------------------------
// CREATE user
// ---------------------------
router.post('/', async (req, res) => {
  try {
    const { fullName, email, password, role, uid, dept, phone, address } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'email, password and role required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const created = await User.create({
      fullName,
      email: normalizedEmail,
      password,
      role,
      uid,
      dept,
      phone,
      address
    });

    const result = withIdAlias(created);
    delete result.password;
    return res.status(201).json({ success: true, user: result });
  } catch (err) {
    console.error('POST /users error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------------------------
// ADMIN RESET PASSWORD (NEW)
// POST /api/users/reset-password
// body: { userId: "<id or email>", newPassword: "<newpass>" }
// ---------------------------
router.post('/reset-password', async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'userId and newPassword (min 6 chars) required' });
    }

    // Try find by primary key first (numeric id)
    let user = await User.findByPk(userId);

    // fallback: maybe frontend passed _id or email
    if (!user) {
      user = await User.findOne({
        where: {
          [Op.or]: [
            { id: userId },
            { email: ('' + userId).toLowerCase().trim() }
          ]
        }
      });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Set password — model hooks will hash it before saving
    user.password = newPassword;
    // reset failed attempts and locks when admin resets password
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;

    await user.save();

    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('POST /users/reset-password error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------------------------
// GET current user by token
// ---------------------------
router.get('/me', async (req, res) => {
  try {
    const id = req.user && req.user.id;
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const u = withIdAlias(user);
    delete u.password;
    res.json({ success: true, user: u });
  } catch (err) {
    console.error('GET /users/me error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------
// LIST users
// ---------------------------
router.get('/', async (req, res) => {
  try {
    const q = {};
    if (req.query.role) q.role = req.query.role;
    if (req.query.email) q.email = { [Op.like]: `%${req.query.email}%` };

    const users = await User.findAll({
      where: q,
      attributes: { exclude: ['password', 'resetPasswordToken'] },
      limit: parseInt(req.query.limit, 10) || 100,
      order: [['createdAt', 'DESC']]
    });

    const mapped = users.map(withIdAlias).map(u => {
      delete u.password;
      return u;
    });

    res.json({ success: true, users: mapped });
  } catch (err) {
    console.error('GET /users', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------
// UPDATE user
// ---------------------------
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (updates.email) {
      const existing = await User.findOne({ where: { email: updates.email, id: { [Op.ne]: id } } });
      if (existing) return res.status(409).json({ message: 'Email already used' });
    }

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    Object.assign(user, updates);
    await user.save();
    const u = withIdAlias(user);
    delete u.password;
    res.json({ success: true, user: u });
  } catch (err) {
    console.error('PUT /users/:id', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------
// DELETE user
// ---------------------------
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await user.destroy();
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error('DELETE /users/:id', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
