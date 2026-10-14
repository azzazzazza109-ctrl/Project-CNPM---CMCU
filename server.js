const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.json({ message: 'API Server CMCU Event Platform đang hoạt động bình thường!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại cổng http://localhost:${PORT}`);
});