require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./src/config/db');

const app = express();

// Middleware
app.use(cors()); // Cho phép tất cả origin (dev)
app.use(express.json());

// Routes
const eventRoutes = require('./src/routes/events');
app.use('/api/events', eventRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend đang chạy!' });
});

// Khởi động server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Không thể khởi động server do lỗi CSDL:', err);
});