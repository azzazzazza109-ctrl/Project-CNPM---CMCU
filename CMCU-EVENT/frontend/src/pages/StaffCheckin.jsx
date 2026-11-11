import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function StaffCheckin() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('QR'); 
    const [eventId, setEventId] = useState('1');
    const [events, setEvents] = useState([]);
    const [msg, setMsg] = useState({ type: '', text: '' });

    // State cho phần Tra cứu thủ công
    const [searchCode, setSearchCode] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    // Lấy danh sách sự kiện để hiển thị vào Dropdown
    useEffect(() => {
        apiClient.get('/events').then(res => {
            if (res.data.success) {
                setEvents(res.data.data);
                if (res.data.data.length > 0) {
                    setEventId(String(res.data.data[0].event_id));
                }
            }
        }).catch(err => console.error("Lỗi lấy danh sách sự kiện:", err));
    }, []);

    // Khởi tạo Camera quét QR
    useEffect(() => {
        if (activeTab === 'QR') {
            const scanner = new Html5QrcodeScanner('reader', {
                qrbox: { width: 220, height: 220 }, 
                fps: 10,
            });

            scanner.render(onScanSuccess, () => {});

            function onScanSuccess(decodedText) {
                scanner.clear(); 
                handleCheckinQR(decodedText);
            }

            return () => {
                scanner.clear().catch(e => console.error("Lỗi khi tắt camera", e));
            };
        }
    }, [activeTab]);

    const handleCheckinQR = async (qrToken) => {
        try {
            setMsg({ type: 'loading', text: 'Đang kiểm tra mã...' });
            const res = await apiClient.post('/staff/checkin/qr', { qr_token: qrToken });
            setMsg({ type: 'success', text: `Thành công: ${res.data.data.full_name} (${res.data.data.student_code})` });
            
            setTimeout(() => { 
                setActiveTab('MANUAL'); 
                setActiveTab('QR'); 
                setMsg({type:'', text:''}); 
            }, 3000);
        } catch (error) {
            setMsg({ type: 'error', text: error.response?.data?.message || error.message });
            setTimeout(() => { 
                setActiveTab('MANUAL'); 
                setActiveTab('QR'); 
                setMsg({type:'', text:''}); 
            }, 3000);
        }
    };

    // Hàm Tra cứu thông tin (Bước 1)
    const handleSearch = async (e) => {
        e.preventDefault();
        setMsg({ type: '', text: '' });
        setSearchResult(null);
        setIsSearching(true);
        
        try {
            const res = await apiClient.get(`/staff/tickets/search?student_code=${searchCode}&event_id=${eventId}`);
            if (res.data.success) {
                setSearchResult(res.data.data);
            }
        } catch (error) {
            setMsg({ type: 'error', text: error.response?.data?.message || error.message });
        } finally {
            setIsSearching(false);
        }
    };

    // Hàm Xác nhận điểm danh (Bước 2)
    const handleConfirmCheckin = async () => {
        try {
            setMsg({ type: 'loading', text: 'Đang điểm danh...' });
            const res = await apiClient.post('/staff/checkin/manual', { 
                student_code: searchResult.student_code, 
                event_id: eventId,
                staff_user_id: user?.user_id 
            });
            setMsg({ type: 'success', text: res.data.message });
            
            // Cập nhật lại trạng thái trên giao diện
            setSearchResult({ 
                ...searchResult, 
                status: 'CHECKED_IN', 
                checkin_time: new Date().toISOString() 
            });
        } catch (error) {
            setMsg({ type: 'error', text: error.response?.data?.message || error.message });
        }
    };

    const renderIcon = () => {
        if (msg.type === 'success') return '✅';
        if (msg.type === 'error') return '🚫';
        if (msg.type === 'loading') return '⏳';
        return null;
    };

    return (
        <div className="checkin-container">
            
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)', marginBottom: '16px' }}>
                    <span style={{ fontSize: '2rem' }}>📷</span>
                </div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1E293B', margin: 0 }}>
                    Trạm Soát Vé
                </h1>
                <p style={{ marginTop: '8px', color: '#64748B', fontSize: '0.95rem' }}>
                    Quét mã QR hoặc nhập Mã SV để điểm danh
                </p>
            </div>

            {/* Tabs */}
            <div className="tabs-wrapper">
                <button 
                    onClick={() => setActiveTab('QR')} 
                    className={`tab-btn ${activeTab === 'QR' ? 'active' : ''}`}
                >
                    Quét mã QR
                </button>
                <button 
                    onClick={() => { setActiveTab('MANUAL'); setSearchResult(null); setMsg({type:'', text:''}); }} 
                    className={`tab-btn ${activeTab === 'MANUAL' ? 'active' : ''}`}
                >
                    Tra cứu Mã SV
                </button>
            </div>

            {/* Feedback Toast */}
            {msg.text && (
                <div className={`custom-toast toast-${msg.type}`}>
                    <span style={{ fontSize: '1.2rem' }}>{renderIcon()}</span>
                    {msg.text}
                </div>
            )}

            {/* Nội dung Tabs */}
            {activeTab === 'QR' && (
                <div style={{ animation: 'slideUpFade 0.4s ease-out' }}>
                    <div className="camera-wrapper">
                        <div className="scanner-corner corner-tl"></div>
                        <div className="scanner-corner corner-tr"></div>
                        <div className="scanner-corner corner-bl"></div>
                        <div className="scanner-corner corner-br"></div>
                        <div className="scanner-line"></div>
                        <div id="reader"></div>
                    </div>
                    <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: '#64748B', fontWeight: '500' }}>
                        Căn chỉnh mã QR vào giữa khung hình
                    </p>
                </div>
            )}

            {activeTab === 'MANUAL' && (
                <div style={{ animation: 'slideUpFade 0.4s ease-out' }}>
                    <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Sự kiện đang diễn ra:</label>
                            <select 
                                value={eventId} 
                                onChange={e => { setEventId(e.target.value); setSearchResult(null); }} 
                                style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #E2E8F0', fontSize: '1rem', outline: 'none', backgroundColor: '#F8FAFC', fontWeight: '500', color: '#1E293B', cursor: 'pointer' }}
                            >
                                {events.map(ev => (
                                    <option key={ev.event_id} value={ev.event_id}>{ev.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Mã Sinh Viên dự phòng:</label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <input 
                                    type="text" 
                                    value={searchCode} 
                                    onChange={e => setSearchCode(e.target.value)} 
                                    placeholder="VD: BIT250001" 
                                    required 
                                    className="modern-input" 
                                    style={{ flex: 1 }}
                                />
                                <button type="submit" className="btn-3d" disabled={isSearching} style={{ width: 'auto', padding: '0 24px', marginTop: 0 }}>
                                    {isSearching ? '⏳' : '🔍 Tra cứu'}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* HIỂN THỊ KẾT QUẢ TRA CỨU */}
                    {searchResult && (
                        <div style={{ marginTop: '32px', padding: '24px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', animation: 'slideUpFade 0.3s ease' }}>
                            <h3 style={{ marginBottom: '20px', color: 'var(--primary)', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>Thông tin Sinh viên</h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', fontSize: '0.95rem' }}>
                                <p style={{ margin: 0 }}><strong>Họ và tên:</strong> <span style={{ color: '#1E293B', fontWeight: '600' }}>{searchResult.full_name}</span></p>
                                <p style={{ margin: 0 }}><strong>Mã SV:</strong> <span style={{ color: '#1E293B', fontWeight: '600' }}>{searchResult.student_code}</span></p>
                                <p style={{ margin: 0 }}><strong>Lớp:</strong> {searchResult.class_name}</p>
                                <p style={{ margin: 0 }}>
                                    <strong>Trạng thái vé:</strong> 
                                    <span style={{ 
                                        marginLeft: '8px', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700',
                                        backgroundColor: searchResult.status === 'CHECKED_IN' ? '#D1FAE5' : (searchResult.status === 'CANCELLED' ? '#FEE2E2' : '#E0E7FF'),
                                        color: searchResult.status === 'CHECKED_IN' ? '#065F46' : (searchResult.status === 'CANCELLED' ? '#991B1B' : '#3730A3')
                                    }}>
                                        {searchResult.status === 'REGISTERED' ? 'Chưa điểm danh' : (searchResult.status === 'CHECKED_IN' ? 'Đã điểm danh' : 'Đã hủy vé')}
                                    </span>
                                </p>
                            </div>
                            
                            {searchResult.status === 'REGISTERED' ? (
                                <button onClick={handleConfirmCheckin} className="btn-3d" style={{ backgroundColor: '#10B981', boxShadow: '0 6px 0 #047857, 0 8px 15px rgba(16, 185, 129, 0.3)' }}>
                                    ✅ Xác Nhận Điểm Danh
                                </button>
                            ) : searchResult.status === 'CHECKED_IN' ? (
                                <div style={{ padding: '16px', backgroundColor: '#ECFDF5', borderRadius: '12px', color: '#065F46', fontWeight: '600', textAlign: 'center' }}>
                                    Sinh viên đã được điểm danh vào lúc: {new Date(searchResult.checkin_time).toLocaleString('vi-VN')}
                                </div>
                            ) : (
                                <div style={{ padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '12px', color: '#991B1B', fontWeight: '600', textAlign: 'center' }}>
                                    CẢNH BÁO: Vé của sinh viên này đã bị hủy trước đó.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}