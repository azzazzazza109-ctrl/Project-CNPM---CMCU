const express = require('express');
const app = express();
const path = require('path');

app.use(express.json());
// Cấu hình phục vụ thư mục public chứa giao diện HTML/CSS của Nhi
app.use(express.static(path.join(__dirname, 'public')));

// Tuyến API xử lý vé của Long
const ticketRoutes = require('./src/routes/ticketRoutes');
app.use('/api/tickets', ticketRoutes);

// Điều hướng mặc định: Truy cập http://localhost:3000 -> Mở thẳng ticket-view.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ticket-view.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server CMCU Backend đang chạy tại: http://localhost:${PORT}`);
});