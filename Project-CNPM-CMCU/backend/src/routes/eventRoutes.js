const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { requireAdmin } = require('../middlewares/authMiddleware');

// Ai cũng có thể xem danh sách sự kiện
router.get('/', eventController.getAllEvents);

// Chỉ Admin mới được tạo sự kiện mới
router.post('/', requireAdmin, eventController.createEvent);

module.exports = router;