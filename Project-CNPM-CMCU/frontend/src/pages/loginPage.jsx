import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/auth/login', { email, password });
            // Lưu user vào localStorage để dùng cho các trang khác
            localStorage.setItem('user', JSON.stringify(res.data.user));
            
            // Điều hướng dựa theo quyền
            if (res.data.user.system_role === 'ADMIN') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Lỗi kết nối');
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Đăng Nhập Hệ Thống</h2>
            {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input 
                    type="email" placeholder="Email" 
                    value={email} onChange={e => setEmail(e.target.value)} 
                    style={{ padding: '10px' }} required 
                />
                <input 
                    type="password" placeholder="Mật khẩu" 
                    value={password} onChange={e => setPassword(e.target.value)} 
                    style={{ padding: '10px' }} required 
                />
                <button type="submit" style={{ padding: '10px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    Đăng Nhập
                </button>
            </form>
        </div>
    );
}