
// backend/controllers/attendanceController.js
const express = require('express');
const router = express.Router();
const { User, Attendance, sequelize } = require('../models');
const { QueryTypes, Op } = require('sequelize');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// ==========================================
// POST /api/attendance/checkin
// Create or update attendance record
// ==========================================
router.post('/checkin', async (req, res) => {
  try {
    const { userId, status = 'present', checkIn, checkOut, notes } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId required' });
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Check if attendance already exists for today
    const existing = await Attendance.findOne({
      where: {
        user_id: userId,
        date: today
      }
    });

    let attendance;
    
    if (existing) {
      // Update existing record
      await existing.update({
        status,
        checkIn: checkIn || existing.checkIn,
        checkOut: checkOut || existing.checkOut,
        notes: notes || existing.notes,
        hours: checkIn && checkOut ? calculateHours(checkIn, checkOut) : existing.hours
      });
      attendance = existing;
    } else {
      // Create new record
      attendance = await Attendance.create({
        user_id: userId,
        status,
        date: today,
        checkIn: checkIn || null,
        checkOut: checkOut || null,
        notes: notes || null,
        hours: checkIn && checkOut ? calculateHours(checkIn, checkOut) : 0
      });
    }

    res.json({ 
      success: true, 
      message: 'Attendance recorded successfully',
      data: attendance 
    });
  } catch (err) {
    console.error('checkin error', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ==========================================
// GET /api/attendance/user/:userId
// Get attendance records for a specific user
// ==========================================
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 500, fromDate, toDate } = req.query;

    const where = { user_id: userId };
    
    if (fromDate) {
      where.date = { [Op.gte]: fromDate };
    }
    
    if (toDate) {
      where.date = { ...where.date, [Op.lte]: toDate };
    }

    const records = await Attendance.findAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'fullName', 'email', 'uid', 'dept']
      }],
      order: [['date', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({ success: true, records });
  } catch (err) {
    console.error('get attendance error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================================
// GET /api/attendance/user/:userId/stats
// Get attendance statistics for a user
// ==========================================
router.get('/user/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - parseInt(days));
    const fromDateStr = fromDate.toISOString().split('T')[0];

    const stats = await Attendance.findAll({
      where: {
        user_id: userId,
        date: { [Op.gte]: fromDateStr }
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('status')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const totalRecords = await Attendance.count({
      where: {
        user_id: userId,
        date: { [Op.gte]: fromDateStr }
      }
    });

    const present = stats.find(s => s.status === 'present')?.count || 0;
    const late = stats.find(s => s.status === 'late')?.count || 0;
    const absent = stats.find(s => s.status === 'absent')?.count || 0;

    const percentage = totalRecords > 0 
      ? Math.round(((present + late) / totalRecords) * 100) 
      : 0;

    res.json({ 
      success: true, 
      stats: {
        present: Number(present),
        late: Number(late),
        absent: Number(absent),
        total: totalRecords,
        percentage
      }
    });
  } catch (err) {
    console.error('get stats error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================================
// GET /api/attendance/today
// Get today's attendance for all users
// ==========================================
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const records = await Attendance.findAll({
      where: { date: today },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'fullName', 'email', 'uid', 'dept', 'role']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, records });
  } catch (err) {
    console.error('get today attendance error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================================
// GET /api/attendance/summary
// Get attendance summary (for dashboard)
// ==========================================
router.get('/summary', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { days = 7 } = req.query;

    // Today's summary
    const todayStats = await Attendance.findAll({
      where: { date: today },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('status')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Last N days summary
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - parseInt(days));
    const fromDateStr = fromDate.toISOString().split('T')[0];

    const weeklyStats = await Attendance.findAll({
      where: {
        date: { [Op.between]: [fromDateStr, today] }
      },
      attributes: [
        'date',
        'status',
        [sequelize.fn('COUNT', sequelize.col('status')), 'count']
      ],
      group: ['date', 'status'],
      order: [['date', 'ASC']],
      raw: true
    });

    const present = todayStats.find(s => s.status === 'present')?.count || 0;
    const late = todayStats.find(s => s.status === 'late')?.count || 0;
    const absent = todayStats.find(s => s.status === 'absent')?.count || 0;
    const total = Number(present) + Number(late) + Number(absent);

    res.json({
      success: true,
      today: {
        present: Number(present),
        late: Number(late),
        absent: Number(absent),
        total
      },
      weekly: weeklyStats
    });
  } catch (err) {
    console.error('get summary error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================================
// PUT /api/attendance/:id
// Update attendance record
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, checkIn, checkOut, notes } = req.body;

    const attendance = await Attendance.findByPk(id);
    
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (checkIn) updateData.checkIn = checkIn;
    if (checkOut) updateData.checkOut = checkOut;
    if (notes !== undefined) updateData.notes = notes;
    
    if (checkIn || checkOut) {
      const ci = checkIn || attendance.checkIn;
      const co = checkOut || attendance.checkOut;
      if (ci && co) {
        updateData.hours = calculateHours(ci, co);
      }
    }

    await attendance.update(updateData);

    res.json({ 
      success: true, 
      message: 'Attendance updated successfully',
      data: attendance 
    });
  } catch (err) {
    console.error('update attendance error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================================
// DELETE /api/attendance/:id
// Delete attendance record
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findByPk(id);
    
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    await attendance.destroy();

    res.json({ 
      success: true, 
      message: 'Attendance record deleted successfully' 
    });
  } catch (err) {
    console.error('delete attendance error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function calculateHours(checkIn, checkOut) {
  try {
    const [inHour, inMin] = checkIn.split(':').map(Number);
    const [outHour, outMin] = checkOut.split(':').map(Number);
    
    const inMinutes = inHour * 60 + inMin;
    const outMinutes = outHour * 60 + outMin;
    
    const diffMinutes = outMinutes - inMinutes;
    const hours = (diffMinutes / 60).toFixed(2);
    
    return Math.max(0, parseFloat(hours));
  } catch (err) {
    return 0;
  }
}

module.exports = router;
