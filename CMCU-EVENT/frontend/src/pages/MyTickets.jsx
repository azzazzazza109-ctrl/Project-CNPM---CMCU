import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';

export default function MyTickets() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const [activeTab, setActiveTab] = useState('CURRENT'); 
    const { user } = useAuth();

    const fetchTickets = async () => {
        if (!user) return;
        try {
            const res = await apiClient.get('/tickets/my-tickets');
            if (res.data.success) setTickets(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTickets(); }, [user]);

    const handleCancel = async (ticketId) => {
        if (!window.confirm("Bạn có chắc chắn muốn hủy vé? Suất này sẽ được nhường cho bạn khác.")) return;
        
        try {
            const res = await apiClient.post(`/tickets/cancel/${ticketId}`);
            setMsg(res.data.message);
            fetchTickets();
        } catch (error) {
            setMsg('❌ ' + (error.response?.data?.message || error.message));
        }
    };

    const currentTickets = tickets.filter(t => t.status === 'REGISTERED' || t.status === 'CHECKED_IN');
    const historyTickets = tickets.filter(t => t.status === 'CANCELLED');
    const displayTickets = activeTab === 'CURRENT' ? currentTickets : historyTickets;

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải ví vé...</div>;

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '32px', fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)' }}>🎟️ Vé Của Tôi</h2>
            
            {msg && (
                <div className={`custom-toast ${msg.includes('❌') ? 'toast-error' : 'toast-success'}`} style={{ marginBottom: '24px' }}>
                    {msg}
                </div>
            )}

            {/* TABS */}
            <div className="tabs-container">
                <button 
                    onClick={() => setActiveTab('CURRENT')} 
                    className={`tab-btn-new ${activeTab === 'CURRENT' ? 'active' : ''}`}
                >
                    Vé hiện tại ({currentTickets.length})
                </button>
                <button 
                    onClick={() => setActiveTab('HISTORY')} 
                    className={`tab-btn-new ${activeTab === 'HISTORY' ? 'active' : ''}`}
                >
                    Lịch sử ({historyTickets.length})
                </button>
            </div>
            
            {displayTickets.length === 0 ? (
                /* ✅ ĐÃ CẬP NHẬT GIAO DIỆN TRẠNG THÁI TRỐNG (EMPTY STATE) */
                <div className="empty-state-container">
                    <div className="empty-state-icon">🎫</div>
                    <div className="empty-state-text">Không có dữ liệu vé nào</div>
                    <div className="empty-state-subtext">
                        {activeTab === 'CURRENT' ? 'Bạn chưa đăng ký sự kiện nào. Hãy khám phá ngay!' : 'Bạn chưa có vé nào trong lịch sử.'}
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {displayTickets.map((ticket, index) => {
                        const hoursUntilStart = (new Date(ticket.start_time) - new Date()) / (1000 * 60 * 60);
                        const canCancel = hoursUntilStart > (ticket.cancel_deadline_hours || 24);
                        const themeClass = `ticket-theme-${(ticket.ticket_id % 4) + 1}`;

                        return (
                            <div 
                                key={ticket.ticket_id} 
                                className={`ticket-card ${themeClass}`} 
                                style={{ 
                                    animationDelay: `${index * 0.1}s`,
                                    filter: ticket.status === 'CANCELLED' ? 'grayscale(100%) opacity(0.6)' : 'none' 
                                }}
                            >
                                <div className="ticket-left">
                                    <h3 style={{ fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '20px', fontWeight: '800' }}>{ticket.title}</h3>
                                    
                                    <div className="face-id-container">
                                        <div className="face-avatar">
                                            {user?.full_name?.charAt(0) || 'U'}
                                            {ticket.status === 'CHECKED_IN' && <div className="face-scan-icon">✓</div>}
                                        </div>
                                        <div>
                                            <strong style={{ display: 'block', fontSize: '1.1rem', color: '#1E293B' }}>{user?.full_name}</strong>
                                            <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: '500' }}>
                                                {ticket.status === 'CHECKED_IN' ? 'Đã điểm danh vào cửa' : 'Đã xác thực Face ID'}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.95rem', color: '#475569' }}>
                                        <p style={{ margin: 0 }}>📍 <strong>Địa điểm:</strong> {ticket.location}</p>
                                        <p style={{ margin: 0 }}>🕒 <strong>Thời gian:</strong> {new Date(ticket.start_time).toLocaleString('vi-VN')}</p>
                                        <p style={{ margin: 0 }}>🎫 <strong>Mã vé:</strong> <span style={{color: '#1E293B', fontWeight: '700'}}>{ticket.ticket_code}</span></p>
                                        <p style={{ margin: 0 }}>
                                            <strong>Trạng thái:</strong> 
                                            <span style={{ 
                                                marginLeft: '8px', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700',
                                                backgroundColor: ticket.status === 'CANCELLED' ? '#FEE2E2' : (ticket.status === 'CHECKED_IN' ? '#D1FAE5' : '#E0E7FF'), 
                                                color: ticket.status === 'CANCELLED' ? '#991B1B' : (ticket.status === 'CHECKED_IN' ? '#065F46' : '#3730A3') 
                                            }}>
                                                {ticket.status === 'REGISTERED' ? 'Đã đăng ký' : ticket.status}
                                            </span>
                                        </p>
                                    </div>

                                    {ticket.status === 'REGISTERED' && (
                                        <div style={{ marginTop: '24px' }}>
                                            {canCancel ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                    <button onClick={() => handleCancel(ticket.ticket_id)} className="btn-cancel-ticket">
                                                        Hủy vé này
                                                    </button>
                                                    <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: '500' }}>
                                                        (Còn {((hoursUntilStart - (ticket.cancel_deadline_hours || 24))).toFixed(1)} giờ để hủy)
                                                    </span>
                                                </div>
                                            ) : (
                                                <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '1.2rem' }}>🔒</span>
                                                    <div style={{ fontSize: '0.85rem', color: '#991B1B' }}>
                                                        <strong style={{ display: 'block', marginBottom: '2px' }}>Đã hết hạn hủy vé</strong>
                                                        <span>Hạn chót là: {new Date(new Date(ticket.start_time).getTime() - (ticket.cancel_deadline_hours * 60 * 60 * 1000)).toLocaleString('vi-VN')}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="ticket-right">
                                    {ticket.status === 'REGISTERED' ? (
                                        <>
                                            <p style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Quét mã tại cửa</p>
                                            <div style={{ background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                                                <QRCodeSVG value={ticket.qr_token} size={110} />
                                            </div>
                                        </>
                                    ) : ticket.status === 'CHECKED_IN' ? (
                                        <div style={{ color: '#10B981', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center' }}>
                                            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '8px' }}>✅</span>
                                            ĐÃ VÀO
                                        </div>
                                    ) : (
                                        <p style={{ color: '#EF4444', fontWeight: '800', transform: 'rotate(-15deg)', fontSize: '1.2rem', border: '2px solid #EF4444', padding: '8px 16px', borderRadius: '8px' }}>ĐÃ HỦY</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}