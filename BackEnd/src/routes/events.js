const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/db');

// GET /api/events - Lấy danh sách sự kiện
router.get('/', async (req, res) => {
    try {
        const events = await executeQuery(
            `SELECT e.event_id, e.title, e.description, e.location, e.start_time, e.end_time, 
                    e.seat_capacity, e.status, u.full_name as creator_name
             FROM events e
             JOIN users u ON e.created_by = u.user_id
             ORDER BY e.start_time DESC`
        );
        res.json({ success: true, data: events });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;