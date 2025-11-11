
// backend/controllers/reportsController.js
const express = require('express');
const router = express.Router();
const { User, Attendance, sequelize } = require('../models');
const { QueryTypes, Op } = require('sequelize');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// ==========================================
// GET /api/reports
// Query params: user (id or 'all'), status, fromDate, toDate, page, limit
// ==========================================
router.get('/', async (req, res) => {
  try {
    const { 
      user = 'all', 
      status = 'all', 
      fromDate, 
      toDate, 
      page = 1, 
      limit = 1000 
    } = req.query;

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const where = {};

    // Filter by user
    if (user && user !== 'all') {
      where.user_id = user;
    }

    // Filter by status
    if (status && status !== 'all') {
      where.status = status;
    }

    // Filter by date range
    if (fromDate && toDate) {
      where.date = { [Op.between]: [fromDate, toDate] };
    } else if (fromDate) {
      where.date = { [Op.gte]: fromDate };
    } else if (toDate) {
      where.date = { [Op.lte]: toDate };
    }

    // Fetch records with user information
    const records = await Attendance.findAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'fullName', 'email', 'uid', 'dept', 'role']
      }],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Format records for frontend
    const formattedRecords = records.map(record => {
      const r = record.toJSON();
      return {
        id: r.id,
        userId: r.user_id,
        name: r.user?.fullName || r.user?.email || 'Unknown',
        email: r.user?.email,
        status: r.status,
        date: r.date,
        checkIn: r.checkIn || '-',
        checkOut: r.checkOut || '-',
        hours: r.hours || '0.00',
        notes: r.notes,
        createdAt: r.createdAt
      };
    });

    // Count total records
    const totalRecords = await Attendance.count({ where });

    // Calculate aggregates
    const aggregates = await Attendance.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('status')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const present = Number(aggregates.find(a => a.status === 'present')?.count || 0);
    const late = Number(aggregates.find(a => a.status === 'late')?.count || 0);
    const absent = Number(aggregates.find(a => a.status === 'absent')?.count || 0);
    const total = present + late + absent;
    const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 10000) / 100 : 0;

    res.json({
      success: true,
      records: formattedRecords,
      totalRecords,
      aggregates: {
        present,
        late,
        absent,
        total,
        attendanceRate
      }
    });
  } catch (err) {
    console.error('reports error', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    });
  }
});

// ==========================================
// GET /api/reports/export
// Export reports data
// ==========================================
router.get('/export', async (req, res) => {
  try {
    const { format = 'json', user = 'all', status = 'all', fromDate, toDate } = req.query;

    const where = {};

    if (user && user !== 'all') {
      where.user_id = user;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (fromDate && toDate) {
      where.date = { [Op.between]: [fromDate, toDate] };
    } else if (fromDate) {
      where.date = { [Op.gte]: fromDate };
    } else if (toDate) {
      where.date = { [Op.lte]: toDate };
    }

    const records = await Attendance.findAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['fullName', 'email', 'uid', 'dept']
      }],
      order: [['date', 'DESC']],
      limit: 5000
    });

    const formattedRecords = records.map(r => ({
      Date: r.date,
      Name: r.user?.fullName || 'N/A',
      Email: r.user?.email || 'N/A',
      ID: r.user?.uid || 'N/A',
      Department: r.user?.dept || 'N/A',
      Status: r.status,
      CheckIn: r.checkIn || '-',
      CheckOut: r.checkOut || '-',
      Hours: r.hours || '0.00'
    }));

    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(formattedRecords[0] || {}).join(',');
      const rows = formattedRecords.map(record => 
        Object.values(record).map(val => `"${val}"`).join(',')
      ).join('\\n');
      
      const csv = `${headers}\\n${rows}`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.csv');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: formattedRecords
      });
    }
  } catch (err) {
    console.error('export error', err);
    res.status(500).json({ 
      success: false, 
      message: 'Export failed',
      error: err.message 
    });
  }
});

module.exports = router;