import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api', // Trỏ đúng port Backend
    withCredentials: true, // Để gửi cookie session
});

export default api;