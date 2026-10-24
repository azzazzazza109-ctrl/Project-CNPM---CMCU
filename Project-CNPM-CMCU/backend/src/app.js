const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

// 1. Import các file routes
const ticketRoutes = require('./routes/ticketRoutes'); 

const app = express();

// 2. Cấu hình Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true })); 
app.use(express.json()); // Rất quan trọng để đọc dữ liệu JSON từ Frontend gửi lên
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false
}));

// 3. GẮN ROUTE VÀO ỨNG DỤNG
// Dòng này nói rằng: Mọi request bắt đầu bằng /api/tickets sẽ do ticketRoutes xử lý
app.use('/api/tickets', ticketRoutes); 

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const eventRoutes = require('./routes/eventRoutes');
app.use('/api/events', eventRoutes);

module.exports = app;