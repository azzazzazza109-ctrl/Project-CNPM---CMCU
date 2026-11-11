import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

export default function Register() {
    const [formData, setFormData] = useState({
        username: '', password: '', full_name: '', student_code: '', class_name: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        
        try {
            const res = await register(formData);
            if (res.success) {
                setSuccess('Đăng ký thành công! Đang chuyển hướng...');
                setTimeout(() => navigate('/login'), 2000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng ký thất bại');
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
                <p>Tham gia cùng chúng tôi để không bỏ lỡ bất kỳ sự kiện hấp dẫn nào tại trường.</p>
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
                    <h2 className="auth-title">Tạo tài khoản mới 🚀</h2>
                    <p className="subtitle">Điền thông tin của bạn để bắt đầu</p>
                    
                    {/* Thông báo */}
                    {error && <div className="auth-error">{error}</div>}
                    {success && <div className="auth-error" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>{success}</div>}
                    
                    {/* Form nhập liệu */}
                    <form onSubmit={handleRegister}>
                        <div className="auth-form-group">
                            <label>Họ và tên</label>
                            <div className="input-wrapper">
                                <input type="text" name="full_name" className="auth-input" placeholder="VD: Nguyễn Văn A" onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="auth-form-group">
                            <label>Mã sinh viên</label>
                            <div className="input-wrapper">
                                <input type="text" name="student_code" className="auth-input" placeholder="VD: BIT250001" onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="auth-form-group">
                            <label>Tên đăng nhập</label>
                            <div className="input-wrapper">
                                <input type="text" name="username" className="auth-input" placeholder="VD: nguyenvana" onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="auth-form-group">
                            <label>Lớp</label>
                            <div className="input-wrapper">
                                <input type="text" name="class_name" className="auth-input" placeholder="VD: CNTT-K3" onChange={handleChange} />
                            </div>
                        </div>

                        <div className="auth-form-group">
                            <label>Mật khẩu</label>
                            <div className="input-wrapper">
                                <input type="password" name="password" className="auth-input" placeholder="Tạo mật khẩu" onChange={handleChange} required />
                            </div>
                        </div>

                        <button type="submit" className="auth-btn" disabled={loading}>
                            {loading ? '⏳ Đang xử lý...' : 'Đăng Ký'}
                        </button>
                    </form>

                    {/* Link chuyển sang Đăng nhập */}
                    <div className="auth-footer">
                        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
                    </div>

                </div>
            </div>
        </div>
    );
}