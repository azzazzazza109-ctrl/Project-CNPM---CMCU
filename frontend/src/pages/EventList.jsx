import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

function EventList() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await apiClient.get('/events');
                if (response.data.success) {
                    setEvents(response.data.data);
                }
            } catch (error) {
                console.error('Lỗi lấy sự kiện:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    if (loading) return <div style={{ padding: '20px' }}>Đang tải dữ liệu...</div>;

    return (
        <div>
            <h1 style={{ marginBottom: '24px' }}>Danh sách sự kiện</h1>
            {events.length === 0 ? (
                <p>Chưa có sự kiện nào. Hãy thêm dữ liệu vào Database.</p>
            ) : (
                <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                    {events.map((event) => {
                        /* 
                         * CẬP NHẬT TẠI ĐÂY: Dùng event_id thay vì index.
                         * Công thức (event_id - 1) % 5 + 1 đảm bảo:
                         * ID 1 -> màu 1, ID 2 -> màu 2... ID 6 -> quay lại màu 1.
                         */
                        const bgClass = `bg-card-${((event.event_id - 1) % 5) + 1}`;

                        return (
                            <Link 
                                to={`/events/${event.event_id}`} 
                                key={event.event_id} 
                                className={`event-card ${bgClass}`}
                                style={{ 
                                    textDecoration: 'none', 
                                    color: 'inherit',       
                                    display: 'flex',       
                                    flexDirection: 'column',
                                    border: '1px solid rgba(79, 70, 229, 0.15)', 
                                    borderRadius: '16px',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                                    transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease', 
                                    overflow: 'hidden',    
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-5px)'; 
                                    e.currentTarget.style.boxShadow = '0 15px 25px -5px rgba(79, 70, 229, 0.25)'; 
                                    e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)';
                                    e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.15)';
                                }}
                            >
                                {/* DẢI MÀU GRADIENT TRÊN ĐỈNH THẺ */}
                                <div style={{ height: '8px', width: '100%', background: 'linear-gradient(90deg, #4F46E5 0%, #9333EA 100%)' }}></div>

                                {/* NỘI DUNG BÊN TRONG THẺ */}
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <h3 style={{ color: 'var(--primary)', marginBottom: '16px', fontSize: '1.3rem', fontWeight: '700', textShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                        {event.title}
                                    </h3>
                                    
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                                        📍 {event.location}
                                    </p>
                                    
                                    <p style={{ fontSize: '0.95rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontWeight: '500' }}>
                                        🕒 {new Date(event.start_time).toLocaleString('vi-VN')}
                                    </p>
                                    
                                    {/* Phần Footer của thẻ */}
                                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(79, 70, 229, 0.2)', paddingTop: '16px' }}>
                                        <span style={{ 
                                            display: 'inline-block',
                                            padding: '6px 14px',
                                            borderRadius: '20px',
                                            fontSize: '0.85rem',
                                            fontWeight: '700',
                                            backgroundColor: event.status === 'OPEN' ? '#D1FAE5' : '#FEE2E2',
                                            color: event.status === 'OPEN' ? '#065F46' : '#991B1B',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                                        }}>
                                            {event.status === 'OPEN' ? '🟢 Đang mở' : '🔴 Đã đóng'}
                                        </span>
                                        <span style={{ fontSize: '0.95rem', color: 'var(--primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            Xem chi tiết <span style={{ fontSize: '1.1rem' }}>→</span>
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default EventList;