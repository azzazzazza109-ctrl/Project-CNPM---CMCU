import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api', // Nhờ proxy, request sẽ được chuyển đến backend
    headers: {
        'Content-Type': 'application/json',
    },
});

export default apiClient;