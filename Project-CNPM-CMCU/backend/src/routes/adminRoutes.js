const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middlewares/authMiddleware');
// Chỉ Admin mới được gọi API này
router.get('/users', requireAdmin, adminController.getAllUsers);
router.get('/tickets', requireAdmin, adminController.getAllTickets);
router.get('/users', adminController.getAllUsers);
router.get('/tickets', adminController.getAllTickets);

module.exports = router;