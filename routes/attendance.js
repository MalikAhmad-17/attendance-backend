// backend/routes/attendance.js - UPDATED

const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// ========================================
// ADMIN/TEACHER ROUTES
// ========================================

// Get all attendance (admin/teacher only)
router.get('/', 
  authorizeRoles('admin', 'teacher'),
  attendanceController.getAllAttendance
);

// Get attendance summary (admin/teacher only)
router.get('/summary', 
  authorizeRoles('admin', 'teacher'),
  attendanceController.getAttendanceSummary
);

// ========================================
// USER STATS ROUTE (Public for all)
// ========================================

// Get stats for specific user (real-time percentage)
router.get('/user/:userId/stats', 
  attendanceController.getUserStats
);

// Get attendance for specific user
router.get('/user/:userId', 
  attendanceController.getUserAttendance
);

// ========================================
// SELF CHECK-IN ROUTES (Student/Teacher)
// ========================================

// Student/Teacher self check-in (QR code or manual)
router.post('/checkin', 
  authorizeRoles('student', 'teacher'),
  attendanceController.selfCheckIn
);

// ========================================
// ADMIN ONLY ROUTES
// ========================================

// Mark attendance for a user (admin/teacher only)
router.post('/mark', 
  authorizeRoles('admin', 'teacher'),
  attendanceController.markAttendance
);

// Mark attendance for multiple users (admin/teacher only)
router.post('/mark-bulk', 
  authorizeRoles('admin', 'teacher'),
  attendanceController.markAttendanceBulk
);

// Delete attendance record (admin only)
router.delete('/:id', 
  authorizeRoles('admin'),
  attendanceController.deleteAttendance
);

module.exports = router;