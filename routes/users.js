// routes/users.js - User Management Routes
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use(authMiddleware);
router.use(authorizeRoles('admin'));

// User CRUD routes
router.get('/', userController.getAllUsers);
router.get('/stats', userController.getUserStats);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

// Admin password reset
router.post('/reset-password', userController.adminResetPassword);

module.exports = router;
