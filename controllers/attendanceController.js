// backend/controllers/attendanceController.js
const express = require('express');
const router = express.Router();
const { User, sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

/*
 Note: Your original project likely used a dedicated Attendance collection.
 If you want a full relational attendance table, create a models/Attendance.js
 Sequelize model and update these endpoints to use that model instead of raw queries.
 For a quick migration, below uses a simple raw table 'attendances' (assumes you will create it).
*/

// Simple check-in endpoint that inserts into 'attendances' table
router.post('/checkin', async (req, res) => {
  try {
    const { userId, status = 'present', meta = null } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId required' });

    const now = new Date();
    // Insert attendance record
    const insertSql = `
      INSERT INTO attendances (user_id, status, meta, createdAt, updatedAt)
      VALUES (:userId, :status, :meta, :now, :now)
    `;
    await sequelize.query(insertSql, {
      replacements: { userId, status, meta: meta ? JSON.stringify(meta) : null, now },
      type: QueryTypes.INSERT
    });

    res.json({ success: true, message: 'Checked in' });
  } catch (err) {
    console.error('checkin error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get attendance for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const rows = await sequelize.query(
      `SELECT * FROM attendances WHERE user_id = :userId ORDER BY createdAt DESC LIMIT 500`,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );
    res.json({ success: true, records: rows });
  } catch (err) {
    console.error('get attendance', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
