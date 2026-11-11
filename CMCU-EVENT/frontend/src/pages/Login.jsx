import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            
            {/* Cột Trái: Banner */}
            <div className="auth-banner">
                <div className="banner-logo-wrapper">
                    <img src={logo} alt="CMCU Logo" className="banner-logo-img" />
                    <h1 style={{ margin: 0, color: 'white' }}>CMCU Events</h1>
                </div>
                <p>Hệ thống quản lý và đăng ký sự kiện dành cho sinh viên. Kết nối đam mê, bứt phá giới hạn.</p>
            </div>

            {/* Cột Phải: Form */}
            <div className="auth-form-wrapper">
                <div className="auth-form-box">
                    
                    {/* Logo Form */}
                    <div className="auth-logo">
                        <img src={logo} alt="CMCU Logo" className="auth-logo-img" />
                        <span className="auth-logo-text">CMCU</span>
                    </div>

                    {/* Tiêu đề */}
                    <h2 className="auth-title">Chào mừng trở lại!</h2>
                    <p className="subtitle">Vui lòng đăng nhập để tiếp tục</p>
                    
                    {/* Thông báo lỗi */}
                    {error && <div className="auth-error">{error}</div>}
                    
                    {/* Form nhập liệu */}
                    <form onSubmit={handleLogin}>
                        <div className="auth-form-group">
                            <label>Tên đăng nhập</label>
                            <div className="input-wrapper">
                                <input 
                                    type="text"
                                    className="auth-input" 
                                    placeholder="Nhập email hoặc mã sinh viên"
                                    value={username} 
                                    onChange={e => setUsername(e.target.value)} 
                                    required 
                                />
                            </div>
                        </div>
                        
                        <div className="auth-form-group">
                            <label>Mật khẩu</label>
                            <div className="input-wrapper">
                                <input 
                                    type="password" 
                                    className="auth-input" 
                                    placeholder="Nhập mật khẩu"
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    required 
                                />
                            </div>
                        </div>

                        <button type="submit" className="auth-btn" disabled={loading}>
                            {loading ? '⏳ Đang xử lý...' : 'Đăng Nhập'}
                        </button>
                    </form>

                    {/* Link chuyển sang Đăng ký */}
                    <div className="auth-footer">
                        Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
                    </div>

                </div>
            </div>
        </div>
    );
}