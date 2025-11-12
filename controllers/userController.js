
// backend/controllers/userController.js

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

// Import models (ensure models/index.js exports these)
const {
  sequelize,
  User,
  Settings,
  TwoFactorAuth,
  CloudBackup,
  Attendance
} = require('../models');

// Helper: append _id alias for Mongo-compatibility
function withIdAlias(userInstance) {
  if (!userInstance) return null;
  const obj = userInstance.toJSON ? userInstance.toJSON() : { ...userInstance };
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
      fullName: fullName || '',
      email: normalizedEmail,
      password,
      role,
      uid: uid || '',
      dept: dept || '',
      phone: phone || '',
      address: address || ''
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
// ADMIN RESET PASSWORD
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
// LIST users (MUST BE BEFORE /:id routes)
// ---------------------------
router.get('/', async (req, res) => {
  try {
    console.log('📝 GET /api/users called');

    const q = {};

    // Filter by role if provided
    if (req.query.role) {
      q.role = req.query.role;
      console.log('  Filtering by role:', req.query.role);
    }

    // Filter by email if provided
    if (req.query.email) {
      q.email = { [Op.like]: `%${req.query.email}%` };
      console.log('  Filtering by email:', req.query.email);
    }

    // Fetch all users
    const users = await User.findAll({
      where: q,
      attributes: { exclude: ['password', 'resetPasswordToken'] },
      limit: parseInt(req.query.limit, 10) || 1000,
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Found ${users.length} users`);

    // Map and remove passwords
    const mapped = users.map(withIdAlias).map(u => {
      delete u.password;
      return u;
    });

    res.json({ success: true, users: mapped });
  } catch (err) {
    console.error('❌ GET /users error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------------------------
// GET user by id
// ---------------------------
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const u = withIdAlias(user);
    delete u.password;
    res.json({ success: true, user: u });
  } catch (err) {
    console.error('GET /users/:id error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
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
      const existing = await User.findOne({
        where: {
          email: updates.email,
          id: { [Op.ne]: id }
        }
      });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already used' });
      }
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    Object.assign(user, updates);
    await user.save();

    const u = withIdAlias(user);
    delete u.password;
    res.json({ success: true, user: u });
  } catch (err) {
    console.error('PUT /users/:id error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------------------------
// DELETE user (SAFE) - nullify settings.updatedBy, remove 2FA/backups, commit in transaction
// ---------------------------
router.delete('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    console.log('🗑 Attempting delete user id:', id);

    const user = await User.findByPk(id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 1) Nullify Settings.updatedBy that reference this user
    if (Settings) {
      const [affectedCount] = await Settings.update(
        { updatedBy: null },
        { where: { updatedBy: id }, transaction: t }
      );
      if (affectedCount > 0) {
        console.log(`🔁 Nullified updatedBy in ${affectedCount} settings row(s) for user ${id}`);
      }
    }

    // 2) Delete TwoFactorAuth entries for this user (if model present)
    if (TwoFactorAuth && TwoFactorAuth.destroy) {
      await TwoFactorAuth.destroy({ where: { userId: id }, transaction: t });
    }

    // 3) Delete CloudBackup entries owned by user (if model present)
    if (CloudBackup && CloudBackup.destroy) {
      await CloudBackup.destroy({ where: { userId: id }, transaction: t });
    }

    // 4) Optionally nullify attendance.userId to preserve attendance history
    if (Attendance && Attendance.update) {
      try {
        await Attendance.update({ userId: null }, { where: { userId: id }, transaction: t });
      } catch (e) {
        // If attendance update fails, continue — it's non-critical for deletion
        console.warn('Could not nullify attendance.userId for user:', id, e.message || e);
      }
    }

    // 5) Delete the user
    await user.destroy({ transaction: t });

    await t.commit();
    console.log('✅ User deleted:', id);
    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    await t.rollback();
    console.error('DELETE /users/:id error:', err);

    // If FK constraint error, return human-friendly message
    if (err && err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user: referenced by other records. References have not been removed automatically.',
        detail: err.parent?.sqlMessage || err.message
      });
    }

    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
