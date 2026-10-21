const express = require('express');
const app = express();
const path = require('path');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ticketRoutes = require('./src/routes/ticketRoutes');
app.use('/api/tickets', ticketRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ticket-view.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server CMCU Backend đang chạy tại: http://localhost:${PORT}`);
});