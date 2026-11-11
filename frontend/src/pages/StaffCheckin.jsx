import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext'; // Thêm import

export default function StaffCheckin() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('QR'); 
    const [manualCode, setManualCode] = useState('');
    const [eventId, setEventId] = useState('1'); 
    const [msg, setMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        if (activeTab === 'QR') {
            const scanner = new Html5QrcodeScanner('reader', {
                qrbox: { width: 220, height: 220 },
                fps: 10,
            });

            scanner.render(onScanSuccess, onScanError);

            function onScanSuccess(decodedText) {
                scanner.clear(); 
                handleCheckinQR(decodedText);
            }

            function onScanError(error) {}

            return () => {
                scanner.clear().catch(e => console.error("Lỗi khi tắt camera", e));
            };
        }
    }, [activeTab]);

    const handleCheckinQR = async (qrToken) => {
        try {
            setMsg({ type: 'loading', text: 'Đang kiểm tra mã...' });
            // SỬA: Đổi sang API /tickets/checkin và gửi staff_user_id
            const res = await apiClient.post('/tickets/checkin', { 
                qr_token: qrToken,
                staff_user_id: user?.user_id 
            });
            setMsg({ type: 'success', text: `Thành công: ${res.data.data.student.full_name} (${res.data.data.student.student_code})` });
            
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

    const handleManualCheckin = async (e) => {
        e.preventDefault();
        try {
            setMsg({ type: 'loading', text: 'Đang tìm kiếm...' });
            // SỬA: Đổi sang API /tickets/checkin
            const res = await apiClient.post('/tickets/checkin', { 
                student_code: manualCode, 
                event_id: eventId,
                staff_user_id: user?.user_id
            });
            setMsg({ type: 'success', text: `Thành công: ${res.data.data.student.full_name}` });
            setManualCode('');
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
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)', marginBottom: '16px' }}>
                    <span style={{ fontSize: '2rem' }}>📷</span>
                </div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1E293B', margin: 0 }}>
                    Trạm Soát Vé
                </h1>
                <p style={{ marginTop: '8px', color: '#64748B', fontSize: '0.95rem' }}>
                    Vui lòng quét mã QR hoặc nhập Mã SV để điểm danh
                </p>
            </div>

            <div className="tabs-wrapper">
                <button onClick={() => setActiveTab('QR')} className={`tab-btn ${activeTab === 'QR' ? 'active' : ''}`}>Quét mã QR</button>
                <button onClick={() => setActiveTab('MANUAL')} className={`tab-btn ${activeTab === 'MANUAL' ? 'active' : ''}`}>Nhập Mã SV</button>
            </div>

            {msg.text && (
                <div className={`custom-toast toast-${msg.type}`}>
                    <span style={{ fontSize: '1.2rem' }}>{renderIcon()}</span>
                    {msg.text}
                </div>
            )}

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
                <form onSubmit={handleManualCheckin} style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'slideUpFade 0.4s ease-out' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Sự kiện đang diễn ra:</label>
                        <select value={eventId} onChange={e => setEventId(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #E2E8F0', fontSize: '1rem', outline: 'none', backgroundColor: '#F8FAFC', fontWeight: '500', color: '#1E293B', cursor: 'pointer' }}>
                            <option value="10">Ngày hội âm nhạc</option>
                            <option value="11">Next Fest</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Mã Sinh Viên:</label>
                        <input type="text" value={manualCode} onChange={e => setManualCode(e.target.value)} placeholder="BIT250001" required className="modern-input" />
                    </div>
                    <button type="submit" className="btn-3d">Xác Nhận Điểm Danh</button>
                </form>
            )}
        </div>
    );
}