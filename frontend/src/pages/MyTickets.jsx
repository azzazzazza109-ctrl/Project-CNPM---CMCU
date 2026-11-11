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
            // SỬA: Truyền student_id lên URL
            const res = await apiClient.get(`/tickets/my-tickets?student_id=${user.user_id}`);
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
            // SỬA: Gửi POST body { ticket_id }
            const res = await apiClient.post(`/tickets/cancel`, { ticket_id: ticketId });
            setMsg(res.data.message);
            fetchTickets();
        } catch (error) {
            setMsg('❌ ' + (error.response?.data?.message || error.message));
        }
    };

    const currentTickets = tickets.filter(t => t.checkin_status === 'REGISTERED' || t.checkin_status === 'CHECKED_IN');
    const historyTickets = tickets.filter(t => t.checkin_status === 'CANCELLED');
    const displayTickets = activeTab === 'CURRENT' ? currentTickets : historyTickets;

    if (loading) return <div style={{ padding: '20px' }}>Đang tải vé...</div>;

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '24px', fontSize: '1.8rem' }}>🎟️ Vé Của Tôi</h2>
            
            {msg && (
                <div style={{ padding: '12px', marginBottom: '20px', backgroundColor: msg.includes('❌') ? '#fee2e2' : '#d1fae5', color: msg.includes('❌') ? '#991b1b' : '#065f46', borderRadius: '8px' }}>
                    {msg}
                </div>
            )}

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '2px solid var(--border-color)' }}>
                <button onClick={() => setActiveTab('CURRENT')} style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'CURRENT' ? '3px solid var(--primary)' : 'none', fontWeight: 'bold', color: activeTab === 'CURRENT' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>
                    Vé hiện tại ({currentTickets.length})
                </button>
                <button onClick={() => setActiveTab('HISTORY')} style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'HISTORY' ? '3px solid var(--primary)' : 'none', fontWeight: 'bold', color: activeTab === 'HISTORY' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>
                    Lịch sử tham gia ({historyTickets.length})
                </button>
            </div>
            
            {displayTickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'var(--bg-surface)', borderRadius: '12px' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Không có dữ liệu vé nào.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {displayTickets.map(ticket => {
                        const hoursUntilStart = (new Date(ticket.event_start) - new Date()) / (1000 * 60 * 60);
                        const canCancel = hoursUntilStart > (ticket.cancel_deadline_hours || 24);

                        return (
                            <div key={ticket.ticket_id} className="ticket-card" style={{ filter: ticket.checkin_status === 'CANCELLED' ? 'grayscale(100%) opacity(0.7)' : 'none' }}>
                                <div className="ticket-left">
                                    <h3 style={{ fontSize: '1.3rem', color: 'var(--primary)', marginBottom: '16px' }}>{ticket.event_title}</h3>
                                    
                                    <div className="face-id-container">
                                        <div className="face-avatar">
                                            {user?.full_name?.charAt(0) || 'U'}
                                            {ticket.checkin_status === 'CHECKED_IN' && <div className="face-scan-icon">✓</div>}
                                        </div>
                                        <div>
                                            <strong style={{ display: 'block', fontSize: '1rem' }}>{user?.full_name}</strong>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                {ticket.checkin_status === 'CHECKED_IN' ? 'Đã điểm danh' : 'Đã xác thực Face ID'}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        <p>📍 <strong>Địa điểm:</strong> {ticket.event_location}</p>
                                        <p>🕒 <strong>Thời gian:</strong> {new Date(ticket.event_start).toLocaleString('vi-VN')}</p>
                                        <p>🎫 <strong>Mã vé:</strong> <span style={{color: 'var(--text-main)', fontWeight: 'bold'}}>{ticket.ticket_code}</span></p>
                                        <p>
                                            <strong>Trạng thái:</strong> 
                                            <span style={{ marginLeft: '6px', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: ticket.checkin_status === 'CANCELLED' ? '#fee2e2' : (ticket.checkin_status === 'CHECKED_IN' ? '#d1fae5' : '#e0e7ff'), color: ticket.checkin_status === 'CANCELLED' ? '#991b1b' : (ticket.checkin_status === 'CHECKED_IN' ? '#065f46' : '#3730a3') }}>
                                                {ticket.checkin_status === 'REGISTERED' ? 'Đã đăng ký' : ticket.checkin_status}
                                            </span>
                                        </p>
                                    </div>

                                    {ticket.checkin_status === 'REGISTERED' && (
                                        <div style={{ marginTop: '20px' }}>
                                            {canCancel ? (
                                                <button onClick={() => handleCancel(ticket.ticket_id)} style={{ padding: '8px 16px', background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                                                    Hủy vé
                                                </button>
                                            ) : (
                                                <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                                    ⚠️ Đã hết hạn hủy vé (phải hủy trước {ticket.cancel_deadline_hours} giờ).
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="ticket-right">
                                    {ticket.checkin_status === 'REGISTERED' ? (
                                        <>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>Quét mã để vào cửa</p>
                                            <div style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <QRCodeSVG value={ticket.qr_token} size={110} />
                                            </div>
                                        </>
                                    ) : ticket.checkin_status === 'CHECKED_IN' ? (
                                        <div style={{ color: 'var(--secondary)', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center' }}>
                                            <span style={{ fontSize: '3rem' }}>✅</span><br/>ĐÃ VÀO
                                        </div>
                                    ) : (
                                        <p style={{ color: 'var(--danger)', fontWeight: 'bold', transform: 'rotate(-15deg)', fontSize: '1.2rem', border: '2px solid var(--danger)', padding: '4px 8px', borderRadius: '8px' }}>ĐÃ HỦY</p>
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