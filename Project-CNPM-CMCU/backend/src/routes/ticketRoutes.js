const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
// Chỉ khai báo requireLogin ĐÚNG 1 LẦN ở đây
const { requireLogin } = require('../middlewares/authMiddleware');

// Route đăng ký vé (Cần đăng nhập)
router.post('/register', requireLogin, ticketController.registerTicket);

// Route check-in (Không cần login vì nhân viên soát vé dùng)
router.post('/checkin', ticketController.checkinTicket);

// Route lấy danh sách vé của tôi (Cần đăng nhập)
router.get('/my-tickets', requireLogin, ticketController.getMyTickets);

// Route hủy vé (Cần đăng nhập)
router.post('/cancel', requireLogin, ticketController.cancelTicket);

module.exports = router;